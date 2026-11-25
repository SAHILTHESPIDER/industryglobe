import { MARKET_COUNTRIES, getCountry } from '../services/ownPlatform/catalog';
import { paintedWorldPaths, pointInPath } from '../services/ownPlatform/worldMapPaint';
import { WORLD_PATHS } from '../services/ownPlatform/worldPaths';
import { defaultLocalPrice } from '../services/ownPlatform/fx';
import { identityEffects } from '../services/ownPlatform/identEffects';
import { applyInfraPreset, quoteLaunch, storefrontById, storefrontEffectLine } from '../services/ownPlatform/logic';
import { createOwnPlatform, foundEmpire, migrateOwnPlatformOnLoad, normalizeOwnPlatform } from '../services/ownPlatform/migrate';
import { FOUNDING_CAPITAL_USD, LAUNCH_SEED_STAKE, LAUNCH_SEED_USD, launchSeedBooks } from '../services/ownPlatform/studio';
import { tickOwnPlatform } from '../services/ownPlatform/week';
import { Player } from '../types';

const tuned = ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'GB', 'FR', 'DE', 'ES', 'IT', 'SE', 'NG', 'ZA', 'EG', 'KE', 'IN', 'JP', 'KR', 'ID', 'PH', 'CN', 'AU', 'NZ'];
const needed = ['PK', 'BD', 'TR', 'SA', 'AE', 'VN', 'TH', 'MY', 'SG', 'TW', 'RU', 'NL', 'PL', 'CL', 'PE', 'MA', 'GH'];

const fail = (message: string) => {
    console.error(message);
    process.exitCode = 1;
};

if (MARKET_COUNTRIES.length < 185 || MARKET_COUNTRIES.length > 210) fail(`expected about 190 countries, got ${MARKET_COUNTRIES.length}`);
if (getCountry('US')?.audienceM !== 225) fail('US audience was overwritten');
if (getCountry('IN')?.accessCost !== 22_000_000) fail('India access cost was overwritten');
if (getCountry('NZ')?.audienceM !== 2.4) fail('NZ audience was overwritten');
if (defaultLocalPrice(11, 'IN') !== 184) fail(`India $11 sticker is ${defaultLocalPrice(11, 'IN')}, expected 184`);
if (defaultLocalPrice(11, 'GB') <= 0) fail('UK local price missing');

needed.forEach(id => {
    const country = getCountry(id);
    if (!country) fail(`missing ${id}`);
    else if (country.audienceM <= 0 || country.accessCost <= 0) fail(`${id} has empty numbers`);
});

const tuvalu = getCountry('TV');
const india = getCountry('IN');
const pakistan = getCountry('PK');
const niger = getCountry('NE');
if (!tuvalu || tuvalu.audienceM >= 0.2) fail(`Tuvalu should stay tiny, got ${tuvalu?.audienceM}`);
if (!pakistan || !india || pakistan.audienceM >= india.audienceM) fail('Pakistan should be smaller than tuned India');
if (!niger || niger.audienceM >= 5) fail(`Niger should stay a small market, got ${niger?.audienceM}`);
if (getCountry('SG')?.audienceM && getCountry('SG')!.audienceM > 8) fail('Singapore grew too large');

const codes = new Set<string>();
MARKET_COUNTRIES.forEach(country => {
    if (codes.has(country.id)) fail(`duplicate ${country.id}`);
    codes.add(country.id);
    const local = defaultLocalPrice(11, country.id);
    if (!Number.isFinite(local) || local < 0) fail(`bad local price for ${country.id}`);
});

tuned.forEach(id => {
    if (!getCountry(id)) fail(`tuned country missing ${id}`);
});

