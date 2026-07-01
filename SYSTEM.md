# MyPhoto — System Documentation

Last updated: June 2026

This document captures the complete state of the MyPhoto system: infrastructure, code, data model, product types, and operational runbook. Everything you need to understand or resurrect the system.

---

## 1. Where Everything Lives

### Code
- **Local dev**: `~/Desktop/myphotoeditor` (macOS)
- **GitHub**: repo already set up (push with `git push`)
- **Runtime**: Fly.io app `myphoto-editor` in region `iad`

### Infrastructure
- **App server**: Fly.io — app `myphoto-editor`, machine `9185d335c94168`, region `iad`
  - Access: `flyctl <command> -a myphoto-editor`
  - SSH: `flyctl ssh console -a myphoto-editor`
  - Logs: `flyctl logs -a myphoto-editor`
  - Restart: `flyctl machine restart 9185d335c94168 -a myphoto-editor`
  - URL: `https://myphoto-editor.fly.dev`

- **Database**: Fly Postgres — `myphoto-db`, connected via pgbouncer
  - Schema managed by Prisma (`prisma/schema.prisma`)
  - Migrations run automatically on deploy via `release_command: npx prisma migrate deploy`

- **File storage**: Cloudflare R2
  - Bucket: `myphoto-uploads`
  - Public URL: `https://pub-93da9e706a31471187ab5f1c9d960d81.r2.dev`
  - Prefixes:
    - `scenes/*.png` — scene background images
    - `scenes/overlays/*.png` — decorative overlay artwork
    - `bin/*` — customer-uploaded photos (full + preview versions)

### Shopify
- **Dev store**: `myphotodev-ac9w5hh4.myshopify.com` (password: `1234`)
- **App handle**: `myphotoeditor`
- **Client ID**: `04fc5ab0a9ca36464075e0dd05a3634d`
- **Theme**: **Tinker** (Horizon Collection) — published live
- **Production**: `myphoto.com` (theme migration planned)

---

## 2. Architecture Overview

MyPhoto is a Shopify Remix app that lets merchants sell photo products. The system consists of:

**Server side** (Remix on Fly.io):
- Scene Builder admin UI (`/test`) — merchant configures product scenes
- Storefront API endpoints (`/api/scenes`, `/api/scenes-bulk`) — theme fetches scene data
- PDF generation (`/api/pdf`, `/api/batch-zip`) — produces print files from customer orders
- Bin upload (`/api/bin-upload`) — customer photo uploads to R2

**Client side** (Tinker theme assets):
- `assets/myphoto-editor.js` — the interactive editor on product pages
- `assets/myphoto-upload-modal.js` — the pill/upload modal (site-wide)
- `assets/myphoto-catalog-overlay.js` — renders customer photos on catalog product cards
- `sections/product-information.liquid` — mounts the editor with scene data

**Data flow**:
1. Merchant creates Scene(s) per product/size/orientation in Scene Builder
2. Customer visits product page → editor mounts, loads scene via `/api/scenes`
3. Customer uploads photo → sent to `/api/bin-upload` → stored in R2 → added to bin (localStorage + DB)
4. Customer adds to cart → cart hook injects photo URL + frame data as line item properties
5. Order placed → merchant generates PDF via `/api/pdf?orderId=X` or batch via `/api/batch-zip`
6. PDF has customer photos composited into frames at proper physical sizes for printing

---

## 3. Data Model (Prisma Schema)

```prisma
model Scene {
  id            String   @id @default(cuid())
  shop          String
  productId     String   // Shopify GID like "gid://shopify/Product/12345"
  sizeLabel     String   // Shopify variant title like "4x4"
  orientation   String   // "landscape" | "portrait"
  bgImageUrl    String   @db.Text
  overlayUrl    String?  @db.Text  // optional decorative artwork
  printMode     String   // "single" (collage) | "multi" (one PDF per frame)
  frames        String   @db.Text  // JSON — see structure below
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model PrintBatch {
  id             String   @id @default(cuid())
  shop           String
  sku            String
  filename       String
  itemCount      Int
  lineItemKeys   String   @db.Text
  indexes        String?  @db.Text
  createdAt      DateTime @default(now())
}

model BinUpload {
  id           String   @id @default(cuid())
  shop         String
  r2KeyFull    String
  r2KeyPreview String
  uploadedAt   DateTime @default(now())
  index        Int
}

model Session {
  // Shopify session storage — managed by @shopify/shopify-app-session-storage-prisma
}
```

### `Scene.frames` JSON structure

