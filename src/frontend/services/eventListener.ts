import { AccountSyncedPayload, TransferFinishedPayload } from '../types/events';
import { ProgressUpdate } from '../types/transfer';

type UnlistenFn = () => void;

export async function setupEventListeners(callbacks: {
  onProgress?: (progress: ProgressUpdate) => void;
  onTransferComplete?: (payload: TransferFinishedPayload) => void;
  onAccountSynced?: (payload: AccountSyncedPayload) => void;
}): Promise<UnlistenFn> {
  const unlisteners: UnlistenFn[] = [];

  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { listen } = await import('@tauri-apps/api/event');

      if (callbacks.onProgress) {
        const u1 = await listen<ProgressUpdate>('transfer:progress', (event) => {
          callbacks.onProgress?.(event.payload);
        });
        unlisteners.push(u1);
      }

      if (callbacks.onTransferComplete) {
        const u2 = await listen<TransferFinishedPayload>('transfer:completed', (event) => {
          callbacks.onTransferComplete?.(event.payload);
        });
        const u3 = await listen<TransferFinishedPayload>('transfer:failed', (event) => {
          callbacks.onTransferComplete?.(event.payload);
        });
        unlisteners.push(u2, u3);
      }

      if (callbacks.onAccountSynced) {
        const u4 = await listen<AccountSyncedPayload>('account:synced', (event) => {
          callbacks.onAccountSynced?.(event.payload);
        });
        unlisteners.push(u4);
      }
    } catch (e) {
      console.warn('Failed to register Tauri event listeners:', e);
    }
  }

  return () => {
    unlisteners.forEach((u) => u());
  };
}
