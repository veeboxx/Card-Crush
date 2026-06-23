import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Ask the browser to keep our data (cards + images) safe from eviction.
if (navigator.storage && typeof navigator.storage.persist === 'function') {
  navigator.storage.persist().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
