import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppIcon } from '../ui/Icons';
import { APP_VERSION } from '../../version';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState(true);

  useEffect(() => {
    let unlistenResize: (() => void) | undefined;

    try {
      const appWindow = getCurrentWindow();
      if (!appWindow) {
        setIsTauriEnv(false);
        return;
      }

      appWindow
        .isMaximized()
        .then((max) => setIsMaximized(max))
        .catch(() => setIsTauriEnv(false));

      appWindow
        .onResized(async () => {
          try {
            const max = await appWindow.isMaximized();
            setIsMaximized(max);
          } catch {
            // ignore
          }
        })
        .then((cleanup) => {
          unlistenResize = cleanup;
        })
        .catch(() => {});
    } catch {
      setIsTauriEnv(false);
    }

    return () => {
      if (unlistenResize) {
        unlistenResize();
      }
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (err) {
      console.warn('Minimize not supported in this environment', err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
    } catch (err) {
      console.warn('Toggle maximize not supported in this environment', err);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (err) {
      console.warn('Close not supported in this environment', err);
    }
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleToggleMaximize}
      className="h-8 w-full bg-card/95 dark:bg-card/90 backdrop-blur-md border-b border-border/60 select-none flex items-center justify-between z-50 shrink-0 text-foreground"
    >
      {/* Left: App Branding (Draggable) */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 pl-3 h-full pointer-events-none"
      >
        <div className="w-4 h-4 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
          <AppIcon size={16} className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-semibold tracking-wide text-foreground/90">
          Any Cloud
        </span>
        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/80">
          v{APP_VERSION}
        </span>
      </div>

      {/* Center: Draggable Spacer */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full cursor-default"
        title="Double click to maximize or restore"
      />

      {/* Right: Window Controls */}
      <div className="flex items-center h-full no-drag">
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimize"
          className="w-11 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 active:bg-muted transition-colors duration-100"
        >
          <Minus size={13} className="stroke-[1.75]" />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="w-11 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 active:bg-muted transition-colors duration-100"
        >
          {isMaximized ? (
            <Copy size={11} className="stroke-[1.75] rotate-90" />
          ) : (
            <Square size={11} className="stroke-[1.75]" />
          )}
        </button>

        {/* Close (Native Windows red hover effect) */}
        <button
          type="button"
          onClick={handleClose}
          title="Close"
          className="w-11 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-[#e81123] active:bg-[#c4101f] transition-colors duration-100"
        >
          <X size={13} className="stroke-[2]" />
        </button>
      </div>
    </div>
  );
};
