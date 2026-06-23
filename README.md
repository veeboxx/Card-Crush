# Card Crush — Collector Vault

A local-first desktop app for cataloguing a trading-card collection. Track what you
own and what you want, rate cards, snap or import card images, OCR the text off them
for instant search, and export your collection as a printable PDF or a self-contained
HTML file you can open on your phone at a card show.

Built with [Tauri](https://tauri.app/) (Rust + system webview) and React. Everything
lives on your own machine — there is no account, no server, and no cloud. Your data
sits in the browser engine's local storage and your images in IndexedDB.

> **Note on origin:** Card Crush was built collaboratively with Anthropic's Claude as
> an AI pair-programmer. The architecture, code, and this document were produced through
> that process.

---

## Features

- **Owned / Wishlist tracking** — mark each card as owned or wishlisted, with a
  five-heart "crush" rating to flag your favourites.
- **Custom presets** — define field templates per game (One Piece, Magic, Lorcana,
  etc.) so each card type captures the fields that matter: set, number, rarity, colour,
  power, and so on.
- **Image capture & import** — drag in or paste a card image; it's stored locally.
- **Dual-face cards** — cards can carry a front and a back image with a flip view on
  the detail page.
- **OCR-assisted search** — extract the printed text off a card image (both faces for
  dual-face cards) and fold it into the search index, so you can find a card even if you
  never typed its name. Powered by Tesseract.js running locally in WebAssembly.
- **Fast search** — matches on name, set/number, preset fields, notes, and OCR text.
- **PDF export** — a compact, printer-friendly 3x5 grid split into Owned and Wishlist
  sections. Good for handing to a vendor or keeping in your bag.
- **HTML export for phones** — a single self-contained `.html` file with your whole
  collection, full search, and Owned/Wishlist tabs. AirDrop it to your phone and open
  it in Safari; works offline. Ideal for duplicate-checking at a card show.
- **Backup & restore** — export/import your entire collection (including images) as a
  single backup file.
- **Theming** — multiple colour themes including light "Daylight," "Parchment," and
  "Porcelain" modes alongside the default dark "Vault."

---

## Screenshots

> _Add your own screenshots here. Suggested shots:_
>
> - `docs/browse.png` — the Browse grid
> - `docs/card-detail.png` — a card detail page with the field sheet
> - `docs/search.png` — search results
> - `docs/export-html.png` — the HTML export open in Safari on a phone

```
![Browse](docs/browse.png)
![Card detail](docs/card-detail.png)
```

---

## Tech stack

| Layer            | Choice                                                        |
| ---------------- | ------------------------------------------------------------- |
| Shell            | Tauri 2 (Rust backend + native webview)                       |
| UI               | React 18 + React Router                                       |
| Styling          | Tailwind CSS                                                  |
| Icons            | lucide-react                                                  |
| Local storage    | IndexedDB (via `idb`) for images; webview storage for data    |
| OCR              | tesseract.js 5 (WASM, runs locally)                           |
| PDF              | jsPDF                                                         |
| Build            | Vite + TypeScript                                             |

---

## Project structure

```
src/
  pages/        Browse, Search, AddCard, CardView, Presets, Settings
  components/   CardThumb, CrushRating, Fields, ImageDrop, TagInput, Layout, ui
  lib/          ocr, ocrSuggester, export (PDF/HTML), backup, images, native, utils, bgRemoval
  store/        CollectionContext (app state)
  db/           database (IndexedDB wrapper)
  data/         defaultPresets
  types/        shared TypeScript types
src-tauri/      Rust shell, config, icons, capabilities
public/         static assets: icons, OCR worker + WASM core, language data
```

---

## Building from source

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (stable) — install via [rustup](https://rustup.rs/)
- **macOS:** Xcode command line tools (`xcode-select --install`)
- See the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

### One-time setup of OCR assets

The OCR engine needs its WebAssembly core files, which are large and not committed to
the repo. Fetch them once into `public/tesseract-core/`:

```bash
bash scripts/fetch-ocr-assets.sh
```

(Or run the curl commands inside that script by hand.) The English **language data**
is downloaded automatically by the app from a CDN the first time you use OCR, then
cached locally — so the first OCR run on a fresh install needs an internet connection.

### macOS app icon

If `src-tauri/icons/icon.icns` is missing, regenerate it from the source PNG:

```bash
bash scripts/make-icon.sh
```

### Install and run

```bash
npm install
npm run tauri dev      # development, hot-reload
```

### Build a distributable app / DMG

```bash
npm run tauri build
```

The bundled app and installer are written to:

```
src-tauri/target/release/bundle/macos/Card Crush.app
src-tauri/target/release/bundle/dmg/Card Crush_<version>_aarch64.dmg
```

> The app is **not** code-signed. On another Mac, the first launch will need a
> right-click -> **Open** to bypass Gatekeeper.

---

## Exports explained

- **PDF** — Settings -> "Save collection as PDF." Compact grid, Owned and Wishlist
  separated, white background for printing.
- **HTML** — Settings -> "Save collection as HTML." One self-contained file with all
  card data and images embedded. Open in any browser; works fully offline. Designed to
  be AirDropped to an iPhone and opened in Safari (optionally Add to Home Screen for an
  app-like, full-screen view).

---

## Privacy

Card Crush stores everything locally. It makes exactly one kind of outbound request:
downloading the Tesseract OCR language file from a public CDN on first OCR use, after
which it is cached and OCR works offline. No collection data ever leaves your machine.

---

## License

MIT — see [LICENSE](LICENSE).
