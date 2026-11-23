import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Cloud,
  FileText,
  FolderOpen,
  HardDrive,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/utils';
import { tauriApi } from '../../services/tauriClient';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useTransferStore } from '../../stores/transferStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { FileIcon, ProviderIcon } from '../ui/Icons';
import { StorageBar } from './StorageBar';

export const HomeDashboard: React.FC = () => {
  const { accounts, storageSummary, setActiveAccount, rcloneStatus } = useAccountStore();
  const { setActivePage, openModal, openProperties } = useUiStore();
  const { loadFiles, toggleFavorite } = useFileStore();
  const { transfers, getActiveCount } = useTransferStore();
  const [recentFiles, setRecentFiles] = useState<CloudFile[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(false);

  useEffect(() => {
    const fetchRecents = async () => {
      setIsLoadingRecents(true);
      try {
        const list = await tauriApi.getRecentFiles(6);
        setRecentFiles(list);
      } catch {
        // Fallback
      } finally {
        setIsLoadingRecents(false);
      }
    };
    fetchRecents();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeTransfersCount = getActiveCount();

  const handleOpenAccount = async (accId: string) => {
    setActiveAccount(accId);
    setActivePage('files');
    await loadFiles(accId, '');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-7 select-none">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {getGreeting()}
            <span className="text-muted-foreground font-normal text-base md:text-lg">· Welcome to Any Cloud</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Browse, transfer, and manage all your cloud accounts from one unified desktop interface.
          </p>
        </div>

        {/* Quick Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('add-cloud')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all duration-150 shadow-xs"
          >
            <Plus size={15} />
            <span>Connect Cloud</span>
          </button>
          <button
            onClick={() => setActivePage('transfers')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold hover:bg-accent transition-all duration-150 shadow-xs"
          >
            <ArrowLeftRight size={15} />
            <span>Transfers</span>
            {activeTransfersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                {activeTransfersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => openModal('add-cloud')}
          className="group p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Plus size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Add Cloud Account
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Google, OneDrive, S3 & more</p>
          </div>
        </div>

        <div
          onClick={() => {
            if (accounts.length > 0) {
              handleOpenAccount(accounts[0].id);
            } else {
              openModal('add-cloud');
            }
          }}
          className="group p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FolderOpen size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Browse Files
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Explore unified folders</p>
          </div>
        </div>

        <div
          onClick={() => setActivePage('transfers')}
          className="group p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Cross-Cloud Transfer
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fast copy & move between clouds</p>
          </div>
        </div>

        <div
          onClick={() => setActivePage('favorites')}
          className="group p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Star size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Starred Items
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Quick access to marked files</p>
          </div>
        </div>
      </div>

      {/* Onboarding Banner if 0 accounts connected */}
      {accounts.length === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 shadow-xs space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
              <Cloud size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Welcome to Any Cloud!</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Get started in under 30 seconds. Connect your favorite cloud storage providers to organize, search, and transfer files seamlessly across accounts from one unified dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => openModal('add-cloud')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2"
            >
              <Plus size={15} />
              <span>Connect First Cloud</span>
            </button>
            <span className="text-xs text-muted-foreground">Supports Google Drive, OneDrive, Amazon S3, Dropbox, Box, Nextcloud</span>
          </div>
        </div>
      )}

      {/* Storage & System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Multi-Cloud Storage Card */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <HardDrive size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Combined Storage Overview
                </h3>
                <p className="text-[11px] text-muted-foreground">Aggregated across all connected providers</p>
              </div>
            </div>
            {storageSummary && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                {storageSummary.overall_percentage.toFixed(0)}% Used
              </span>
            )}
          </div>

          {storageSummary && storageSummary.clouds.length > 0 ? (
            <StorageBar summary={storageSummary} />
          ) : (
            <div className="py-5 text-center text-xs text-muted-foreground space-y-1">
              <p>No storage accounts connected yet.</p>
              <button
                onClick={() => openModal('add-cloud')}
                className="text-primary font-semibold hover:underline"
              >
                + Connect a cloud to view storage quotas
              </button>
            </div>
          )}
        </div>

        {/* Health & Status Card */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  System & Sync Engine
                </h3>
                <p className="text-[11px] text-muted-foreground">Multi-cloud sync status</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Sync Engine</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {rcloneStatus?.version?.version ? `v${rcloneStatus.version.version}` : 'Active (Direct)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Local Cache</span>
                <span className="font-semibold text-foreground">SQLite Indexed</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Active Transfers</span>
                <span className="font-semibold text-primary">{activeTransfersCount} running</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Clouds Connected</span>
                <span className="font-semibold text-foreground">{accounts.length} Accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Clouds Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Connected Clouds</h3>
            <span className="text-xs text-muted-foreground font-normal">
              ({accounts.length} providers active)
            </span>
          </div>
          <button
            onClick={() => setActivePage('clouds')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Manage Accounts</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const usedPct =
              acc.quota_total && acc.quota_used
                ? (acc.quota_used / acc.quota_total) * 100
                : 0;

            return (
              <div
                key={acc.id}
                onClick={() => handleOpenAccount(acc.id)}
                className="group rounded-2xl bg-card border border-border/80 hover:border-primary/50 p-5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/60 flex items-center justify-center p-2 border border-border">
                      <ProviderIcon provider={acc.provider} size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]">
                        {acc.label || acc.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground capitalize">{acc.provider}</p>
                    </div>
                  </div>

                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Connected" />
                </div>

                {/* Quota usage */}
                {acc.quota_total ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-semibold text-foreground">
                        {formatBytes(acc.quota_used || 0)} / {formatBytes(acc.quota_total)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(usedPct, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground py-1">
                    Storage: {formatBytes(acc.quota_used || 0)} cached
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Synced {acc.last_synced_at ? formatDate(acc.last_synced_at) : 'recently'}</span>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Browse</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Quick Add Cloud Tile */}
          <div
            onClick={() => openModal('add-cloud')}
            className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/50 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-accent/20 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Plus size={20} />
            </div>
            <p className="text-xs font-bold text-foreground">Connect Another Cloud</p>
            <p className="text-[11px] text-muted-foreground text-center">
              Google Drive, OneDrive, S3, Dropbox, Box, or WebDAV
            </p>
          </div>
        </div>
      </div>

      {/* Recently Accessed Files Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Recent Files</h3>
          </div>
          <button
            onClick={() => setActivePage('recent')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => openProperties(file)}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 hover:border-border hover:bg-accent/30 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 truncate">
                  <FileIcon isDir={file.is_dir} name={file.name} mimeType={file.mime_type} size={20} />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.is_dir ? 'Folder' : formatBytes(file.size)} · {formatDate(file.last_accessed_at)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(file.id);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  <Star
                    size={14}
                    className={file.is_favorite ? 'text-amber-500 fill-amber-500' : ''}
                  />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border/80 text-center text-xs text-muted-foreground">
            No recently opened files yet. Files you access will show up here.
          </div>
        )}
      </div>
    </div>
  );
};
