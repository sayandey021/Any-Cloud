import React from 'react';
import { ArrowLeftRight, Check, Database, HardDrive, RefreshCw } from 'lucide-react';
import { formatSpeed } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useTransferStore } from '../../stores/transferStore';
import { useUiStore } from '../../stores/uiStore';

export const StatusBar: React.FC = () => {
  const { accounts, storageSummary } = useAccountStore();
  const { transfers, getActiveCount } = useTransferStore();
  const { setActivePage } = useUiStore();

  const activeCount = getActiveCount();
  const activeTransfer = transfers.find((t) => t.state === 'Running');

  return (
    <footer className="h-7 border-t border-border/70 bg-card/60 acrylic-header px-4 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 z-10">
      <div className="flex items-center gap-4">
        {/* Account Count */}
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <HardDrive size={12} className="text-primary" />
          <span>{accounts.length} Cloud Account{accounts.length !== 1 ? 's' : ''} Connected</span>
        </span>

        {/* Local Cache Status */}
        <span className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
          <Database size={12} className="text-emerald-500" />
          <span>Offline Ready</span>
        </span>
      </div>

      {/* Right side: Active Transfers progress or Ready */}
      <div className="flex items-center gap-3">
        {activeCount > 0 && activeTransfer ? (
          <button
            onClick={() => setActivePage('transfers')}
            className="flex items-center gap-2 hover:text-foreground transition-colors font-semibold text-primary"
          >
            <RefreshCw size={11} className="animate-spin text-primary" />
            <span>
              Transferring: {activeTransfer.name} ({activeTransfer.percentage.toFixed(0)}%)
            </span>
            {activeTransfer.speed_bytes_per_sec > 0 && (
              <span className="text-muted-foreground font-normal">
                • {formatSpeed(activeTransfer.speed_bytes_per_sec)}
              </span>
            )}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Check size={12} className="text-emerald-500" />
            <span>All Clouds Synced</span>
          </span>
        )}
      </div>
    </footer>
  );
};
