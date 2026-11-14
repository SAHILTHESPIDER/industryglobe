import type { InstaPost, MarketingCampaign, MarketingFeedPost, MarketingPoster, MarketingQuote, Player, XPost } from '../../types';
import { LAUNCH_REGIONS, MARKET_COUNTRIES, REGION_CITIES } from '../ownPlatform/catalog';
import { addCompanyCash, readCompanyCash } from '../ownPlatform/companyCash';
import { contentVeto } from '../ownPlatform/stakeSale';
import { gameCalendarYear } from '../boxOfficeSim';
import { getAbsoluteWeek } from '../legacyLogic';
import { publicBrandName } from '../rights/alterName';
import {
    advanceMarketing,
    actionById,
    buildPoster,
    defaultCreative,
    livePressure,
    materializeCampaign,
    normalizeMarketing,
    posterSvg,
    postsForCampaign,
    quoteBuy,
    recordSpend,
    spendForCampaign,
    tourStops,
    type MarketWorld,
    type MarketingDraft,
    type MarketingTitle,
} from './core';
import { listMarketingTitles } from './titles';
import { deliverLaunchOpening, launchDemandFloor, releaseHeldLaunch } from './launch';

export { listMarketingTitles } from './titles';
export {
    AUDIENCES,
    DATE_STYLES,
    EMPHASIS,
    LAYOUTS,
    MARKETING_ACTIONS,
    MARKETING_CATEGORIES,
    PALETTES,
    SIZES,
    SOCIAL_FORMATS,
    STAGE_THEMES,
    defaultCreative,
    defaultTarget,
    formatCount,
    formatMoney,
    themeById,
    tourStops,
} from './core';

const RIVAL_TITLES = [
    { name: 'Salt Market', genre: 'Drama', cast: ['Asha Venn', 'Mateo Ruiz'], status: 'Coming Soon' as const },
    { name: 'The Last Tram', genre: 'Thriller', cast: ['Hanae Sato'], status: 'In Cinemas' as const },
    { name: 'Paper Tigers', genre: 'Comedy', cast: ['June Pell', 'Idris Cole'], status: 'Streaming' as const },
    { name: 'Monsoon Office', genre: 'Romance', cast: ['Noor Elamin'], status: 'Coming Soon' as const },
    { name: 'Blue Kiln', genre: 'Action', cast: ['Arun Deshpande', 'Freya Moss'], status: 'In Cinemas' as const },
    { name: 'Hotel Meridian', genre: 'Crime', cast: ['Freya Moss'], status: 'Streaming' as const },
];

const RIVAL_HOUSES = [
    { id: 'northline', name: 'Northline Pictures', region: 'NORTH_AMERICA' },
    { id: 'kite', name: 'Kite House', region: 'EUROPE' },
    { id: 'marigold', name: 'Marigold Frames', region: 'ASIA' },
    { id: 'harbor', name: 'Harbor & Reel', region: 'SOUTH_AMERICA' },
];

const RIVAL_ACTIONS = ['billboard', 'reels', 'trailer', 'premiere', 'paid_ads', 'teaser'];

export const marketWorld = (): MarketWorld => ({
    regions: LAUNCH_REGIONS.map(region => ({ id: region.id, name: region.name })),
    countries: MARKET_COUNTRIES.map(country => ({
        id: country.id,
        regionId: country.regionId,
        name: country.name,
        audienceM: country.audienceM,
        languages: country.languages.map(language => language.name),
    })),
    cities: Object.entries(REGION_CITIES).flatMap(([regionId, cities]) => cities.map(city => ({
        id: city.id,
        regionId,
        name: city.name,
    }))),
});

const cityNameOf = (cityId?: string) => {
    if (!cityId) return '';
    for (const cities of Object.values(REGION_CITIES)) {
        const city = cities.find(row => row.id === cityId);
        if (city) return city.name;
    }
    return '';
};

const clonePlayer = (player: Player): Player => JSON.parse(JSON.stringify(player)) as Player;

