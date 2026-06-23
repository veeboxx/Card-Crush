import { useEffect, useState } from 'react';
import { getImage, putImage, removeImage } from '../db/database';
import { uid } from './utils';

/** Store an image Blob/File, returning its generated id. */
export async function storeImage(blob: Blob): Promise<string> {
  const id = uid('img');
  await putImage(id, blob);
  return id;
}

export async function deleteImage(id: string): Promise<void> {
  const cached = urlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(id);
  }
  await removeImage(id);
}

// Session cache: each image's object URL is created once and reused everywhere,
// so thumbnails don't re-read IndexedDB or spawn duplicate URLs on every mount.
const urlCache = new Map<string, string>();

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Resolve a stored imageId to an object URL for rendering.
 *  Reads from the session cache first — each image is loaded once
 *  and reused across all thumbnails for the lifetime of the session. */
export function useStoredImage(imageId?: string): string | null {
  const [url, setUrl] = useState<string | null>(() => (imageId ? (urlCache.get(imageId) ?? null) : null));
  useEffect(() => {
    if (!imageId) { setUrl(null); return; }
    const hit = urlCache.get(imageId);
    if (hit) { setUrl(hit); return; }
    let alive = true;
    getImage(imageId)
      .then((blob) => {
        if (!alive || !blob) return;
        const made = URL.createObjectURL(blob);
        urlCache.set(imageId, made);
        setUrl(made);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [imageId]);
  return url;
}
