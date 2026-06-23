# Card Crush — Collector Vault

A simple, local-first desktop app for cataloguing a trading-card collection.

I built this for myself. I collect cards and I just wanted a clean way to keep track of
what I own and what I'm chasing — without an account, without a monthly fee, without my
data living on someone else's server. I'm tired of everything being a subscription, so I
made something small that does exactly what I need and nothing I don't. Figured I'd share
it in case it's useful to someone else.

Everything stays on your own machine. No login, no cloud, no tracking.

> Built collaboratively with Anthropic's Claude as an AI pair-programmer.

---

## Screenshots

![Browse](browse.png)

![Card detail](card-detail.png)

![Search](search.png)

---

## What it does

- **Track owned & wishlist** — mark each card as owned or wishlisted, plus a five-heart
  "crush" rating for your favourites.
- **Custom presets per game** — set up field templates for One Piece, Magic, Lorcana, or
  whatever you collect, so each card captures the right info (set, number, rarity, colour,
  power, etc.).
- **Card images** — drag in or paste a photo of the card; stored locally.
- **Dual-face cards** — front and back images with a flip view.
- **OCR-assisted search** — pull the printed text off a card image (both faces for
  dual-face cards) so you can find a card even if you never typed its name. Runs locally
  via Tesseract (WebAssembly).
- **Search everything** — name, set/number, preset fields, notes, and OCR text.
- **PDF export** — compact, printer-friendly grid split into Owned and Wishlist. Hand it
  to a vendor or keep it in your bag.
- **HTML export for your phone** — one self-contained file with your whole collection and
  full search. AirDrop it to your phone, open in Safari, works offline. Great for checking
  duplicates at a card show.
- **Backup & restore** — export/import your whole collection, images included.
- **Themes** — dark "Vault" by default, plus light modes (Daylight, Parchment, Porcelain)
  and a few colour options.

---

## Why it exists

Most collection trackers want a subscription, an account, or both — and then your data is
locked in their cloud. I wanted the opposite: a one-time thing that runs on my own computer,
keeps my data in my hands, and is dead simple to use. That's all this is.

---

## Tech stack

- **[Tauri 2](https://tauri.app/)** — Rust backend + native system webview (tiny, fast)
- **React 18 + React Router** — UI
- **Tailwind CSS** — styling
- **tesseract.js** — local OCR (WebAssembly)
- **jsPDF** — PDF export
- **IndexedDB** — local image storage
- **Vite + TypeScript** — build tooling

---

## Project structure

```
src/
  pages/        Browse, Search, AddCard, CardView, Presets, Settings
  components/   CardThumb, CrushRating, Fields, ImageDrop, TagInput, Layout, ui
  lib/          ocr, ocrSuggester, export (PDF/HTML), backup, images, native, utils
  store/        CollectionContext (app state)
  db/           database (IndexedDB wrapper)
  data/         defaultPresets
  types/        shared TypeScript types
src-tauri/      Rust shell, config, icons
public/         static assets: icons, OCR worker + WASM core
```

---
## Download
**[Click Here for Apple Silicon dmg](https://github.com/veeboxx/Card-Crush/releases/tag/v1.0.0)**

## Building it yourself

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (stable) — [rustup.rs](https://rustup.rs/)
- **macOS:** `xcode-select --install`
- Full list: [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Setup

The OCR WebAssembly core files are large and not committed. Fetch them once:

```bash
bash scripts/fetch-ocr-assets.sh
```

The OCR language data downloads automatically from a CDN the first time you use OCR, then
caches locally — so the first OCR run on a fresh install needs internet. Everything after
that is offline.

If the macOS icon is missing, regenerate it:

```bash
bash scripts/make-icon.sh
```

### Run / build

```bash
npm install
npm run tauri dev      # development
npm run tauri build    # build the app + DMG
```

Output lands in `src-tauri/target/release/bundle/`.

> The app isn't code-signed, so on another Mac the first launch needs a
> right-click → **Open** to get past Gatekeeper.

---

## Privacy

Everything is stored locally. The only outbound request the app ever makes is downloading
the OCR language file from a public CDN on first use (then cached). Your collection never
leaves your machine.

---

## License

MIT — do whatever you want with it. See [LICENSE](LICENSE).
