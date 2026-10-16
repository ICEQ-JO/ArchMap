import { lazy, Suspense, useEffect, useState } from 'react';
import Landing from './components/Landing';
const Workspace = lazy(() => import('./components/Workspace'));
export default function App() {
  const [route, setRoute] = useState(location.hash.startsWith('#workspace') ? location.hash : '');
  useEffect(() => {
    const update = () => {
      setRoute(location.hash.startsWith('#workspace') ? location.hash : '');
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  function open(example: boolean) {
    location.hash = example ? 'workspace/example' : 'workspace';
    window.scrollTo(0, 0);
  }
  return route ? (
    <Suspense
      fallback={
        <div className="app-loading">
          <span className="live-dot" /> Opening your workspace…
        </div>
      }
    >
      <Workspace initialExample={route.includes('/example')} />
    </Suspense>
  ) : (
    <Landing open={open} />
  );
}
