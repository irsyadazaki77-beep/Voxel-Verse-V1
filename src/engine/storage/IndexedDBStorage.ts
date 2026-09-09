// Production IndexedDB Persistence Layer for High-Capacity World Saves
import { Logger } from '../ui/Logger';

const DB_NAME = 'VoxelVerseDB';
const DB_VERSION = 1;
const STORE_WORLDS = 'worlds';
const STORE_RECOVERY = 'recovery';

export class IndexedDBStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.dbPromise = null;
          reject(new Error('IndexedDB connection timed out'));
        }
      }, 1500);

      try {
        if (typeof window === 'undefined' || !window.indexedDB) {
          isSettled = true;
          clearTimeout(timeoutId);
          this.dbPromise = null;
          reject(new Error('IndexedDB is not supported in this environment'));
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_WORLDS)) {
            db.createObjectStore(STORE_WORLDS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
            db.createObjectStore(STORE_RECOVERY, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            resolve(request.result);
          }
        };

        request.onerror = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            this.dbPromise = null;
            Logger.error('IndexedDBStorage', 'Failed to open IndexedDB database', { error: request.error?.message });
            reject(request.error);
          }
        };

        request.onblocked = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            this.dbPromise = null;
            reject(new Error('IndexedDB open blocked'));
          }
        };
      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          this.dbPromise = null;
          Logger.warn('IndexedDBStorage', 'IndexedDB property access blocked by sandbox or browser security', { error: err });
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    return this.dbPromise;
  }

  public static async getItem<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const getPromise = (async () => {
        const db = await this.getDB();
        return new Promise<T | null>((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve((request.result as T) || null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        });
      })();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 1200)
      );

      return await Promise.race([getPromise, timeoutPromise]);
    } catch (e) {
      Logger.warn('IndexedDBStorage', `Failed to get item '${key}' from store '${storeName}'`, { error: (e as Error).message });
      return null;
    }
  }

  public static async setItem<T>(storeName: string, value: T): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      Logger.error('IndexedDBStorage', `Failed to set item in store '${storeName}'`, { error: (e as Error).message });
      return false;
    }
  }

  public static async removeItem(storeName: string, key: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      Logger.error('IndexedDBStorage', `Failed to remove key '${key}' from store '${storeName}'`, { error: (e as Error).message });
      return false;
    }
  }

  public static async getAllKeys(storeName: string): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve((request.result as string[]) || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      Logger.warn('IndexedDBStorage', `Failed to get keys from store '${storeName}'`, { error: (e as Error).message });
      return [];
    }
  }
}
export { STORE_WORLDS, STORE_RECOVERY };
