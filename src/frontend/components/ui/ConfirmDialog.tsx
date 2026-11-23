import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  HardDrive,
  Info,
  ShieldCheck,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';

export const ConfirmDialog: React.FC = () => {
  const { confirmDialog, closeConfirmDialog } = useUiStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!confirmDialog) return;
      if (e.key === 'Escape' && !isSubmitting) {
        closeConfirmDialog();
      } else if (e.key === 'Enter' && !isSubmitting && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, isSubmitting]);

  if (!confirmDialog) return null;

  const {
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    icon = 'trash',
    itemName,
    itemType,
    hint,
    onConfirm,
  } = confirmDialog;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      closeConfirmDialog();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBadge = () => {
    switch (icon) {
      case 'disconnect':
        return (
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center shadow-xs">
              <Unlink size={22} className="stroke-[2.2]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-amber-500 shadow-xs">
              <HardDrive size={11} />
            </div>
          </div>
        );
      case 'alert':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle size={22} className="stroke-[2.2]" />
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-xs">
            <Info size={22} className="stroke-[2.2]" />
          </div>
        );
      case 'trash':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/25 flex items-center justify-center shrink-0 shadow-xs">
            <Trash2 size={22} className="stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-dialog-overlay"
        onClick={() => {
          if (!isSubmitting) closeConfirmDialog();
        }}
      />

      {/* Dialog Body */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-3xl bg-card border border-border/90 shadow-2xl p-6 text-foreground z-10 animate-dialog-content backdrop-blur-xl"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            if (!isSubmitting) closeConfirmDialog();
          }}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
          disabled={isSubmitting}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Dialog Header */}
        <div className="flex items-start gap-4">
          {renderBadge()}

          <div className="flex-1 min-w-0 pr-4">
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold tracking-tight text-foreground leading-snug"
            >
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Target Item Highlight (if provided) */}
        {itemName && (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-accent/60 border border-border/70 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate block">
                {itemName}
              </span>
              {itemType && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  {itemType}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reassuring Hint / Safety Callout */}
        {icon === 'disconnect' ? (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              {hint || 'Your cloud files will remain safe and untouched. Only the local cached index and credentials are removed from this device.'}
            </p>
          </div>
        ) : icon === 'trash' && hint ? (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-700 dark:text-rose-400">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              {hint}
            </p>
          </div>
        ) : hint ? (
          <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-accent/80 border border-border flex items-start gap-2.5 text-muted-foreground">
            <Info size={16} className="shrink-0 mt-0.5 text-primary" />
            <p className="text-[11px] leading-relaxed">
              {hint}
            </p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) closeConfirmDialog();
            }}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent border border-border/70 transition-all duration-150 disabled:opacity-50"
          >
            <span>{cancelText}</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-muted text-muted-foreground/80 rounded border border-border/50">
              Esc
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 shadow-sm disabled:opacity-50',
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 hover:shadow-md hover:shadow-rose-600/35 active:scale-[0.98]'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25 active:scale-[0.98]'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 active:scale-[0.98]'
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{confirmText}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white/20 text-white rounded">
                  ↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
