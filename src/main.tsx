import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// ✅ Enregistre le Service Worker (vérifie les mises à jour à chaque ouverture)
registerSW({ immediate: true });

// ✅ Vérifie si une nouvelle version est disponible sur le serveur
async function checkForUpdates() {
  try {
    const response = await fetch('/version.json?t=' + Date.now(), {
      cache: 'no-store', // Force la requête réseau, ignore le cache
    });
    if (!response.ok) return;

    const data = await response.json();
    const currentVersion = localStorage.getItem('app_version');

    // Si la version serveur est différente de la version locale, on recharge
    if (currentVersion && currentVersion !== data.version) {
      console.log('[PWA] Nouvelle version détectée:', data.version);
      localStorage.setItem('app_version', data.version);
      window.location.reload();
    } else if (!currentVersion) {
      // Premier lancement, on enregistre la version
      localStorage.setItem('app_version', data.version);
    }
  } catch (e) {
    // Pas de réseau, on ignore
  }
}

// Lance la vérification après le chargement de la page
if (document.readyState === 'complete') {
  checkForUpdates();
} else {
  window.addEventListener('load', checkForUpdates);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);