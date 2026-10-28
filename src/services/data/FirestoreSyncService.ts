/**
 * StockFacture Pro - Firestore Real-Time & Offline Sync Service
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  runTransaction,
  increment,
  query,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  AppState,
  Product,
  StockMovement,
  Client,
  Invoice,
  Quote,
  PaymentRecord,
  CompanySettings,
  Category,
  CashRegisterClosure,
  RestockRequest,
  SaleReturn,
} from '../../types';
import { SyncStatus } from './types';
import { markUserOnboardedLocally } from '../../utils/onboardingUtils';
import { isDemoSettings, hasCustomUserSettings, cleanCompanySettings } from '../../utils/settingsUtils';
import {
  isDemoProduct,
  isDemoClient,
  isDemoInvoice,
  isDemoQuote,
  isDemoPayment,
  isDemoMovement,
  isDemoRestockRequest,
} from '../../utils/demoFilter';

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date || (typeof (data as any)?.toDate === 'function')) return data;
  if (Array.isArray(data)) {
    return data.filter((item) => item !== undefined).map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

function isRecentlyCreated(createdAt?: string, windowMs = 180000): boolean {
  if (!createdAt) return false;
  try {
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    return Date.now() - createdTime < windowMs;
  } catch {
    return false;
  }
}

export class FirestoreSyncService {
  private activeSubscriptions: Unsubscribe[] = [];
  private currentUserId: string | null = null;
  private onRemoteUpdateCallback: ((updater: (prevState: AppState) => AppState) => void) | null = null;
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private collectionErrors: Map<string, { code?: string; message: string; timestamp: string }> = new Map();
  private healthyCollections: Set<string> = new Set();

  private status: SyncStatus = {
    state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
    pendingChangesCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncedAt: undefined,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivity(true));
      window.addEventListener('offline', () => this.handleConnectivity(false));
    }
  }

  private handleConnectivity(isOnline: boolean) {
    this.status = {
      ...this.status,
      isOnline,
      state: !isOnline ? 'offline' : (this.currentUserId ? 'idle' : 'offline'),
    };
    this.notifyStatus();
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public subscribeStatus(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus() {
    this.statusListeners.forEach((l) => l(this.status));
  }

  private logSyncError(operation: string, error: any, context?: Record<string, any>) {
    const code = error?.code || 'unknown';
    const message = error?.message || String(error);
    console.warn(`[FirestoreSync] ${operation} failed:`, { code, message, ...context });
    if (code === 'permission-denied') {
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: `Permissions insuffisantes (${operation})`,
      };
      this.notifyStatus();
    }
  }

  public registerRemoteUpdateListener(callback: (updater: (prevState: AppState) => AppState) => void) {
    this.onRemoteUpdateCallback = callback;
  }

  public startSync(userId: string) {
    if (this.currentUserId === userId && this.activeSubscriptions.length > 0) return;
    this.stopSync();
    this.currentUserId = userId;
    this.collectionErrors.clear();
    this.healthyCollections.clear();
    this.status = { ...this.status, state: 'syncing' };
    this.notifyStatus();

    this.purgeAllDemoDataFromCloud(userId).catch((err) => {
      console.warn('[FirestoreSync] Initial demo purge warning:', err);
    });

    try {
      this.subscribeToCollections(userId);
    } catch (e: any) {
      console.warn('[FirestoreSync] Error starting sync listeners:', e);
      this.status = { ...this.status, state: 'error', errorMessage: e?.message || 'Erreur' };
      this.notifyStatus();
    }
  }

  public async purgeAllDemoDataFromCloud(userId: string): Promise<number> {
    let deletedCount = 0;
    try {
      const collectionsToCheck = [
        { name: 'products', filter: isDemoProduct },
        { name: 'clients', filter: isDemoClient },
        { name: 'invoices', filter: isDemoInvoice },
        { name: 'quotes', filter: isDemoQuote },
        { name: 'payments', filter: isDemoPayment },
        { name: 'movements', filter: isDemoMovement },
        { name: 'restockRequests', filter: isDemoRestockRequest },
      ];

      for (const col of collectionsToCheck) {
        try {
          const colRef = collection(db, 'users', userId, col.name);
          const snap = await getDocs(colRef);
          const toDelete: string[] = [];
          snap.forEach((d) => {
            const data = { ...d.data(), id: d.id };
            if (col.filter(data as any)) toDelete.push(d.id);
          });

          if (toDelete.length > 0) {
            let batch = writeBatch(db);
            let bCount = 0;
            const nowIso = new Date().toISOString();
            for (const docId of toDelete) {
              batch.update(doc(db, 'users', userId, col.name, docId), { _deleted: true, updatedAt: nowIso });
              bCount++;
              deletedCount++;
              if (bCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                bCount = 0;
              }
            }
            if (bCount > 0) await batch.commit();
          }
        } catch (colErr) {
          console.warn(`[FirestoreSync] Purge error on ${col.name}:`, colErr);
        }
      }
    } catch (err) {
      console.warn('[FirestoreSync] purgeAllDemoDataFromCloud error:', err);
    }
    return deletedCount;
  }

  public stopSync() {
    this.activeSubscriptions.forEach((unsub) => {
      try { unsub(); } catch {}
    });
    this.activeSubscriptions = [];
    this.currentUserId = null;
    this.collectionErrors.clear();
    this.healthyCollections.clear();
    this.status = { ...this.status, state: 'idle', errorMessage: undefined };
    this.notifyStatus();
  }

  public async hasCloudData(userId: string): Promise<boolean> {
    try {
      const onboardingRef = doc(db, 'users', userId, 'settings', 'onboarding');
      const settingsRef = doc(db, 'users', userId, 'settings', 'company');
      const [onboardingSnap, settingsSnap] = await Promise.all([
        getDoc(onboardingRef),
        getDoc(settingsRef),
      ]);

      if (onboardingSnap.exists() && onboardingSnap.data()?.hasCompletedOnboarding) return true;
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data?.hasCompletedOnboarding || data?.name || data?.currency) return true;
      }

      const collectionsToCheck = ['products', 'clients', 'invoices', 'quotes', 'movements'];
      const checks = collectionsToCheck.map(async (colName) => {
        try {
          const colRef = collection(db, 'users', userId, colName);
          const q = query(colRef, limit(1));
          const snap = await getDocs(q);
          return !snap.empty;
        } catch { return false; }
      });
      const results = await Promise.all(checks);
      return results.some(Boolean);
    } catch (err) {
      console.warn('[FirestoreSync] Error checking cloud data:', err);
      return false;
    }
  }

  public async persistOnboardingStatus(userId: string): Promise<void> {
    try {
      const nowIso = new Date().toISOString();
      markUserOnboardedLocally(userId);
      const onboardingRef = doc(db, 'users', userId, 'settings', 'onboarding');
      await setDoc(onboardingRef, { hasCompletedOnboarding: true, completedAt: nowIso }, { merge: true });
      const companyRef = doc(db, 'users', userId, 'settings', 'company');
      await setDoc(companyRef, { hasCompletedOnboarding: true, updatedAt: nowIso }, { merge: true });
    } catch (e) {
      console.warn('[FirestoreSync] Failed to persist onboarding status to Firestore:', e);
    }
  }

  public async migrateLocalToCloud(userId: string, localState: AppState): Promise<boolean> {
    try {
      this.status = { ...this.status, state: 'syncing' };
      this.notifyStatus();

      if (localState.settings) {
        const settingsToMigrate = isDemoSettings(localState.settings)
          ? cleanCompanySettings(localState.settings)
          : localState.settings;
        const sanitizedSettings = sanitizeForFirestore({ ...settingsToMigrate, updatedAt: new Date().toISOString() });
        await setDoc(doc(db, 'users', userId, 'settings', 'company'), sanitizedSettings);
      }

      let batch = writeBatch(db);
      let count = 0;
      const commitAndResetBatchIfNeeded = async () => {
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      };

      for (const p of localState.products || []) {
        if (isDemoProduct(p)) continue;
        const ref = doc(db, 'users', userId, 'products', p.id);
        batch.set(ref, sanitizeForFirestore({ ...p, updatedAt: p.updatedAt || new Date().toISOString(), createdAt: p.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const c of localState.clients || []) {
        if (isDemoClient(c)) continue;
        const ref = doc(db, 'users', userId, 'clients', c.id);
        batch.set(ref, sanitizeForFirestore({ ...c, updatedAt: c.updatedAt || new Date().toISOString(), createdAt: c.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const inv of localState.invoices || []) {
        if (isDemoInvoice(inv)) continue;
        const ref = doc(db, 'users', userId, 'invoices', inv.id);
        batch.set(ref, sanitizeForFirestore({ ...inv, updatedAt: inv.updatedAt || new Date().toISOString(), createdAt: inv.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const q of localState.quotes || []) {
        if (isDemoQuote(q)) continue;
        const ref = doc(db, 'users', userId, 'quotes', q.id);
        batch.set(ref, sanitizeForFirestore({ ...q, updatedAt: q.updatedAt || new Date().toISOString(), createdAt: q.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const pay of localState.payments || []) {
        if (isDemoPayment(pay)) continue;
        const ref = doc(db, 'users', userId, 'payments', pay.id);
        batch.set(ref, sanitizeForFirestore({ ...pay, createdAt: pay.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const m of localState.movements || []) {
        if (isDemoMovement(m)) continue;
        const ref = doc(db, 'users', userId, 'movements', m.id);
        batch.set(ref, sanitizeForFirestore({ ...m, createdAt: m.createdAt || new Date().toISOString() }));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      for (const cat of localState.categories || []) {
        const ref = doc(db, 'users', userId, 'categories', cat.id);
        batch.set(ref, sanitizeForFirestore(cat));
        count++;
        await commitAndResetBatchIfNeeded();
      }

      if (localState.closures) {
        for (const cl of localState.closures) {
          const ref = doc(db, 'users', userId, 'closures', cl.id);
          batch.set(ref, sanitizeForFirestore(cl));
          count++;
          await commitAndResetBatchIfNeeded();
        }
      }

      if (localState.restockRequests) {
        for (const rr of localState.restockRequests) {
          if (isDemoRestockRequest(rr)) continue;
          const ref = doc(db, 'users', userId, 'restockRequests', rr.id);
          batch.set(ref, sanitizeForFirestore(rr));
          count++;
          await commitAndResetBatchIfNeeded();
        }
      }

      if (localState.returns) {
        for (const ret of localState.returns) {
          const ref = doc(db, 'users', userId, 'returns', ret.id);
          batch.set(ref, sanitizeForFirestore(ret));
          count++;
          await commitAndResetBatchIfNeeded();
        }
      }

      if (count > 0) await batch.commit();

      this.status = { ...this.status, state: 'idle', lastSyncedAt: new Date().toISOString(), errorMessage: undefined };
      this.notifyStatus();
      return true;
    } catch (err: any) {
      console.error('[FirestoreSync] Migration to cloud error:', err);
      this.status = { ...this.status, state: 'error', errorMessage: err?.message || 'Erreur' };
      this.notifyStatus();
      return false;
    }
  }

  private subscribeToCollections(userId: string) {
    // 0. Onboarding
    const onboardingRef = doc(db, 'users', userId, 'settings', 'onboarding');
    this.activeSubscriptions.push(onSnapshot(onboardingRef, (snap) => {
      if (snap.exists() && snap.data()?.hasCompletedOnboarding) {
        markUserOnboardedLocally(userId);
        if (this.onRemoteUpdateCallback) {
          this.onRemoteUpdateCallback((prev) => ({
            ...prev,
            hasCompletedOnboarding: true,
            settings: { ...prev.settings, hasCompletedOnboarding: true },
          }));
        }
      }
    }, (err) => console.warn('[FirestoreSync] Onboarding listener warning:', err)));

    // 1. Settings
    const settingsRef = doc(db, 'users', userId, 'settings', 'company');
    this.activeSubscriptions.push(onSnapshot(settingsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        if (snap.exists()) {
          const cloudSettings = snap.data() as CompanySettings;
          markUserOnboardedLocally(userId);
          this.onRemoteUpdateCallback((prev) => {
            if (isDemoSettings(cloudSettings)) {
              if (hasCustomUserSettings(prev.settings)) { this.syncSettings(prev.settings).catch(() => {}); return prev; }
              return { ...prev, settings: cleanCompanySettings(cloudSettings) };
            }
            const localTime = prev.settings?.updatedAt ? new Date(prev.settings.updatedAt).getTime() : 0;
            const cloudTime = cloudSettings.updatedAt ? new Date(cloudSettings.updatedAt).getTime() : 0;
            if (hasCustomUserSettings(prev.settings) && localTime > cloudTime && !isNaN(localTime) && !isNaN(cloudTime)) {
              this.syncSettings(prev.settings).catch(() => {});
              return prev;
            }
            return { ...prev, hasCompletedOnboarding: true, settings: { ...prev.settings, ...cloudSettings, hasCompletedOnboarding: true } };
          });
        } else {
          this.onRemoteUpdateCallback((prev) => {
            if (hasCustomUserSettings(prev.settings)) this.syncSettings(prev.settings).catch(() => {});
            return prev;
          });
        }
      }
      this.markCollectionHealthy('settings');
    }, (err) => this.handleSnapshotError('settings', err)));

    // 2. Products
    const productsRef = collection(db, 'users', userId, 'products');
    this.activeSubscriptions.push(onSnapshot(productsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteProducts: Product[] = [];
        snap.forEach((d) => {
          const data = d.data() as Product & { _deleted?: boolean };
          if (!data._deleted) {
            const item = { ...data, id: d.id };
            if (isDemoProduct(item)) {
              setDoc(doc(db, 'users', userId, 'products', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            } else { remoteProducts.push(item); }
          }
        });
        if (remoteProducts.length > 0) markUserOnboardedLocally(userId);
        remoteProducts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevProducts = (prev.products || []).filter((p) => !isDemoProduct(p));
          if (remoteProducts.length === 0 && cleanPrevProducts.length > 0) {
            this.syncLocalProductsIfCloudEmpty(userId, cleanPrevProducts);
            return { ...prev, products: cleanPrevProducts };
          }
          const remoteIds = new Set(remoteProducts.map((p) => p.id));
          const pendingLocal = cleanPrevProducts.filter((p) => !remoteIds.has(p.id) && isRecentlyCreated(p.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalProductsIfCloudEmpty(userId, pendingLocal);
            const merged = [...remoteProducts, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return { ...prev, products: merged };
          }
          return { ...prev, products: remoteProducts };
        });
      }
      this.markCollectionHealthy('products');
    }, (err) => this.handleSnapshotError('products', err)));

    // 3. Clients
    const clientsRef = collection(db, 'users', userId, 'clients');
    this.activeSubscriptions.push(onSnapshot(clientsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteClients: Client[] = [];
        snap.forEach((d) => {
          const data = d.data() as Client & { _deleted?: boolean };
          if (!data._deleted) {
            const item = { ...data, id: d.id };
            if (isDemoClient(item)) {
              setDoc(doc(db, 'users', userId, 'clients', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            } else { remoteClients.push(item); }
          }
        });
        if (remoteClients.length > 0) markUserOnboardedLocally(userId);
        remoteClients.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevClients = (prev.clients || []).filter((c) => !isDemoClient(c));
          if (remoteClients.length === 0 && cleanPrevClients.length > 0) {
            this.syncLocalClientsIfCloudEmpty(userId, cleanPrevClients);
            return { ...prev, clients: cleanPrevClients };
          }
          const remoteIds = new Set(remoteClients.map((c) => c.id));
          const pendingLocal = cleanPrevClients.filter((c) => !remoteIds.has(c.id) && isRecentlyCreated(c.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalClientsIfCloudEmpty(userId, pendingLocal);
            const merged = [...remoteClients, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return { ...prev, clients: merged };
          }
          return { ...prev, clients: remoteClients };
        });
      }
      this.markCollectionHealthy('clients');
    }, (err) => this.handleSnapshotError('clients', err)));

    // 4. Invoices
    const invoicesRef = collection(db, 'users', userId, 'invoices');
    this.activeSubscriptions.push(onSnapshot(invoicesRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteInvoices: Invoice[] = [];
        snap.forEach((d) => {
          const data = d.data() as Invoice & { _deleted?: boolean };
          if (!data._deleted) {
            const item = { ...data, id: d.id };
            if (isDemoInvoice(item)) {
              setDoc(doc(db, 'users', userId, 'invoices', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            } else { remoteInvoices.push(item); }
          }
        });
        if (remoteInvoices.length > 0) markUserOnboardedLocally(userId);
        remoteInvoices.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevInvoices = (prev.invoices || []).filter((i) => !isDemoInvoice(i));
          if (remoteInvoices.length === 0 && cleanPrevInvoices.length > 0) {
            this.syncLocalInvoicesIfCloudEmpty(userId, cleanPrevInvoices);
            return { ...prev, invoices: cleanPrevInvoices };
          }
          const remoteIds = new Set(remoteInvoices.map((i) => i.id));
          const pendingLocal = cleanPrevInvoices.filter((i) => !remoteIds.has(i.id) && isRecentlyCreated(i.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalInvoicesIfCloudEmpty(userId, pendingLocal);
            const merged = [...remoteInvoices, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
            return { ...prev, invoices: merged };
          }
          return { ...prev, invoices: remoteInvoices };
        });
      }
      this.markCollectionHealthy('invoices');
    }, (err) => this.handleSnapshotError('invoices', err)));

    // 5. Quotes
    const quotesRef = collection(db, 'users', userId, 'quotes');
    this.activeSubscriptions.push(onSnapshot(quotesRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteQuotes: Quote[] = [];
        snap.forEach((d) => {
          const data = d.data() as Quote & { _deleted?: boolean };
          if (!data._deleted) {
            const item = { ...data, id: d.id };
            if (isDemoQuote(item)) {
              setDoc(doc(db, 'users', userId, 'quotes', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            } else { remoteQuotes.push(item); }
          }
        });
        remoteQuotes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevQuotes = (prev.quotes || []).filter((q) => !isDemoQuote(q));
          if (remoteQuotes.length === 0 && cleanPrevQuotes.length > 0) {
            this.syncLocalQuotesIfCloudEmpty(userId, cleanPrevQuotes);
            return { ...prev, quotes: cleanPrevQuotes };
          }
          const remoteIds = new Set(remoteQuotes.map((q) => q.id));
          const pendingLocal = cleanPrevQuotes.filter((q) => !remoteIds.has(q.id) && isRecentlyCreated(q.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalQuotesIfCloudEmpty(userId, pendingLocal);
            const merged = [...remoteQuotes, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return { ...prev, quotes: merged };
          }
          return { ...prev, quotes: remoteQuotes };
        });
      }
      this.markCollectionHealthy('quotes');
    }, (err) => this.handleSnapshotError('quotes', err)));

    // 6. Payments
    const paymentsRef = collection(db, 'users', userId, 'payments');
    this.activeSubscriptions.push(onSnapshot(paymentsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remotePayments: PaymentRecord[] = [];
        snap.forEach((d) => {
          const item = { ...(d.data() as PaymentRecord), id: d.id };
          if (isDemoPayment(item)) {
            setDoc(doc(db, 'users', userId, 'payments', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          } else { remotePayments.push(item); }
        });
        remotePayments.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevPayments = (prev.payments || []).filter((p) => !isDemoPayment(p));
          if (remotePayments.length === 0 && cleanPrevPayments.length > 0) {
            this.syncLocalPaymentsIfCloudEmpty(userId, cleanPrevPayments);
            return { ...prev, payments: cleanPrevPayments };
          }
          const remoteIds = new Set(remotePayments.map((p) => p.id));
          const pendingLocal = cleanPrevPayments.filter((p) => !remoteIds.has(p.id) && isRecentlyCreated(p.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalPaymentsIfCloudEmpty(userId, pendingLocal);
            const merged = [...remotePayments, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
            return { ...prev, payments: merged };
          }
          return { ...prev, payments: remotePayments };
        });
      }
      this.markCollectionHealthy('payments');
    }, (err) => this.handleSnapshotError('payments', err)));

    // 7. Movements
    const movementsRef = collection(db, 'users', userId, 'movements');
    this.activeSubscriptions.push(onSnapshot(movementsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteMovements: StockMovement[] = [];
        snap.forEach((d) => {
          const item = { ...(d.data() as StockMovement), id: d.id };
          if (isDemoMovement(item)) {
            setDoc(doc(db, 'users', userId, 'movements', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          } else { remoteMovements.push(item); }
        });
        remoteMovements.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        this.onRemoteUpdateCallback((prev) => {
          const cleanPrevMovements = (prev.movements || []).filter((m) => !isDemoMovement(m));
          if (remoteMovements.length === 0 && cleanPrevMovements.length > 0) {
            this.syncLocalMovementsIfCloudEmpty(userId, cleanPrevMovements);
            return { ...prev, movements: cleanPrevMovements };
          }
          const remoteIds = new Set(remoteMovements.map((m) => m.id));
          const pendingLocal = cleanPrevMovements.filter((m) => !remoteIds.has(m.id) && isRecentlyCreated(m.createdAt));
          if (pendingLocal.length > 0) {
            this.syncLocalMovementsIfCloudEmpty(userId, pendingLocal);
            const merged = [...remoteMovements, ...pendingLocal];
            merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return { ...prev, movements: merged };
          }
          return { ...prev, movements: remoteMovements };
        });
      }
      this.markCollectionHealthy('movements');
    }, (err) => this.handleSnapshotError('movements', err)));

    // 8. Categories
    const categoriesRef = collection(db, 'users', userId, 'categories');
    this.activeSubscriptions.push(onSnapshot(categoriesRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteCategories: Category[] = [];
        snap.forEach((d) => remoteCategories.push({ ...(d.data() as Category), id: d.id }));
        this.onRemoteUpdateCallback((prev) => {
          if (remoteCategories.length === 0 && prev.categories && prev.categories.length > 0) {
            this.syncLocalCategoriesIfCloudEmpty(userId, prev.categories);
            return prev;
          }
          return { ...prev, categories: remoteCategories };
        });
      }
      this.markCollectionHealthy('categories');
    }, (err) => this.handleSnapshotError('categories', err)));

    // 9. Closures
    const closuresRef = collection(db, 'users', userId, 'closures');
    this.activeSubscriptions.push(onSnapshot(closuresRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteClosures: CashRegisterClosure[] = [];
        snap.forEach((d) => remoteClosures.push({ ...(d.data() as CashRegisterClosure), id: d.id }));
        remoteClosures.sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
        this.onRemoteUpdateCallback((prev) => ({ ...prev, closures: remoteClosures }));
      }
      this.markCollectionHealthy('closures');
    }, (err) => this.handleSnapshotError('closures', err)));

    // 10. Restock Requests
    const restockRef = collection(db, 'users', userId, 'restockRequests');
    this.activeSubscriptions.push(onSnapshot(restockRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteRequests: RestockRequest[] = [];
        snap.forEach((d) => {
          const item = { ...(d.data() as RestockRequest), id: d.id };
          if (isDemoRestockRequest(item)) {
            setDoc(doc(db, 'users', userId, 'restockRequests', d.id), { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          } else { remoteRequests.push(item); }
        });
        remoteRequests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.onRemoteUpdateCallback((prev) => ({ ...prev, restockRequests: remoteRequests }));
      }
      this.markCollectionHealthy('restockRequests');
    }, (err) => this.handleSnapshotError('restockRequests', err)));

    // 11. Returns
    const returnsRef = collection(db, 'users', userId, 'returns');
    this.activeSubscriptions.push(onSnapshot(returnsRef, (snap) => {
      if (this.onRemoteUpdateCallback) {
        const remoteReturns: SaleReturn[] = [];
        snap.forEach((d) => remoteReturns.push({ ...(d.data() as SaleReturn), id: d.id }));
        remoteReturns.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.onRemoteUpdateCallback((prev) => ({ ...prev, returns: remoteReturns }));
      }
      this.markCollectionHealthy('returns');
    }, (err) => this.handleSnapshotError('returns', err)));
  }

  private async syncLocalProductsIfCloudEmpty(userId: string, products: Product[]) {
    const cleanProducts = (products || []).filter((p) => !isDemoProduct(p));
    if (cleanProducts.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const product of cleanProducts) {
        const ref = doc(db, 'users', userId, 'products', product.id);
        batch.set(ref, sanitizeForFirestore({ ...product, updatedAt: product.updatedAt || new Date().toISOString(), createdAt: product.createdAt || new Date().toISOString() }));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local products:', e); }
  }

  private async syncLocalClientsIfCloudEmpty(userId: string, clients: Client[]) {
    const cleanClients = (clients || []).filter((c) => !isDemoClient(c));
    if (cleanClients.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const client of cleanClients) {
        const ref = doc(db, 'users', userId, 'clients', client.id);
        batch.set(ref, sanitizeForFirestore({ ...client, updatedAt: client.updatedAt || new Date().toISOString(), createdAt: client.createdAt || new Date().toISOString() }));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local clients:', e); }
  }

  private async syncLocalInvoicesIfCloudEmpty(userId: string, invoices: Invoice[]) {
    const cleanInvoices = (invoices || []).filter((i) => !isDemoInvoice(i));
    if (cleanInvoices.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const inv of cleanInvoices) {
        const ref = doc(db, 'users', userId, 'invoices', inv.id);
        batch.set(ref, sanitizeForFirestore({ ...inv, updatedAt: inv.updatedAt || new Date().toISOString(), createdAt: inv.createdAt || new Date().toISOString() }));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local invoices:', e); }
  }

  private async syncLocalQuotesIfCloudEmpty(userId: string, quotes: Quote[]) {
    const cleanQuotes = (quotes || []).filter((q) => !isDemoQuote(q));
    if (cleanQuotes.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const q of quotes) {
        const ref = doc(db, 'users', userId, 'quotes', q.id);
        batch.set(ref, sanitizeForFirestore({ ...q, updatedAt: q.updatedAt || new Date().toISOString(), createdAt: q.createdAt || new Date().toISOString() }));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local quotes:', e); }
  }

  private async syncLocalPaymentsIfCloudEmpty(userId: string, payments: PaymentRecord[]) {
    if (!payments || payments.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const p of payments) {
        const ref = doc(db, 'users', userId, 'payments', p.id);
        batch.set(ref, sanitizeForFirestore(p));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local payments:', e); }
  }

  private async syncLocalMovementsIfCloudEmpty(userId: string, movements: StockMovement[]) {
    if (!movements || movements.length === 0) return;
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const m of movements) {
        const ref = doc(db, 'users', userId, 'movements', m.id);
        batch.set(ref, sanitizeForFirestore(m));
        count++;
        if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local movements:', e); }
  }

  private async syncLocalCategoriesIfCloudEmpty(userId: string, categories: Category[]) {
    if (!categories || categories.length === 0) return;
    try {
      let batch = writeBatch(db);
      for (const cat of categories) {
        const ref = doc(db, 'users', userId, 'categories', cat.id);
        batch.set(ref, sanitizeForFirestore(cat));
      }
      await batch.commit();
    } catch (e) { console.warn('[FirestoreSync] Failed to sync local categories:', e); }
  }

  private markCollectionHealthy(collectionName: string) {
    this.collectionErrors.delete(collectionName);
    this.healthyCollections.add(collectionName);
    if (this.collectionErrors.size === 0) {
      this.status = { ...this.status, state: 'idle', lastSyncedAt: new Date().toISOString(), errorMessage: undefined };
    } else {
      this.status = { ...this.status, state: 'idle', lastSyncedAt: new Date().toISOString() };
    }
    this.notifyStatus();
  }

  private handleSnapshotError(collectionName: string, err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || 'Erreur inconnue';
    console.warn(`[FirestoreSync] Snapshot error on collection "${collectionName}":`, { collection: collectionName, code, message, operation: 'onSnapshot' });
    this.collectionErrors.set(collectionName, { code, message, timestamp: new Date().toISOString() });
    this.healthyCollections.delete(collectionName);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      this.status = { ...this.status, state: 'offline', errorMessage: 'Mode hors connexion' };
    } else if (code === 'permission-denied') {
      this.status = { ...this.status, state: 'error', errorMessage: `Permissions insuffisantes sur ${collectionName}` };
    } else if (this.healthyCollections.size === 0) {
      this.status = { ...this.status, state: 'error', errorMessage: `Erreur synchronisation ${collectionName}: ${message}` };
    } else {
      this.status = { ...this.status, state: 'idle', errorMessage: undefined };
    }
    this.notifyStatus();
  }

  public async syncStateChanges(prev: AppState, next: AppState): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      this.status = { ...this.status, state: 'syncing' };
      this.notifyStatus();
      const nowIso = new Date().toISOString();
      let batch = writeBatch(db);
      let opCount = 0;
      const commitAndResetIfNeeded = async () => {
        if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
      };

      if (prev.settings.updatedAt !== next.settings.updatedAt) {
        if (!isDemoSettings(next.settings) || hasCustomUserSettings(next.settings)) {
          const ref = doc(db, 'users', user.uid, 'settings', 'company');
          const sanitizedSettings = sanitizeForFirestore({ ...next.settings, updatedAt: new Date().toISOString() });
          batch.set(ref, sanitizedSettings, { merge: true });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevProductMap = new Map(prev.products.map((p) => [p.id, p]));
      const nextProductMap = new Map(next.products.map((p) => [p.id, p]));
      for (const [id, nextP] of nextProductMap) {
        const prevP = prevProductMap.get(id);
        if (!prevP || prevP.updatedAt !== nextP.updatedAt || prevP.stockQuantity !== nextP.stockQuantity) {
          const ref = doc(db, 'users', user.uid, 'products', id);
          batch.set(ref, sanitizeForFirestore({ ...nextP, updatedAt: nextP.updatedAt || new Date().toISOString() }));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }
      for (const [id] of prevProductMap) {
        if (!nextProductMap.has(id)) {
          const ref = doc(db, 'users', user.uid, 'products', id);
          batch.update(ref, { _deleted: true, updatedAt: nowIso });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevClientMap = new Map(prev.clients.map((c) => [c.id, c]));
      const nextClientMap = new Map(next.clients.map((c) => [c.id, c]));
      for (const [id, nextC] of nextClientMap) {
        const prevC = prevClientMap.get(id);
        if (!prevC || prevC.updatedAt !== nextC.updatedAt) {
          const ref = doc(db, 'users', user.uid, 'clients', id);
          batch.set(ref, sanitizeForFirestore({ ...nextC, updatedAt: nextC.updatedAt || new Date().toISOString() }));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }
      for (const [id] of prevClientMap) {
        if (!nextClientMap.has(id)) {
          const ref = doc(db, 'users', user.uid, 'clients', id);
          batch.update(ref, { _deleted: true, updatedAt: nowIso });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevMovementIds = new Set(prev.movements.map((m) => m.id));
      for (const m of next.movements) {
        if (!prevMovementIds.has(m.id)) {
          const ref = doc(db, 'users', user.uid, 'movements', m.id);
          batch.set(ref, sanitizeForFirestore(m));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevInvoiceMap = new Map(prev.invoices.map((i) => [i.id, i]));
      const nextInvoiceMap = new Map(next.invoices.map((i) => [i.id, i]));
      for (const [id, nextI] of nextInvoiceMap) {
        const prevI = prevInvoiceMap.get(id);
        if (!prevI || prevI.updatedAt !== nextI.updatedAt) {
          const ref = doc(db, 'users', user.uid, 'invoices', id);
          batch.set(ref, sanitizeForFirestore({ ...nextI, updatedAt: nextI.updatedAt || new Date().toISOString() }));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }
      for (const [id] of prevInvoiceMap) {
        if (!nextInvoiceMap.has(id)) {
          const ref = doc(db, 'users', user.uid, 'invoices', id);
          batch.update(ref, { _deleted: true, updatedAt: nowIso });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevQuoteMap = new Map(prev.quotes.map((q) => [q.id, q]));
      const nextQuoteMap = new Map(next.quotes.map((q) => [q.id, q]));
      for (const [id, nextQ] of nextQuoteMap) {
        const prevQ = prevQuoteMap.get(id);
        if (!prevQ || prevQ.updatedAt !== nextQ.updatedAt) {
          const ref = doc(db, 'users', user.uid, 'quotes', id);
          batch.set(ref, sanitizeForFirestore({ ...nextQ, updatedAt: nextQ.updatedAt || new Date().toISOString() }));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }
      for (const [id] of prevQuoteMap) {
        if (!nextQuoteMap.has(id)) {
          const ref = doc(db, 'users', user.uid, 'quotes', id);
          batch.update(ref, { _deleted: true, updatedAt: nowIso });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevPaymentIds = new Set(prev.payments.map((p) => p.id));
      for (const p of next.payments) {
        if (!prevPaymentIds.has(p.id)) {
          const ref = doc(db, 'users', user.uid, 'payments', p.id);
          batch.set(ref, sanitizeForFirestore(p));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      const prevCatMap = new Map(prev.categories.map((c) => [c.id, c]));
      const nextCatMap = new Map(next.categories.map((c) => [c.id, c]));
      for (const [id, nextCat] of nextCatMap) {
        const prevCat = prevCatMap.get(id);
        if (!prevCat || !prevCat.id || !nextCat.id) {
          const ref = doc(db, 'users', user.uid, 'categories', id);
          batch.set(ref, sanitizeForFirestore(nextCat));
          opCount++;
          await commitAndResetIfNeeded();
        }
      }
      for (const [id] of prevCatMap) {
        if (!nextCatMap.has(id)) {
          const ref = doc(db, 'users', user.uid, 'categories', id);
          batch.update(ref, { _deleted: true, updatedAt: nowIso });
          opCount++;
          await commitAndResetIfNeeded();
        }
      }

      if (next.closures) {
        const prevClosuresIds = new Set((prev.closures || []).map((cl) => cl.id));
        for (const cl of next.closures) {
          if (!prevClosuresIds.has(cl.id)) {
            const ref = doc(db, 'users', user.uid, 'closures', cl.id);
            batch.set(ref, sanitizeForFirestore(cl));
            opCount++;
            await commitAndResetIfNeeded();
          }
        }
      }

      if (next.returns) {
        const prevReturnsMap = new Map((prev.returns || []).map((r) => [r.id, r]));
        const nextReturnsMap = new Map(next.returns.map((r) => [r.id, r]));
        for (const [id, nextRet] of nextReturnsMap) {
          const prevRet = prevReturnsMap.get(id);
          if (!prevRet || prevRet.updatedAt !== nextRet.updatedAt) {
            const ref = doc(db, 'users', user.uid, 'returns', id);
            batch.set(ref, sanitizeForFirestore(nextRet));
            opCount++;
            await commitAndResetIfNeeded();
          }
        }
        for (const [id] of prevReturnsMap) {
          if (!nextReturnsMap.has(id)) {
            const ref = doc(db, 'users', user.uid, 'returns', id);
            batch.update(ref, { _deleted: true, updatedAt: nowIso });
            opCount++;
            await commitAndResetIfNeeded();
          }
        }
      }

      if (opCount > 0) await batch.commit();

      this.status = { ...this.status, state: 'idle', lastSyncedAt: new Date().toISOString(), errorMessage: undefined };
      this.notifyStatus();
    } catch (err: any) {
      const code = err?.code || 'unknown';
      const message = err?.message || 'Erreur lors de la synchronisation';
      console.warn('[FirestoreSync] syncStateChanges error:', { operation: 'writeBatch.commit', code, message, error: err });
      this.status = {
        ...this.status,
        state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
        errorMessage: code === 'permission-denied' ? 'Permissions insuffisantes pour enregistrer dans Firestore' : message,
      };
      this.notifyStatus();
    }
  }

  public async syncProduct(product: Product): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'products', product.id);
      await setDoc(ref, sanitizeForFirestore({ ...product, updatedAt: product.updatedAt || new Date().toISOString() }));
      this.markCollectionHealthy('products');
    } catch (e: any) { console.warn('[FirestoreSync] syncProduct failed:', { productId: product.id, error: e }); }
  }

  public async deleteProduct(productId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'products', productId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('products');
    } catch (e: any) { console.warn('[FirestoreSync] deleteProduct failed:', { productId, error: e }); }
  }

  public async syncStockMovement(movement: StockMovement): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'movements', movement.id);
      await setDoc(ref, sanitizeForFirestore(movement));
      this.markCollectionHealthy('movements');
    } catch (e: any) { console.warn('[FirestoreSync] syncStockMovement failed:', { movementId: movement.id, error: e }); }
  }

  public async syncClient(client: Client): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'clients', client.id);
      await setDoc(ref, sanitizeForFirestore({ ...client, updatedAt: client.updatedAt || new Date().toISOString() }));
      this.markCollectionHealthy('clients');
    } catch (e: any) { console.warn('[FirestoreSync] syncClient failed:', { clientId: client.id, error: e }); }
  }

  public async deleteClient(clientId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'clients', clientId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('clients');
    } catch (e: any) { console.warn('[FirestoreSync] deleteClient failed:', { clientId, error: e }); }
  }

  public async syncInvoice(invoice: Invoice): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'invoices', invoice.id);
      await setDoc(ref, sanitizeForFirestore({ ...invoice, updatedAt: invoice.updatedAt || new Date().toISOString() }));
      this.markCollectionHealthy('invoices');
    } catch (e: any) { console.warn('[FirestoreSync] syncInvoice failed:', { invoiceId: invoice.id, error: e }); }
  }

  public async deleteInvoice(invoiceId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'invoices', invoiceId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('invoices');
    } catch (e: any) { console.warn('[FirestoreSync] deleteInvoice failed:', { invoiceId, error: e }); }
  }

  public async syncQuote(quote: Quote): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'quotes', quote.id);
      await setDoc(ref, sanitizeForFirestore({ ...quote, updatedAt: quote.updatedAt || new Date().toISOString() }));
      this.markCollectionHealthy('quotes');
    } catch (e: any) { console.warn('[FirestoreSync] syncQuote failed:', { quoteId: quote.id, error: e }); }
  }

  public async deleteQuote(quoteId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'quotes', quoteId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('quotes');
    } catch (e: any) { console.warn('[FirestoreSync] deleteQuote failed:', { quoteId, error: e }); }
  }

  public async syncPayment(payment: PaymentRecord): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'payments', payment.id);
      await setDoc(ref, sanitizeForFirestore(payment));
      this.markCollectionHealthy('payments');
    } catch (e: any) { console.warn('[FirestoreSync] syncPayment failed:', { paymentId: payment.id, error: e }); }
  }

  public async syncSettings(settings: CompanySettings): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    if (isDemoSettings(settings) && !hasCustomUserSettings(settings)) {
      console.warn('[FirestoreSync] syncSettings rejected demo settings sync to cloud');
      return;
    }
    try {
      const ref = doc(db, 'users', user.uid, 'settings', 'company');
      await setDoc(ref, sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() }), { merge: true });
      this.markCollectionHealthy('settings');
    } catch (e: any) { console.warn('[FirestoreSync] syncSettings failed:', { error: e }); }
  }

  public async syncCategory(category: Category): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'categories', category.id);
      await setDoc(ref, sanitizeForFirestore(category));
      this.markCollectionHealthy('categories');
    } catch (e: any) { console.warn('[FirestoreSync] syncCategory failed:', { categoryId: category.id, error: e }); }
  }

  public async deleteCategory(categoryId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'categories', categoryId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('categories');
    } catch (e: any) { console.warn('[FirestoreSync] deleteCategory failed:', { categoryId, error: e }); }
  }

  public async syncClosure(closure: CashRegisterClosure): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'closures', closure.id);
      await setDoc(ref, sanitizeForFirestore(closure));
      this.markCollectionHealthy('closures');
    } catch (e: any) { console.warn('[FirestoreSync] syncClosure failed:', { closureId: closure.id, error: e }); }
  }

  public async syncRestockRequest(request: RestockRequest): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'restockRequests', request.id);
      await setDoc(ref, sanitizeForFirestore(request));
      this.markCollectionHealthy('restockRequests');
    } catch (e: any) { console.warn('[FirestoreSync] syncRestockRequest failed:', { requestId: request.id, error: e }); }
  }

  public async deleteRestockRequest(requestId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'restockRequests', requestId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('restockRequests');
    } catch (e: any) { console.warn('[FirestoreSync] deleteRestockRequest failed:', { requestId, error: e }); }
  }

  public async syncReturn(saleReturn: SaleReturn): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'returns', saleReturn.id);
      await setDoc(ref, sanitizeForFirestore(saleReturn));
      this.markCollectionHealthy('returns');
    } catch (e: any) { console.warn('[FirestoreSync] syncReturn failed:', { returnId: saleReturn.id, error: e }); }
  }

  public async deleteReturn(returnId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'returns', returnId);
      await setDoc(ref, { _deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      this.markCollectionHealthy('returns');
    } catch (e: any) { console.warn('[FirestoreSync] deleteReturn failed:', { returnId, error: e }); }
  }

  public async syncFullRestoredState(restoredState: AppState): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return true;
    return await this.migrateLocalToCloud(user.uid, restoredState);
  }

  public async commitSaleStockTransaction(params: {
    userId: string;
    invoice: Invoice;
    payment?: PaymentRecord;
    items: Array<{ productId?: string; designation: string; quantity: number; isFreeLine?: boolean }>;
    movements: StockMovement[];
    allowNegativeStock: boolean;
  }): Promise<{ success: boolean; error?: string; updatedStocks?: Record<string, number>; confirmedInvoiceNumber?: string }> {
    try {
      const { userId, invoice, payment, items, movements, allowNegativeStock } = params;
      const updatedStocks: Record<string, number> = {};
      let confirmedInvoiceNumber: string | undefined;

      await runTransaction(db, async (transaction) => {
        const productReads: Array<{ ref: any; currentStock: number; id: string; designation: string; qty: number }> = [];

        for (const item of items) {
          if (!item.isFreeLine && item.productId) {
            const pRef = doc(db, 'users', userId, 'products', item.productId);
            const pSnap = await transaction.get(pRef);
            if (pSnap.exists()) {
              const currentStock = Number(pSnap.data().stockQuantity) || 0;
              productReads.push({ ref: pRef, currentStock, id: item.productId, designation: item.designation, qty: item.quantity });
            }
          }
        }

        const settingsRef = doc(db, 'users', userId, 'settings', 'company');
        const settingsSnap = await transaction.get(settingsRef);

        let currentNumber = 1;
        let prefix = 'FAC-';
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (typeof settingsData.nextInvoiceNumber === 'number') currentNumber = settingsData.nextInvoiceNumber;
          if (typeof settingsData.invoicePrefix === 'string' && settingsData.invoicePrefix) prefix = settingsData.invoicePrefix;
        }

        const year = new Date().getFullYear();
        const padded = String(currentNumber).padStart(4, '0');
        confirmedInvoiceNumber = `${prefix}${year}-${padded}`;

        if (!allowNegativeStock) {
          for (const pr of productReads) {
            if (pr.currentStock < pr.qty) {
              throw new Error(`Stock insuffisant sur le Cloud pour "${pr.designation}". Disponible: ${pr.currentStock}, Demandé: ${pr.qty}.`);
            }
          }
        }

        const nowIso = new Date().toISOString();

        for (const pr of productReads) {
          const newStock = pr.currentStock - pr.qty;
          transaction.update(pr.ref, { stockQuantity: newStock, updatedAt: nowIso });
          updatedStocks[pr.id] = newStock;
        }

        const invRef = doc(db, 'users', userId, 'invoices', invoice.id);
        transaction.set(invRef, sanitizeForFirestore({ ...invoice, number: confirmedInvoiceNumber, updatedAt: nowIso }));

        if (payment) {
          const payRef = doc(db, 'users', userId, 'payments', payment.id);
          transaction.set(payRef, sanitizeForFirestore({ ...payment, invoiceNumber: confirmedInvoiceNumber }));
        }

        for (const mov of movements) {
          const movRef = doc(db, 'users', userId, 'movements', mov.id);
          transaction.set(movRef, sanitizeForFirestore(mov));
        }

        transaction.set(settingsRef, { nextInvoiceNumber: increment(1) }, { merge: true });
      });

      this.markCollectionHealthy('products');
      this.markCollectionHealthy('invoices');
      this.markCollectionHealthy('movements');
      if (payment) this.markCollectionHealthy('payments');

      return { success: true, updatedStocks, confirmedInvoiceNumber };
    } catch (err: any) {
      console.warn('[FirestoreSync] commitSaleStockTransaction error:', err);
      return { success: false, error: err?.message || 'Erreur lors de la validation atomique du stock' };
    }
  }

  public async commitStockMovementTransaction(params: {
    userId: string;
    movement: StockMovement;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    allowNegativeStock: boolean;
  }): Promise<{ success: boolean; error?: string; newStock?: number }> {
    try {
      const { userId, movement, type, quantity, allowNegativeStock } = params;
      let calculatedNewStock = movement.newStock;

      await runTransaction(db, async (transaction) => {
        const pRef = doc(db, 'users', userId, 'products', movement.productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) throw new Error('Produit introuvable dans la base de données');

        const currentStock = Number(pSnap.data().stockQuantity) || 0;
        let targetStock = currentStock;

        if (type === 'in') {
          targetStock = currentStock + Math.max(0, quantity);
        } else if (type === 'out') {
          const moveQty = Math.max(0, quantity);
          if (!allowNegativeStock && currentStock < moveQty) throw new Error(`Stock insuffisant (${currentStock} disponible). Le stock négatif est désactivé.`);
          targetStock = currentStock - moveQty;
        } else if (type === 'adjustment') {
          targetStock = quantity;
        }

        calculatedNewStock = targetStock;
        const nowIso = new Date().toISOString();

        if (type === 'adjustment') {
          transaction.update(pRef, { stockQuantity: targetStock, updatedAt: nowIso });
        } else {
          const delta = type === 'in' ? Math.max(0, quantity) : -Math.max(0, quantity);
          transaction.update(pRef, { stockQuantity: increment(delta), updatedAt: nowIso });
        }

        const movRef = doc(db, 'users', userId, 'movements', movement.id);
        transaction.set(movRef, sanitizeForFirestore({ ...movement, previousStock: currentStock, newStock: targetStock }));
      });

      this.markCollectionHealthy('products');
      this.markCollectionHealthy('movements');

      return { success: true, newStock: calculatedNewStock };
    } catch (err: any) {
      console.warn('[FirestoreSync] commitStockMovementTransaction error:', err);
      return { success: false, error: err?.message || 'Erreur lors de l’ajustement de stock' };
    }
  }

  public async commitCancelInvoiceTransaction(params: {
    userId: string;
    invoiceId: string;
    itemsToRestore: Array<{ productId: string; quantity: number }>;
    movements: StockMovement[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { userId, invoiceId, itemsToRestore, movements } = params;
      const nowIso = new Date().toISOString();

      await runTransaction(db, async (transaction) => {
        const pReads: Array<{ ref: any; currentStock: number; qty: number }> = [];
        for (const item of itemsToRestore) {
          const pRef = doc(db, 'users', userId, 'products', item.productId);
          const pSnap = await transaction.get(pRef);
          if (pSnap.exists()) {
            pReads.push({ ref: pRef, currentStock: Number(pSnap.data().stockQuantity) || 0, qty: item.quantity });
          }
        }

        for (const pr of pReads) {
          transaction.update(pr.ref, { stockQuantity: pr.currentStock + pr.qty, updatedAt: nowIso });
        }

        const invRef = doc(db, 'users', userId, 'invoices', invoiceId);
        transaction.update(invRef, { status: 'cancelled', updatedAt: nowIso });

        for (const m of movements) {
          const mRef = doc(db, 'users', userId, 'movements', m.id);
          transaction.set(mRef, sanitizeForFirestore(m));
        }
      });

      this.markCollectionHealthy('products');
      this.markCollectionHealthy('invoices');
      this.markCollectionHealthy('movements');

      return { success: true };
    } catch (err: any) {
      console.warn('[FirestoreSync] commitCancelInvoiceTransaction error:', err);
      return { success: false, error: err?.message || 'Erreur lors de l’annulation de la facture' };
    }
  }
}

export const firestoreSyncService = new FirestoreSyncService();