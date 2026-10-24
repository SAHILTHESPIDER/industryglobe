/**
 * One content interface for comments, titles, headlines, posts, pitches, and inbox notes.
 *
 * Provider 1 — Firebase AI Logic (Gemini), only when the player turns on Settings → AI writing.
 * Provider 2 — seeded templates. This is the default and the offline fallback.
 * Network calls time out, cache, and rate-limit. Gameplay never waits on them:
 * pass `network: false` (the week loop does) and the template resolves immediately.
 */
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { getSharedFirebaseApp } from '../../services/firebaseService';

export interface CommentBrief {
    videoTitle: string;
    videoType: string;
    author: string;
    project?: string;
    sentiment?: 'positive' | 'mixed' | 'negative';
    count?: number;
    seed?: string;
    network?: boolean;
}

export interface TitleBrief {
    creator: string;
    niche: string;
    country?: string;
    project?: string;
    kind?: string;
    count?: number;
    seed?: string;
    network?: boolean;
}

export interface NewsBrief {
    subject: string;
    event: string;
    tone?: 'record' | 'flop' | 'leak' | 'trade' | 'neutral';
    seed?: string;
    network?: boolean;
}

export interface PostBrief {
    speaker: string;
    subject: string;
    event: string;
    count?: number;
    seed?: string;
    network?: boolean;
}

export interface PitchBrief {
    platform: string;
    title: string;
    rights?: string;
    house?: string;
    seed?: string;
    network?: boolean;
}

export interface InboxBrief {
    sender: string;
    topic: string;
    detail: string;
    seed?: string;
    network?: boolean;
}

export interface AiContentService {
    generateComments(input: CommentBrief): Promise<string[]>;
    creatorVideoTitles(input: TitleBrief): Promise<string[]>;
    newsHeadline(input: NewsBrief): Promise<string>;
    xPosts(input: PostBrief): Promise<string[]>;
    execPitch(input: PitchBrief): Promise<string>;
    inboxMessage(input: InboxBrief): Promise<string>;
}

const TIMEOUT_MS = 6500;
const MAX_PER_MINUTE = 6;
const cache = new Map<string, { at: number; value: string }>();
const hits: number[] = [];

const hash = (value: string) => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const pick = <T>(items: T[], seed: string, salt = 0): T => items[(hash(`${seed}:${salt}`) + salt) % items.length];

const commentsFor = (input: CommentBrief): string[] => {
    const project = input.project || 'this';
    const banks: Record<string, string[]> = {
        positive: [
            `That cut of ${project} is going to wreck a theater.`,
            `Goosebumps on the score. Play it again.`,
            `Here before this becomes the trailer of the year.`,
            `${input.author} understood the assignment.`,
            `The entry shot is the one people will clip.`,
        ],
        mixed: [
            `I like the tone. The middle section still feels soft.`,
            `Cast is right. One shot looks unfinished.`,
            `I'll watch the film. I'm not sure about this cut.`,
            `Comments are going to fight about the VFX.`,
        ],
        negative: [
            `The VFX looks cheap next to the rest of the frame.`,
            `Title is doing more work than the footage.`,
            `This needed another week in the edit.`,
            `I wanted to love it. The hype is ahead of the images.`,
        ],
    };
    const tone = input.sentiment || 'mixed';
    const count = Math.max(3, Math.min(8, input.count || 5));
    return Array.from({ length: count }, (_, index) => pick(banks[tone] || banks.mixed, input.seed || input.videoTitle, index));
};

const titlesFor = (input: TitleBrief): string[] => {
    const project = input.project;
    const lines = project
        ? [
            `${input.creator} reacts to ${project}`,
            `${project} — ${input.creator} live reaction`,
            `Is ${project} actually good? ${input.creator}`,
            `${input.creator} raids the ${project} premiere`,
        ]
        : [
            `${input.creator} tries the ${input.niche.toLowerCase()} challenge`,
            `A week in ${input.country || 'the comments'} with ${input.creator}`,
            `${input.niche} but make it unhinged · ${input.creator}`,
            `${input.creator} finally uploads`,
        ];
    const count = Math.max(1, Math.min(4, input.count || 1));
    return Array.from({ length: count }, (_, index) => pick(lines, input.seed || input.creator, index));
};

const headlineFor = (input: NewsBrief): string => {
    const table: Record<string, string[]> = {
        record: [
            `${input.subject} breaks a YouTube record on the way to release.`,
            `Trade desks rewind ${input.subject} after a record first day.`,
        ],
        flop: [
            `${input.subject} is trending for the wrong reasons.`,
            `Comments turn on ${input.subject} overnight.`,
        ],
        leak: [
            `A leak from ${input.subject} is spreading before release.`,
            `Unfinished footage of ${input.subject} hits YouTube.`,
        ],
        trade: [
            `${input.subject}: ${input.event}`,
            `Industry note — ${input.subject}. ${input.event}`,
        ],
        neutral: [`${input.subject}. ${input.event}`],
    };
    return pick(table[input.tone || 'neutral'] || table.neutral, input.seed || input.subject, 0);
};

