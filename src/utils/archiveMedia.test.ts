import 'fake-indexeddb/auto';
import {describe, expect, it} from 'vitest';
import type {Subject} from '../types';
import {getArchiveMediaEntriesForSubjects, MissingMediaError} from './archiveMedia';
import {createMediaRef, storeMedia} from './mediaStorage';

function subjectWithMedia(...media: string[]): Subject {
    return {
        id: 's1',
        name: 'Biology',
        topics: [
            {
                id: 't1',
                name: 'Cells',
                questions: media.map((ref, index) => ({
                    id: `q${index}`,
                    topicId: 't1',
                    type: 'true_false',
                    prompt: 'Question?',
                    answer: true,
                    media: ref
                }))
            }
        ]
    };
}

describe('getArchiveMediaEntriesForSubjects', () => {
    it('collects each stored media file once', async () => {
        const id = await storeMedia(new Blob(['png bytes'], {type: 'image/png'}), 'cell.png');
        const ref = createMediaRef(id);

        const entries = await getArchiveMediaEntriesForSubjects([
            subjectWithMedia(ref, ref, 'https://example.com/a.png')
        ]);

        expect(entries).toMatchObject([{id, filename: 'cell.png', mimeType: 'image/png'}]);
    });

    it('reports missing media instead of exporting a partial archive', async () => {
        const id = await storeMedia(new Blob(['png bytes'], {type: 'image/png'}), 'cell.png');
        const subject = subjectWithMedia(createMediaRef(id), createMediaRef('gone-1'), createMediaRef('gone-2'));

        const result = getArchiveMediaEntriesForSubjects([subject]);

        await expect(result).rejects.toBeInstanceOf(MissingMediaError);
        await expect(result).rejects.toThrow(
            'Export failed: 2 media files used by these questions could not be found.'
        );
    });
});
