/** Resolves when the transaction commits, and rejects if it fails or is aborted. */
export function waitForTransaction(transaction: IDBTransaction, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error(message));
        transaction.onerror = () => reject(transaction.error ?? new Error(message));
    });
}

export function waitForRequest<T>(request: IDBRequest<T>, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(message));
    });
}

/**
 * Returns a function that opens the database on its first call and reuses the connection after
 * that. The database holds one object store, created along with the database.
 */
export function databaseOpener(
    name: string,
    storeName: string,
    storeOptions?: IDBObjectStoreParameters
): () => Promise<IDBDatabase> {
    let dbPromise: Promise<IDBDatabase> | null = null;

    return () => {
        dbPromise ??= new Promise((resolve, reject) => {
            const request = indexedDB.open(name, 1);

            request.onerror = () => {
                dbPromise = null;
                reject(new Error(`Failed to open the ${name} database`));
            };

            request.onsuccess = () => {
                // Another tab is upgrading or deleting the database; the next call reopens it
                request.result.onversionchange = () => {
                    request.result.close();
                    dbPromise = null;
                };
                resolve(request.result);
            };

            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(storeName)) {
                    request.result.createObjectStore(storeName, storeOptions);
                }
            };
        });
        return dbPromise;
    };
}
