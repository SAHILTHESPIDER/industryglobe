/**
 * Fourteen original bumpers. Each one changes the weekly forecast.
 * Discovery multiplies new viewers. Retention multiplies how many of them subscribe
 * and, once the service is full, how slowly they leave. Premium lift reweights the
 * expensive plan when more than one plan exists. Local boost helps a local-language shelf.
 */

export interface IdentDef {
    id: string;
    name: string;
    /** What it sounds like. */
    feel: string;
    /** What the weekly sim actually does with it. */
    effect: string;
    discovery: number;
    retention: number;
    premiumLift: number;
    /** Added to the storefront's local-language floor. */
    localBoost: number;
    /** Added to the piracy share. Negative means fewer unpaid plays. */
    piracy: number;
}

export const IDENTS: IdentDef[] = [
    { id: 'pulse', name: 'Pulse', feel: 'A slow heartbeat under the logo.', effect: 'People who already pay leave more slowly: +8% stay rate.', discovery: 1, retention: 1.08, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'ascent', name: 'Ascent', feel: 'Notes climb, like a title card rising.', effect: 'New viewers find the service faster: +8% new viewers.', discovery: 1.08, retention: 1, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'premiere', name: 'Premiere', feel: 'A short fanfare, then one hit.', effect: 'Opening-night attention spikes and some of it does not stay: +10% new viewers, −3% stay rate.', discovery: 1.1, retention: 0.97, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'choir', name: 'Choir', feel: 'Four voices stack into one chord.', effect: 'Households treat it like a family service and keep paying: +9% stay rate.', discovery: 1, retention: 1.09, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'machine', name: 'Machine', feel: 'Even ticks, like a server room that is already awake.', effect: 'It feels reliable, so fewer people bother with a pirate copy: piracy drops 3 points, and +3% new viewers.', discovery: 1.03, retention: 1, premiumLift: 1, localBoost: 0, piracy: -0.03 },
    { id: 'spark', name: 'Spark', feel: 'A bright blip and a crackle.', effect: 'Younger viewers show up, and they churn: +12% new viewers, −4% stay rate.', discovery: 1.12, retention: 0.96, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'impact', name: 'Impact', feel: 'One low boom you remember.', effect: 'The first click is stronger and more of those people stay: +6% new viewers, +4% stay rate.', discovery: 1.06, retention: 1.04, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'orbit', name: 'Orbit', feel: 'A tone that circles and comes back.', effect: 'A local-language shelf lands harder: +6 points on that floor, and +2% stay rate.', discovery: 1, retention: 1.02, premiumLift: 1, localBoost: 0.06, piracy: 0 },
    { id: 'bloom', name: 'Bloom', feel: 'A slow swell that never hurries.', effect: 'People who arrive stay longer, and fewer stumble in cold: +10% stay rate, −4% new viewers.', discovery: 0.96, retention: 1.1, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'prism', name: 'Prism', feel: 'Shimmering partials, a little expensive.', effect: 'When you sell more than one plan, the pricier plan takes about 1.7× its usual share of new sign-ups.', discovery: 1, retention: 1, premiumLift: 1.7, localBoost: 0, piracy: 0 },
    { id: 'ember', name: 'Ember', feel: 'Warm crackle, like a fire that is already lit.', effect: 'Comfort viewing holds the base: +7% stay rate.', discovery: 1, retention: 1.07, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'signal', name: 'Signal', feel: 'A clean beacon, no ornament.', effect: 'A modest bump in people who find the front page: +5% new viewers.', discovery: 1.05, retention: 1, premiumLift: 1, localBoost: 0, piracy: 0 },
    { id: 'horizon', name: 'Horizon', feel: 'A wide, low pad.', effect: 'New countries feel less foreign: +5 points on the local-language floor and +4% new viewers.', discovery: 1.04, retention: 1, premiumLift: 1, localBoost: 0.05, piracy: 0 },
    { id: 'analog', name: 'Analog', feel: 'Tape warmth and a soft thud.', effect: 'Prestige viewers pay up: the expensive plan weighs about 1.4×, and stay rate is +3%.', discovery: 1, retention: 1.03, premiumLift: 1.4, localBoost: 0, piracy: 0 },
];

export const identById = (id?: string): IdentDef => IDENTS.find(row => row.id === id) || IDENTS[0];

/** One sentence a player can read without opening a tooltip. */
export const identLine = (id?: string): string => {
    const row = identById(id);
    return `${row.feel} ${row.effect}`;
};

/** Old eight-preset ids, so a save from before the bumper split still picks a sound. */
export const LEGACY_IDENT: Record<string, string> = {
    signal: 'signal',
    marquee: 'premiere',
    noir: 'analog',
    pulse: 'pulse',
    atlas: 'horizon',
    hearth: 'ember',
    voltage: 'spark',
    linen: 'prism',
};

export interface IdentEffect {
    /** Multiplies storefront retention. Hearth is the one above 1. */
    familyRetention: number;
    /** Multiplies new viewers. Voltage is the one above 1. */
    youthGrowth: number;
    /** Weight on the expensive plan. Linen is the one above 1. */
    premiumLift: number;
    summary: string;
}

const NEUTRAL_EFFECT: IdentEffect = {
    familyRetention: 1,
    youthGrowth: 1,
    premiumLift: 1,
    summary: 'The sting is the brand. Audience math stays put.',
};

/**
 * The eight presets from before the fourteen bumpers.
 * New games drive the forecast through identId. This map stays so older notes,
 * and a save that still names hearth, voltage, or linen, describe the same idea.
 */
export const identityEffects = (id: string): IdentEffect => {
    if (id === 'hearth') {
        return {
            familyRetention: 1.1,
            youthGrowth: 1,
            premiumLift: 1,
            summary: 'Families stay subscribed longer. +10% retention, and they leave more slowly once the service is full.',
        };
    }
    if (id === 'voltage') {
        return {
            familyRetention: 1,
            youthGrowth: 1.12,
            premiumLift: 1,
            summary: 'Young viewers show up faster. +12% new viewers.',
        };
    }
    if (id === 'linen') {
        return {
            familyRetention: 1,
            youthGrowth: 1,
            premiumLift: 1.85,
            summary: 'Premium plans take a larger share of new subscribers.',
        };
    }
    return NEUTRAL_EFFECT;
};
