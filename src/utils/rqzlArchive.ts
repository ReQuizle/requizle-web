import JSZip from 'jszip';

const ARCHIVE_MANIFEST_FILE = 'manifest.json';
const ARCHIVE_VERSION = 'requizle-archive-v1';

export interface ArchiveMediaEntry {
    id: string;
    filename: string;
    mimeType: string;
    blob: Blob;
}

type ArchiveMediaDescriptor = {
    id: string;
    filename: string;
    mimeType: string;
    path: string;
};

type ArchiveManifest = {
    format: typeof ARCHIVE_VERSION;
    payload: unknown;
    media: ArchiveMediaDescriptor[];
};

export async function createRqzlArchiveBlob(payload: unknown, mediaEntries: ArchiveMediaEntry[]): Promise<Blob> {
    const zip = new JSZip();
    const mediaDescriptors: ArchiveMediaDescriptor[] = [];

    for (const media of mediaEntries) {
        const path = `media/${media.id}`;
        zip.file(path, media.blob);
        mediaDescriptors.push({
            id: media.id,
            filename: media.filename,
            mimeType: media.mimeType,
            path
        });
    }

    const manifest: ArchiveManifest = {
        format: ARCHIVE_VERSION,
        payload,
        media: mediaDescriptors
    };

    zip.file(ARCHIVE_MANIFEST_FILE, JSON.stringify(manifest));
    return zip.generateAsync({type: 'blob'});
}

export async function parseRqzlArchiveFile(file: File): Promise<{payload: unknown; mediaEntries: ArchiveMediaEntry[]}> {
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file(ARCHIVE_MANIFEST_FILE);
    if (!manifestFile) {
        throw new Error('Invalid .rqzl archive: missing manifest.json');
    }

    const manifestRaw = JSON.parse(await manifestFile.async('text')) as Partial<ArchiveManifest>;
    if (manifestRaw.format !== ARCHIVE_VERSION) {
        throw new Error('Unsupported .rqzl archive format');
    }

    const descriptors = Array.isArray(manifestRaw.media) ? manifestRaw.media : [];
    const mediaEntries: ArchiveMediaEntry[] = [];

    for (const descriptor of descriptors) {
        if (
            !descriptor ||
            typeof descriptor !== 'object' ||
            typeof descriptor.id !== 'string' ||
            typeof descriptor.filename !== 'string' ||
            typeof descriptor.mimeType !== 'string' ||
            typeof descriptor.path !== 'string'
        ) {
            throw new Error('Invalid .rqzl archive: malformed media descriptor');
        }

        const mediaFile = zip.file(descriptor.path);
        if (!mediaFile) {
            throw new Error(`Invalid .rqzl archive: missing media file ${descriptor.path}`);
        }

        const blob = await mediaFile.async('blob');
        mediaEntries.push({
            id: descriptor.id,
            filename: descriptor.filename,
            mimeType: descriptor.mimeType,
            blob: blob.type ? blob : new Blob([blob], {type: descriptor.mimeType})
        });
    }

    return {
        payload: manifestRaw.payload,
        mediaEntries
    };
}
