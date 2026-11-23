import { create } from 'zustand';
import { tauriApi } from '../services/tauriClient';
import { CloudAccount, ProviderMetadata, RcloneStatus, StorageSummary } from '../types/cloud';
import { useUiStore } from './uiStore';

interface AccountState {
  accounts: CloudAccount[];
  activeAccountId: string | null;
  storageSummary: StorageSummary | null;
  rcloneStatus: RcloneStatus | null;
  providers: ProviderMetadata[];
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  setActiveAccount: (id: string | null) => void;
  loadStorageSummary: () => Promise<void>;
  checkRclone: () => Promise<void>;
  loadProviders: () => Promise<void>;
  addAccount: (req: {
    provider: string;
    name: string;
    label?: string;
    parameters?: [string, string][];
  }) => Promise<CloudAccount>;
  removeAccount: (accountId: string) => Promise<void>;
  syncAccount: (accountId: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  storageSummary: null,
  rcloneStatus: null,
  providers: [],
  isLoading: false,
  error: null,

  loadAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await tauriApi.getAccounts();
      const currentActive = get().activeAccountId;
      const validActive = accounts.some((a) => a.id === currentActive)
        ? currentActive
        : accounts.length > 0
        ? accounts[0].id
        : null;

      set({
        accounts,
        activeAccountId: validActive,
        isLoading: false,
      });
      get().loadStorageSummary();
    } catch (err: any) {
      set({ error: err.message || 'Failed to load accounts', isLoading: false });
    }
  },

  setActiveAccount: (id) => {
    set({ activeAccountId: id });
  },

  loadStorageSummary: async () => {
    try {
      const summary = await tauriApi.getStorageSummary();
      set({ storageSummary: summary });
    } catch (err) {
      console.warn('Failed to load storage summary:', err);
    }
  },

  checkRclone: async () => {
    try {
      const status = await tauriApi.checkRcloneStatus();
      set({ rcloneStatus: status });
    } catch (err) {
      console.warn('Failed to check rclone status:', err);
    }
  },

  loadProviders: async () => {
    try {
      const providers = await tauriApi.getSupportedProviders();
      set({ providers });
    } catch (err) {
      console.warn('Failed to load providers:', err);
    }
  },

  addAccount: async (req) => {
    const acc = await tauriApi.addAccount(req);
    await get().loadAccounts();
    return acc;
  },

  removeAccount: async (accountId) => {
    await tauriApi.removeAccount(accountId);
    if (get().activeAccountId === accountId) {
      set({ activeAccountId: null });
    }
    await get().loadAccounts();
  },

  syncAccount: async (accountId) => {
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === accountId ? { ...a, status: 'syncing' } : a
      ),
    }));
    try {
      await tauriApi.syncAccount(accountId);
      await get().loadAccounts();
    } catch (err: any) {
      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === accountId ? { ...a, status: 'error' } : a
        ),
      }));
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Sync Failed',
        message: err.message || err || 'Failed to sync storage account.',
      });
    }
  },
}));
