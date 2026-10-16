import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch is writable and configurable across all prototype levels
if (typeof window !== 'undefined') {
  try {
    const rawFetch = window.fetch;
    let activeFetch = rawFetch;
    const fetchDesc = {
      configurable: true,
      enumerable: true,
      get: () => activeFetch,
      set: (fn: typeof window.fetch) => {
        activeFetch = fn;
      }
    };
    try {
      Object.defineProperty(window, 'fetch', fetchDesc);
    } catch {
      try {
        if (typeof Window !== 'undefined' && Window.prototype) {
          Object.defineProperty(Window.prototype, 'fetch', fetchDesc);
        }
      } catch (_) {}
    }
  } catch (_) {}

  // Intercept benign WebSocket connection closures and unhandled rejections from sandboxed reverse proxies
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('Cannot set property fetch') ||
      reason.includes('only a getter') ||
      reason.includes('WebSocket') ||
      reason.includes('failed to connect to websocket') ||
      reason.includes('WebSocket closed')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || event.error?.message || '';
    if (
      msg.includes('Cannot set property fetch') ||
      msg.includes('only a getter') ||
      msg.includes('WebSocket') ||
      msg.includes('failed to connect to websocket')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