const castFeeFor = (title: MarketingTitle, weeks: number): { fee: number; booked: boolean } => {
    const lead = title.cast[0];
    const base = lead?.salary && lead.salary > 0 ? lead.salary * 0.012 : 18_000;
    return { fee: Math.round(base * Math.max(1, weeks)), booked: false };
};

const castBooked = (player: Player, title: MarketingTitle, start: number, end: number, actionId: string): boolean => {
    if (!actionById(actionId)?.needsCast) return false;
    const names = new Set(title.cast.map(person => person.name));
    if (!names.size) return false;
    return normalizeMarketing(player.marketing).campaigns.some(campaign => {
        if (campaign.rival || campaign.status === 'COMPLETE') return false;
        if (!actionById(campaign.actionId)?.needsCast) return false;
        if (campaign.endAbsolute < start || campaign.startAbsolute > end) return false;
        return campaign.castNames.some(name => names.has(name));
    });
};

export const quoteMarketing = (player: Player, draft: MarketingDraft): { error?: string; quote?: MarketingQuote; poster?: MarketingPoster; title?: MarketingTitle } => {
    const titles = listMarketingTitles(player, draft.ownerKind, draft.ownerId);
    const title = titles.find(row => row.id === draft.titleId);
    if (!title) return { error: 'That title is not on this company\'s slate.' };
    const now = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    const weeks = Math.max(1, Math.round(draft.target?.durationWeeks || 1));
    const start = now + Math.max(0, Math.round(draft.target?.startOffset || 0));
    const fee = castFeeFor(title, weeks);
    fee.booked = castBooked(player, title, start, start + weeks - 1, draft.actionId);
    const desk = normalizeMarketing(player.marketing);
    const quoted = quoteBuy({
        draft,
        title,
        world: marketWorld(),
        campaigns: desk.campaigns,
        exposure: desk.exposure,
        now,
        castFee: fee.fee,
        castBooked: fee.booked,
    });
    return { ...quoted, poster: buildPoster(title, draft.creative || defaultCreative()), title };
};

const applyHype = (player: Player, titleId: string, points: number) => {
    if (!points) return;
    const touch = (hidden: { rawHype?: number; marketingHypeAdded?: number } | undefined, buzz: number | undefined) => {
        if (!hidden) return { buzz };
        const already = hidden.marketingHypeAdded || 0;
        const nextAdded = Math.min(24, already + points);
        const delta = nextAdded - already;
        hidden.marketingHypeAdded = nextAdded;
        hidden.rawHype = Math.max(0, Math.min(100, (hidden.rawHype ?? 50) + delta));
        return { buzz: Math.max(-20, Math.min(45, (buzz || 0) + delta)) };
    };
    (player.commitments || []).forEach(commitment => {
        if (commitment.id !== titleId || !commitment.projectDetails?.hiddenStats) return;
        const next = touch(commitment.projectDetails.hiddenStats, commitment.promotionalBuzz);
        commitment.promotionalBuzz = next.buzz;
    });
    (player.activeReleases || []).forEach(release => {
        if (release.id !== titleId || !release.projectDetails?.hiddenStats) return;
        const next = touch(release.projectDetails.hiddenStats, release.promotionalBuzz);
        release.promotionalBuzz = next.buzz;
    });
};

const syncLive = (player: Player) => {
    const pressure = livePressure(normalizeMarketing(player.marketing).campaigns);
    const byTitle = new Map<string, { stream: number; outdoor: boolean; empire: number }>();
    pressure.forEach(row => {
        const current = byTitle.get(row.titleId) || { stream: 0, outdoor: false, empire: 0 };
        current.stream += row.stream;
        current.outdoor = current.outdoor || row.outdoor;
        if (row.ownerKind === 'EMPIRE') current.empire += row.stream;
        byTitle.set(row.titleId, current);
    });
    const applyHidden = (titleId: string, hidden?: { marketingStreamBoost?: number; marketingLegs?: number }) => {
        if (!hidden) return;
        const row = byTitle.get(titleId);
        hidden.marketingStreamBoost = row ? Math.max(0, Math.min(0.22, row.stream / 40)) : 0;
        hidden.marketingLegs = row?.outdoor ? Math.min(1.1, 1 + Math.min(0.1, row.stream / 80)) : 1;
    };
    (player.commitments || []).forEach(commitment => applyHidden(commitment.id, commitment.projectDetails?.hiddenStats));
    (player.activeReleases || []).forEach(release => applyHidden(release.id, release.projectDetails?.hiddenStats));
    if (player.ownPlatform) {
        const demand = pressure.filter(row => row.ownerKind === 'EMPIRE').reduce((sum, row) => sum + row.stream, 0);
        player.ownPlatform.marketingDemand = Math.max(0, Math.min(0.1, demand / 80));
    }
};

