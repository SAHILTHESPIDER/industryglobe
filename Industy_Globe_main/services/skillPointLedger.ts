import { ActorSkills, Genre } from '../types';
import { ALL_GENRES } from './genreCatalog';

/** One purchased level moves the 0–100 craft score by this many points. */
export const SKILL_STEP = 5;
export const MAX_SKILL_LEVEL = 20;
/** Free points a new star spends during character creation. */
export const STARTING_SKILL_POOL = 12;
/** Points assigned to a custom actor's own sheet. These are not the player's wallet. */
export const CUSTOM_TALENT_POOL = 18;
export const WEEKS_PER_EARNED_POINT = 4;
export const WORKHORSE_WEEKS = 3;

export const ACTING_SKILL_KEYS = [
    'delivery',
    'memorization',
    'expression',
    'improvisation',
    'discipline',
    'presence',
    'charisma',
    'writing',
] as const satisfies readonly (keyof ActorSkills)[];

export type ActingSkillKey = keyof ActorSkills;

export interface SkillFlavour {
    key: string;
    name: string;
    flavour: string;
    kind: 'acting' | 'genre';
}

export const ACTING_FLAVOUR: Record<ActingSkillKey, { name: string; flavour: string }> = {
    delivery: { name: 'Line Delivery', flavour: 'How a take lands the first time the camera rolls.' },
    memorization: { name: 'Script Memory', flavour: 'Sides, pages, and the line that changes in the room.' },
    expression: { name: 'Emotional Range', flavour: 'The feeling a close-up can actually read.' },
    improvisation: { name: 'Improv', flavour: 'When the scene leaves the page and you stay in it.' },
    discipline: { name: 'Set Discipline', flavour: 'Call times, continuity, and the tenth take.' },
    presence: { name: 'Screen Presence', flavour: 'Whether the frame belongs to you when you enter it.' },
    charisma: { name: 'Press Charisma', flavour: 'Junkets, carpets, and the quote that travels.' },
    writing: { name: 'Page Craft', flavour: 'A rewrite that gives the scene somewhere to go.' },
};

export const skillCatalogue = (): SkillFlavour[] => [
    ...ACTING_SKILL_KEYS.map(key => ({ key, kind: 'acting' as const, ...ACTING_FLAVOUR[key] })),
    ...ALL_GENRES.map(genre => ({
        key: genre,
        kind: 'genre' as const,
        name: genre.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()).replace('Sci Fi', 'Sci-Fi'),
        flavour: `How naturally you sit in a ${genre.replace(/_/g, ' ').toLowerCase()} picture.`,
    })),
];

export const levelOf = (value: number): number => {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(MAX_SKILL_LEVEL, Math.floor(safe / SKILL_STEP)));
};

/** Points required to buy the next level from the current one. Level 0 costs 1, level 19 costs 20. */
export const costForNextLevel = (currentLevel: number): number => {
    const level = Math.max(0, Math.min(MAX_SKILL_LEVEL, Math.floor(currentLevel)));
    if (level >= MAX_SKILL_LEVEL) return 0;
    return level + 1;
};

export const valueAfterLevel = (currentValue: number): number => {
    const level = levelOf(currentValue);
    if (level >= MAX_SKILL_LEVEL) return Math.min(100, currentValue);
    return Math.min(100, (level + 1) * SKILL_STEP);
};

/** Same average the casting math uses for the seven on-camera skills. Writing stays on the sheet. */
export const actingScore = (skills?: Partial<ActorSkills> | null): number => {
    const keys: ActingSkillKey[] = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];
    const total = keys.reduce((sum, key) => {
        const value = skills?.[key];
        return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
    }, 0);
    return total / keys.length;
};

export const genreScore = (genreXP?: Record<string, number> | null, genre?: string): number => {
    if (!genreXP) return 0;
    if (genre) {
        const value = genreXP[genre];
        return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    }
    const values = Object.values(genreXP).filter(value => typeof value === 'number' && Number.isFinite(value));
    if (!values.length) return 0;
    const top = [...values].sort((a, b) => b - a).slice(0, 3);
    return top.reduce((sum, value) => sum + value, 0) / top.length;
};

/** Talent number the existing fee and quality formulas already read. */
export const castTalentStat = (acting: number, genre: number): number => {
    const safeActing = Number.isFinite(acting) ? acting : 0;
    const safeGenre = Number.isFinite(genre) ? genre : 0;
    return Math.max(0, Math.min(100, safeActing * 0.72 + safeGenre * 0.28));
};

