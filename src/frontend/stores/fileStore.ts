import { create } from 'zustand';
import { getFileCategory } from '../lib/utils';
import { tauriApi } from '../services/tauriClient';
import { useAccountStore } from './accountStore';
import { useSettingsStore } from './settingsStore';
import { CloudFile, FileTypeFilter, SortDirection, SortField, ViewMode } from '../types/file';

export const getParentPath = (path: string): string => {
  const cleaned = path.trim().replace(/^\/+|\/+$/g, '');
  if (!cleaned) return '';
  const parts = cleaned.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
};

export interface NavigationHistoryEntry {
  accountId: string;
  path: string;
}

interface FileState {
  currentPath: string;
  files: CloudFile[];
  selectedFileIds: string[];
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
  filterType: FileTypeFilter;
  searchQuery: string;
  isFromCache: boolean;
  isLoading: boolean;
  error: string | null;

  // Navigation History
  history: NavigationHistoryEntry[];
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;

  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  goUp: () => Promise<void>;
  resetHistory: (accountId?: string, initialPath?: string) => void;

  loadFiles: (
    accountId: string,
    path: string,
    refresh?: boolean,
    recordHistory?: boolean
  ) => Promise<void>;
  loadRecentFiles: () => Promise<void>;
  loadFavoriteFiles: () => Promise<void>;
  loadTrashFiles: (accountId?: string) => Promise<void>;
  loadSharedFiles: (accountId?: string, path?: string) => Promise<void>;
  restoreFile: (accountId: string, remotePath: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  searchFiles: (query: string, accountId?: string) => Promise<void>;
  createFolder: (accountId: string, folderName: string) => Promise<void>;
  deleteFile: (accountId: string, remotePath: string, isDir: boolean, permanent?: boolean) => Promise<void>;
  renameFile: (accountId: string, oldPath: string, newPath: string) => Promise<void>;
  toggleFavorite: (fileId: string) => Promise<void>;
  setCurrentPath: (path: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSorting: (field: SortField, direction?: SortDirection) => void;
  setFilterType: (filter: FileTypeFilter) => void;
  setSearchQuery: (query: string) => void;
  selectFile: (fileId: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearFiles: () => void;
  getFilteredAndSortedFiles: (mode?: string) => CloudFile[];
}

export const useFileStore = create<FileState>((set, get) => ({
  currentPath: '',
  files: [],
  selectedFileIds: [],
  viewMode:
    (localStorage.getItem('anycloud-viewmode') as ViewMode) ||
    useSettingsStore.getState().settings.defaultFileView ||
    'grid',
  sortField: 'name',
  sortDirection: 'asc',
  filterType: 'all',
  searchQuery: '',
  isFromCache: false,
  isLoading: false,
  error: null,

  // Navigation History State
  history: [],
  historyIndex: 0,
  canGoBack: false,
  canGoForward: false,
  canGoUp: false,

  clearFiles: () => {
    set({
      files: [],
      selectedFileIds: [],
      currentPath: '',
      error: null,
      history: [],
      historyIndex: 0,
      canGoBack: false,
      canGoForward: false,
      canGoUp: false,
    });
  },

  resetHistory: (accountId = '', initialPath = '') => {
    const normalized = initialPath.trim().replace(/^\/+|\/+$/g, '');
    set({
      history: accountId ? [{ accountId, path: normalized }] : [],
      historyIndex: 0,
      canGoBack: normalized !== '',
      canGoForward: false,
      canGoUp: normalized !== '',
    });
  },

  goBack: async () => {
    const { history, historyIndex, currentPath } = get();
    const activeAccountId = useAccountStore.getState().activeAccountId;

    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const target = history[targetIndex];
      set({
        historyIndex: targetIndex,
        canGoBack: targetIndex > 0 || target.path !== '',
        canGoForward: true,
        canGoUp: target.path !== '',
      });
      if (target.accountId && target.accountId !== activeAccountId) {
        useAccountStore.getState().setActiveAccount(target.accountId);
      }
      await get().loadFiles(target.accountId || activeAccountId || '', target.path, false, false);
    } else if (currentPath !== '' && activeAccountId) {
      // Fallback: if at historyIndex 0 but currentPath is not root, go to parent directory
      const parent = getParentPath(currentPath);
      await get().loadFiles(activeAccountId, parent, false, true);
    }
  },

  goForward: async () => {
    const { history, historyIndex } = get();
    const activeAccountId = useAccountStore.getState().activeAccountId;

    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const target = history[targetIndex];
      set({
        historyIndex: targetIndex,
        canGoBack: true,
        canGoForward: targetIndex < history.length - 1,
        canGoUp: target.path !== '',
      });
      if (target.accountId && target.accountId !== activeAccountId) {
        useAccountStore.getState().setActiveAccount(target.accountId);
      }
      await get().loadFiles(target.accountId || activeAccountId || '', target.path, false, false);
    }
  },

  goUp: async () => {
    const { currentPath } = get();
    const activeAccountId = useAccountStore.getState().activeAccountId;
    if (currentPath !== '' && activeAccountId) {
      const parent = getParentPath(currentPath);
      await get().loadFiles(activeAccountId, parent, false, true);
    }
  },

  loadFiles: async (accountId, path, refresh = false, recordHistory = true) => {
    const normalizedPath = path.trim().replace(/^\/+|\/+$/g, '');

    // History management
    if (recordHistory && accountId) {
      const state = get();
      const currentEntry = state.history[state.historyIndex];
      const isSameAsCurrent =
        currentEntry &&
        currentEntry.accountId === accountId &&
        currentEntry.path === normalizedPath;

      if (!isSameAsCurrent) {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ accountId, path: normalizedPath });
        const newIndex = newHistory.length - 1;
        set({
          history: newHistory,
          historyIndex: newIndex,
          canGoBack: newIndex > 0 || normalizedPath !== '',
          canGoForward: false,
          canGoUp: normalizedPath !== '',
        });
      }
    } else {
      const state = get();
      set({
        canGoBack: state.historyIndex > 0 || normalizedPath !== '',
        canGoForward: state.historyIndex < state.history.length - 1,
        canGoUp: normalizedPath !== '',
      });
    }

    set({ isLoading: true, error: null, currentPath: normalizedPath, selectedFileIds: [] });
    try {
      const res = await tauriApi.listFiles(accountId, normalizedPath, refresh);
      set({ files: res.files, isFromCache: res.is_from_cache, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to list files', isLoading: false });
    }
  },

  loadRecentFiles: async () => {
    set({ isLoading: true, error: null, currentPath: '', selectedFileIds: [] });
    try {
      const recents = await tauriApi.getRecentFiles(50);
      set({ files: recents, isLoading: false, isFromCache: true });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load recent files', isLoading: false });
    }
  },

  loadFavoriteFiles: async () => {
    set({ isLoading: true, error: null, currentPath: '', selectedFileIds: [] });
    try {
      const favs = await tauriApi.getFavoriteFiles();
      set({ files: favs, isLoading: false, isFromCache: true });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load favorite files', isLoading: false });
    }
  },

  loadTrashFiles: async (accountId?: string) => {
    set({ isLoading: true, error: null, currentPath: '', selectedFileIds: [] });
    try {
      const trash = await tauriApi.getTrashFiles(accountId);
      set({ files: trash, isLoading: false, isFromCache: true });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load trash files', isLoading: false });
    }
  },

  loadSharedFiles: async (accountId?: string, path?: string) => {
    set({ isLoading: true, error: null, currentPath: path || '', selectedFileIds: [] });
    try {
      const shared = await tauriApi.getSharedFiles(accountId, path);
      set({ files: shared, isLoading: false, isFromCache: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load shared files', isLoading: false });
    }
  },

  restoreFile: async (accountId: string, remotePath: string) => {
    // Optimistic UI update: immediately remove restored file from Trash view
    const prevFiles = get().files;
    const prevSelected = get().selectedFileIds;

    set((state) => ({
      files: state.files.filter((f) => !(f.account_id === accountId && (f.remote_path === remotePath || f.name === remotePath))),
      selectedFileIds: state.selectedFileIds.filter((id) => {
        const item = prevFiles.find((f) => f.id === id);
        return item ? !(item.account_id === accountId && (item.remote_path === remotePath || item.name === remotePath)) : true;
      }),
    }));

    try {
      await tauriApi.restoreFile(accountId, remotePath);
    } catch (err: any) {
      set({ files: prevFiles, selectedFileIds: prevSelected, error: err.message || 'Failed to restore file' });
    }
  },

  emptyTrash: async () => {
    const prevFiles = get().files;
    const prevSelected = get().selectedFileIds;
    set({ files: [], selectedFileIds: [] });
    try {
      await tauriApi.emptyTrash();
    } catch (err: any) {
      set({ files: prevFiles, selectedFileIds: prevSelected, error: err.message || 'Failed to empty trash' });
    }
  },

  searchFiles: async (query, accountId) => {
    if (!query.trim()) {
      return;
    }
    set({ isLoading: true, searchQuery: query, selectedFileIds: [] });
    try {
      const results = await tauriApi.searchFiles(query, accountId);
      set({ files: results, isLoading: false, isFromCache: true });
    } catch (err: any) {
      set({ error: err.message || 'Search failed', isLoading: false });
    }
  },

  createFolder: async (accountId, folderName) => {
    try {
      const { currentPath } = get();
      await tauriApi.createFolder(accountId, currentPath, folderName);
      await get().loadFiles(accountId, currentPath, true);
    } catch (err: any) {
      set({ error: err.message || 'Failed to create folder' });
    }
  },

  deleteFile: async (accountId, remotePath, isDir, permanent = false) => {
    // Optimistic UI update: immediately remove from current view & selection for 0ms latency
    const prevFiles = get().files;
    const prevSelected = get().selectedFileIds;

    set((state) => ({
      files: state.files.filter((f) => f.remote_path !== remotePath && f.name !== remotePath),
      selectedFileIds: state.selectedFileIds.filter((id) => {
        const item = prevFiles.find((f) => f.id === id);
        return item ? (item.remote_path !== remotePath && item.name !== remotePath) : true;
      }),
    }));

    try {
      await tauriApi.deleteFile(accountId, remotePath, isDir, permanent);
    } catch (err: any) {
      set({ files: prevFiles, selectedFileIds: prevSelected, error: err.message || 'Failed to delete file' });
    }
  },

  renameFile: async (accountId, oldPath, newPath) => {
    try {
      await tauriApi.renameFile(accountId, oldPath, newPath);
      await get().loadFiles(accountId, get().currentPath, true);
    } catch (err: any) {
      set({ error: err.message || 'Failed to rename file' });
    }
  },

  toggleFavorite: async (fileId) => {
    const file = get().files.find((f) => f.id === fileId);
    if (!file) return;
    const newFav = !file.is_favorite;
    await tauriApi.toggleFavorite(fileId, newFav);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, is_favorite: newFav } : f)),
    }));
  },

  setCurrentPath: (path) => {
    set({ currentPath: path });
  },

  setViewMode: (mode) => {
    localStorage.setItem('anycloud-viewmode', mode);
    set({ viewMode: mode });
  },

  setSorting: (field, direction) => {
    const currentField = get().sortField;
    const currentDir = get().sortDirection;
    const newDir = direction || (currentField === field ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc');
    set({ sortField: field, sortDirection: newDir });
  },

  setFilterType: (filter) => {
    set({ filterType: filter });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  selectFile: (fileId, multi = false) => {
    set((state) => {
      if (multi) {
        const exists = state.selectedFileIds.includes(fileId);
        return {
          selectedFileIds: exists
            ? state.selectedFileIds.filter((id) => id !== fileId)
            : [...state.selectedFileIds, fileId],
        };
      }
      return { selectedFileIds: [fileId] };
    });
  },

  selectAll: (mode?: string) => {
    set((state) => ({
      selectedFileIds: state.getFilteredAndSortedFiles(mode).map((f) => f.id),
    }));
  },

  clearSelection: () => {
    set({ selectedFileIds: [] });
  },

  getFilteredAndSortedFiles: (mode?: string) => {
    const { files, filterType, sortField, sortDirection } = get();
    const { showHiddenFiles } = useSettingsStore.getState().settings;

    // 1. Filter by mode
    let filtered = files;
    if (mode === 'favorites') {
      filtered = filtered.filter((f) => f.is_favorite && !f.is_trash);
    } else if (mode === 'trash') {
      filtered = filtered.filter((f) => f.is_trash);
    } else {
      filtered = filtered.filter((f) => !f.is_trash);
    }

    // Filter hidden dotfiles if disabled in settings
    if (!showHiddenFiles) {
      filtered = filtered.filter((f) => !f.name.startsWith('.'));
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((f) => {
        if (f.is_dir) return filterType === 'folders';
        const cat = getFileCategory(f.name, f.mime_type);
        if (filterType === 'documents') return cat === 'document' || cat === 'code';
        if (filterType === 'images') return cat === 'image';
        if (filterType === 'media') return cat === 'media';
        if (filterType === 'archives') return cat === 'archive';
        return true;
      });
    }

    // 2. Sort (folders always first)
    return [...filtered].sort((a, b) => {
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }

      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'mod_time': {
          const tA = a.mod_time ? new Date(a.mod_time).getTime() : 0;
          const tB = b.mod_time ? new Date(b.mod_time).getTime() : 0;
          cmp = tA - tB;
          break;
        }
        case 'type': {
          const catA = a.is_dir ? '0_folder' : getFileCategory(a.name, a.mime_type);
          const catB = b.is_dir ? '0_folder' : getFileCategory(b.name, b.mime_type);
          cmp = catA.localeCompare(catB);
          break;
        }
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  },
}));
