import {
    Player, YoutubeBrandDeal, YoutubeChannel, YoutubeChannelKind, YoutubeCollabOffer, YoutubeDaypart,
    YoutubePostTone, YoutubeTrend, YoutubeVideo, YoutubeVideoType,
} from '../../types';
import { aiOffline } from '../../src/services/aiContent';
import { getAbsoluteWeek } from '../legacyLogic';
import { hashString, PUBLIC_CREATORS } from '../youtubeCreators';
import {
    AD_BUDGET_GUARD, AD_BUDGET_MIN, clamp, COLLAB_FIT_BAD, COLLAB_HEAT_BAD, PREMIERE_HYPE_PER_POINT,
    SPONSOR_FATIGUE_STEP,
} from './constants';
import {
    adDollars, blendedCpm, ensureYoutubePartner, keepPromotions, quotePromotion, recentSponsorCount, scaleBrandPayout, sponsoredViewMultiplier,
} from './economy';
import { activeKind, chargeYoutubeWallet, creditYoutubeWallet } from './wallet';

export interface CollabTarget {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    followers: number;
    country: string;
    niche: string;
    heat: number;
    kind: 'CREATOR' | 'STUDIO';
    rivalChannelId?: string;
}

const IDENTITY_HEAT: Record<string, number> = {
    ACTOR_VLOGGER: 24,
    CHAOS_CREATOR: 68,
    PRESTIGE_FILMMAKER: 12,
    LIFESTYLE_ICON: 22,
    CONTROVERSY_MAGNET: 80,
};

const NICHE_HEAT: Record<string, number> = {
    Roast: 74, Comedy: 30, Sketch: 32, Vlog: 18, News: 50, Tech: 12, Podcast: 24,
    Lifestyle: 16, Fashion: 20, Commentary: 58, Motivation: 14, Education: 10, Food: 8, Travel: 14,
};

export const partnerHeat = (niche: string, personality?: string, backlash = 0): number => {
    if (personality === 'PRESTIGE' || personality === 'MYSTERY') return clamp(18 + backlash * 0.3, 0, 100);
    if (personality === 'SPAMMY') return clamp(48 + backlash * 0.4, 0, 100);
    if (personality === 'AGGRESSIVE') return clamp(36 + backlash * 0.35, 0, 100);
    return clamp((NICHE_HEAT[niche] ?? 26) + backlash * 0.2, 0, 100);
};

export const collabFit = (player: Player, target: CollabTarget): number => {
    const identity = IDENTITY_HEAT[player.youtube?.creatorIdentity || 'ACTOR_VLOGGER'] ?? 24;
    let fit = 76 - Math.min(34, Math.abs(identity - target.heat) * 0.5);
    const home = player.youtube?.videos?.[0]?.country || 'IN';
    if (target.country && (target.country === home || target.country === 'IN' && home === 'IN')) fit += 6;
    else fit -= 6;
    if ((target.heat >= 60 && identity <= 20) || (identity >= 70 && target.heat <= 20)) fit -= 18;
    if (target.kind === 'STUDIO' && target.heat >= 55 && identity >= 65) fit -= 8;
    return Math.round(clamp(fit, 5, 98));
};

const crossoverViews = (followers: number, fit: number, quality: number): number => {
    const reach = Math.pow(Math.max(1000, followers), 0.62) * (8 + fit / 8);
    const qualityFactor = 0.72 + clamp(quality, 1, 100) / 280;
    const bad = fit < COLLAB_FIT_BAD ? 0.55 : 1;
    return Math.max(400, Math.floor(reach * qualityFactor * bad));
};

export const collabBoard = (player: Player): CollabTarget[] => {
    const creators = PUBLIC_CREATORS.slice(0, 8).map(creator => ({
        id: creator.id,
        name: creator.name,
        handle: creator.handle,
        avatar: creator.avatar,
        followers: creator.followers,
        country: creator.country,
        niche: creator.niche,
        heat: partnerHeat(creator.niche),
        kind: 'CREATOR' as const,
    }));
    const houses = (player.youtube?.rivalChannels || []).slice(0, 6).map(house => ({
        id: house.id,
        name: house.name,
        handle: house.handle,
        avatar: '',
        followers: house.subscribers,
        country: house.country,
        niche: house.kind,
        heat: partnerHeat(house.kind, house.personality, house.backlash),
        kind: 'STUDIO' as const,
        rivalChannelId: house.id,
    }));
    return [...creators, ...houses]
        .map(target => target)
        .sort((a, b) => collabFit(player, b) - collabFit(player, a));
};

