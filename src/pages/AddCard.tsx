import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Check, Heart, Star, Box, SlidersHorizontal, ScanText, Loader2, Sparkles, X, Layers } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { useStoredImage, storeImage, deleteImage } from '../lib/images';
import { ocrImage, cleanOcrText, type OcrProgress } from '../lib/ocr';
import { suggestFields, type Suggestion } from '../lib/ocrSuggester';
import { askConfirm } from '../lib/native';
import { getImage } from '../db/database';
import { hashHue, initials } from '../lib/utils';
import type { Card, FieldValue, CardStatus } from '../types';
import ImageDrop from '../components/ImageDrop';
import CrushRating from '../components/CrushRating';
import { FieldInput } from '../components/Fields';
import { useToast } from '../components/Toast';

// ---------------------------------------------------------------------------
// Dupe detection — text overlap scoring
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function overlapPct(newText: string, existingText: string): number {
  const newTokens = new Set(tokenize(newText));
  const existTokens = new Set(tokenize(existingText));
  if (newTokens.size === 0 || existTokens.size === 0) return 0;
  let shared = 0;
  newTokens.forEach((t) => { if (existTokens.has(t)) shared++; });
  return Math.round((shared / newTokens.size) * 100);
}

/** Find the best-matching existing card by OCR text overlap.
 *  Returns the match and percentage, or null if below threshold. */
function findDupe(newText: string, cards: Card[], excludeId?: string): { card: Card; pct: number } | null {
  if (!newText.trim() || cards.length === 0) return null;
  let best: { card: Card; pct: number } | null = null;
  for (const card of cards) {
    if (card.id === excludeId) continue;
    const existingText = [
      card.name,
      card.searchText ?? '',
      card.notes ?? '',
      ...Object.values(card.fields ?? {}).map(String),
    ].join(' ');
    const pct = overlapPct(newText, existingText);
    if (pct >= 50 && (!best || pct > best.pct)) {
      best = { card, pct };
    }
  }
  return best;
}