const mirrorPost = (player: Player, post: MarketingFeedPost) => {
    if (player.instagram?.feed && post.network === 'FRAME') {
        const id = `mkt_ig_${post.id}`;
        if (!player.instagram.feed.some(row => row.id === id)) {
            const insta: InstaPost = {
                id,
                authorId: post.rival ? `rival_${post.handle}` : 'marketing',
                authorName: post.ownerName,
                authorHandle: post.handle,
                authorAvatar: '',
                type: post.format === 'REEL' ? 'REEL' : post.actionId === 'bts' ? 'BTS' : 'ANNOUNCEMENT',
                caption: post.caption,
                week: post.week,
                year: post.year,
                likes: post.likes,
                comments: post.comments,
                shares: post.shares,
                commentList: post.commentList,
                isPlayer: !post.rival,
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
                id,
                authorId: post.rival ? `rival_${post.handle}` : 'marketing',
                authorName: post.ownerName,
                authorHandle: post.handle,
                authorAvatar: '',
                content: post.caption,
                timestamp: post.week,
                likes: post.likes,
                retweets: post.reposts,
                replies: post.comments,
                isPlayer: !post.rival,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
                postType: 'PR_STATEMENT',
                replyList: post.commentList,
                system: true,
            };
            player.x.feed.unshift(tweet);
            player.x.feed = player.x.feed.slice(0, 80);
        }
    }
};