const placeOn = (channel: YoutubeChannel, video: YoutubeVideo, kind: YoutubeChannelKind, subs: number): YoutubeChannel => {
    if (kind === 'studio' && channel.officialChannels?.studio) {
        const board = channel.officialChannels.studio;
        return {
            ...channel,
            officialChannels: {
                ...channel.officialChannels,
                studio: {
                    ...board,
                    videos: [video, ...board.videos].slice(0, 60),
                    totalViews: (board.totalViews || 0) + video.views,
                    lifetimeEarnings: (board.lifetimeEarnings || 0) + (video.earnings || 0),
                    subscribers: Math.max(0, (board.subscribers || 0) + subs),
                },
            },
        };
    }
    if (kind === 'empirePlus' && channel.officialChannels?.empirePlus) {
        const board = channel.officialChannels.empirePlus;
        return {
            ...channel,
            officialChannels: {
                ...channel.officialChannels,
                empirePlus: {
                    ...board,
                    videos: [video, ...board.videos].slice(0, 60),
                    totalViews: (board.totalViews || 0) + video.views,
                    lifetimeEarnings: (board.lifetimeEarnings || 0) + (video.earnings || 0),
                    subscribers: Math.max(0, (board.subscribers || 0) + subs),
                },
            },
        };
    }
    return {
        ...channel,
        videos: [video, ...channel.videos],
        totalChannelViews: (channel.totalChannelViews || 0) + video.views,
        subscribers: Math.max(0, (channel.subscribers || 0) + subs),
    };
};

const addTrend = (channel: YoutubeChannel, trend: YoutubeTrend): YoutubeChannel => {
    if (!channel.partner) return channel;
    const trends = [trend, ...(channel.partner.trends || [])].slice(0, 8);
    return { ...channel, partner: { ...channel.partner, trends } };
};

const prepared = (player: Player): Player => ({ ...player, youtube: ensureYoutubePartner(player.youtube) });

export interface PlayNote { player: Player; note: string; tone: 'positive' | 'negative' | 'neutral' }

