import Dexie, { type Table } from 'dexie';

export interface SessionRecord {
  id?: number;
  name: string;
  url: string;
  dir: string;
  timestamp: number;
  version: number;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

export class VertexDatabase extends Dexie {
  sessions!: Table<SessionRecord, number>;
  preferences!: Table<PreferenceRecord, string>;

  constructor() {
    super('vertex-ide');
    this.version(1).stores({
      sessions: '++id, name, timestamp',
      preferences: 'key',
    });
  }
}

export const db = new VertexDatabase();
