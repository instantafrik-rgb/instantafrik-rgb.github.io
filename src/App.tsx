/**
 * StockFacture Pro - Main Application Entrypoint
 */

import React from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastProvider } from './store/ToastContext';
import { LicenseProvider, useLicense, hasAppAccess } from './store/LicenseContext';
import { CloudMigrationBanner } from './components/common/CloudMigrationBanner';
import { PWAUpdateToast } from './components/common/PWAUpdateToast';
import { DemoBanner } from './components/common/DemoBanner';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalePage } from './pages/SalePage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { ClientsPage } from './pages/ClientsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ReceivablesPage } from './pages/ReceivablesPage';
import { QuotesPage } from './pages/QuotesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ManualInvoicePage } from './pages/ManualInvoicePage';
import { LicenseBlockedPage } from './pages/LicenseBlockedPage';
import { notificationService } from './services/notificationService';
import { isUserOnboarded } from './utils/onboardingUtils';
import { BrandLogo } from './components/common/BrandLogo';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';

const MainView: React.FC = () => {
  const { activeView, isLoading, state, completeOnboarding, navigate } = useApp();
  const { isLoadingAuth, user } = useAuth();
  const { license, isLoading: isLoadingLicense } = useLicense();

  // Initialize background notification scheduler with state access and reports navigation
  React.useEffect(() => {
    notificationService.initialize(
      () => state,
      () => navigate('reports')
    );
    return () => notificationService.cleanup();
  }, [state, navigate]);

  if (isLoading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] text-[#14213D] space-y-4">
        <BrandLogo size="lg" className="animate-pulse" />
        <p className="text-sm font-bold text-[#64748B]">Chargement de StockFacture Pro...</p>
      </div>
    );
  }

  // [LANDING] Si l'utilisateur n'est PAS connecté → afficher la landing page marketing
  if (!user) {
    return <LandingPage />;
  }

  // [LICENCE] Vérification du statut de licence (admin / licencié / essai)
  if (isLoadingLicense) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] dark:bg-slate-950 text-[#14213D] dark:text-white space-y-4">
        <BrandLogo size="lg" className="animate-pulse" />
        <p className="text-sm font-bold text-[#64748B] dark:text-slate-400">
          Vérification de votre licence...
        </p>
      </div>
    );
  }

  // Si la licence n'est pas valide → écran de blocage
  if (!hasAppAccess(license.status)) {
    return <LicenseBlockedPage />;
  }

  // Onboarding en 3 étapes pour les nouveaux comptes
  const hasCompletedOnboarding = isUserOnboarded(user?.uid, state);

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingFlow
        onComplete={async (settings) => {
          await completeOnboarding(settings);
        }}
      />
    );
  }

  return (
    <AppShell>
      <DemoBanner />
      <CloudMigrationBanner />
      <PWAUpdateToast />
      {activeView === 'dashboard' && <DashboardPage />}
      {activeView === 'sales' && <SalePage />}
      {activeView === 'products' && <ProductsPage />}
      {activeView === 'stock' && <StockPage />}
      {activeView === 'clients' && <ClientsPage />}
      {activeView === 'invoices' && <InvoicesPage />}
      {activeView === 'receivables' && <ReceivablesPage />}
      {activeView === 'quotes' && <QuotesPage />}
      {activeView === 'reports' && <ReportsPage />}
      {activeView === 'settings' && <SettingsPage />}
      {activeView === 'manual_invoice' && <ManualInvoicePage />}
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <LicenseProvider>
            <MainView />
          </LicenseProvider>
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  );
}