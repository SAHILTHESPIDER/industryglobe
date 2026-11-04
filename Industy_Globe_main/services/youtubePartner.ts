import {
    Player, YoutubeChannel, YoutubeChannelKind, YoutubeCommunityPost, YoutubePromotion, YoutubeVideo,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { addCompanyCash, readCompanyCash } from './ownPlatform/companyCash';
import { COUNTRY_RPM, UPLOAD_SLOT_REACH } from './youtubeMarketing';

/**
 * YouTube Partner Program and the money around it.
 * Nothing here blocks an upload. Ads, promos, and sponsors only change the result.
 *
 * PARTNER_SUBS / PARTNER_WATCH_HOURS — real YPP bar: 1,000 subs and 4,000 public watch hours.
 * SHORT_REACH — shorts travel farther than a long video.
 * SHORT_RPM — shorts pay almost nothing per thousand views.
 * LONG_MINUTES — a long view is worth real watch time. A short is not.
 * SPONSOR_FREE — sponsored videos inside this count do not tire people out.
 * PROMO_CURVE — extra budget buys less than the last dollar.
 */

export const PARTNER_SUBS = 1_000;
export const PARTNER_WATCH_HOURS = 4_000;
export const SHORT_REACH = 2.6;
export const SHORT_RPM = 0.06;
export const SHORT_MINUTES = 0.4;
export const LONG_MINUTES = 6.2;
export const LIVE_MINUTES = 14;
export const SPONSOR_FREE = 2;
export const SPONSOR_WINDOW = 8;
export const PROMO_CURVE = 0.62;

const TYPE_CPM: Record<string, number> = {
    VLOG: 1.12, SKIT: 1.16, Q_AND_A: 1.08, STORYTIME: 1.1, COVER: 0.9,
    SHORT: 1, TRAILER: 1.05, TRAILER_1: 1.05, TRAILER_2: 1.04, TEASER: 1.02,
    MUSIC_VIDEO: 0.86, LYRIC_VIDEO: 0.84, JUKEBOX: 0.8, BTS: 1.06,
    PREMIERE_LIVE: 1.1, CAST_INTERVIEW: 1.04,
};


export const minutesFor = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'qualityScore'>): number => {
    if (video.isShort || video.type === 'SHORT') return SHORT_MINUTES;
    if (video.type === 'PREMIERE_LIVE') return LIVE_MINUTES;
    return LONG_MINUTES * (0.75 + ((video.qualityScore || 50) / 200));
};

export const watchHoursFromVideos = (videos: YoutubeVideo[]): number =>
    videos.reduce((sum, video) => sum + ((video.views || 0) * minutesFor(video)) / 60, 0);

export const channelWatchHours = (channel: Pick<YoutubeChannel, 'watchHours' | 'videos'> | undefined): number => {
    if (!channel) return 0;
    if ((channel.watchHours || 0) > 0) return channel.watchHours || 0;
    return watchHoursFromVideos(channel.videos || []);
};

export const partnerReady = (subs: number, hours: number) =>
    subs >= PARTNER_SUBS && hours >= PARTNER_WATCH_HOURS;

export const rpmFor = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'country'>, genreBias = 1): number => {
    if (video.isShort || video.type === 'SHORT') return SHORT_RPM;
    const country = COUNTRY_RPM[video.country || 'IN'] ?? COUNTRY_RPM.OTHER ?? 1.1;
    const type = TYPE_CPM[video.type] || 1;
    return country * type * genreBias;
};

export const blendedRpm = (video: YoutubeVideo, mix?: Record<string, number>): number => {
    if (video.isShort || video.type === 'SHORT') return SHORT_RPM;
    const entries = Object.entries(mix || {}).filter(([, share]) => share > 0);
    if (entries.length === 0) return rpmFor(video);
    const total = entries.reduce((sum, [, share]) => sum + share, 0) || 1;
    return entries.reduce((sum, [code, share]) => sum + rpmFor({ ...video, country: code }) * (share / total), 0);
};

export const adRevenue = (views: number, video: YoutubeVideo, mix?: Record<string, number>): number =>
    Math.max(0, Math.floor((Math.max(0, views) / 1000) * blendedRpm(video, mix)));

