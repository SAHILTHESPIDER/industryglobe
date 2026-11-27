import { ActorSkills, CartoonFace, FilmIndustryId, Genre, NPCActor, Player, SkillPointState } from '../types';
import { cartoonDataUrl, DEFAULT_FACE } from './cartoonPortrait';
import {
    birthplaceById,
    handleFromName,
    isDefaultHandle,
    pathById,
    startingSocials,
    STARTING_PATHS,
    traitById,
} from './characterSocial';
import { INDUSTRY_ENGINE } from './industryEngine';
import {
    ActingSkillKey,
    ACTING_SKILL_KEYS,
    allocateLevels,
    castTalentStat,
    actingScore,
    costForNextLevel,
    genreScore,
    grantFreeLevel,
    levelOf,
    offerPayMultiplier,
    PointSpend,
    STARTING_SKILL_POOL,
    CUSTOM_TALENT_POOL,
    SkillTarget,
    tierForFame,
    valueAfterLevel,
} from './skillPointLedger';
import { ALL_GENRES } from './genreCatalog';

export const PLAYER_TALENT_ID = 'PLAYER_CAST';

export interface CharacterDraft {
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'NON_BINARY';
    industry: FilmIndustryId;
    appearance: CartoonFace;
    birthplace: string;
    background: string;
    trait: string;
    actingLevels: Partial<Record<ActingSkillKey, number>>;
    genreLevels: Partial<Record<string, number>>;
}

export interface CustomTalentDraft {
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'NON_BINARY';
    appearance: CartoonFace;
    country: string;
    fame: number;
    actingLevels: Partial<Record<ActingSkillKey, number>>;
    genreLevels: Partial<Record<string, number>>;
}

export const emptySkillState = (): SkillPointState => ({
    earned: 0,
    weeksTowardNext: 0,
    premium: 0,
    characterUnlock: false,
    receipts: [],
});

export const ensureSkillState = (player: Player): SkillPointState => {
    const current = player.skillPoints;
    if (!current) return emptySkillState();
    return {
        earned: Math.max(0, Math.floor(current.earned || 0)),
        weeksTowardNext: Math.max(0, Math.floor(current.weeksTowardNext || 0)),
        premium: Math.max(0, Math.floor(current.premium || 0)),
        characterUnlock: current.characterUnlock === true,
        receipts: Array.isArray(current.receipts) ? current.receipts : [],
    };
};

export const spendsFromDraft = (
    actingLevels: Partial<Record<string, number>>,
    genreLevels: Partial<Record<string, number>>,
): PointSpend[] => {
    const spends: PointSpend[] = [];
    ACTING_SKILL_KEYS.forEach(key => {
        const levels = Math.floor(actingLevels[key] || 0);
        if (levels > 0) spends.push({ target: { kind: 'acting', key }, levels });
    });
    ALL_GENRES.forEach(genre => {
        const levels = Math.floor(genreLevels[genre] || 0);
        if (levels > 0) spends.push({ target: { kind: 'genre', key: genre }, levels });
    });
    return spends;
};

const blankSkills = (): ActorSkills => ({
    delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0,
});

export const sheetFromGrants = (
    grants: SkillTarget[],
    spends: PointSpend[],
    pool: number,
    baseSkills?: Partial<ActorSkills>,
    baseGenre?: Record<string, number>,
) => {
    const skills = { ...blankSkills(), ...(baseSkills || {}) };
    const genreXP: Record<string, number> = {};
    ALL_GENRES.forEach(genre => { genreXP[genre] = baseGenre?.[genre] || 0; });
    grants.forEach(grant => {
        if (grant.kind === 'acting') grantFreeLevel(skills, genreXP, grant);
        else if (ALL_GENRES.includes(grant.key as Genre)) grantFreeLevel(skills, genreXP, { kind: 'genre', key: grant.key as Genre });
    });
    return allocateLevels(skills, genreXP, spends, pool);
};

