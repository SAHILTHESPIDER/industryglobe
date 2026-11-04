import { Player, YoutubeBrandDeal, YoutubeCollabOffer, YoutubeCreatorIdentity, YoutubeMerchTier, YoutubeUploadPlan, YoutubeVideo, YoutubeVideoType } from '../../../types';
import { spendPlayerEnergy } from '../../../services/premiumLogic';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { aiOffline } from '../../../src/services/aiContent';
import {
    activeStrikeCount, dropCost, dropEnergy, ensureCampaign, isMarketingType, registerStrike, strikeRisk, syncOfficialChannels, typeLabel,
} from '../../../services/youtubeMarketing';
import { findRivalChannel } from '../../../services/youtubeRivals';
import { liveCreators } from '../../../services/youtubeCreators';

export const UPLOAD_PLANS: Record<YoutubeUploadPlan, { label: string; viewBoost: number; qualityBoost: number; trust: number; mood: number; controversy: number }> = {
    SAFE: { label: 'Safe', viewBoost: 0, qualityBoost: 5, trust: 4, mood: 1, controversy: -2 },
    VIRAL_BAIT: { label: 'Viral Bait', viewBoost: 900, qualityBoost: -2, trust: -5, mood: 4, controversy: 10 },
    BTS: { label: 'Behind Scenes', viewBoost: 450, qualityBoost: 4, trust: 3, mood: 3, controversy: 0 },
    PROJECT_PROMO: { label: 'Project Promo', viewBoost: 650, qualityBoost: 2, trust: 0, mood: 2, controversy: 2 },
    SPONSOR_HEAVY: { label: 'Sponsor Heavy', viewBoost: 300, qualityBoost: -1, trust: -6, mood: -2, controversy: 5 },
};

export const PERSONAL_COSTS: Partial<Record<YoutubeVideoType, { cost: number; energy: number }>> = {
    VLOG: { cost: 0, energy: 15 }, SKIT: { cost: 50, energy: 25 }, Q_AND_A: { cost: 0, energy: 10 },
    TRAILER: { cost: 0, energy: 20 }, COVER: { cost: 20, energy: 20 }, STORYTIME: { cost: 0, energy: 15 },
    SHORT: { cost: 0, energy: 6 },
};

export const MERCH: Record<YoutubeMerchTier, { label: string; cost: number; energy: number; trustReq: number; margin: number; heat: number }> = {
    BASIC: { label: 'Basic', cost: 5000, energy: 14, trustReq: 35, margin: 0.28, heat: 1 },
    PREMIUM: { label: 'Premium', cost: 25000, energy: 22, trustReq: 50, margin: 0.42, heat: 4 },
    LUXURY: { label: 'Luxury', cost: 100000, energy: 34, trustReq: 68, margin: 0.62, heat: 8 },
};

const IDENT: Record<YoutubeCreatorIdentity, { label: string; trust: number; mood: number; heat: number; quality: number; views: number; member: number; merch: number; live: number }> = {
    ACTOR_VLOGGER: { label: 'Actor Vlogger', trust: 1, mood: 1, heat: -1, quality: 2, views: 1.02, member: 0.08, merch: 0, live: -0.04 },
    CHAOS_CREATOR: { label: 'Chaos Creator', trust: -1, mood: 2, heat: 3, quality: -1, views: 1.14, member: -0.03, merch: 0, live: 0.1 },
    PRESTIGE_FILMMAKER: { label: 'Prestige Filmmaker', trust: 2, mood: -1, heat: -2, quality: 5, views: 0.92, member: 0.02, merch: -0.03, live: -0.06 },
    LIFESTYLE_ICON: { label: 'Lifestyle Icon', trust: 1, mood: 2, heat: 0, quality: 1, views: 1.03, member: 0.12, merch: 0.18, live: -0.02 },
    CONTROVERSY_MAGNET: { label: 'Controversy Magnet', trust: -2, mood: 3, heat: 5, quality: -2, views: 1.2, member: -0.08, merch: -0.04, live: 0.16 },
};

export const identityTuning = (id?: YoutubeCreatorIdentity) => IDENT[id || 'ACTOR_VLOGGER'];

const log = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral' = 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...player.logs].slice(0, 50),
});

