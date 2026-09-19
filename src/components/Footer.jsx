const CARD_MODES = [
  { id: 'flat', label: 'Имитация' },
  { id: 'liquid', label: 'Liquid glass' },
];

export default function Footer({ cards, onCards, motion, onMotion }) {
  return (
    <div className="foot">
      <p className="note">Прототип главной. Названия блокнотов, рантаймы и квота GPU — примеры, не реальные данные.</p>
      <div className="foot-controls">
        <div className="variants" role="group" aria-label="Стекло карточек">
          {CARD_MODES.map(m => (
            <button key={m.id} className="chip" type="button" aria-pressed={cards === m.id} onClick={() => onCards(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <nav className="variants" aria-label="Реализация фона">
          <a className="chip" href="../">Canvas 2D</a>
          <a className="chip" href="../webgl/">WebGL</a>
          <a className="chip" href="./" aria-current="page">React + R3F</a>
        </nav>
        <button className="chip" type="button" aria-pressed={motion} onClick={() => onMotion(!motion)}>
          Анимация фона<span>{motion ? 'вкл' : 'выкл'}</span>
        </button>
      </div>
    </div>
  );
}
