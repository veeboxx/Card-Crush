// Native file save/open for the Tauri desktop app, with a browser fallback so
// `npm run dev` in a plain browser still works during development.

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Save text to a file. Uses a native Save dialog in Tauri, a download on web. */
export async function saveTextFile(suggestedName: string, text: string): Promise<boolean> {
  const ext = suggestedName.split('.').pop()?.toLowerCase() ?? 'txt';
  const isHtml = ext === 'html';
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: isHtml
        ? [{ name: 'HTML', extensions: ['html'] }]
        : [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return false;
    await writeTextFile(path, text);
    return true;
  }
  const mime = isHtml ? 'text/html' : 'application/json';
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Save binary (e.g. a PDF) to a file. */
export async function saveBinaryFile(suggestedName: string, bytes: Uint8Array, ext: string, mime: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: suggestedName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Show a confirmation dialog. Uses the Tauri native dialog on desktop
 *  (reliable on macOS webview), falls back to window.confirm on web. */
export async function askConfirm(message: string, title = 'Confirm'): Promise<boolean> {
  if (isTauri()) {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    return ask(message, { title, kind: 'warning' });
  }
  return window.confirm(message);
}
export async function openTextFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path || typeof path !== 'string') return null;
    return readTextFile(path);
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsText(f);
    };
    input.click();
  });
}
