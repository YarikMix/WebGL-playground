# Экран блокнота, маршруты и вход по логину — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Третий экран прототипа — открытый блокнот с добавлением и удалением ячеек, настоящие хеш-адреса на TanStack Router, вход по логину и публикация приложения в корне сайта.

**Architecture:** `App.tsx` становится компонентом корневого маршрута TanStack Router: держит общую сцену `<Sky>`, блокноты, тост и отдаёт их экранам через `ShellContext`. Сессия переезжает во внешний стор, который синхронно читают `beforeLoad`-охранники маршрутов. На экране блокнота раскладка сцены отдаёт `planet: null`, и сцена рисует только звёзды.

**Tech Stack:** React 19.2, TypeScript 7 (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`), Vite 8, three.js + @react-three/fiber + drei, `@tanstack/react-router` 1.x, Bun 1.4 (`bun test`).

**Spec:** `docs/superpowers/specs/2026-09-27-notebook-editor-design.md` — читать целиком перед любой задачей.

## Global Constraints

- Рабочая копия: `F:\Github\2026_H2\WebGL-playground-notebook`, ветка `feat/notebook-editor` (от `origin/r3f`). Основную папку `F:\Github\2026_H2\WebGL-playground` (ветка `webgpu` с незакоммиченной работой) **не трогать**.
- Пакетный менеджер — `bun`. Новые зависимости только: `@tanstack/react-router` (dependencies), `@types/bun` (devDependencies).
- Сборка — `bun run build` (проверка типов + vite) — должна проходить после каждой задачи. Тесты — `bun test`.
- Комментарии в коде — по-русски, в стиле окружающего кода: объясняют «почему», а не «что».
- Коммиты — по-русски, conventional (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`), в конце сообщения строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Тексты интерфейса — дословно из спеки (§5.2 сообщения валидации, §6.2 плейсхолдеры, тосты).
- Хеш-история (`createHashHistory`); никаких путей без `#`.
- `prefers-reduced-motion` продолжает гасить движение; переключателя анимации и стекла в интерфейсе нет.

## Review Focus

1. **Вход и сразу переход.** После «Войти» охранник маршрута должен увидеть новую сессию в тот же тик — иначе возврат на форму. Закрыто стором сессии (Task 4), проверяется ручным пунктом 1–2 в Task 7.
2. **Глубокая ссылка без входа.** `#/notebook/3` без сессии → форма → после входа блокнот 3, а не список. Task 4 (redirect) + Task 7 п. 2.
3. **Мусорные адреса.** `#/notebook/abc`, `#/notebook/0`, `#/notebook/007`, `#/login?redirect=//evil.com`, `#/foo` — никаких белых экранов и выхода наружу. Юнит-тесты `route-params.test.ts` (Task 4) + `defaultNotFoundComponent`.
4. **Удаление последней/единственной ячейки и серия быстрых вставок.** Выбор и фокус не теряются, id не повторяются. Юнит-тесты `notebook-cells.test.ts` (Task 1) + фокус в Task 5.
5. **Старая сессия с почтой в localStorage** (у всех, кто уже заходил на прототип). Не должно падать — просто форма входа. Юнит-тест `session.test.ts` (Task 2).

---

## Файловая структура

| Файл | Ответственность | Задача |
|---|---|---|
| `tsconfig.json`, `tsconfig.test.json`, `package.json` | тесты на Bun с проверкой типов | 1 |
| `src/types.ts` | `CellKind`, `Cell` (1); nullable `planet`/`glow`, `SceneScreen`, без `CardsMode` (3); `Notebook.cells: Cell[]` (4) | 1, 3, 4 |
| `src/notebook-cells.ts` (+ `.test.ts`) | стартовые ячейки, вставка, удаление, позиция вставки | 1 |
| `src/session.ts` (+ `.test.ts`) | `{ login }`, инициалы | 2 |
| `src/auth/useAuthForm.ts` (+ `.test.ts`), `src/auth/AuthCard.tsx` | логин, повтор пароля, экспорт `validate` | 2 |
| `src/useSceneLayout.ts`, `src/sky/Sky.tsx`, `Stars.tsx`, `Meteor.tsx` | сцена без планеты | 3 |
| `src/components/Footer.tsx`, `src/data.ts` | подвал без переключателей, без `loadSetting` | 3 |
| `src/session-store.ts` | стор сессии + `useSession()` | 4 |
| `src/route-params.ts` (+ `.test.ts`) | `parseNotebookId`, `safeRedirect` | 4 |
| `src/shell.ts` | `ShellContext`, `useShell()` | 4 |
| `src/router.tsx`, `src/main.tsx`, `src/App.tsx` | маршруты и корень | 4 |
| `src/screens/Auth.tsx`, `Notebooks.tsx`, `src/components/TopBar.tsx`, `NotebookGrid.tsx` | экраны на `useShell()`, ссылки | 4 |
| `src/components/NotebookTags.tsx` | теги блокнота — общие для карточки и шапки блокнота | 5 |
| `src/screens/Notebook.tsx` | экран блокнота (заглушка в 4, полностью в 5) | 4, 5 |
| `src/notebook/NotebookHeader.tsx`, `Cell.tsx`, `InsertBar.tsx` | части экрана блокнота | 5 |
| `src/styles.css` | стили экрана блокнота | 5 |
| `.github/workflows/pages.yml`, `README.md` (во всех трёх ветках), `index.html` в `main`/`webgl` | деплой | 6 |

---

### Task 1: Тесты на Bun и модуль ячеек

**Files:**
- Modify: `package.json`, `tsconfig.json`
- Create: `tsconfig.test.json`, `src/notebook-cells.ts`, `src/notebook-cells.test.ts`
- Modify: `src/types.ts` (добавить типы в конец, ничего не удалять)

**Interfaces:**
- Produces:
  - `type CellKind = 'code' | 'text'`, `interface Cell { id: number; kind: CellKind }` в `src/types.ts`
  - `initialCells(count: number): Cell[]`
  - `insertCell(cells: readonly Cell[], index: number, kind: CellKind): { cells: Cell[]; id: number }`
  - `insertionIndex(cells: readonly Cell[], selectedId: number | null): number`
  - `removeCell(cells: readonly Cell[], id: number): { cells: Cell[]; nextSelected: number | null }`

- [ ] **Step 1: Зависимость и скрипты**

```bash
cd F:/Github/2026_H2/WebGL-playground-notebook
bun add -d @types/bun
```

В `package.json` → `scripts` заменить на:

```json
"scripts": {
  "dev": "vite",
  "test": "bun test",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
  "build": "bun run typecheck && vite build",
  "preview": "vite preview"
}
```

- [ ] **Step 2: Раздельная проверка типов для тестов**

В `tsconfig.json` после `"include"` добавить исключение тестов — типы Bun (`bun:test`, глобалы) не должны протекать в код приложения, который работает в браузере:

```json
  "include": ["src", "vite.config.ts"],
  "exclude": ["src/**/*.test.ts"]
```

Создать `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vite/client", "bun"]
  },
  "include": ["src"],
  "exclude": []
}
```

- [ ] **Step 3: Типы ячейки**

В конец `src/types.ts`:

```ts
export type CellKind = 'code' | 'text';

/** Ячейка блокнота. Содержимого в модуле 1 нет — только плейсхолдер; поле source появится вместе с редактором */
export interface Cell {
  id: number;
  kind: CellKind;
}
```

- [ ] **Step 4: Написать падающие тесты**

`src/notebook-cells.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { initialCells, insertCell, insertionIndex, removeCell } from './notebook-cells';
import type { Cell } from './types';

const kinds = (cells: readonly Cell[]) => cells.map(c => c.kind);
const ids = (cells: readonly Cell[]) => cells.map(c => c.id);

describe('initialCells', () => {
  test('чередует текст и код, начиная с текста', () => {
    expect(kinds(initialCells(5))).toEqual(['text', 'code', 'text', 'code', 'text']);
  });
  test('ровно столько ячеек, сколько просили', () => {
    expect(initialCells(21)).toHaveLength(21);
    expect(initialCells(0)).toEqual([]);
  });
  test('id уникальны и между вызовами', () => {
    const all = [...ids(initialCells(10)), ...ids(initialCells(10))];
    expect(new Set(all).size).toBe(20);
  });
});

describe('insertCell', () => {
  const base = initialCells(3);
  test('в начало', () => {
    const { cells, id } = insertCell(base, 0, 'code');
    expect(cells[0]).toEqual({ id, kind: 'code' });
    expect(ids(cells.slice(1))).toEqual(ids(base));
  });
  test('в середину', () => {
    const { cells, id } = insertCell(base, 2, 'text');
    expect(cells[2]?.id).toBe(id);
    expect(cells).toHaveLength(4);
  });
  test('в конец', () => {
    const { cells, id } = insertCell(base, 3, 'code');
    expect(cells.at(-1)?.id).toBe(id);
  });
  test('индекс за границами прижимается к краю', () => {
    expect(insertCell(base, 99, 'code').cells.at(-1)?.kind).toBe('code');
    expect(insertCell(base, -5, 'code').cells[0]?.kind).toBe('code');
  });
  test('не мутирует исходный массив', () => {
    const before = ids(base);
    insertCell(base, 1, 'code');
    expect(ids(base)).toEqual(before);
  });
  test('серия вставок даёт уникальные id', () => {
    let cells: Cell[] = [];
    for (let i = 0; i < 50; i++) cells = insertCell(cells, 0, 'code').cells;
    expect(new Set(ids(cells)).size).toBe(50);
  });
});

describe('insertionIndex', () => {
  const base = initialCells(4);
  test('после выбранной', () => {
    expect(insertionIndex(base, base[1]!.id)).toBe(2);
    expect(insertionIndex(base, base[3]!.id)).toBe(4);
  });
  test('без выбора — в конец', () => {
    expect(insertionIndex(base, null)).toBe(4);
  });
  test('выбранной уже нет — в конец', () => {
    expect(insertionIndex(base, -1)).toBe(4);
  });
});

describe('removeCell', () => {
  const base = initialCells(3);
  test('первая: выбор переходит на следующую', () => {
    const { cells, nextSelected } = removeCell(base, base[0]!.id);
    expect(ids(cells)).toEqual([base[1]!.id, base[2]!.id]);
    expect(nextSelected).toBe(base[1]!.id);
  });
  test('средняя: выбор переходит на следующую', () => {
    expect(removeCell(base, base[1]!.id).nextSelected).toBe(base[2]!.id);
  });
  test('последняя: выбор переходит на предыдущую', () => {
    expect(removeCell(base, base[2]!.id).nextSelected).toBe(base[1]!.id);
  });
  test('единственная: пусто и выбора нет', () => {
    const one = initialCells(1);
    expect(removeCell(one, one[0]!.id)).toEqual({ cells: [], nextSelected: null });
  });
  test('несуществующий id ничего не меняет', () => {
    const { cells, nextSelected } = removeCell(base, -1);
    expect(ids(cells)).toEqual(ids(base));
    expect(nextSelected).toBeNull();
  });
});
```

