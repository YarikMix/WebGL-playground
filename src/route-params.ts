/* Разбор того, что приходит из адресной строки: сюда может попасть что угодно, набранное руками
   или присланное ссылкой. */

/** id блокнота из `#/notebook/$id`: только положительное целое без ведущих нулей, иначе null */
export function parseNotebookId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/** Куда вернуть после входа. Только путь внутри приложения: `//host` и `/\host` браузер читает как
    адрес другого сайта, поэтому они отбрасываются вместе с абсолютными URL. Управляющие символы
    и пробелы — тоже: табуляцию и перевод строки браузер из URL вырезает, и `/<TAB>/host` стал бы `//host` */
export function safeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return undefined;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return undefined;
  if (/[\x00-\x20\x7f]/.test(raw)) return undefined;
  return raw;
}

/** validateSearch маршрута `/login`. Ключ redirect возвращается всегда, даже пустым: роутер собирает
    search маршрута как { ...сырой search, ...результат validateSearch }, и пропущенный ключ оставил бы
    в нём непроверенное значение из адреса — его увидели бы и beforeLoad, и экран входа.
    В типе ключ необязательный: иначе каждый переход на /login требовал бы явного search */
export function loginSearch(search: Record<string, unknown>): { redirect?: string } {
  return { redirect: safeRedirect(search.redirect) };
}
