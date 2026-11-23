import React from 'react';
import { Calendar, Check, Copy, FileText, HardDrive, Hash, Star } from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { FileIcon, ProviderIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';

export const FilePropertiesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  file: CloudFile;
}> = ({ isOpen, onClose, file }) => {
  const { accounts } = useAccountStore();
  const { toggleFavorite } = useFileStore();
  const { addToast } = useUiStore();

  const account = accounts.find((a) => a.id === file.account_id);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.remote_path);
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: file.remote_path,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File Properties" maxWidth="md">
      <div className="space-y-5">
        {/* Header Icon + Name */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/40 border border-border">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center p-2 border border-border shadow-xs">
            <FileIcon isDir={file.is_dir} name={file.name} mimeType={file.mime_type} size={28} />
          </div>
          <div className="flex-1 truncate">
            <h4 className="text-sm font-bold text-foreground truncate">{file.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {file.is_dir ? 'Folder' : file.mime_type || 'Unknown MIME type'}
            </p>
          </div>
          <button
            onClick={() => toggleFavorite(file.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-card transition-colors"
          >
            <Star
              size={18}
              className={file.is_favorite ? 'text-amber-500 fill-amber-500' : ''}
            />
          </button>
        </div>

        {/* Details List */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Cloud Provider</span>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {account && <ProviderIcon provider={account.provider} size={14} />}
              <span>{account?.label || account?.name || file.account_id}</span>
            </div>
          </div>

          <div className="flex items-start justify-between py-2 border-b border-border/50 gap-4">
            <span className="text-muted-foreground shrink-0">Remote Path</span>
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-[11px] text-foreground truncate">
                {file.remote_path}
              </span>
              <button
                onClick={handleCopyPath}
                title="Copy Path"
                className="p-1 rounded text-muted-foreground hover:text-foreground shrink-0"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {!file.is_dir && (
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">File Size</span>
              <span className="font-semibold text-foreground">
                {formatBytes(file.size)} ({file.size.toLocaleString()} bytes)
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Last Modified</span>
            <span className="font-medium text-foreground">{formatDate(file.mod_time)}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Local Cache Timestamp</span>
            <span className="font-medium text-foreground">{formatDate(file.cached_at)}</span>
          </div>

          {file.hash && (
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Integrity Hash</span>
              <span className="font-mono text-[11px] text-foreground truncate max-w-[200px]">
                {file.hash}
              </span>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
