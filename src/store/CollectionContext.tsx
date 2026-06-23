import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Card, Preset, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as db from '../db/database';
import { uid, nowIso } from '../lib/utils';
import { deleteImage } from '../lib/images';
import { DEFAULT_PRESETS } from '../data/defaultPresets';

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
    const [c, p, s] = await Promise.all([db.allCards(), db.allPresets(), db.getSettings()]);
    // Seed the four built-in game presets on first ever run.
    if (p.length === 0) {
      await Promise.all(DEFAULT_PRESETS.map((dp) => db.putPreset(dp)));
      setPresets(DEFAULT_PRESETS);
    } else {
      setPresets(p);
    }
    setCards(c);
    setSettings({ ...DEFAULT_SETTINGS, ...(s ?? {}) });
  }, []);

  useEffect(() => {
    reload().finally(() => setReady(true));
  }, [reload]);

  // Apply the active theme to the document (drives the CSS color variables).
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme ?? 'vault';
  }, [settings.theme]);

  const createCard = useCallback(async (partial: Partial<Card>) => {
    const ts = nowIso();
    const card: Card = {
      id: uid('card'),
      presetId: partial.presetId ?? null,
      name: partial.name?.trim() || 'Untitled Card',
      imageId: partial.imageId,
      owned: partial.owned ?? false,
      wishlist: partial.wishlist ?? true,
      crush: partial.crush ?? 0,
      fields: partial.fields ?? {},
      searchText: partial.searchText,
      notes: partial.notes,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.putCard(card);
    setCards((cs) => [...cs, card]);
    return card;
  }, []);

  const updateCard = useCallback(async (id: string, patch: Partial<Card>) => {
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
    const preset: Preset = {
      id: uid('preset'),
      name: name.trim() || 'New Preset',
      fields: [],
      createdAt: ts,
      updatedAt: ts,
    };
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

  const value: Ctx = {
    ready,
    cards,
    presets,
    settings,
    createCard,
    updateCard,
    deleteCard,
    createPreset,
    updatePreset,
    deletePreset,
    saveSettings,
    reload,
  };

  return <CollectionCtx.Provider value={value}>{children}</CollectionCtx.Provider>;
}

export function useCollection(): Ctx {
  const ctx = useContext(CollectionCtx);
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider');
  return ctx;
}