const player = {
    id: 'check',
    money: 500_000_000,
    currentWeek: 1,
    age: 30,
    stats: { fame: 10 },
} as Player;
const fresh = createOwnPlatform(player);
if ((fresh.books?.cash || 0) !== 0) fail('a new company is funded before the founding cheque');
if ((fresh.books?.seedStakePct || 0) !== 0) fail('a new company still grants an investor stake');
const poor = { ...player, money: 1_000_000, name: 'Asha' } as Player;
const refused = foundEmpire(poor);
if (!refused.error || refused.player !== poor || poor.ownPlatform) fail('a short founding moved money');
const rich = { ...player, money: 200_000_000, name: 'Asha', finance: { history: [] } } as Player;
const opened = foundEmpire(rich);
if (opened.error) fail(opened.error);
if (opened.player.money !== 200_000_000 - FOUNDING_CAPITAL_USD) fail(`personal cash after founding is ${opened.player.money}`);
if (opened.player.ownPlatform?.books?.cash !== FOUNDING_CAPITAL_USD) fail(`treasury after founding is ${opened.player.ownPlatform?.books?.cash}`);
if ((opened.player.ownPlatform?.books?.seedStakePct || 0) !== 0) fail('founder cheque granted an investor stake');
if (opened.player.ownPlatform?.books?.founderCapitalUsd !== FOUNDING_CAPITAL_USD) fail('founder capital was not recorded');
const twice = foundEmpire(opened.player);
if (twice.player !== opened.player || twice.player.money !== opened.player.money) fail('founding charged a company that was already open');
const seededSave = createOwnPlatform(player);
seededSave.books = launchSeedBooks(player);
if (seededSave.books.cash !== LAUNCH_SEED_USD || seededSave.books.seedStakePct !== LAUNCH_SEED_STAKE) fail('historical seed books changed');
const veteran = { ...player, money: 80_000_000, name: 'Asha', flags: { ownPlatformUnlocked: true }, ownPlatform: seededSave } as Player;
const untouched = foundEmpire(veteran);
if (untouched.player !== veteran || untouched.player.money !== 80_000_000) fail('an unlocked save was charged');
if (untouched.player.ownPlatform?.books?.cash !== LAUNCH_SEED_USD) fail('an unlocked treasury changed');
if (untouched.player.ownPlatform?.books?.seedStakePct !== LAUNCH_SEED_STAKE) fail('an old seed stake changed');
if (untouched.player.ownPlatform?.books?.founderCapitalUsd) fail('an old save was marked as a new founding');
const paidOldFee = createOwnPlatform(player);
paidOldFee.stage = 'LIVE';
paidOldFee.weeksLive = 4;
paidOldFee.books = { ...(paidOldFee.books || seededSave.books!), cash: 2_000_000, seedStakePct: 0, seedPartner: '' };
const oldFeePlayer = { ...player, money: 12_000_000, name: 'Asha', ownPlatform: paidOldFee } as Player;
const migrated = migrateOwnPlatformOnLoad(oldFeePlayer);
if (migrated.money !== 12_000_000 || migrated.ownPlatform?.books?.cash !== 2_000_000) fail('migration moved cash on an opened company');
if (!migrated.flags?.ownPlatformUnlocked) fail('an opened company was not recognized');
if (migrated.ownPlatform?.books?.founderCapitalUsd) fail('migration invented a founding cheque');
const migratedAgain = foundEmpire(migrated);
if (migratedAgain.player.money !== 12_000_000 || migratedAgain.player.ownPlatform?.books?.cash !== 2_000_000) fail('a migrated company was charged');
const legacy = normalizeOwnPlatform({
    name: 'Old Stream',
    stage: 'BUILD',
    selectedCountryIds: ['US', 'IN'],
    regions: [{ regionId: 'NORTH_AMERICA', scout: 2, workhorse: 1, titan: 0 }, { regionId: 'ASIA', scout: 0, workhorse: 3, titan: 1 }],
    identityId: 'signal',
    storefrontId: 'billboard',
    plans: [{ id: 'plan-standard', name: 'Standard', monthlyUsd: 11, ads: false, downloads: true, quality: 'HD', screens: 2 }],
} as never, player);
if (legacy.regions.find(row => row.regionId === 'NORTH_AMERICA')?.scout !== 2) fail('old server counts were rewritten');
if (legacy.infraPreset) fail('old save grew an infra preset');
if (legacy.name !== 'Old Stream') fail('name lost');

