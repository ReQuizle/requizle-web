/**
 * Media storage using IndexedDB for large files (images, videos).
 * This avoids localStorage quota limits.
 */

const DB_NAME = 'requizle-media';
const DB_VERSION = 1;
const STORE_NAME = 'media';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {keyPath: 'id'});
            }
        };
    });

    return dbPromise;
}

export interface MediaEntry {
    id: string;
    data: string; // base64 data URI
    filename: string;
    mimeType: string;
    size: number;
    createdAt: number;
}

/**
 * Store media in IndexedDB
 * @returns The media ID (use as `idb:${id}` in question.media)
 */
export async function storeMedia(dataUri: string, filename: string): Promise<string> {
    const db = await openDB();
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Extract mime type from data URI
    const mimeMatch = dataUri.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    const entry: MediaEntry = {
        id,
        data: dataUri,
        filename,
        mimeType,
        size: dataUri.length,
        createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(new Error('Failed to store media'));
    });
}

/**
 * Restore a full media entry (used for import/export)
 */
export async function restoreMediaEntry(entry: {id: string; data: string; filename: string}): Promise<void> {
    const db = await openDB();

    // Extract mime type from data URI
    const mimeMatch = entry.data.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    const fullEntry: MediaEntry = {
        id: entry.id,
        data: entry.data,
        filename: entry.filename,
        mimeType,
        size: entry.data.length,
        createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(fullEntry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to restore media'));
    });
}

/**
 * Retrieve media from IndexedDB
 */
export async function getMedia(id: string): Promise<MediaEntry | null> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to retrieve media'));
    });
}

/**
 * Delete media from IndexedDB
 */
export async function deleteMedia(id: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete media'));
    });
}

/**
 * Get all media IDs
 */
export async function getAllMediaIds(): Promise<string[]> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => reject(new Error('Failed to get media keys'));
    });
}

/**
 * Clear all media from IndexedDB
 */
export async function clearAllMedia(): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear media'));
    });
}

/**
 * Check if a media reference points to IndexedDB
 */
export function isIndexedDBMedia(mediaRef: string): boolean {
    return mediaRef.startsWith('idb:');
}

/**
 * Extract the media ID from an IndexedDB reference
 */
export function extractMediaId(mediaRef: string): string {
    return mediaRef.replace('idb:', '');
}

/**
 * Create an IndexedDB media reference from an ID
 */
export function createMediaRef(id: string): string {
    return `idb:${id}`;
}
