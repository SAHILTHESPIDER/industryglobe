import { PlatformBrand, Player } from '../../types';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { formatCompact } from './logic';

/** Thirteen marks, six typefaces, four lockups. Accent comes from the mark. */
export interface BrandMarkDef {
    id: string;
    name: string;
    blurb: string;
    accent: string;
    ink: string;
}

export interface BrandTypefaceDef {
    id: string;
    name: string;
    blurb: string;
    css: string;
}

export interface BrandLockupDef {
    id: string;
    name: string;
    blurb: string;
}

export const BRAND_MARKS: BrandMarkDef[] = [
    { id: 'globe', name: 'Globe', blurb: 'A world with a strip of film across it.', accent: '#F5C16C', ink: '#14100A' },
    { id: 'bolt', name: 'Bolt', blurb: 'A strike. Fast, a little impatient.', accent: '#8B7BFF', ink: '#07061A' },
    { id: 'aperture', name: 'Aperture', blurb: 'A lens, closing.', accent: '#7DD3FC', ink: '#041018' },
    { id: 'ring', name: 'Ring', blurb: 'One circle. Nothing else to remember.', accent: '#FB7185', ink: '#1A0A10' },
    { id: 'slash', name: 'Slash', blurb: 'A cut through the word.', accent: '#F8FAFC', ink: '#0B0C10' },
    { id: 'letter', name: 'Letter', blurb: 'The first character, nothing clever.', accent: '#FDE68A', ink: '#1A1408' },
    { id: 'wave', name: 'Wave', blurb: 'A line that keeps going.', accent: '#34D399', ink: '#04140E' },
    { id: 'diamond', name: 'Diamond', blurb: 'Quiet, and a bit expensive.', accent: '#E7E5E4', ink: '#1C1917' },
    { id: 'orbit', name: 'Orbit', blurb: 'Two paths around an empty middle.', accent: '#38BDF8', ink: '#041018' },
    { id: 'ticket', name: 'Ticket', blurb: 'A stub from a night out.', accent: '#FBBF24', ink: '#1A1408' },
    { id: 'star', name: 'Star', blurb: 'The old promise of a marquee.', accent: '#FDE047', ink: '#1A1604' },
    { id: 'frame', name: 'Frame', blurb: 'A screen with the picture missing.', accent: '#A8A29E', ink: '#0C0A09' },
    { id: 'bars', name: 'Bars', blurb: 'Three pulses, like a meter.', accent: '#FB923C', ink: '#1A0E06' },
    { id: 'play', name: 'Play', blurb: 'A triangle. The thing people press.', accent: '#8B7BFF', ink: '#07061A' },
    { id: 'crown', name: 'Crown', blurb: 'The seat at the head of the table.', accent: '#E4B15A', ink: '#1A1408' },
    { id: 'flame', name: 'Flame', blurb: 'A title that runs hot.', accent: '#F97316', ink: '#1A0E06' },
];

/** The twelve marks offered when a company is founded. Older marks stay valid. */
export const STUDIO_MARKS = ['play', 'star', 'crown', 'wave', 'aperture', 'letter', 'flame', 'orbit', 'bolt', 'globe', 'ring', 'bars'];

export const BRAND_FRAMES: { id: 'circle' | 'rounded' | 'none'; name: string }[] = [
    { id: 'circle', name: 'Circle' },
    { id: 'rounded', name: 'Rounded square' },
    { id: 'none', name: 'None' },
];

