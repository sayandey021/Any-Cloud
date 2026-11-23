import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../../version';
import {
  Sliders,
  ArrowLeftRight,
  Palette,
  Database,
  ShieldCheck,
  Info,
  Folder,
  RotateCcw,
  Trash2,
  FolderOpen,
  Sun,
  Moon,
  Laptop,
  Home,
  Cloud,
  Grid,
  List,
  Linkedin,
  Github,
  ExternalLink,
  Building2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn, formatBytes } from '../../lib/utils';
import { useSettingsStore } from '../../stores/settingsStore';
import { useThemeStore } from '../../stores/themeStore';
import { useAccountStore } from '../../stores/accountStore';
import { useUiStore } from '../../stores/uiStore';
import { DropdownSelect, DropdownOption } from '../ui/DropdownSelect';
import { AppIcon } from '../ui/Icons';
import { Checkbox } from '../ui/Checkbox';

type SettingsTab = 'general' | 'transfers' | 'appearance' | 'cache' | 'security' | 'about';

interface CacheStats {
  cached_files_count: number;
  cached_bytes: number;
}

export const SettingsPage: React.FC = () => {
  const { settings, updateSetting, resetToDefaults } = useSettingsStore();
  const { theme, setTheme } = useThemeStore();
  const { rcloneStatus, accounts } = useAccountStore();
  const { addToast } = useUiStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [cacheStats, setCacheStats] = useState<CacheStats>({ cached_files_count: 0, cached_bytes: 0 });
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const handleOpenUrl = async (url: string) => {
    try {
      await invoke('open_external_url', { url });
    } catch {
      window.open(url, '_blank');
    }
  };

  // Load cache stats on mount or tab change
  useEffect(() => {
    loadCacheStats();
  }, [activeTab]);

  const loadCacheStats = async () => {
    try {
      const stats = await invoke<CacheStats>('get_cache_stats');
      setCacheStats(stats);
    } catch {
      // Fallback
    }
  };

  const handlePickDownloadFolder = async () => {
    setIsPickingFolder(true);
    try {
      const picked = await invoke<string | null>('pick_folder', {
        initialPath: settings.defaultDownloadPath || null,
      });
      if (picked) {
        updateSetting('defaultDownloadPath', picked);
        addToast({
          type: 'success',
          title: 'Download Folder Updated',
          message: picked,
        });
      }
    } catch (err) {
      console.error('Failed to pick folder', err);
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const cleared = await invoke<number>('clear_cache');
      await loadCacheStats();
      addToast({
        type: 'success',
        title: 'Cache Cleared',
        message: `Removed ${cleared} cached file metadata items. Next navigation will refresh live from cloud accounts.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Clear Cache Failed',
        message: String(err),
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleResetSettings = () => {
    resetToDefaults();
    setTheme('system');
    addToast({
      type: 'info',
      title: 'Settings Reset',
      message: 'All settings have been restored to their factory defaults.',
    });
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'general', label: 'General', icon: <Sliders size={16} />, desc: 'Startup, directories, workflow' },
    { id: 'transfers', label: 'Transfers & Engine', icon: <ArrowLeftRight size={16} />, desc: 'Concurrency, speed, chunks' },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} />, desc: 'Themes, density, dates' },
    { id: 'cache', label: 'Cache & Storage', icon: <Database size={16} />, desc: 'Local index, TTL, cleanup' },
    { id: 'security', label: 'Security & Privacy', icon: <ShieldCheck size={16} />, desc: 'Auto-lock, masking, telemetry' },
    { id: 'about', label: 'About & Diagnostics', icon: <Info size={16} />, desc: 'App info, Rclone runtime' },
  ];

  // Options for Dropdowns
  const startupViewOptions: DropdownOption<string>[] = [
    { value: 'home', label: 'Home Dashboard', description: 'Overview, quick actions, storage gauge', icon: <Home size={14} /> },
    { value: 'clouds', label: 'My Clouds', description: 'Manage connected cloud accounts', icon: <Cloud size={14} /> },
    { value: 'files', label: 'All Files', description: 'Unified multi-cloud file explorer', icon: <FolderOpen size={14} /> },
    { value: 'transfers', label: 'Transfers Hub', description: 'Active and completed transfers', icon: <ArrowLeftRight size={14} /> },
  ];

  const chunkSizeOptions: DropdownOption<number>[] = [
    { value: 8, label: '8 MB', description: 'Low memory footprint' },
    { value: 16, label: '16 MB', description: 'Recommended default' },
    { value: 32, label: '32 MB', description: 'Fast broadband connections' },
    { value: 64, label: '64 MB', description: 'High-speed fiber connections' },
    { value: 128, label: '128 MB', description: 'Gigabit datacenter upload' },
  ];

  const uploadSpeedOptions: DropdownOption<string>[] = [
    { value: '0', label: 'Unlimited', description: 'Maximum available upload speed' },
    { value: '1M', label: '1 MB/s', description: 'Strict bandwidth throttle' },
    { value: '5M', label: '5 MB/s', description: 'Moderate background upload' },
    { value: '10M', label: '10 MB/s', description: 'Standard broadband limit' },
    { value: '25M', label: '25 MB/s', description: 'High-speed cap' },
    { value: '50M', label: '50 MB/s', description: 'Fast fiber cap' },
  ];

  const downloadSpeedOptions: DropdownOption<string>[] = [
    { value: '0', label: 'Unlimited', description: 'Maximum available download speed' },
    { value: '5M', label: '5 MB/s', description: 'Strict bandwidth throttle' },
    { value: '15M', label: '15 MB/s', description: 'Moderate download limit' },
    { value: '50M', label: '50 MB/s', description: 'Fast connection cap' },
    { value: '100M', label: '100 MB/s', description: 'Ultra high-speed cap' },
  ];

  const retriesOptions: DropdownOption<number>[] = [
    { value: 1, label: '1 Retry', description: 'Fast fail on dropped connections' },
    { value: 3, label: '3 Retries', description: 'Recommended resilience' },
    { value: 5, label: '5 Retries', description: 'Persistent re-attempts' },
    { value: 10, label: '10 Retries', description: 'Aggressive network auto-recovery' },
  ];

  const fileViewOptions: DropdownOption<string>[] = [
    { value: 'grid', label: 'Grid View', description: 'Visual tiles and thumbnails', icon: <Grid size={14} /> },
    { value: 'list', label: 'Detailed List', description: 'Columns with sizes and dates', icon: <List size={14} /> },
  ];

  const dateFormatOptions: DropdownOption<string>[] = [
    { value: 'relative', label: 'Relative ("2 hours ago")', description: 'Dynamic time elapsed since edit' },
    { value: 'absolute', label: 'Absolute ("Nov 21, 2026")', description: 'Exact calendar date and time' },
  ];

  const fileSizeUnitOptions: DropdownOption<string>[] = [
    { value: 'binary', label: 'Binary (KiB, MiB, GiB)', description: 'Base-2 (1024 B = 1 KiB)' },
    { value: 'decimal', label: 'Decimal (KB, MB, GB)', description: 'Base-10 (1000 B = 1 KB)' },
  ];

  const cacheExpiryOptions: DropdownOption<number>[] = [
    { value: 1, label: '1 Hour', description: 'Frequent cloud revalidation' },
    { value: 6, label: '6 Hours', description: 'Balanced refresh cycle' },
    { value: 12, label: '12 Hours', description: 'Half-day cache lifespan' },
    { value: 24, label: '24 Hours', description: 'Recommended daily invalidation' },
    { value: 72, label: '3 Days', description: 'Extended offline browsing' },
  ];

  const autoLockOptions: DropdownOption<number>[] = [
    { value: 0, label: 'Disabled', description: 'Never auto-lock session' },
    { value: 5, label: 'After 5 Minutes', description: 'Prompt after 5m of inactivity' },
    { value: 15, label: 'After 15 Minutes', description: 'Prompt after 15m of inactivity' },
    { value: 30, label: 'After 30 Minutes', description: 'Prompt after 30m of inactivity' },
    { value: 60, label: 'After 1 Hour', description: 'Prompt after 1h of inactivity' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Settings Top Header */}
      <div className="px-8 py-5 border-b border-border/70 bg-card/40 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-primary" />
            <span>Preferences & Settings</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize cloud synchronization, network limits, appearance, and local storage
          </p>
        </div>

        <button
          onClick={handleResetSettings}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/60 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium shadow-xs cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Main Settings Split View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <div className="w-64 border-r border-border/70 p-4 space-y-1 overflow-y-auto bg-card/20 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <div className={cn('p-1 rounded-lg', isActive ? 'text-primary-foreground' : 'text-primary')}>
                  {tab.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium leading-tight">{tab.label}</div>
                  <div
                    className={cn(
                      'text-[10px] truncate',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 w-full">
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">General Application Preferences</h2>
                <p className="text-xs text-muted-foreground">Manage startup behavior and default paths.</p>
              </div>

              {/* Startup View */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Default Startup View</label>
                    <p className="text-[11px] text-muted-foreground">Select the page opened when launching Any Cloud.</p>
                  </div>
                  <DropdownSelect
                    value={settings.defaultStartupView}
                    onChange={(val) => updateSetting('defaultStartupView', val as any)}
                    options={startupViewOptions}
                    width="w-64"
                  />
                </div>
              </div>

              {/* Default Download Folder */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Default Download Folder</label>
                  <p className="text-[11px] text-muted-foreground">Files downloaded from cloud storage will save here.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-9 px-3 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground flex items-center gap-2 truncate">
                    <Folder size={14} className="text-primary shrink-0" />
                    <span className="truncate font-mono text-[11px]">
                      {settings.defaultDownloadPath || 'System default (Downloads folder)'}
                    </span>
                  </div>
                  <button
                    onClick={handlePickDownloadFolder}
                    disabled={isPickingFolder}
                    className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FolderOpen size={14} />
                    <span>Browse...</span>
                  </button>
                </div>
              </div>

              {/* Confirmations & Safety */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <h3 className="text-xs font-semibold text-foreground">Prompts & Confirmations</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Confirm Before Deletion</div>
                    <div className="text-[11px] text-muted-foreground">Show confirmation modal before deleting cloud files.</div>
                  </div>
                  <Checkbox
                    checked={settings.confirmBeforeDelete}
                    onChange={(checked) => updateSetting('confirmBeforeDelete', checked)}
                    ariaLabel="Confirm Before Deletion"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Confirm Account Disconnect</div>
                    <div className="text-[11px] text-muted-foreground">Show confirmation before unlinking any connected cloud.</div>
                  </div>
                  <Checkbox
                    checked={settings.confirmBeforeDisconnect}
                    onChange={(checked) => updateSetting('confirmBeforeDisconnect', checked)}
                    ariaLabel="Confirm Account Disconnect"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Notify on Transfer Completion</div>
                    <div className="text-[11px] text-muted-foreground">Show in-app toast when cloud transfers finish.</div>
                  </div>
                  <Checkbox
                    checked={settings.notifyOnTransferComplete}
                    onChange={(checked) => updateSetting('notifyOnTransferComplete', checked)}
                    ariaLabel="Notify on Transfer Completion"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: TRANSFERS & ENGINE */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">Transfer Engine & Performance</h2>
                <p className="text-xs text-muted-foreground">
                  Tune multi-threaded transfer concurrency, chunk sizes, and bandwidth throttling.
                </p>
              </div>

              {/* Concurrency Slider */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Parallel Transfer Streams</label>
                    <p className="text-[11px] text-muted-foreground">
                      Maximum number of files transferred simultaneously.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {settings.concurrentTransfers} Streams
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-muted-foreground font-medium">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.concurrentTransfers}
                    onChange={(e) => updateSetting('concurrentTransfers', Number(e.target.value))}
                    className="flex-1 accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground font-medium">10</span>
                </div>
              </div>

              {/* Multi-part Chunk Size */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Multipart Upload Chunk Size</label>
                    <p className="text-[11px] text-muted-foreground">
                      Size of segments used for large cloud uploads (S3, B2, OneDrive, Google Drive).
                    </p>
                  </div>
                  <DropdownSelect
                    value={settings.chunkSizeMB}
                    onChange={(val) => updateSetting('chunkSizeMB', Number(val))}
                    options={chunkSizeOptions}
                    width="w-64"
                  />
                </div>
              </div>

              {/* Bandwidth Throttling */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <h3 className="text-xs font-semibold text-foreground">Speed Limits & Bandwidth Cap</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Upload Speed Limit
                      </label>
                      <span className="text-[10px] text-muted-foreground">Throttle outbound bandwidth</span>
                    </div>
                    <DropdownSelect
                      value={settings.uploadBandwidthLimit}
                      onChange={(val) => updateSetting('uploadBandwidthLimit', String(val))}
                      options={uploadSpeedOptions}
                      width="w-56"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block">
                        Download Speed Limit
                      </label>
                      <span className="text-[10px] text-muted-foreground">Throttle inbound bandwidth</span>
                    </div>
                    <DropdownSelect
                      value={settings.downloadBandwidthLimit}
                      onChange={(val) => updateSetting('downloadBandwidthLimit', String(val))}
                      options={downloadSpeedOptions}
                      width="w-56"
                    />
                  </div>
                </div>
              </div>

              {/* Integrity & Reliability */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <h3 className="text-xs font-semibold text-foreground">Data Integrity & Resilience</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Verify Checksums on Completion</div>
                    <div className="text-[11px] text-muted-foreground">
                      Validates MD5/SHA-1/QuickXorHash hashes after file transfers to guarantee byte-for-byte fidelity.
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.verifyChecksums}
                    onChange={(checked) => updateSetting('verifyChecksums', checked)}
                    ariaLabel="Verify Checksums on Completion"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Auto-Retry Failed Transfers</div>
                    <div className="text-[11px] text-muted-foreground">
                      Automatically retries on transient connection dropped or rate limit responses.
                    </div>
                  </div>
                  <DropdownSelect
                    value={settings.maxRetries}
                    onChange={(val) => updateSetting('maxRetries', Number(val))}
                    options={retriesOptions}
                    width="w-64"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">Appearance & Interface</h2>
                <p className="text-xs text-muted-foreground">Personalize visual style, views, and data formats.</p>
              </div>

              {/* Theme Mode Selector Cards */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-3">
                <label className="text-xs font-semibold text-foreground block">Color Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={(e) => setTheme('light', e)}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-2 transition-all duration-150 cursor-pointer',
                      theme === 'light'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <Sun size={20} />
                    <span className="text-xs">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => setTheme('dark', e)}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-2 transition-all duration-150 cursor-pointer',
                      theme === 'dark'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <Moon size={20} />
                    <span className="text-xs">Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => setTheme('system', e)}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-2 transition-all duration-150 cursor-pointer',
                      theme === 'system'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <Laptop size={20} />
                    <span className="text-xs">System</span>
                  </button>
                </div>
              </div>

              {/* View Defaults & Formatting */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <h3 className="text-xs font-semibold text-foreground">File Explorer Presentation</h3>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Default Explorer Layout</div>
                    <div className="text-[11px] text-muted-foreground">Default view mode when opening folders.</div>
                  </div>
                  <DropdownSelect
                    value={settings.defaultFileView}
                    onChange={(val) => updateSetting('defaultFileView', val as any)}
                    options={fileViewOptions}
                    width="w-60"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Show Hidden & System Files</div>
                    <div className="text-[11px] text-muted-foreground">Display dotfiles and hidden folders (e.g. .git, .DS_Store).</div>
                  </div>
                  <Checkbox
                    checked={settings.showHiddenFiles}
                    onChange={(checked) => updateSetting('showHiddenFiles', checked)}
                    ariaLabel="Show Hidden & System Files"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Date Format</div>
                    <div className="text-[11px] text-muted-foreground">Choose between relative or exact date timestamps.</div>
                  </div>
                  <DropdownSelect
                    value={settings.dateFormat}
                    onChange={(val) => updateSetting('dateFormat', val as any)}
                    options={dateFormatOptions}
                    width="w-64"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">File Size Standard</div>
                    <div className="text-[11px] text-muted-foreground">Display unit calculation standard.</div>
                  </div>
                  <DropdownSelect
                    value={settings.fileSizeUnit}
                    onChange={(val) => updateSetting('fileSizeUnit', val as any)}
                    options={fileSizeUnitOptions}
                    width="w-64"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: CACHE & STORAGE */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">Local Cache & SQLite Index</h2>
                <p className="text-xs text-muted-foreground">
                  Any Cloud caches file directory trees locally for instant instant searching and offline browsing.
                </p>
              </div>

              {/* Cache Live Metric Card */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Local SQLite Metadata Cache</div>
                    <div className="text-[11px] text-muted-foreground">
                      {cacheStats.cached_files_count.toLocaleString()} indexed files ({formatBytes(cacheStats.cached_bytes)} total size)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={isClearingCache || cacheStats.cached_files_count === 0}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>{isClearingCache ? 'Clearing...' : 'Clear Cache'}</span>
                </button>
              </div>

              {/* Cache Settings */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <h3 className="text-xs font-semibold text-foreground">Cache Invalidation Policy</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Offline Metadata Caching</div>
                    <div className="text-[11px] text-muted-foreground">
                      Store directory listings locally to enable browsing without internet access.
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.offlineMetadataCaching}
                    onChange={(checked) => updateSetting('offlineMetadataCaching', checked)}
                    ariaLabel="Offline Metadata Caching"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Cache Expiry Period (TTL)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Time before cloud listings are automatically refreshed in the background.
                    </div>
                  </div>
                  <DropdownSelect
                    value={settings.cacheExpiryHours}
                    onChange={(val) => updateSetting('cacheExpiryHours', Number(val))}
                    options={cacheExpiryOptions}
                    width="w-64"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & PRIVACY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">Security & Token Privacy</h2>
                <p className="text-xs text-muted-foreground">Safeguard cloud API tokens, credentials, and app access.</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Auto-Lock Inactive Session</div>
                    <div className="text-[11px] text-muted-foreground">
                      Prompt master authentication after period of desktop inactivity.
                    </div>
                  </div>
                  <DropdownSelect
                    value={settings.autoLockTimeout}
                    onChange={(val) => updateSetting('autoLockTimeout', Number(val))}
                    options={autoLockOptions}
                    width="w-64"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Mask Secret Keys & Auth Tokens</div>
                    <div className="text-[11px] text-muted-foreground">
                      Redact sensitive credentials in input forms and diagnostic logs with bullet masks.
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.maskSensitiveKeys}
                    onChange={(checked) => updateSetting('maskSensitiveKeys', checked)}
                    ariaLabel="Mask Secret Keys & Auth Tokens"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">Anonymous Telemetry & Crash Reporting</div>
                    <div className="text-[11px] text-muted-foreground">
                      Send anonymous crash traces to help improve stability. No file names or cloud data are ever collected.
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.telemetryEnabled}
                    onChange={(checked) => updateSetting('telemetryEnabled', checked)}
                    ariaLabel="Anonymous Telemetry & Crash Reporting"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-foreground">Any Cloud Privacy Policy</div>
                    <div className="text-[11px] text-muted-foreground">
                      Local-first data governance, zero-relay architecture, and credential protection disclosure.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenUrl('https://github.com/sayandey021/Any-Cloud/blob/main/PRIVACY.md')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-accent hover:border-border text-xs font-semibold text-foreground transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>View Privacy Policy</span>
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ABOUT & DIAGNOSTICS */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">About Any Cloud</h2>
                <p className="text-xs text-muted-foreground">System architecture, publisher credentials, and runtime specifications.</p>
              </div>

              {/* Hero Banner Card with Real AppIcon */}
              <div className="p-5 rounded-2xl border border-border/70 bg-gradient-to-br from-card/80 via-card/50 to-primary/5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-center p-2 shrink-0">
                      <AppIcon size={52} className="w-13 h-13" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground tracking-tight">Any Cloud Desktop</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                          v{APP_VERSION}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Stable Channel
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unified Multi-Cloud Storage Manager & Cross-Transfer Desktop Engine
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90 px-2 py-0.5 rounded-lg bg-muted/80 border border-border/60">
                          <Building2 size={12} className="text-primary" />
                          Published by <strong className="text-foreground">SaayanSoft</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3 text-[11px] text-muted-foreground leading-relaxed">
                  Seamlessly manage, search, and transfer files across 60+ cloud drives, S3-compatible buckets, and network storage protocols from a unified desktop application with local caching and end-to-end security.
                </div>
              </div>

              {/* Publisher & Developer Card */}
              <div className="p-5 rounded-2xl border border-border/70 bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span>Publisher & Developer Credits</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Publisher Box */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 size={13} className="text-primary" />
                      <span>Published by</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">SaayanSoft</div>
                    <p className="text-[11px] text-muted-foreground">Software Publishing & Desktop Applications</p>
                  </div>

                  {/* Developer Box */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Code2 size={13} className="text-sky-500" />
                      <span>Developed by</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">Sayan Dey</div>
                    <p className="text-[11px] text-muted-foreground">Creator & Full-Stack Systems Engineer</p>
                  </div>
                </div>

                {/* Social & Contact Links */}
                <div className="pt-1 space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground">Connect with the Developer:</div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* LinkedIn */}
                    <button
                      type="button"
                      onClick={() => handleOpenUrl('https://www.linkedin.com/in/sayan-dey021')}
                      title="Open LinkedIn Profile"
                      className="flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-muted/60 hover:bg-[#0a66c2]/10 border border-border/80 hover:border-[#0a66c2]/40 text-xs font-medium text-foreground hover:text-[#0a66c2] transition-all group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-5 h-5 rounded-md bg-[#0a66c2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Linkedin size={12} className="stroke-[2.5]" />
                        </div>
                        <span className="truncate text-xs font-semibold">www.linkedin.com/in/sayan-dey021</span>
                      </div>
                      <ExternalLink size={13} className="text-muted-foreground group-hover:text-[#0a66c2] shrink-0 transition-colors" />
                    </button>

                    {/* GitHub */}
                    <button
                      type="button"
                      onClick={() => handleOpenUrl('https://github.com/sayandey021')}
                      title="Open GitHub Profile"
                      className="flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-muted/60 hover:bg-card border border-border/80 hover:border-foreground/30 text-xs font-medium text-foreground transition-all group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-5 h-5 rounded-md bg-foreground text-background flex items-center justify-center shrink-0 shadow-2xs">
                          <Github size={12} className="stroke-[2.5]" />
                        </div>
                        <span className="truncate text-xs font-semibold">github.com/sayandey021</span>
                      </div>
                      <ExternalLink size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Engine Status Specs */}
              <div className="p-5 rounded-2xl border border-border/70 bg-card/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info size={14} className="text-primary" />
                    <span>Runtime Diagnostics & Stack</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-muted-foreground">Windows x86_64</span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-border/40">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Core Synchronization Engine</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {rcloneStatus?.is_installed
                        ? `Rclone v${rcloneStatus.version?.version || '1.68.0'}`
                        : 'Local Rclone Runtime'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Desktop Architecture</span>
                    <span className="font-semibold text-foreground">Tauri v2.0 (Rust 1.82 + Windows WebView2)</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Supported Storage Ecosystem</span>
                    <span className="font-semibold text-foreground">60 Storage Backends & Protocols</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Active Storage Connections</span>
                    <span className="font-semibold text-foreground">{accounts.length} Backends Configured</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Local Cache Storage</span>
                    <span className="font-semibold text-foreground">SQLite 3.46 (WAL Mode, Embedded)</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Frontend Framework</span>
                    <span className="font-semibold text-foreground">React 18 + TypeScript + Tailwind CSS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
