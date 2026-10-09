import {
  AdditiveBlending,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from 'three';

/**
 * A memory echo's figure: a semi-transparent, desaturated silhouette that shimmers with
 * horizontal tears, like a bad tape. Child or adult proportions.
 */
export class Ghost {
  readonly root = new Group();
  private readonly mat: ShaderMaterial;
  opacity = 0;

  constructor(kind: 'adult' | 'child' | 'tall', tint: string) {
    this.mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uTint: { value: new Color(tint) } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vNormal;
        varying float vY;
        void main() {
          vec3 p = position;
          // Tape tearing: rows of the figure slip sideways now and then.
          float row = floor((modelMatrix * vec4(p, 1.0)).y * 14.0);
          float tear = step(0.93, fract(sin(row * 12.9898 + floor(uTime * 9.0)) * 43758.5453));
          p.x += tear * 0.05 * sin(uTime * 40.0 + row);
          vNormal = normalize(normalMatrix * normal);
          vY = (modelMatrix * vec4(p, 1.0)).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uTint;
        varying vec3 vNormal;
        varying float vY;
        void main() {
          float rim = 1.0 - abs(vNormal.z);
          float scan = 0.75 + 0.25 * sin(vY * 120.0 + uTime * 6.0);
          float flicker = 0.85 + 0.15 * sin(uTime * 23.0) * sin(uTime * 7.0);
          float a = (0.12 + rim * 0.55) * scan * flicker * uOpacity;
          gl_FragColor = vec4(uTint * a, a);
        }
      `,
    });
    const s = kind === 'child' ? 0.62 : kind === 'tall' ? 1.08 : 1;
    const body = new Mesh(new CapsuleGeometry(0.2 * s, 0.9 * s, 4, 10), this.mat);
    body.position.y = 0.75 * s;
    const head = new Mesh(new SphereGeometry(0.13 * s, 12, 10), this.mat);
    head.position.y = 1.5 * s;
    const arms = new Mesh(new CapsuleGeometry(0.06 * s, 0.7 * s, 3, 6), this.mat);
    arms.position.set(0.24 * s, 0.85 * s, 0);
    const arm2 = arms.clone();
    arm2.position.x = -0.24 * s;
    this.root.add(body, head, arms, arm2);
    this.root.renderOrder = 10;
  }

  update(time: number): void {
    this.mat.uniforms.uTime!.value = time;
    this.mat.uniforms.uOpacity!.value = this.opacity;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mat.dispose();
  }
}
