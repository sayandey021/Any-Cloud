import { ProgressUpdate } from './transfer';

export interface TransferFinishedPayload {
  transfer_id: string;
  success: boolean;
  error?: string;
}

export interface AccountSyncedPayload {
  account_id: string;
  total_files_synced: number;
  timestamp: string;
}
