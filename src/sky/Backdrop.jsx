import { useMemo } from 'react';
import * as THREE from 'three';
import { OUTPUT, PALETTE } from './glsl.js';

/* Задний план одной плоскостью: цвет космоса, свечение за заголовком и ореол атмосферы над кромкой.
   Плоскость непрозрачная — так она попадает в буфер преломления three.js, и стёкла карточек
   у кромки преломляют в том числе ореол. */

const vertexShader = /* glsl */ `
varying vec2 vPage;   // координаты страницы: X вправо, Y вниз, в CSS-пикселях
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPage = vec2(world.x, -world.y);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform vec2  uCenter;
uniform float uRadius;
uniform vec2  uGlow;
uniform vec2  uGlowSize;
uniform vec2  uFade;
varying vec2 vPage;
${PALETTE}

void main() {
  float t = length((vPage - uGlow) / uGlowSize);
  float a = 0.40 * pow(max(1.0 - t, 0.0), 1.6);
  vec3 col = mix(SPACE, mix(VIOLET, ORCHID, clamp(t / 0.55, 0.0, 1.0)), a);

  /* Атмосфера над кромкой: тонкая светлая линия и два фиолетовых ореола, ярче над центром диска */
  vec2 d = vPage - uCenter;
  float dist = length(d);
  float h = max(dist - uRadius, 0.0);
  float sunSide = pow(max(-d.y / dist, 0.0), 1.5);
  col += (vec3(0.92, 0.86, 1.0) * 0.85 * exp(-h / 9.0)
        + VIOLET * (0.55 * exp(-h / 34.0) + 0.22 * exp(-h / 110.0))) * sunSide;

  col = mix(col, SPACE, smoothstep(uFade.x, uFade.y, vPage.y));
  float alpha = 1.0;
  ${OUTPUT}
}`;

export default function Backdrop({ width, height, planet, glow, fade }) {
  const uniforms = useMemo(() => ({
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 0 },
    uGlow: { value: new THREE.Vector2() },
    uGlowSize: { value: new THREE.Vector2() },
    uFade: { value: new THREE.Vector2() },
  }), []);
  uniforms.uCenter.value.set(planet.cx, planet.cy);
  uniforms.uRadius.value = planet.R;
  uniforms.uGlow.value.set(glow.x, glow.y);
  uniforms.uGlowSize.value.set(glow.rx, glow.ry);
  uniforms.uFade.value.set(fade[0], fade[1]);

  return (
    <mesh position={[width / 2, -height / 2, -2 * planet.R - 400]} scale={[width, height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}
