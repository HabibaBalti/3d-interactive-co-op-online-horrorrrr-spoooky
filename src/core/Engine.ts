import {
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  FogExp2,
  Timer,
  WebGLRenderer,
} from 'three';
import { PostFX } from '../render/PostFX';
import type { TimelinePalette } from '../render/palettes';
import { QUALITY_PRESETS, type Settings } from '../settings/settings';

export type UpdateFn = (dt: number, time: number) => void;

/** Owns the renderer, scene, camera, post chain and the frame loop. */
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(68, 1, 0.05, 60);
  readonly post: PostFX;
  private readonly timer = new Timer();
  private readonly updates = new Set<UpdateFn>();
  /** Lightning flash level, set by the active world each frame. */
  flash = 0;

  constructor(
    private readonly container: HTMLElement,
    settings: Settings,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.add(this.camera);
    this.post = new PostFX(this.renderer, this.scene, this.camera);
    this.applySettings(settings);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  applySettings(settings: Settings): void {
    const q = QUALITY_PRESETS[settings.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatioCap) * q.renderScale);
    this.renderer.shadowMap.enabled = q.shadows;
    this.post.enabled = q.postFx && settings.postFx;
    this.resize();
  }

  applyPalette(p: TimelinePalette): void {
    this.scene.background = p.background;
    this.scene.fog = new FogExp2(p.fog, p.fogDensity);
    this.post.applyPalette(p);
  }

  onUpdate(fn: UpdateFn): () => void {
    this.updates.add(fn);
    return () => this.updates.delete(fn);
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  start(): void {
    this.timer.connect(document);
    this.renderer.setAnimationLoop((timestamp) => {
      this.timer.update(timestamp);
      // Clamp so a backgrounded tab doesn't produce one giant step.
      const dt = Math.min(this.timer.getDelta(), 0.1);
      const time = this.timer.getElapsed();
      for (const fn of this.updates) fn(dt, time);
      this.post.render(time, this.flash, this.scene, this.camera);
    });
  }
}