const uploadAbs = (video: YoutubeVideo) => getAbsoluteWeek(video.yearUploaded || 1, video.weekUploaded || 1);

export const recentSponsors = (videos: YoutubeVideo[], abs: number): number =>
    videos.filter(video => video.uploadPlan === 'SPONSOR_HEAVY' && abs - uploadAbs(video) <= SPONSOR_WINDOW && abs - uploadAbs(video) >= 0).length;

/** Extra sponsored videos shrink the next one. They do not get rejected. */
export const sponsorViewMultiplier = (videos: YoutubeVideo[], abs: number): number => {
    const extra = Math.max(0, recentSponsors(videos, abs) - SPONSOR_FREE);
    return Math.max(0.55, 1 - extra * 0.08);
};

export const sponsorMoodHit = (videos: YoutubeVideo[], abs: number): { trust: number; mood: number; heat: number } => {
    const extra = Math.max(0, recentSponsors(videos, abs) - SPONSOR_FREE);
    return { trust: extra * 3, mood: extra * 2, heat: extra * 2 };
};

export interface CollabOutlook {
    views: number;
    subs: number;
    backlash: number;
    trust: number;
    note: string;
}

/** Both audiences show up. A mismatched or messy partner costs trust instead of blocking the video. */
export const collabOutlook = (subs: number, partnerFollowers: number, heat: number, trust: number): CollabOutlook => {
    const yours = Math.max(1, subs);
    const theirs = Math.max(1, partnerFollowers);
    const gap = Math.abs(Math.log10(yours) - Math.log10(theirs));
    const fit = gap > 2 ? 0.45 : gap > 1.2 ? 0.72 : 1;
    const messy = heat >= 60 || trust < 35;
    const views = Math.max(400, Math.floor(Math.sqrt(yours * theirs) * 0.15 * fit * (messy ? 0.7 : 1)));
    const backlash = (gap > 2 ? 6 : 0) + (messy ? 8 : 0);
    return {
        views,
        subs: Math.max(0, Math.floor(views / (messy ? 280 : 160))),
        backlash,
        trust: backlash > 0 ? -Math.min(8, 2 + backlash * 0.4) : 2,
        note: backlash > 0
            ? 'The audiences did not fit. Comments turned, and some regulars left.'
            : 'Both audiences crossed over.',
    };
};

export const slotMultiplier = (slot?: 'MORNING' | 'EVENING' | 'LATE') => UPLOAD_SLOT_REACH[slot || 'EVENING'];

export const hoursForViews = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'qualityScore'>, views: number) =>
    (Math.max(0, views) * minutesFor(video)) / 60;

/** Personal watch time is the videos on that channel, including views added after the counter started. */
export const syncPersonalWatchHours = (channel: YoutubeChannel): YoutubeChannel => ({
    ...channel,
    watchHours: watchHoursFromVideos(channel.videos || []),
});

export const activePartner = (channel: YoutubeChannel, kind: YoutubeChannelKind) => {
    if (kind === 'studio' || kind === 'empirePlus') {
        const board = kind === 'studio' ? channel.officialChannels?.studio : channel.officialChannels?.empirePlus;
        const videos = board?.videos || [];
        const hours = watchHoursFromVideos(videos);
        const subs = board?.subscribers || 0;
        return { subs, hours, monetized: partnerReady(subs, hours), videos, revenue: board?.lifetimeEarnings || 0 };
    }
    const hours = channelWatchHours(channel);
    return {
        subs: channel.subscribers || 0,
        hours,
        monetized: !!channel.isMonetized || partnerReady(channel.subscribers || 0, hours),
        videos: channel.videos || [],
        revenue: channel.lifetimeEarnings || 0,
    };
};

export interface AnalyticsSnapshot {
    ctr: number;
    retention: number;
    watchHours: number;
    revenue: number;
    rpm: number;
    countries: { code: string; share: number }[];
    bestSlot: 'MORNING' | 'EVENING' | 'LATE';
    slotViews: Record<'MORNING' | 'EVENING' | 'LATE', number>;
    monetized: boolean;
    subs: number;
}

