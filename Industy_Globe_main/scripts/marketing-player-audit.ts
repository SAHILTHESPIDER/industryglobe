/**
 * Player-level checks. Company books and the house balance move.
 * player.money and the production fund do not.
 */
import type { Player } from '../types';
import { confirmMarketing, applyMarketingWeek } from '../services/marketing/engine';
import { normalizeMarketing } from '../services/marketing/core';
import { priceFlight } from '../services/marketing/launchCatalog';
import { confirmLaunchFlight, deliverLaunchOpening } from '../services/marketing/launch';
import { getAbsoluteWeek } from '../services/legacyLogic';

const need = (condition: unknown, message: string) => {
    if (!condition) {
        console.error(`FAIL ${message}`);
        process.exitCode = 1;
    }
};

const player = (): Player => ({
    age: 28,
    currentWeek: 10,
    money: 800_000,
    name: 'Asha Venn',
    instagram: { handle: '@asha', followers: 10, posts: [], feed: [], npcStates: {}, weeklyPostCount: 0, lastPostWeek: 0, aesthetic: 50, authenticity: 50, controversy: 0, fashionInfluence: 0, fanLoyalty: 40 },
    x: { handle: '@asha', followers: 10, posts: [], feed: [], lastPostWeek: 0 },
    commitments: [{
        id: 'glass-hotel',
        name: 'Glass Hotel',
        type: 'ACTING_GIG',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        promotionalBuzz: 0,
        projectDetails: {
            title: 'Glass Hotel',
            type: 'MOVIE',
            description: '',
            studioId: 'house-1',
            subtype: 'STANDALONE',
            genre: 'DRAMA',
            budgetTier: 'MID',
            estimatedBudget: 1,
            visibleHype: 'MID',
            hiddenStats: { scriptQuality: 60, directorQuality: 60, castingStrength: 70, distributionPower: 50, rawHype: 40, qualityScore: 60, prestigeBonus: 0 },
            directorName: 'Idris Cole',
            visibleDirectorTier: 'AUTEUR',
            visibleScriptBuzz: 'Warm',
            visibleCastStrength: 'Strong',
            castList: [{ id: 'c1', name: 'June Pell', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', salary: 500_000, status: 'CONFIRMED' }],
            releaseDate: 18,
        },
    }],
    activeReleases: [],
    pastProjects: [],
    businesses: [{
        id: 'house-1',
        name: 'Northglass',
        type: 'PRODUCTION_HOUSE',
        subtype: 'INDIE_STUDIO',
        logo: 'NG',
        color: 'bg-zinc-800',
        foundedWeek: 1,
        balance: 3_000_000,
        isActive: true,
        config: { quality: 'STANDARD', pricing: 'MARKET', marketing: 'MEDIUM' },
        stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 1, brandHealth: 50, customerSatisfaction: 50, riskLevel: 1, hype: 1 },
        staff: [],
        products: [],
        hiringPool: [],
        lastHiringRefreshWeek: 1,
        history: [],
        studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 1, lastWriterRefreshWeek: 1, financeLedger: [], productionFund: 9_000_000 },
    }],
    ownPlatform: {
        version: 1,
        name: 'Lumen Desk',
        stage: 'LIVE',
        defineStep: 7,
        buildStep: 3,
        selectedCountryIds: ['US'],
        applications: [],
        identityId: 'pulse',
        storefrontId: 'prestige',
        catalogue: [{ id: 'cat-low', source: 'OWNED', title: 'Low Tide Club', genre: 'Comedy', language: 'English', cost: 1 }],
        plans: [],
        revenueLanes: ['SUBSCRIPTION'],
        regions: [],
        cloud: [],
        commissioned: true,
        constructionWeeksLeft: 0,
        weeksLive: 4,
        subscribers: 1000,
        piracyShare: 0,
        enforcement: 30,
        customerPressure: 10,
        rivals: [{ id: 'lumen', name: 'Netflix', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 10, monthlyPrice: 9, reputation: 60, languages: ['English'], status: 'ACTIVE', note: '' }],
        pulse: { recession: 0, inflation: 0, connectivity: 0.5, fatigue: 0, headline: '' },
        pendingDeal: null,
        closedDeals: [],
        lastWeeklyRevenue: 0,
        lastWeeklyBurn: 0,
        books: { funding: 'OWN', debt: 0, equitySoldPct: 0, facilityRate: 0.09, pePartner: '', history: [], lines: [], cash: 4_000_000 },
    },
} as unknown as Player);

const creative = {
    layoutId: 'stack', paletteId: 'midnight', sizeId: 'sheet', castEmphasis: 'LEAD' as const,
    tagline: 'The lobby remembers.', dateStyle: 'FULL' as const, socialFormat: 'STILL' as const, stageTheme: 'velvet',
};
const target = { regionId: 'NORTH_AMERICA', countryId: 'US', cityId: 'nyc', language: 'English', durationWeeks: 1, startOffset: 0, audience: 'PRESTIGE' as const };

