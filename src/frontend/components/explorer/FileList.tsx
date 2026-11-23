import React from 'react';
import { ArrowDownAZ, ArrowDownZA, Star } from 'lucide-react';
import { cn, formatBytes, formatDate, getFileCategory } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore } from '../../stores/uiStore';
import { CloudFile, SortField } from '../../types/file';
import { FileIcon, ProviderIcon } from '../ui/Icons';
import { Checkbox } from '../ui/Checkbox';
import { tauriApi } from '../../services/tauriClient';

export const FileList: React.FC<{
  files: CloudFile[];
  mode?: string;
  onContextMenu: (e: React.MouseEvent, file: CloudFile) => void;
}> = ({ files, mode, onContextMenu }) => {
  const { accounts, activeAccountId } = useAccountStore();
  const {
    selectedFileIds,
    selectFile,
    selectAll,
    clearSelection,
    loadFiles,
    loadSharedFiles,
    toggleFavorite,
    sortField,
    sortDirection,
    setSorting,
  } = useFileStore();
  const { openProperties } = useUiStore();

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

  const handleRowClick = (e: React.MouseEvent, file: CloudFile) => {
    e.stopPropagation();
    selectFile(file.id, e.ctrlKey || e.metaKey || e.shiftKey);
  };

  const handleHeaderSort = (field: SortField) => {
    setSorting(field);
  };

  const allSelected = files.length > 0 && files.every((f) => selectedFileIds.includes(f.id));
  const someSelected =
    files.length > 0 && files.some((f) => selectedFileIds.includes(f.id)) && !allSelected;

  return (
    <div className="w-full select-none overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border/80 text-muted-foreground font-semibold bg-muted/20">
            <th className="py-2.5 px-3 w-8">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(checked) =>
                  checked
                    ? useFileStore.setState({ selectedFileIds: files.map((f) => f.id) })
                    : clearSelection()
                }
                ariaLabel="Select all files"
              />
            </th>
            <th
              onClick={() => handleHeaderSort('name')}
              className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Name</span>
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ArrowDownAZ size={13} /> : <ArrowDownZA size={13} />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 hidden md:table-cell">Cloud</th>
            <th
              onClick={() => handleHeaderSort('size')}
              className="py-2.5 px-3 w-28 cursor-pointer hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Size</span>
                {sortField === 'size' && (
                  sortDirection === 'asc' ? <ArrowDownAZ size={13} /> : <ArrowDownZA size={13} />
                )}
              </div>
            </th>
            <th
              onClick={() => handleHeaderSort('type')}
              className="py-2.5 px-3 w-28 hidden sm:table-cell cursor-pointer hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Type</span>
                {sortField === 'type' && (
                  sortDirection === 'asc' ? <ArrowDownAZ size={13} /> : <ArrowDownZA size={13} />
                )}
              </div>
            </th>
            <th
              onClick={() => handleHeaderSort('mod_time')}
              className="py-2.5 px-3 w-36 cursor-pointer hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Modified</span>
                {sortField === 'mod_time' && (
                  sortDirection === 'asc' ? <ArrowDownAZ size={13} /> : <ArrowDownZA size={13} />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 w-10 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {files.map((file) => {
            const isSelected = selectedFileIds.includes(file.id);
            const account = accounts.find((a) => a.id === file.account_id);

            return (
              <tr
                key={file.id}
                onClick={(e) => handleRowClick(e, file)}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => onContextMenu(e, file)}
                className={cn(
                  'group transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 hover:bg-primary/15'
                    : 'hover:bg-accent/40'
                )}
              >
                <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => selectFile(file.id, true)}
                    ariaLabel={`Select ${file.name}`}
                  />
                </td>
                <td className="py-2.5 px-3 font-medium text-foreground">
                  <div className="flex items-center gap-2.5 truncate max-w-sm">
                    <FileIcon
                      isDir={file.is_dir}
                      name={file.name}
                      mimeType={file.mime_type}
                      size={18}
                    />
                    <span className="truncate group-hover:text-primary transition-colors">
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">
                  {account ? (
                    <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                      <ProviderIcon provider={account.provider} size={14} />
                      <span className="truncate">{account.label || account.name}</span>
                    </div>
                  ) : (
                    '--'
                  )}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                  {file.is_dir ? '--' : formatBytes(file.size)}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground capitalize hidden sm:table-cell whitespace-nowrap">
                  {file.is_dir ? 'Folder' : getFileCategory(file.name, file.mime_type)}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(file.mod_time)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(file.id);
                    }}
                    className={cn(
                      'p-1 rounded transition-opacity',
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
