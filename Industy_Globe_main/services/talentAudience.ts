import type { AudienceReason, NPCActor, Player, TalentAudienceBook, TalentAudiencePerson } from '../types';
import { canonicalKey } from './data/creatorAliases';
import { NPC_DATABASE } from './npcLogic';
import { PUBLIC_CREATORS } from './youtubeCreators';
import { getAbsoluteWeek } from './legacyLogic';

/**
 * Save-backed followers for actors, creators, and generated talent.
 * A later reality show should call shiftTalentFollowers with reason 'REALITY'.
 * This file does not build that show.
 */

const hash = (value: string): number => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

const clampFollowers = (value: number) => Math.max(800, Math.min(600_000_000, Math.round(value)));

export const audienceKey = (id: string, name?: string): string => canonicalKey(name || id);

const emptyBook = (): TalentAudienceBook => ({ version: 1, weekAbs: -1, byKey: {} });

const readBook = (player: Player): TalentAudienceBook => {
    const book = player.world?.talentAudience;
    if (!book || book.version !== 1 || !book.byKey) return emptyBook();
    return book;
};

export const followersOf = (player: Player | null | undefined, id: string, name: string, fallback: number): number => {
    const book = player?.world?.talentAudience?.byKey;
    if (!book) return fallback;
    const key = audienceKey(id, name);
    const row = book[key] || book[audienceKey(id)];
    return row && Number.isFinite(row.followers) ? row.followers : fallback;
};

const ensureRow = (
    book: Record<string, TalentAudiencePerson>,
    key: string,
    followers: number,
    age: number | undefined,
    abs: number,
): TalentAudiencePerson => {
    const existing = book[key];
    if (existing) return existing;
    const row: TalentAudiencePerson = {
        followers: clampFollowers(followers || 1000),
        lastActiveAbs: abs,
        heat: 0,
        age,
    };
    book[key] = row;
    return row;
};

const generatedOf = (player: Player): NPCActor[] =>
    Array.isArray(player.flags?.generatedTalent) ? player.flags.generatedTalent as NPCActor[] : [];

/** Seeds missing rows from the current cast. Does not move anyone. Safe on old saves. */
export const ensureTalentAudience = (player: Player): Player => {
    if (!player.world) return player;
    const book = readBook(player);
    const byKey = { ...book.byKey };
    const abs = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    let changed = book !== player.world.talentAudience;
    const touch = (id: string, name: string, followers: number, age?: number) => {
        const key = audienceKey(id, name);
        if (byKey[key]) return;
        changed = true;
        ensureRow(byKey, key, followers, age, abs);
    };
    NPC_DATABASE.forEach(npc => touch(npc.id, npc.name, npc.followers, npc.age));
    generatedOf(player).forEach(npc => touch(npc.id, npc.name, npc.followers, npc.age));
    PUBLIC_CREATORS.forEach(creator => {
        if (creator.category === 'OFFICIAL') return;
        touch(creator.id, creator.name, creator.followers);
    });
    if (!changed) return player;
    return {
        ...player,
        world: { ...player.world, talentAudience: { version: 1, weekAbs: book.weekAbs, byKey } },
    };
};

const applyToNpc = (npc: NPCActor, row: TalentAudiencePerson | undefined) => {
    if (!row) return;
    npc.followers = row.followers;
    if (row.age) npc.age = row.age;
    npc.retired = !!row.retired;
    npc.slowed = !!row.slowed;
    if (npc.stats && Number.isFinite(npc.stats.fame)) {
        npc.stats.fame = Math.max(1, Math.min(99, npc.stats.fame));
    }
};

/** Writes the book back onto the shared cast so Instagram and X read npc.followers. */
export const applyAudienceToCast = (player: Player): void => {
    const book = player.world?.talentAudience?.byKey;
    if (!book) return;
    NPC_DATABASE.forEach(npc => applyToNpc(npc, book[audienceKey(npc.id, npc.name)]));
    generatedOf(player).forEach(npc => applyToNpc(npc, book[audienceKey(npc.id, npc.name)]));
};

export interface FollowerShift {
    id?: string;
    name?: string;
    reason: AudienceReason;
    /** Signed percent. 4 grows the audience by 4%. -3 shrinks it by 3%. */
    percent: number;
}

/**
 * Reality shows, bookings, and the weekly tick all come through here.
 * Percent is clamped so one call cannot wipe or explode an audience.
 */