- [ ] **Step 5: Убедиться, что тесты падают**

Run: `bun test src/notebook-cells.test.ts`
Expected: FAIL — `Cannot find module './notebook-cells'`.

- [ ] **Step 6: Реализация**

`src/notebook-cells.ts`:

```ts
/* Операции над ячейками блокнота — чистые функции: экран отдаёт текущий массив и получает новый.
   Состояние живёт в корне (App), поэтому здесь нет ни React, ни мутаций. */
import type { Cell, CellKind } from './types';

/* Счётчик модуля, а не Date.now(): две вставки в одну миллисекунду (двойной клик, серия в тестах)
   получили бы один id, и React перепутал бы ячейки. Уникальность нужна только в пределах вкладки —
   ячейки не переживают перезагрузку. */
let nextId = 1;
const newCell = (kind: CellKind): Cell => ({ id: nextId++, kind });

/** Стартовое содержимое блокнота: count ячеек, чередуя текст и код, начиная с текста */
export function initialCells(count: number): Cell[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => newCell(i % 2 === 0 ? 'text' : 'code'));
}

/** Вставить ячейку в позицию index: 0 — в начало, cells.length — в конец. Отдаёт и id новой ячейки,
    чтобы экран сразу сделал её выбранной */
export function insertCell(cells: readonly Cell[], index: number, kind: CellKind): { cells: Cell[]; id: number } {
  const at = Math.min(Math.max(index, 0), cells.length);
  const cell = newCell(kind);
  return { cells: [...cells.slice(0, at), cell, ...cells.slice(at)], id: cell.id };
}

/** Куда вставляют кнопки в шапке: после выбранной ячейки, а без выбора (или если её уже нет) — в конец */
export function insertionIndex(cells: readonly Cell[], selectedId: number | null): number {
  const i = selectedId === null ? -1 : cells.findIndex(c => c.id === selectedId);
  return i === -1 ? cells.length : i + 1;
}

/** Удалить ячейку. Выбор переходит на следующую, а если её нет — на предыдущую: так фокус
    остаётся рядом с местом удаления, а не падает на body */
export function removeCell(cells: readonly Cell[], id: number): { cells: Cell[]; nextSelected: number | null } {
  const i = cells.findIndex(c => c.id === id);
  if (i === -1) return { cells: [...cells], nextSelected: null };
  const rest = [...cells.slice(0, i), ...cells.slice(i + 1)];
  const neighbour = rest[i] ?? rest[i - 1];
  return { cells: rest, nextSelected: neighbour ? neighbour.id : null };
}
```

- [ ] **Step 7: Тесты и сборка проходят**

Run: `bun test` → Expected: все тесты PASS.
Run: `bun run build` → Expected: без ошибок (если `tsc -p tsconfig.test.json` не находит `bun:test` — проверить, что `@types/bun` установлен и в `types` указано именно `"bun"`).

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock tsconfig.json tsconfig.test.json src/types.ts src/notebook-cells.ts src/notebook-cells.test.ts
git commit -m "feat: модуль ячеек блокнота и тесты на bun test"
```

---

### Task 2: Вход по логину и регистрация с повтором пароля

**Files:**
- Modify: `src/session.ts`, `src/auth/useAuthForm.ts`, `src/auth/AuthCard.tsx`
- Create: `src/session.test.ts`, `src/auth/useAuthForm.test.ts`

**Interfaces:**
- Produces:
  - `interface Session { login: string }`; `loadSession(): Session | null`; `saveSession(s)`; `clearSession()`; `initials(s: Session): string` — сигнатуры те же, меняется форма `Session`
  - `export type Field = 'login' | 'password' | 'confirm'`
  - `export function validate(mode: AuthMode, values: Record<Field, string>): Partial<Record<Field, string>>`
  - `useAuthForm(mode, onDone)` — возвращает то же, что сейчас (`values, errors, busy, setValue, blurField, reset, submit`)

- [ ] **Step 1: Падающие тесты сессии**

`src/session.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'bun:test';
import { clearSession, initials, loadSession, saveSession } from './session';

/* В Bun нет браузерного localStorage — подкладываем простую замену на Map */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } satisfies Storage,
});
const KEY = 'cellestial-session';

beforeEach(() => store.clear());

describe('session', () => {
  test('сохраняется и читается', () => {
    saveSession({ login: 'yarik' });
    expect(loadSession()).toEqual({ login: 'yarik' });
  });
  test('старая сессия с почтой не принимается', () => {
    store.set(KEY, JSON.stringify({ email: 'a@b.ru', name: 'Аня' }));
    expect(loadSession()).toBeNull();
  });
  test('битый JSON, пустой логин, не объект — null', () => {
    store.set(KEY, '{oops');
    expect(loadSession()).toBeNull();
    store.set(KEY, JSON.stringify({ login: '' }));
    expect(loadSession()).toBeNull();
    store.set(KEY, JSON.stringify('yarik'));
    expect(loadSession()).toBeNull();
  });
  test('clearSession стирает', () => {
    saveSession({ login: 'yarik' });
    clearSession();
    expect(loadSession()).toBeNull();
  });
  test('инициалы — первая буква логина заглавной', () => {
    expect(initials({ login: 'yarik' })).toBe('Y');
    expect(initials({ login: '_dev' })).toBe('_');
  });
});
```

- [ ] **Step 2: Падающие тесты валидации**

`src/auth/useAuthForm.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { validate } from './useAuthForm';

const ok = { login: 'yarik', password: '12345678', confirm: '12345678' };

describe('validate: логин', () => {
  test('пустой', () => expect(validate('login', { ...ok, login: '  ' }).login).toBe('Введите логин'));
  const RULE = 'От 3 до 32 символов: a–z, 0–9, _ . -';
  test('2 символа', () => expect(validate('login', { ...ok, login: 'ab' }).login).toBe(RULE));
  test('33 символа', () => expect(validate('login', { ...ok, login: 'a'.repeat(33) }).login).toBe(RULE));
  test('ровно 3 и ровно 32 — можно', () => {
    expect(validate('login', { ...ok, login: 'abc' }).login).toBeUndefined();
    expect(validate('login', { ...ok, login: 'a'.repeat(32) }).login).toBeUndefined();
  });
  test('заглавные не приводятся молча', () => expect(validate('login', { ...ok, login: 'Yarik' }).login).toBe(RULE));
  test('кириллица и пробел внутри', () => {
    expect(validate('login', { ...ok, login: 'ярик' }).login).toBe(RULE);
    expect(validate('login', { ...ok, login: 'ya rik' }).login).toBe(RULE);
  });
  test('допустимые знаки _ . -', () => expect(validate('login', { ...ok, login: 'ya_r.i-k9' }).login).toBeUndefined());
  test('пробелы по краям обрезаются', () => expect(validate('login', { ...ok, login: '  yarik ' }).login).toBeUndefined());
});

describe('validate: пароль', () => {
  test('пустой', () => expect(validate('login', { ...ok, password: '' }).password).toBe('Введите пароль'));
  test('короче 8', () => expect(validate('login', { ...ok, password: '1234567' }).password).toBe('Нужно не меньше 8 символов'));
});

