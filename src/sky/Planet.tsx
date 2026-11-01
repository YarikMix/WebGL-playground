import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { planetVertexShader, planetFragmentShader } from './planet-shaders';
import useSunSweep from './useSunSweep';
import type { PlanetGeometry, SunDirection } from '../types';

/* В ветке webgl сфера была аналитической: нормаль восстанавливалась из координат пикселя,
   а вращение подделывалось поворотом координат шума. Здесь это настоящая геометрия:
   меш-сфера радиусом в тысячи пикселей, которая действительно вращается вокруг наклонной оси,
   а шум берётся по направлению в координатах объекта и едет вместе с ней. */

const AXIS = new THREE.Vector3(0.2873, 0, 0.9578);

interface PlanetProps {
  planet: PlanetGeometry;
  fade: [number, number];
  motion: boolean;
  sun: SunDirection;
  spin: number;
  /** непрерывных кадров нет — угол ставится сразу же на единственном заказанном кадре */
  reducedMotion: boolean;
  /** false — экран без планеты: меш спрятан, но материал и его программа живы (см. Sky.tsx) */
  visible: boolean;
}

export default function Planet({ planet, fade, motion, sun, spin, reducedMotion, visible }: PlanetProps) {
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPerspective: { value: 0 },
    uAtmosphereTint: { value: new THREE.Vector3(0.545, 0.424, 1.0) },
    uRadius: { value: 0 },
    uFade: { value: new THREE.Vector2() },
    uSun: { value: new THREE.Vector3() },
  }), []);

  const drift = useRef(0);    // непрерывное вращение планеты (только текстура — облака, огни)
  /* Угол поворота солнца вокруг Z, которым управляет экран. Идёт по кривой CSS-перехода луны
     и за то же время (useSunSweep → sweepEase): луна и освещённая сторона планеты стоят на одной
     доле пути в каждом кадре, а не только в двух точках покоя. */
  const sunAngle = useSunSweep(spin, !motion || reducedMotion);

  useFrame((state, delta) => {
    const u = material.current?.uniforms as typeof uniforms | undefined;   // только так: см. примечание про uniform-ы в glsl.ts
    if (!u || !mesh.current) return;
    u.uRadius.value = planet.R;
    u.uFade.value.set(fade[0], fade[1]);

    const d = Math.min(delta, 0.1);
    /* Поворот солнца вокруг Z (в плоскости экрана), а не вращение меша: сфера с неподвижным
       центром при повороте вокруг своей оси сохраняет мировую нормаль в каждом пикселе экрана
       неизменной (сфера переходит сама в себя), поэтому доворот меша не мог сдвинуть ни границу
       дня/ночи, ни ореол — только рисунок облаков. Двигать освещённую кромку может только само
       направление на солнце. */
    const a = sunAngle();
    const c = Math.cos(a), s = Math.sin(a);
    u.uSun.value.set(sun[0] * c - sun[1] * s, sun[0] * s + sun[1] * c, sun[2]);

    if (motion) {
      drift.current -= 0.0085 * d;   // верх диска плывёт слева направо
      u.uTime.value = state.clock.elapsedTime;
    }
    mesh.current.setRotationFromAxisAngle(AXIS, drift.current);
  });

  return (
    // единичная сфера масштабируется до радиуса в пикселях: геометрия не пересоздаётся при resize
    <mesh ref={mesh} position={[planet.cx, -planet.cy, -planet.R - 100]} scale={planet.R} visible={visible}>
      <sphereGeometry args={[1, 384, 192]} />
      <shaderMaterial ref={material} vertexShader={planetVertexShader} fragmentShader={planetFragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