export const filmCollab = (playerIn: Player, target: CollabTarget, concept: { title: string; type: YoutubeVideoType; offerId?: string; promisedViews?: number }): PlayNote => {
    const player = prepared(playerIn);
    const channel = player.youtube;
    const kind = activeKind(player);
    const fit = collabFit(player, target);
    const bad = fit < COLLAB_FIT_BAD || target.heat >= COLLAB_HEAT_BAD;
    const quality = Math.round(clamp(50 + (player.stats?.skills?.charisma || 40) / 5 + (bad ? -8 : 6), 20, 96));
    const crossed = crossoverViews(target.followers, fit, quality);
    const promised = Math.floor(Math.max(0, concept.promisedViews || 0) * (bad ? 0.55 : 1));
    const views = Math.max(crossed, promised);
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const earned = adDollars(channel, { id: 'tmp', title: concept.title, type: concept.type, thumbnailColor: '', views, likes: 0, earnings: 0, weekUploaded: player.currentWeek, isPlayer: true, authorName: player.name, qualityScore: quality, weeklyHistory: [], comments: [], signals: { format: 'LONG', genreKey: concept.type === 'SKIT' ? 'SKIT' : 'VLOG' } }, views, kind, abs);
    const subsIn = Math.max(0, Math.floor(views / (fit >= 70 ? 140 : 240)) - (bad ? Math.floor(subsOfKind(channel, kind) * 0.008) : 0));
    const backlash = bad ? Math.round(8 + Math.max(0, COLLAB_FIT_BAD - fit) * 0.45 + Math.max(0, target.heat - 50) * 0.16) : 0;
    const daypart = channel.partner?.preferredDaypart || 'EVENING';
    const video: YoutubeVideo = {
        id: `collab_${abs}_${hashString(target.id + concept.title) % 99999}`,
        title: concept.title,
        type: concept.type,
        thumbnailColor: bad ? 'poster-interview' : 'poster-hero',
        views,
        likes: Math.floor(views * (bad ? 0.03 : 0.06)),
        earnings: earned,
        weekUploaded: player.currentWeek,
        yearUploaded: player.age,
        isPlayer: true,
        authorName: `${player.name} × ${target.name}`,
        qualityScore: quality,
        weeklyHistory: [views],
        comments: aiOffline.generateComments({
            videoTitle: concept.title,
            videoType: 'collab',
            author: target.name,
            sentiment: bad ? 'negative' : 'positive',
            seed: `${target.id}:${concept.title}`,
            count: 4,
        }),
        controversyScore: backlash,
        channelKind: kind,
        ctr: bad ? 0.045 : 0.07,
        signals: {
            format: 'LONG',
            genreKey: concept.type === 'SKIT' ? 'SKIT' : 'VLOG',
            collabWith: target.name,
            collabFit: fit,
            partnerControversy: target.heat,
            daypart,
            uploadSlot: player.currentWeek % 7,
            trackedViews: 0,
            trackedEarnings: 0,
        },
    };
    let nextChannel = placeOn(channel, video, kind, subsIn);
    const outgoing = Math.floor((subsOfKind(channel, kind)) * (0.02 + fit / 800));
    if (target.rivalChannelId) {
        nextChannel = {
            ...nextChannel,
            rivalChannels: (nextChannel.rivalChannels || []).map(house => house.id === target.rivalChannelId ? {
                ...house,
                subscribers: house.subscribers + Math.max(1, outgoing),
                backlash: clamp(house.backlash + (bad ? 7 : 0), 0, 100),
            } : house),
        };
    }
    nextChannel = {
        ...nextChannel,
        audienceTrust: clamp((nextChannel.audienceTrust ?? 55) - backlash * 0.3 + (bad ? 0 : 1), 0, 100),
        fanMood: clamp((nextChannel.fanMood ?? 55) + (bad ? -6 : 3), 0, 100),
        controversy: clamp((nextChannel.controversy ?? 0) + backlash * 0.5, 0, 100),
        lifetimeEarnings: (nextChannel.lifetimeEarnings || 0) + (kind === 'personal' ? earned : 0),
        activeCollabs: (nextChannel.activeCollabs || []).filter(item => item.id !== concept.offerId),
    };
    if (bad) {
        nextChannel = addTrend(nextChannel, {
            id: `trend_collab_${video.id}`,
            title: `${target.name} collab is getting dragged`,
            detail: fit < COLLAB_FIT_BAD ? 'The audiences do not overlap. Comments turned on the pairing.' : 'The partner is too hot. Advertisers and fans both noticed.',
            heat: backlash,
            weeksLeft: 3,
            kind: 'COLLAB',
        });
    }
    let next: Player = { ...player, youtube: nextChannel };
    if (earned > 0) {
        const paid = creditYoutubeWallet(next, kind, earned, `YouTube collab ads · ${target.name}`);
        next = paid.player;
    }
    const note = bad
        ? `Collab with ${target.name} crossed audiences and backfired (fit ${fit}).`
        : `Collab with ${target.name} crossed both audiences (fit ${fit}).`;
    return { player: next, note, tone: bad ? 'negative' : 'positive' };
};

/** Same order as the weekly delivery: a video on the personal list is billed there. */
const homeOf = (channel: YoutubeChannel, id: string): YoutubeChannelKind => {
    if ((channel.videos || []).some(video => video.id === id)) return 'personal';
    if ((channel.officialChannels?.studio?.videos || []).some(video => video.id === id)) return 'studio';
    return 'empirePlus';
};

const subsOfKind = (channel: YoutubeChannel, kind: YoutubeChannelKind) => {
    if (kind === 'studio') return channel.officialChannels?.studio?.subscribers || 0;
    if (kind === 'empirePlus') return channel.officialChannels?.empirePlus?.subscribers || 0;
    return channel.subscribers || 0;
};