describe('validate: повтор пароля', () => {
  test('на входе не проверяется', () => expect(validate('login', { ...ok, confirm: '' }).confirm).toBeUndefined());
  test('пустой', () => expect(validate('signup', { ...ok, confirm: '' }).confirm).toBe('Повторите пароль'));
  test('не совпадает', () => expect(validate('signup', { ...ok, confirm: '87654321' }).confirm).toBe('Пароли не совпадают'));
  test('совпадает — ошибок нет вовсе', () => expect(validate('signup', ok)).toEqual({}));
});
```

- [ ] **Step 3: Убедиться, что падают**

Run: `bun test src/session.test.ts src/auth/useAuthForm.test.ts`
Expected: FAIL — `validate` не экспортирован, `loadSession` возвращает `null` для `{ login }`.

- [ ] **Step 4: `src/session.ts`**

Заменить интерфейс, разбор и инициалы (остальное — `KEY`, `saveSession`, `clearSession`, комментарий в шапке — без изменений):

```ts
export interface Session {
  login: string;
}
```

```ts
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    // сессия прошлой версии ({ email, name }) сюда не проходит — человек один раз увидит форму входа
    const { login } = parsed as Record<string, unknown>;
    return typeof login === 'string' && login ? { login } : null;
  } catch {
    return null;
  }
}
```

```ts
/** Инициалы для аватара: первая буква логина, как «Я» у Colab */
export function initials(session: Session): string {
  return (session.login[0] ?? '?').toUpperCase();
}
```

- [ ] **Step 5: `src/auth/useAuthForm.ts`**

Заменить всё выше `export function useAuthForm` на:

```ts
import { useState } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';

/* Логин, на котором регистрация отвечает «занят», — чтобы состояние серверной ошибки можно было
   показать руками, а не описать словами */
const TAKEN = 'taken';
export type Field = 'login' | 'password' | 'confirm';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const LOGIN = /^[a-z0-9_.-]{3,32}$/;

/* Заглавные буквы не приводятся к нижнему регистру молча: менять то, что человек ввёл в поле,
   которым он потом будет входить, хуже, чем сказать об этом (§5.2 спеки) */
export function validate(mode: AuthMode, values: Values): Errors {
  const errors: Errors = {};
  const login = values.login.trim();
  if (!login) errors.login = 'Введите логин';
  else if (!LOGIN.test(login)) errors.login = 'От 3 до 32 символов: a–z, 0–9, _ . -';
  if (!values.password) errors.password = 'Введите пароль';
  else if (values.password.length < 8) errors.password = 'Нужно не меньше 8 символов';
  if (mode === 'signup') {
    if (!values.confirm) errors.confirm = 'Повторите пароль';
    else if (values.confirm !== values.password) errors.confirm = 'Пароли не совпадают';
  }
  return errors;
}

const EMPTY: Values = { login: '', password: '', confirm: '' };
const ORDER: Field[] = ['login', 'password', 'confirm'];
```

В `submit` заменить хвост после задержки на:

```ts
    const login = values.login.trim();
    if (mode === 'signup' && login === TAKEN) {
      setErrors({ login: 'Этот логин уже занят. Войдите или выберите другой' });
      return 'login';
    }
    onDone({ login });
    return null;
```

- [ ] **Step 6: `src/auth/AuthCard.tsx`**

1. Рефы: вместо `nameRef`/`emailRef`/`passwordRef` —

```ts
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const fieldRef = (field: Field) => (field === 'login' ? loginRef : field === 'password' ? passwordRef : confirmRef);
```

2. В эффекте по `displayMode` фокус всегда на логин: `loginRef.current?.focus();` вместо тернарника с `nameRef`/`emailRef`.

3. Поля формы между `<h1>` и кнопкой отправки — заменить блок «Имя» (весь `{displayMode === 'signup' && (...)}`) и блок «Почта» на один блок логина; блок пароля оставить, поправив только `ref`; после него добавить повтор пароля:

```tsx
        <label className="field">
          <span>Логин</span>
          {/* autocapitalize/spellcheck: иначе телефон поднимет первую букву, и логин не пройдёт правило */}
          <input ref={loginRef} type="text" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={values.login}
            aria-invalid={errors.login ? true : undefined}
            aria-describedby={errors.login ? 'login-error' : undefined}
            onChange={e => setValue('login', e.target.value)} onBlur={() => blurField('login')} />
          {/* Рендерится всегда (не только при ошибке): у .field-error зарезервирована высота
              строки в CSS, чтобы появление ошибки не двигало форму и не роняло клик по кнопке
              переключения режима под ней на узком экране (см. Ruling 10, task-6-report.md).
              Пустой элемент с role="alert" не озвучивается скринридером. */}
          <span id="login-error" className="field-error" role="alert">{errors.login}</span>
        </label>
```

(блок «Пароль» — как был; кнопка показа остаётся только у него)

```tsx
        {displayMode === 'signup' && (
          <label className="field">
            <span>Повторите пароль</span>
            {/* Своей кнопки показа нет: переключатель у поля «Пароль» раскрывает оба поля,
                чтобы их можно было сверить глазами */}
            <input ref={confirmRef} type={shown ? 'text' : 'password'} name="confirm" autoComplete="new-password"
              value={values.confirm}
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? 'confirm-error' : undefined}
              onChange={e => setValue('confirm', e.target.value)} onBlur={() => blurField('confirm')} />
            <span id="confirm-error" className="field-error" role="alert">{errors.confirm}</span>
          </label>
        )}
```

Порядок полей: Логин → Пароль → (Повторите пароль). В регистрации полей по-прежнему три — высота карточки не меняется.

- [ ] **Step 7: Тесты и сборка**

Run: `bun test` → все PASS.
Run: `bun run build` → без ошибок. `grep -rn "email\|nameRef" src/` → ничего, кроме, возможно, комментариев истории.

- [ ] **Step 8: Проверить форму глазами**

Run: `bun run dev`, открыть выданный адрес. Вход: пустая отправка → «Введите логин», «Введите пароль»; `Yarik` → правило; `yarik` + `12345678` → список. Выйти через аватар. Регистрация: повтор `1` → «Пароли не совпадают»; кнопка-глаз раскрывает оба поля; логин `taken` → «Этот логин уже занят…». Аватар — `Y`.

- [ ] **Step 9: Commit**

```bash
git add src/session.ts src/session.test.ts src/auth/useAuthForm.ts src/auth/useAuthForm.test.ts src/auth/AuthCard.tsx
git commit -m "feat: вход по логину, регистрация с повтором пароля"
```

---

### Task 3: Сцена без планеты, всегда стекло и анимация

**Files:**
- Modify: `src/types.ts`, `src/useSceneLayout.ts`, `src/sky/Sky.tsx`, `src/sky/Stars.tsx`, `src/sky/Meteor.tsx`, `src/App.tsx`, `src/screens/Notebooks.tsx`, `src/components/Footer.tsx`, `src/data.ts`

**Interfaces:**
- Consumes: ничего из задач 1–2.
- Produces:
  - `export type SceneScreen = 'auth' | 'list' | 'notebook'` в `src/types.ts`
  - `SceneLayout.planet: PlanetGeometry | null`, `SceneLayout.glow: { x: number; y: number; rx: number; ry: number } | null`
  - `useSceneLayout(refs: LayoutRefs, glass: boolean, screen: SceneScreen): SceneLayout | null`
  - `Footer()` — без пропсов
  - Из `data.ts` удалены `loadSetting`, `saveSetting`; из `types.ts` удалён `CardsMode`

- [ ] **Step 1: Типы**

В `src/types.ts`: удалить `export type CardsMode = 'flat' | 'liquid';`. В `SceneLayout`:

```ts
  /** null — на экране нет планеты (экран блокнота): сцена рисует только звёзды */
  planet: PlanetGeometry | null;
  /** свечение за заголовком; привязано к планете, поэтому null вместе с ней */
  glow: { x: number; y: number; rx: number; ry: number } | null;
```

Добавить:

```ts
/** Какой экран сейчас на странице — от него зависит, что сцена рисует и когда пересчитывать раскладку */
export type SceneScreen = 'auth' | 'list' | 'notebook';
```

- [ ] **Step 2: `src/useSceneLayout.ts`**

Сигнатура и `measure`:

```ts
export function useSceneLayout({ pageRef, glowRef, limbRef, cardsRef }: LayoutRefs, glass: boolean, screen: SceneScreen): SceneLayout | null {
```

```ts
    const measure = () => {
      const pageEl = pageRef.current;
      if (!pageEl) return;
      // .limb и элемента свечения нет на экране блокнота: раскладка всё равно нужна — звёздам
      const limbEl = limbRef.current, glowEl = glowRef.current;
      const page = pageEl.getBoundingClientRect();
      const limb = limbEl?.getBoundingClientRect();
      const cardsEl = cardsRef.current;
      const R = limb ? limb.width / 2 : 0;
```

(вычисление `cards` и `cardsBottom` — без изменений)

```ts
      const glowRect = limb && glowEl ? glowEl.getBoundingClientRect() : null;
      const next: SceneLayout = {
        width: round(page.width),
        height: Math.round(glass ? Math.max(BASE_HEIGHT, cardsBottom) : BASE_HEIGHT),
        fade: [BASE_HEIGHT * 0.6, BASE_HEIGHT],
        planet: limb ? { cx: round(limb.left - page.left + R), cy: round(limb.top - page.top + R), R: round(R) } : null,
        glow: limb && glowRect
          ? { x: round(limb.left - page.left + R), y: round(glowRect.top - page.top + 130), rx: Math.min(920, page.width * 1.3) / 2 * 1.1, ry: 297 }
          : null,
        cards,
      };
```

Зависимости эффекта — `}, [glass, screen]);` и комментарий над ними:

```ts
    // screen — явный повод переподписаться: при смене экрана рефы указывают на новые элементы
    // (или никуда), а ResizeObserver страницы ловил это лишь косвенно, если менялась высота