export const freshCareer = (player: Player): boolean => {
    const maxSkill = Math.max(...ACTING_SKILL_KEYS.map(key => player.stats?.skills?.[key] || 0));
    const maxGenre = Math.max(0, ...Object.values(player.stats?.genreXP || {}).filter(value => typeof value === 'number'));
    return (player.currentWeek || 1) <= 2 && maxSkill < 5 && maxGenre < 5 && (player.stats?.fame || 0) < 5;
};

const applySocials = (player: Player, draft: CharacterDraft, placeName: string): void => {
    const social = startingSocials(draft.name, draft.background, draft.trait, placeName, player.stats?.fame || 0);
    const keepHandle = !isDefaultHandle(player.instagram?.handle);
    const handle = keepHandle ? player.instagram.handle : social.handle;
    player.instagram = {
        ...player.instagram,
        handle,
        followers: Math.max(player.instagram?.followers || 0, social.instagram),
    };
    player.x = {
        ...player.x,
        handle,
        followers: Math.max(player.x?.followers || 0, social.x),
    };
    player.youtube = {
        ...player.youtube,
        handle,
        subscribers: Math.max(player.youtube?.subscribers || 0, social.youtube),
        about: social.bio,
    };
    player.stats.followers = Math.max(player.stats.followers || 0, social.instagram);
    const flags = player.flags || {};
    const previousX = (flags.xExtras || {}) as Record<string, unknown>;
    player.flags = {
        ...flags,
        igProfile: { displayName: draft.name.trim(), bio: social.bio },
        xExtras: {
            ...previousX,
            bio: social.bio,
            location: placeName,
        },
    };
};

export const applyCharacterDraft = (player: Player, draft: CharacterDraft, mode: 'new' | 'existing'): Player => {
    const next: Player = {
        ...player,
        stats: {
            ...player.stats,
            skills: { ...player.stats.skills },
            genreXP: { ...player.stats.genreXP },
        },
        instagram: { ...player.instagram },
        x: { ...player.x },
        youtube: { ...player.youtube },
        flags: { ...(player.flags || {}) },
    };
    const place = birthplaceById(draft.birthplace);
    const name = draft.name.trim();
    next.name = name;
    next.age = draft.age;
    next.gender = draft.gender;
    next.avatar = cartoonDataUrl(draft.appearance);
    next.character = {
        version: 1,
        appearance: { ...draft.appearance },
        birthplace: draft.birthplace,
        background: draft.background,
        trait: draft.trait,
        created: true,
    };
    next.homeIndustryId = draft.industry;
    if (INDUSTRY_ENGINE[draft.industry]) {
        next.languages = [...INDUSTRY_ENGINE[draft.industry].languages];
    }
    next.fameByIndustry = { ...(next.fameByIndustry || {}), [draft.industry]: next.fameByIndustry?.[draft.industry] || 0 };
    const applyPool = mode === 'new' || freshCareer(next);
    if (applyPool) {
        const path = pathById(draft.background);
        const trait = traitById(draft.trait);
        const grants: SkillTarget[] = [];
        if (path) grants.push(path.grant as SkillTarget);
        if (trait) grants.push(trait.grant as SkillTarget);
        const allocated = sheetFromGrants(
            grants,
            spendsFromDraft(draft.actingLevels, draft.genreLevels),
            STARTING_SKILL_POOL,
            mode === 'new' ? undefined : next.stats.skills,
            mode === 'new' ? undefined : next.stats.genreXP,
        );
        if (allocated.ok) {
            next.stats.skills = allocated.skills;
            next.stats.genreXP = allocated.genreXP;
            next.stats.talent = Math.round(actingScore(allocated.skills));
        }
    }
    if (!next.skillPoints) next.skillPoints = emptySkillState();
    applySocials(next, draft, place.name);
    return next;
};

