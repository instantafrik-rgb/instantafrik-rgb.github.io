import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Coins,
  DollarSign,
  Calendar,
  Package,
  Users,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CreditCard,
  Percent,
  Layers,
  FileSpreadsheet,
  ArrowDownRight,
  AlertTriangle,
  HeartHandshake,
  User,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate, getTodayDateString, toLocalDateString } from '../utils/formatters';
import { calculateStockValue } from '../utils/calculations';
import {
  calculateFinancialMetrics,
  calculatePaymentBreakdown,
  calculateProductPerformances,
} from '../utils/reportsAnalytics';
import { CashClosureModal } from '../components/modals/CashClosureModal';
import { CashRegisterClosure } from '../types';

export const ReportsPage: React.FC = () => {
  const { state, navigate } = useApp();
  const { currency, currencyPosition, name: companyName } = state.settings;
  const curr = (val: number) => formatCurrency(val, currency, currencyPosition);

  // Period state
  const [period, setPeriod] = useState<'today' | '7' | '30' | 'this_month' | 'this_year' | 'all' | 'custom'>('30');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(() => getTodayDateString());

  // Top products sort
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'volume' | 'profit'>('revenue');

  // Non-commercial exits filter
  const [nonCommercialFilter, setNonCommercialFilter] = useState<'all' | 'loss' | 'defective' | 'donation'>('all');

  // Modals
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [localClosures, setLocalClosures] = useState<CashRegisterClosure[]>(() => state.closures || []);

  // Filter invoices according to selected period
  const filteredInvoices = useMemo(() => {
    const today = getTodayDateString();
    return state.invoices.filter((inv) => {
      if (inv.status === 'cancelled') return false;
      const invDate = toLocalDateString(inv.date || inv.createdAt);
      if (!invDate) return false;

      if (period === 'all') return true;

      if (period === 'today') {
        return invDate === today;
      }

      if (period === '7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const limitStr = toLocalDateString(d);
        return invDate >= limitStr && invDate <= today;
      }

      if (period === '30') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const limitStr = toLocalDateString(d);
        return invDate >= limitStr && invDate <= today;
      }

      if (period === 'this_month') {
        const monthPrefix = today.slice(0, 7); // YYYY-MM
        return invDate.startsWith(monthPrefix);
      }

      if (period === 'this_year') {
        const yearPrefix = today.slice(0, 4); // YYYY
        return invDate.startsWith(yearPrefix);
      }

      if (period === 'custom') {
        if (customStartDate && customEndDate) {
          return invDate >= customStartDate && invDate <= customEndDate;
        }
        if (customStartDate) return invDate >= customStartDate;
        if (customEndDate) return invDate <= customEndDate;
        return true;
      }

      return true;
    });
  }, [state.invoices, period, customStartDate, customEndDate]);

  // Filter payments according to selected period
  const filteredPayments = useMemo(() => {
    const today = getTodayDateString();
    return state.payments.filter((p) => {
      const pDate = toLocalDateString(p.date || p.createdAt);
      if (!pDate) return false;

      if (period === 'all') return true;

      if (period === 'today') {
        return pDate === today;
      }

      if (period === '7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const limitStr = toLocalDateString(d);
        return pDate >= limitStr && pDate <= today;
      }

      if (period === '30') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const limitStr = toLocalDateString(d);
        return pDate >= limitStr && pDate <= today;
      }

      if (period === 'this_month') {
        const monthPrefix = today.slice(0, 7); // YYYY-MM
        return pDate.startsWith(monthPrefix);
      }

      if (period === 'this_year') {
        const yearPrefix = today.slice(0, 4); // YYYY
        return pDate.startsWith(yearPrefix);
      }

      if (period === 'custom') {
        if (customStartDate && customEndDate) {
          return pDate >= customStartDate && pDate <= customEndDate;
        }
        if (customStartDate) return pDate >= customStartDate;
        if (customEndDate) return pDate <= customEndDate;
        return true;
      }

      return true;
    });
  }, [state.payments, period, customStartDate, customEndDate]);

  // Total amount actually collected in the filtered payments
  const totalPaymentsAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  // Core analytics metrics
  const financialMetrics = useMemo(() => {
    return calculateFinancialMetrics(filteredInvoices);
  }, [filteredInvoices]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    return calculatePaymentBreakdown(filteredPayments);
  }, [filteredPayments]);

  // Product performances
  const productPerformances = useMemo(() => {
    const list = calculateProductPerformances(filteredInvoices);
    if (productSortBy === 'volume') {
      return [...list].sort((a, b) => b.unitsSold - a.unitsSold);
    }
    if (productSortBy === 'profit') {
      return [...list].sort((a, b) => b.grossProfit - a.grossProfit);
    }
    return list; // default revenue
  }, [filteredInvoices, productSortBy]);

  // Stock valuation stats
  const stockValuation = useMemo(() => {
    return calculateStockValue(state.products);
  }, [state.products]);

  // Filter stock movements according to selected period
  const filteredMovements = useMemo(() => {
    const today = getTodayDateString();
    return state.movements.filter((m) => {
      const mDate = toLocalDateString(m.createdAt);
      if (!mDate) return false;

      if (period === 'all') return true;
      if (period === 'today') return mDate === today;
      if (period === '7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return mDate >= toLocalDateString(d) && mDate <= today;
      }
      if (period === '30') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return mDate >= toLocalDateString(d) && mDate <= today;
      }
      if (period === 'this_month') return mDate.startsWith(today.slice(0, 7));
      if (period === 'this_year') return mDate.startsWith(today.slice(0, 4));
      if (period === 'custom') {
        if (customStartDate && customEndDate) {
          return mDate >= customStartDate && mDate <= customEndDate;
        }
        if (customStartDate) return mDate >= customStartDate;
        if (customEndDate) return mDate <= customEndDate;
        return true;
      }
      return true;
    });
  }, [state.movements, period, customStartDate, customEndDate]);

  // Non-commercial stock exits (Don, Perte, Défectueux)
  const nonCommercialExits = useMemo(() => {
    return filteredMovements.filter(
      (m) =>
        m.type === 'out' &&
        (m.reason === 'donation' || m.reason === 'loss' || m.reason === 'defective')
    );
  }, [filteredMovements]);

  // Non-commercial exits metrics and costing
  const nonCommercialMetrics = useMemo(() => {
    let totalQty = 0;
    let totalCostLoss = 0;
    let lossesQty = 0;
    let lossesCost = 0;
    let defectiveQty = 0;
    let defectiveCost = 0;
    let donationQty = 0;
    let donationCost = 0;

    const productMap = new Map<string, { purchasePrice?: number; unit?: string }>();
    state.products.forEach((p) => {
      productMap.set(p.id, { purchasePrice: p.purchasePrice, unit: p.unit });
    });

    nonCommercialExits.forEach((m) => {
      const pInfo = productMap.get(m.productId);
      const unitCost = pInfo?.purchasePrice || 0;
      const moveCost = m.quantity * unitCost;

      totalQty += m.quantity;
      totalCostLoss += moveCost;

      if (m.reason === 'loss') {
        lossesQty += m.quantity;
        lossesCost += moveCost;
      } else if (m.reason === 'defective') {
        defectiveQty += m.quantity;
        defectiveCost += moveCost;
      } else if (m.reason === 'donation') {
        donationQty += m.quantity;
        donationCost += moveCost;
      }
    });

    return {
      totalQty,
      totalCostLoss,
      lossesQty,
      lossesCost,
      defectiveQty,
      defectiveCost,
      donationQty,
      donationCost,
    };
  }, [nonCommercialExits, state.products]);

  // Filtered non-commercial list according to chip
  const displayedNonCommercialExits = useMemo(() => {
    if (nonCommercialFilter === 'all') return nonCommercialExits;
    return nonCommercialExits.filter((m) => m.reason === nonCommercialFilter);
  }, [nonCommercialExits, nonCommercialFilter]);

  // Filter returns according to selected period
  const filteredReturns = useMemo(() => {
    const today = getTodayDateString();
    return (state.returns || []).filter((r) => {
      const rDate = toLocalDateString(r.date || r.createdAt);
      if (!rDate) return false;

      if (period === 'all') return true;
      if (period === 'today') return rDate === today;
      if (period === '7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return rDate >= toLocalDateString(d) && rDate <= today;
      }
      if (period === '30') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return rDate >= toLocalDateString(d) && rDate <= today;
      }
      if (period === 'this_month') return rDate.startsWith(today.slice(0, 7));
      if (period === 'this_year') return rDate.startsWith(today.slice(0, 4));
      if (period === 'custom') {
        if (customStartDate && customEndDate) {
          return rDate >= customStartDate && rDate <= customEndDate;
        }
        if (customStartDate) return rDate >= customStartDate;
        if (customEndDate) return rDate <= customEndDate;
        return true;
      }
      return true;
    });
  }, [state.returns, period, customStartDate, customEndDate]);

  // Returns metrics
  const returnsMetrics = useMemo(() => {
    let totalReturnedVal = 0;
    let refundedVal = 0;
    let creditNotesVal = 0;
    let restockedQty = 0;
    let exchangesCount = 0;

    filteredReturns.forEach((r) => {
      totalReturnedVal += r.totalReturnedAmount || 0;
      if (r.actionType === 'refund') {
        refundedVal += r.totalReturnedAmount || 0;
      } else if (r.actionType === 'credit_note') {
        creditNotesVal += r.totalReturnedAmount || 0;
      } else if (r.actionType === 'exchange') {
        exchangesCount += 1;
      }
      r.items.forEach((it) => {
        if (it.restock) {
          restockedQty += it.quantity;
        }
      });
    });

    return {
      count: filteredReturns.length,
      totalReturnedVal,
      refundedVal,
      creditNotesVal,
      restockedQty,
      exchangesCount,
    };
  }, [filteredReturns]);

  const handleSaveClosure = (closure: CashRegisterClosure) => {
    setLocalClosures((prev) => [closure, ...prev]);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
            Rapports & Marges Réelles
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Rentabilité, marges brutes, top ventes & clôtures de caisse journalières (Z)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowClosureModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-transform active:scale-95 min-h-[44px]"
          >
            <Coins className="w-4 h-4" />
            <span>Clôture Z de Caisse</span>
          </button>
        </div>
      </div>

      {/* 2. Period Selector & Range Filters */}
      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === 'today'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === '7'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              7 derniers jours
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === '30'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              30 derniers jours
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === 'this_month'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Ce mois-ci
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_year')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === 'this_year'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Cette année
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Tout l'historique
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                period === 'custom'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Personnalisé
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            {filteredInvoices.length} vente(s) analysée(s)
          </div>
        </div>

        {period === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 font-bold">Du</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-slate-500 font-bold">au</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* 3. Financial KPI Dashboard (CA, COGS, Marge Brute, Panier Moyen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Chiffre d'Affaires Facturé */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chiffre d'Affaires</span>
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {curr(financialMetrics.totalBilled)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Encaissé : <strong className="text-emerald-600">{curr(totalPaymentsAmount)}</strong></span>
              {financialMetrics.totalReceivables > 0 && (
                <span>Dû : <strong className="text-amber-600">{curr(financialMetrics.totalReceivables)}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Coût d'Achat des Marchandises (COGS) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Coût des Ventes (COGS)</span>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {curr(financialMetrics.totalCostOfGoodsSold)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Dépenses d'achat des {financialMetrics.itemsSoldTotal} unité(s) vendue(s)
            </div>
          </div>
        </div>

        {/* KPI 3: Marge Brute Réelle & Taux de Marge */}
        <div className="p-5 rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Marge Brute Réelle</span>
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-200 tracking-tight">
                {curr(financialMetrics.grossProfit)}
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                {financialMetrics.marginRate}%
              </span>
            </div>
            <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-1">
              Bénéfice net brut avant charges fixes
            </div>
          </div>
        </div>

        {/* KPI 4: Panier Moyen */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Panier Moyen</span>
            <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {curr(financialMetrics.averageBasket)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Sur {financialMetrics.transactionsCount} transaction(s) réalisée(s)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Modes de Règlement & Valorisation Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider leading-tight">
                Encaissements par Mode de Paiement
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono block whitespace-nowrap">
                {curr(totalPaymentsAmount)}
              </span>
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                {filteredPayments.length} paiement(s)
              </span>
            </div>
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucun règlement enregistré sur cette période
            </div>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {curr(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Valuation & Health */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Valorisation Globale du Stock
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('stock')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Gérer stock
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs items-stretch">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col">
              <div className="text-[10px] text-slate-400 uppercase font-bold leading-tight min-h-[1.75rem]">
                Valeur d'achat
              </div>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {curr(stockValuation.purchaseValue)}
              </div>
              <div className="text-[10px] text-slate-500 mt-auto pt-1">Capital immobilisé</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col">
              <div className="text-[10px] text-slate-400 uppercase font-bold leading-tight min-h-[1.75rem]">
                Valeur marchande
              </div>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {curr(stockValuation.sellingValue)}
              </div>
              <div className="text-[10px] text-slate-500 mt-auto pt-1">CA potentiel maximal</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block leading-tight">
                Marge bénéficiaire latente en rayon :
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                Sur les {state.products.length} référence(s) du catalogue
              </span>
            </div>
            <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
              +{curr(Math.max(0, stockValuation.sellingValue - stockValuation.purchaseValue))}
            </div>
          </div>
        </div>
      </div>
      {/* 5. Top Products & Profitability Ranking Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Classement & Rentabilité des Produits
              </h3>
              <p className="text-xs text-slate-500">
                Performance unitaire des ventes et contribution à la marge brute
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setProductSortBy('revenue')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                productSortBy === 'revenue'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Par CA
            </button>
            <button
              type="button"
              onClick={() => setProductSortBy('volume')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                productSortBy === 'volume'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Par Volume
            </button>
            <button
              type="button"
              onClick={() => setProductSortBy('profit')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                productSortBy === 'profit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Par Marge
            </button>
          </div>
        </div>

        {productPerformances.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Aucune vente enregistrée sur la période sélectionnée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Produit / Désignation</th>
                  <th className="py-3 px-3 text-center">Quantités</th>
                  <th className="py-3 px-3 text-right">CA Réalisé</th>
                  <th className="py-3 px-3 text-right">Coût Achat</th>
                  <th className="py-3 px-3 text-right">Marge Brute</th>
                  <th className="py-3 px-3 text-center">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productPerformances.map((prod, idx) => (
                  <tr key={prod.designation + idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : idx === 1
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-700/60 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {prod.designation}
                          </span>
                          {prod.reference && (
                            <span className="text-[10px] font-mono text-slate-400">{prod.reference}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold font-mono">
                      {prod.unitsSold}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                      {curr(prod.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {curr(prod.cost)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{curr(prod.grossProfit)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        {prod.marginRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Sorties de Stock Non Commerciales (Dons, Pertes, Défectueux) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Sorties de Stock Non Commerciales
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Hors Chiffre d'Affaires
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Traçabilité des dons, pertes et défectueux (le stock réel diminue sans générer de vente commerciale)
              </p>
            </div>
          </div>

          {/* Reason Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setNonCommercialFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                nonCommercialFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Toutes ({nonCommercialExits.length})
            </button>
            <button
              type="button"
              onClick={() => setNonCommercialFilter('loss')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                nonCommercialFilter === 'loss'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Pertes ({nonCommercialMetrics.lossesQty})
            </button>
            <button
              type="button"
              onClick={() => setNonCommercialFilter('defective')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                nonCommercialFilter === 'defective'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Défectueux ({nonCommercialMetrics.defectiveQty})
            </button>
            <button
              type="button"
              onClick={() => setNonCommercialFilter('donation')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                nonCommercialFilter === 'donation'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Dons ({nonCommercialMetrics.donationQty})
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
            <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase">Pertes / Vols</div>
            <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              {nonCommercialMetrics.lossesQty} unité(s)
            </div>
            <div className="text-xs text-rose-700/80 dark:text-rose-300/80 font-medium">
              Coût achat : {curr(nonCommercialMetrics.lossesCost)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Articles Défectueux</div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {nonCommercialMetrics.defectiveQty} unité(s)
            </div>
            <div className="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium">
              Coût achat : {curr(nonCommercialMetrics.defectiveCost)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40">
            <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">Dons / Gratuités</div>
            <div className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {nonCommercialMetrics.donationQty} unité(s)
            </div>
            <div className="text-xs text-indigo-700/80 dark:text-indigo-300/80 font-medium">
              Coût achat : {curr(nonCommercialMetrics.donationCost)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Total Sorties Hors CA</div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              {nonCommercialMetrics.totalQty} unité(s)
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Impact financier : -{curr(nonCommercialMetrics.totalCostLoss)}
            </div>
          </div>
        </div>

        {/* Non-Commercial Exits Table */}
        {displayedNonCommercialExits.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Aucune sortie non commerciale enregistrée sur cette période
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date & Heure</th>
                  <th className="py-3 px-3">Produit</th>
                  <th className="py-3 px-3 text-center">Motif</th>
                  <th className="py-3 px-3 text-center">Quantité sortie</th>
                  <th className="py-3 px-3">Utilisateur / Opérateur</th>
                  <th className="py-3 px-3">Note / Réf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedNonCommercialExits.map((m) => {
                  const reasonLabel =
                    m.reason === 'loss'
                      ? 'Perte'
                      : m.reason === 'defective'
                      ? 'Article défectueux'
                      : 'Don';
                  const badgeColor =
                    m.reason === 'loss'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : m.reason === 'defective'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {m.productName}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badgeColor}`}>
                          {reasonLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400">
                        -{m.quantity}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.userName || 'Responsable Stock'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {m.note || m.referenceId ? (
                          <span>
                            {m.note}
                            {m.note && m.referenceId && ' • '}
                            {m.referenceId && (
                              <span className="font-mono text-slate-400">({m.referenceId})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic">Aucune note</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Retours, Avoirs & Échanges */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Retours, Avoirs & Échanges de Marchandises
              </h3>
              <p className="text-xs text-slate-500">
                Suivi des remboursements, avoirs et réintégrations en stock
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('invoices')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-bold hover:bg-indigo-100 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Voir les factures & retours</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Cards Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase block">
              Total Retours ({returnsMetrics.count})
            </span>
            <div className="text-lg font-black font-mono text-indigo-900 dark:text-indigo-100 mt-0.5">
              {curr(returnsMetrics.totalReturnedVal)}
            </div>
            <span className="text-[10px] text-indigo-500 mt-1 block">
              Valeur marchande des retours
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Remboursements</span>
            <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              {curr(returnsMetrics.refundedVal)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Décaissements effectués</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Avoirs Clients</span>
            <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {curr(returnsMetrics.creditNotesVal)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Crédits déduits des factures</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">
              Stock Revendable
            </span>
            <div className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-100 mt-0.5">
              {returnsMetrics.restockedQty} unité(s)
            </div>
            <span className="text-[10px] text-emerald-600 mt-1 block">
              Remises automatiquement en rayon
            </span>
          </div>
        </div>

        {/* Retours List */}
        {filteredReturns.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Aucun retour enregistré sur cette période
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Facture & Client</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3">Articles retournés</th>
                  <th className="py-3 px-3 text-right">Montant</th>
                  <th className="py-3 px-3">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(ret.date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                        Facture #{ret.invoiceNumber}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {ret.clientName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          ret.actionType === 'refund'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : ret.actionType === 'credit_note'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {ret.actionType === 'refund'
                          ? 'Remboursement'
                          : ret.actionType === 'credit_note'
                          ? 'Avoir client'
                          : 'Échange'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {ret.items.map((it, idx) => (
                        <div key={idx} className="text-[11px] leading-tight">
                          <span className="font-bold">{it.quantity}x</span> {it.designation}{' '}
                          {it.restock && (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                              Remis en stock
                            </span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {curr(ret.totalReturnedAmount)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      <span>{ret.reason}</span>
                      {ret.notes && (
                        <span className="block text-slate-400 text-[10px] italic">{ret.notes}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Closure Modal */}
      <CashClosureModal
        isOpen={showClosureModal}
        onClose={() => setShowClosureModal(false)}
        onSaveClosure={handleSaveClosure}
      />
    </div>
  );
};
