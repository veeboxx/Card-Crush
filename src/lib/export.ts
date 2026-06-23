/**
 * Card Crush — PDF and HTML exports. v3.1
 *
 * PDF:  compact 3×5 grid, white/printer-friendly, owned + wishlist sections.
 * HTML: self-contained single file for iPhone Safari, full search + tabs.
 */

import type { Card, Preset } from '../types';
import { getImage } from '../db/database';
import { blobToDataUrl } from './images';
import { hashHue, initials } from './utils';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function cardImageDataUrl(card: Card): Promise<string | null> {
  if (!card.imageId) return null;
  try {
    const blob = await getImage(card.imageId);
    if (!blob) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function placeholderBg(name: string): string {
  const hue = hashHue(name);
  return `linear-gradient(150deg,hsl(${hue} 55% 22%),hsl(${(hue + 40) % 360} 50% 12%))`;
}

function setAndNumber(card: Card, preset: Preset | undefined): string {
  if (!preset) return '';
  const setField = preset.fields.find((f) =>
    f.id.includes('set') || f.id.includes('num') ||
    f.label.toLowerCase().includes('set') || f.label.toLowerCase().includes('number'),
  );
  if (!setField) return '';
  const v = card.fields[setField.id];
  return v ? String(v) : '';
}

export async function estimateExportBytes(cards: Card[]): Promise<number> {
  let total = 0;
  for (const card of cards) {
    if (!card.imageId) continue;
    try {
      const blob = await getImage(card.imageId);
      if (blob) total += blob.size;
    } catch { /* skip */ }
  }
  return total;
}

// ---------------------------------------------------------------------------
// HTML export — ALL cards, no owned/wishlist filter
// ---------------------------------------------------------------------------

const HTML_SIZE_WARN = 50 * 1024 * 1024;

export interface HtmlExportOptions {
  placeholdersOnly?: boolean;
}

export async function exportHtml(
  cards: Card[],
  presets: Preset[],
  options: HtmlExportOptions = {},
): Promise<{ html: string; warned: boolean }> {
  // Export ALL cards — not filtered by owned/wishlist
  const estimatedBytes = options.placeholdersOnly ? 0 : await estimateExportBytes(cards);
  const warned = estimatedBytes > HTML_SIZE_WARN;

  const cardData: {
    id: string;
    name: string;
    setNum: string;
    owned: boolean;
    wishlist: boolean;
    crush: number;
    imgSrc: string | null;
    placeholder: string;
    initials: string;
    fields: { label: string; value: string }[];
    searchText: string;
    notes: string;
  }[] = [];

  for (const card of cards) {
    const preset = presets.find((p) => p.id === card.presetId);
    const imgSrc = options.placeholdersOnly ? null : await cardImageDataUrl(card);
    const fields = (preset?.fields ?? [])
      .map((f) => ({ label: f.label, value: card.fields[f.id] !== undefined ? String(card.fields[f.id]) : '' }))
      .filter((f) => f.value && f.value !== 'undefined');

    cardData.push({
      id: card.id,
      name: card.name,
      setNum: setAndNumber(card, preset),
      owned: card.owned,
      wishlist: card.wishlist,
      crush: card.crush,
      imgSrc,
      placeholder: placeholderBg(card.name),
      initials: initials(card.name),
      fields,
      searchText: card.searchText ?? '',
      notes: card.notes ?? '',
    });
  }

  const json = JSON.stringify(cardData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Card Crush — Collection</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --crush:#ff3d81;--crush2:#ff7eb3;--ink:#0c0d12;--panel:#13141c;
  --panel2:#181923;--hair:rgba(255,255,255,0.08);--fg:#e9ebf2;
  --radius:16px;--safe-top:env(safe-area-inset-top,0px);--safe-bot:env(safe-area-inset-bottom,0px);
}
html,body{height:100%;background:var(--ink);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-text-size-adjust:100%}
body{display:flex;flex-direction:column;overflow:hidden}

.header{
  position:sticky;top:0;z-index:10;
  background:rgba(12,13,18,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--hair);
  padding:calc(var(--safe-top) + 10px) 16px 10px;
}
.logo-title{font-size:18px;font-weight:800;letter-spacing:-0.5px;margin-bottom:2px;
  background:linear-gradient(135deg,var(--crush),var(--crush2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo-sub{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:10px}

.search-wrap{position:relative}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);pointer-events:none}
#search{
  width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--hair);
  border-radius:12px;padding:10px 36px 10px 38px;font-size:16px;color:var(--fg);outline:none;-webkit-appearance:none;
}
#search:focus{border-color:var(--crush)}
#search::placeholder{color:rgba(255,255,255,0.3)}
.clear-btn{
  display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:rgba(255,255,255,0.12);border:none;border-radius:50%;
  width:20px;height:20px;color:rgba(255,255,255,0.6);font-size:14px;line-height:20px;
  text-align:center;cursor:pointer;padding:0;
}
.clear-btn.visible{display:block}

.tabs{display:flex;gap:6px;padding:10px 16px 0;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{
  flex-shrink:0;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;
  border:1px solid var(--hair);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);
  cursor:pointer;transition:all 0.15s;-webkit-tap-highlight-color:transparent;
}
.tab.active{background:var(--crush);border-color:transparent;color:#fff;box-shadow:0 4px 16px rgba(255,61,129,0.4)}

.list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 16px calc(var(--safe-bot) + 16px)}
.count{font-size:12px;color:rgba(255,255,255,0.35);margin-bottom:10px;padding-top:2px}

.card-row{
  display:flex;align-items:center;gap:12px;
  background:var(--panel);border:1px solid var(--hair);border-radius:var(--radius);
  padding:10px;margin-bottom:8px;cursor:pointer;
  transition:background 0.12s;-webkit-tap-highlight-color:transparent;
}
.card-row:active{background:var(--panel2)}
.thumb{
  width:44px;height:62px;border-radius:8px;flex-shrink:0;
  overflow:hidden;display:flex;align-items:center;justify-content:center;background:#111;
}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb-placeholder{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:900;color:rgba(255,255,255,0.7);
}
.card-info{flex:1;min-width:0}
.card-name{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-meta{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{flex-shrink:0;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700}
.badge-owned{background:rgba(52,200,90,0.15);color:#4ade80;border:1px solid rgba(52,200,90,0.3)}
.badge-wish{background:rgba(255,61,129,0.12);color:var(--crush2);border:1px solid rgba(255,61,129,0.25)}

.modal-bg{
  display:none;position:fixed;inset:0;z-index:50;
  background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  align-items:flex-end;
}
.modal-bg.open{display:flex}
.modal{
  width:100%;max-height:92vh;background:var(--panel);
  border-radius:20px 20px 0 0;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding-bottom:calc(var(--safe-bot) + 24px);
}
.modal-handle{width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:12px auto 0}
.modal-img{width:100%;max-height:60vw;object-fit:contain;background:#0a0a0f;display:block}
.modal-img-placeholder{
  width:100%;height:220px;display:flex;align-items:center;justify-content:center;
  font-size:52px;font-weight:900;color:rgba(255,255,255,0.6);
}
.modal-body{padding:16px}
.modal-preset{font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:4px}
.modal-name{font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px}
.modal-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.hearts{color:var(--crush);font-size:15px;letter-spacing:1px}
.fields-table{border:1px solid var(--hair);border-radius:12px;overflow:hidden;margin-bottom:16px}
.field-row{display:flex;justify-content:space-between;align-items:start;gap:12px;padding:10px 14px;border-top:1px solid var(--hair)}
.field-row:first-child{border-top:none}
.field-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.35);white-space:nowrap;flex-shrink:0}
.field-value{font-size:13px;font-weight:600;text-align:right;word-break:break-word}
.modal-close{
  width:100%;padding:13px;border-radius:12px;
  background:rgba(255,255,255,0.06);border:1px solid var(--hair);
  color:rgba(255,255,255,0.6);font-size:15px;font-weight:600;cursor:pointer;
}
.empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3);font-size:15px}
</style>
</head>
<body>

<div class="header">
  <div class="logo-title">Card Crush</div>
  <div class="logo-sub">Collector Vault</div>
  <div class="search-wrap">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input id="search" type="search" placeholder="Search cards…" autocomplete="off" autocorrect="off" spellcheck="false">
    <button class="clear-btn" id="clear-btn" aria-label="Clear">×</button>
  </div>
</div>

<div class="tabs" id="tabs">
  <button class="tab active" data-tab="all">All</button>
  <button class="tab" data-tab="owned">Owned</button>
  <button class="tab" data-tab="wishlist">Wishlist</button>
</div>

<div class="list">
  <div class="count" id="count"></div>
  <div id="cards-container"></div>
</div>

<div class="modal-bg" id="modal-bg">
  <div class="modal">
    <div class="modal-handle"></div>
    <div id="modal-content"></div>
  </div>
</div>

<script>
const CARDS = ${json};
let activeTab = 'all';
let query = '';

const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('clear-btn');
const countEl = document.getElementById('count');
const container = document.getElementById('cards-container');
const modalBg = document.getElementById('modal-bg');
const modalContent = document.getElementById('modal-content');

function hearts(n) { return '♥'.repeat(n); }

function badge(c) {
  if (c.owned) return '<span class="badge badge-owned">Owned</span>';
  if (c.wishlist) return '<span class="badge badge-wish">Wishlist</span>';
  return '';
}

function render() {
  const q = query.toLowerCase().trim();
  const filtered = CARDS.filter(c => {
    const tabOk = activeTab === 'all'
      || (activeTab === 'owned' && c.owned)
      || (activeTab === 'wishlist' && c.wishlist);
    const searchOk = !q
      || c.name.toLowerCase().includes(q)
      || (c.setNum && c.setNum.toLowerCase().includes(q))
      || c.fields.some(f => f.value.toLowerCase().includes(q))
      || (c.searchText && c.searchText.toLowerCase().includes(q))
      || (c.notes && c.notes.toLowerCase().includes(q));
    return tabOk && searchOk;
  });

  countEl.textContent = filtered.length + ' card' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    container.innerHTML = '<div class="empty">No cards match your search.</div>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const thumb = c.imgSrc
      ? \`<div class="thumb"><img src="\${c.imgSrc}" loading="lazy" decoding="async"></div>\`
      : \`<div class="thumb"><div class="thumb-placeholder" style="background:\${c.placeholder}">\${c.initials}</div></div>\`;
    const meta = [c.setNum, c.crush > 0 ? hearts(c.crush) : ''].filter(Boolean).join(' · ');
    return \`<div class="card-row" onclick="openModal('\${c.id}')">
      \${thumb}
      <div class="card-info">
        <div class="card-name">\${c.name}</div>
        \${meta ? \`<div class="card-meta">\${meta}</div>\` : ''}
      </div>
      \${badge(c)}
    </div>\`;
  }).join('');
}

searchEl.addEventListener('input', e => {
  query = e.target.value;
  clearBtn.classList.toggle('visible', query.length > 0);
  render();
});

clearBtn.addEventListener('click', () => {
  searchEl.value = '';
  query = '';
  clearBtn.classList.remove('visible');
  render();
  searchEl.focus();
});

document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  render();
});

function openModal(id) {
  const c = CARDS.find(x => x.id === id);
  if (!c) return;
  const img = c.imgSrc
    ? \`<img class="modal-img" src="\${c.imgSrc}">\`
    : \`<div class="modal-img-placeholder" style="background:\${c.placeholder}">\${c.initials}</div>\`;
  const badges = [
    badge(c),
    c.crush > 0 ? \`<span class="hearts">\${hearts(c.crush)}</span>\` : '',
  ].filter(Boolean).join('');
  const fieldRows = c.fields.map(f =>
    \`<div class="field-row"><span class="field-label">\${f.label}</span><span class="field-value">\${f.value}</span></div>\`
  ).join('');

  modalContent.innerHTML = \`
    \${img}
    <div class="modal-body">
      \${c.setNum ? \`<div class="modal-preset">\${c.setNum}</div>\` : ''}
      <div class="modal-name">\${c.name}</div>
      \${badges ? \`<div class="modal-badges">\${badges}</div>\` : ''}
      \${fieldRows ? \`<div class="fields-table">\${fieldRows}</div>\` : ''}
      <button class="modal-close" onclick="closeModal()">Close</button>
    </div>\`;
  modalBg.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalBg.classList.remove('open');
  document.body.style.overflow = '';
}

modalBg.addEventListener('click', e => { if (e.target === modalBg) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

render();
searchEl.focus();
</script>
</body>
</html>`;

  return { html, warned };
}

// ---------------------------------------------------------------------------
// PDF export — white/printer-friendly, jsPDF 4 API
// ---------------------------------------------------------------------------

const COLS = 3;
const ROWS = 5;
const CARDS_PER_PAGE = COLS * ROWS;
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const SECTION_HEADER_H = 26;
const GUTTER = 10;
const CELL_W = (PAGE_W - MARGIN * 2 - GUTTER * (COLS - 1)) / COLS;
const CELL_H = (PAGE_H - MARGIN * 2 - GUTTER * (ROWS - 1) - SECTION_HEADER_H) / ROWS;
const IMG_H = CELL_H - 24;

export async function exportPdf(cards: Card[], presets: Preset[]): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');

  const owned = cards.filter((c) => c.owned);
  const wishlist = cards.filter((c) => c.wishlist && !c.owned);

  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  doc.setFont('helvetica');

  let pageIndex = 0;

  async function drawSection(sectionCards: Card[], sectionLabel: string) {
    if (sectionCards.length === 0) return;

    if (pageIndex > 0) doc.addPage();
    pageIndex++;

    // White page background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    // Section header — pink strip
    doc.setFillColor(255, 61, 129);
    doc.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, SECTION_HEADER_H, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(sectionLabel, MARGIN + 10, MARGIN + 17);

    let cellIndex = 0;
    let localPage = 0;

    for (const card of sectionCards) {
      if (cellIndex > 0 && cellIndex % CARDS_PER_PAGE === 0) {
        doc.addPage();
        pageIndex++;
        localPage++;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

        doc.setFillColor(220, 220, 230);
        doc.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, SECTION_HEADER_H, 'F');
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionLabel}  (page ${localPage + 1})`, MARGIN + 10, MARGIN + 17);
      }

      const posInPage = cellIndex % CARDS_PER_PAGE;
      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);
      const x = MARGIN + col * (CELL_W + GUTTER);
      const y = MARGIN + SECTION_HEADER_H + GUTTER + row * (CELL_H + GUTTER);

      // Light gray cell background
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(x, y, CELL_W, CELL_H, 3, 3, 'F');
      // Subtle border
      doc.setDrawColor(210, 210, 220);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, CELL_W, CELL_H, 3, 3, 'S');

      const preset = presets.find((p) => p.id === card.presetId);
      const imgSrc = await cardImageDataUrl(card);

      if (imgSrc) {
        try {
          // Get image natural dimensions to letterbox correctly
          const imgProps = doc.getImageProperties(imgSrc);
          const naturalW = imgProps.width;
          const naturalH = imgProps.height;
          const maxW = CELL_W - 4;
          const maxH = IMG_H - 2;
          const scale = Math.min(maxW / naturalW, maxH / naturalH);
          const drawW = naturalW * scale;
          const drawH = naturalH * scale;
          const drawX = x + 2 + (maxW - drawW) / 2;
          const drawY = y + 2 + (maxH - drawH) / 2;
          const format = imgSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage({
            imageData: imgSrc,
            format,
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
            compression: 'FAST',
          });
        } catch {
          drawPlaceholder(doc, card, x, y, CELL_W, IMG_H);
        }
      } else {
        drawPlaceholder(doc, card, x, y, CELL_W, IMG_H);
      }

      // Card name — dark text on white
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 40);
      const nameLines = doc.splitTextToSize(card.name, CELL_W - 6);
      doc.text(nameLines[0], x + 3, y + IMG_H + 11);

      // Set + number
      const setNum = setAndNumber(card, preset);
      if (setNum) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 110, 130);
        doc.text(setNum, x + 3, y + IMG_H + 20);
      }

      cellIndex++;
    }
  }

  await drawSection(owned, `Owned  ·  ${owned.length} card${owned.length !== 1 ? 's' : ''}`);
  await drawSection(wishlist, `Wishlist  ·  ${wishlist.length} card${wishlist.length !== 1 ? 's' : ''}`);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

function drawPlaceholder(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  card: Card, x: number, y: number, w: number, h: number,
) {
  const hue = hashHue(card.name);
  const [r, g, b] = hslToRgb(hue / 360, 0.45, 0.72);
  doc.setFillColor(r, g, b);
  doc.roundedRect(x + 2, y + 2, w - 4, h - 2, 3, 3, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const ini = initials(card.name);
  const tw = doc.getTextWidth(ini);
  doc.text(ini, x + w / 2 - tw / 2, y + h / 2 + 5);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
