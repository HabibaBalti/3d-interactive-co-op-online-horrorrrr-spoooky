# Architecture

## Stack

| Concern    | Choice                                                                                                       | Why                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build      | Vite + TypeScript (strict)                                                                                   | Fast HMR, zero-config TS, good asset handling                                                                                                                                                                                                                                                              |
| Rendering  | **Three.js, imperative** (not React Three Fiber)                                                             | The game is one long-lived scene with a custom frame loop, render passes and per-timeline worlds. R3F's value is declarative UI-like scenes; here it would add a reconciler between us and the loop, plus React for a UI that is a handful of overlays. Plain Three keeps control and performance obvious. |
| Post       | Three.js `EffectComposer` + one custom combined shader pass                                                  | All screen effects (grain, vignette, aberration, paper, grade, flash) are one full-screen pass, so they cost one draw. The `postprocessing` library is a drop-in upgrade if we later need SMAA/bloom/DOF.                                                                                                  |
| Physics    | Custom cylinder-vs-AABB collision + floor zones (`src/physics/`); Rapier only if we ever need dynamic bodies | The house is static boxes; a walker doesn't need a physics engine. Rapier adds ~1 MB of WASM.                                                                                                                                                                                                              |
| Audio      | Web Audio / `THREE.PositionalAudio` (M4)                                                                     | Spatial audio is core; Howler only if UI audio becomes fiddly.                                                                                                                                                                                                                                             |
| Networking | **Node + `ws`, server-authoritative** (below)                                                                |                                                                                                                                                                                                                                                                                                            |

## Networking recommendation: a small Node `ws` server

This game syncs **state, not motion**: story flags, puzzle progress, lock-ins, scare triggers. A
few messages per minute. The server must be authoritative so the two clients can't disagree about
whether the clock puzzle is solved.

| Option                                | Pros                                                                                                                                                                           | Cons                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node + `ws` (recommended)**         | Full control; authoritative room logic in TypeScript shared with the client; trivially run locally (two browser windows); one deploy serves client + server; no vendor lock-in | We host it (one small always-on instance on Fly.io / Render / Railway); rooms are in memory, so a server restart drops in-progress games unless we add persistence        |
| PartyKit / Cloudflare Durable Objects | One object per room is the perfect model; scales to zero; edge-close; durable storage per room                                                                                 | Cloudflare-specific runtime and tooling; local dev and debugging are less direct; PartyKit's standalone product has been folded into Cloudflare, so APIs have been moving |
| Supabase Realtime                     | Hosted; presence built in; Postgres for persistence                                                                                                                            | Broadcast/presence are peer-relayed, not authoritative: validation would need DB functions or edge functions, splitting game logic across SQL and TS                      |
| Socket.IO                             | Rooms, reconnection and fallbacks built in                                                                                                                                     | Heavier client, custom protocol; our needs (one room, two sockets) are small enough that plain `ws` plus ~50 lines of reconnect logic is simpler                          |

**Design so we can move later:** room logic is written as a pure state machine in `shared/`
(`applyAction(state, action) → state | error`), and `server/` is a thin transport around it. If we
outgrow one Node box, the same reducer runs inside a Durable Object.

### Sync model (M2)

- Client → server: **intents** (`{t:'action', action:{type:'clock/set', h:3, m:17}}`).
- Server validates against the authoritative room state, applies it, bumps a `version`, and
  broadcasts the resulting **flag diff** to both players.
- Clients never mutate shared state locally; they render from the last state the server sent
  (optimistic visuals are fine for local-only feedback like a knob turning).
- **Reconnect:** each client stores `{roomCode, playerToken}` in `sessionStorage`. On reconnect it
  sends `{t:'rejoin', code, token, version}`; the server replies with a full snapshot. Rooms survive
  a disconnected player for a grace period (e.g. 30 min).
- Every message carries a `t` discriminator and is decoded through `shared/protocol.ts`.

## Folder structure

