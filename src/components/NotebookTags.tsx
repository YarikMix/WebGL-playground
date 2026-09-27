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
