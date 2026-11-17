/**
 * Opening night reads the save. Gates are free. A short network can fail.
 * Older saves with no ceremony still normalise.
 */
import type { Player } from '../types';
import { normalizeOwnPlatform } from '../services/ownPlatform/migrate.ts';
import { commitOpening, openingBrief, openingIsReplay, peakChoices, simulateOpening } from '../services/ownPlatform/openingNight.ts';

let failed = 0;
const need = (condition, message) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL ${message}`);
    }
};

const shell = { id: 'p', name: 'Asha', age: 28, currentWeek: 8, money: 400_000, logs: [] } as unknown as Player;
const base = () => {
    const platform = normalizeOwnPlatform({
        name: 'Lumen',
        stage: 'CONSTRUCTING',
        commissioned: true,
        constructionWeeksLeft: 2,
        weeksLive: 0,
        subscribers: 0,
        selectedCountryIds: ['US', 'IN'],
        applications: [
            { countryId: 'US', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: '', acceptedConditions: true },
            { countryId: 'IN', status: 'FILED', weeksLeft: 3, filedWeekAbsolute: 1, note: '', acceptedConditions: false },
        ],
        catalogue: [{ id: 'shadow', source: 'OWNED', title: 'SHADOW', genre: 'Thriller', language: 'English', cost: 0 }],
        regions: [{ regionId: 'NORTH_AMERICA', scout: 0, workhorse: 1, titan: 0 }],
        sites: [{ cityId: 'nyc', scout: 0, workhorse: 1, titan: 0 }],
        cloud: [],
        books: { cash: 9_000_000, lines: [], history: [], funding: 'OWN', debt: 0, equitySoldPct: 0, facilityRate: 0.09, pePartner: '' },
    }, shell);
    return { ...shell, ownPlatform: platform, marketing: { version: 1, campaigns: [], posts: [], exposure: [], records: [], launch: {
        version: 1, what: 'PLATFORM', titleId: 'platform', titleName: 'Lumen', cityIds: ['nyc'], channelIds: ['drone'],
        creativeId: 'night', trailerId: 'open', tagline: 'Tonight', weeks: 4, weeklyBudget: 1000, openingCost: 1000, totalCost: 5000,
        reach: 10, buzz: 50, subscribers: 80000, demand: 0.02, cities: [], campaignIds: [], bookedAbsolute: 1, held: true,
    } } } as unknown as Player;
};

const brief = openingBrief(base());
need(brief.cities.length === 1 && brief.cities[0].name === 'New York', 'online cities come from the racks');
need(brief.networkReady, 'a rack is a network');
need(!brief.clearanceReady, 'a filed market is not cleared');
need(brief.campaignReady, 'a launch flight counts as the campaign');
need(brief.catalogueReady === 1, 'SHADOW is ready');
need(brief.plans.find(row => row.id === 'GATES')?.cost === 0, 'open the gates is free');
const burst = brief.plans.find(row => row.id === 'BURST');
need(burst && burst.cost > 0 && burst.capacityBonus > 0, 'cloud burst has a real cost and adds capacity');
need(brief.plans.find(row => row.id === 'STAGGER')?.peakScale === 0.68, 'stagger lowers the peak');

const smooth = simulateOpening(base(), 'STAGGER');
const crushed = simulateOpening(base(), 'GATES');
need(crushed.peak >= smooth.peak, 'the high case is the harder hour');
need(typeof crushed.held === 'boolean' && crushed.subscribers >= 0 && crushed.playedFirstPct >= 0, 'the ceremony returns numbers');

const broke = base();
broke.ownPlatform.sites = [];
broke.ownPlatform.regions = [{ regionId: 'NORTH_AMERICA', scout: 0, workhorse: 0, titan: 0 }];
broke.ownPlatform.cloud = broke.ownPlatform.cloud.map(row => ({ ...row, racks: 0 }));
const outage = simulateOpening(broke, 'GATES');
need(outage.held === false && outage.outage, 'a dark network does not hold');

const paid = commitOpening(base(), 'GATES');
need(!paid.error && paid.player.money === 400_000, 'gates do not touch personal cash');
need(paid.player.ownPlatform.openingNight?.played === true, 'the ceremony is stored');
need(openingIsReplay(paid.player), 'a played night replays');
const replay = commitOpening(paid.player, 'BURST');
need(!replay.error && replay.player.ownPlatform.books.cash === paid.player.ownPlatform.books.cash, 'a replay does not spend');

const old = normalizeOwnPlatform({ name: 'Old', stage: 'LIVE', weeksLive: 6, subscribers: 10 }, shell);
need(old.openingNight == null, 'an older live save does not grow an opening record');
need(openingIsReplay({ ...shell, ownPlatform: old } as unknown as Player), 'weeks already live count as a replay');
need(peakChoices(base()).length === 3, 'three ways to take the peak');

if (failed) {
    console.error(`${failed} opening checks failed`);
    process.exit(1);
}
console.log('opening night math ok');
