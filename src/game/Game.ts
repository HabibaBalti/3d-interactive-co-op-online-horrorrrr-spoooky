import type { AudioEngine } from '../audio/AudioEngine';
import { Sfx } from '../audio/Sfx';
import { Soundscape } from '../audio/Soundscape';
import type { Engine } from '../core/Engine';
import type { Input } from '../core/Input';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { Inspector } from '../interaction/Inspector';
import type { Link } from '../net/Link';
import { Flashlight } from '../player/Flashlight';
import { PlayerController } from '../player/PlayerController';
import { QUALITY_PRESETS, type Settings } from '../settings/settings';
import { InspectCard } from '../ui/inspect';
import { House } from '../world/house/House';
import { HOUSE } from '../world/house/layout';
import type { Fx, GameState } from '../../shared/game/types';
import type { Presence } from '../../shared/protocol';
import { TIMELINE_OF, type Character, type Timeline } from '../../shared/types';
import type { GameContext, Module } from './context';
import { Hud } from './Hud';
import { createModules } from './modules';
import { Voice } from './Voice';

const ACT_TITLES: Record<number, [string, string]> = {
  1: ['I', 'The House'],
  2: ['II', 'Something Else Is Listening'],
  3: ['III', 'The Basement'],
};

/**
 * One player's night: their timeline's house, their body, the close-ups, the sound, and the
 * modules that turn the shared state into things happening. Everything shared goes through
 * the link; nothing here decides whether a puzzle is solved.
 */
export class Game {
  character: Character;
  timeline: Timeline;
  state: GameState;
  partner: Presence | null = null;
  readonly player: PlayerController;
  readonly interaction: InteractionSystem;
  readonly inspector: Inspector;
  readonly voice: Voice;
  readonly hud: Hud;
  readonly sfx: Sfx;
  private readonly card: InspectCard;
  private house!: House;
  private soundscape: Soundscape | null = null;
  private flashlight: Flashlight | null = null;
  private modules: Module[] = [];
  private ctx!: GameContext;
  /** Where each character was standing (solo practice swaps between them). */
  private readonly positions = new Map<Character, { pos: [number, number, number]; yaw: number }>();

  constructor(
    app: HTMLElement,
    private readonly engine: Engine,
    private readonly input: Input,
    private readonly audio: AudioEngine | null,
    private readonly settings: () => Settings,
    readonly link: Link,
  ) {
    this.character = link.character;
    this.timeline = TIMELINE_OF[this.character];
    this.state = (link as { latest?: GameState }).latest ?? (null as unknown as GameState);
    this.interaction = new InteractionSystem(engine.camera);
    this.card = new InspectCard(app, () => settings().lore);
    this.inspector = new Inspector(engine.camera, input, this.card);
    this.card.onBack = () => this.closeCloseUp();
    this.inspector.onPanelClosed = () => input.requestLock();
    this.player = new PlayerController(engine.camera, input, null!, settings);
    this.voice = new Voice(app, settings);
    this.hud = new Hud(app);
    this.sfx = new Sfx(audio);

    link.onPartner((p) => (this.partner = p));
    link.onFx((fx) => fx.forEach((f) => this.fx(f)));
  }

  /** Builds the world once the first state has arrived. */
  start(state: GameState): void {
    this.state = state;
    this.buildWorld();
    this.link.onState((s) => this.setState(s));
  }

  private setState(s: GameState): void {
    const prev = this.state;
    if (prev && s.v <= prev.v && s.seed === prev.seed) return;
    this.state = s;
    // A loop or a restart changes the whole house: rebuild it.
    if (prev && (s.loop !== prev.loop || s.seed !== prev.seed)) {
      this.buildWorld();
      return;
    }
    for (const m of this.modules) m.onState?.(s, prev);
    this.hud.setItems(s.inv[this.character]);
    this.hud.setPartner(
      s.online[this.character === 'nora' ? 'sam' : 'nora'],
      this.link.kind === 'solo',
    );
  }

  private fx(f: Fx): void {
    if (f.type === 'act' && ACT_TITLES[f.act]) {
      const [n, t] = ACT_TITLES[f.act]!;
      this.hud.showAct(`ACT ${n}`, t);
    }
    for (const m of this.modules) m.onFx?.(f);
  }

  /** Solo practice: become the other sibling, where you left them. */
  setCharacter(c: Character): void {
    if (c === this.character) return;
    const f = this.player.feet;
    this.positions.set(this.character, {
      pos: [f.x, f.y, f.z],
      yaw: (this.player.yaw * 180) / Math.PI,
    });
    this.character = c;
    this.link.character = c;
    this.timeline = TIMELINE_OF[c];
    this.buildWorld();
  }

