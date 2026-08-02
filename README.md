# Incan Gold

A faithful online implementation of **Incan Gold** (Diamant) for 2–10 players, built as an
installable iPhone PWA and served from Cloudflare Workers + Durable Objects.

One player hosts a room and gets a four-letter code. Everybody else joins with the code and
plays simultaneously — press on or get out, all at the same time, on their own phone. Drop
your connection and you walk straight back into your seat.

---

## The game

This is a 1:1 replica of the published rules. The engine lives in
[`shared/engine.ts`](shared/engine.ts) and is covered by [`tests/engine.test.ts`](tests/engine.test.ts).

**The deck** — 31 cards in the first expedition:

| Cards | Detail |
| --- | --- |
| 15 treasures | 1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17 |
| 15 hazards | 3 each of snake, spider, mummy, fire, rockfall |
| 5 artifacts | one shuffled into the deck at the start of each expedition |

**Five expeditions**, and in each one:

- A card is turned over onto the path.
- **Treasure** is split evenly between the explorers still inside; the undividable remainder
  stays on the card.
- The **first hazard** of a type is harmless. The **second of the same type** ends the
  expedition immediately — everyone still inside loses the gems in their hand, and one copy of
  that hazard is removed from the game for good.
- An **artifact** sits on the path until somebody leaves *alone*; that explorer carries out
  every artifact on the path.
- After each card everybody still inside decides **at the same time**: press on, or get out.
- Explorers who leave bank their hand in their tent and split whatever is still lying on the
  path. Leftovers stay behind.
- The expedition ends on a hazard pair, or when the last explorer walks out.

**Scoring** — banked gems are safe forever. The first three artifacts recovered in the game are
worth 5 gems each, the fourth and fifth 10 each. Artifacts left on the path when an expedition
ends are lost for the rest of the game. Most gems after five expeditions wins.

The only addition to the physical game is an optional **decision timer** (host setting, default
30s). When it runs out, anyone who has not chosen walks out with their gems — the safe option,
so an absent player is never punished beyond losing the upside.

---

## Design rules

Two constraints run through every pixel of this app:

- **No gradients.** Flat colour only. Depth comes from stacked tones and hard offset shadows.
- **No rounded corners.** `border-radius: 0` is set globally; all art is built from straight
  segments and mitred joins.

All artwork is hand-authored SVG in [`src/art/`](src/art) — cards, the ten explorers, the icon
set and the title scene. Nothing is bitmapped except the generated app icons.

**Theming** — light and dark mode, each in three colour schemes (Temple, Jungle, Obsidian).
Every scheme defines a **main**, **secondary** and **accent** colour; the accent is the one that
flashes when the temple turns on you. Tokens live in
[`src/styles/theme.css`](src/styles/theme.css). The choice is stored and applied before first
paint, so the app never flashes the wrong palette on load.

**Motion** — every state change fades or slides; nothing pops. Screens cross-fade in a shared
grid cell, the decision bar and the banner hold a constant height in every phase, and the timer
is a scaled bar. No element ever shifts the layout underneath your thumb. All of it collapses to
near-zero duration under `prefers-reduced-motion`.

Tension is sold with a full-screen accent flash and a screen shake on a hazard pair, a gold
flash on a large treasure, a hard-edged vignette that tightens as hazard types stack up, and
floating gain/loss numbers over each explorer.

---

## Architecture

```
shared/     types + the authoritative rules engine (used by the Worker, typed for the client)
worker/     Cloudflare Worker (routing, room codes) and the GameRoom Durable Object
src/        React PWA — art, screens, components, theme and socket client
tests/      rules tests, run against the real engine
```

One Durable Object per room holds the game state and drives the pacing of each beat. It is the
only place the deck exists — clients receive a redacted snapshot with just the deck *count*, and
other players' decisions stay hidden until the window resolves. State is persisted on every
mutation, so a room survives the object being evicted.

Reconnection: on joining, a client is handed a seat token which it stores locally. Reopening the
app replays that token and reclaims the same seat mid-expedition, gems and all. The client also
reconnects on its own with exponential backoff, and whenever iOS hands the tab back after
backgrounding.

---

## Running it

```bash
npm install
npm run build      # type-check + bundle the PWA into dist/
npx wrangler dev   # serves the Worker, the Durable Object and dist/ on :8787
```

For live-reloading UI work, run `npx wrangler dev` and `npm run dev` side by side — the Vite dev
server on :5173 proxies `/api` (including the WebSocket) through to the Worker.

```bash
npm test           # the rules test suite
npm run typecheck
npm run icons      # re-rasterise the app icons from assets-src/icon.svg
```

## Deploying to Cloudflare

You need a Cloudflare account. Nothing else — no domain, no card, no paid plan.

```bash
npm install
npx wrangler login    # opens a browser to authorise this machine
npm run deploy        # type-checks, builds dist/, uploads the Worker + assets
```

That's the whole deploy. Wrangler prints the live URL, something like:

```
https://mnbgold.<your-subdomain>.workers.dev
```

Open it on your phone and it is playable immediately. Every push of new code is just
`npm run deploy` again.

### Why this runs on the free plan

`GameRoom` is registered as a **SQLite-backed** Durable Object:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoom"]
```

SQLite-backed Durable Objects are included on the Workers **free** plan. (The older
KV-backed kind — declared with `new_classes` — is the one that requires a paid plan. If you
ever switch that line, you change the billing requirement.)

The free plan's daily request allowance is far more than a few friends playing need.
WebSocket *messages* bill as requests, but a whole expedition is only a few hundred of them.

### What `wrangler.toml` sets up

| Piece | Purpose |
| --- | --- |
| `main = "worker/index.ts"` | routes `/api/*`, mints room codes, upgrades WebSockets |
| `[assets] directory = "./dist"` | serves the built PWA |
| `not_found_handling = "none"` | lets the Worker do the SPA fallback for `/r/ABCD` deep links |
| `[[durable_objects.bindings]]` | binds `ROOMS` → the `GameRoom` class |

One Durable Object instance per room code, addressed with `idFromName(code)` — so everyone
typing the same four letters lands in the same object, wherever they are.

### Checking it works

```bash
curl https://<your-url>/api/health          # {"ok":true}
curl -X POST https://<your-url>/api/room    # {"code":"ABCD"}
```

If those two respond, hosting and joining will work.

### Optional: a custom domain

Add a route to `wrangler.toml` (the domain must be on your Cloudflare account):

```toml
routes = [{ pattern = "gold.example.com", custom_domain = true }]
```

Then `npm run deploy` again. Worth doing if you want a tidier name on the Home Screen —
the `workers.dev` URL works fine otherwise, including for installing the PWA.

### Rolling back

```bash
npx wrangler deployments list
npx wrangler rollback [<version-id>]
```

Rooms are ephemeral — an idle room is swept after two hours — so a rollback mid-session only
disrupts games actually in progress.

## Installing on iPhone

Open the deployed URL in Safari, then **Share → Add to Home Screen**. It launches full-screen
with its own icon and status bar, and the service worker keeps the shell available offline
(gameplay itself needs the network, since the room lives on the server).
