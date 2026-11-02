import type {Subject} from '../types';
import {getMedia} from './mediaStorage';
import {mediaIdsIn, questionsIn} from '../store/quizStoreHelpers';
import type {ArchiveMediaEntry} from './rqzlArchive';
import {plural} from './plural';

/** Thrown when questions use media that is no longer stored, so the archive would be incomplete. */
export class MissingMediaError extends Error {}

export async function getArchiveMediaEntriesForSubjects(subjects: Subject[]): Promise<ArchiveMediaEntry[]> {
    const mediaIds = [...mediaIdsIn(questionsIn(subjects))];
    const storedMediaEntries = await Promise.all(mediaIds.map((id) => getMedia(id)));
    const foundEntries = storedMediaEntries
        .filter((media): media is NonNullable<typeof media> => Boolean(media))
        .map((media) => ({
            id: media.id,
            filename: media.filename,
            mimeType: media.mimeType,
            blob: media.blob
        }));

    const foundIds = new Set(foundEntries.map((media) => media.id));
    const missingIds = mediaIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
        throw new MissingMediaError(
            `Export failed: ${plural(missingIds.length, 'media file')} used by these questions could not be found. ` +
                'Export without media, or replace the missing files in the editor.'
        );
    }

    return foundEntries;
}
