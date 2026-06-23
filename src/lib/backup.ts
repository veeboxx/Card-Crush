import type { BackupFile, Card, Preset, AppSettings } from '../types';
import { allCards, allPresets, getImage, putImage, putCard, putPreset, putSettings } from '../db/database';
import { blobToDataUrl, dataUrlToBlob } from './images';
import { nowIso } from './utils';

/** Build a complete backup: all cards, presets, settings, and embedded images. */
export async function buildBackup(settings: AppSettings): Promise<BackupFile> {
  const cards = await allCards();
  const presets = await allPresets();
  const ids = [...new Set(cards.map((c) => c.imageId).filter(Boolean) as string[])];
  const images: { id: string; data: string }[] = [];
  for (const id of ids) {
    const blob = await getImage(id);
    if (blob) images.push({ id, data: await blobToDataUrl(blob) });
  }
  return { version: 2, exportedAt: nowIso(), cards, presets, settings, images };
}

/** Restore a backup, writing cards, presets, settings, and images back to disk. */
export async function restoreBackup(file: BackupFile): Promise<{ cards: number; presets: number; images: number }> {
  for (const img of file.images ?? []) {
    try {
      await putImage(img.id, await dataUrlToBlob(img.data));
    } catch {
      /* skip bad image */
    }
  }
  for (const p of file.presets ?? []) await putPreset(p as Preset);
  for (const c of file.cards ?? []) await putCard(c as Card);
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
