const DOWNLOAD_REVOKE_DELAY_MS = 1000;
const DOWNLOAD_DEDUPE_WINDOW_MS = 350;
const lastDownloadAtByFilename = new Map<string, number>();

export function triggerJsonDownload(data: unknown, filename: string): void {
    const json = JSON.stringify(data);
    const blob = new Blob([json], {type: 'application/json;charset=utf-8'});
    triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
    const now = Date.now();
    const lastDownloadAt = lastDownloadAtByFilename.get(filename) ?? 0;
    if (now - lastDownloadAt < DOWNLOAD_DEDUPE_WINDOW_MS) {
        return;
    }
    lastDownloadAtByFilename.set(filename, now);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.setAttribute('href', objectUrl);
    anchor.setAttribute('download', filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), DOWNLOAD_REVOKE_DELAY_MS);
}
