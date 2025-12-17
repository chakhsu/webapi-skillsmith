import { storage } from './storage';
import type { StorageSettings } from '@/types';

function apply(theme: StorageSettings['theme']) {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine if we should show dark mode
    // "dark" -> always dark
    // "light" -> always light
    // "system" -> depends on OS preference
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);

    if (isDark) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

// 1. Initial Load
storage.getSettings().then(settings => {
    apply(settings.theme);
});

// 2. Listen for Storage Changes (User changes setting in Options)
storage.onChange((changes) => {
    if (changes.theme) {
        apply(changes.theme);
    }
});

// 3. Listen for System Preference Changes (Mac OS Dark Mode toggle)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    storage.getSettings().then(settings => {
        // Only re-apply if user is on "system" mode
        if (settings.theme === 'system') {
            apply('system');
        }
    });
});
