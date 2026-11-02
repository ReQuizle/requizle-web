import {v4 as uuidv4} from 'uuid';
import {databaseOpener, waitForRequest, waitForTransaction} from './indexedDB';

const STORE_NAME = 'media';
const openDB = databaseOpener('requizle-media', STORE_NAME, {keyPath: 'id'});
// Questions refer to stored media as `idb:<id>`
const MEDIA_REF_PREFIX = 'idb:';

interface MediaEntry {
    id: string;
    blob: Blob;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: number;
}

/** Persists bytes in IndexedDB. Returned id is referenced as `idb:${id}` in `question.media`. */
export async function storeMedia(blob: Blob, filename: string): Promise<string> {
    const db = await openDB();
    const id = `media-${uuidv4()}`;
    const entry: MediaEntry = {
        id,
        blob,
        filename,
        mimeType: blob.type || 'application/octet-stream',
        size: blob.size,
        createdAt: Date.now()
    };

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(entry);
    await waitForTransaction(transaction, 'Failed to store media');
    return id;
}

export async function getMedia(id: string): Promise<MediaEntry | null> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    const [entry] = await Promise.all([
        waitForRequest<MediaEntry | undefined>(request, 'Failed to retrieve media'),
        waitForTransaction(transaction, 'Failed to retrieve media')
    ]);
    return entry ?? null;
}

export async function deleteMedia(id: string): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction, 'Failed to delete media');
}

export async function getAllMediaIds(): Promise<string[]> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAllKeys();
    const [keys] = await Promise.all([
        waitForRequest(request, 'Failed to get media keys'),
        waitForTransaction(transaction, 'Failed to get media keys')
    ]);
    return keys as string[];
}

export async function clearAllMedia(): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await waitForTransaction(transaction, 'Failed to clear media');
}

export function isIndexedDBMedia(mediaRef: string): boolean {
    return mediaRef.startsWith(MEDIA_REF_PREFIX);
}

export function extractMediaId(mediaRef: string): string {
    return isIndexedDBMedia(mediaRef) ? mediaRef.slice(MEDIA_REF_PREFIX.length) : mediaRef;
}

export function createMediaRef(id: string): string {
    return MEDIA_REF_PREFIX + id;
}