const withMarkets = {
    ...fresh,
    selectedCountryIds: ['US', 'IN'],
    plans: [
        ...fresh.plans,
        { id: 'plus', name: 'Plus', monthlyUsd: 18, ads: false, downloads: true, quality: '4K' as const, screens: 4 },
    ],
};
const owned = applyInfraPreset(withMarkets, 'OWN');
const us = owned.regions.find(row => row.regionId === 'NORTH_AMERICA');
if (!us || us.scout + us.workhorse + us.titan <= 0) fail('own-it-all placed no servers');
if (owned.cloud.some(order => order.racks > 0)) fail('own-it-all kept rented racks');
if (owned.regionCoverage?.NORTH_AMERICA !== 100) fail('own-it-all coverage was not 100');
const tinyBuilt = applyInfraPreset({ ...fresh, selectedCountryIds: ['TV', 'NR', 'PW'] }, 'OWN');
const tinyRegion = tinyBuilt.regions.find(row => row.regionId === 'OCEANIA');
const tinyBoxes = (tinyRegion?.scout || 0) + (tinyRegion?.workhorse || 0) + (tinyRegion?.titan || 0);
if (tinyBoxes < 1) fail('Tuvalu, Nauru, and Palau got no servers');
const tinyQuote = quoteLaunch({ ...player, ownPlatform: tinyBuilt });
if (tinyQuote.regionRows.some(row => row.countries > 0 && row.servedPct < 0.35)) fail('tiny markets still fail the capacity check');

const billboard = storefrontEffectLine(storefrontById('billboard'));
if (!billboard.includes('+12%') || !billboard.includes('new viewers')) fail(`billboard line unexpected: ${billboard}`);
const hearth = identityEffects('hearth');
const voltage = identityEffects('voltage');
const linen = identityEffects('linen');
const signal = identityEffects('signal');
if (hearth.familyRetention <= 1 || voltage.youthGrowth <= 1 || linen.premiumLift <= 1) fail('ident effects missing');
if (signal.familyRetention !== 1 || signal.youthGrowth !== 1) fail('signal should stay neutral');

const built = applyInfraPreset(withMarkets, 'BALANCED');
const quoteMachine = quoteLaunch({ ...player, ownPlatform: { ...built, identId: 'machine', storefrontId: 'editorial' } });
const quoteAscent = quoteLaunch({ ...player, ownPlatform: { ...built, identId: 'ascent', storefrontId: 'editorial' } });
const quotePulse = quoteLaunch({ ...player, ownPlatform: { ...built, identId: 'pulse', storefrontId: 'editorial' } });
const quoteAnalog = quoteLaunch({ ...player, ownPlatform: { ...built, identId: 'analog', storefrontId: 'editorial' } });
if (!(quoteAscent.households > quoteMachine.households)) fail('ascent did not grow the audience');
if (!(quoteAnalog.households < quotePulse.households)) fail('analog should not out-grow a stay-rate ident');
if (!(quoteAnalog.forecastWeeklyRevenue > quotePulse.forecastWeeklyRevenue)) fail('analog did not lift premium revenue');

