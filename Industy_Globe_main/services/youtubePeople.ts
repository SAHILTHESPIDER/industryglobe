import { CreatorYoutubeChannel, NewsItem, Player, YoutubeChannel } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { describeAward, newTiers } from './youtubeAwards';
import { hashString } from './youtubeCreators';
import { getEnabledGlobalCreatorProfiles } from './youtubeLogic';
import { BACKFILL_WEEKS } from './youtubeRivals';

/**
 * People on YouTube: actors, singers, streamers, influencers.
 * A new career starts them at zero and lets cadence grow them.
 * An older save keeps the audience the player already saw.
 * Listed followers are only a pace weight, the same way a global brand grows faster.
 */

export interface CreatorSeed {
    id: string;
    name: string;
    handle: string;
    followers: number;
    cadence?: number;
    country?: string;
    avatar?: string;
}

export const creatorPace = (listedFollowers: number) => {
    const listed = Math.max(1_000, listedFollowers || 1_000);
    return Math.round((1 + Math.max(0, Math.log10(listed) - 3) * 0.5) * 100) / 100;
};

export const creatorSeeds = (player: Player): CreatorSeed[] =>
    getEnabledGlobalCreatorProfiles(player).map(creator => ({
        id: creator.id,
        name: creator.name,
        handle: creator.handle,
        followers: creator.followers,
        cadence: creator.cadence,
        country: creator.country,
        avatar: creator.avatar,
    }));

export const findCreatorSeed = (player: Player, idOrName: string) =>
    creatorSeeds(player).find(creator => creator.id === idOrName || creator.name === idOrName || creator.handle === idOrName);

const growWeek = (row: CreatorYoutubeChannel, seed: CreatorSeed, week: number) => {
    const pace = creatorPace(seed.followers);
    const posts = Math.max(1, Math.round(seed.cadence || 1));
    const swing = 0.9 + ((hashString(`${seed.id}:${week}:post`) % 20) / 100);
    const discovery = 2_400 * pace * pace;
    const carry = Math.pow(Math.max(row.subscribers, 1), 0.62) * 18 * pace;
    const views = Math.max(0, Math.floor((discovery + carry) * posts * swing));
    row.totalViews += views;
    row.subscribers = Math.max(0, row.subscribers + Math.floor(views / 460));
};

export interface CreatorSyncResult {
    channel: YoutubeChannel;
    news: NewsItem[];
}

export const syncCreatorYoutube = (player: Player, channel: YoutubeChannel, mode: 'view' | 'week'): CreatorSyncResult => {
    const seeds = creatorSeeds(player);
    const abs = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    const previous = new Map((channel.creatorChannels || []).map(row => [row.id, row]));
    const zero = !!channel.zeroStart;
    const rows = new Map<string, CreatorYoutubeChannel>();
    seeds.forEach(seed => {
        const prior = previous.get(seed.id);
        if (prior) {
            rows.set(seed.id, { ...prior, playButtons: [...(prior.playButtons || [])] });
            return;
        }
        const subscribers = zero ? 0 : Math.max(0, Math.floor(seed.followers || 0));
        const totalViews = zero ? 0 : Math.floor(subscribers * 8);
        rows.set(seed.id, {
            id: seed.id,
            subscribers,
            totalViews,
            playButtons: newTiers(undefined, subscribers),
        });
    });

    const cursor = channel.creatorSimWeekAbs;
    const announce = mode === 'week' && cursor != null;
    const news: NewsItem[] = [];
    const start = cursor == null
        ? Math.max(0, abs - BACKFILL_WEEKS)
        : (mode === 'week' && cursor < abs ? Math.max(cursor + 1, abs - (BACKFILL_WEEKS - 1)) : null);
    const end = mode === 'week' ? abs : Math.max(0, abs - 1);
    if (start != null) {
        for (let week = start; week <= end; week += 1) {
            seeds.forEach(seed => {
                const row = rows.get(seed.id);
                if (!row) return;
                const owned = [...(row.playButtons || [])];
                growWeek(row, seed, week);
                const crossed = newTiers(owned, row.subscribers);
                if (!crossed.length) return;
                row.playButtons = [...owned, ...crossed];
                if (announce && news.length < 3) {
                    const tier = crossed[crossed.length - 1];
                    news.push({
                        id: `news_yt_creator_${seed.id}_${tier}_${week}`,
                        headline: describeAward(seed.name, tier),
                        subtext: 'A creator channel crossed a play-button line.',
                        category: 'INDUSTRY',
                        week: player.currentWeek,
                        year: player.age,
                        impactLevel: tier === 'SILVER' ? 'LOW' : tier === 'GOLD' ? 'MEDIUM' : 'HIGH',
                    });
                }
            });
        }
    }

    const creatorSimWeekAbs = cursor == null
        ? (mode === 'week' ? abs : Math.max(0, abs - 1))
        : (mode === 'week' && cursor < abs ? abs : cursor);

    return {
        channel: {
            ...channel,
            creatorChannels: [...rows.values()],
            creatorSimWeekAbs,
        },
        news,
    };
};

export const creatorAudience = (channel: YoutubeChannel | undefined, id: string, fallback: number) => {
    const row = (channel?.creatorChannels || []).find(item => item.id === id);
    if (row) return row.subscribers;
    if (channel?.zeroStart) return 0;
    return fallback;
};
