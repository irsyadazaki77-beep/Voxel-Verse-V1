import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle benign preview dev server websocket closure errors gracefully in DEV mode only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    // Only suppress benign Vite HMR reconnection/closure rejections
    const isViteHmrError =
      reasonStr.includes('[vite]') ||
      (reasonStr.includes('WebSocket') && (reasonStr.includes('vite') || reasonStr.includes('hmr')));
    if (isViteHmrError) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
