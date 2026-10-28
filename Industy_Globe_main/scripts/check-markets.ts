import { MARKET_COUNTRIES, getCountry } from '../services/ownPlatform/catalog';
import { paintedWorldPaths, pointInPath } from '../services/ownPlatform/worldMapPaint';
import { WORLD_PATHS } from '../services/ownPlatform/worldPaths';
import { defaultLocalPrice } from '../services/ownPlatform/fx';
import { identityEffects } from '../services/ownPlatform/identEffects';
import { applyInfraPreset, quoteLaunch, storefrontById, storefrontEffectLine } from '../services/ownPlatform/logic';
import { createOwnPlatform, normalizeOwnPlatform } from '../services/ownPlatform/migrate';
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

const billboard = storefrontEffectLine(storefrontById('billboard'));
if (!billboard.includes('+12%') || !billboard.includes('new viewers')) fail(`billboard line unexpected: ${billboard}`);
const hearth = identityEffects('hearth');
const voltage = identityEffects('voltage');
const linen = identityEffects('linen');
const signal = identityEffects('signal');
if (hearth.familyRetention <= 1 || voltage.youthGrowth <= 1 || linen.premiumLift <= 1) fail('ident effects missing');
if (signal.familyRetention !== 1 || signal.youthGrowth !== 1) fail('signal should stay neutral');

const built = applyInfraPreset(withMarkets, 'BALANCED');
const quoteBase = quoteLaunch({ ...player, ownPlatform: { ...built, identityId: 'signal', storefrontId: 'editorial' } });
const quoteVoltage = quoteLaunch({ ...player, ownPlatform: { ...built, identityId: 'voltage', storefrontId: 'editorial' } });
const quoteLinen = quoteLaunch({ ...player, ownPlatform: { ...built, identityId: 'linen', storefrontId: 'editorial' } });
if (!(quoteVoltage.households > quoteBase.households)) fail('voltage did not grow the audience');
if (!(quoteLinen.forecastWeeklyRevenue > quoteBase.forecastWeeklyRevenue)) fail('linen did not lift premium revenue');

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

if (process.exitCode) {
    console.error('market checks failed');
} else {
    console.log(`ok ${MARKET_COUNTRIES.length} countries · India sticker ${defaultLocalPrice(11, 'IN')} · billboard ${billboard} · Lesotho hole`);
}
