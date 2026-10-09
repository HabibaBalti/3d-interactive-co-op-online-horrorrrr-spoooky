# CLAUDE.md — project conventions for STILL HERE

Read `GAME_DESIGN.md` (creative brief) and `docs/ARCHITECTURE.md` (stack, networking, folders)
before working. Development is milestone-based (M0–M7); **stop for the user's review after each
milestone** and, for each one, explain what you'll build, build it, say how to test it (including
two players on one machine), and list open questions. Ask rather than guess when the design is
ambiguous or impractical.

## Commands

- `npm run dev` — Vite client (:5173) + realtime server (:8787) together; Vite proxies `/ws`.
- `npm run check` — typecheck + lint + prettier check + tests. Run before every commit.
- `npm run build` then `npm start` — production: one Node process serves `dist/` and `/ws`.
- Dev URL params: `?as=nora|sam`, `?notitle`, `?pos=x,y,z&yaw=deg&pitch=deg`. Dev key `T` swaps
  timeline in place; `window.__still` exposes engine/player/house in dev builds.
- Visual checks: Chromium + Playwright are available; drive `?notitle&pos=…` and screenshot.

## Design rules that affect code

- **No reading-based clues.** Never add notes, letters or text clues. On-screen text is UI, single
  words, or optional subtitles. Decorative Japanese text is allowed only on title/menu screens.
- **Every puzzle is asymmetric**: the information to solve it must be split across both clients.
- **Nothing graphic** about Nora's death.
- Jump scares only when tied to a story beat or co-op moment; respect the jump-scare intensity and
  photosensitivity settings for every flash, flicker and scare.
- Mic input is always opt-in.

## Code conventions

- TypeScript strict, `noUncheckedIndexedAccess`; ESM; Prettier (single quotes, 100 cols).
- Plain Three.js, imperative. Systems are classes with `update(dt, time)`; register via
  `engine.onUpdate`.
- `shared/` is pure TS used by client **and** server: no DOM, no Node APIs. Import it with relative
  paths (`../../shared/types`).
- The server is authoritative for shared state. Clients send intents; they never mutate shared
  flags locally.
- Each client builds **only its own timeline**. Cross-time effects travel as story flags.
- Content (puzzles, wrongness events, voice lines, echoes) is data in `src/data/` or
  `shared/story/`, interpreted by systems.
- All colours for a timeline live in `src/render/palettes.ts`; don't hardcode palette colours in
  world code.
- The house is data (`src/world/house/layout.ts`); change the layout there, not in builder code.
  Static geometry must go through `StaticBatcher`; only animated/interactive things are separate
  meshes.
- Interaction prompts are single lowercase words (`open`, `locked`, `unbolt`).
- Sound: gameplay code never plays audio directly. It emits on `core/events.ts`; the
  `Soundscape` reacts. New effects are synthesised in `src/audio/synth.ts`.
- Greybox = primitives + procedural canvas textures (`src/render/textures.ts`). Real assets go in
  `public/assets/` as glTF/GLB (models), OGG (audio), and are lazy-loaded per act.
- Wrap `localStorage`/`sessionStorage` access in try/catch.
- Keep comments sparse and about intent; match surrounding style.

## Art direction shorthand

Stylized low-poly + Japanese horror: toon shading (few hard bands), ink edge lines, washi paper
grain, creeping ink vignette, indigo shadows, one red accent, water everywhere. Nora/1994 = warm
amber memory; Sam/present = cold teal decay. The entity is an unlit black J-horror silhouette
(too tall, bent neck, long wet hair over the face, dripping), rarely seen clearly.
