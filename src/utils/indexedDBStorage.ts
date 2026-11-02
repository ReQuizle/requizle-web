import {databaseOpener, waitForRequest, waitForTransaction} from './indexedDB';
import {readLocalStorage, removeLocalStorage, writeLocalStorage} from './localStorage';

const STORE_NAME = 'zustand';
const openDB = databaseOpener('requizle-store', STORE_NAME);

async function write(change: (store: IDBObjectStore) => void, message: string): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    change(transaction.objectStore(STORE_NAME));
    await waitForTransaction(transaction, message);
}

/** Zustand storage that keeps the store in IndexedDB, falling back to localStorage when IndexedDB fails. */
export const indexedDBStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(name);
            const [storedValue] = await Promise.all([
                waitForRequest<string | undefined>(request, 'Failed to read from IndexedDB'),
                waitForTransaction(transaction, 'Failed to read from IndexedDB')
            ]);
            if (storedValue !== undefined) return storedValue;

            // Older versions saved to localStorage, so move anything found there into IndexedDB
            const localData = readLocalStorage(name);
            if (localData === null) return null;

            try {
                await write((store) => store.put(localData, name), 'Failed to write to IndexedDB');
                removeLocalStorage(name);
            } catch {
                // The copy stays in localStorage and is read from there next time
            }

            return localData;
        } catch {
            return readLocalStorage(name);
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await write((store) => store.put(value, name), 'Failed to write to IndexedDB');
        } catch {
            writeLocalStorage(name, value);
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            await write((store) => store.delete(name), 'Failed to delete from IndexedDB');
        } catch {
            removeLocalStorage(name);
        }
    }
};

export async function clearStoreData(): Promise<void> {
    try {
        await write((store) => store.clear(), 'Failed to clear IndexedDB store');
    } finally {
        removeLocalStorage('quiz-storage');
    }
}
