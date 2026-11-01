# Auth Planet Flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить переключение половин auth-карточки на близкий перелёт между двумя неподвижными планетами с рабочими формами входа и регистрации.

**Architecture:** Один существующий ленивый Canvas; внутри него auth использует перспективную камеру и мировые координаты, список/блокнот сохраняют пиксельную ортографическую композицию. `App` хранит дискретное состояние перелёта, `AuthScene` вычисляет положение камеры через `useFrame`, а обычные DOM-форма и кнопка переключения обеспечивают ввод и доступность. Небольшой контроллер воспроизводит путь B напрямую; `MotionPathControls` и новые зависимости не нужны.

**Tech Stack:** Существующие React ~19.2, Three.js ^0.186.0, @react-three/fiber ^9.7.0, @react-three/drei ^10.7.8, TanStack Router, TypeScript, Bun/Vite. Версии и lockfile не обновлять.

**Spec:** [2026-11-01-auth-planet-flight-design.md](../specs/2026-11-01-auth-planet-flight-design.md). Прочитать целиком вместе со снимками конечных композиций; сентябрьская auth-спека не определяет эту работу.

## Global Constraints

- «Две неподвижные планеты в общем пространстве; камера летает между ними туда и обратно сколько угодно раз».
- «Выбран **B — близкий пролёт**, а не обзорная дуга»; примерно **1,8 с**, угасание/проявление примерно по **180 мс**.
- Вход: соседняя планета справа, «Ещё нет аккаунта?»; регистрация: слева, «Уже есть аккаунт?»; заголовки «Вход» / «Регистрация», кнопки «Войти» / «Создать аккаунт».
- «Форма быстро гаснет при вылете, скрыта во время полёта и появляется после прибытия»; скрытые поля не принимают ввод и фокус.
- «Повторные клики во время полёта не создают очередь и не разворачивают камеру: они игнорируются»; «Во время отправки формы нельзя начать перелёт».
- «Значения полей переживают переключение так же, как сейчас; при смене режима очищаются ошибки и выключается показ пароля».
- «При login ↔ signup Canvas не пересоздаётся»; «Покадровые координаты не хранить в React state»; существующий список/блокнот сохраняет композицию.
- «Активная область на touch не меньше 44 CSS px»; reduced-motion — без полёта и непрерывного движения; до загрузки 3D/при отказе WebGL формы доступны и переключаются мгновенно.
- Только `YarikMix/WebGL-playground`; без backend, дополнительных auth-полей, нового движка, свободной камеры, гиперпространственных полос и переноса в командный frontend.

## Review Focus

- Поздняя готовность/ошибка сцены посреди переключения: видимая форма соответствует конечному ракурсу, интерфейс не остаётся inert; проверки **T3-F**.
- Серия кликов и submit на границе полёта: один переход, без очереди и поздней отправки другой формы; unit-тест **T1** и браузерная проверка **T2-B**.
- Узкий/низкий viewport, resize и экранная клавиатура: поля и соседняя планета доступны, подпись не перекрывает поля; **T3-V**.
- Уход во фоновую вкладку и клавиатурный ввод: полёт завершается по времени, скрытые поля не получают фокус, устаревший callback не перехватывает его; **T1**, **T2-K**, **T3-T**.
- Возврат через logout и защищённые маршруты: начальная планета входа, рабочий redirect, неизменные список и редактор; **T3-R**.

---

## Границы файлов и интерфейсы

Все пути относительно корня `WebGL-playground`. Реализацию начинать в изоляции через `superpowers:using-git-worktrees`, с текущим документом и спекой в исходной ветке. Способ выполнения сначала выбирает владелец.

