# Экран входа с терминатором — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в ветку `r3f` экран входа и регистрации, где переключение между формами делает не цветная панель, а проезд терминатора планеты.

**Architecture:** Сцена three.js поднимается из главной в `App` и становится общей для обоих экранов — иначе при входе пересоздался бы `<Canvas>` и на самом важном переходе мигнул бы экран. Экраны управляют сценой декларативно: направление на солнце и целевой угол поворота приходят в `<Sky>` пропсами. Карточка формы отдаётся в сцену как обычный прямоугольник, поэтому `GlassCards` переиспользуется без изменений.

**Tech Stack:** React 19.2, TypeScript 7 (strict, `noUnusedLocals`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`), Vite 8, three 0.186, @react-three/fiber 9.7, @react-three/drei 10.7, bun.

**Spec:** `docs/superpowers/specs/2026-09-21-auth-terminator-design.md`

## Расхождение со спекой (осознанное)

Спека, §5.4, предписывает добавить `sun` и `spin` в `SceneLayout`. План так **не** делает: `SceneLayout` пересчитывается из замеров DOM, а `spin` меняется на каждом переключении форм — каждое нажатие тянуло бы за собой перемер вёрстки. Вместо этого `sun` и `spin` — отдельные пропсы `<Sky>`, а `SceneLayout` остаётся чистой геометрией. Остальное по спеке.

## Global Constraints

- Тестов не пишем (решение зафиксировано в спеке, §7). Проверка каждой задачи — `bun run build` (внутри `tsc --noEmit`, строгий) плюс названная в задаче проверка глазами.
- `verbatimModuleSyntax: true` — типы импортируются только через `import type { X } from '...'`.
- `noUncheckedIndexedAccess: true` — `arr[0]` имеет тип `T | undefined`; обращения нужно защищать (`arr[0] ?? fallback`).
- `noUnusedLocals` / `noUnusedParameters: true` — неиспользуемая локальная переменная или параметр валят сборку.
- **Ловушка R3F:** при создании `<shaderMaterial>` обёртки uniform-ов копируются (`{ ...uniform }`). Запись в исходный объект `uniforms.uTime.value = t` до материала не доходит; числа молча застревают на значениях первого рендера. Значения пишутся **только** через ref на материал: `material.current.uniforms.uTime.value = t`. Правило уже описано в `src/sky/glsl.ts`.
- Язык интерфейса и комментариев — русский. Сообщения коммитов — русские, в стиле репозитория: `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`.
- Палитра и шрифты не заводятся заново: используются существующие переменные из `src/styles.css` (`--void`, `--ice`, `--mist`, `--violet`, `--orchid`, `--display`, `--body`, `--mono`).
- Длительность проезда терминатора — **одна** экспортируемая константа на CSS и на сцену. Стартовое значение 700 мс.
- Без WebGL и до загрузки чанка сцены форма обязана полностью работать.

---

## Структура файлов

| Файл | Ответственность |
|---|---|
| `src/session.ts` | **создаётся** — факт входа в localStorage, инициалы для аватара |
| `src/screens/Notebooks.tsx` | **создаётся** — нынешнее содержимое `App`: шапка, hero, сетка, подвал |
| `src/screens/Auth.tsx` | **создаётся** — экран входа: раскладка, свет, переключение режимов |
| `src/auth/AuthCard.tsx` | **создаётся** — карточка: две формы и приглашение |
| `src/auth/useAuthForm.ts` | **создаётся** — поля, валидация, отправка |
| `src/auth/timing.ts` | **создаётся** — общая константа длительности проезда |
| `src/App.tsx` | становится тонким: сессия, выбор экрана, общая `<Sky>` |
| `src/types.ts` | `SunDirection`, `SUN_ORBIT`, `AuthMode` |
| `src/useSceneLayout.ts` | обобщается: `glowRef` вместо `heroRef`, `cardsRef` вместо `gridRef` |
| `src/sky/Sky.tsx` | пропсы `sun`, `spin`, `tickMs`; проброс в `Planet` и `Backdrop` |
| `src/sky/Planet.tsx` | `SUN` из `const` в uniform; поворот к целевому углу |
| `src/sky/Backdrop.tsx` | `sunSide` следует за направлением на солнце |
| `src/styles.css` | стили экрана входа, рассветный вариант `.limb`, адаптив |
| `README.md` | раздел про экран входа |

---

### Task 1: Сессия и расщепление App

Чистый рефакторинг: главная должна выглядеть и работать ровно как до него.

**Files:**
- Create: `src/session.ts`
- Create: `src/screens/Notebooks.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: ничего.
- Produces: `Session { email: string; name?: string }`, `loadSession(): Session | null`, `saveSession(s: Session): void`, `clearSession(): void`, `initials(s: Session): string`; компонент `Notebooks`.

- [ ] **Шаг 1: Создать `src/session.ts`**

```ts
/* Факт входа переживает перезагрузку. Хранилище может быть недоступно (приватный режим) —
   тогда вход просто не сохраняется, но работает. */

export interface Session {
  email: string;
  /** Имя вводят только при регистрации; при входе его нет */
  name?: string;
}

const KEY = 'nebulab-session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { email, name } = parsed as Record<string, unknown>;
    if (typeof email !== 'string' || !email) return null;
    return typeof name === 'string' && name ? { email, name } : { email };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* хранилище заблокировано */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* хранилище заблокировано */ }
}

/** Инициалы для аватара: из имени, а если его нет — первая буква почты */
export function initials(session: Session): string {
  const name = session.name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (session.email[0] ?? '?').toUpperCase();
}
```

- [ ] **Шаг 2: Перенести разметку главной в `src/screens/Notebooks.tsx`**

Взять из текущего `src/App.tsx` всё, что рисует главную: состояние `notebooks` / `active` / `query` / `toast`, обработчик `createNotebook`, вычисление `shown`, и JSX от `<TopBar …>` до `<Footer …>` включая `{toast && …}`. Пропсы: `{ gridRef, heroRef, limbRef, motion, onMotion, cards, onCards, glassOn }`. Импорты типов — через `import type`.

Аватар пока оставить прежним (тост «в прототипе профиль не подключён»); выход подключается в задаче 4.

- [ ] **Шаг 3: Сделать `src/App.tsx` тонким**

`App` оставляет себе: `session` (из `loadSession()` в инициализаторе `useState`), `motion`, `cards`, `skyReady`, `glassReady`, рефы раскладки, вызов `useSceneLayout`, `<SceneBoundary><Suspense><Sky …/></Suspense></SceneBoundary>` и рендер экрана. Пока `session === null` не обрабатывается — временно рендерим `Notebooks` всегда; экран входа появляется в задаче 3.

`className` на `.page` остаётся прежним: `` `page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}` ``.

- [ ] **Шаг 4: Проверить сборку**

Run: `bun run build`
Expected: успех, без ошибок типов. Размеры чанков близки к исходным (основной ~66 КБ gzip, `Sky` ~265 КБ gzip).

- [ ] **Шаг 5: Проверить, что главная не изменилась**

Run: `bun run dev`, открыть на 1440px.
Expected: шапка, hero, планета, сетка карточек, подвал — как были; фильтры, поиск, создание блокнота, переключатели стекла и анимации работают; в консоли нет ошибок (допускается известное `THREE.Clock: deprecated`).

- [ ] **Шаг 6: Коммит**

```bash
git add src/session.ts src/screens/Notebooks.tsx src/App.tsx
git commit -m "refactor: главная уехала в screens/Notebooks, App держит сессию и сцену"
```

---

### Task 2: Солнце и угол поворота приходят в сцену снаружи

Тоже поведение-нейтральная задача: на значениях по умолчанию главная обязана выглядеть идентично.

**Files:**
- Modify: `src/types.ts`
- Create: `src/auth/timing.ts`
- Modify: `src/sky/Planet.tsx`
- Modify: `src/sky/Backdrop.tsx`
- Modify: `src/sky/Sky.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SceneLayout` из `src/types.ts`.
- Produces: `SunDirection = [number, number, number]`; `SUN_ORBIT: SunDirection`; `SWEEP_MS: number`; пропсы `<Sky sun spin tickMs>`; `Planet` принимает `sun` и `spin`, `Backdrop` принимает `sun`.

- [ ] **Шаг 1: Добавить тип и константу в `src/types.ts`**

```ts
/** Направление на солнце в координатах сцены */
export type SunDirection = [number, number, number];

/** Солнце главной: стоит за планетой, поэтому освещён узкий серп у кромки */
export const SUN_ORBIT: SunDirection = [0, 0.38, -0.925];
```

- [ ] **Шаг 2: Создать `src/auth/timing.ts`**

```ts
/* Одна длительность на оба конца: CSS-переход формы и доворот планеты в useFrame.
   Идеальной синхронности кадр-в-кадр не будет — часы разные, — но глаз ловит только
   грубое рассогласование, поэтому важно, чтобы число было одно. */
export const SWEEP_MS = 700;
```

- [ ] **Шаг 3: В `src/sky/Planet.tsx` перевести `SUN` в uniform**

Удалить строку `const vec3 SUN = vec3(0.0, 0.38, -0.925);` из фрагментного шейдера, добавить `uniform vec3 uSun;` к остальным uniform-ам, и заменить использования:

```glsl
vec3 sunDir = normalize(uSun);
float ndl = dot(n, sunDir);
```

`sunSide` обобщается с «сторона, обращённая вверх» на «сторона, обращённая к солнцу». Было:

```glsl
float sunSide = pow(max(n.y / max(length(n.xy), 1e-4), 0.0), 1.5);
```

Стало:

```glsl
vec2 sunXY = normalize(sunDir.xy + vec2(1e-6));
float sunSide = pow(max(dot(normalize(n.xy + vec2(1e-6)), sunXY), 0.0), 1.5);
```

При `uSun = (0, 0.38, -0.925)` получается `sunXY = (0, 1)`, и формула сворачивается в прежнюю — поэтому главная не меняется.

`uSun` добавляется в `useMemo` с uniform-ами как `uSun: { value: new THREE.Vector3() }`.

- [ ] **Шаг 4: В `src/sky/Planet.tsx` заменить инкрементальный поворот на поворот к целевому углу**

Добавить в пропсы `spin: number` и `sun: SunDirection`. Вместо `rotateOnWorldAxis` держать угол в рефах и ставить поворот абсолютно:

```tsx
const drift = useRef(0);    // непрерывное вращение планеты
const sweep = useRef(0);    // доворот, которым управляет экран

useFrame((state, delta) => {
  const u = material.current?.uniforms as typeof uniforms | undefined;
  if (!u || !mesh.current) return;
  u.uRadius.value = planet.R;
  u.uFade.value.set(fade[0], fade[1]);
  u.uSun.value.set(sun[0], sun[1], sun[2]);

  const d = Math.min(delta, 0.1);
  // Экспоненциальное сглаживание: не зависит от частоты кадров, за SWEEP_MS проходит ~95% пути
  sweep.current += (spin - sweep.current) * (1 - Math.exp(-d / (SWEEP_MS / 3000)));
  if (motion) {
    drift.current -= 0.0085 * d;
    u.uTime.value = state.clock.elapsedTime;
  }
  mesh.current.setRotationFromAxisAngle(AXIS, drift.current + sweep.current);
});
```

Важно: поворот теперь ставится абсолютно (`setRotationFromAxisAngle`), а не накапливается — иначе доворот нельзя было бы задать целью. Для вращения вокруг одной оси это эквивалентно прежнему. Доворот применяется и при выключенной анимации: переключение форм должно работать всегда.

- [ ] **Шаг 5: В `src/sky/Backdrop.tsx` подчинить ореол направлению на солнце**

Добавить `uniform vec3 uSun;`, проп `sun: SunDirection` и `uSun: { value: new THREE.Vector3() }` в `useMemo`. Было:

```glsl
float sunSide = pow(max(-d.y / dist, 0.0), 1.5);
```

Стало:

```glsl
vec2 sunXY = normalize(uSun.xy + vec2(1e-6));
float sunSide = pow(max(dot(normalize(vec2(d.x, -d.y)), sunXY), 0.0), 1.5);
```

Так же сворачивается в прежнюю формулу при солнце главной. Значение пишется в `useFrame` через ref на материал: `u.uSun.value.set(sun[0], sun[1], sun[2])`.

- [ ] **Шаг 6: Пробросить пропсы через `src/sky/Sky.tsx`**

`SkyProps` получает `sun: SunDirection`, `spin: number`, `tickMs: number`. `Ticker` берёт интервал из пропа вместо зашитых 33 мс:

```tsx
function Ticker({ enabled, tickMs }: { enabled: boolean; tickMs: number }) {
  // ...
  if (!onScreen || now - last < tickMs) return;
  // ...
}
```

`tickMs` добавляется в массив зависимостей эффекта рядом с `enabled`. Дальше: `<Backdrop … sun={sun} />`, `<Planet … sun={sun} spin={spin} />`.

- [ ] **Шаг 7: Передать значения по умолчанию из `src/App.tsx`**

`<Sky … sun={SUN_ORBIT} spin={0} tickMs={33} />`.

- [ ] **Шаг 8: Проверить сборку**

Run: `bun run build`
Expected: успех.

- [ ] **Шаг 9: Сверить, что главная не изменилась визуально**

Открыть главную до и после на одном размере окна, снять два скриншота и сравнить.
Expected: освещение кромки, ореол атмосферы, скорость вращения — без видимой разницы. Это и есть критерий приёмки задачи: рефакторинг не должен был ничего сдвинуть.

- [ ] **Шаг 10: Коммит**

```bash
git add src/types.ts src/auth/timing.ts src/sky/Planet.tsx src/sky/Backdrop.tsx src/sky/Sky.tsx src/App.tsx
git commit -m "refactor: направление на солнце и угол поворота приходят в сцену пропсами"
```

---

### Task 3: Каркас экрана входа

Свет пока прежний — задача про раскладку и переключение.

**Files:**
- Create: `src/screens/Auth.tsx`
- Create: `src/auth/AuthCard.tsx`
- Modify: `src/types.ts`
- Modify: `src/useSceneLayout.ts`
- Modify: `src/screens/Notebooks.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `Session`, `SceneLayout`, `SunDirection`, `SUN_ORBIT`.
- Produces: `AuthMode = 'login' | 'signup'`; компонент `Auth`; обобщённый `useSceneLayout(refs, options, deps)` с `LayoutRefs { pageRef, limbRef, glowRef, cardsRef }`.

- [ ] **Шаг 1: Добавить тип режима в `src/types.ts`**

```ts
export type AuthMode = 'login' | 'signup';
```

- [ ] **Шаг 2: Обобщить `src/useSceneLayout.ts`**

`LayoutRefs` меняет два поля, чтобы хук обслуживал оба экрана:

```ts
export interface LayoutRefs {
  pageRef: RefObject<HTMLDivElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  /** элемент, от верха которого отсчитывается свечение за заголовком */
  glowRef: RefObject<HTMLElement | null>;
  /** контейнер, чьи потомки `.card` уезжают в сцену стёклами */
  cardsRef: RefObject<HTMLElement | null>;
}
```

В теле `heroEl` → `glowEl`, `grid` → `cards`. Логика замеров не меняется. `Notebooks` передаёт свой `heroRef` как `glowRef` и `gridRef` как `cardsRef` — поведение главной прежнее.

- [ ] **Шаг 3: Создать `src/auth/AuthCard.tsx`**

Карточка с двумя половинами. В этой задаче формы — статичная разметка с полями и метками (валидация в задаче 4). Класс на карточке: `card auth-card` (`card` — чтобы `useSceneLayout` нашёл её как стекло).

Разметка формы:

```tsx
<form className="auth-form" noValidate onSubmit={e => e.preventDefault()}>
  <h1>{mode === 'login' ? 'Вход' : 'Создание аккаунта'}</h1>
  {mode === 'signup' && (
    <label className="field">
      <span>Имя</span>
      <input type="text" name="name" autoComplete="name" />
    </label>
  )}
  <label className="field">
    <span>Почта</span>
    <input type="email" name="email" autoComplete="email" placeholder="имя@домен" />
  </label>
  <label className="field">
    <span>Пароль</span>
    <span className="field-input">
      <input type={shown ? 'text' : 'password'} name="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      <button type="button" className="field-toggle" aria-pressed={shown}
        aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
        onClick={() => setShown(v => !v)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M1.5 9s2.8-4.5 7.5-4.5S16.5 9 16.5 9s-2.8 4.5-7.5 4.5S1.5 9 1.5 9Z"
            stroke="currentColor" strokeWidth="1.3" fill="none" />
          <circle cx="9" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.3" fill="none" />
          {shown && <path d="m3 15 12-12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
        </svg>
      </button>
    </span>
  </label>
  <button className="btn btn-primary" type="submit">
    {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
  </button>
</form>
```

Состояние показа — локальное для карточки: `const [shown, setShown] = useState(false);`. При смене режима сбрасывается в `false`, чтобы пароль не оставался открытым на новой форме.

Половина с приглашением:

```tsx
<div className="auth-invite">
  <p>{mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}</p>
  <button className="btn btn-ghost" type="button"
    onClick={() => onMode(mode === 'login' ? 'signup' : 'login')}>
    {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
  </button>
</div>
```

Порядок половин в DOM постоянный; какая из них слева, решает `order` в CSS по режиму — так переключение не переставляет узлы и не сбрасывает фокус.

- [ ] **Шаг 4: Создать `src/screens/Auth.tsx`**

Логотип `nebulab` над карточкой (тот же `<svg>` и подпись, что в `src/components/TopBar.tsx`), под ним `<AuthCard>`, и `.limb` как источник геометрии планеты — ровно как в `Hero`.

- [ ] **Шаг 5: Подключить выбор экрана в `src/App.tsx`**

`session === null` → `<Auth …>`, иначе `<Notebooks …>`. На экране входа `glowRef` и `cardsRef` указывают на контейнер карточки.

- [ ] **Шаг 6: Стили экрана в `src/styles.css`**

```css
/* ── Экран входа ── */
.auth { position: relative; display: flex; flex-direction: column; align-items: center; gap: clamp(24px, 5vh, 48px); padding-block: clamp(40px, 12vh, 120px); }
.auth-card { display: grid; grid-template-columns: 1fr 1fr; width: min(900px, 100%); min-height: 420px; }
.auth-form { display: flex; flex-direction: column; gap: 18px; padding: 36px 40px; }
.auth-form h1 { margin: 0 0 6px; font: 500 clamp(22px, 3vw, 30px)/1.15 var(--display); letter-spacing: -.02em; }
.auth-invite { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 36px 40px; text-align: center; }
.auth-invite p { margin: 0; font: 500 18px/1.3 var(--display); letter-spacing: -.01em; }
.field { display: flex; flex-direction: column; gap: 7px; font-size: 13px; color: var(--mist); }
.field-input { position: relative; display: flex; align-items: center; }
.field input { width: 100%; height: 44px; padding: 0 44px 0 14px; border-radius: 12px; background: rgba(255, 255, 255, .05); border: 1px solid var(--line); color: var(--ice); font-size: 15px; transition: border-color .15s, box-shadow .15s; }
.field input:focus { outline: 0; border-color: rgba(160, 135, 255, .6); box-shadow: 0 0 0 3px rgba(139, 108, 255, .22); }
.field-toggle { position: absolute; right: 6px; display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 0; border-radius: 9px; background: none; color: var(--mist); cursor: pointer; }
.field-toggle:hover { color: var(--ice); }
.mode-signup .auth-form { order: 2; }
.mode-signup .auth-invite { order: 1; }
```

- [ ] **Шаг 7: Проверить сборку**

Run: `bun run build`
Expected: успех.

- [ ] **Шаг 8: Проверить экран**

Run: `bun run dev`. Очистить ключ `nebulab-session` в localStorage и перезагрузить.
Expected: виден экран входа, карточка на две колонки, кнопка «Создать аккаунт» меняет содержимое и стороны половин, горизонтального скролла нет.

- [ ] **Шаг 9: Коммит**

```bash
git add src/screens/Auth.tsx src/auth/AuthCard.tsx src/types.ts src/useSceneLayout.ts src/screens/Notebooks.tsx src/App.tsx src/styles.css
git commit -m "feat: каркас экрана входа с переключением форм"
```

---

### Task 4: Формы, валидация, вход и выход

**Files:**
- Create: `src/auth/useAuthForm.ts`
- Modify: `src/auth/AuthCard.tsx`
- Modify: `src/screens/Auth.tsx`
- Modify: `src/screens/Notebooks.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `Session`, `AuthMode`, `saveSession`, `clearSession`, `initials`.
- Produces: `useAuthForm(mode, onDone)` → `{ values, errors, busy, setValue, blurField, reset, submit }`, где `submit()` возвращает `Promise<'name' | 'email' | 'password' | null>` — имя первого проблемного поля или `null` при успехе.

- [ ] **Шаг 1: Создать `src/auth/useAuthForm.ts`**

Правила ровно по таблице спеки §4.3. Адрес `taken@nebulab.ru` при регистрации возвращает отказ — так состояние серверной ошибки можно показать руками.

```ts
import { useState } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';

const TAKEN = 'taken@nebulab.ru';
export type Field = 'name' | 'email' | 'password';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: AuthMode, values: Values): Errors {
  const errors: Errors = {};
  if (mode === 'signup' && !values.name.trim()) errors.name = 'Введите имя';
  if (!values.email.trim()) errors.email = 'Введите почту';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Адрес вида имя@домен';
  if (!values.password) errors.password = 'Введите пароль';
  else if (values.password.length < 8) errors.password = 'Нужно не меньше 8 символов';
  return errors;
}
```

Хук — без `useCallback`: форма маленькая, а замыкания на `values` иначе устаревают.

```ts
const EMPTY: Values = { name: '', email: '', password: '' };
const ORDER: Field[] = ['name', 'email', 'password'];

export function useAuthForm(mode: AuthMode, onDone: (session: Session) => void) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function setValue(field: Field, value: string): void {
    setValues(prev => ({ ...prev, [field]: value }));
    // ошибку снимаем сразу: ругаться, пока человек исправляет, незачем
    setErrors(prev => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }));
  }

  function blurField(field: Field): void {
    const found = validate(mode, values)[field];
    setErrors(prev => ({ ...prev, [field]: found }));
  }

  /** Сбросить ошибки при смене режима — правила у форм разные */
  function reset(): void {
    setErrors({});
    setBusy(false);
  }

  async function submit(): Promise<Field | null> {
    const found = validate(mode, values);
    setErrors(found);
    const firstBad = ORDER.find(field => found[field] !== undefined);
    if (firstBad) return firstBad;

    setBusy(true);
    await new Promise(resolve => setTimeout(resolve, 600));   // чтобы состояние отправки было видно
    setBusy(false);

    const email = values.email.trim();
    if (mode === 'signup' && email.toLowerCase() === TAKEN) {
      setErrors({ email: 'Этот адрес уже занят. Войдите или возьмите другой' });
      return 'email';
    }
    const name = values.name.trim();
    onDone(name ? { email, name } : { email });
    return null;
  }

  return { values, errors, busy, setValue, blurField, reset, submit };
}
```

- [ ] **Шаг 2: Подключить хук в `AuthCard`, показать ошибки под полями**

Каждое поле получает `aria-invalid` и `aria-describedby` на свой блок ошибки; блок — `role="alert"`. Ошибка рисуется под полем, не тостом. После неудачной отправки фокус уходит на первое проблемное поле (по возвращённому из `submit()` имени), после смены режима — на первое поле новой формы (`useEffect` по `mode`). Кнопка при `busy` получает `disabled`, текст на ней не меняется.

- [ ] **Шаг 3: Стили ошибок и вспомогательной кнопки в `src/styles.css`**

```css
.field-error { font-size: 12.5px; color: #ff9a9a; }
.field input[aria-invalid="true"] { border-color: rgba(255, 120, 120, .55); }
.auth-aux { margin: 0; padding: 0; font-size: 13px; color: var(--mist); background: none; border: 0; cursor: pointer; text-align: left; }
.auth-aux:hover { color: var(--ice); }
.btn:disabled { opacity: .6; cursor: progress; }
```

- [ ] **Шаг 4: «Забыли пароль?» отвечает тостом**

Кнопка `.auth-aux` под формой входа (только в режиме `login`), текст тоста: `В прототипе восстановление не подключено`. Тост переиспользует существующий класс `.toast` и `role="status"`, живёт 2600 мс — как на главной.

- [ ] **Шаг 5: Аватар становится выходом**

`TopBar` получает пропсы `initials: string` и `onSignOut: () => void`; `aria-label` аватара — `Выйти`, содержимое — `initials`. Захардкоженное «АЛ» и проп `onProfile` убрать. В `App` выход делает `clearSession()` и `setSession(null)`. Вход делает `saveSession(s)` и `setSession(s)`.

- [ ] **Шаг 6: Проверить сборку**

Run: `bun run build`
Expected: успех.

- [ ] **Шаг 7: Пройти таблицу валидации руками**

Expected, строка за строкой: пустые поля → «Введите почту» / «Введите пароль» / «Введите имя»; `почта-без-собаки` → «Адрес вида имя@домен»; пароль `1234` → «Нужно не меньше 8 символов»; регистрация на `taken@nebulab.ru` → «Этот адрес уже занят. Войдите или возьмите другой» **под полем почты, не тостом**; успешный вход → список блокнотов; перезагрузка → остаёмся внутри; клик по аватару → снова форма; инициалы в аватаре соответствуют введённому имени.

- [ ] **Шаг 8: Проверить фокус с клавиатуры**

Expected: после переключения режима фокус на первом поле новой формы; после отправки с ошибками — на первом проблемном поле; до кнопки показа/отправки можно дойти табом, кольцо фокуса видно.

- [ ] **Шаг 9: Коммит**

```bash
git add src/auth/useAuthForm.ts src/auth/AuthCard.tsx src/screens/Auth.tsx src/screens/Notebooks.tsx src/components/TopBar.tsx src/App.tsx src/styles.css
git commit -m "feat: валидация форм, вход и выход через аватар"
```

---

### Task 5: Свет — рассветное солнце и проезд терминатора

**Files:**
- Modify: `src/screens/Auth.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `SunDirection`, `SWEEP_MS`, пропсы `<Sky sun spin tickMs>`.
- Produces: `SUN_DAWN: SunDirection`, `SWEEP_ANGLE: number` (экспортируются из `src/screens/Auth.tsx`).

- [ ] **Шаг 1: Завести рассветное солнце и угол доворота в `src/screens/Auth.tsx`**

```ts
/* Солнце уходит вбок: граница дня и ночи становится почти вертикальной и проходит
   через центр карточки. Значение подбирается на экране, критерий — терминатор по центру. */
export const SUN_DAWN: SunDirection = [0.92, 0.12, -0.37];

/** Доворот, при котором свет полностью пересекает карточку, и не больше */
export const SWEEP_ANGLE = 0.16;
```

- [ ] **Шаг 2: Отдавать `sun` и `spin` из экрана в `App`**

Экран входа: `sun = SUN_DAWN`, `spin = mode === 'login' ? 0 : SWEEP_ANGLE`. Главная: `sun = SUN_ORBIT`, `spin = 0`. Режим `mode` живёт в `App`, чтобы им могли пользоваться и экран, и сцена.

- [ ] **Шаг 3: Разгонять тикер на время проезда и возвращать обратно**

В `App` — состояние `sweeping`, которое включается при смене `mode` и выключается через `SWEEP_MS`:

```tsx
useEffect(() => {
  setSweeping(true);
  const timer = setTimeout(() => setSweeping(false), SWEEP_MS);
  return () => clearTimeout(timer);
}, [mode]);
```

`<Sky … tickMs={sweeping ? 0 : 33} />`. `tickMs = 0` означает «каждый кадр rAF»: 21 кадра за проезд мало, свет поехал бы ступенчато. Важно, что таймер возвращает значение обратно — это отдельно проверяется в шаге 8.

- [ ] **Шаг 4: Рассветный вариант CSS-фолбэка `.limb`**

Пока чанк сцены не загрузился, фон рисует CSS. На экране входа градиент у `.limb` должен быть боковым, иначе в момент готовности сцены свет прыгнет:

```css
.auth-page .limb {
  background: radial-gradient(ellipse 30% 14% at 86% 6%, rgba(200, 180, 255, .30), transparent 70%), var(--void);
  box-shadow: 0 0 0 1px rgba(205, 190, 255, .22), 24px -6px 26px rgba(230, 215, 255, .35), 60px -20px 90px -6px rgba(139, 108, 255, .45), inset -40px 30px 70px -40px rgba(190, 160, 255, .35);
}
```

Класс `auth-page` ставится на `.page`, когда показан экран входа.

- [ ] **Шаг 5: Синхронизировать переход формы с той же константой**

```css
.auth-form, .auth-invite { transition: opacity calc(var(--sweep) * .5) ease, transform var(--sweep) ease; }
```

`--sweep` ставится из JS из `SWEEP_MS`, чтобы константа осталась одна:

```tsx
style={{ '--sweep': `${SWEEP_MS}ms` } as CSSProperties}
```

- [ ] **Шаг 6: Проверить сборку**

Run: `bun run build`
Expected: успех.

- [ ] **Шаг 7: Подобрать `SUN_DAWN` и `SWEEP_ANGLE` на экране**

Критерии из спеки §9: терминатор проходит через центр карточки на 1440px; доворот полностью пересекает карточку и не больше. Править значения, пока критерии не выполнены. Это подбор, а не угадывание: после каждой правки — скриншот.

- [ ] **Шаг 8: Замерить, что тикер вернулся на 30 кадров**

В консоли страницы, в покое и через секунду после переключения:

```js
const p = WebGL2RenderingContext.prototype, o = p.clear; let n = 0;
p.clear = function (...a) { n++; return o.apply(this, a); };
setTimeout(() => { console.log('проходов в секунду:', n / 2); p.clear = o; }, 2000);
```

Expected: в покое и через секунду после переключения число одинаковое; замер, начатый в момент переключения, заметно выше.

- [ ] **Шаг 9: Коммит**

```bash
git add src/screens/Auth.tsx src/App.tsx src/styles.css
git commit -m "feat: терминатор проезжает по карточке при переключении форм"
```

---

### Task 6: Стекло, адаптив, reduced-motion и приёмка

**Files:**
- Modify: `src/screens/Auth.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Шаг 1: Убедиться, что карточка формы уходит в сцену стеклом**

У `.auth-card` есть класс `card`, её контейнер передан как `cardsRef`, на экране входа `glass` включён всегда (режим `cards-liquid` на `.page`).

- [ ] **Шаг 2: Мобильная раскладка**

```css
@media (max-width: 860px) {
  .auth-card { grid-template-columns: 1fr; min-height: 0; }
  .auth-form { padding: 28px 24px; }
  .auth-invite { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 0 24px 28px; }
  .auth-invite p { font: 400 14px/1.3 var(--body); color: var(--mist); }
  .mode-signup .auth-form, .mode-signup .auth-invite { order: 0; }
}
```

На узком экране приглашение — одна строка под формой, свет карточку не делит, порядок половин не переставляется.

- [ ] **Шаг 3: `prefers-reduced-motion`**

```css
@media (prefers-reduced-motion: reduce) {
  .auth-form, .auth-invite { transition: none; }
}
```

В `App` при `matchMedia('(prefers-reduced-motion: reduce)').matches` не включать `sweeping` — свет встаёт на новое место сразу, без разгона тикера.

- [ ] **Шаг 4: Контраст приглашения на самом светлом кадре**

Снять скриншот в середине проезда, взять цвет фона под текстом приглашения и посчитать контраст с цветом текста.
Expected: не ниже 4.5:1. Не добирает — усиливать тонировку стекла, **не** утолщать шрифт (спека §6.2).

- [ ] **Шаг 5: Форма без WebGL**

В консоли до загрузки подменить `HTMLCanvasElement.prototype.getContext` на возвращающий `null`, перезагрузить.
Expected: `SceneBoundary` гасит сцену, остаётся CSS-фон, форма полностью работает — валидация, вход, переключение.

- [ ] **Шаг 6: Форма до загрузки сцены**

В DevTools включить троттлинг сети, открыть экран входа и начать вводить почту и пароль, пока `Sky-*.js` ещё грузится.
Expected: поля принимают ввод, «Войти» срабатывает.

- [ ] **Шаг 7: Скриншоты на 1440 и 390**

Три точки: до загрузки сцены, покой, середина проезда.
Expected: свет не прыгает в момент готовности сцены; на 390px карточка одноколоночная, горизонтального скролла нет.

- [ ] **Шаг 8: Дописать README**

Раздел про экран входа: что он делает, почему терминатор вместо цветной панели, ссылка на спеку.

- [ ] **Шаг 9: Финальная сборка**

Run: `bun run build`
Expected: успех; основной чанк вырос незначительно — форма это разметка и немного логики, сцена в нём не лежит.

- [ ] **Шаг 10: Коммит**

```bash
git add src/screens/Auth.tsx src/App.tsx src/styles.css README.md
git commit -m "feat: стекло карточки, адаптив и reduced-motion на экране входа"
```
