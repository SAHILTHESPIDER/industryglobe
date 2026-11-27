import type { ContractType, NPCActor, Player, TalentKind } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { followersOf } from './talentAudience';
import { calculateNPCAsk } from './talentService';
import { getEnabledGlobalCreatorSocialProfiles } from './youtubeLogic';
import { canonicalKey } from './data/creatorAliases';
import { isPlayerTalent, saveTalentPool } from './playerTalent';

/** What a studio can book today. REALITY is intentionally not offered here. */
export type BookingKind = 'PROJECT' | 'PROMOTION' | 'APPEARANCE';

export const contractTypeFor = (kind: BookingKind): ContractType => {
    if (kind === 'PROMOTION') return 'PROMOTION';
    if (kind === 'APPEARANCE') return 'APPEARANCE';
    return 'MOVIE_DEAL';
};

export const bookingKindFor = (type?: string): BookingKind => {
    if (type === 'PROMOTION') return 'PROMOTION';
    if (type === 'APPEARANCE') return 'APPEARANCE';
    return 'PROJECT';
};

const creatorKind = (npc: NPCActor): boolean => {
    const kind = npc.talentKind;
    return kind === 'INFLUENCER' || kind === 'YOUTUBER' || kind === 'STREAMER';
};

export const talentLabel = (npc: NPCActor): string => {
    if (npc.talentKind === 'INFLUENCER') return 'Influencer';
    if (npc.talentKind === 'YOUTUBER') return 'YouTuber';
    if (npc.talentKind === 'STREAMER') return 'Streamer';
    if (npc.talentKind === 'DIRECTOR' || npc.occupation === 'DIRECTOR') return 'Director';
    return npc.gender === 'FEMALE' ? 'Actress' : 'Actor';
};

const withLiveFollowers = (player: Player, npc: NPCActor): NPCActor => ({
    ...npc,
    followers: followersOf(player, npc.id, npc.name, npc.followers),
});

/** Actors, generated debuts, and creators, one row per person. */
export const hireablePeople = (player: Player): NPCActor[] => {
    const generated = Array.isArray(player.flags?.generatedTalent) ? player.flags.generatedTalent as NPCActor[] : [];
    const creators = getEnabledGlobalCreatorSocialProfiles(player).filter(npc => npc.forbesCategory !== 'Brand');
    const saveTalent = saveTalentPool(player);
    const seen = new Set<string>();
    const rows: NPCActor[] = [];
    [...saveTalent, ...NPC_DATABASE, ...generated, ...creators].forEach(npc => {
        if (!npc || npc.retired) return;
        if (npc.forbesCategory === 'Official') return;
        if (npc.occupation === 'DIRECTOR' && !creatorKind(npc)) return;
        const key = canonicalKey(npc.name || npc.id);
        if (seen.has(key)) return;
        seen.add(key);
        rows.push(withLiveFollowers(player, npc));
    });
    return rows;
};

export const findHireable = (player: Player, id: string): NPCActor | undefined =>
    hireablePeople(player).find(npc => npc.id === id);

const hash = (value: string) => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

export const marketShelf = (people: NPCActor[], week: number, query: string, filter: 'ALL' | 'ACTORS' | 'CREATORS'): NPCActor[] => {
    const q = query.trim().toLowerCase();
    const matchKind = (npc: NPCActor) => {
        if (filter === 'ACTORS') return !creatorKind(npc);
        if (filter === 'CREATORS') return creatorKind(npc);
        return true;
    };
    if (q) {
        return people
            .filter(matchKind)
            .filter(npc => npc.name.toLowerCase().includes(q) || (npc.country || '').toLowerCase().includes(q) || (npc.homeIndustryId || '').toLowerCase().includes(q) || (npc.custom ? 'custom' : '').includes(q))
            .slice(0, 48);
    }
    const seed = Math.floor(week / 3);
    const pinned = people.filter(npc => matchKind(npc) && (npc.custom || isPlayerTalent(npc.id)));
    const ranked = people
        .filter(npc => matchKind(npc) && !npc.custom && !isPlayerTalent(npc.id))
        .map(npc => ({ npc, sort: hash(`${npc.id}:${seed}`) }))
        .sort((a, b) => a.sort - b.sort)
        .map(row => row.npc);
    const room = Math.max(20, pinned.length);
    if (filter === 'ALL') {
        const actors = ranked.filter(npc => !creatorKind(npc)).slice(0, 10);
        const creators = ranked.filter(creatorKind).slice(0, 10);
        return [...pinned, ...actors, ...creators].slice(0, room + 20);
    }
    return [...pinned, ...ranked].slice(0, room);
};

export interface TalentQuote {
    totalAmount: number;
    weeklyInstallment: number;
    maintenanceFee: number;
}

/** Fee from audience size and fame. Screen actors keep the old ask, nudged by followers. */
export const quoteBooking = (npc: NPCActor, kind: BookingKind, duration = 1): TalentQuote => {
    const followers = Math.max(1000, npc.followers || 1000);
    const fame = Math.max(1, Math.min(100, npc.stats?.fame || 40));
    const fameFactor = 0.55 + fame / 140;
    if (!creatorKind(npc) && kind === 'PROJECT') {
        const base = calculateNPCAsk(npc, Math.max(1, duration));
        const weight = 0.88 + Math.min(0.45, Math.log10(followers) / 18);
        return {
            totalAmount: Math.round(base.totalAmount * weight),
            weeklyInstallment: Math.round(base.weeklyInstallment * weight),
            maintenanceFee: Math.round(base.maintenanceFee * weight),
        };
    }
    let total = 20_000;
    if (kind === 'PROJECT') total = 25_000 + followers * 0.035 * fameFactor;
    else if (kind === 'PROMOTION') total = 4_000 + followers * 0.004 * fameFactor;
    else total = 2_500 + followers * 0.0014 * fameFactor;
    const cap = kind === 'PROJECT' ? 40_000_000 : kind === 'PROMOTION' ? 2_500_000 : 900_000;
    const floor = kind === 'PROJECT' ? 20_000 : kind === 'PROMOTION' ? 4_000 : 2_500;
    const totalAmount = Math.round(Math.max(floor, Math.min(cap, total)));
    const maintenanceFee = Math.min(25_000, Math.max(200, Math.round(totalAmount * 0.002)));
    const weeks = kind === 'PROJECT' ? 52 : 4;
    return {
        totalAmount,
        weeklyInstallment: Math.max(100, Math.ceil((totalAmount * 1.1) / weeks)),
        maintenanceFee,
    };
};

export const defaultBooking = (npc: NPCActor): BookingKind => creatorKind(npc) ? 'PROMOTION' : 'PROJECT';

export const bookingWeeks = (kind: BookingKind) => kind === 'PROJECT' ? 0 : 4;

export type { TalentKind };
