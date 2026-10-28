/**
 * StockFacture Pro - Firebase Client Configuration
 * 
 * Configures Firebase Auth, Firestore with multi-tab offline caching,
 * and Google Authentication.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with robust multi-tab offline persistence
let firestoreInstance: Firestore;
try {
  // ✅ Détecte si on est dans Electron ou une PWA installée
  const isStandalone = 
    (window as any).electronAPI?.isElectron === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    // Sur Electron / Android APK : pas de cache multi-onglets, connexion directe
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache(), // Cache simple, sans multi-onglets
    });
  } else {
    // Sur Web classique : garder le cache multi-onglets
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Vrai si l'app tourne dans la fenêtre Electron (exposé par preload.js). */
function isElectron(): boolean {
  return !!(window as any).electronAPI?.isElectron;
}

/**
 * Sign in with Google.
 * - Dans Electron : passe par le navigateur système + deep link (la popup Google n'y fonctionne pas).
 * - Sur le web / Android : popup, avec repli sur redirect si la popup est bloquée.
 */
export async function signInWithGoogle(): Promise<User> {
  if (isElectron()) {
    return signInWithGoogleElectron();
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
      console.warn('Popup blocked, attempting signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Redirection vers Google en cours...');
    }
    throw err;
  }
}

/**
 * Sign in with Google via Electron (deep link).
 *
 * 1. Electron ouvre auth-callback.html dans le navigateur par défaut.
 * 2. L'utilisateur se connecte avec Google.
 * 3. La page redirige vers stockfacture://auth/callback?idToken=...
 * 4. Windows renvoie le lien à Electron, qui transmet le jeton au renderer.
 * 5. On appelle signInWithCredential : onAuthStateChanged fait le reste.
 */
const ELECTRON_SIGNIN_TIMEOUT_MS = 2 * 60 * 1000;

export async function signInWithGoogleElectron(): Promise<User> {
  const electronAPI = (window as any).electronAPI;

  if (!electronAPI || !electronAPI.isElectron) {
    throw new Error('Cette fonction doit être appelée dans Electron.');
  }

  return new Promise<User>((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let timeoutId: number | undefined;

    const cleanup = () => {
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (typeof unsubscribe === 'function') unsubscribe();
    };

    timeoutId = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error('Connexion expirée. Veuillez réessayer.'));
    }, ELECTRON_SIGNIN_TIMEOUT_MS);

    // On écoute AVANT d'ouvrir le navigateur pour ne rien rater
    unsubscribe = electronAPI.onAuthToken(async (idToken: string) => {
      if (settled) return;
      try {
        if (!idToken) throw new Error('Jeton manquant dans le deep link.');
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        cleanup();
        resolve(result.user);
      } catch (e: any) {
        cleanup();
        reject(new Error(e?.message || 'Erreur de connexion via Electron.'));
      }
    });

    Promise.resolve(electronAPI.openAuthBrowser()).catch((e: any) => {
      if (settled) return;
      cleanup();
      reject(new Error(e?.message || "Impossible d'ouvrir le navigateur."));
    });
  });
}

/**
 * Sign out from Firebase
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Auth state listener wrapper
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
