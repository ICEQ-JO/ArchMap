import { lazy, Suspense, useEffect, useState } from 'react';
import Landing from './components/Landing';
import type { Project } from '../shared/schema';
import { SAVE_KEY } from './lib/graph';

const Workspace = lazy(() => import('./components/Workspace'));
const Dashboard = lazy(() => import('./components/Dashboard'));

type Route =
  | { page: 'landing' }
  | { page: 'dashboard' }
  | { page: 'workspace'; example: boolean; openSetup?: boolean; sketch?: boolean };

function parseHash(): Route {
  const hash = location.hash;
  if (hash === '#dashboard') return { page: 'dashboard' };
  if (hash.startsWith('#workspace')) {
    const isExample = hash.includes('/example');
    const isSetup = hash.includes('/setup');
    const isSketch = hash.includes('/sketch');
    return { page: 'workspace', example: isExample, openSetup: isSetup, sketch: isSketch };
  }
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

  function openSpecificProject(project: Project, targetView = 'Architecture') {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(project));
      localStorage.setItem(`archmap.project.${project.id}`, JSON.stringify(project));
      sessionStorage.setItem('archmap.initial_view', targetView);
    } catch {
      // ignore
    }
    location.hash = 'workspace';
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
          onOpen={(project) => openSpecificProject(project)}
          onOpenFlows={(project) => openSpecificProject(project, 'Flows')}
          onOpenChanges={(project) => openSpecificProject(project, 'Changes')}
          onNewProject={() => {
            location.hash = 'workspace/setup';
            window.scrollTo(0, 0);
          }}
          onExample={() => open(true)}
          onImport={(project) => openSpecificProject(project)}
          onSketch={() => {
            location.hash = 'workspace/sketch';
            window.scrollTo(0, 0);
          }}
        />
      </Suspense>
    );
  }

  if (route.page === 'workspace') {
    return (
      <Suspense fallback={fallback}>
        <Workspace
          initialExample={route.example}
          initialSetup={route.openSetup}
          initialSketch={route.sketch}
          onDashboard={goToDashboard}
        />
      </Suspense>
    );
  }

  return <Landing open={open} onDashboard={goToDashboard} />;
}