| Файл | Ответственность |
|---|---|
| Create `src/auth/flight.ts`, `src/auth/flight.test.ts` | Чистая модель перехода, время, математический путь B и его тесты; без React/Three |
| Modify `src/App.tsx`, `src/shell.ts` | Единственное состояние перелёта, готовность auth-сцены, общий ref кнопки и связь DOM ↔ Canvas |
| Modify `src/screens/Auth.tsx` | Владелец существующего `useAuthForm`, переключатель планеты, защита busy, рабочая навигация |
| Modify `src/auth/AuthCard.tsx` | Компактная DOM-форма; доступность, показ пароля, ошибки и фокус после проявления |
| Create `src/sky/AuthScene.tsx` | Перспективная камера, кадрирование, мировые звёзды, прогресс перелёта, проекция кнопки |
| Create `src/sky/AuthPlanet.tsx` | Сфера и атмосферная оболочка auth-планеты, процедурные материалы |
| Create `src/sky/planet-shaders.ts`; modify `src/sky/Planet.tsx` | Переиспользуемые строки шейдеров; корректный взгляд перспективной камеры с сохранением пиксельного режима |
| Modify `src/sky/Sky.tsx` | Выбор композиции внутри общего Canvas, частота кадров и обработка потери контекста |
| Modify `src/useSceneLayout.ts`, `src/styles.css` | Размер auth-сцены по её DOM, оформление из наброска, адаптивность, статичное оформление без WebGL |
| Modify `src/sky/FirstFrame.tsx` | Отмена отложенного `onReady` при размонтировании |
| Delete `src/auth/Moon.tsx` | Удалить старую DOM-луну, когда её заменят две 3D-планеты |
| Create `docs/superpowers/reports/2026-11-01-auth-planet-flight.md` | Краткие результаты браузерных проверок, снимки/пути к ним, реальные условия замера |

Не менять правила `src/auth/useAuthForm.ts`, роутер и session store. `src/auth/useAuthForm.test.ts`, тесты маршрутов/сессии/блокнотов — существующая регрессия. Старые `Backdrop`, `Stars`, `Meteor`, `GlassCards` остаются для списка/редактора; их пиксельные координаты не использовать в auth.

### Task 1: Чистая модель перелёта и математический путь B

**Files:** Create `src/auth/flight.ts`, `src/auth/flight.test.ts`.

**Interfaces:**

- Consumes: `AuthMode` из `src/types.ts`.
- Produces: `AUTH_FLIGHT_MS = 1800`, `AUTH_FADE_MS = 180`.
- Produces: `type Point3 = readonly [number, number, number]`; `interface AuthFlight { mode: AuthMode; target: AuthMode; startedAt: number | null }`. `mode` меняется только по прибытии; `null` означает покой.
- Produces: `idleFlight(mode: AuthMode): AuthFlight`; `beginFlight(state: AuthFlight, target: AuthMode, now: number, animate: boolean): AuthFlight`; `completeFlight(state: AuthFlight, startedAt: number): AuthFlight`.
- Produces: `sampleFlight(state: AuthFlight, now: number): { progress: number; done: boolean }`; `samplePose(progress: number): { eye: Point3; lookAt: Point3 }`. `progress` — абсолютная координата пути: 0 у входа, 1 у регистрации; `done` истинно только для завершившегося активного перелёта.

- [x] **Step 1: Написать содержательные тесты перехода и пути.** В `flight.test.ts` использовать `bun:test`; отдельные `test` для указанных случаев:

Имена тестов: `starts once and ignores repeated requests`, `samples forward and reverse with the same easing`, `commits only the current trip`, `switches immediately without animation`, `finishes after a long frame gap`, `reproduces close-flight camera poses`. Константы отдельно проверить: `expect(AUTH_FLIGHT_MS).toBe(1800)` и `expect(AUTH_FADE_MS).toBe(180)`.

```ts
const idle = idleFlight('login');
const trip = beginFlight(idle, 'signup', 1000, true);
expect(trip).toEqual({ mode: 'login', target: 'signup', startedAt: 1000 });
expect(beginFlight(idle, 'login', 1000, true)).toBe(idle);
expect(beginFlight(trip, 'login', 1100, true)).toBe(trip);
expect(sampleFlight(trip, 1000)).toEqual({ progress: 0, done: false });
expect(sampleFlight(trip, 1900)).toEqual({ progress: 0.5, done: false });
expect(sampleFlight(trip, 2800)).toEqual({ progress: 1, done: true });
expect(sampleFlight(trip, 12000)).toEqual({ progress: 1, done: true });
expect(completeFlight(trip, 999)).toBe(trip); // устаревшее завершение
const signup = completeFlight(trip, 1000);
expect(signup).toEqual(idleFlight('signup'));
expect(sampleFlight(signup, 12000)).toEqual({ progress: 1, done: false });
const back = beginFlight(signup, 'login', 4000, true);
expect(sampleFlight(back, 4900)).toEqual({ progress: 0.5, done: false });
expect(completeFlight(back, 4000)).toEqual(idle);
expect(completeFlight(back, 1000)).toBe(back);
expect(beginFlight(idle, 'signup', 1000, false)).toEqual(signup);
expect(samplePose(0)).toEqual({ eye: [-13, 0.8, 3], lookAt: [-8, 0, 0] });
expect(samplePose(1).eye[0]).toBe(13);
expect(samplePose(1).lookAt).toEqual([8, 0, 0]);
expect(samplePose(0.5).eye[1]).toBeCloseTo(0.9);
expect(samplePose(0.5).eye[2]).toBeCloseTo(3.2);
expect(samplePose(0.5).lookAt).toEqual([0, 0, 0]);
expect(sampleFlight(trip, 1450).progress).toBeCloseTo(0.15625);
expect(sampleFlight(back, 5350).progress).toBeCloseTo(0.15625);
```

