import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  appliedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode, event?: React.MouseEvent | MouseEvent) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('anycloud-theme') as ThemeMode) || 'system',
  appliedTheme: 'dark',

  setTheme: (newTheme, event) => {
    localStorage.setItem('anycloud-theme', newTheme);
    const isDark =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const targetAppliedTheme = isDark ? 'dark' : 'light';
    const currentApplied = get().appliedTheme;

    // Apply smooth fallback transition class
    document.documentElement.classList.add('theme-transitioning');
    const cleanupTransitionClass = () => {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 450);
    };

    // If theme visual state won't actually change, just update store
    if (targetAppliedTheme === currentApplied) {
      set({ theme: newTheme, appliedTheme: targetAppliedTheme });
      cleanupTransitionClass();
      return;
    }

    const doc = document as unknown as {
      startViewTransition?: (callback: () => void) => {
        ready: Promise<void>;
      };
    };

    // Check if View Transition API is supported and motion is not reduced
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion) {
      const x = event ? event.clientX : window.innerWidth - 64;
      const y = event ? event.clientY : 32;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = doc.startViewTransition(() => {
        document.documentElement.classList.toggle('dark', isDark);
        set({ theme: newTheme, appliedTheme: targetAppliedTheme });
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 420,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
      cleanupTransitionClass();
    } else {
      document.documentElement.classList.toggle('dark', isDark);
      set({ theme: newTheme, appliedTheme: targetAppliedTheme });
      cleanupTransitionClass();
    }
  },

  initTheme: () => {
    const stored = (localStorage.getItem('anycloud-theme') as ThemeMode) || 'system';
    const isDark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
    set({ theme: stored, appliedTheme: isDark ? 'dark' : 'light' });

    // Listen for OS theme changes if on system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (get().theme === 'system') {
        const dark = e.matches;
        document.documentElement.classList.toggle('dark', dark);
        set({ appliedTheme: dark ? 'dark' : 'light' });
      }
    });
  },
}));
