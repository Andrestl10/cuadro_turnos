import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getFirebaseAnalytics } from './firebase'

await (async () => {
  try {
    await getFirebaseAnalytics();
  } catch (err) {
    // Avoid breaking the app if Analytics fails to init.
    console.warn('Firebase Analytics init failed', err);
  }
})();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element (#root) not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
