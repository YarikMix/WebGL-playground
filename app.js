/* Интерфейс главной: данные-примеры, фильтры, поиск, карточки. Фон живёт в sky.js. */
(() => {
  const notebooks = [
    { title: 'Fine-tune ruBERT на отзывах', cells: 21, edited: '3 мин назад', run: '38 мин', accel: 'A100',
      code: 'from transformers import Trainer\n\ntrainer = Trainer(model=model, args=args,\n    train_dataset=ds["train"])\ntrainer.train()  # эпоха 2 из 3' },
    { title: 'Классификация галактик · CNN', cells: 34, edited: '12 мин назад', run: '1 ч 12 мин', accel: 'T4',
      code: 'import torch\nfrom torchvision import models\n\nmodel = models.resnet34(weights="DEFAULT")\nmodel.fc = torch.nn.Linear(512, 10)' },
    { title: 'Кривые блеска экзопланет · Kepler', cells: 18, edited: 'вчера', accel: 'CPU', owner: 'Ани К.',
      code: 'import lightkurve as lk\n\nlc = lk.search_lightcurve("Kepler-10").download()\nflat = lc.flatten(window_length=401)\nflat.fold(period=0.8375).scatter()' },
    { title: 'EDA: логи рантаймов за август', cells: 27, edited: '2 дня назад', accel: 'CPU',
      code: 'import polars as pl\n\nlogs = pl.scan_parquet("runtime_logs/*.parquet")\nlogs.group_by("gpu").agg(\n    pl.col("uptime_s").mean())' },
    { title: 'Лабораторная 3 — градиентный спуск', cells: 15, edited: '4 дня назад', accel: 'CPU',
      code: 'def step(w, grad, lr=0.01):\n    return w - lr * grad\n\nfor epoch in range(200):\n    w = step(w, loss_grad(w, X, y))' },
    { title: 'Орбиты спутников Юпитера', cells: 9, edited: 'неделю назад', accel: 'CPU', owner: 'Тимура Р.',
      code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\nmoons = {"Io": 1.77, "Europa": 3.55}\nt = np.linspace(0, 16, 2000)  # сутки' },
    { title: 'Бенчмарк: pandas vs polars', cells: 12, edited: '2 недели назад', accel: 'CPU',
      code: '%%timeit\ndf.groupby("user_id")["amount"].sum()\n\n# polars: 41 ms, pandas: 1.9 s\nresults.append(("groupby", 41, 1900))' },
    { title: 'Черновик без названия', cells: 3, edited: 'месяц назад', accel: 'CPU',
      code: '# TODO: проверить гипотезу про выбросы\nimport pandas as pd\n\ndf = pd.read_csv("sample.csv")\ndf.describe()' },
  ];

  const filters = [
    { id: 'all', label: 'Все', test: () => true },
    { id: 'mine', label: 'Мои', test: n => !n.owner },
    { id: 'shared', label: 'Доступные мне', test: n => !!n.owner },
    { id: 'running', label: 'Работают', test: n => !!n.run },
  ];
  let active = 'all';
  let query = '';

  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const plural = (n, one, few, many) => {
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  };
  const TOKEN = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|as|def|for|in|return|with|if|else|class|lambda|True|False|None)\b|\b(\d+(?:\.\d+)?)\b/gm;
  const highlight = code => esc(code).replace(TOKEN, (m, c, s, k) =>
    `<span class="${c ? 'c' : s ? 's' : k ? 'k' : 'n'}">${m}</span>`);

  function cardHtml(n) {
    const status = n.run
      ? `<span class="tag run"><i class="dot"></i>Работает · ${n.run}</span>`
      : `<span class="tag"><i class="dot"></i>Остановлен</span>`;
    const owner = n.owner ? `<span class="tag">от ${esc(n.owner)}</span>` : '';
    return `<a class="card" href="#">
      <div class="peek" aria-hidden="true">${highlight(n.code)}</div>
      <div class="card-body">
        <h3>${esc(n.title)}</h3>
        <p class="meta">${n.cells} ${plural(n.cells, 'ячейка', 'ячейки', 'ячеек')} · изменён ${n.edited}</p>
        <div class="tags">${status}<span class="tag accel">${n.accel}</span>${owner}</div>
      </div>
    </a>`;
  }

  function render() {
    const running = notebooks.filter(n => n.run).length;
    $('eyebrow').textContent = running
      ? `${running} ${plural(running, 'рантайм', 'рантайма', 'рантаймов')} на орбите`
      : 'Все рантаймы остановлены';
    $('sub').textContent = `${notebooks.length} ${plural(notebooks.length, 'блокнот', 'блокнота', 'блокнотов')} · `
      + `${running} ${plural(running, 'рантайм работает', 'рантайма работают', 'рантаймов работают')} · осталось 11,5 GPU-часа`;

    $('chips').innerHTML = filters.map(f =>
      `<button class="chip" type="button" id="chip-${f.id}" data-id="${f.id}" aria-pressed="${f.id === active}">${f.label}<span>${notebooks.filter(f.test).length}</span></button>`
    ).join('');

    const test = filters.find(f => f.id === active).test;
    const q = query.trim().toLowerCase();
    const shown = notebooks.filter(n => test(n) && (!q || n.title.toLowerCase().includes(q)));
    $('grid').innerHTML = shown.map(cardHtml).join('');
    $('grid').hidden = !shown.length;
    $('empty').hidden = !!shown.length;
  }

  let toastTimer;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  $('chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    active = chip.dataset.id;
    render();
    $('chip-' + active).focus();
  });
  $('search').addEventListener('input', e => { query = e.target.value; render(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== $('search')) { e.preventDefault(); $('search').focus(); }
  });
  $('create').addEventListener('click', () => {
    notebooks.unshift({ title: 'Без названия', cells: 1, edited: 'только что', accel: 'CPU', code: '# Первая ячейка. Shift+Enter — запустить\n' });
    active = 'all'; query = ''; $('search').value = '';
    render();
    toast('Блокнот создан');
  });
  $('upload').addEventListener('click', () => toast('В прототипе загрузка файлов не подключена'));
  $('avatar').addEventListener('click', () => toast('В прототипе профиль не подключён'));
  $('grid').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) { e.preventDefault(); toast('В прототипе редактор не подключён'); }
  });
  $('grid').addEventListener('pointermove', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* Анимация фона: по умолчанию следует системной настройке, выбор пользователя запоминается */
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { const saved = localStorage.getItem('sky-motion'); if (saved !== null) motion = saved === '1'; } catch {}
  const motionBtn = $('motion');
  const paintMotion = () => { motionBtn.setAttribute('aria-pressed', motion); motionBtn.lastElementChild.textContent = motion ? 'вкл' : 'выкл'; };
  motionBtn.addEventListener('click', () => {
    motion = !motion;
    try { localStorage.setItem('sky-motion', motion ? '1' : '0'); } catch {}
    paintMotion();
    Sky.set(motion);
  });

  render();
  paintMotion();
  Sky.start(motion);
})();
