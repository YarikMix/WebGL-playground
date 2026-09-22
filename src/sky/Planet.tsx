import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE, OUTPUT, PALETTE } from './glsl';
import useSunSweep from './useSunSweep';
import type { PlanetGeometry, SunDirection } from '../types';

/* В ветке webgl сфера была аналитической: нормаль восстанавливалась из координат пикселя,
   а вращение подделывалось поворотом координат шума. Здесь это настоящая геометрия:
   меш-сфера радиусом в тысячи пикселей, которая действительно вращается вокруг наклонной оси,
   а шум берётся по направлению в координатах объекта и едет вместе с ней. */

const AXIS = new THREE.Vector3(0.2873, 0, 0.9578);

const vertexShader = /* glsl */ `
varying vec3 vDir;      // направление в координатах объекта: вращается вместе с планетой
varying vec3 vNormalW;  // нормаль в мире: для освещения, солнце и камера неподвижны
varying vec3 vWorld;
void main() {
  vDir = normalize(position);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec2  uFade;
uniform vec3  uSun;
varying vec3 vDir;
varying vec3 vNormalW;
varying vec3 vWorld;
${PALETTE}
${NOISE}

/* Огни городов: трёхмерная сетка с шагом ~9px, в ячейке не больше одной точки. Видны только
   точки у самой поверхности сферы, поэтому огни круглые, а не штрихи. */
float cityDots(vec3 q) {
  vec3 u = q * (uRadius / 9.0);
  vec3 id = floor(u);
  if (hash13(id + 3.3) > 0.4) return 0.0;
  vec3 pos = 0.3 + 0.4 * vec3(hash13(id), hash13(id + 19.19), hash13(id + 47.77));
  vec3 off = (fract(u) - pos) / 0.15;
  return (0.4 + 0.6 * hash13(id + 5.5)) * exp(-dot(off, off));
}

void main() {
  vec3 n = normalize(vNormalW);
  vec3 q = normalize(vDir);

  /* Облака: крупные системы задают, где облачно, мелкий fbm с искажением координат даёт волокна */
  float land = smoothstep(0.50, 0.57, fbm(q * 5.0 + 4.0));
  vec3 cq = q * 15.0 + vec3(0.0, uTime * 0.0015, 20.0);
  cq += 0.8 * (vec3(noise(cq * 0.6 + 11.0), noise(cq * 0.6 + 23.0), noise(cq * 0.6 + 37.0)) - 0.5);
  float systems = smoothstep(0.42, 0.62, fbm(q * 4.0 + 31.0));
  float cover = systems * smoothstep(0.44, 0.66, fbm(cq)) * (0.6 + 0.4 * noise(cq * 5.0));

  vec3 surface = mix(vec3(0.035, 0.03, 0.13), vec3(0.12, 0.085, 0.24), land);
  surface = mix(surface, vec3(0.55, 0.50, 0.82), cover * 0.9);

  /* Дневная сторона — узкий серп у кромки */
  vec3 sunDir = normalize(uSun);
  float ndl = dot(n, sunDir);
  float day = smoothstep(-0.03, 0.12, ndl);
  vec3 dayCol = surface * (0.40 + 2.4 * max(ndl, 0.0));

  /* Ночная сторона: едва заметная поверхность и огни городов — на суше и не под облаками */
  float cluster = smoothstep(0.46, 0.62, fbm(q * 26.0 + 9.0));
  float city = land * cluster * (1.0 - cover) * smoothstep(0.06, 0.30, n.z) * cityDots(q);
  vec3 cityTint = mix(vec3(0.77, 0.69, 1.0), vec3(1.0, 0.80, 0.55), step(0.45, noise(q * 40.0 + 2.0)));
  vec3 nightCol = SPACE + surface * 0.06 + cityTint * city * 0.8;

  vec3 col = mix(nightCol, dayCol, day);

  /* Атмосфера изнутри: камера ортографическая, взгляд всегда вдоль Z, поэтому «скольжение» = 1 − n.z */
  float rim = 1.0 - n.z;
  vec2 sunXY = normalize(sunDir.xy + vec2(1e-6));
  // У полюса (length(n.xy) ≲ 1e-4) старая и новая формулы sunSide расходятся, но там rim^5/rim^18 — численный ноль
  float sunSide = pow(max(dot(normalize(n.xy + vec2(1e-6)), sunXY), 0.0), 1.5);
  col += (VIOLET * 0.55 * pow(rim, 5.0) + vec3(0.9, 0.85, 1.0) * 0.8 * pow(rim, 18.0)) * sunSide;

  col = mix(col, SPACE, smoothstep(uFade.x, uFade.y, -vWorld.y));   // книзу растворяется в фоне страницы
  float alpha = 1.0;
  ${OUTPUT}
}`;

interface PlanetProps {
  planet: PlanetGeometry;
  fade: [number, number];
  motion: boolean;
  sun: SunDirection;
  spin: number;
  /** непрерывных кадров нет — угол ставится сразу же на единственном заказанном кадре */
  reducedMotion: boolean;
}

export default function Planet({ planet, fade, motion, sun, spin, reducedMotion }: PlanetProps) {
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
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
    <mesh ref={mesh} position={[planet.cx, -planet.cy, -planet.R - 100]} scale={planet.R}>
      <sphereGeometry args={[1, 384, 192]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
