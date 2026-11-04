import {
    YoutubeAudienceShare, YoutubeChannel, YoutubeChannelKind, YoutubeDaypart, YoutubeHourLedger,
    YoutubePartnerState, YoutubeVideo,
} from '../../types';
import { hashString } from '../youtubeCreators';
import {
    AD_SATURATION_BASE, AD_SATURATION_PER_SUB, clamp, COUNTRY_CPM, DAY_NAMES, DAYPARTS, DEFAULT_AUDIENCE,
    durationMinOf, GENRE_CPM, genreKeyOf, HEAT_HARD, HEAT_HARD_MULT, HEAT_SOFT, HEAT_SOFT_MULT,
    HOUR_WEEKS, isLiveVideo, isPremiereVideo, isShortVideo, retentionOf, SHORTS_RPM_FACTOR,
    LIVE_RPM_FACTOR, PREMIERE_RPM_FACTOR, SHORTS_WEEKS, SPONSOR_WEEKS, watchHoursFor,
    YPP_SCHEMA, YPP_SHORTS_VIEWS, YPP_SUBS, YPP_WATCH_HOURS,
} from './constants';

const emptyLedger = (): YoutubeHourLedger => ({ personal: [], studio: [], empirePlus: [] });

const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

const asLedger = (value: YoutubeHourLedger | undefined, cap: number): YoutubeHourLedger => {
    const source = value || emptyLedger();
    const take = (list: unknown) => (Array.isArray(list) ? list.map(item => num(item)).filter(item => item >= 0).slice(-cap) : []);
    return { personal: take(source.personal), studio: take(source.studio), empirePlus: take(source.empirePlus) };
};

export const normalizeAudience = (value: YoutubeAudienceShare[] | undefined): YoutubeAudienceShare[] => {
    const rows = (Array.isArray(value) ? value : [])
        .map(row => ({ code: String(row?.code || 'OTHER'), share: num(row?.share) }))
        .filter(row => row.share > 0);
    const total = rows.reduce((sum, row) => sum + row.share, 0);
    if (total <= 0) return DEFAULT_AUDIENCE.map(row => ({ ...row }));
    return rows.map(row => ({ code: row.code, share: row.share / total }));
};

export const emptyPartner = (): YoutubePartnerState => ({
    feature: 1,
    seeded: false,
    hourWeeks: emptyLedger(),
    shortsViewWeeks: emptyLedger(),
    lifetimeHours: {},
    monetized: {},
    sponsorFatigue: 0,
    adFatigue: 0,
    sponsorWeeks: [],
    sponsorThisWeek: 0,
    audience: DEFAULT_AUDIENCE.map(row => ({ ...row })),
    posts: [],
    trends: [],
    promotions: [],
    liveBoost: {},
    held: {},
    lastRevenue: {},
    lifetimeByWallet: {},
});

const seedVideo = (video: YoutubeVideo, seeded: boolean): YoutubeVideo => {
    const signals = video.signals || {};
    const viewsKnown = typeof signals.trackedViews === 'number';
    const earningsKnown = typeof signals.trackedEarnings === 'number';
    if (viewsKnown && earningsKnown) return video;
    return {
        ...video,
        signals: {
            ...signals,
            trackedViews: viewsKnown ? signals.trackedViews : (seeded ? 0 : video.views || 0),
            trackedEarnings: earningsKnown ? signals.trackedEarnings : (seeded ? 0 : video.earnings || 0),
        },
    };
};

const seedList = (videos: YoutubeVideo[] | undefined, seeded: boolean) => (videos || []).map(video => seedVideo(video, seeded));

/**
 * Fills partner fields that are missing and never lowers schemaVersion.
 * Safe to run on every load. Unknown fields on the channel and on partner stay put.
 */
