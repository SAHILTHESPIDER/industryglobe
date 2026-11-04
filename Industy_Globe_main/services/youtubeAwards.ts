import {
    NewsItem, PlayButtonAward, PlayButtonTier, Player, YoutubeBrandDeal, YoutubeCeremony, YoutubeChannelKind,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';

/**
 * Real YouTube Creator Awards. A tier is recorded once per channel.
 * The first pass on an old save only writes the plaque. It does not pay the reward again.
 */

export const PLAY_BUTTONS: { tier: PlayButtonTier; subs: number; label: string; flag: string }[] = [
    { tier: 'SILVER', subs: 100_000, label: 'Silver', flag: 'subs_100000' },
    { tier: 'GOLD', subs: 1_000_000, label: 'Gold', flag: 'subs_1000000' },
    { tier: 'DIAMOND', subs: 10_000_000, label: 'Diamond', flag: 'subs_10000000' },
    { tier: 'RED_DIAMOND', subs: 100_000_000, label: 'Red Diamond', flag: 'subs_100000000' },
];

const REWARD: Record<PlayButtonTier, { fame: number; reputation: number; trust: number; mood: number; deal: number }> = {
    SILVER: { fame: 2, reputation: 1, trust: 2, mood: 3, deal: 0 },
    GOLD: { fame: 3, reputation: 2, trust: 3, mood: 4, deal: 4_000 },
    DIAMOND: { fame: 5, reputation: 3, trust: 4, mood: 4, deal: 18_000 },
    RED_DIAMOND: { fame: 6, reputation: 4, trust: 5, mood: 5, deal: 40_000 },
};

export const playButtonLabel = (tier: PlayButtonTier) => PLAY_BUTTONS.find(row => row.tier === tier)?.label || tier;

export const tiersReached = (subs: number): PlayButtonTier[] =>
    PLAY_BUTTONS.filter(row => subs >= row.subs).map(row => row.tier);

export const newTiers = (have: PlayButtonTier[] | undefined, subs: number): PlayButtonTier[] => {
    const owned = new Set(have || []);
    return tiersReached(subs).filter(tier => !owned.has(tier));
};

export const dismissCeremony = (player: Player): Player => ({
    ...player,
    youtube: {
        ...player.youtube,
        pendingCeremonies: (player.youtube.pendingCeremonies || []).slice(1),
    },
});

const dealFor = (player: Player, tier: PlayButtonTier, payout: number, name: string): YoutubeBrandDeal => ({
    id: `yt_award_deal_${tier}_${player.age}_${player.currentWeek}`,
    brandName: tier === 'GOLD' ? 'Play Button Partners' : tier === 'DIAMOND' ? 'Diamond Desk' : 'Hall of Fame Atelier',
    category: tier === 'RED_DIAMOND' ? 'LUXURY' : 'TECH',
    description: `${name} just received a ${playButtonLabel(tier)} Play Button. ${tier === 'GOLD' ? 'A mid-size brand' : 'A bigger brand'} wants a short integration while the plaque is still news.`,
    payout,
    requiredType: 'VLOG',
    energyCost: 12,
    bonusViews: Math.max(2_000, payout),
    penalty: Math.floor(payout * 0.25),
    expiresInWeeks: 6,
});

export interface AwardSettlement {
    player: Player;
    notes: string[];
}

/**
 * Records Creator Awards for the player's own channels.
 * Returns the same player reference when nothing changed.
 */
export const settlePlayButtons = (player: Player): AwardSettlement => {
    const channel = player.youtube;
    if (!channel) return { player, notes: [] };
    const silent = channel.awardsMigrated !== true;
    const weekAbs = getAbsoluteWeek(player.age, player.currentWeek);
    const notes: string[] = [];
    let playButtons = { ...(channel.playButtons || {}) };
    let pending = [...(channel.pendingCeremonies || [])];
    let news = player.news || [];
    let inbox = player.inbox || [];
    let stats = player.stats;
    let flags = player.flags || {};
    let deals = [...(channel.activeBrandDeals || [])];
    let trust = channel.audienceTrust ?? 55;
    let mood = channel.fanMood ?? 55;
    let changed = silent;

    const boards: { kind: YoutubeChannelKind; name: string; subs: number; live: boolean }[] = [
        {
            kind: 'personal',
            name: channel.looks?.personal?.name || player.name,
            subs: channel.subscribers || 0,
            live: true,
        },
        {
            kind: 'studio',
            name: channel.looks?.studio?.name || 'Studio',
            subs: channel.officialChannels?.studio?.subscribers || 0,
            live: !!channel.officialChannels?.studio,
        },
        {
            kind: 'empirePlus',
            name: channel.looks?.empirePlus?.name || 'Empire+',
            subs: channel.officialChannels?.empirePlus?.subscribers || 0,
            live: !!channel.officialChannels?.empirePlus,
        },
    ];

    boards.forEach(board => {
        if (!board.live) return;
        const owned = new Set((playButtons[board.kind] || []).map(item => item.tier));
        const legacy = new Set<string>(board.kind === 'personal' && Array.isArray(flags.youtubeMilestonesUnlocked) ? flags.youtubeMilestonesUnlocked : []);
        PLAY_BUTTONS.forEach(row => {
            if (board.subs < row.subs || owned.has(row.tier)) return;
            const award: PlayButtonAward = { tier: row.tier, subscribers: board.subs, weekAbs };
            playButtons = { ...playButtons, [board.kind]: [...(playButtons[board.kind] || []), award] };
            owned.add(row.tier);
            changed = true;
            const alreadyPaid = legacy.has(row.flag);
            if (silent || alreadyPaid) return;
            const reward = REWARD[row.tier];
            stats = {
                ...stats,
                fame: Math.min(100, (stats.fame || 0) + reward.fame),
                reputation: Math.min(100, (stats.reputation || 0) + reward.reputation),
            };
            trust = Math.min(100, trust + reward.trust);
            mood = Math.min(100, mood + reward.mood);
            const unlocked = new Set<string>(Array.isArray(flags.youtubeMilestonesUnlocked) ? flags.youtubeMilestonesUnlocked : []);
            if (board.kind === 'personal') unlocked.add(row.flag);
            flags = { ...flags, youtubeMilestonesUnlocked: [...unlocked] };
            if (row.tier === 'RED_DIAMOND' && board.kind === 'personal') flags = { ...flags, youtubeHallOfFame: true };
            const headline = `${board.name} earns a ${row.label} Play Button.`;
            notes.push(`Play Button: ${headline}`);
            news = [{
                id: `news_yt_award_${board.kind}_${row.tier}_${weekAbs}`,
                headline,
                subtext: reward.deal > 0 ? 'Brands are already calling.' : 'The plaque is on the shelf. The audience noticed.',
                category: 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: row.tier === 'SILVER' ? 'MEDIUM' : 'HIGH',
            }, ...news].slice(0, 80);
            inbox = [{
                id: `in_yt_award_${board.kind}_${row.tier}_${weekAbs}`,
                sender: 'YouTube Creator Awards',
                subject: `${row.label} Play Button`,
                text: `${headline}\n\nThe channel crossed ${row.subs.toLocaleString()} subscribers. The reward is small on purpose: a little fame, a little trust, and ${reward.deal > 0 ? 'a brand that wants a short integration' : 'a note in the trades'}.`,
                type: 'SYSTEM' as const,
                isRead: false,
                weekSent: player.currentWeek,
                expiresIn: 8,
            }, ...inbox].slice(0, 80);
            const ceremonyId = `yt_award_${board.kind}_${row.tier}`;
            if (!pending.some(item => item.id === ceremonyId)) {
                const ceremony: YoutubeCeremony = { id: ceremonyId, tier: row.tier, channelKind: board.kind, name: board.name, weekAbs };
                pending = [...pending, ceremony];
            }
            if (reward.deal > 0 && deals.length < 2 && !deals.some(deal => deal.id.startsWith(`yt_award_deal_${row.tier}`))) {
                deals = [...deals, dealFor(player, row.tier, reward.deal, board.name)];
            } else if (reward.deal > 0) {
                trust = Math.min(100, trust + 2);
                notes.push(`${board.name} has no open brand slot. The ${row.label} plaque still moved the room.`);
            }
        });
    });

    if (!changed) return { player, notes: [] };
    return {
        player: {
            ...player,
            stats,
            flags,
            news,
            inbox,
            youtube: {
                ...channel,
                playButtons,
                pendingCeremonies: pending,
                activeBrandDeals: deals,
                audienceTrust: trust,
                fanMood: mood,
                awardsMigrated: true,
            },
        },
        notes,
    };
};

export const awardHeadline = (name: string, tier: PlayButtonTier): NewsItem['impactLevel'] =>
    tier === 'SILVER' ? 'LOW' : tier === 'GOLD' ? 'MEDIUM' : 'HIGH';

export const describeAward = (name: string, tier: PlayButtonTier) =>
    `${name} received a ${playButtonLabel(tier)} Play Button.`;
