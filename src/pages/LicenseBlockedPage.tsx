/**
 * StockFacture Pro - License Blocked Page
 * 
 * Affiché quand la licence est expirée ou absente.
 * Design impactant pour inciter à l'achat.
 */

import React from 'react';
import { Lock, Mail, Phone, LogOut, ShieldCheck, RefreshCw, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from '../store/AuthContext';
import { useLicense } from '../store/LicenseContext';

export const LicenseBlockedPage: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const { license, refreshLicense, isLoading } = useLicense();

  const isExpired = license.status === 'trial_expired';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF7ED] via-[#FAFAF8] to-[#FAFAF8] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-4">
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="w-full max-w-lg">

          {/* Header avec logo centré + glow */}
          <div className="flex justify-center mb-6 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <BrandLogo size="xl" />
            </div>
          </div>

          {/* Carte principale */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-7 sm:p-9 shadow-2xl border border-[#E8EDF2] dark:border-slate-800 space-y-6 animate-in zoom-in-95">

            {/* Icône cadenas + titre */}
            <div className="text-center space-y-4">
              <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 text-white items-center justify-center shadow-lg shadow-rose-500/30">
                <Lock className="w-10 h-10" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[#14213D] dark:text-white leading-tight">
                  {isExpired ? 'Votre essai est terminé' : 'Accès restreint'}
                </h1>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                  {isExpired
                    ? 'Votre période d\'essai gratuite de 7 jours est arrivée à son terme. Activez votre licence pour continuer à utiliser StockFacture Pro.'
                    : license.message || 'Ce compte n\'a pas accès à StockFacture Pro.'}
                </p>
              </div>
            </div>

            {/* Info compte */}
            {user?.email && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/60 border border-[#E8EDF2] dark:border-slate-700/60">
                <span className="text-xs text-[#64748B] dark:text-slate-400">Connecté en tant que</span>
                <span className="text-xs font-bold text-[#14213D] dark:text-white truncate">{user.email}</span>
              </div>
            )}

            {/* Bloc bénéfices / argumentaire */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-950/20 border border-orange-200 dark:border-orange-900/60 space-y-3">
              <div className="flex items-center">
                <h2 className="text-sm font-black text-orange-900 dark:text-orange-200">
                  Activez votre licence à vie
                </h2>
              </div>
              <ul className="space-y-1.5 text-xs text-orange-900/90 dark:text-orange-200/90">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                  <span>Accès complet à toutes les fonctionnalités</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                  <span>Synchronisation cloud multi-appareils</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                  <span>Mises à jour incluses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                  <span>Support par WhatsApp et Email</span>
                </li>
              </ul>
            </div>

            {/* Contacts */}
            <div className="space-y-2.5">
              <a
                href="mailto:instantafrik@gmail.com?subject=Demande%20de%20licence%20StockFacture%20Pro"
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/60 border-2 border-[#E8EDF2] dark:border-slate-700/60 hover:border-orange-400 dark:hover:border-orange-700 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-900/40">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                    Par email
                  </p>
                  <p className="text-sm font-bold text-[#14213D] dark:text-white truncate">
                    instantafrik@gmail.com
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0" />
              </a>

              <a
                href="https://wa.me/22890000000?text=Bonjour%2C%20je%20souhaite%20acheter%20une%20licence%20StockFacture%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800/60 border-2 border-[#E8EDF2] dark:border-slate-700/60 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-900/40">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                    Par WhatsApp
                  </p>
                  <p className="text-sm font-bold text-[#14213D] dark:text-white truncate">
                    Discuter maintenant
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
              </a>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={refreshLicense}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-[#14213D] hover:bg-[#26354F] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#14213D] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Vérification...' : 'J\'ai été activé — Revérifier'}</span>
              </button>

              <button
                type="button"
                onClick={signOutUser}
                className="w-full py-3 rounded-2xl bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#E8EDF2] dark:border-slate-800 flex items-center justify-center gap-2 text-[10px] text-[#64748B] dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sécurisé par Google • Licence liée à votre compte</span>
            </div>
          </div>

          {/* Mention bas de page */}
          <p className="text-center text-[10px] text-[#64748B] dark:text-slate-500 mt-6">
            © 2026 StockFacture Pro — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};