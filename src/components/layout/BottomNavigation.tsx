import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Menu,
  FileText,
  BadgeAlert,
  ClipboardList,
  BarChart3,
  Settings,
  X,
  Package,
  Plus,
} from 'lucide-react';
import { useApp, ActiveView } from '../../store/AppContext';

export const BottomNavigation: React.FC = () => {
  const { activeView, navigate, state } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const activeReceivablesCount = state.invoices.filter(
    (i) => (i.status === 'unpaid' || i.status === 'partial') && i.remainingAmount > 0
  ).length;

  const isMoreActive = ['quotes', 'receivables', 'products', 'clients', 'stock', 'settings', 'manual_invoice', 'invoices'].includes(
    activeView
  );

  const handleTabClick = (view: ActiveView) => {
    setShowMoreMenu(false);
    navigate(view);
  };

  return (
    <>
      {/* Bottom Sheet Menu for "Plus" */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowMoreMenu(false)} aria-hidden="true" />

          <div
            className="relative z-10 w-full bg-white dark:bg-[#131B2E] rounded-t-3xl border-t border-[#E8EDF2] dark:border-[#22304E] p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-[#E8EDF2] dark:border-[#22304E]">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Menu & Modules Commerciaux
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Facture Manuelle */}
              <button
                onClick={() => handleTabClick('manual_invoice')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/60 text-left border border-orange-200/70 dark:border-orange-800/40 transition-all active:scale-95 col-span-2"
              >
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#14213D] dark:text-white truncate">Facture manuelle</div>
                  <div className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">Créer une facture avec client et articles libres</div>
                </div>
              </button>

              {/* Mes ventes (NOUVEAU — déplacé depuis le bottom nav) */}
              <button
                onClick={() => handleTabClick('invoices')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Mes ventes</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {state.invoices.length} facture{state.invoices.length > 1 ? 's' : ''}
                  </div>
                </div>
              </button>

              {/* Stock */}
              <button
                onClick={() => handleTabClick('stock')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Stock</div>
                  <div className="text-[10px] text-slate-400 truncate">Flux & entrées</div>
                </div>
              </button>

              {/* Créances (À encaisser) */}
              <button
                onClick={() => handleTabClick('receivables')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <BadgeAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">À encaisser</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {activeReceivablesCount > 0 ? `${activeReceivablesCount} impayé(s)` : 'À jour'}
                  </div>
                </div>
              </button>

              {/* Devis */}
              <button
                onClick={() => handleTabClick('quotes')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Devis</div>
                  <div className="text-[10px] text-slate-400 truncate">{state.quotes.length} devis</div>
                </div>
              </button>

              {/* Rapports & Marges */}
              <button
                onClick={() => handleTabClick('reports')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Rapports</div>
                  <div className="text-[10px] text-slate-400 truncate">Marges & statistiques</div>
                </div>
              </button>

              {/* Paramètres */}
              <button
                onClick={() => handleTabClick('settings')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF8] dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left border border-[#E8EDF2] dark:border-slate-700/60 transition-all active:scale-95"
              >
                <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Paramètres</div>
                  <div className="text-[10px] text-slate-400 truncate">Entreprise & PIN</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar on Mobile with Dominant Floating Center Action */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] dark:bg-[#131B2E] border-t border-[#E8EDF2] dark:border-[#22304E] shadow-[0_-2px_12px_rgba(20,33,61,0.03)] md:hidden transition-all"
        style={{
          height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="grid grid-cols-5 items-center h-[var(--bottom-nav-height)] px-1 relative">

          {/* 1. Accueil */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all ${
              activeView === 'dashboard'
                ? 'text-[#F97316] font-black'
                : 'text-[#94A3B8] dark:text-slate-400 hover:text-[#14213D]'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform ${activeView === 'dashboard' ? 'scale-110 text-[#F97316]' : ''}`} />
            <span className="text-[10px] font-bold tracking-tight mt-1">Accueil</span>
          </button>

          {/* 2. Clients (remplace Mes ventes) */}
          <button
            onClick={() => handleTabClick('clients')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all ${
              activeView === 'clients'
                ? 'text-[#F97316] font-black'
                : 'text-[#94A3B8] dark:text-slate-400 hover:text-[#14213D]'
            }`}
          >
            <Users className={`w-5 h-5 transition-transform ${activeView === 'clients' ? 'scale-110 text-[#F97316]' : ''}`} />
            <span className="text-[10px] font-bold tracking-tight mt-1">Clients</span>
          </button>

          {/* 3. ACTION PRINCIPALE CENTRALE SURÉLEVÉE (Vendre) */}
          <div className="flex flex-col items-center justify-center relative -top-3">
            <button
              onClick={() => handleTabClick('sales')}
              className={`w-14 h-14 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white shadow-lg shadow-orange-500/30 border-4 border-[#FFFFFF] dark:border-[#131B2E] flex items-center justify-center active:scale-90 transition-transform ${
                activeView === 'sales' ? 'ring-2 ring-orange-500 ring-offset-2' : ''
              }`}
              aria-label="Nouvelle vente"
            >
              <Plus className="w-7 h-7 stroke-[3]" />
            </button>
            <span className="text-[10px] font-black text-[#F97316] mt-0.5 tracking-tight">
              Vente
            </span>
          </div>

          {/* 4. Catalogue (Accès direct mobile) */}
          <button
            onClick={() => handleTabClick('products')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all ${
              activeView === 'products'
                ? 'text-[#F97316] font-black'
                : 'text-[#94A3B8] dark:text-slate-400 hover:text-[#14213D]'
            }`}
          >
            <Package className={`w-5 h-5 transition-transform ${activeView === 'products' ? 'scale-110 text-[#F97316]' : ''}`} />
            <span className="text-[10px] font-bold tracking-tight mt-1">Catalogue</span>
          </button>

          {/* 5. Plus / Compte */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
              isMoreActive
                ? 'text-[#F97316] font-black'
                : 'text-[#94A3B8] dark:text-slate-400 hover:text-[#14213D]'
            }`}
          >
            <div className="relative">
              <Menu className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 text-[#F97316]' : ''}`} />
              {activeReceivablesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-1">Plus</span>
          </button>

        </div>
      </nav>
    </>
  );
};