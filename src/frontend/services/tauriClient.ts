import { invoke } from '@tauri-apps/api/core';
import { CloudAccount, ProviderMetadata, RcloneStatus, StorageSummary } from '../types/cloud';
import { CloudFile } from '../types/file';
import { TransferTask } from '../types/transfer';

export const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export const tauriApi = {
  async checkRcloneStatus(): Promise<RcloneStatus> {
    try {
      return await invoke<RcloneStatus>('check_rclone_status');
    } catch (err: any) {
      return {
        is_installed: false,
        binary_path: 'rclone.exe',
        version: undefined,
        error: typeof err === 'string' ? err : err?.message || 'Rclone check failed',
      };
    }
  },

  async getAccounts(): Promise<CloudAccount[]> {
    return await invoke<CloudAccount[]>('get_accounts');
  },

  async addAccount(req: {
    provider: string;
    name: string;
    label?: string;
    parameters?: [string, string][];
  }): Promise<CloudAccount> {
    return await invoke<CloudAccount>('add_account', { req });
  },

  async authorizeOAuthCloud(provider: string, extraArgs?: string[]): Promise<string> {
    return await invoke<string>('authorize_oauth_cloud', { provider, extraArgs: extraArgs || null });
  },

  async cancelOAuth(): Promise<boolean> {
    try {
      return await invoke<boolean>('cancel_oauth');
    } catch {
      return false;
    }
  },

  async removeAccount(accountId: string): Promise<boolean> {
    return await invoke<boolean>('remove_account', { accountId });
  },

  async syncAccount(accountId: string): Promise<number> {
    return await invoke<number>('sync_account_metadata', { accountId });
  },

  async listFiles(
    accountId: string,
    path: string,
    refresh = false
  ): Promise<{ files: CloudFile[]; is_from_cache: boolean }> {
    return await invoke<{ files: CloudFile[]; is_from_cache: boolean }>('list_files', {
      accountId,
      path,
      refresh,
    });
  },

  async searchFiles(query: string, accountId?: string): Promise<CloudFile[]> {
    return await invoke<CloudFile[]>('search_files', { query, accountId });
  },

  async getRecentFiles(limit = 20): Promise<CloudFile[]> {
    return await invoke<CloudFile[]>('get_recent_files', { limit });
  },

  async getFavoriteFiles(): Promise<CloudFile[]> {
    return await invoke<CloudFile[]>('get_favorite_files');
  },

  async getTrashFiles(accountId?: string): Promise<CloudFile[]> {
    return await invoke<CloudFile[]>('get_trash_files', {
      accountId: accountId || null,
    });
  },

  async getSharedFiles(accountId?: string, path?: string): Promise<CloudFile[]> {
    return await invoke<CloudFile[]>('get_shared_files', {
      accountId: accountId || null,
      path: path || null,
    });
  },

  async restoreFile(accountId: string, remotePath: string): Promise<boolean> {
    return await invoke<boolean>('restore_file', { accountId, remotePath });
  },

  async emptyTrash(): Promise<boolean> {
    return await invoke<boolean>('empty_trash');
  },

  async toggleFavorite(fileId: string, isFavorite: boolean): Promise<boolean> {
    return await invoke<boolean>('toggle_favorite', { fileId, isFavorite });
  },

  async createFolder(accountId: string, parentPath: string, folderName: string): Promise<CloudFile> {
    return await invoke<CloudFile>('create_folder', { accountId, parentPath, folderName });
  },

  async deleteFile(accountId: string, remotePath: string, isDir: boolean, permanent?: boolean): Promise<boolean> {
    return await invoke<boolean>('delete_file', { accountId, remotePath, isDir, permanent });
  },

  async renameFile(accountId: string, oldPath: string, newPath: string): Promise<boolean> {
    return await invoke<boolean>('rename_file', { accountId, oldPath, newPath });
  },

  async openLocalFile(accountId: string, remotePath: string): Promise<boolean> {
    return await invoke<boolean>('open_local_file', { accountId, remotePath });
  },

  async startTransfer(req: {
    name: string;
    transfer_type: string;
    source_remote: string;
    source_path: string;
    dest_remote: string;
    dest_path: string;
    conflict_strategy?: string;
    total_bytes?: number;
    concurrent_transfers?: number;
    chunk_size_mb?: number;
    bandwidth_limit?: string;
    verify_checksum?: boolean;
    max_retries?: number;
  }): Promise<TransferTask> {
    return await invoke<TransferTask>('start_transfer', { req });
  },

  async cancelTransfer(transferId: string): Promise<boolean> {
    return await invoke<boolean>('cancel_transfer', { transferId });
  },

  async getTransfers(): Promise<TransferTask[]> {
    return await invoke<TransferTask[]>('get_transfers');
  },

  async clearTransferHistory(): Promise<boolean> {
    return await invoke<boolean>('clear_transfer_history');
  },

  async getStorageSummary(): Promise<StorageSummary> {
    return await invoke<StorageSummary>('get_storage_summary');
  },

  async getSupportedProviders(): Promise<ProviderMetadata[]> {
    return await invoke<ProviderMetadata[]>('get_supported_providers_list');
  },

  async getDefaultLocalPath(): Promise<string> {
    try {
      return await invoke<string>('get_default_local_path');
    } catch {
      return 'C:\\';
    }
  },

  async pickFolder(initialPath?: string): Promise<string | null> {
    try {
      return await invoke<string | null>('pick_folder', { initialPath });
    } catch (err) {
      console.error('Failed to pick folder:', err);
      return null;
    }
  },

  async pickFiles(multiple = true, initialPath?: string): Promise<string[]> {
    try {
      return await invoke<string[]>('pick_files', { multiple, initialPath });
    } catch (err) {
      console.error('Failed to pick files:', err);
      return [];
    }
  },
};
