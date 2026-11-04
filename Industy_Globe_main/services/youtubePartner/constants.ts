import { YoutubeChannelKind, YoutubeDaypart, YoutubeFormat, YoutubeVideo, YoutubeVideoType } from '../../types';

/**
 * Tuning for the YouTube partner layer.
 * Nothing here blocks an upload, a collab, a sponsor, or an ad buy.
 * Weak videos, bad fits, and over-buying only change the result.
 */

export const YPP_SCHEMA = 4;
export const YPP_SUBS = 1000;
export const YPP_WATCH_HOURS = 4000;
/** Shorts path, same as YouTube: 1,000 subs and 10 million Shorts views in the rolling window. */
export const YPP_SHORTS_VIEWS = 10_000_000;
export const HOUR_WEEKS = 52;
export const SHORTS_WEEKS = 12;
export const SPONSOR_WEEKS = 8;

/** Long-form country RPM in dollars per 1,000 views. Entertainment, not finance. */
export const COUNTRY_CPM: Record<string, number> = {
    US: 7.6,
    GB: 5.9,
    UK: 5.9,
    CA: 5.2,
    AU: 4.8,
    DE: 4.5,
    FR: 3.9,
    AE: 3.4,
    JP: 3.6,
    KR: 2.4,
    BR: 1.2,
    MX: 1.05,
    IN: 0.7,
    PH: 0.58,
    NG: 0.46,
    ID: 0.44,
    OTHER: 1.15,
};

/** Multiplier on the country CPM. Trailers sit near 1. Music and sketches pay less. */
export const GENRE_CPM: Record<string, number> = {
    DOCUMENTARY: 1.35,
    TECH: 1.45,
    EDUCATION: 1.5,
    LIFESTYLE: 1.18,
    FAMILY: 1.12,
    ACTION: 1.05,
    SCI_FI: 1.08,
    SUPERHERO: 1.1,
    FANTASY: 1.06,
    THRILLER: 1,
    DRAMA: 0.96,
    ROMANCE: 1,
    COMEDY: 0.88,
    HORROR: 0.84,
    CRIME: 0.98,
    ANIMATION: 1.02,
    SPORTS: 1.04,
    ADVENTURE: 1.03,
    BIOPIC: 1.08,
    MUSIC: 0.6,
    MUSICAL: 0.66,
    TRAILER: 1,
    VLOG: 1.05,
    SKIT: 0.82,
    SHORT: 0.9,
    DEFAULT: 1,
};

/** Shorts pay this fraction of the long-form CPM. Reach is handled separately. */
export const SHORTS_RPM_FACTOR = 0.04;
export const LIVE_RPM_FACTOR = 0.8;
export const PREMIERE_RPM_FACTOR = 1.05;

export const HEAT_SOFT = 40;
export const HEAT_HARD = 70;
export const HEAT_SOFT_MULT = 0.82;
export const HEAT_HARD_MULT = 0.55;

export const DURATION_MIN: Record<string, number> = {
    SHORT: 0.45,
    VLOG: 14,
    SKIT: 8,
    Q_AND_A: 18,
    STORYTIME: 15,
    COVER: 3.6,
    TRAILER: 2.4,
    TEASER: 1.3,
    TRAILER_1: 2.5,
    TRAILER_2: 2.3,
    FINAL_TRAILER: 2.6,
    ANNOUNCEMENT: 1.1,
    BTS: 11,
    CAST_INTERVIEW: 14,
    PREMIERE_LIVE: 48,
    STREAM_PREMIERE: 6,
    RELEASE_PROMO: 0.7,
    MUSIC_VIDEO: 3.8,
    REACTION_COLLAB: 16,
};

export const COLLAB_FIT_BAD = 42;
export const COLLAB_HEAT_BAD = 66;
export const COLLAB_RATE_MIN = 0.03;
export const COLLAB_RATE_MAX = 0.16;

