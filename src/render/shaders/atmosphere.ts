import { Color, Vector2 } from 'three';

/**
 * Final full-screen pass. Runs after OutputPass, so it works on display-ready (sRGB) colour.
 * Combines: chromatic aberration, J-horror split-tone grade, washi-paper fibre texture,
 * an irregular "ink seeping in" vignette, film grain and the lightning flash.
 */
export const AtmosphereShader = {
  name: 'AtmosphereShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uGrain: { value: 0.07 },
    uVignette: { value: 1.0 },
    uAberration: { value: 0.005 },
    uPaper: { value: 0.18 },
    uFlash: { value: 0 },
    uSaturation: { value: 1 },
    uShadowTint: { value: new Color(1, 1, 1) },
    uHighlightTint: { value: new Color(1, 1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uAberration;
    uniform float uPaper;
    uniform float uFlash;
    uniform float uSaturation;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      c.x *= uResolution.x / uResolution.y;
      float r2 = dot(c, c);

      // Chromatic aberration, stronger toward the edges.
      vec2 off = (uv - 0.5) * r2 * uAberration * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // Split-tone grade: shadows and highlights pushed toward each timeline's tints.
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col *= mix(uShadowTint, uHighlightTint, smoothstep(0.05, 0.6, l));

      // Washi paper: long horizontal fibres plus soft blotches, multiplied in like ink on paper.
      vec2 px = uv * uResolution;
      float fibres = noise(px * vec2(0.9, 0.06)) * noise(px * vec2(0.05, 0.7));
      float blotch = fbm(uv * 3.0 + 7.0);
      col *= 1.0 - uPaper * (fibres * 0.6 + (blotch - 0.5) * 0.5);

      // Lightning flash, cold white, brightest at the centre.
      col += uFlash * vec3(0.75, 0.82, 0.95) * (1.0 - r2 * 0.8);

      // Vignette with a ragged edge that slowly creeps, like ink soaking into paper.
      float edge = fbm(uv * 4.0 + vec2(uTime * 0.015, -uTime * 0.01));
      float vig = smoothstep(1.05, 0.12, r2 + (edge - 0.5) * 0.3);
      col *= mix(1.0, vig, uVignette * 0.9);

      // Film grain.
      float g = hash(px + fract(uTime * 37.0) * 311.0) - 0.5;
      col += g * uGrain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