export const analyticsFor = (channel: YoutubeChannel, videos: YoutubeVideo[]): AnalyticsSnapshot => {
    const sample = videos.length ? videos : [];
    const ctr = sample.reduce((sum, video) => sum + (video.ctr || 0.05), 0) / Math.max(1, sample.length);
    const held = sample.reduce((sum, video) => sum + minutesFor(video), 0) / Math.max(1, sample.length);
    const retention = Math.max(0.08, Math.min(0.92, held / 12));
    const hours = channelWatchHours(channel);
    const mix = channel.audienceMix || { IN: 70, US: 15, UK: 8, OTHER: 7 };
    const countries = Object.entries(mix).map(([code, share]) => ({ code, share })).sort((a, b) => b.share - a.share);
    const slotViews: Record<'MORNING' | 'EVENING' | 'LATE', number> = { MORNING: 0, EVENING: 0, LATE: 0 };
    const slotCount: Record<'MORNING' | 'EVENING' | 'LATE', number> = { MORNING: 0, EVENING: 0, LATE: 0 };
    sample.forEach(video => {
        const slot = video.uploadSlot || 'EVENING';
        slotViews[slot] += video.views || 0;
        slotCount[slot] += 1;
    });
    const average = (slot: 'MORNING' | 'EVENING' | 'LATE') => slotViews[slot] / Math.max(1, slotCount[slot]);
    const slots: ('MORNING' | 'EVENING' | 'LATE')[] = ['EVENING', 'MORNING', 'LATE'];
    const bestSlot = slots.sort((a, b) => average(b) - average(a))[0];
    const rpm = sample.length ? sample.reduce((sum, video) => sum + blendedRpm(video, mix), 0) / sample.length : blendedRpm({ type: 'VLOG', country: 'IN' } as YoutubeVideo, mix);
    return {
        ctr, retention, watchHours: hours, revenue: channel.lifetimeEarnings || 0, rpm,
        countries, bestSlot, slotViews, monetized: !!channel.isMonetized, subs: channel.subscribers || 0,
    };
};

const houseOf = (player: Player) =>
    (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.isActive);

export const walletBalance = (player: Player, kind: YoutubeChannelKind): number => {
    if (kind === 'studio') return houseOf(player)?.balance || 0;
    if (kind === 'empirePlus') return readCompanyCash(player);
    return player.money || 0;
};

export const chargeWallet = (player: Player, kind: YoutubeChannelKind, amount: number, label: string): { player: Player; error?: string } => {
    const cost = Math.max(0, Math.floor(amount));
    if (cost === 0) return { player };
    if (kind === 'studio') {
        const house = houseOf(player);
        if (!house) return { player, error: 'The studio treasury is not open yet.' };
        if ((house.balance || 0) < cost) return { player, error: 'The studio treasury is short.' };
        house.balance = (house.balance || 0) - cost;
        return { player };
    }
    if (kind === 'empirePlus') {
        if (!player.ownPlatform || player.ownPlatform.stage !== 'LIVE') return { player, error: 'Empire+ is not live, so there is no company wallet.' };
        if (readCompanyCash(player) < cost) return { player, error: 'Empire+ cash is short.' };
        addCompanyCash(player, -cost, label, 'BURN');
        return { player };
    }
    if ((player.money || 0) < cost) return { player, error: 'Not enough cash.' };
    return { player: { ...player, money: player.money - cost } };
};

export const payWallet = (player: Player, kind: YoutubeChannelKind, amount: number, label: string): Player => {
    const paid = Math.max(0, Math.floor(amount));
    if (paid === 0) return player;
    if (kind === 'studio') {
        const house = houseOf(player);
        if (house) house.balance = (house.balance || 0) + paid;
        return player;
    }
    if (kind === 'empirePlus' && player.ownPlatform) {
        addCompanyCash(player, paid, label, 'RECEIPTS');
        return player;
    }
    return { ...player, money: (player.money || 0) + paid };
};

export interface PromoQuote {
    views: number;
    fatigued: boolean;
    note: string;
}

