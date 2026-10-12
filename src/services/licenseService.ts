/**
 * StockFacture Pro - License Service
 * 
 * Gère la vérification des licences liées au compte Google.
 * - Les emails admin sont toujours autorisés (liste locale + Firestore).
 * - Les emails licenciés sont stockés dans Firestore collection `licensed_users`.
 * - Mode démo : 7 jours à partir de la première connexion.
 * - Cache local : 24h pour permettre un usage hors-ligne normal.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

// ============================================================
// CONFIGURATION
// ============================================================

/** Durée du mode démo : 7 jours */
const TRIAL_DURATION_DAYS = 7;

/** Durée du cache de vérification hors-ligne : 24h */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/** Clé de stockage local pour la date de première connexion */
const TRIAL_START_KEY = 'stockfacture_trial_start';

/** Clé de stockage local pour le cache de licence */
const LICENSE_CACHE_KEY = 'stockfacture_license_cache';

// ============================================================
// TYPES
// ============================================================

export type LicenseStatus =
  | 'loading'         // Vérification en cours
  | 'admin'           // Admin (accès illimité)
  | 'licensed'        // Client licencié
  | 'trial'           // En période d'essai (X jours restants)
  | 'trial_expired'   // Essai expiré
  | 'not_licensed'    // Pas de licence et pas en essai
  | 'offline_cached'; // Vérification impossible, cache utilisé

export interface LicenseInfo {
  status: LicenseStatus;
  daysRemaining?: number;
  isAdmin?: boolean;
  email?: string;
  message?: string;
}

interface LicenseCache {
  status: LicenseStatus;
  isAdmin: boolean;
  email: string;
  timestamp: number;
  daysRemaining?: number;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Récupère la date de première connexion (début de l'essai).
 * Si elle n'existe pas, l'initialise à maintenant.
 */
function getOrCreateTrialStart(): number {
  try {
    const stored = localStorage.getItem(TRIAL_START_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp) && timestamp > 0) {
        return timestamp;
      }
    }
    // Première connexion : on enregistre maintenant
    const now = Date.now();
    localStorage.setItem(TRIAL_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/**
 * Calcule le nombre de jours restants en essai.
 */
function getDaysRemaining(trialStart: number): number {
  const elapsedMs = Date.now() - trialStart;
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const remaining = TRIAL_DURATION_DAYS - elapsedDays;
  return Math.max(0, remaining);
}

/**
 * Lit le cache de licence.
 */
function readCache(): LicenseCache | null {
  try {
    const raw = localStorage.getItem(LICENSE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LicenseCache;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Écrit le cache de licence.
 */
function writeCache(cache: LicenseCache): void {
  try {
    localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/**
 * Efface le cache de licence (utile en cas de déconnexion).
 */
export function clearLicenseCache(): void {
  try {
    localStorage.removeItem(LICENSE_CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Efface la date de début d'essai (utile si l'admin veut réinitialiser).
 */
export function clearTrialStart(): void {
  try {
    localStorage.removeItem(TRIAL_START_KEY);
  } catch {
    // ignore
  }
}

// ============================================================
// VÉRIFICATION PRINCIPALE
// ============================================================

/**
 * Vérifie le statut de licence de l'utilisateur connecté.
 * 
 * Logique :
 * 1. Pas connecté → not_licensed
 * 2. Vérifier dans Firestore si l'email est dans `licensed_users`
 *    - isAdmin: true → admin
 *    - isActive: true → licensed
 * 3. Sinon → mode démo (trial) ou trial_expired
 * 4. Si Firestore inaccessible → utiliser le cache (24h max)
 */
export async function checkLicense(): Promise<LicenseInfo> {
  const user = auth.currentUser;

  // 1. Pas connecté
  if (!user || !user.email) {
    return {
      status: 'not_licensed',
      message: 'Connectez-vous avec Google pour activer votre licence.',
    };
  }

  const email = user.email.toLowerCase();

  // 2. Vérifier dans Firestore
  try {
    const licenseRef = doc(db, 'licensed_users', email);
    const licenseSnap = await getDoc(licenseRef);

    if (licenseSnap.exists()) {
      const data = licenseSnap.data();
      const isActive = data.isActive === true;
      const isAdmin = data.isAdmin === true;

      if (isAdmin && isActive) {
        const info: LicenseInfo = {
          status: 'admin',
          isAdmin: true,
          email,
        };
        writeCache({ status: 'admin', isAdmin: true, email, timestamp: Date.now() });
        return info;
      }

      if (isActive) {
        const info: LicenseInfo = {
          status: 'licensed',
          email,
        };
        writeCache({ status: 'licensed', isAdmin: false, email, timestamp: Date.now() });
        return info;
      }
    }

    // 3. Pas trouvé ou inactif → mode démo
    const trialStart = getOrCreateTrialStart();
    const daysRemaining = getDaysRemaining(trialStart);

    if (daysRemaining > 0) {
      const info: LicenseInfo = {
        status: 'trial',
        daysRemaining,
        email,
      };
      writeCache({
        status: 'trial',
        isAdmin: false,
        email,
        timestamp: Date.now(),
        daysRemaining,
      });
      return info;
    }

    // Essai expiré
    const expiredInfo: LicenseInfo = {
      status: 'trial_expired',
      daysRemaining: 0,
      email,
    };
    writeCache({
      status: 'trial_expired',
      isAdmin: false,
      email,
      timestamp: Date.now(),
      daysRemaining: 0,
    });
    return expiredInfo;

  } catch (error: any) {
    // 4. Firestore inaccessible (hors-ligne, permissions, etc.) → cache
    console.warn('[License] Vérification Firestore échouée, utilisation du cache:', error);
    const cache = readCache();
    const now = Date.now();

    if (cache && now - cache.timestamp < CACHE_DURATION_MS) {
      // Cache encore valide (< 24h)
      return {
        status: cache.status === 'trial' ? 'trial' : cache.status,
        daysRemaining: cache.daysRemaining,
        isAdmin: cache.isAdmin,
        email: cache.email,
        message: 'Vérification hors-ligne (cache < 24h)',
      };
    }

    // Cache expiré ou inexistant : on tolère 24h de plus en mode dégradé
    if (!cache) {
      return {
        status: 'offline_cached',
        email,
        message: 'Vérification de licence en attente de connexion internet.',
      };
    }

    // Cache périmé : on redemande
    return {
      status: 'not_licensed',
      email,
      message: 'Impossible de vérifier votre licence. Connectez-vous à internet.',
    };
  }
}

/**
 * Récupère la durée restante de l'essai (pour affichage).
 */
export function getTrialInfo(): { daysRemaining: number; isExpired: boolean } {
  const trialStart = getOrCreateTrialStart();
  const daysRemaining = getDaysRemaining(trialStart);
  return {
    daysRemaining,
    isExpired: daysRemaining <= 0,
  };
}