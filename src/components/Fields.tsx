import type { FieldDef, FieldValue } from '../types';
import TagInput from './TagInput';

/** Renders the correct editable control for a field definition. */
export function FieldInput({ field, value, onChange }: { field: FieldDef; value: FieldValue; onChange: (v: FieldValue) => void }) {
  const base = 'w-full rounded-xl border border-hairline bg-void/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-crush focus:outline-none';
  switch (field.type) {
    case 'longtext':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={base}
          placeholder={field.label}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className={base}
          placeholder={field.label}
        />
      );
    case 'boolean':
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            value ? 'border-crush bg-crush/15 text-white' : 'border-hairline bg-white/[0.02] text-white/55'
          }`}
        >
          <span className={`h-4 w-4 rounded ${value ? 'bg-crush' : 'bg-white/15'}`} />
          {value ? 'Yes' : 'No'}
        </button>
      );
    case 'select':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={base}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    case 'tags':
      return <TagInput value={(value as string[]) ?? []} onChange={onChange} placeholder={field.label} />;
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
          placeholder={field.label}
        />
      );
  }
}

/** True when a field value is worth showing on the display screen. */
export function hasValue(v: FieldValue): boolean {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Read-only display of a field value for the card view. */
export function FieldDisplay({ field, value }: { field: FieldDef; value: FieldValue }) {
  if (field.type === 'tags' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/80">{t}</span>
        ))}
      </div>
    );
  }
  if (field.type === 'boolean') return <span className="text-sm font-semibold text-white">{value ? 'Yes' : 'No'}</span>;
  return <span className="text-sm font-semibold text-white">{String(value)}</span>;
}