const rivalWave = (player: Player, now: number, week: number, year: number): { campaigns: MarketingCampaign[]; posts: MarketingFeedPost[] } => {
    const world = marketWorld();
    type RivalDesk = { id: string; name: string; region: string; kind: 'RIVAL_PLATFORM' | 'RIVAL_HOUSE' };
    const roster: RivalDesk[] = (player.ownPlatform?.rivals || [])
        .filter(rival => rival.status !== 'ACQUIRED')
        .slice(0, 8)
        .map(rival => ({ id: rival.id, name: publicBrandName(rival.name), region: rival.homeRegion, kind: 'RIVAL_PLATFORM' }));
    const houses: RivalDesk[] = RIVAL_HOUSES.map(house => ({ id: house.id, name: house.name, region: house.region, kind: 'RIVAL_HOUSE' }));
    const fallback: RivalDesk[] = [
        { id: 'lumen', name: 'Lumen Reel', region: 'NORTH_AMERICA', kind: 'RIVAL_PLATFORM' },
        { id: 'kahani', name: 'Kahani Box', region: 'ASIA', kind: 'RIVAL_PLATFORM' },
    ];
    const desks = (roster.length ? roster : fallback).concat(houses);
    const count = 3;
    const campaigns: MarketingCampaign[] = [];
    const posts: MarketingFeedPost[] = [];
    for (let index = 0; index < count; index += 1) {
        const desk = desks[(now + index * 2) % desks.length];
        const film = RIVAL_TITLES[(now + index) % RIVAL_TITLES.length];
        const actionId = RIVAL_ACTIONS[(now + index) % RIVAL_ACTIONS.length];
        const action = actionById(actionId)!;
        const region = world.regions.some(row => row.id === desk.region) ? desk.region : 'NORTH_AMERICA';
        const city = world.cities.find(row => row.regionId === region);
        const title: MarketingTitle = {
            id: `rival-${film.name}`,
            name: film.name,
            genre: film.genre,
            language: 'English',
            cast: film.cast.map(name => ({ name })),
            director: 'Guest director',
            banner: desk.name,
            statusLine: film.status,
            releaseWeek: ((week + 4) % 52) + 1,
            releaseYear: gameCalendarYear(player.age || 18),
            weeksUntil: 4,
            ownerKind: 'HOUSE',
            ownerId: desk.id,
        };
        const creative = { ...defaultCreative(), paletteId: ['crimson', 'monsoon', 'noir', 'saffron'][index % 4], socialFormat: action.category === 'DIGITAL' ? 'REEL' as const : 'ANNOUNCEMENT' as const };
        const poster = buildPoster(title, creative);
        const id = `rival_${now}_${desk.id}_${actionId}`;
        const campaign: MarketingCampaign = {
            id,
            key: id,
            ownerKind: desk.kind,
            ownerId: desk.id,
            ownerName: desk.name,
            titleId: title.id,
            titleName: title.name,
            actionId,
            category: action.category,
            status: 'LIVE',
            startAbsolute: now,
            endAbsolute: now,
            charged: false,
            chargeAmount: 0,
            lastAppliedAbsolute: now,
            creative,
            target: { regionId: region, cityId: city?.id, durationWeeks: 1, startOffset: 0, audience: 'MASS' },
            quote: { cost: 0, castFee: 0, reach: 400_000, reachLow: 300_000, reachHigh: 500_000, hype: 4, ticketInterest: 2, streamInterest: 3, competition: 0.1, saturation: 0, overexposed: false, notes: [] },
            roll: 0.9,
            resolvedReach: 400_000 + (now % 7) * 20_000,
            resolvedHype: 4,
            resolvedTicket: 2,
            resolvedStream: 3,
            outcome: {
                reach: 400_000,
                hype: 4,
                ticketInterest: 2,
                streamInterest: 3,
                appliedWeeks: 1,
                overexposed: false,
                note: 'Rival buy.',
                regions: [{ id: region, name: region, reach: 400_000, interest: 5 }],
                channels: [{ id: action.category, name: action.name, reach: 400_000, sentiment: 60 }],
            },
            castNames: film.cast,
            poster,
            feedPostIds: [`frame_${id}`, `wire_${id}`],
            rival: true,
        };
        const made = postsForCampaign(campaign, week, year, now, city?.name || '');
        campaign.feedPostIds = made.map(post => post.id);
        campaigns.push(campaign);
        posts.push(...made);
    }
    return { campaigns, posts };
};

/** Mutates the player. Personal money is never assigned. */
export const applyMarketingWeek = (player: Player): string[] => {
    const now = getAbsoluteWeek(player.age || 18, player.currentWeek || 1);
    const week = player.currentWeek || 1;
    const year = player.age || 18;
    releaseHeldLaunch(player, now);
    const wave = rivalWave(player, now, week, year);
    const result = advanceMarketing(
        player.marketing,
        now,
        week,
        year,
        campaign => cityNameOf(campaign.target.cityId),
        wave.campaigns,
        wave.posts,
    );
    player.marketing = result.state;
    result.effects.hype.forEach(row => applyHype(player, row.titleId, row.points));
    result.effects.posts.forEach(post => mirrorPost(player, post));
    syncLive(player);
    const opened = deliverLaunchOpening(player, now);
    if (opened) result.effects.notes.push(opened);
    const floor = launchDemandFloor(player, now);
    if (floor > 0 && player.ownPlatform) {
        player.ownPlatform.marketingDemand = Math.max(0, Math.min(0.1, Math.max(player.ownPlatform.marketingDemand || 0, floor)));
    }
    return result.effects.notes;
};

export const wakeMarketing = (player: Player): Player => {
    const next = clonePlayer(player);
    const personal = player.money;
    applyMarketingWeek(next);
    next.money = personal;
    const sameDesk = JSON.stringify(normalizeMarketing(player.marketing)) === JSON.stringify(next.marketing);
    if (sameDesk) return player;
    return next;
};

export const normalizePlayerMarketing = (player: Player): Player => ({
    ...player,
    marketing: normalizeMarketing(player.marketing),
});

