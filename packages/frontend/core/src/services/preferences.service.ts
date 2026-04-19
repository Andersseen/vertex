import { Injectable } from '@angular/core';
import { db } from '../db/vertex.db';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  async get<T>(key: string, fallback: T): Promise<T> {
    const record = await db.preferences.get(key);
    return record !== undefined ? (record.value as T) : fallback;
  }

  async set(key: string, value: unknown): Promise<void> {
    await db.preferences.put({ key, value });
  }

  async delete(key: string): Promise<void> {
    await db.preferences.delete(key);
  }

  async clear(): Promise<void> {
    await db.preferences.clear();
  }
}
