import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const HRPreview = React.lazy(() => import('./HRPreview'));
const showHRPreview = new URLSearchParams(window.location.search).get('hr-preview') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {showHRPreview
      ? <React.Suspense fallback={<div style={{ padding: 24 }}>กำลังเปิดหน้าทดลอง HR...</div>}><HRPreview /></React.Suspense>
      : <App />}
  </React.StrictMode>,
);
