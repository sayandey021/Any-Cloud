export type TransferType = 'Copy' | 'Move' | 'Download' | 'Upload';

export type ConflictStrategy = 'Replace' | 'Skip' | 'KeepBoth' | 'Ask';

export type TransferState =
  | 'Queued'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | { Failed: string }
  | 'Cancelled';

export interface TransferTask {
  id: string;
  name: string;
  transfer_type: TransferType;
  source_remote: string;
  source_path: string;
  dest_remote: string;
  dest_path: string;
  conflict_strategy: ConflictStrategy;
  state: TransferState;
  total_bytes: number;
  bytes_transferred: number;
  speed_bytes_per_sec: number;
  eta_seconds: number | null;
  percentage: number;
  created_at: string;
}

export interface ProgressUpdate {
  transfer_id: string;
  bytes_transferred: number;
  total_bytes: number;
  speed_bytes_per_sec: number;
  percentage: number;
  eta_seconds: number | null;
  current_file?: string;
  error_count: number;
}
