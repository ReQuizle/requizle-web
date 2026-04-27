export type PresetColorThemeId =
    | 'indigo'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'monochrome';

export type ColorThemeId = PresetColorThemeId | 'custom';

export const DEFAULT_COLOR_THEME: PresetColorThemeId = 'indigo';

export const LEGACY_COLOR_THEME_MAP: Record<string, PresetColorThemeId> = {
    violet: 'purple',
    cyan: 'blue',
    sky: 'blue',
    fuchsia: 'pink',
    emerald: 'green',
    amber: 'orange',
    lime: 'green',
    gray: 'monochrome',
    rose: 'red'
};

type ColorPalette = {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
};

const SLATE_TEMPL_RGB: ColorPalette = {
    50: '248 250 252',
    100: '241 245 249',
    200: '226 232 240',
    300: '203 213 225',
    400: '148 163 184',
    500: '100 116 139',
    600: '71 85 105',
    700: '51 65 85',
    800: '30 41 59',
    900: '15 23 42',
    950: '2 6 23'
};

const PALETTE_SHADES: (keyof ColorPalette)[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const PRESET_SEEDS: {id: PresetColorThemeId; label: string; seed: string}[] = [
    {id: 'indigo', label: 'Indigo', seed: '#6366f1'},
    {id: 'red', label: 'Red', seed: '#ef4444'},
    {id: 'orange', label: 'Orange', seed: '#f97316'},
    {id: 'yellow', label: 'Yellow', seed: '#eab308'},
    {id: 'green', label: 'Green', seed: '#22c55e'},
    {id: 'blue', label: 'Blue', seed: '#3b82f6'},
    {id: 'purple', label: 'Purple', seed: '#a855f7'},
    {id: 'pink', label: 'Pink', seed: '#ec4899'},
    {id: 'monochrome', label: 'Monochrome', seed: '#737373'}
];

const MONOCHROME_LIGHT_ACCENT: ColorPalette = {
    50: '250 250 250',
    100: '240 240 240',
    200: '220 220 220',
    300: '180 180 180',
    400: '120 120 120',
    500: '64 64 64',
    600: '38 38 38',
    700: '28 28 28',
    800: '20 20 20',
    900: '12 12 12',
    950: '8 8 8'
};

const MONOCHROME_DARK_ACCENT: ColorPalette = {
    50: '250 250 250',
    100: '245 245 245',
    200: '228 228 228',
    300: '200 200 200',
    400: '170 170 170',
    500: '210 210 210',
    600: '240 240 240',
    700: '210 210 210',
    800: '90 90 90',
    900: '45 45 45',
    950: '18 18 18'
};

const MONOCHROME_LIGHT_SURFACE: ColorPalette = {
    50: '250 250 250',
    100: '245 245 245',
    200: '229 229 229',
    300: '212 212 212',
    400: '163 163 163',
    500: '115 115 115',
    600: '82 82 82',
    700: '64 64 64',
    800: '38 38 38',
    900: '23 23 23',
    950: '10 10 10'
};

const MONOCHROME_DARK_SURFACE: ColorPalette = {
    950: '10 10 10',
    900: '23 23 23',
    800: '38 38 38',
    700: '64 64 64',
    600: '82 82 82',
    500: '115 115 115',
    400: '163 163 163',
    300: '212 212 212',
    200: '229 229 229',
    100: '245 245 245',
    50: '250 250 250'
};

function clampByte(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): {r: number; g: number; b: number} | null {
    const t = hex.trim();
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(t)) return null;
    const h = t.slice(1);
    if (h.length === 3) {
        return {
            r: parseInt(h[0] + h[0], 16),
            g: parseInt(h[1] + h[1], 16),
            b: parseInt(h[2] + h[2], 16)
        };
    }
    return {r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16)};
}

export const DEFAULT_CUSTOM_ACCENT_HEX = '#6366f1';

export function sanitizeCustomAccentHex(value: unknown, fallback: string = DEFAULT_CUSTOM_ACCENT_HEX): string {
    if (typeof value !== 'string') return fallback;
    const parsed = parseHex(value);
    if (parsed) return toHex6(parsed);
    return fallback;
}

function toHex6(c: {r: number; g: number; b: number}): string {
    const x = (n: number) => n.toString(16).padStart(2, '0');
    return `#${x(clampByte(c.r))}${x(clampByte(c.g))}${x(clampByte(c.b))}`.toLowerCase();
}

function mixToWhite(r: number, g: number, b: number, t: number): {r: number; g: number; b: number} {
    return {
        r: r * (1 - t) + 255 * t,
        g: g * (1 - t) + 255 * t,
        b: b * (1 - t) + 255 * t
    };
}

function mixToBlack(r: number, g: number, b: number, t: number): {r: number; g: number; b: number} {
    return {
        r: r * (1 - t),
        g: g * (1 - t),
        b: b * (1 - t)
    };
}

const TOWARD_WHITE: Record<50 | 100 | 200 | 300 | 400, number> = {
    50: 0.94,
    100: 0.9,
    200: 0.82,
    300: 0.7,
    400: 0.52
};

const TOWARD_BLACK: Record<600 | 700 | 800 | 900 | 950, number> = {
    600: 0.12,
    700: 0.24,
    800: 0.4,
    900: 0.54,
    950: 0.65
};

function toTriple(c: {r: number; g: number; b: number}): string {
    return `${clampByte(c.r)} ${clampByte(c.g)} ${clampByte(c.b)}`;
}

