export function isNativeTrashSupported(provider?: string): boolean {
  if (!provider) return false;
  const p = provider.toLowerCase();
  return p === 'drive' || p === 'gdrive' || p.includes('google') || p === 'jottacloud';
}

export type CloudProviderId =
  | 'local'
  | 'gdrive'
  | 'onedrive'
  | 's3'
  | 'dropbox'
  | 'box'
  | 'webdav'
  | 'alibabacloud'
  | 'cloudinary'
  | 'googlephotos'
  | 'huaweidrive'
  | 'iclouddrive'
  | 'kdrive'
  | 'koofr'
  | 'linkbox'
  | 'mailru'
  | 'pcloud'
  | 'pikpak'
  | 'protondrive'
  | 'qingstor'
  | 'zohoworkdrive'
  | 'mega'
  | 'b2'
  | 'r2'
  | 'googlecloudstorage'
  | 'azureblob'
  | 'azurefiles'
  | 'digitaloceanspaces'
  | 'wasabi'
  | 'minio'
  | 'oracleobjectstorage'
  | 'swift'
  | 'netstorage'
  | 'storj'
  | 'sia'
  | 'filebase'
  | 'filelu'
  | 'imagekit'
  | 'yandex'
  | 'jottacloud'
  | 'opendrive'
  | 'hidrive'
  | 'filen'
  | 'internxt'
  | 'seafile'
  | 'sharefile'
  | 'sugarsync'
  | 'filescom'
  | 'drime'
  | 'sftp'
  | 'ftp'
  | 'smb'
  | 'http'
  | 'hdfs'
  | 'fichier'
  | 'pixeldrain'
  | 'putio'
  | 'premiumizeme'
  | 'gofile'
  | 'internetarchive'
  | (string & {});

export interface ProviderCapabilities {
  supports_oauth: boolean;
  supports_quota: boolean;
  supports_trash: boolean;
  supports_versions: boolean;
  supports_public_links: boolean;
}

export interface ProviderMetadata {
  id: CloudProviderId;
  name: string;
  rclone_type: string;
  description: string;
  icon_name: string;
  capabilities: ProviderCapabilities;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export interface CloudAccount {
  id: string;
  provider: CloudProviderId;
  name: string;
  label: string | null;
  status: ConnectionStatus;
  quota_total: number | null;
  quota_used: number | null;
  quota_free: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudStorageItem {
  account_id: string;
  account_name: string;
  provider: string;
  quota_total: number;
  quota_used: number;
  quota_free: number;
  used_percentage: number;
}

export interface StorageSummary {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  overall_percentage: number;
  total_accounts: number;
  clouds: CloudStorageItem[];
}

export interface RcloneStatus {
  is_installed: boolean;
  binary_path: string;
  version?: {
    version: string;
    is_git: boolean;
    os: string;
    arch: string;
    go_version: string;
  };
  error?: string;
}
