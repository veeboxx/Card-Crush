import { type ReactNode } from 'react';

export function SectionHeader({ title, action, sub }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="text-xs text-white/45">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 glass px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/50">{icon}</div>
      <p className="font-display text-lg font-bold text-white">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-white/45">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Chip({ children, onClick, active, accent }: { children: ReactNode; onClick?: () => void; active?: boolean; accent?: string }) {
  return (
    <button
      onClick={onClick}
      className={`pill border transition active:scale-95 ${
        active ? 'border-transparent bg-crush text-onaccent shadow-glow' : 'border-hairline bg-white/5 text-white/65 hover:bg-white/10'
      }`}
      style={active && accent ? { background: accent, boxShadow: `0 6px 24px ${accent}55` } : undefined}
    >
      {children}
    </button>
  );
}
