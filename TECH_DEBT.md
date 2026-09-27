# Технический долг ветки `webgpu`

Дата: 2026-09-27. База: `webgpu` = `5256de8` («feat: TypeScript и ленивая загрузка сцены», бывший `r3f`). Актуальный `origin/main` = `d03fc33` (merge PR #6, notebook-editor). Между ними — 43 коммита и незакоммиченный WIP порта сцены на WebGPU/TSL (13 файлов: `src/sky/glsl.ts` → `src/sky/tsl.ts`, правки `App.tsx`, `Footer.tsx`, `src/sky/*.tsx`, `types.ts`, `package.json`, `bun.lock`).

## A. Долг по ребейзу на `origin/main`

`git diff 5256de8 origin/main --stat`: 49 файлов, +5114/−246. `webgpu` не видел ни экрана входа, ни роутера, ни блокнота — вся эта функциональность появится в дереве только после ребейза/мержа.

| Что появилось на `main` | Коммиты | Зачем WebGPU-порту |
|---|---|---|
| Экран входа (луна вместо планеты не заменяет её, а гасит; терминатор, `AuthCard`, `useAuthForm`) | `18af406`..`7ef0f32`, `9177b3c`, `253089c` | Новый потребитель `Backdrop`/`Planet` со своими uniform'ами света |
| TanStack Router, хеш-маршруты `/login`, `/`, `/notebook/$id` | `94c4a9f`, `41e5acd`, `3703ab6` | `App.tsx` целиком перестроен вокруг `Outlet`/`useRouterState`, а не `useState` экрана |
| `session-store.ts`, `session.ts`, `shell.ts` (контекст экрана) | `e2099d2`, `0962da9` | Новые зависимости `App.tsx`, которых нет в WIP-диффе |
| Экран блокнота: `notebook-cells.ts`, `Cell.tsx`, `InsertBar.tsx`, `NotebookHeader.tsx` | `614f2b0`, `abe926a`, `897fb9b` | `SceneLayout.planet`/`glow` становятся `| null` — сцена должна уметь работать без планеты |
| `useSunSweep.ts`, `SUN_ORBIT`/`SWEEP_MS`/`sweepEase` в `scene-config.ts` | `07c631a`, `5f6a781`, `f883900` | Новый общий модуль направления/угла солнца — WebGPU-версия `Planet`/`Backdrop` должна его использовать, а не свои uniform'ы |
| Раскладка сайта в корень, README/workflow | `881dc67`, `eeb10e4` | Технически не мешает порту, но конфликтует построчно с `package.json`/README |

Конкретные точки конфликта (проверено `git show origin/main:<path>` и локальным `git diff`):

1. **`src/types.ts`.** WIP всё ещё хранит старый `Notebook.cells: number`, `SceneLayout.planet`/`glow` не-nullable, и добавляет свои `CardsMode`/`RenderBackend` — которых на `main` нет вовсе. `main` тем временем ввёл `Cell`/`CellKind`, `AuthMode`, `SunDirection`, `SceneScreen`, `Notebook.cells: Cell[]`, nullable `planet`/`glow`. Слияние типов — не автоматическое, придётся вручную развести на `main`-модель и добавить `RenderBackend` поверх неё.
2. **`src/App.tsx`.** WIP правит старый (дороутерный) `App.tsx`: добавляет `backend: RenderBackend | null` вместо `skyReady: boolean` и меняет сигнатуру `onSkyReady`. На `main` `App.tsx` уже переписан под `Outlet`, `useSession`, `screen: SceneScreen` из `useRouterState`, `useSceneLayout(refs, glass, screen)`. Патч не наложится — логику `backend`/`onSkyReady` нужно переносить в новый `App.tsx` руками.
3. **`src/components/Footer.tsx`.** Это самая заметная расходимость: на `main` подвал — статический абзац без пропсов («Переключатели вариантов фона, стекла и анимации ушли»). WIP же правит старый `Footer` с переключателями `CardsMode`, ссылками на `../`, `../webgl/`, `../r3f/`, `./` и добавляет туда лейбл `BACKEND_LABEL` (`Рендер: WebGPU` / `Рендер: WebGL 2 — WebGPU недоступен`). Задача — не «зарезолвить конфликт», а перенести только идею бейджа рендер-бэкенда в новый статический `Footer`, выбросив переключатели (их уже нет на `main`) и ссылку `../r3f/` (ветки больше нет).
4. **`src/sky/glsl.ts` → `src/sky/tsl.ts`.** На `main` `glsl.ts` жив и используется в `Backdrop.tsx`, `Planet.tsx`, `Stars.tsx`, `Meteor.tsx` (`NOISE`, `OUTPUT`, `PALETTE`). WIP удаляет `glsl.ts` и вводит `tsl.ts` с эквивалентами на TSL (`hash13`, `noise3`, `fbm`, `toLinear`, `SPACE`/`VIOLET`/`ORCHID`) — набор один в один, но `main`-версии `Backdrop.tsx`/`Planet.tsx`/`Stars.tsx`/`Meteor.tsx` успели измениться (терминатор, `useSunSweep`, видимость по `visible` вместо монтирования — см. `Sky.tsx` на `main`: `Planet`/`Backdrop` теперь не размонтируются на экране блокнота, а прячутся `visible={false}`, чтобы не пересобирать шейдер). Порт на TSL придётся делать поверх этой новой версии, а не поверх WIP-диффа.
5. **`src/sky/Sky.tsx`.** На `main` `Sky` получил `sun: SunDirection`, `spin: number`, `reducedMotion`, `<Redraw signal={spin} />` (без него `frameloop="demand"` не перерисовывал кадр при смене света — было CRITICAL финального ревью) и логику «тёплой» `GlassCards`, всегда смонтированной. Всё это нужно сохранить при переносе на WebGPU-рендерер и `onReady`.
6. **`package.json`/`bun.lock`.** WIP убирает `tsc --noEmit -p tsconfig.test.json` из `typecheck`/`build`, `main` — держит (нужен для `*.test.ts`). При ребейзе нельзя тянуть регресс типов тестов.

**Рекомендуемый порядок:** `git rebase origin/main` (не merge, чтобы не тащить лишний merge-коммит) поверх `webgpu`, коммит за коммитом; типы (`types.ts`) и `App.tsx` разводить первыми (п.1–2), затем `Footer.tsx` (п.3) как отдельный маленький конфликт, затем шейдерный слой `glsl.ts`/`tsl.ts` (п.4) вместе с `Sky.tsx` (п.5) одним блоком — они меняются согласованно. `package.json`/`bun.lock` — в конце, простым `bun install` после разрешения остального.

## B. Отложенное по работе над блокнотом (уже на `main`)

Источник: `sdd-ledger.md` (ревью плана `2026-09-27-notebook-editor.md`). Каждый пункт перепроверен по коду `origin/main`; один — уже исправлен и снят из списка.

**Исправлено, из списка снято:** «`safeRedirect` не отклоняет управляющие символы» — на `main` (`src/route-params.ts:16`) добавлена проверка `/[\x00-\x20\x7f]/.test(raw)`, закрыта вместе с фиксом open-redirect в финальной волне.

### Доступность (a11y)
| Проблема | Файл | Почему важно | Что делать |
|---|---|---|---|
| Тост — `role="status"` на статичном узле; смена текста при уже смонтированном контейнере не гарантированно озвучивается скринридером | `src/App.tsx:143` | Пользователь с скринридером не узнаёт об ошибке/действии | Пересоздавать узел (`key={toastText}`) или явно дёргать `aria-live` |
| Панель вставки ячейки — `role="group"` без «roving tabindex» | `src/notebook/InsertBar.tsx:16` | Клавиатурная навигация по кнопкам вставки не по стандарту ARIA toolbar | `role="toolbar"` + `tabIndex`/стрелки между кнопками |
| Фокус после удаления ячейки — через `document.querySelector` по `data-cell-id`, а не через карту ref | `src/screens/Notebook.tsx:44` | Хрупко при дублирующихся/динамических DOM-узлах, обходит React | Завести `Map<id, HTMLElement>` через `ref`-колбэки |
| `html:has(.nb-main)` без фолбэка | `src/styles.css:353` | Раньше — риск (нужен Firefox 121+, дек. 2023); к сент. 2026 актуальные Firefox это давно поддерживают | Низкий приоритет, оставить как есть либо оставить комментарий о минимальной версии |

### Экран блокнота — по мелочи
| Проблема | Файл | Почему важно | Что делать |
|---|---|---|---|
| `removeCell` при не найденном `id` возвращает новый массив (`[...cells]`), а не тот же | `src/notebook-cells.ts:33` | Лишний ре-рендер потребителей, сравнивающих по ссылке | `return { cells, nextSelected: null }` без копии |
| Цвет кольца выбранной ячейки — литерал `rgba(160, 135, 255, .75)` | `src/styles.css:365` | Не завязан на `--violet` (`#8b6cff`), при смене темы разъедется | Ввести токен и переиспользовать (тот же литерал уже встречается в `:focus-within`/`.chip` — стоит вынести один раз) |
| Тост с одинаковым текстом подряд не перезапускает таймер (тот же `useEffect` не срабатывает, если `toastText` не изменился) | `src/App.tsx:60-63` | Быстро сменяющиеся одинаковые уведомления гаснут раньше, чем пользователь прочитал | Добавить счётчик/nonce в зависимость эффекта |
| Фильтр/поиск блокнотов не в URL | `src/screens/Notebooks.tsx` (нет `search`-параметров) | Нет расшариваемых ссылок на отфильтрованный список, потеря состояния при обновлении страницы | Перенести в `validateSearch` роута списка |
| `document.title` не меняется по экранам | нигде не задаётся (grep пуст) | Вкладка браузера всегда с одним заголовком — плохо для навигации и bookmarks | Хук `useEffect` на смену `routeId` |
| Градиентная рамка ячейки по спеке §6.2 не реализована | `src/notebook/Cell.tsx` (текущий вид — плоская граница) | Расхождение с дизайн-спекой `docs/superpowers/specs/2026-09-27-notebook-editor-design.md` | Свериться со спекой и добавить `border-image`/псевдоэлемент |
| После `signOut()` — `navigate({ to: '/login' })` кладёт лишнюю запись в историю | `src/App.tsx:68-71` | «Назад» после выхода возвращает на пустой `/login` вместо экрана до входа | `navigate({ to: '/login', replace: true })` |
| Нет компонентного теста на `AuthCard` (переключение обеих форм одним тумблером) | `src/auth/AuthCard.tsx` | Только браузерная приёмка покрывает переключение; регресс не поймает `bun test` | Добавить тест уровня компонента (rendering-library) |

### Технический долг сборки/сцены
| Проблема | Файл | Почему важно | Что делать |
|---|---|---|---|
| `tsconfig.test.json` включает весь `src`, `build`/`typecheck` гоняют `tsc` дважды по пересекающимся файлам | `tsconfig.test.json`, `package.json:typecheck` | Двойная стоимость тайпчека на каждый `build`/CI-прогон | Сузить `include` до тестовых файлов и того, что они реально импортируют, либо принять цену осознанно |
| `useSceneLayout` не подписывает `ResizeObserver` на `limbRef` | `src/useSceneLayout.ts:63` (`for (const ref of [pageRef, glowRef, cardsRef])` — `limbRef` пропущен) | Изменение размера `.limb` само по себе не переизмеряет раскладку (полагается на то, что `.limb` меняется вместе с `pageRef`) | Добавить `limbRef` в цикл `ro.observe`, если он всё ещё нужен отдельно от `pageRef` |
| Мёртвый CSS `.foot-controls`/`.variants` | `src/styles.css:176-177` | `Footer.tsx` на `main` их больше не рендерит (см. раздел A.3) — правила ничего не стилизуют | Удалить вместе/после переноса подвала при ребейзе |
| Запись в `ref` во время рендера в `Sky.tsx` (`lastPlanet.current = …`) и `GlassCards.tsx` (`lastCard.current = …`) | `src/sky/Sky.tsx`, `src/sky/GlassCards.tsx:131` | Формально не идиоматично для React, но задокументировано как идемпотентное присваивание — риск низкий, уже принято в ревью | Не трогать; если будущий React ужесточит правило — обернуть в `useEffect`/`useLayoutEffect` |
| Три-четыре независимых блока `@media (prefers-reduced-motion: reduce)` | `src/styles.css:42,197,402,428` | Дублирование, легко забыть один при правке | Свести в один блок или CSS custom media, если поддержка позволяет |

## C. Инфраструктура и репозиторий

- **Правило `r3f` в GitHub Pages environment.** `gh api repos/YarikMix/WebGL-playground/environments/github-pages/deployment-branch-policies` показывает 4 правила: `canvas`, `main`, `r3f`, `webgl` — `r3f` осталось от старого имени ветки и не удалено, хотя ветки `r3f` больше нет. Удалить после мержа PR #9–#11 (см. их описание: «После слияния правило `r3f` в Settings → Environments → github-pages можно удалить»).
- **Открытые PR #9–#11** (`gh pr list`): три идентичных PR `chore: ветки переименованы — приложение в main, Canvas 2D в canvas`, применяющие новый `pages.yml`/README к веткам `main` (#9), `canvas` (#10), `webgl` (#11). Ни один не смержен — воркфлоу и README на всех трёх ветках всё ещё содержат прежние имена/переходы до их мержа.
- **`package.json.name`.** И на `origin/main`, и в рабочей копии `webgpu` имя пакета — `webgl-playground-r3f`, хотя ветка `r3f` переименована в `main`, а `webgpu` — самостоятельный вариант. Стоит переименовать (например, `webgl-playground` для `main`, `webgl-playground-webgpu` для этой ветки) при следующем осознанном коммите — не блокер, но вводит в заблуждение при поиске по названию пакета.
- **Исторические упоминания `r3f` в доках.** `docs/superpowers/plans/2026-09-21-auth-terminator.md` и `2026-09-27-notebook-editor.md` называют ветку `r3f` — это корректная историческая запись (планы писались до переименования) и её нет смысла редактировать задним числом; трогать не нужно, разве что добавить примечание в начале файла при желании.
