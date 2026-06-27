import { Link } from 'react-router-dom';
import { Heart, Layers } from 'lucide-react';
import type { Card } from '../types';
import { useStoredImage } from '../lib/images';
import { hashHue, initials } from '../lib/utils';

export default function CardThumb({ card }: { card: Card }) {
  const url = useStoredImage(card.imageId);
  const hue = hashHue(card.name);
  const status = card.status ?? (card.owned ? 'owned' : card.wishlist ? 'wishlist' : 'none');

  const dotColor =
    status === 'owned'   ? 'bg-emerald-400' :
    status === 'wishlist'? 'bg-rose-500' :
    status === 'grail'   ? 'bg-amber-400' :
    null;

  return (
    <Link to={`/card/${card.id}`} className="group block">
      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-white/8 shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-crush/40"
        style={{ aspectRatio: '5 / 7' }}
      >
        {url ? (
          <img src={url} alt={card.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(150deg, hsl(${hue} 55% 22%), hsl(${(hue + 40) % 360} 50% 12%))` }}
          >
            <span className="font-display text-3xl font-black text-white/80">{initials(card.name)}</span>
          </div>
        )}

        {/* gradient + name footer */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 pt-8">
          <p className="truncate text-xs font-bold text-white">{card.name}</p>
          {card.crush > 0 && (
            <div className="mt-0.5 flex items-center gap-0.5">
              {Array.from({ length: card.crush }).map((_, i) => (
                <Heart key={i} size={9} className="text-crush" fill="currentColor" />
              ))}
            </div>
          )}
        </div>

        {/* top-left badges */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {card.dualFace && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white/70 backdrop-blur-sm">
              <Layers size={9} /> 2
            </span>
          )}
        </div>

        {/* status dot — top right */}
        {dotColor && (
          <span
            className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-black/40 ${dotColor}`}
            title={status}
          />
        )}
      </div>
    </Link>
  );
}
