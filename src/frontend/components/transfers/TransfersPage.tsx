import React, { useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { formatBytes, formatDate, formatDuration, formatSpeed } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useTransferStore } from '../../stores/transferStore';
import { useUiStore } from '../../stores/uiStore';
import { TransferTask } from '../../types/transfer';
import { ProviderIcon } from '../ui/Icons';

export const TransfersPage: React.FC = () => {
  const { transfers, loadTransfers, cancelTransfer, clearHistory } = useTransferStore();
  const { accounts } = useAccountStore();
  const { addToast } = useUiStore();

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const activeTransfers = transfers.filter(
    (t) => t.state === 'Running' || t.state === 'Queued' || t.state === 'Paused'
  );
  const completedTransfers = transfers.filter(
    (t) => t.state === 'Completed' || t.state === 'Cancelled' || typeof t.state === 'object'
  );

  const handleCancel = async (id: string, name: string) => {
    await cancelTransfer(id);
    addToast({
      type: 'info',
      title: 'Transfer Cancelled',
      message: `Cancelled transfer of ${name}`,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 select-none">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ArrowLeftRight size={22} className="text-primary" />
          <span>Transfer Queue & History</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monitor real-time progress, speeds, and status of cross-cloud transfers.
        </p>
      </div>

      {/* Active Transfers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Active Transfers</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {activeTransfers.length}
            </span>
          </h3>
        </div>

        {activeTransfers.length > 0 ? (
          <div className="space-y-3">
            {activeTransfers.map((task) => (
              <TransferCard
                key={task.id}
                task={task}
                accounts={accounts}
                onCancel={() => handleCancel(task.id, task.name)}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border/80 text-center text-xs text-muted-foreground">
            No transfers currently running.
          </div>
        )}
      </div>

      {/* Completed Transfers History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Transfer History</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
              {completedTransfers.length}
            </span>
          </h3>
          {completedTransfers.length > 0 && (
            <button
              onClick={async () => {
                await clearHistory();
                addToast({
                  type: 'info',
                  title: 'History Cleared',
                  message: 'Transfer history has been cleared.',
                });
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:bg-accent/40 transition-colors"
              title="Clear Completed and Cancelled Transfers"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {completedTransfers.length > 0 ? (
          <div className="space-y-2">
            {completedTransfers.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  {task.state === 'Completed' ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  ) : task.state === 'Cancelled' ? (
                    <XCircle size={16} className="text-amber-500 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-500 shrink-0" />
                  )}

                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{task.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.source_remote} → {task.dest_remote} · {formatBytes(task.total_bytes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-[11px] text-muted-foreground">
                  <span>{formatDate(task.created_at)}</span>
                  <span
                    className={`font-semibold capitalize ${
                      task.state === 'Completed'
                        ? 'text-emerald-500'
                        : task.state === 'Cancelled'
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {typeof task.state === 'object' ? 'Failed' : task.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border/80 text-center text-xs text-muted-foreground">
            No transfer history yet.
          </div>
        )}
      </div>
    </div>
  );
};

const TransferCard: React.FC<{
  task: TransferTask;
  accounts: any[];
  onCancel: () => void;
}> = ({ task, onCancel }) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="truncate">
          <h4 className="text-xs font-bold text-foreground truncate">{task.name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {task.source_remote}:{task.source_path} → {task.dest_remote}:{task.dest_path}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancel}
            title="Cancel Transfer"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors border border-border"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${Math.min(task.percentage, 100)}%` }}
        />
      </div>

      {/* Metrics Row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
        <span>
          {formatBytes(task.bytes_transferred)} / {formatBytes(task.total_bytes)} (
          {task.percentage.toFixed(0)}%)
        </span>

        <div className="flex items-center gap-3">
          {task.speed_bytes_per_sec > 0 && (
            <span>Speed: {formatSpeed(task.speed_bytes_per_sec)}</span>
          )}
          {task.eta_seconds !== null && task.eta_seconds !== undefined && (
            <span>ETA: {formatDuration(task.eta_seconds)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
