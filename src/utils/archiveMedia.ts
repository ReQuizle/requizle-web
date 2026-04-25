import type {Subject} from '../types';
import {extractMediaId, getMedia, isIndexedDBMedia} from './mediaStorage';
import type {ArchiveMediaEntry} from './rqzlArchive';

function collectIndexedDbMediaIds(subjects: Subject[]): string[] {
    const mediaIds = new Set<string>();
    subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            topic.questions.forEach(question => {
                if (question.media && isIndexedDBMedia(question.media)) {
                    mediaIds.add(extractMediaId(question.media));
                }
            });
        });
    });
    return [...mediaIds];
}

export async function getArchiveMediaEntriesForSubjects(subjects: Subject[]): Promise<ArchiveMediaEntry[]> {
    const mediaIds = collectIndexedDbMediaIds(subjects);
    const storedMediaEntries = await Promise.all(mediaIds.map(id => getMedia(id)));
    const foundEntries = storedMediaEntries
        .filter((media): media is NonNullable<typeof media> => Boolean(media))
        .map(media => ({
            id: media.id,
            filename: media.filename,
            mimeType: media.mimeType,
            blob: media.blob
        }));

    const foundIds = new Set(foundEntries.map(media => media.id));
    const missingIds = mediaIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
        throw new Error(
            `Export failed: ${missingIds.length} referenced media file(s) were not found in local storage.`
        );
    }

    return foundEntries;
}