const painted = paintedWorldPaths();
const indexOf = (id: string) => painted.findIndex(row => row.id === id);
const southAfrica = painted.find(row => row.id === 'ZA');
const lesotho = painted.find(row => row.id === 'LS');
if (!southAfrica?.holed || !southAfrica.d.includes(WORLD_PATHS.LS)) fail('South Africa does not cut a hole for Lesotho');
if (!(indexOf('LS') > indexOf('ZA'))) fail('Lesotho is still painted under South Africa');
if (!(indexOf('SZ') > indexOf('ZA'))) fail('Eswatini is still painted under South Africa');
if (!(indexOf('GM') > indexOf('SN'))) fail('Gambia is still painted under Senegal');
const lesothoInside = (() => {
    const matcher = /(\d+) (\d+)/g;
    const pts: [number, number][] = [];
    let match: RegExpExecArray | null = matcher.exec(WORLD_PATHS.LS);
    while (match) {
        pts.push([Number(match[1]), Number(match[2])]);
        match = matcher.exec(WORLD_PATHS.LS);
    }
    const minX = Math.min(...pts.map(point => point[0]));
    const maxX = Math.max(...pts.map(point => point[0]));
    const minY = Math.min(...pts.map(point => point[1]));
    const maxY = Math.max(...pts.map(point => point[1]));
    for (let y = minY; y <= maxY; y += 0.25) {
        for (let x = minX; x <= maxX; x += 0.25) {
            if (pointInPath(x, y, WORLD_PATHS.LS)) return [x, y] as const;
        }
    }
    return null;
})();
if (!lesothoInside) fail('could not find a point inside Lesotho');
else if (!pointInPath(lesothoInside[0], lesothoInside[1], lesotho?.d || '')) fail('Lesotho path missed its own interior');
else if (pointInPath(lesothoInside[0], lesothoInside[1], southAfrica.d)) fail('Lesotho interior is still filled by South Africa');
if (WORLD_PATHS.SM || WORLD_PATHS.VA) fail('San Marino and Vatican should stay dots, painted after the coastlines');

if (MARKET_COUNTRIES.length !== 197) fail(`expected 197 countries, got ${MARKET_COUNTRIES.length}`);
MARKET_COUNTRIES.forEach(country => {
    if (!country.subRegion) fail(`${country.id} missing sub-region`);
    if (!country.currency) fail(`${country.id} missing currency`);
    if (!(country.populationM && country.populationM > 0)) fail(`${country.id} missing population`);
    if (!country.languages.length) fail(`${country.id} missing languages`);
});
if (getCountry('US')?.subRegion !== 'United States') fail('US sub-region changed');
if (getCountry('US')?.populationM !== 328) fail('US population was overwritten');
if (getCountry('PK')?.subRegion !== 'South Asia') fail(`Pakistan sub-region ${getCountry('PK')?.subRegion}`);
if (getCountry('FR')?.audienceM !== 32) fail('France audience was overwritten');

const pricey = normalizeOwnPlatform({
    plans: [{ id: 'p', name: 'Huge', monthlyUsd: 250, ads: false, downloads: true, quality: 'HD', screens: 2 }],
} as never, player);
if (pricey.plans[0]?.monthlyUsd !== 100) fail(`price cap became ${pricey.plans[0]?.monthlyUsd}`);
const cheap = normalizeOwnPlatform({
    plans: [{ id: 'p', name: 'Tiny', monthlyUsd: 0.4, ads: false, downloads: true, quality: 'HD', screens: 2 }],
} as never, player);
if (cheap.plans[0]?.monthlyUsd !== 0.99) fail(`price floor became ${cheap.plans[0]?.monthlyUsd}`);
const explicitZero = normalizeOwnPlatform({
    plans: [{ id: 'p', name: 'Zero', monthlyUsd: 0, ads: false, downloads: true, quality: 'HD', screens: 2 }],
} as never, player);
if (explicitZero.plans[0]?.monthlyUsd !== 0) fail('explicit zero was rewritten');
const kept = normalizeOwnPlatform({
    plans: [{ id: 'plan-standard', name: 'Standard', monthlyUsd: 11, ads: false, downloads: true, quality: 'HD', screens: 2 }],
    name: 'Old Stream',
} as never, player);
if (kept.plans[0]?.monthlyUsd !== 11) fail('standard price moved');
if (kept.localisations) fail('old save grew a localisation list');

