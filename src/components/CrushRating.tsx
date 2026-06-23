import { useState, type CSSProperties } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  value: number;
  /** When provided, the control is interactive. Omit for read-only display. */
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}

// Directions for the little burst when a card hits a full 5-heart crush.
const BURST = [
  { bx: '-22px', by: '-26px' },
  { bx: '0px', by: '-34px' },
  { bx: '22px', by: '-26px' },
  { bx: '-30px', by: '-6px' },
  { bx: '30px', by: '-6px' },
  { bx: '-14px', by: '-30px' },
  { bx: '14px', by: '-30px' },
];

/**
 * The "crush" rating — how hard you crush on a card, 0–5. Filled hearts in the
 * signature crush magenta. Tapping the current top heart again clears to 0.
 * Every rating change fires a small celebratory heart-burst; full 5 gets extra particles.
 */
export default function CrushRating({ value, onChange, size = 18, className = '' }: Props) {
  const interactive = typeof onChange === 'function';
  const [burst, setBurst] = useState(false);
  const [burstOrigin, setBurstOrigin] = useState(5);

  const handle = (n: number) => {
    const next = value === n ? 0 : n;
    if (next > 0) {
      setBurstOrigin(next);
      setBurst(true);
      setTimeout(() => setBurst(false), 650);
    }
    onChange!(next);
  };

  // Use fewer particles for lower ratings, full set for 5.
  const particles = BURST.slice(0, Math.max(3, burstOrigin + 2));
  const scale = 0.6 + (burstOrigin / 5) * 0.4;

  return (
    <div className={`relative inline-flex items-center gap-0.5 ${className}`}>
      {interactive && burst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {particles.map((d, i) => (
            <Heart
              key={i}
              size={size * scale}
              className="crush-burst-heart absolute text-crush"
              fill="currentColor"
              style={{ ['--bx']: d.bx, ['--by']: d.by, animationDelay: `${i * 18}ms` } as CSSProperties}
            />
          ))}
        </div>
      )}
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const heart = (
          <Heart
            size={size}
            className={filled ? 'text-crush' : 'text-white/20'}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        );
        if (!interactive) return <span key={n}>{heart}</span>;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Set crush rating to ${n}`}
            onClick={() => handle(n)}
            className="transition active:scale-90 hover:scale-110"
          >
            {heart}
          </button>
        );
      })}
    </div>
  );
}