Since June 2026 the frames field stores a bundled object:

```json
{
  "frames": [
    {
      "id": "abc123",
      "x": 50,          // % of scene — center X (for preview)
      "y": 50,          // % of scene — center Y (for preview)
      "w": 30,          // % of scene — width (for preview)
      "h": 30,          // % of scene — height (for preview)
      "hOverride": null, // manual H override (%)
      "wIn": 4,         // physical width (inches) — for PDF
      "hIn": 4,         // physical height (inches) — for PDF
      "xIn": 3,         // physical center X (inches) — for PDF, optional
      "yIn": 3,         // physical center Y (inches) — for PDF, optional
      "kind": "photo"   // "photo" | "overlay"
    }
  ],
  "outputSpec": {       // optional — used for collage grid layout
    "type": "grid",
    "rows": 2,
    "cols": 2,
    "frameWIn": 1.75,
    "frameHIn": 1.75,
    "gutter": 0.25
  }
}
```

Backward compatibility: if `frames` field parses as a plain array (older scenes), it's treated as `{ frames: [...] }` implicitly.

---

## 4. Product Types

MyPhoto supports THREE product experiences, distinguished by Shopify tags:

### Type A — No tag (regular Shopify product)
- Ordinary Tinker layout
- No MyPhoto involvement

### Type B — Tag: `myphoto` (customer-upload photo product)
- Editor loads on product page
- Customer uploads photo(s) → stored in R2 bin
- Photo composited into frame(s) on scene preview
- Cart line item includes `_photo_N_url_full`, `_frame_count`, per-frame position/zoom/size
- Print PDF: photo(s) composited at frame positions/sizes

### Type C — Tag: `myphoto-preset` (merchant-artwork product)
- Editor shows scene + overlay artwork; no upload UI
- Customer sees finished product preview
- Cart line item includes `_overlay_url` only
- Print PDF: scene + overlay composited (no customer photo)
- Example: Wassily Kandinsky "Composition X" preset

### Type D — Photo + overlay-frame (Type B with `kind: "overlay"` frames)
- Two-frame scene: one photo-kind frame + one overlay-kind frame
- Customer uploads photo → goes into photo frame at photo frame's size
- Overlay decoration (from scene `overlayUrl`) renders in overlay frame at overlay frame's size
- Cart hook re-indexes so only photo frames count toward `_frame_count`
- Print PDF: both elements composited at their respective sizes/positions
- Example: Color Edge Glass — 6×6 overlay border around 3.75×3.75 photo

### Print modes
- `single` (collage) — one PDF per order, all photos+overlay composited at their positions on a variant-sized page
- `multi` (multi-print) — one PDF per photo frame, each at its own physical size, for cut-and-assemble products

---

## 5. Scene Builder

**Access**: `https://myphoto-editor.fly.dev/test`

**Organization**:
- Products grouped by tag: "Customer Upload" (myphoto) / "Preset Designs" (myphoto-preset) / "Other"
- Search bar filters products by name/handle
- Preset products show a purple "PRESET" badge on the chip

**Per-scene fields** (each product has one scene per size × orientation):
- **Background image** — upload PNG (auto-compressed to 1200px wide, saved to R2)
- **Design Overlay** — optional decorative PNG (used by preset products AND overlay-kind frames)
- **Print Mode** — Collage (single PDF) or Multi-Print (one per frame)
- **Frames** — 1 or more, each configurable:
  - X/Y (% of scene, sliders) — position for preview
  - W (% of scene, slider) — width for preview
  - H (% of scene, slider with override) — height for preview
  - **Print W (in)** / **Print H (in)** — physical size for PDF
  - **Print X (in)** / **Print Y (in)** — physical position for PDF (center of frame)
  - **Kind** — Photo or Overlay (dropdown)
- **Output Builder** (optional) — grid layout for collage products:
  - Toggle "Use custom" to enable
  - Rows / Cols / Frame W/H / Gutter (all inches)
  - When enabled, PDF ignores per-frame positions and lays out in a centered grid

**Preview tab** — simulates customer-facing editor for testing

---

## 6. Storefront Editor (`assets/myphoto-editor.js`)

Mounts on any product page with `myphoto` or `myphoto-preset` tag.

**Key features**:
- Photo frames accept clicks/drag to position, wheel to zoom
- Overlay frames render scene's overlay PNG; no interaction
- Bin strip below scene shows all uploaded photos (with "+" upload tile)
- Preset mode: renders scene + overlay only, no upload UI
- Cart button disabled until all photo-kind frames are filled
- On mobile: Upload CTA auto-hides once bin has photos
- Controls positioned intelligently: variant picker → buy-buttons → price → fallback

