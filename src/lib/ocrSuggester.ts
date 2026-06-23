// Given raw OCR text and a preset, try to extract field values using
// per-game pattern rules. Returns a list of suggestions the user can
// choose to apply or ignore — nothing is written automatically.

import type { FieldDef } from '../types';

export interface Suggestion {
  fieldId: string;
  fieldLabel: string;
  value: string;
  confidence: 'high' | 'medium';
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function find(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1]?.trim() ?? m[0]?.trim() : null;
}

function findAll(text: string, re: RegExp): string[] {
  return Array.from(text.matchAll(new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g'))))
    .map((m) => m[1]?.trim() ?? m[0]?.trim())
    .filter(Boolean) as string[];
}

// ---------------------------------------------------------------------------
// Magic: The Gathering
// ---------------------------------------------------------------------------
function suggestMtg(text: string, fields: FieldDef[]): Suggestion[] {
  const sugs: Suggestion[] = [];
  const ls = lines(text);

  const fieldMap: Record<string, string> = {};
  for (const f of fields) fieldMap[f.id] = f.label;

  // P/T — most reliable: digits/digits
  const pt = find(text, /\b(\d+\/\d+)\b/);
  if (pt && fields.find((f) => f.id === 'mtg-pt')) {
    sugs.push({ fieldId: 'mtg-pt', fieldLabel: 'Power / Toughness', value: pt, confidence: 'high' });
  }

  // Mana cost — sequences like {2}{U}{W} or standalone cost tokens
  const manaParts = findAll(text, /\{([WUBRGCXYZS\d/]+)\}/);
  if (manaParts.length && fields.find((f) => f.id === 'mtg-mana')) {
    sugs.push({ fieldId: 'mtg-mana', fieldLabel: 'Mana Cost', value: manaParts.map((p) => `{${p}}`).join(''), confidence: 'high' });
  }

  // Type line — line containing a card type keyword
  const typeKeywords = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Battle', 'Land'];
  const typeLine = ls.find((l) => typeKeywords.some((k) => l.includes(k)));
  if (typeLine && fields.find((f) => f.id === 'mtg-type')) {
    const matchedType = typeKeywords.find((k) => typeLine.includes(k)) ?? '';
    sugs.push({ fieldId: 'mtg-type', fieldLabel: 'Type', value: matchedType, confidence: 'high' });
    // Subtype is after the em-dash
    const sub = typeLine.split(/[—–-]/)[1]?.trim();
    if (sub && fields.find((f) => f.id === 'mtg-subtype')) {
      sugs.push({ fieldId: 'mtg-subtype', fieldLabel: 'Subtype', value: sub, confidence: 'medium' });
    }
  }

  // Collector number / set — pattern like "MSH • EN • 0089" or "123/456"
  const collector = find(text, /\b([A-Z]{2,4})\s*[•·]\s*EN\b/) ?? find(text, /\b(\d{1,3}\/\d{2,3})\b/);
  if (collector && fields.find((f) => f.id === 'mtg-set')) {
    sugs.push({ fieldId: 'mtg-set', fieldLabel: 'Set / Collector Number', value: collector, confidence: 'medium' });
  }

  // Artist — after • or "Illus." near bottom of card
  const artist = find(text, /[•·]\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)\s*[•·©]/) ??
                 find(text, /(?:Illus\.|Art)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
  if (artist && fields.find((f) => f.id === 'mtg-artist')) {
    sugs.push({ fieldId: 'mtg-artist', fieldLabel: 'Artist', value: artist, confidence: 'medium' });
  }

  return sugs;
}

// ---------------------------------------------------------------------------
// Disney Lorcana
// ---------------------------------------------------------------------------
function suggestLorcana(text: string, fields: FieldDef[]): Suggestion[] {
  const sugs: Suggestion[] = [];
  const ls = lines(text);

  // Ink color
  const inks = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
  const ink = inks.find((i) => text.includes(i));
  if (ink && fields.find((f) => f.id === 'lor-ink')) {
    sugs.push({ fieldId: 'lor-ink', fieldLabel: 'Ink Color', value: ink, confidence: 'high' });
  }

  // Card type
  const types = ['Character', 'Action', 'Item', 'Location'];
  const type = types.find((t) => text.includes(t));
  if (type && fields.find((f) => f.id === 'lor-type')) {
    sugs.push({ fieldId: 'lor-type', fieldLabel: 'Type', value: type, confidence: 'high' });
  }

  // Cost — single digit at the start of a line or after "Cost"
  const cost = find(text, /\bCost[:\s]+(\d)\b/) ?? (ls[0]?.match(/^(\d)$/) ? ls[0] : null);
  if (cost && fields.find((f) => f.id === 'lor-cost')) {
    sugs.push({ fieldId: 'lor-cost', fieldLabel: 'Cost', value: cost, confidence: 'medium' });
  }

  // Strength / Willpower — two numbers near bottom, often adjacent
  const nums = findAll(text, /\b([1-9]\d?)\b/).filter((n) => parseInt(n) <= 20);
  if (nums.length >= 2 && fields.find((f) => f.id === 'lor-strength')) {
    sugs.push({ fieldId: 'lor-strength', fieldLabel: 'Strength', value: nums[nums.length - 2], confidence: 'medium' });
  }
  if (nums.length >= 1 && fields.find((f) => f.id === 'lor-will')) {
    sugs.push({ fieldId: 'lor-will', fieldLabel: 'Willpower', value: nums[nums.length - 1], confidence: 'medium' });
  }

  // Rarity
  const rarities = ['Enchanted', 'Legendary', 'Super Rare', 'Rare', 'Uncommon', 'Common'];
  const rarity = rarities.find((r) => text.includes(r));
  if (rarity && fields.find((f) => f.id === 'lor-rarity')) {
    sugs.push({ fieldId: 'lor-rarity', fieldLabel: 'Rarity', value: rarity, confidence: 'high' });
  }

  return sugs;
}

// ---------------------------------------------------------------------------
// One Piece
// ---------------------------------------------------------------------------
function suggestOnePiece(text: string, fields: FieldDef[]): Suggestion[] {
  const sugs: Suggestion[] = [];

  // Card number — very reliable pattern
  const cardNum = find(text, /\b([A-Z]{2}\d{2}-\d{3})\b/) ?? find(text, /\b([A-Z]{1,3}\d{2}-\d{3})\b/);
  if (cardNum && fields.find((f) => f.id === 'op-num')) {
    sugs.push({ fieldId: 'op-num', fieldLabel: 'Card Number', value: cardNum, confidence: 'high' });
  }

  // Color
  const colors = ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'];
  const color = colors.find((c) => text.includes(c));
  if (color && fields.find((f) => f.id === 'op-color')) {
    sugs.push({ fieldId: 'op-color', fieldLabel: 'Color', value: color, confidence: 'high' });
  }

  // Card type
  const types = ['Leader', 'Character', 'Event', 'Stage'];
  const type = types.find((t) => text.includes(t));
  if (type && fields.find((f) => f.id === 'op-type')) {
    sugs.push({ fieldId: 'op-type', fieldLabel: 'Type', value: type, confidence: 'high' });
  }

  // Power — multiple of 1000 pattern
  const power = find(text, /\b(\d{1,2}000)\b/);
  if (power && fields.find((f) => f.id === 'op-power')) {
    sugs.push({ fieldId: 'op-power', fieldLabel: 'Power', value: power.replace(/\D/g, ''), confidence: 'high' });
  }

  // Counter — +1000 or +2000
  const counter = find(text, /\+(\d{1,2}000)\b/);
  if (counter && fields.find((f) => f.id === 'op-counter')) {
    sugs.push({ fieldId: 'op-counter', fieldLabel: 'Counter', value: `+${counter}`, confidence: 'high' });
  }

  // Attribute
  const attrs = ['Strike', 'Slash', 'Ranged', 'Special', 'Wisdom', 'Defend'];
  const attr = attrs.find((a) => text.includes(a));
  if (attr && fields.find((f) => f.id === 'op-attr')) {
    sugs.push({ fieldId: 'op-attr', fieldLabel: 'Attribute', value: attr, confidence: 'medium' });
  }

  return sugs;
}

// ---------------------------------------------------------------------------
// Star Wars Unlimited
// ---------------------------------------------------------------------------
function suggestSwu(text: string, fields: FieldDef[]): Suggestion[] {
  const sugs: Suggestion[] = [];

  // Card type
  const types = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];
  const type = types.find((t) => text.includes(t));
  if (type && fields.find((f) => f.id === 'swu-type')) {
    sugs.push({ fieldId: 'swu-type', fieldLabel: 'Type', value: type, confidence: 'high' });
  }

  // Arena
  const arena = text.includes('Ground') ? 'Ground' : text.includes('Space') ? 'Space' : null;
  if (arena && fields.find((f) => f.id === 'swu-arena')) {
    sugs.push({ fieldId: 'swu-arena', fieldLabel: 'Arena', value: arena, confidence: 'high' });
  }

  // Aspects
  const aspectList = ['Aggression', 'Command', 'Cunning', 'Heroism', 'Villainy', 'Vigilance'];
  const aspects = aspectList.filter((a) => text.includes(a));
  if (aspects.length && fields.find((f) => f.id === 'swu-aspects')) {
    sugs.push({ fieldId: 'swu-aspects', fieldLabel: 'Aspects', value: aspects.join(', '), confidence: 'high' });
  }

  // Power — number followed by an attack-like context; usually a small number 1-12
  const power = find(text, /\bPower[:\s]+(\d+)\b/) ?? find(text, /\b([1-9]|1[0-2])\s*(?:\/|\|)\s*\d+/);
  if (power && fields.find((f) => f.id === 'swu-power')) {
    sugs.push({ fieldId: 'swu-power', fieldLabel: 'Power', value: power, confidence: 'medium' });
  }

  // HP
  const hp = find(text, /\bHP[:\s]+(\d+)\b/) ?? find(text, /\b\d+\s*(?:\/|\|)\s*(\d+)/);
  if (hp && fields.find((f) => f.id === 'swu-hp')) {
    sugs.push({ fieldId: 'swu-hp', fieldLabel: 'HP', value: hp, confidence: 'medium' });
  }

  // Cost — single digit near top
  const cost = find(text, /\bCost[:\s]+(\d)\b/) ?? find(text, /^(\d)\s*$/m);
  if (cost && fields.find((f) => f.id === 'swu-cost')) {
    sugs.push({ fieldId: 'swu-cost', fieldLabel: 'Cost', value: cost, confidence: 'medium' });
  }

  return sugs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const PRESET_GAME: Record<string, (text: string, fields: FieldDef[]) => Suggestion[]> = {
  'preset-mtg':      suggestMtg,
  'preset-lorcana':  suggestLorcana,
  'preset-onepiece': suggestOnePiece,
  'preset-swu':      suggestSwu,
};

/**
 * Given OCR text and the active preset, return field suggestions.
 * Returns [] for unknown / custom presets.
 */
export function suggestFields(ocrText: string, presetId: string, fields: FieldDef[]): Suggestion[] {
  const fn = PRESET_GAME[presetId];
  if (!fn) return [];
  return fn(ocrText, fields);
}
