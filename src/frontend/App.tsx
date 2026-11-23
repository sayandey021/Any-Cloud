import React, { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { setupEventListeners } from './services/eventListener';
import { useAccountStore } from './stores/accountStore';
import { useFileStore } from './stores/fileStore';
import { useThemeStore } from './stores/themeStore';
import { useTransferStore } from './stores/transferStore';
import { useUiStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';

export const App: React.FC = () => {
  const { initTheme } = useThemeStore();
  const { loadAccounts, checkRclone, activeAccountId } = useAccountStore();
  const { loadFiles, currentPath } = useFileStore();
  const { updateProgress, markCompleted, loadTransfers } = useTransferStore();
  const { addToast, setActivePage } = useUiStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    // 1. Initialize Theme (dark/light/system)
    initTheme();

    // 2. Set default startup view from settings
    if (settings.defaultStartupView && settings.defaultStartupView !== 'home') {
      setActivePage(settings.defaultStartupView);
    }

    // 3. Initial Data Loading
    loadAccounts();
    checkRclone();
    loadTransfers();

    // 4. Register Tauri Event Listeners
    const cleanupPromise = setupEventListeners({
      onProgress: (progress) => {
        updateProgress(progress);
      },
      onTransferComplete: (payload) => {
        markCompleted(payload.transfer_id, payload.success, payload.error);
        if (payload.success) {
          if (useSettingsStore.getState().settings.notifyOnTransferComplete) {
            addToast({
              type: 'success',
              title: 'Transfer Completed',
              message: `Transfer ${payload.transfer_id.slice(0, 8)} finished successfully`,
            });
          }
          // Refresh file list if in active cloud
          if (activeAccountId) {
            loadFiles(activeAccountId, currentPath, true);
          }
        } else {
          addToast({
            type: 'error',
            title: 'Transfer Failed',
            message: payload.error || 'An error occurred during transfer',
          });
        }
      },
      onAccountSynced: (payload) => {
        addToast({
          type: 'info',
          title: 'Sync Completed',
          message: `Indexed ${payload.total_files_synced} items into local database`,
        });
        loadAccounts();
      },
    });

    return () => {
      cleanupPromise.then((cleanup) => cleanup());
    };
  }, []);

  return <AppShell />;
};

export default App;