/** Multiplier on the existing role fee. Craft, genre fit, and fame all move the offer. */
export const offerPayMultiplier = (acting: number, genre: number, fame: number): number => {
    const safeActing = Math.max(0, Math.min(100, acting || 0));
    const safeGenre = Math.max(0, Math.min(100, genre || 0));
    const safeFame = Math.max(0, Math.min(100, fame || 0));
    const raw = 0.75 + (safeActing / 100) * 0.45 + (safeGenre / 100) * 0.25 + (safeFame / 100) * 0.35;
    return Math.round(raw * 100) / 100;
};

export const tierForFame = (fame: number): 'A_LIST' | 'ESTABLISHED' | 'RISING' | 'INDIE' | 'UNKNOWN' => {
    if (fame >= 85) return 'A_LIST';
    if (fame >= 55) return 'ESTABLISHED';
    if (fame >= 25) return 'RISING';
    if (fame >= 8) return 'INDIE';
    return 'UNKNOWN';
};

export type SkillTarget =
    | { kind: 'acting'; key: ActingSkillKey }
    | { kind: 'genre'; key: Genre };

export interface PointSpend {
    target: SkillTarget;
    levels: number;
}

export interface AllocationResult {
    ok: boolean;
    spent: number;
    skills: ActorSkills;
    genreXP: Record<string, number>;
    error?: string;
}

const emptySkills = (): ActorSkills => ({
    delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0,
});

const cloneSkills = (skills?: Partial<ActorSkills> | null): ActorSkills => ({ ...emptySkills(), ...(skills || {}) });

const cloneGenre = (genreXP?: Record<string, number> | null): Record<string, number> => {
    const next: Record<string, number> = {};
    ALL_GENRES.forEach(genre => { next[genre] = 0; });
    Object.entries(genreXP || {}).forEach(([key, value]) => {
        if (typeof value === 'number' && Number.isFinite(value)) next[key] = value;
    });
    return next;
};

const readValue = (skills: ActorSkills, genreXP: Record<string, number>, target: SkillTarget) =>
    target.kind === 'acting' ? (skills[target.key] || 0) : (genreXP[target.key] || 0);

const writeValue = (skills: ActorSkills, genreXP: Record<string, number>, target: SkillTarget, value: number) => {
    if (target.kind === 'acting') skills[target.key] = value;
    else genreXP[target.key] = value;
};

/** Buy whole levels, paying the increasing cost, without going past the pool. */
export const allocateLevels = (
    baseSkills: Partial<ActorSkills> | null | undefined,
    baseGenre: Record<string, number> | null | undefined,
    spends: PointSpend[],
    pool: number,
): AllocationResult => {
    const skills = cloneSkills(baseSkills);
    const genreXP = cloneGenre(baseGenre);
    let remaining = pool;
    let spent = 0;
    for (const spend of spends) {
        const levels = Math.floor(spend.levels);
        if (!Number.isFinite(levels) || levels < 0) {
            return { ok: false, spent, skills, genreXP, error: 'Levels have to be a whole number.' };
        }
        if (spend.target.kind === 'acting' && !ACTING_SKILL_KEYS.includes(spend.target.key)) {
            return { ok: false, spent, skills, genreXP, error: 'That is not an acting skill.' };
        }
        if (spend.target.kind === 'genre' && !ALL_GENRES.includes(spend.target.key)) {
            return { ok: false, spent, skills, genreXP, error: 'That is not a genre in this industry.' };
        }
        for (let step = 0; step < levels; step += 1) {
            const current = readValue(skills, genreXP, spend.target);
            const cost = costForNextLevel(levelOf(current));
            if (cost <= 0) break;
            if (cost > remaining) {
                return { ok: false, spent, skills, genreXP, error: 'That sheet spends more points than the pool allows.' };
            }
            remaining -= cost;
            spent += cost;
            writeValue(skills, genreXP, spend.target, valueAfterLevel(current));
        }
    }
    return { ok: true, spent, skills, genreXP };
};

export const grantFreeLevel = (
    skills: ActorSkills,
    genreXP: Record<string, number>,
    target: SkillTarget,
): void => {
    const current = readValue(skills, genreXP, target);
    if (levelOf(current) >= MAX_SKILL_LEVEL) return;
    writeValue(skills, genreXP, target, valueAfterLevel(current));
};

export type SkillPointProductId =
    | 'character_creation'
    | 'skillpoints_5'
    | 'skillpoints_15'
    | 'skillpoints_40'
    | 'skillpoints_100';

export interface SkillPointPack {
    id: SkillPointProductId;
    storeProductId: string;
    title: string;
    description: string;
    points: number;
    /** Suggested India price. Play Console / App Store Connect is the price that is charged. */
    inr: number;
    inrLabel: string;
    /** Web fallback outside India, before the store returns a localized price. */
    usdLabel: string;
    flagship: boolean;
    kind: 'non_consumable' | 'consumable';
}

