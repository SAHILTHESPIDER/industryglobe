import {
    IndustryProject, Player, RivalPersonality, RivalYoutubeChannel, RivalHouseKind, YoutubeChannel, YoutubeVideo, YoutubeVideoType,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { PLATFORMS } from './streamingLogic';
import { hashString } from './youtubeCreators';
import { aiOffline } from '../src/services/aiContent';
import { dropOutlook, fatigueMultiplier, isBigDrop, SWEET_WINDOW } from './youtubeConsequences';

/**
 * Rival YouTube houses.
 *
 * Every production house and streaming platform already in the world gets a channel.
 * Music labels come from the public label roster plus a few houses outside India,
 * so language and country exist before the global-industries phase.
 * Personalities are a fixed map, otherwise a hash of the house id. Same id, same personality.
 *
 * CADENCE is how many uploads a personality attempts in a week. It is not a cap.
 * HISTORY_WEEKS / PER_CHANNEL_CAP / GLOBAL_CAP keep the save small on a phone.
 */

export const HISTORY_WEEKS = 12;
export const PER_CHANNEL_CAP = 16;
export const GLOBAL_CAP = 260;
export const BACKFILL_WEEKS = 4;
export const COMMENT_CAP = 4;

const CADENCE: Record<RivalPersonality, { base: number; extra: number }> = {
    AGGRESSIVE: { base: 1, extra: 0.4 },
    MYSTERY: { base: 0, extra: 0.22 },
    MUSIC_LED: { base: 1, extra: 0.2 },
    SPAMMY: { base: 2, extra: 0.6 },
    PRESTIGE: { base: 0, extra: 0.32 },
};

const STUDIO_PERSONALITY: Record<string, RivalPersonality> = {
    MARVEL_STUDIOS: 'AGGRESSIVE',
    WARNER_BROS: 'AGGRESSIVE',
    NETFLIX: 'AGGRESSIVE',
    DISNEY_PLUS: 'AGGRESSIVE',
    PARAMOUNT: 'AGGRESSIVE',
    DC_STUDIOS: 'AGGRESSIVE',
    ARTISAN_PICTURES: 'MYSTERY',
    LUCASFILM: 'MYSTERY',
    HBO: 'PRESTIGE',
    APPLE_TV: 'PRESTIGE',
    UNIVERSAL: 'MUSIC_LED',
    HULU: 'SPAMMY',
    YOUTUBE: 'SPAMMY',
};

export interface MusicLabelSeed {
    id: string;
    name: string;
    country: string;
    language: string;
    subscribers: number;
    personality?: RivalPersonality;
}

/** Indian labels already treated as official music channels, plus houses for later regions. */
export const MUSIC_LABELS: MusicLabelSeed[] = [
    { id: 'tseries', name: 'T-Series', country: 'IN', language: 'hi', subscribers: 280_000_000, personality: 'MUSIC_LED' },
    { id: 'sony-music-india', name: 'Sony Music India', country: 'IN', language: 'hi', subscribers: 62_000_000, personality: 'MUSIC_LED' },
    { id: 'zee-music', name: 'Zee Music Company', country: 'IN', language: 'hi', subscribers: 110_000_000, personality: 'MUSIC_LED' },
    { id: 'set-india', name: 'SET India', country: 'IN', language: 'hi', subscribers: 180_000_000, personality: 'SPAMMY' },
    { id: 'goldmines', name: 'Goldmines', country: 'IN', language: 'hi', subscribers: 98_000_000, personality: 'SPAMMY' },
    { id: 'shemaroo', name: 'Shemaroo', country: 'IN', language: 'hi', subscribers: 70_000_000, personality: 'MUSIC_LED' },
    { id: 'tips', name: 'Tips Official', country: 'IN', language: 'hi', subscribers: 40_000_000, personality: 'MUSIC_LED' },
    { id: 'saregama', name: 'Saregama Music', country: 'IN', language: 'hi', subscribers: 18_000_000, personality: 'PRESTIGE' },
    { id: 'wave-music', name: 'Wave Music', country: 'IN', language: 'hi', subscribers: 42_000_000, personality: 'SPAMMY' },
    { id: 'tseries-punjab', name: 'T-Series Apna Punjab', country: 'IN', language: 'pa', subscribers: 22_000_000, personality: 'MUSIC_LED' },
    { id: 'atlantic', name: 'Atlantic Records', country: 'US', language: 'en', subscribers: 18_000_000, personality: 'MUSIC_LED' },
    { id: 'hybe', name: 'HYBE Labels', country: 'KR', language: 'ko', subscribers: 42_000_000, personality: 'AGGRESSIVE' },
    { id: 'universal-music', name: 'Universal Music', country: 'US', language: 'en', subscribers: 35_000_000, personality: 'MUSIC_LED' },
    { id: 'polydor', name: 'Polydor', country: 'GB', language: 'en', subscribers: 8_000_000, personality: 'PRESTIGE' },
    { id: 'mavin', name: 'Mavin Records', country: 'NG', language: 'en', subscribers: 6_000_000, personality: 'MUSIC_LED' },
    { id: 'tencent-music', name: 'Tencent Music', country: 'CN', language: 'zh', subscribers: 22_000_000, personality: 'SPAMMY' },
];

const PERSONALITY_ORDER: RivalPersonality[] = ['AGGRESSIVE', 'MYSTERY', 'MUSIC_LED', 'SPAMMY', 'PRESTIGE'];

const PLATFORM_IDS = new Set(Object.keys(PLATFORMS));

const TYPE_REACH: Record<string, number> = {
    ANNOUNCEMENT: 0.35,
    MOTION_POSTER: 0.28,
    CHARACTER_POSTER: 0.14,
    TEASER: 0.8,
    TRAILER_1: 1,
    TRAILER_2: 0.85,
    FINAL_TRAILER: 1.1,
    MUSIC_VIDEO: 0.9,
    LYRIC_VIDEO: 0.45,
    JUKEBOX: 0.35,
    BTS: 0.22,
    CAST_INTERVIEW: 0.2,
    RELEASE_PROMO: 0.55,
    STREAM_PREMIERE: 0.9,
    PREMIERE_LIVE: 0.7,
    CLIP: 0.16,
    REVIEW_ROUNDUP: 0.2,
    SHORT: 0.3,
    DELETED_SCENE: 0.12,
};

const TONE: Record<string, string> = {
    ANNOUNCEMENT: 'poster-hero',
    MOTION_POSTER: 'poster-hero',
    CHARACTER_POSTER: 'poster-series',
    TEASER: 'poster-hero',
    TRAILER_1: 'poster-hero',
    TRAILER_2: 'poster-scifi',
    FINAL_TRAILER: 'poster-hero',
    MUSIC_VIDEO: 'poster-song',
    LYRIC_VIDEO: 'poster-song',
    JUKEBOX: 'poster-song',
    BTS: 'poster-bts',
    CAST_INTERVIEW: 'poster-interview',
    RELEASE_PROMO: 'poster-live',
    STREAM_PREMIERE: 'poster-series',
    PREMIERE_LIVE: 'poster-live',
    CLIP: 'poster-bts',
    SHORT: 'poster-short',
    REVIEW_ROUNDUP: 'poster-interview',
};

const DURATION: Record<string, string> = {
    ANNOUNCEMENT: '1:08',
    MOTION_POSTER: '0:42',
    CHARACTER_POSTER: '0:28',
    TEASER: '1:24',
    TRAILER_1: '2:31',
    TRAILER_2: '2:18',
    FINAL_TRAILER: '2:46',
    MUSIC_VIDEO: '3:42',
    LYRIC_VIDEO: '3:36',
    JUKEBOX: '4:10',
    BTS: '8:12',
    CAST_INTERVIEW: '12:40',
    RELEASE_PROMO: '0:36',
    STREAM_PREMIERE: '2:12',
    PREMIERE_LIVE: '48:00',
    CLIP: '1:02',
    SHORT: '0:22',
    REVIEW_ROUNDUP: '6:40',
};

export const personalityLabel = (personality: RivalPersonality): string => {
    const labels: Record<RivalPersonality, string> = {
        AGGRESSIVE: 'Aggressive marketer',
        MYSTERY: 'Keeps it quiet',
        MUSIC_LED: 'Music first',
        SPAMMY: 'Posts constantly',
        PRESTIGE: 'Slow burn',
    };
    return labels[personality];
};

export const personalityFor = (id: string, kind: RivalHouseKind, archetype?: string): RivalPersonality => {
    if (kind === 'LABEL') {
        const seeded = MUSIC_LABELS.find(label => label.id === id);
        if (seeded?.personality) return seeded.personality;
        return hashString(`${id}:pers`) % 5 === 0 ? 'SPAMMY' : 'MUSIC_LED';
    }
    if (STUDIO_PERSONALITY[id]) return STUDIO_PERSONALITY[id];
    if (archetype === 'PRESTIGE' || archetype === 'AWARDS_BOUTIQUE' || archetype === 'PRESTIGE_LABEL') {
        return hashString(id) % 2 === 0 ? 'PRESTIGE' : 'MYSTERY';
    }
    return PERSONALITY_ORDER[hashString(`personality:${id}`) % PERSONALITY_ORDER.length];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22);

const youtubeAbsToParts = (abs: number): { age: number; week: number } => ({
    age: Math.floor(abs / 52) + 1,
    week: (abs % 52) + 1,
});

const projectAbs = (project: IndustryProject, fallbackAge: number, fallbackWeek: number): number =>
    getAbsoluteWeek(Math.max(1, project.year || fallbackAge), project.weekReleased || fallbackWeek);

interface SlateItem {
    id: string;
    title: string;
    studioId: string;
    quality: number;
    releaseAbs: number;
    released: boolean;
    lead: string;
    director: string;
}

const collectSlate = (player: Player): SlateItem[] => {
    const age = player.age || 18;
    const week = player.currentWeek || 1;
    const releasedIds = new Set((player.world?.projects || []).map(project => project.id));
    const rows = [...(player.world?.upcomingRivals || []), ...(player.world?.projects || [])];
    const seen = new Set<string>();
    const slate: SlateItem[] = [];
    rows.forEach(project => {
        if (!project?.id || !project.title || seen.has(project.id)) return;
        seen.add(project.id);
        slate.push({
            id: project.id,
            title: project.title,
            studioId: project.studioId,
            quality: project.quality || 55,
            releaseAbs: projectAbs(project, age, week),
            released: releasedIds.has(project.id),
            lead: project.leadActorName || 'the lead',
            director: project.directorName || 'the director',
        });
    });
    return slate;
};

const baselineSubs = (kind: RivalHouseKind, reputation: number, valuation: number, listed?: number): number => {
    if (kind === 'LABEL' && listed) return listed;
    if (kind === 'PLATFORM') {
        const millions = Math.max(1, listed || valuation || 20);
        return Math.round(Math.min(25_000_000, 800_000 + Math.pow(millions, 0.72) * 90_000));
    }
    const rep = clamp(reputation || 70, 20, 100);
    const val = Math.min(400, Math.max(1, valuation || 10));
    return Math.round(120_000 + rep * 45_000 + val * 18_000);
};

interface HouseSeed {
    id: string;
    houseId: string;
    kind: RivalHouseKind;
    name: string;
    handle: string;
    personality: RivalPersonality;
    language: string;
    country: string;
    subscribers: number;
}

const studioOrigin = (id: string): { country: string; language: string } => {
    const catalog = STUDIO_CATALOG[id];
    if (catalog) return { country: 'US', language: 'en' };
    return { country: 'IN', language: 'hi' };
};

const housesFor = (player: Player): HouseSeed[] => {
    const houses: HouseSeed[] = [];
    const seen = new Set<string>();
    const studioRows = player.world?.studios
        ? Object.values(player.world.studios)
        : Object.values(STUDIO_CATALOG).map(studio => ({
            id: studio.id,
            name: studio.name,
            valuation: studio.valuation,
            reputation: Math.round(Math.min(98, 70 + studio.qualityBias.script * 8)),
            archetype: studio.archetype,
            isPlayerOwned: false,
            mergedIntoBusinessId: undefined as string | undefined,
        }));

    studioRows.forEach(studio => {
        if (!studio?.id || studio.isPlayerOwned || studio.mergedIntoBusinessId) return;
        const origin = studioOrigin(String(studio.id));
        const archetype = 'archetype' in studio ? String(studio.archetype || '') : '';
        const kind: RivalHouseKind = PLATFORM_IDS.has(String(studio.id)) || archetype === 'PLATFORM' ? 'PLATFORM' : 'STUDIO';
        const platform = PLATFORMS[studio.id as keyof typeof PLATFORMS];
        houses.push({
            id: `house:${studio.id}`,
            houseId: String(studio.id),
            kind,
            name: studio.name || STUDIO_CATALOG[studio.id]?.name || String(studio.id),
            handle: '',
            personality: personalityFor(String(studio.id), kind, archetype),
            language: origin.language,
            country: origin.country,
            subscribers: baselineSubs(kind, studio.reputation || 70, studio.valuation || 10, platform?.subscribers),
        });
        seen.add(String(studio.id));
    });

    Object.values(STUDIO_CATALOG).forEach(studio => {
        if (seen.has(studio.id)) return;
        const kind: RivalHouseKind = PLATFORM_IDS.has(studio.id) ? 'PLATFORM' : 'STUDIO';
        houses.push({
            id: `house:${studio.id}`,
            houseId: studio.id,
            kind,
            name: studio.name,
            handle: '',
            personality: personalityFor(studio.id, kind, studio.archetype),
            language: 'en',
            country: 'US',
            subscribers: baselineSubs(kind, 75, studio.valuation, PLATFORMS[studio.id as keyof typeof PLATFORMS]?.subscribers),
        });
    });

    const handles = new Set<string>();
    const named = houses.map(house => {
        let handle = `@${slug(house.name) || 'studio'}`;
        if (handles.has(handle)) handle = `@${slug(house.name).slice(0, 16)}${hashString(house.id) % 90}`;
        handles.add(handle);
        return { ...house, handle };
    });

    MUSIC_LABELS.forEach(label => {
        let handle = `@${slug(label.name) || label.id}`;
        if (handles.has(handle)) handle = `@${label.id.replace(/-/g, '')}`;
        handles.add(handle);
        named.push({
            id: `label:${label.id}`,
            houseId: label.id,
            kind: 'LABEL',
            name: label.name,
            personality: personalityFor(label.id, 'LABEL'),
            language: label.language,
            country: label.country,
            subscribers: label.subscribers,
            handle,
        });
    });
    return named;
};

const mergeRoster = (existing: RivalYoutubeChannel[] | undefined, seeds: HouseSeed[]): RivalYoutubeChannel[] => {
    const previous = new Map((existing || []).map(channel => [channel.id, channel]));
    return seeds.map(seed => {
        const prior = previous.get(seed.id);
        if (!prior) {
            return {
                id: seed.id,
                houseId: seed.houseId,
                kind: seed.kind,
                name: seed.name,
                handle: seed.handle || `@${slug(seed.name)}`,
                subscribers: seed.subscribers,
                totalViews: 0,
                videos: [],
                personality: seed.personality,
                language: seed.language,
                country: seed.country,
                fatigue: 0,
                backlash: 0,
            };
        }
        return {
            ...prior,
            name: seed.name,
            kind: seed.kind,
            personality: seed.personality,
            language: prior.language || seed.language,
            country: prior.country || seed.country,
                handle: prior.handle || seed.handle,
            subscribers: prior.subscribers || seed.subscribers,
            videos: prior.videos || [],
            fatigue: prior.fatigue || 0,
            backlash: prior.backlash || 0,
            totalViews: prior.totalViews || 0,
        };
    });
};

export const pruneRivalChannels = (channels: RivalYoutubeChannel[]): RivalYoutubeChannel[] => {
    const next = channels.map(channel => ({
        ...channel,
        videos: [...(channel.videos || [])]
            .sort((a, b) => uploadAbs(b) - uploadAbs(a))
            .slice(0, PER_CHANNEL_CAP)
            .map(video => ({
                ...video,
                weeklyHistory: (video.weeklyHistory || []).slice(-HISTORY_WEEKS),
                comments: (video.comments || []).slice(0, COMMENT_CAP),
            })),
    }));
    let total = next.reduce((sum, channel) => sum + channel.videos.length, 0);
    while (total > GLOBAL_CAP) {
        let longest = 0;
        next.forEach((channel, index) => {
            if (channel.videos.length > next[longest].videos.length) longest = index;
        });
        if (next[longest].videos.length <= 2) break;
        next[longest] = { ...next[longest], videos: next[longest].videos.slice(0, -1) };
        total -= 1;
    }
    return next;
};

const uploadAbs = (video: YoutubeVideo): number =>
    getAbsoluteWeek(video.yearUploaded || 1, video.weekUploaded || 1);

const playerBigDrops = (player: Player, abs: number): number => {
    let count = 0;
    Object.values(player.youtube?.marketing || {}).forEach(campaign => {
        (campaign.drops || []).forEach(drop => {
            if (drop.scheduledWeekAbs === abs && isBigDrop(drop.type)) count += 1;
        });
    });
    return count;
};

const menuFor = (channel: RivalYoutubeChannel, weeksOut: number, released: boolean): YoutubeVideoType[] => {
    if (channel.kind === 'LABEL') {
        const songs: YoutubeVideoType[] = ['MUSIC_VIDEO', 'LYRIC_VIDEO', 'JUKEBOX'];
        if (weeksOut > 10 && weeksOut < 24) songs.push('ANNOUNCEMENT');
        if (released) songs.push('LYRIC_VIDEO', 'MUSIC_VIDEO');
        return songs;
    }
    if (channel.kind === 'PLATFORM') {
        if (released || weeksOut <= 2) return ['STREAM_PREMIERE', 'RELEASE_PROMO', 'TEASER', 'CLIP'];
        if (weeksOut <= 8) return ['STREAM_PREMIERE', 'TEASER', 'TRAILER_1', 'BTS'];
        return ['ANNOUNCEMENT', 'TEASER', 'MOTION_POSTER', 'STREAM_PREMIERE'];
    }
    let types: YoutubeVideoType[];
    if (weeksOut >= 12) types = ['ANNOUNCEMENT', 'MOTION_POSTER'];
    else if (weeksOut >= 8) types = ['MOTION_POSTER', 'CHARACTER_POSTER', 'ANNOUNCEMENT', 'TEASER'];
    else if (weeksOut >= 4) types = ['TEASER', 'TRAILER_1', 'CHARACTER_POSTER', 'BTS', 'MUSIC_VIDEO'];
    else if (weeksOut >= 1) types = ['TRAILER_1', 'TRAILER_2', 'FINAL_TRAILER', 'BTS', 'CAST_INTERVIEW', 'LYRIC_VIDEO', 'RELEASE_PROMO'];
    else if (weeksOut >= -1) types = ['RELEASE_PROMO', 'FINAL_TRAILER', 'PREMIERE_LIVE', 'MUSIC_VIDEO'];
    else types = ['CLIP', 'BTS', 'REVIEW_ROUNDUP', 'CAST_INTERVIEW', 'DELETED_SCENE'];
    if (channel.personality === 'MYSTERY') {
        const quiet = types.filter(type => ['ANNOUNCEMENT', 'MOTION_POSTER', 'TEASER', 'FINAL_TRAILER', 'CHARACTER_POSTER'].includes(type));
        return quiet.length ? quiet : ['MOTION_POSTER'];
    }
    if (channel.personality === 'PRESTIGE') return types.filter(type => type !== 'SHORT');
    if (channel.personality === 'SPAMMY') return [...types, 'SHORT', 'TEASER', 'CHARACTER_POSTER', 'CLIP'];
    if (channel.personality === 'AGGRESSIVE') return [...types, 'TEASER', 'TRAILER_1', 'SHORT', 'RELEASE_PROMO'];
    if (channel.personality === 'MUSIC_LED') return [...types, 'MUSIC_VIDEO', 'LYRIC_VIDEO'];
    return types;
};

const titleFor = (type: YoutubeVideoType, project: SlateItem, channel: RivalYoutubeChannel, salt: string): string => {
    const title = project.title;
    const lead = project.lead;
    const options: Record<string, string[]> = {
        ANNOUNCEMENT: [`${title} — Official Announcement`, `${channel.name} announces ${title}`, `${title} | Coming Soon`],
        MOTION_POSTER: [`${title} | First Look`, `${title} | Motion Poster`, `First look: ${title}`],
        CHARACTER_POSTER: [`${lead} in ${title} | Character Poster`, `${title} | ${lead} Character Announcement`, `${lead} joins ${title}`],
        TEASER: [`${title} | Official Teaser`, `${title} | Teaser`, `${title} Teaser — ${channel.name}`],
        TRAILER_1: [`${title} | Official Trailer`, `${title} | Trailer`, `${title} Trailer — ${channel.name}`],
        TRAILER_2: [`${title} | Trailer 2`, `${title} | New Trailer`, `${title} | Official Trailer 2`],
        FINAL_TRAILER: [`${title} | Final Trailer`, `${title} | Final Trailer Out Now`],
        MUSIC_VIDEO: [`${title} - Title Track | Official Video`, `${title} | Song`, `${lead} — ${title} Title Track`],
        LYRIC_VIDEO: [`${title} - Title Track | Lyric Video`, `${title} | Lyric Video`],
        JUKEBOX: [`${title} | Full Album`, `${title} Jukebox | ${channel.name}`],
        BTS: [`${title} | Behind the Scenes`, `On the set of ${title}`],
        CAST_INTERVIEW: [`${lead} on ${title} | Interview`, `${title} | Cast Interview`],
        RELEASE_PROMO: [`${title} | Out This Week`, `${title} | Release Week`, `Watch ${title} this week`],
        STREAM_PREMIERE: [`${title} | Streaming on ${channel.name}`, `${title} | Official Trailer | ${channel.name}`],
        PREMIERE_LIVE: [`${title} | Premiere Live`, `${title} Premiere with ${lead}`],
        CLIP: [`${title} | Official Clip`, `${title} | Clip`],
        SHORT: [`${title} | Short`, `${lead} in ${title} #Shorts`],
        REVIEW_ROUNDUP: [`${title} | Review Roundup`, `Critics on ${title}`],
        DELETED_SCENE: [`${title} | Deleted Scene`],
    };
    const bank = options[type] || [`${title} | ${type.replace(/_/g, ' ')}`];
    return bank[hashString(salt) % bank.length];
};

const pickProject = (channel: RivalYoutubeChannel, slate: SlateItem[], abs: number, postIndex: number, labelIds: string[], platformIds: string[]): SlateItem | null => {
    let pool = slate;
    if (channel.kind === 'LABEL') {
        const index = Math.max(0, labelIds.indexOf(channel.houseId));
        pool = slate.filter(project => labelIds.length > 0 && hashString(`${project.id}:song`) % labelIds.length === index);
    } else if (channel.kind === 'PLATFORM') {
        const index = Math.max(0, platformIds.indexOf(channel.houseId));
        pool = slate.filter(project =>
            project.studioId === channel.houseId
            || (platformIds.length > 0 && hashString(`${project.id}:stream`) % platformIds.length === index)
        );
    } else {
        pool = slate.filter(project => project.studioId === channel.houseId);
    }
    if (pool.length === 0) return null;
    const ranked = pool.map(project => {
        const weeksOut = project.releaseAbs - abs;
        let score = project.quality;
        if (channel.personality === 'PRESTIGE') score += project.quality >= 75 ? 40 : -15;
        if (channel.personality === 'MYSTERY') score += weeksOut >= 6 && weeksOut <= 18 ? 30 : -8;
        if (channel.personality === 'AGGRESSIVE') score += weeksOut >= 0 && weeksOut <= 10 ? 28 : 0;
        if (channel.personality === 'MUSIC_LED' || channel.kind === 'LABEL') score += weeksOut >= 0 && weeksOut <= 12 ? 24 : -6;
        if (channel.personality === 'SPAMMY') score += 12;
        const sweet = SWEET_WINDOW.TEASER;
        if (weeksOut >= sweet[0] && weeksOut <= sweet[1]) score += 8;
        score += hashString(`${channel.id}:${project.id}:${abs}:${postIndex}`) % 17;
        return { project, score };
    });
    ranked.sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, Math.min(3, ranked.length));
    return top[hashString(`${channel.id}:${abs}:pick:${postIndex}`) % top.length].project;
};

