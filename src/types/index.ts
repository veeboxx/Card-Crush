// ---------------------------------------------------------------------------
// Card Crush v4.0 — local-first, fully manual collection model.
// ---------------------------------------------------------------------------

export type FieldType = 'text' | 'longtext' | 'number' | 'boolean' | 'select' | 'tags';

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Short text',
  longtext: 'Long text',
  number: 'Number',
  boolean: 'Yes / No',
  select: 'Dropdown',
  tags: 'Tags',
};

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface Preset {
  id: string;
  name: string;
  fields: FieldDef[];
  accent?: string;
  createdAt: string;
  updatedAt: string;
}

export type FieldValue = string | number | boolean | string[] | undefined;

/** Mutually-exclusive card status. Replaces the old owned/wishlist booleans. */
export type CardStatus = 'owned' | 'wishlist' | 'grail' | 'none';

export interface Card {
  id: string;
  presetId: string | null;
  name: string;
  imageId?: string;
  backImageId?: string;
  dualFace?: boolean;
  /** v4: single status enum. */
  status: CardStatus;
  /** Legacy booleans kept for backup compat — derived from status on read. */
  owned?: boolean;
  wishlist?: boolean;
  crush: number; // 0–5
  fields: Record<string, FieldValue>;
  searchText?: string;
  notes?: string;
  /** Free-text note for grails (e.g. "~$450 on TCGplayer"). */
  grailNote?: string;
  createdAt: string;
  updatedAt: string;
}

/** Derive a CardStatus from legacy boolean fields (for old backup imports). */
export function statusFromLegacy(owned?: boolean, wishlist?: boolean): CardStatus {
  if (owned) return 'owned';
  if (wishlist) return 'wishlist';
  return 'none';
}

// --- Themes ---------------------------------------------------------------

export type ThemeId =
  | 'vault' | 'maritime' | 'archive' | 'merry' | 'ahsoka'
  | 'abyss' | 'verdant' | 'ember'
  | 'daylight' | 'parchment' | 'porcelain';

export const THEMES: { id: ThemeId; name: string; blurb: string; light?: boolean; swatch: [string, string, string] }[] = [
  { id: 'vault',     name: 'Vault',          blurb: 'Magenta & violet',       swatch: ['#ff3d81', '#9d7bff', '#0c0d12'] },
  { id: 'maritime',  name: 'Maritime Noir',  blurb: 'Teal & brass',           swatch: ['#2ac4b8', '#d4af6e', '#0c1217'] },
  { id: 'archive',   name: 'Warm Archive',   blurb: 'Amber & sepia',          swatch: ['#e09646', '#e8c470', '#1c150f'] },
  { id: 'merry',     name: 'Going Merry',    blurb: 'Orange & green',         swatch: ['#f58c32', '#46c882', '#0e1315'] },
  { id: 'ahsoka',    name: 'Ahsoka',         blurb: 'Orange & saber blue',    swatch: ['#e87a34', '#96d6f6', '#101015'] },
  { id: 'abyss',     name: 'Abyss',          blurb: 'Deep blue & ice',        swatch: ['#3896ff', '#40e0e6', '#0e1723'] },
  { id: 'verdant',   name: 'Verdant',        blurb: 'Emerald & gold',         swatch: ['#34c878', '#e8c46e', '#101b14'] },
  { id: 'ember',     name: 'Ember',          blurb: 'Molten red & orange',    swatch: ['#f04e46', '#f5c460', '#1f1311'] },
  { id: 'daylight',  name: 'Daylight',       blurb: 'Clean white & cool gray', light: true, swatch: ['#e2266e', '#0ea5be', '#f4f6fa'] },
  { id: 'parchment', name: 'Parchment',      blurb: 'Warm cream & sepia',     light: true, swatch: ['#c0601c', '#a87c18', '#fbf4e8'] },
  { id: 'porcelain', name: 'Porcelain',      blurb: 'Soft off-white & blush', light: true, swatch: ['#d63a80', '#8c68d6', '#fffbfd'] },
];

export interface AppSettings {
  theme: ThemeId;
  ocrSuggestions: boolean;
  ocrEnabled: boolean;
  ocrAutoRun: boolean;
  searchMode: 'all' | 'fields';
}
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'vault',
  ocrSuggestions: true,
  ocrEnabled: true,
  ocrAutoRun: false,
  searchMode: 'all',
};

/** Serialisable backup envelope. */
export interface BackupFile {
  version: 2 | 3 | 4;
  exportedAt: string;
  cards: Card[];
  presets: Preset[];
  settings: AppSettings;
  images: { id: string; data: string }[];
}
