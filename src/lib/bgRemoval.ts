// Lazy-loaded background removal via @imgly/background-removal (ONNX, runs
// fully in-browser / Tauri webview). The WASM + model files are fetched from
// IMG.LY's CDN on the very first call and cached by the browser thereafter —
// subsequent calls are offline-capable. No API key required.

export type BgProgress = { stage: 'downloading' | 'processing'; pct: number };

/**
 * Remove the background from an image Blob.
 * Returns a new PNG Blob with a transparent background.
 * Calls onProgress while downloading the model (first run only) and processing.
 */
export async function removeBackground(
  source: Blob,
  onProgress?: (p: BgProgress) => void,
): Promise<Blob> {
  // Dynamic import keeps this ~4 MB dependency out of the initial bundle.
  const imglyModule = await import('@imgly/background-removal');
  const imglyRemoveBackground = (imglyModule.default ?? imglyModule.removeBackground ?? Object.values(imglyModule)[0]) as unknown as (source: Blob, config?: object) => Promise<Blob>;

  const result = await imglyRemoveBackground(source, {
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || total === 0) return;
      const pct = Math.round((current / total) * 100);
      // Keys starting with 'fetch:' are model/wasm downloads; others are inference.
      const stage = key.startsWith('fetch:') ? 'downloading' : 'processing';
      onProgress({ stage, pct });
    },
  });

  return result;
}