export const shiftTalentFollowers = (player: Player, shifts: FollowerShift[]): Player => {
    const seeded = ensureTalentAudience(player);
    const book = readBook(seeded);
    const byKey = { ...book.byKey };
    const abs = getAbsoluteWeek(seeded.age || 18, seeded.currentWeek || 1);
    shifts.forEach(shift => {
        const key = audienceKey(shift.id || shift.name || 'talent', shift.name);
        const row = ensureRow(byKey, key, 5000, undefined, abs);
        const percent = Math.max(-25, Math.min(25, shift.percent));
        const next = clampFollowers(row.followers * (1 + percent / 100));
        byKey[key] = {
            ...row,
            followers: next,
            lastActiveAbs: shift.reason === 'INACTIVITY' ? row.lastActiveAbs : abs,
            heat: shift.reason === 'CONTROVERSY' ? Math.min(100, row.heat + 12) : Math.max(0, row.heat - 1),
        };
    });
    const next: Player = {
        ...seeded,
        world: { ...seeded.world, talentAudience: { version: 1, weekAbs: book.weekAbs, byKey } },
    };
    applyAudienceToCast(next);
    return next;
};

const idKey = (): Map<string, string> => {
    const map = new Map<string, string>();
    NPC_DATABASE.forEach(npc => map.set(npc.id, audienceKey(npc.id, npc.name)));
    PUBLIC_CREATORS.forEach(creator => map.set(creator.id, audienceKey(creator.id, creator.name)));
    return map;
};

const releaseIds = (player: Player, keys: Map<string, string>): { hits: Set<string>; flops: Set<string> } => {
    const hits = new Set<string>();
    const flops = new Set<string>();
    const add = (id: string, bucket: Set<string>) => bucket.add(keys.get(id) || canonicalKey(id));
    const visit = (node: unknown, bucket: Set<string>) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            node.forEach(item => visit(item, bucket));
            return;
        }
        const record = node as { actorId?: string; npcId?: string; cast?: unknown; castList?: unknown };
        if (typeof record.actorId === 'string') add(record.actorId, bucket);
        if (typeof record.npcId === 'string') add(record.npcId, bucket);
        if (record.cast) visit(record.cast, bucket);
        if (record.castList) visit(record.castList, bucket);
    };
    const releases = [...(player.activeReleases || []), ...(player.pastProjects || []).slice(0, 6)] as Array<{ totalGross?: number; budget?: number; status?: string; cast?: unknown; castList?: unknown }>;
    releases.forEach(release => {
        const gross = Number(release.totalGross) || 0;
        const budget = Number(release.budget) || 0;
        const status = String(release.status || '');
        const hit = status === 'BLOCKBUSTER_TRACK' || (budget > 0 && gross > budget * 2);
        const flop = status === 'FLOP_WARNING' || (budget > 0 && gross > 0 && gross < budget * 0.35);
        if (hit) visit(release, hits);
        if (flop) visit(release, flops);
    });
    return { hits, flops };
};

const stepPerson = (
    row: TalentAudiencePerson,
    key: string,
    abs: number,
    hit: boolean,
    flop: boolean,
    booked: boolean,
): TalentAudiencePerson => {
    const roll = hash(`${key}:${abs}`);
    let percent = 0;
    let reason: AudienceReason = 'ACTIVITY';
    const pace = row.retired ? 0.25 : row.slowed ? 0.45 : 1;
    if (hit) {
        percent += (3 + (roll % 5)) * pace;
        reason = 'HIT';
    } else if (flop) {
        percent -= (2 + (roll % 4)) * pace;
        reason = 'FLOP';
    } else if (booked) {
        percent += (0.8 + (roll % 20) / 20) * pace;
        reason = 'COLLAB';
    } else if (roll % 100 < 62) {
        const smallBase = row.followers < 100_000 ? 1.4 : row.followers > 20_000_000 ? 0.25 : 0.7;
        percent += smallBase * (0.4 + (roll % 50) / 100) * pace;
        reason = 'ACTIVITY';
    } else {
        percent -= (0.35 + (roll % 30) / 100) * (row.retired ? 1.4 : pace);
        reason = 'INACTIVITY';
    }
    if (roll % 23 === 0) {
        percent += roll % 2 === 0 ? 1.2 : -1.1;
        reason = 'CONTROVERSY';
    }
    const heat = reason === 'CONTROVERSY' ? Math.min(100, row.heat + 10) : Math.max(0, row.heat - 4);
    return {
        ...row,
        followers: clampFollowers(row.followers * (1 + percent / 100)),
        lastActiveAbs: reason === 'INACTIVITY' ? row.lastActiveAbs : abs,
        heat,
    };
};

