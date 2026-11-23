import { create } from 'zustand';
import { tauriApi } from '../services/tauriClient';
import { useSettingsStore } from './settingsStore';
import { ProgressUpdate, TransferTask } from '../types/transfer';

interface TransferState {
  transfers: TransferTask[];
  isLoading: boolean;

  loadTransfers: () => Promise<void>;
  startTransfer: (req: {
    name: string;
    transfer_type: string;
    source_remote: string;
    source_path: string;
    dest_remote: string;
    dest_path: string;
    conflict_strategy?: string;
    total_bytes?: number;
  }) => Promise<TransferTask>;
  cancelTransfer: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateProgress: (progress: ProgressUpdate) => void;
  markCompleted: (transferId: string, success: boolean, error?: string) => void;
  getActiveCount: () => number;
}

export const useTransferStore = create<TransferState>((set, get) => ({
  transfers: [],
  isLoading: false,

  loadTransfers: async () => {
    set({ isLoading: true });
    try {
      const list = await tauriApi.getTransfers();
      set({ transfers: list, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  startTransfer: async (req) => {
    const settings = useSettingsStore.getState().settings;
    const isDownload = req.transfer_type.toLowerCase() === 'download';
    const bwlimit = isDownload ? settings.downloadBandwidthLimit : settings.uploadBandwidthLimit;

    const task = await tauriApi.startTransfer({
      ...req,
      concurrent_transfers: settings.concurrentTransfers,
      chunk_size_mb: settings.chunkSizeMB,
      bandwidth_limit: bwlimit !== '0' ? bwlimit : undefined,
      verify_checksum: settings.verifyChecksums,
      max_retries: settings.maxRetries,
    });
    set((state) => ({
      transfers: [task, ...state.transfers.filter((t) => t.id !== task.id)],
    }));
    return task;
  },

  cancelTransfer: async (id) => {
    await tauriApi.cancelTransfer(id);
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, state: 'Cancelled' as const } : t
      ),
    }));
  },

  clearHistory: async () => {
    try {
      await tauriApi.clearTransferHistory();
    } catch (e) {
      console.error('Failed to clear transfer history', e);
    }
    set((state) => ({
      transfers: state.transfers.filter(
        (t) => t.state === 'Running' || t.state === 'Queued' || t.state === 'Paused'
      ),
    }));
  },

  updateProgress: (progress) => {
    set((state) => ({
      transfers: state.transfers.map((t) => {
        if (t.id === progress.transfer_id) {
          return {
            ...t,
            bytes_transferred: progress.bytes_transferred,
            total_bytes: progress.total_bytes,
            speed_bytes_per_sec: progress.speed_bytes_per_sec,
            percentage: progress.percentage,
            eta_seconds: progress.eta_seconds,
            state: 'Running' as const,
          };
        }
        return t;
      }),
    }));
  },

  markCompleted: (transferId, success, error) => {
    set((state) => ({
      transfers: state.transfers.map((t) => {
        if (t.id === transferId) {
          return {
            ...t,
            state: success ? ('Completed' as const) : ({ Failed: error || 'Transfer failed' } as const),
            percentage: success ? 100.0 : t.percentage,
          };
        }
        return t;
      }),
    }));
  },

  getActiveCount: () => {
    return get().transfers.filter((t) => t.state === 'Running' || t.state === 'Queued').length;
  },
}));
