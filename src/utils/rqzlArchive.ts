import JSZip from 'jszip';

const ARCHIVE_MANIFEST_FILE = 'manifest.json';
const ARCHIVE_VERSION = 'requizle-archive-v1';
const MAX_ARCHIVE_FILE_BYTES = 512 * 1024 * 1024;
const MAX_ARCHIVE_MEDIA_ENTRIES = 500;
const MAX_TOTAL_MEDIA_BYTES = 768 * 1024 * 1024;

export interface ArchiveMediaEntry {
    id: string;
    filename: string;
    mimeType: string;
    path?: string;
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

function isSafeArchiveMediaPath(path: string): boolean {
    if (!path.startsWith('media/')) return false;
    if (path.includes('..')) return false;
    if (path.includes('\\')) return false;
    if (path.startsWith('/')) return false;
    if (path === ARCHIVE_MANIFEST_FILE) return false;
    return /^media\/[^/]+$/.test(path);
}

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
    if (file.size > MAX_ARCHIVE_FILE_BYTES) {
        throw new Error('Invalid .rqzl archive: file is too large to import safely');
    }

    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file(ARCHIVE_MANIFEST_FILE);
    if (!manifestFile) {
        throw new Error('Invalid .rqzl archive: missing manifest.json');
    }

    let manifestRaw: Partial<ArchiveManifest>;
    try {
        manifestRaw = JSON.parse(await manifestFile.async('text')) as Partial<ArchiveManifest>;
    } catch {
        throw new Error('Invalid .rqzl archive: malformed manifest.json');
    }
    if (manifestRaw.format !== ARCHIVE_VERSION) {
        throw new Error('Unsupported .rqzl archive format');
    }

    const descriptors = Array.isArray(manifestRaw.media) ? manifestRaw.media : [];
    if (descriptors.length > MAX_ARCHIVE_MEDIA_ENTRIES) {
        throw new Error('Invalid .rqzl archive: too many media files');
    }

    const mediaEntries: ArchiveMediaEntry[] = [];
    let totalMediaBytes = 0;

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
        if (!isSafeArchiveMediaPath(descriptor.path)) {
            throw new Error(`Invalid .rqzl archive: unsafe media path "${descriptor.path}"`);
        }

        const mediaFile = zip.file(descriptor.path);
        if (!mediaFile) {
            throw new Error(`Invalid .rqzl archive: missing media file ${descriptor.path}`);
        }

        const blob = await mediaFile.async('blob');
        totalMediaBytes += blob.size;
        if (totalMediaBytes > MAX_TOTAL_MEDIA_BYTES) {
            throw new Error('Invalid .rqzl archive: media payload is too large to import safely');
        }
        mediaEntries.push({
            id: descriptor.id,
            filename: descriptor.filename,
            mimeType: descriptor.mimeType,
            path: descriptor.path,
            blob: blob.type ? blob : new Blob([blob], {type: descriptor.mimeType})
        });
    }

    return {
        payload: manifestRaw.payload,
        mediaEntries
    };
}
