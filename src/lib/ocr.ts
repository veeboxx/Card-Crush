// OCR via tesseract.js 5.x. The worker downloads its language data from
// jsDelivr on first use and caches it in IndexedDB; subsequent runs are
// offline. The WASM core is bundled locally.

export type OcrProgress = { status: string; pct: number };

export async function ocrImage(
  source: Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const base = window.location.origin;

  const worker = await createWorker('eng', 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/tesseract-core`,
    // Let the worker fetch + cache language data from the CDN (first run only).
    langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int',
    cacheMethod: 'write',
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      onProgress({ status: m.status, pct: Math.round((m.progress ?? 0) * 100) });
    },
  });

  try {
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
