import React from 'react';
import {
  Calendar,
  Cloud,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { ProviderIcon } from '../ui/Icons';

export const CloudAccountsPage: React.FC = () => {
  const { accounts, removeAccount, syncAccount, setActiveAccount } = useAccountStore();
  const { openModal, setActivePage, addToast, showConfirmDialog } = useUiStore();
  const { loadFiles } = useFileStore();

  const handleOpenAccount = async (accId: string) => {
    setActiveAccount(accId);
    setActivePage('files');
    await loadFiles(accId, '');
  };

  const handleRemove = (accId: string, name: string, provider?: string) => {
    const { confirmBeforeDisconnect } = useSettingsStore.getState().settings;

    const executeDisconnect = async () => {
      await removeAccount(accId);
      addToast({
        type: 'info',
        title: 'Account Disconnected',
        message: `Successfully disconnected ${name}`,
      });
    };

    if (confirmBeforeDisconnect) {
      showConfirmDialog({
        title: 'Disconnect Storage Account',
        description: `Are you sure you want to disconnect this storage account?`,
        itemName: name,
        itemType: provider ? `${provider} Account` : undefined,
        confirmText: 'Disconnect Account',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'disconnect',
        hint: 'Your remote files remain 100% safe and intact. Disconnecting only removes saved credentials and local cache from this app.',
        onConfirm: executeDisconnect,
      });
    } else {
      executeDisconnect();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cloud size={22} className="text-primary" />
            <span>Connected Cloud Accounts</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your connected storage providers, view quotas, and initiate background sync.
          </p>
        </div>

        <button
          onClick={() => openModal('add-cloud')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Connect New Cloud</span>
        </button>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border/80 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Cloud size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No Cloud Accounts Connected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Connect your Google Drive, OneDrive, Amazon S3, Dropbox, or Box account to browse and transfer files in one place.
            </p>
          </div>
          <button
            onClick={() => openModal('add-cloud')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus size={16} />
            <span>Connect Your First Cloud</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => {
            const usedPct =
              acc.quota_total && acc.quota_used
                ? (acc.quota_used / acc.quota_total) * 100
                : 0;

            return (
              <div
                key={acc.id}
                className="rounded-2xl bg-card border border-border/80 p-5 shadow-xs grid grid-cols-1 md:grid-cols-12 items-center gap-4 lg:gap-6 hover:border-border transition-colors"
              >
                {/* Account Details & Identifiers */}
                <div className="md:col-span-5 flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center p-2.5 border border-border shrink-0">
                    <ProviderIcon provider={acc.provider} size={28} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {acc.label || acc.name}
                      </h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Identifier: <span className="font-mono text-[11px] text-foreground/80">{acc.name}</span> · Provider:{' '}
                      <span className="capitalize">{acc.provider}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} className="shrink-0" />
                      <span>Last synced: {acc.last_synced_at ? formatDate(acc.last_synced_at) : 'Never'}</span>
                    </p>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="md:col-span-4 space-y-1.5 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Storage Quota</span>
                    <span className="font-semibold text-foreground text-[11px]">
                      {acc.quota_total
                        ? `${formatBytes(acc.quota_used || 0)} / ${formatBytes(acc.quota_total)}`
                        : `${formatBytes(acc.quota_used || 0)} cached`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenAccount(acc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <FolderOpen size={14} />
                    <span>Browse</span>
                  </button>

                  <button
                    onClick={() => syncAccount(acc.id)}
                    title="Sync metadata now"
                    className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-border"
                  >
                    <RefreshCw
                      size={14}
                      className={acc.status === 'syncing' ? 'animate-spin text-primary' : ''}
                    />
                  </button>

                  <button
                    onClick={() => handleRemove(acc.id, acc.label || acc.name, acc.provider)}
                    title="Disconnect account"
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors border border-border"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
