import { type Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';

/**
 * Night window glass: a flat sky colour, rain streaks running down (in world space, so every
 * window agrees), brightening with lightning. Fogged like everything else.
 */
export function createGlassMaterial(sky: Color, rain: number): ShaderMaterial {
  return new ShaderMaterial({
    fog: true,
    side: DoubleSide,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      { uSky: { value: sky }, uRain: { value: rain }, uFlash: { value: 0 }, uTime: { value: 0 } },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSky;
      uniform float uRain;
      uniform float uFlash;
      uniform float uTime;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        vec2 p = vec2(vWorld.x + vWorld.z, vWorld.y);
        float column = floor(p.x * 45.0);
        float speed = 0.5 + hash(column) * 0.9;
        float t = fract(p.y * 0.8 + uTime * speed + hash(column + 7.0) * 10.0);
        float streak = smoothstep(0.0, 0.03, t) * smoothstep(0.25, 0.0, t) * step(0.55, hash(column + 3.0));
        vec3 col = uSky * (0.8 + 0.2 * p.y / 3.0);
        col += streak * uRain * 0.18;
        col += uFlash * vec3(0.8, 0.85, 1.0) * 1.6;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}
