import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSettingsStore } from '../stores/settingsStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  let unitSystem = 'binary';
  try {
    unitSystem = useSettingsStore.getState().settings.fileSizeUnit || 'binary';
  } catch {
    // fallback if store not yet initialized
  }

  const k = unitSystem === 'decimal' ? 1000 : 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes =
    unitSystem === 'decimal'
      ? ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
      : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || sizes[sizes.length - 1]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    let dateFormat = 'relative';
    try {
      dateFormat = useSettingsStore.getState().settings.dateFormat || 'relative';
    } catch {
      // fallback
    }

    if (dateFormat === 'relative') {
      const diffMs = Date.now() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || '';
  }
  return '';
}

export function getFileCategory(
  filename: string,
  mimeType?: string | null
): 'folder' | 'document' | 'image' | 'media' | 'archive' | 'code' | 'other' {
  const ext = getFileExtension(filename);
  const mime = mimeType?.toLowerCase() || '';

  if (mime.includes('directory')) return 'folder';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic'].includes(ext) || mime.startsWith('image/')) {
    return 'image';
  }

  if (['mp4', 'mkv', 'mov', 'avi', 'mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext) || mime.startsWith('video/') || mime.startsWith('audio/')) {
    return 'media';
  }

  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'md', 'csv'].includes(ext) || mime.includes('pdf') || mime.includes('document')) {
    return 'document';
  }

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
    return 'archive';
  }

  if (['rs', 'ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'go', 'cpp', 'c', 'h', 'yaml', 'toml'].includes(ext)) {
    return 'code';
  }

  return 'other';
}
