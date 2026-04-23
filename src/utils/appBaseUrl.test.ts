import {afterEach, describe, expect, it, vi} from 'vitest';

const originalLocation = window.location.href;

describe('appBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        window.history.replaceState(null, '', originalLocation);
    });

    it('uses the origin root as the canonical URL for root deployments', async () => {
        vi.stubEnv('BASE_URL', '/');
        window.history.replaceState(null, '', '/edit');
        const {getCanonicalAppLocationHref} = await import('./appBaseUrl');

        expect(getCanonicalAppLocationHref()).toBe(`${window.location.origin}/`);
    });

    it('normalizes a bare subpath deployment URL to the trailing slash form', async () => {
        vi.stubEnv('BASE_URL', '/requizle-web/');
        window.history.replaceState(null, '', '/requizle-web?x=1#section');
        const {normalizeAppUrlTrailingSlash} = await import('./appBaseUrl');

        normalizeAppUrlTrailingSlash();

        expect(window.location.href).toBe(`${window.location.origin}/requizle-web/?x=1#section`);
    });

    it('leaves unrelated paths unchanged for subpath deployments', async () => {
        vi.stubEnv('BASE_URL', '/requizle-web/');
        window.history.replaceState(null, '', '/edit');
        const {normalizeAppUrlTrailingSlash} = await import('./appBaseUrl');

        normalizeAppUrlTrailingSlash();

        expect(window.location.href).toBe(`${window.location.origin}/edit`);
    });
});
