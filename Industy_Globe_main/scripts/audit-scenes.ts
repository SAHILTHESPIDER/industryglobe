/**
 * Scene registry and the running-board math.
 * A landmark never borrows another city's name.
 * Extra weeks drain cash and return less. They are not refused for being week 13.
 */
import { CAMPAIGN_CITIES, campaignCity, landmarkFor } from '../services/marketing/launchCatalog.ts';
import { RUN_FORMATS, allCampaignScenes, labelMatchesCity, placeLine, sceneFor } from '../services/marketing/sceneRegistry.ts';
import { extendCost, extendRun, fatigueFactor, readRunBoard, refundForStop, stopRun } from '../services/marketing/campaignRun.ts';
import type { Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic.ts';

let failed = 0;
const need = (condition, message) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL ${message}`);
    }
};

const scenes = allCampaignScenes();
need(scenes.length === RUN_FORMATS.length * CAMPAIGN_CITIES.length, 'every format has a scene in every campaign city');
const ids = new Set(scenes.map(scene => scene.id));
need(ids.size === scenes.length, 'scene ids are unique');

const burj = sceneFor('landmark_light', 'dxb');
need(burj && burj.placeLabel === 'Burj Khalifa' && burj.cityName === 'Dubai', 'Burj Khalifa is Dubai');
need(burj && burj.marquee.includes('DUBAI') && !burj.marquee.includes('MUMBAI'), 'the Burj marquee does not say Mumbai');
need(burj && burj.frame === '1:9' && burj.effect === 'led', 'the tower is a tall LED frame');
need(sceneFor('billboards', 'nyc')?.frame === '3:1', 'the rooftop board is a wide frame');
need(sceneFor('drone', 'par')?.cityName === 'Paris' && sceneFor('drone', 'par')?.effect === 'drone', 'drones play over Paris');
need(sceneFor('building_reveal', 'prg')?.cityName === 'Prague', 'the reveal is on a Prague building');
need(sceneFor('stunt', 'mad')?.cityName === 'Madrid', 'the stunt show is in Madrid');
need(sceneFor('fan_fest', 'bom')?.cityName === 'Mumbai', 'the festival is in Mumbai');
need(sceneFor('city_screens', 'ber')?.venue === 'Alexanderplatz', 'Berlin city screens are Alexanderplatz');
need(sceneFor('mall_screens', 'dxb')?.venue === 'Dubai Mall', 'Dubai mall screens stay in Dubai');

scenes.forEach(scene => need(labelMatchesCity(scene), `label matches ${scene.id}`));
need(!placeLine('landmark_light', ['dxb']).includes('Mumbai'), 'a single Burj buy is not labelled Mumbai');
need(placeLine('landmark_light', ['bom']) === landmarkFor('bom', 'light').name, 'Mumbai light uses Mumbai landmark');
need(placeLine('airport_screens', ['bom', 'del']).startsWith('Mumbai · Mumbai and '), 'many cities keep the first city and a count');
const foreign = sceneFor('landmark_light', 'bom');
need(foreign && !foreign.placeLabel.toLowerCase().includes('burj'), 'Mumbai does not wear the Burj');

need(fatigueFactor(0, 1) === 1, 'a fresh first week is full strength');
need(fatigueFactor(0, 8) < fatigueFactor(0, 2), 'later weeks return less');
need(fatigueFactor(6, 4) < fatigueFactor(0, 4), 'extensions tire the audience further');
need(fatigueFactor(40, 40) > 0, 'returns diminish and do not hit a hard zero');
const one = extendCost(1_000_000, 1, 0);
const four = extendCost(1_000_000, 4, 0);
const later = extendCost(1_000_000, 1, 8);
need(one === 1_000_000 && four === 4_000_000, 'the first extension is the weekly rate');
need(later > one, 'a long buy picks up overtime instead of a cheaper rate');
need(refundForStop(1_000_000, 12, 1, false) === 11_000_000, 'stop refunds the weeks that have not aired');
need(refundForStop(1_000_000, 12, 1, true) === 12_000_000, 'a held flight has aired nothing');
need(refundForStop(1_000_000, 12, 12, false) === 0, 'the last week in progress is spent');

const now = getAbsoluteWeek(28, 10);
const player = (): Player => ({
    age: 28,
    currentWeek: 10,
    money: 500_000,
    name: 'Asha',
    ownPlatform: {
        version: 1,
        name: 'Lumen',
        stage: 'LIVE',
        defineStep: 7,
        buildStep: 3,
        selectedCountryIds: ['US'],
        applications: [],
        identityId: 'pulse',
        storefrontId: 'prestige',
        catalogue: [],
        plans: [],
        revenueLanes: ['SUBSCRIPTION'],
        regions: [],
        cloud: [],
        commissioned: true,
        constructionWeeksLeft: 0,
        weeksLive: 2,
        subscribers: 1000,
        piracyShare: 0,
        enforcement: 10,
        customerPressure: 0,
        rivals: [],
        pulse: { recession: 0, inflation: 0, connectivity: 0.5, fatigue: 0, headline: '' },
        pendingDeal: null,
        closedDeals: [],
        lastWeeklyRevenue: 0,
        lastWeeklyBurn: 0,
        books: { funding: 'OWN', debt: 0, equitySoldPct: 0, facilityRate: 0, pePartner: '', history: [], lines: [], cash: 20_000_000 },
    },
    marketing: {
        version: 1,
        campaigns: [],
        posts: [],
        exposure: [],
        records: [],
        launch: {
            version: 1,
            what: 'TITLE',
            titleId: 'shadow',
            titleName: 'SHADOW',
            cityIds: ['dxb', 'mad', 'par', 'prg', 'bom'],
            channelIds: ['airport_screens', 'landmark_light', 'drone', 'stunt', 'building_reveal', 'fan_fest'],
            channelCities: {
                landmark_light: ['dxb'],
                drone: ['par'],
                stunt: ['mad'],
                building_reveal: ['prg'],
                fan_fest: ['bom'],
                airport_screens: ['bom', 'dxb', 'par'],
            },
            creativeId: 'night',
            trailerId: 'open',
            tagline: 'Tonight',
            weeks: 12,
            weeklyBudget: 2_000_000,
            openingCost: 1_000_000,
            totalCost: 25_000_000,
            reach: 1,
            buzz: 10,
            subscribers: 10_000,
            demand: 0.02,
            cities: [],
            campaignIds: [],
            bookedAbsolute: now,
            held: false,
        },
    },
} as unknown as Player);

const board = readRunBoard(player(), 'EMPIRE', 'empire', 'shadow');
need(board.titleName === 'SHADOW' && board.status === 'RUNNING', 'the board is running');
need(board.week === 1 && board.bookedWeeks === 12, 'week 1 of 12 comes from the flight');
need(board.cards.find(card => card.formatId === 'landmark_light')?.place === 'Burj Khalifa', 'the landmark card names Burj Khalifa');
need(!board.cards.some(card => card.place.includes('Burj') && card.place.includes('Mumbai')), 'no card pairs the Burj with Mumbai');
need(board.cards.find(card => card.formatId === 'stunt')?.place === 'Madrid', 'stunt card is Madrid');
need(board.cards.find(card => card.formatId === 'building_reveal')?.place === 'Prague', 'reveal card is Prague');
need(board.extend1 === extendCost(2_000_000, 1, 0), 'plus one week shows the real cost');

const personal = player().money;
const extended = extendRun(player(), 'EMPIRE', 'empire', 4, 'shadow');
need(!extended.error, extended.error || 'extend succeeds');
need(extended.player.money === personal, 'personal cash does not move');
need(extended.player.ownPlatform.books.cash === 20_000_000 - extendCost(2_000_000, 4, 0), 'company cash pays the four weeks');
const again = readRunBoard(extended.player, 'EMPIRE', 'empire', 'shadow');
need(again.bookedWeeks === 16, 'there is no 12-week cap');
need(again.reachFactor < board.reachFactor, 'the longer buy reaches fewer new people');
const thirteenth = extendRun(extended.player, 'EMPIRE', 'empire', 1, 'shadow');
need(!thirteenth.error && readRunBoard(thirteenth.player, 'EMPIRE', 'empire', 'shadow').bookedWeeks === 17, 'week 17 is for sale');

const stopped = stopRun(extended.player, 'EMPIRE', 'empire', 'shadow');
need(!stopped.error, stopped.error || 'stop succeeds');
need(stopped.player.money === personal, 'a refund does not touch personal cash');
need(stopped.refund === refundForStop(2_000_000, 16, 1, false), 'the refund is the unspent weeks');
need(stopped.player.ownPlatform.books.cash > extended.player.ownPlatform.books.cash, 'the house of the company gets the refund');
need(campaignCity('prg')?.name === 'Prague', 'Prague is on the campaign map');

if (failed) {
    console.error(`${failed} scene checks failed`);
    process.exit(1);
}
console.log('scene registry and running-board math ok');
