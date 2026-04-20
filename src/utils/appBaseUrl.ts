/**
 * Vite `base` is always a root-relative path ending with `/` (e.g. `/` or `/requizle-web/`).
 * For subpath deployments, the directory URL without a trailing slash is a different resource
 * than the canonical app root; static servers and some dev setups only serve `index.html` on
 * the slash form. Normalize to the trailing-slash URL and use it for hard navigations.
 *
 * @see https://vitejs.dev/config/shared-options.html#base
 */

function getAppBasePath(): string {
    return import.meta.env.BASE_URL;
}

/** Full URL to the SPA root (always ends with `/` when base is not `/`). */
export function getCanonicalAppLocationHref(): string {
    return new URL(getAppBasePath(), window.location.origin).href;
}

/**
 * If we are exactly on `/{base}` without the trailing slash, upgrade to `/{base}/`
 * so the URL matches Vite's directory base and hosting conventions.
 */
export function normalizeAppUrlTrailingSlash(): void {
    const base = getAppBasePath();
    if (base === '/') return;

    const baseNoSlash = base.replace(/\/$/, '');
    if (window.location.pathname !== baseNoSlash) return;

    const {search, hash} = window.location;
    window.history.replaceState(window.history.state, '', `${baseNoSlash}/${search}${hash}`);
}
