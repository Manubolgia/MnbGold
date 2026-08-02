# Custom sprites & deployment

1. [Adding your own sprite art](#1-adding-your-own-sprites) — drop SVGs or PNGs into `public/sprites/`.
2. [Going live](#2-going-live) — board on GitHub Pages, rooms on Cloudflare, the same split as `6nimmt`.

---

## 1. Adding your own sprites

### How it works

Every card and explorer has hand-drawn art built into the app. Dropping a file at the matching
path below **overrides** it at runtime. Anything you don't supply keeps its original drawing, so
you can convert the game one sprite at a time and it always looks finished. No code changes, no
registration step — the filename *is* the wiring.

**SVG and PNG both work.** For each slot the app tries `.png` first, then `.svg`.

**The current art is PNG, generated from SVG masters.** The masters live in
`assets-src/sprites/` (git-ignored — they're ~50 MB of traced vector) and
`npm run sprites` rasterises them into `public/sprites/`. That conversion cut the payload from
54.9 MB to 1.4 MB with no visible difference, since a card is only drawn ~104px wide. To change
a card: edit or replace its master, run `npm run sprites`, commit the PNG.

You can also just drop a `.png` or `.svg` straight into `public/sprites/` — the filename is the
only wiring, and a hand-placed file works without any master.

### Where the files go

Paths are relative to the project root. Extension is `.svg` **or** `.png` — your choice, and you
can mix them freely.

```
public/sprites/
├── hazards/
│   ├── snake.svg
│   ├── spider.svg
│   ├── mummy.svg
│   ├── fire.svg
│   └── rockfall.svg
├── treasures/
│   ├── treasure-1.svg
│   ├── treasure-2.svg
│   ├── treasure-3.svg
│   ├── treasure-4.svg
│   ├── treasure-5.svg
│   ├── treasure-7.svg
│   ├── treasure-9.svg
│   ├── treasure-11.svg
│   ├── treasure-13.svg
│   ├── treasure-14.svg
│   ├── treasure-15.svg
│   └── treasure-17.svg
├── explorers/
│   ├── explorer-1.svg
│   … through …
│   └── explorer-10.svg
├── artifact.svg
└── card-back.svg
```

Create the folders in one go:

```bash
mkdir -p public/sprites/{hazards,treasures,explorers}
```

### Names and sizes

| Art | Path (`.svg` or `.png`) | Shape | PNG size | Count |
| --- | --- | --- | --- | --- |
| Hazards | `public/sprites/hazards/<type>` | 5:7 | 360 × 504 | 5 |
| Treasures | `public/sprites/treasures/treasure-<value>` | 5:7 | 360 × 504 | 12 |
| Artifact | `public/sprites/artifact` | 5:7 | 360 × 504 | 1 |
| Card back | `public/sprites/card-back` | 5:7 | 360 × 504 | 1 |
| Explorers | `public/sprites/explorers/explorer-<n>` | 1:1 | 256 × 256 | 10 |

**Hazard names** are exactly these five, lowercase — `snake`, `spider`, `mummy`, `fire`,
`rockfall`. They match the game's internal names, so don't rename them.

**Treasure values** — the deck has 15 treasure cards but only **12 distinct values**, because 5,
7 and 11 each appear twice. One file per value: `1, 2, 3, 4, 5, 7, 9, 11, 13, 14, 15, 17`. There
is no `treasure-6`, `-8`, `-10`, `-12` or `-16` — those values aren't in the game.

The built-in treasure art prints the gem value in a banner at the bottom of the card. If your
sprites don't show the number, the count still appears in the log and the split banner, but
players lose the at-a-glance read — worth drawing in.

**Explorers** are `explorer-1` … `explorer-10`, matching the ten seats in the picker left to
right. `explorer-1` is the first swatch on the home screen.

### If you're supplying SVGs

- **Set a `viewBox`** — that's what makes it scale. `viewBox="0 0 120 168"` for cards,
  `viewBox="0 0 48 48"` for explorers. Matching the built-in grid keeps your coordinates
  identical to the existing art, but any viewBox with the right *ratio* works.
- **Don't set fixed `width`/`height`** on the root `<svg>`; if you do, the app's sizing still
  wins, but the viewBox is what controls how your drawing maps into the box.
- **Self-contained only.** These load as `<img>`, so external stylesheets, scripts and remote
  fonts won't apply. Inline your styles as attributes or a `<style>` block, and convert text to
  paths if the font matters — otherwise it falls back to a system font on the player's device.
- CSS variables from the app's theme (`var(--gold)`, etc.) will **not** resolve inside an `<img>`
  SVG. Use literal colours.

### If you're supplying PNGs

- **Cards are 5:7.** 360 × 504 is that ratio at 3×, sharp on a phone; cards display around
  104px wide. 240 × 336 or 480 × 672 work equally well.
- **Explorers are square**, shown at 40px in a seat and ~52px in the picker, so 256 × 256 is
  generous. 128 × 128 is fine for chunky pixel work.
- PNGs get `image-rendering: pixelated` so pixel art stays crisp. If your art is smooth or
  painterly and looks harsh, drop the `.sprite.is-raster` rule in
  [src/styles/app.css](src/styles/app.css). SVGs are never pixelated.

### Both formats

- **Off-ratio art is cropped, not squashed** (`object-fit: cover`). Keep the subject clear of
  the edges if unsure.
- Transparency works — the card sits on the table background, so transparent areas show the
  surface colour behind.

### Trying them out

```bash
npm install
npx wrangler dev      # http://localhost:8787
```

Drop a file in, reload, and it's there. A missing sprite is silent and harmless — the built-in
art stays. Delete a sprite to get the original back.

### One caveat: the service worker caches sprites

The installed PWA caches images aggressively (see [public/sw.js](public/sw.js)). If you
**replace** a sprite with a new version under the same filename, players who already installed
the app may keep seeing the old one. Bump the cache version when that happens:

```js
const VERSION = 'mnbgold-v2';   // was mnbgold-v1
```

Only needed for *replacing* already-live art; first-time additions are fetched fresh.

---

## App icons (Home Screen icon)

Separate from sprites — these are generated. The source is
[assets-src/icon.svg](assets-src/icon.svg). Replace it and run:

```bash
npm run icons
```

That rasterises it into `public/icons/` at 180, 192, 256 and 512px and copies the SVG across.
The manifest already points at all of them.

To supply your own PNGs instead, put them in `public/icons/` with these exact names:

| File | Size | Used for |
| --- | --- | --- |
| `icon-180.png` | 180 × 180 | iPhone Home Screen (apple-touch-icon) |
| `icon-192.png` | 192 × 192 | Android / manifest |
| `icon-256.png` | 256 × 256 | manifest |
| `icon-512.png` | 512 × 512 | splash + maskable |
| `icon.svg` | any | scalable |

Design it **full-bleed with no transparent margin** — the 512 doubles as the maskable icon, so
iOS and Android crop into it. Keep anything important inside the middle 80%.

> ⚠️ **`npm run icons` needs Node 20+.** Your default `node` is v18.20.8 and `sharp` won't load
> on it. Run `nvm use 22` first. Only affects this script; the game builds fine on 18.

---

## 2. Going live

The board is static on **GitHub Pages**; the rooms run on a **Cloudflare Worker**. Two deploys,
two URLs, independent — publishing a new board never disturbs a game in progress. This is wired
up and working; what follows is the one-time setup.

### Step 1 — Deploy the Worker first

The board needs the Worker's URL baked in, so this comes first.

```bash
nvm use 22
npx wrangler login
npm run deploy
```

Note the URL it prints: `https://mnbgold.<your-subdomain>.workers.dev`.

### Step 2 — Tell GitHub where the Worker is

In the repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab →
**New repository variable**:

| Name | Value |
| --- | --- |
| `SERVER_URL` | `https://mnbgold.<your-subdomain>.workers.dev` (no trailing slash) |

The Pages build fails with a clear error if this is missing, rather than shipping a board that
can't reach a server.

### Step 3 — Turn on Pages

Repo → **Settings** → **Pages** → **Source: GitHub Actions**. (Not "Deploy from a branch".)

### Step 4 — Push

```bash
git add -A
git commit -m "Custom sprites, new icon, split Pages/Worker deploy"
git push
```

The `pages.yml` workflow runs the tests and type-check, builds with the right base path, and
publishes to `https://manubolgia.github.io/MnbGold/`.

### Optional — deploying the Worker from CI too

`npm run deploy` from your machine is enough. If you'd rather use the Actions tab, add two
repository **secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → template "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right-hand sidebar |

Then run **Deploy the game server** from the Actions tab. It's `workflow_dispatch` only — never
automatic — because redeploying resets rooms that are mid-expedition.

### What changed to make this work

| Piece | Purpose |
| --- | --- |
| [src/lib/server.ts](src/lib/server.ts) | Resolves the API base: `VITE_SERVER_URL` at build time, `?server=…` override remembered in `localStorage`, same-origin when unset |
| [worker/index.ts](worker/index.ts) | CORS headers + `OPTIONS` preflight, since the board is on another origin |
| [vite.config.ts](vite.config.ts) | `base` from `BASE_PATH`, so assets resolve under `/MnbGold/` |
| [scripts/rewrite-manifest.mjs](scripts/rewrite-manifest.mjs) | Prefixes `start_url`, `scope` and icon paths — Vite doesn't touch the manifest |
| [public/sw.js](public/sw.js) | Shell paths derived from the worker's own scope instead of hardcoded `/` |
| `404.html` | Pages has no SPA fallback; a copy of `index.html` provides one |

Both origins still work: the `workers.dev` URL serves a complete playable copy, and the Pages
board talks to it cross-origin.

### Confirm it works

```bash
curl https://<worker-url>/api/health          # {"ok":true}
curl -X POST https://<worker-url>/api/room    # {"code":"ABCD"}
```

Then open the Pages URL, host a room, and join from your phone.

**Install on iPhone:** Safari → **Share** → **Add to Home Screen**.

### Free plan

`GameRoom` is a SQLite-backed Durable Object (`new_sqlite_classes` in
[wrangler.toml](wrangler.toml)), included on the Workers **free** plan. The KV-backed kind
(`new_classes`) is the one that costs money — don't change that line.

### Rolling back

```bash
npx wrangler deployments list
npx wrangler rollback [<version-id>]
```

---

## Quick reference

```bash
mkdir -p public/sprites/{hazards,treasures,explorers}
# drop your .svg or .png files in

npx wrangler dev      # preview at localhost:8787
npm run deploy        # ship it
```

| Want to change | Do this |
| --- | --- |
| A card, from its master | Edit `assets-src/sprites/…`, run `npm run sprites` |
| A card, drop-in | Add `.png` or `.svg` to `public/sprites/…`, 5:7 |
| An explorer portrait | Same, in `explorers/`, square |
| The Home Screen icon | Replace `assets-src/icon.svg`, run `npm run icons` (Node 20+) |
| Art already live, looks stale | Bump `VERSION` in `public/sw.js` |
| Remove a custom sprite | Delete the file — the built-in art returns |
