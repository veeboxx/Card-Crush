// OCR via tesseract.js 5.x (WASM, fully local — no network).
//
// The Tesseract worker can't fetch tauri:// URLs for the language data from
// its own thread, so we fetch + gunzip the traineddata in the main thread
// and write it straight into the worker's in-memory filesystem via FS().
// With the file already present in the FS, the engine loads it locally
// instead of trying to download it.

export type OcrProgress = { status: string; pct: number };

let cachedLang: Uint8Array | null = null;

async function getLangData(base: string): Promise<Uint8Array> {
  if (cachedLang) return cachedLang;
  const res = await fetch(`${base}/eng.traineddata.gz`);
  if (!res.ok) throw new Error(`lang fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  console.log('[OCR] decompressed lang data:', out.byteLength, 'bytes');
  cachedLang = out;
  return out;
}

export async function ocrImage(
  source: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const base = window.location.origin;
  console.log('[OCR] start, base =', base);

  onProgress?.({ status: 'loading language', pct: 10 });
  const lang = await getLangData(base);

  onProgress?.({ status: 'starting engine', pct: 25 });

  // Create the worker but DON'T let it auto-load a language (pass empty),
  // so it won't try to fetch eng.traineddata over the network.
  const worker = await createWorker([], 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/tesseract-core`,
    cacheMethod: 'none',
    logger: (m: { status: string; progress: number }) => {
      console.log('[OCR]', m.status, m.progress);
      onProgress?.({ status: m.status, pct: Math.round((m.progress ?? 0) * 100) });
    },
  });

  try {
    // Write the decompressed traineddata into the worker FS, then load it.
    await (worker as unknown as { FS: (m: string, a: unknown[]) => Promise<void> }).FS('writeFile', ['eng.traineddata', lang]);
    await worker.reinitialize('eng');

    onProgress?.({ status: 'recognizing', pct: 70 });
    const { data } = await worker.recognize(source);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export function cleanOcrText(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
