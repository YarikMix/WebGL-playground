/* Небо на чистом WebGL, без библиотек: один полноэкранный треугольник и один фрагментный шейдер.
   Шейдер рисует всё сразу — свечение за заголовком, звёзды, метеор, планету с процедурной
   поверхностью, облаками, терминатором, ночными огнями и атмосферой по кромке.
   Геометрия (центр и радиус планеты) берётся из скрытого CSS-элемента .limb, поэтому фон
   подстраивается под вёрстку. Если WebGL недоступен, остаётся статичный CSS-фон.
   30 кадров/с, пауза вне экрана и в фоновой вкладке, статичный кадр при выключенной анимации. */
window.Sky = (() => {
  const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FRAG = /* glsl */ `
precision highp float;

uniform vec2  u_res;       // размер канваса, физические пиксели
uniform float u_dpr;       // физических пикселей в одном CSS-пикселе
uniform vec2  u_center;    // центр планеты (ось Y направлена вниз)
uniform float u_radius;
uniform vec2  u_glow;      // центр свечения за заголовком
uniform vec2  u_glowSize;
uniform float u_time;
uniform vec4  u_meteor;    // xy — голова, z — яркость, w — угол полёта
uniform float u_style;     // поверхность: 0 — чистая атмосфера, 1 — газовый гигант, 2 — облака

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

/* Огни городов: трёхмерная сетка с шагом ~9 CSS-пикселей, в каждой ячейке одна точка.
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

  /* Поверхность — три варианта на выбор (u_style):
     land  — маска суши, на ней горят ночные огни;
     cover — облачность, гасит огни и чуть светится ночью. */
  float land = 0.0, cover = 0.0;
  vec3 surface;

  if (u_style < 0.5) {
    /* 0. Чистая атмосфера: ровный цвет, вращение читается только по огням и звёздам */
    land = smoothstep(0.50, 0.57, fbm(q * 5.0 + 4.0));
    surface = vec3(0.07, 0.055, 0.19);

  } else if (u_style < 1.5) {
    /* 1. Газовый гигант: полосы по широте. Сама широта при вращении не меняется,
          поэтому движение видно по турбулентности, которая сносит края полос. */
    float lat = dot(n, AXIS) + 0.035 * (noise(q * 6.0) - 0.5) + 0.012 * (noise(q * 19.0) - 0.5);
    float wide = noise(vec3(lat * 9.0, 1.7, 4.2));
    float fine = 0.5 + 0.5 * sin(lat * 70.0 + 5.0 * wide);
    float band = mix(wide, fine, 0.45);
    surface = mix(vec3(0.05, 0.035, 0.16), vec3(0.40, 0.30, 0.62), smoothstep(0.25, 0.80, band));
    surface = mix(surface, vec3(0.62, 0.42, 0.72), 0.5 * smoothstep(0.70, 0.92, wide));

  } else {
    /* 2. Облака: искажение координат шумом даёт волокна, узкий порог — резкие края */
    land = smoothstep(0.50, 0.57, fbm(q * 5.0 + 4.0));
    vec3 cq = q * 15.0 + vec3(0.0, u_time * 0.0015, 20.0);
    cq += 0.8 * (vec3(noise(cq * 0.6 + 11.0), noise(cq * 0.6 + 23.0), noise(cq * 0.6 + 37.0)) - 0.5);
    float systems = smoothstep(0.42, 0.62, fbm(q * 4.0 + 31.0));          // крупные облачные системы
    cover = systems * smoothstep(0.44, 0.66, fbm(cq)) * (0.6 + 0.4 * noise(cq * 5.0));
    surface = mix(vec3(0.035, 0.03, 0.13), vec3(0.12, 0.085, 0.24), land);
    surface = mix(surface, vec3(0.55, 0.50, 0.82), cover * 0.9);
  }

  /* Дневная сторона — узкий серп у кромки: солнце стоит сразу за горизонтом */
  float ndl = dot(n, SUN);
  float day = smoothstep(-0.03, 0.12, ndl);
  vec3 dayCol = surface * (0.40 + 2.4 * max(ndl, 0.0));

  /* Ночная сторона: едва заметная поверхность и огни городов — только на суше и не под облаками */
  vec3 nightCol = SPACE + surface * 0.06;
  if (land > 0.0) {
    float cluster = smoothstep(0.46, 0.62, fbm(q * 26.0 + 9.0));
    float city    = land * cluster * (1.0 - cover) * smoothstep(0.06, 0.30, n.z) * cityDots(q);
    vec3 cityTint = mix(vec3(0.77, 0.69, 1.0), vec3(1.0, 0.80, 0.55), step(0.45, noise(q * 40.0 + 2.0)));
    nightCol += cityTint * city * 0.8;
  }

  vec3 col = mix(nightCol, dayCol, day);

  /* Атмосфера изнутри: рассеяние усиливается к кромке, где луч идёт сквозь толщу воздуха */
  float rim = 1.0 - n.z;
  col += (VIOLET * 0.55 * pow(rim, 5.0) + vec3(0.9, 0.85, 1.0) * 0.8 * pow(rim, 18.0)) * sunSide;
  return col;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  float fade = smoothstep(0.6, 1.0, p.y / u_res.y);      // низ канваса растворяется в фоне страницы
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

  const cv = document.getElementById('stars');
  const page = document.querySelector('.page');
  const limb = document.querySelector('.limb');
  const hero = document.querySelector('.hero');
  const MAX_DPR = 1.5;                                     // шейдер тяжёлый, звёздам хватает и 1.5×

  let gl = null, U = null;
  let scale = 1, geo = null;
  let raf = 0, last = 0, onScreen = true, enabled = true, meteor = null, nextMeteor = 5;

  /* Вариант поверхности планеты: кнопки #surface в подвале, выбор запоминается */
  let style = 1;
  try { const saved = localStorage.getItem('sky-surface'); if (saved !== null && [0, 1, 2].includes(Number(saved))) style = Number(saved); } catch {}
  const surfaceBar = document.getElementById('surface');
  const paintSurface = () => {
    for (const b of surfaceBar.querySelectorAll('button')) b.setAttribute('aria-pressed', Number(b.dataset.style) === style);
  };
  surfaceBar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    style = Number(b.dataset.style);
    try { localStorage.setItem('sky-surface', String(style)); } catch {}
    paintSurface();
    draw(performance.now() / 1000);   // при выключенной анимации кадр иначе не обновится
  });
  paintSurface();

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  function init() {
    gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return false;
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      U = {};
      for (const name of ['res', 'dpr', 'center', 'radius', 'glow', 'glowSize', 'time', 'meteor', 'style'])
        U[name] = gl.getUniformLocation(prog, 'u_' + name);
    } catch (err) {
      console.error('Sky: шейдер не собрался, остаётся CSS-фон.', err);
      gl = null;
      return false;
    }
    return true;
  }

  function build() {
    if (!gl) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = cv.width / w;
    gl.viewport(0, 0, cv.width, cv.height);

    const c = cv.getBoundingClientRect(), l = limb.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const R = l.width / 2;
    geo = { w, h, R, cx: l.left - c.left + R, cy: l.top - c.top + R };

    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.dpr, scale);
    gl.uniform2f(U.center, geo.cx * scale, geo.cy * scale);
    gl.uniform1f(U.radius, R * scale);
    gl.uniform2f(U.glow, geo.cx * scale, (hr.top - c.top + 130) * scale);
    gl.uniform2f(U.glowSize, Math.min(920, w * 1.3) / 2 * 1.1 * scale, 270 * 1.1 * scale);
    draw(performance.now() / 1000);
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
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.style, style);
    gl.uniform4fv(U.meteor, stepMeteor(t));
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

  let pending = 0;
  const rebuild = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(build); };

  function boot() {
    if (!init()) return;
    page.classList.add('webgl');
    build();
    sync();
  }

  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; gl = null; });
  cv.addEventListener('webglcontextrestored', boot);
  const ro = new ResizeObserver(rebuild);
  ro.observe(hero);
  ro.observe(cv);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(cv);

  return {
    start(on) { enabled = on; boot(); },
    set(on) { enabled = on; meteor = null; sync(); },
  };
})();
