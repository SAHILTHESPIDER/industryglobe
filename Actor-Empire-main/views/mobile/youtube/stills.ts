import { YoutubeChannelKind, YoutubeVideo, YoutubeVideoType } from '../../../types';
import { findCreator } from '../../../services/youtubeCreators';
import { getWeeksSinceYoutubeUpload } from '../../../services/youtubeLogic';

export type StillKey = 'hero' | 'bts' | 'interview' | 'premiere' | 'scifi' | 'series' | 'short' | 'song';

export const STILL: Record<StillKey, string> = {
    hero: '/yt/hero.webp',
    bts: '/yt/bts.webp',
    interview: '/yt/interview.webp',
    premiere: '/yt/premiere.webp',
    scifi: '/yt/scifi.webp',
    series: '/yt/series.webp',
    short: '/yt/short.webp',
    song: '/yt/song.webp',
};

const TONE: Record<string, StillKey> = {
    'poster-hero': 'hero',
    'poster-song': 'song',
    'poster-interview': 'interview',
    'poster-bts': 'bts',
    'poster-scifi': 'scifi',
    'poster-series': 'series',
    'poster-live': 'premiere',
    'poster-short': 'short',
    hero: 'hero',
    song: 'song',
    interview: 'interview',
    bts: 'bts',
    scifi: 'scifi',
    series: 'series',
    premiere: 'premiere',
    short: 'short',
};

export const stillKeyFor = (video: Pick<YoutubeVideo, 'type' | 'thumbnailColor' | 'isShort' | 'channelKind'>): StillKey => {
    const painted = TONE[video.thumbnailColor];
    if (painted) return painted;
    return stillForType(video.type, video.isShort, video.channelKind);
};

export const stillForType = (type: string, isShort?: boolean, kind?: YoutubeChannelKind): StillKey => {
    if (isShort || type === 'SHORT' || type === 'SKIT') return 'short';
    if (type === 'VLOG' || type === 'STORYTIME') return 'short';
    if (type === 'MUSIC_VIDEO' || type === 'JUKEBOX' || type === 'LYRIC_VIDEO' || type === 'COVER') return 'song';
    if (type === 'CAST_INTERVIEW' || type === 'Q_AND_A' || type === 'REACTION_COLLAB') return 'interview';
    if (type === 'BTS' || type === 'BLOOPERS' || type === 'CLIP' || type === 'DELETED_SCENE') return 'bts';
    if (type === 'PREMIERE_LIVE') return 'premiere';
    if (type === 'REVIEW_ROUNDUP') return 'scifi';
    if (kind === 'empirePlus') return 'series';
    if (type === 'TRAILER_1' || type === 'TRAILER_2' || type === 'FINAL_TRAILER' || type === 'TRAILER' || type === 'TEASER' || type === 'MOTION_POSTER' || type === 'CHARACTER_POSTER') return 'hero';
    return 'hero';
};

export const stillUrl = (video: Pick<YoutubeVideo, 'type' | 'thumbnailColor' | 'isShort' | 'channelKind'>) =>
    STILL[stillKeyFor(video)];

export interface TypeBadge {
    label: string;
    color: 'red' | 'gold' | 'ind' | 'dark' | 'mint' | 'cy';
}

export const badgeFor = (video: Pick<YoutubeVideo, 'type' | 'isShort'>): TypeBadge => {
    const type = video.type;
    if (video.isShort || type === 'SHORT') return { label: 'SHORT', color: 'red' };
    const map: Partial<Record<YoutubeVideoType, TypeBadge>> = {
        TEASER: { label: 'TEASER', color: 'red' },
        TRAILER: { label: 'TEASER', color: 'red' },
        TRAILER_1: { label: 'TRAILER', color: 'red' },
        TRAILER_2: { label: 'TRAILER 2', color: 'red' },
        FINAL_TRAILER: { label: 'FINAL TRAILER', color: 'red' },
        MOTION_POSTER: { label: 'POSTER', color: 'dark' },
        CHARACTER_POSTER: { label: 'POSTER', color: 'dark' },
        MUSIC_VIDEO: { label: 'MUSIC VIDEO', color: 'gold' },
        JUKEBOX: { label: 'JUKEBOX', color: 'gold' },
        LYRIC_VIDEO: { label: 'LYRIC VIDEO', color: 'gold' },
        COVER: { label: 'COVER', color: 'gold' },
        CAST_INTERVIEW: { label: 'CAST INTERVIEW', color: 'ind' },
        Q_AND_A: { label: 'Q&A', color: 'dark' },
        BTS: { label: 'MAKING OF', color: 'dark' },
        BLOOPERS: { label: 'BLOOPERS', color: 'dark' },
        CLIP: { label: 'CLIP', color: 'dark' },
        DELETED_SCENE: { label: 'DELETED SCENE', color: 'dark' },
        PREMIERE_LIVE: { label: 'LIVE', color: 'red' },
        REVIEW_ROUNDUP: { label: 'REVIEWS', color: 'ind' },
        VLOG: { label: 'VLOG', color: 'dark' },
        SKIT: { label: 'SKIT', color: 'red' },
        STORYTIME: { label: 'STORYTIME', color: 'dark' },
        REACTION_COLLAB: { label: 'REACTION', color: 'cy' },
    };
    return map[type] || { label: type.replace(/_/g, ' '), color: 'dark' };
};

const DUBS = ['Hindi', 'Tamil', 'Telugu', 'English', 'Spanish', 'Arabic'];
export const dubLine = (count?: number) => DUBS.slice(0, Math.max(1, Math.min(DUBS.length, count || 1))).join(' · ');

export const postedAgo = (weeks: number, premiere = false): string => {
    if (weeks <= 0) return premiere ? '6 hours ago' : '3 days ago';
    if (weeks === 1) return '1 week ago';
    if (weeks < 8) return `${weeks} weeks ago`;
    if (weeks < 20) return `${Math.max(1, Math.round(weeks / 4))} months ago`;
    if (weeks < 52) return `${Math.round(weeks / 4)} months ago`;
    return `${Math.max(1, Math.round(weeks / 52))} years ago`;
};

export const weeksAgoFor = (video: YoutubeVideo, age: number, week: number) =>
    getWeeksSinceYoutubeUpload(age, week, video.weekUploaded, video.yearUploaded);

export const creatorFor = (name: string) => findCreator(name);

export const verifiedAuthor = (video: Pick<YoutubeVideo, 'authorName' | 'isPlayer' | 'channelKind'>): boolean => {
    if (video.isPlayer || video.channelKind === 'studio' || video.channelKind === 'empirePlus') return true;
    const creator = findCreator(video.authorName);
    return !!creator && creator.followers >= 100_000;
};

export const PALETTES = [
    'linear-gradient(135deg,#7c3aed,#f97316)',
    'linear-gradient(135deg,#10b981,#0ea5e9)',
    'linear-gradient(135deg,#db2777,#f472b6)',
    'linear-gradient(135deg,#b45309,#fbbf24)',
    'linear-gradient(135deg,#0f766e,#22d3ee)',
    'linear-gradient(135deg,#2563eb,#0ea5e9)',
    'linear-gradient(135deg,#111,#e50914)',
];

export const paletteFor = (label: string) => {
    let h = 0;
    for (let i = 0; i < label.length; i += 1) h = (h * 31 + label.charCodeAt(i)) | 0;
    return PALETTES[Math.abs(h) % PALETTES.length];
};