const attemptsFor = (channel: RivalYoutubeChannel, abs: number): number => {
    const cadence = CADENCE[channel.personality];
    const roll = (hashString(`${channel.id}:${abs}:cadence`) % 1000) / 1000;
    return cadence.base + (roll < cadence.extra ? 1 : 0);
};

const rivalReach = (subs: number, reputation: number, type: string, quality: number): number => {
    const subReach = Math.pow(Math.max(1000, subs), 0.58) * 120;
    const qualityFactor = 0.55 + clamp(quality, 20, 100) / 140;
    return (40_000 + subReach + reputation * 2_500) * (TYPE_REACH[type] || 0.3) * qualityFactor;
};

interface PlannedPost {
    channelId: string;
    type: YoutubeVideoType;
    project: SlateItem;
    postIndex: number;
}

const ageVideos = (channel: RivalYoutubeChannel, abs: number) => {
    channel.videos.forEach(video => {
        const born = uploadAbs(video);
        const age = abs - born;
        if (age <= 0 || age > 14) return;
        const opening = video.weeklyHistory?.[0] || Math.max(1000, video.views || 1000);
        const gain = Math.floor((opening / (1 + 1.2 * age)) * (1 + (age === 1 ? 0.08 : 0)));
        if (gain <= 0) return;
        video.views += gain;
        video.weeklyHistory = [...(video.weeklyHistory || []), gain].slice(-HISTORY_WEEKS);
        channel.totalViews += gain;
        const subGain = Math.floor(gain / 480);
        channel.subscribers += channel.backlash > 70 ? Math.floor(subGain * 0.25) - Math.floor(channel.subscribers * 0.001) : subGain;
        channel.subscribers = Math.max(1000, channel.subscribers);
    });
};

