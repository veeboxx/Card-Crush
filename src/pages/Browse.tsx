import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import CardThumb from '../components/CardThumb';
import { EmptyState, Chip } from '../components/ui';

type Own = 'all' | 'owned' | 'wishlist';
type Sort = 'recent' | 'name' | 'crush';

export default function Browse() {
  const { cards, presets } = useCollection();
  const [own, setOwn] = useState<Own>('all');
  const [presetId, setPresetId] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');

  const shown = useMemo(() => {
    let list = cards.slice();
    if (own === 'owned') list = list.filter((c) => c.owned);
    else if (own === 'wishlist') list = list.filter((c) => c.wishlist);
    if (presetId !== 'all') list = list.filter((c) => (c.presetId ?? '') === presetId);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'crush') list.sort((a, b) => b.crush - a.crush || a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return list;
  }, [cards, own, presetId, sort]);

  if (!cards.length) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Browse</h1>
        <EmptyState
          icon={<LayoutGrid size={24} />}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={own === 'all'} onClick={() => setOwn('all')}>All</Chip>
        <Chip active={own === 'owned'} onClick={() => setOwn('owned')}>Owned</Chip>
        <Chip active={own === 'wishlist'} onClick={() => setOwn('wishlist')}>Wishlist</Chip>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="rounded-full border border-hairline bg-void/60 px-3 py-1.5 text-xs text-white focus:border-crush focus:outline-none"
        >
          <option value="all">All presets</option>
          {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-full border border-hairline bg-void/60 px-3 py-1.5 text-xs text-white focus:border-crush focus:outline-none"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="crush">Crush</option>
        </select>
        <span className="ml-auto text-xs text-white/40">{shown.length} cards</span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {shown.map((c) => <CardThumb key={c.id} card={c} />)}
      </div>
    </div>
  );
}
