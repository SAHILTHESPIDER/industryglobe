/**
 * One founding identity for a streaming service, a production house, or any other company.
 * The fee is taken from the books the game already uses. Nothing here is a flat $150M.
 */
import type { PlatformBrand, Player } from '../../types';
import { BUSINESS_BLUEPRINTS, calculateSetupCost } from '../businessLogic';
import { REBRAND_USD, brandAccent, brandFrom, mixHex } from '../ownPlatform/brand';
import type { BusinessConfig, BusinessSubtype, BusinessType } from '../../types';

export interface BrandPromise {
    id: string;
    name: string;
    strategy: string;
    manifesto: string;
    expects: string[];
    forgives: string;
    punishes: string;
}

export const BRAND_PROMISES: BrandPromise[] = [
    { id: 'event', name: 'Event House', strategy: "Everyone's Screen", manifesto: 'We open the night. One title, every screen, and the house watches together.', expects: ['A premiere worth leaving the house for', 'A campaign that shows up in the city'], forgives: 'A quiet Tuesday.', punishes: 'A premiere nobody can find.' },
    { id: 'binge', name: 'Binge Machine', strategy: 'The long stay', manifesto: 'Start one. Stay for the night. The next episode is already waiting.', expects: ['A shelf deep enough to lose a weekend', 'An ending that earns the next click'], forgives: 'A slow first episode.', punishes: 'A catalogue that runs out.' },
    { id: 'fandom', name: 'Fandom Forever', strategy: 'The loyal room', manifesto: 'The fans were here before the logo. We keep a chair for them.', expects: ['A world that continues', 'Merch, music, and a place to argue'], forgives: 'A niche that never charts.', punishes: 'Dropping the people who stayed.' },
    { id: 'world', name: 'World Stage', strategy: 'Every capital', manifesto: 'If a city has a screen, the mark is on it. Language is not an excuse.', expects: ['A release that travels', 'Local voices on the poster'], forgives: 'A market that takes a year.', punishes: 'A dub that embarrasses the city.' },
    { id: 'screen', name: "Everyone's Screen", strategy: "Everyone's Screen", manifesto: 'One subscription the whole house agrees on. No second app at dinner.', expects: ['Something for the kid and something after they sleep', 'A price a family can defend'], forgives: 'A title that is merely good.', punishes: 'A slate that only talks to one age.' },
    { id: 'tech', name: 'Technology First', strategy: 'The room holds', manifesto: 'The picture stays up. The night does not buffer.', expects: ['A stream that starts', 'A peak the rooms were built for'], forgives: 'A plain poster.', punishes: 'An outage on premiere night.' },
    { id: 'critics', name: "The Critics' House", strategy: 'The small shelf', manifesto: 'Fewer titles. Longer reviews. We would rather be argued about than forgotten.', expects: ['A film that can take a bad notice', 'Silence around the work'], forgives: 'A small audience.', punishes: 'A loud campaign for a thin film.' },
];

export const promiseById = (id?: string): BrandPromise => BRAND_PROMISES.find(row => row.id === id) || BRAND_PROMISES[4];

export const COLOUR_PRESETS: { name: string; hue: number; intensity: number }[] = [
    { name: 'Red', hue: 4, intensity: 92 },
    { name: 'Purple', hue: 275, intensity: 78 },
    { name: 'Cyan', hue: 188, intensity: 86 },
    { name: 'Orange', hue: 28, intensity: 96 },
    { name: 'Green', hue: 146, intensity: 72 },
    { name: 'Blue', hue: 230, intensity: 95 },
    { name: 'Yellow', hue: 50, intensity: 90 },
    { name: 'Grey', hue: 220, intensity: 8 },
];

export interface FoundingDraft {
    name: string;
    markId: string;
    lockupId: 'word' | 'beside' | 'stacked';
    typefaceId: string;
    hue: number;
    intensity: number;
    manifesto: string;
    promiseId: string;
    customMark?: string;
}

export const emptyDraft = (name = ''): FoundingDraft => ({
    name,
    markId: 'letter',
    lockupId: 'beside',
    typefaceId: 'condensed',
    hue: 230,
    intensity: 95,
    manifesto: promiseById('screen').manifesto,
    promiseId: 'screen',
});

export const draftToBrand = (draft: FoundingDraft): PlatformBrand => brandFrom({
    markId: draft.customMark ? 'letter' : draft.markId,
    typefaceId: draft.typefaceId,
    lockupId: draft.lockupId,
    colorId: 'indigo',
    frameId: 'rounded',
    hue: draft.hue,
    intensity: draft.intensity,
    manifesto: draft.manifesto,
    promiseId: draft.promiseId,
    customMark: draft.customMark,
});

export const swatchRow = (brand: PlatformBrand): string[] => {
    const base = brandAccent(brand);
    return [base, mixHex(base, '#ffffff', 0.42), mixHex(base, '#0D1E78', 0.62)];
};

/** Production house filing. The blueprint already prices a major studio. */
export const houseFilingFee = (): number => BUSINESS_BLUEPRINTS.PRODUCTION_HOUSE.baseCost;

/** Any other venture. Same setup math the business desk already charges. */
export const ventureFilingFee = (type: BusinessType, subtype: BusinessSubtype, config: BusinessConfig): number => (
    calculateSetupCost(type, subtype, config)
);

/**
 * Streaming identity is filed from personal wealth.
 * Four percent of what they hold, and never less than a rebrand.
 */
export const streamFilingFee = (player: Player): number => {
    const wealth = Math.max(0, Math.round(player.money || 0));
    const slice = Math.round((wealth * 0.04) / 1000) * 1000;
    return Math.max(REBRAND_USD, slice);
};