export const applyAppearance = (player: Player, appearance: CartoonFace): Player => {
    const next: Player = { ...player, avatar: cartoonDataUrl(appearance) };
    if (next.character) next.character = { ...next.character, appearance: { ...appearance } };
    else {
        next.character = {
            version: 1,
            appearance: { ...appearance },
            birthplace: 'US',
            background: 'FILM_SCHOOL',
            trait: 'NATURAL',
            created: true,
        };
    }
    return next;
};

export const raisePlayerSkill = (player: Player, target: SkillTarget): { player: Player; error?: string; cost: number } => {
    const skills = { ...blankSkills(), ...player.stats.skills };
    const genreXP = { ...player.stats.genreXP };
    const current = target.kind === 'acting' ? (skills[target.key] || 0) : (genreXP[target.key] || 0);
    const cost = costForNextLevel(levelOf(current));
    if (cost <= 0) return { player, error: 'That craft is already as high as it goes.', cost: 0 };
    const wallet = ensureSkillState(player);
    if (wallet.earned < cost) return { player, error: 'Not enough earned skill points.', cost };
    if (target.kind === 'acting') skills[target.key] = valueAfterLevel(current);
    else genreXP[target.key] = valueAfterLevel(current);
    return {
        cost,
        player: {
            ...player,
            stats: { ...player.stats, skills, genreXP, talent: Math.round(actingScore(skills)) },
            skillPoints: { ...wallet, earned: wallet.earned - cost },
        },
    };
};

/** Applies a level after the server has already taken the premium points. */
export const raiseWithConfirmedPremium = (player: Player, target: SkillTarget, premiumBalance: number, characterUnlock: boolean): Player => {
    const skills = { ...blankSkills(), ...player.stats.skills };
    const genreXP = { ...player.stats.genreXP };
    const current = target.kind === 'acting' ? (skills[target.key] || 0) : (genreXP[target.key] || 0);
    if (costForNextLevel(levelOf(current)) > 0) {
        if (target.kind === 'acting') skills[target.key] = valueAfterLevel(current);
        else genreXP[target.key] = valueAfterLevel(current);
    }
    const wallet = ensureSkillState(player);
    return {
        ...player,
        stats: { ...player.stats, skills, genreXP, talent: Math.round(actingScore(skills)) },
        skillPoints: {
            ...wallet,
            premium: Math.max(0, Math.floor(premiumBalance)),
            characterUnlock: characterUnlock === true,
        },
    };
};

export const rememberPremiumSnapshot = (player: Player, premiumBalance: number, characterUnlock: boolean, receipt?: SkillPointState['receipts'][number]): Player => {
    const wallet = ensureSkillState(player);
    const receipts = receipt && !wallet.receipts.some(item => item.transactionId === receipt.transactionId)
        ? [receipt, ...wallet.receipts].slice(0, 20)
        : wallet.receipts;
    return {
        ...player,
        skillPoints: {
            ...wallet,
            premium: Math.max(0, Math.floor(premiumBalance)),
            characterUnlock: characterUnlock === true,
            receipts,
        },
    };
};

const talentBio = (name: string, country: string, custom: boolean): string =>
    custom
        ? `${name}. Custom talent added on this save. Based in ${country}.`
        : `${name}. Working actor based in ${country}.`;

