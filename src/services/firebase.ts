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
  signInWithCredential,   // ✅ NOUVEAU : pour Electron
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

/**
 * Sign in with Google (tries popup first, falls back to redirect if popup is blocked)
 * 
 * ⚠️ À utiliser UNIQUEMENT sur le web (pas dans Electron).
 */
export async function signInWithGoogle(): Promise<User> {
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
 * ✅ NOUVEAU : Sign in with Google via Electron (deep link).
 * 
 * Google bloque les popups dans Electron, donc on passe par le navigateur système :
 * 1. Electron ouvre `auth-callback.html` dans le navigateur par défaut.
 * 2. L'utilisateur se connecte avec Google.
 * 3. La page redirige vers `stockfacture://auth/callback?idToken=...`.
 * 4. Windows rouvre Electron avec le deep link.
 * 5. Electron envoie le jeton au renderer.
 * 6. Cette fonction utilise `signInWithCredential` pour connecter l'utilisateur.
 * 
 * ⚠️ À utiliser UNIQUEMENT dans Electron.
 */
export async function signInWithGoogleElectron(): Promise<User> {
  const electronAPI = (window as any).electronAPI;

  if (!electronAPI || !electronAPI.isElectron) {
    throw new Error('Cette fonction doit être appelée dans Electron.');
  }

  // Demande à Electron d'ouvrir le navigateur système
  await electronAPI.openAuthBrowser();

  // Écoute le jeton renvoyé par le deep link
  return new Promise<User>((resolve, reject) => {
    electronAPI.onAuthToken(async (idToken: string) => {
      try {
        if (!idToken) {
          reject(new Error('Jeton manquant dans le deep link.'));
          return;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        resolve(result.user);
      } catch (e: any) {
        reject(new Error(e?.message || 'Erreur de connexion via Electron.'));
      }
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