export function generateAccentFromSeedHex(hex: string): ColorPalette {
    const parsed = parseHex(hex) ?? parseHex(DEFAULT_CUSTOM_ACCENT_HEX)!;
    const {r, g, b} = parsed;
    return {
        50: toTriple(mixToWhite(r, g, b, TOWARD_WHITE[50]!)),
        100: toTriple(mixToWhite(r, g, b, TOWARD_WHITE[100]!)),
        200: toTriple(mixToWhite(r, g, b, TOWARD_WHITE[200]!)),
        300: toTriple(mixToWhite(r, g, b, TOWARD_WHITE[300]!)),
        400: toTriple(mixToWhite(r, g, b, TOWARD_WHITE[400]!)),
        500: toTriple({r, g, b}),
        600: toTriple(mixToBlack(r, g, b, TOWARD_BLACK[600]!)),
        700: toTriple(mixToBlack(r, g, b, TOWARD_BLACK[700]!)),
        800: toTriple(mixToBlack(r, g, b, TOWARD_BLACK[800]!)),
        900: toTriple(mixToBlack(r, g, b, TOWARD_BLACK[900]!)),
        950: toTriple(mixToBlack(r, g, b, TOWARD_BLACK[950]!))
    };
}

function rgbToHsl(r: number, g: number, b: number): {h: number; s: number; l: number} {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
        h =
            max === r
                ? (60 * ((g - b) / d) + 360) % 360
                : max === g
                    ? 60 * ((b - r) / d) + 120
                    : 60 * ((r - g) / d) + 240;
    }
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return {h, s, l};
}

function hslToRgb(h: number, s: number, l: number): {r: number; g: number; b: number} {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (h < 60) {
        r1 = c; g1 = x; b1 = 0;
    } else if (h < 120) {
        r1 = x; g1 = c; b1 = 0;
    } else if (h < 180) {
        r1 = 0; g1 = c; b1 = x;
    } else if (h < 240) {
        r1 = 0; g1 = x; b1 = c;
    } else if (h < 300) {
        r1 = x; g1 = 0; b1 = c;
    } else {
        r1 = c; g1 = 0; b1 = x;
    }
    return {r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255};
}

function generateSurfaceFromAccent500Triple(accent500: string): ColorPalette {
    const tri = accent500.split(/\s+/).map(Number) as [number, number, number];
    const [r, g, b] = tri;
    const {h, s} = rgbToHsl(r, g, b);
    const hue = s < 0.1 ? 220 : h;
    const out: Partial<ColorPalette> = {};
    for (const shade of PALETTE_SHADES) {
        const tpl = SLATE_TEMPL_RGB[shade].split(/\s+/).map(Number) as [number, number, number];
        const {s: sRef, l} = rgbToHsl(tpl[0], tpl[1], tpl[2]);
        const s = 0.04 + sRef * 0.5;
        const {r: rx, g: gy, b: bz} = hslToRgb((hue + 360) % 360, s, l);
        out[shade] = toTriple({r: rx, g: gy, b: bz});
    }
    return out as ColorPalette;
}

const PRESET_ID_SET = new Set<string>([...PRESET_SEEDS.map(p => p.id), 'custom']);

export const COLOR_PRESETS = PRESET_SEEDS;

export function isColorThemeId(value: unknown): value is ColorThemeId {
    return typeof value === 'string' && PRESET_ID_SET.has(value);
}

export function getPresetLabel(id: PresetColorThemeId): string {
    return PRESET_SEEDS.find(p => p.id === id)?.label ?? 'Indigo';
}

export function getSeedForPreset(id: PresetColorThemeId): string {
    return PRESET_SEEDS.find(p => p.id === id)?.seed ?? DEFAULT_CUSTOM_ACCENT_HEX;
}

function resolveAccentHex(colorTheme: ColorThemeId, customAccentColor: string): string {
    if (colorTheme === 'custom') {
        return sanitizeCustomAccentHex(customAccentColor, DEFAULT_CUSTOM_ACCENT_HEX);
    }
    return getSeedForPreset(colorTheme);
}

function resolveAccentPalette(colorTheme: ColorThemeId, customAccentColor: string): ColorPalette {
    return generateAccentFromSeedHex(resolveAccentHex(colorTheme, customAccentColor));
}

export function applyDocumentTheme(args: {
    colorTheme: ColorThemeId;
    customAccentColor: string;
    appearanceMode?: 'light' | 'dark';
}): void {
    if (typeof document === 'undefined') return;
    const {colorTheme, customAccentColor, appearanceMode} = args;
    const root = document.documentElement;
    root.dataset.colorTheme = colorTheme;

    if (colorTheme === 'monochrome') {
        const isDark = appearanceMode !== undefined
            ? appearanceMode === 'dark'
            : root.classList.contains('dark');
        const accent = isDark ? MONOCHROME_DARK_ACCENT : MONOCHROME_LIGHT_ACCENT;
        const surface = isDark ? MONOCHROME_DARK_SURFACE : MONOCHROME_LIGHT_SURFACE;
        const contrast = isDark ? '17 24 39' : '255 255 255';
        for (const shade of PALETTE_SHADES) {
            root.style.setProperty(`--accent-${shade}`, accent[shade]);
            root.style.setProperty(`--surface-${shade}`, surface[shade]);
        }
        root.style.setProperty('--contrast-on-accent', contrast);
        return;
    }

    const accent = resolveAccentPalette(colorTheme, customAccentColor);
    const surface = generateSurfaceFromAccent500Triple(accent[500]);
    for (const shade of PALETTE_SHADES) {
        root.style.setProperty(`--accent-${shade}`, accent[shade]);
        root.style.setProperty(`--surface-${shade}`, surface[shade]);
    }
    root.style.setProperty('--contrast-on-accent', '255 255 255');
}
