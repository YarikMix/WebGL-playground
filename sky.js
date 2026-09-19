/* Небо на Canvas 2D, без библиотек.
   Планета — CSS-диск (.limb). Звёзды и огни на её поверхности живут в полярных координатах
   вокруг центра планеты; поворот угла даёт и дрейф неба, и вращение планеты.
   30 кадров/с, пауза вне экрана и в фоновой вкладке, статичный кадр при выключенной анимации. */
window.Sky = (() => {
  const cv = document.getElementById('stars'), ctx = cv.getContext('2d');
  const limb = document.querySelector('.limb');
  const COLORS = ['#ffffff', '#c4b0ff', '#ffd9a8'];
  let w = 0, h = 0, cx = 0, cy = 0, R = 0, stars = [], glints = [];
  let raf = 0, last = 0, onScreen = true, enabled = true, meteor = null, nextMeteor = 5;

  function build() {
    w = cv.clientWidth; h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = cv.getBoundingClientRect(), l = limb.getBoundingClientRect();
    R = l.width / 2; cx = l.left - c.left + R; cy = l.top - c.top + R;

    let seed = 20260920;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    const rMax = Math.hypot(Math.max(cx, w - cx), cy);
    const r0 = (R + 3) ** 2, span = rMax ** 2 - r0;
    stars = Array.from({ length: Math.round(Math.PI * span / 4600) }, () => {
      const big = rnd() > .94;
      return { r: Math.sqrt(r0 + rnd() * span), a: rnd() * Math.PI * 2, big, size: big ? 1.2 : .9 + rnd() * .8,
        alpha: big ? .95 : .25 + rnd() * .5, tw: .6 + rnd() * 1.8, ph: rnd() * 6.28, color: COLORS[rnd() > .75 ? 1 : 0] };
    });

    glints = [];
    const clusters = Math.round(R / 14);
    for (let i = 0; i < clusters; i++) {
      const at = rnd() * Math.PI * 2, n = 4 + Math.floor(rnd() * 14), spread = (20 + rnd() * 90) / R;
      for (let j = 0; j < n; j++) {
        const depth = 4 + rnd() * rnd() * 90;
        glints.push({ r: R - depth, a: at + (rnd() - .5) * spread, size: .8 + rnd() * .9,
          alpha: (.25 + rnd() * .6) * (1 - depth / 110), tw: 1 + rnd() * 2, ph: rnd() * 6.28, color: COLORS[rnd() > .7 ? 2 : 1] });
      }
    }
    draw(performance.now() / 1000);
  }

  function plot(list, rot, t) {
    for (const p of list) {
      const a = p.a + rot, x = cx + p.r * Math.sin(a);
      if (x < -2 || x > w + 2) continue;
      const y = cy - p.r * Math.cos(a);
      if (y < -2 || y > h) continue;
      const fade = y < h * .45 ? 1 : 1 - (y - h * .45) / (h * .55);
      ctx.globalAlpha = p.alpha * fade * (.72 + .28 * Math.sin(t * p.tw + p.ph));
      ctx.fillStyle = p.color;
      if (p.big) { ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.2832); ctx.fill(); }
      else ctx.fillRect(x, y, p.size, p.size);
    }
  }

  function drawMeteor(t) {
    if (!meteor) {
      if (t < nextMeteor) return;
      meteor = { t0: t, x: w * (.1 + Math.random() * .6), y: 20 + Math.random() * 140, ang: .35 + Math.random() * .3 };
    }
    const p = (t - meteor.t0) / .9;
    const x = meteor.x + Math.cos(meteor.ang) * 640 * p, y = meteor.y + Math.sin(meteor.ang) * 640 * p;
    if (p >= 1 || Math.hypot(x - cx, y - cy) < R + 12) { meteor = null; nextMeteor = t + 9 + Math.random() * 14; return; }
    const tx = x - Math.cos(meteor.ang) * 130, ty = y - Math.sin(meteor.ang) * 130;
    const g = ctx.createLinearGradient(tx, ty, x, y);
    g.addColorStop(0, 'rgba(196,176,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)');
    ctx.globalAlpha = Math.sin(Math.PI * p);
    ctx.strokeStyle = g; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    plot(stars, t * .0035, t);
    plot(glints, t * .0085, t);
    if (enabled) drawMeteor(t);
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;
    last = now;
    draw(now / 1000);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0;
    if (enabled && onScreen) raf = requestAnimationFrame(frame);
  }

  let pending = 0;
  const rebuild = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(build); };
  const ro = new ResizeObserver(rebuild);
  ro.observe(document.querySelector('.hero'));
  ro.observe(cv);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(cv);

  return {
    start(on) { enabled = on; build(); sync(); },
    set(on) { enabled = on; meteor = null; sync(); },
  };
})();