export const filmCollabFromOffer = (player: Player, offer: YoutubeCollabOffer): PlayNote => {
    const listed = collabBoard(player).find(item => item.id === offer.creatorId || item.name === offer.creatorName);
    const target: CollabTarget = listed || {
        id: offer.creatorId || offer.creatorName,
        name: offer.creatorName,
        handle: offer.creatorHandle,
        avatar: offer.creatorAvatar,
        followers: offer.partnerFollowers || Math.max(8000, offer.bonusSubscribers * 80),
        country: offer.country || 'IN',
        niche: 'Vlog',
        heat: offer.partnerControversy ?? 30,
        kind: offer.partnerKind || 'CREATOR',
        rivalChannelId: offer.rivalChannelId,
    };
    const filmed = filmCollab(player, target, {
        title: offer.conceptTitle,
        type: offer.requiredType,
        offerId: offer.id,
        promisedViews: offer.bonusViews,
    });
    return filmed;
};

export const deliverSponsorship = (playerIn: Player, deal: YoutubeBrandDeal): PlayNote => {
    const player = prepared(playerIn);
    const channel = player.youtube;
    const kind = deal.wallet || activeKind(player);
    const partner = channel.partner;
    const recent = recentSponsorCount(channel) + 1;
    const fatigue = partner?.sponsorFatigue || 0;
    const mult = sponsoredViewMultiplier(fatigue + SPONSOR_FATIGUE_STEP, recent);
    const views = Math.max(200, Math.floor(deal.bonusViews * 0.9 * mult));
    const daypart = partner?.preferredDaypart || 'EVENING';
    const video: YoutubeVideo = {
        id: `brand_${deal.id}`,
        title: `${deal.brandName} × ${player.name}`,
        type: deal.requiredType,
        thumbnailColor: 'poster-bts',
        views,
        likes: Math.floor(views * 0.04),
        earnings: 0,
        weekUploaded: player.currentWeek,
        yearUploaded: player.age,
        isPlayer: true,
        authorName: player.name,
        qualityScore: Math.max(30, 60 - Math.round((100 - mult * 100) / 8)),
        uploadPlan: 'SPONSOR_HEAVY',
        weeklyHistory: [views],
        comments: aiOffline.generateComments({
            videoTitle: deal.brandName,
            videoType: 'sponsor',
            author: player.name,
            sentiment: mult < 0.7 ? 'negative' : 'mixed',
            seed: deal.id,
            count: 3,
        }),
        channelKind: kind,
        signals: {
            format: deal.requiredType === 'SHORT' ? 'SHORT' : 'LONG',
            sponsored: true,
            daypart,
            uploadSlot: player.currentWeek % 7,
            trackedViews: 0,
            trackedEarnings: 0,
            genreKey: 'LIFESTYLE',
        },
    };
    let nextChannel = placeOn(channel, video, kind, Math.floor(views / 260));
    const nextFatigue = clamp((nextChannel.partner?.sponsorFatigue || 0) + SPONSOR_FATIGUE_STEP, 0, 100);
    const tired = recent >= 3;
    nextChannel = {
        ...nextChannel,
        activeBrandDeals: (nextChannel.activeBrandDeals || []).filter(item => item.id !== deal.id),
        fanMood: clamp((nextChannel.fanMood ?? 55) - (tired ? 5 : 1), 0, 100),
        audienceTrust: clamp((nextChannel.audienceTrust ?? 55) - (tired ? 4 : 1), 0, 100),
        controversy: clamp((nextChannel.controversy ?? 0) + (tired ? 3 : 0), 0, 100),
        partner: nextChannel.partner ? {
            ...nextChannel.partner,
            sponsorFatigue: nextFatigue,
            sponsorThisWeek: (nextChannel.partner.sponsorThisWeek || 0) + 1,
        } : nextChannel.partner,
    };
    if (tired) {
        nextChannel = addTrend({ ...player, youtube: nextChannel }.youtube, {
            id: `trend_sponsor_${deal.id}`,
            title: 'Sponsor fatigue is showing',
            detail: `${deal.brandName} landed, and the comments are calling the channel a billboard.`,
            heat: nextFatigue,
            weeksLeft: 2,
            kind: 'SPONSOR',
        });
    }
    let next: Player = { ...player, youtube: nextChannel };
    const paid = creditYoutubeWallet(next, kind, deal.payout, `${deal.brandName} integration`);
    next = paid.player;
    const note = tired
        ? `${deal.brandName} paid $${deal.payout.toLocaleString()} into the ${kind === 'personal' ? 'personal' : kind === 'studio' ? 'studio' : 'Empire+'} wallet. The audience is tired of sponsors.`
        : `${deal.brandName} paid $${deal.payout.toLocaleString()}.`;
    return { player: next, note, tone: tired ? 'neutral' : 'positive' };
};