export const ensureYoutubePartner = (channel: YoutubeChannel): YoutubeChannel => {
    const current = channel.partner;
    const base = emptyPartner();
    const seeded = current?.seeded === true;
    const partner: YoutubePartnerState = {
        ...base,
        ...(current || {}),
        feature: 1,
        seeded,
        hourWeeks: asLedger(current?.hourWeeks, HOUR_WEEKS),
        shortsViewWeeks: asLedger(current?.shortsViewWeeks, SHORTS_WEEKS),
        lifetimeHours: { ...base.lifetimeHours, ...(current?.lifetimeHours || {}) },
        monetized: {
            personal: channel.isMonetized === true || current?.monetized?.personal === true,
            studio: (channel.officialChannels?.studio?.lifetimeEarnings || 0) > 0 || current?.monetized?.studio === true,
            empirePlus: (channel.officialChannels?.empirePlus?.lifetimeEarnings || 0) > 0 || current?.monetized?.empirePlus === true,
        },
        sponsorFatigue: clamp(num(current?.sponsorFatigue), 0, 100),
        adFatigue: clamp(num(current?.adFatigue), 0, 100),
        sponsorWeeks: Array.isArray(current?.sponsorWeeks) ? current.sponsorWeeks.map(item => num(item)).slice(-SPONSOR_WEEKS) : [],
        sponsorThisWeek: Math.max(0, Math.floor(num(current?.sponsorThisWeek))),
        audience: normalizeAudience(current?.audience),
        posts: Array.isArray(current?.posts) ? current.posts.slice(0, 20) : [],
        trends: Array.isArray(current?.trends) ? current.trends.slice(0, 8) : [],
        promotions: Array.isArray(current?.promotions) ? current.promotions.slice(0, 8) : [],
        liveBoost: { ...(current?.liveBoost || {}) },
        held: { ...base.held, ...(current?.held || {}) },
        lastRevenue: { ...base.lastRevenue, ...(current?.lastRevenue || {}) },
        lifetimeByWallet: { ...base.lifetimeByWallet, ...(current?.lifetimeByWallet || {}) },
        settledAbs: typeof current?.settledAbs === 'number' ? current.settledAbs : undefined,
        preferredDaypart: current?.preferredDaypart,
    };
    const version = typeof channel.schemaVersion === 'number' ? channel.schemaVersion : 0;
    const official = channel.officialChannels;
    return {
        ...channel,
        schemaVersion: Math.max(YPP_SCHEMA, version),
        partner,
        videos: seedList(channel.videos, seeded),
        officialChannels: official ? {
            ...official,
            studio: official.studio ? { ...official.studio, videos: seedList(official.studio.videos, seeded) } : official.studio,
            empirePlus: official.empirePlus ? { ...official.empirePlus, videos: seedList(official.empirePlus.videos, seeded) } : official.empirePlus,
        } : official,
    };
};

export const blendedCpm = (channel: YoutubeChannel, video: YoutubeVideo): number => {
    const audience = channel.partner?.audience?.length ? channel.partner.audience : DEFAULT_AUDIENCE;
    let weighted = 0;
    let weight = 0;
    audience.forEach(row => {
        const rate = COUNTRY_CPM[row.code] ?? COUNTRY_CPM.OTHER;
        weighted += rate * row.share;
        weight += row.share;
    });
    const country = weight > 0 ? weighted / weight : COUNTRY_CPM.OTHER;
    const genre = GENRE_CPM[genreKeyOf(video)] ?? GENRE_CPM.DEFAULT;
    const format = isShortVideo(video) ? SHORTS_RPM_FACTOR : isLiveVideo(video) ? LIVE_RPM_FACTOR : isPremiereVideo(video) ? PREMIERE_RPM_FACTOR : 1;
    const heat = channel.controversy ?? 0;
    const ads = heat >= HEAT_HARD ? HEAT_HARD_MULT : heat >= HEAT_SOFT ? HEAT_SOFT_MULT : 1;
    return country * genre * format * ads;
};

export const adDollars = (channel: YoutubeChannel, video: YoutubeVideo, views: number, kind: YoutubeChannelKind, absWeek: number): number => {
    if (!Number.isFinite(views) || views <= 0) return 0;
    if (kind === 'personal' && (channel.demonetizedUntilAbs || 0) > absWeek) return 0;
    if (!channel.partner?.monetized?.[kind]) return 0;
    const dollars = (views / 1000) * blendedCpm(channel, video);
    if (!Number.isFinite(dollars) || dollars <= 0) return 0;
    return Math.floor(dollars);
};

export const subsOf = (channel: YoutubeChannel, kind: YoutubeChannelKind): number => {
    if (kind === 'studio') return channel.officialChannels?.studio?.subscribers || 0;
    if (kind === 'empirePlus') return channel.officialChannels?.empirePlus?.subscribers || 0;
    return channel.subscribers || 0;
};

export const sumList = (list: number[] | undefined) => (list || []).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

export interface YppProgress {
    kind: YoutubeChannelKind;
    monetized: boolean;
    adsPaused: boolean;
    subscribers: number;
    watchHours: number;
    lifetimeHours: number;
    shortsViews: number;
    subsNeed: number;
    hoursNeed: number;
    shortsNeed: number;
    readyByLong: boolean;
    readyByShorts: boolean;
}

const catalogHours = (channel: YoutubeChannel, kind: YoutubeChannelKind): { hours: number; shorts: number } => {
    const controversy = channel.controversy ?? 0;
    return videosFor(channel, kind).reduce((sum, video) => {
        sum.hours += watchHoursFor(video.views || 0, video, controversy);
        if (isShortVideo(video)) sum.shorts += video.views || 0;
        return sum;
    }, { hours: 0, shorts: 0 });
};