const rollWeek = (channels: RivalYoutubeChannel[], player: Player, abs: number, only?: Set<string>): string[] => {
    const slate = collectSlate(player);
    const notes: string[] = [];
    const labelIds = channels.filter(channel => channel.kind === 'LABEL').map(channel => channel.houseId);
    const platformIds = channels.filter(channel => channel.kind === 'PLATFORM').map(channel => channel.houseId);
    const active = channels.filter(channel => !only || only.has(channel.id));
    active.forEach(channel => {
        channel.fatigue = clamp(channel.fatigue * 0.82, 0, 100);
        channel.backlash = clamp(channel.backlash * 0.8, 0, 100);
        ageVideos(channel, abs);
    });

    const planned: PlannedPost[] = [];
    active.forEach(channel => {
        const attempts = attemptsFor(channel, abs);
        for (let index = 0; index < attempts; index += 1) {
            const project = pickProject(channel, slate, abs, index, labelIds, platformIds);
            if (!project) continue;
            const weeksOut = project.releaseAbs - abs;
            const menu = menuFor(channel, weeksOut, project.released);
            if (menu.length === 0) continue;
            const recent = channel.videos.slice(0, 4).map(video => video.type);
            let type = menu[hashString(`${channel.id}:${abs}:${project.id}:${index}:type`) % menu.length];
            if (channel.personality === 'SPAMMY' && recent[0] && hashString(`${channel.id}:${abs}:repeat:${index}`) % 100 < 55) {
                type = recent[0] as YoutubeVideoType;
            }
            planned.push({ channelId: channel.id, type, project, postIndex: index });
        }
    });

    const marketBig = planned.filter(post => isBigDrop(post.type)).length + playerBigDrops(player, abs);
    const byChannel = new Map<string, PlannedPost[]>();
    planned.forEach(post => {
        const list = byChannel.get(post.channelId) || [];
        list.push(post);
        byChannel.set(post.channelId, list);
    });

    active.forEach(channel => {
        const posts = byChannel.get(channel.id) || [];
        posts.forEach(post => {
            const id = `yr_${channel.id}_${abs}_${post.postIndex}_${post.type}`;
            if (channel.videos.some(video => video.id === id)) return;
            const weeksOut = post.project.releaseAbs - abs;
            const priorSame = channel.videos.filter(video => video.type === post.type && abs - uploadAbs(video) <= 10).length;
            const outlook = dropOutlook({
                type: post.type,
                weeksBefore: weeksOut,
                repeats: priorSame,
                sameWeekPosts: posts.length,
                rivalBigDrops: Math.max(1, marketBig),
                quality: post.project.quality,
            });
            const reputation = channel.kind === 'LABEL' ? 80 : 70 + (post.project.quality - 50) * 0.3;
            const variance = 0.88 + ((hashString(`${id}:var`) % 24) / 100);
            const views = Math.max(800, Math.floor(
                rivalReach(channel.subscribers, reputation, post.type, post.project.quality)
                * outlook.viewMultiplier
                * fatigueMultiplier(channel.fatigue)
                * variance,
            ));
            const likeRatio = clamp(0.9 - channel.backlash * 0.003 - (post.project.quality < 45 ? 0.12 : 0) + (post.project.quality - 60) * 0.002, 0.45, 0.98);
            const hype = Math.round(clamp(48 + (post.project.quality - 60) * 0.45 + (outlook.hypeMultiplier - 0.7) * 40 - channel.backlash * 0.2, 8, 96));
            const sentiment = hype >= 65 ? 'positive' : hype < 40 ? 'negative' : 'mixed';
            const parts = youtubeAbsToParts(abs);
            const title = titleFor(post.type, post.project, channel, id);
            const comments = aiOffline.generateComments({
                videoTitle: title,
                videoType: post.type,
                author: channel.name,
                project: post.project.title,
                sentiment,
                count: COMMENT_CAP,
                seed: id,
                network: false,
            }).slice(0, COMMENT_CAP);
            const video: YoutubeVideo = {
                id,
                title,
                type: post.type,
                thumbnailColor: TONE[post.type] || 'poster-hero',
                views,
                likes: Math.floor(views * likeRatio * 0.08),
                earnings: 0,
                weekUploaded: parts.week,
                yearUploaded: parts.age,
                isPlayer: false,
                authorName: channel.name,
                qualityScore: Math.round(clamp(post.project.quality * outlook.hypeMultiplier, 15, 98)),
                weeklyHistory: [views],
                comments,
                projectId: post.project.id,
                hype,
                likeRatio,
                sentiment: sentiment === 'positive' ? [68, 22, 10] : sentiment === 'negative' ? [22, 28, 50] : [44, 34, 22],
                ctr: 0.04 + (hype / 100) * 0.05,
                language: channel.language,
                country: channel.country,
                rivalChannelId: channel.id,
                durationLabel: DURATION[post.type] || '2:40',
                isShort: post.type === 'SHORT',
            };
            channel.videos = [video, ...channel.videos];
            channel.totalViews += views;
            channel.subscribers = Math.max(1000, channel.subscribers + Math.floor(views / 420) - (outlook.backlash > 14 ? Math.floor(channel.subscribers * 0.002) : 0));
            channel.fatigue = clamp(channel.fatigue + (priorSame > 0 ? 9 + priorSame * 4 : 2), 0, 100);
            channel.backlash = clamp(channel.backlash + outlook.backlash * 0.45, 0, 100);
            if (isBigDrop(post.type) && views >= 2_000_000 && notes.length < 2) {
                notes.push(`${channel.name} posted “${title}”.`);
            }
        });
    });
    return notes;
};