Folders marked _(M#)_ don't exist yet; they are created by the milestone that needs them.

```
.
├── index.html                 # Vite entry
├── public/
│   ├── favicon.svg
│   └── assets/                # Static, lazy-loaded per act (see docs/ASSETS.md in M7)
│       ├── models/            # .glb (Blender exports / CC0 packs)
│       ├── audio/             # .ogg (+ .mp3 fallback for Safari if needed)
│       └── textures/
├── shared/                    # Pure TS imported by BOTH client and server. No DOM, no Node.
│   ├── types.ts               # Character, Timeline
│   ├── protocol.ts            # Wire messages + encode/decode
│   ├── roomCode.ts            # Spoken-friendly room codes
│   ├── room.ts                # (M2) authoritative room reducer
│   └── story/                 # (M2–M3) flag definitions shared by both sides
├── server/
│   └── index.ts               # http (health + static dist/) + WebSocket transport
├── src/
│   ├── main.ts                # Bootstrap
│   ├── style.css
│   ├── core/                  # Engine (renderer, loop), Input (keys, pointer lock)
│   ├── render/                # PostFX, palettes, textures, StaticBatcher, materials/, shaders/
│   ├── settings/              # Settings + quality presets (persisted)
│   ├── physics/               # CollisionWorld: wall/prop boxes + floor zones and stair ramps
│   ├── world/
│   │   ├── house/             # layout.ts (THE HOUSE AS DATA), House builder, Door, props, walls
│   │   ├── props/             # Hand-built dynamic props (grandfather clock)
│   │   └── Storm.ts           # 1994 lightning
│   ├── audio/                 # AudioEngine (mix, reverb, 3D), Soundscape, synth, Hummer
│   ├── player/                # First-person controller, Sam's flashlight
│   ├── interaction/           # Look-at + E/click interactables (one-word prompts)
│   ├── net/                   # Server connection; (M2) room client, flag sync
│   ├── story/                 # (M2) flag store, act/loop state, (M4) wrongness system
│   ├── puzzles/               # (M3+) one module per puzzle: clock/, floorboards/, lullaby/, …
│   ├── echoes/                # (M3) memory echo playback
│   ├── entity/                # The entity: figure (M0), AI + hunts (M5)
│   ├── data/                  # (M3+) data-driven content: puzzles, wrongness events, voice lines
│   └── ui/                    # HUD, title, (M2) landing/lobby, (M7) settings menu
├── GAME_DESIGN.md             # Creative brief (source of truth)
├── CLAUDE.md                  # Conventions for AI-assisted sessions
└── docs/ARCHITECTURE.md       # This file
```

### Key boundaries

- **Each client only ever builds its own timeline.** Nora's client never loads the present-day
  house and vice versa; cross-time effects arrive as flags. (The M0 `T` key that swaps timelines is
  a dev tool only.)
- **Content is data.** Puzzles, wrongness events, voice lines and echoes are declared in
  `src/data/` / `shared/story/` and interpreted by systems, so new content mostly means new data.
- **Rendering knows nothing about networking**, and puzzles talk to the network only through the
  story/flag store.

## The house as data (M1)

`src/world/house/layout.ts` describes the Hale house once, for both timelines:

- **walls**: axis-aligned segments with openings (door / arch / window). `walls.ts` splits them
  into solid boxes for rendering and collision; doors get a `Door` (hinged, lockable, optional
  one-sided bolt).
- **floors / ramps / ceilings**: slabs the player stands on (floor zones carry a room id), stair
  ramps between levels.
- **props**: `kind` + placement, with a `present` override (`'missing'`, moved, tilted, or under a
  dust sheet) and `only` for one-timeline props. Builders in `props.ts` make them from primitives.
- **lights**: per timeline, with a flicker style. **puddles** and mould are present-day only.

`House` builds one timeline from this data: all static geometry goes through `StaticBatcher`
(merged into one mesh per surface + one ink-line mesh: about 70 draw calls for the whole house),
while doors, the clock, the drawing and windows stay separate. Textured surfaces get world-space
UVs so patterns stay at constant scale. M2/M3 will layer story flags on top: a flag can override
a prop's placement or a door's state, which is how "Nora hides it → Sam finds it" will work.

## Close-ups (inspectables)

`src/data/inspectables.ts` lists props worth a closer look (by prop `id`), with per-timeline
text: a name, one short line, and an optional faint line of lore (a fragment of family
history that deepens the story; never a puzzle answer). `House` keeps those props as separate meshes with their own materials so
they can glow when looked at, plus an invisible padded hit box so small things are easy to aim
at. `Inspector` glides the camera from the player's eyes to a framing in front of (or above) the
object; the player stays put. `InspectCard` draws the text.

## Audio

Every sound is **synthesised at runtime** with the Web Audio API (`src/audio/synth.ts`): noise,
oscillators and filters, no audio files. That keeps the download tiny, avoids licensing, and lets
sounds vary each time. Recorded voice lines (memory echoes, tapes) will be files later; the
pipeline is the same.

- `AudioEngine`: one AudioContext; the listener rides the camera; everything goes through a dry
  path plus a convolution reverb whose room changes with timeline (the empty present rings) and
  floor (the basement is bigger and wetter). Master volume, pause ducking, suspend when hidden.
- `Soundscape`: built per timeline like the house. Beds (rain or wind, room tone), positioned
  loops (clock, TV, boiler), timed events (creaks, steps overhead, humming, drips), and reactions
  to game events. Sources on another floor are muffled with a lowpass (cheap occlusion).
- `core/events.ts`: gameplay emits `step`, `door`, `flashlight`, `strike`; the soundscape listens.
  The entity's hearing (M5) will subscribe to the same events.
- The lullaby (`src/data/lullaby.ts`) is data, shared by the humming now and the music-box and
  piano puzzle later.

## Rendering pipeline

`RenderPass → OutputPass (tone map + sRGB) → AtmospherePass`. The atmosphere pass runs on
display-ready colour, which makes the grade intuitive to tune. With post-fx off (Low quality or
`P`), the renderer draws straight to screen with the same tone mapping, so the image stays close.

Quality presets (`src/settings/settings.ts`): pixel-ratio cap, render scale, shadows, post-fx.
Fog density is per timeline in `src/render/palettes.ts`.