export const yppProgress = (channel: YoutubeChannel, kind: YoutubeChannelKind, absWeek = 0): YppProgress => {
    const partner = channel.partner;
    const storedHours = sumList(partner?.hourWeeks?.[kind]);
    const storedShorts = sumList(partner?.shortsViewWeeks?.[kind]);
    const catalog = (!partner?.seeded && storedHours <= 0) ? catalogHours(channel, kind) : { hours: storedHours, shorts: storedShorts };
    const watchHours = catalog.hours;
    const shortsViews = catalog.shorts;
    const subscribers = subsOf(channel, kind);
    const readyByLong = subscribers >= YPP_SUBS && watchHours >= YPP_WATCH_HOURS;
    const readyByShorts = subscribers >= YPP_SUBS && shortsViews >= YPP_SHORTS_VIEWS;
    return {
        kind,
        monetized: partner?.monetized?.[kind] === true,
        adsPaused: kind === 'personal' && (channel.demonetizedUntilAbs || 0) > absWeek,
        subscribers,
        watchHours,
        lifetimeHours: Math.max(partner?.lifetimeHours?.[kind] || 0, watchHours),
        shortsViews,
        subsNeed: YPP_SUBS,
        hoursNeed: YPP_WATCH_HOURS,
        shortsNeed: YPP_SHORTS_VIEWS,
        readyByLong,
        readyByShorts,
    };
};

export const videosFor = (channel: YoutubeChannel, kind: YoutubeChannelKind): YoutubeVideo[] => {
    if (kind === 'studio') return channel.officialChannels?.studio?.videos || [];
    if (kind === 'empirePlus') return channel.officialChannels?.empirePlus?.videos || [];
    return channel.videos || [];
};

export const daypartOf = (video: YoutubeVideo): YoutubeDaypart => {
    if (video.signals?.daypart) return video.signals.daypart;
    return DAYPARTS[hashString(video.id || video.title || 'v') % DAYPARTS.length];
};

export const slotOf = (video: YoutubeVideo): number => {
    if (typeof video.signals?.uploadSlot === 'number') return ((video.signals.uploadSlot % 7) + 7) % 7;
    return Math.abs(video.weekUploaded || 0) % 7;
};

export interface AnalyticsSnapshot {
    kind: YoutubeChannelKind;
    monetized: boolean;
    adsPaused: boolean;
    subscribers: number;
    watchHours: number;
    lifetimeHours: number;
    shortsViews: number;
    subsNeed: number;
    hoursNeed: number;
    shortsNeed: number;
    ctr: number;
    retention: number;
    audience: { code: string; share: number; cpm: number }[];
    blendedCpm: number;
    adRevenueWeek: number;
    lifetimeEarnings: number;
    sponsorFatigue: number;
    adFatigue: number;
    best: { day: string; daypart: YoutubeDaypart; views: number } | null;
    primeNote: string;
    fanMood: number;
    moodLabel: string;
    controversy: number;
    trust: number;
}

export const moodLabel = (mood: number, controversy: number): string => {
    if (controversy >= HEAT_HARD) return 'Hostile';
    if (mood >= 70 && controversy < HEAT_SOFT) return 'Loyal';
    if (mood >= 55) return 'Warm';
    if (mood >= 40) return 'Restless';
    return 'Cold';
};

