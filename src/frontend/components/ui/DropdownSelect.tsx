import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface DropdownSelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  width?: string;
  align?: 'left' | 'right';
  placeholder?: string;
}

export function DropdownSelect<T extends string | number>({
  value,
  onChange,
  options,
  className,
  triggerClassName,
  menuClassName,
  width = 'w-56',
  align = 'right',
  placeholder = 'Select...',
}: DropdownSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-8.5 px-3 rounded-xl bg-muted/60 hover:bg-muted/90 border border-border/80 hover:border-primary/50 text-xs font-semibold text-foreground transition-all duration-150 flex items-center justify-between gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40',
          isOpen && 'border-primary ring-2 ring-primary/30 bg-muted/90',
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0 text-primary">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-200 stroke-[2.25]',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute mt-1.5 z-50 rounded-2xl bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border/80 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition-all duration-100 cursor-pointer group',
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-foreground/90 hover:bg-muted/80 hover:text-foreground font-medium'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option.icon && (
                      <span className={cn('shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate leading-tight">{option.label}</div>
                      {option.description && (
                        <div
                          className={cn(
                            'text-[10px] truncate mt-0.5 font-normal',
                            isSelected ? 'text-primary/75' : 'text-muted-foreground'
                          )}
                        >
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-primary shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
