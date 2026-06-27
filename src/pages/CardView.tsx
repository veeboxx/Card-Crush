import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft, BookMarked, Layers, Star, Check, Heart } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { useStoredImage } from '../lib/images';
import { askConfirm } from '../lib/native';
import { hashHue, initials } from '../lib/utils';
import CrushRating from '../components/CrushRating';
import { FieldDisplay, hasValue } from '../components/Fields';
import { EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import type { CardStatus } from '../types';

// ---------------------------------------------------------------------------
// 3D flip card art
// ---------------------------------------------------------------------------
function CardFlip({ frontUrl, backUrl, name, hue, dualFace }: {
  frontUrl: string | null;
  backUrl: string | null;
  name: string;
  hue: number;
  dualFace: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  const face = (url: string | null, back = false) => (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
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

  return (
    <div className="space-y-3">
      <div
        style={{ perspective: '900px' }}
        className="relative w-full"
        onClick={() => dualFace && setFlipped((v) => !v)}
      >
        <div
          className="relative w-full"
          style={{
            aspectRatio: '5 / 7',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.45s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {face(frontUrl)}
          {face(backUrl, true)}
        </div>
      </div>

      {dualFace && (
        <button
          onClick={() => setFlipped((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white/[0.04] py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <Layers size={15} />
          {flipped ? 'Show front face' : 'Show back face'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status toggle row
// ---------------------------------------------------------------------------
function StatusRow({ status, onChange }: { status: CardStatus; onChange: (s: CardStatus) => void }) {
  const btn = (s: CardStatus, label: string, icon: React.ReactNode, activeClass: string) => (
    <button
      onClick={() => onChange(status === s ? 'none' : s)}
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
        status === s ? activeClass : 'border-hairline bg-white/[0.02] text-white/40 hover:text-white/70'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btn('owned',    'Owned',   <Check size={14} className={status === 'owned'   ? 'text-emerald-400' : ''} />, 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300')}
      {btn('wishlist', 'Wishlist', <Heart size={14} className={status === 'wishlist' ? 'text-rose-400' : ''} fill={status === 'wishlist' ? 'currentColor' : 'none'} />, 'border-rose-500/40 bg-rose-500/10 text-rose-300')}
      {btn('grail',    'Grail',   <Star  size={14} className={status === 'grail'   ? 'text-amber-400' : ''} fill={status === 'grail' ? 'currentColor' : 'none'} />, 'border-amber-400/40 bg-amber-400/10 text-amber-300')}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CardView
// ---------------------------------------------------------------------------
export default function CardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cards, presets, updateCard, deleteCard } = useCollection();
  const { showSave } = useToast();
  const card = useMemo(() => cards.find((c) => c.id === id), [cards, id]);

  const [appeared, setAppeared] = useState(false);
  const [glowColor, setGlowColor] = useState<string | null>(null);

  const frontUrl = useStoredImage(card?.imageId);
  const backUrl  = useStoredImage(card?.backImageId);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Extract dominant color from the card image for the glow
  useEffect(() => {
    if (!frontUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 22;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 22);
        const d = ctx.getImageData(6, 4, 4, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        const n = d.length / 4;
        setGlowColor(`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`);
      } catch { /* ignore cross-origin issues */ }
    };
    img.src = frontUrl;
  }, [frontUrl]);

  if (!card) {
    return <EmptyState icon={<ArrowLeft size={24} />} title="Card not found" action={<Link to="/" className="btn-ghost">Back to Browse</Link>} />;
  }

  const preset = presets.find((p) => p.id === card.presetId);
  const hue = hashHue(card.name);
  const shownFields = (preset?.fields ?? []).filter((f) => hasValue(card.fields[f.id]));
  const status: CardStatus = card.status ?? (card.owned ? 'owned' : card.wishlist ? 'wishlist' : 'none');

  const handleStatusChange = (s: CardStatus) => {
    updateCard(card.id, { status: s });
    showSave(s === 'owned' ? 'Marked as owned' : s === 'wishlist' ? 'Added to wishlist' : s === 'grail' ? 'Marked as grail' : 'Status cleared');
  };

  return (
    <div
      className="space-y-5"
      style={{
        opacity: appeared ? 1 : 0,
        transform: appeared ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,340px)_1fr]">

        {/* Art column */}
        <div className="md:sticky md:top-8 md:self-start">
          <div className="relative">
            {/* Extracted-color glow */}
            <div
              className="absolute inset-0 rounded-3xl opacity-40 blur-2xl transition-all duration-700"
              style={{
                background: glowColor ?? `hsl(${hue} 70% 40%)`,
                transform: 'scale(0.88) translateY(10px)',
              }}
            />
            <CardFlip
              frontUrl={frontUrl}
              backUrl={backUrl}
              name={card.name}
              hue={hue}
              dualFace={!!card.dualFace}
            />
          </div>
        </div>

        {/* Details column */}
        <div
          className="flex flex-col gap-5"
          style={{
            opacity: appeared ? 1 : 0,
            transition: 'opacity 0.4s ease 0.1s',
          }}
        >
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

          {/* Status toggles */}
          <StatusRow status={status} onChange={handleStatusChange} />

          {/* Grail note */}
          {status === 'grail' && (
            <div
              className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"
              style={{ opacity: appeared ? 1 : 0, transition: 'opacity 0.3s ease 0.2s' }}
            >
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400/70">
                <Star size={11} /> Grail Note
              </p>
              <input
                className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
                placeholder="Market value, notes… (~$450 on TCGplayer)"
                defaultValue={card.grailNote ?? ''}
                onBlur={(e) => updateCard(card.id, { grailNote: e.target.value || undefined })}
              />
            </div>
          )}

          {/* Field spec sheet — glass style */}
          {shownFields.length > 0 && (
            <div
              className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.025] backdrop-blur-sm"
              style={{ opacity: appeared ? 1 : 0, transition: 'opacity 0.35s ease 0.15s' }}
            >
              {shownFields.map((f, i) => (
                <div
                  key={f.id}
                  className={`flex items-start justify-between gap-6 px-4 py-3 ${i ? 'border-t border-white/5' : ''}`}
                  style={{
                    opacity: appeared ? 1 : 0,
                    transform: appeared ? 'translateX(0)' : 'translateX(8px)',
                    transition: `opacity 0.3s ease ${(i + 2) * 40}ms, transform 0.3s ease ${(i + 2) * 40}ms`,
                  }}
                >
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-white/40">{f.label}</span>
                  <div className="text-right"><FieldDisplay field={f} value={card.fields[f.id]} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {card.notes && (
            <div
              className="rounded-2xl border border-white/6 bg-white/[0.025] p-4"
              style={{ opacity: appeared ? 1 : 0, transition: 'opacity 0.35s ease 0.25s' }}
            >
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
