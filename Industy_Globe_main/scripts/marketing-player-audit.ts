/**
 * Player-level checks. Company books and the house balance move.
 * player.money and the production fund do not.
 */
import type { Player } from '../types';
import { confirmMarketing, applyMarketingWeek } from '../services/marketing/engine';
import { normalizeMarketing } from '../services/marketing/core';

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

if (process.exitCode) {
    console.error('player marketing checks failed');
    process.exit(process.exitCode);
}
console.log('player marketing checks passed');
