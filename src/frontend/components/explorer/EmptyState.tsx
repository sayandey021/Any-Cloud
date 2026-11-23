import React from 'react';
import { Clock, FolderOpen, Search, Share2, Star, Trash2 } from 'lucide-react';

interface EmptyStateProps {
  type?: 'folder' | 'search' | 'favorites' | 'trash' | 'recent' | 'shared';
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'folder',
  message,
  onAction,
  actionLabel,
}) => {
  const icons = {
    folder: <FolderOpen size={40} className="text-muted-foreground/40" />,
    search: <Search size={40} className="text-muted-foreground/40" />,
    favorites: <Star size={40} className="text-amber-500/40" />,
    trash: <Trash2 size={40} className="text-muted-foreground/40" />,
    recent: <Clock size={40} className="text-blue-500/40" />,
    shared: <Share2 size={40} className="text-indigo-500/40" />,
  };

  const defaultMessages = {
    folder: 'This folder is empty.',
    search: 'No files match your search criteria.',
    favorites: 'No favorite files yet. Star files to find them quickly here.',
    trash: 'Trash is empty.',
    recent: 'No recent files found.',
    shared: 'No shared files found.',
  };

  const subtitles = {
    folder: 'Upload files or create subfolders to start organizing.',
    search: 'Try adjusting your search query or filters.',
    favorites: 'Click the star icon on any file to add it to your favorites.',
    trash: 'Items moved to trash will appear here before permanent deletion.',
    recent: 'Files you access, modify, or sync will appear here.',
    shared: 'Shared files and folders will appear here.',
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center mb-4 border border-border/60 shadow-xs">
        {icons[type]}
      </div>
      <h4 className="text-sm font-bold text-foreground">
        {message || defaultMessages[type]}
      </h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        {subtitles[type]}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
