import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetGeometry } from '../types';

/* Звёзды — один объект Points. Они заданы в полярных координатах вокруг центра планеты,
   а группа с ними вращается вокруг этого центра: небо дрейфует вдоль горизонта. */

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec2  aTwinkle;   // x — частота, y — фаза
attribute float aTint;
uniform float uTime;
uniform float uDpr;
uniform vec2  uFade;
varying float vAlpha;
varying float vTint;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float fade = 1.0 - smoothstep(uFade.x * 0.75, uFade.y, -world.y);
  vAlpha = aAlpha * fade * (0.72 + 0.28 * sin(uTime * aTwinkle.x + aTwinkle.y));
  vTint = aTint;
  gl_PointSize = aSize * uDpr;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vTint;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float alpha = vAlpha * smoothstep(0.5, 0.15, r);           // круглая точка с мягким краем
  vec3 col = mix(vec3(1.0), vec3(0.77, 0.69, 1.0), vTint);
  gl_FragColor = vec4(pow(col, vec3(2.2)), alpha);
  #include <colorspace_fragment>
}`;

// генератор с фиксированным зерном: небо одинаковое при каждом открытии страницы
function seeded(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

interface StarsProps {
  width: number;
  planet: PlanetGeometry;
  fade: [number, number];
  motion: boolean;
}

export default function Stars({ width, planet, fade, motion }: StarsProps) {
  const group = useRef<THREE.Group>(null), material = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree(s => s.viewport.dpr);
  const { cx, cy, R } = planet;

  const geometry = useMemo(() => {
    const rnd = seeded(20260920);
    const rMax = Math.hypot(Math.max(cx, width - cx), cy);
    const r0 = (R + 3) ** 2, span = rMax ** 2 - r0;
    const count = Math.round(Math.PI * span / 4600);        // плотность как в версии на Canvas 2D

    const position = new Float32Array(count * 3), size = new Float32Array(count), alpha = new Float32Array(count);
    const twinkle = new Float32Array(count * 2), tint = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(r0 + rnd() * span), a = rnd() * Math.PI * 2, big = rnd() > 0.94;
      position.set([r * Math.sin(a), r * Math.cos(a), 0], i * 3);
      size[i] = big ? 3.2 : 1.6 + rnd() * 1.2;
      alpha[i] = big ? 0.95 : 0.3 + rnd() * 0.5;
      twinkle.set([0.6 + rnd() * 1.8, rnd() * 6.28], i * 2);
      tint[i] = rnd() > 0.75 ? 1 : 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 2));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    return g;
  }, [cx, cy, R, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);   // при resize геометрия пересоздаётся — старую освобождаем

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uDpr: { value: 1 }, uFade: { value: new THREE.Vector2() } }), []);

  useFrame((state, delta) => {
    const u = material.current?.uniforms as typeof uniforms | undefined;   // только так: см. примечание про uniform-ы в glsl.ts
    if (!u || !group.current) return;
    u.uDpr.value = dpr;
    u.uFade.value.set(fade[0], fade[1]);
    if (!motion) return;
    u.uTime.value = state.clock.elapsedTime;
    group.current.rotation.z -= 0.0035 * Math.min(delta, 0.1);
  });

  // z — плоскость центра планеты: звёзды, оказавшиеся за диском, закрывает сама сфера через тест глубины
  return (
    <group ref={group} position={[cx, -cy, -R - 100]}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}