const xpost = (player: Player, content: string): Player => ({
    ...player,
    x: {
        ...player.x,
        feed: [{
            id: `x_yt_${Date.now()}`,
            authorId: 'creator_pulse',
            authorName: 'Creator Pulse',
            authorHandle: '@creatorpulse',
            authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=CreatorPulse',
            content,
            timestamp: Date.now(),
            likes: 120,
            retweets: 18,
            replies: 9,
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
        }, ...(player.x?.feed || [])].slice(0, 50),
    },
});

export const makeVideo = (player: Player, title: string, type: YoutubeVideoType, plan: YoutubeUploadPlan, extra: Partial<YoutubeVideo> = {}): YoutubeVideo => {
    const ident = identityTuning(player.youtube.creatorIdentity);
    const p = UPLOAD_PLANS[plan];
    const quality = Math.max(1, Math.min(100, ((player.stats.skills.improvisation || 0) + (player.stats.skills.charisma || 0)) / 2 + 20 + p.qualityBoost + ident.quality));
    const seeded = Math.floor(p.viewBoost * ident.views);
    return {
        id: `vid_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        title,
        type,
        thumbnailColor: 'poster-hero',
        views: seeded,
        likes: Math.floor(seeded * 0.05),
        earnings: 0,
        weekUploaded: player.currentWeek,
        yearUploaded: player.age,
        isPlayer: true,
        authorName: player.name,
        qualityScore: quality,
        uploadPlan: plan,
        controversyScore: Math.max(0, p.controversy + ident.heat),
        trustImpact: p.trust + ident.trust,
        weeklyHistory: seeded ? [seeded] : [],
        comments: [],
        isShort: type === 'SHORT',
        language: 'hi',
        country: 'IN',
        ...extra,
    };
};

export interface ActionResult { player: Player; error?: string; screen?: 'studio' | 'watch' | 'home' | 'hub' }

export const changeIdentity = (player: Player, next: YoutubeCreatorIdentity): ActionResult => {
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const left = Math.max(0, 12 - (abs - (player.youtube.lastIdentityChangeWeek || 0)));
    if (player.youtube.lastIdentityChangeWeek && left > 0 && next !== player.youtube.creatorIdentity) {
        return { player, error: `Creator identity can change again in ${left} weeks.` };
    }
    const ident = identityTuning(next);
    const channel = player.youtube;
    return {
        player: log({
            ...player,
            youtube: {
                ...channel,
                creatorIdentity: next,
                lastIdentityChangeWeek: abs,
                audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + ident.trust)),
                fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + ident.mood)),
                controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + ident.heat)),
            },
        }, `You repositioned the channel as ${ident.label}.`, ident.heat > 2 ? 'neutral' : 'positive'),
    };
};

export const enableMemberships = (player: Player): ActionResult => {
    const channel = player.youtube;
    if (!channel.isMonetized || channel.subscribers < 10000) return { player, error: 'Memberships unlock at 10K subscribers after monetization.' };
    const ident = identityTuning(channel.creatorIdentity);
    const starting = Math.max(25, Math.floor(channel.subscribers * 0.004 * (1 + ident.member)));
    return {
        player: log({
            ...player,
            youtube: { ...channel, membershipsActive: true, members: Math.max(channel.members || 0, starting), audienceTrust: Math.min(100, (channel.audienceTrust ?? 55) + 2) },
        }, `Memberships are live with ${starting.toLocaleString()} founding members.`, 'positive'),
    };
};

export const goLive = (player: Player, mode: 'standard' | 'guest' | 'surprise' | 'poll' = 'standard'): ActionResult => {
    const channel = player.youtube;
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    if (abs - (channel.lastLivestreamWeek || 0) < 1 && mode === 'standard') return { player, error: 'You already streamed this week.' };
    if (player.energy.current < 18) return { player, error: 'Not enough energy.' };
    if (!channel.isMonetized || channel.subscribers < 1000) return { player, error: 'Livestream donations unlock after monetization and 1K subscribers.' };
    const ident = identityTuning(channel.creatorIdentity);
    const trust = channel.audienceTrust ?? 55;
    const mood = channel.fanMood ?? 55;
    const heat = channel.controversy ?? 0;
    let liveViews = Math.floor(Math.max(1200, channel.subscribers * (0.08 + Math.random() * 0.14) * ident.views));
    if (mode === 'guest') liveViews = Math.floor(liveViews * 1.2);
    const donations = Math.floor(liveViews * (0.08 + mood / 700) * (1 + ident.member));
    const subs = Math.floor(liveViews / (trust >= 65 ? 95 : 130));
    const messy = Math.random() < Math.max(0.05, Math.min(0.62, (heat > 55 ? 0.32 : 0.12) + ident.live));
    let next: Player = {
        ...player,
        money: player.money + donations,
        youtube: {
            ...channel,
            subscribers: channel.subscribers + subs,
            totalChannelViews: (channel.totalChannelViews || 0) + liveViews,
            lifetimeEarnings: channel.lifetimeEarnings + donations,
            fanMood: Math.min(100, mood + (messy ? -3 : 5) + (mode === 'poll' ? 2 : 0) + ident.mood),
            audienceTrust: Math.max(0, Math.min(100, trust + (messy ? -5 : 2) + ident.trust)),
            controversy: Math.max(0, Math.min(100, heat + (messy ? 12 : -2) + ident.heat)),
            lastLivestreamWeek: abs,
            superChatLifetime: (channel.superChatLifetime || 0) + donations,
            peakLive: Math.max(channel.peakLive || 0, Math.floor(liveViews * 1.06)),
        },
    };
    if (mode === 'surprise') {
        const project = player.commitments?.find(item => item.projectDetails);
        if (project && next.youtube.marketing?.[project.id]) {
            const campaign = next.youtube.marketing[project.id];
            next = {
                ...next,
                youtube: {
                    ...next.youtube,
                    marketing: { ...next.youtube.marketing, [project.id]: { ...campaign, campaignHype: Math.min(100, campaign.campaignHype + 3) } },
                },
            };
        }
    }
    spendPlayerEnergy(next, 18);
    next = xpost(log(next, messy
        ? `Livestream got messy: +${liveViews.toLocaleString()} views, $${donations.toLocaleString()} donations.`
        : `Livestream: +${liveViews.toLocaleString()} views, +${subs.toLocaleString()} subs, $${donations.toLocaleString()} super chat.`, messy ? 'negative' : 'positive'), messy
        ? `${player.name}'s livestream got clipped instantly.`
        : `${player.name}'s livestream felt intimate and addictive.`);
    return { player: next };
};

