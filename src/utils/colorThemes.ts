type PresetColorThemeId = 'indigo' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'monochrome';

export type ColorThemeId = PresetColorThemeId | 'custom';

export const DEFAULT_COLOR_THEME: PresetColorThemeId = 'indigo';

export const DEFAULT_CUSTOM_ACCENT_HEX = '#6366f1';

/** Themes from older versions, and the preset that replaced each */
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

export const COLOR_PRESETS: {id: PresetColorThemeId; label: string; seed: string}[] = [
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

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

type Shade = (typeof SHADES)[number];

/** Each shade as a space-separated RGB triple, the form the CSS variables take */
type ColorPalette = Record<Shade, string>;

type Rgb = [number, number, number];

// Tailwind's slate, whose lightness and saturation the surface colors follow
const SLATE: Record<Shade, Rgb> = {
    50: [248, 250, 252],
    100: [241, 245, 249],
    200: [226, 232, 240],
    300: [203, 213, 225],
    400: [148, 163, 184],
    500: [100, 116, 139],
    600: [71, 85, 105],
    700: [51, 65, 85],
    800: [30, 41, 59],
    900: [15, 23, 42],
    950: [2, 6, 23]
};

// How far each accent shade moves from the seed color: toward white when positive, toward black when negative
const ACCENT_MIX: Record<Shade, number> = {
    50: 0.94,
    100: 0.9,
    200: 0.82,
    300: 0.7,
    400: 0.52,
    500: 0,
    600: -0.12,
    700: -0.24,
    800: -0.4,
    900: -0.54,
    950: -0.65
};

// Monochrome is drawn by hand rather than from a seed. In dark mode its accent is light gray.
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

const MONOCHROME_SURFACE: ColorPalette = {
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

function parseHex(hex: string): Rgb | null {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return null;
    const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
    return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16)) as Rgb;
}

/** The color as lowercase `#rrggbb`, or `fallback` when it is not a hex color. */
export function sanitizeCustomAccentHex(value: unknown, fallback: string = DEFAULT_CUSTOM_ACCENT_HEX): string {
    const rgb = typeof value === 'string' ? parseHex(value) : null;
    return rgb ? `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}` : fallback;
}

function toTriple(rgb: Rgb): string {
    return rgb.map((n) => Math.max(0, Math.min(255, Math.round(n)))).join(' ');
}

/** The accent shades for a seed color, which becomes shade 500. */
export function generateAccentFromSeedHex(hex: string): ColorPalette {
    const seed = parseHex(hex) ?? (parseHex(DEFAULT_CUSTOM_ACCENT_HEX) as Rgb);
    const palette = {} as ColorPalette;
    for (const shade of SHADES) {
        const amount = ACCENT_MIX[shade];
        const target = amount > 0 ? 255 : 0;
        const t = Math.abs(amount);
        palette[shade] = toTriple(seed.map((n) => n * (1 - t) + target * t) as Rgb);
    }
    return palette;
}

function rgbToHsl([r, g, b]: Rgb): {h: number; s: number; l: number} {
    [r, g, b] = [r / 255, g / 255, b / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    if (d === 0) return {h: 0, s: 0, l};
    let h: number;
    if (max === r) h = (60 * ((g - b) / d) + 360) % 360;
    else if (max === g) h = 60 * ((b - r) / d) + 120;
    else h = 60 * ((r - g) / d) + 240;
    return {h, s: d / (1 - Math.abs(2 * l - 1)), l};
}

function hslToRgb(h: number, s: number, l: number): Rgb {
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) => {
        const k = (n + h / 30) % 12;
        return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
    };
    return [channel(0), channel(8), channel(4)];
}

/** Gray surface shades tinted with the seed's hue. Near-gray seeds get slate's blue tint. */
function generateSurfaceFromSeed(seed: Rgb): ColorPalette {
    const {h, s} = rgbToHsl(seed);
    const hue = s < 0.1 ? 220 : h;
    const palette = {} as ColorPalette;
    for (const shade of SHADES) {
        const slate = rgbToHsl(SLATE[shade]);
        palette[shade] = toTriple(hslToRgb(hue, 0.04 + slate.s * 0.5, slate.l));
    }
    return palette;
}

export function isColorThemeId(value: unknown): value is ColorThemeId {
    return value === 'custom' || COLOR_PRESETS.some((preset) => preset.id === value);
}

/** Sets the CSS variables that Tailwind's `indigo` (accent) and `slate` (surface) colors read. */
export function applyDocumentTheme({
    colorTheme,
    customAccentColor,
    appearanceMode
}: {
    colorTheme: ColorThemeId;
    customAccentColor: string;
    appearanceMode: 'light' | 'dark';
}): void {
    let accent: ColorPalette;
    let surface: ColorPalette;
    let contrast = '255 255 255';

    if (colorTheme === 'monochrome') {
        const isDark = appearanceMode === 'dark';
        accent = isDark ? MONOCHROME_DARK_ACCENT : MONOCHROME_LIGHT_ACCENT;
        surface = MONOCHROME_SURFACE;
        if (isDark) contrast = '17 24 39';
    } else {
        const seedHex =
            COLOR_PRESETS.find((preset) => preset.id === colorTheme)?.seed ??
            sanitizeCustomAccentHex(customAccentColor);
        accent = generateAccentFromSeedHex(seedHex);
        surface = generateSurfaceFromSeed(parseHex(seedHex) as Rgb);
    }

    const root = document.documentElement;
    root.dataset.colorTheme = colorTheme;
    for (const shade of SHADES) {
        root.style.setProperty(`--accent-${shade}`, accent[shade]);
        root.style.setProperty(`--surface-${shade}`, surface[shade]);
    }
    root.style.setProperty('--contrast-on-accent', contrast);
}