- [x] **Step 2: Проверить RED.** Выполнить `bun install --frozen-lockfile` для существующих зависимостей, затем `bun test src/auth/flight.test.ts`. Ожидание: FAIL из-за отсутствующего `flight.ts`/экспортов, а не окружения.
- [x] **Step 3: Реализовать интерфейсы.** `beginFlight` игнорирует запрос при активном перелёте или неизменном режиме; без анимации возвращает покой целевого режима. `completeFlight` принимает только актуальный `startedAt`. Для активного полёта зажать нормированное время в `[0,1]`, применить `t = 3p² − 2p³`, интерполировать от `mode` к `target`. Путь: интерполяция eye `[-13,.8,3] → [13,.8,3]` и lookAt `[-8,0,0] → [8,0,0]`; к eye добавить `0.2 sin(π progress)` по Z и `0.1 sin(π progress)` по Y. Покой не выдаёт событие завершения. Не вводить очередь, event bus или React-хук для этой математики.
- [x] **Step 4: Проверить GREEN.** `bun test src/auth/flight.test.ts` — все PASS; `bun run typecheck` — exit 0.
- [x] **Step 5: Commit.** `git add src/auth/flight.ts src/auth/flight.test.ts` и `git commit -m "feat: model reversible auth planet flight"`.

### Task 2: Рабочая композиция и переключение форм через полёт

**Files:** Create `src/sky/AuthScene.tsx`, `src/sky/AuthPlanet.tsx`, `src/sky/planet-shaders.ts`. Modify `src/App.tsx`, `src/shell.ts`, `src/screens/Auth.tsx`, `src/auth/AuthCard.tsx`, `src/sky/Sky.tsx`, `src/sky/Planet.tsx`, `src/useSceneLayout.ts`, `src/styles.css`. Delete `src/auth/Moon.tsx`.

**Interfaces:**

- Consumes: все интерфейсы Task 1; существующие `useAuthForm(mode, onDone)`, `Session`, `SceneLayout`.
- Produces in `Shell`: `authFlight: AuthFlight`, `authSceneReady: boolean`, `authSwitchRef: RefObject<HTMLButtonElement | null>`, `requestAuthMode(target: AuthMode): void` вместо старых `mode` / `setMode`. Остальные поля Shell сохранить.
- Produces: `AuthCard({ mode, form, flying, reducedMotion }: AuthCardProps)`, где `form: ReturnType<typeof useAuthForm>`, `flying: boolean`; собственного экземпляра `useAuthForm` в карточке больше нет.
- Produces: `AuthScene({ flight, motion, switchRef, onArrive, onReady }: AuthSceneProps)`, где `flight: AuthFlight`, `motion: boolean`, `switchRef: RefObject<HTMLButtonElement | null>`, `onArrive: (startedAt: number) => void`, `onReady: () => void`.
- Produces: `AuthPlanet({ position, cool, motion }: { position: Point3; cool: boolean; motion: boolean })`; экспорт `planetVertexShader` / `planetFragmentShader` из `planet-shaders.ts`.
- Produces: новые props `Sky`: `screen: SceneScreen`, `authFlight: AuthFlight`, `authSwitchRef: RefObject<HTMLButtonElement | null>`, `onAuthArrive: (startedAt: number) => void`, `onAuthReady: () => void`; остальные действующие props оставить. Старый auth-spin/sweeping в App удалить, для пиксельной сцены передавать `spin={0}`.

