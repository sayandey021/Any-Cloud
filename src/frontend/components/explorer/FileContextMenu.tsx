import React, { useEffect, useRef } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Download,
  Edit2,
  FolderOpen,
  Info,
  Move,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { downloadFiles } from '../../lib/downloadHelper';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore, NavigationPage } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { isNativeTrashSupported } from '../../types/cloud';

interface FileContextMenuProps {
  x: number;
  y: number;
  file: CloudFile;
  mode?: NavigationPage;
  onClose: () => void;
  onRename: (file: CloudFile) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  file,
  mode = 'files',
  onClose,
  onRename,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { accounts, activeAccountId } = useAccountStore();
  const { toggleFavorite, deleteFile, restoreFile, loadFiles, currentPath } = useFileStore();
  const { openTransferModal, openProperties, addToast, showConfirmDialog, closeConfirmDialog } = useUiStore();

  const isTrashMode = mode === 'trash';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position so it doesn't overflow screen boundaries
  const menuWidth = 200;
  const menuHeight = 295;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  const handleOpen = () => {
    if (file.is_dir && activeAccountId) {
      loadFiles(activeAccountId, file.remote_path);
    } else {
      openProperties(file);
    }
    onClose();
  };

  const handleDownload = () => {
    onClose();
    const { selectedFileIds, files } = useFileStore.getState();
    if (selectedFileIds.includes(file.id) && selectedFileIds.length > 1) {
      const selected = files.filter((f) => selectedFileIds.includes(f.id));
      downloadFiles(selected);
    } else {
      downloadFiles([file]);
    }
  };

  const handleTransfer = () => {
    openTransferModal([file]);
    onClose();
  };

  const handleToggleFavorite = () => {
    toggleFavorite(file.id);
    onClose();
  };

  const handleRestore = async () => {
    onClose();
    const accId = file.account_id || activeAccountId;
    if (!accId) return;
    await restoreFile(accId, file.remote_path);
    addToast({
      type: 'success',
      title: 'Item Restored',
      message: `Restored ${file.name} to its original location`,
    });
  };

  const handleDelete = () => {
    onClose();
    const accId = file.account_id || activeAccountId;
    if (!accId) return;
    const { confirmBeforeDelete } = useSettingsStore.getState().settings;

    const executeDeletion = () => {
      closeConfirmDialog();
      deleteFile(accId, file.remote_path, file.is_dir, isTrashMode).then(() => {
        addToast({
          type: 'success',
          title: isTrashMode ? 'Permanently Deleted' : 'Moved to Trash',
          message: isTrashMode ? `Removed ${file.name}` : `Moved ${file.name} to Trash`,
        });
      });
    };

    const activeAcc = accounts.find((a) => a.id === accId);
    const hasNativeTrash = isNativeTrashSupported(activeAcc?.provider);

    if (confirmBeforeDelete || isTrashMode) {
      showConfirmDialog({
        title: isTrashMode ? `Permanently Delete "${file.name}"?` : `Move "${file.name}" to Trash?`,
        description: isTrashMode
          ? `Are you sure you want to permanently delete this ${file.is_dir ? 'folder and all its contents' : 'file'}? This cannot be undone.`
          : hasNativeTrash
          ? `Are you sure you want to move this ${file.is_dir ? 'folder' : 'file'} to Trash? Files will be placed in ${activeAcc?.label || activeAcc?.name || 'Google Drive'}'s native Recycle Bin.`
          : `Note: ${activeAcc?.label || activeAcc?.name || 'This cloud provider'} does not support a native cloud recycle bin. This item will be stored in Any Cloud's local Trash (or you can delete it permanently).`,
        itemName: file.name,
        itemType: file.is_dir ? 'Directory / Folder' : 'File',
        confirmText: isTrashMode ? 'Delete Permanently' : hasNativeTrash ? 'Move to Trash' : 'Move to Local Trash',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'trash',
        hint: isTrashMode
          ? 'This item will be permanently removed from your storage provider.'
          : hasNativeTrash
          ? 'You can restore this item later from Trash or web Google Drive.'
          : 'You can restore this item anytime from local Trash.',
        onConfirm: executeDeletion,
      });
    } else {
      executeDeletion();
    }
  };

  const handleProperties = () => {
    openProperties(file);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-50 w-52 rounded-xl bg-card border border-border shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1.5 font-semibold text-foreground truncate border-b border-border/50 mb-1">
        {file.name}
      </div>

      {isTrashMode ? (
        <>
          <button
            onClick={handleRestore}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <RotateCcw size={14} className="text-primary" />
            <span>Restore Item</span>
          </button>

          <button
            onClick={handleProperties}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <Info size={14} className="text-muted-foreground" />
            <span>Properties</span>
          </button>

          <div className="h-px bg-border/50 my-1" />

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors text-left font-medium"
          >
            <Trash2 size={14} />
            <span>Delete Permanently</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleOpen}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <FolderOpen size={14} className="text-primary" />
            <span>{file.is_dir ? 'Open Folder' : 'Open / Preview'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <Download size={14} className="text-emerald-500" />
            <span>Download</span>
          </button>

          <button
            onClick={handleTransfer}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <ArrowLeftRight size={14} className="text-blue-500" />
            <span>Cross-Cloud Transfer...</span>
          </button>

          <button
            onClick={handleToggleFavorite}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <Star
              size={14}
              className={file.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}
            />
            <span>{file.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
          </button>

          <div className="h-px bg-border/50 my-1" />

          <button
            onClick={() => {
              onRename(file);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <Edit2 size={14} className="text-muted-foreground" />
            <span>Rename</span>
          </button>

          <button
            onClick={handleProperties}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
          >
            <Info size={14} className="text-muted-foreground" />
            <span>Properties</span>
          </button>

          <div className="h-px bg-border/50 my-1" />

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors text-left font-medium"
          >
            <Trash2 size={14} />
            <span>Move to Trash</span>
          </button>
        </>
      )}
    </div>
  );
};