export interface RivalSyncResult {
    channel: YoutubeChannel;
    notes: string[];
}

const emptyOf = (channel: YoutubeChannel): YoutubeChannel => ({
    ...channel,
    schemaVersion: 3,
    rivalChannels: channel.rivalChannels || [],
    subscriptions: channel.subscriptions || [],
});

/**
 * Builds the house roster from the current world and, on a week tick, posts that week.
 * `view` fills a short history the first time an old save is opened, then stops.
 * `week` advances any weeks the save has not simulated yet, and never replays a week.
 */
export const syncRivalYoutube = (player: Player, channel: YoutubeChannel, mode: 'view' | 'week'): RivalSyncResult => {
    const abs = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    const base = emptyOf(channel);
    let rivals = mergeRoster(base.rivalChannels, housesFor(player));
    const known = new Set(rivals.map(item => item.id));
    const subscriptions = (base.subscriptions || []).filter(id => known.has(id));
    const notes: string[] = [];
    const cursor = base.rivalSimWeekAbs;

    if (cursor == null) {
        const start = Math.max(0, abs - BACKFILL_WEEKS);
        // A view can paint history, but the week tick still has to post the current week
        // after the world slate updates. Leaving the cursor one week behind does that.
        const end = mode === 'week' ? abs : Math.max(0, abs - 1);
        for (let week = start; week <= end; week += 1) notes.push(...rollWeek(rivals, player, week));
    } else if (mode === 'week' && cursor < abs) {
        const start = Math.max(cursor + 1, abs - (BACKFILL_WEEKS - 1));
        for (let week = start; week <= abs; week += 1) notes.push(...rollWeek(rivals, player, week));
    } else {
        const fresh = rivals.filter(item => item.videos.length === 0).map(item => item.id);
        if (fresh.length) {
            const start = Math.max(0, (cursor ?? abs) - 2);
            const only = new Set(fresh);
            for (let week = start; week <= (cursor ?? abs); week += 1) rollWeek(rivals, player, week, only);
        }
    }

    rivals = pruneRivalChannels(rivals);
    const rivalSimWeekAbs = cursor == null
        ? (mode === 'week' ? abs : Math.max(0, abs - 1))
        : (mode === 'week' && cursor < abs ? abs : cursor);
    return {
        channel: { ...base, rivalChannels: rivals, subscriptions, rivalSimWeekAbs, schemaVersion: 3 },
        notes,
    };
};

export const rivalBigHypes = (player: Player, abs: number): number[] => {
    const scores: number[] = [];
    (player.youtube?.rivalChannels || []).forEach(channel => {
        channel.videos.forEach(video => {
            if (!isBigDrop(video.type)) return;
            if (uploadAbs(video) !== abs) return;
            scores.push(video.hype ?? 50);
        });
    });
    return scores;
};

export const rivalBigDropCount = (player: Player, abs: number): number => rivalBigHypes(player, abs).length;

export const findRivalChannel = (channel: YoutubeChannel | undefined, id?: string | null): RivalYoutubeChannel | undefined =>
    id ? (channel?.rivalChannels || []).find(item => item.id === id) : undefined;
