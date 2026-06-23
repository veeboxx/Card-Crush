import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';

export default function ImageDrop({
  url,
  onFile,
  onClear,
}: {
  url: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {url ? (
        <div className="relative overflow-hidden rounded-2xl bg-panel2 ring-1 ring-hairline" style={{ aspectRatio: '5 / 7' }}>
          <img src={url} alt="" className="h-full w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
            <button onClick={() => inputRef.current?.click()} className="btn-ghost flex-1 py-1.5 text-xs">
              Replace
            </button>
            {onClear && (
              <button onClick={onClear} className="btn-ghost px-3 py-1.5 text-xs" aria-label="Remove image">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition ${
            over ? 'border-crush bg-crush/10' : 'border-hairline bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
          style={{ aspectRatio: '5 / 7' }}
        >
          <ImagePlus size={28} className="text-white/40" />
          <span className="text-sm font-semibold text-white/70">Add card image</span>
          <span className="px-6 text-[11px] text-white/40">Drag &amp; drop, or click to choose from Photos or Files</span>
        </button>
      )}
    </div>
  );
}