export const chatScore = (player: Player, quality: number, seed: string): number => {
    const mood = player.youtube?.fanMood ?? 55;
    const heat = player.youtube?.controversy ?? 0;
    const roll = (hashString(seed) % 1000) / 1000;
    return Math.round(clamp(32 + mood * 0.28 + quality * 0.22 + (roll - 0.5) * 8 - heat * 0.2, 5, 97));
};

export const hypeFromChat = (chat: number) => (chat - 50) * PREMIERE_HYPE_PER_POINT;

export const runPremiere = (playerIn: Player, projectId: string, mode: 'PREMIERE' | 'LIVE'): PlayNote & { error?: string } => {
    const player = prepared(playerIn);
    const project = (player.commitments || []).find(item => item.id === projectId && item.projectDetails);
    if (!project?.projectDetails) return { player, note: '', tone: 'neutral', error: 'Pick a project to premiere.' };
    const title = project.projectDetails.title || project.name;
    const kind = activeKind(player);
    const quality = Math.round(clamp(project.projectDetails.hiddenStats?.qualityScore ?? 60, 20, 98));
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const chat = chatScore(player, quality, `${projectId}:${abs}:${mode}`);
    const lift = hypeFromChat(chat);
    const subs = subsOfKind(player.youtube, kind);
    const views = Math.max(800, Math.floor(subs * (mode === 'LIVE' ? 0.18 : 0.1) * (0.7 + chat / 120) + 1500));
    const type = mode === 'LIVE' ? 'PREMIERE_LIVE' : 'STREAM_PREMIERE';
    const earned = adDollars(player.youtube, {
        id: 'live', title, type, thumbnailColor: '', views, likes: 0, earnings: 0, weekUploaded: player.currentWeek,
        isPlayer: true, authorName: player.name, qualityScore: quality, weeklyHistory: [], comments: [],
        signals: { format: mode === 'LIVE' ? 'LIVE' : 'PREMIERE' },
    }, views, kind, abs);
    const video: YoutubeVideo = {
        id: `prem_${projectId}_${abs}_${mode}`,
        title: mode === 'LIVE' ? `${title} live launch` : `${title} premiere`,
        type,
        thumbnailColor: 'poster-live',
        views,
        likes: Math.floor(views * (chat / 1400)),
        earnings: earned,
        weekUploaded: player.currentWeek,
        yearUploaded: player.age,
        isPlayer: true,
        authorName: player.name,
        qualityScore: quality,
        weeklyHistory: [views],
        comments: aiOffline.generateComments({
            videoTitle: title,
            videoType: mode === 'LIVE' ? 'livestream' : 'premiere',
            author: player.name,
            project: title,
            sentiment: chat >= 60 ? 'positive' : chat < 40 ? 'negative' : 'mixed',
            seed: `${projectId}:${mode}`,
            count: 5,
        }),
        projectId,
        channelKind: kind,
        hype: clamp(50 + lift, 0, 100),
        ctr: 0.05 + chat / 2000,
        signals: {
            format: mode === 'LIVE' ? 'LIVE' : 'PREMIERE',
            liveChatHype: chat,
            genreKey: project.projectDetails.genre || 'TRAILER',
            durationMin: mode === 'LIVE' ? 48 : 6,
            daypart: player.youtube.partner?.preferredDaypart || 'EVENING',
            uploadSlot: player.currentWeek % 7,
            trackedViews: 0,
            trackedEarnings: 0,
        },
    };
    const campaign = player.youtube.marketing?.[projectId] || { drops: [], campaignHype: 50, lastDropWeekAbs: 0, songs: [], songStreams: 0 };
    const campaignHype = clamp((campaign.campaignHype || 50) + lift, 0, 100);
    let nextChannel = placeOn(player.youtube, video, kind, Math.floor(views / (chat >= 60 ? 160 : 280)));
    nextChannel = {
        ...nextChannel,
        peakLive: Math.max(nextChannel.peakLive || 0, Math.floor(views / 18)),
        lastLivestreamWeek: mode === 'LIVE' ? abs : nextChannel.lastLivestreamWeek,
        marketing: { ...(nextChannel.marketing || {}), [projectId]: { ...campaign, campaignHype, lastDropWeekAbs: abs } },
        partner: nextChannel.partner ? { ...nextChannel.partner, liveBoost: { ...nextChannel.partner.liveBoost, [projectId]: chat } } : nextChannel.partner,
        lifetimeEarnings: (nextChannel.lifetimeEarnings || 0) + (kind === 'personal' ? earned : 0),
    };
    if (chat >= 82 || chat <= 28) {
        nextChannel = addTrend(nextChannel, {
            id: `trend_live_${video.id}`,
            title: chat >= 82 ? `${title} premiere chat is on fire` : `${title} premiere chat turned`,
            detail: chat >= 82 ? 'The room showed up. Opening heat moved.' : 'Dead chat. The opening lost heat.',
            heat: Math.abs(lift),
            weeksLeft: 2,
            kind: 'PREMIERE',
        });
    }
    const commitments = (player.commitments || []).map(item => {
        if (item.id !== projectId || !item.projectDetails?.hiddenStats) return item;
        return {
            ...item,
            projectDetails: {
                ...item.projectDetails,
                hiddenStats: { ...item.projectDetails.hiddenStats, ytCampaignHype: campaignHype },
            },
        };
    });
    let next: Player = { ...player, commitments, youtube: nextChannel };
    if (earned > 0) next = creditYoutubeWallet(next, kind, earned, `YouTube ${mode === 'LIVE' ? 'live' : 'premiere'} ads`).player;
    const note = `Live chat scored ${chat}. Campaign hype ${lift >= 0 ? '+' : ''}${lift.toFixed(1)} for ${title}.`;
    return { player: next, note, tone: lift >= 0 ? 'positive' : 'negative' };
};

