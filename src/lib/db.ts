import Dexie, { type Table } from 'dexie';
import type { HttpRecord, Session } from '@/types';

export interface DbSession extends Omit<Session, 'records'> {
  recordCount: number;
}

export interface DbHttpRecord extends HttpRecord {
  sessionId: string;
}

export interface DbGeneratedPrompt {
    id?: number;
    createdAt: number;
    promptContent: string;
    metaPrompt: string;
    contextName: string;
    modelName: string;
    tokenUsage?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

export class SkillSmithDatabase extends Dexie {
    sessions!: Table<DbSession>;
    records!: Table<DbHttpRecord>;
    generatedPrompts!: Table<DbGeneratedPrompt>;

    constructor() {
        super('SkillSmithDB');
        // Version 1: Original schema
        this.version(1).stores({
            sessions: '++id, startTime',
            records: '++id, sessionId, url, method',
            generatedPrompts: '++id, createdAt, contextName'
        });
    }
}

export const db = new SkillSmithDatabase();
