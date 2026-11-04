import { NewsItem, Player, YoutubeChannel, YoutubeChannelKind, YoutubePromotion, YoutubeVideo } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { AD_FATIGUE_DECAY, clamp, HEAT_HARD, HOUR_WEEKS, SHORTS_WEEKS, SPONSOR_FATIGUE_DECAY, SPONSOR_WEEKS, watchHoursFor } from './constants';
import { ensureYoutubePartner, keepPromotions, pushWeek, quotePromotion, sumList, yppProgress } from './economy';
import { creditYoutubeWallet } from './wallet';

export interface PartnerWeekResult {
    player: Player;
    logs: { msg: string; type: 'positive' | 'negative' | 'neutral' }[];
    news: NewsItem[];
}

const KINDS: YoutubeChannelKind[] = ['personal', 'studio', 'empirePlus'];

const patchVideos = (videos: YoutubeVideo[], id: string, views: number): { videos: YoutubeVideo[]; hit: boolean } => {
    let hit = false;
    const next = videos.map(video => {
        if (video.id !== id) return video;
        hit = true;
        const history = [...(video.weeklyHistory || [])];
        if (history.length) history[history.length - 1] += views;
        else history.push(views);
        return { ...video, views: (video.views || 0) + views, weeklyHistory: history.slice(-26) };
    });
    return { videos: next, hit };
};

const deliverPromo = (channel: YoutubeChannel, promo: YoutubePromotion): { channel: YoutubeChannel; views: number; subs: number } => {
    const plannedViews = promo.viewsPlanned ?? quotePromotion({
        budget: promo.budget,
        countries: promo.countries,
        subs: channel.subscribers || 0,
        quality: promo.weak ? 35 : 70,
        adFatigue: 0,
        weeks: promo.weeksTotal,
    }).views;
    const plannedSubs = promo.subsPlanned ?? Math.floor(plannedViews / (promo.weak ? 900 : 220));
    const slices = Math.max(1, promo.weeksTotal);
    const viewSlice = Math.floor(plannedViews / slices);
    const subSlice = Math.floor(plannedSubs / slices);
    let hitKind: YoutubeChannelKind | null = null;
    let videos = channel.videos || [];
    const personal = patchVideos(videos, promo.videoId, viewSlice);
    videos = personal.videos;
    if (personal.hit) hitKind = 'personal';
    let studio = channel.officialChannels?.studio;
    let empire = channel.officialChannels?.empirePlus;
    if (!hitKind && studio) {
        const patched = patchVideos(studio.videos || [], promo.videoId, viewSlice);
        if (patched.hit) {
            hitKind = 'studio';
            studio = { ...studio, videos: patched.videos, totalViews: (studio.totalViews || 0) + viewSlice, subscribers: (studio.subscribers || 0) + subSlice };
        }
    }
    if (!hitKind && empire) {
        const patched = patchVideos(empire.videos || [], promo.videoId, viewSlice);
        if (patched.hit) {
            hitKind = 'empirePlus';
            empire = { ...empire, videos: patched.videos, totalViews: (empire.totalViews || 0) + viewSlice, subscribers: (empire.subscribers || 0) + subSlice };
        }
    }
    let next = channel;
    if (hitKind === 'personal') {
        next = { ...next, videos, totalChannelViews: (next.totalChannelViews || 0) + viewSlice, subscribers: (next.subscribers || 0) + subSlice };
    } else if (studio || empire) {
        next = { ...next, videos, officialChannels: { ...(next.officialChannels || {}), studio, empirePlus: empire } };
    }
    return { channel: next, views: hitKind ? viewSlice : 0, subs: hitKind ? subSlice : 0 };
};

const weeklyOrganic = (videos: YoutubeVideo[] | undefined): number =>
    (videos || []).reduce((sum, video) => {
        const tracked = typeof video.signals?.trackedViews === 'number' ? video.signals.trackedViews : (video.views || 0);
        return sum + Math.max(0, (video.views || 0) - tracked);
    }, 0);

const promoBase = (channel: YoutubeChannel, videoId: string): { organic: number } => {
    const personal = (channel.videos || []).find(video => video.id === videoId);
    const studio = channel.officialChannels?.studio?.videos || [];
    const empire = channel.officialChannels?.empirePlus?.videos || [];
    const video = personal || studio.find(item => item.id === videoId) || empire.find(item => item.id === videoId);
    const list = personal ? (channel.videos || []) : studio.some(item => item.id === videoId) ? studio : empire;
    const organic = weeklyOrganic(list);
    return { organic: organic > 0 ? organic : Math.max(video?.views || 0, 1) };
};

