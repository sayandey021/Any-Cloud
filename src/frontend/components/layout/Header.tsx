import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  Grid,
  Laptop,
  List,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAccountStore } from '../../stores/accountStore';
import { useFileStore } from '../../stores/fileStore';
import { useThemeStore } from '../../stores/themeStore';
import { useUiStore } from '../../stores/uiStore';
import { ProviderIcon } from '../ui/Icons';

export const Header: React.FC = () => {
  const { theme, appliedTheme, setTheme } = useThemeStore();
  const { accounts, activeAccountId, setActiveAccount } = useAccountStore();
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    searchFiles,
    loadFiles,
    currentPath,
  } = useFileStore();
  const { activePage, setActivePage, openModal } = useUiStore();
  const [localSearch, setLocalSearch] = useState('');
  const [cloudDropdownOpen, setCloudDropdownOpen] = useState(false);
  const cloudDropdownRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cloudDropdownRef.current && !cloudDropdownRef.current.contains(event.target as Node)) {
        setCloudDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCloudDropdownOpen(false);
      }
    };

    if (cloudDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cloudDropdownOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch);
      searchFiles(localSearch, activeAccountId || undefined);
      if (activePage !== 'files') {
        setActivePage('files');
      }
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchQuery('');
    if (activeAccountId) {
      loadFiles(activeAccountId, currentPath);
    }
  };

  return (
    <header className="h-14 border-b border-border/70 bg-card/60 acrylic-header px-4 flex items-center justify-between gap-4 select-none shrink-0 relative z-40">
      {/* Universal Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search across all clouds (e.g. photos, invoices, .pdf)..."
            className="w-full h-9 pl-9 pr-14 bg-muted/60 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150 shadow-xs"
          />
          {localSearch ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-0.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground/80 bg-background/80 border border-border/60 pointer-events-none">
              Ctrl+K
            </span>
          )}
        </div>
      </form>

      {/* Right Controls: Cloud Selector, View Switcher, Engine Health, Theme */}
      <div className="flex items-center gap-2.5">
        {/* Active Cloud Selector (if on Files page) */}
        {activePage === 'files' && accounts.length > 0 && (
          <div ref={cloudDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCloudDropdownOpen(!cloudDropdownOpen)}
              className={cn(
                'flex items-center gap-2 bg-muted/50 hover:bg-muted/80 border border-border/80 hover:border-border rounded-xl px-2.5 py-1.5 text-xs transition-all duration-150 select-none shadow-2xs group',
                cloudDropdownOpen && 'bg-muted/90 ring-1 ring-primary/40 border-primary/50'
              )}
              title="Switch Active Storage Account"
              aria-expanded={cloudDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                Cloud:
              </span>
              {activeAccount && (
                <div className="flex items-center gap-1.5 max-w-[140px]">
                  <ProviderIcon provider={activeAccount.provider} size={15} />
                  <span className="font-semibold text-foreground truncate text-xs">
                    {activeAccount.label || activeAccount.name}
                  </span>
                </div>
              )}
              <ChevronDown
                size={13}
                className={cn(
                  'text-muted-foreground transition-transform duration-200 shrink-0 group-hover:text-foreground',
                  cloudDropdownOpen && 'transform rotate-180 text-foreground'
                )}
              />
            </button>

            {/* Custom Popover Dropdown Menu */}
            {cloudDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right focus:outline-none"
                role="listbox"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between select-none">
                  <span>Storage Accounts</span>
                  <span className="text-[10px] font-normal lowercase text-muted-foreground/50">
                    {accounts.length} linked
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5">
                  {accounts.map((a) => {
                    const isSelected = a.id === activeAccountId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveAccount(a.id);
                          loadFiles(a.id, '');
                          setCloudDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition-all duration-150 group',
                          isSelected
                            ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                            : 'text-foreground hover:bg-muted/70 font-medium'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-background/80 border border-border/60 flex items-center justify-center shrink-0 shadow-2xs">
                            <ProviderIcon provider={a.provider} size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs leading-snug">
                              {a.label || a.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 capitalize truncate">
                              {a.provider}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={14} className="text-primary shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="my-1 border-t border-border/50" />

                <button
                  type="button"
                  onClick={() => {
                    setCloudDropdownOpen(false);
                    openModal('add-cloud');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors duration-150 font-medium"
                >
                  <Plus size={14} className="shrink-0" />
                  <span>Connect Storage Account...</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Switcher */}
        {activePage === 'files' && (
          <div className="flex items-center bg-muted/50 border border-border/80 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={cn(
                'p-1.5 rounded-lg text-xs transition-all duration-150',
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={cn(
                'p-1.5 rounded-lg text-xs transition-all duration-150',
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List size={15} />
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <div className="flex items-center bg-muted/50 border border-border/80 rounded-xl p-0.5">
          <button
            onClick={(e) => setTheme('light', e)}
            title="Light Theme"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-all duration-150',
              theme === 'light'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sun size={14} />
          </button>
          <button
            onClick={(e) => setTheme('dark', e)}
            title="Dark Theme"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-all duration-150',
              theme === 'dark'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Moon size={14} />
          </button>
          <button
            onClick={(e) => setTheme('system', e)}
            title="System Theme"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-all duration-150',
              theme === 'system'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Laptop size={14} />
          </button>
        </div>

        {/* Settings Shortcut Button */}
        <button
          type="button"
          onClick={() => setActivePage('settings')}
          title="Preferences & Settings"
          className={cn(
            'p-2 rounded-xl border border-border/80 transition-all duration-150',
            activePage === 'settings'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
