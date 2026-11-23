import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Folder,
  FolderOpen,
  Move,
  ShieldAlert,
} from 'lucide-react';
import { cn, formatBytes } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransferStore } from '../../stores/transferStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { ConflictStrategy, TransferType } from '../../types/transfer';
import { FileIcon, ProviderIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';

export const CrossCloudTransferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  files: CloudFile[];
}> = ({ isOpen, onClose, files }) => {
  const { accounts } = useAccountStore();
  const { startTransfer } = useTransferStore();
  const { addToast, setActivePage } = useUiStore();

  const [destAccountId, setDestAccountId] = useState<string>('');
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);
  const destDropdownRef = useRef<HTMLDivElement>(null);
  const [destPath, setDestPath] = useState<string>('');
  const [transferType, setTransferType] = useState<TransferType>('Copy');
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('Replace');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (destDropdownRef.current && !destDropdownRef.current.contains(event.target as Node)) {
        setDestDropdownOpen(false);
      }
    };
    if (destDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [destDropdownOpen]);

  React.useEffect(() => {
    if (isOpen && accounts.length > 0) {
      // Default to another cloud if available
      const sourceAccId = files[0]?.account_id;
      const other = accounts.find((a) => a.id !== sourceAccId) || accounts[0];
      setDestAccountId(other.id);
      const defaultDown = useSettingsStore.getState().settings.defaultDownloadPath;
      setDestPath(other.provider === 'local' && defaultDown ? defaultDown : '');
      setTransferType('Copy');
      setConflictStrategy('Replace');
    }
  }, [isOpen, accounts, files]);

  if (files.length === 0) return null;

  const sourceAccount = accounts.find((a) => a.id === files[0]?.account_id);
  const destAccount = accounts.find((a) => a.id === destAccountId);

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const handleStartTransfer = async () => {
    if (!sourceAccount || !destAccount) return;
    setIsStarting(true);

    try {
      for (const file of files) {
        const destFileFullPath = destPath ? `${destPath}/${file.name}` : file.name;

        await startTransfer({
          name: file.name,
          transfer_type: transferType,
          source_remote: sourceAccount.name,
          source_path: file.remote_path,
          dest_remote: destAccount.name,
          dest_path: destFileFullPath,
          conflict_strategy: conflictStrategy,
          total_bytes: file.size,
        });
      }

      addToast({
        type: 'success',
        title: 'Transfer Started',
        message: `${files.length} item(s) transferring from ${sourceAccount.label || sourceAccount.name} to ${destAccount.label || destAccount.name}`,
      });

      onClose();
      setActivePage('transfers');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Transfer Failed to Start',
        message: err.message || 'Error scheduling transfer',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const conflictOptions: { id: ConflictStrategy; label: string; desc: string }[] = [
    { id: 'Replace', label: 'Replace', desc: 'Overwrite file if duplicate exists at destination' },
    { id: 'Skip', label: 'Skip', desc: 'Do not transfer if identical name already exists' },
    { id: 'KeepBoth', label: 'Keep Both', desc: 'Rename transferred file with unique number suffix' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cross-Cloud Transfer"
      description={`Transfer ${files.length} selected item (${formatBytes(totalBytes)})`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Source -> Destination Visual Banner */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-accent/40 border border-border">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Source Location
            </span>
            <div className="flex items-center gap-2 font-bold text-xs text-foreground truncate">
              {sourceAccount && <ProviderIcon provider={sourceAccount.provider} size={16} />}
              <span className="truncate">{sourceAccount?.label || sourceAccount?.name}</span>
            </div>
          </div>

          <div className="space-y-1 relative" ref={destDropdownRef}>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Destination Cloud
            </span>
            <button
              type="button"
              onClick={() => setDestDropdownOpen(!destDropdownOpen)}
              className="w-full h-8 text-xs bg-card hover:bg-muted/50 border border-border rounded-lg px-2 text-foreground font-semibold flex items-center justify-between gap-1.5 focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                {destAccount && <ProviderIcon provider={destAccount.provider} size={15} />}
                <span className="truncate">{destAccount?.label || destAccount?.name || 'Select destination'}</span>
              </div>
              <ChevronDown
                size={13}
                className={cn('text-muted-foreground shrink-0 transition-transform duration-150', destDropdownOpen && 'rotate-180')}
              />
            </button>
            {destDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-48 overflow-y-auto">
                {accounts.map((acc) => {
                  const isSelected = acc.id === destAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setDestAccountId(acc.id);
                        if (acc.provider === 'local') {
                          const defaultDown = useSettingsStore.getState().settings.defaultDownloadPath;
                          if (defaultDown) setDestPath(defaultDown);
                        }
                        setDestDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted/70 font-medium'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ProviderIcon provider={acc.provider} size={14} />
                        <span className="truncate">{acc.label || acc.name}</span>
                        <span className="text-[10px] text-muted-foreground/60 capitalize">({acc.provider})</span>
                      </div>
                      {isSelected && <Check size={13} className="text-primary shrink-0 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Items Summary */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Items to Transfer
          </label>
          <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-muted/40 border border-border text-xs">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2 truncate">
                  <FileIcon isDir={f.is_dir} name={f.name} mimeType={f.mime_type} size={15} />
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                  {f.is_dir ? 'Folder' : formatBytes(f.size)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Action: Copy vs Move */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTransferType('Copy')}
            className={`p-3 rounded-xl border text-left transition-all ${
              transferType === 'Copy'
                ? 'bg-primary/10 border-primary text-foreground'
                : 'bg-card border-border hover:bg-accent/40 text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Copy size={15} className="text-primary" />
              <span>Copy</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Leave original files intact on source cloud
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTransferType('Move')}
            className={`p-3 rounded-xl border text-left transition-all ${
              transferType === 'Move'
                ? 'bg-primary/10 border-primary text-foreground'
                : 'bg-card border-border hover:bg-accent/40 text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Move size={15} className="text-primary" />
              <span>Move</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Delete from source once transfer completes
            </p>
          </button>
        </div>

        {/* Conflict Resolution Strategy */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Duplicate Filename Handling
          </label>
          <div className="grid grid-cols-3 gap-2">
            {conflictOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setConflictStrategy(opt.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  conflictStrategy === opt.id
                    ? 'bg-accent border-primary text-foreground font-semibold'
                    : 'bg-card border-border hover:bg-accent/40 text-muted-foreground'
                }`}
              >
                <div className="text-xs">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isStarting || !sourceAccount || !destAccount}
            onClick={handleStartTransfer}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            {isStarting ? (
              <span>Queueing...</span>
            ) : (
              <>
                <span>Start {transferType}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
