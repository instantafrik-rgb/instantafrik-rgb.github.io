/**
 * StockFacture Pro - Demo Banner
 * 
 * Carte visible affichée en mode démo pour rappeler à l'utilisateur
 * qu'il est en période d'essai.
 */

import React from 'react';
import { X, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLicense } from '../../store/LicenseContext';

export const DemoBanner: React.FC = () => {
  const { license } = useLicense();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (license.status !== 'trial' || isDismissed) return null;

  const days = license.daysRemaining ?? 0;
  const isUrgent = days <= 2;
  const isCritical = days <= 0;

  return (
    <div className="px-3 sm:px-4 pt-3 pb-0 max-w-4xl mx-auto w-full">
      <div
        className={`relative overflow-hidden rounded-3xl border-2 shadow-lg transition-all ${
          isUrgent
            ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/60 dark:to-rose-950/30 border-rose-300 dark:border-rose-800/60'
            : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/60 dark:to-amber-950/30 border-orange-300 dark:border-orange-800/60'
        }`}
      >
        {/* Éléments décoratifs */}
        <div
          className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 ${
            isUrgent ? 'bg-rose-500' : 'bg-orange-500'
          }`}
        />
        <div
          className={`absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-10 ${
            isUrgent ? 'bg-rose-500' : 'bg-orange-500'
          }`}
        />

        <div className="relative p-4 sm:p-5 flex items-start gap-4">
          {/* Icône / Compteur */}
          <div
            className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg ${
              isUrgent
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30'
                : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-6 h-6 mb-0.5" strokeWidth={2.5} />
            ) : (
              <Clock className="w-6 h-6 mb-0.5" strokeWidth={2.5} />
            )}
            <span className="text-lg font-black font-mono leading-none">{days}</span>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isUrgent
                    ? 'bg-rose-500 text-white'
                    : 'bg-orange-500 text-white'
                }`}
              >
                Mode démo
              </span>
              {isCritical && (
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-300 uppercase">
                  ⚠️ Dernier jour
                </span>
              )}
            </div>

            <p
              className={`text-sm font-bold leading-tight ${
                isUrgent
                  ? 'text-rose-900 dark:text-rose-100'
                  : 'text-orange-900 dark:text-orange-100'
              }`}
            >
              Il vous reste <strong>{days} jour{days > 1 ? 's' : ''}</strong> d'essai gratuit
            </p>

            <p
              className={`text-[11px] leading-relaxed ${
                isUrgent
                  ? 'text-rose-700/80 dark:text-rose-200/80'
                  : 'text-orange-700/80 dark:text-orange-200/80'
              }`}
            >
              Activez votre licence maintenant pour continuer à utiliser StockFacture Pro sans interruption.
            </p>

            <a
              href="https://wa.me/22890000000?text=Bonjour%2C%20je%20souhaite%20acheter%20une%20licence%20StockFacture%20Pro"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-xs transition-all hover:shadow-md ${
                isUrgent
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <span>Activer ma licence</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Bouton fermer */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className={`shrink-0 p-1.5 rounded-xl transition-colors ${
              isUrgent
                ? 'text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40'
                : 'text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-950/40'
            }`}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};