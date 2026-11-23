import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  FolderOpen,
  HardDrive,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Share2,
  Star,
  Trash2,
  Settings,
} from 'lucide-react';
import { cn, formatBytes } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransferStore } from '../../stores/transferStore';
import { NavigationPage, useUiStore } from '../../stores/uiStore';
import { AppIcon, ProviderIcon } from '../ui/Icons';

export const Sidebar: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccount, storageSummary, syncAccount, removeAccount } =
    useAccountStore();
  const {
    activePage,
    setActivePage,
    openModal,
    showConfirmDialog,
    addToast,
    sidebarCollapsed,
    toggleSidebar,
  } = useUiStore();
  const { loadFiles } = useFileStore();
  const { getActiveCount } = useTransferStore();
  const [cloudsExpanded, setCloudsExpanded] = useState(true);

  // Global Ctrl+B shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const activeTransfersCount = getActiveCount();

  const handleSelectAccount = async (accountId: string) => {
    setActiveAccount(accountId);
    setActivePage('files');
    await loadFiles(accountId, '');
  };

  const navItems: { page: NavigationPage; label: string; icon: React.ReactNode; badge?: number }[] = [
    { page: 'home', label: 'Home', icon: <Home size={17} /> },
    { page: 'clouds', label: 'My Clouds', icon: <Cloud size={17} /> },
    { page: 'files', label: 'All Files', icon: <FolderOpen size={17} /> },
    { page: 'recent', label: 'Recent', icon: <Clock size={17} /> },
    { page: 'favorites', label: 'Favorites', icon: <Star size={17} /> },
    { page: 'shared', label: 'Shared', icon: <Share2 size={17} /> },
    {
      page: 'transfers',
      label: 'Transfers',
      icon: <ArrowLeftRight size={17} />,
      badge: activeTransfersCount > 0 ? activeTransfersCount : undefined,
    },
    { page: 'trash', label: 'Trash', icon: <Trash2 size={17} /> },
    { page: 'settings', label: 'Settings', icon: <Settings size={17} /> },
  ];

  return (
    <aside
      className={cn(
        'border-r border-border/70 bg-card/70 acrylic-sidebar flex flex-col h-full select-none shrink-0 transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header & Hover-to-Toggle Logo Button */}
      {sidebarCollapsed ? (
        <div className="h-14 border-b border-border/70 px-2 flex items-center justify-center shrink-0">
          <button
            onClick={toggleSidebar}
            title="Expand Sidebar (Ctrl+B)"
            className="w-10 h-10 rounded-xl flex items-center justify-center relative group cursor-pointer hover:bg-accent/80 transition-all duration-200"
          >
            {/* Normal: AppIcon */}
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs flex items-center justify-center transition-all duration-200 group-hover:opacity-0 group-hover:scale-75">
              <AppIcon size={32} className="w-8 h-8" />
            </div>
            {/* Hover: PanelLeftOpen */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 text-primary group-hover:scale-100 bg-primary/10">
              <PanelLeftOpen size={18} />
            </div>
          </button>
        </div>
      ) : (
        <div className="h-14 border-b border-border/70 px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              <AppIcon size={32} className="w-8 h-8" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
                Any Cloud
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">Unified Storage Manager</p>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            title="Collapse Sidebar (Ctrl+B)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className={cn('flex-1 overflow-y-auto no-scrollbar', sidebarCollapsed ? 'px-2 py-3 space-y-4' : 'px-3 py-3.5 space-y-5')}>
        {/* Workspace Menu */}
        <div>
          {!sidebarCollapsed && (
            <p className="px-2.5 mb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Workspace
            </p>
          )}
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => setActivePage(item.page)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-xl text-xs font-medium transition-all duration-150 relative',
                    sidebarCollapsed
                      ? 'w-10 h-10 mx-auto justify-center'
                      : 'w-full justify-between px-2.5 py-2',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2.5')}>
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] font-bold rounded-full flex items-center justify-center',
                        sidebarCollapsed
                          ? 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground shadow-xs text-[9px]'
                          : 'px-1.5 py-0.5',
                        !sidebarCollapsed && (
                          isActive
                            ? 'bg-primary-foreground text-primary'
                            : 'bg-primary text-primary-foreground animate-pulse'
                        )
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected Clouds */}
        <div>
          {sidebarCollapsed ? (
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              {accounts.map((acc) => {
                const isSelected = activePage === 'files' && activeAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc.id)}
                    title={`${acc.label || acc.name} (${acc.provider})`}
                    className={cn(
                      'w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all relative group',
                      isSelected
                        ? 'bg-accent border border-border/80 shadow-xs'
                        : 'hover:bg-accent/60 text-muted-foreground'
                    )}
                  >
                    <ProviderIcon provider={acc.provider} size={18} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute bottom-1 right-1 ring-1 ring-background" />
                  </button>
                );
              })}
              <button
                onClick={() => openModal('add-cloud')}
                title="Connect Another Cloud"
                className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30 mt-1"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <button
                  onClick={() => setCloudsExpanded(!cloudsExpanded)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {cloudsExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Connected Clouds</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({accounts.length})
                  </span>
                </button>
                <button
                  onClick={() => openModal('add-cloud')}
                  title="Add Cloud Account"
                  className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              {cloudsExpanded && (
                <div className="space-y-1">
                  {accounts.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-border/80 bg-accent/20 text-center space-y-2">
                      <p className="text-[11px] text-muted-foreground">No clouds connected yet.</p>
                      <button
                        onClick={() => openModal('add-cloud')}
                        className="w-full py-1.5 px-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                      >
                        + Connect Cloud
                      </button>
                    </div>
                  ) : (
                    <>
                      {accounts.map((acc) => {
                        const isSelected = activePage === 'files' && activeAccountId === acc.id;
                        const isSyncing = acc.status === 'syncing';

                        return (
                          <div
                            key={acc.id}
                            onClick={() => handleSelectAccount(acc.id)}
                            className={cn(
                              'group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer',
                              isSelected
                                ? 'bg-accent text-accent-foreground font-semibold border border-border/80 shadow-xs'
                                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="shrink-0">
                                <ProviderIcon provider={acc.provider} size={16} />
                              </div>
                              <span className="truncate">{acc.label || acc.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isSyncing ? (
                                <RefreshCw size={12} className="text-primary animate-spin" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Connected" />
                              )}
                              {acc.provider !== 'local' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncAccount(acc.id);
                                  }}
                                  title="Sync cloud metadata now"
                                  className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const { confirmBeforeDisconnect } = useSettingsStore.getState().settings;

                                  const executeDisconnect = async () => {
                                    await removeAccount(acc.id);
                                    addToast({
                                      type: 'info',
                                      title: 'Account Disconnected',
                                      message: `Disconnected ${acc.label || acc.name}`,
                                    });
                                  };

                                  if (confirmBeforeDisconnect) {
                                    showConfirmDialog({
                                      title: 'Disconnect Storage Account',
                                      description: `Are you sure you want to disconnect this storage account?`,
                                      itemName: acc.label || acc.name,
                                      itemType: `${acc.provider} Storage`,
                                      confirmText: 'Disconnect Account',
                                      cancelText: 'Cancel',
                                      variant: 'danger',
                                      icon: 'disconnect',
                                      hint: 'Your remote files remain 100% safe. Disconnecting only removes saved credentials and local cache from this app.',
                                      onConfirm: executeDisconnect,
                                    });
                                  } else {
                                    executeDisconnect();
                                  }
                                }}
                                title="Disconnect account"
                                className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Cloud Button */}
                      <button
                        onClick={() => openModal('add-cloud')}
                        className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30 mt-2 font-medium"
                      >
                        <Plus size={14} />
                        <span>Connect Another Cloud</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Storage Gauge Widget */}
      {sidebarCollapsed ? (
        <div
          className="p-2 border-t border-border/70 bg-card/40 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors shrink-0"
          onClick={() => setActivePage('clouds')}
          title={`Total Cloud Storage: ${storageSummary ? `${storageSummary.overall_percentage.toFixed(0)}%` : '0%'} (${formatBytes(storageSummary?.used_bytes || 0)} / ${formatBytes(storageSummary?.total_bytes || 0)})`}
        >
          <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-muted-foreground relative">
            <HardDrive size={16} className="text-primary" />
            <span className="text-[9px] font-bold text-foreground mt-0.5">
              {storageSummary ? `${storageSummary.overall_percentage.toFixed(0)}%` : '0%'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 border-t border-border/70 bg-card/40 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-[11px]">
              <HardDrive size={13} className="text-primary" /> Total Cloud Storage
            </span>
            <span className="font-bold text-foreground text-[11px]">
              {storageSummary ? `${storageSummary.overall_percentage.toFixed(0)}%` : '0%'}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(storageSummary?.overall_percentage || 0, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
            <span>{formatBytes(storageSummary?.used_bytes || 0)} used</span>
            <span>{formatBytes(storageSummary?.total_bytes || 0)}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