/** More money buys reach, but each extra dollar buys less. A weak video pushed hard fatigues. */
export const quotePromotion = (budget: number, weeks: number, countries: string[], quality: number): PromoQuote => {
    const span = Math.max(1, Math.min(8, weeks));
    const markets = Math.max(1, countries.length);
    const cpm = countries.reduce((sum, code) => sum + (COUNTRY_RPM[code] ?? COUNTRY_RPM.OTHER ?? 1), 0) / markets;
    const reach = Math.pow(Math.max(0, budget), PROMO_CURVE) * (0.7 + cpm / 6) * (1 + (markets - 1) * 0.08);
    const durationDrag = 1 / (1 + (span - 1) * 0.22);
    const weak = quality < 48;
    const views = Math.floor(reach * 12 * durationDrag * (weak ? 0.38 : 1) * (0.85 + Math.min(1.15, quality / 80)));
    const fatigued = weak && budget >= 4_000;
    return {
        views: Math.max(0, views),
        fatigued,
        note: fatigued
            ? 'The cut is weak and the buy is loud. Expect ad fatigue, not a new audience.'
            : span > 3
                ? 'A long buy keeps showing the same people. Returns fall off.'
                : 'The buy should add reach on top of the organic video.',
    };
};

const log = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral' = 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...(player.logs || [])].slice(0, 50),
});

export const promoteVideo = (player: Player, input: { videoId: string; budget: number; countries: string[]; weeks: number }): { player: Player; error?: string } => {
    const kind = player.youtube.activeChannel || 'personal';
    const videos = kind === 'studio'
        ? player.youtube.officialChannels?.studio?.videos || []
        : kind === 'empirePlus'
            ? player.youtube.officialChannels?.empirePlus?.videos || []
            : player.youtube.videos || [];
    const video = videos.find(item => item.id === input.videoId) || player.youtube.videos.find(item => item.id === input.videoId);
    if (!video) return { player, error: 'Pick a video that is already up.' };
    const budget = Math.max(0, Math.floor(input.budget));
    if (budget < 100) return { player, error: 'A promotion needs at least $100.' };
    const countries = (input.countries.length ? input.countries : ['IN']).slice(0, 4);
    const quote = quotePromotion(budget, input.weeks, countries, video.qualityScore || 50);
    const charged = chargeWallet(player, kind, budget, `YouTube ads · ${video.title}`);
    if (charged.error) return charged;
    const promo: YoutubePromotion = {
        id: `yt_ad_${Date.now()}`,
        videoId: video.id,
        budget,
        countries,
        weeks: Math.max(1, Math.min(8, Math.floor(input.weeks || 1))),
        weekStarted: getAbsoluteWeek(player.age, player.currentWeek),
        spent: budget,
        viewsAdded: quote.views,
        fatigued: quote.fatigued,
        channelKind: kind,
    };
    video.views += quote.views;
    video.weeklyHistory = [...(video.weeklyHistory || []), quote.views];
    const gainedSubs = Math.floor(quote.views / (quote.fatigued ? 500 : 220));
    let channel = charged.player.youtube;
    if (kind === 'personal') {
        channel = {
            ...channel,
            totalChannelViews: (channel.totalChannelViews || 0) + quote.views,
            subscribers: channel.subscribers + gainedSubs,
            watchHours: watchHoursFromVideos(channel.videos || []),
        };
    } else {
        const key = kind === 'studio' ? 'studio' : 'empirePlus';
        const board = channel.officialChannels?.[key];
        if (board) {
            channel = {
                ...channel,
                officialChannels: {
                    ...channel.officialChannels,
                    [key]: {
                        ...board,
                        totalViews: (board.totalViews || 0) + quote.views,
                        subscribers: (board.subscribers || 0) + gainedSubs,
                    },
                },
            };
        }
    }
    countries.forEach(code => {
        channel = applyAudienceMix(channel, code, Math.max(1, quote.views / countries.length));
    });
    channel = {
        ...channel,
        promotions: [promo, ...(channel.promotions || [])].slice(0, 16),
        controversy: Math.max(0, Math.min(100, (channel.controversy || 0) + (quote.fatigued ? 6 : 0))),
        audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + (quote.fatigued ? -4 : 0))),
        fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + (quote.fatigued ? -3 : 1))),
    };
    return {
        player: log({ ...charged.player, youtube: channel }, quote.fatigued
            ? `Promoted "${video.title}" and the comments called it an ad. +${quote.views.toLocaleString()} tired views.`
            : `Promoted "${video.title}" for $${budget.toLocaleString()}. +${quote.views.toLocaleString()} views.`, quote.fatigued ? 'neutral' : 'positive'),
    };
};

