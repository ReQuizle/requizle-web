// Vite's BASE_URL starts and ends with `/`. When the app is not at the site root, the address
// without the final slash is a different path, and static hosts only serve the app at the slash form.
// See https://vite.dev/config/shared-options.html#base

/** Absolute URL of the app root */
export function getCanonicalAppLocationHref(): string {
    return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

/** If the location is `/{base}` without the final slash, rewrite it to `/{base}/`. */
export function normalizeAppUrlTrailingSlash(): void {
    const base = import.meta.env.BASE_URL;
    if (base === '/') return;

    const baseNoSlash = base.replace(/\/$/, '');
    if (window.location.pathname !== baseNoSlash) return;

    const {search, hash} = window.location;
    window.history.replaceState(window.history.state, '', `${baseNoSlash}/${search}${hash}`);
}

/** GitHub Pages: `public/404.html` redirects to `?__rq_path=...`; restore the real path before React Router. */
export function restoreSpaPathFromFallbackQuery(): void {
    const searchParams = new URLSearchParams(window.location.search);
    const rawPath = searchParams.get('__rq_path');
    if (!rawPath) return;

    const rawQuery = searchParams.get('__rq_query');
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const restoredQuery = rawQuery ? `?${rawQuery}` : '';

    window.history.replaceState(
        window.history.state,
        '',
        `${basePath}${normalizedPath}${restoredQuery}${window.location.hash}`
    );
}
