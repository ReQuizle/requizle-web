import {describe, expect, it} from 'vitest';
import {generateAccentFromSeedHex, sanitizeCustomAccentHex} from './colorThemes';

describe('colorThemes', () => {
    it('sanitizes invalid hex to fallback', () => {
        expect(sanitizeCustomAccentHex('not a color', '#ff00ff')).toBe('#ff00ff');
        expect(sanitizeCustomAccentHex('#gg0000', '#112233')).toBe('#112233');
    });

    it('normalizes 3-char hex to 6', () => {
        expect(sanitizeCustomAccentHex('#f0a', '#000000')).toBe('#ff00aa');
    });

    it('builds a full accent ramp around the seed color', () => {
        const palette = generateAccentFromSeedHex('#ec4899');
        expect(palette[50]).toMatch(/^\d+ \d+ \d+$/);
        expect(palette[500]).toBe('236 72 153');
        expect(palette[950]).toMatch(/^\d+ \d+ \d+$/);
    });
});
