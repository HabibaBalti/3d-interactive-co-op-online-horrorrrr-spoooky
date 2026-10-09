# STILL HERE — Game Design Summary

A browser-based, two-player, asymmetric co-op psychological horror game. Each player is on their
own device, plays a different character in a different timeline, and **never sees the other's
screen**. Progress depends on talking over voice. This file is the condensed source of truth for
the creative brief; when in doubt, it wins over code comments.

Inspirations: Enchambered's _Alone Together_ (two devices, clues help the other player) and
Abeto's _Messenger_ (small walkable stylized 3D world in a web page), made dark, foggy and wrong.
Visual direction adds **Japanese horror** (see §9).

---

## 1. Hard rules (non-negotiable)

1. **Minimal reading.** No diaries, letters, notes or text-wall clues. Story and clues come from
   visuals, environment, voiced lines, sound, VHS footage, drawings, objects, colours, symbols,
   music. On-screen text = UI essentials, single words, optional subtitles.
2. **Asymmetric information.** Every main puzzle needs both players sharing information verbally.
3. **Psychological over shock.** At most 2–3 real jump scares per act, each tied to a reveal or a
   co-op moment.
4. **Tasteful handling of a child's death.** Nothing graphic. Imply, never show. No gore.
5. **Runs well in a browser on a typical laptop.** Stylized low-poly over realism.

Avoid: text clues, untethered jump scares, single-player-solvable puzzles, guesswork or outside
knowledge, gore, lobby/matchmaking, over-explaining the entity or story in words.

## 2. Setting and characters

The **Hale family house**: two storeys plus basement, small town. Two timelines in the same house:

|          | **Player 1 — NORA**                                                                 | **Player 2 — SAM**                                                                     |
| -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Timeline | 1994, a stormy night                                                                | Present day                                                                            |
| House    | Lived-in, warm: lamps, dinner on the table, ticking grandfather clock, TV murmuring | Abandoned, rotting, water-damaged, partly flooded, boarded up, mould                   |
| Who      | 17, the daughter. Doesn't know this is her last night.                              | Now an adult, back to sell the house after his mother's death. Believes Nora ran away. |
| Light    | Flickering lamps, warm amber                                                        | Flashlight cone, cold moonlight                                                        |

Family in 1994: **Ruth** (mother), **Walter** (father), **Nora** (17), **Sam** (9).

**In-world voice link:** an old radio / baby monitor exists in both timelines. It is the fiction
for the players' real voice call, and the channel the entity abuses.

## 3. The truth (3:17 a.m.)

During the storm Nora and little Sam played hide-and-seek. Nora hid in the basement. Sam,
frightened by thunder, shut the basement door and slid the bolt, not knowing she was there. The
basement flooded. The parents found Nora in the morning, hid what happened, told the town she ran
away, and told Sam the same until he believed it.

Not a twist: a **slow realization** players suspect before it is confirmed, and must keep going.
Sam is uncovering something he did. Nora is uncovering her own death.

**The entity:** the family's cover-up made physical. Tall, dark, dripping, waterlogged, never fully
in focus. Present in both timelines, can hear the players. Grows stronger when players accept the
false story, weaker as they uncover the truth. Never explained in words.

## 4. Structure

- **Act 1 — The House.** Teaches the asymmetric mechanic and the cross-time link. Eerie but
  grounded: footsteps, doors that were open, the clock stopping at 3:17. Family present in 1994 only
  as sounds and memory echoes (humming, TV, a cough), never chat NPCs.
- **Act 2 — Something Else Is Listening.** The entity is real. Players describe "the same" object
  differently and both are right. Photos change; four plates become three. Fake radio voices
  ("don't trust him", "she's lying to you", "you know what you did"). First hunts.
- **Act 3 — The Basement / The Truth.** Reconstruct 3:17. Climax: Nora, in a flooding basement,
  reaches the door and finds it bolted from the other side, a child's voice behind it. Then the
  3:17 Board and Sam's choice.

## 5. Core mechanics

1. **Cross-time interaction.** What Nora hides/changes in 1994 persists, aged, in Sam's present
   (toy pushed behind a radiator → rusted toy there). What Sam uncovers (rot, collapse, scraped
   wallpaper) reveals what was hidden in Nora's world.
