import type {Subject} from '../types';
import {getArchiveMediaEntriesForSubjects} from './archiveMedia';
import {triggerBlobDownload, triggerJsonDownload} from './download';
import {createRqzlArchiveBlob} from './rqzlArchive';

export type ExportFormat = 'rqzl' | 'zip' | 'json';

export type ExportOptions = {
    includeProgress: boolean;
    includeMedia: boolean;
    format: ExportFormat;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {includeProgress: true, includeMedia: true, format: 'rqzl'};

/** `name` lowercased, with spaces as hyphens and anything unsafe in a file name removed. */
export function toFileSlug(name: string, fallback: string): string {
    return (
        name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/gi, '') || fallback
    );
}

/**
 * Download an export as JSON, or as a .rqzl or .zip archive that can also carry the media the
 * subjects use. Throws `MissingMediaError` when that media is no longer stored.
 */
export async function downloadExport(
    payload: unknown,
    subjects: Subject[],
    baseFilename: string,
    {format, includeMedia}: ExportOptions
): Promise<void> {
    if (format === 'json') {
        triggerJsonDownload(payload, `${baseFilename}.json`);
        return;
    }
    const mediaEntries = includeMedia ? await getArchiveMediaEntriesForSubjects(subjects) : [];
    triggerBlobDownload(await createRqzlArchiveBlob(payload, mediaEntries), `${baseFilename}.${format}`);
}
