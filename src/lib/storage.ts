import { DEFAULT_SETTINGS } from '@/types';
import type { StorageSettings } from '@/types';

export const storage = {
  getSettings: async (): Promise<StorageSettings> => {
    const result = await chrome.storage.sync.get(['theme', 'locale']);
    return {
      theme: (result.theme as StorageSettings['theme']) || DEFAULT_SETTINGS.theme,
      locale: (result.locale as StorageSettings['locale']) || DEFAULT_SETTINGS.locale,
    };
  },

  setSettings: async (settings: Partial<StorageSettings>): Promise<void> => {
    await chrome.storage.sync.set(settings);
  },

  onChange: (callback: (settings: StorageSettings) => void) => {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        const newSettings: any = {};
        if (changes.theme) newSettings.theme = changes.theme.newValue;
        if (changes.locale) newSettings.locale = changes.locale.newValue;
        callback(newSettings);
      }
    });
  }
};
