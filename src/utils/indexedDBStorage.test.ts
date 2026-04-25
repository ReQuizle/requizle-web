/**
 * Tests for indexedDBStorage utility
 * Tests the Zustand persist storage adapter
 */
import {describe, it, expect, beforeEach} from 'vitest';
import {
    indexedDBStorage,
    clearStoreData
} from './indexedDBStorage';

// Mock IndexedDB with fake-indexeddb
import 'fake-indexeddb/auto';

describe('indexedDBStorage', () => {
    beforeEach(async () => {
        await clearStoreData();
        localStorage.clear();
    });

    describe('setItem and getItem', () => {
        it('should store and retrieve a string value', async () => {
            await indexedDBStorage.setItem('test-key', 'test-value');
            const result = await indexedDBStorage.getItem('test-key');

            expect(result).toBe('test-value');
        });

        it('should store and retrieve JSON data', async () => {
            const data = JSON.stringify({name: 'Test', count: 42});
            await indexedDBStorage.setItem('json-key', data);
            const result = await indexedDBStorage.getItem('json-key');

            expect(result).toBe(data);
            expect(JSON.parse(result!)).toEqual({name: 'Test', count: 42});
        });

        it('should return null for non-existent key', async () => {
            const result = await indexedDBStorage.getItem('non-existent');

            expect(result).toBeNull();
        });

        it('should handle large data', async () => {
            // Create a large string (~1MB)
            const largeData = 'x'.repeat(1024 * 1024);
            await indexedDBStorage.setItem('large-key', largeData);
            const result = await indexedDBStorage.getItem('large-key');

            expect(result).toBe(largeData);
        });

        it('should overwrite existing data', async () => {
            await indexedDBStorage.setItem('key', 'value1');
            await indexedDBStorage.setItem('key', 'value2');
            const result = await indexedDBStorage.getItem('key');

            expect(result).toBe('value2');
        });

        it('should hydrate from legacy localStorage and migrate it to IndexedDB', async () => {
            localStorage.setItem('quiz-storage', 'legacy-value');

            const result = await indexedDBStorage.getItem('quiz-storage');

            expect(result).toBe('legacy-value');
            expect(localStorage.getItem('quiz-storage')).toBeNull();
            expect(await indexedDBStorage.getItem('quiz-storage')).toBe('legacy-value');
        });
    });

    describe('removeItem', () => {
        it('should remove an existing item', async () => {
            await indexedDBStorage.setItem('to-delete', 'value');
            await indexedDBStorage.removeItem('to-delete');
            const result = await indexedDBStorage.getItem('to-delete');

            expect(result).toBeNull();
        });

        it('should not throw when removing non-existent item', async () => {
            await expect(indexedDBStorage.removeItem('non-existent')).resolves.not.toThrow();
        });
    });

    describe('clearStoreData', () => {
        it('should clear all stored data', async () => {
            await indexedDBStorage.setItem('key1', 'value1');
            await indexedDBStorage.setItem('key2', 'value2');

            await clearStoreData();

            const result1 = await indexedDBStorage.getItem('key1');
            const result2 = await indexedDBStorage.getItem('key2');

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });
    });

    describe('multiple keys', () => {
        it('should handle multiple independent keys', async () => {
            await indexedDBStorage.setItem('key-a', 'value-a');
            await indexedDBStorage.setItem('key-b', 'value-b');
            await indexedDBStorage.setItem('key-c', 'value-c');

            expect(await indexedDBStorage.getItem('key-a')).toBe('value-a');
            expect(await indexedDBStorage.getItem('key-b')).toBe('value-b');
            expect(await indexedDBStorage.getItem('key-c')).toBe('value-c');
        });
    });
});
