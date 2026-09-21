export interface Notebook {
  id: number;
  title: string;
  cells: number;
  /** «3 мин назад», «вчера» — готовая строка, как её отдаст бэкенд */
  edited: string;
  /** аптайм рантайма; поля нет — рантайм остановлен */
  run?: string;
  accel: 'CPU' | 'T4' | 'A100';
  /** владелец в родительном падеже («от Ани К.»); поля нет — блокнот свой */
  owner?: string;
  code: string;
}

export type FilterId = 'all' | 'mine' | 'shared' | 'running';

export interface NotebookFilter {
  id: FilterId;
  label: string;
  test: (n: Notebook) => boolean;
}

export type CardsMode = 'flat' | 'liquid';

/** Режим карточки на экране входа: какая форма сейчас показана */
export type AuthMode = 'login' | 'signup';

/** Направление на солнце в координатах сцены */
export type SunDirection = [number, number, number];

/** Кусок кода для подсветки: c — комментарий, s — строка, k — ключевое слово, n — число */
export interface CodeToken {
  text: string;
  cls?: 'c' | 's' | 'k' | 'n';
}

/** Прямоугольник карточки в координатах страницы: центр и размеры, CSS-пиксели */
export interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanetGeometry {
  cx: number;
  cy: number;
  R: number;
}

/** Всё, что сцене нужно знать о вёрстке. Координаты — страницы: X вправо, Y вниз, CSS-пиксели */
export interface SceneLayout {
  width: number;
  height: number;
  /** по Y: где фон начинает и заканчивает растворяться в цвете страницы */
  fade: [number, number];
  planet: PlanetGeometry;
  glow: { x: number; y: number; rx: number; ry: number };
  cards: CardRect[];
}
