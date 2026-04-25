import {useEffect, useRef, useState} from 'react';
import {
    createMediaObjectUrl,
    extractMediaId,
    getMedia,
    isIndexedDBMedia,
    revokeMediaObjectUrl
} from './mediaStorage';

type UseResolvedMediaUrlOptions = {
    maxRetries?: number;
    retryDelayMs?: number;
};

type UseResolvedMediaUrlResult = {
    resolvedUrl: string | null;
    loading: boolean;
    error: boolean;
};

export function useResolvedMediaUrl(
    media: string | undefined,
    options: UseResolvedMediaUrlOptions = {}
): UseResolvedMediaUrlResult {
    const maxRetries = options.maxRetries ?? 0;
    const retryDelayMs = options.retryDelayMs ?? 300;
    const mediaId = media && isIndexedDBMedia(media) ? extractMediaId(media) : null;

    const [loadedMediaId, setLoadedMediaId] = useState<string | null>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [mediaErrorId, setMediaErrorId] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!mediaId) {
            return;
        }
        const retryTimers = new Set<ReturnType<typeof setTimeout>>();
        let cancelled = false;

        const scheduleRetry = (retryCount: number) => {
            const timer = setTimeout(() => {
                retryTimers.delete(timer);
                attemptLoad(retryCount);
            }, retryDelayMs);
            retryTimers.add(timer);
        };

        const handleFailure = (retryCount: number) => {
            if (retryCount < maxRetries) {
                scheduleRetry(retryCount + 1);
                return;
            }
            setMediaErrorId(mediaId);
        };

        const attemptLoad = (retryCount: number) => {
            getMedia(mediaId)
                .then(entry => {
                    if (cancelled) return;
                    if (!entry) {
                        handleFailure(retryCount);
                        return;
                    }
                    setLoadedMediaId(mediaId);
                    setResolvedUrl(prev => {
                        if (prev?.startsWith('blob:')) {
                            revokeMediaObjectUrl(prev);
                        }
                        const nextUrl = createMediaObjectUrl(entry);
                        objectUrlRef.current = nextUrl;
                        return nextUrl;
                    });
                    setMediaErrorId(null);
                })
                .catch(() => {
                    if (cancelled) return;
                    handleFailure(retryCount);
                });
        };

        attemptLoad(0);

        return () => {
            cancelled = true;
            retryTimers.forEach(timer => clearTimeout(timer));
            retryTimers.clear();
            if (objectUrlRef.current?.startsWith('blob:')) {
                revokeMediaObjectUrl(objectUrlRef.current);
            }
            objectUrlRef.current = null;
        };
    }, [mediaId, maxRetries, retryDelayMs]);

    if (!media) {
        return {resolvedUrl: null, loading: false, error: false};
    }
    if (!mediaId) {
        return {resolvedUrl: media, loading: false, error: false};
    }

    return {
        resolvedUrl: loadedMediaId === mediaId ? resolvedUrl : null,
        loading: loadedMediaId !== mediaId && mediaErrorId !== mediaId,
        error: mediaErrorId === mediaId
    };
}
