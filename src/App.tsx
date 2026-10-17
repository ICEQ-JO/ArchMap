import { lazy, Suspense, useEffect, useState } from 'react';
import Landing from './components/Landing';
const Workspace = lazy(() => import('./components/Workspace'));
const Dashboard = lazy(() => import('./components/Dashboard'));

type Route = { page: 'landing' } | { page: 'dashboard' } | { page: 'workspace'; example: boolean };

function parseHash(): Route {
  const hash = location.hash;
  if (hash === '#dashboard') return { page: 'dashboard' };
  if (hash.startsWith('#workspace'))
    return { page: 'workspace', example: hash.includes('/example') };
  return { page: 'landing' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const update = () => setRoute(parseHash());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  function open(example: boolean) {
    location.hash = example ? 'workspace/example' : 'workspace';
    window.scrollTo(0, 0);
  }
  function goToDashboard() {
    location.hash = 'dashboard';
    window.scrollTo(0, 0);
  }

  const fallback = (
    <div className="app-loading">
      <span className="live-dot" /> Opening your workspace…
    </div>
  );

  if (route.page === 'dashboard') {
    return (
      <Suspense fallback={fallback}>
        <Dashboard
          onOpen={() => {
            location.hash = 'workspace';
          }}
          onNewProject={() => {
            location.hash = 'workspace';
          }}
          onExample={() => open(true)}
          onImport={() => {
            location.hash = 'workspace';
          }}
          onSketch={() => {
            location.hash = 'workspace';
          }}
        />
      </Suspense>
    );
  }

  if (route.page === 'workspace') {
    return (
      <Suspense fallback={fallback}>
        <Workspace initialExample={route.example} onDashboard={goToDashboard} />
      </Suspense>
    );
  }

  return <Landing open={open} onDashboard={goToDashboard} />;
}
