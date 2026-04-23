const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'] as const;

/**
 * Detect whether a media URL/data URI should be rendered as a video element.
 */
export function isVideoMediaUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('data:video/')) return true;
    return VIDEO_FILE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}
