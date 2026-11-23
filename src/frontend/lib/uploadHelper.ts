import { useAccountStore } from '../stores/accountStore';
import { useFileStore } from '../stores/fileStore';
import { useTransferStore } from '../stores/transferStore';
import { useUiStore } from '../stores/uiStore';

/**
 * Uploads one or more local files (specified by absolute local paths)
 * to the currently active cloud storage account at the current folder path.
 */
export async function uploadFiles(localPaths: string[]): Promise<boolean> {
  if (!localPaths || localPaths.length === 0) {
    return false;
  }

  const { accounts, activeAccountId } = useAccountStore.getState();
  const { currentPath, loadFiles } = useFileStore.getState();
  const { addToast } = useUiStore.getState();
  const { startTransfer } = useTransferStore.getState();

  const currentAccount = accounts.find((a) => a.id === activeAccountId);
  if (!currentAccount) {
    addToast({
      type: 'error',
      title: 'Upload Failed',
      message: 'No active cloud storage account selected.',
    });
    return false;
  }

  // Normalize current folder path (remove leading/trailing slashes)
  const normalizedParent = currentPath.trim().replace(/^\/+|\/+$/g, '');

  let queuedCount = 0;
  for (const rawPath of localPaths) {
    const cleanLocal = rawPath.trim();
    if (!cleanLocal) continue;

    // Extract filename from Windows backslash or Unix forward slash
    const parts = cleanLocal.replace(/\\/g, '/').split('/').filter(Boolean);
    const fileName = parts[parts.length - 1] || 'uploaded_file';

    // Build remote destination path inside active folder
    const destPath = normalizedParent ? `${normalizedParent}/${fileName}` : fileName;

    try {
      await startTransfer({
        name: fileName,
        transfer_type: 'Upload',
        source_remote: '',
        source_path: cleanLocal,
        dest_remote: currentAccount.name,
        dest_path: destPath,
        conflict_strategy: 'Replace',
      });
      queuedCount++;
    } catch (err: any) {
      console.error('Failed to initiate upload for', cleanLocal, err);
      addToast({
        type: 'error',
        title: `Upload Failed: ${fileName}`,
        message: err.message || 'Error scheduling upload task',
      });
    }
  }

  if (queuedCount > 0) {
    const targetLabel = currentAccount.label || currentAccount.name;
    const destDisplay = normalizedParent ? `${targetLabel} / ${normalizedParent}` : targetLabel;
    addToast({
      type: 'success',
      title: queuedCount === 1 ? 'Upload Started' : `${queuedCount} Uploads Started`,
      message:
        queuedCount === 1
          ? `Uploading "${localPaths[0].replace(/\\/g, '/').split('/').pop()}" to ${destDisplay}`
          : `Queued ${queuedCount} items for upload to ${destDisplay}`,
    });
    return true;
  }

  return false;
}
