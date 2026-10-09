import {
  HalfFloatType,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  type Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
  type Camera,
} from 'three';

/**
 * A mirror that reflects a different scene: the same room in the other timeline. Based on
 * three.js's Reflector (mirrored virtual camera, oblique near plane, projective texturing),
 * but rendering whatever scene it is given.
 */
export class Mirror {
  readonly mesh: Mesh;
  private readonly target: WebGLRenderTarget;
  private readonly virtual = new PerspectiveCamera();
  private readonly material: ShaderMaterial;
  private readonly textureMatrix = new Matrix4();
  private readonly n = new Vector3();
  private readonly mirrorPos = new Vector3();
  private readonly camPos = new Vector3();
  private readonly rot = new Matrix4();
  private readonly lookAt = new Vector3();
  private readonly view = new Vector3();
  private readonly tgt = new Vector3();
  private readonly plane = new Plane();
  private readonly clip = new Vector4();
  private readonly q = new Vector4();

  constructor(width: number, height: number, aged: boolean) {
    this.target = new WebGLRenderTarget(512, 768, { type: HalfFloatType });
    this.material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        textureMatrix: { value: this.textureMatrix },
        uAged: { value: aged ? 1 : 0 },
        uCrack: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vProj;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vProj = textureMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uAged;
        uniform float uCrack;
        uniform float uTime;
        varying vec4 vProj;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vProj.xy / vProj.w;
          // A slow ripple, like breath on old glass.
          uv.x += sin(vUv.y * 30.0 + uTime * 0.7) * 0.0015;
          vec3 c = texture2D(tDiffuse, uv).rgb;
          // Silvering darkens toward the edges; the old one is spotted with black.
          float edge = smoothstep(0.0, 0.15, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
          c *= mix(0.55, 0.9, edge);
          float spots = step(0.82, hash(floor(vUv * vec2(40.0, 60.0))));
          c *= 1.0 - uAged * spots * 0.6;
          c = mix(c, c * vec3(0.8, 0.95, 0.9), uAged * 0.5);
          // Cracks radiating from a point.
          vec2 d = vUv - vec2(0.42, 0.58);
          float ang = atan(d.y, d.x);
          float ray = step(0.985, abs(sin(ang * 7.0 + 1.3))) * step(length(d), 0.6);
          c = mix(c, vec3(0.9), uCrack * ray * 0.8);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });
    this.mesh = new Mesh(new PlaneGeometry(width, height), this.material);
  }

  set crack(v: number) {
    this.material.uniforms.uCrack!.value = v;
  }

  /** Renders the other scene as seen in this mirror from `camera`. */
  render(renderer: WebGLRenderer, camera: Camera, scene: Scene, time: number): void {
    const mesh = this.mesh;
    this.material.uniforms.uTime!.value = time;
    mesh.updateMatrixWorld();
    this.mirrorPos.setFromMatrixPosition(mesh.matrixWorld);
    this.camPos.setFromMatrixPosition(camera.matrixWorld);
    this.rot.extractRotation(mesh.matrixWorld);
    this.n.set(0, 0, 1).applyMatrix4(this.rot);
    this.view.subVectors(this.mirrorPos, this.camPos);
    if (this.view.dot(this.n) > 0) return; // looking at its back

    this.view.reflect(this.n).negate().add(this.mirrorPos);
    this.rot.extractRotation(camera.matrixWorld);
    this.lookAt.set(0, 0, -1).applyMatrix4(this.rot).add(this.camPos);
    this.tgt.subVectors(this.mirrorPos, this.lookAt).reflect(this.n).negate().add(this.mirrorPos);

    const v = this.virtual;
    v.position.copy(this.view);
    v.up.set(0, 1, 0).applyMatrix4(this.rot).reflect(this.n);
    v.lookAt(this.tgt);
    v.far = (camera as PerspectiveCamera).far;
    v.updateMatrixWorld();
    v.projectionMatrix.copy((camera as PerspectiveCamera).projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix
      .multiply(v.projectionMatrix)
      .multiply(v.matrixWorldInverse)
      .multiply(mesh.matrixWorld);

    // Oblique near plane: nothing behind the glass gets drawn.
    this.plane
      .setFromNormalAndCoplanarPoint(this.n, this.mirrorPos)
      .applyMatrix4(v.matrixWorldInverse);
    this.clip.set(
      this.plane.normal.x,
      this.plane.normal.y,
      this.plane.normal.z,
      this.plane.constant,
    );
    const p = v.projectionMatrix.elements;
    this.q.set(
      (Math.sign(this.clip.x) + p[8]!) / p[0]!,
      (Math.sign(this.clip.y) + p[9]!) / p[5]!,
      -1,
      (1 + p[10]!) / p[14]!,
    );
    this.clip.multiplyScalar(2 / this.clip.dot(this.q));
    p[2] = this.clip.x;
    p[6] = this.clip.y;
    p[10] = this.clip.z + 1 - 0.003;
    p[14] = this.clip.w;

    this.renderTo(renderer, scene);
  }

  private renderTo(renderer: WebGLRenderer, scene: Scene): void {
    const v = this.virtual;
    const prev = renderer.getRenderTarget();
    const shadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, v);
    renderer.setRenderTarget(prev);
    renderer.shadowMap.autoUpdate = shadow;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.target.dispose();
    this.material.dispose();
  }
}
