/* Данные-примеры и мелкие помощники интерфейса. */

export const initialNotebooks = [
  { id: 1, title: 'Fine-tune ruBERT на отзывах', cells: 21, edited: '3 мин назад', run: '38 мин', accel: 'A100',
    code: 'from transformers import Trainer\n\ntrainer = Trainer(model=model, args=args,\n    train_dataset=ds["train"])\ntrainer.train()  # эпоха 2 из 3' },
  { id: 2, title: 'Классификация галактик · CNN', cells: 34, edited: '12 мин назад', run: '1 ч 12 мин', accel: 'T4',
    code: 'import torch\nfrom torchvision import models\n\nmodel = models.resnet34(weights="DEFAULT")\nmodel.fc = torch.nn.Linear(512, 10)' },
  { id: 3, title: 'Кривые блеска экзопланет · Kepler', cells: 18, edited: 'вчера', accel: 'CPU', owner: 'Ани К.',
    code: 'import lightkurve as lk\n\nlc = lk.search_lightcurve("Kepler-10").download()\nflat = lc.flatten(window_length=401)\nflat.fold(period=0.8375).scatter()' },
  { id: 4, title: 'EDA: логи рантаймов за август', cells: 27, edited: '2 дня назад', accel: 'CPU',
    code: 'import polars as pl\n\nlogs = pl.scan_parquet("runtime_logs/*.parquet")\nlogs.group_by("gpu").agg(\n    pl.col("uptime_s").mean())' },
  { id: 5, title: 'Лабораторная 3 — градиентный спуск', cells: 15, edited: '4 дня назад', accel: 'CPU',
    code: 'def step(w, grad, lr=0.01):\n    return w - lr * grad\n\nfor epoch in range(200):\n    w = step(w, loss_grad(w, X, y))' },
  { id: 6, title: 'Орбиты спутников Юпитера', cells: 9, edited: 'неделю назад', accel: 'CPU', owner: 'Тимура Р.',
    code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\nmoons = {"Io": 1.77, "Europa": 3.55}\nt = np.linspace(0, 16, 2000)  # сутки' },
  { id: 7, title: 'Бенчмарк: pandas vs polars', cells: 12, edited: '2 недели назад', accel: 'CPU',
    code: '%%timeit\ndf.groupby("user_id")["amount"].sum()\n\n# polars: 41 ms, pandas: 1.9 s\nresults.append(("groupby", 41, 1900))' },
  { id: 8, title: 'Черновик без названия', cells: 3, edited: 'месяц назад', accel: 'CPU',
    code: '# TODO: проверить гипотезу про выбросы\nimport pandas as pd\n\ndf = pd.read_csv("sample.csv")\ndf.describe()' },
];

export const filters = [
  { id: 'all', label: 'Все', test: () => true },
  { id: 'mine', label: 'Мои', test: n => !n.owner },
  { id: 'shared', label: 'Доступные мне', test: n => !!n.owner },
  { id: 'running', label: 'Работают', test: n => !!n.run },
];

export const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};

const TOKEN = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|as|def|for|in|return|with|if|else|class|lambda|True|False|None)\b|\b(\d+(?:\.\d+)?)\b/gm;

/* Код → список кусков { text, cls } для подсветки: c — комментарий, s — строка, k — ключевое слово, n — число */
export function tokenize(code) {
  const parts = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index > last) parts.push({ text: code.slice(last, m.index) });
    parts.push({ text: m[0], cls: m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n' });
    last = m.index + m[0].length;
  }
  if (last < code.length) parts.push({ text: code.slice(last) });
  return parts;
}

/* Настройка, которая переживает перезагрузку; хранилище может быть недоступно */
export function loadSetting(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return allowed.includes(saved) ? saved : fallback;
  } catch { return fallback; }
}
export function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
