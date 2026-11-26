import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const HRPreview = React.lazy(() => import('./HRPreview'));
const showHRPreview = new URLSearchParams(window.location.search).get('hr-preview') === '1';

// Brief brand reveal, counted from the first splash frame rather than
// adding a fixed delay after the application has loaded.
const MIN_SPLASH_MS = 800;
function BootReady({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const splash = document.getElementById('startup-splash');
    if (!splash) return;
    const appRoot = document.getElementById('root');
    if (appRoot) appRoot.inert = true;
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      const now = performance.now();
      const recorded = Number(splash.dataset.firstFrame);
      const started = Number.isFinite(recorded) ? recorded : now;
      const remaining = Math.max(0, MIN_SPLASH_MS - (now - started));
      const finish = () => {
        splash.remove();
        if (appRoot) appRoot.inert = false;
      };
      if (remaining > 0) timer = window.setTimeout(finish, remaining);
      else finish();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      if (appRoot) appRoot.inert = false;
    };
  }, []);
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {showHRPreview
      ? <React.Suspense fallback={null}><BootReady><HRPreview /></BootReady></React.Suspense>
      : <BootReady><App /></BootReady>}
  </React.StrictMode>,
);