const france = applyInfraPreset({ ...fresh, selectedCountryIds: ['FR'] }, 'BALANCED');
const bareQuote = quoteLaunch({ ...player, ownPlatform: france });
const dubbedQuote = quoteLaunch({
    ...player,
    ownPlatform: { ...france, localisations: [{ countryId: 'FR', subtitles: 'OFF', dub: 'FULL' }] },
});
if (!(dubbedQuote.households > bareQuote.households)) fail(`dub did not grow France (${bareQuote.households} -> ${dubbedQuote.households})`);
if (!(dubbedQuote.weeklyBurn > bareQuote.weeklyBurn)) fail('dub did not add a weekly bill');
const introQuote = quoteLaunch({
    ...player,
    ownPlatform: { ...france, plans: [{ ...france.plans[0], introDiscountPct: 50, introWeeks: 4 }] },
});
if (!(introQuote.forecastWeeklyRevenue < bareQuote.forecastWeeklyRevenue)) fail('intro offer did not lower revenue');
const freeQuote = quoteLaunch({
    ...player,
    ownPlatform: {
        ...france,
        revenueLanes: ['SUBSCRIPTION', 'ADVERTISING'],
        plans: [
            ...france.plans,
            { id: 'free', name: 'Free', monthlyUsd: 0, ads: true, freeWithAds: true, adIntervalMin: 5 as const, downloads: false, quality: 'SD' as const, screens: 1 },
        ],
    },
});
if (!(freeQuote.revenueParts.ads > 0)) fail('free with ads earned no ad revenue');
const oldAds = quoteLaunch({ ...player, ownPlatform: { ...france, revenueLanes: ['SUBSCRIPTION', 'ADVERTISING'] } });
if (!(oldAds.forecastWeeklyRevenue > bareQuote.forecastWeeklyRevenue)) fail('older ad lane stopped paying');

const liveState = {
    ...applyInfraPreset({
        ...fresh,
        selectedCountryIds: ['FR'],
        catalogue: [{ id: 'night', source: 'OWNED' as const, title: 'Night Train', genre: 'Drama', language: 'French', cost: 0 }],
    }, 'BALANCED'),
    stage: 'LIVE' as const,
    applications: [{ countryId: 'FR', status: 'APPROVED' as const, weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: false }],
    localisations: [{ countryId: 'FR', subtitles: 'MAIN' as const, dub: 'MAIN' as const }],
    plans: [{ ...fresh.plans[0], introDiscountPct: 20, introWeeks: 4, ads: true, adIntervalMin: 10 as const }],
    revenueLanes: ['SUBSCRIPTION' as const, 'ADVERTISING' as const, 'RENTAL' as const, 'PURCHASE' as const, 'DAY_PASS' as const],
    passes: { hourUsd: 1.99, dayUsd: 4.99 },
    titleStore: { rentUsd: 3.99, buyUsd: 14.99 },
};
const livePlayer = { ...player, ownPlatform: liveState, age: 30, currentWeek: 2 };
const personalBefore = livePlayer.money;
const openingCash = livePlayer.ownPlatform?.books?.cash || 0;
const week = tickOwnPlatform(livePlayer, 100);
if (week.transactions.length) fail(`platform week wrote ${week.transactions.length} personal transactions`);
if (livePlayer.money !== personalBefore) fail('personal cash changed during a platform week');
const expectedCash = openingCash + (livePlayer.ownPlatform?.lastWeeklyRevenue || 0) - (livePlayer.ownPlatform?.lastWeeklyBurn || 0);
if ((livePlayer.ownPlatform?.books?.cash || 0) !== expectedCash) fail(`company cash ${livePlayer.ownPlatform?.books?.cash} expected ${expectedCash}`);
if (!(expectedCash !== 0 || (livePlayer.ownPlatform?.lastWeeklyRevenue || 0) > 0)) fail('company books did not record the week');

if (process.exitCode) {
    console.error('market checks failed');
} else {
    console.log(`ok ${MARKET_COUNTRIES.length} countries · India sticker ${defaultLocalPrice(11, 'IN')} · billboard ${billboard} · Lesotho hole`);
}
