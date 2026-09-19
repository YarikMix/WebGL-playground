/* Небо на чистом WebGL, без библиотек.

   Проход 1 (SCENE) — один фрагментный шейдер рисует весь фон: свечение за заголовком, звёзды,
   метеор, планету с облаками, терминатором, ночными огнями и атмосферой по кромке.

   Проход 2 (GLASS) включается только в режиме карточек «Liquid glass»: сцена сначала уходит
   в текстуру, а второй шейдер внутри прямоугольников карточек читает её со смещением —
   преломление на фаске, матовое размытие, хроматическая аберрация, блик, идущий за курсором.
   В остальных режимах сцена рисуется сразу на экран, второго прохода нет.

   Геометрия берётся из вёрстки: центр и радиус планеты — из скрытого .limb, прямоугольники
   стёкол — из карточек в #grid. Если WebGL недоступен, остаётся статичный CSS-фон.
   30 кадров/с, пауза вне экрана и в фоновой вкладке, статичный кадр при выключенной анимации. */
window.Sky = (() => {
  const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const SCENE = /* glsl */ `
precision highp float;

uniform vec2  u_res;       // размер канваса, физические пиксели
uniform float u_dpr;       // физических пикселей в одном CSS-пикселе
uniform vec2  u_center;    // центр планеты (ось Y направлена вниз)
uniform float u_radius;
uniform vec2  u_glow;      // центр свечения за заголовком
uniform vec2  u_glowSize;
uniform vec2  u_fade;      // по Y: где фон начинает и заканчивает растворяться в цвете страницы
uniform float u_time;
uniform vec4  u_meteor;    // xy — голова, z — яркость, w — угол полёта

const vec3 SPACE  = vec3(0.0196, 0.0118, 0.0588);   // #05030f, совпадает с фоном страницы
const vec3 VIOLET = vec3(0.545, 0.424, 1.0);
const vec3 ORCHID = vec3(0.816, 0.545, 1.0);
const vec3 SUN    = vec3(0.0, 0.38, -0.925);        // солнце за планетой, чуть выше горизонта
const vec3 AXIS   = vec3(0.2873, 0.0, 0.9578);      // ось вращения, наклонена от взгляда

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i),                  hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float amp = 0.5, sum = 0.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(17.1, 3.7, 9.2);
    amp *= 0.5;
  }
  return sum / 0.9375;
}

vec3 rotate(vec3 v, vec3 k, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

/* Звёзды живут в полярной сетке вокруг центра планеты: сдвиг угла поворачивает всё небо. */
vec3 starLayer(vec2 d, float dist, float cell, float size, float density, float seed) {
  float theta = atan(d.x, -d.y) - u_time * 0.0035;
  vec2 u = vec2(theta * u_radius / cell, dist / cell);
  vec2 id = floor(u) + seed;
  if (hash12(id) > density) return vec3(0.0);
  vec2 off = (fract(u) - (0.2 + 0.6 * hash22(id + 7.31))) * cell;
  off.x *= dist / u_radius;
  float twinkle = 0.72 + 0.28 * sin(u_time * (0.6 + 1.8 * hash12(id + 3.17)) + 6.2832 * hash12(id + 5.71));
  float bright = 0.3 + 0.7 * hash12(id + 11.93);
  vec3 tint = mix(vec3(1.0), vec3(0.77, 0.69, 1.0), step(0.75, hash12(id + 2.29)));
  return tint * bright * twinkle * exp(-dot(off, off) / (size * size));
}

vec3 sky(vec2 p, vec2 d, float dist, float sunSide) {
  float t = length((p - u_glow) / u_glowSize);
  float a = 0.40 * pow(max(1.0 - t, 0.0), 1.6);
  vec3 col = mix(SPACE, mix(VIOLET, ORCHID, clamp(t / 0.55, 0.0, 1.0)), a);

  col += 0.85 * starLayer(d, dist, 40.0 * u_dpr, 0.8 * u_dpr, 0.45, 0.0);
  col += starLayer(d, dist, 150.0 * u_dpr, 1.5 * u_dpr, 0.6, 91.0);

  /* Атмосфера над кромкой: тонкая светлая линия и два фиолетовых ореола */
  float h = max(dist - u_radius, 0.0) / u_dpr;
  vec3 halo = vec3(0.92, 0.86, 1.0) * 0.85 * exp(-h / 9.0)
            + VIOLET * (0.55 * exp(-h / 34.0) + 0.22 * exp(-h / 110.0));
  col += halo * sunSide;

  if (u_meteor.z > 0.0) {
    vec2 dir = vec2(cos(u_meteor.w), sin(u_meteor.w));
    vec2 pa = p - u_meteor.xy;
    float len = 130.0 * u_dpr;
    float along = clamp(dot(pa, -dir), 0.0, len);
    float across = length(pa + dir * along);
    float w = 1.1 * u_dpr;
    col += vec3(0.93, 0.9, 1.0) * u_meteor.z * (1.0 - along / len) * exp(-across * across / (w * w));
  }
  return col;
}

/* Огни городов: трёхмерная сетка с шагом ~9 CSS-пикселей, в ячейке не больше одной точки.
   Видны только точки, оказавшиеся у самой поверхности сферы, поэтому огни круглые, а не штрихи. */
float cityDots(vec3 q) {
  vec3 u = q * (u_radius / (9.0 * u_dpr));
  vec3 id = floor(u);
  if (hash13(id + 3.3) > 0.4) return 0.0;              // большинство ячеек пустые, иначе проступает решётка
  vec3 pos = 0.3 + 0.4 * vec3(hash13(id), hash13(id + 19.19), hash13(id + 47.77));
  vec3 off = (fract(u) - pos) / 0.15;
  return (0.4 + 0.6 * hash13(id + 5.5)) * exp(-dot(off, off));
}

vec3 planet(vec2 d, float dist, float sunSide) {
  float R = u_radius;
  vec3 n = vec3(d.x, -d.y, sqrt(max((R - dist) * (R + dist), 0.0))) / R;
  vec3 q = rotate(n, AXIS, u_time * 0.0085);

  /* Облака: крупные системы задают, где облачно, мелкий fbm с искажением координат даёт волокна */
  float land = smoothstep(0.50, 0.57, fbm(q * 5.0 + 4.0));
  vec3 cq = q * 15.0 + vec3(0.0, u_time * 0.0015, 20.0);
  cq += 0.8 * (vec3(noise(cq * 0.6 + 11.0), noise(cq * 0.6 + 23.0), noise(cq * 0.6 + 37.0)) - 0.5);
  float systems = smoothstep(0.42, 0.62, fbm(q * 4.0 + 31.0));
  float cover = systems * smoothstep(0.44, 0.66, fbm(cq)) * (0.6 + 0.4 * noise(cq * 5.0));

  vec3 surface = mix(vec3(0.035, 0.03, 0.13), vec3(0.12, 0.085, 0.24), land);
  surface = mix(surface, vec3(0.55, 0.50, 0.82), cover * 0.9);

  /* Дневная сторона — узкий серп у кромки: солнце стоит сразу за горизонтом */
  float ndl = dot(n, SUN);
  float day = smoothstep(-0.03, 0.12, ndl);
  vec3 dayCol = surface * (0.40 + 2.4 * max(ndl, 0.0));

  /* Ночная сторона: едва заметная поверхность и огни городов — только на суше и не под облаками */
  float cluster = smoothstep(0.46, 0.62, fbm(q * 26.0 + 9.0));
  float city    = land * cluster * (1.0 - cover) * smoothstep(0.06, 0.30, n.z) * cityDots(q);
  vec3 cityTint = mix(vec3(0.77, 0.69, 1.0), vec3(1.0, 0.80, 0.55), step(0.45, noise(q * 40.0 + 2.0)));
  vec3 nightCol = SPACE + surface * 0.06 + cityTint * city * 0.8;

  vec3 col = mix(nightCol, dayCol, day);

  /* Атмосфера изнутри: рассеяние усиливается к кромке, где луч идёт сквозь толщу воздуха */
  float rim = 1.0 - n.z;
  col += (VIOLET * 0.55 * pow(rim, 5.0) + vec3(0.9, 0.85, 1.0) * 0.8 * pow(rim, 18.0)) * sunSide;
  return col;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  float fade = smoothstep(u_fade.x, u_fade.y, p.y);      // книзу фон растворяется в цвете страницы
  vec3 col = SPACE;

  if (fade < 1.0) {
    vec2 d = p - u_center;
    float dist = length(d);
    float sunSide = pow(max(-d.y / dist, 0.0), 1.5);
    float edge = smoothstep(-1.0, 1.0, dist - u_radius);  // сглаживание кромки диска
    if (edge > 0.0) col = sky(p, d, dist, sunSide);
    if (edge < 1.0) col = mix(planet(d, dist, sunSide), col, edge);
    col = mix(col, SPACE, fade);
  }

  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;          // дизеринг против полос на градиентах
  gl_FragColor = vec4(col, 1.0);
}`;

  const MAX_CARDS = 16;
  const GLASS = /* glsl */ `
precision highp float;

uniform sampler2D u_scene;          // готовая сцена из первого прохода
uniform vec2  u_res;
uniform float u_dpr;
uniform vec4  u_cards[${MAX_CARDS}];          // xy — центр, zw — полуразмеры (физ. пиксели, Y вниз)
uniform int   u_count;
uniform float u_corner;             // радиус скругления карточки
uniform vec2  u_pointer;            // курсор: блик на фаске поворачивается к нему

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/* Расстояние со знаком до скруглённого прямоугольника: внутри отрицательное */
float sdCard(vec2 p, vec4 card) {
  vec2 q = abs(p - card.xy) - card.zw + u_corner;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - u_corner;
}

vec3 scene(vec2 p) {
  return texture2D(u_scene, vec2(p.x, u_res.y - p.y) / u_res).rgb;
}

/* Матовое стекло: 12 выборок по спирали. Поворот спирали свой у каждого пикселя —
   вместо ступенек размытия получается мелкое зерно, как у настоящего матового стекла. */
vec3 frost(vec2 p, float radius, float turn) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float k = float(i);
    float a = k * 2.39996 + turn;
    sum += scene(p + radius * sqrt((k + 0.5) / 12.0) * vec2(cos(a), sin(a)));
  }
  return sum / 12.0;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  vec3 col = scene(p);

  /* Ближайшая карточка: они не пересекаются, поэтому достаточно минимума расстояний */
  float dmin = 1e6;
  vec4 card = vec4(0.0);
  for (int i = 0; i < ${MAX_CARDS}; i++) {
    if (i >= u_count) break;
    float d = sdCard(p, u_cards[i]);
    if (d < dmin) { dmin = d; card = u_cards[i]; }
  }

  if (dmin > 0.5) {
    col *= 1.0 - 0.30 * exp(-dmin / (16.0 * u_dpr));      // мягкая тень вокруг стекла
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  float inside = -dmin;
  vec2 e = vec2(1.0, 0.0);
  vec2 n = normalize(vec2(sdCard(p + e.xy, card) - sdCard(p - e.xy, card),
                          sdCard(p + e.yx, card) - sdCard(p - e.yx, card)) + 1e-6);

  /* Фаска шириной 20px с круглым профилем: чем ближе к краю, тем круче наклон стекла
     и тем дальше за край карточки уходит выборка — фон у кромки сжимается, как в линзе. */
  float t = clamp(1.0 - inside / (20.0 * u_dpr), 0.0, 1.0);
  float bend = 1.0 - sqrt(1.0 - t * t);
  vec2 shift = n * bend * 44.0 * u_dpr;

  float turn = 6.2832 * hash12(gl_FragCoord.xy);
  float blur = 7.0 * u_dpr;
  vec3 glass = frost(p + shift, blur, turn);
  if (t > 0.02) {                                          // аберрация: красный и синий преломляются по-разному
    glass.r = frost(p + shift * 1.18, blur, turn).r;
    glass.b = frost(p + shift * 0.82, blur, turn).b;
  }
  glass = glass * 0.80 + vec3(0.030, 0.026, 0.055);       // лёгкая тонировка: текст карточки должен читаться

  /* Блик на кромке: ярче на стороне, обращённой к курсору, слабее — на противоположной */
  vec2 toLight = normalize(u_pointer - card.xy + 1e-3);
  float facing = dot(n, toLight);
  float edgeDist = inside / (1.1 * u_dpr);
  float line = exp(-edgeDist * edgeDist);
  float spec = line * (0.12 + 0.9 * pow(max(facing, 0.0), 2.0) + 0.35 * pow(max(-facing, 0.0), 3.0));
  float bevel = t * t * (0.10 + 0.22 * max(facing, 0.0));  // фаска светится шире линии: стекло выглядит объёмным
  glass += vec3(0.95, 0.92, 1.0) * spec * 0.85 + vec3(0.62, 0.52, 1.0) * bevel;

  col = mix(col, glass, clamp(0.5 - dmin, 0.0, 1.0));      // сглаживание края карточки
  gl_FragColor = vec4(col, 1.0);
}`;

  const cv = document.getElementById('stars');
  const page = document.querySelector('.page');
  const limb = document.querySelector('.limb');
  const hero = document.querySelector('.hero');
  const grid = document.getElementById('grid');
  const cardsBar = document.getElementById('cards');
  const MAX_DPR = 1.5;                                     // шейдер тяжёлый, звёздам хватает и 1.5×
  const BASE_HEIGHT = 900;                                 // CSS-высота канваса, пока стёкла не тянут его ниже

  let gl = null, scene = null, glass = null, fbo = null, sceneTex = null;
  let scale = 1, geo = null, cardCount = 0;
  let raf = 0, last = 0, onScreen = true, enabled = true, meteor = null, nextMeteor = 5;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

  /* Режим карточек: flat — имитация стекла на CSS, blur — backdrop-filter, liquid — второй проход WebGL */
  let cards = 'flat';
  try { const saved = localStorage.getItem('sky-cards'); if (['flat', 'blur', 'liquid'].includes(saved)) cards = saved; } catch {}

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  function program(frag, uniforms) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'a_pos');               // один буфер и один атрибут на обе программы
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const u = {};
    for (const name of uniforms) u[name] = gl.getUniformLocation(prog, 'u_' + name);
    return { prog, u };
  }

  function init() {
    gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return false;
    try {
      scene = program(SCENE, ['res', 'dpr', 'center', 'radius', 'glow', 'glowSize', 'fade', 'time', 'meteor']);
      glass = program(GLASS, ['scene', 'res', 'dpr', 'cards', 'count', 'corner', 'pointer']);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      sceneTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      fbo = gl.createFramebuffer();
    } catch (err) {
      console.error('Sky: шейдер не собрался, остаётся CSS-фон.', err);
      gl = null;
      return false;
    }
    return true;
  }

  function build() {
    if (!gl) return;
    const liquid = cards === 'liquid';

    /* Стёкла рисует канвас, поэтому в режиме liquid он должен накрывать всю сетку карточек */
    const pageTop = page.getBoundingClientRect().top;
    const gridBottom = grid.hidden ? 0 : grid.getBoundingClientRect().bottom - pageTop + 60;
    cv.style.height = Math.round(liquid ? Math.max(BASE_HEIGHT, gridBottom) : BASE_HEIGHT) + 'px';

    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = cv.width / w;
    gl.viewport(0, 0, cv.width, cv.height);

    const c = cv.getBoundingClientRect(), l = limb.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const R = l.width / 2;
    geo = { w, h, R, cx: l.left - c.left + R, cy: l.top - c.top + R };

    gl.useProgram(scene.prog);
    gl.uniform2f(scene.u.res, cv.width, cv.height);
    gl.uniform1f(scene.u.dpr, scale);
    gl.uniform2f(scene.u.center, geo.cx * scale, geo.cy * scale);
    gl.uniform1f(scene.u.radius, R * scale);
    gl.uniform2f(scene.u.glow, geo.cx * scale, (hr.top - c.top + 130) * scale);
    gl.uniform2f(scene.u.glowSize, Math.min(920, w * 1.3) / 2 * 1.1 * scale, 270 * 1.1 * scale);
    gl.uniform2f(scene.u.fade, BASE_HEIGHT * .6 * scale, BASE_HEIGHT * scale);

    if (liquid) {
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cv.width, cv.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.useProgram(glass.prog);
      gl.uniform1i(glass.u.scene, 0);
      gl.uniform2f(glass.u.res, cv.width, cv.height);
      gl.uniform1f(glass.u.dpr, scale);
      gl.uniform1f(glass.u.corner, 18 * scale);
    }
    syncCards(c);
    if (!pointer.active) restPointer();
    draw(performance.now() / 1000);
  }

  /* Прямоугольники карточек → uniform-массив. Карточки и канвас прокручиваются вместе,
     поэтому координаты меняются только при перестройке сетки, а не при скролле. */
  function syncCards(canvasRect) {
    const liquid = gl && cards === 'liquid';
    const data = new Float32Array(MAX_CARDS * 4);
    cardCount = 0;
    for (const el of grid.querySelectorAll('.card')) {
      const on = liquid && cardCount < MAX_CARDS;
      el.classList.toggle('lq', on);                       // сверх лимита карточка остаётся обычной, с CSS-заливкой
      if (!on) continue;
      const r = el.getBoundingClientRect();
      data.set([(r.left - canvasRect.left + r.width / 2) * scale, (r.top - canvasRect.top + r.height / 2) * scale,
        r.width / 2 * scale, r.height / 2 * scale], cardCount * 4);
      cardCount++;
    }
    if (!liquid) return;
    gl.useProgram(glass.prog);
    gl.uniform4fv(glass.u.cards, data);
    gl.uniform1i(glass.u.count, cardCount);
  }

  /* Без курсора свет стоит слева сверху, как у остальных бликов на странице */
  function restPointer() {
    pointer.tx = (geo ? geo.cx : 0) - 4000; pointer.ty = -4000;
    pointer.x = pointer.tx; pointer.y = pointer.ty;
  }

  /* Метеор считается на CPU и уходит в шейдер одним vec4 */
  function stepMeteor(t) {
    if (!enabled) return [0, 0, 0, 0];
    if (!meteor) {
      if (t < nextMeteor) return [0, 0, 0, 0];
      meteor = { t0: t, x: geo.w * (.1 + Math.random() * .6), y: 20 + Math.random() * 140, ang: .35 + Math.random() * .3 };
    }
    const p = (t - meteor.t0) / .9;
    const x = meteor.x + Math.cos(meteor.ang) * 640 * p, y = meteor.y + Math.sin(meteor.ang) * 640 * p;
    if (p >= 1 || Math.hypot(x - geo.cx, y - geo.cy) < geo.R + 12) {
      meteor = null; nextMeteor = t + 9 + Math.random() * 14;
      return [0, 0, 0, 0];
    }
    return [x * scale, y * scale, Math.sin(Math.PI * p), meteor.ang];
  }

  function draw(t) {
    if (!gl || !geo) return;
    const liquid = cards === 'liquid';

    gl.useProgram(scene.prog);
    gl.uniform1f(scene.u.time, t);
    gl.uniform4fv(scene.u.meteor, stepMeteor(t));
    gl.bindFramebuffer(gl.FRAMEBUFFER, liquid ? fbo : null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!liquid) return;

    pointer.x += (pointer.tx - pointer.x) * .18;           // блик догоняет курсор с небольшой инерцией
    pointer.y += (pointer.ty - pointer.y) * .18;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(glass.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform2f(glass.u.pointer, pointer.x * scale, pointer.y * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;
    last = now;
    draw(now / 1000);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0;
    if (gl && enabled && onScreen) raf = requestAnimationFrame(frame);
  }

  let pending = 0, still = 0;
  const rebuild = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(build); };

  function boot() {
    if (!init()) return false;
    page.classList.add('webgl');
    build();
    sync();
    return true;
  }

  /* ── Переключатель режима карточек ── */
  function paintCards() {
    for (const name of ['flat', 'blur', 'liquid']) page.classList.toggle('cards-' + name, cards === name);
    for (const b of cardsBar.querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.cards === cards);
  }
  cardsBar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    cards = b.dataset.cards;
    try { localStorage.setItem('sky-cards', cards); } catch {}
    paintCards();
    rebuild();
  });

  addEventListener('pointermove', e => {
    if (cards !== 'liquid' || e.pointerType === 'touch') return;
    const c = cv.getBoundingClientRect();
    pointer.tx = e.clientX - c.left; pointer.ty = e.clientY - c.top;
    pointer.active = true;
    if (raf) return;
    pointer.x = pointer.tx; pointer.y = pointer.ty;        // анимация выключена — блик отвечает одним кадром, без инерции
    cancelAnimationFrame(still);
    still = requestAnimationFrame(now => draw(now / 1000));
  });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; pointer.tx = (geo ? geo.cx : 0) - 4000; pointer.ty = -4000; });

  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; gl = null; });
  cv.addEventListener('webglcontextrestored', boot);
  const ro = new ResizeObserver(rebuild);
  ro.observe(hero);
  ro.observe(cv);
  ro.observe(grid);
  new MutationObserver(rebuild).observe(grid, { childList: true });   // фильтр, поиск, новый блокнот
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(cv);

  return {
    start(on) {
      enabled = on;
      if (!boot()) {                                       // без WebGL жидкое стекло недоступно
        const liquidBtn = cardsBar.querySelector('[data-cards="liquid"]');
        liquidBtn.disabled = true; liquidBtn.title = 'Нужен WebGL';
        if (cards === 'liquid') cards = 'flat';
      }
      paintCards();
      rebuild();
    },
    set(on) { enabled = on; meteor = null; sync(); },
  };
})();
