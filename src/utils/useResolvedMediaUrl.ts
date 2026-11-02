import {useEffect, useState} from 'react';
import {isVideoMediaUrl} from './mediaFormat';
import {extractMediaId, getMedia, isIndexedDBMedia} from './mediaStorage';

type ResolvedMedia = {
    resolvedUrl: string | null;
    /** Whether the media is a video. Stored media is checked by file type, since its URL has no extension. */
    isVideo: boolean;
    loading: boolean;
    error: boolean;
};

/** A stored file once read. `url` is null when it could not be read. */
type LoadedMedia = {mediaId: string; url: string | null; isVideo: boolean};

/**
 * The URL to show question media from. `idb:` references are loaded from IndexedDB into an object
 * URL, which is revoked when the media changes or the component unmounts; other values are used as is.
 */
export function useResolvedMediaUrl(media: string | undefined): ResolvedMedia {
    const mediaId = media && isIndexedDBMedia(media) ? extractMediaId(media) : null;
    const [loaded, setLoaded] = useState<LoadedMedia | null>(null);

    useEffect(() => {
        if (!mediaId) return;
        let cancelled = false;
        let objectUrl: string | null = null;

        getMedia(mediaId)
            .catch(() => null)
            .then((entry) => {
                if (cancelled) return;
                if (!entry) {
                    setLoaded({mediaId, url: null, isVideo: false});
                    return;
                }
                objectUrl = URL.createObjectURL(entry.blob);
                setLoaded({
                    mediaId,
                    url: objectUrl,
                    isVideo: entry.mimeType.startsWith('video/') || isVideoMediaUrl(entry.filename)
                });
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [mediaId]);

    if (!media) {
        return {resolvedUrl: null, isVideo: false, loading: false, error: false};
    }
    if (!mediaId) {
        return {resolvedUrl: media, isVideo: isVideoMediaUrl(media), loading: false, error: false};
    }

    const current = loaded?.mediaId === mediaId ? loaded : null;
    return {
        resolvedUrl: current?.url ?? null,
        isVideo: current?.isVideo ?? false,
        loading: !current,
        error: !!current && !current.url
    };
}
