import { PlatformBrand } from '../../types';

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
];

export const BRAND_TYPEFACES: BrandTypefaceDef[] = [
    { id: 'condensed', name: 'Marquee', blurb: 'Tall condensed caps. Reads across a street.', css: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif' },
    { id: 'plain', name: 'Plain', blurb: 'The interface face. Easy at small sizes.', css: 'Outfit, Inter, sans-serif' },
    { id: 'serif', name: 'Credits', blurb: 'A credit roll. Slower, more serious.', css: '"Instrument Serif", Georgia, serif' },
    { id: 'mono', name: 'Slate', blurb: 'Technical. Looks like a schedule.', css: '"JetBrains Mono", ui-monospace, monospace' },
    { id: 'prestige', name: 'Prestige', blurb: 'High contrast serif for a small shelf.', css: '"Playfair Display", Georgia, serif' },
    { id: 'signal', name: 'Signal', blurb: 'Wide geometric caps. Loud on a phone.', css: 'Unbounded, Outfit, sans-serif' },
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

export const brandAccent = (brand?: Partial<PlatformBrand> | null): string => colorById(brand?.colorId).hex;

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

export const brandFrom = (brand?: Partial<PlatformBrand> | null): PlatformBrand => ({
    markId: markById(brand?.markId).id,
    typefaceId: typefaceById(brand?.typefaceId).id,
    lockupId: lockupById(brand?.lockupId).id,
    colorId: colorById(brand?.colorId).id,
});

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

export const legacyBrand = (identityId?: string): PlatformBrand => brandFrom({
    markId: (identityId && LEGACY_MARK[identityId]) || DEFAULT_BRAND.markId,
    typefaceId: identityId === 'linen' || identityId === 'noir' ? 'prestige' : 'condensed',
    lockupId: identityId === 'atlas' ? 'stacked' : 'beside',
});