const shiftAudience = (channel: YoutubeChannel, countries: string[], promoViews: number, organic: number): YoutubeChannel => {
    const partner = channel.partner;
    if (!partner || promoViews <= 0 || !countries.length) return channel;
    const pull = Math.min(0.22, promoViews / Math.max(1, promoViews + organic));
    const kept = partner.audience.map(row => ({ ...row, share: row.share * (1 - pull) }));
    const slice = pull / countries.length;
    countries.forEach(code => {
        const row = kept.find(item => item.code === code);
        if (row) row.share += slice;
        else kept.push({ code, share: slice });
    });
    const total = kept.reduce((sum, row) => sum + row.share, 0) || 1;
    return { ...channel, partner: { ...partner, audience: kept.map(row => ({ ...row, share: row.share / total })) } };
};

interface Pass {
    hours: number;
    shorts: number;
    earnings: number;
    organicViews: number;
    videos: YoutubeVideo[];
}

const account = (videos: YoutubeVideo[], seeded: boolean, controversy: number): Pass => {
    let hours = 0;
    let shorts = 0;
    let earnings = 0;
    let organicViews = 0;
    const next = videos.map(video => {
        const trackedViews = typeof video.signals?.trackedViews === 'number' ? video.signals.trackedViews : 0;
        const trackedEarnings = typeof video.signals?.trackedEarnings === 'number' ? video.signals.trackedEarnings : 0;
        const views = video.views || 0;
        const deltaViews = Math.max(0, views - trackedViews);
        const deltaEarnings = Math.max(0, (video.earnings || 0) - trackedEarnings);
        organicViews += deltaViews;
        earnings += deltaEarnings;
        const hourViews = seeded ? deltaViews : views;
        const gained = watchHoursFor(hourViews, video, controversy);
        hours += gained;
        if (video.isShort || video.type === 'SHORT' || video.signals?.format === 'SHORT') {
            shorts += seeded ? deltaViews : views;
        }
        return {
            ...video,
            signals: { ...video.signals, trackedViews: views, trackedEarnings: video.earnings || 0 },
        };
    });
    return { hours, shorts, earnings, organicViews, videos: next };
};