export const playerTalentRecord = (player: Player): NPCActor | null => {
    if (!player.character?.created && !player.name) return null;
    const acting = actingScore(player.stats?.skills);
    const genre = genreScore(player.stats?.genreXP);
    const fame = player.stats?.fame || 0;
    const place = birthplaceById(player.character?.birthplace);
    const followers = Math.max(player.instagram?.followers || 0, player.stats?.followers || 0, 400 + fame * 40);
    return {
        id: PLAYER_TALENT_ID,
        name: player.name,
        handle: player.instagram?.handle || handleFromName(player.name),
        gender: player.gender === 'ALL' ? 'NON_BINARY' : player.gender,
        avatar: player.avatar,
        tier: tierForFame(fame),
        prestigeBias: 'MIXED',
        openness: 70,
        followers,
        netWorth: Math.max(0, player.money || 0),
        occupation: 'ACTOR',
        talentKind: 'ACTOR',
        bio: (player.flags?.igProfile as { bio?: string } | undefined)?.bio || talentBio(player.name, place.name, false),
        age: player.age,
        country: place.name,
        homeIndustryId: player.homeIndustryId || place.industry,
        languages: player.languages,
        stats: {
            ...player.stats,
            fame,
            talent: castTalentStat(acting, genre),
            skills: player.stats.skills,
            genreXP: player.stats.genreXP,
        },
    };
};

export const buildCustomTalent = (draft: CustomTalentDraft): { npc?: NPCActor; error?: string } => {
    const name = draft.name.trim();
    if (name.length < 2) return { error: 'Give the actor a name.' };
    if (draft.age < 15 || draft.age > 90) return { error: 'Age has to sit between 15 and 90.' };
    const allocated = sheetFromGrants([], spendsFromDraft(draft.actingLevels, draft.genreLevels), CUSTOM_TALENT_POOL);
    if (!allocated.ok) return { error: allocated.error || 'That skill sheet does not fit the pool.' };
    const fame = Math.max(0, Math.min(80, Math.round(draft.fame || 0)));
    const place = birthplaceById(draft.country);
    const acting = actingScore(allocated.skills);
    const genre = genreScore(allocated.genreXP);
    const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const npc: NPCActor = {
        id,
        name,
        handle: handleFromName(name),
        gender: draft.gender,
        avatar: cartoonDataUrl(draft.appearance),
        tier: tierForFame(fame),
        prestigeBias: 'MIXED',
        openness: 60,
        followers: Math.round(500 + fame * 80),
        netWorth: Math.round(20000 + fame * 15000),
        occupation: 'ACTOR',
        talentKind: 'ACTOR',
        bio: talentBio(name, place.name, true),
        age: draft.age,
        country: place.name,
        homeIndustryId: place.industry,
        custom: true,
        stats: {
            health: 80,
            happiness: 70,
            looks: 60,
            body: 60,
            fame,
            reputation: Math.round(fame * 0.6),
            experience: Math.round(fame * 0.4),
            talent: castTalentStat(acting, genre),
            followers: Math.round(500 + fame * 80),
            skills: allocated.skills,
            genreXP: allocated.genreXP,
        },
    };
    return { npc };
};

export const saveTalentPool = (player: Player): NPCActor[] => {
    const custom = Array.isArray(player.customTalent) ? player.customTalent.filter(npc => npc && npc.custom && !npc.retired) : [];
    const self = player.character?.created ? playerTalentRecord(player) : null;
    return [...(self ? [self] : []), ...custom];
};

export const isCustomTalent = (npc?: { custom?: boolean; id?: string } | null): boolean =>
    Boolean(npc?.custom || (npc?.id || '').startsWith('custom_'));

export const isPlayerTalent = (id?: string | null): boolean => id === PLAYER_TALENT_ID;

export const scaleOfferIncome = (base: number, acting: number, genre: number, fame: number): number => {
    const multiplier = offerPayMultiplier(acting, genre, fame);
    return Math.max(1, Math.floor(base * multiplier));
};

export const preferredGenre = (genreXP?: Record<string, number> | null): Genre | null => {
    let best: Genre | null = null;
    let bestValue = 0;
    ALL_GENRES.forEach(genre => {
        const value = genreXP?.[genre] || 0;
        if (value > bestValue) {
            best = genre;
            bestValue = value;
        }
    });
    return bestValue > 0 ? best : null;
};

export const defaultFace = (): CartoonFace => ({ ...DEFAULT_FACE });

export const pathOptions = STARTING_PATHS;