export const dropMerch = (player: Player, tierKey: YoutubeMerchTier): ActionResult => {
    const tier = MERCH[tierKey];
    const channel = player.youtube;
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const trust = channel.audienceTrust ?? 55;
    const mood = channel.fanMood ?? 55;
    if (abs - (channel.lastMerchDropWeek || 0) < 6) return { player, error: 'Merch drops need a 6 week cooldown.' };
    if (trust < tier.trustReq) return { player, error: `Audience trust must be ${tier.trustReq}+.` };
    if (player.energy.current < tier.energy) return { player, error: 'Not enough energy.' };
    if (player.money < tier.cost) return { player, error: 'Not enough money.' };
    const ident = identityTuning(channel.creatorIdentity);
    const demand = Math.max(0.25, (mood / 100) + (trust / 180) + (channel.subscribers >= 100000 ? 0.25 : 0) - ((channel.controversy ?? 0) / 180) + ident.merch);
    const gross = Math.floor(channel.subscribers * tier.margin * demand * (0.7 + Math.random() * 0.65));
    const profit = gross - tier.cost;
    const flop = profit < 0;
    let next: Player = {
        ...player,
        money: player.money - tier.cost + gross,
        youtube: {
            ...channel,
            lifetimeEarnings: channel.lifetimeEarnings + Math.max(0, profit),
            fanMood: Math.max(0, Math.min(100, mood + (profit > tier.cost * 1.2 ? 6 : flop ? -5 : 2))),
            audienceTrust: Math.max(0, Math.min(100, trust + (flop ? -4 : 1))),
            controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + tier.heat + (flop ? 5 : 0))),
            lastMerchDropWeek: abs,
            lastMerchResult: flop ? `${tier.label} underperformed` : `${tier.label} turned a profit`,
        },
    };
    spendPlayerEnergy(next, tier.energy);
    next = log(next, `${tier.label} merch: gross $${gross.toLocaleString()}, profit $${profit.toLocaleString()}.`, flop ? 'negative' : 'positive');
    return { player: next };
};

