/**
 * Books an Empire+ launch flight against company cash and the live marketing desk.
 * Personal cash is never assigned. Subscriber grants land once, on opening night if the service is dark.
 */
import type { InstaPost, LaunchFlight, MarketingCreative, MarketingFeedPost, Player, XPost } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { addCompanyCash, readCompanyCash } from '../ownPlatform/companyCash';
import { getCountry, LAUNCH_REGIONS, MARKET_COUNTRIES, REGION_CITIES } from '../ownPlatform/catalog';
import { quoteLaunch } from '../ownPlatform/logic';
import { contentVeto } from '../ownPlatform/stakeSale';
import {
    advanceMarketing,
    buildPoster,
    defaultCreative,
    hashString,
    livePressure,
    materializeCampaign,
    normalizeMarketing,
    posterSvg,
    recordSpend,
    type MarketingTitle,
} from './core';
import {
    KEY_ARTS,
    TAGLINES,
    TRAILER_CUTS,
    campaignCity,
    cleanLaunchFlight,
    creativeFactor,
    launchChannel,
    priceFlight,
    type FlightQuote,
    type PriceInput,
} from './launchCatalog';

export interface LaunchDraft {
    what: 'PLATFORM' | 'TITLE';
    titleId?: string;
    titleName?: string;
    cityIds: string[];
    channelIds: string[];
    creativeId: string;
    trailerId: string;
    tagline: string;
    weeks: number;
    ratio: number;
    weights?: Record<string, number>;
}

const countryFactor = (player: Player, countryId: string): number => {
    const state = player.ownPlatform;
    if (!state) return 0.35;
    const application = (state.applications || []).find(row => row.countryId === countryId);
    if (application && (application.status === 'APPROVED' || (application.status === 'CONDITIONS' && application.acceptedConditions))) return 1;
    if ((state.selectedCountryIds || []).includes(countryId)) return 0.62;
    return 0.35;
};

export const quoteLaunchFlight = (player: Player, draft: LaunchDraft): FlightQuote => {
    const factors: Record<string, number> = {};
    const notes: string[] = [];
    const told = new Set<string>();
    draft.cityIds.forEach(id => {
        const city = campaignCity(id);
        if (!city || factors[city.countryId] != null) return;
        const factor = countryFactor(player, city.countryId);
        factors[city.countryId] = factor;
        if (factor < 1 && !told.has(city.countryId)) {
            told.add(city.countryId);
            const named = getCountry(city.countryId)?.name || city.countryId;
            notes.push(factor >= 0.6
                ? `${named} is filed and not cleared. Part of this reach cannot subscribe yet.`
                : `${named} is not a day-one market. The ads still run. Only the share who can join is counted as subscribers.`);
        }
    });
    let households = 0;
    try {
        households = quoteLaunch(player).households || 0;
    } catch {
        households = 0;
    }
    const quote = priceFlight({
        cityIds: draft.cityIds,
        channelIds: draft.channelIds,
        weeks: draft.weeks,
        ratio: draft.ratio,
        weights: draft.weights,
        creative: creativeFactor(draft.creativeId, draft.trailerId),
        factors,
    } satisfies PriceInput);
    quote.notes = [...notes, ...quote.notes];
    if (households > 0 && quote.subscribers > households * 0.22) {
        const cap = Math.round(households * 0.22);
        const scale = cap / quote.subscribers;
        quote.subscribers = cap;
        quote.cities = quote.cities.map(city => ({ ...city, subscribers: Math.round(city.subscribers * scale) }));
        const drift = cap - quote.cities.reduce((sum, city) => sum + city.subscribers, 0);
        if (quote.cities[0] && drift) quote.cities[0].subscribers += drift;
        quote.demand = Math.max(0.008, Math.min(0.1, Math.round((cap / 800_000) * 1000) / 1000));
        quote.notes.push(`The open markets can take ${cap.toLocaleString('en-US')} new subscribers from one flight. The rest of the reach still ran.`);
    }
    return quote;
};

const world = () => ({
    regions: LAUNCH_REGIONS.map(region => ({ id: region.id, name: region.name })),
    countries: MARKET_COUNTRIES.map(country => ({
        id: country.id,
        regionId: country.regionId,
        name: country.name,
        audienceM: country.audienceM,
        languages: country.languages.map(language => language.name),
    })),
    cities: Object.entries(REGION_CITIES).flatMap(([regionId, rows]) => rows.map(city => ({ id: city.id, regionId, name: city.name }))),
});