export const BRAND_TYPEFACES: BrandTypefaceDef[] = [
    { id: 'condensed', name: 'Bold condensed', blurb: 'Tall caps. The house default.', css: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif' },
    { id: 'poster', name: 'Poster', blurb: 'A one-word billboard.', css: '"Bebas Neue", "Barlow Condensed", Impact, sans-serif' },
    { id: 'serif', name: 'Serif cinematic', blurb: 'A credit roll. Slower.', css: '"Instrument Serif", Georgia, serif' },
    { id: 'prestige', name: 'Prestige', blurb: 'High contrast, for a small shelf.', css: '"Playfair Display", Georgia, serif' },
    { id: 'plain', name: 'Rounded', blurb: 'Soft geometric. Easy at small sizes.', css: 'Outfit, Inter, sans-serif' },
    { id: 'signal', name: 'Futuristic', blurb: 'Wide geometric caps.', css: 'Unbounded, Outfit, sans-serif' },
    { id: 'script', name: 'Script', blurb: 'A signature, written once.', css: '"Instrument Serif", "Segoe Script", cursive' },
    { id: 'mono', name: 'Mono', blurb: 'A slate. Looks like a schedule.', css: '"JetBrains Mono", ui-monospace, monospace' },
];

export const BRAND_LOCKUPS: BrandLockupDef[] = [
    { id: 'beside', name: 'Beside', blurb: 'Mark, then the name. The app icon and the word live together.' },
    { id: 'stacked', name: 'Stacked', blurb: 'Mark on top, name under it. Posters and splash cards.' },
    { id: 'word', name: 'Word', blurb: 'No mark. The letters do the whole job.' },
    { id: 'badge', name: 'Badge', blurb: 'Both of them inside a pill. Notifications and tabs.' },
];

export interface BrandColorDef {
    id: string;
    name: string;
    hex: string;
    blurb: string;
}

/** Founding swatches. Indigo is the default for saves that never picked one. */
export const BRAND_COLORS: BrandColorDef[] = [
    { id: 'indigo', name: 'Empire indigo', hex: '#4F3BFF', blurb: 'The house blue. Night screens and the bolt.' },
    { id: 'azure', name: 'Signal blue', hex: '#38BDF8', blurb: 'Cold and bright. Reads like a news sting.' },
    { id: 'crimson', name: 'Marquee crimson', hex: '#E11D48', blurb: 'A curtain and a ticket stub.' },
    { id: 'gold', name: 'House gold', hex: '#E4B15A', blurb: 'The table, the frame, the credit.' },
    { id: 'emerald', name: 'Field green', hex: '#34D399', blurb: 'A late title card. Quiet money.' },
    { id: 'violet', name: 'Velvet', hex: '#A78BFA', blurb: 'A smaller room, a louder mark.' },
    { id: 'amber', name: 'Marquee amber', hex: '#F59E0B', blurb: 'Warm bulbs over the door.' },
    { id: 'rose', name: 'Rose', hex: '#FB7185', blurb: 'Soft, and a little dangerous.' },
    { id: 'teal', name: 'Teal', hex: '#2DD4BF', blurb: 'Water and glass. Travel titles.' },
    { id: 'ivory', name: 'Ivory', hex: '#F5F0E6', blurb: 'Paper white. The certificate colour.' },
];

export const DEFAULT_BRAND: PlatformBrand = { markId: 'globe', typefaceId: 'condensed', lockupId: 'beside', colorId: 'indigo' };

export const markById = (id?: string): BrandMarkDef => BRAND_MARKS.find(row => row.id === id) || BRAND_MARKS[0];
export const typefaceById = (id?: string): BrandTypefaceDef => BRAND_TYPEFACES.find(row => row.id === id) || BRAND_TYPEFACES[0];
export const lockupById = (id?: string): BrandLockupDef => BRAND_LOCKUPS.find(row => row.id === id) || BRAND_LOCKUPS[0];

export const colorById = (id?: string | null): BrandColorDef => BRAND_COLORS.find(row => row.id === id) || BRAND_COLORS[0];

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
    const s = saturation / 100;
    const l = lightness / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (((hue % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    const table = [
        [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
    ][Math.floor(hp)] || [0, 0, 0];
    const m = l - c / 2;
    const hex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
    return `#${hex(table[0])}${hex(table[1])}${hex(table[2])}`;
};

/** Named swatch, unless the founder moved the hue slider. */
export const brandAccent = (brand?: Partial<PlatformBrand> | null): string => {
    if (brand && Number.isFinite(Number(brand.hue))) {
        const hue = Number(brand.hue);
        const intensity = Math.max(0, Math.min(100, Number(brand.intensity ?? 95)));
        return hslToHex(hue, 12 + intensity * 0.83, 58);
    }
    return colorById(brand?.colorId).hex;
};

const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const mixHex = (from: string, to: string, amount: number): string => {
    const read = (hex: string) => {
        const clean = hex.replace('#', '');
        const full = clean.length === 3 ? clean.split('').map(part => part + part).join('') : clean;
        const number = Number.parseInt(full, 16);
        return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
    };
    const start = read(from);
    const end = read(to);
    const mix = (a: number, b: number) => channel(a + (b - a) * amount);
    const hex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${hex(mix(start.r, end.r))}${hex(mix(start.g, end.g))}${hex(mix(start.b, end.b))}`;
};

/** A lighter highlight of the brand colour, for rings and the current step. */
export const brandVolt = (hex: string): string => mixHex(hex, '#ffffff', 0.38);

export const frameById = (id?: string | null): 'circle' | 'rounded' | 'none' =>
    id === 'circle' || id === 'rounded' ? id : 'none';

/** What a rebrand costs. It leaves company cash, never personal cash. */
export const REBRAND_USD = 250_000;

export const brandFrom = (brand?: Partial<PlatformBrand> | null): PlatformBrand => {
    const next: PlatformBrand = {
        markId: markById(brand?.markId).id,
        typefaceId: typefaceById(brand?.typefaceId).id,
        lockupId: lockupById(brand?.lockupId).id,
        colorId: colorById(brand?.colorId).id,
        frameId: frameById(brand?.frameId),
    };
    if (brand && Number.isFinite(Number(brand.hue))) next.hue = ((Number(brand.hue) % 360) + 360) % 360;
    if (brand && Number.isFinite(Number(brand.intensity))) next.intensity = Math.max(0, Math.min(100, Math.round(Number(brand.intensity))));
    if (typeof brand?.manifesto === 'string' && brand.manifesto.trim()) next.manifesto = brand.manifesto.trim().slice(0, 160);
    if (typeof brand?.promiseId === 'string' && brand.promiseId) next.promiseId = brand.promiseId.slice(0, 40);
    if (typeof brand?.customMark === 'string' && brand.customMark.startsWith('data:image/') && brand.customMark.length < 80_000) {
        next.customMark = brand.customMark;
    }
    return next;
};

/** Old identity presets become a mark so those saves still have a face. */
export const LEGACY_MARK: Record<string, string> = {
    signal: 'ring',
    marquee: 'star',
    noir: 'frame',
    pulse: 'bars',
    atlas: 'globe',
    hearth: 'wave',
    voltage: 'bolt',
    linen: 'diamond',
};

const clonePlatform = (player: Player): Player => {
    const state = player.ownPlatform!;
    return {
        ...player,
        money: player.money,
        logs: [...(player.logs || [])],
        ownPlatform: {
            ...state,
            books: state.books ? { ...state.books, lines: [...state.books.lines], history: [...(state.books.history || [])] } : state.books,
        },
    };
};

/** Pays from company cash and opens colour, logo, and type again. */
export const rebrandPlatform = (player: Player): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ first.' };
    if (!player.ownPlatform.brandLocked) return { player, error: 'The brand is already open.' };
    if (readCompanyCash(player) < REBRAND_USD) {
        return { player, error: `Company cash cannot cover ${formatCompact(REBRAND_USD)} for a rebrand. Personal cash stays put.` };
    }
    const next = clonePlatform(player);
    next.ownPlatform!.brandLocked = false;
    addCompanyCash(next, -REBRAND_USD, `${next.ownPlatform!.name} rebrand`, 'BURN');
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `Rebranded ${next.ownPlatform!.name}. ${formatCompact(REBRAND_USD)} left company cash.`,
        type: 'neutral',
    }];
    return { player: next };
};

/** Seals the current colour, logo, and type. No money moves. */
export const sealBrand = (player: Player): Player => {
    if (!player.ownPlatform) return player;
    return { ...player, ownPlatform: { ...player.ownPlatform, brandLocked: true } };
};

export const legacyBrand = (identityId?: string): PlatformBrand => brandFrom({
    markId: (identityId && LEGACY_MARK[identityId]) || DEFAULT_BRAND.markId,
    typefaceId: identityId === 'linen' || identityId === 'noir' ? 'prestige' : 'condensed',
    lockupId: identityId === 'atlas' ? 'stacked' : 'beside',
});
