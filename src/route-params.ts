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