const houseBuy = confirmMarketing(player(), {
    key: 'house-board', ownerKind: 'HOUSE', ownerId: 'house-1', ownerName: 'Northglass', titleId: 'glass-hotel', actionId: 'billboard', creative, target,
});
need(!houseBuy.error, houseBuy.error || 'house buy');
const house = houseBuy.player;
const houseBiz = house.businesses.find(row => row.id === 'house-1')!;
need(house.money === 800_000, 'house buy keeps personal cash');
need(houseBiz.balance < 3_000_000, 'house buy spends house balance');
need(houseBiz.studioState?.productionFund === 9_000_000, 'house buy keeps the production fund');
need(house.ownPlatform?.books?.cash === 4_000_000, 'house buy keeps streaming cash');
need(houseBiz.studioState?.financeLedger?.[0]?.type === 'MARKETING', 'house ledger records the buy');
need((house.marketing?.posts || []).some(post => post.caption.includes('Glass Hotel')), 'house buy writes a post about the title');
const hype = house.commitments[0].projectDetails?.hiddenStats.rawHype || 0;
need(hype > 40, 'house buy raises hype on the picture');
const second = confirmMarketing(house, {
    key: 'house-board', ownerKind: 'HOUSE', ownerId: 'house-1', ownerName: 'Northglass', titleId: 'glass-hotel', actionId: 'billboard', creative, target,
});
need(Boolean(second.error), 'duplicate buy is refused');
need(second.player.businesses.find(row => row.id === 'house-1')?.balance === houseBiz.balance, 'duplicate buy does not charge again');

const empireBuy = confirmMarketing(player(), {
    key: 'empire-reel', ownerKind: 'EMPIRE', ownerId: 'empire', ownerName: 'Lumen Desk', titleId: 'cat-low', actionId: 'reels', creative: { ...creative, socialFormat: 'REEL' }, target,
});
need(!empireBuy.error, empireBuy.error || 'empire buy');
const empire = empireBuy.player;
need(empire.money === 800_000, 'empire buy keeps personal cash');
need((empire.ownPlatform?.books?.cash || 0) < 4_000_000, 'empire buy spends company cash');
need(empire.businesses[0].balance === 3_000_000, 'empire buy leaves the house');
need((empire.ownPlatform?.books?.lines || []).some(line => line.label.includes('Low Tide Club')), 'company ledger names the title');
need((empire.ownPlatform?.marketingDemand || 0) > 0, 'a live streaming buy pulls demand');

const vetoed = player();
vetoed.ownPlatform!.books!.shareholders = [{
    id: 'holder', buyerId: 'buyer', name: 'Kite', kind: 'BUSINESS', pct: 0.1, paid: 1, week: 1, year: 28,
    conditions: [{ kind: 'CONTENT_VETO', label: 'Veto', effect: 'Blocks a large content spend.', vetoAboveUsd: 1_000 }],
}];
const blocked = confirmMarketing(vetoed, {
    key: 'veto', ownerKind: 'EMPIRE', ownerId: 'empire', ownerName: 'Lumen Desk', titleId: 'cat-low', actionId: 'reels', creative, target,
});
need(Boolean(blocked.error), 'a content veto blocks the buy');
need(blocked.player.money === 800_000 && blocked.player.ownPlatform?.books?.cash === 4_000_000, 'a veto spends nothing');

const starved = player();
starved.businesses[0].balance = 10;
starved.money = 5_000_000;
const refused = confirmMarketing(starved, {
    key: 'poor-house', ownerKind: 'HOUSE', ownerId: 'house-1', ownerName: 'Northglass', titleId: 'glass-hotel', actionId: 'premiere', creative, target: { ...target, durationWeeks: 2 },
});
need(Boolean(refused.error), 'a poor house is refused');
need(refused.player.money === 5_000_000 && refused.player.businesses[0].balance === 10, 'a poor house does not spend personal cash');

const badTarget = confirmMarketing(player(), {
    key: 'bad-city', ownerKind: 'HOUSE', ownerId: 'house-1', ownerName: 'Northglass', titleId: 'glass-hotel', actionId: 'billboard', creative,
    target: { ...target, cityId: 'tyo' },
});
need(Boolean(badTarget.error), 'a city outside the region is refused');
need(badTarget.player.money === 800_000 && badTarget.player.businesses[0].balance === 3_000_000, 'invalid targeting spends nothing');

const old = normalizeMarketing({ version: 4, campaigns: [] } as unknown);
need(old.version === 1, 'old desk stays on version 1');

const ticking = house;
const before = ticking.commitments[0].projectDetails!.hiddenStats.marketingHypeAdded || 0;
applyMarketingWeek(ticking);
applyMarketingWeek(ticking);
const after = ticking.commitments[0].projectDetails!.hiddenStats.marketingHypeAdded || 0;
need(after === before, 'a second tick in the same week does not add hype');
need(ticking.money === 800_000, 'ticks do not move personal cash');