export const personalCollab = (player: Player, creatorName: string, title: string): ActionResult => {
    if (player.energy.current < 16) return { player, error: 'Not enough energy.' };
    const video = makeVideo(player, title, 'Q_AND_A', 'BTS', {
        views: Math.floor(Math.max(4000, player.youtube.subscribers * 0.2 + 8000)),
        authorName: `${player.name} × ${creatorName}`,
    });
    video.likes = Math.floor(video.views * 0.06);
    video.comments = aiOffline.generateComments({ videoTitle: title, videoType: 'collab', author: creatorName, seed: title });
    let next: Player = {
        ...player,
        youtube: {
            ...player.youtube,
            subscribers: player.youtube.subscribers + Math.floor(video.views / 180),
            totalChannelViews: (player.youtube.totalChannelViews || 0) + video.views,
            videos: [video, ...player.youtube.videos],
        },
    };
    spendPlayerEnergy(next, 16);
    next = log(next, `Collab with ${creatorName} is on the channel.`, 'positive');
    return { player: next, screen: 'studio' };
};

export const publishUpload = (player: Player, input: {
    title: string;
    type: YoutubeVideoType;
    plan: YoutubeUploadPlan;
    projectId?: string;
    dubCount?: number;
    thumbnailScore?: number;
    thumbnailMediaId?: string;
    songId?: string;
    scheduledWeekAbs?: number;
}): ActionResult => {
    const title = input.title.trim();
    if (!title) return { player, error: 'Add a title.' };
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const channel = syncOfficialChannels(player, player.youtube);
    if ((channel.uploadFrozenUntilAbs || 0) > abs) return { player, error: 'Uploads are frozen by a copyright strike.' };
    if (isMarketingType(input.type) && !(input.type === 'SHORT' && !input.projectId)) {
        if (!input.projectId) return { player, error: 'Pick a project for this drop.' };
        const project = player.commitments.find(item => item.id === input.projectId);
        const budget = project?.projectDetails?.estimatedBudget || 0;
        const cost = dropCost(input.type, budget);
        const energy = dropEnergy(input.type);
        if (energy > 0 && player.energy.current < energy) return { player, error: 'Not enough energy.' };
        const house = player.businesses?.find(item => item.type === 'PRODUCTION_HOUSE' && item.isActive);
        const payerBalance = house ? (house.balance || 0) : player.money;
        const underfunded = cost > 0 && payerBalance < cost;
        const paid = underfunded ? 0 : cost;
        if (paid > 0 && house) {
            house.balance = Math.max(0, (house.balance || 0) - paid);
            house.studioState = house.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
            house.studioState.financeLedger = [
                { id: `yt_spend_${Date.now()}`, week: player.currentWeek, year: player.age, amount: -paid, type: 'PRODUCTION_SPEND' as const, label: `YouTube · ${typeLabel(input.type)}` },
                ...(house.studioState.financeLedger || []),
            ].slice(0, 80);
        }
        const campaign = ensureCampaign(channel, input.projectId);
        const repeats = campaign.drops.filter(drop => drop.type === input.type).length;
        const drop = {
            id: `drop_${Date.now()}_${repeats}`,
            type: input.type,
            scheduledWeekAbs: input.scheduledWeekAbs ?? abs,
            status: 'SCHEDULED' as const,
            title,
            thumbnailScore: input.thumbnailScore || 0.62,
            underfunded,
        };
        let next: Player = {
            ...player,
            money: house || underfunded ? player.money : player.money - paid,
            youtube: {
                ...channel,
                marketing: { ...(channel.marketing || {}), [input.projectId]: { ...campaign, drops: [...campaign.drops, drop] } },
            },
        };
        if (energy > 0) spendPlayerEnergy(next, energy);
        const note = underfunded
            ? `Scheduled ${typeLabel(input.type)} without the spend. Reach will be weaker: ${title}`
            : repeats
                ? `Scheduled another ${typeLabel(input.type)}. Repeats return less: ${title}`
                : `Scheduled ${typeLabel(input.type)}: ${title}`;
        next = log(next, note, underfunded || repeats ? 'neutral' : 'positive');
        return { player: next, screen: 'hub' };
    }
    const cost = PERSONAL_COSTS[input.type] || { cost: 0, energy: input.type === 'SHORT' ? 6 : 12 };
    if (player.energy.current < cost.energy) return { player, error: 'Not enough energy.' };
    if (player.money < cost.cost) return { player, error: 'Not enough money.' };
    const plan = UPLOAD_PLANS[input.plan];
    const video = makeVideo(player, title, input.type, input.plan, {
        projectId: input.projectId,
        dubCount: input.dubCount,
        songId: input.songId,
        thumbnailMediaId: input.thumbnailMediaId,
        ctr: 0.04 + 0.06 * (input.thumbnailScore || 0.5),
        comments: aiOffline.generateComments({
            videoTitle: title,
            videoType: typeLabel(input.type),
            author: player.name,
            seed: title,
        }),
    });
    let nextChannel = {
        ...channel,
        videos: [video, ...channel.videos],
        totalChannelViews: (channel.totalChannelViews || 0) + video.views,
        audienceTrust: Math.max(0, Math.min(100, (channel.audienceTrust ?? 55) + plan.trust)),
        fanMood: Math.max(0, Math.min(100, (channel.fanMood ?? 55) + plan.mood)),
        controversy: Math.max(0, Math.min(100, (channel.controversy ?? 0) + plan.controversy)),
    };
    let note = `Uploaded ${plan.label}: ${title}`;
    const risky = input.type === 'COVER' || input.plan === 'VIRAL_BAIT';
    if (risky && Math.random() < strikeRisk(nextChannel.controversy || 0)) {
        const struck = registerStrike(nextChannel, abs, input.type === 'COVER' ? 'Unlicensed cover' : 'Viral bait footage');
        nextChannel = struck.channel;
        note = struck.note;
    }
    let next: Player = { ...player, money: player.money - cost.cost, youtube: nextChannel };
    spendPlayerEnergy(next, cost.energy);
    next = log(next, note, risky ? 'neutral' : 'positive');
    return { player: next, screen: 'studio' };
};