export const CHARACTER_PACK_INR = 1500;

export const SKILL_POINT_PACKS: SkillPointPack[] = [
    {
        id: 'character_creation',
        storeProductId: 'com.zeeshapps.actorempire.character.creation',
        title: 'Character Creation',
        description: 'The studio package. Unlocks the character record and adds 150 premium skill points after the store confirms it.',
        points: 150,
        inr: CHARACTER_PACK_INR,
        inrLabel: '₹1,500',
        usdLabel: '$17.99',
        flagship: true,
        kind: 'non_consumable',
    },
    {
        id: 'skillpoints_5',
        storeProductId: 'com.zeeshapps.actorempire.skillpoints.5',
        title: 'Spark Pack',
        description: '5 premium skill points for one more level on a young craft.',
        points: 5,
        inr: 99,
        inrLabel: '₹99',
        usdLabel: '$0.99',
        flagship: false,
        kind: 'consumable',
    },
    {
        id: 'skillpoints_15',
        storeProductId: 'com.zeeshapps.actorempire.skillpoints.15',
        title: 'Scene Pack',
        description: '15 premium skill points. Enough to push a skill through its early levels.',
        points: 15,
        inr: 299,
        inrLabel: '₹299',
        usdLabel: '$2.99',
        flagship: false,
        kind: 'consumable',
    },
    {
        id: 'skillpoints_40',
        storeProductId: 'com.zeeshapps.actorempire.skillpoints.40',
        title: 'Reel Pack',
        description: '40 premium skill points for a mid-career jump across acting or genre.',
        points: 40,
        inr: 699,
        inrLabel: '₹699',
        usdLabel: '$6.99',
        flagship: false,
        kind: 'consumable',
    },
    {
        id: 'skillpoints_100',
        storeProductId: 'com.zeeshapps.actorempire.skillpoints.100',
        title: 'Legacy Pack',
        description: '100 premium skill points. Still priced under the Character Creation package.',
        points: 100,
        inr: 1299,
        inrLabel: '₹1,299',
        usdLabel: '$14.99',
        flagship: false,
        kind: 'consumable',
    },
];

export const packById = (id: string): SkillPointPack | undefined =>
    SKILL_POINT_PACKS.find(pack => pack.id === id);

export const packByStoreId = (storeProductId: string): SkillPointPack | undefined =>
    SKILL_POINT_PACKS.find(pack => pack.storeProductId === storeProductId);

/**
 * India always shows ₹1,500 for the character package.
 * Everywhere else prefers the store's localized price, then $17.99 on web.
 */
export const displayPackPrice = (pack: SkillPointPack, storePrice: string | undefined, inIndia: boolean): string => {
    if (pack.flagship && inIndia) return '₹1,500';
    if (storePrice && storePrice.trim()) return storePrice.trim();
    if (inIndia) return pack.inrLabel;
    return pack.usdLabel;
};

export const smallerPacksAreCheaper = (): boolean => {
    const flagship = SKILL_POINT_PACKS.find(pack => pack.flagship);
    if (!flagship) return false;
    return SKILL_POINT_PACKS.filter(pack => !pack.flagship).every(pack => pack.inr < flagship.inr && pack.points < flagship.points);
};

export interface SkillReceipt {
    transactionId: string;
    productId: SkillPointProductId;
    points: number;
    platform: string;
    characterUnlock: boolean;
}

export interface PremiumLedger {
    premiumBalance: number;
    lifetimeCredited: number;
    lifetimeSpent: number;
    characterUnlock: boolean;
    receipts: Record<string, SkillReceipt>;
    spends: Record<string, number>;
}

export const emptyPremiumLedger = (): PremiumLedger => ({
    premiumBalance: 0,
    lifetimeCredited: 0,
    lifetimeSpent: 0,
    characterUnlock: false,
    receipts: {},
    spends: {},
});

export interface CreditInput {
    productId: string;
    transactionId: string;
    platform: string;
    devTest?: boolean;
    devGrantsEnabled?: boolean;
}

export interface CreditOutcome {
    ok: boolean;
    alreadyCredited: boolean;
    ledger: PremiumLedger;
    points: number;
    error?: string;
}

