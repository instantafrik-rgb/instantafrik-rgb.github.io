/**
 * StockFacture Pro - License Context
 * 
 * Vérifie le statut de licence de l'utilisateur connecté.
 * Expose le statut via un hook `useLicense()`.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { checkLicense, clearLicenseCache, LicenseInfo, LicenseStatus } from '../services/licenseService';

interface LicenseContextValue {
  license: LicenseInfo;
  isLoading: boolean;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();
  const [license, setLicense] = useState<LicenseInfo>({ status: 'loading' });
  const [isLoading, setIsLoading] = useState(true);

  const refreshLicense = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await checkLicense();
      setLicense(info);
    } catch (err) {
      console.error('[License] Erreur:', err);
      setLicense({ status: 'not_licensed', message: 'Erreur de vérification.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      // Déconnecté : on efface le cache et on remet à loading
      clearLicenseCache();
      setLicense({ status: 'loading' });
      setIsLoading(false);
      return;
    }

    refreshLicense();
  }, [user, isLoadingAuth, refreshLicense]);

  return (
    <LicenseContext.Provider value={{ license, isLoading, refreshLicense }}>
      {children}
    </LicenseContext.Provider>
  );
};

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return ctx;
}

/**
 * Helper : l'utilisateur a-t-il accès à l'app ?
 */
export function hasAppAccess(status: LicenseStatus): boolean {
  return (
    status === 'admin' ||
    status === 'licensed' ||
    status === 'trial' ||
    status === 'offline_cached'
  );
}