export const completeCollab = (player: Player, collab: YoutubeCollabOffer): ActionResult => {
    if (player.energy.current < collab.energyCost) return { player, error: 'Not enough energy.' };
    const video = makeVideo(player, collab.conceptTitle, collab.requiredType, 'BTS', { views: Math.floor(collab.bonusViews * 0.9) });
    video.likes = Math.floor(video.views * 0.06);
    let next: Player = {
        ...player,
        stats: { ...player.stats, fame: Math.min(100, player.stats.fame + 1), reputation: Math.min(100, player.stats.reputation + 1) },
        youtube: {
            ...player.youtube,
            subscribers: player.youtube.subscribers + collab.bonusSubscribers,
            totalChannelViews: (player.youtube.totalChannelViews || 0) + video.views,
            videos: [video, ...player.youtube.videos],
            activeCollabs: player.youtube.activeCollabs.filter(item => item.id !== collab.id),
        },
    };
    spendPlayerEnergy(next, collab.energyCost);
    const social = aiOffline.xPosts({ speaker: player.name, subject: collab.creatorName, event: 'just dropped a collab', seed: collab.id })[0];
    next = xpost(log(next, `Collab with ${collab.creatorName} is up.`, 'positive'), social);
    return { player: next };
};

export const completeBrand = (player: Player, deal: YoutubeBrandDeal): ActionResult => {
    if (player.energy.current < deal.energyCost) return { player, error: 'Not enough energy.' };
    const video = makeVideo(player, `${deal.brandName} x ${player.name}`, deal.requiredType, 'SPONSOR_HEAVY', { views: Math.floor(deal.bonusViews * 0.9) });
    let next: Player = {
        ...player,
        money: player.money + deal.payout,
        youtube: {
            ...player.youtube,
            lifetimeEarnings: player.youtube.lifetimeEarnings + deal.payout,
            totalChannelViews: (player.youtube.totalChannelViews || 0) + video.views,
            videos: [video, ...player.youtube.videos],
            activeBrandDeals: player.youtube.activeBrandDeals.filter(item => item.id !== deal.id),
        },
    };
    spendPlayerEnergy(next, deal.energyCost);
    next = log(next, `${deal.brandName} integration paid $${deal.payout.toLocaleString()}.`, 'positive');
    return { player: next };
};

