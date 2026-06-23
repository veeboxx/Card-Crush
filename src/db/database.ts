import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, Preset, AppSettings } from '../types';

interface CrushDB extends DBSchema {
  cards: { key: string; value: Card };
  presets: { key: string; value: Preset };
  images: { key: string; value: Blob };
  meta: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<CrushDB>> | null = null;

function db(): Promise<IDBPDatabase<CrushDB>> {
  if (!dbp) {
    dbp = openDB<CrushDB>('cardcrush', 1, {
      upgrade(d) {
        d.createObjectStore('cards', { keyPath: 'id' });
        d.createObjectStore('presets', { keyPath: 'id' });
        d.createObjectStore('images');
        d.createObjectStore('meta');
      },
    });
  }
  return dbp;
}

// --- Cards -----------------------------------------------------------------
export async function allCards(): Promise<Card[]> {
  return (await db()).getAll('cards');
}
export async function putCard(c: Card): Promise<void> {
  await (await db()).put('cards', c);
}
export async function removeCard(id: string): Promise<void> {
  await (await db()).delete('cards', id);
}

// --- Presets ---------------------------------------------------------------
export async function allPresets(): Promise<Preset[]> {
  return (await db()).getAll('presets');
}
export async function putPreset(p: Preset): Promise<void> {
  await (await db()).put('presets', p);
}
export async function removePreset(id: string): Promise<void> {
  await (await db()).delete('presets', id);
}

// --- Images (blobs) --------------------------------------------------------
export async function getImage(id: string): Promise<Blob | undefined> {
  return (await db()).get('images', id);
}
export async function putImage(id: string, blob: Blob): Promise<void> {
  await (await db()).put('images', blob, id);
}
export async function removeImage(id: string): Promise<void> {
  await (await db()).delete('images', id);
}
export async function allImageKeys(): Promise<string[]> {
  return (await db()).getAllKeys('images') as Promise<string[]>;
}

// --- Settings --------------------------------------------------------------
export async function getSettings(): Promise<AppSettings | undefined> {
  return (await db()).get('meta', 'settings') as Promise<AppSettings | undefined>;
}
export async function putSettings(s: AppSettings): Promise<void> {
  await (await db()).put('meta', s, 'settings');
}

// --- Wipe ------------------------------------------------------------------
export async function clearAll(): Promise<void> {
  const d = await db();
  await Promise.all([
    d.clear('cards'),
    d.clear('presets'),
    d.clear('images'),
    d.clear('meta'),
  ]);
}
