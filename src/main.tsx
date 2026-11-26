import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const HRPreview = React.lazy(() => import('./HRPreview'));
const showHRPreview = new URLSearchParams(window.location.search).get('hr-preview') === '1';

// Remove the static splash on the first real application commit, not a timer.
function BootReady({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    document.getElementById('startup-splash')?.remove();
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