export const postCommunity = (player: Player, text: string, tone: YoutubeCommunityPost['tone']): { player: Player; error?: string } => {
    const body = text.trim().slice(0, 180);
    if (body.length < 2) return { player, error: 'Write something first.' };
    const channel = player.youtube;
    const heat = tone === 'HEAT';
    const trust = channel.audienceTrust ?? 55;
    const mood = Math.max(0, Math.min(100, (channel.fanMood ?? 55) + (tone === 'WARM' ? 4 : heat ? -3 : 1)));
    const controversy = Math.max(0, Math.min(100, (channel.controversy || 0) + (heat ? 8 : tone === 'NEWS' ? 1 : -1)));
    const post: YoutubeCommunityPost = {
        id: `yt_post_${Date.now()}`,
        text: body,
        tone,
        weekAbs: getAbsoluteWeek(player.age, player.currentWeek),
        mood,
    };
    const trending = heat && controversy >= 55;
    let next: Player = {
        ...player,
        youtube: {
            ...channel,
            fanMood: mood,
            controversy,
            audienceTrust: Math.max(0, Math.min(100, trust + (heat ? -2 : 1))),
            communityPosts: [post, ...(channel.communityPosts || [])].slice(0, 12),
        },
        news: trending ? [{
            id: `news_yt_trend_${post.id}`,
            headline: `${player.name}'s post is trending for the wrong reason.`,
            subtext: body,
            category: 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM',
        }, ...(player.news || [])].slice(0, 80) : player.news,
    };
    next = log(next, trending ? 'The community post turned into a trend. Heat is up.' : 'Posted to the community tab.', trending ? 'negative' : 'positive');
    return { player: next };
};

export const premiereProject = (player: Player, projectId: string): { player: Player; error?: string } => {
    const campaign = player.youtube.marketing?.[projectId];
    if (!campaign) return { player, error: 'That project has no YouTube campaign yet.' };
    if (player.energy.current < 12) return { player, error: 'Not enough energy.' };
    const mood = player.youtube.fanMood ?? 55;
    const heat = player.youtube.controversy || 0;
    const chat = Math.max(0, Math.min(100, Math.round(42 + (mood - 50) * 0.7 - heat * 0.35)));
    const marketing = {
        ...(player.youtube.marketing || {}),
        [projectId]: { ...campaign, premiereHype: chat, campaignHype: Math.max(0, Math.min(100, campaign.campaignHype + (chat >= 60 ? 4 : chat < 40 ? -3 : 1))) },
    };
    let next: Player = {
        ...player,
        youtube: { ...player.youtube, marketing, peakLive: Math.max(player.youtube.peakLive || 0, 1000 + Math.floor(player.youtube.subscribers * 0.04)) },
    };
    next.energy = { ...next.energy, current: Math.max(0, next.energy.current - 12) };
    const sour = chat < 40;
    if (sour) {
        next = {
            ...next,
            news: [{
                id: `news_yt_premiere_${projectId}_${player.currentWeek}`,
                headline: `The premiere chat turned on the trailer.`,
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM',
            }, ...(next.news || [])].slice(0, 80),
        };
    }
    return { player: log(next, sour ? 'Premiere chat was rough. Opening hype slipped.' : 'Premiere chat was with you. Opening hype picked up.', sour ? 'negative' : 'positive') };
};

export const applyAudienceMix = (channel: YoutubeChannel, country: string, weight: number): YoutubeChannel => {
    const mix = { ...(channel.audienceMix || { IN: 70, US: 15, UK: 8, OTHER: 7 }) };
    const code = COUNTRY_RPM[country] ? country : 'OTHER';
    mix[code] = (mix[code] || 0) + weight;
    const total = Object.values(mix).reduce((sum, value) => sum + value, 0) || 1;
    Object.keys(mix).forEach(key => { mix[key] = Math.round((mix[key] / total) * 1000) / 10; });
    return { ...channel, audienceMix: mix };
};

export const bumpWatchHours = (channel: YoutubeChannel, videos: { views: number; video: YoutubeVideo }[]): YoutubeChannel => {
    const added = videos.reduce((sum, row) => sum + (row.views * minutesFor(row.video)) / 60, 0);
    const watchHours = (channel.watchHours || watchHoursFromVideos(channel.videos || [])) + added;
    return { ...channel, watchHours };
};
