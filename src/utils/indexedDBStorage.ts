/**
 * IndexedDB storage adapter for Zustand persist middleware.
 * Provides larger storage than localStorage (~50MB+ vs ~5MB).
 */

const DB_NAME = 'requizle-store';
const DB_VERSION = 1;
const STORE_NAME = 'zustand';

let dbPromise: Promise<IDBDatabase> | null = null;

function safeGetLocalStorageItem(name: string): string | null {
    try {
        return localStorage.getItem(name);
    } catch {
        return null;
    }
}

function safeSetLocalStorageItem(name: string, value: string): void {
    try {
        localStorage.setItem(name, value);
    } catch {
        // Persistence is best-effort when both IndexedDB and localStorage are unavailable.
    }
}

function safeRemoveLocalStorageItem(name: string): void {
    try {
        localStorage.removeItem(name);
    } catch {
        // Persistence is best-effort when both IndexedDB and localStorage are unavailable.
    }
}

function waitForTransaction(transaction: IDBTransaction, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error(message));
        transaction.onerror = () => reject(transaction.error ?? new Error(message));
    });
}

function waitForRequest<T>(request: IDBRequest<T>, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(message));
    });
}

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            dbPromise = null;
            reject(new Error('Failed to open IndexedDB for store'));
        };

        request.onsuccess = () => {
            request.result.onversionchange = () => {
                request.result.close();
                dbPromise = null;
            };
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });

    return dbPromise;
}

/** Zustand-compatible storage adapter using IndexedDB. */
export const indexedDBStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const db = await openDB();
            const storedValue = await new Promise<string | null>((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(name);
                const transactionDone = waitForTransaction(transaction, 'Failed to read from IndexedDB');

                Promise.all([
                    waitForRequest<string | undefined>(request, 'Failed to read from IndexedDB'),
                    transactionDone
                ])
                    .then(([result]) => resolve(result ?? null))
                    .catch(reject);
            });

            if (storedValue !== null) return storedValue;

            const localData = safeGetLocalStorageItem(name);
            if (localData === null) return null;

            try {
                await indexedDBStorage.setItem(name, localData);
                safeRemoveLocalStorageItem(name);
            } catch {
                // Keep localStorage data if migration fails; hydration can still use it.
            }

            return localData;
        } catch {
            // Fallback to localStorage if IndexedDB fails
            return safeGetLocalStorageItem(name);
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        try {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.put(value, name);

                waitForTransaction(transaction, 'Failed to write to IndexedDB').then(resolve).catch(reject);
            });
        } catch {
            // Fallback to localStorage if IndexedDB fails
            safeSetLocalStorageItem(name, value);
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.delete(name);

                waitForTransaction(transaction, 'Failed to delete from IndexedDB').then(resolve).catch(reject);
            });
        } catch {
            // Fallback to localStorage if IndexedDB fails
            safeRemoveLocalStorageItem(name);
        }
    }
};

/** Clear all store data from IndexedDB. */
export async function clearStoreData(): Promise<void> {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();

            waitForTransaction(transaction, 'Failed to clear IndexedDB store').then(resolve).catch(reject);
        });
    } finally {
        safeRemoveLocalStorageItem('quiz-storage');
    }
}

/**
 * Migrate data from localStorage to IndexedDB (one-time migration).
 */
export async function migrateFromLocalStorage(key: string): Promise<void> {
    const localData = safeGetLocalStorageItem(key);
    if (localData) {
        try {
            await indexedDBStorage.setItem(key, localData);
            safeRemoveLocalStorageItem(key);
        } catch {
            // Migration failed, data remains in localStorage
        }
    }
}