const mumbai = priceFlight({ cityIds: ['bom'], channelIds: ['social_feed', 'short_video', 'search_ads', 'creators_live'], weeks: 1, ratio: 1 });
need(mumbai.channels.find(row => row.id === 'social_feed')?.weekly === 178_000, 'Mumbai social feed is $178K');
need(mumbai.channels.find(row => row.id === 'short_video')?.weekly === 223_000, 'Mumbai short video is $223K');
need(mumbai.channels.find(row => row.id === 'search_ads')?.weekly === 111_000, 'Mumbai search is $111K');
need(mumbai.channels.find(row => row.id === 'creators_live')?.weekly === 356_000, 'Mumbai creators are $356K');
need(mumbai.weekly === 868_000, 'four Mumbai channels sum to $868K a week');
const twoCities = priceFlight({ cityIds: ['bom', 'del'], channelIds: ['social_feed'], weeks: 1, ratio: 1 });
need(twoCities.weekly > 178_000, 'a second city raises the social buy');
const dark = priceFlight({ cityIds: ['chi'], channelIds: ['landmark_light'], weeks: 1, ratio: 1 });
need(dark.channels.find(row => row.id === 'landmark_light')?.disabled, 'Chicago cannot book a landmark light show');
const lit = priceFlight({ cityIds: ['nyc', 'dxb'], channelIds: ['landmark_light'], weeks: 1, ratio: 1 });
need(lit.channels.find(row => row.id === 'landmark_light')?.disabled === false && (lit.channels.find(row => row.id === 'landmark_light')?.opening || 0) > 0, 'Empire State and Burj Khalifa can be lit');
need(lit.cities.length === 2 && lit.subscribers > 0 && lit.subscribers < 40_000_000, 'launch subscribers stay inside the cities');
need(priceFlight({ cityIds: ['bom'], channelIds: ['city_screens'], weeks: 1, ratio: 1 }).channels.find(row => row.id === 'city_screens')?.place === 'Mumbai, Lower Parel', 'city screens name the district');

const launchPlayer = player();
launchPlayer.money = 4_000_000;
launchPlayer.ownPlatform = {
    name: 'Sahil',
    stage: 'LIVE',
    subscribers: 1000,
    books: { cash: 5_000_000, lines: [], funding: 'OWN', debt: 0, equitySoldPct: 0, facilityRate: 0.09, pePartner: 'Kestrel', history: [] },
    applications: [],
    selectedCountryIds: ['IN'],
} as typeof launchPlayer.ownPlatform;
const booked = confirmLaunchFlight(launchPlayer, {
    what: 'PLATFORM', cityIds: ['bom'], channelIds: ['social_feed'], creativeId: 'night', trailerId: 'open',
    tagline: 'Open the door.', weeks: 1, ratio: 1,
});
need(!booked.error, `launch books from company cash (${booked.error || 'ok'})`);
need(booked.player.money === 4_000_000, 'launch does not touch personal cash');
need((booked.player.ownPlatform?.books?.cash || 0) < 5_000_000, 'launch reduces company cash');
need((booked.player.ownPlatform?.subscribers || 0) > 1000, 'a live flight adds subscribers');

const waiting = player();
waiting.money = 4_000_000;
waiting.ownPlatform = {
    name: 'Sahil',
    stage: 'BUILD',
    subscribers: 0,
    books: { cash: 8_000_000, lines: [], funding: 'OWN', debt: 0, equitySoldPct: 0, facilityRate: 0.09, pePartner: 'Kestrel', history: [] },
    applications: [],
    selectedCountryIds: ['IN'],
} as typeof waiting.ownPlatform;
const first = confirmLaunchFlight(waiting, {
    what: 'PLATFORM', cityIds: ['bom'], channelIds: ['social_feed'], creativeId: 'night', trailerId: 'open',
    tagline: 'Open the door.', weeks: 2, ratio: 1,
});
const rebook = confirmLaunchFlight(first.player, {
    what: 'PLATFORM', cityIds: ['bom'], channelIds: ['short_video'], creativeId: 'night', trailerId: 'open',
    tagline: 'Open the door.', weeks: 2, ratio: 1,
});
const firstId = first.player.marketing?.launch?.campaignIds?.[0] || '';
need(Boolean(firstId) && (rebook.player.marketing?.launch?.campaignIds || []).includes(firstId), 'a second booking keeps the first flight on the books');
const opening = getAbsoluteWeek(rebook.player.age, rebook.player.currentWeek);
if (rebook.player.ownPlatform) rebook.player.ownPlatform.stage = 'LIVE';
need(Boolean(deliverLaunchOpening(rebook.player, opening)), 'opening night grants the held subscribers');
const released = (rebook.player.marketing?.campaigns || []).filter(row => (rebook.player.marketing?.launch?.campaignIds || []).includes(row.id));
need(released.length >= 2 && released.every(row => row.startAbsolute === opening), 'held campaigns start on opening night');

if (process.exitCode) {
    console.error('player marketing checks failed');
    process.exit(process.exitCode);
}
console.log('player marketing checks passed');