export const settleYoutubePartnerWeek = (player: Player): PartnerWeekResult => {
    const abs = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    let channel = ensureYoutubePartner(player.youtube);
    if (channel.partner?.settledAbs === abs) {
        return { player: { ...player, youtube: channel }, logs: [], news: [] };
    }
    const partner = channel.partner!;
    const seeded = partner.seeded === true;
    const wasPersonal = partner.monetized.personal === true;
    let promoViews = 0;
    (partner.promotions || []).forEach(promo => {
        if (promo.weeksLeft <= 0) return;
        const base = promoBase(channel, promo.videoId);
        const delivered = deliverPromo(channel, promo);
        channel = delivered.channel;
        promoViews += delivered.views;
        channel = shiftAudience(channel, promo.countries, delivered.views, base.organic);
    });
    const promotions = (channel.partner?.promotions || partner.promotions).map(promo => ({
        ...promo,
        weeksLeft: Math.max(0, promo.weeksLeft - 1),
        viewsDelivered: promo.viewsDelivered + Math.floor((promo.viewsPlanned || 0) / Math.max(1, promo.weeksTotal)),
        subsDelivered: promo.subsDelivered + Math.floor((promo.subsPlanned || 0) / Math.max(1, promo.weeksTotal)),
    }));
    const keptPromotions = keepPromotions(promotions);

    const controversy = channel.controversy ?? 0;
    const personal = account(channel.videos || [], seeded, controversy);
    const studioBoard = channel.officialChannels?.studio;
    const empireBoard = channel.officialChannels?.empirePlus;
    const studio = account(studioBoard?.videos || [], seeded, controversy);
    const empire = account(empireBoard?.videos || [], seeded, controversy);
    const passes: Record<YoutubeChannelKind, Pass> = { personal, studio, empirePlus: empire };

    const hourWeeks = { ...partner.hourWeeks };
    const shortsViewWeeks = { ...partner.shortsViewWeeks };
    const lifetimeHours = { ...partner.lifetimeHours };
    const lastRevenue: Record<YoutubeChannelKind, number> = { personal: 0, studio: 0, empirePlus: 0 };
    KINDS.forEach(kind => {
        const pass = passes[kind];
        lifetimeHours[kind] = (lifetimeHours[kind] || 0) + pass.hours;
        hourWeeks[kind] = seeded ? pushWeek(hourWeeks[kind] || [], pass.hours, HOUR_WEEKS) : [pass.hours];
        shortsViewWeeks[kind] = seeded ? pushWeek(shortsViewWeeks[kind] || [], pass.shorts, SHORTS_WEEKS) : [pass.shorts];
        lastRevenue[kind] = Math.floor(pass.earnings);
    });

    let trends = (partner.trends || []).map(trend => ({ ...trend, weeksLeft: trend.weeksLeft - 1 })).filter(trend => trend.weeksLeft > 0);
    const logs: PartnerWeekResult['logs'] = [];
    const news: NewsItem[] = [];
    let subscribers = channel.subscribers || 0;
    let trust = channel.audienceTrust ?? 55;
    let mood = channel.fanMood ?? 55;
    const trending = (partner.trends || []).some(trend => trend.kind === 'CONTROVERSY' && trend.weeksLeft > 0);
    if (trending) {
        const bump = Math.min(25000, Math.floor(subscribers * 0.008 + 40));
        subscribers += bump;
        trust = clamp(trust - 1, 0, 100);
        mood = clamp(mood - 1, 0, 100);
        logs.push({ msg: 'A YouTube controversy is still trending. Reach is up and trust is down.', type: 'neutral' });
    }
    if ((channel.controversy ?? 0) >= HEAT_HARD && !trends.some(trend => trend.kind === 'CONTROVERSY')) {
        trends = [{
            id: `trend_heat_${abs}`,
            title: `${player.name} is trending for the wrong reason`,
            detail: 'The comment section and the trades are on the same story.',
            heat: channel.controversy ?? HEAT_HARD,
            weeksLeft: 2,
            kind: 'CONTROVERSY' as const,
        }, ...trends].slice(0, 8);
        news.push({
            id: `news_yt_trend_${abs}`,
            headline: `${player.name}'s YouTube channel is in the middle of a pile-on`,
            subtext: 'Fans are split. Advertisers are paying less while it lasts.',
            category: 'GOSSIP',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM',
        });
        logs.push({ msg: 'Your YouTube controversy is trending.', type: 'negative' });
    }

    channel = {
        ...channel,
        subscribers,
        audienceTrust: trust,
        fanMood: mood,
        videos: personal.videos,
        officialChannels: channel.officialChannels ? {
            ...channel.officialChannels,
            studio: studioBoard ? { ...studioBoard, videos: studio.videos } : studioBoard,
            empirePlus: empireBoard ? { ...empireBoard, videos: empire.videos } : empireBoard,
        } : channel.officialChannels,
        partner: {
            ...partner,
            seeded: true,
            settledAbs: abs,
            hourWeeks,
            shortsViewWeeks,
            lifetimeHours,
            lastRevenue,
            promotions: keptPromotions,
            trends,
            sponsorWeeks: pushWeek(partner.sponsorWeeks || [], partner.sponsorThisWeek || 0, SPONSOR_WEEKS),
            sponsorThisWeek: 0,
            sponsorFatigue: clamp((partner.sponsorFatigue || 0) - SPONSOR_FATIGUE_DECAY, 0, 100),
            adFatigue: clamp((channel.partner?.adFatigue ?? partner.adFatigue) - AD_FATIGUE_DECAY, 0, 100),
            audience: channel.partner?.audience || partner.audience,
        },
    };

    const monetized = { ...channel.partner!.monetized };
    KINDS.forEach(kind => {
        const progress = yppProgress(channel, kind, abs);
        if (progress.readyByLong || progress.readyByShorts) monetized[kind] = true;
    });
    const blocked = (channel.demonetizedUntilAbs || 0) > abs;
    if (!wasPersonal && monetized.personal && !blocked) {
        logs.push({ msg: 'YouTube Partner Program unlocked. Ad revenue starts next week.', type: 'positive' });
    }
    channel = {
        ...channel,
        isMonetized: blocked ? false : (monetized.personal === true || channel.isMonetized),
        partner: { ...channel.partner!, monetized },
    };

    let next: Player = { ...player, youtube: channel };
    KINDS.forEach(kind => {
        const pending = Math.floor(channel.partner?.held?.[kind] || 0);
        if (pending <= 0) return;
        next = {
            ...next,
            youtube: {
                ...next.youtube,
                partner: { ...next.youtube.partner!, held: { ...next.youtube.partner!.held, [kind]: 0 } },
            },
        };
        const paid = creditYoutubeWallet(next, kind, pending, 'YouTube payout held for the treasury');
        next = paid.player;
        if (paid.held) logs.push({ msg: `YouTube payout is still waiting on the ${kind} wallet.`, type: 'neutral' });
        else logs.push({ msg: `Held YouTube payout reached the ${kind === 'personal' ? 'personal' : kind === 'studio' ? 'studio' : 'Empire+'} wallet.`, type: 'positive' });
    });

    if (promoViews > 0) logs.push({ msg: `Paid promotion delivered ${promoViews.toLocaleString()} views.`, type: 'neutral' });
    const weekAds = sumList(KINDS.map(kind => lastRevenue[kind]));
    if (weekAds >= 100) logs.push({ msg: `YouTube ads grossed $${weekAds.toLocaleString()} this week.`, type: 'positive' });
    return { player: next, logs, news };
};
