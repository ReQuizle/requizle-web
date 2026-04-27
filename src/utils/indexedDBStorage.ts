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
        void 0; // setItem can throw in private mode; persistence is best-effort
    }
}

function safeRemoveLocalStorageItem(name: string): void {
    try {
        localStorage.removeItem(name);
    } catch {
        void 0; // removeItem can throw; persistence is best-effort
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
                void 0; // still read from localStorage on next get if copy to IDB failed
            }

            return localData;
        } catch {
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
            safeRemoveLocalStorageItem(name);
        }
    }
};

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
