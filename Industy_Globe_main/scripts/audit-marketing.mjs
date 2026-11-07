import {
    advanceMarketing,
    buildPoster,
    defaultCreative,
    materializeCampaign,
    normalizeMarketing,
    posterSvg,
    quoteBuy,
    spendForCampaign,
} from '../services/marketing/core.ts';

let failed = 0;
const need = (condition, message) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL ${message}`);
    }
};

const world = {
    regions: [
        { id: 'NORTH_AMERICA', name: 'North America' },
        { id: 'EUROPE', name: 'Europe' },
        { id: 'ASIA', name: 'Asia' },
    ],
    countries: [
        { id: 'US', regionId: 'NORTH_AMERICA', name: 'United States', audienceM: 225, languages: ['English', 'Spanish'] },
        { id: 'GB', regionId: 'EUROPE', name: 'United Kingdom', audienceM: 50, languages: ['English'] },
        { id: 'JP', regionId: 'ASIA', name: 'Japan', audienceM: 80, languages: ['Japanese'] },
    ],
    cities: [
        { id: 'nyc', regionId: 'NORTH_AMERICA', name: 'New York' },
        { id: 'chi', regionId: 'NORTH_AMERICA', name: 'Chicago' },
        { id: 'lon', regionId: 'EUROPE', name: 'London' },
        { id: 'tyo', regionId: 'ASIA', name: 'Tokyo' },
    ],
};

const title = {
    id: 'glass',
    name: 'Glass Hotel',
    genre: 'DRAMA',
    language: 'English',
    cast: [{ name: 'June Pell', salary: 800000 }],
    director: 'Idris Cole',
    banner: 'Northglass',
    statusLine: 'Coming Soon',
    releaseWeek: 20,
    releaseYear: 2026,
    weeksUntil: 6,
    ownerKind: 'HOUSE',
    ownerId: 'house-1',
};

const target = {
    regionId: 'NORTH_AMERICA',
    countryId: 'US',
    cityId: 'nyc',
    language: 'English',
    durationWeeks: 2,
    startOffset: 0,
    audience: 'MASS',
};

const draft = (patch = {}) => ({
    key: 'buy-1',
    ownerKind: 'HOUSE',
    ownerId: 'house-1',
    ownerName: 'Northglass',
    titleId: title.id,
    actionId: 'billboard',
    creative: defaultCreative(),
    target: { ...target },
    ...patch,
    ...(patch.target ? { target: { ...target, ...patch.target } } : {}),
    ...(patch.creative ? { creative: { ...defaultCreative(), ...patch.creative } } : {}),
});

const wallet = () => ({ personal: 900_000, companyCash: 2_000_000, houseBalance: 2_000_000, productionFund: 5_000_000 });

const empire = spendForCampaign(wallet(), 'EMPIRE', 250_000, false);
need(!empire.error, 'empire spend should clear');
need(empire.wallet.companyCash === 1_750_000, 'empire spend leaves company cash');
need(empire.wallet.personal === 900_000, 'empire spend leaves personal cash');
need(empire.wallet.houseBalance === 2_000_000, 'empire spend leaves the house');
need(empire.wallet.productionFund === 5_000_000, 'empire spend leaves the production fund');

const house = spendForCampaign(wallet(), 'HOUSE', 250_000, false);
need(!house.error, 'house spend should clear');
need(house.wallet.houseBalance === 1_750_000, 'house spend leaves the house balance');
need(house.wallet.personal === 900_000, 'house spend leaves personal cash');
need(house.wallet.companyCash === 2_000_000, 'house spend leaves streaming cash');
need(house.wallet.productionFund === 5_000_000, 'house spend leaves the production fund');

const brokeEmpire = spendForCampaign({ ...wallet(), companyCash: 1000 }, 'EMPIRE', 250_000, false);
need(Boolean(brokeEmpire.error), 'short company cash is refused');
need(brokeEmpire.wallet.companyCash === 1000 && brokeEmpire.wallet.personal === 900_000, 'short empire does not move money');

const brokeHouse = spendForCampaign({ ...wallet(), houseBalance: 1000, personal: 9_000_000 }, 'HOUSE', 250_000, false);
need(Boolean(brokeHouse.error), 'short house is refused');
need(brokeHouse.wallet.personal === 9_000_000 && brokeHouse.wallet.houseBalance === 1000 && brokeHouse.wallet.productionFund === 5_000_000, 'short house does not touch personal cash or the fund');

const again = spendForCampaign(wallet(), 'EMPIRE', 250_000, true);
need(Boolean(again.error), 'a charged campaign is refused');
need(again.wallet.companyCash === 2_000_000, 'duplicate charge does not spend');

const fresh = normalizeMarketing(undefined);
need(fresh.version === 1 && fresh.campaigns.length === 0 && Array.isArray(fresh.posts) && Array.isArray(fresh.exposure) && Array.isArray(fresh.records), 'missing desk normalizes');
const messy = normalizeMarketing({
    version: 9,
    campaigns: [{ id: 'drop-me' }, { id: 'keep', titleName: 'Glass Hotel', actionId: 'reels', ownerKind: 'EMPIRE' }],
    posts: null,
    exposure: 'no',
    records: [{ ownerKind: 'HOUSE', titleId: 'glass', spent: 10 }],
});
need(messy.version === 1, 'save version stays 1');
need(messy.campaigns.length === 1 && messy.campaigns[0].actionId === 'reels', 'partial campaign is kept and the broken one dropped');
need(messy.campaigns[0].charged === false && messy.posts.length === 0, 'optional campaign fields are filled');
need(messy.records.length === 1 && messy.records[0].titleName === 'glass', 'records fill a title name');

const bad = [
    ['region', draft({ target: { regionId: 'MARS' } })],
    ['country', draft({ target: { regionId: 'NORTH_AMERICA', countryId: 'JP', cityId: 'nyc' } })],
    ['city', draft({ target: { regionId: 'NORTH_AMERICA', countryId: 'US', cityId: 'tyo' } })],
    ['duration-zero', draft({ target: { durationWeeks: 0 } })],
    ['duration-long', draft({ target: { durationWeeks: 40 } })],
    ['offset', draft({ target: { startOffset: -1 } })],
    ['mall-city', draft({ actionId: 'mall', target: { cityId: undefined } })],
];
bad.forEach(([label, row]) => {
    const quoted = quoteBuy({ draft: row, title, world, campaigns: [], exposure: [], now: 10, castFee: 0, castBooked: false });
    need(Boolean(quoted.error) && !quoted.quote, `invalid targeting ${label} is refused`);
});

const input = (row, exposure = []) => ({ draft: row, title, world, campaigns: [], exposure, now: 10, castFee: 20_000, castBooked: false });
const nyc = quoteBuy(input(draft()));
const chicago = quoteBuy(input(draft({ key: 'chi', target: { cityId: 'chi' } })));
const japan = quoteBuy(input(draft({ key: 'jp', target: { regionId: 'ASIA', countryId: 'JP', cityId: 'tyo', language: 'English' } })));
const prestige = quoteBuy(input(draft({ key: 'pre', target: { audience: 'PRESTIGE' } })));
const youth = quoteBuy(input(draft({ key: 'you', target: { audience: 'YOUTH' } })));
const saturated = quoteBuy(input(draft({ key: 'sat' }), [{ titleId: 'glass', regionId: 'NORTH_AMERICA', category: 'OUTDOOR', heat: 92, lastAbsolute: 9 }]));
const worldBuy = quoteBuy(input(draft({ key: 'world', target: { regionId: 'WORLD', countryId: 'US', cityId: 'nyc' } })));
need(nyc.quote && chicago.quote && nyc.quote.cost > chicago.quote.cost, 'a premium city costs more');
need(japan.quote && nyc.quote && japan.quote.reach < nyc.quote.reach, 'a language mismatch cuts reach');
need(prestige.quote && youth.quote && prestige.quote.hype > youth.quote.hype, 'audience match changes hype');
need(saturated.quote && nyc.quote && saturated.quote.reach < nyc.quote.reach, 'overexposure cuts reach');
need(worldBuy.quote && nyc.quote && worldBuy.quote.cost > nyc.quote.cost, 'a world buy costs more');

const poster = buildPoster(title, defaultCreative());
const svg = decodeURIComponent(posterSvg(poster));
need(svg.includes('Glass Hotel') && svg.includes('June Pell') && svg.includes('Northglass') && svg.includes('Coming Soon'), 'poster art carries title, cast, banner, and status');

const bought = materializeCampaign({ ...input(draft({ target: { startOffset: 2, durationWeeks: 2 } })), quote: nyc.quote, week: 1, year: 28 });
need(bought.status === 'SCHEDULED' && bought.charged, 'a future buy waits');
const same = materializeCampaign({ ...input(draft({ target: { startOffset: 2, durationWeeks: 2 } })), quote: nyc.quote, week: 1, year: 28 });
need(same.id === bought.id, 'the same buy key does not create a second campaign');

let state = { version: 1, campaigns: [bought], posts: [], exposure: [], records: [] };
let step = advanceMarketing(state, bought.startAbsolute - 1, 1, 28, () => 'New York', [], []);
need(step.state.campaigns[0].status === 'SCHEDULED' && step.state.campaigns[0].outcome.appliedWeeks === 0, 'before the start week nothing is delivered');
step = advanceMarketing(step.state, bought.startAbsolute, 3, 28, () => 'New York', [], []);
need(step.state.campaigns[0].status === 'LIVE' && step.state.campaigns[0].outcome.appliedWeeks === 1, 'the start week goes live once');
need(step.state.posts.some(post => post.network === 'FRAME') && step.state.posts.some(post => post.network === 'WIRE'), 'a live buy writes both feeds');
const hype = step.state.campaigns[0].outcome.hype;
const againWeek = advanceMarketing(step.state, bought.startAbsolute, 3, 28, () => 'New York', [], []);
need(againWeek.state.campaigns[0].outcome.hype === hype && againWeek.state.campaigns[0].outcome.appliedWeeks === 1, 'the same week does not deliver twice');
step = advanceMarketing(againWeek.state, bought.endAbsolute, 4, 28, () => 'New York', [], []);
need(step.state.campaigns[0].outcome.appliedWeeks === 2, 'the second week delivers the rest');
step = advanceMarketing(step.state, bought.endAbsolute + 1, 5, 28, () => 'New York', [], []);
need(step.state.campaigns[0].status === 'COMPLETE', 'the buy ends after its window');
need(step.state.version === 1, 'advanced desk stays on version 1');

if (failed) {
    console.error(`${failed} marketing checks failed`);
    process.exit(1);
}
console.log('marketing checks passed');
