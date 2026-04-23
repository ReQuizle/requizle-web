export function triggerJsonDownload(data: unknown, filename: string): void {
    const json = JSON.stringify(data);
    const blob = new Blob([json], {type: 'application/json;charset=utf-8'});
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.setAttribute('href', objectUrl);
    anchor.setAttribute('download', filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