/** Server-side credit. Idempotent per transaction. Dev grants die unless the server flag is on. */
export const creditVerifiedPack = (ledger: PremiumLedger, input: CreditInput): CreditOutcome => {
    const transactionId = String(input.transactionId || '').trim();
    if (!transactionId || transactionId.length > 180) {
        return { ok: false, alreadyCredited: false, ledger, points: 0, error: 'Missing store transaction.' };
    }
    if (input.devTest) {
        if (!input.devGrantsEnabled) {
            return { ok: false, alreadyCredited: false, ledger, points: 0, error: 'Dev grants are disabled on this server.' };
        }
        if (!transactionId.startsWith('dev_')) {
            return { ok: false, alreadyCredited: false, ledger, points: 0, error: 'Dev transactions have to be marked as dev.' };
        }
    }
    const pack = packById(input.productId);
    if (!pack) {
        return { ok: false, alreadyCredited: false, ledger, points: 0, error: 'Unknown skill point pack.' };
    }
    const existing = ledger.receipts[transactionId];
    if (existing) {
        return { ok: true, alreadyCredited: true, ledger, points: existing.points };
    }
    const next: PremiumLedger = {
        ...ledger,
        receipts: { ...ledger.receipts },
        spends: { ...ledger.spends },
        premiumBalance: ledger.premiumBalance + pack.points,
        lifetimeCredited: ledger.lifetimeCredited + pack.points,
        characterUnlock: ledger.characterUnlock || pack.flagship,
    };
    next.receipts[transactionId] = {
        transactionId,
        productId: pack.id,
        points: pack.points,
        platform: input.platform || 'store',
        characterUnlock: pack.flagship,
    };
    return { ok: true, alreadyCredited: false, ledger: next, points: pack.points };
};

export interface SpendOutcome {
    ok: boolean;
    alreadySpent: boolean;
    ledger: PremiumLedger;
    error?: string;
}

/** Server-side spend. The client raises a skill only after this succeeds. */
export const spendPremiumPoints = (ledger: PremiumLedger, amount: number, requestId: string): SpendOutcome => {
    const id = String(requestId || '').trim();
    const points = Math.floor(amount);
    if (!id || id.length > 120) return { ok: false, alreadySpent: false, ledger, error: 'Missing spend id.' };
    if (!Number.isFinite(points) || points < 1 || points > MAX_SKILL_LEVEL) {
        return { ok: false, alreadySpent: false, ledger, error: 'That spend is not a single skill level.' };
    }
    if (ledger.spends[id]) return { ok: true, alreadySpent: true, ledger };
    if (ledger.premiumBalance < points) {
        return { ok: false, alreadySpent: false, ledger, error: 'Not enough confirmed skill points.' };
    }
    const next: PremiumLedger = {
        ...ledger,
        receipts: { ...ledger.receipts },
        spends: { ...ledger.spends, [id]: points },
        premiumBalance: ledger.premiumBalance - points,
        lifetimeSpent: ledger.lifetimeSpent + points,
    };
    return { ok: true, alreadySpent: false, ledger: next };
};

/** The client is not allowed to invent a higher premium balance. */
export const clientMayRaisePremium = (): false => false;

export interface PremiumSnapshot {
    premiumBalance: number;
    characterUnlock: boolean;
}

export const applyPremiumSnapshot = <T extends { premium: number; characterUnlock: boolean }>(
    local: T,
    snapshot: PremiumSnapshot | null | undefined,
): T => {
    if (!snapshot || typeof snapshot.premiumBalance !== 'number' || !Number.isFinite(snapshot.premiumBalance)) {
        return local;
    }
    return {
        ...local,
        premium: Math.max(0, Math.floor(snapshot.premiumBalance)),
        characterUnlock: snapshot.characterUnlock === true,
    };
};

export interface CraftMods {
    acting: number;
    genre: number;
    performanceBonus: number;
    castingBonus: number;
    boxOfficeCraft: number;
}

export const craftModifiers = (acting: number, genre: number): CraftMods => {
    const safeActing = Math.max(0, Math.min(100, acting || 0));
    const safeGenre = Math.max(0, Math.min(100, genre || 0));
    return {
        acting: safeActing,
        genre: safeGenre,
        performanceBonus: Math.round(safeActing * 0.06 + safeGenre * 0.05),
        castingBonus: Math.round(safeActing * 0.08 + safeGenre * 0.1),
        boxOfficeCraft: Math.round((safeActing / 100 * 0.15 + safeGenre / 100 * 0.2) * 1000) / 1000,
    };
};

export const earnedWeeksNeeded = (trait?: string): number => trait === 'WORKHORSE' ? WORKHORSE_WEEKS : WEEKS_PER_EARNED_POINT;

export const tickEarnedPoints = (earned: number, weeksTowardNext: number, trait?: string): { earned: number; weeksTowardNext: number; gained: number } => {
    const nextWeeks = weeksTowardNext + 1;
    const need = earnedWeeksNeeded(trait);
    if (nextWeeks < need) return { earned, weeksTowardNext: nextWeeks, gained: 0 };
    return { earned: earned + 1, weeksTowardNext: 0, gained: 1 };
};
