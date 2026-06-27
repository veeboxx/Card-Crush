import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Card, Preset, AppSettings, CardStatus } from '../types';
import { DEFAULT_SETTINGS, statusFromLegacy } from '../types';
import * as db from '../db/database';
import { uid, nowIso } from '../lib/utils';
import { deleteImage } from '../lib/images';
import { DEFAULT_PRESETS } from '../data/defaultPresets';

/** Ensure a card loaded from IndexedDB has the v4 status field. */
function normalizeCard(c: Card): Card {
  if (c.status) return c;
  return { ...c, status: statusFromLegacy(c.owned, c.wishlist) };
}

interface Ctx {
  ready: boolean;
  cards: Card[];
  presets: Preset[];
  settings: AppSettings;
  createCard: (partial: Partial<Card>) => Promise<Card>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  createPreset: (name: string) => Promise<Preset>;
  updatePreset: (id: string, patch: Partial<Preset>) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  reload: () => Promise<void>;
}

const CollectionCtx = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    const [rawCards, p, s] = await Promise.all([db.allCards(), db.allPresets(), db.getSettings()]);
    const c = (rawCards as Card[]).map(normalizeCard);
    if (p.length === 0) {
      await Promise.all(DEFAULT_PRESETS.map((dp) => db.putPreset(dp)));
      setPresets(DEFAULT_PRESETS);
    } else {
      setPresets(p);
    }
    setCards(c);
    setSettings({ ...DEFAULT_SETTINGS, ...(s ?? {}) });
  }, []);

  useEffect(() => { reload().finally(() => setReady(true)); }, [reload]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme ?? 'vault';
  }, [settings.theme]);

  const createCard = useCallback(async (partial: Partial<Card>) => {
    const ts = nowIso();
    const status: CardStatus = partial.status ?? 'wishlist';
    const card: Card = {
      id: uid('card'),
      presetId: partial.presetId ?? null,
      name: partial.name?.trim() || 'Untitled Card',
      imageId: partial.imageId,
      backImageId: partial.backImageId,
      dualFace: partial.dualFace,
      status,
      // keep legacy booleans in sync for backup compat
      owned: status === 'owned',
      wishlist: status === 'wishlist',
      crush: partial.crush ?? 0,
      fields: partial.fields ?? {},
      searchText: partial.searchText,
      notes: partial.notes,
      grailNote: partial.grailNote,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.putCard(card);
    setCards((cs) => [...cs, card]);
    return card;
  }, []);

  const updateCard = useCallback(async (id: string, patch: Partial<Card>) => {
    // Keep legacy booleans in sync when status changes.
    if (patch.status !== undefined) {
      patch = {
        ...patch,
        owned: patch.status === 'owned',
        wishlist: patch.status === 'wishlist',
      };
    }
    let updated: Card | null = null;
    setCards((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch, id: c.id, updatedAt: nowIso() };
        return updated;
      }),
    );
    if (updated) await db.putCard(updated);
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const card = cards.find((c) => c.id === id);
    await db.removeCard(id);
    if (card?.imageId) await deleteImage(card.imageId).catch(() => {});
    if (card?.backImageId) await deleteImage(card.backImageId).catch(() => {});
    setCards((cs) => cs.filter((c) => c.id !== id));
  }, [cards]);

  const createPreset = useCallback(async (name: string) => {
    const ts = nowIso();
    const preset: Preset = { id: uid('preset'), name: name.trim() || 'New Preset', fields: [], createdAt: ts, updatedAt: ts };
    await db.putPreset(preset);
    setPresets((ps) => [...ps, preset]);
    return preset;
  }, []);

  const updatePreset = useCallback(async (id: string, patch: Partial<Preset>) => {
    let updated: Preset | null = null;
    setPresets((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch, id: p.id, updatedAt: nowIso() };
        return updated;
      }),
    );
    if (updated) await db.putPreset(updated);
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    await db.removePreset(id);
    setPresets((ps) => ps.filter((p) => p.id !== id));
  }, []);

  const saveSettings = useCallback(async (s: AppSettings) => {
    setSettings(s);
    await db.putSettings(s);
  }, []);

  return (
    <CollectionCtx.Provider value={{ ready, cards, presets, settings, createCard, updateCard, deleteCard, createPreset, updatePreset, deletePreset, saveSettings, reload }}>
      {children}
    </CollectionCtx.Provider>
  );
}

export function useCollection(): Ctx {
  const ctx = useContext(CollectionCtx);
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider');
  return ctx;
}