2. **Mirrors (signature scare).** Some mirrors/windows briefly show the other player's room in the
   other timeline. Sam may see a figure right behind Nora that Nora's screen doesn't show. Sam says
   "don't turn around"; Nora decides whether to believe him. Works both ways. _Template for good
   scares: the horror is delivered by your partner's voice._
3. **Memory echoes.** Short, voiced, semi-transparent, desaturated, glitchy replays of family
   moments in 3D space. Each player sees different echoes and must describe them.
4. **VHS tapes** on CRTs with tracking lines and audio warble.
5. **Kid Sam's drawings.** Crayon drawings telling the story in pictures; darker each loop.
6. **Hunts by sound.** The entity tracks noise (running, knocking things over, doors). The hiding
   player stays still while the partner guides them. Optional opt-in **mic input** (Web Audio)
   makes loud talking attract it; game fully works without it.
7. **The loop.** Failing the reconstruction or choosing the lie loops the night back to the
   **start of the current act**; puzzles already solved are **auto-completed** on the new loop
   _(decided at M1)_. Each loop: more water, rot, darker drawings, more aggressive entity, fewer
   working lamps.
8. **Environmental "wrongness".** Data-driven changes applied when the target is outside the camera
   frustum: plates vanish, a face is scratched out, a door is open, a chair moved, a drawing changed.

## 6. Puzzles (first draft)

| #   | Act | Puzzle               | Nora (1994)                                                                      | Sam (present)                                                   | Story beat                                     |
| --- | --- | -------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| 1   | 1   | Grandfather Clock    | Running clock; sets hands                                                        | Broken clock frozen at 3:17; describes hands                    | First 3:17; hidden compartment                 |
| 2   | 1   | Floorboards          | Identical boards; pries the right one → little Sam's toy                         | Collapsed floor exposes a carved symbol under one board         | Introduces little Sam                          |
| 3   | 1   | Lullaby              | Music box drum with coloured symbols; describes sequence                         | Piano with Sam's faded colour stickers; plays it                | Nora's lullaby; recurring motif; triggers echo |
| 4   | 2   | Photo Wall           | Rearranges frames                                                                | Sees missing/scratched/faceless photos; describes               | Family erased from its own history             |
| 5   | 2   | VHS Tape             | Retrieves keys in her kitchen                                                    | Watches 2:50 a.m. footage of Walter hiding basement keys        | The parents knew; the key matters              |
| 6   | 2   | Hide-and-Seek (hunt) | Hides                                                                            | Reads drawings / watches mirror; guides                         | The game from that night                       |
| 7   | 2   | Mirrors              | Symbol only visible in the other's reflection, combined with "don't turn around" | ← both ways →                                                   |                                                |
| 8   | 3   | Flood Valves (timed) | Basement flooding in real time; turns valves                                     | Drained basement, full pipe layout with coloured valves; guides | Reaches the bolted door. Climax.               |
| 9   | 3   | The 3:17 Board       | Half the board                                                                   | Other half                                                      | Final reconstruction                           |

## 7. The 3:17 Board (final puzzle)

Obra Dinn / Golden Idol style, fully visual. A board in the basement split between players; each
holds half the pieces/slots. Drag family portraits onto a floor plan (where was each person at
3:17), then pick _what happened_ and _why it was hidden_ via icons (bolt, water, protect-the-child,
she-ran-away…). Both players lock in their halves. Confirmed only **in groups of three correct**;
combinatorics large enough that guessing is impractical.

**Endings**

- **Truth:** correct board and Sam accepts it. Sam pulls back the bolt in the present; in 1994
  Nora's door opens and she walks up into light. Sam's house briefly restored; he walks out the
  front door. Quiet, sad, cathartic. The lullaby plays clean.
- **Lie:** players choose "Nora ran away". The cover-up wins, the entity takes the house, the night
  loops and they are trapped. Deeply unsettling, not a simple game over.
- **Wrong reconstruction:** loop and degrade.

## 8. Player flow and sync

Landing (title, atmosphere, headphone + content warning) → **Create** (room code, pick Nora or
Sam) or **Join** (enter code, auto-assigned the other) → visual instruction screen ("Get on a call.
Never show your screen.") → both connected → play. Partner connection state always visible.
Disconnect/reconnect resumes with the same code. Voice in v1 = players' own call app (built-in
WebRTC voice is a stretch goal).

