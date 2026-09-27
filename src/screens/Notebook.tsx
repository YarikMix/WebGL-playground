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
