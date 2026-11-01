import { NOISE, OUTPUT, PALETTE } from './glsl';

export const planetVertexShader = /* glsl */ `
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

export const planetFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uPerspective;
uniform vec3 uAtmosphereTint;
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
  float facing = mix(n.z, dot(n, normalize(cameraPosition - vWorld)), uPerspective);

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
  float city = land * cluster * (1.0 - cover) * smoothstep(0.06, 0.30, facing) * cityDots(q);
  vec3 cityTint = mix(vec3(0.77, 0.69, 1.0), vec3(1.0, 0.80, 0.55), step(0.45, noise(q * 40.0 + 2.0)));
  vec3 nightCol = SPACE + surface * 0.06 + cityTint * city * 0.8;

  vec3 col = mix(nightCol, dayCol, day);

  /* Атмосфера изнутри: камера ортографическая, взгляд всегда вдоль Z, поэтому «скольжение» = 1 − n.z */
  float rim = 1.0 - max(facing, 0.0);
  vec2 sunXY = normalize(sunDir.xy + vec2(1e-6));
  // У полюса (length(n.xy) ≲ 1e-4) старая и новая формулы sunSide расходятся, но там rim^5/rim^7 — численный ноль
  float sunSide = pow(max(dot(normalize(n.xy + vec2(1e-6)), sunXY), 0.0), 1.5);
  /* Светлая кромка: показатель 7 вместо 18 и гашение блика у самого силуэта.
     Белые точки по низу карточки давал пик этого слагаемого, лежавший ровно на краю: у
     pow(rim, 18) полуспад приходится на n.z = 0.038 — 1 пиксель внутрь от силуэта
     (R ≈ 1368 px, d ≈ R·n.z²/2). Деталь тоньше пикселя не едет вместе с планетой, а скачет
     через порог растеризации, и буфер преломления стекла (мип-уровни плюс lod-смещение drei
     ≈ 0.9 при roughness 0.1 / ior 1.4) превращает скачок в белую вспышку 2–5 px в случайном
     месте дуги. Снаружи стекла вспышек нет ни одной — только под карточкой.
     Замер по 16-секундной записи 1512×818 (пиксель ярче 200 и выше своей медианы по времени
     на 60): 18/0.8 — 136 кадров из 810; 7/0.5 — 9 из 734; с гашением — 0 из 820. Показателя
     мало, потому что максимум всё равно остаётся на крайнем пикселе: smoothstep(0, 0.09, n.z)
     обнуляет блик на силуэте и уводит максимум на ~5.5 px внутрь. По относительному порогу
     (отклонение пикселя от собственной медианы > 50) было 27 кадров из 734 по всей дуге с
     пиком 187, стало 2 из 820 с пиком 70 — это ≈110 яркости, глазом не видно.
     Светимость дуги не пострадала: медиана яркости 40.6 против 40.9. */
  col += (uAtmosphereTint * 0.55 * pow(rim, 5.0) + vec3(0.9, 0.85, 1.0) * 0.5 * pow(rim, 7.0) * smoothstep(0.0, 0.09, facing)) * sunSide;

  col = mix(col, SPACE, smoothstep(uFade.x, uFade.y, -vWorld.y));   // книзу растворяется в фоне страницы
  float alpha = 1.0;
  ${OUTPUT}
}`;
