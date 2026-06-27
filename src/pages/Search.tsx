import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import type { Card, CardStatus } from '../types';
import CardThumb from '../components/CardThumb';

// ---------------------------------------------------------------------------
// Haystack builder
// ---------------------------------------------------------------------------
function buildHaystack(c: Card): string {
  const parts: string[] = [c.name, c.notes ?? '', c.searchText ?? '', c.grailNote ?? ''];
  for (const v of Object.values(c.fields ?? {})) {
    if (Array.isArray(v)) parts.push(v.join(' '));
    else if (v !== undefined && v !== null) parts.push(String(v));
  }
  return parts.join(' \x01 ').toLowerCase();
}

// ---------------------------------------------------------------------------
// Fuzzy helpers
// ---------------------------------------------------------------------------

/** Trigram set for a string. */
function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  const padded = `  ${s}  `;
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

/** Rough trigram similarity 0–1. */
function trigramSim(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  ta.forEach((g) => { if (tb.has(g)) shared++; });
  return (2 * shared) / (ta.size + tb.size || 1);
}

/** Does the haystack contain the token, or is the token close enough? */
function tokenMatches(haystack: string, token: string): boolean {
  if (haystack.includes(token)) return true;
  // Fuzzy: only kick in for tokens >= 4 chars to avoid too much noise
  if (token.length < 4) return false;
  // Check each word in the haystack for similarity
  const words = haystack.split(/[\s\x01]+/);
  return words.some((w) => w.length >= 3 && trigramSim(token, w) > 0.55);
}

// ---------------------------------------------------------------------------
// Scoring — prefix matches in name rank highest
// ---------------------------------------------------------------------------
function score(c: Card, tokens: string[]): number {
  const name = c.name.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (name.startsWith(t)) s += 3;
    else if (name.includes(t)) s += 2;
    else s += 1; // matched in haystack/OCR
  }
  return s;
}

// ---------------------------------------------------------------------------
// Filter type
// ---------------------------------------------------------------------------
type Filter = CardStatus | 'all';

const TABS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'owned',    label: 'Owned' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'grail',    label: 'Grail' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Search() {
  const { cards } = useCollection();
  const [raw, setRaw] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(raw.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [raw]);

  const cardStatus = (c: Card): CardStatus =>
    c.status ?? (c.owned ? 'owned' : c.wishlist ? 'wishlist' : 'none');

  const index = useMemo(
    () => cards.map((c) => ({ c, h: buildHaystack(c) })),
    [cards],
  );

  const results = useMemo(() => {
    // Filter first
    let pool = filter === 'all'
      ? index
      : index.filter(({ c }) => cardStatus(c) === filter);

    if (!q) return pool.map(({ c }) => c);

    const tokens = q.split(/\s+/).filter(Boolean);

    // Filter: every token must match somewhere (exact or fuzzy)
    const matched = pool.filter(({ h }) => tokens.every((t) => tokenMatches(h, t)));

    // Sort by score descending
    matched.sort((a, b) => score(b.c, tokens) - score(a.c, tokens));

    return matched.map(({ c }) => c);
  }, [index, q, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Search</h1>
      </div>

      {/* Search box */}
      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Search names, card text, fields…"
          className="w-full rounded-2xl border border-hairline bg-void/60 py-3 pl-11 pr-4 text-base text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
        />
        {raw && (
          <button
            onClick={() => setRaw('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === tab.id
                ? tab.id === 'grail'
                  ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                  : tab.id === 'wishlist'
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                  : tab.id === 'owned'
                  ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-crush/20 text-crush2 ring-1 ring-crush/40'
                : 'border border-hairline bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!q && filter === 'all' ? (
        <p className="py-10 text-center text-sm text-white/40">
          Search {cards.length} cards — names, OCR text, notes, and every field.
        </p>
      ) : results.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">No cards match{raw ? ` "${raw}"` : ''}.</p>
      ) : (
        <>
          <p className="text-xs text-white/40">{results.length} result{results.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {results.map((c) => <CardThumb key={c.id} card={c} />)}
          </div>
        </>
      )}
    </div>
  );
}
