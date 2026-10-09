import './style.css';
import { AudioEngine } from './audio/AudioEngine';
import { Soundscape } from './audio/Soundscape';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { InteractionSystem } from './interaction/InteractionSystem';
import { Inspector } from './interaction/Inspector';
import { ServerProbe } from './net/ServerProbe';
import { Flashlight } from './player/Flashlight';
import { PlayerController } from './player/PlayerController';
import { loadSettings, QUALITY_PRESETS, saveSettings, type Settings } from './settings/settings';
import { DevHud, Reticle, showTitle } from './ui/hud';
import { InspectCard } from './ui/inspect';
import { PauseMenu } from './ui/pause';
import { House } from './world/house/House';
import { HOUSE } from './world/house/layout';
import { TIMELINE_OF, type Character, type Timeline } from '../shared/types';

const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
const DEV = import.meta.env.DEV;

// Until pairing exists (M2), the player picks a character on the title card. `?as=sam` (dev) or
// `#sam` (hosted page) preselects one.
let character: Character = params.get('as') === 'sam' || location.hash === '#sam' ? 'sam' : 'nora';
let timeline: Timeline = TIMELINE_OF[character];

let settings = loadSettings();
const engine = new Engine(app, settings);
const input = new Input(engine.renderer.domElement);
const interaction = new InteractionSystem(engine.camera);
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
let soundscape: Soundscape | null = null;

let house!: House;
let flashlight: Flashlight | null = null;
const player = new PlayerController(engine.camera, input, null!, () => settings);
const inspector = new Inspector(engine.camera, input, new InspectCard(app, () => settings.lore));

function buildHouse(): void {
  if (house) {
    engine.scene.remove(house.root);
    house.dispose();
  }
  interaction.clear();
  house = new House(timeline, HOUSE, interaction, {
    shadows: QUALITY_PRESETS[settings.quality].shadows,
    photosensitive: () => settings.photosensitive,
    onInspect: (target) => inspector.show(target),
  });
  engine.scene.add(house.root);
  engine.applyPalette(house.palette);
  interaction.setOccluders(house.occluders);
  player.setCollision(house.collision);

  soundscape?.dispose();
  if (audio) {
    audio.setTimeline(timeline);
    soundscape = new Soundscape(audio, timeline, HOUSE);
  }

  // Only Sam, in the dark present, carries a flashlight.
  flashlight?.dispose();
  flashlight = timeline === 'present' ? new Flashlight(engine.camera) : null;
  flashlight?.setShadows(QUALITY_PRESETS[settings.quality].shadows);
}

buildHouse();
const spawn = HOUSE.spawns[character];
player.spawn(spawn.pos, spawn.yaw);
if (params.has('pos')) {
  const [x = 0, y = 0, z = 0] = params.get('pos')!.split(',').map(Number);
  player.spawn([x, y, z], Number(params.get('yaw') ?? 0));
  player.pitch = (Number(params.get('pitch') ?? 0) * Math.PI) / 180;
}

function updateSettings(next: Partial<Settings>): void {
  const shadowsBefore = QUALITY_PRESETS[settings.quality].shadows;
  settings = { ...settings, ...next };
  saveSettings(settings);
  engine.applySettings(settings);
  audio?.setVolume(settings.volume);
  const shadows = QUALITY_PRESETS[settings.quality].shadows;
  if (shadows !== shadowsBefore) {
    house.setShadows(shadows);
    flashlight?.setShadows(shadows);
  }
}

// --- Flow: title → pointer lock → play; releasing the pointer pauses -----------------------
let started = params.has('notitle');
let hasLocked = false;
const paused = () => started && hasLocked && !input.locked;

const pause = new PauseMenu(app, character, settings, updateSettings, () => input.requestLock());

function chooseCharacter(next: Character): void {
  if (next !== character) {
    character = next;
    timeline = TIMELINE_OF[character];
    buildHouse();
    const s = HOUSE.spawns[character];
    player.spawn(s.pos, s.yaw);
  }
  pause.setCharacter(character);
}
input.onLockChange((locked) => {
  if (locked) hasLocked = true;
  else inspector.close();
  pause.show(paused());
});
// Browsers only allow sound after the player interacts with the page.
window.addEventListener('pointerdown', () => audio?.resume());
window.addEventListener('keydown', () => started && audio?.resume());
document.addEventListener('visibilitychange', () =>
  document.hidden ? audio?.suspend() : started && audio?.resume(),
);
engine.renderer.domElement.addEventListener('click', () => {
  if (started && !input.locked) input.requestLock();
});
if (!started) {
  showTitle(app, (choice) => {
    chooseCharacter(choice);
    audio?.resume();
    started = true;
    input.requestLock();
  });
}

// --- Actions ----------------------------------------------------------------------------------
const active = () => started && !paused();
// E or click uses what you're looking at, or steps back out of a close-up.
const use = () => {
  if (!active()) return;
  if (inspector.busy) inspector.close();
  else interaction.use();
};
input.onKey('KeyE', use);
input.onKey('Space', () => inspector.busy && inspector.close());
input.onClick(use);
input.onKey('KeyF', () => active() && flashlight?.toggle());
if (DEV) {
  // Dev only: look at the other timeline from the same spot.
  input.onKey('KeyT', () => {
    timeline = timeline === '1994' ? 'present' : '1994';
    buildHouse();
  });
}

// --- Frame loop -------------------------------------------------------------------------------
engine.onUpdate((dt, time) => {
  const on = active();
  const looking = inspector.busy;
  player.update(dt, on && !looking);
  inspector.update(dt);
  engine.post.atmosphere.uniforms.uVignette!.value = 1 + inspector.amount * 0.12;
  house.update(dt, time, player.feet.y);
  audio?.update(engine.camera.position.y - 1.5, paused() || !started);
  soundscape?.update();
  flashlight?.update(dt, player.yaw, player.pitch, inspector.amount);
  engine.flash = house.flash;
  reticle.show(on && !looking);
  if (looking) interaction.release();
  reticle.setPrompt(on && !looking ? interaction.update() : null);
  const f = player.feet;
  devHud?.update(dt, [
    `${character} · ${timeline}${DEV ? ' · <kbd>T</kbd> swap' : ''}`,
    `${player.room ?? '—'} · ${f.x.toFixed(1)}, ${f.y.toFixed(1)}, ${f.z.toFixed(1)}`,
  ]);
});
engine.start();

if (devHud) {
  new ServerProbe((s) => devHud.setServer(s)).connect();
  // Console/automation handle for debugging (dev builds only).
  Object.assign(window, {
    __still: { engine, player, interaction, inspector, house: () => house },
  });
}
