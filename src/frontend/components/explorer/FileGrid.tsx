import React from 'react';
import { Star } from 'lucide-react';
import { cn, formatBytes, formatDate } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudFile } from '../../types/file';
import { FileIcon } from '../ui/Icons';
import { Checkbox } from '../ui/Checkbox';
import { tauriApi } from '../../services/tauriClient';

export const FileGrid: React.FC<{
  files: CloudFile[];
  mode?: string;
  onContextMenu: (e: React.MouseEvent, file: CloudFile) => void;
}> = ({ files, mode, onContextMenu }) => {
  const { activeAccountId } = useAccountStore();
  const { selectedFileIds, selectFile, loadFiles, loadSharedFiles, toggleFavorite } = useFileStore();
  const { openProperties, openTransferModal } = useUiStore();

  const handleDoubleClick = (file: CloudFile) => {
    const accId = file.account_id || activeAccountId;
    if (file.is_dir && accId) {
      if (mode === 'shared') {
        loadSharedFiles(accId, file.remote_path);
      } else {
        loadFiles(accId, file.remote_path);
      }
    } else {
      if (accId) {
        tauriApi.openLocalFile(accId, file.remote_path).catch(() => {});
      }
      openProperties(file);
    }
  };

  const handleClick = (e: React.MouseEvent, file: CloudFile) => {
    e.stopPropagation();
    selectFile(file.id, e.ctrlKey || e.metaKey || e.shiftKey);
  };

  const handleDragStart = (e: React.DragEvent, file: CloudFile) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolder: CloudFile) => {
    e.preventDefault();
    if (!targetFolder.is_dir) return;

    try {
      const draggedData = e.dataTransfer.getData('text/plain');
      if (draggedData) {
        const draggedFile: CloudFile = JSON.parse(draggedData);
        if (draggedFile.id !== targetFolder.id) {
          openTransferModal([draggedFile]);
        }
      }
    } catch {
      // Ignore invalid drag payload
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4 select-none">
      {files.map((file) => {
        const isSelected = selectedFileIds.includes(file.id);

        return (
          <div
            key={file.id}
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={file.is_dir ? handleDragOver : undefined}
            onDrop={file.is_dir ? (e) => handleDropOnFolder(e, file) : undefined}
            onClick={(e) => handleClick(e, file)}
            onDoubleClick={() => handleDoubleClick(file)}
            onContextMenu={(e) => onContextMenu(e, file)}
            className={cn(
              'group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none',
              isSelected
                ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xs'
                : 'bg-card border-border/80 hover:bg-accent/40 hover:border-border shadow-xs hover:shadow-sm'
            )}
          >
            {/* Top Bar: Checkbox & Star */}
            <div className="flex items-center justify-between mb-1.5">
              <Checkbox
                checked={isSelected}
                onChange={() => selectFile(file.id, true)}
                ariaLabel={`Select ${file.name}`}
                className={cn(
                  'transition-opacity',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              />

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {file.is_dir ? 'Folder' : formatBytes(file.size)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(file.id);
                  }}
                  className={cn(
                    'p-1 rounded-md transition-opacity',
                    file.is_favorite
                      ? 'opacity-100 text-amber-500'
                      : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500'
                  )}
                >
                  <Star
                    size={14}
                    className={file.is_favorite ? 'text-amber-500 fill-amber-500' : ''}
                  />
                </button>
              </div>
            </div>

            {/* Icon Preview */}
            <div className="flex items-center justify-center py-3.5">
              <div className="w-14 h-14 rounded-2xl bg-accent/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-150">
                <FileIcon
                  isDir={file.is_dir}
                  name={file.name}
                  mimeType={file.mime_type}
                  size={32}
                />
              </div>
            </div>

            {/* Name & Timestamp */}
            <div className="mt-1">
              <p
                title={file.name}
                className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
              >
                {file.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {formatDate(file.mod_time)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
