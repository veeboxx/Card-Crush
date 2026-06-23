import { useState } from 'react';
import { Palette, Package, Download, Trash2, RefreshCw, Smartphone, FileText, AlertTriangle } from 'lucide-react';
import { useCollection } from '../store/CollectionContext';
import { THEMES } from '../types';
import { buildBackup, parseBackup, restoreBackup } from '../lib/backup';
import { saveTextFile, saveBinaryFile, openTextFile, askConfirm } from '../lib/native';
import { clearAll, putPreset } from '../db/database';
import { nowIso } from '../lib/utils';
import { DEFAULT_PRESETS } from '../data/defaultPresets';
import { exportHtml, exportPdf } from '../lib/export';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{ background: on ? 'var(--c-crush)' : undefined }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? '' : 'bg-black/20'}`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? 'calc(100% - 1.375rem)' : '0.125rem' }}
      />
    </button>
  );
}


export default function Settings() {
  const { settings, saveSettings, cards, presets, reload } = useCollection();
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };

  const exportBackup = async () => {
    flash('Bundling backup…');
    try {
      const backup = await buildBackup(settings);
      const ok = await saveTextFile(`card-crush-backup-${nowIso().slice(0, 10)}.json`, JSON.stringify(backup));
      if (ok) flash(`Saved — ${backup.cards.length} cards, ${backup.images.length} images.`);
    } catch {
      flash('Could not build the backup.');
    }
  };

  const importBackup = async () => {
    try {
      const text = await openTextFile();
      if (!text) return;
      const file = parseBackup(text);
      if (!file) return flash('That file is not a Card Crush backup.');
      const r = await restoreBackup(file);
      await reload();
      flash(`Restored ${r.cards} cards, ${r.presets} presets.`);
    } catch {
      flash('Import failed.');
    }
  };

  const exportHtmlFile = async (placeholdersOnly = false) => {
    flash('Building HTML…');
    try {
      const { html, warned } = await exportHtml(cards, presets, { placeholdersOnly });
      if (warned && !placeholdersOnly) {
        const usePlaceholders = await askConfirm(
          'Your collection images will make this file larger than 50 MB. Use color placeholders instead for a smaller file?',
          'Large Export',
        );
        if (usePlaceholders) {
          return exportHtmlFile(true);
        }
      }
      const ok = await saveTextFile(`card-crush-${nowIso().slice(0, 10)}.html`, html);
      if (ok) flash('HTML saved — AirDrop it to your iPhone!');
    } catch (e) {
      console.error(e);
      flash('Export failed.');
    }
  };

  const exportPdfFile = async () => {
    flash('Building PDF…');
    try {
      const bytes = await exportPdf(cards, presets);
      const ok = await saveBinaryFile(
        `card-crush-${nowIso().slice(0, 10)}.pdf`,
        bytes,
        'pdf',
        'application/pdf',
      );
      if (ok) flash('PDF saved!');
    } catch (e) {
      console.error(e);
      flash('PDF export failed.');
    }
  };

  const restoreDefaults = async () => {
    const existingIds = new Set(presets.map((p) => p.id));
    const missing = DEFAULT_PRESETS.filter((p) => !existingIds.has(p.id));
    if (missing.length === 0) return flash('All default presets are already present.');
    await Promise.all(missing.map((p) => putPreset(p)));
    await reload();
    flash(`Added ${missing.length} default preset${missing.length !== 1 ? 's' : ''}.`);
  };

  const reset = async () => {
    if (!await askConfirm('Erase ALL cards, presets, and images? This cannot be undone.', 'Erase Everything')) return;
    await clearAll();
    await reload();
    flash('Everything cleared.');
  };

  const ocrSuggestions = settings.ocrSuggestions ?? true;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
      {msg && <div className="rounded-xl bg-crush/15 px-4 py-2.5 text-sm font-semibold text-white">{msg}</div>}

      {/* Theme */}
      <section className="space-y-3 rounded-xl2 glass p-5">
        <h2 className="section-title flex items-center gap-2"><Palette size={16} /> Theme</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {THEMES.map((t) => {
            const active = (settings.theme ?? 'vault') === t.id;
            return (
              <button
                key={t.id}
                onClick={() => saveSettings({ ...settings, theme: t.id })}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-crush bg-crush/10' : 'border-hairline bg-white/[0.02] hover:bg-white/[0.05]'}`}
              >
                <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10" style={{ background: t.swatch[2] }}>
                  <span className="h-full w-1/2" style={{ background: t.swatch[0] }} />
                  <span className="h-full w-1/2" style={{ background: t.swatch[1] }} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{t.name}</span>
                    {t.light && <span className="rounded bg-white/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white/50">Light</span>}
                  </span>
                  <span className="block text-[11px] text-white/45">{t.blurb}</span>
                </span>
                {active && <span className="ml-auto text-xs font-bold text-crush2">Active</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* OCR */}
      <section className="space-y-4 rounded-xl2 glass p-5">
        <h2 className="section-title">Card Recognition</h2>

        {/* OCR enabled */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Extract text from card images (OCR)</p>
            <p className="text-xs text-white/45">Makes card text searchable. Runs locally, no internet needed after first use.</p>
          </div>
          <Toggle on={settings.ocrEnabled ?? true} onToggle={() => saveSettings({ ...settings, ocrEnabled: !(settings.ocrEnabled ?? true) })} />
        </div>

        {/* Smart suggestions */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Smart field suggestions</p>
            <p className="text-xs text-white/45">After OCR, show detected values you can apply with one tap.</p>
          </div>
          <Toggle on={ocrSuggestions} onToggle={() => saveSettings({ ...settings, ocrSuggestions: !ocrSuggestions })} />
        </div>

        {/* Search mode */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Search mode</p>
            <p className="text-xs text-white/45">
              {(settings.searchMode ?? 'all') === 'all'
                ? 'Searching card text + all fields (broader results).'
                : 'Searching named fields only (more precise results).'}
            </p>
          </div>
          <Toggle on={(settings.searchMode ?? 'all') === 'all'} onToggle={() => saveSettings({ ...settings, searchMode: (settings.searchMode ?? 'all') === 'all' ? 'fields' : 'all' })} />
        </div>
      </section>

      {/* Export for iPhone */}
      <section className="space-y-3 rounded-xl2 glass p-5">
        <h2 className="section-title flex items-center gap-2"><Smartphone size={16} /> Export for iPhone</h2>
        <p className="text-xs leading-relaxed text-white/50">
          Take your collection to a card show. The HTML file opens in Safari with full search — AirDrop it to your phone before you go.
        </p>

        <button onClick={() => exportHtmlFile()} className="btn-primary w-full justify-center">
          <Smartphone size={16} /> Save collection as HTML
        </button>

        <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-white/30" />
          <p className="text-[11px] leading-relaxed text-white/40">
            Images are embedded so it works offline. If your collection is very large (&gt;50 MB) you'll be prompted to use color placeholders instead.
          </p>
        </div>

        <div className="h-px bg-white/5" />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55 flex items-center gap-1.5"><FileText size={13} /> PDF reference sheet</p>
          <p className="mb-2.5 text-[11px] text-white/40">Compact 3×5 grid, owned and wishlist sections. Good for printing or handing to a vendor.</p>
          <button onClick={exportPdfFile} className="btn-ghost w-full justify-center">
            <FileText size={15} /> Save collection as PDF
          </button>
        </div>

        <p className="text-[11px] text-white/35">{cards.length} cards will be included</p>
      </section>

      {/* Backup */}
      <section className="space-y-3 rounded-xl2 glass p-5">
        <h2 className="section-title">Backup &amp; Data</h2>
        <p className="text-xs leading-relaxed text-white/50">
          Everything lives on this Mac. A backup bundles your cards, presets, and images into one portable file.
        </p>
        <button onClick={exportBackup} className="btn-primary w-full justify-center"><Package size={18} /> Save full backup</button>
        <button onClick={importBackup} className="btn-ghost w-full justify-center"><Download size={16} /> Import backup</button>
        <button onClick={restoreDefaults} className="btn-ghost w-full justify-center"><RefreshCw size={14} /> Restore default presets</button>
        <p className="text-[11px] text-white/35">{cards.length} cards · {presets.length} presets</p>
      </section>

      {/* Reset */}
      <section className="space-y-3 rounded-xl2 border border-rose-500/20 bg-rose-500/[0.03] p-5">
        <h2 className="section-title text-rose-200">Reset</h2>
        <p className="text-xs text-white/50">Erase everything and start over. Export a backup first if you might want it back.</p>
        <button onClick={reset} className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20">
          <Trash2 size={16} /> Erase everything
        </button>
      </section>
    </div>
  );
}