const applyTitleHype = (player: Player, titleId: string, points: number) => {
    if (!points) return;
    const touch = (hidden: { rawHype?: number; marketingHypeAdded?: number } | undefined, buzz: number | undefined) => {
        if (!hidden) return buzz;
        const already = hidden.marketingHypeAdded || 0;
        const nextAdded = Math.min(24, already + points);
        const delta = nextAdded - already;
        hidden.marketingHypeAdded = nextAdded;
        hidden.rawHype = Math.max(0, Math.min(100, (hidden.rawHype ?? 50) + delta));
        return Math.max(-20, Math.min(45, (buzz || 0) + delta));
    };
    (player.commitments || []).forEach(commitment => {
        if (commitment.id !== titleId || !commitment.projectDetails?.hiddenStats) return;
        commitment.promotionalBuzz = touch(commitment.projectDetails.hiddenStats, commitment.promotionalBuzz);
    });
    (player.activeReleases || []).forEach(release => {
        if (release.id !== titleId || !release.projectDetails?.hiddenStats) return;
        release.promotionalBuzz = touch(release.projectDetails.hiddenStats, release.promotionalBuzz);
    });
};

const mirrorPost = (player: Player, post: MarketingFeedPost) => {
    if (player.instagram?.feed && post.network === 'FRAME') {
        const id = `mkt_ig_${post.id}`;
        if (!player.instagram.feed.some(row => row.id === id)) {
            const insta: InstaPost = {
                id, authorId: 'marketing', authorName: post.ownerName, authorHandle: post.handle, authorAvatar: '',
                type: post.format === 'REEL' ? 'REEL' : 'ANNOUNCEMENT', caption: post.caption, week: post.week, year: post.year,
                likes: post.likes, comments: post.comments, shares: post.shares, commentList: post.commentList, isPlayer: true,
                contentImage: posterSvg(post.poster),
            };
            player.instagram.feed.unshift(insta);
            player.instagram.feed = player.instagram.feed.slice(0, 80);
        }
    }
    if (player.x?.feed && post.network === 'WIRE') {
        const id = `mkt_x_${post.id}`;
        if (!player.x.feed.some(row => row.id === id)) {
            const tweet: XPost = {
                id, authorId: 'marketing', authorName: post.ownerName, authorHandle: post.handle, authorAvatar: '',
                content: post.caption, timestamp: post.week, likes: post.likes, retweets: post.reposts, replies: post.comments,
                isPlayer: true, isLiked: false, isRetweeted: false, isVerified: true, postType: 'PR_STATEMENT',
                replyList: post.commentList, system: true,
            };
            player.x.feed.unshift(tweet);
            player.x.feed = player.x.feed.slice(0, 80);
        }
    }
};

export const deliverLaunchOpening = (player: Player, now: number): string | null => {
    const flight = cleanLaunchFlight(player.marketing?.launch);
    if (!flight || flight.appliedAbsolute != null) return null;
    const state = player.ownPlatform;
    if (!state || state.stage !== 'LIVE') return null;
    const subs = Math.max(0, Math.round(flight.subscribers));
    state.subscribers = Math.max(0, Math.round((state.subscribers || 0) + subs));
    const ids = new Set(flight.campaignIds || []);
    if (player.marketing) {
        player.marketing.campaigns.forEach(campaign => {
            if (!ids.has(campaign.id) || campaign.status === 'COMPLETE') return;
            if (campaign.status === 'SCHEDULED' && campaign.startAbsolute > now) {
                const span = Math.max(1, Math.round(campaign.target?.durationWeeks || flight.weeks || 1));
                campaign.startAbsolute = now;
                campaign.endAbsolute = now + span - 1;
                campaign.target = { ...campaign.target, startOffset: 0, durationWeeks: span };
            }
        });
    }
    flight.appliedAbsolute = now;
    if (flight.demandUntil == null) flight.demandUntil = now + Math.max(1, flight.weeks) - 1;
    flight.held = false;
    if (player.marketing) player.marketing.launch = flight;
    state.marketingDemand = Math.max(0, Math.min(0.1, Math.max(state.marketingDemand || 0, flight.demand || 0)));
    return `${state.name} campaign brought ${subs.toLocaleString('en-US')} subscribers.`;
};

export const launchDemandFloor = (player: Player, now: number): number => {
    const flight = player.marketing?.launch;
    if (!flight || flight.demandUntil == null || now > flight.demandUntil || flight.stoppedAbsolute != null) return 0;
    const start = flight.bookedAbsolute;
    const elapsed = start > 0 ? Math.max(1, Math.min(flight.weeks || 1, now - start + 1)) : 1;
    const worn = Math.max(0, flight.extensions || 0) + Math.max(0, elapsed - 1) * 0.35;
    const factor = 1 / (1 + worn * 0.42);
    return Math.max(0, Math.min(0.1, (flight.demand || 0) * factor));
};

