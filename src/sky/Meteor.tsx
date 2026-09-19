import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetGeometry } from '../types';

/* Редкий метеор: узкая плоскость с градиентом вдоль хвоста. Пролетает раз в 9–23 секунды и гаснет у горизонта. */

const LENGTH = 130, FLIGHT = 640, DURATION = 0.9;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fragmentShader = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float across = 1.0 - abs(vUv.y - 0.5) * 2.0;               // мягкие края по ширине
  float alpha = uAlpha * vUv.x * across;                      // хвост (u=0) прозрачный, голова (u=1) яркая
  gl_FragColor = vec4(pow(vec3(0.93, 0.9, 1.0), vec3(2.2)), alpha);
  #include <colorspace_fragment>
}`;

interface Flight { t0: number; x: number; y: number; ang: number }

interface MeteorProps {
  width: number;
  planet: PlanetGeometry;
  motion: boolean;
}

export default function Meteor({ width, planet, motion }: MeteorProps) {
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.ShaderMaterial>(null);
  const flight = useRef<{ active: Flight | null; next: number }>({ active: null, next: 5 });
  const uniforms = useMemo(() => ({ uAlpha: { value: 0 } }), []);

  useFrame(state => {
    const t = state.clock.elapsedTime, f = flight.current, m = mesh.current;
    const u = material.current?.uniforms as typeof uniforms | undefined;   // только так: см. примечание про uniform-ы в glsl.ts
    if (!m || !u) return;
    if (!motion) { m.visible = false; f.active = null; return; }
    if (!f.active) {
      m.visible = false;
      if (t < f.next) return;
      f.active = { t0: t, x: width * (0.1 + Math.random() * 0.6), y: 20 + Math.random() * 140, ang: 0.35 + Math.random() * 0.3 };
    }
    const { t0, x, y, ang } = f.active;
    const p = (t - t0) / DURATION;
    const hx = x + Math.cos(ang) * FLIGHT * p, hy = y + Math.sin(ang) * FLIGHT * p;   // голова, координаты страницы
    if (p >= 1 || Math.hypot(hx - planet.cx, hy - planet.cy) < planet.R + 12) {
      f.active = null; f.next = t + 9 + Math.random() * 14; m.visible = false;
      return;
    }
    // плоскость центрируется на середине хвоста; ось Y сцены направлена вверх, поэтому угол со знаком минус
    m.position.set(hx - Math.cos(ang) * LENGTH / 2, -(hy - Math.sin(ang) * LENGTH / 2), -50);
    m.rotation.z = -ang;
    u.uAlpha.value = Math.sin(Math.PI * p) * 0.9;
    m.visible = true;
  });

  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[LENGTH, 2.6]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms}
        transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