  closeCloseUp(): void {
    this.inspector.close();
  }

  private buildWorld(): void {
    this.inspector.close();
    this.voice.stop();
    for (const m of this.modules) m.dispose?.();
    this.modules = [];
    if (this.house) {
      this.engine.scene.remove(this.house.root);
      this.house.dispose();
    }
    this.interaction.clear();
    const shadows = QUALITY_PRESETS[this.settings().quality].shadows;
    this.house = new House(this.timeline, HOUSE, this.interaction, {
      shadows,
      photosensitive: () => this.settings().photosensitive,
      onInspect: (target) => this.inspector.show(target),
      loop: this.state.loop,
    });
    this.engine.scene.add(this.house.root);
    this.engine.applyPalette(this.house.palette, this.state.loop);
    this.interaction.setOccluders(this.house.occluders);
    this.player.setCollision(this.house.collision);

    this.soundscape?.dispose();
    this.soundscape = null;
    if (this.audio) {
      this.audio.setTimeline(this.timeline);
      this.soundscape = new Soundscape(this.audio, this.timeline, HOUSE);
    }
    this.flashlight?.dispose();
    this.flashlight = this.timeline === 'present' ? new Flashlight(this.engine.camera) : null;
    this.flashlight?.setShadows(shadows);

    const here = this.positions.get(this.character);
    const spawn = HOUSE.spawns[this.character];
    this.player.spawn(here?.pos ?? spawn.pos, here?.yaw ?? spawn.yaw);

    this.ctx = {
      character: this.character,
      timeline: this.timeline,
      link: this.link,
      state: () => this.state,
      act: (a) => this.link.act(a),
      partner: () => this.partner,
      house: this.house,
      scene: this.engine.scene,
      camera: this.engine.camera,
      engine: this.engine,
      player: this.player,
      interaction: this.interaction,
      inspector: this.inspector,
      input: this.input,
      audio: this.audio,
      voice: this.voice,
      sfx: this.sfx,
      hud: this.hud,
      settings: this.settings,
      freeze: (on) => (this.frozen = on),
      setEntity: (e) => (this.entityPresence = e),
    };
    this.modules = createModules(this.ctx);
    for (const m of this.modules) m.onState?.(this.state, null);
    this.hud.setItems(this.state.inv[this.character]);
    this.hud.setPartner(
      this.state.online[this.character === 'nora' ? 'sam' : 'nora'],
      this.link.kind === 'solo',
    );
  }

  applySettings(prev: Settings, next: Settings): void {
    const shadows = QUALITY_PRESETS[next.quality].shadows;
    if (shadows !== QUALITY_PRESETS[prev.quality].shadows) {
      this.house.setShadows(shadows);
      this.flashlight?.setShadows(shadows);
    }
  }

  toggleFlashlight(): void {
    this.flashlight?.toggle();
  }

  /** E / click: use what you look at, or step back out of a close-up. */
  use(): void {
    if (this.inspector.busy) this.inspector.close();
    else this.interaction.use();
  }

  get flash(): number {
    return this.house.flash;
  }

  get room(): string | null {
    return this.player.room;
  }

  /** `active` is false while paused or in menus. Returns the prompt under the reticle. */
  update(dt: number, time: number, active: boolean): string | null {
    const looking = this.inspector.busy;
    this.player.update(dt, active && !looking && !this.frozen);
    this.inspector.update(dt);
    this.engine.post.atmosphere.uniforms.uVignette!.value = 1 + this.inspector.amount * 0.12;
    this.house.update(dt, time, this.player.feet.y);
    this.soundscape?.update();
    this.flashlight?.update(dt, this.player.yaw, this.player.pitch, this.inspector.amount);
    for (const m of this.modules) m.update?.(dt, time);

    const f = this.player.feet;
    this.link.setPresence({ p: [f.x, f.y, f.z, this.player.yaw], e: this.entityPresence });

    if (looking || !active || this.frozen) {
      this.interaction.release();
      return null;
    }
    return this.interaction.update();
  }

  /** Modules can hold the player still (hiding, cutscenes). */
  frozen = false;
  /** Where the entity is in this player's world, shared so the other player's mirror shows it. */
  entityPresence: Presence['e'] = null;

  get lookingClosely(): boolean {
    return this.inspector.busy;
  }

  dispose(): void {
    for (const m of this.modules) m.dispose?.();
    this.soundscape?.dispose();
    this.flashlight?.dispose();
    this.voice.stop();
    this.engine.scene.remove(this.house.root);
    this.house.dispose();
    this.link.close();
  }

  /** For tests and the dev console. */
  get debug() {
    return { house: this.house, ctx: this.ctx, modules: this.modules };
  }
}

export { HOUSE };