- [x] **Step 1: Зафиксировать RED для видимого поведения.** Запустить `bun run dev --host 127.0.0.1`, открыть `/#/login` без сессии на 1440×900. Сохранить исходный кадр и проверить сценарии ниже: текущая версия не выполняет T2-A (две пространственные планеты и центральная форма), T2-B (перелёт B) и T2-K (скрытие всей формы при полёте). Это браузерные проверки поведения, без новой тестовой библиотеки.

| Проверка | Действия и обязательные утверждения после реализации |
|---|---|
| **T2-A: основная композиция** | Начало: «Вход», большая целая планета за формой, соседняя справа с «Ещё нет аккаунта?». Клик: камера движется по B, панель гаснет за 180 мс, регистрация появляется только после 1800 мс; слева исходная планета с «Уже есть аккаунт?». Обратно тот же путь. В DOM всё время один и тот же canvas (`before === after`). |
| **T2-B: конкурирующие действия** | Пять быстрых активаций соседа дают ровно один перелёт. Во время полёта submit не вызывает вход. Во время 600-мс submit обеих форм переключатель недоступен. После отказа signup для `taken` он снова работает; форма остаётся signup с ошибкой логина. |
| **T2-K: клавиатура и фокус** | Tab → соседняя планета, видимая рамка; Enter/Space запускают переход. Сразу после начала `document.activeElement` не внутри формы; Tab не попадает в скрытые поля. После проявления фокус на логине. Следующий перелёт до истечения fade не получает старый отложенный focus. |
| **T2-D: данные формы** | Ввести логин/пароль, переключить дважды: значения сохранены. Показ пароля выключен после смены режима; ошибки очищены. На login пустой confirm не блокирует отправку; signup требует совпадения. Сохранить показ пароля, inline aria-ошибки и toast «Забыли пароль?». |

Для T2-A/K запустить через браузерную консоль/CDP после готовности сцены (добавляемые классы — `.auth-card` и `.auth-destination`); остальные действия таблицы воспроизвести вводом/клавиатурой:

```js
const before = document.querySelector('canvas');
const panel = document.querySelector('.auth-card');
const next = document.querySelector('.auth-destination');
console.assert(panel.querySelector('h1').textContent === 'Вход');
next.focus(); next.click(); next.click(); next.click();
console.assert(panel.inert && next.disabled);
console.assert(!panel.contains(document.activeElement));
await new Promise(resolve => setTimeout(resolve, 2200));
console.assert(panel.querySelector('h1').textContent === 'Регистрация');
console.assert(!panel.inert && !next.disabled);
console.assert(document.activeElement === panel.querySelector('[name="username"]'));
console.assert(document.querySelectorAll('canvas').length === 1);
console.assert(document.querySelector('canvas') === before);
```