const chargeOwner = (player: Player, draft: MarketingDraft, cost: number, label: string): { error?: string } => {
    const wallet = {
        personal: player.money,
        companyCash: readCompanyCash(player),
        houseBalance: (player.businesses || []).find(business => business.id === draft.ownerId && business.type === 'PRODUCTION_HOUSE')?.balance || 0,
        productionFund: (player.businesses || []).find(business => business.id === draft.ownerId)?.studioState?.productionFund || 0,
    };
    const decision = spendForCampaign(wallet, draft.ownerKind, cost, false);
    if (decision.error) return { error: decision.error };
    if (decision.wallet.personal !== wallet.personal || decision.wallet.productionFund !== wallet.productionFund) {
        return { error: 'Refused a charge that would touch personal cash or the production fund.' };
    }
    if (draft.ownerKind === 'EMPIRE') {
        const veto = contentVeto(player, cost);
        if (veto) return { error: veto };
        if (!player.ownPlatform) return { error: 'The streaming company is not open.' };
        addCompanyCash(player, decision.wallet.companyCash - wallet.companyCash, label, 'BURN');
        return {};
    }
    const house = (player.businesses || []).find(business => business.id === draft.ownerId && business.type === 'PRODUCTION_HOUSE');
    if (!house) return { error: 'This production house is not on the books.' };
    house.balance = decision.wallet.houseBalance;
    if (!house.studioState) {
        house.studioState = { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
    }
    house.studioState.financeLedger = [{
        id: `mkt_${player.currentWeek}_${draft.key}`,
        week: player.currentWeek,
        year: player.age,
        amount: -(wallet.houseBalance - decision.wallet.houseBalance),
        type: 'MARKETING',
        label,
    }, ...(house.studioState.financeLedger || [])].slice(0, 200);
    return {};
};

export const confirmMarketing = (player: Player, draft: MarketingDraft): { player: Player; error?: string; campaignId?: string } => {
    const quoted = quoteMarketing(player, draft);
    if (quoted.error || !quoted.quote || !quoted.title) return { player, error: quoted.error || 'This buy cannot be priced.' };
    const existing = normalizeMarketing(player.marketing).campaigns.find(campaign => campaign.key === draft.key);
    if (existing?.charged) return { player, error: 'This campaign is already on the books.' };
    const next = clonePlayer(player);
    const personal = next.money;
    const fundBefore = (next.businesses || []).find(business => business.id === draft.ownerId)?.studioState?.productionFund;
    const label = `Marketing · ${quoted.title.name} · ${actionById(draft.actionId)?.name || 'campaign'}`;
    const charged = chargeOwner(next, draft, quoted.quote.cost, label);
    if (charged.error) return { player, error: charged.error };
    next.money = personal;
    const house = (next.businesses || []).find(business => business.id === draft.ownerId);
    if (house?.studioState && fundBefore !== undefined) house.studioState.productionFund = fundBefore;
    const now = getAbsoluteWeek(next.age || 18, next.currentWeek || 1);
    const campaign = materializeCampaign({
        draft,
        title: quoted.title,
        world: marketWorld(),
        campaigns: normalizeMarketing(next.marketing).campaigns,
        exposure: normalizeMarketing(next.marketing).exposure,
        now,
        castFee: quoted.quote.castFee,
        castBooked: false,
        quote: quoted.quote,
        week: next.currentWeek || 1,
        year: next.age || 18,
    });
    const desk = normalizeMarketing(next.marketing);
    recordSpend(desk.records, campaign);
    desk.campaigns.unshift(campaign);
    next.marketing = desk;
    if (campaign.status === 'LIVE') applyMarketingWeek(next);
    next.money = personal;
    if (house?.studioState && fundBefore !== undefined) {
        const again = (next.businesses || []).find(business => business.id === draft.ownerId);
        if (again?.studioState) again.studioState.productionFund = fundBefore;
    }
    return { player: next, campaignId: campaign.id };
};

export const marketingStops = (draft: MarketingDraft) => tourStops(marketWorld(), draft.target, draft.key || draft.titleId);
