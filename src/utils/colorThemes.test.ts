import {describe, expect, it} from 'vitest';
import {generateAccentFromSeedHex, sanitizeCustomAccentHex} from './colorThemes';
function seed500(hex: string): string {
    return generateAccentFromSeedHex(sanitizeCustomAccentHex(hex))[500]!;
}

describe('colorThemes', () => {
    it('sanitizes invalid hex to fallback', () => {
        expect(sanitizeCustomAccentHex('not a color', '#ff00ff')).toBe('#ff00ff');
        expect(sanitizeCustomAccentHex('#gg0000', '#112233')).toBe('#112233');
    });

    it('normalizes 3-char hex to 6', () => {
        expect(sanitizeCustomAccentHex('#f0a', '#000000')).toBe('#ff00aa');
    });

    it('produces a full accent ramp for pink', () => {
        const p = generateAccentFromSeedHex('#ec4899');
        expect(p[50]).toMatch(/^\d+ \d+ \d+$/);
        expect(p[500]).toBe('236 72 153');
        expect(p[950]).toMatch(/^\d+ \d+ \d+$/);
    });
});

describe('custom accent invariants', () => {
    it('keeps 500 as exact seed rgb for standard hex', () => {
        expect(seed500('#ec4899')).toBe('236 72 153');
    });
});
