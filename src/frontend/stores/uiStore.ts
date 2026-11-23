import { create } from 'zustand';
import { CloudFile } from '../types/file';

export type NavigationPage =
  | 'home'
  | 'clouds'
  | 'files'
  | 'recent'
  | 'favorites'
  | 'shared'
  | 'transfers'
  | 'trash'
  | 'settings';

export type ModalType = 'add-cloud' | 'transfer' | 'properties' | 'new-folder' | 'rename' | null;

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  icon?: 'trash' | 'disconnect' | 'alert' | 'info';
  itemName?: string;
  itemType?: string;
  hint?: string;
  onConfirm: () => Promise<void> | void;
}

interface UiState {
  activePage: NavigationPage;
  activeModal: ModalType;
  selectedFileForProperties: CloudFile | null;
  filesToTransfer: CloudFile[];
  toasts: ToastItem[];
  confirmDialog: ConfirmDialogOptions | null;
  sidebarCollapsed: boolean;

  setActivePage: (page: NavigationPage) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  openProperties: (file: CloudFile) => void;
  openTransferModal: (files: CloudFile[]) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  showConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activePage: 'home',
  activeModal: null,
  selectedFileForProperties: null,
  filesToTransfer: [],
  toasts: [],
  confirmDialog: null,
  sidebarCollapsed: localStorage.getItem('anycloud-sidebar-collapsed') === 'true',

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem('anycloud-sidebar-collapsed', String(next));
      return { sidebarCollapsed: next };
    }),

  setSidebarCollapsed: (collapsed: boolean) => {
    localStorage.setItem('anycloud-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  showConfirmDialog: (options) => set({ confirmDialog: options }),
  closeConfirmDialog: () => set({ confirmDialog: null }),

  setActivePage: (page) => set({ activePage: page }),

  openModal: (modal) => set({ activeModal: modal }),

  closeModal: () =>
    set({
      activeModal: null,
      selectedFileForProperties: null,
      filesToTransfer: [],
    }),

  openProperties: (file) =>
    set({
      activeModal: 'properties',
      selectedFileForProperties: file,
    }),

  openTransferModal: (files) =>
    set({
      activeModal: 'transfer',
      filesToTransfer: files,
    }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
