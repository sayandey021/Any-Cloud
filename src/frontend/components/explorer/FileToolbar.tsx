import React, { useState } from 'react';
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowLeftRight,
  Database,
  Download,
  Filter,
  FolderPlus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHorizontalScroll } from '../../lib/useHorizontalScroll';
import { downloadFiles } from '../../lib/downloadHelper';
import { uploadFiles } from '../../lib/uploadHelper';
import { tauriApi } from '../../services/tauriClient';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore, NavigationPage } from '../../stores/uiStore';
import { FileTypeFilter, SortField } from '../../types/file';
import { isNativeTrashSupported } from '../../types/cloud';

export const FileToolbar: React.FC<{
  mode?: NavigationPage;
  onNewFolder: () => void;
}> = ({ mode = 'files', onNewFolder }) => {
  const { accounts, activeAccountId } = useAccountStore();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const hasNativeTrash = isNativeTrashSupported(activeAccount?.provider);
  const {
    currentPath,
    loadFiles,
    loadRecentFiles,
    loadFavoriteFiles,
    loadTrashFiles,
    loadSharedFiles,
    restoreFile,
    emptyTrash,
    isLoading,
    isFromCache,
    filterType,
    setFilterType,
    sortField,
    sortDirection,
    setSorting,
    selectedFileIds,
    files,
    deleteFile,
    clearSelection,
  } = useFileStore();
  const { openTransferModal, addToast, showConfirmDialog, closeConfirmDialog } = useUiStore();

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const filterScrollRef = useHorizontalScroll<HTMLDivElement>();

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    if (sortOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [sortOpen]);

  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));

  const handleRefresh = async () => {
    if (mode === 'favorites') {
      await loadFavoriteFiles();
      addToast({
        type: 'info',
        title: 'Favorites Refreshed',
        message: 'Updated favorite files list',
      });
    } else if (mode === 'recent') {
      await loadRecentFiles();
      addToast({
        type: 'info',
        title: 'Recents Refreshed',
        message: 'Updated recent activity',
      });
    } else if (mode === 'trash') {
      await loadTrashFiles(activeAccountId || undefined);
      addToast({
        type: 'info',
        title: 'Trash Refreshed',
        message: 'Updated trash items',
      });
    } else if (mode === 'shared') {
      await loadSharedFiles(activeAccountId || undefined, currentPath);
      addToast({
        type: 'info',
        title: 'Shared Files Refreshed',
        message: 'Updated shared files from cloud accounts',
      });
    } else if (activeAccountId) {
      await loadFiles(activeAccountId, currentPath, true);
      addToast({
        type: 'info',
        title: 'Metadata Refreshed',
        message: 'Loaded confirmed live data from cloud provider',
      });
    }
  };

  const handleEmptyTrash = () => {
    showConfirmDialog({
      title: 'Empty Trash?',
      description: 'Are you sure you want to permanently empty the trash? All items will be deleted forever.',
      itemName: 'All Trash Items',
      itemType: 'Trash Bin',
      confirmText: 'Empty Trash Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
      hint: 'This action cannot be undone.',
      onConfirm: async () => {
        closeConfirmDialog();
        await emptyTrash();
        addToast({
          type: 'success',
          title: 'Trash Emptied',
          message: 'All trashed items have been permanently removed',
        });
      },
    });
  };

  const handleBatchRestore = async () => {
    const toRestore = [...selectedFiles];
    clearSelection();
    for (const f of toRestore) {
      await restoreFile(f.account_id || activeAccountId || '', f.remote_path);
    }
    addToast({
      type: 'success',
      title: 'Items Restored',
      message: `Restored ${toRestore.length} item(s) from trash`,
    });
  };

  const handleUploadClick = async () => {
    if (!activeAccountId) {
      addToast({
        type: 'error',
        title: 'Upload Unavailable',
        message: 'Please select an active storage account to upload files.',
      });
      return;
    }

    try {
      const picked = await tauriApi.pickFiles(true);
      if (picked && picked.length > 0) {
        await uploadFiles(picked);
        return;
      }
    } catch (err) {
      console.warn('Native file picker failed or unavailable, using fallback input:', err);
    }

    // Fallback to HTML input if native picker was cancelled or unavailable
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const paths = Array.from(fileList)
        .map((f) => (f as any).path)
        .filter(Boolean);
      if (paths.length > 0) {
        await uploadFiles(paths);
      } else {
        addToast({
          type: 'info',
          title: 'Direct Upload',
          message: 'Please use the native file selector or drag files directly into the window.',
        });
      }
      e.target.value = '';
    }
  };

  const handleBatchTransfer = () => {
    if (selectedFiles.length > 0) {
      openTransferModal(selectedFiles);
    }
  };

  const handleBatchDownload = () => {
    if (selectedFiles.length > 0) {
      downloadFiles(selectedFiles);
    }
  };

  const handleDownloadClick = () => {
    if (selectedFiles.length > 0) {
      downloadFiles(selectedFiles);
    } else {
      addToast({
        type: 'info',
        title: 'Select Files to Download',
        message: 'Please select one or more files from the list to download to your local drive.',
      });
    }
  };

  const handleBatchDelete = () => {
    if (selectedFiles.length === 0) return;
    const count = selectedFiles.length;
    const itemName = count === 1 ? `"${selectedFiles[0]?.name}"` : `${count} items`;
    const isTrashMode = mode === 'trash';

    showConfirmDialog({
      title: isTrashMode ? `Permanently Delete ${itemName}?` : `Move ${itemName} to Trash?`,
      description: isTrashMode
        ? `Are you sure you want to permanently delete ${itemName}? This cannot be undone.`
        : hasNativeTrash
        ? `Are you sure you want to move ${itemName} to Trash? Files will be placed in ${activeAccount?.label || activeAccount?.name || 'Google Drive'}'s native Recycle Bin.`
        : `Note: ${activeAccount?.label || activeAccount?.name || 'This cloud provider'} does not support a native cloud recycle bin. Items will be stored in Any Cloud's local Trash (or you can delete them permanently).`,
      itemName: count === 1 ? selectedFiles[0]?.name : `${count} selected items`,
      itemType: count === 1 ? (selectedFiles[0]?.is_dir ? 'Directory / Folder' : 'File') : 'Batch Selection',
      confirmText: isTrashMode ? 'Delete Permanently' : hasNativeTrash ? 'Move to Trash' : 'Move to Local Trash',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
      hint: isTrashMode
        ? 'This will permanently remove the item(s) from your storage provider.'
        : hasNativeTrash
        ? 'You can restore items later from Trash or web Google Drive.'
        : 'You can restore items anytime from local Trash.',
      onConfirm: async () => {
        const toDelete = [...selectedFiles];
        clearSelection();
        closeConfirmDialog();

        Promise.allSettled(
          toDelete.map((f) => {
            const accId = f.account_id || activeAccountId;
            return accId ? deleteFile(accId, f.remote_path, f.is_dir, isTrashMode) : Promise.resolve();
          })
        ).then(() => {
          addToast({
            type: 'success',
            title: isTrashMode ? 'Permanently Deleted' : 'Moved to Trash',
            message: isTrashMode
              ? `Permanently deleted ${count} item(s)`
              : `Moved ${count} item(s) to Trash`,
          });
        });
      },
    });
  };

  const filterPills: { id: FileTypeFilter; label: string }[] = [
    { id: 'all', label: 'All Files' },
    { id: 'folders', label: 'Folders' },
    { id: 'documents', label: 'Documents' },
    { id: 'images', label: 'Images' },
    { id: 'media', label: 'Media' },
    { id: 'archives', label: 'Archives' },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'size', label: 'Size' },
    { field: 'mod_time', label: 'Date Modified' },
    { field: 'type', label: 'Type' },
  ];

  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border/70 bg-card/30 backdrop-blur select-none">
      {/* Left: Filter Pills */}
      <div ref={filterScrollRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {filterPills.map((pill) => (
          <button
            key={pill.id}
            onClick={() => setFilterType(pill.id)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0',
              filterType === pill.id
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Selected count and batch actions */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-1.5 bg-accent/60 px-2.5 py-1 rounded-lg border border-border">
            <span className="text-xs font-semibold text-foreground">
              {selectedFiles.length} selected
            </span>
            {mode === 'trash' ? (
              <button
                onClick={handleBatchRestore}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline px-1.5 py-0.5"
                title="Restore selected files"
              >
                <RotateCcw size={13} />
                <span>Restore</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleBatchDownload}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-400 px-1.5 py-0.5"
                  title="Download selected to local storage"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleBatchTransfer}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline px-1.5 py-0.5"
                >
                  <ArrowLeftRight size={13} />
                  <span>Transfer</span>
                </button>
              </>
            )}
            <button
              onClick={handleBatchDelete}
              className="text-xs text-rose-500 hover:text-rose-600 px-1"
              title={mode === 'trash' ? 'Delete permanently' : 'Move to trash'}
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={clearSelection}
              className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
            >
              Clear
            </button>
          </div>
        )}

        {/* Empty Trash Button (when in trash mode) */}
        {mode === 'trash' && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all shadow-xs"
          >
            <Trash2 size={14} />
            <span>Empty Trash</span>
          </button>
        )}

        {/* Upload Button (only in files mode) */}
        {mode === 'files' && (
          <>
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Upload size={14} />
              <span>Upload</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              multiple
            />
          </>
        )}

        {/* Download Button (Right beside Upload) */}
        {mode !== 'trash' && (
          <button
            onClick={handleDownloadClick}
            title={
              selectedFiles.length > 0
                ? `Download ${selectedFiles.length} item(s) to local storage`
                : 'Download selected files to local disk'
            }
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs border',
              selectedFiles.length > 0
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600 shadow-emerald-500/20'
                : 'bg-card border-border/80 hover:bg-accent text-foreground hover:border-emerald-500/40'
            )}
          >
            <Download
              size={14}
              className={selectedFiles.length > 0 ? 'text-white' : 'text-emerald-500'}
            />
            <span>Download</span>
          </button>
        )}

        {/* New Folder Button (only in files mode) */}
        {mode === 'files' && (
          <button
            onClick={onNewFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border/80 hover:bg-accent text-foreground transition-all shadow-xs"
          >
            <FolderPlus size={14} className="text-amber-500" />
            <span>New Folder</span>
          </button>
        )}

        {/* Sort Menu */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card border border-border hover:bg-accent text-foreground transition-colors shadow-xs"
          >
            {sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowDownZA size={14} />}
            <span className="capitalize">{sortField}</span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 mt-1 w-36 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              {sortOptions.map((opt) => (
                <button
                  key={opt.field}
                  onClick={() => {
                    setSorting(opt.field);
                    setSortOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                    sortField === opt.field
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <span>{opt.label}</span>
                  {sortField === opt.field && (
                    <span className="text-[10px] uppercase font-bold">{sortDirection}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cache / Live Indicator & Refresh Button */}
        <div className="flex items-center gap-1.5">
          <span
            title={
              isFromCache
                ? 'Showing cached metadata from local SQLite. Click refresh for confirmed live cloud state.'
                : 'Confirmed current live information from cloud provider.'
            }
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1',
              isFromCache
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            )}
          >
            <Database size={10} />
            <span>{isFromCache ? 'Cached' : 'Live'}</span>
          </span>

          <button
            onClick={handleRefresh}
            title="Refresh current folder from cloud"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-border"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};
