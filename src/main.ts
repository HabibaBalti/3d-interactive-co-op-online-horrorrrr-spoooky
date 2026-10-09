import './style.css';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { ServerProbe } from './net/ServerProbe';
import { loadSettings, saveSettings, type Quality } from './settings/settings';
import { Hud, showTitle } from './ui/hud';
import { TestHallway } from './world/TestHallway';
import type { Timeline } from '../shared/types';

const app = document.getElementById('app')!;
let settings = loadSettings();
const engine = new Engine(app, settings);
const input = new Input();
const hud = new Hud(app);

const params = new URLSearchParams(location.search);
let timeline: Timeline = params.get('timeline') === 'present' ? 'present' : '1994';
let world: TestHallway;

function loadWorld(): void {
  if (world) {
    engine.scene.remove(world.root);
    world.dispose(engine.camera);
  }
  world = new TestHallway(timeline, engine.camera, {
    photosensitive: settings.photosensitive,
    shadows: engine.renderer.shadowMap.enabled,
  });
  engine.scene.add(world.root);
  engine.applyPalette(world.palette);
  hud.render(settings, timeline);
}

function updateSettings(next: Partial<typeof settings>, rebuild = false): void {
  settings = { ...settings, ...next };
  saveSettings(settings);
  engine.applySettings(settings);
  if (rebuild) loadWorld();
  hud.render(settings, timeline);
}

const QUALITIES: Quality[] = ['low', 'medium', 'high'];
input.onKey('KeyT', () => {
  timeline = timeline === '1994' ? 'present' : '1994';
  loadWorld();
});
input.onKey('KeyQ', () => {
  const next = QUALITIES[(QUALITIES.indexOf(settings.quality) + 1) % QUALITIES.length]!;
  updateSettings({ quality: next }, true);
});
input.onKey('KeyP', () => updateSettings({ postFx: !settings.postFx }));
input.onKey('KeyF', () => updateSettings({ photosensitive: !settings.photosensitive }, true));

loadWorld();

// M0 camera: a slow, breathing drift down the hall with a little mouse look.
// The real first-person controller arrives in M1.
// `?camz=<z>` pins the dolly for screenshots and look-dev.
const look = { yaw: 0, pitch: 0 };
const pinnedZ = params.has('camz') ? Number(params.get('camz')) : null;
engine.onUpdate((dt, time) => {
  world.update(dt, time);
  engine.flash = world.flash;
  const k = 1 - Math.exp(-dt * 3);
  look.yaw += (-input.pointer.x * 0.45 - look.yaw) * k;
  look.pitch += (-input.pointer.y * 0.22 - look.pitch) * k;
  const cam = engine.camera;
  cam.position.set(
    Math.sin(time * 0.21) * 0.15,
    1.62 + Math.sin(time * 1.1) * 0.012,
    pinnedZ ?? 4.2 + Math.sin(time * 0.05) * 2.2,
  );
  cam.rotation.set(look.pitch, look.yaw, Math.sin(time * 0.3) * 0.006, 'YXZ');
});
engine.start();

const probe = new ServerProbe((s) => {
  hud.setServer(s);
  hud.render(settings, timeline);
});
probe.connect();

if (!params.has('notitle')) void showTitle(app);