**Z-index stack** (bottom to top):
1. Photo frame (z:1)
2. Overlay frame (z:3, if present)
3. Scene bg (z:2 default; z:5 when scene has overlay-kind frame — masks everything outside frames)
4. Hint text (z:3)

**Cart hook** (`buildPropsObject`):
- Skips overlay-kind frames when indexing
- Sends `_frame_count` = number of photo frames only
- Includes per-frame `_photo_N_wIn`, `_hIn` for print sizing

---

## 7. Product Card Enhancements (Tinker)

Applied in `layout/theme.liquid` (`<style>` block) and `snippets/product-card.liquid`:

- **Bigger/bolder titles**: 22px desktop / 18px mobile, weight 700
- **Description preview**: text block added via customizer with `{{ closest.product.metafields.custom.short_description.value }}`
- **Custom badges** via product tags: `bestseller` → red, `new` → green, `limited` → black (top-left corner)
- **Catalog cards render scene**: `<product-card>` element has `data-myphoto-mode` attribute (photo/preset/none); catalog overlay JS reads it

---

## 8. Recent Feature: Mobile Layout Optimizations

Applied in `sections/product-information.liquid` `{% stylesheet %}` block:

- **Mobile order**: editor → product details → native gallery (via CSS ordering)
- **Native gallery thumbnail dots hidden** in editor mode
- **Desktop duplicate hero image hidden** via `.media-gallery__grid > li:first-child` when editor is present
- **Editor controls positioned** near variant picker/buy-buttons/price (see `relocateControls()`)

---

## 9. Operational Runbook

### Deploy the app to Fly

```bash
cd ~/Desktop/myphotoeditor
flyctl deploy --wait-timeout 600
```

Watch for:
- `[build 6/7] RUN npm run build` — should NOT be cached if you actually changed code
- `Visit your newly deployed app at ...` — confirms success
- Any `[vite:esbuild] Transform failed` — build error, check output above

### Force a non-cached build

If Docker aggressively caches:

```bash
echo "// rebuild $(date +%s)" >> app/routes/test._index.jsx
flyctl deploy --no-cache
```

### View logs

```bash
flyctl logs -a myphoto-editor --no-tail 2>&1 | tail -30
```

Live tail (Ctrl+C to exit):

```bash
flyctl logs -a myphoto-editor
```

### SSH into the machine

```bash
flyctl ssh console -a myphoto-editor
```

Then poke around `/app`. Useful for checking what's actually in the built code:

```bash
grep -c "somePattern" /app/build/server/index.js
```

### Rollback

```bash
flyctl releases -a myphoto-editor       # list releases
flyctl deploy --image <image-tag>       # deploy a specific past image
```

### Common gotchas

- **First-upload failures**: Fixed by removing `npm run setup` from `docker-start` in package.json. Migrations run via release_command; the app boots immediately to `0.0.0.0:3000`.
- **CDN minification errors for theme JS**: Shopify's minifier requires ES5. No `async/await`, no modern syntax. Errors show up as `Transforming async functions to ES5 not supported`.
- **Log tail stale**: Fly logs can lag 20+ minutes. To force a fresh check, restart the machine.
- **Live preview lag**: Theme changes need hard reload (Cmd+Shift+R) to bypass browser cache.
- **Scene builder chip layout**: If products count seems off, verify the tag-based grouping in `test._index.jsx` is intact.

---

## 10. Key Files & Their Purpose

### App server (Remix)

- `app/routes/test._index.jsx` — **Scene Builder admin UI**. Contains: SceneSlot (per-scene config), SceneBuilderApp (main), grid grouping, search bar
- `app/routes/api.scenes.tsx` — GET scenes for one product
- `app/routes/api.scenes-bulk.tsx` — GET scenes for multiple product handles (catalog cards)
- `app/routes/api.pdf.tsx` — GET single print PDF for an order/line item
- `app/routes/api.batch-zip.tsx` — GET batch ZIP of multiple orders' PDFs
- `app/routes/api.bin-upload.tsx` — POST photo to R2 and register in DB
- `app/routes/api.upload.tsx` — early photo upload endpoint (legacy)
- `app/lib/pdf.server.ts` — PDF generation: `buildCollagePdf`, `buildMultiPrintPdf`, `parseSize`
- `app/lib/r2.server.ts` — R2 client wrapper (`putObject`)
- `app/db.server.ts` — Prisma client
- `app/shopify.server.ts` — Shopify app config
- `prisma/schema.prisma` — DB schema

