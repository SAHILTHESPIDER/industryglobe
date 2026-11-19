import { Gender, NPCActor, NPCPrestige, NPCTier } from '../types';
import { cartoonAvatarUrl } from './cartoonAvatar';
import { canonicalKey } from './data/creatorAliases';
import { TALENT_ROSTER, talentAvatar, talentDisplayName, USE_REAL_NAMES } from './data/talentRoster';
import { hydrateGenreXP } from './genreCatalog';
import { publicPersonName } from './rights/alterName';
import { CreatorCategory, YOUTUBE_ROSTER } from './youtubeRoster';

const M = 1_000_000;

export type { CreatorCategory };

export interface PublicCreator {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    followers: number;
    country: string;
    gender: Exclude<Gender, 'ALL'>;
    niche: string;
    cadence: number;
    category: CreatorCategory;
    viewers: number;
    org: string;
    living: boolean;
    core: true;
}

const slug = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

export const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const genderOf = (value: 'MALE' | 'FEMALE' | 'NON_BINARY'): Exclude<Gender, 'ALL'> =>
    value === 'FEMALE' ? 'FEMALE' : 'MALE';

const ROSTER_CREATORS = TALENT_ROSTER.filter(entry =>
    entry.kind === 'YOUTUBER' || entry.kind === 'STREAMER' || entry.kind === 'INFLUENCER'
);

const rosterByKey = new Map<string, (typeof ROSTER_CREATORS)[number]>();
ROSTER_CREATORS.forEach(entry => {
    const key = canonicalKey(entry.realName);
    if (!rosterByKey.has(key)) rosterByKey.set(key, entry);
});

const shownName = (source: string, living: boolean) =>
    (USE_REAL_NAMES || !living) ? source : publicPersonName(source, living);

export const PUBLIC_CREATORS: PublicCreator[] = (() => {
    const used = new Set<string>();
    const seenKeys = new Set<string>();
    const rows: PublicCreator[] = [];
    const push = (row: PublicCreator, key: string) => {
        if (seenKeys.has(key) || used.has(row.id)) return;
        seenKeys.add(key);
        used.add(row.id);
        rows.push(row);
    };
    YOUTUBE_ROSTER.forEach(row => {
        const key = canonicalKey(row.name);
        const roster = rosterByKey.get(key);
        const name = roster ? talentDisplayName(roster) : shownName(row.name, row.living);
        const base = slug(name) || 'creator';
        const id = roster?.id || `yt_${base}`;
        push({
            id,
            name,
            handle: `@${slug(name) || base}`,
            avatar: roster ? talentAvatar(roster) : cartoonAvatarUrl(`${name} ${row.country}`),
            followers: Math.max(1000, roster ? Math.floor(roster.followersM * M) : Math.floor(row.subsM * M)),
            country: roster?.country || row.country,
            gender: roster ? roster.gender : genderOf(row.gender),
            niche: row.niche,
            cadence: Math.max(1, row.cadence || 1),
            category: row.category,
            viewers: Math.max(0, Math.floor((row.viewersK || 0) * 1000)),
            org: row.org,
            living: row.living,
            core: true,
        }, key);
    });
    ROSTER_CREATORS.forEach(entry => {
        const key = canonicalKey(entry.realName);
        const name = talentDisplayName(entry);
        push({
            id: entry.id,
            name,
            handle: `@${slug(name) || entry.id}`,
            avatar: talentAvatar(entry),
            followers: Math.max(1000, Math.floor(entry.followersM * M)),
            country: entry.country,
            gender: entry.gender,
            niche: entry.kind === 'STREAMER' ? 'Gaming' : entry.kind === 'INFLUENCER' ? 'Lifestyle' : 'Entertainment',
            cadence: 1,
            category: entry.kind === 'STREAMER' ? 'STREAMER' : 'YOUTUBER',
            viewers: entry.kind === 'STREAMER' ? 12_000 : 0,
            org: '',
            living: true,
            core: true,
        }, key);
    });
    return rows;
})();

export const creatorCount = () => PUBLIC_CREATORS.length;

export const streamers = () => PUBLIC_CREATORS.filter(creator => creator.category === 'STREAMER');

export const creatorsByCountry = (country: string) =>
    PUBLIC_CREATORS.filter(creator => creator.country.toLowerCase() === country.toLowerCase());

/** Seeded live slate for a week. Indian streamers are on most weeks; globals rotate. */
export const liveCreators = (absWeek: number, limit = 36): Array<PublicCreator & { concurrent: number }> => {
    return streamers()
        .map(creator => {
            const roll = hashString(`${creator.id}:${absWeek}:live`) % 100;
            const odds = creator.country === 'India' ? 90 : creator.viewers >= 40000 ? 74 : 60;
            if (roll > odds) return null;
            const swing = 0.55 + ((hashString(`${creator.id}:${absWeek}:ccv`) % 90) / 100);
            const concurrent = Math.max(800, Math.floor((creator.viewers || creator.followers * 0.004) * swing));
            return { ...creator, concurrent };
        })
        .filter((row): row is PublicCreator & { concurrent: number } => !!row)
        .sort((a, b) => b.concurrent - a.concurrent)
        .slice(0, limit);
};

export const reactionTitle = (creator: PublicCreator, project: string, kind: string): string => {
    const lines = [
        `${creator.name} reacts to ${project} ${kind}`,
        `${project} ${kind} — ${creator.name} loses it`,
        `Watching ${project} with ${creator.name}`,
        `${creator.name} raids the ${project} premiere`,
    ];
    return lines[hashString(`${creator.id}:${project}:${kind}`) % lines.length];
};

export const toNpc = (creator: PublicCreator): NPCActor => ({
    id: creator.id,
    name: creator.name,
    handle: creator.handle,
    gender: creator.gender,
    avatar: creator.avatar,
    tier: (creator.followers >= 20 * M ? 'A_LIST' : creator.followers >= 5 * M ? 'ESTABLISHED' : 'RISING') as NPCTier,
    prestigeBias: (creator.niche === 'News' || creator.niche === 'Education' ? 'PRESTIGE' : 'COMMERCIAL') as NPCPrestige,
    openness: creator.followers >= 20 * M ? 12 : 28,
    followers: creator.followers,
    netWorth: Math.max(1_000_000, Math.floor(creator.followers * (creator.category === 'STREAMER' ? 1.2 : 1.8))),
    occupation: 'ACTOR',
    bio: `${creator.country} ${creator.category === 'STREAMER' ? 'streamer' : 'creator'} · ${creator.niche}${creator.org ? ` · ${creator.org}` : ''}.`,
    stats: {
        talent: 70,
        fame: creator.followers >= 20 * M ? 90 : creator.followers >= 5 * M ? 74 : 58,
        genreXP: hydrateGenreXP({
            ACTION: 30, DRAMA: 30, COMEDY: 80, ROMANCE: 15, THRILLER: 25,
            HORROR: creator.niche === 'Horror' ? 80 : 20, SCI_FI: 35, ADVENTURE: 60, SUPERHERO: 25,
        }),
    },
    traits: creator.category === 'STREAMER' ? ['AMBITIOUS', 'WORKAHOLIC'] : ['AMBITIOUS', 'EASY_GOING'],
    potential: 85,
    isIndependent: true,
    forbesCategory: creator.category === 'STREAMER' ? 'Streamer' : 'Creator',
});

export const findCreator = (idOrName: string) =>
    PUBLIC_CREATORS.find(creator => creator.id === idOrName || creator.name === idOrName || creator.handle === idOrName);
