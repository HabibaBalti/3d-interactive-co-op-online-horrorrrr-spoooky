import type { Camera, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { AtmosphereShader } from './shaders/atmosphere';
import type { TimelinePalette } from './palettes';

export class PostFX {
  readonly composer: EffectComposer;
  readonly atmosphere: ShaderPass;
  enabled = true;

  constructor(
    private readonly renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(new OutputPass());
    this.atmosphere = new ShaderPass(AtmosphereShader);
    this.composer.addPass(this.atmosphere);
  }

  applyPalette(p: TimelinePalette): void {
    const u = this.atmosphere.uniforms;
    u.uSaturation!.value = p.saturation;
    u.uShadowTint!.value.copy(p.shadowTint);
    u.uHighlightTint!.value.copy(p.highlightTint);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    const pr = this.renderer.getPixelRatio();
    this.atmosphere.uniforms.uResolution!.value.set(width * pr, height * pr);
  }

  render(time: number, flash: number, scene: Scene, camera: Camera): void {
    if (!this.enabled) {
      this.renderer.render(scene, camera);
      return;
    }
    this.atmosphere.uniforms.uTime!.value = time;
    this.atmosphere.uniforms.uFlash!.value = flash;
    this.composer.render();
  }
}
