import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import CardThumb from '../components/CardThumb';
import { EmptyState } from '../components/ui';
import type { CardStatus } from '../types';

type Filter = CardStatus | 'all';
type Sort = 'recent' | 'name' | 'crush';

const TABS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'owned',    label: 'Owned' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'grail',    label: 'Grail' },
];

export default function Browse() {
  const { cards } = useCollection();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [appeared, setAppeared] = useState(false);
  const prevFilter = useRef(filter);

  // Trigger stagger re-animation on filter change
  useEffect(() => {
    if (prevFilter.current !== filter) {
      setAppeared(false);
      prevFilter.current = filter;
      const t = setTimeout(() => setAppeared(true), 20);
      return () => clearTimeout(t);
    }
  }, [filter]);

  // Initial stagger
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 50);
    return () => clearTimeout(t);
  }, []);

  const shown = useMemo(() => {
    let list = cards.slice();
    const status = (c: typeof cards[0]) => c.status ?? (c.owned ? 'owned' : c.wishlist ? 'wishlist' : 'none');
    if (filter !== 'all') list = list.filter((c) => status(c) === filter);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'crush') list.sort((a, b) => b.crush - a.crush || a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return list;
  }, [cards, filter, sort]);

  const owned = cards.filter((c) => (c.status ?? (c.owned ? 'owned' : 'none')) === 'owned').length;
  const wishlist = cards.filter((c) => (c.status ?? (c.wishlist ? 'wishlist' : 'none')) === 'wishlist').length;
  const grails = cards.filter((c) => c.status === 'grail').length;

  if (!cards.length) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Browse</h1>
        <EmptyState
          icon={<Plus size={24} />}
          title="Your vault is empty"
          hint="Add your first card — upload its art, name it, and crush it."
          action={<Link to="/add" className="btn-primary"><Plus size={16} /> Add a card</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Browse</h1>
        <Link to="/add" className="btn-primary"><Plus size={16} /> Add</Link>
      </div>

      {/* Stats */}
      <p className="text-xs text-white/40">
        {owned} owned · {wishlist} wishlist · {grails} grail{grails !== 1 ? 's' : ''} · {cards.length} total
      </p>

      {/* Filter tabs + sort */}
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
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-hairline bg-void/60 px-3 py-1.5 text-xs text-white focus:border-crush focus:outline-none"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="crush">Crush</option>
          </select>
          <span className="text-xs text-white/40">{shown.length}</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">No cards in this filter.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {shown.map((c, i) => (
            <div
              key={c.id}
              style={{
                opacity: appeared ? 1 : 0,
                transform: appeared ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.3s ease ${Math.min(i, 15) * 30}ms, transform 0.3s ease ${Math.min(i, 15) * 30}ms`,
              }}
            >
              <CardThumb card={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