### Theme (Tinker)

- `sections/product-information.liquid` — mounts editor for tagged products
- `snippets/product-card.liquid` — catalog card with badges + data-myphoto-mode
- `assets/myphoto-editor.js` — storefront editor (see § 6)
- `assets/myphoto-upload-modal.js` — smart pill modal (site-wide upload)
- `assets/myphoto-catalog-overlay.js` — renders scenes on catalog cards
- `layout/theme.liquid` — custom `<style>` block (product card titles, badges CSS)
- `config/settings_schema.json` — theme settings (MyPhoto Pill group)

### Config / meta

- `package.json` — scripts (`docker-start`, `start`, `setup`, `build`)
- `Dockerfile` — build/runtime stages
- `fly.toml` — Fly app config

---

## 11. Environment / Secrets

Set via `flyctl secrets set KEY=VALUE -a myphoto-editor`. Check current with `flyctl secrets list -a myphoto-editor`.

Expected secrets (verify via `flyctl secrets list`):
- `DATABASE_URL` — Postgres connection
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- R2 access key + secret
- R2 endpoint / bucket

---

## 12. Common Development Tasks

### Add a new photo product
1. Create product in Shopify admin. Add tag `myphoto`
2. Set variants (sizes) e.g. "4x4", "6x6"
3. Add at least ONE product image (required — editor mounts inside media block)
4. Go to Scene Builder (`/test`), select the product
5. For each variant × orientation, upload a scene PNG and configure frame(s)
6. If frame is smaller than variant, set Print W/H
7. Save

### Add a preset product
Same as above, but:
1. Tag `myphoto-preset` (instead of `myphoto`)
2. Upload the artwork PNG as scene overlay
3. Configure one photo frame positioned where the artwork should render

### Add a collage product (multi-photo grid)
1. Create product with `myphoto` tag
2. In Scene Builder, add multiple frames or use Output Builder
3. Enable "Use custom output layout" and set Rows/Cols/Gap
4. Scene preview positions can be anywhere; Output Builder controls the actual PDF layout

### Add an overlay-frame product (photo + decorative border)
1. Create product with `myphoto` tag
2. Upload scene PNG (with transparent knockout where photo+overlay should show through)
3. Upload overlay PNG (decorative artwork)
4. Add TWO frames:
   - Frame 1: Kind = **Overlay**. Set position/size (both scene % and Print W/H/X/Y in inches)
   - Frame 2: Kind = **Photo**. Set position/size (smaller, inside the overlay area)
5. Save

### Regenerate a PDF for an existing order
Navigate in your admin: `https://myphoto-editor.fly.dev/api/pdf?orderId=X&lineItemId=Y&token=Z&frame=N`

Or use your app's admin batch view: `/app/orders` and `/app/batches`.

---

## 13. Known Limitations / TODOs

- **Multi-print batch ZIP overlay support** — single-order PDFs handle overlay, batch might not
- **Overlay print quality** — currently 1200px; ideal 1800px for 300 DPI on 6×6
- **Theme production migration** — plan to migrate Tinker to myphoto.com
- **Print Station app** — separate app for production floor, not started
- **Type field in Shopify admin** — unused; groupings rely on tags
- **Cart flow verification for preset PDFs** — `buildCollagePdf` may need edge case handling for "no photos"

---

## 14. Historical Context

### Major milestones (chronological)
1. Victor print shop web app (Express.js + Neon Postgres + vanilla JS on Render) — earlier project, materials pricing database
2. MyPhoto Shopify app initial build — Scene Builder + product page editor + Print Queue
3. Photo Bin (persistence via localStorage + R2)
4. Scene Builder polish (H slider, R2 uploads, orientation switching)
5. Design Overlay feature (single-frame overlay decoration)
6. Tinker theme migration with smart pill
7. Mobile gallery layout fixes
8. Preset product type introduction (`myphoto-preset` tag)
9. Product card customization (bigger titles, description preview, custom badges)
10. Mixed-size frames (per-frame Print W/H in inches)
11. Output Builder for collage grid layout
12. Overlay-kind frames (photo + overlay in one scene at different sizes)
13. Per-frame Print X/Y for absolute PDF positioning

### Physical warehouse
Lyons Technology Park · Suite 4 — planning docs / floor plan (SVG/HTML iterations) exist separately from this system.

---

*End of documentation.*