**Synced (server-authoritative):** puzzle progress / story flags, act transitions and loops, hunt
and scare triggers that depend on the other player, final board state and lock-ins, the ending.
**Not synced:** positions, physics, anything real-time-action.

## 9. Visual direction

- Stylized low-poly in the spirit of _Messenger_: soft shapes, simple materials, limited palettes,
  but degraded and dark.
- **Japanese horror layer** (added at M0): the dread of _Ringu_, _Dark Water_, _Ju-On_ and
  _Fatal Frame_, rendered like a woodblock print left in a damp house.
  - Cel/toon shading in few hard bands; ink contour lines on hard edges.
  - Washi-paper fibre texture and an ink-bleed vignette that slowly creeps in from the edges.
  - Split-tone grade: indigo shadows; one permitted saturated accent (crayon/blood red).
  - The entity as a J-horror silhouette: too tall, neck bent under the ceiling, long wet black hair
    over the face, arms too long, always dripping, unlit black so it reads as a hole in the image.
  - Water as the governing motif: stains, tide lines, puddles, drips.
  - Typography: Mincho serif; vertical Japanese text used only as decoration (title card), never as
    a clue. The setting stays the Hale house in a small town.
- **Palettes.** Nora/1994: warm amber, slightly over-saturated like a memory, growing colder through
  the night. Sam/present: cold teal-green, desaturated, mould, water stains, peeling wallpaper,
  moonlight through boards.
- Atmosphere: heavy fog, flashlight (Sam), flickering lamps (Nora), lightning, rain on windows.
- Post: film grain, vignette, subtle chromatic aberration, VHS effect for tapes/some echoes. Subtle
  and toggleable.
- Camera: **first-person** (mirrors, "don't turn around", hiding).
- Assets: greybox first; later CC0 low-poly (Kenney, Quaternius, Poly Pizza) or Blender → glTF/GLB.

## 10. Audio direction

Sound does most of the work. Spatial 3D audio (footsteps upstairs, dripping, humming, storm).
Voiced dialogue for echoes, tapes and radio, via a swappable placeholder system. **The lullaby** is
the recurring motif: increasingly distorted, clean at the truth ending. Radio static and fake voices
from Act 2. Intentional silence. Optional subtitles (off by default).

## 11. Accessibility and safety

Content warning on landing (implied death of a teenager; psychological horror; flashing lights).
Photosensitivity mode (reduces lightning and flicker). Jump-scare intensity (full / reduced).
Optional subtitles. Mic always opt-in. Clearly shown (ideally rebindable) controls. Mouse
sensitivity.

## 12. Milestones

|     | Milestone      | Scope                                                                                                                       |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| M0  | Setup          | Scaffold, build, lint, folders, basic Three.js scene, deploy instructions                                                   |
| M1  | Greybox house  | Both timelines' layout, first-person controller, collisions, flashlight, interaction system, fog/light per timeline         |
| M2  | Pairing & sync | Landing, create/join, character select, realtime server, shared flags, reconnect. Prove "Nora does X → Sam's world changes" |
| M3  | Act 1 puzzles  | Clock, floorboards, lullaby; memory echoes; cross-time persistence                                                          |
| M4  | Atmosphere     | Spatial audio, post-processing, storm, wrongness system, quality settings                                                   |
| M5  | Act 2          | Photo wall, VHS, mirrors, entity + hunts, radio fake voices                                                                 |
| M6  | Act 3          | Flood valves, bolted door, 3:17 Board, endings, loop/degradation                                                            |
| M7  | Polish         | Real assets, accessibility, settings menu, performance, playtest fixes                                                      |

Stop for review after each milestone.

### Decisions log

| When | Decision                                                                                      |
| ---- | --------------------------------------------------------------------------------------------- |
| M0   | Art direction (stylized low-poly + Japanese horror, two palettes) approved.                   |
| M0   | Plain Three.js (no R3F); custom collision (no physics engine); Node + `ws` server.            |
| M1   | Build **ground floor + basement first**; upstairs comes later (stair door is locked for now). |
| M1   | A loop restarts the **current act**, with solved puzzles auto-completed.                      |
