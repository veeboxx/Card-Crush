// Toast system for Card Crush.
// Provides a ToastProvider and useToast hook.
// Renders toasts in a fixed portal at the bottom of the screen.
// Supports: 'save' (green, auto-dismiss 2s) and 'dupe' (amber/red, manual dismiss).

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { useStoredImage } from '../lib/images';
import type { Card } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaveToast {
  kind: 'save';
  message: string;
}

interface DupeToast {
  kind: 'dupe';
  match: Card;
  pct: number;
  onAddAnyway: () => void;
  onViewCard: () => void;
}

type Toast = (SaveToast | DupeToast) & { id: string };

interface ToastCtxValue {
  showSave: (message?: string) => void;
  showDupe: (match: Card, pct: number, onAddAnyway: () => void, onViewCard: () => void) => void;
  dismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastCtx = createContext<ToastCtxValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Individual toast renderers
// ---------------------------------------------------------------------------

function SaveToastCard({ toast, dismiss }: { toast: Toast & { kind: 'save' }; dismiss: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 shadow-xl backdrop-blur-xl"
      style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
        <Check size={14} className="text-emerald-400" />
      </span>
      <p className="flex-1 text-sm font-semibold text-white">{toast.message}</p>
      <button onClick={dismiss} className="text-white/30 hover:text-white/60 transition">
        <X size={14} />
      </button>
    </div>
  );
}

function DupeThumb({ card }: { card: Card }) {
  const url = useStoredImage(card.imageId);
  if (!url) return null;
  return <img src={url} alt={card.name} className="h-12 w-9 rounded-lg object-cover ring-1 ring-white/10 shrink-0" />;
}

function DupeToastCard({ toast, dismiss }: { toast: Toast & { kind: 'dupe' }; dismiss: () => void }) {
  const status = toast.match.status ?? (toast.match.owned ? 'owned' : toast.match.wishlist ? 'wishlist' : 'none');
  const statusLabel = status === 'owned' ? 'Owned' : status === 'wishlist' ? 'Wishlist' : status === 'grail' ? 'Grail' : 'In collection';
  const statusColor = status === 'owned' ? 'text-emerald-400' : status === 'wishlist' ? 'text-rose-400' : status === 'grail' ? 'text-amber-400' : 'text-white/50';
  const isLikely = toast.pct >= 70;
  const borderColor = isLikely ? 'border-rose-500/25' : 'border-amber-400/25';
  const bgColor = isLikely ? 'bg-rose-500/8' : 'bg-amber-400/8';
  const iconColor = isLikely ? 'text-rose-400' : 'text-amber-400';
  const iconBg = isLikely ? 'bg-rose-500/20' : 'bg-amber-400/20';

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${borderColor} ${bgColor} shadow-xl backdrop-blur-xl`}
      style={{ animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <AlertTriangle size={12} className={iconColor} />
        </span>
        <p className={`text-xs font-bold ${iconColor}`}>
          {isLikely ? 'Likely duplicate' : 'Possible duplicate'} — {toast.pct}% match
        </p>
        <button onClick={dismiss} className="ml-auto text-white/25 hover:text-white/50 transition">
          <X size={14} />
        </button>
      </div>

      {/* Match card preview */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <DupeThumb card={toast.match} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{toast.match.name}</p>
          <p className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/[0.06]">
        <button
          onClick={() => { toast.onAddAnyway(); dismiss(); }}
          className="flex-1 py-2.5 text-xs font-semibold text-white/50 transition hover:text-white/80 hover:bg-white/[0.04]"
        >
          Add Anyway
        </button>
        <div className="w-px bg-white/[0.06]" />
        <button
          onClick={() => { toast.onViewCard(); dismiss(); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold ${iconColor} transition hover:brightness-110`}
        >
          <ExternalLink size={11} /> View Card
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const showSave = useCallback((message = 'Card saved') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts.filter((t) => t.kind !== 'save'), { kind: 'save', id, message }]);
    setTimeout(() => dismiss(id), 2200);
  }, [dismiss]);

  const showDupe = useCallback((match: Card, pct: number, onAddAnyway: () => void, onViewCard: () => void) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts.filter((t) => t.kind !== 'dupe'), { kind: 'dupe', id, match, pct, onAddAnyway, onViewCard }]);
  }, []);

  return (
    <ToastCtx.Provider value={{ showSave, showDupe, dismiss }}>
      {children}
      {/* Portal */}
      <div className="fixed bottom-6 left-1/2 z-[200] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) =>
          t.kind === 'save'
            ? <SaveToastCard key={t.id} toast={t} dismiss={() => dismiss(t.id)} />
            : <DupeToastCard key={t.id} toast={t} dismiss={() => dismiss(t.id)} />
        )}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}