```

Импорт: `import type { CardRect, SceneLayout, SceneScreen } from './types';`

- [ ] **Step 3: `src/sky/Stars.tsx`**

В `StarsProps`: `planet: PlanetGeometry | null;`. Первая строка тела после хуков:

```ts
  /* Без планеты (экран блокнота) звёзды раскладываются вокруг условного центра под нижним краем
     фона с нулевым радиусом — равномерно по всему небу, без выреза под диск */
  const { cx, cy, R } = planet ?? { cx: width / 2, cy: fade[1], R: 0 };
```

- [ ] **Step 4: `src/sky/Meteor.tsx`**

`planet: PlanetGeometry | null;` в `MeteorProps`; условие гашения:

```ts
    if (p >= 1 || (planet && Math.hypot(hx - planet.cx, hy - planet.cy) < planet.R + 12)) {
```

- [ ] **Step 5: `src/sky/Sky.tsx`**

В JSX заменить строки `Backdrop` и `Planet`:

```tsx
        {/* Без планеты (экран блокнота) нет ни диска, ни ореола, ни свечения за заголовком — остаются
            цвет космоса и звёзды. Программы шейдеров three.js кэширует по исходнику, поэтому при
            возврате на список Planet и Backdrop не компилируются заново */}
        {planet && glow && <Backdrop width={width} height={height} planet={planet} glow={glow} fade={fade} sun={sun} spin={spin}
          motion={motion} reducedMotion={reducedMotion} />}
        <Stars width={width} planet={planet} fade={fade} motion={motion} />
        {planet && <Planet planet={planet} fade={fade} motion={motion} sun={sun} spin={spin} reducedMotion={reducedMotion} />}
        <Meteor width={width} planet={planet} motion={motion} />
        {/* GlassCards смонтирован всегда: на экране блокнота он получает пустой массив, и при возврате
            на список стекло не проходит заново через первую компиляцию */}
        {glass && <GlassCards cards={cards} motion={motion} onReady={onGlassReady} />}
```

- [ ] **Step 6: `src/App.tsx` — без настроек**

Удалить состояния `cards` и `motion`, функции `changeCards`, `onMotion`, импорт `loadSetting, saveSetting` и тип `CardsMode`. Вместо них, рядом с `reducedMotion`:

```ts
  /* Переключателей стекла и анимации больше нет: стекло всегда liquid, анимация включена.
     prefers-reduced-motion — требование доступности, а не опция, и по-прежнему гасит движение. */
  const motion = !reducedMotion;
  const wantGlass = true;
```

`useSceneLayout(..., wantGlass, isAuth ? 'auth' : 'list')`. `<Notebooks>` — убрать пропсы `motion`, `onMotion`, `cards`, `onCards`.

- [ ] **Step 7: `Notebooks.tsx`, `Footer.tsx`, `data.ts`**

`Notebooks.tsx`: убрать из `NotebooksProps` и деструктуризации `motion`, `onMotion`, `cards`, `onCards`; `<Footer />` без пропсов; импорт `CardsMode` удалить.

`src/components/Footer.tsx` целиком:

```tsx
/* Переключатели вариантов фона, стекла и анимации ушли: приложение из этой ветки теперь живёт
   в корне сайта как продукт, а архивные варианты (Canvas 2D, WebGL) доступны по своим адресам. */
export default function Footer() {
  return (
    <div className="foot">
      <p className="note">Прототип. Названия блокнотов, рантаймы и квота GPU — примеры, не реальные данные.</p>
    </div>
  );
}
```

`src/data.ts`: удалить `loadSetting` и `saveSetting` вместе с комментарием над ними. Проверить: `grep -rn "loadSetting\|saveSetting\|CardsMode" src/` → пусто.

- [ ] **Step 8: Сборка и проверка глазами**

Run: `bun run build` → без ошибок. `bun test` → PASS.
Run: `bun run dev` → вход и список выглядят как раньше (планета, стекло, звёзды, метеор); в подвале одна строка. В консоли нет ошибок.

- [ ] **Step 9: Commit**

```bash
git add -A src
git commit -m "feat: сцена умеет обходиться без планеты, подвал без переключателей"
```

---

### Task 4: Маршруты, стор сессии и корневая оболочка

**Files:**
- Modify: `package.json` (зависимость), `src/types.ts`, `src/data.ts`, `src/main.tsx`, `src/App.tsx`, `src/screens/Auth.tsx`, `src/screens/Notebooks.tsx`, `src/components/TopBar.tsx`, `src/components/NotebookGrid.tsx`
- Create: `src/session-store.ts`, `src/route-params.ts`, `src/route-params.test.ts`, `src/shell.ts`, `src/router.tsx`, `src/screens/Notebook.tsx` (заглушка)

**Interfaces:**
- Consumes: `initialCells`, `insertCell` (Task 1); `Session { login }`, `loadSession/saveSession/clearSession`, `initials` (Task 2); `SceneScreen`, `useSceneLayout(refs, glass, screen)` (Task 3).
- Produces:
  - `Notebook.cells: Cell[]` (было `number`)
  - `sessionStore: { get(): Session | null; subscribe(fn): () => void; signIn(s: Session): void; signOut(): void }`, `useSession(): Session | null`
  - `parseNotebookId(raw: string): number | null`, `safeRedirect(raw: unknown): string | undefined`
  - `interface Shell` и `useShell(): Shell` (поля — ниже, Step 6); `setCells(id: number, cells: Cell[]): void` ставит `edited: 'только что'`; `createNotebook(): number` возвращает id; `toast(text: string): void` — стабильная ссылка
  - маршруты `/login` (search `{ redirect?: string }`), `/`, `/notebook/$id` (params `{ id: string }`)

- [ ] **Step 1: Зависимость**

```bash
bun add @tanstack/react-router
```

- [ ] **Step 2: Падающие тесты параметров**

`src/route-params.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { parseNotebookId, safeRedirect } from './route-params';

describe('parseNotebookId', () => {
  test('положительное целое', () => {
    expect(parseNotebookId('3')).toBe(3);
    expect(parseNotebookId('1758960000000')).toBe(1758960000000);   // id нового блокнота — Date.now()
  });
  test.each(['', 'abc', '-1', '0', '007', '3.5', '3 ', '1e3', '99999999999999999999'])('отвергает %p', raw => {
    expect(parseNotebookId(raw)).toBeNull();
  });
});

describe('safeRedirect', () => {
  test('путь внутри приложения', () => {
    expect(safeRedirect('/')).toBe('/');
    expect(safeRedirect('/notebook/3')).toBe('/notebook/3');
  });
  test.each(['https://evil.com', '//evil.com', '/\\evil.com', 'notebook/3', '', 42, null, undefined, ['/']])('отбрасывает %p', raw => {
    expect(safeRedirect(raw)).toBeUndefined();
  });
});
```

Run: `bun test src/route-params.test.ts` → Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: `src/route-params.ts`**

```ts
/* Разбор того, что приходит из адресной строки: сюда может попасть что угодно, набранное руками
   или присланное ссылкой. */

/** id блокнота из `#/notebook/$id`: только положительное целое без ведущих нулей, иначе null */
export function parseNotebookId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/** Куда вернуть после входа. Только путь внутри приложения: `//host` и `/\host` браузер читает как
    адрес другого сайта, поэтому они отбрасываются вместе с абсолютными URL */
export function safeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return undefined;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return undefined;
  return raw;
}
```

Run: `bun test src/route-params.test.ts` → PASS.

- [ ] **Step 4: `src/session-store.ts`**

```ts
import { useSyncExternalStore } from 'react';
import { clearSession, loadSession, saveSession } from './session';
import type { Session } from './session';

/* Сессия живёт вне React. Охранники маршрутов (beforeLoad в router.tsx) читают её синхронно:
   будь она состоянием App — компонента внутри роутера, — переход сразу после «Войти» увидел бы
   прежнее значение и вернул бы на форму. localStorage источником правды тоже не годится: при
   заблокированном хранилище вход перестал бы работать, а сейчас он работает, просто не сохраняется. */
let current: Session | null = loadSession();
const listeners = new Set<() => void>();
const emit = () => { for (const fn of listeners) fn(); };

export const sessionStore = {
  get: (): Session | null => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  signIn(session: Session): void { saveSession(session); current = session; emit(); },
  signOut(): void { clearSession(); current = null; emit(); },
};

export function useSession(): Session | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
}
```

- [ ] **Step 5: Данные с ячейками**

`src/types.ts`, в `Notebook`: `cells: Cell[];` вместо `cells: number;` (комментарий: `/** ячейки; число на карточке — их длина */`). `Cell` уже объявлен ниже в файле (Task 1) — TypeScript это допускает.

`src/data.ts`: `import { initialCells } from './notebook-cells';` и в каждом из восьми блокнотов `cells: N` → `cells: initialCells(N)` с теми же числами (21, 34, 18, 27, 15, 9, 12, 3).

`src/components/NotebookGrid.tsx`: `{n.cells}` → `{n.cells.length}` в двух местах строки `.meta`.

- [ ] **Step 6: `src/shell.ts`**

```ts
import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { Session } from './session';
import type { AuthMode, Cell, Notebook } from './types';

/* Что корень (App) отдаёт экранам. У маршрутных компонентов нет пропсов, поэтому общее идёт
   через контекст: рефы сцены, сессия, блокноты и тост должны переживать смену экрана. */