export const releaseHeldLaunch = (player: Player, now: number) => {
    const flight = player.marketing?.launch;
    const state = player.ownPlatform;
    if (!flight?.held || !state || state.stage !== 'LIVE' || !player.marketing) return;
    const ids = new Set(flight.campaignIds || []);
    let longest = Math.max(1, flight.weeks || 1);
    player.marketing.campaigns.forEach(campaign => {
        if (!ids.has(campaign.id) || campaign.status === 'COMPLETE') return;
        const span = Math.max(1, Math.round(campaign.target?.durationWeeks || 1));
        longest = Math.max(longest, span);
        campaign.startAbsolute = now;
        campaign.endAbsolute = now + span - 1;
        campaign.status = 'SCHEDULED';
        campaign.target = { ...campaign.target, startOffset: 0, durationWeeks: span };
    });
    flight.held = false;
    if (flight.demandUntil == null) flight.demandUntil = now + longest - 1;
};

const creativeOf = (draft: LaunchDraft): MarketingCreative => ({
    ...defaultCreative(),
    tagline: (draft.tagline || TAGLINES[0]).slice(0, 90),
    paletteId: draft.creativeId === 'gold' ? 'midnight' : draft.creativeId === 'portrait' ? 'studio' : 'noir',
    layoutId: draft.creativeId === 'type' ? 'type' : draft.creativeId === 'portrait' ? 'lead' : 'skyline',
    socialFormat: draft.trailerId === 'sting' ? 'STILL' : 'TRAILER',
});

