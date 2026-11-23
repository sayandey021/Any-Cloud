import { CloudFile } from '../types/file';
import { useAccountStore } from '../stores/accountStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTransferStore } from '../stores/transferStore';
import { useUiStore } from '../stores/uiStore';
import { tauriApi } from '../services/tauriClient';

/**
 * Downloads one or more cloud files to the user's local disk
 * using the configured default download folder or system Downloads path.
 */
export async function downloadFiles(filesToDownload: CloudFile[]): Promise<boolean> {
  if (!filesToDownload || filesToDownload.length === 0) {
    return false;
  }

  const { accounts, activeAccountId } = useAccountStore.getState();
  const { addToast } = useUiStore.getState();
  const { startTransfer } = useTransferStore.getState();
  const settings = useSettingsStore.getState().settings;

  const currentAccount = accounts.find((a) => a.id === activeAccountId);
  if (!currentAccount) {
    addToast({
      type: 'error',
      title: 'Download Failed',
      message: 'No active cloud storage account selected.',
    });
    return false;
  }

  if (currentAccount.provider === 'local') {
    addToast({
      type: 'info',
      title: 'Local Item',
      message: 'This item is already stored on your local disk.',
    });
    return false;
  }

  let downloadDir = settings.defaultDownloadPath;
  if (!downloadDir || downloadDir.trim() === '') {
    try {
      downloadDir = await tauriApi.getDefaultLocalPath();
    } catch {
      downloadDir = 'C:\\Downloads';
    }
  }

  // Normalize path separators to forward slashes for cross-platform compatibility
  const cleanDir = downloadDir.replace(/\\/g, '/').replace(/\/$/, '');

  let queuedCount = 0;
  for (const file of filesToDownload) {
    // If it's a directory or file, rclone copyto will transfer it to destination
    const destPath = `${cleanDir}/${file.name}`;
    try {
      await startTransfer({
        name: file.name,
        transfer_type: 'Download',
        source_remote: currentAccount.name,
        source_path: file.remote_path,
        dest_remote: '',
        dest_path: destPath,
        conflict_strategy: 'Replace',
        total_bytes: file.size,
      });
      queuedCount++;
    } catch (err: any) {
      console.error('Failed to initiate download for', file.name, err);
      addToast({
        type: 'error',
        title: `Download Failed: ${file.name}`,
        message: err.message || 'Error scheduling download task',
      });
    }
  }

  if (queuedCount > 0) {
    addToast({
      type: 'success',
      title: queuedCount === 1 ? 'Download Started' : `${queuedCount} Downloads Started`,
      message:
        queuedCount === 1
          ? `Downloading "${filesToDownload[0].name}" to ${downloadDir}`
          : `Queued ${queuedCount} items for download to ${downloadDir}`,
    });
    return true;
  }

  return false;
}