export interface Shell {
  /** элемент, от которого сцена отсчитывает свечение за заголовком */
  glowRef: RefObject<HTMLElement | null>;
  /** CSS-диск планеты: фон до готовности сцены и источник её геометрии */
  limbRef: RefObject<HTMLDivElement | null>;
  /** контейнер, чьи `.card` сцена рисует стеклом */
  cardsRef: RefObject<HTMLDivElement | null>;
  /** стекло рисует сцена — DOM-карточки прозрачны */
  glassOn: boolean;
  reducedMotion: boolean;
  session: Session | null;
  /** режим формы входа живёт в корне: им управляет и карточка, и свет сцены */
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  signIn: (session: Session) => void;
  signOut: () => void;
  notebooks: Notebook[];
  /** создаёт блокнот с одной ячейкой кода и возвращает его id */
  createNotebook: () => number;
  /** заменяет ячейки блокнота; блокнот становится «изменён только что» */
  setCells: (id: number, cells: Cell[]) => void;
  toast: (text: string) => void;
}

export const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('useShell() вызван вне корневого маршрута (App)');
  return shell;
}
```

- [ ] **Step 7: `src/router.tsx`**

```tsx
import { Navigate, createHashHistory, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import App from './App';
import Auth from './screens/Auth';
import Notebooks from './screens/Notebooks';
import Notebook from './screens/Notebook';
import { sessionStore } from './session-store';
import { safeRedirect } from './route-params';

/* Маршруты кодом, без файлового роутинга: на три адреса кодогенерация и Vite-плагин не окупаются.
   История хешевая — GitHub Pages не умеет отдавать index.html на произвольный путь. */

const rootRoute = createRootRoute({ component: App });

/* Без сессии — на форму, запомнив, куда шли: после входа человек попадёт ровно туда */
function requireSession({ location }: { location: { href: string } }) {
  if (!sessionStore.get()) throw redirect({ to: '/login', search: { redirect: location.href } });
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = safeRedirect(search.redirect);
    return target ? { redirect: target } : {};
  },
  // уже вошедший попадает сюда, только набрав адрес руками — отправляем на список
  beforeLoad: () => { if (sessionStore.get()) throw redirect({ to: '/' }); },
  component: Auth,
});

const notebooksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: requireSession, component: Notebooks });

const notebookRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notebook/$id', beforeLoad: requireSession, component: Notebook });