- [x] **Step 2: Подготовить переиспользование материала без изменения списка.** Вынести строки шейдеров из `Planet.tsx` в `planet-shaders.ts`, изменить импорт у существующего `Planet`. Добавить uniform `uPerspective` (0 в старом Planet, 1 в AuthPlanet): участки, зависящие от взгляда (`n.z` для rim/видимости/гашения края), в перспективном режиме используют `dot(n, normalize(cameraPosition - vWorld))`. Добавить `uAtmosphereTint: vec3` с текущим `VIOLET` для старой планеты и холодным оттенком для второй auth-планеты. Сохранить существующие формулы, fade, освещение и noise старого режима; не переписывать `Backdrop` или материалы стекла.
- [x] **Step 3: Создать `AuthPlanet` с указанной сигнатурой.** Сфера радиуса 1.65, атмосфера радиуса 1.76; сегменты 96×64 / 64×32 как в наброске; виртуальный `uRadius=1368` сохраняет плотность процедурных огней, `uFade=[1000,2000]` выключает страничное затухание для этого масштаба. По `cool` выбрать нормализованный свет `[-.45,.55,.55]` / `[.45,.55,.55]` и атмосферный оттенок `#b99aff` / `#7ba2ff`. Внешняя прозрачная оболочка — additive blending, `depthWrite=false`, rim от view-space normal/view vector. Вращение/время поверхности обновлять только при `motion=true`; писать uniforms в экземпляр материала, как в текущем Planet. Ресурсы не создавать на каждый кадр/клик.
- [x] **Step 4: Создать `AuthScene` с указанной сигнатурой.** Две AuthPlanet в центрах `[-8,0,0]` / `[8,0,0]`, без смены мест. Одна `PerspectiveCamera makeDefault`, near .1 / far 200, исходный FOV 44°. В `useFrame` брать `performance.now()` (те же часы, что у `startedAt`), применять Task 1 к камере; сообщать `onArrive(startedAt)` один раз на поездку, не setState покадрово. Фон — один Points с 1100 детерминированными звёздами в мировом объёме примерно X ±50 / Y ±32.5 / Z от −4 до −94, без полос разгона; движение камеры даёт параллакс. Проецировать соседнюю сферу на DOM-кнопку через ref, обновляя позицию/диаметр с учётом offset Canvas относительно её контейнера; при активном полёте скрывать переключатель.
- [x] **Step 5: Подключить модель к `App` / `Shell`.** `App` хранит `idleFlight('login')`, ref кнопки и `authSceneReady=false`; `requestAuthMode` через functional setState вызывает `beginFlight(..., performance.now(), authSceneReady && !reducedMotion)`. `onAuthArrive` применяет `completeFlight`; logout сбрасывает `idleFlight('login')`. При уходе с auth снимать `authSceneReady`; при возврате ждать нового кадра его композиции. Удалить прежний effect `sweeping` и вычисление auth-spin; собрать Shell по Interfaces этой задачи.
- [x] **Step 6: Подключить auth-композицию внутри `Sky`.** Общий Canvas и Ticker остаются: при активном auth-полёте `tickMs=0`, в покое 33; reduced-motion не включает тикер. AuthScene и PixelCamera не могут одновременно владеть камерой. Существующие пиксельные меши/GlassCards держать спрятанными вне их режима, чтобы не ломать прежнее сохранение материалов при списке ↔ редакторе; кадровые callbacks скрытых композиций не должны трогать камеру. Готовность auth объявлять после её собственного отрисованного кадра, а не по старому глобальному `skyReady`.
- [x] **Step 7: Заменить auth-разметку, сохранив действующую форму.** В `screens/Auth.tsx` вызвать `useAuthForm(authFlight.mode, onSignIn)` один раз за жизнь экрана; карточка получает этот объект. Переключатель — отдельная `<button type="button" className="auth-destination">`, `ref={authSwitchRef}`; обработчик и disabled проверяют `form.busy` и активный полёт. Отправка формы тоже проверяет `flying || form.busy` до `submit()`. Сохранить текущие `signIn` / `router.history.replace(redirect ?? '/')`. `AuthCard` больше не содержит Moon, mode-switcher, старые displayMode/crossfading-таймеры, классы `card lq` и зависимость от GlassCards. При смене `mode` вызвать `form.reset()`, выключить shown; сами значения не сбрасывать. В полёте форма сразу inert, её внутренний фокус снять. Фокус логина после fade ставит один отменяемый effect карточки; reduced-motion — немедленно. Удалить Moon.
- [x] **Step 8: Оформить конечные ракурсы в `styles.css` / `useSceneLayout`.** Auth-область и Canvas должны иметь одинаковые размеры/начало координат; для auth брать её фактическую высоту, не минимум списка в 900 px, и не измерять auth-форму как стеклянную плиту. Форма в центре, исходная ширина 300 px, padding 26 px, полупрозрачный фон `#0b071bd9`, blur 14 px, radius 18 px из наброска; действующие поля/ошибки могут увеличивать высоту. Не переносить шапку/переключатели A/B/рамку стенда. Кликабельна вся соседняя сфера, есть подпись, hover/focus-visible и минимум 44 px; в полёте кнопка скрыта/disabled. Opacity панели уходит за 180 мс и возвращается после прибытия; не прятать её через `display:none` перед угасанием. Удалить неиспользуемые auth-only CSS, не общие `.field`/`.btn`/стили списка.
- [x] **Step 9: Проверить рабочую вертикаль.** `bun test` и `bun run build` — exit 0; в браузере T2-A/B/K/D — все ожидаемые результаты. Снять login, середину B и signup, сравнить конечные ракурсы с PNG спеки, исключить shader/JS errors. Если фон или формы визуально расходятся с согласованным наброском, исправить до следующей задачи.
- [x] **Step 10: Commit.** Добавить только перечисленные исходники задачи и удаление Moon; `git commit -m "feat: fly between auth planets with working forms"`.

