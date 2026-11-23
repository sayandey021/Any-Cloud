import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Clock,
  Folder,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHorizontalScroll } from '../../lib/useHorizontalScroll';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { NavigationPage } from '../../stores/uiStore';
import { ProviderIcon } from '../ui/Icons';

export const BreadcrumbBar: React.FC<{ mode?: NavigationPage }> = ({ mode = 'files' }) => {
  const { accounts, activeAccountId } = useAccountStore();
  const {
    currentPath,
    loadFiles,
    loadSharedFiles,
    canGoBack,
    canGoForward,
    canGoUp,
    goBack,
    goForward,
    goUp,
  } = useFileStore();
  const scrollRef = useHorizontalScroll<HTMLDivElement>();

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  // Split path: "Documents/Work/Projects" -> ["Documents", "Work", "Projects"]
  const segments = currentPath
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  const handleNavigate = (index: number) => {
    if (!activeAccountId) return;
    if (index === -1) {
      loadFiles(activeAccountId, '');
    } else {
      const targetPath = segments.slice(0, index + 1).join('/');
      loadFiles(activeAccountId, targetPath);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/70 bg-card/40 backdrop-blur-xs text-xs select-none min-h-[38px] shrink-0">
      {/* Navigation Buttons Cluster: Back, Forward, Up */}
      <div className="flex items-center gap-0.5 shrink-0 bg-muted/40 p-0.5 rounded-lg border border-border/60">
        <button
          type="button"
          onClick={() => canGoBack && goBack()}
          disabled={!canGoBack}
          title="Back (Alt+Left or Mouse 4)"
          className={cn(
            'p-1.5 rounded-md transition-all flex items-center justify-center',
            canGoBack
              ? 'hover:bg-accent text-foreground hover:shadow-2xs active:scale-95 cursor-pointer'
              : 'text-muted-foreground/30 cursor-not-allowed opacity-40'
          )}
          aria-label="Back"
        >
          <ArrowLeft size={14} className="stroke-[2.2]" />
        </button>

        <button
          type="button"
          onClick={() => canGoForward && goForward()}
          disabled={!canGoForward}
          title="Forward (Alt+Right or Mouse 5)"
          className={cn(
            'p-1.5 rounded-md transition-all flex items-center justify-center',
            canGoForward
              ? 'hover:bg-accent text-foreground hover:shadow-2xs active:scale-95 cursor-pointer'
              : 'text-muted-foreground/30 cursor-not-allowed opacity-40'
          )}
          aria-label="Forward"
        >
          <ArrowRight size={14} className="stroke-[2.2]" />
        </button>

        <button
          type="button"
          onClick={() => canGoUp && goUp()}
          disabled={!canGoUp}
          title="Up to Parent Folder (Backspace or Alt+Up)"
          className={cn(
            'p-1.5 rounded-md transition-all flex items-center justify-center',
            canGoUp
              ? 'hover:bg-accent text-foreground hover:shadow-2xs active:scale-95 cursor-pointer'
              : 'text-muted-foreground/30 cursor-not-allowed opacity-40'
          )}
          aria-label="Up to Parent Folder"
        >
          <ArrowUp size={14} className="stroke-[2.2]" />
        </button>
      </div>

      {/* Vertical Subtle Separator */}
      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* Breadcrumb Trail / Location Segment */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0"
      >
        {mode === 'files' ? (
          <>
            {/* Root Cloud Account */}
            {activeAccount && (
              <button
                type="button"
                onClick={() => handleNavigate(-1)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shrink-0 group',
                  segments.length === 0
                    ? 'bg-primary/10 text-primary border border-primary/25 shadow-2xs'
                    : 'text-foreground hover:bg-muted/70 hover:text-foreground border border-transparent'
                )}
                title={`Cloud root: ${activeAccount.label || activeAccount.name}`}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <ProviderIcon provider={activeAccount.provider} size={14} />
                </div>
                <span className="truncate max-w-[150px]">
                  {activeAccount.label || activeAccount.name}
                </span>
              </button>
            )}

            {/* Folder Segments */}
            {segments.map((seg, idx) => {
              const isLast = idx === segments.length - 1;
              return (
                <React.Fragment key={idx}>
                  <ChevronRight size={13} className="text-muted-foreground/50 shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleNavigate(idx)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0 max-w-[200px] text-xs',
                      isLast
                        ? 'font-bold text-foreground bg-accent/70 border border-border/80 shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium'
                    )}
                    title={seg}
                  >
                    <Folder
                      size={13}
                      className={cn(
                        'shrink-0',
                        isLast ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground/70'
                      )}
                    />
                    <span className="truncate">{seg}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          /* Special Navigation Mode Indicators */
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/30 border border-border/50 text-xs font-semibold text-foreground">
            {mode === 'recent' && (
              <>
                <Clock size={14} className="text-primary shrink-0" />
                <span>Recent Activity</span>
              </>
            )}
            {mode === 'favorites' && (
              <>
                <Star size={14} className="text-amber-500 fill-amber-500/20 shrink-0" />
                <span>Starred & Favorites</span>
              </>
            )}
            {mode === 'trash' && (
              <>
                <Trash2 size={14} className="text-rose-500 shrink-0" />
                <span>Trash Bin</span>
              </>
            )}
            {mode === 'shared' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Share2 size={14} className="text-blue-500 shrink-0" />
                <button
                  onClick={() => loadSharedFiles(activeAccountId || undefined, '')}
                  className="hover:text-foreground hover:underline transition-colors font-medium cursor-pointer"
                >
                  Shared With Me
                </button>
                {currentPath && (
                  <>
                    <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
                    <span className="text-foreground font-medium">{currentPath}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