export const router = createRouter({
  routeTree: rootRoute.addChildren([loginRoute, notebooksRoute, notebookRoute]),
  history: createHashHistory(),
  // неизвестный адрес (#/foo) — на список; без сессии список сам отправит на форму
  defaultNotFoundComponent: () => <Navigate to="/" replace />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

Если TypeScript требует `search` у `<Link to="/login">` / `redirect({ to: '/login' })` без параметров — передавать `search={{}}` / `search: {}`; если ругается на тип `location` в `requireSession` — взять тип из `BeforeLoadContextOptions` или написать охранник инлайном в каждом маршруте. Смысл менять нельзя.

- [ ] **Step 8: `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('В index.html нет элемента #root');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 9: `src/App.tsx` — корневой маршрут**

Сохраняются без изменений: `skyChunk`/`Sky`, `prefersReducedMotion`, `SceneBoundary`, эффект `sweeping` по `mode`, готовность `skyReady`/`glassReady`, рефы сцены, вычисление `spin`/`tickMs`, `<SceneBoundary>…<Sky …/>…</SceneBoundary>`. Меняется остальное:

```tsx
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { initialNotebooks } from './data';
import { insertCell } from './notebook-cells';
import { useSceneLayout } from './useSceneLayout';
import { SUN_ORBIT, SWEEP_ANGLE, SWEEP_MS } from './scene-config';
import { sessionStore, useSession } from './session-store';
import { ShellContext } from './shell';
import type { Shell } from './shell';
import type { Session } from './session';
import type { AuthMode, Cell, Notebook, SceneScreen } from './types';
```

Внутри `App()` (вместо `useState<Session | null>` и `onSignIn`/`onSignOut`):

```tsx
  const session = useSession();
  const navigate = useNavigate();
  /* Экран — по адресу: от него зависят сцена (планета, стекло, свет) и класс страницы */
  const pathname = useRouterState({ select: s => s.location.pathname });
  const screen: SceneScreen = pathname === '/login' ? 'auth' : pathname.startsWith('/notebook/') ? 'notebook' : 'list';

  /* Блокноты и тост живут здесь, а не в экранах: список размонтируется при уходе в блокнот, и только
     что созданный «Без названия» пропал бы; «Блокнот не найден» показывается уже после ухода с экрана */
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialNotebooks);
  const [toastText, setToastText] = useState('');
  const toast = useCallback((text: string) => setToastText(text), []);
  useEffect(() => {
    if (!toastText) return;
    const timer = setTimeout(() => setToastText(''), 2600);
    return () => clearTimeout(timer);
  }, [toastText]);

  const signIn = useCallback((s: Session) => sessionStore.signIn(s), []);
  /* mode переживает выход (он в корне ради света сцены), поэтому сбрасывается явно — иначе после
     выхода из только что созданного аккаунта видна форма регистрации вместо входа */
  const signOut = useCallback(() => {
    sessionStore.signOut();
    setMode('login');
    void navigate({ to: '/login' });
  }, [navigate]);

  const createNotebook = useCallback((): number => {
    const id = Date.now();
    const cells = insertCell([], 0, 'code').cells;   // как Untitled.ipynb в Colab: одна пустая ячейка кода
    setNotebooks(list => [{ id, title: 'Без названия', cells, edited: 'только что', accel: 'CPU', code: '# Первая ячейка. Shift+Enter — запустить\n' }, ...list]);
    return id;
  }, []);
  const setCells = useCallback((id: number, cells: Cell[]) => {
    setNotebooks(list => list.map(n => (n.id === id ? { ...n, cells, edited: 'только что' } : n)));
  }, []);
```

`isAuth` → `const isAuth = screen === 'auth';`; `useSceneLayout({ pageRef, glowRef, limbRef, cardsRef }, wantGlass, screen)`.

Контекст и разметка:

```tsx
  const shell = useMemo<Shell>(() => ({
    glowRef, limbRef, cardsRef, glassOn, reducedMotion, session, mode, setMode, signIn, signOut,
    notebooks, createNotebook, setCells, toast,
  }), [glassOn, reducedMotion, session, mode, signIn, signOut, notebooks, createNotebook, setCells, toast]);

  return (
    <ShellContext.Provider value={shell}>
      <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}${isAuth ? ' auth-page' : ''}`} ref={pageRef}>
        <Outlet />

        <SceneBoundary>
          {/* …Suspense и Sky — как было… */}
        </SceneBoundary>

        {toastText && <div className="toast" role="status">{toastText}</div>}
      </div>
    </ShellContext.Provider>
  );
```

`reducedMotion` сейчас вычисляется на каждом рендере вызовом `matchMedia` — обернуть в `useMemo(prefersReducedMotion, [])` или `useState(prefersReducedMotion)`, чтобы `shell` не пересоздавался зря (значение и так читается один раз за жизнь страницы по смыслу комментария над ним).

- [ ] **Step 10: `src/screens/Auth.tsx`**

Пропсов больше нет — всё из `useShell()`; после входа — переход по `redirect`:

```tsx
import type { CSSProperties } from 'react';
import { Link, getRouteApi, useRouter } from '@tanstack/react-router';
import AuthCard from '../auth/AuthCard';
import { SWEEP_MS } from '../scene-config';
import { useShell } from '../shell';
import type { Session } from '../session';

const loginApi = getRouteApi('/login');

export default function Auth() {
  const { glowRef, cardsRef, limbRef, mode, setMode, signIn, glassOn, reducedMotion } = useShell();
  const router = useRouter();
  const { redirect } = loginApi.useSearch();

  /* Стор сессии синхронный, поэтому охранник следующего маршрута уже видит вход.
     redirect проверен в validateSearch (safeRedirect) — это всегда путь внутри приложения */
  const onSignIn = (session: Session) => {
    signIn(session);
    router.history.push(redirect ?? '/');
  };

  return (
    <div className="auth wrap" style={{ '--sweep': `${SWEEP_MS}ms` } as CSSProperties}
      ref={node => { cardsRef.current = node; glowRef.current = node; }}>
      <Link className="logo" to="/" aria-label="Cellestial — на главную">
        {/* …svg и слово cellestial — как было… */}
      </Link>

      <AuthCard mode={mode} onModeChange={setMode} onSignIn={onSignIn} glass={glassOn} reducedMotion={reducedMotion} />

      {/* CSS-диск планеты: фон, пока сцена грузится (и если не загрузится), и источник её геометрии */}
      <div className="limb" ref={limbRef} aria-hidden="true" />
    </div>
  );
}
```

Проверить, что `cardsRef` в `Shell` типизирован так, что callback-ref выше компилируется (`RefObject<HTMLDivElement | null>` — `.current` присваиваемый в React 19). Комментарий над компонентом про общий контейнер для двух рефов — сохранить.

- [ ] **Step 11: `src/screens/Notebooks.tsx`**

Пропсов нет; `notebooks`, `toast`, `createNotebook`, `session`, `signOut`, рефы и `glassOn` — из `useShell()`. Локальными остаются `active`, `query` и `shown`. Удалить локальные `notebooks`/`toast` и их эффект, `{toast && …}` в разметке, `initialNotebooks` из импортов.

```tsx
  const navigate = useNavigate();
  // …useMemo shown — как было, по notebooks из shell…

  /* Хуки выше этой строки: при выходе сессия гаснет на рендер раньше, чем адрес сменится на /login */
  if (!session) return null;

  /* Как в Colab: новый блокнот сразу открывается, а не остаётся карточкой в списке */
  const create = () => {
    const id = createNotebook();
    void navigate({ to: '/notebook/$id', params: { id: String(id) } });
  };
```

`<Hero … onCreate={create} onUpload={() => toast('В прототипе загрузка файлов не подключена')} />`, `<TopBar … initials={initials(session)} onSignOut={signOut} />`, `<NotebookGrid gridRef={cardsRef} notebooks={shown} glass={glassOn} />` (без `onOpen`).

- [ ] **Step 12: Ссылки в `TopBar.tsx` и `NotebookGrid.tsx`**

`TopBar.tsx`: `<a className="logo" href="#" …>` → `<Link className="logo" to="/" aria-label="Cellestial — на главную">…</Link>` (импорт `Link` из `@tanstack/react-router`).

`NotebookGrid.tsx`: у `Card` убрать проп `onOpen`, `<a …href="#" onClick=…>` заменить на

```tsx
    <Link className={glass ? 'card lq' : 'card'} to="/notebook/$id" params={{ id: String(n.id) }} onPointerMove={track}>
```

(закрывающий тег — `</Link>`), из `NotebookGridProps` убрать `onOpen`. Тип `track` остаётся `PointerEvent<HTMLAnchorElement>` — `Link` рендерит `<a>`.

- [ ] **Step 13: Заглушка `src/screens/Notebook.tsx`**

Полностью экран делает Task 5; здесь — маршрут, «не найден» и минимальная разметка:

```tsx
import { useEffect } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { parseNotebookId } from '../route-params';
import { useShell } from '../shell';

const notebookApi = getRouteApi('/notebook/$id');

export default function Notebook() {
  const { id: rawId } = notebookApi.useParams();
  const { notebooks, toast } = useShell();
  const navigate = useNavigate();

  const id = parseNotebookId(rawId);
  const notebook = id === null ? undefined : notebooks.find(n => n.id === id);

  /* Проверка здесь, а не в beforeLoad: блокноты — состояние корня, охранник маршрута их не видит.
     Сюда же попадает блокнот, созданный до перезагрузки: после неё его нет */
  useEffect(() => {
    if (notebook) return;
    toast('Блокнот не найден');
    void navigate({ to: '/', replace: true });
  }, [notebook, toast, navigate]);

  if (!notebook) return null;
  return <main className="wrap"><h1>{notebook.title}</h1></main>;
}
```

- [ ] **Step 14: Тесты, сборка, проверка маршрутов глазами**

Run: `bun test` → PASS. `bun run build` → без ошибок.
Run: `bun run dev`, в чистой вкладке (localStorage `cellestial-session` удалить):
1. Корень → адрес `#/login`, форма. Вход `yarik`/`12345678` → `#/`, список.
2. Клик по карточке → `#/notebook/1`, заголовок блокнота; «назад» браузера → список.
3. Выход (аватар) → `#/login`, режим «Вход».
4. Без сессии открыть `#/notebook/3` → `#/login?redirect=%2Fnotebook%2F3` → вход → блокнот 3.
5. `#/notebook/999`, `#/notebook/abc`, `#/foo` → список, тост «Блокнот не найден» (для первых двух).
6. «Новый блокнот» → сразу `#/notebook/<id>`; «назад» → он первый в списке, «1 ячейка».
7. На экране блокнота нет планеты и стекла, звёзды на месте; назад на список — планета и стекло вернулись.

- [ ] **Step 15: Commit**

```bash
git add -A package.json bun.lock src
git commit -m "feat: маршруты на TanStack Router — вход, список и блокнот по адресам"
```

---

### Task 5: Экран блокнота

**Files:**
- Create: `src/components/NotebookTags.tsx`, `src/notebook/NotebookHeader.tsx`, `src/notebook/Cell.tsx`, `src/notebook/InsertBar.tsx`
- Modify: `src/screens/Notebook.tsx`, `src/components/NotebookGrid.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `insertCell`, `insertionIndex`, `removeCell` (Task 1); `useShell()` — `notebooks`, `setCells`, `toast`, `session`, `signOut`, `reducedMotion` (Task 4); `parseNotebookId` (Task 4); `plural` из `data.ts`; `initials` из `session.ts`.
- Produces: `NotebookTags({ notebook })`; `NotebookHeader`, `Cell`, `InsertBar` (пропсы — в шагах ниже).

- [ ] **Step 1: Общие теги**

`src/components/NotebookTags.tsx` — вынести из `NotebookGrid.tsx` блок `.tags` без изменений:

```tsx
import type { Notebook } from '../types';

/* Статус рантайма, ускоритель и владелец — одинаково на карточке и в шапке блокнота */
export default function NotebookTags({ notebook: n }: { notebook: Notebook }) {
  return (
    <div className="tags">
      {n.run
        ? <span className="tag run"><i className="dot" />Работает · {n.run}</span>
        : <span className="tag"><i className="dot" />Остановлен</span>}
      <span className="tag accel">{n.accel}</span>
      {n.owner && <span className="tag">от {n.owner}</span>}
    </div>
  );
}
```

В `NotebookGrid.tsx` заменить этот блок на `<NotebookTags notebook={n} />`.

- [ ] **Step 2: `src/notebook/InsertBar.tsx`**

```tsx
import type { CellKind } from '../types';

interface InsertBarProps {
  onAdd: (kind: CellKind) => void;
  /** полоса после последней ячейки — видна всегда, а не только при наведении */
  persistent?: boolean;
  /** стоит под выбранной ячейкой — на тач-экранах (нет наведения) показывается только такая */
  afterSelected?: boolean;
}

export default function InsertBar({ onAdd, persistent = false, afterSelected = false }: InsertBarProps) {
  return (
    <div className={`nb-insert${persistent ? ' persistent' : ''}${afterSelected ? ' after-selected' : ''}`}>
      <button className="nb-add" type="button" onClick={() => onAdd('code')}><Plus />Код</button>
      <button className="nb-add" type="button" onClick={() => onAdd('text')}><Plus />Текст</button>
    </div>
  );
}

export function Plus() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
```

- [ ] **Step 3: `src/notebook/Cell.tsx`**

```tsx
import type { Cell as CellModel } from '../types';

interface CellProps {
  cell: CellModel;
  /** порядковый номер с нуля — для имени поля у скринридера */
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRun: () => void;
}

const PLACEHOLDER = { code: '# Код на Python', text: 'Заголовок или описание — Markdown' } as const;

/* Поле — настоящий textarea только для чтения: во втором модуле на его место встанет редактор,
   а разметка ячейки вокруг не изменится. data-cell-id нужен экрану, чтобы вернуть фокус после
   вставки и удаления */
export default function Cell({ cell, index, selected, onSelect, onDelete, onRun }: CellProps) {
  const label = cell.kind === 'code' ? `Ячейка кода ${index + 1}` : `Текстовая ячейка ${index + 1}`;
  return (
    <div className={`nb-cell nb-cell-${cell.kind}${selected ? ' selected' : ''}`} data-cell-id={cell.id}
      onPointerDown={onSelect} onFocus={onSelect}>
      {cell.kind === 'code' && (
        <div className="nb-gutter">
          <span className="nb-count" aria-hidden="true">[ ]</span>
          <button className="nb-run" type="button" aria-label="Выполнить ячейку" onClick={onRun}>
            <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1.2v9.6L9.2 6 1 1.2Z" fill="currentColor" /></svg>
          </button>
        </div>
      )}
      <textarea className="nb-input" readOnly rows={1} placeholder={PLACEHOLDER[cell.kind]} aria-label={label} />
      <div className="nb-cell-tools">
        <button className="nb-delete" type="button" aria-label="Удалить ячейку" onClick={onDelete}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/notebook/NotebookHeader.tsx`**

```tsx
import { Link } from '@tanstack/react-router';
import NotebookTags from '../components/NotebookTags';
import { Plus } from './InsertBar';
import { plural } from '../data';
import type { CellKind, Notebook } from '../types';

interface NotebookHeaderProps {
  notebook: Notebook;
  initials: string;
  onSignOut: () => void;
  /** вставка из шапки — после выбранной ячейки или в конец */
  onAdd: (kind: CellKind) => void;
}

/* Меню Colab («Файл / Изменить / Вид…»), «Выполнить все» и «Подключиться» не переносятся:
   пункты без действий — шум, в модуле 1 им нечего делать */
export default function NotebookHeader({ notebook: n, initials, onSignOut, onAdd }: NotebookHeaderProps) {
  const count = n.cells.length;
  return (
    <header className="top wrap">
      <div className="top-inner nb-top-inner">
        <div className="nb-head">
          <Link className="nb-back" to="/" aria-label="К списку блокнотов">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link className="logo nb-logo" to="/" aria-label="Cellestial — на главную">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
              <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
              <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
            </svg>
          </Link>
          <div className="nb-title">
            <h1>{n.title}</h1>
            <div className="nb-meta">
              <span className="meta">{count} {plural(count, 'ячейка', 'ячейки', 'ячеек')} · изменён {n.edited}</span>
              <NotebookTags notebook={n} />
            </div>
          </div>
          <button className="avatar" type="button" aria-label="Выйти" onClick={onSignOut}>{initials}</button>
        </div>
        <div className="nb-toolbar" role="toolbar" aria-label="Добавить ячейку">
          <button className="chip" type="button" onClick={() => onAdd('code')}><Plus />Код</button>
          <button className="chip" type="button" onClick={() => onAdd('text')}><Plus />Текст</button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: `src/screens/Notebook.tsx` целиком**

```tsx
import { Fragment, useEffect, useRef, useState } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import NotebookHeader from '../notebook/NotebookHeader';
import Cell from '../notebook/Cell';
import InsertBar, { Plus } from '../notebook/InsertBar';
import { insertCell, insertionIndex, removeCell } from '../notebook-cells';
import { parseNotebookId } from '../route-params';
import { initials } from '../session';
import { useShell } from '../shell';
import type { CellKind } from '../types';

const notebookApi = getRouteApi('/notebook/$id');

/** куда вернуть фокус после вставки/удаления: id ячейки или пустое состояние */
type FocusTarget = number | 'empty' | null;

export default function Notebook() {
  const { id: rawId } = notebookApi.useParams();
  const { notebooks, setCells, toast, session, signOut, reducedMotion } = useShell();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const emptyRef = useRef<HTMLButtonElement>(null);

  const id = parseNotebookId(rawId);
  const notebook = id === null ? undefined : notebooks.find(n => n.id === id);

  /* Проверка здесь, а не в beforeLoad: блокноты — состояние корня, охранник маршрута их не видит.
     Сюда же попадает блокнот, созданный до перезагрузки: после неё его нет */
  useEffect(() => {
    if (notebook) return;
    toast('Блокнот не найден');
    void navigate({ to: '/', replace: true });
  }, [notebook, toast, navigate]);

  /* Фокус переносится после того, как React отрисовал новый список: иначе нужной ячейки ещё нет
     в DOM, а удалённая уносит фокус на body. scrollIntoView — отдельно от focus(): фокус сам
     прокручивает, но без плавности и выравнивания */
  useEffect(() => {
    if (focusTarget === null) return;
    const el = focusTarget === 'empty'
      ? emptyRef.current
      : document.querySelector<HTMLElement>(`[data-cell-id="${focusTarget}"] .nb-input`);
    el?.focus({ preventScroll: true });
    el?.closest('.nb-cell, .empty')?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFocusTarget(null);
  }, [focusTarget, reducedMotion]);

  if (!notebook || !session) return null;
  const { cells } = notebook;

  const add = (index: number, kind: CellKind) => {
    const result = insertCell(cells, index, kind);
    setCells(notebook.id, result.cells);
    setSelected(result.id);
    setFocusTarget(result.id);
  };
  const remove = (cellId: number) => {
    const result = removeCell(cells, cellId);
    setCells(notebook.id, result.cells);
    setSelected(result.nextSelected);
    setFocusTarget(result.nextSelected ?? 'empty');
  };
  const run = () => toast('В прототипе выполнение не подключено');

  return (
    <>
      <NotebookHeader notebook={notebook} initials={initials(session)} onSignOut={signOut}
        onAdd={kind => add(insertionIndex(cells, selected), kind)} />

      <main className="wrap nb-main">
        {cells.length === 0 ? (
          <div className="empty nb-empty">
            <strong>В блокноте пусто</strong>
            <span>Добавьте первую ячейку</span>
            <div className="nb-empty-actions">
              <button ref={emptyRef} className="nb-add" type="button" onClick={() => add(0, 'code')}><Plus />Код</button>
              <button className="nb-add" type="button" onClick={() => add(0, 'text')}><Plus />Текст</button>
            </div>
          </div>
        ) : (
          <div className="nb-cells">
            <InsertBar onAdd={kind => add(0, kind)} />
            {cells.map((cell, i) => (
              <Fragment key={cell.id}>
                <Cell cell={cell} index={i} selected={cell.id === selected}
                  onSelect={() => setSelected(cell.id)} onDelete={() => remove(cell.id)} onRun={run} />
                {/* после последней ячейки полоса видна всегда — вторая точка входа для добавления */}
                <InsertBar onAdd={kind => add(i + 1, kind)} persistent={i === cells.length - 1} afterSelected={cell.id === selected} />
              </Fragment>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 6: Стили**

В конец `src/styles.css` (до медиа-запросов в самом низу файла, если они есть — перед ними):

```css
/* ── Экран блокнота: тихий космос — звёзды без планеты, ячейки на CSS-стекле ── */
.nb-top-inner { flex-direction: column; align-items: stretch; flex-wrap: nowrap; gap: 10px; }
.nb-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.nb-back { flex: none; display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--mist); border: 1px solid var(--line); background: rgba(255, 255, 255, .03); transition: color .15s, background .15s; }
.nb-back:hover { color: var(--ice); background: rgba(255, 255, 255, .06); }
.nb-logo { flex: none; }
.nb-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
/* общий h1 — градиентный заголовок hero; здесь это имя файла в шапке */
.nb-title h1 {
  margin: 0; font: 600 16px/1.3 var(--body); letter-spacing: 0;
  background: none; -webkit-background-clip: border-box; background-clip: border-box; color: var(--ice);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nb-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; }
.nb-meta .tags { margin: 0; padding: 0; }
.nb-toolbar { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px; border-top: 1px solid var(--line); }
.nb-toolbar .chip, .nb-add { gap: 6px; }

.nb-main { padding-block: 24px 80px; }
.nb-cells { display: flex; flex-direction: column; }

.nb-cell {
  position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
  border-radius: 18px; background: var(--glass); box-shadow: inset 0 0 0 1px var(--line);
  transition: box-shadow .15s, background .15s;
}
.nb-cell:hover { background: var(--glass-hi); }
.nb-cell.selected { box-shadow: inset 0 0 0 1px rgba(160, 135, 255, .75), 0 0 0 3px rgba(139, 108, 255, .16); }
.nb-gutter { flex: none; display: flex; align-items: center; gap: 8px; height: 24px; }
.nb-count { font: 400 12px/1 var(--mono); color: var(--dim); }
.nb-run { width: 26px; height: 26px; display: grid; place-items: center; border: 0; border-radius: 50%; background: rgba(255, 255, 255, .08); color: var(--ice); cursor: pointer; transition: background .15s; }
.nb-run:hover { background: rgba(139, 108, 255, .4); }
.nb-input { flex: 1; min-width: 0; height: 24px; padding: 2px 0; resize: none; overflow: hidden; border: 0; outline: 0; background: none; color: var(--ice); cursor: default; }
.nb-cell-code .nb-input { font: 400 13.5px/20px var(--mono); }
.nb-cell-text .nb-input { font: 400 15px/20px var(--body); }
.nb-input::placeholder { color: var(--dim); opacity: 1; }
.nb-cell-text .nb-input::placeholder { color: var(--mist); }
/* панель ячейки — только удаление; видна у выбранной */
.nb-cell-tools { position: absolute; z-index: 2; top: -15px; right: 14px; display: flex; padding: 3px; border-radius: 10px; background: rgba(18, 12, 44, .94); border: 1px solid var(--line); visibility: hidden; }
.nb-cell.selected .nb-cell-tools { visibility: visible; }
.nb-delete { width: 28px; height: 28px; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; color: var(--mist); cursor: pointer; }
.nb-delete:hover { color: #ff9f9f; background: rgba(255, 120, 120, .12); }

/* Полоса «+ Код / + Текст»: на стыке проявляется при наведении и с клавиатуры, после последней ячейки видна всегда */
.nb-insert { position: relative; display: flex; justify-content: center; align-items: center; gap: 8px; height: 32px; }
.nb-insert::before { content: ""; position: absolute; left: 16px; right: 16px; top: 50%; height: 1px; background: rgba(160, 135, 255, .35); opacity: 0; transition: opacity .15s; }
.nb-insert .nb-add { position: relative; opacity: 0; transition: opacity .15s; }
.nb-insert:hover::before, .nb-insert:focus-within::before { opacity: 1; }
.nb-insert:hover .nb-add, .nb-insert:focus-within .nb-add, .nb-insert.persistent .nb-add { opacity: 1; }
.nb-insert.persistent { height: 56px; }
.nb-add { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: rgba(12, 8, 32, .9); color: var(--ice); font-size: 13px; cursor: pointer; transition: border-color .15s, background .15s; }
.nb-add:hover { border-color: rgba(160, 135, 255, .6); background: rgba(40, 28, 90, .9); }
/* наведения нет — промежуточные полосы видны только под выбранной ячейкой */
@media (hover: none) {
  .nb-insert:not(.persistent):not(.after-selected) .nb-add { visibility: hidden; }
  .nb-insert.after-selected .nb-add { opacity: 1; }
}

.nb-empty-actions { display: flex; gap: 8px; margin-top: 6px; }

@media (max-width: 640px) {
  .nb-cell { padding: 12px; gap: 10px; }
  .nb-meta .tags { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .nb-cell, .nb-insert::before, .nb-insert .nb-add, .nb-run, .nb-back, .nb-add { transition: none; }
}
```

- [ ] **Step 7: Сборка и проверка глазами**

Run: `bun run build` → без ошибок; `bun test` → PASS.
Run: `bun run dev`, открыть блокнот «Fine-tune ruBERT» (`#/notebook/1`):
1. 21 ячейка, первая — текстовая; плейсхолдеры `# Код на Python` и «Заголовок или описание — Markdown»; в поля нельзя ввести текст.
2. Клик по ячейке → фиолетовая рамка и корзина справа сверху. Корзина → ячейка исчезла, выбрана следующая, фокус на ней; «21 ячейка» → «20 ячеек».
3. «+ Код» в шапке при выбранной ячейке → новая ячейка кода сразу под ней, выбрана, в зоне видимости. Без выбора (перезагрузить страницу) → в конец.
4. Наведение на промежуток между ячейками → линия и «+ Код / + Текст» → вставка ровно туда. Полоса после последней ячейки видна без наведения.
5. Tab с клавиатуры проходит через полосы (появляются на фокусе), ячейки, ▶, корзину.
6. ▶ → тост «В прототипе выполнение не подключено».
7. Удалить все ячейки (новый блокнот → одна ячейка → корзина) → «В блокноте пусто», фокус на «+ Код»; добавить → ячейка появилась.
8. «Назад» → на карточке актуальное число ячеек и «изменён только что».
9. DevTools, ширина 375px: шапка не разъезжается, заголовок обрезается многоточием, полоса после последней ячейки видна.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "feat: экран блокнота — ячейки кода и текста, добавление и удаление"
```

---

### Task 6: Деплой — приложение в корне, варианты в подпапках

**Files:**
- Modify (ветка `feat/notebook-editor`): `.github/workflows/pages.yml`, `README.md`
- Modify (новая ветка `chore/deploy-canvas-path` от `origin/main`, отдельный worktree): `.github/workflows/pages.yml`, `index.html`, `README.md`
- Modify (новая ветка `chore/deploy-webgl-path` от `origin/webgl`, отдельный worktree): `.github/workflows/pages.yml`, `index.html`, `README.md`

**Interfaces:**
- Consumes: всё приложение собрано (`bun run build` проходит).
- Produces: одинаковый `pages.yml` в трёх ветках.

- [ ] **Step 1: Новый `.github/workflows/pages.yml`** (в `feat/notebook-editor`, целиком)

```yaml
name: Deploy to GitHub Pages

# Сайт собирается из трёх веток: r3f (приложение) — в корень, main (Canvas 2D) — в /canvas/,
# webgl — в /webgl/. Старый адрес /r3f/ ведёт на корень, чтобы не сломать уже розданные ссылки.
# Файл должен быть одинаковым во всех трёх ветках: push запускает workflow из той ветки,
# в которую пришёл, и устаревшая копия выложит сайт в старой раскладке.
on:
  push:
    branches: [main, webgl, r3f]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      # r3f — приложение и корень сайта, поэтому сборка обязательна: без неё в корне ничего нет
      - name: Checkout r3f
        uses: actions/checkout@v4
        with:
          ref: r3f
          path: r3f-src

      - uses: oven-sh/setup-bun@v2

      - name: Build r3f
        working-directory: r3f-src
        run: |
          bun install --frozen-lockfile
          bun run build
          mkdir -p ../site
          cp -r dist/. ../site/

      - name: Checkout main (Canvas 2D)
        uses: actions/checkout@v4
        continue-on-error: true
        with:
          ref: main
          path: site/canvas

      - name: Checkout webgl
        uses: actions/checkout@v4
        continue-on-error: true
        with:
          ref: webgl
          path: site/webgl

      # Старый адрес приложения. Хеш переносится: /r3f/#/notebook/3 → /#/notebook/3
      - name: Redirect /r3f/ to root
        run: |
          mkdir -p site/r3f
          cat > site/r3f/index.html <<'HTML'
          <!doctype html>
          <html lang="ru">
          <meta charset="utf-8">
          <title>Cellestial</title>
          <meta http-equiv="refresh" content="0; url=../">
          <script>location.replace('../' + location.hash)</script>
          <p><a href="../">Cellestial переехал в корень сайта</a></p>
          </html>
          HTML

      - name: Drop repository internals
        run: rm -rf site/canvas/.git site/canvas/.github site/webgl/.git site/webgl/.github

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

      - id: deployment
        uses: actions/deploy-pages@v4
```

Проверить синтаксис: `bunx --bun js-yaml .github/workflows/pages.yml > /dev/null` (или `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/pages.yml'))"`) → без ошибок. Проверить, что heredoc после снятия общего отступа YAML начинается с колонки 0: `python -c "import yaml; print(yaml.safe_load(open('.github/workflows/pages.yml'))['jobs']['deploy']['steps'][5]['run'])"` — строка `HTML` в конце без отступа.

- [ ] **Step 2: README ветки `r3f`**

В `README.md`:
- первый абзац: «Прототип сервиса блокнотов (аналог Google Colab) в космической стилистике: вход, список блокнотов и страница блокнота. Репозиторий начинался как сравнение реализаций анимированного фона — планеты и звёздного неба; архивные варианты доступны по своим адресам.»
- таблица веток:

| Ветка | Что | Демо |
|---|---|---|
| `r3f` | приложение: React 19 + TypeScript + react-three-fiber и drei | <https://yarikmix.github.io/WebGL-playground/> |
| `main` | архив: Canvas 2D + CSS-диск планеты, без библиотек | <https://yarikmix.github.io/WebGL-playground/canvas/> |
| `webgl` | архив: чистый WebGL, планета одним фрагментным шейдером | <https://yarikmix.github.io/WebGL-playground/webgl/> |

  и строка: «Старый адрес `/r3f/` перенаправляет в корень с сохранением хеша.»
- в блок команд добавить `bun test          # юнит-тесты (bun:test)`;
- новый раздел «### Маршруты» — таблица из §3.1 спеки и абзац «почему хеш» из §3.2;
- таблица «Структура»: добавить `src/router.tsx`, `src/session-store.ts`, `src/route-params.ts`, `src/shell.ts`, `src/notebook-cells.ts`, `src/screens/` (`Auth`, `Notebooks`, `Notebook`), `src/notebook/` (шапка, ячейка, полоса вставки); строку `src/App.tsx` заменить на «корневой маршрут: сессия, блокноты, тост, общая сцена, `<Outlet />`»;
- раздел «Деплой»: новая раскладка (корень / `/canvas/` / `/webgl/` / редирект `/r3f/`), фраза про одинаковый workflow во всех ветках остаётся.

- [ ] **Step 3: Commit в `feat/notebook-editor`**

```bash
git add .github/workflows/pages.yml README.md
git commit -m "chore: приложение в корне сайта, архивные варианты — в /canvas/ и /webgl/"
```

- [ ] **Step 4: Ветка для `main`**

```bash
cd F:/Github/2026_H2
git -C WebGL-playground-notebook worktree add -b chore/deploy-canvas-path ../WebGL-playground-canvas origin/main
cp WebGL-playground-notebook/.github/workflows/pages.yml WebGL-playground-canvas/.github/workflows/pages.yml
```

В `WebGL-playground-canvas/index.html` (строки ~76–78, `<nav class="variants">`): сайт этой ветки теперь в `/canvas/`, поэтому

```html
          <a class="chip" href="./" aria-current="page">Canvas 2D</a>
          <a class="chip" href="../webgl/">WebGL</a>
          <a class="chip" href="../">React + R3F</a>
```

В `README.md` этой ветки — та же таблица веток, что в Step 2 (три строки + строка про `/r3f/`).

```bash
cd F:/Github/2026_H2/WebGL-playground-canvas
git diff --stat   # ровно три файла
git add .github/workflows/pages.yml index.html README.md
git commit -m "chore: вариант Canvas 2D переезжает в /canvas/, корень сайта — приложение"
```

- [ ] **Step 5: Ветка для `webgl`**

```bash
cd F:/Github/2026_H2
git -C WebGL-playground-notebook worktree add -b chore/deploy-webgl-path ../WebGL-playground-webgl origin/webgl
cp WebGL-playground-notebook/.github/workflows/pages.yml WebGL-playground-webgl/.github/workflows/pages.yml
```

В `WebGL-playground-webgl/index.html` (строки ~81–83):

```html
          <a class="chip" href="../canvas/">Canvas 2D</a>
          <a class="chip" href="./" aria-current="page">WebGL</a>
          <a class="chip" href="../">React + R3F</a>
```

README — та же таблица веток.

```bash
cd F:/Github/2026_H2/WebGL-playground-webgl
git add .github/workflows/pages.yml index.html README.md
git commit -m "chore: ссылки на варианты под новую раскладку сайта"
```

- [ ] **Step 6: Workflow одинаковый во всех трёх**

```bash
cd F:/Github/2026_H2
diff WebGL-playground-notebook/.github/workflows/pages.yml WebGL-playground-canvas/.github/workflows/pages.yml && \
diff WebGL-playground-notebook/.github/workflows/pages.yml WebGL-playground-webgl/.github/workflows/pages.yml && echo same
```

Expected: `same`.

---

### Task 7: Приёмка (выполняет контроллер)

- [ ] **Step 1:** `bun test` и `bun run build` в `WebGL-playground-notebook` — зелёные.
- [ ] **Step 2:** Пройти чек-лист §9.2 спеки в браузере (Chrome DevTools MCP) на `bun run dev` — пункты 1–10, скриншоты ключевых состояний: форма входа с ошибками, список, блокнот с выбранной ячейкой и полосой на стыке, пустой блокнот, 375px.
- [ ] **Step 3:** Сборка `dist` открывается из подпапки: `bun run preview` — маршруты работают (проверка `base: './'`).
- [ ] **Step 4:** Финальное ревью всей ветки против спеки.
- [ ] **Step 5:** Push трёх веток, PR: `feat/notebook-editor` → `r3f`, `chore/deploy-canvas-path` → `main`, `chore/deploy-webgl-path` → `webgl`; в описании — порядок слияния (сначала `r3f`).
