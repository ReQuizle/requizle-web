// Vite `import.meta.env.BASE_URL` is root-relative and ends with `/`. For non-root hosts,
// the URL without a trailing slash is a different path; many servers only serve the SPA on the slash form.
// @see https://vitejs.dev/config/shared-options.html#base
function getAppBasePath(): string {
    return import.meta.env.BASE_URL;
}

/** Absolute URL of the app root; ends with `/` when `base` is not `/`. */
export function getCanonicalAppLocationHref(): string {
    return new URL(getAppBasePath(), window.location.origin).href;
}

/** If the location is `/{base}` without the final slash, rewrite to `/{base}/` (matches Vite + static hosting). */
export function normalizeAppUrlTrailingSlash(): void {
    const base = getAppBasePath();
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
    const fallbackHash = window.location.hash;

    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const basePath = getAppBasePath().replace(/\/$/, '');
    const restoredPath = `${basePath}${normalizedPath}`;
    const restoredQuery = rawQuery ? `?${rawQuery}` : '';

    window.history.replaceState(
        window.history.state,
        '',
        `${restoredPath}${restoredQuery}${fallbackHash}`
    );
}