export const postCommunity = (playerIn: Player, text: string, tone: YoutubePostTone): PlayNote & { error?: string } => {
    const player = prepared(playerIn);
    const body = text.trim();
    if (!body) return { player, note: '', tone: 'neutral', error: 'Write something first.' };
    const channel = player.youtube;
    const sameWeek = (channel.partner?.posts || []).filter(post => post.week === player.currentWeek && post.year === player.age).length;
    const spam = sameWeek >= 2;
    const base = tone === 'WARM' ? { mood: 4, trust: 1, heat: 0 }
        : tone === 'HYPE' ? { mood: 5, trust: 0, heat: 2 }
            : tone === 'APOLOGY' ? { mood: 2, trust: 6, heat: -8 }
                : { mood: -4, trust: -6, heat: 8 };
    const moodDelta = base.mood - (spam ? 5 : 0);
    const reach = Math.floor(Math.max(40, (channel.subscribers || 0) * (tone === 'CALLOUT' || spam ? 0.35 : 0.18)));
    const id = `post_${player.currentWeek}_${hashString(body) % 99999}`;
    const post = {
        id,
        text: body.slice(0, 280),
        tone,
        week: player.currentWeek,
        year: player.age,
        reach,
        moodDelta,
        comments: aiOffline.generateComments({
            videoTitle: body.slice(0, 80),
            videoType: 'community',
            author: player.name,
            sentiment: tone === 'CALLOUT' || spam ? 'negative' : tone === 'APOLOGY' ? 'mixed' : 'positive',
            seed: id,
            count: 3,
        }),
    };
    let nextChannel: YoutubeChannel = {
        ...channel,
        fanMood: clamp((channel.fanMood ?? 55) + moodDelta, 0, 100),
        audienceTrust: clamp((channel.audienceTrust ?? 55) + base.trust - (spam ? 2 : 0), 0, 100),
        controversy: clamp((channel.controversy ?? 0) + base.heat + (spam ? 4 : 0), 0, 100),
        partner: channel.partner ? { ...channel.partner, posts: [post, ...channel.partner.posts].slice(0, 20) } : channel.partner,
    };
    if (spam || tone === 'CALLOUT') {
        nextChannel = addTrend(nextChannel, {
            id: `trend_post_${id}`,
            title: spam ? 'The community tab is overposting' : 'A community post is trending',
            detail: spam ? 'Fans are muting the tab.' : 'The callout left the comment section.',
            heat: spam ? 12 : 18,
            weeksLeft: 2,
            kind: 'CONTROVERSY',
        });
    }
    const note = spam
        ? 'Posted again. The community tab feels spammy and the mood dropped.'
        : `Community post is up. Fan mood ${moodDelta >= 0 ? '+' : ''}${moodDelta}.`;
    return { player: { ...player, youtube: nextChannel }, note, tone: spam || tone === 'CALLOUT' ? 'neutral' : 'positive' };
};

