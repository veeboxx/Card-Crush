import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import type { Card } from '../types';
import CardThumb from '../components/CardThumb';

function haystackAll(c: Card): string {
  const parts: string[] = [c.name, c.notes ?? '', c.searchText ?? ''];
  for (const v of Object.values(c.fields ?? {})) {
    if (Array.isArray(v)) parts.push(v.join(' '));
    else if (v !== undefined && v !== null) parts.push(String(v));
  }
  return parts.join(' \u0001 ').toLowerCase();
}

function haystackFields(c: Card): string {
  const parts: string[] = [c.name, c.notes ?? ''];
  for (const v of Object.values(c.fields ?? {})) {
    if (Array.isArray(v)) parts.push(v.join(' '));
    else if (v !== undefined && v !== null) parts.push(String(v));
  }
  return parts.join(' \u0001 ').toLowerCase();
}

export default function Search() {
  const { cards, settings } = useCollection();
  const [raw, setRaw] = useState('');
  const [q, setQ] = useState('');

  const mode = settings.searchMode ?? 'all';

  useEffect(() => {
    const t = setTimeout(() => setQ(raw.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [raw]);

  const index = useMemo(
    () => cards.map((c) => ({ c, h: mode === 'all' ? haystackAll(c) : haystackFields(c) })),
    [cards, mode],
  );

  const results = useMemo(() => {
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    return index.filter(({ h }) => terms.every((t) => h.includes(t))).map(({ c }) => c);
  }, [index, q]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Search</h1>
        <span className="text-xs text-white/30">
          {mode === 'all' ? 'Card text + fields' : 'Fields only'}
        </span>
      </div>

      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={mode === 'all' ? 'Search names, card text, fields…' : 'Search names and fields…'}
          className="w-full rounded-2xl border border-hairline bg-void/60 py-3 pl-11 pr-4 text-base text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
        />
      </div>

      {!q ? (
        <p className="py-10 text-center text-sm text-white/40">
          {mode === 'all'
            ? `Search across ${cards.length} cards — names, OCR text, notes, and every field.`
            : `Search across ${cards.length} cards — names, notes, and named fields only.`}
        </p>
      ) : results.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">No cards match "{raw}".</p>
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
