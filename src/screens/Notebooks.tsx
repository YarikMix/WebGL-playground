import { useNavigate } from '@tanstack/react-router';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import NotebookGrid from '../components/NotebookGrid';
import Footer from '../components/Footer';
import { initials } from '../session';
import { useShell } from '../shell';

export default function Notebooks() {
  /* glowRef и limbRef нужны сцене: из них берутся положение свечения и геометрия планеты */
  const { glowRef, limbRef, cardsRef, glassOn, session, signOut, notebooks, createNotebook } = useShell();
  const navigate = useNavigate();

  /* Хуки выше этой строки: при выходе сессия гаснет на рендер раньше, чем адрес сменится на /login */
  if (!session) return null;

  /* Как в Colab: новый блокнот сразу открывается, а не остаётся карточкой в списке */
  const create = () => {
    const id = createNotebook();
    void navigate({ to: '/notebook/$id', params: { id: String(id) } });
  };

  return (
    <>
      <TopBar initials={initials(session)} onSignOut={signOut} />
      <Hero heroRef={glowRef} limbRef={limbRef} total={notebooks.length} onCreate={create} />

      <main className="wrap">
        <h2 className="sr-only">Блокноты</h2>
        <NotebookGrid gridRef={cardsRef} notebooks={notebooks} glass={glassOn} onCreate={create} />
        <Footer />
      </main>
    </>
  );
}
