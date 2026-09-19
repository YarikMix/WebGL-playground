import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE, OUTPUT, PALETTE } from './glsl.js';

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
varying vec3 vDir;
varying vec3 vNormalW;
varying vec3 vWorld;
${PALETTE}
const vec3 SUN = vec3(0.0, 0.38, -0.925);            // солнце за планетой, чуть выше горизонта
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
  float ndl = dot(n, SUN);
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
  float sunSide = pow(max(n.y / max(length(n.xy), 1e-4), 0.0), 1.5);
  col += (VIOLET * 0.55 * pow(rim, 5.0) + vec3(0.9, 0.85, 1.0) * 0.8 * pow(rim, 18.0)) * sunSide;

  col = mix(col, SPACE, smoothstep(uFade.x, uFade.y, -vWorld.y));   // книзу растворяется в фоне страницы
  float alpha = 1.0;
  ${OUTPUT}
}`;

export default function Planet({ planet, fade, motion }) {
  const mesh = useRef(null), material = useRef(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uRadius: { value: 0 }, uFade: { value: new THREE.Vector2() } }), []);

  useFrame((state, delta) => {
    const u = material.current.uniforms;      // только так: см. примечание про uniform-ы в glsl.js
    u.uRadius.value = planet.R;
    u.uFade.value.set(fade[0], fade[1]);
    if (!motion) return;
    u.uTime.value = state.clock.elapsedTime;
    mesh.current.rotateOnWorldAxis(AXIS, -0.0085 * Math.min(delta, 0.1));   // верх диска плывёт слева направо
  });

  return (
    // единичная сфера масштабируется до радиуса в пикселях: геометрия не пересоздаётся при resize
    <mesh ref={mesh} position={[planet.cx, -planet.cy, -planet.R - 100]} scale={planet.R}>
      <sphereGeometry args={[1, 384, 192]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