export const readAnalytics = (channel: YoutubeChannel, kind: YoutubeChannelKind, absWeek = 0): AnalyticsSnapshot => {
    const progress = yppProgress(channel, kind, absWeek);
    const videos = videosFor(channel, kind);
    const sample = videos.slice(0, 24);
    const ctrOf = (video: YoutubeVideo) => (typeof video.ctr === 'number' ? video.ctr : 0.04 + (video.qualityScore || 50) / 1200);
    const ctr = sample.length ? sample.reduce((sum, video) => sum + ctrOf(video), 0) / sample.length : 0.04;
    const retention = sample.length
        ? sample.reduce((sum, video) => sum + retentionOf(video, channel.controversy || 0), 0) / sample.length
        : 0.35;
    const audience = (channel.partner?.audience?.length ? channel.partner.audience : DEFAULT_AUDIENCE).map(row => ({
        code: row.code,
        share: row.share,
        cpm: COUNTRY_CPM[row.code] ?? COUNTRY_CPM.OTHER,
    }));
    const longForm = sample.find(video => !isShortVideo(video) && !isLiveVideo(video) && !isPremiereVideo(video));
    const probe: YoutubeVideo = longForm || {
        id: 'probe', title: '', type: 'VLOG', thumbnailColor: '', views: 0, likes: 0, earnings: 0,
        weekUploaded: 1, isPlayer: true, authorName: '', qualityScore: 60, weeklyHistory: [], comments: [],
        signals: { format: 'LONG', genreKey: 'VLOG' },
    };
    const buckets = new Map<string, { views: number; count: number; day: string; daypart: YoutubeDaypart }>();
    sample.forEach(video => {
        const daypart = daypartOf(video);
        const slot = slotOf(video);
        const key = `${slot}:${daypart}`;
        const row = buckets.get(key) || { views: 0, count: 0, day: DAY_NAMES[slot], daypart };
        row.views += video.views || 0;
        row.count += 1;
        buckets.set(key, row);
    });
    let best: AnalyticsSnapshot['best'] = null;
    buckets.forEach(row => {
        const avg = row.views / Math.max(1, row.count);
        if (!best || avg > best.views) best = { day: row.day, daypart: row.daypart, views: avg };
    });
    const top = [...audience].sort((a, b) => b.share - a.share)[0];
    const lifetimeEarnings = kind === 'studio'
        ? channel.officialChannels?.studio?.lifetimeEarnings || 0
        : kind === 'empirePlus'
            ? channel.officialChannels?.empirePlus?.lifetimeEarnings || 0
            : channel.lifetimeEarnings || 0;
    return {
        ...progress,
        ctr,
        retention,
        audience,
        blendedCpm: blendedCpm({ ...channel, partner: channel.partner || emptyPartner() }, probe),
        adRevenueWeek: channel.partner?.lastRevenue?.[kind] || 0,
        lifetimeEarnings,
        sponsorFatigue: channel.partner?.sponsorFatigue || 0,
        adFatigue: channel.partner?.adFatigue || 0,
        best,
        primeNote: top ? `Most of this audience is in ${top.code}. Evening there is when they watch.` : 'Evening is the default prime time.',
        fanMood: channel.fanMood ?? 55,
        moodLabel: moodLabel(channel.fanMood ?? 55, channel.controversy ?? 0),
        controversy: channel.controversy ?? 0,
        trust: channel.audienceTrust ?? 55,
    };
};

export const quotePromotion = (input: {
    budget: number;
    countries: string[];
    subs: number;
    quality: number;
    adFatigue: number;
    weeks: number;
}): { views: number; subs: number; efficiency: number; weak: boolean; fatigueAdd: number; cpm: number } => {
    const codes = input.countries.length ? input.countries : ['OTHER'];
    const cpm = codes.reduce((sum, code) => sum + (COUNTRY_CPM[code] ?? COUNTRY_CPM.OTHER), 0) / codes.length;
    const saturation = AD_SATURATION_BASE + Math.max(0, input.subs) * AD_SATURATION_PER_SUB;
    const efficiency = 1 / (1 + Math.max(0, input.budget) / Math.max(1, saturation));
    const weak = input.quality < 50;
    const qualityFactor = input.quality < 45 ? 0.38 : input.quality < 60 ? 0.7 : 1;
    const fatigueFactor = clamp(1 - input.adFatigue / 130, 0.28, 1);
    const raw = (Math.max(0, input.budget) / Math.max(0.4, cpm)) * 1000;
    const views = Math.max(0, Math.floor(raw * efficiency * qualityFactor * fatigueFactor));
    const conversion = input.quality < 45 ? 900 : input.quality < 60 ? 420 : 220;
    const subs = Math.floor(views / conversion);
    const fatigueAdd = (Math.max(0, input.budget) / Math.max(1, saturation)) * (weak ? 18 : 8);
    return { views, subs, efficiency, weak, fatigueAdd, cpm };
};

export const sponsoredViewMultiplier = (fatigue: number, recentCount: number): number =>
    clamp(1 - Math.max(0, fatigue) / 160 - Math.max(0, recentCount - 2) * 0.1, 0.32, 1);

export const scaleBrandPayout = (input: { subs: number; trust: number; fatigue: number; controversy: number; recentSponsors: number }): number => {
    const base = Math.max(800, input.subs * (0.16 + Math.min(0.22, input.trust / 400)));
    const fatigueMult = 1 / (1 + input.fatigue / 110 + Math.max(0, input.recentSponsors - 1) * 0.12);
    const heat = input.controversy >= HEAT_HARD ? 0.62 : input.controversy >= HEAT_SOFT ? 0.84 : 1;
    return Math.max(0, Math.floor(base * fatigueMult * heat));
};

export const recentSponsorCount = (channel: YoutubeChannel): number =>
    sumList(channel.partner?.sponsorWeeks) + (channel.partner?.sponsorThisWeek || 0);

export const pushWeek = (list: number[], value: number, cap: number) => [...list, Math.max(0, value)].slice(-cap);

export const hoursFromVideo = (video: YoutubeVideo, views: number, controversy: number) => watchHoursFor(views, video, controversy);

export const durationLabel = (video: YoutubeVideo) => {
    const minutes = durationMinOf(video);
    const whole = Math.floor(minutes);
    const seconds = Math.round((minutes - whole) * 60);
    return `${whole}:${String(seconds).padStart(2, '0')}`;
};
