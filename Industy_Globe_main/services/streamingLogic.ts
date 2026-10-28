
import { PlatformId, StreamingState, ActiveRelease, ProjectDetails, ProjectType, StreamingTrend, StreamingLifecycle, LogEntry, NewsItem, Genre } from '../types';

export interface PlatformProfile {
    id: PlatformId;
    name: string;
    audienceMult: number; // Reach
    prestigeMult: number; // Reputation impact
    payoutMult: number;   // Money factor
    churnRate: 'FAST' | 'MEDIUM' | 'SLOW';
    genreBias: string[];
    color: string;
    subscribers: number; // Millions
    valuation: number; // Billions
}

export const PLATFORMS: Record<PlatformId, PlatformProfile> = {
    NETFLIX: {
        id: 'NETFLIX',
        name: 'Netflix',
        audienceMult: 1.5, // Huge reach
        prestigeMult: 0.8, // Medium prestige
        payoutMult: 1.2,   // Good money
        churnRate: 'FAST', // Content leaves quickly
        genreBias: ['Thriller', 'Action', 'RomCom', 'Sci-Fi'],
        color: 'text-red-600',
        subscribers: 260,
        valuation: 260
    },
    APPLE_TV: {
        id: 'APPLE_TV',
        name: 'Apple TV+',
        audienceMult: 0.6, // Niche
        prestigeMult: 1.5, // Awards bait
        payoutMult: 1.0,
        churnRate: 'SLOW', // Content stays
        genreBias: ['Drama', 'Indie', 'Sci-Fi'],
        color: 'text-zinc-400',
        subscribers: 45,
        valuation: 2900 // Parent company
    },
    DISNEY_PLUS: {
        id: 'DISNEY_PLUS',
        name: 'Disney+',
        audienceMult: 1.4,
        prestigeMult: 1.0,
        payoutMult: 1.1,
        churnRate: 'SLOW',
        genreBias: ['Fantasy', 'Action', 'Sci-Fi'],
        color: 'text-blue-500',
        subscribers: 150,
        valuation: 180
    },
    HULU: {
        id: 'HULU',
        name: 'Hulu',
        audienceMult: 0.9,
        prestigeMult: 0.9,
        payoutMult: 0.9,
        churnRate: 'MEDIUM',
        genreBias: ['Drama', 'RomCom', 'Thriller'],
        color: 'text-emerald-500',
        subscribers: 48,
        valuation: 27
    },
    YOUTUBE: {
        id: 'YOUTUBE',
        name: 'YouTube',
        audienceMult: 2.0, // Massive potential
        prestigeMult: 0.2, // Low prestige
        payoutMult: 0.4,   // Low pay
        churnRate: 'FAST',
        genreBias: ['Indie', 'Horror'],
        color: 'text-red-500',
        subscribers: 2700, // Users essentially
        valuation: 350 // Parent
    }
};

const GENRE_BIAS_ALIASES: Record<string, Genre> = {
    ROMCOM: 'ROMANCE',
    ROM_COM: 'ROMANCE',
    SCIFI: 'SCI_FI',
};

