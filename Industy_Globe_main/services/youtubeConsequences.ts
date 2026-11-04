import { YoutubeVideoType } from '../types';

const canonical = (type: string): string => (type === 'TRAILER' ? 'TRAILER_1' : type);

/**
 * Balancing knobs for YouTube drops. Nothing here blocks an upload.
 * Repeats, bad timing, spam, weak cuts, and crowded weeks only change the result.
 *
 * SWEET — weeks before release where a type still feels on time. Negative means after release.
 * REPEAT_WEIGHT — each earlier drop of the same type shrinks the next one.
 * CLASH_STEP — each extra big drop in the same week splits attention.
 * CLASH_FLOOR — the worst a crowded week can get.
 * SPAM_START — posts on one channel in a week before backlash stacks harder.
 * FATIGUE_WEIGHT — how hard channel fatigue cuts reach.
 */

export const SWEET_WINDOW: Record<string, [number, number]> = {
    ANNOUNCEMENT: [8, 28],
    MOTION_POSTER: [6, 18],
    CHARACTER_POSTER: [4, 16],
    TEASER: [3, 14],
    TRAILER: [1, 10],
    TRAILER_1: [1, 10],
    TRAILER_2: [1, 8],
    FINAL_TRAILER: [0, 4],
    MUSIC_VIDEO: [1, 12],
    LYRIC_VIDEO: [1, 12],
    JUKEBOX: [0, 10],
    BTS: [0, 10],
    BLOOPERS: [0, 8],
    CAST_INTERVIEW: [0, 8],
    RELEASE_PROMO: [0, 1],
    STREAM_PREMIERE: [-1, 3],
    PREMIERE_LIVE: [0, 1],
    CLIP: [-8, 1],
    REVIEW_ROUNDUP: [-6, 1],
    DELETED_SCENE: [-10, 0],
    SHORT: [-4, 20],
    REACTION_COLLAB: [-2, 8],
};

export const REPEAT_WEIGHT = 0.42;
export const CLASH_STEP = 0.11;
export const CLASH_FLOOR = 0.42;
export const SPAM_START = 3;
export const FATIGUE_WEIGHT = 140;
export const UNDERFUNDED_REACH = 0.62;

const BIG = new Set([
    'ANNOUNCEMENT', 'MOTION_POSTER', 'TEASER', 'TRAILER', 'TRAILER_1', 'TRAILER_2', 'FINAL_TRAILER',
    'MUSIC_VIDEO', 'STREAM_PREMIERE', 'RELEASE_PROMO', 'PREMIERE_LIVE',
]);

export type TimingBand = 'early' | 'sweet' | 'late' | 'after' | 'open';

export const isBigDrop = (type: string): boolean => BIG.has(canonical(type));

export const timingBand = (type: YoutubeVideoType, weeksBefore: number | null): TimingBand => {
    if (weeksBefore == null || !Number.isFinite(weeksBefore)) return 'open';
    const window = SWEET_WINDOW[canonical(type)] || SWEET_WINDOW[type] || [0, 12];
    const [lo, hi] = window;
    if (weeksBefore >= lo && weeksBefore <= hi) return 'sweet';
    if (weeksBefore > hi) return 'early';
    if (weeksBefore < 0) return 'after';
    return 'late';
};

export const timingMultiplier = (band: TimingBand): number => {
    if (band === 'sweet' || band === 'open') return 1;
    if (band === 'early') return 0.62;
    if (band === 'late') return 0.74;
    return 0.58;
};

export const repeatMultiplier = (priorSameType: number): number =>
    1 / (1 + REPEAT_WEIGHT * Math.max(0, priorSameType));

export const clashMultiplier = (bigDropsSameWeek: number): number => {
    const extra = Math.max(0, bigDropsSameWeek - 1);
    return Math.max(CLASH_FLOOR, Math.min(1, 1 - CLASH_STEP * extra));
};

export const fatigueMultiplier = (fatigue: number): number =>
    Math.max(0.4, Math.min(1, 1 - Math.max(0, fatigue) / FATIGUE_WEIGHT));

/** Points added to backlash. Callers clamp the running total. */
export const spamBacklash = (postsThisWeek: number, priorSameType: number, band: TimingBand, quality: number): number => {
    let backlash = 0;
    if (priorSameType >= 1) backlash += 3 + priorSameType * 2;
    if (postsThisWeek >= SPAM_START) backlash += 4 + (postsThisWeek - (SPAM_START - 1)) * 3;
    if (band === 'early') backlash += 3;
    if (band === 'late' || band === 'after') backlash += 5;
    if (quality < 45) backlash += 8;
    else if (quality < 55) backlash += 3;
    return backlash;
};

export interface DropOutlook {
    band: TimingBand;
    repeats: number;
    viewMultiplier: number;
    hypeMultiplier: number;
    backlash: number;
    note: string;
}

const noteFor = (band: TimingBand, repeats: number, sameWeekPosts: number, bigDrops: number, backlash: number): string => {
    const bits: string[] = [];
    if (repeats >= 1) bits.push(repeats === 1 ? 'Another one of these. Returns drop.' : `${repeats + 1} of this type. The audience is tired of it.`);
    if (band === 'early') bits.push('Early for this cut. A lot of people scroll past.');
    else if (band === 'late') bits.push('Late. The conversation has already moved.');
    else if (band === 'after') bits.push('The film is already out. This lands as a leftover, not a launch.');
    else if (!repeats) bits.push('Timing is fine.');
    if (sameWeekPosts >= SPAM_START - 1) bits.push('Several posts in one week. That reads as spam.');
    if (bigDrops >= 3) bits.push('Big drops are stacked this week. Attention splits.');
    if (backlash >= 12) bits.push('Expect backlash, not just fewer views.');
    if (bits.length === 0) bits.push('No extra penalty.');
    return bits.join(' ');
};

export const dropOutlook = (input: {
    type: YoutubeVideoType | string;
    weeksBefore: number | null;
    repeats: number;
    sameWeekPosts: number;
    rivalBigDrops: number;
    quality?: number;
}): DropOutlook => {
    const type = canonical(String(input.type)) as YoutubeVideoType;
    const band = timingBand(type, input.weeksBefore);
    const quality = input.quality ?? 60;
    const posts = Math.max(1, input.sameWeekPosts);
    const view = timingMultiplier(band)
        * repeatMultiplier(input.repeats)
        * clashMultiplier(Math.max(1, input.rivalBigDrops))
        * (posts >= SPAM_START ? 0.8 : 1);
    const hypeMultiplier = Math.max(0.35, Math.min(1.1, 0.45 + view * 0.55));
    const backlash = spamBacklash(posts, input.repeats, band, quality);
    return {
        band,
        repeats: input.repeats,
        viewMultiplier: view,
        hypeMultiplier,
        backlash,
        note: noteFor(band, input.repeats, posts, input.rivalBigDrops, backlash),
    };
};
