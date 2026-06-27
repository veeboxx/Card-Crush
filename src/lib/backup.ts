import type { BackupFile, Card, Preset, AppSettings } from '../types';
import { allCards, allPresets, getImage, putImage, putCard, putPreset, putSettings } from '../db/database';
import { blobToDataUrl, dataUrlToBlob } from './images';
import { nowIso } from './utils';
import { statusFromLegacy } from '../types';

/** Build a complete backup: all cards, presets, settings, and embedded images. */
export async function buildBackup(settings: AppSettings): Promise<BackupFile> {
  const cards = await allCards() as Card[];
  const presets = await allPresets();
  const imageIds = [...new Set(
    cards.flatMap((c) => [c.imageId, c.backImageId]).filter(Boolean) as string[]
  )];
  const images: { id: string; data: string }[] = [];
  for (const id of imageIds) {
    const blob = await getImage(id);
    if (blob) images.push({ id, data: await blobToDataUrl(blob) });
  }
  return { version: 4, exportedAt: nowIso(), cards, presets, settings, images };
}

/** Restore a backup, writing cards, presets, settings, and images back to disk. */
export async function restoreBackup(file: BackupFile): Promise<{ cards: number; presets: number; images: number }> {
  for (const img of file.images ?? []) {
    try { await putImage(img.id, await dataUrlToBlob(img.data)); } catch { /* skip */ }
  }
  for (const p of file.presets ?? []) await putPreset(p as Preset);
  for (const rawCard of file.cards ?? []) {
    // Normalize: ensure status field is present (handles v2/v3 backups)
    const c = rawCard as Card;
    const card: Card = {
      ...c,
      status: c.status ?? statusFromLegacy(c.owned, c.wishlist),
    };
    await putCard(card);
  }
  if (file.settings) await putSettings(file.settings);
  return { cards: file.cards?.length ?? 0, presets: file.presets?.length ?? 0, images: file.images?.length ?? 0 };
}

export function parseBackup(text: string): BackupFile | null {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data.cards)) return null;
    return data as BackupFile;
  } catch {
    return null;
  }
}
