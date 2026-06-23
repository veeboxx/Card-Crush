// Default presets seeded on first run (when the vault is empty).
// Field IDs are stable slugs so the OCR suggester can reference them by id.

import type { Preset } from '../types';

function p(id: string, name: string, fields: Preset['fields']): Preset {
  const ts = new Date(0).toISOString(); // epoch — sorts before any user preset
  return { id, name, fields, createdAt: ts, updatedAt: ts };
}

function f(id: string, label: string, type: Preset['fields'][0]['type'], options?: string[]): Preset['fields'][0] {
  return options ? { id, label, type, options } : { id, label, type };
}

// ---------------------------------------------------------------------------
// Magic: The Gathering
// ---------------------------------------------------------------------------
export const MTG_PRESET: Preset = p('preset-mtg', 'Magic: The Gathering', [
  f('mtg-mana',    'Mana Cost',              'text'),
  f('mtg-type',    'Type',                   'select', [
    'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact',
    'Planeswalker', 'Battle', 'Land', 'Artifact Creature', 'Enchantment Creature',
  ]),
  f('mtg-subtype', 'Subtype',                'text'),
  f('mtg-pt',      'Power / Toughness',      'text'),
  f('mtg-rarity',  'Rarity',                 'select', ['Common', 'Uncommon', 'Rare', 'Mythic Rare', 'Special']),
  f('mtg-set',     'Set / Collector Number', 'text'),
  f('mtg-artist',  'Artist',                 'text'),
  f('mtg-rules',   'Rules Text',             'longtext'),
]);

// ---------------------------------------------------------------------------
// Disney Lorcana
// ---------------------------------------------------------------------------
export const LORCANA_PRESET: Preset = p('preset-lorcana', 'Disney Lorcana', [
  f('lor-ink',      'Ink Color',  'select', [
    'Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel',
  ]),
  f('lor-type',     'Type',       'select', ['Character', 'Action', 'Item', 'Location']),
  f('lor-cost',     'Cost',       'number'),
  f('lor-lore',     'Lore Value', 'number'),
  f('lor-strength', 'Strength',   'number'),
  f('lor-will',     'Willpower',  'number'),
  f('lor-rarity',   'Rarity',     'select', ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Enchanted']),
  f('lor-artist',   'Artist',     'text'),
  f('lor-abilities','Abilities',  'longtext'),
]);

// ---------------------------------------------------------------------------
// One Piece Card Game
// ---------------------------------------------------------------------------
export const ONE_PIECE_PRESET: Preset = p('preset-onepiece', 'One Piece', [
  f('op-num',   'Card Number', 'text'),
  f('op-color', 'Color',       'select', ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow', 'Multi-Color']),
  f('op-type',  'Type',        'select', ['Character', 'Event', 'Stage', 'Leader', 'DON!!']),
  f('op-cost',  'Cost',        'number'),
  f('op-attr',  'Attribute',   'select', ['Strike', 'Slash', 'Ranged', 'Special', 'Wisdom', 'Defend']),
  f('op-power', 'Power',       'number'),
  f('op-counter','Counter',    'select', ['+1000', '+2000', 'None']),
  f('op-rarity', 'Rarity',     'select', ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Secret Rare', 'Special Card', 'Leader']),
  f('op-artist', 'Artist',     'text'),
]);

// ---------------------------------------------------------------------------
// Star Wars Unlimited
// ---------------------------------------------------------------------------
export const SWU_PRESET: Preset = p('preset-swu', 'Star Wars Unlimited', [
  f('swu-type',    'Type',    'select', ['Unit', 'Event', 'Upgrade', 'Base', 'Leader']),
  f('swu-cost',    'Cost',    'number'),
  f('swu-arena',   'Arena',   'select', ['Ground', 'Space']),
  f('swu-aspects', 'Aspects', 'tags'),
  f('swu-power',   'Power',   'number'),
  f('swu-hp',      'HP',      'number'),
  f('swu-rarity',  'Rarity',  'select', ['Common', 'Uncommon', 'Rare', 'Legendary', 'Special']),
  f('swu-traits',  'Traits',  'tags'),
  f('swu-artist',  'Artist',  'text'),
]);

export const DEFAULT_PRESETS: Preset[] = [
  MTG_PRESET,
  LORCANA_PRESET,
  ONE_PIECE_PRESET,
  SWU_PRESET,
];
