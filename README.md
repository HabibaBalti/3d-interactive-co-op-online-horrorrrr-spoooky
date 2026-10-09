# STILL HERE

A two-player asymmetric co-op psychological horror game for the web. One player is **Nora**, on a
stormy night in 1994. The other is **Sam**, her little brother, decades later in the abandoned
family house. Get on a call. Never show each other your screen.

> Design: [`GAME_DESIGN.md`](GAME_DESIGN.md) · Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
> · Solutions (spoilers, for testing): [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md)
> · **Play in the browser:** https://claude.ai/artifact/VHXzRj8NB92Kg7DaPTdrXS

| Nora · 1994                                        | Sam · present                                       |
| -------------------------------------------------- | --------------------------------------------------- |
| ![Nora, 1994](docs/screenshots/m1-nora-dining.jpg) | ![Sam, present](docs/screenshots/m1-sam-dining.jpg) |

The whole night is playable: three acts, nine puzzles, the entity, the mirror, the flood, the
3:17 board, two endings, and the loop. It takes two people about 45–90 minutes.

## How to play with a friend

You need two computers (or two browser windows), headphones, and a voice call (Discord, phone,
anything). The game has no built-in voice chat.

**Option A: the hosted page, nothing to install**

1. Open the play link above. It's private at first: share it with your friend from the page's
   **Share** menu, with permission to **use** the page (Contributor), so the two of you can join the same room.
2. One of you clicks **Create**, picks a character, and reads the five-letter code out loud.
3. The other clicks **Join** and types the code. They get the other character.
4. When both of you show as connected, click **enter**.

**Option B: run it yourself**

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 in two browser windows (or one normal and one private window). Create
in one, join with the code in the other. A friend on the same Wi-Fi can open the `Network:`
address Vite prints. To play over the internet, deploy it (see **Deploy**).

**Practice alone** (on the title screen) runs the whole game on one computer: `Tab` swaps between
Nora and Sam. Good for learning the house, but it spoils the puzzles.

If either of you reloads or drops out, open the page again and click **Continue**: you rejoin the
same night where you left it.

## Controls

| Key       |                                            |
| --------- | ------------------------------------------ |
| W A S D   | move (arrow keys work too)                 |
| mouse     | look (click the game to capture the mouse) |
| shift     | run (it can hear you)                      |
| C         | crouch                                     |
| E / click | use whatever is under the dot              |
| space     | step back from a close-up                  |
| F         | flashlight (Sam only)                      |
| esc       | pause and settings                         |
| Tab       | swap characters (practice mode only)       |

Things that matter glow faintly when you look at them. Close-ups show a name, a short line, and a
faint line of family history. When a close-up has buttons (the clock hands, the piano, the
valves…), click them; `esc` or the **back** button closes it.

**Settings** (esc): volume, mouse sensitivity, invert look, head bob, lore lines, quality, film
effects, reduce flashing, subtitles, and jump scares (full or reduced).

## Tips without spoilers

- Neither of you can solve anything alone. Describe what you see, out loud, in detail: colours,
  numbers, positions, what's missing.
- What Nora does in 1994 is still there, older, in Sam's house.
- Walk slowly when something is looking for you.
- If the night starts again, solved puzzles stay solved, but the house remembers.

## Content

Psychological horror about a family secret and a child's death (nothing graphic). A few jump
scares, flickering light and lightning; "reduce flashing" and "jump scares: reduced" are in the
pause menu.

## Dev options

| URL param                     |                                                    |
| ----------------------------- | -------------------------------------------------- |
| `?notitle&as=sam`             | skip the title and play solo as Sam (or `as=nora`) |
| `?pos=x,y,z&yaw=90&pitch=-10` | start somewhere specific (yaw 0 = north)           |
| `&keep`                       | with `notitle`: keep the saved practice game       |

In dev builds `window.__still` exposes the engine and game; `__still.as('sam', {type: …})` sends
an action as either character in practice mode (see `shared/game/types.ts` for actions).

## Scripts

|                 |                                                         |
| --------------- | ------------------------------------------------------- |
| `npm run dev`   | client + server with hot reload                         |
| `npm run check` | typecheck, lint, format check, tests                    |
| `npm run build` | typecheck + production build to `dist/`                 |
| `npm start`     | run the server; serves `dist/` too if it has been built |
| `npm test`      | unit tests (Vitest)                                     |

## Deploy

One Node service serves the built client and the WebSocket on the same origin:

```bash
npm ci
npm run build
PORT=8080 npm start
```

Any host that runs a long-lived Node process with WebSockets works: Fly.io, Render, Railway, a
small VPS. Build command `npm ci && npm run build`, start command `npm start`, health check
`GET /health`, a single instance (rooms are in memory).

**Split hosting** (static client on Netlify / Vercel / Cloudflare Pages, server elsewhere): build
the client with `VITE_SERVER_URL=wss://your-server.example.com/ws npm run build`, upload `dist/`,
and run `npm start` on the server host.

## Assets

Everything is made in code: low-poly primitives, procedural canvas textures, and synthesised
sound. There are no downloaded models or audio files.