export const buyPromotion = (
    player: Player,
    videoId: string,
    budget: number,
    countries: string[],
    weeks: number,
): PlayNote & { error?: string } => {
    const ready = { ...player, youtube: ensureYoutubePartner(player.youtube) };
    const safeBudget = Math.floor(budget);
    if (!Number.isFinite(safeBudget) || safeBudget < AD_BUDGET_MIN) {
        return { player: ready, note: '', tone: 'neutral', error: `Buy at least $${AD_BUDGET_MIN.toLocaleString()}.` };
    }
    if (safeBudget > AD_BUDGET_GUARD) return { player: ready, note: '', tone: 'neutral', error: 'That budget does not fit in the books.' };
    const targets = countries.map(code => code.toUpperCase()).filter(code => code.length > 0);
    if (!targets.length) return { player: ready, note: '', tone: 'neutral', error: 'Pick at least one country.' };
    const span = clamp(Math.floor(weeks) || 1, 1, 8);
    const lists = [
        ...(ready.youtube.videos || []),
        ...(ready.youtube.officialChannels?.studio?.videos || []),
        ...(ready.youtube.officialChannels?.empirePlus?.videos || []),
    ];
    const video = lists.find(item => item.id === videoId);
    if (!video) return { player: ready, note: '', tone: 'neutral', error: 'That video is not on the channel.' };
    const kind = homeOf(ready.youtube, video.id);
    const quote = quotePromotion({
        budget: safeBudget,
        countries: targets,
        subs: subsOfKind(ready.youtube, kind),
        quality: video.qualityScore ?? 55,
        adFatigue: ready.youtube.partner?.adFatigue || 0,
        weeks: span,
    });
    const charged = chargeYoutubeWallet(ready, kind, safeBudget, `YouTube promotion · ${video.title}`);
    if (charged.error) return { player: ready, note: '', tone: 'neutral', error: charged.error };
    const partner = charged.player.youtube.partner;
    if (!partner) return { player: charged.player, note: '', tone: 'neutral', error: 'Channel is not ready.' };
    const next: Player = {
        ...charged.player,
        youtube: {
            ...charged.player.youtube,
            partner: {
                ...partner,
                adFatigue: clamp(partner.adFatigue + quote.fatigueAdd, 0, 100),
                promotions: keepPromotions([{
                    id: `ad_${video.id}_${player.currentWeek}`,
                    videoId: video.id,
                    budget: safeBudget,
                    countries: targets,
                    weeksLeft: span,
                    weeksTotal: span,
                    viewsDelivered: 0,
                    subsDelivered: 0,
                    viewsPlanned: quote.views,
                    subsPlanned: quote.subs,
                    wallet: kind,
                    weak: quote.weak,
                    efficiency: quote.efficiency,
                }, ...partner.promotions]),
            },
        },
    };
    const note = quote.weak
        ? 'Promotion is live. The video is weak, so most of the spend will not convert.'
        : `Promotion is live in ${targets.join(', ')}. Returns fall as the budget climbs.`;
    return { player: next, note, tone: quote.weak ? 'neutral' : 'positive' };
};

export const setPreferredDaypart = (player: Player, daypart: YoutubeDaypart): Player => ({
    ...player,
    youtube: {
        ...player.youtube,
        partner: player.youtube.partner ? { ...player.youtube.partner, preferredDaypart: daypart } : player.youtube.partner,
    },
});

export const suggestedPayout = (player: Player) => scaleBrandPayout({
    subs: player.youtube?.subscribers || 0,
    trust: player.youtube?.audienceTrust ?? 55,
    fatigue: player.youtube?.partner?.sponsorFatigue || 0,
    controversy: player.youtube?.controversy || 0,
    recentSponsors: recentSponsorCount(player.youtube),
});

export const audienceCpm = (channel: YoutubeChannel, video: YoutubeVideo) => blendedCpm(channel, video);
