export interface HttpRecord {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  timestamp: number;
}

export interface Session {
  id: string;
  description: string;
  startTime: number;
  endTime?: number;
  domain: string;
  groupName?: string;
  // records are loaded separately from DB usually, but for export we might attach them
  records?: HttpRecord[];
}

export interface StorageSettings {
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'zh';
}

export const DEFAULT_SETTINGS: StorageSettings = {
  theme: 'system',
  locale: 'en',
};
