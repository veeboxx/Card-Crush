import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, Trash2, Check, Heart, ArrowLeft, BookMarked, Layers } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { useStoredImage } from '../lib/images';
import { askConfirm } from '../lib/native';
import { hashHue, initials } from '../lib/utils';
import CrushRating from '../components/CrushRating';
import { FieldDisplay, hasValue } from '../components/Fields';
import { EmptyState } from '../components/ui';

function CardArt({ url, name, hue }: { url: string | null; name: string; hue: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/12 shadow-card" style={{ aspectRatio: '5 / 7' }}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: `linear-gradient(150deg, hsl(${hue} 55% 24%), hsl(${(hue + 40) % 360} 50% 12%))` }}
        >
          <span className="font-display text-6xl font-black text-white/80">{initials(name)}</span>
        </div>
      )}
    </div>
  );
}

export default function CardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cards, presets, updateCard, deleteCard } = useCollection();
  const card = useMemo(() => cards.find((c) => c.id === id), [cards, id]);

  const [showBack, setShowBack] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const frontUrl = useStoredImage(card?.imageId);
  const backUrl = useStoredImage(card?.backImageId);

  if (!card) {
    return <EmptyState icon={<ArrowLeft size={24} />} title="Card not found" action={<Link to="/" className="btn-ghost">Back to Browse</Link>} />;
  }

  const preset = presets.find((p) => p.id === card.presetId);
  const hue = hashHue(card.name);
  const shownFields = (preset?.fields ?? []).filter((f) => hasValue(card.fields[f.id]));

  const statusLabel = card.owned ? 'Owned' : card.wishlist ? 'Wishlist' : null;
  const statusStyle = card.owned
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : 'border-crush/40 bg-crush/10 text-crush2';

  const flip = () => {
    if (!card.dualFace) return;
    setFlipping(true);
    setTimeout(() => {
      setShowBack((v) => !v);
      setFlipping(false);
    }, 180);
  };

  const activeUrl = showBack ? backUrl : frontUrl;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,340px)_1fr]">

        {/* Art */}
        <div className="md:sticky md:top-8 md:self-start">
          <div className="relative">
            {/* Color glow behind card */}
            <div
              className="absolute inset-0 scale-90 rounded-3xl opacity-30 blur-2xl"
              style={{ background: `hsl(${hue} 70% 40%)`, transform: 'scale(0.88) translateY(8px)' }}
            />
            {/* Flip wrapper */}
            <div
              className={`relative transition-opacity duration-[180ms] ${flipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              style={{ transition: 'opacity 180ms, transform 180ms' }}
            >
              <CardArt url={activeUrl} name={card.name} hue={hue} />
            </div>
          </div>

          {/* Flip button — only shown for dual-face cards */}
          {card.dualFace && (
            <button
              onClick={flip}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white/[0.04] py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Layers size={15} />
              {showBack ? 'Show front face' : 'Show back face'}
            </button>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">

          {/* Identity */}
          <div>
            {preset?.name && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">{preset.name}</p>
            )}
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white">{card.name}</h1>
            {card.dualFace && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-white/35">
                <Layers size={11} /> Dual-face card
              </p>
            )}

            <div className="mt-3">
              <CrushRating value={card.crush} onChange={(v) => updateCard(card.id, { crush: v })} size={24} />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateCard(card.id, { owned: !card.owned, wishlist: card.owned ? card.wishlist : false })}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
                card.owned ? statusStyle : 'border-hairline bg-white/[0.02] text-white/40 hover:text-white/70'
              }`}
            >
              <Check size={14} className={card.owned ? 'text-emerald-400' : ''} />
              Owned
            </button>
            <button
              onClick={() => updateCard(card.id, { wishlist: !card.wishlist, owned: card.wishlist ? card.owned : false })}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
                card.wishlist ? 'border-crush/40 bg-crush/10 text-crush2' : 'border-hairline bg-white/[0.02] text-white/40 hover:text-white/70'
              }`}
            >
              <Heart size={14} className={card.wishlist ? 'text-crush' : ''} fill={card.wishlist ? 'currentColor' : 'none'} />
              Wishlist
            </button>
            {!statusLabel && (
              <span className="text-xs text-white/25 italic">Not tracked yet</span>
            )}
          </div>

          {/* Field spec sheet */}
          {shownFields.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.025]">
              {shownFields.map((f, i) => (
                <div key={f.id} className={`flex items-start justify-between gap-6 px-4 py-3 ${i ? 'border-t border-white/5' : ''}`}>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-white/40">{f.label}</span>
                  <div className="text-right"><FieldDisplay field={f} value={card.fields[f.id]} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {card.notes && (
            <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                <BookMarked size={11} /> Notes
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{card.notes}</p>
            </div>
          )}

          {shownFields.length === 0 && !card.notes && (
            <p className="text-sm text-white/25 italic">
              No fields filled in yet.{' '}
              <Link to={`/edit/${card.id}`} className="text-white/40 underline underline-offset-2 hover:text-white/70">Edit this card</Link> to add details.
            </p>
          )}

          {/* Actions */}
          <div className="mt-auto pt-2">
            <Link to={`/edit/${card.id}`} className="btn-primary w-full justify-center">
              <Pencil size={15} /> Edit Card
            </Link>
            <button
              onClick={async () => {
                if (await askConfirm(`Delete "${card.name}"? This can't be undone.`, 'Delete Card')) {
                  deleteCard(card.id);
                  navigate('/');
                }
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-white/25 transition hover:text-rose-300"
            >
              <Trash2 size={12} /> Delete this card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
