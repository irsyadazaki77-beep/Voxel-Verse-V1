// Production IndexedDB Persistence Layer for High-Capacity World Saves
import { Logger } from '../ui/Logger';

const DB_NAME = 'VoxelVerseDB';
const DB_VERSION = 1;
const STORE_WORLDS = 'worlds';
const STORE_RECOVERY = 'recovery';

export class IndexedDBStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static memoryStores: Map<string, Map<string, any>> = new Map();
  private static useMemoryFallback: boolean = false;

  private static getMemoryStore(storeName: string): Map<string, any> {
    let s = this.memoryStores.get(storeName);
    if (!s) {
      s = new Map<string, any>();
      this.memoryStores.set(storeName, s);
    }
    return s;
  }

  public static resetMemoryStores(): void {
    this.memoryStores.clear();
  }

  public static setForceMemoryFallback(force: boolean): void {
    this.useMemoryFallback = force;
  }

  public static isSupported(): boolean {
    if (this.useMemoryFallback) return false;
    return !!(
      (typeof window !== 'undefined' && window.indexedDB) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB)
    );
  }

  private static getDB(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('IndexedDB not supported or forced fallback'));
    }

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
        const idb = (typeof window !== 'undefined' && window.indexedDB) ||
                    (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB);

        if (!idb) {
          isSettled = true;
          clearTimeout(timeoutId);
          this.dbPromise = null;
          reject(new Error('IndexedDB is not supported in this environment'));
          return;
        }

        const request = idb.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
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
    if (!this.isSupported()) {
      const memStore = this.getMemoryStore(storeName);
      return (memStore.get(key) as T) ?? null;
    }

    try {
      const getPromise = (async () => {
        const db = await this.getDB();
        return new Promise<T | null>((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve((request.result as T) ?? null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        });
      })();

      const timeoutPromise = new Promise<T | null>((_, reject) =>
        setTimeout(() => reject(new Error('IndexedDB get timed out')), 2000)
      );

      return await Promise.race([getPromise, timeoutPromise]);
    } catch {
      const memStore = this.getMemoryStore(storeName);
      return (memStore.get(key) as T) ?? null;
    }
  }

  public static async setItem<T>(storeName: string, value: T): Promise<boolean> {
    if (!this.isSupported()) {
      const key = (value as any)?.id;
      if (key) {
        this.getMemoryStore(storeName).set(String(key), value);
        return true;
      }
      return false;
    }

    try {
      const db = await this.getDB();
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(value);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('IndexedDB transaction aborted'));
      });
    } catch {
      const key = (value as any)?.id;
      if (key) {
        this.getMemoryStore(storeName).set(String(key), value);
        return true;
      }
      return false;
    }
  }

  public static async removeItem(storeName: string, key: string): Promise<boolean> {
    let memoryRemoved = false;
    if (this.memoryStores.has(storeName)) {
      memoryRemoved = this.getMemoryStore(storeName).delete(key);
    }

    if (!this.isSupported()) {
      return memoryRemoved;
    }

    try {
      const db = await this.getDB();
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(key);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('IndexedDB delete transaction aborted'));
      });
    } catch {
      return memoryRemoved;
    }
  }

  public static async getAllKeys(storeName: string): Promise<string[]> {
    if (!this.isSupported()) {
      return Array.from(this.getMemoryStore(storeName).keys());
    }

    try {
      const db = await this.getDB();
      return await new Promise<string[]>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve((request.result as string[]) || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return Array.from(this.getMemoryStore(storeName).keys());
    }
  }

  public static async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.isSupported()) {
      return Array.from(this.getMemoryStore(storeName).values()) as T[];
    }

    try {
      const db = await this.getDB();
      return await new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve((request.result as T[]) || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return Array.from(this.getMemoryStore(storeName).values()) as T[];
    }
  }
}
export { STORE_WORLDS, STORE_RECOVERY };