export const resolveLeak = (player: Player, leakId: string, choice: 'TAKEDOWN' | 'CLAIM' | 'IGNORE'): ActionResult => {
    const channel = player.youtube;
    const leak = (channel.leaks || []).find(item => item.id === leakId);
    if (!leak || leak.resolved) return { player, error: 'That leak is already handled.' };
    let next: Player = {
        ...player,
        youtube: {
            ...channel,
            leaks: (channel.leaks || []).map(item => item.id === leakId ? { ...item, resolved: choice } : item),
        },
    };
    if (choice === 'TAKEDOWN') {
        const streisand = Math.random() < 0.15;
        next = {
            ...next,
            youtube: {
                ...next.youtube,
                controversy: Math.max(0, (next.youtube.controversy || 0) - 2),
                audienceTrust: Math.max(0, Math.min(100, (next.youtube.audienceTrust ?? 55) + (streisand ? -2 : 1))),
                totalChannelViews: next.youtube.totalChannelViews + (streisand ? Math.floor(leak.views * 0.2) : 0),
            },
        };
        next = log(next, streisand ? 'The takedown drew more eyes than the leak.' : 'Takedown filed. Heat cooled.', streisand ? 'neutral' : 'positive');
    } else if (choice === 'CLAIM') {
        const money = Math.floor((leak.views / 1000) * 2);
        next = { ...next, money: next.money + money, youtube: { ...next.youtube, lifetimeEarnings: next.youtube.lifetimeEarnings + money } };
        next = log(next, `Claimed $${money.toLocaleString()} from the leak. It is still spreading.`, 'neutral');
    } else {
        next = log(next, 'You let the leak ride.', 'neutral');
    }
    return { player: next };
};

export const raidStreamer = (player: Player, creatorId: string): ActionResult => {
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const live = liveCreators(abs, 40).find(item => item.id === creatorId);
    if (!live) return { player, error: 'That streamer is not live this week.' };
    const project = player.commitments.find(item => item.projectDetails);
    const title = project?.projectDetails?.title || player.name;
    const views = Math.floor(live.concurrent * (8 + Math.random() * 6));
    const video = makeVideo(player, `${live.name} raids ${title}`, 'REACTION_COLLAB', 'PROJECT_PROMO', {
        views,
        likes: Math.floor(views * 0.07),
        authorName: live.name,
        isPlayer: false,
        projectId: project?.id,
    });
    let next: Player = {
        ...player,
        youtube: {
            ...player.youtube,
            videos: [video, ...player.youtube.videos],
            totalChannelViews: (player.youtube.totalChannelViews || 0) + views,
            subscribers: player.youtube.subscribers + Math.floor(views / 400),
        },
    };
    if (project && next.youtube.marketing?.[project.id]) {
        const campaign = next.youtube.marketing[project.id];
        next = {
            ...next,
            youtube: {
                ...next.youtube,
                marketing: { ...next.youtube.marketing, [project.id]: { ...campaign, campaignHype: Math.min(100, (campaign.campaignHype || 50) + 2) } },
            },
        };
    }
    next = log(next, `${live.name} raided the trailer. +${views.toLocaleString()} views.`, 'positive');
    return { player: next };
};

export const toggleSubscription = (player: Player, channelId: string): ActionResult => {
    const channel = player.youtube;
    const house = findRivalChannel(channel, channelId);
    if (!house) return { player, error: 'That channel is not on YouTube yet.' };
    const subs = new Set(channel.subscriptions || []);
    const on = subs.has(channelId);
    if (on) subs.delete(channelId);
    else subs.add(channelId);
    const rivalChannels = (channel.rivalChannels || []).map(item => item.id === channelId
        ? { ...item, subscribers: Math.max(0, item.subscribers + (on ? -1 : 1)) }
        : item);
    return {
        player: log({
            ...player,
            youtube: { ...channel, subscriptions: [...subs], rivalChannels },
        }, on ? `Unsubscribed from ${house.name}.` : `Subscribed to ${house.name}.`, 'neutral'),
    };
};

export const setChannel = (player: Player, activeChannel: Player['youtube']['activeChannel']): Player => ({
    ...player,
    youtube: { ...player.youtube, activeChannel },
});

export const toggleSave = (player: Player, videoId: string): Player => {
    const saved = new Set(player.youtube.savedVideoIds || []);
    if (saved.has(videoId)) saved.delete(videoId);
    else saved.add(videoId);
    return { ...player, youtube: { ...player.youtube, savedVideoIds: [...saved] } };
};

export const reactToVideo = (player: Player, videoId: string, reaction: 'LIKE' | 'DISLIKE'): Player => {
    const current = { ...(player.flags?.youtubeVideoReactions || {}) } as Record<string, string>;
    if (current[videoId] === reaction) delete current[videoId];
    else current[videoId] = reaction;
    return { ...player, flags: { ...player.flags, youtubeVideoReactions: current } };
};

export const strikeCount = (player: Player) => activeStrikeCount(player.youtube, getAbsoluteWeek(player.age, player.currentWeek));
