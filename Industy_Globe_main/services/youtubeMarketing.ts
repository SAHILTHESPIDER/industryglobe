import {
    Commitment, MarketingDrop, NewsItem, OfficialChannel, Player, ProjectDetails, ProjectHiddenStats,
    XPost, YoutubeCampaign, YoutubeChannel, YoutubeVideo, YoutubeVideoType,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { hashString } from './youtubeCreators';
import { dropOutlook, isBigDrop, UNDERFUNDED_REACH } from './youtubeConsequences';
import { rivalBigDropCount, rivalBigHypes, syncRivalYoutube } from './youtubeRivals';

export const MARKETING_TYPES: YoutubeVideoType[] = [
    'ANNOUNCEMENT', 'MOTION_POSTER', 'CHARACTER_POSTER', 'TEASER', 'TRAILER_1', 'TRAILER_2', 'FINAL_TRAILER',
    'CAST_INTERVIEW', 'BTS', 'BLOOPERS', 'MUSIC_VIDEO', 'JUKEBOX', 'LYRIC_VIDEO',
    'RELEASE_PROMO', 'STREAM_PREMIERE', 'PREMIERE_LIVE', 'REVIEW_ROUNDUP', 'CLIP', 'DELETED_SCENE', 'SHORT', 'REACTION_COLLAB',
];

export const PERSONAL_TYPES: YoutubeVideoType[] = ['VLOG', 'SKIT', 'Q_AND_A', 'TRAILER', 'COVER', 'STORYTIME'];

export const isMarketingType = (type: YoutubeVideoType) => MARKETING_TYPES.includes(type);

/** Old personal trailers stay stored as TRAILER and display as Trailer. Campaign math treats them as Trailer 1. */
export const canonicalType = (type: YoutubeVideoType): YoutubeVideoType =>
    type === 'TRAILER' ? 'TRAILER_1' : type;

export const typeLabel = (type: YoutubeVideoType): string => {
    const labels: Partial<Record<YoutubeVideoType, string>> = {
        VLOG: 'Daily Vlog', SKIT: 'Comedy Skit', Q_AND_A: 'Q&A', TRAILER: 'Project Teaser',
        COVER: 'Song Cover', STORYTIME: 'Storytime', ANNOUNCEMENT: 'Announcement', TEASER: 'Teaser', TRAILER_1: 'Trailer 1',
        TRAILER_2: 'Trailer 2', FINAL_TRAILER: 'Final trailer', MOTION_POSTER: 'Motion poster',
        CHARACTER_POSTER: 'Character poster', CAST_INTERVIEW: 'Cast interview', BTS: 'Behind the scenes',
        BLOOPERS: 'Bloopers', MUSIC_VIDEO: 'Music video', JUKEBOX: 'Jukebox', LYRIC_VIDEO: 'Lyric video',
        RELEASE_PROMO: 'Release promo', STREAM_PREMIERE: 'Streaming premiere',
        PREMIERE_LIVE: 'Premiere live', REVIEW_ROUNDUP: 'Review roundup', CLIP: 'Clip',
        DELETED_SCENE: 'Deleted scene', SHORT: 'Short', REACTION_COLLAB: 'Reaction collab',
    };
    return labels[type] || type;
};

export const TYPE_WEIGHT: Record<string, { tw: number; hw: number }> = {
    ANNOUNCEMENT: { tw: 0.35, hw: 0.7 },
    MOTION_POSTER: { tw: 0.25, hw: 0.6 },
    TEASER: { tw: 0.8, hw: 1.2 },
    TRAILER_1: { tw: 1, hw: 1.4 },
    TRAILER: { tw: 1, hw: 1.4 },
    TRAILER_2: { tw: 0.85, hw: 1.1 },
    FINAL_TRAILER: { tw: 1.1, hw: 1.5 },
    CHARACTER_POSTER: { tw: 0.12, hw: 0.3 },
    CAST_INTERVIEW: { tw: 0.18, hw: 0.5 },
    BTS: { tw: 0.22, hw: 0.4 },
    BLOOPERS: { tw: 0.22, hw: 0.4 },
    MUSIC_VIDEO: { tw: 0.9, hw: 1 },
    JUKEBOX: { tw: 0.35, hw: 0.6 },
    LYRIC_VIDEO: { tw: 0.4, hw: 0.4 },
    RELEASE_PROMO: { tw: 0.55, hw: 0.9 },
    STREAM_PREMIERE: { tw: 0.85, hw: 1.2 },
    PREMIERE_LIVE: { tw: 0.7, hw: 0.8 },
    REVIEW_ROUNDUP: { tw: 0.2, hw: 0.6 },
    CLIP: { tw: 0.15, hw: 0.2 },
    DELETED_SCENE: { tw: 0.12, hw: 0.2 },
    SHORT: { tw: 0.3, hw: 0.25 },
    REACTION_COLLAB: { tw: 0.45, hw: 0.7 },
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const carry = (weeksBeforeRelease: number): number => {
    const d = Math.max(0, weeksBeforeRelease);
    if (d <= 1) return 1;
    if (d === 2) return 0.92;
    if (d === 3) return 0.84;
    if (d === 4) return 0.75;
    if (d === 5) return 0.68;
    if (d === 6) return 0.6;
    if (d === 7) return 0.54;
    if (d === 8) return 0.48;
    if (d >= 12) return 0.3;
    return 0.48 - ((d - 8) * (0.18 / 4));
};

export const openingMultiplier = (campaignHype: number): number => {
    const raw = ((campaignHype - 50) / 100) * 0.6;
    return 1 + clamp(raw, -0.15, 0.35);
};

export const musicOpeningBonus = (songStreams: number): number =>
    Math.min(0.08, Math.max(0, songStreams) / 1e9);

/** Radar display of a theatrical opening. Week-1 box office still uses ytOpeningMultiplier. */
export const forecastOpeningGross = (budget: number, campaignHype: number): number => {
    if (!Number.isFinite(budget) || budget <= 0) return 0;
    const hype = clamp(campaignHype, 0, 100);
    return budget * (0.5 + (hype / 100) * 0.305);
};

/** "+% from YT" on the radar: opening multiplier, with a quarter of the soundtrack bonus folded in. */
export const forecastYtLift = (campaignHype: number, songStreams = 0): number => {
    const lift = (openingMultiplier(campaignHype) - 1) + musicOpeningBonus(songStreams) * 0.25;
    return Math.round(lift * 100);
};

export type PhaseGate = 'greenlit' | 'filming30' | 'filming' | 'wrapped' | 'post' | 'picture' | 'release' | 'after' | 'any';

/** Old phase locks. Kept so older notes stay readable. Uploads are no longer blocked by them. */
export const SLOT_GATE: Record<string, PhaseGate> = {
    MOTION_POSTER: 'greenlit',
    CHARACTER_POSTER: 'greenlit',
    TEASER: 'filming30',
    BTS: 'filming',
    BLOOPERS: 'filming',
    SHORT: 'any',
    TRAILER_1: 'wrapped',
    TRAILER_2: 'post',
    CAST_INTERVIEW: 'post',
    MUSIC_VIDEO: 'post',
    JUKEBOX: 'post',
    LYRIC_VIDEO: 'post',
    FINAL_TRAILER: 'picture',
    PREMIERE_LIVE: 'release',
    REVIEW_ROUNDUP: 'release',
    CLIP: 'after',
    DELETED_SCENE: 'after',
    REACTION_COLLAB: 'post',
};

export interface PhaseRead {
    gate: PhaseGate;
    filmed: number;
    releaseWeekAbs: number | null;
    released: boolean;
    /** Auditions and loose jobs are not a greenlit campaign yet. */
    open: boolean;
}

const FILM_GATES: PhaseGate[] = ['greenlit', 'filming30', 'filming', 'wrapped', 'post', 'picture', 'release', 'after'];

export const gateRank = (gate: PhaseGate) => gate === 'any' ? 0 : FILM_GATES.indexOf(gate);

export const readPhase = (player: Player, commitment: Commitment): PhaseRead => {
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const phase = commitment.projectPhase;
    const total = commitment.totalPhaseDuration || 1;
    const left = commitment.phaseWeeksLeft || 0;
    const filmed = phase === 'PRODUCTION' ? clamp((total - left) / total, 0, 1) : phase && phase !== 'AUDITION' && phase !== 'PLANNING' && phase !== 'PRE_PRODUCTION' && phase !== 'SCHEDULED' ? 1 : 0;
    const releaseWeek = commitment.projectDetails?.hiddenStats?.releaseWeek || commitment.projectDetails?.releaseDate;
    const releaseWeekAbs = typeof releaseWeek === 'number'
        ? (releaseWeek > 52 ? releaseWeek : getAbsoluteWeek(player.age, releaseWeek))
        : null;
    const released = player.pastProjects?.some(project => project.id === commitment.id) || false;
    const open = !!phase && phase !== 'AUDITION' && phase !== 'PLANNING';
    let gate: PhaseGate = 'greenlit';
    if (released || phase === 'AWAITING_RELEASE') gate = phase === 'AWAITING_RELEASE' && left <= 1 ? 'release' : 'picture';
    else if (phase === 'POST_PRODUCTION') gate = left <= Math.max(1, total * 0.25) ? 'picture' : 'post';
    else if (phase === 'PRODUCTION') gate = filmed >= 0.3 ? 'filming' : 'filming30';
    else if (phase === 'PRE_PRODUCTION' || phase === 'SCHEDULED') gate = 'greenlit';
    if (released) gate = 'after';
    return { gate, filmed, releaseWeekAbs, released, open: open || released };
};

/** Every drop type can go out. Phase only changes timing consequences, it does not lock the button. */
export const slotUnlocked = (_type: YoutubeVideoType, _phase: PhaseRead): boolean => true;

/** Repeats are drops of this type that have already gone out. Later scheduled cuts do not penalize this one. */
export const priorReleasedOfType = (drops: MarketingDrop[], drop: Pick<MarketingDrop, 'id' | 'type'>): number =>
    drops.filter(item => item.id !== drop.id && item.status === 'RELEASED' && canonicalType(item.type) === canonicalType(drop.type)).length;

export const dropCost = (type: YoutubeVideoType, budget: number): number => {
    const b = Math.max(0, budget || 0);
    switch (canonicalType(type)) {
        case 'MOTION_POSTER': return 5000;
        case 'CHARACTER_POSTER': return 3000;
        case 'TEASER': return Math.max(15000, Math.round(b * 0.0005));
        case 'TRAILER_1':
        case 'TRAILER_2':
        case 'FINAL_TRAILER': return Math.max(25000, Math.round(b * 0.001));
        case 'BTS': return 8000;
        case 'MUSIC_VIDEO': return Math.min(2_000_000, Math.max(50_000, Math.round(b * 0.01)));
        case 'LYRIC_VIDEO': return 4000;
        case 'CAST_INTERVIEW':
        case 'JUKEBOX':
        case 'REVIEW_ROUNDUP':
        case 'CLIP':
        case 'DELETED_SCENE': return 0;
        default: return 0;
    }
};

export const dropEnergy = (type: YoutubeVideoType): number => {
    if (type === 'SHORT') return 6;
    if (type === 'CAST_INTERVIEW' || type === 'PREMIERE_LIVE') return 18;
    if (type === 'REACTION_COLLAB') return 16;
    return 0;
};

export interface ReachInput {
    officialSubs: number;
    personalSubs: number;
    playerInCast: boolean;
    castFame: number[];
    studioReputation: number;
    qualityScore: number;
    directorQuality: number;
    scriptQuality: number;
    castingStrength: number;
    dubCount: number;
    rightsFanbaseBoost: number;
    rivalHigher: number;
    fatigue: boolean;
    uploadPlanBoost: number;
    variance: number;
    type: YoutubeVideoType;
}

export const qualityQ = (input: Pick<ReachInput, 'qualityScore' | 'directorQuality' | 'scriptQuality' | 'castingStrength'>) =>
    0.6 + ((input.qualityScore * 0.4 + input.directorQuality * 0.2 + input.scriptQuality * 0.15 + input.castingStrength * 0.25) / 100);

export const openingViews = (input: ReachInput): number => {
    const top3 = [...input.castFame].sort((a, b) => b - a).slice(0, 3);
    const famePush = top3.reduce((sum, fame) => sum + (fame * fame * 600), 0);
    const reach = 50_000
        + input.officialSubs * 0.25
        + (input.playerInCast ? input.personalSubs * 0.12 : 0)
        + famePush
        + input.studioReputation * 4_000;
    const weights = TYPE_WEIGHT[input.type] || { tw: 0.3, hw: 0.3 };
    const Q = qualityQ(input);
    const L = Math.min(1.75, 1 + 0.25 * Math.max(0, input.dubCount));
    const F = 1 + Math.max(0, input.rightsFanbaseBoost) * 1.5;
    const R = Math.max(0.6, 1 - 0.15 * input.rivalHigher);
    const fatigue = input.fatigue ? 0.8 : 1;
    const variance = clamp(input.variance, 0.85, 1.15);
    return Math.max(0, Math.floor(reach * weights.tw * Q * L * F * R * fatigue * (input.uploadPlanBoost || 1) * variance));
};

export const viewsAtWeek = (v0: number, weekIndex: number, releaseBump: boolean) => {
    const base = v0 / (1 + 1.2 * Math.max(0, weekIndex));
    return Math.floor(base + (releaseBump ? 0.4 * base : 0));
};

export const engagement = (input: {
    Q: number;
    controversy: number;
    castFameAvg: number;
    views24h: number;
    expected24h: number;
    weakest: string;
}) => {
    const likeRatio = clamp(0.78 + 0.2 * (input.Q - 0.6) - input.controversy * 0.002 + (input.castFameAvg - 50) * 0.001, 0.6, 0.99);
    const pos = clamp(40 + 30 * (input.Q - 0.6) + (likeRatio - 0.85) * 40, 8, 92);
    const neg = clamp(input.weakest === 'vfx' ? 18 : input.weakest === 'script' ? 14 : 8, 4, 40);
    const neu = clamp(100 - pos - neg, 4, 80);
    const scale = pos + neu + neg;
    const sentiment: [number, number, number] = [Math.round(pos / scale * 100), Math.round(neu / scale * 100), Math.round(neg / scale * 100)];
    const perf = input.views24h / Math.max(1, input.expected24h);
    const H = clamp(50 + 22 * Math.log2(Math.max(0.05, perf)) + 40 * (likeRatio - 0.9) + 0.25 * (sentiment[0] - sentiment[2]), 0, 100);
    return { likeRatio, sentiment, H: Math.round(H), perf };
};

export const ctrFor = (thumbnailScore: number, H: number) =>
    0.04 + 0.06 * clamp(thumbnailScore, 0, 1) + 0.02 * (H / 100);

export const trailerWarShare = (yours: number, rivals: number[]): number => {
    const scores = [Math.max(1, yours), ...rivals.map(value => Math.max(1, value))].map(value => Math.pow(value, 1.5));
    const total = scores.reduce((sum, value) => sum + value, 0);
    return scores[0] / Math.max(1, total);
};

export const shortViews = (subs: number, Q: number, weekIndex: number, variance: number) =>
    Math.floor(Math.max(800, subs * 0.4) * Q * clamp(variance, 0.85, 1.15) * (1 / (1 + 0.8 * weekIndex)));

export const COUNTRY_RPM: Record<string, number> = {
    IN: 0.62, US: 6.1, UK: 4.8, AE: 3.4, CA: 4.2, BD: 0.41, PK: 0.38, OTHER: 1.1,
};

/** Flat $2 RPM stays the default. The weighted table is available for a later balance pass. */
export const FLAT_RPM = 2;
export const SHORTS_RPM = 0.06;
/** Multiplies the country RPM. Shorts ignore it and use SHORTS_RPM. */
export const TYPE_CPM: Record<string, number> = {
    VLOG: 1.12, SKIT: 1.16, Q_AND_A: 1.08, STORYTIME: 1.1, COVER: 0.9,
    SHORT: 1, TRAILER: 1.05, TRAILER_1: 1.05, TRAILER_2: 1.04, TEASER: 1.02,
    MUSIC_VIDEO: 0.86, LYRIC_VIDEO: 0.84, JUKEBOX: 0.8, BTS: 1.06,
    PREMIERE_LIVE: 1.1, CAST_INTERVIEW: 1.04,
};
/** Evening is the full audience. Morning and late night are smaller rooms, not blocks. */
export const UPLOAD_SLOT_REACH = { MORNING: 0.86, EVENING: 1, LATE: 0.92 } as const;

export const playerProjects = (player: Player): Commitment[] =>
    (player.commitments || []).filter(item =>
        !!item.projectDetails && (item.type === 'ACTING_GIG' || item.type === 'DIRECTOR_GIG' || item.type === 'WRITER_GIG' || item.type === 'JOB')
    );

export const ensureCampaign = (channel: YoutubeChannel, projectId: string): YoutubeCampaign => {
    const current = channel.marketing?.[projectId];
    if (current) return current;
    return { drops: [], campaignHype: 50, lastDropWeekAbs: 0, songs: [], songStreams: 0 };
};

export const emptyChannelExtras = (channel: YoutubeChannel): YoutubeChannel => ({
    ...channel,
    schemaVersion: 5,
    officialChannels: channel.officialChannels || {},
    marketing: channel.marketing || {},
    strikes: channel.strikes || [],
    leaks: channel.leaks || [],
    shortsRemixes: channel.shortsRemixes || 0,
    superChatLifetime: channel.superChatLifetime || 0,
    peakLive: channel.peakLive || 0,
    recordsHeld: channel.recordsHeld || [],
    activeChannel: channel.activeChannel || 'personal',
    savedVideoIds: channel.savedVideoIds || [],
    rivalChannels: channel.rivalChannels || [],
    subscriptions: channel.subscriptions || [],
    videos: (channel.videos || []).map(video => ({
        ...video,
        type: video.type,
        weeklyHistory: Array.isArray(video.weeklyHistory) ? video.weeklyHistory.slice(-26) : [],
    })),
});

const trimChannelVideos = (videos: YoutubeVideo[]): YoutubeVideo[] => {
    const sorted = [...videos];
    if (sorted.length <= 60) {
        return sorted.map(video => ({ ...video, weeklyHistory: (video.weeklyHistory || []).slice(-26) }));
    }
    return sorted.slice(0, 60).map(video => ({ ...video, weeklyHistory: (video.weeklyHistory || []).slice(-26) }));
};

const isFreshYoutubeCareer = (raw?: YoutubeChannel) => {
    if (!raw) return true;
    if (raw.zeroStart !== undefined) return raw.zeroStart;
    if ((raw.schemaVersion ?? 0) >= 2) return false;
    if ((raw.subscribers || 0) > 0 || (raw.videos?.length || 0) > 0 || (raw.lifetimeEarnings || 0) > 0) return false;
    if (raw.officialChannels?.studio || raw.officialChannels?.empirePlus || (raw.rivalChannels?.length || 0) > 0) return false;
    return true;
};

export const migrateYoutubeSave = (player: Player): YoutubeChannel => {
    const raw = player.youtube;
    const fresh = isFreshYoutubeCareer(raw);
    const channel = emptyChannelExtras(raw);
    channel.videos = trimChannelVideos(channel.videos || []);
    if (channel.officialChannels?.studio) channel.officialChannels.studio.videos = trimChannelVideos(channel.officialChannels.studio.videos || []);
    if (channel.officialChannels?.empirePlus) channel.officialChannels.empirePlus.videos = trimChannelVideos(channel.officialChannels.empirePlus.videos || []);
    Object.values(channel.marketing || {}).forEach(campaign => {
        campaign.drops = (campaign.drops || []).slice(0, 24);
        campaign.songs = (campaign.songs || []).slice(0, 12);
    });
    channel.strikes = (channel.strikes || []).filter(strike => {
        const age = getAbsoluteWeek(player.age, player.currentWeek) - strike.weekAbs;
        return age < 26;
    });
    if (channel.zeroStart === undefined) channel.zeroStart = fresh;
    if (channel.extraChannelsUnlocked === undefined) channel.extraChannelsUnlocked = !fresh;
    channel.schemaVersion = 5;
    if (channel.watchHours == null) channel.watchHours = 0;
    channel.promotions = channel.promotions || [];
    channel.communityPosts = channel.communityPosts || [];
    return channel;
};

const productionHouse = (player: Player) =>
    (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.isActive);

export const syncOfficialChannels = (player: Player, channel: YoutubeChannel): YoutubeChannel => {
    const next = { ...channel, officialChannels: { ...(channel.officialChannels || {}) } };
    const house = productionHouse(player);
    if (house) {
        const existing = next.officialChannels.studio;
        next.officialChannels.studio = {
            ...(existing || {
                handle: `@${(house.name || 'empire').toLowerCase().replace(/[^a-z0-9]+/g, '')}studios`,
                subscribers: 0,
                totalViews: 0,
                lifetimeEarnings: 0,
                videos: [],
            }),
            language: existing?.language || 'hi',
            country: existing?.country || 'IN',
        };
    }
    if (player.ownPlatform?.stage === 'LIVE') {
        const existing = next.officialChannels.empirePlus;
        next.officialChannels.empirePlus = {
            ...(existing || {
                handle: `@${(player.ownPlatform.name || 'empireplus').toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
                subscribers: 0,
                totalViews: 0,
                lifetimeEarnings: 0,
                videos: [],
            }),
            language: existing?.language || 'hi',
            country: existing?.country || 'IN',
        };
    }
    return next;
};

export interface CampaignWeekResult {
    personal: { amount: number; label: string }[];
    news: NewsItem[];
    posts: XPost[];
    inbox: Player['inbox'];
    logs: { msg: string; type: 'positive' | 'negative' | 'neutral' }[];
    fame: number;
    stockShock: number;
}

const tradePost = (player: Player, content: string, reach: number): XPost => ({
    id: `x_yt_${hashString(content + player.currentWeek)}`,
    authorId: 'trade_desk',
    authorName: 'Trade Desk',
    authorHandle: '@tradedesk',
    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=TradeDesk',
    content,
    timestamp: Date.now(),
    likes: Math.max(40, Math.floor(reach * 0.02)),
    retweets: Math.max(8, Math.floor(reach * 0.004)),
    replies: Math.max(4, Math.floor(reach * 0.002)),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    sentiment: 'INDUSTRY',
});

const newsItem = (player: Player, id: string, headline: string, impact: NewsItem['impactLevel']): NewsItem => ({
    id, headline, category: 'INDUSTRY', week: player.currentWeek, year: player.age, impactLevel: impact,
});

export const applyYoutubeReleaseBoost = (player: Player, commitment: Commitment): {
    rawHype: number;
    campaignHype: number;
    openingMultiplier: number;
} | null => {
    const campaign = player.youtube?.marketing?.[commitment.id];
    if (!campaign) return null;
    const hidden = commitment.projectDetails?.hiddenStats;
    if (!hidden) return null;
    const hype = clamp((campaign.campaignHype ?? 50) + (campaign.premiereHype || 0) * 0.35, 0, 100);
    const raw = clamp((hidden.rawHype ?? 50) + (hype - 50) * 0.35, 0, 100);
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const share = trailerWarShare(hype, rivalBigHypes(player, abs));
    const music = musicOpeningBonus(campaign.songStreams || 0);
    const mult = openingMultiplier(hype) * (0.9 + 0.2 * share) + music;
    return { rawHype: raw, campaignHype: hype, openingMultiplier: clamp(mult, 0.8, 1.5) };
};

const weakestOf = (hidden?: ProjectHiddenStats, genre?: string): string => {
    if (!hidden) return 'script';
    const vfxGenres = ['SCI_FI', 'SUPERHERO', 'ACTION', 'FANTASY'];
    if (vfxGenres.includes(genre || '') && (hidden.qualityScore || 50) < 55) return 'vfx';
    if ((hidden.scriptQuality || 50) <= (hidden.directorQuality || 50) && (hidden.scriptQuality || 50) < 60) return 'script';
    if ((hidden.castingStrength || 50) < 55) return 'cast';
    return 'pace';
};

export const processYoutubeCampaignWeek = (player: Player): CampaignWeekResult => {
    const result: CampaignWeekResult = { personal: [], news: [], posts: [], inbox: [], logs: [], fame: 0, stockShock: 0 };
    if (!player.youtube) return result;
    let channel = syncOfficialChannels(player, emptyChannelExtras(player.youtube));
    const rivalWeek = syncRivalYoutube(player, channel, 'week');
    channel = rivalWeek.channel;
    player.youtube = channel;
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    rivalWeek.notes.forEach(msg => result.logs.push({ msg: `YouTube · ${msg}`, type: 'neutral' }));
    rivalWeek.news.forEach((item, index) => result.news.push(newsItem(player, `news_rival_award_${abs}_${index}`, item.headline, item.impact)));
    let studioRevenue = 0;
    let empireRevenue = 0;
    ageOfficial(channel.officialChannels?.studio, false);
    ageOfficial(channel.officialChannels?.empirePlus, true);
    const projects = playerProjects(player);

    projects.forEach(project => {
        const details = project.projectDetails as ProjectDetails;
        const campaign = ensureCampaign(channel, project.id);
        const phase = readPhase(player, project);
        const droppedThisWeek = campaign.drops.some(drop => drop.status === 'RELEASED' && abs - drop.scheduledWeekAbs === 0);
        const decay = droppedThisWeek ? 0.03 : 0.06;
        let added = 0;
        campaign.drops.forEach(drop => {
            if (drop.status !== 'RELEASED' || typeof drop.H !== 'number') return;
            const age = abs - drop.scheduledWeekAbs;
            if (age === 0) {
                const weights = TYPE_WEIGHT[drop.type] || { tw: 0.2, hw: 0.3 };
                added += drop.H * weights.hw * 0.12;
            }
        });
        campaign.campaignHype = clamp((campaign.campaignHype || 50) * (1 - decay) + added, 0, 100);
        if (details.hiddenStats) details.hiddenStats.ytCampaignHype = campaign.campaignHype;

        const due = campaign.drops.filter(drop => drop.status === 'SCHEDULED' && drop.scheduledWeekAbs <= abs);
        due.forEach(drop => releaseDrop(player, channel, project, campaign, drop, result, abs));

        if (!phase.released && phase.gate !== 'greenlit') {
            const crew = details.crewList?.length || 12;
            const securityLow = (player.businesses || []).every(business => business.config?.marketing === 'LOW' || !business.config?.marketingBudget);
            const p = 0.015 + 0.01 * (crew / 50) + (securityLow ? 0.02 : 0);
            const roll = (hashString(`${player.id}:${project.id}:${abs}:leak`) % 1000) / 1000;
            const openLeak = (channel.leaks || []).some(leak => leak.projectId === project.id && !leak.resolved);
            if (!openLeak && roll < p) {
                const spoils = campaign.drops.some(drop => drop.type === 'FINAL_TRAILER' && drop.status !== 'RELEASED');
                const leak = {
                    id: `leak_${project.id}_${abs}`,
                    projectId: project.id,
                    title: `${details.title} footage leak`,
                    weekAbs: abs,
                    spoilsFinal: spoils,
                    views: 400_000 + (hashString(`${project.id}:leakviews`) % 1_200_000),
                };
                channel.leaks = [...(channel.leaks || []), leak];
                campaign.campaignHype = clamp(campaign.campaignHype - (spoils ? 8 : 4), 0, 100);
                result.logs.push({ msg: `Leak: footage from "${details.title}" is on YouTube. Campaign hype dropped.`, type: 'negative' });
                result.news.push(newsItem(player, `news_leak_${leak.id}`, `A leak from ${details.title} is spreading before release.`, 'MEDIUM'));
                result.inbox.push({
                    id: `in_leak_${leak.id}`,
                    sender: 'YouTube Rights',
                    subject: `Leak · ${details.title}`,
                    text: `Unreleased footage from ${details.title} is circulating. Take it down, claim the ad revenue, or ignore it.`,
                    type: 'SYSTEM',
                    isRead: false,
                    weekSent: player.currentWeek,
                    expiresIn: 3,
                    data: { leakId: leak.id },
                });
            }
        }
        channel.marketing = { ...(channel.marketing || {}), [project.id]: campaign };
    });

    const personalShortRevenue = settlePersonalShorts(player, channel);
    if (personalShortRevenue > 0) result.personal.push({ amount: personalShortRevenue, label: 'YouTube Shorts' });

    if (studioRevenue > 0) creditHouse(player, studioRevenue);
    if (empireRevenue > 0) creditEmpire(player, empireRevenue);

    channel = syncOfficialChannels(player, channel);
    player.youtube = channel;
    return result;

    function boardHours(board?: OfficialChannel) {
        return (board?.videos || []).reduce((sum, video) => {
            const minutes = video.isShort || video.type === 'SHORT' ? 0.4 : video.type === 'PREMIERE_LIVE' ? 14 : 6.2;
            return sum + ((video.views || 0) * minutes) / 60;
        }, 0);
    }
    function boardPays(board?: OfficialChannel) {
        return !!board && board.subscribers >= 1000 && boardHours(board) >= 4000;
    }
    function countryRpm(video: { isShort?: boolean; type: string; country?: string }) {
        if (video.isShort || video.type === 'SHORT') return SHORTS_RPM;
        const country = COUNTRY_RPM[video.country || 'IN'] || COUNTRY_RPM.OTHER;
        return country * (TYPE_CPM[video.type] || 1);
    }

    function ageOfficial(board: OfficialChannel | undefined, empire: boolean) {
        if (!board) return;
        const paying = boardPays(board);
        board.videos.forEach(video => {
            const age = Math.max(0, abs - getAbsoluteWeek(video.yearUploaded || player.age, video.weekUploaded));
            if (age <= 0 || age > 16) return;
            const bump = playerProjects(player).some(project => project.id === video.projectId && readPhase(player, project).gate === 'release');
            const views = viewsAtWeek(Math.max(1000, video.weeklyHistory?.[0] || video.views || 1000), age, bump);
            video.views += views;
            video.weeklyHistory = [...(video.weeklyHistory || []), views].slice(-26);
            board.totalViews += views;
            board.subscribers += Math.floor(views / 400);
            const earned = paying ? Math.floor((views / 1000) * countryRpm(video)) : 0;
            video.earnings += earned;
            board.lifetimeEarnings += earned;
            if (empire) empireRevenue += earned;
            else studioRevenue += earned;
        });
    }

    function creditHouse(current: Player, amount: number) {
        const house = productionHouse(current);
        if (!house) return;
        house.balance = (house.balance || 0) + Math.floor(amount);
        house.stats.lifetimeRevenue = (house.stats.lifetimeRevenue || 0) + Math.floor(amount);
        if (house.studioState) {
            house.studioState.financeLedger = [
                { id: `yt_studio_${abs}`, week: current.currentWeek, year: current.age, amount: Math.floor(amount), type: 'STREAMING_ROYALTY' as const, label: 'YouTube – Studio channel' },
                ...(house.studioState.financeLedger || []),
            ].slice(0, 80);
        }
    }

    function creditEmpire(current: Player, amount: number) {
        if (!current.ownPlatform || current.ownPlatform.stage !== 'LIVE') return;
        current.ownPlatform.lastWeeklyRevenue = (current.ownPlatform.lastWeeklyRevenue || 0) + Math.floor(amount);
        if (current.ownPlatform.books) {
            current.ownPlatform.books.lines = [
                { id: `yt_eplus_${abs}`, week: current.currentWeek, year: current.age, amount: Math.floor(amount), label: 'YouTube – Empire+ channel', source: 'RECEIPTS' as const },
                ...(current.ownPlatform.books.lines || []),
            ].slice(0, 80);
        }
    }

    function releaseDrop(current: Player, yt: YoutubeChannel, project: Commitment, campaign: YoutubeCampaign, drop: MarketingDrop, bucket: CampaignWeekResult, weekAbs: number) {
        const details = project.projectDetails as ProjectDetails;
        const hidden = details.hiddenStats;
        const house = productionHouse(current);
        const onEmpire = hidden?.platformId === 'YOUTUBE' || (current.ownPlatform?.stage === 'LIVE' && details.releaseStrategy === 'STREAMING_ONLY');
        const official = onEmpire ? yt.officialChannels?.empirePlus : yt.officialChannels?.studio;
        const target = official || null;
        const castFame = (details.castList || []).map(member => member.isPlayer ? current.stats.fame : 62);
        const Q = qualityQ({
            qualityScore: hidden?.qualityScore || 60,
            directorQuality: hidden?.directorQuality || 60,
            scriptQuality: hidden?.scriptQuality || 60,
            castingStrength: hidden?.castingStrength || 60,
        });
        const variance = 0.85 + ((hashString(`${drop.id}:var`) % 30) / 100);
        const phaseNow = readPhase(current, project);
        const weeksBefore = phaseNow.releaseWeekAbs == null ? null : phaseNow.releaseWeekAbs - weekAbs;
        const priorSame = priorReleasedOfType(campaign.drops, drop);
        const sameWeekPosts = campaign.drops.filter(item => item.id !== drop.id && item.scheduledWeekAbs === weekAbs).length + 1;
        const rivalBig = rivalBigDropCount(current, weekAbs);
        const outlook = dropOutlook({
            type: drop.type,
            weeksBefore,
            repeats: priorSame,
            sameWeekPosts,
            rivalBigDrops: Math.max(1, rivalBig + (isBigDrop(drop.type) ? 1 : 0)),
            quality: hidden?.qualityScore || 60,
        });
        const v0 = openingViews({
            officialSubs: target?.subscribers ?? 0,
            personalSubs: yt.subscribers || 0,
            playerInCast: (details.castList || []).some(member => member.isPlayer) || project.type === 'ACTING_GIG',
            castFame: castFame.length ? castFame : [current.stats.fame || 20],
            studioReputation: house?.stats?.brandHealth || current.stats.reputation || 20,
            qualityScore: hidden?.qualityScore || 60,
            directorQuality: hidden?.directorQuality || 60,
            scriptQuality: hidden?.scriptQuality || 60,
            castingStrength: hidden?.castingStrength || 60,
            dubCount: drop.type === 'TEASER' ? 1 : 3,
            rightsFanbaseBoost: hidden?.rightsFanbaseBoost || 0,
            rivalHigher: 0,
            fatigue: false,
            uploadPlanBoost: 1,
            variance,
            type: canonicalType(drop.type),
        });
        const funded = drop.underfunded ? UNDERFUNDED_REACH : 1;
        const weekIndex = 0;
        const views = drop.type === 'SHORT'
            ? Math.floor(shortViews(yt.subscribers || 0, Q, weekIndex, variance) * outlook.viewMultiplier * funded)
            : Math.floor(viewsAtWeek(v0, weekIndex, false) * outlook.viewMultiplier * funded);
        const expected = Math.max(1, Math.floor(v0 / Math.max(0.6, Q)));
        const scored = engagement({
            Q,
            controversy: yt.controversy || 0,
            castFameAvg: castFame.length ? castFame.reduce((a, b) => a + b, 0) / castFame.length : 50,
            views24h: views,
            expected24h: expected,
            weakest: weakestOf(hidden, details.genre),
        });
        scored.H = clamp(Math.round(scored.H * outlook.hypeMultiplier), 0, 100);
        if (outlook.backlash > 0) {
            yt.controversy = clamp((yt.controversy || 0) + Math.min(10, outlook.backlash * 0.35), 0, 100);
            yt.audienceTrust = clamp((yt.audienceTrust ?? 55) - Math.min(6, outlook.backlash * 0.15), 0, 100);
        }
        const destination = target ? 'official' : 'personal';
        const video: YoutubeVideo = {
            id: drop.videoId || `ytm_${drop.id}`,
            title: drop.title || `${details.title} · ${typeLabel(drop.type)}`,
            type: drop.type,
            thumbnailColor: 'poster-hero',
            views,
            likes: Math.floor(views * scored.likeRatio * 0.08),
            earnings: 0,
            weekUploaded: current.currentWeek,
            yearUploaded: current.age,
            isPlayer: true,
            authorName: destination === 'official' ? (target === yt.officialChannels?.empirePlus ? 'Empire+' : (house?.name || 'Empire Studios')) : current.name,
            qualityScore: Math.round(Q * 62),
            weeklyHistory: [views],
            comments: [],
            projectId: project.id,
            channelKind: destination === 'official' ? (target === yt.officialChannels?.empirePlus ? 'empirePlus' : 'studio') : 'personal',
            hype: scored.H,
            likeRatio: scored.likeRatio,
            sentiment: scored.sentiment,
            ctr: ctrFor(drop.thumbnailScore || 0.62, scored.H),
            isShort: drop.type === 'SHORT',
            language: 'hi',
            country: 'IN',
        };
        const rpm = countryRpm({ isShort: drop.type === 'SHORT', type: drop.type, country: 'IN' });
        const money = (destination === 'personal' ? yt.isMonetized : boardPays(target || undefined)) ? Math.floor((views / 1000) * rpm) : 0;
        video.earnings = money;
        if (destination === 'personal') {
            yt.videos = [video, ...(yt.videos || [])];
            yt.totalChannelViews = (yt.totalChannelViews || 0) + views;
            yt.subscribers += Math.floor(views / (video.qualityScore > 80 ? 80 : 150));
            if (money > 0) {
                yt.lifetimeEarnings += money;
                bucket.personal.push({ amount: money, label: 'YouTube Ad Revenue' });
            }
        } else if (target) {
            target.videos = [video, ...(target.videos || [])].slice(0, 60);
            target.totalViews += views;
            target.subscribers += Math.floor(views / 400);
            target.lifetimeEarnings += money;
            if (target === yt.officialChannels?.empirePlus) empireRevenue += money;
            else studioRevenue += money;
        }
        drop.status = 'RELEASED';
        drop.videoId = video.id;
        drop.H = scored.H;
        drop.likeRatio = scored.likeRatio;
        drop.sentiment = scored.sentiment;
        drop.views = views;
        campaign.lastDropWeekAbs = weekAbs;
        if (scored.H >= 88 && views >= 10_000_000) {
            const record = `${details.title}:${drop.type}`;
            if (!(yt.recordsHeld || []).includes(record)) {
                yt.recordsHeld = [...(yt.recordsHeld || []), record].slice(-12);
                bucket.fame += 3;
                campaign.campaignHype = clamp(campaign.campaignHype + 9, 0, 100);
                bucket.news.push(newsItem(current, `news_record_${video.id}`, `${details.title} breaks a YouTube record on the way to release.`, 'HIGH'));
                bucket.posts.push(tradePost(current, `#${details.title.replace(/\s/g, '')} is the fastest trailer in this market. Record pace.`, views));
                const listed = (current.stocks || []).find(stock => stock.playerCompany || stock.id === 'stk_emp');
                if (listed) {
                    const shock = 0.015 + ((hashString(video.id) % 15) / 1000);
                    listed.price = Math.round(listed.price * (1 + shock) * 100) / 100;
                    bucket.stockShock = shock;
                    bucket.logs.push({ msg: `EMP moved +${(shock * 100).toFixed(1)}% after the ${details.title} record.`, type: 'positive' });
                }
                bucket.logs.push({ msg: `Viral record: ${details.title} hit ${views.toLocaleString()} views.`, type: 'positive' });
            }
        } else if (scored.H < 30) {
            yt.controversy = clamp((yt.controversy || 0) + 6, 0, 100);
            bucket.news.push(newsItem(current, `news_flop_${video.id}`, `${details.title} is trending for the wrong reasons.`, 'MEDIUM'));
        }
        bucket.logs.push({ msg: `YouTube drop: ${video.title} · ${views.toLocaleString()} views · hype ${scored.H}.`, type: scored.H >= 60 ? 'positive' : 'neutral' });
    }
};

const settlePersonalShorts = (player: Player, channel: YoutubeChannel): number => {
    let money = 0;
    (channel.videos || []).forEach(video => {
        if (video.type !== 'SHORT' && !video.isShort) return;
        const age = Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - getAbsoluteWeek(video.yearUploaded || player.age, video.weekUploaded));
        if (age === 0) return;
        const Q = 0.6 + ((video.qualityScore || 50) / 100);
        const slot = UPLOAD_SLOT_REACH[video.uploadSlot || 'EVENING'];
        const views = Math.floor(shortViews(channel.subscribers || 0, Q, age, 0.9 + ((hashString(video.id + age) % 20) / 100)) * slot);
        video.views += views;
        video.weeklyHistory = [...(video.weeklyHistory || []), views].slice(-26);
        channel.totalChannelViews += views;
        channel.subscribers += Math.floor(views / 240);
        channel.watchHours = (channel.watchHours || 0) + (views * 0.4) / 60;
        if (video.songId) {
            const remixes = Math.floor(views * 0.02);
            channel.shortsRemixes = (channel.shortsRemixes || 0) + remixes;
            Object.values(channel.marketing || {}).forEach(campaign => {
                const song = campaign.songs?.find(item => item.id === video.songId);
                if (song) {
                    song.plays += remixes * 40;
                    campaign.songStreams = (campaign.songStreams || 0) + remixes * 40;
                }
            });
        }
        if (channel.isMonetized && !(channel.demonetizedUntilAbs && channel.demonetizedUntilAbs > getAbsoluteWeek(player.age, player.currentWeek))) {
            const earned = Math.floor((views / 1000) * SHORTS_RPM);
            video.earnings += earned;
            channel.lifetimeEarnings += earned;
            money += earned;
        }
    });
    return money;
};

export const strikeRisk = (heat: number) => 0.04 + heat / 400;

export const activeStrikeCount = (channel: YoutubeChannel, abs: number) =>
    (channel.strikes || []).filter(strike => abs - strike.weekAbs < 26).length;

export const registerStrike = (channel: YoutubeChannel, abs: number, reason: string): { channel: YoutubeChannel; note: string } => {
    const strikes = [...(channel.strikes || []), { weekAbs: abs, reason }];
    const recent = strikes.filter(strike => abs - strike.weekAbs < 26);
    let note = 'Copyright strike. Uploads freeze for a week.';
    let uploadFrozenUntilAbs = abs + 1;
    let demonetizedUntilAbs = channel.demonetizedUntilAbs;
    let subscribers = channel.subscribers;
    let isMonetized = channel.isMonetized;
    if (recent.length === 2) {
        uploadFrozenUntilAbs = abs + 2;
        demonetizedUntilAbs = abs + 2;
        note = 'Second strike. Uploads freeze and the channel is demonetized for 2 weeks.';
    } else if (recent.length >= 3) {
        subscribers = Math.floor(subscribers * 0.7);
        isMonetized = false;
        uploadFrozenUntilAbs = abs + 4;
        note = 'Three strikes. Monetization reset and 30% of subscribers left.';
    }
    return {
        channel: { ...channel, strikes, uploadFrozenUntilAbs, demonetizedUntilAbs, subscribers, isMonetized },
        note,
    };
};
