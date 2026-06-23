import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export default function TagInput({
  value,
  onChange,
  placeholder,
  accent = '#ff3d81',
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  accent?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const filtered = suggestions
    .filter((s) => draft && s.toLowerCase().includes(draft.toLowerCase()) && !value.includes(s))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-hairline bg-void/60 p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ background: `${accent}26`, boxShadow: `inset 0 0 0 1px ${accent}66` }}
          >
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))} className="opacity-70 hover:opacity-100">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[80px] flex-1 bg-transparent px-1.5 py-1 text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>
      {filtered.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
