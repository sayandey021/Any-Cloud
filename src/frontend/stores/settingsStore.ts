import { create } from 'zustand';

export interface AppSettings {
  // General & Workflow
  defaultStartupView: 'home' | 'clouds' | 'files' | 'transfers';
  defaultDownloadPath: string;
  confirmBeforeDelete: boolean;
  confirmBeforeDisconnect: boolean;
  notifyOnTransferComplete: boolean;
  launchOnStartup: boolean;
  closeToTray: boolean;

  // Transfer & Engine Tuning
  concurrentTransfers: number;
  chunkSizeMB: number;
  uploadBandwidthLimit: string;
  downloadBandwidthLimit: string;
  verifyChecksums: boolean;
  maxRetries: number;
  lowPpsMode: boolean;
  autoResumeTransfers: boolean;

  // Appearance & Display
  theme: 'light' | 'dark' | 'system';
  defaultFileView: 'grid' | 'list';
  showHiddenFiles: boolean;
  dateFormat: 'relative' | 'absolute';
  fileSizeUnit: 'binary' | 'decimal';
  compactDensity: boolean;

  // Local Cache
  offlineMetadataCaching: boolean;
  cacheExpiryHours: number;

  // Security & Privacy
  autoLockTimeout: number; // in minutes (0 = disabled)
  maskSensitiveKeys: boolean;
  telemetryEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  // General
  defaultStartupView: 'home',
  defaultDownloadPath: '',
  confirmBeforeDelete: true,
  confirmBeforeDisconnect: true,
  notifyOnTransferComplete: true,
  launchOnStartup: false,
  closeToTray: false,

  // Transfers
  concurrentTransfers: 4,
  chunkSizeMB: 16,
  uploadBandwidthLimit: '0',
  downloadBandwidthLimit: '0',
  verifyChecksums: true,
  maxRetries: 3,
  lowPpsMode: false,
  autoResumeTransfers: true,

  // Appearance
  theme: 'system',
  defaultFileView: 'grid',
  showHiddenFiles: false,
  dateFormat: 'relative',
  fileSizeUnit: 'binary',
  compactDensity: false,

  // Cache
  offlineMetadataCaching: true,
  cacheExpiryHours: 24,

  // Security
  autoLockTimeout: 0,
  maskSensitiveKeys: true,
  telemetryEnabled: false,
};

const STORAGE_KEY = 'anycloud-app-settings';

interface SettingsState {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
}

const loadSavedSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSavedSettings(),

  updateSetting: (key, value) => {
    const current = get().settings;
    const next = { ...current, [key]: value };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to persist settings to localStorage', err);
    }
    set({ settings: next });
  },

  updateSettings: (partial) => {
    const current = get().settings;
    const next = { ...current, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to persist settings to localStorage', err);
    }
    set({ settings: next });
  },

  resetToDefaults: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (err) {
      console.warn('Failed to reset settings in localStorage', err);
    }
    set({ settings: DEFAULT_SETTINGS });
  },
}));
