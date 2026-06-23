import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, SlidersHorizontal, X, Eye } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import type { FieldDef, FieldType, Preset, FieldValue } from '../types';
import { FIELD_TYPE_LABEL } from '../types';
import { uid } from '../lib/utils';
import { EmptyState } from '../components/ui';
import { askConfirm } from '../lib/native';
import { FieldInput } from '../components/Fields';

const TYPES: FieldType[] = ['text', 'longtext', 'number', 'boolean', 'select', 'tags'];

export default function Presets() {
  const { presets, createPreset, updatePreset, deletePreset, cards } = useCollection();
  const [activeId, setActiveId] = useState<string | null>(presets[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Raw text of each select field's options box, so commas can be typed freely.
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  // Throwaway values for the live preview pane.
  const [sample, setSample] = useState<Record<string, FieldValue>>({});

  const active = presets.find((p) => p.id === activeId) ?? null;
  const usageCount = (pid: string) => cards.filter((c) => c.presetId === pid).length;

  const addPreset = async () => {
    const name = newName.trim() || `Preset ${presets.length + 1}`;
    const p = await createPreset(name);
    setNewName('');
    setActiveId(p.id);
  };

  const setFields = (p: Preset, fields: FieldDef[]) => updatePreset(p.id, { fields });

  const addField = (p: Preset) => {
    const f: FieldDef = { id: uid('f'), label: 'New field', type: 'text' };
    setFields(p, [...p.fields, f]);
  };
  const patchField = (p: Preset, fid: string, patch: Partial<FieldDef>) =>
    setFields(p, p.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)));
  const removeField = (p: Preset, fid: string) => setFields(p, p.fields.filter((f) => f.id !== fid));
  const move = (p: Preset, from: number, to: number) => {
    if (to < 0 || to >= p.fields.length) return;
    const next = [...p.fields];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setFields(p, next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <SlidersHorizontal size={22} className="text-crush" /> Presets
        </h1>
        <p className="text-xs text-white/45">Field templates per game. A card picks a preset to get its extra fields.</p>
      </div>

      {/* Preset chips + create */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${p.id === activeId ? 'bg-crush text-onaccent' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            {p.name}
            <span className="ml-1.5 opacity-60">{p.fields.length}</span>
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPreset(); }}
            placeholder="New preset name"
            className="w-40 rounded-full border border-hairline bg-void/60 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
          />
          <button onClick={addPreset} className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/15">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {!active ? (
        <EmptyState icon={<SlidersHorizontal size={24} />} title="No preset selected" hint="Create a preset above — e.g. ‘One Piece’ or ‘Lorcana’ — then add the fields that game needs." />
      ) : (
        <section className="space-y-4 rounded-xl2 glass p-5">
          <div className="flex items-center gap-3">
            <input
              value={active.name}
              onChange={(e) => updatePreset(active.id, { name: e.target.value })}
              className="flex-1 rounded-xl border border-hairline bg-void/60 px-3 py-2 text-base font-bold text-white focus:border-crush focus:outline-none"
            />
            <button
              onClick={async () => { if (await askConfirm(`Delete preset “${active.name}”? Cards keep their values.`, 'Delete Preset')) { deletePreset(active.id); setActiveId(null); } }}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20"
            >
              <Trash2 size={15} />
            </button>
          </div>
          {usageCount(active.id) > 0 && <p className="text-[11px] text-white/40">Used by {usageCount(active.id)} card(s).</p>}

          {/* Editor + live preview */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              {active.fields.map((f, i) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIndex !== null && dragIndex !== i) move(active, dragIndex, i); setDragIndex(null); }}
                  className="rounded-xl border border-hairline bg-white/[0.02] p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="cursor-grab text-white/30" title="Drag to reorder"><GripVertical size={16} /></span>
                    <input
                      value={f.label}
                      onChange={(e) => patchField(active, f.id, { label: e.target.value })}
                      className="flex-1 rounded-lg border border-hairline bg-void/60 px-2.5 py-1.5 text-sm text-white focus:border-crush focus:outline-none"
                    />
                    <select
                      value={f.type}
                      onChange={(e) => patchField(active, f.id, { type: e.target.value as FieldType })}
                      className="rounded-lg border border-hairline bg-void/60 px-2 py-1.5 text-xs text-white focus:border-crush focus:outline-none"
                    >
                      {TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
                    </select>
                    <div className="flex flex-col">
                      <button onClick={() => move(active, i, i - 1)} className="text-white/40 hover:text-white"><ChevronUp size={14} /></button>
                      <button onClick={() => move(active, i, i + 1)} className="text-white/40 hover:text-white"><ChevronDown size={14} /></button>
                    </div>
                    <button onClick={() => removeField(active, f.id)} className="text-white/40 hover:text-rose-300"><X size={16} /></button>
                  </div>
                  {f.type === 'select' && (
                    <input
                      value={optionDrafts[f.id] ?? (f.options ?? []).join(', ')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setOptionDrafts((d) => ({ ...d, [f.id]: raw }));
                        patchField(active, f.id, { options: raw.split(',').map((s) => s.trim()).filter(Boolean) });
                      }}
                      placeholder="Options, comma separated (e.g. Red, Blue, Green)"
                      className="mt-2 w-full rounded-lg border border-hairline bg-void/60 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-crush focus:outline-none"
                    />
                  )}
                </div>
              ))}
              <button onClick={() => addField(active)} className="btn-ghost w-full justify-center">
                <Plus size={16} /> Add field
              </button>
            </div>

            {/* Live preview — exactly how this preset's entry fields will look */}
            <div className="lg:sticky lg:top-8 lg:self-start space-y-3 rounded-xl2 border border-hairline bg-void/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
                <Eye size={13} /> Live preview
              </p>
              {active.fields.length === 0 ? (
                <p className="text-sm text-white/40">Add fields and they’ll appear here, exactly as they’ll look when adding a card.</p>
              ) : (
                active.fields.map((f) => (
                  <div key={f.id}>
                    <label className="mb-1 block text-xs font-semibold text-white/55">{f.label || 'Untitled field'}</label>
                    <FieldInput field={f} value={sample[f.id]} onChange={(v) => setSample((s) => ({ ...s, [f.id]: v }))} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
