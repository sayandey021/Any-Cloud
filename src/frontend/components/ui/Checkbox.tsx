import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  className,
  size = 'md',
  ariaLabel,
  id,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !onChange) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || !onChange) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSizes = {
    sm: 9,
    md: 11,
    lg: 13,
  };

  const isMarked = checked || indeterminate;

  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border transition-all duration-150 shrink-0 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        sizeClasses[size],
        isMarked
          ? 'bg-primary border-primary text-primary-foreground shadow-xs shadow-primary/25 scale-100'
          : 'bg-card/70 border-border/90 hover:border-primary/60 hover:bg-accent/40 hover:shadow-xs active:scale-95',
        disabled && 'opacity-40 cursor-not-allowed hover:border-border hover:bg-card/70',
        className
      )}
    >
      {checked && (
        <Check
          size={iconSizes[size]}
          strokeWidth={3}
          className="text-primary-foreground animate-in zoom-in-75 duration-150"
        />
      )}
      {!checked && indeterminate && (
        <Minus
          size={iconSizes[size]}
          strokeWidth={3}
          className="text-primary-foreground animate-in zoom-in-75 duration-150"
        />
      )}
    </button>
  );
};
