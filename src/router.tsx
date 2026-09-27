import { Navigate, createHashHistory, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import App from './App';
import Auth from './screens/Auth';
import Notebooks from './screens/Notebooks';
import Notebook from './screens/Notebook';
import { sessionStore } from './session-store';
import { safeRedirect } from './route-params';

/* Маршруты кодом, без файлового роутинга: на три адреса кодогенерация и Vite-плагин не окупаются.
   История хешевая — GitHub Pages не умеет отдавать index.html на произвольный путь. */

const rootRoute = createRootRoute({ component: App });

/* Без сессии — на форму, запомнив, куда шли: после входа человек попадёт ровно туда */
function requireSession({ location }: { location: { href: string } }) {
  if (!sessionStore.get()) throw redirect({ to: '/login', search: { redirect: location.href } });
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = safeRedirect(search.redirect);
    return target ? { redirect: target } : {};
  },
  // уже вошедший попадает сюда, только набрав адрес руками — отправляем на список
  beforeLoad: () => { if (sessionStore.get()) throw redirect({ to: '/' }); },
  component: Auth,
});

const notebooksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: requireSession, component: Notebooks });

const notebookRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notebook/$id', beforeLoad: requireSession, component: Notebook });

export const router = createRouter({
  routeTree: rootRoute.addChildren([loginRoute, notebooksRoute, notebookRoute]),
  history: createHashHistory(),
  // неизвестный адрес (#/foo) — на список; без сессии список сам отправит на форму
  defaultNotFoundComponent: () => <Navigate to="/" replace />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
