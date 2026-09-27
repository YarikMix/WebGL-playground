/* Данные-примеры и мелкие помощники интерфейса. */
import { initialCells } from './notebook-cells';
import type { CodeToken, Notebook } from './types';

export const initialNotebooks: Notebook[] = [
  { id: 1, title: 'Fine-tune ruBERT на отзывах', cells: initialCells(21),
    code: 'from transformers import Trainer\n\ntrainer = Trainer(model=model, args=args,\n    train_dataset=ds["train"])\ntrainer.train()  # эпоха 2 из 3' },
  { id: 2, title: 'Классификация галактик · CNN', cells: initialCells(34),
    code: 'import torch\nfrom torchvision import models\n\nmodel = models.resnet34(weights="DEFAULT")\nmodel.fc = torch.nn.Linear(512, 10)' },
  { id: 3, title: 'EDA: логи рантаймов за август', cells: initialCells(27),
    code: 'import polars as pl\n\nlogs = pl.scan_parquet("runtime_logs/*.parquet")\nlogs.group_by("gpu").agg(\n    pl.col("uptime_s").mean())' },
  { id: 4, title: 'Лабораторная 3 — градиентный спуск', cells: initialCells(15),
    code: 'def step(w, grad, lr=0.01):\n    return w - lr * grad\n\nfor epoch in range(200):\n    w = step(w, loss_grad(w, X, y))' },
  { id: 5, title: 'Бенчмарк: pandas vs polars', cells: initialCells(12),
    code: '%%timeit\ndf.groupby("user_id")["amount"].sum()\n\n# polars: 41 ms, pandas: 1.9 s\nresults.append(("groupby", 41, 1900))' },
  { id: 6, title: 'Черновик без названия', cells: initialCells(3),
    code: '# TODO: проверить гипотезу про выбросы\nimport pandas as pd\n\ndf = pd.read_csv("sample.csv")\ndf.describe()' },
];

export const plural = (n: number, one: string, few: string, many: string): string => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};

const TOKEN = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|as|def|for|in|return|with|if|else|class|lambda|True|False|None)\b|\b(\d+(?:\.\d+)?)\b/gm;

/* Код → список кусков для подсветки */
export function tokenize(code: string): CodeToken[] {
  const parts: CodeToken[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index > last) parts.push({ text: code.slice(last, m.index) });
    parts.push({ text: m[0], cls: m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n' });
    last = m.index + m[0].length;
  }
  if (last < code.length) parts.push({ text: code.slice(last) });
  return parts;
}
