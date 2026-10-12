import React, { useState } from 'react';
import { ArrowLeft, Plus, Lock, Moon, Sun, CloudCheck, CloudOff, Loader2, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { formatDate } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack = false }) => {
  const { activeView, selectedItemId, goBack, navigate, state, updateSettings, lockApp } = useApp();
  const { user, syncStatus, signOutUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleTheme = () => {
    updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const handleLogout = async () => {
    await signOutUser();
    setShowLogoutConfirm(false);
  };

  const getPageTitle = () => {
    if (title) return title;
    switch (activeView) {
      case 'dashboard':
        return 'Accueil';
      case 'sales':
        return 'Nouvelle vente';
      case 'products':
        return 'Mes produits';
      case 'stock':
        return 'Stock & Flux';
      case 'clients':
        return 'Clients & Contacts';
      case 'invoices':
        return 'Mes ventes';
      case 'receivables':
        return 'À encaisser';
      case 'quotes':
        return 'Devis & Chiffrages';
      case 'reports':
        return 'Rapports & Marges';
      case 'settings':
        return 'Paramètres';
      case 'manual_invoice':
        return 'Facture manuelle';
      default:
        return 'StockFacture Pro';
    }
  };

  const canGoBack = showBack || Boolean(selectedItemId) || activeView !== 'dashboard';

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAFAF8]/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-[#E8EDF2] dark:border-[#22304E] px-2 sm:px-4 lg:px-8 py-3.5 flex items-center justify-between gap-2 transition-colors overflow-hidden">                <div className="flex items-center gap-2 min-w-0 flex-1">
          {canGoBack && activeView !== 'dashboard' && (
            <button
              type="button"
              onClick={goBack}
              className="p-2 -ml-1 rounded-2xl text-[#64748B] hover:text-[#14213D] dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#14213D] dark:text-white leading-tight truncate">
              {getPageTitle()}
            </h2>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 hidden sm:block">
              {subtitle || `${state.settings.name || 'Commerce'} • ${formatDate(new Date())}`}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={() => navigate('settings')}
            title={
              user
                ? syncStatus.state === 'syncing'
                  ? 'Synchronisation en cours...'
                  : syncStatus.state === 'error'
                  ? `Erreur de synchronisation: ${syncStatus.errorMessage || 'Vérifiez la connexion'}`
                  : syncStatus.isOnline
                  ? `Synchronisé avec ${user.email}`
                  : 'Hors connexion (modifications locales conservées)'
                : 'Mode local (cliquez pour connecter Google)'
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px]"
          >
            {user ? (
              syncStatus.state === 'syncing' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 shrink-0" />
                  <span className="hidden sm:inline text-orange-600 dark:text-orange-400 font-semibold">
                    Synchronisation…
                  </span>
                </>
              ) : syncStatus.state === 'error' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="hidden sm:inline text-rose-600 dark:text-rose-400 font-semibold">
                    Erreur de synchronisation
                  </span>
                </>
              ) : !syncStatus.isOnline || syncStatus.state === 'offline' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-semibold">
                    Hors connexion
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
                    Synchronisé
                  </span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline text-slate-500">Local</span>
              </>
            )}
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={state.settings.theme === 'dark' ? 'Mode sombre actif — Passer en clair' : 'Mode clair actif — Passer en sombre'}
            className="p-2 rounded-2xl text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {state.settings.theme === 'dark' ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
          </button>

          {/* Logout button (uniquement si connecté) */}
          {user && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              type="button"
              title="Se déconnecter"
              className="p-2 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          {/* Lock App (if PIN configured) */}
          {state.settings.pinEnabled && (
            <button
              onClick={lockApp}
              type="button"
              title="Verrouiller"
              className="p-2 rounded-2xl text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center md:hidden"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}

          {/* Primary CTA (Nouvelle Vente) on other subpages */}
          {activeView !== 'sales' && activeView !== 'dashboard' && (
            <button
              type="button"
              onClick={() => navigate('sales')}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-transform active:scale-95 whitespace-nowrap min-h-[44px] shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Vendre</span>
            </button>
          )}
        </div>
      </header>

      {/* Dialogue de confirmation de déconnexion */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Se déconnecter ?"
        message={`Vous allez être déconnecté de ${user?.email || 'votre compte Google'}. Vos données restent synchronisées dans le cloud et vous pourrez vous reconnecter à tout moment.`}
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};