export const confirmLaunchFlight = (player: Player, draft: LaunchDraft): { player: Player; error?: string; quote?: FlightQuote } => {
    if (!player.ownPlatform) return { player, error: 'The streaming company is not open.' };
    const quote = quoteLaunchFlight(player, draft);
    const picked = quote.channels.filter(row => draft.channelIds.includes(row.id) && !row.disabled && (row.weekly > 0 || row.opening > 0));
    if (!draft.cityIds.length || !quote.cities.length) return { player, error: 'Pick at least one city.' };
    if (!picked.length) return { player, error: 'Pick a channel that can run in these cities.' };
    if (!(draft.tagline || '').trim()) return { player, error: 'The flight needs a tagline.' };
    if (quote.total <= 0) return { player, error: 'This flight has no price.' };
    const personal = player.money;
    if (readCompanyCash(player) < quote.total) {
        const short = Math.ceil(quote.total - readCompanyCash(player));
        return { player, error: `Company cash is short $${short.toLocaleString('en-US')}. Personal cash stays put.` };
    }
    const veto = contentVeto(player, quote.total);
    if (veto) return { player, error: veto };
    const next = JSON.parse(JSON.stringify(player)) as Player;
    next.money = personal;
    const state = next.ownPlatform;
    if (!state) return { player, error: 'The streaming company is not open.' };
    const serviceName = state.name.trim() || 'Empire+';
    const titleName = draft.what === 'TITLE' && draft.titleName?.trim() ? draft.titleName.trim() : serviceName;
    const titleId = draft.what === 'TITLE' && draft.titleId ? draft.titleId : `platform-${hashString(serviceName).toString(16)}`;
    const title: MarketingTitle = {
        id: titleId, name: titleName, genre: 'DRAMA', language: 'English', cast: [], director: '', banner: serviceName,
        statusLine: state.stage === 'LIVE' ? 'Streaming' : 'Coming Soon', ownerKind: 'EMPIRE', ownerId: 'empire',
    };
    const now = getAbsoluteWeek(next.age || 18, next.currentWeek || 1);
    const live = state.stage === 'LIVE';
    const creative = creativeOf(draft);
    const poster = buildPoster(title, creative);
    const desk = normalizeMarketing(next.marketing);
    const ids: string[] = [];
    const regionIds = new Set(draft.cityIds.map(id => campaignCity(id)?.regionId).filter(Boolean));
    const regionId = regionIds.size === 1 ? [...regionIds][0] as string : 'WORLD';
    picked.forEach(row => {
        const channel = launchChannel(row.id);
        if (!channel) return;
        const campaign = materializeCampaign({
            draft: {
                key: `launch-${now}-${row.id}-${hashString(draft.cityIds.join(','))}`,
                ownerKind: 'EMPIRE', ownerId: 'empire', ownerName: serviceName, titleId, actionId: row.id, creative,
                target: {
                    regionId,
                    countryId: quote.cities.length === 1 ? campaignCity(quote.cities[0].id)?.countryId : undefined,
                    cityId: draft.cityIds[0],
                    cityIds: draft.cityIds,
                    durationWeeks: quote.weeks,
                    startOffset: live ? 0 : 60,
                    audience: 'MASS',
                },
            },
            title,
            world: world(),
            campaigns: desk.campaigns,
            exposure: desk.exposure,
            now,
            castFee: 0,
            castBooked: false,
            quote: {
                cost: Math.max(1000, Math.round(row.spend * quote.weeks + row.opening)),
                castFee: 0,
                reach: row.reach,
                reachLow: Math.round(row.reach * 0.74),
                reachHigh: Math.round(row.reach * 1.16),
                hype: Math.min(18, channel.buzz),
                ticketInterest: 1,
                streamInterest: Math.max(1, Math.min(16, row.subscribers / 4000)),
                competition: 0.1,
                saturation: 0,
                overexposed: false,
                notes: quote.notes.slice(0, 6),
            },
            week: next.currentWeek || 1,
            year: next.age || 18,
        });
        campaign.poster = { ...poster, title: titleName, tagline: creative.tagline };
        if (!live) {
            campaign.status = 'SCHEDULED';
            campaign.startAbsolute = now + 60;
            campaign.endAbsolute = now + 60 + quote.weeks - 1;
        }
        recordSpend(desk.records, campaign);
        desk.campaigns.unshift(campaign);
        ids.push(campaign.id);
    });
    const previous = cleanLaunchFlight(desk.launch);
    const open = previous && previous.appliedAbsolute == null ? previous : undefined;
    const unique = (values: string[]) => values.filter((id, index, all) => all.indexOf(id) === index);
    const cityIds = unique([...(open?.cityIds || []), ...draft.cityIds.filter(id => campaignCity(id))]).slice(0, 48);
    const channelIds = unique([...(open?.channelIds || []), ...picked.map(row => row.id)]).slice(0, 48);
    const cityLines = new Map<string, typeof quote.cities[number]>();
    [...(open?.cities || []), ...quote.cities].forEach(row => {
        const current = cityLines.get(row.id);
        if (!current) cityLines.set(row.id, { ...row });
        else {
            current.reach += row.reach;
            current.subscribers += row.subscribers;
            current.cost += row.cost;
        }
    });
    const weeks = Math.max(quote.weeks, open?.weeks || 0);
    const flight: LaunchFlight = {
        version: 1,
        what: draft.what === 'TITLE' ? 'TITLE' : 'PLATFORM',
        titleId,
        titleName,
        cityIds,
        channelIds,
        creativeId: KEY_ARTS.some(art => art.id === draft.creativeId) ? draft.creativeId : 'night',
        trailerId: TRAILER_CUTS.some(cut => cut.id === draft.trailerId) ? draft.trailerId : 'open',
        tagline: creative.tagline,
        weeks,
        weeklyBudget: quote.weekly + (open?.weeklyBudget || 0),
        openingCost: quote.opening + (open?.openingCost || 0),
        totalCost: quote.total + (open?.totalCost || 0),
        reach: quote.reach + (open?.reach || 0),
        buzz: Math.max(quote.buzz, open?.buzz || 0),
        subscribers: quote.subscribers + (open?.subscribers || 0),
        demand: Math.max(0, Math.min(0.1, quote.demand + (open?.demand || 0))),
        demandUntil: live ? now + weeks - 1 : undefined,
        cities: [...cityLines.values()].slice(0, 48),
        campaignIds: unique([...(open?.campaignIds || []), ...ids]).slice(0, 80),
        bookedAbsolute: now,
        held: !live,
    };
    desk.launch = flight;
    next.marketing = desk;
    addCompanyCash(next, -quote.total, `${serviceName} launch campaign`, 'BURN');
    next.money = personal;
    if (live) {
        const advanced = advanceMarketing(next.marketing, now, next.currentWeek || 1, next.age || 18, () => quote.cities[0]?.name || '', [], []);
        next.marketing = advanced.state;
        if (!next.marketing.launch) next.marketing.launch = flight;
        advanced.effects.hype.forEach(row => applyTitleHype(next, row.titleId, row.points));
        advanced.effects.posts.forEach(post => mirrorPost(next, post));
        deliverLaunchOpening(next, now);
        const pressure = livePressure(normalizeMarketing(next.marketing).campaigns);
        const fromDesk = pressure.filter(row => row.ownerKind === 'EMPIRE').reduce((sum, row) => sum + row.stream, 0) / 80;
        if (next.ownPlatform) next.ownPlatform.marketingDemand = Math.max(0, Math.min(0.1, Math.max(fromDesk, quote.demand)));
    }
    next.money = personal;
    return { player: next, quote };
};
