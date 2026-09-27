/* «Новый блокнот» — в hero и в пустом списке: у нового пользователя блокнотов нет, и кнопка
   нужна прямо там, куда он смотрит, а не только над пустым местом */
export default function NewNotebookButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn btn-primary" type="button" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
      Новый блокнот
    </button>
  );
}