export default function AddCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cards, presets, settings, createCard, updateCard } = useCollection();
  const { showSave, showDupe } = useToast();
  const editing = useMemo(() => cards.find((c) => c.id === id), [cards, id]);

  const [name, setName] = useState('');
  const [imageId, setImageId] = useState<string | undefined>(undefined);
  const [backImageId, setBackImageId] = useState<string | undefined>(undefined);
  const [dualFace, setDualFace] = useState(false);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [status, setStatus] = useState<CardStatus>('wishlist');
  const [crush, setCrush] = useState(0);
  const [fields, setFields] = useState<Record<string, FieldValue>>({});
  const [notes, setNotes] = useState('');
  const [searchText, setSearchText] = useState('');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [dupeDismissed, setDupeDismissed] = useState(false);
  const [viewingDupe, setViewingDupe] = useState<import('../types').Card | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setImageId(editing.imageId);
    setBackImageId(editing.backImageId);
    setDualFace(editing.dualFace ?? false);
    setPresetId(editing.presetId);
    setStatus(editing.status ?? (editing.owned ? 'owned' : editing.wishlist ? 'wishlist' : 'none'));
    setCrush(editing.crush);
    setFields(editing.fields ?? {});
    setNotes(editing.notes ?? '');
    setSearchText(editing.searchText ?? '');
  }, [editing]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !saved) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, saved]);

  const resetForm = useCallback(() => {
    setName(''); setPresetId(null); setStatus('wishlist'); setCrush(0);
    setNotes(''); setSearchText(''); setFields({});
    setDualFace(false); setImageId(undefined); setBackImageId(undefined);
    setSuggestions([]); setDismissed(false); setDupeDismissed(false);
    setDirty(false);
  }, []);

  const mark = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (v: T | ((prev: T) => T)) => {
      setter(v as T);
      setDirty(true);
    }, []);

  const setName_ = mark(setName);
  const setCrush_ = mark(setCrush);
  const setNotes_ = mark(setNotes);
  const setPresetId_ = mark<string | null>(setPresetId);

  const preview = useStoredImage(imageId);
  const backPreview = useStoredImage(backImageId);
  const preset = presets.find((p) => p.id === presetId);

  const onFile = async (file: File) => {
    const newId = await storeImage(file);
    setImageId(newId);
    setSearchText('');
    setSuggestions([]);
    setDismissed(false);
    setDirty(true);
    // Auto-OCR if enabled in settings
    if (settings.ocrEnabled && settings.ocrAutoRun) {
      // Small delay so the image state has settled
      setTimeout(() => runOcr(newId), 100);
    }
  };

  const onClear = () => {
    setImageId(undefined);
    setSearchText('');
    setSuggestions([]);
    setDismissed(false);
    setDirty(true);
  };

  const onBackFile = async (file: File) => {
    const newId = await storeImage(file);
    setBackImageId(newId);
    setDirty(true);
  };

  const onBackClear = () => {
    setBackImageId(undefined);
    setDirty(true);
  };

  const toggleDualFace = () => {
    const next = !dualFace;
    setDualFace(next);
    // If turning off, clear the back image
    if (!next && backImageId) {
      deleteImage(backImageId).catch(() => {});
      setBackImageId(undefined);
    }
    setDirty(true);
  };

  const runOcr = async (overrideImageId?: string) => {
    const activeImageId = overrideImageId ?? imageId;
    if (!activeImageId) return;
    const frontBlob = await getImage(activeImageId);
    if (!frontBlob) return;
    setSuggestions([]);
    setDismissed(false);
    try {
      // Front face
      setOcrProgress({ status: 'Reading front…', pct: 0 });
      const frontRaw = await ocrImage(frontBlob, (p) =>
        setOcrProgress({ status: dualFace && backImageId ? `Front: ${p.status}` : p.status, pct: p.pct }),
      );

      // Back face (only for dual-face cards that have a back image)
      let backRaw = '';
      if (dualFace && backImageId) {
        const backBlob = await getImage(backImageId);
        if (backBlob) {
          setOcrProgress({ status: 'Reading back…', pct: 0 });
          backRaw = await ocrImage(backBlob, (p) =>
            setOcrProgress({ status: `Back: ${p.status}`, pct: p.pct }),
          );
        }
      }

      // Combine both faces into one searchable string.
      const combined = cleanOcrText([frontRaw, backRaw].filter(Boolean).join('\n'));
      setSearchText(combined);

      // Field suggestions are based on the front face only.
      if (presetId && preset) {
        const sugs = suggestFields(frontRaw, presetId, preset.fields);
        setSuggestions(sugs);
      }

      // Dupe detection — run on the full combined OCR text.
      if (!dupeDismissed && combined.trim()) {
        const dupe = findDupe(combined, cards, editing?.id);
        if (dupe) {
          showDupe(
            dupe.card,
            dupe.pct,
            () => setDupeDismissed(true),
            () => setViewingDupe(dupe.card),
          );
        }
      }
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setOcrProgress(null);
    }
  };

  const applySuggestion = (sug: Suggestion) => {
    const field = preset?.fields.find((f) => f.id === sug.fieldId);
    if (!field) return;
    let value: FieldValue = sug.value;
    if (field.type === 'number') value = parseFloat(sug.value.replace(/[^\d.]/g, '')) || undefined;
    if (field.type === 'tags') value = sug.value.split(',').map((s) => s.trim()).filter(Boolean);
    setFields((f) => ({ ...f, [sug.fieldId]: value }));
    setSuggestions((prev) => prev.filter((s) => s.fieldId !== sug.fieldId));
    setDirty(true);
  };

  const applyAll = () => {
    for (const sug of suggestions) applySuggestion(sug);
    setSuggestions([]);
  };

  const setField = (fid: string, v: FieldValue) => {
    setFields((f) => ({ ...f, [fid]: v }));
    setDirty(true);
  };

  const save = async () => {
    // Clean up old image blobs that were replaced
    if (editing && editing.imageId && editing.imageId !== imageId) {
      await deleteImage(editing.imageId).catch(() => {});
    }
    if (editing && editing.backImageId && editing.backImageId !== backImageId) {
      await deleteImage(editing.backImageId).catch(() => {});
    }
    const patch: Partial<Card> = {
      name, imageId, presetId,
      status,
      owned: status === 'owned',
      wishlist: status === 'wishlist',
      crush, fields,
      dualFace: dualFace || undefined,
      backImageId: dualFace ? backImageId : undefined,
      notes: notes.trim() || undefined,
      searchText: searchText.trim() || undefined,
    };
    setSaved(true);
    setDirty(false);
    if (editing) {
      await updateCard(editing.id, patch);
      showSave('Changes saved');
      navigate(`/card/${editing.id}`);
    } else {
      await createCard(patch);
      showSave('Card added to vault');
      // Stay on Add Card — reset form so you can add the next card
      resetForm();
      setSaved(false);
    }
  };

  const tryLeave = async () => {
    if (editing) {
      // Editing an existing card — navigate back as before
      if (dirty) {
        const ok = await askConfirm('You have unsaved changes. Leave without saving?', 'Unsaved Changes');
        if (!ok) return;
      }
      navigate(-1);
    } else {
      // Creating a new card — just reset the form, stay on Add Card
      resetForm();
    }
  };

  const showSuggestions = suggestions.length > 0 && !dismissed && (settings.ocrSuggestions ?? true);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">
          {editing ? 'Edit Card' : 'Add Card'}
          {dirty && <span className="ml-2 text-xs font-normal text-white/35">Unsaved changes</span>}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[260px_1fr]">
        {/* Image column */}
        <div className="flex flex-col gap-2">
          {/* Dual-face toggle */}
          <button
            type="button"
            onClick={toggleDualFace}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              dualFace
                ? 'border-crush/50 bg-crush/15 text-white'
                : 'border-hairline bg-white/[0.02] text-white/55 hover:bg-white/[0.05]'
            }`}
          >
            <Layers size={15} className={dualFace ? 'text-crush' : 'text-white/30'} />
            Dual-face card
          </button>

          {/* Front face */}
          <div>
            {dualFace && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Front face</p>
            )}
            <ImageDrop url={preview} onFile={onFile} onClear={imageId ? onClear : undefined} />
          </div>

          {/* Back face */}
          {dualFace && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Back face</p>
              <ImageDrop url={backPreview} onFile={onBackFile} onClear={backImageId ? onBackClear : undefined} />
            </div>
          )}

          {/* Save / cancel */}
          <button onClick={save} className="btn-primary w-full justify-center">
            <Box size={15} /> {editing ? 'Save changes' : 'Add to Vault'}
          </button>
          <button onClick={tryLeave} className="btn-ghost w-full justify-center text-xs">
            Cancel
          </button>

          {/* OCR */}
          {imageId && !ocrProgress && (settings.ocrEnabled ?? true) && (
            <button
              onClick={() => runOcr()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/8 hover:text-white active:scale-95"
            >
              <ScanText size={13} />
              {searchText
                ? 'Re-run OCR'
                : dualFace && backImageId
                  ? 'Extract Text (both faces)'
                  : 'Extract Text (OCR)'}
            </button>
          )}

          {ocrProgress && (
            <div className="space-y-1.5 rounded-xl border border-hairline bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" />
                  {ocrProgress.status}
                </span>
                <span>{ocrProgress.pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-crush transition-all duration-300" style={{ width: `${ocrProgress.pct}%` }} />
              </div>
            </div>
          )}

          {searchText && !ocrProgress && !showSuggestions && (
            <p className="px-1 text-[11px] text-white/35">✓ Text extracted — searchable.</p>
          )}
        </div>

        {/* Core fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/45">Name</label>
            <input
              value={name}
              onChange={(e) => setName_(e.target.value)}
              placeholder="Card name"
              className="w-full rounded-xl border border-hairline bg-void/60 px-3 py-2.5 text-base font-semibold text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(['owned', 'wishlist', 'grail'] as CardStatus[]).map((s) => {
              const active = status === s;
              const icon = s === 'owned'
                ? <Check size={15} className={active ? 'text-emerald-400' : 'text-white/30'} />
                : s === 'wishlist'
                ? <Heart size={15} className={active ? 'text-rose-400' : 'text-white/30'} fill={active ? 'currentColor' : 'none'} />
                : <Star size={15} className={active ? 'text-amber-400' : 'text-white/30'} fill={active ? 'currentColor' : 'none'} />;
              const activeStyle = s === 'owned'
                ? 'border-emerald-400/50 bg-emerald-400/15 text-white'
                : s === 'wishlist'
                ? 'border-rose-500/50 bg-rose-500/15 text-white'
                : 'border-amber-400/50 bg-amber-400/15 text-white';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(active ? 'none' : s); setDirty(true); }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? activeStyle : 'border-hairline bg-white/[0.02] text-white/55 hover:bg-white/[0.05]'}`}
                >
                  {icon}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
            <div className="ml-auto">
              <CrushRating value={crush} onChange={(v) => setCrush_(v)} />
            </div>
          </div>

          {/* Preset */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-white/35">
              Preset
              <Link to="/presets" className="inline-flex items-center gap-1 text-crush2/70 hover:text-crush2">
                <SlidersHorizontal size={11} /> Manage
              </Link>
            </label>
            <select
              value={presetId ?? ''}
              onChange={(e) => { setPresetId_(e.target.value || null); setSuggestions([]); }}
              className="w-full rounded-xl border border-hairline bg-void/60 px-3 py-2 text-sm text-white focus:border-crush focus:outline-none"
            >
              <option value="">None (just name &amp; image)</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Suggestion panel */}
          {showSuggestions && (
            <div className="rounded-xl border border-crush/25 bg-crush/8 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
                  <Sparkles size={13} className="text-crush" />
                  {suggestions.length} field{suggestions.length !== 1 ? 's' : ''} detected
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={applyAll} className="text-xs font-bold text-crush2 hover:underline">Apply all</button>
                  <button onClick={() => setDismissed(true)} className="text-white/30 hover:text-white/60"><X size={14} /></button>
                </div>
              </div>
              {suggestions.map((sug) => (
                <div key={sug.fieldId} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/40">{sug.fieldLabel}</p>
                    <p className="truncate text-sm font-semibold text-white">{sug.value}</p>
                  </div>
                  <button
                    onClick={() => applySuggestion(sug)}
                    className="shrink-0 rounded-lg bg-crush/20 px-2.5 py-1 text-xs font-bold text-crush2 transition hover:bg-crush/35"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}

          {preset && preset.fields.length > 0 && (
            <div className="space-y-3">
              {preset.fields.map((f) => (
                <div key={f.id}>
                  <label className="mb-1 block text-xs text-white/35">{f.label}</label>
                  <FieldInput field={f} value={fields[f.id]} onChange={(v) => setField(f.id, v)} />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-white/35">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes_(e.target.value)}
              rows={2}
              placeholder="Condition, where you got it…"
              className="w-full rounded-xl border border-hairline bg-void/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dupe card sheet — slides up over the add form without navigating away */}
      {viewingDupe && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setViewingDupe(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full rounded-t-3xl border-t border-white/10 bg-ink p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Existing Card</p>
              <button onClick={() => setViewingDupe(null)} className="text-white/40 hover:text-white/70 transition">
                <X size={18} />
              </button>
            </div>
            <DupeCardPreview card={viewingDupe} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline dupe card preview for the sheet
// ---------------------------------------------------------------------------
function DupeCardPreview({ card }: { card: import('../types').Card }) {
  const url = useStoredImage(card.imageId);
  const hue = hashHue(card.name);
  const ini = initials(card.name);
  const status = card.status ?? (card.owned ? 'owned' : card.wishlist ? 'wishlist' : 'none');
  const statusLabel = status === 'owned' ? 'Owned' : status === 'wishlist' ? 'Wishlist' : status === 'grail' ? 'Grail' : 'Not tracked';
  const statusColor = status === 'owned' ? 'text-emerald-400' : status === 'wishlist' ? 'text-rose-400' : status === 'grail' ? 'text-amber-400' : 'text-white/40';

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
        {url
          ? <img src={url} alt={card.name} className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(150deg, hsl(${hue} 55% 22%), hsl(${(hue + 40) % 360} 50% 12%))` }}>
              <span className="font-display text-2xl font-black text-white/80">{ini}</span>
            </div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-white truncate">{card.name}</p>
        <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
        {card.crush > 0 && (
          <div className="mt-1.5 flex gap-0.5">
            {Array.from({ length: card.crush }).map((_, i) => (
              <Heart key={i} size={12} className="text-crush" fill="currentColor" />
            ))}
          </div>
        )}
        {card.notes && <p className="mt-2 text-xs text-white/50 line-clamp-2">{card.notes}</p>}
      </div>
    </div>
  );
}
