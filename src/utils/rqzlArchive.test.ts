import {afterEach, describe, expect, it, vi} from 'vitest';
import JSZip from 'jszip';
import {parseRqzlArchiveFile} from './rqzlArchive';

const MANIFEST_NAME = 'manifest.json';
const MANIFEST_FORMAT = 'requizle-archive-v1';

async function buildArchiveFile(manifest: unknown, mediaEntries: Array<{path: string; data: string}> = []): Promise<File> {
    const zip = new JSZip();
    zip.file(MANIFEST_NAME, JSON.stringify(manifest));
    for (const mediaEntry of mediaEntries) {
        zip.file(mediaEntry.path, mediaEntry.data);
    }
    const blob = await zip.generateAsync({type: 'blob'});
    return new File([blob], 'sample.rqzl', {type: 'application/octet-stream'});
}

describe('parseRqzlArchiveFile', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects archives with too many media descriptors', async () => {
        const media = Array.from({length: 501}, (_, index) => ({
            id: `m-${index}`,
            filename: `f-${index}.png`,
            mimeType: 'image/png',
            path: `media/m-${index}`
        }));
        const file = await buildArchiveFile({
            format: MANIFEST_FORMAT,
            payload: {subjects: []},
            media
        });

        await expect(parseRqzlArchiveFile(file)).rejects.toThrow('too many media files');
    });

    it('rejects archives whose extracted media payload is too large', async () => {
        const manifest = {
            format: MANIFEST_FORMAT,
            payload: {subjects: []},
            media: [
                {
                    id: 'm-1',
                    filename: 'huge.bin',
                    mimeType: 'application/octet-stream',
                    path: 'media/m-1'
                }
            ]
        };
        const fakeZip = {
            file(path: string) {
                if (path === MANIFEST_NAME) {
                    return {
                        async: async () => JSON.stringify(manifest)
                    };
                }
                if (path === 'media/m-1') {
                    return {
                        async: async () => ({size: 800 * 1024 * 1024, type: 'application/octet-stream'} as Blob)
                    };
                }
                return null;
            }
        } as unknown as JSZip;
        vi.spyOn(JSZip, 'loadAsync').mockResolvedValue(fakeZip);
        const file = new File(['test'], 'sample.rqzl', {type: 'application/octet-stream'});

        await expect(parseRqzlArchiveFile(file)).rejects.toThrow('media payload is too large');
    });
});
