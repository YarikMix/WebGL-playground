import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OUTPUT, PALETTE } from './glsl';
import { SWEEP_MS } from '../scene-config';
import type { PlanetGeometry, SceneLayout, SunDirection } from '../types';

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
uniform vec3  uSun;
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
  vec2 sunXY = normalize(uSun.xy + vec2(1e-6));
  float sunSide = pow(max(dot(normalize(vec2(d.x, -d.y)), sunXY), 0.0), 1.5);
  col += (vec3(0.92, 0.86, 1.0) * 0.85 * exp(-h / 9.0)
        + VIOLET * (0.55 * exp(-h / 34.0) + 0.22 * exp(-h / 110.0))) * sunSide;

  col = mix(col, SPACE, smoothstep(uFade.x, uFade.y, vPage.y));
  float alpha = 1.0;
  ${OUTPUT}
}`;

interface BackdropProps {
  width: number;
  height: number;
  planet: PlanetGeometry;
  glow: SceneLayout['glow'];
  fade: [number, number];
  sun: SunDirection;
  spin: number;
  motion: boolean;
  /** непрерывных кадров нет — угол ставится сразу же на единственном заказанном кадре */
  reducedMotion: boolean;
}

export default function Backdrop({ width, height, planet, glow, fade, sun, spin, motion, reducedMotion }: BackdropProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 0 },
    uGlow: { value: new THREE.Vector2() },
    uGlowSize: { value: new THREE.Vector2() },
    uFade: { value: new THREE.Vector2() },
    uSun: { value: new THREE.Vector3() },
  }), []);

  // Тот же угол и то же сглаживание (или тот же мгновенный переход при отсутствии непрерывных
  // кадров), что в Planet.tsx — ореол над кромкой должен ехать синхронно с ореолом на самой
  // планете, это один и тот же источник света.
  const sweep = useRef(0);

  useFrame((_, delta) => {
    const u = material.current?.uniforms as typeof uniforms | undefined;   // только так: см. примечание про uniform-ы в glsl.ts
    if (!u) return;
    u.uCenter.value.set(planet.cx, planet.cy);
    u.uRadius.value = planet.R;
    u.uGlow.value.set(glow.x, glow.y);
    u.uGlowSize.value.set(glow.rx, glow.ry);
    u.uFade.value.set(fade[0], fade[1]);

    const d = Math.min(delta, 0.1);
    if (!motion || reducedMotion) {
      sweep.current = spin;
    } else {
      sweep.current += (spin - sweep.current) * (1 - Math.exp(-d / (SWEEP_MS / 3000)));
    }
    const c = Math.cos(sweep.current), s = Math.sin(sweep.current);
    u.uSun.value.set(sun[0] * c - sun[1] * s, sun[0] * s + sun[1] * c, sun[2]);
  });

  return (
    <mesh position={[width / 2, -height / 2, -2 * planet.R - 400]} scale={[width, height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}
