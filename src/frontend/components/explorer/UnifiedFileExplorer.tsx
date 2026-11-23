import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { uploadFiles } from '../../lib/uploadHelper';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { NavigationPage, useUiStore } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { isNativeTrashSupported } from '../../types/cloud';
import { Modal } from '../ui/Modal';
import { BreadcrumbBar } from './BreadcrumbBar';
import { EmptyState } from './EmptyState';
import { FileContextMenu } from './FileContextMenu';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { FileToolbar } from './FileToolbar';

export const UnifiedFileExplorer: React.FC<{ mode?: NavigationPage }> = ({ mode = 'files' }) => {
  const { accounts, activeAccountId } = useAccountStore();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const {
    currentPath,
    loadFiles,
    loadRecentFiles,
    loadFavoriteFiles,
    loadTrashFiles,
    loadSharedFiles,
    clearFiles,
    getFilteredAndSortedFiles,
    viewMode,
    isLoading,
    error,
    createFolder,
    renameFile,
    selectedFileIds,
    clearSelection,
    deleteFile,
  } = useFileStore();
  const { addToast, openTransferModal, showConfirmDialog, closeConfirmDialog } = useUiStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: CloudFile;
  } | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<CloudFile | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Tauri Native Window Drag & Drop (receives real Windows file paths)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    const setupTauriDrop = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        if (win && typeof win.onDragDropEvent === 'function') {
          unlisten = await win.onDragDropEvent((event) => {
            if (!isMounted) return;
            if (mode !== 'files' || !activeAccountId) {
              setIsDraggingOver(false);
              return;
            }

            if (event.payload.type === 'enter') {
              setIsDraggingOver(true);
            } else if (event.payload.type === 'drop') {
              setIsDraggingOver(false);
              if (event.payload.paths && event.payload.paths.length > 0) {
                uploadFiles(event.payload.paths);
              }
            } else if (event.payload.type === 'leave') {
              setIsDraggingOver(false);
            }
          });
        }
      } catch (err) {
        // Fallback to DOM drag & drop
      }
    };

    setupTauriDrop();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [mode, activeAccountId, currentPath]);

  // HTML5 DOM Drag & Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== 'files' || !activeAccountId) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== 'files' || !activeAccountId) return;
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    if (mode !== 'files' || !activeAccountId) return;

    // Check if internal file transfer payload
    const internalData = e.dataTransfer.getData('text/plain');
    if (internalData) {
      try {
        const parsed = JSON.parse(internalData);
        if (parsed && parsed.id) return;
      } catch {}
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const paths: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const filePath = (file as any).path;
        if (filePath) {
          paths.push(filePath);
        }
      }
      if (paths.length > 0) {
        await uploadFiles(paths);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (mode === 'favorites') {
      loadFavoriteFiles();
    } else if (mode === 'recent') {
      loadRecentFiles();
    } else if (mode === 'trash') {
      loadTrashFiles(activeAccountId || undefined);
    } else if (mode === 'shared') {
      loadSharedFiles(activeAccountId || undefined, currentPath);
    } else if (mode === 'files') {
      if (activeAccountId) {
        loadFiles(activeAccountId, currentPath);
      } else {
        clearFiles();
      }
    }
  }, [activeAccountId, mode]);

  // Mouse Extra Buttons (Mouse 4 = Back, Mouse 5 = Forward) & Keyboard Navigation
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // e.button: 3 = Browser Back (Mouse 4 / XButton1), 4 = Browser Forward (Mouse 5 / XButton2)
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        const { canGoBack, goBack } = useFileStore.getState();
        if (canGoBack) {
          goBack();
        }
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        const { canGoForward, goForward } = useFileStore.getState();
        if (canGoForward) {
          goForward();
        }
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in an input, textarea, or editable element
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      const { canGoBack, canGoForward, canGoUp, goBack, goForward, goUp } =
        useFileStore.getState();

      if (e.altKey && e.key === 'ArrowLeft') {
        if (canGoBack) {
          e.preventDefault();
          goBack();
        }
      } else if (e.altKey && e.key === 'ArrowRight') {
        if (canGoForward) {
          e.preventDefault();
          goForward();
        }
      } else if ((e.altKey && e.key === 'ArrowUp') || e.key === 'Backspace') {
        if (canGoUp) {
          e.preventDefault();
          goUp();
        }
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('auxclick', handleAuxClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('auxclick', handleAuxClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const files = getFilteredAndSortedFiles(mode);
  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));

  const handleContextMenu = (e: React.MouseEvent, file: CloudFile) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleBatchTransfer = () => {
    if (selectedFiles.length > 0) {
      openTransferModal(selectedFiles);
    }
  };

  const handleBatchDelete = () => {
    if (selectedFiles.length === 0) return;
    const count = selectedFiles.length;
    const itemName = count === 1 ? `"${selectedFiles[0]?.name}"` : `${count} items`;
    const { confirmBeforeDelete } = useSettingsStore.getState().settings;
    const isTrashMode = mode === 'trash';

    const executeDeletion = () => {
      const toDelete = [...selectedFiles];
      clearSelection();
      closeConfirmDialog();

      // Immediate optimistic update for 0ms perceived latency
      useFileStore.setState((state) => ({
        files: state.files.filter((f) => !toDelete.some((d) => d.id === f.id || d.remote_path === f.remote_path)),
      }));

      Promise.allSettled(
        toDelete.map((f) => {
          const accId = f.account_id || activeAccountId;
          return accId ? deleteFile(accId, f.remote_path, f.is_dir, isTrashMode) : Promise.resolve();
        })
      ).then(() => {
        addToast({
          type: 'success',
          title: isTrashMode ? 'Permanently Deleted' : 'Moved to Trash',
          message: isTrashMode ? `Permanently removed ${count} item(s)` : `Moved ${count} item(s) to Trash`,
        });
      });
    };

    const activeAcc = accounts.find((a) => a.id === activeAccountId);
    const hasNativeTrash = isNativeTrashSupported(activeAcc?.provider);

    if (confirmBeforeDelete || isTrashMode) {
      showConfirmDialog({
        title: isTrashMode ? `Permanently Delete ${itemName}?` : `Move ${itemName} to Trash?`,
        description: isTrashMode
          ? `Are you sure you want to permanently delete ${itemName}? This cannot be undone.`
          : hasNativeTrash
          ? `Are you sure you want to move ${itemName} to Trash? Files will be placed in ${activeAcc?.label || activeAcc?.name || 'Google Drive'}'s native Recycle Bin.`
          : `Note: ${activeAcc?.label || activeAcc?.name || 'This cloud provider'} does not support a native cloud recycle bin. Items will be stored in Any Cloud's local Trash (or you can delete them permanently).`,
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
        onConfirm: executeDeletion,
      });
    } else {
      executeDeletion();
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAccountId && folderName.trim()) {
      await createFolder(activeAccountId, folderName.trim());
      addToast({
        type: 'success',
        title: 'Folder Created',
        message: `Created folder "${folderName.trim()}"`,
      });
      setFolderName('');
      setNewFolderOpen(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAccountId && fileToRename && newFileName.trim()) {
      const parent = fileToRename.parent_path ? `${fileToRename.parent_path}/` : '';
      const newPath = `${parent}${newFileName.trim()}`;
      await renameFile(activeAccountId, fileToRename.remote_path, newPath);
      addToast({
        type: 'success',
        title: 'Renamed',
        message: `Renamed to "${newFileName.trim()}"`,
      });
      setFileToRename(null);
      setRenameModalOpen(false);
    }
  };

  const handleOpenRename = (file: CloudFile) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setRenameModalOpen(true);
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full overflow-hidden bg-background select-none relative"
    >
      {/* Visual Drag & Drop Upload Overlay */}
      {isDraggingOver && mode === 'files' && (
        <div className="absolute inset-0 z-50 bg-background/30 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/70 animate-in fade-in duration-150 pointer-events-none">
          <div className="flex flex-col items-center gap-3.5 p-8 rounded-3xl bg-card/95 backdrop-blur-md border border-border/90 shadow-2xl text-center max-w-sm ring-1 ring-primary/20">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center animate-bounce shadow-inner">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Drop files to upload</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Uploading directly to{' '}
                <span className="font-semibold text-primary">
                  {accounts.find((a) => a.id === activeAccountId)?.label ||
                    accounts.find((a) => a.id === activeAccountId)?.name ||
                    'Active Cloud'}
                </span>
                {currentPath ? (
                  <span className="font-mono text-[11px] block text-foreground/80 mt-0.5">
                    /{currentPath}
                  </span>
                ) : (
                  ' (Root)'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation Bar (Back, Forward, Up, Path Segments) */}
      <BreadcrumbBar mode={mode} />

      {/* Action Toolbar */}
      <FileToolbar mode={mode} onNewFolder={() => setNewFolderOpen(true)} />

      {/* Native vs Local Trash Status Banner */}
      {mode === 'trash' && (
        <div className="px-5 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-2.5">
            {activeAccount && isNativeTrashSupported(activeAccount.provider) ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-semibold">{activeAccount.label || activeAccount.name}:</strong> Showing native cloud trash bin. Restoring items untrashes them directly in Google Drive.
                </span>
              </>
            ) : activeAccount ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-semibold">{activeAccount.label || activeAccount.name}:</strong> Native cloud trash is not supported by this provider. Showing files held in local app trash.
                </span>
              </>
            ) : (
              <>
                <span className="flex h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                <span className="text-muted-foreground">
                  Showing trash items across all connected cloud accounts.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* File List / Grid Container */}
      <div className="flex-1 overflow-y-auto relative z-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Fetching cloud metadata...</span>
            </div>
          </div>
        ) : error && files.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px] text-xs p-6">
            <div className="flex flex-col items-center gap-3 max-w-md text-center p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Failed to Connect to Storage</h4>
                <p className="text-xs text-muted-foreground mt-1 break-words leading-relaxed font-mono text-[11px] bg-muted/40 p-2 rounded-lg border border-border/60">
                  {error}
                </p>
              </div>
              <button
                onClick={() => activeAccountId && loadFiles(activeAccountId, currentPath, true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs mt-1"
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        ) : files.length > 0 ? (
          viewMode === 'grid' ? (
            <FileGrid files={files} mode={mode} onContextMenu={handleContextMenu} />
          ) : (
            <FileList files={files} mode={mode} onContextMenu={handleContextMenu} />
          )
        ) : (
          <EmptyState
            type={
              mode === 'favorites'
                ? 'favorites'
                : mode === 'trash'
                ? 'trash'
                : mode === 'recent'
                ? 'recent'
                : mode === 'shared'
                ? 'shared'
                : 'folder'
            }
            onAction={mode === 'files' ? () => setNewFolderOpen(true) : undefined}
            actionLabel={mode === 'files' ? 'New Folder' : undefined}
          />
        )}
      </div>

      {/* Floating Batch Selection Dock */}
      {selectedFileIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 border border-border shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-border/80">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-bold text-foreground">
              {selectedFileIds.length} item{selectedFileIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchTransfer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
            >
              <span>Transfer to Cloud</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors"
            >
              <span>Delete</span>
            </button>

            <button
              onClick={clearSelection}
              title="Clear selection"
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
            >
              <span className="text-xs font-semibold">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          mode={mode}
          onClose={() => setContextMenu(null)}
          onRename={handleOpenRename}
        />
      )}

      {/* New Folder Modal */}
      <Modal
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="Create New Folder"
        description="Enter the name for your new folder"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
          <input
            type="text"
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full h-9 px-3 bg-muted/60 border border-border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewFolderOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Item"
        description={`Current name: ${fileToRename?.name || ''}`}
        maxWidth="sm"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <input
            type="text"
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="New name"
            className="w-full h-9 px-3 bg-muted/60 border border-border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newFileName.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Rename
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