const postsFor = (input: PostBrief): string[] => {
    const lines = [
        `${input.speaker}: ${input.subject} ${input.event}`,
        `Timeline check. ${input.subject} — ${input.event}`,
        `${input.subject} is the topic. ${input.speaker} already clipped it.`,
    ];
    const count = Math.max(1, Math.min(3, input.count || 1));
    return Array.from({ length: count }, (_, index) => pick(lines, input.seed || input.subject, index));
};

const pitchFor = (input: PitchBrief): string => {
    if (input.rights) return `${input.platform} holds ${input.rights}. They want ${input.house || 'your house'} to make ${input.title}.`;
    return `${input.platform} wants ${input.title} on the slate${input.house ? `. ${input.house} is the call.` : '.'}`;
};

const inboxFor = (input: InboxBrief): string =>
    `${input.sender} wrote in about ${input.topic}.\n\n${input.detail}`;

const allowNetwork = (flag?: boolean) => flag === true;

const rateOk = () => {
    const now = Date.now();
    while (hits.length && now - hits[0] > 60_000) hits.shift();
    if (hits.length >= MAX_PER_MINUTE) return false;
    hits.push(now);
    return true;
};

const remember = (key: string, value: string) => {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 200) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) cache.delete(oldest[0]);
    }
};

const cached = (key: string) => {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > 6 * 60 * 60 * 1000) {
        cache.delete(key);
        return null;
    }
    return hit.value;
};

const askGemini = async (prompt: string, key: string): Promise<string | null> => {
    const found = cached(key);
    if (found) return found;
    if (!rateOk()) return null;
    try {
        const ai = getAI(getSharedFirebaseApp(), { backend: new GoogleAIBackend() });
        const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });
        const pending = model.generateContent(prompt);
        const result = await Promise.race([
            pending,
            new Promise<null>(resolve => { setTimeout(() => resolve(null), TIMEOUT_MS); }),
        ]);
        if (!result || !('response' in result)) return null;
        const text = result.response.text().trim();
        if (!text) return null;
        remember(key, text.slice(0, 1200));
        return text.slice(0, 1200);
    } catch (error) {
        console.warn('[aiContent] Gemini skipped', error);
        return null;
    }
};

const linesFrom = (raw: string | null, fallback: string[]): string[] => {
    if (!raw) return fallback;
    const lines = raw.split('\n').map(line => line.replace(/^[\s*\-\d.]+/, '').trim()).filter(Boolean);
    return lines.length ? lines.slice(0, fallback.length) : fallback;
};

export const aiContent: AiContentService = {
    async generateComments(input) {
        const fallback = commentsFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `Write ${fallback.length} short YouTube comments about "${input.videoTitle}" (${input.videoType}). Tone ${input.sentiment || 'mixed'}. No hashtags. One comment per line.`,
            `comments:${input.videoTitle}:${input.sentiment}`
        );
        return linesFrom(raw, fallback);
    },
    async creatorVideoTitles(input) {
        const fallback = titlesFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `Write ${fallback.length} YouTube titles for ${input.creator}, a ${input.niche} creator${input.project ? ` reacting to ${input.project}` : ''}. One title per line. No quotes.`,
            `titles:${input.creator}:${input.project || input.niche}`
        );
        return linesFrom(raw, fallback);
    },
    async newsHeadline(input) {
        const fallback = headlineFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `One entertainment-trade headline, under 110 characters, about ${input.subject}. Event: ${input.event}. Tone: ${input.tone || 'neutral'}. No quotes.`,
            `news:${input.subject}:${input.event}`
        );
        return raw?.split('\n')[0]?.slice(0, 140) || fallback;
    },
    async xPosts(input) {
        const fallback = postsFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `Write ${fallback.length} short social posts about ${input.subject}. ${input.event}. Under 180 characters. One per line.`,
            `x:${input.subject}:${input.event}`
        );
        return linesFrom(raw, fallback);
    },
    async execPitch(input) {
        const fallback = pitchFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `One sentence pitch from a streaming executive at ${input.platform} asking a production house to make "${input.title}"${input.rights ? ` from the rights to ${input.rights}` : ''}.`,
            `pitch:${input.platform}:${input.title}`
        );
        return raw?.split('\n')[0]?.slice(0, 240) || fallback;
    },
    async inboxMessage(input) {
        const fallback = inboxFor(input);
        if (!allowNetwork(input.network)) return fallback;
        const raw = await askGemini(
            `A short in-world message from ${input.sender} about ${input.topic}. Fact to include: ${input.detail}. Two short paragraphs.`,
            `inbox:${input.sender}:${input.topic}`
        );
        return raw?.slice(0, 500) || fallback;
    },
};

/** Templates only. Week simulation calls this so a turn never waits on the network. */
export const aiOffline = {
    generateComments: (input: CommentBrief) => commentsFor(input),
    creatorVideoTitles: (input: TitleBrief) => titlesFor(input),
    newsHeadline: (input: NewsBrief) => headlineFor(input),
    xPosts: (input: PostBrief) => postsFor(input),
    execPitch: (input: PitchBrief) => pitchFor(input),
    inboxMessage: (input: InboxBrief) => inboxFor(input),
};