export const SPONSOR_FATIGUE_STEP = 10;
export const SPONSOR_FATIGUE_DECAY = 6;
export const AD_SATURATION_BASE = 2800;
export const AD_SATURATION_PER_SUB = 0.015;
export const AD_FATIGUE_DECAY = 8;
export const AD_BUDGET_MIN = 100;
/** Numeric guard. Repeat buys are allowed; each one converts worse. */
export const AD_BUDGET_GUARD = 1_000_000_000;

export const PREMIERE_HYPE_PER_POINT = 0.28;
export const COMMUNITY_ENERGY = 6;
export const COLLAB_ENERGY = 16;
export const PREMIERE_ENERGY = 18;

export const PROMO_COUNTRIES = ['US', 'IN', 'GB', 'AE', 'BR', 'NG', 'DE', 'OTHER'] as const;

export const DAYPARTS: YoutubeDaypart[] = ['MORNING', 'AFTERNOON', 'EVENING', 'LATE'];
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_AUDIENCE: { code: string; share: number }[] = [
    { code: 'IN', share: 0.46 },
    { code: 'US', share: 0.18 },
    { code: 'GB', share: 0.08 },
    { code: 'AE', share: 0.06 },
    { code: 'OTHER', share: 0.22 },
];

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const isShortVideo = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'signals'>): boolean =>
    !!video.isShort || video.type === 'SHORT' || video.signals?.format === 'SHORT';

export const isLiveVideo = (video: Pick<YoutubeVideo, 'type' | 'signals'>): boolean =>
    video.signals?.format === 'LIVE' || video.type === 'PREMIERE_LIVE';

export const isPremiereVideo = (video: Pick<YoutubeVideo, 'type' | 'signals'>): boolean =>
    video.signals?.format === 'PREMIERE' || video.type === 'STREAM_PREMIERE';

export const durationMinOf = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'signals'>): number => {
    if (typeof video.signals?.durationMin === 'number' && video.signals.durationMin > 0) return video.signals.durationMin;
    if (isShortVideo(video)) return DURATION_MIN.SHORT;
    return DURATION_MIN[video.type] || 10;
};

export const retentionOf = (video: Pick<YoutubeVideo, 'type' | 'isShort' | 'qualityScore' | 'signals'>, controversy = 0): number => {
    if (typeof video.signals?.retention === 'number') return clamp(video.signals.retention, 0.08, 0.95);
    const quality = video.qualityScore ?? 50;
    const base = isShortVideo(video) ? 0.74 + quality / 500 : 0.28 + quality / 260;
    return clamp(base - controversy / 420, 0.12, 0.92);
};

/** Watch hours from a batch of views. Shorts finish often and still add very few hours. */
export const watchHoursFor = (views: number, video: YoutubeVideo, controversy = 0): number => {
    if (!Number.isFinite(views) || views <= 0) return 0;
    return views * (durationMinOf(video) * retentionOf(video, controversy)) / 60;
};

export const genreKeyOf = (video: YoutubeVideo, projectGenre?: string): string => {
    if (video.signals?.genreKey) return video.signals.genreKey;
    if (projectGenre) return projectGenre;
    if (isShortVideo(video)) return 'SHORT';
    const type = String(video.type || '');
    if (type.includes('MUSIC') || type === 'COVER' || type === 'LYRIC_VIDEO' || type === 'JUKEBOX') return 'MUSIC';
    if (type === 'SKIT') return 'SKIT';
    if (type === 'VLOG' || type === 'STORYTIME' || type === 'Q_AND_A') return 'VLOG';
    if (type.includes('TRAILER') || type === 'TEASER' || type === 'ANNOUNCEMENT') return 'TRAILER';
    return 'DEFAULT';
};

export const formatOf = (type: YoutubeVideoType | string, explicit?: { format?: YoutubeFormat }): YoutubeFormat => {
    if (explicit?.format) return explicit.format;
    if (type === 'SHORT') return 'SHORT';
    if (type === 'PREMIERE_LIVE') return 'LIVE';
    if (type === 'STREAM_PREMIERE') return 'PREMIERE';
    return 'LONG';
};

export const walletLabel = (kind: YoutubeChannelKind): string => {
    if (kind === 'studio') return 'studio treasury';
    if (kind === 'empirePlus') return 'Empire+ treasury';
    return 'personal cash';
};