### Task 3: Адаптивность, готовность/отказ сцены и итоговая проверка

**Files:** Modify `src/App.tsx`, `src/sky/Sky.tsx`, `src/sky/AuthScene.tsx`, `src/sky/FirstFrame.tsx`, `src/useSceneLayout.ts`, `src/screens/Auth.tsx`, `src/auth/AuthCard.tsx`, `src/styles.css` по результатам конкретных проверок. Create `docs/superpowers/reports/2026-11-01-auth-planet-flight.md`.

**Interfaces:**

- Consumes: интерфейсы Tasks 1–2; без второго состояния режима/прогресса и новых пакетов.
- Produces: `SceneBoundary` принимает `onFailure: () => void`; `Sky` получает `onUnavailable: () => void`. App передаёт один callback, снимающий готовность сцены и завершающий актуальный перелёт в `target` (если он активен).
- Produces: `FirstFrame({ onReady }: { onReady: () => void })` сохраняет прежнюю сигнатуру, но отменяет свой rAF при размонтировании. `onReady` не должен восстановить готовность после ошибки/ухода с auth.

- [ ] **Step 1: Прогнать проверки ниже до исправлений; записать реальные отказы.** Использовать тот же браузер с DevTools/CDP, а не добавлять тестовый фреймворк. Для каждого искусственного отказа перезагружать страницу; настройки не попадут в продукт.

| Проверка | Ввод / действие | Утверждения |
|---|---|---|
| **T3-V** | 1440×900, 375×812, 390×844; оба режима; resize в середине полёта; узкий viewport высотой 500; ошибки полей и экранная клавиатура при наличии настоящего устройства | Центральная планета целая; форма доступна по высоте через scroll при необходимости. Видимый сосед на правильной стороне, hit area ≥44×44 px, внутри viewport; подпись не перекрывает поля. Сфера и DOM-hit-area совпадают; resize не перезапускает и не обрывает полёт. |
| **T3-F** | На загрузке блокировать динамический JS-чанк Sky; отдельно запретить WebGL до открытия; задержать чанк, мгновенно сменить режим, затем разрешить загрузку; после готовности вызвать `WEBGL_lose_context.loseContext()` в покое и в полёте | Login/signup и submit работают без 3D. До готовности переключение мгновенное. Поздняя сцена показывает текущий режим без отката. При потере контекста полёт завершается в target; форма видима, не inert, переключатель снова работает мгновенно; CSS-фон виден. Нет зависших фокусов или необработанного exception. |
| **T3-M** | Эмулировать `prefers-reduced-motion: reduce` до загрузки, переключить несколько раз | Режим/камера меняются сразу, без fade/полёта; нет непрерывной анимации и активного Ticker. Фокус и переключатель работают. |
| **T3-T** | Начать полёт, убрать вкладку в фон дольше 1800 мс, вернуться; уйти с auth до отложенного ready/focus | Конечный режим соответствует target сразу после следующего кадра, без нового полного полёта. Старые ready/focus callbacks не влияют на другой экран. |
| **T3-R** | Signup → успешная отправка → список → редактор → список → logout. Отдельно открыть защищённый URL блокнота без сессии, войти; проверить «Назад» | Ортографическая композиция/стекло списка не изменились; редактор работает; logout показывает login и исходный ракурс. Redirect и history.replace сохраняют прежнее поведение. |

Утверждения для консоли/CDP после каждого узкого конечного ракурса T3-V и после восстановления доступной формы T3-F:

```js
const button = document.querySelector('.auth-destination');
const rect = button.getBoundingClientRect();
const fields = document.querySelector('.auth-card').getBoundingClientRect();
console.assert(rect.width >= 44 && rect.height >= 44);
console.assert(rect.left >= 0 && rect.right <= innerWidth);
console.assert(rect.top >= 0 && rect.bottom <= innerHeight);
console.assert(rect.right <= fields.left || rect.left >= fields.right);
console.assert(!button.disabled && !document.querySelector('.auth-card').inert);
// Подпись и видимую сферу дополнительно сверить визуально: bounding box кнопки этого не доказывает.
```

