import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// ✅ Enregistre le Service Worker et force la vérification immédiate des mises à jour
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nouvelle version détectée, rechargement...');
    window.location.reload();
  },
  onOfflineReady() {
    console.log('[PWA] Prêt pour le mode hors-ligne.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);