/** One pass per in-game week. Activity, hits, flops, bookings, noise, and quiet weeks. */
export const tickTalentAudience = (player: Player): Player => {
    const seeded = ensureTalentAudience(player);
    const abs = getAbsoluteWeek(seeded.age || 18, seeded.currentWeek || 1);
    const prior = readBook(seeded);
    if (prior.weekAbs === abs) {
        applyAudienceToCast(seeded);
        return seeded;
    }
    const keys = idKey();
    generatedOf(seeded).forEach(npc => keys.set(npc.id, audienceKey(npc.id, npc.name)));
    const { hits, flops } = releaseIds(seeded, keys);
    const booked = new Set<string>();
    const noteContract = (npcId?: string) => {
        if (npcId) booked.add(keys.get(npcId) || canonicalKey(npcId));
    };
    (seeded.studio?.talentRoster || []).forEach(contract => {
        if (contract.status === 'ACTIVE') noteContract(contract.npcId);
    });
    (seeded.businesses || []).forEach(business => {
        (business.studioState?.talentRoster || []).forEach(contract => {
            if (contract.status === 'ACTIVE') noteContract(contract.npcId);
        });
    });
    const byKey: Record<string, TalentAudiencePerson> = {};
    Object.entries(prior.byKey).forEach(([key, row]) => {
        byKey[key] = stepPerson(row, key, abs, hits.has(key), flops.has(key), booked.has(key));
    });
    const next: Player = {
        ...seeded,
        world: { ...seeded.world, talentAudience: { version: 1, weekAbs: abs, byKey } },
    };
    applyAudienceToCast(next);
    const economy = { ...(next.world.npcEconomy || {}) };
    NPC_DATABASE.forEach(npc => {
        const row = byKey[audienceKey(npc.id, npc.name)];
        if (!row) return;
        const prev = economy[npc.id] || { fame: npc.stats?.fame || 0, netWorth: npc.netWorth || 0 };
        economy[npc.id] = {
            ...prev,
            followers: row.followers,
            fame: npc.stats?.fame || prev.fame,
            netWorth: npc.netWorth || prev.netWorth,
            retired: !!row.retired,
            slowed: !!row.slowed,
            age: row.age,
        };
    });
    next.world = { ...next.world, npcEconomy: economy };
    const generated = generatedOf(next).map(npc => {
        const row = byKey[audienceKey(npc.id, npc.name)];
        if (!row || !npc.stats) return npc;
        const drift = row.retired ? -0.4 : row.slowed ? 0.15 : 0.35;
        return {
            ...npc,
            followers: row.followers,
            retired: !!row.retired,
            slowed: !!row.slowed,
            stats: { ...npc.stats, fame: Math.max(1, Math.min(99, (npc.stats.fame || 10) + drift)) },
        };
    });
    if (generated.length) next.flags = { ...next.flags, generatedTalent: generated };
    return next;
};

/** Birthday pass: stored ages move one year. Some veterans slow down or step back. */
export const ageTalentAudience = (player: Player): { player: Player; note?: string } => {
    const seeded = ensureTalentAudience(player);
    const book = readBook(seeded);
    const byKey = { ...book.byKey };
    let retiredName = '';
    const consider = (key: string, name: string, baseAge: number | undefined) => {
        const row = byKey[key];
        if (!row) return;
        const age = (row.age || baseAge || 30) + 1;
        let slowed = row.slowed;
        let retired = row.retired;
        const roll = hash(`${key}:age:${age}`);
        if (!retired && age >= 64) slowed = true;
        if (!retired && age >= 78 && roll % 5 === 0) {
            retired = true;
            if (!retiredName) retiredName = name;
        }
        byKey[key] = { ...row, age, slowed, retired };
    };
    NPC_DATABASE.forEach(npc => consider(audienceKey(npc.id, npc.name), npc.name, npc.age));
    generatedOf(seeded).forEach(npc => consider(audienceKey(npc.id, npc.name), npc.name, npc.age));
    const next: Player = {
        ...seeded,
        world: { ...seeded.world, talentAudience: { ...book, byKey } },
    };
    applyAudienceToCast(next);
    return { player: next, note: retiredName ? `${retiredName} is taking fewer jobs this year.` : undefined };
};
