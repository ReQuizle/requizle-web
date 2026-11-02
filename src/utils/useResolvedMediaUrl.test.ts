import 'fake-indexeddb/auto';
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useResolvedMediaUrl} from './useResolvedMediaUrl';
import {createMediaRef, storeMedia} from './mediaStorage';

describe('useResolvedMediaUrl', () => {
    beforeAll(() => {
        // jsdom does not implement object URLs
        let count = 0;
        URL.createObjectURL = vi.fn(() => `blob:media-${count++}`);
        URL.revokeObjectURL = vi.fn();
    });

    it('uses a link as it is and tells videos apart by extension', () => {
        expect(renderHook(() => useResolvedMediaUrl('https://example.com/clip.mp4')).result.current).toEqual({
            resolvedUrl: 'https://example.com/clip.mp4',
            isVideo: true,
            loading: false,
            error: false
        });
        expect(renderHook(() => useResolvedMediaUrl('/media/photo.png')).result.current.isVideo).toBe(false);
    });

    it('loads stored media and tells videos apart by file type', async () => {
        const videoId = await storeMedia(new Blob(['frames'], {type: 'video/mp4'}), 'clip');
        const imageId = await storeMedia(new Blob(['pixels'], {type: 'image/png'}), 'photo.png');

        const video = renderHook(() => useResolvedMediaUrl(createMediaRef(videoId)));
        const image = renderHook(() => useResolvedMediaUrl(createMediaRef(imageId)));

        expect(video.result.current.loading).toBe(true);
        await waitFor(() => expect(video.result.current.resolvedUrl).toMatch(/^blob:/));
        await waitFor(() => expect(image.result.current.resolvedUrl).toMatch(/^blob:/));
        expect(video.result.current.isVideo).toBe(true);
        expect(image.result.current.isVideo).toBe(false);
    });

    it('reports media that is no longer stored', async () => {
        const {result} = renderHook(() => useResolvedMediaUrl(createMediaRef('missing')));

        await waitFor(() => expect(result.current.error).toBe(true));
        expect(result.current).toMatchObject({resolvedUrl: null, loading: false});
    });
});
