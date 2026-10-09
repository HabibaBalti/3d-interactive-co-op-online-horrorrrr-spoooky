import './style.css';
import { AudioEngine } from './audio/AudioEngine';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { Game } from './game/Game';
import { InteractionSystem } from './interaction/InteractionSystem';
import { clearSession, loadSession, saveSession, type Link } from './net/Link';
import { RoomLink, roomApi } from './net/RoomLink';
import { ServerLink } from './net/ServerLink';
import { ServerProbe } from './net/ServerProbe';
import { SoloLink } from './net/SoloLink';
import { loadSettings, saveSettings, type Settings } from './settings/settings';
import { DevHud, Reticle } from './ui/hud';
import { Lobby, type LobbyChoice, type Together } from './ui/lobby';
import { PauseMenu } from './ui/pause';
import { House } from './world/house/House';
import { HOUSE } from './world/house/layout';
import type { GameState } from '../shared/game/types';
import { generateRoomCode } from '../shared/roomCode';
import { otherCharacter, type Character } from '../shared/types';

const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
const DEV = import.meta.env.DEV;

let settings = loadSettings();
const engine = new Engine(app, settings);
const input = new Input(engine.renderer.domElement);
const reticle = new Reticle(app);
const devHud = DEV ? new DevHud(app) : null;

// Sound is optional: if the browser refuses an AudioContext, the game runs silent.
let audio: AudioEngine | null = null;
try {
  audio = new AudioEngine(engine.camera);
  audio.setVolume(settings.volume);
} catch {
  audio = null;
}

let game: Game | null = null;

// --- The title's backdrop: Nora's hallway, slowly breathing ---------------------------------
let preview: House | null = new House('1994', HOUSE, new InteractionSystem(engine.camera), {
  shadows: false,
  photosensitive: () => settings.photosensitive,
});
engine.scene.add(preview.root);
engine.applyPalette(preview.palette);

function dropPreview(): void {
  if (!preview) return;
  engine.scene.remove(preview.root);
  preview.dispose();
  preview = null;
}

// --- Settings and pausing -------------------------------------------------------------------
function updateSettings(next: Partial<Settings>): void {
  const prev = settings;
  settings = { ...settings, ...next };
  saveSettings(settings);
  engine.applySettings(settings);
  audio?.setVolume(settings.volume);
  game?.applySettings(prev, settings);
}

let started = false;
let hasLocked = false;
const paused = () => started && hasLocked && !input.locked && !game?.inspector.hasPanel;

const pause = new PauseMenu(
  app,
  'nora',
  settings,
  updateSettings,
  () => input.requestLock(),
  () => {
    clearSession();
    location.reload();
  },
);
input.onLockChange((locked) => {
  if (locked) hasLocked = true;
  else if (!game?.inspector.hasPanel) game?.closeCloseUp();
  pause.show(paused());
});
window.addEventListener('pointerdown', () => audio?.resume());
window.addEventListener('keydown', () => started && audio?.resume());
document.addEventListener('visibilitychange', () =>
  document.hidden ? audio?.suspend() : started && audio?.resume(),
);
engine.renderer.domElement.addEventListener('click', () => {
  if (started && !input.locked && !game?.inspector.hasPanel) input.requestLock();
});

// --- Actions ----------------------------------------------------------------------------------
const active = () => started && !paused();
const use = () => active() && game?.use();
input.onKey('KeyE', use);
input.onClick(use);
input.onKey('Escape', () => game?.inspector.hasPanel && game.closeCloseUp());
input.onKey('Space', () => game?.inspector.busy && game.closeCloseUp());
input.onKey('KeyF', () => active() && game?.toggleFlashlight());
// Practice alone: Tab becomes the other sibling.
input.onKey('Tab', () => {
  if (!game || game.link.kind !== 'solo' || !active()) return;
  game.setCharacter(otherCharacter(game.character));
  pause.setCharacter(game.character);
});

// --- Frame loop -------------------------------------------------------------------------------
engine.onUpdate((dt, time) => {
  if (!game) {
    // Title: a slow drift down Nora's hallway.
    preview?.update(dt, time, 0);
    engine.flash = preview?.flash ?? 0;
    engine.camera.position.set(
      -0.5 + Math.sin(time * 0.2) * 0.1,
      1.6,
      4.6 - Math.sin(time * 0.05) * 1.5,
    );
    engine.camera.rotation.set(-0.02, Math.sin(time * 0.1) * 0.08, 0, 'YXZ');
    audio?.update(0.1, true);
    return;
  }
  const on = active();
  const prompt = game.update(dt, time, on);
  audio?.update(engine.camera.position.y - 1.5, paused() || !started);
  engine.flash = game.flash;
  reticle.show(on && !game.lookingClosely && !game.frozen);
  reticle.setPrompt(prompt);
  if (devHud) {
    const f = game.player.feet;
    devHud.update(dt, [
      `${game.character} · ${game.timeline} · act ${game.state.act} · loop ${game.state.loop}`,
      `${game.room ?? '—'} · ${f.x.toFixed(1)}, ${f.y.toFixed(1)}, ${f.z.toFixed(1)}`,
    ]);
  }
});
engine.start();