/** Platform bias labels are display text ("Sci-Fi", "RomCom"); projects store Genre enums. */
export const normalizeGenreLabel = (label: string): string => {
    const compact = String(label || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    return GENRE_BIAS_ALIASES[compact] || compact;
};

export const genreBiasMatches = (bias: readonly string[] | undefined, genre: string): boolean => {
    if (!Array.isArray(bias) || !genre) return false;
    const target = normalizeGenreLabel(genre);
    return bias.some(label => normalizeGenreLabel(label) === target);
};

// --- ACQUISITION LOGIC ---

export const determineStreamingAcquisition = (project: ProjectDetails): PlatformId => {
    // Bias selection based on project details
    const scores: Record<PlatformId, number> = {
        NETFLIX: 10,
        APPLE_TV: 5,
        DISNEY_PLUS: 5,
        HULU: 8,
        YOUTUBE: 0
    };

    const genre = project.genre;
    const budget = project.budgetTier;
    const quality = project.hiddenStats.qualityScore;

    // 1. Genre Fit
    Object.values(PLATFORMS).forEach(plat => {
        if (genreBiasMatches(plat.genreBias, genre)) scores[plat.id] += 20;
    });

    // 2. Budget Fit
    if (budget === 'HIGH') {
        scores['DISNEY_PLUS'] += 40;
        scores['NETFLIX'] += 20;
        scores['YOUTUBE'] -= 100; // Blockbusters dont go to YT usually
    } else if (budget === 'LOW') {
        scores['YOUTUBE'] += 50;
        scores['APPLE_TV'] += (quality > 70) ? 30 : -10; // Apple likes good indies
    }

    // 3. Quality Fit
    if (quality > 80) {
        scores['APPLE_TV'] += 40;
        scores['HULU'] += 10;
    } else if (quality < 40) {
        scores['NETFLIX'] += 20; // Needs content volume
        scores['YOUTUBE'] += 30;
        scores['APPLE_TV'] -= 50;
    }

    // Weighted Random Selection
    let pool: PlatformId[] = [];
    Object.entries(scores).forEach(([id, score]) => {
        const count = Math.max(1, Math.floor(score));
        for(let i=0; i<count; i++) pool.push(id as PlatformId);
    });

    return pool[Math.floor(Math.random() * pool.length)] || 'NETFLIX';
};

// --- VIEWERSHIP LOGIC ---

const getStreamingMarketMultiplier = (marketDemand: number, weekOnPlatform: number): number => {
    const safeDemand = Number.isFinite(marketDemand) ? marketDemand : 1;
    if (safeDemand >= 1) {
        const lift = safeDemand - 1;
        if (weekOnPlatform <= 1) return 1 + lift;
        if (weekOnPlatform <= 4) return 1 + (lift * 0.55);
        if (weekOnPlatform <= 8) return 1 + (lift * 0.2);
        return 1 + (lift * 0.06);
    }

    // Soft/cold markets should still hurt the long tail, just not crater it forever.
    const drag = 1 - safeDemand;
    if (weekOnPlatform <= 8) return Math.max(0.72, safeDemand);
    return Math.max(0.82, 1 - (drag * 0.45));
};

const getWeeklyStreamingViewCap = (
    platformId: PlatformId,
    weekOnPlatform: number,
    projectQuality: number,
    type: ProjectType
): number => {
    const platform = PLATFORMS[platformId];
    const subscribers = Math.max(1, platform.subscribers) * 1_000_000;
    const qualityMultiplier = Math.max(0.55, Math.min(1.55, 0.5 + (projectQuality / 100)));
    const typeMultiplier = type === 'SERIES' ? 0.38 : 0.16;
    const platformReachMultiplier = Math.max(0.35, Math.min(2.1, platform.audienceMult));
    const lifecycleMultiplier = weekOnPlatform <= 2
        ? 1
        : weekOnPlatform <= 6
            ? 0.78
            : weekOnPlatform <= 12
                ? 0.52
                : 0.32;

    return Math.max(
        type === 'SERIES' ? 2_000_000 : 750_000,
        Math.floor(subscribers * typeMultiplier * platformReachMultiplier * qualityMultiplier * lifecycleMultiplier)
    );
};

export const calculateStreamingViewership = (
    platformId: PlatformId,
    weekOnPlatform: number,
    projectQuality: number,
    prevViews: number,
    type: ProjectType,
    marketDemand: number = 1
): number => {
    const platform = PLATFORMS[platformId];
    
    // Base Viewership Unit (e.g. 2.5M per "unit" of hype)
    // Scaled up significantly to reflect real world streaming numbers (Millions not thousands)
    let baseUnit = 2500000 * platform.audienceMult; 

    // TV Shows get a Binge Multiplier (Simulates multiple episodes watched per user)
    if (type === 'SERIES') {
        baseUnit *= 2.0;
    }

    if (weekOnPlatform === 1) {
        // Launch week
        const hypeMult = (projectQuality / 50); // 0.5 - 2.0
        const rawViews = baseUnit * hypeMult * (Math.random() + 0.5);
        const adjustedViews = rawViews * getStreamingMarketMultiplier(marketDemand, weekOnPlatform);
        return Math.floor(Math.min(adjustedViews, getWeeklyStreamingViewCap(platformId, weekOnPlatform, projectQuality, type)));
    } else {
        // Decay
        let decay = 0.85; // Default decay
        if (platform.churnRate === 'FAST') decay = 0.75;
        if (platform.churnRate === 'SLOW') decay = 0.90;
        
        // TV Shows retain viewers better (binge watching over weeks)
        if (type === 'SERIES') decay += 0.05;
        
        // Quality buff
        if (projectQuality > 80) decay += 0.05;

        // Cap decay to prevent infinite runs, but allow good legs
        decay = Math.min(0.98, decay);

        let views = prevViews * decay * (Math.random() * 0.2 + 0.9);
        views *= getStreamingMarketMultiplier(marketDemand, weekOnPlatform);

        // After the early launch window, market heat should not overpower decay forever.
        if (weekOnPlatform > 6 && prevViews > 0 && views > prevViews * 0.98) {
            views = prevViews * (0.84 + Math.random() * 0.1);
        }

        return Math.floor(Math.min(views, getWeeklyStreamingViewCap(platformId, weekOnPlatform, projectQuality, type)));
    }
};

export const checkStreamingExit = (platformId: PlatformId, views: number, weeks: number): boolean => {
    const platform = PLATFORMS[platformId];
    // Threshold scaled up due to higher view counts. ~250k views per week minimum to stay active.
    const threshold = 250000 * platform.audienceMult; 
    
    // Hard caps
    if (weeks > 52) return true; // Max 1 year tracked
    
    // Viewership drop
    if (weeks > 4 && views < threshold) return true;

    return false;
};

const getSafeWeekGap = (
    startWeekAbsolute: number | undefined,
    currentAbsoluteWeek: number,
    startWeek: number | undefined,
    currentWeek: number
) => {
    if (typeof startWeekAbsolute === 'number') return startWeekAbsolute - currentAbsoluteWeek;
    if (typeof startWeek === 'number' && currentWeek < startWeek) return startWeek - currentWeek;
    return 0;
};

export const getStreamingTrend = (weeklyViews: number[]): StreamingTrend => {
    if (!Array.isArray(weeklyViews) || weeklyViews.length < 2) return 'STEADY';
    const latest = Math.max(0, weeklyViews[weeklyViews.length - 1] || 0);
    const previous = Math.max(1, weeklyViews[weeklyViews.length - 2] || 1);
    const delta = (latest - previous) / previous;
    if (delta >= 0.2) return 'SURGING';
    if (delta >= 0.05) return 'RISING';
    if (delta <= -0.2) return 'DROPPING';
    if (delta <= -0.05) return 'COOLING';
    return 'STEADY';
};

export const getStreamingLifecycle = (
    streaming: StreamingState,
    currentAbsoluteWeek: number,
    currentWeek: number
): StreamingLifecycle => {
    const weeksUntilStart = getSafeWeekGap(
        streaming.startWeekAbsolute,
        currentAbsoluteWeek,
        streaming.startWeek,
        currentWeek
    );
    if (weeksUntilStart > 0) return 'UPCOMING';
    if (streaming.isLeaving) return 'EXITING';
    if (streaming.weekOnPlatform <= 1) return 'LAUNCH';
    if (streaming.weekOnPlatform <= 4) return 'EARLY_RUN';
    if (streaming.weekOnPlatform <= 12) return 'MID_RUN';
    return 'LONG_TAIL';
};

export const projectNextStreamingViews = (
    platformId: PlatformId,
    weekOnPlatform: number,
    projectQuality: number,
    latestWeeklyViews: number,
    type: ProjectType,
    marketDemand: number = 1
): number => {
    const safeWeek = Math.max(1, weekOnPlatform);
    const safeQuality = Math.max(0, Math.min(100, projectQuality));
    const safeLatestViews = Math.max(0, latestWeeklyViews);
    const platform = PLATFORMS[platformId];

    if (safeWeek <= 1) {
        let baseUnit = 2500000 * platform.audienceMult;
        if (type === 'SERIES') baseUnit *= 2.0;
        const launchViews = baseUnit * (safeQuality / 50) * getStreamingMarketMultiplier(marketDemand, safeWeek);
        return Math.floor(Math.min(launchViews, getWeeklyStreamingViewCap(platformId, safeWeek, safeQuality, type)));
    }

    let decay = 0.85;
    if (platform.churnRate === 'FAST') decay = 0.75;
    if (platform.churnRate === 'SLOW') decay = 0.9;
    if (type === 'SERIES') decay += 0.05;
    if (safeQuality > 80) decay += 0.05;
    decay = Math.min(0.98, decay);

    let projection = safeLatestViews * decay;
    projection *= getStreamingMarketMultiplier(marketDemand, safeWeek);
    if (safeWeek > 6 && projection > safeLatestViews * 0.98) projection = safeLatestViews * 0.92;

    return Math.floor(Math.min(Math.max(0, projection), getWeeklyStreamingViewCap(platformId, safeWeek, safeQuality, type)));
};

export const getStreamingStateSnapshot = (
    streaming: StreamingState,
    projectQuality: number,
    type: ProjectType,
    marketDemand: number,
    currentAbsoluteWeek: number,
    currentWeek: number
): Pick<StreamingState, 'trend' | 'lifecycle' | 'projectedNextViews'> => {
    const lifecycle = getStreamingLifecycle(streaming, currentAbsoluteWeek, currentWeek);
    const trend = getStreamingTrend(streaming.weeklyViews || []);
    const latestWeeklyViews = (streaming.weeklyViews || [])[Math.max(0, (streaming.weeklyViews || []).length - 1)] || 0;
    const projectedNextViews = lifecycle === 'UPCOMING'
        ? 0
        : projectNextStreamingViews(streaming.platformId, streaming.weekOnPlatform, projectQuality, latestWeeklyViews, type, marketDemand);

    return { trend, lifecycle, projectedNextViews };
};

export interface StreamingDashboardLiveTitle {
    releaseId: string;
    name: string;
    platformId: PlatformId;
    platformName: string;
    platformColor: string;
    weekOnPlatform: number;
    totalViews: number;
    latestWeekViews: number;
    projectedNextViews: number;
    trend: StreamingTrend;
    lifecycle: StreamingLifecycle;
    isLeaving: boolean;
    streamingRevenue: number;
    upcomingInWeeks: number;
}

export interface StreamingDashboardPlatformRow {
    platformId: PlatformId;
    platformName: string;
    platformColor: string;
    titleCount: number;
    totalViews: number;
    totalRevenue: number;
    avgLatestWeekViews: number;
}

export interface StreamingDashboardBidRow {
    releaseId: string;
    name: string;
    bidsCount: number;
    bestBid: number;
    bestPlatform?: PlatformId;
}

export interface StreamingDashboardSummary {
    activeTitles: number;
    upcomingTitles: number;
    biddingTitles: number;
    totalViews: number;
    totalStreamingRevenue: number;
    avgLatestWeekViews: number;
}

export interface StreamingDashboardData {
    summary: StreamingDashboardSummary;
    liveTitles: StreamingDashboardLiveTitle[];
    platformBreakdown: StreamingDashboardPlatformRow[];
    biddingQueue: StreamingDashboardBidRow[];
}

export const buildStreamingDashboardData = (
    activeReleases: ActiveRelease[],
    currentAbsoluteWeek: number,
    currentWeek: number
): StreamingDashboardData => {
    const safeReleases = Array.isArray(activeReleases) ? activeReleases : [];
    const liveTitles: StreamingDashboardLiveTitle[] = [];
    const biddingQueue: StreamingDashboardBidRow[] = [];

    safeReleases.forEach(release => {
        if (release.distributionPhase === 'STREAMING' && release.streaming) {
            const platform = PLATFORMS[release.streaming.platformId];
            if (!platform) return;
            const latestWeekViews = release.streaming.weeklyViews[release.streaming.weeklyViews.length - 1] || 0;
            const lifecycle = release.streaming.lifecycle || getStreamingLifecycle(release.streaming, currentAbsoluteWeek, currentWeek);
            const trend = release.streaming.trend || getStreamingTrend(release.streaming.weeklyViews);
            const projectedNextViews = typeof release.streaming.projectedNextViews === 'number'
                ? release.streaming.projectedNextViews
                : projectNextStreamingViews(
                    release.streaming.platformId,
                    release.streaming.weekOnPlatform,
                    release.projectDetails.hiddenStats.qualityScore,
                    latestWeekViews,
                    release.type
                );
            const upcomingInWeeks = getSafeWeekGap(
                release.streaming.startWeekAbsolute,
                currentAbsoluteWeek,
                release.streaming.startWeek,
                currentWeek
            );

            liveTitles.push({
                releaseId: release.id,
                name: release.name,
                platformId: release.streaming.platformId,
                platformName: release.streaming.streamerName || platform.name,
                platformColor: platform.color,
                weekOnPlatform: release.streaming.weekOnPlatform,
                totalViews: release.streaming.totalViews,
                latestWeekViews,
                projectedNextViews,
                trend,
                lifecycle,
                isLeaving: release.streaming.isLeaving,
                streamingRevenue: release.streamingRevenue || 0,
                upcomingInWeeks: Math.max(0, upcomingInWeeks)
            });
        } else if (release.distributionPhase === 'STREAMING_BIDDING') {
            const bids = Array.isArray(release.bids) ? release.bids : [];
            const best = [...bids].sort((a, b) => b.upfront - a.upfront)[0];
            biddingQueue.push({
                releaseId: release.id,
                name: release.name,
                bidsCount: bids.length,
                bestBid: best?.upfront || 0,
                bestPlatform: best?.platformId
            });
        }
    });

    const platformMap = new Map<PlatformId, StreamingDashboardPlatformRow>();
    liveTitles.forEach(title => {
        const existing = platformMap.get(title.platformId);
        if (existing) {
            existing.titleCount += 1;
            existing.totalViews += title.totalViews;
            existing.totalRevenue += title.streamingRevenue;
            existing.avgLatestWeekViews += title.latestWeekViews;
        } else {
            platformMap.set(title.platformId, {
                platformId: title.platformId,
                platformName: title.platformName,
                platformColor: title.platformColor,
                titleCount: 1,
                totalViews: title.totalViews,
                totalRevenue: title.streamingRevenue,
                avgLatestWeekViews: title.latestWeekViews
            });
        }
    });

    const platformBreakdown = Array.from(platformMap.values())
        .map(row => ({
            ...row,
            avgLatestWeekViews: row.titleCount > 0 ? Math.floor(row.avgLatestWeekViews / row.titleCount) : 0
        }))
        .sort((a, b) => b.totalViews - a.totalViews);

    const summary: StreamingDashboardSummary = {
        activeTitles: liveTitles.length,
        upcomingTitles: liveTitles.filter(title => title.lifecycle === 'UPCOMING').length,
        biddingTitles: biddingQueue.length,
        totalViews: liveTitles.reduce((sum, title) => sum + title.totalViews, 0),
        totalStreamingRevenue: liveTitles.reduce((sum, title) => sum + title.streamingRevenue, 0),
        avgLatestWeekViews: liveTitles.length > 0
            ? Math.floor(liveTitles.reduce((sum, title) => sum + title.latestWeekViews, 0) / liveTitles.length)
            : 0
    };

    return { summary, liveTitles, platformBreakdown, biddingQueue };
};

export interface StreamingFeedItem {
    id: string;
    text: string;
    week: number;
    year: number;
    tone: 'positive' | 'negative' | 'neutral' | string;
}

const isStreamingText = (text: string) =>
    /stream|netflix|apple tv|disney\+|hulu|youtube|views|platform|bid/i.test(text);

export const buildStreamingEventFeed = (
    logs: LogEntry[] = [],
    news: NewsItem[] = [],
    limit: number = 8
): StreamingFeedItem[] => {
    const logFeed: StreamingFeedItem[] = logs
        .filter(entry => typeof entry.message === 'string' && isStreamingText(entry.message))
        .map(entry => ({
            id: `log_${entry.year}_${entry.week}_${entry.message.slice(0, 24)}`,
            text: entry.message,
            week: entry.week,
            year: entry.year,
            tone: entry.type
        }));

    const newsFeed: StreamingFeedItem[] = news
        .filter(entry =>
            typeof entry.headline === 'string' &&
            (isStreamingText(entry.headline) || isStreamingText(entry.subtext || ''))
        )
        .map(entry => ({
            id: `news_${entry.id}`,
            text: `${entry.headline}${entry.subtext ? ` — ${entry.subtext}` : ''}`,
            week: entry.week,
            year: entry.year,
            tone: entry.impactLevel === 'HIGH' ? 'positive' : entry.impactLevel === 'LOW' ? 'neutral' : 'negative'
        }));

    return [...logFeed, ...newsFeed]
        .sort((a, b) => (b.year * 52 + b.week) - (a.year * 52 + a.week))
        .slice(0, limit);
};