- [ ] **Step 2: Закрыть жизненный цикл готовности/отказов.** `SceneBoundary.componentDidCatch` сообщает `onFailure`; в `Canvas.onCreated` подписаться на `webglcontextlost` и снять listener при размонтировании Sky. При отказе App устанавливает `sceneFailed=true`, размонтирует Sky, снимает `skyReady`/`authSceneReady`, завершает активный trip через Task 1 и оставляет доступный CSS-интерфейс. Не вводить автоматический retry/recovery-manager; после реального отказа достаточно статичного интерфейса до reload. Объявление готовности и завершение поездки проверяют актуальность перед применением; cleanup при уходе с auth/ошибке отменяет ожидающий rAF. В `FirstFrame` отменять запланированный callback, не ломая существующий onGlassReady списка. CSS-фигуры fallback видны до готовности auth и после отказа, их переключатель — та же DOM-кнопка с мгновенной сменой формы.
- [ ] **Step 3: Довести кадрирование узкого экрана по T3-V.** Начальная опора — FOV 82° при ширине <700 px и панель 232 px / padding 20 px из наброска; это старт, не основание принять обрезанную планету. Подобрать расстояние/ракурс/FOV и размер панели по реальным измерениям так, чтобы обе конечные композиции проходили T3-V. Мировые центры планет не переставлять; корректировку применять симметрично к обеим конечным камерам, сохраняя близкий путь. Ограничить ширину подписи боковой доступной областью, разрешить переносы. При малой высоте резервировать место под полную signup-форму/ошибки и scroll; не компенсировать перекрытие полей невидимым hit area. Сохранить документный пиксельный layout остальных экранов.
- [ ] **Step 4: Повторить изменённые проверки и полный обязательный набор.** T2-A/B/K/D, T3-V/F/M/T/R — ожидаемое поведение; `bun test` и `bun run build` — exit 0. Проверить консоль на shader/errors, один Canvas до/после нескольких переключений. Новый дефект нетривиальной чистой логики закрепить маленьким unit-тестом, DOM/WebGL — воспроизводимым браузерным сценарием из таблиц.
- [ ] **Step 5: Проверить стоимость итоговой сцены и сохранить отчёт.** В production preview (`bun run build`, `bun run preview --host 127.0.0.1`) после прогрева записать idle 10 с и 10 перелётов; указать viewport/DPR, браузер, CPU/GPU и аппаратный/программный рендер. Проверить возврат от кадров дисплея во время полёта к примерно 30 кадрам/с в покое; после 10 поездок — отсутствие монотонного роста renderer.info.memory.geometries/textures и дополнительных Canvas. Снять browser performance trace: время кадров/long tasks, заметные рывки на вводе/перелёте. Эмуляцию viewport/CPU не называть измерением телефона. На доступном реальном мобильном устройстве повторить idle/перелёты/клавиатуру; если устройства нет, явно записать ограничение, не делать вывод о мобильном FPS. Исправить найденную утечку/постоянный full-rate render; сравнение со старым CSS-бенчмарком не доказывает производительность новой 3D-сцены.
- [ ] **Step 6: Commit.** Добавить изменения этой задачи и отчёт; `git commit -m "fix: keep auth flight usable across viewport and scene failures"`.

## Самопроверка плана и передача

Покрытие: путь/повторные переключения — Task 1; две планеты, форма и камера, сохранение ввода/валидации, busy/focus и частота кадров — Task 2; адаптивность, загрузка/отказ, reduced-motion, маршруты, освобождение ресурсов и итоговые замеры — Task 3. Все пять Review Focus имеют проверку у владельца соответствующего кода. Имена/типы интерфейсов Tasks 1–3 согласованы; новых зависимостей и универсального animation framework нет.

До реализации владелец читает этот план и выбирает `superpowers:executing-plans` либо `superpowers:subagent-driven-development`. Рекомендация для этого плана — **executing-plans**: три последовательные задачи, одна тесно связанная сцена/форма; реализация в одном контексте дешевле, итоговый независимый ревьюер проверит всю ветку. При выборе subagent-driven-development обязательны проверки исполнителя и независимые ревью каждой задачи по соответствующему скиллу, затем общее ревью. Этот документ не разрешает начать реализацию без выбора владельца.
