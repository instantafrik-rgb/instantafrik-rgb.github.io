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
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  // If already initialized or persistent cache not supported in environment
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