// --- Getting into a game ---------------------------------------------------------------------
async function together(): Promise<{ kind: Together; room: Awaited<ReturnType<typeof roomApi>> }> {
  const room = await roomApi();
  if (room) return { kind: 'room', room };
  // Self-hosted or `npm run dev`: is there a game server on this origin?
  try {
    const ctl = new AbortController();
    const t = window.setTimeout(() => ctl.abort(), 2500);
    const res = await fetch('./health', { signal: ctl.signal });
    window.clearTimeout(t);
    if (res.ok) return { kind: 'server', room: null };
  } catch {
    // no server
  }
  return { kind: null, room: null };
}

function linkFor(choice: LobbyChoice, net: Awaited<ReturnType<typeof together>>): Link {
  if (choice.mode === 'solo') {
    saveSession({
      kind: 'solo',
      code: 'SOLO',
      character: choice.character,
      token: '',
      savedAt: Date.now(),
    });
    return new SoloLink(choice.character, true);
  }
  if (choice.mode === 'continue') {
    const s = choice.session;
    if (s.kind === 'solo') return new SoloLink(s.character);
    if (s.kind === 'room' && net.room) {
      return new RoomLink(net.room, s.code, s.token === 'host' ? 'host' : 'guest', s.character);
    }
    return new ServerLink({ rejoin: { code: s.code, token: s.token } });
  }
  if (net.kind === 'room' && net.room) {
    return choice.mode === 'create'
      ? new RoomLink(net.room, generateRoomCode(), 'host', choice.character)
      : new RoomLink(net.room, choice.code, 'guest', 'nora');
  }
  return new ServerLink(
    choice.mode === 'create' ? { create: choice.character } : { join: choice.code },
  );
}

function firstState(link: Link): Promise<GameState> {
  return new Promise((resolve) => link.onState((s) => resolve(s)));
}

function enter(): void {
  started = true;
  audio?.resume();
  input.requestLock();
}

function begin(link: Link, state: GameState): void {
  dropPreview();
  game = new Game(app, engine, input, audio, () => settings, link);
  game.start(state);
  pause.solo = link.kind === 'solo';
  pause.setCharacter(link.character);
  if (DEV) {
    Object.assign(window, {
      __still: {
        engine,
        game,
        /** Automated tests: forget pointer-lock history so the game isn't "paused". */
        unpause: () => {
          hasLocked = false;
          pause.show(false);
        },
        /** Act as either character (solo practice): __still.as('sam', {type: ...}) */
        as: (c: Character, a: Parameters<Link['act']>[0]) => {
          const prev = link.character;
          link.character = c;
          link.act(a);
          link.character = prev;
        },
      },
    });
  }
}

async function boot(): Promise<void> {
  if (params.has('notitle')) {
    // Dev shortcut: straight into solo practice.
    const link = new SoloLink(params.get('as') === 'sam' ? 'sam' : 'nora', !params.has('keep'));
    begin(link, await firstState(link));
    if (params.has('pos')) {
      const [x = 0, y = 0, z = 0] = params.get('pos')!.split(',').map(Number);
      game!.player.spawn([x, y, z], Number(params.get('yaw') ?? 0));
      game!.player.pitch = (Number(params.get('pitch') ?? 0) * Math.PI) / 180;
    }
    started = true;
    return;
  }

  const net = await together();
  const lobby = new Lobby(app, net.kind, loadSession());
  let message = '';
  for (;;) {
    const choice = await lobby.choose(message);
    const link = linkFor(choice, net);
    const failure = await new Promise<string | null>((resolve) => {
      if (link.kind === 'solo') {
        void firstState(link).then((s) => {
          begin(link, s);
          lobby.close();
          enter();
          resolve(null);
        });
        return;
      }
      let built = false;
      lobby.waiting(
        link,
        () => {
          if (!game) return;
          lobby.close();
          enter();
          resolve(null);
        },
        (msg) => {
          link.close();
          if (!built) clearSession();
          resolve(msg);
        },
      );
      void firstState(link).then((s) => {
        built = true;
        if (!game) begin(link, s);
      });
    });
    if (!failure) return;
    message = failure;
  }
}

void boot();

if (devHud) new ServerProbe((s) => devHud.setServer(s)).connect();
