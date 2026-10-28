import {
    AudienceMode,
    CataloguePick,
    CloudOrder,
    InfraPresetId,
    LaunchRegionId,
    OwnPlatformState,
    Player,
    RegionBuild,
    RevenueLane,
    StandingOfferTerms,
} from '../../types';
import {
    CAMPAIGN_CHANNELS,
    CLOUD_PROVIDERS,
    DEAL_BIDDERS,
    DealBidder,
    FESTIVALS,
    getCountry,
    getRegion,
    IDENTITY_PRESETS,
    LAUNCH_REGIONS,
    LICENCE_SHELF,
    MARKET_COUNTRIES,
    MarketCountry,
    REGION_CITIES,
    SERVER_CLASSES,
    ServerClass,
    STOREFRONTS,
    hashString,
} from './catalog';
import { planUsdInCountry } from './fx';
import { identityEffects } from './identEffects';
import { getAbsoluteWeek } from '../legacyLogic';
import { releaseWeekLabel, releaseWeekParts, titleIsLive, clampReleaseOffset } from './weeks';

export const BUILD_WEEKS = 15;
export const RESERVE_WEEKS = 6;
export const REVENUE_LANES: RevenueLane[] = ['SUBSCRIPTION', 'ADVERTISING', 'RENTAL', 'PURCHASE', 'PREMIUM', 'DAY_PASS', 'SPONSORSHIP'];

export interface RegionQuote {
    regionId: LaunchRegionId;
    name: string;
    countries: number;
    nightDemand: number;
    capacity: number;
    servedPct: number;
    onceUsd: number;
    weeklyUsd: number;
    scouts: number;
    workhorses: number;
    titans: number;
}

export interface LaunchQuote {
    construction: number;
    deposits: number;
    access: number;
    licences: number;
    reserve: number;
    dueNow: number;
    weeklyOwn: number;
    weeklyRent: number;
    weeklyBurn: number;
    breakEvenWeek: number | null;
    runwayWeeks: number;
    leftAfter: number;
    energyMwh: number;
    sustainability: number;
    reputation: number;
    capacity: number;
    nightDemand: number;
    servedPct: number;
    households: number;
    forecastWeeklyRevenue: number;
    piracyShare: number;
    marketingCeiling: number;
    marketingReady: boolean;
    regionRows: RegionQuote[];
    blockers: string[];
    ownSeries: number[];
    rentSeries: number[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Opening-night concurrent streams. Audience is millions of people; only a thin slice shows up at once. */
const nightDemand = (audienceM: number) => audienceM * 280;

const serverById = (id: ServerClass['id']): ServerClass => SERVER_CLASSES.find(row => row.id === id) || SERVER_CLASSES[0];

export const selectedCountries = (state: OwnPlatformState): MarketCountry[] =>
    state.selectedCountryIds.map(id => getCountry(id)).filter((row): row is MarketCountry => Boolean(row));

export const selectedRegionIds = (state: OwnPlatformState): LaunchRegionId[] => {
    const ids = new Set<LaunchRegionId>();
    selectedCountries(state).forEach(country => ids.add(country.regionId));
    return LAUNCH_REGIONS.map(region => region.id).filter(id => ids.has(id));
};

export const syncRegions = (state: OwnPlatformState): OwnPlatformState => {
    const needed = selectedRegionIds(state);
    const regions: RegionBuild[] = needed.map(regionId => {
        const existing = state.regions.find(row => row.regionId === regionId);
        return existing || { regionId, scout: 0, workhorse: 0, titan: 0 };
    });
    const regionCoverage = state.regionCoverage
        ? Object.fromEntries(Object.entries(state.regionCoverage).filter(([regionId]) => needed.includes(regionId as LaunchRegionId)))
        : undefined;
    return { ...state, regions, regionCoverage };
};

const cloudCapacity = (cloud: CloudOrder[]) => cloud.reduce((sum, order) => {
    const provider = CLOUD_PROVIDERS.find(row => row.id === order.providerId);
    if (!provider) return sum;
    return sum + Math.max(0, order.racks) * provider.capacityPerRack;
}, 0);

const cloudWeekly = (cloud: CloudOrder[]) => cloud.reduce((sum, order) => {
    const provider = CLOUD_PROVIDERS.find(row => row.id === order.providerId);
    if (!provider) return sum;
    return sum + Math.max(0, order.racks) * provider.weeklyPerRack;
}, 0);

const regionCapacity = (region: RegionBuild) =>
    region.scout * serverById('SCOUT').capacity
    + region.workhorse * serverById('WORKHORSE').capacity
    + region.titan * serverById('TITAN').capacity;

const regionOnce = (region: RegionBuild) =>
    region.scout * serverById('SCOUT').onceUsd
    + region.workhorse * serverById('WORKHORSE').onceUsd
    + region.titan * serverById('TITAN').onceUsd;

const regionWeekly = (region: RegionBuild) =>
    region.scout * serverById('SCOUT').weeklyUsd
    + region.workhorse * serverById('WORKHORSE').weeklyUsd
    + region.titan * serverById('TITAN').weeklyUsd;

const regionEnergy = (region: RegionBuild) =>
    region.scout * serverById('SCOUT').energyMwh
    + region.workhorse * serverById('WORKHORSE').energyMwh
    + region.titan * serverById('TITAN').energyMwh;

/** Matches the Standard plan sticker. Used when a saved price is missing or not a real number. */
export const STANDARD_PLAN_USD = 11;

const finiteNumber = (value: unknown, fallback: number) => {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : fallback;
};

/** USD anchor for one plan. A missing or NaN sticker becomes the standard $11, never NaN. */
export const planAnchorUsd = (plan: { monthlyUsd?: number } | undefined): number =>
    Math.max(0, finiteNumber(plan?.monthlyUsd, STANDARD_PLAN_USD));

export const averageUsdInCountry = (state: OwnPlatformState, countryId: string): number => {
    if (!state.plans.length) return 0;
    const total = state.plans.reduce((sum, plan) => {
        const usd = planUsdInCountry(plan, countryId, state.fxRates);
        return sum + (Number.isFinite(usd) ? Math.max(0, usd) : 0);
    }, 0);
    const average = total / state.plans.length;
    return Number.isFinite(average) ? average : 0;
};

export const averagePlanPrice = (state: OwnPlatformState): number => {
    if (!state.plans.length) return 0;
    const anchor = state.plans.reduce((sum, plan) => sum + planAnchorUsd(plan), 0) / state.plans.length;
    const countries = selectedCountries(state);
    if (!countries.length) return finiteNumber(anchor, STANDARD_PLAN_USD);
    const weight = countries.reduce((sum, country) => sum + Math.max(0, finiteNumber(country.audienceM, 0)), 0);
    if (!(weight > 0)) return finiteNumber(anchor, STANDARD_PLAN_USD);
    const weighted = countries.reduce((sum, country) => {
        const usd = averageUsdInCountry(state, country.id);
        const audience = Math.max(0, finiteNumber(country.audienceM, 0));
        return sum + finiteNumber(usd, 0) * audience;
    }, 0) / weight;
    return finiteNumber(weighted, finiteNumber(anchor, STANDARD_PLAN_USD));
};

export const formatAveragePlanPrice = (state: OwnPlatformState): string => {
    const price = averagePlanPrice(state);
    return Number.isFinite(price) ? `$${price.toFixed(0)}` : `$${STANDARD_PLAN_USD}`;
};

/** Equal mix unless a premium lift (Linen) pushes weight onto the expensive plan. Household count stays put. */
export const blendedPlanUsd = (state: OwnPlatformState, countryId: string, lift: number): number => {
    const plain = averageUsdInCountry(state, countryId);
    if (!(lift > 1) || state.plans.length < 2) return plain;
    const prices = state.plans.map(plan => {
        const usd = planUsdInCountry(plan, countryId, state.fxRates);
        return Number.isFinite(usd) ? Math.max(0, usd) : 0;
    });
    const max = Math.max(...prices);
    const baseWeights = state.plans.map((plan, index) => {
        const top = prices[index] >= max - 0.05 && prices.some(price => price < max - 0.5);
        const shaped = plan.quality === '4K' || (plan.screens >= 4 && !plan.ads);
        return top || shaped ? lift : 1;
    });
    const topIndex = prices.indexOf(max);
    const weights = baseWeights.every(weight => weight === 1) && topIndex >= 0
        ? baseWeights.map((weight, index) => (index === topIndex ? lift : weight))
        : baseWeights;
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const blended = prices.reduce((sum, price, index) => sum + price * weights[index], 0) / weightSum;
    return Number.isFinite(blended) ? blended : plain;
};

export const signedPct = (multiplier: number): string => {
    const pct = Math.round((multiplier - 1) * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
};

export const storefrontEffectLine = (layout: { discovery: number; retention: number }): string =>
    `${signedPct(layout.discovery)} new viewers, ${signedPct(layout.retention)} retention`;

const liveCatalogue = (state: OwnPlatformState) => state.catalogue.filter(title => titleIsLive(title.releaseWeekOffset));

const languageCoverage = (state: OwnPlatformState, country: MarketCountry): number => {
    const storefront = STOREFRONTS.find(row => row.id === state.storefrontId);
    const languages = new Set(liveCatalogue(state).map(title => title.language));
    if (languages.size === 0) return 0.2;
    const matched = country.languages.reduce((sum, language) => (
        languages.has(language.name) || (language.name !== 'English' && languages.has('English') && language.share < 20)
            ? sum + language.share
            : sum
    ), 0);
    const share = clamp(matched / 100, 0, 1);
    const floor = 0.28 + (storefront?.localBoost || 0);
    return clamp(Math.max(share, languages.has('English') ? floor : 0.15), 0.1, 1);
};

export const countryPiracy = (state: OwnPlatformState, country: MarketCountry): number => {
    const price = averageUsdInCountry(state, country.id);
    let piracy = 0.06;
    if (price <= 0) piracy += 0.05;
    else if (price > country.affordability * 1.6) piracy += 0.16;
    else if (price > country.affordability) piracy += 0.08;
    piracy += (1 - country.paymentEase) * 0.18;
    if (liveCatalogue(state).length < 4) piracy += 0.08;
    piracy += (1 - languageCoverage(state, country)) * 0.16;
    const rightsGap = liveCatalogue(state).some(title => title.language === country.languages[0]?.name) ? 0 : 0.06;
    piracy += rightsGap;
    piracy -= (state.enforcement / 100) * 0.14;
    const share = clamp(piracy, 0.02, 0.72);
    return Number.isFinite(share) ? share : 0.06;
};

const approvedCountries = (state: OwnPlatformState): MarketCountry[] => selectedCountries(state).filter(country => {
    const application = state.applications.find(row => row.countryId === country.id);
    if (!application) return false;
    if (application.status === 'APPROVED') return true;
    return application.status === 'CONDITIONS' && application.acceptedConditions;
});

export const quoteLaunch = (player: Player): LaunchQuote => {
    const state = player.ownPlatform;
    const empty: LaunchQuote = {
        construction: 0, deposits: 0, access: 0, licences: 0, reserve: 0, dueNow: 0,
        weeklyOwn: 0, weeklyRent: 0, weeklyBurn: 0, breakEvenWeek: null, runwayWeeks: 0,
        leftAfter: player.money, energyMwh: 0, sustainability: 70, reputation: 50,
        capacity: 0, nightDemand: 0, servedPct: 0, households: 0, forecastWeeklyRevenue: 0,
        piracyShare: 0, marketingCeiling: 0, marketingReady: false, regionRows: [],
        blockers: ['Open the launch first.'], ownSeries: [], rentSeries: [],
    };
    if (!state) return empty;

    const countries = selectedCountries(state);
    const opened = approvedCountries(state);
    const footprint = opened.length ? opened : countries;
    const totalNight = footprint.reduce((sum, country) => sum + nightDemand(country.audienceM), 0);
    const totalMachine = state.regions.reduce((sum, region) => sum + regionCapacity(region), 0);
    const extraCloud = cloudCapacity(state.cloud);
    const totalCapacity = totalMachine + extraCloud;

    const regionRows: RegionQuote[] = state.regions.map(region => {
        const inRegion = footprint.filter(country => country.regionId === region.regionId);
        const night = inRegion.reduce((sum, country) => sum + nightDemand(country.audienceM), 0);
        const share = totalNight > 0 ? night / totalNight : 0;
        const capacity = regionCapacity(region) + extraCloud * share;
        return {
            regionId: region.regionId,
            name: getRegion(region.regionId).name,
            countries: inRegion.length,
            nightDemand: night,
            capacity,
            servedPct: night <= 0 ? 1 : clamp(capacity / night, 0, 1),
            onceUsd: regionOnce(region),
            weeklyUsd: regionWeekly(region) + cloudWeekly(state.cloud) * share,
            scouts: region.scout,
            workhorses: region.workhorse,
            titans: region.titan,
        };
    });

    const construction = state.regions.reduce((sum, region) => sum + regionOnce(region), 0);
    const deposits = Math.round(construction * 0.12);
    const access = opened.reduce((sum, country) => {
        const application = state.applications.find(row => row.countryId === country.id);
        const premium = application?.acceptedConditions ? 1.15 : 1;
        return sum + Math.round(country.accessCost * premium);
    }, 0);
    const licences = state.catalogue.reduce((sum, title) => sum + (title.source === 'LICENCE' ? title.cost : 0), 0);
    const weeklyMachines = state.regions.reduce((sum, region) => sum + regionWeekly(region), 0);
    const weeklyCloud = cloudWeekly(state.cloud);
    const weeklyOwn = weeklyMachines + weeklyCloud;
    const weeklyRent = totalCapacity <= 0 ? 0 : Math.round((totalCapacity / 18_000) * 140_000);
    const reserve = weeklyOwn * RESERVE_WEEKS;
    const dueNow = construction + deposits + access + licences + reserve;
    const savings = weeklyRent - weeklyOwn;
    const breakEvenWeek = construction <= 0 || savings <= 0 ? null : Math.ceil(construction / savings);
    const leftAfter = player.money - dueNow;
    const runwayWeeks = weeklyOwn <= 0 ? (leftAfter > 0 ? 999 : 0) : Math.max(0, Math.floor(leftAfter / weeklyOwn));

    const energyMwh = Math.round(
        state.regions.reduce((sum, region) => sum + regionEnergy(region), 0)
        + state.cloud.reduce((sum, order) => {
            const provider = CLOUD_PROVIDERS.find(row => row.id === order.providerId);
            return sum + (provider ? order.racks * provider.energyPerRack : 0);
        }, 0)
    );
    const titanCount = state.regions.reduce((sum, region) => sum + region.titan, 0);
    const machineCount = state.regions.reduce((sum, region) => sum + region.scout + region.workhorse + region.titan, 0) || 1;
    const sustainability = clamp(Math.round(78 - titanCount * 4 - energyMwh / 40 + (weeklyCloud > weeklyMachines ? 6 : 0)), 5, 96);
    const localHit = opened.reduce((sum, country) => sum + (languageCoverage(state, country) > 0.55 ? 4 : 0), 0);
    const reputation = clamp(Math.round(48 + sustainability * 0.25 + localHit + Math.min(20, liveCatalogue(state).length)), 1, 99);

    const storefront = STOREFRONTS.find(row => row.id === state.storefrontId);
    const ident = identityEffects(state.identityId);
    const discovery = (storefront?.discovery ?? 1) * ident.youthGrowth;
    const retention = (storefront?.retention ?? 1) * ident.familyRetention;
    let reached = 0;
    let paid = 0;
    let piracyWeight = 0;
    footprint.forEach(country => {
        const row = regionRows.find(region => region.regionId === country.regionId);
        const served = row?.servedPct ?? 0;
        const viewers = country.audienceM * 1_000_000 * 0.025 * served * languageCoverage(state, country) * discovery;
        const piracy = countryPiracy(state, country);
        reached += viewers;
        paid += viewers * (1 - piracy);
        piracyWeight += viewers * piracy;
    });
    const piracyShareRaw = reached > 0 ? piracyWeight / reached : 0;
    const piracyShare = Number.isFinite(piracyShareRaw) ? piracyShareRaw : 0;
    const laneBoost = 1 + Math.max(0, state.revenueLanes.length - 1) * 0.04;
    const adBoost = state.revenueLanes.includes('ADVERTISING') ? 1.08 : 1;
    const fatigue = 1 - (state.pulse?.fatigue || 0) * 0.25;
    const recession = 1 - (state.pulse?.recession || 0) * 0.2;
    const conversionFor = (usd: number) => clamp(0.035 * retention * laneBoost * fatigue * recession * (usd > 18 ? 0.72 : 1), 0.01, 0.22);
    let households = 0;
    let monthly = 0;
    footprint.forEach(country => {
        const row = regionRows.find(region => region.regionId === country.regionId);
        const served = row?.servedPct ?? 0;
        const viewers = country.audienceM * 1_000_000 * 0.025 * served * languageCoverage(state, country) * discovery;
        const piracy = countryPiracy(state, country);
        const paying = viewers * (1 - piracy);
        const usd = averageUsdInCountry(state, country.id);
        const conversion = conversionFor(usd);
        const paidUsd = blendedPlanUsd(state, country.id, ident.premiumLift);
        households += paying * conversion;
        monthly += paying * conversion * paidUsd * adBoost;
    });
    households = Number.isFinite(households) ? Math.round(households) : 0;
    const forecastWeeklyRevenue = Number.isFinite(monthly) ? Math.round(monthly / 4.3) : 0;

    const marketingReady = opened.length > 0;
    const fame = player.stats?.fame || 0;
    const marketingCeiling = marketingReady ? Math.round(8_000_000 + fame * 250_000 + opened.length * 1_500_000) : 0;

    const ownSeries: number[] = [];
    const rentSeries: number[] = [];
    for (let week = 0; week <= 60; week += 1) {
        ownSeries.push(construction + weeklyOwn * week);
        rentSeries.push(weeklyRent * week);
    }

    const blockers: string[] = [];
    if (!state.name.trim()) blockers.push('Name the service.');
    if (countries.length === 0) blockers.push('Choose at least one country.');
    countries.forEach(country => {
        const application = state.applications.find(row => row.countryId === country.id);
        if (!application) blockers.push(`File for access in ${country.name}.`);
        else if (application.status === 'FILED' || application.status === 'DELAYED') blockers.push(`${country.name} is still in review.`);
        else if (application.status === 'CONDITIONS' && !application.acceptedConditions) blockers.push(`${country.name} came back with conditions.`);
        else if (application.status === 'REJECTED') blockers.push(`${country.name} was rejected. Drop it or file again.`);
    });
    if (!state.storefrontId) blockers.push('Pick a storefront.');
    if (liveCatalogue(state).length === 0) blockers.push('Put at least one title on the opening shelf.');
    if (state.plans.length === 0) blockers.push('Add a price plan.');
    if (countries.length > 0 && totalCapacity <= 0) blockers.push('The network cannot carry a single stream.');
    regionRows.forEach(row => {
        if (row.countries > 0 && row.servedPct < 0.35 && extraCloud <= 0) {
            blockers.push(`${row.name} is short of capacity.`);
        }
    });
    if (player.money < dueNow) blockers.push(`The treasury is short ${formatCompact(dueNow - player.money)}.`);
    if (state.commissioned) blockers.push('Construction has already been signed.');

    return {
        construction, deposits, access, licences, reserve, dueNow,
        weeklyOwn, weeklyRent, weeklyBurn: weeklyOwn, breakEvenWeek, runwayWeeks, leftAfter,
        energyMwh, sustainability, reputation, capacity: totalCapacity, nightDemand: totalNight,
        servedPct: totalNight <= 0 ? 0 : clamp(totalCapacity / totalNight, 0, 1),
        households, forecastWeeklyRevenue, piracyShare, marketingCeiling, marketingReady,
        regionRows, blockers, ownSeries, rentSeries,
    };
};

export const formatCompact = (amount: number): string => {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000_000) return `${sign}$${(abs / 1_000_000_000_000).toFixed(2)}T`;
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
};

export const formatPeople = (amount: number): string => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return `${Math.round(amount)}`;
};

export interface RehearsalCountry {
    id: string;
    name: string;
    flag: string;
    demand: number;
    servedPct: number;
    status: 'clear' | 'one-room' | 'short';
    note: string;
}

export interface RehearsalResult {
    mode: AudienceMode;
    peak: number;
    capacity: number;
    sparePct: number;
    held: boolean;
    countries: RehearsalCountry[];
    failures: string[];
    curve: number[];
    cataloguePct: number;
}

const turnoutFor = (mode: AudienceMode) => mode === 'QUIET' ? 0.58 : mode === 'SURGE' ? 1.85 : 1;

export const rehearseOpeningNight = (state: OwnPlatformState, mode: AudienceMode): RehearsalResult => {
    const quoteCountries = selectedCountries(state);
    const footprint = quoteCountries;
    const totalNightBase = footprint.reduce((sum, country) => sum + nightDemand(country.audienceM), 0) || 1;
    const totalMachine = state.regions.reduce((sum, region) => sum + regionCapacity(region), 0);
    const extraCloud = cloudCapacity(state.cloud);
    const capacity = totalMachine + extraCloud;
    const turnout = turnoutFor(mode);
    const countries: RehearsalCountry[] = footprint.map(country => {
        const region = state.regions.find(row => row.regionId === country.regionId);
        const night = nightDemand(country.audienceM) * turnout * languageCoverage(state, country);
        const share = nightDemand(country.audienceM) / totalNightBase;
        const regionCap = (region ? regionCapacity(region) : 0) + extraCloud * share;
        const served = night <= 0 ? 1 : clamp(regionCap / night, 0, 1.4);
        const classesOnline = region ? [region.scout, region.workhorse, region.titan].filter(count => count > 0).length : 0;
        const status: RehearsalCountry['status'] = served < 0.72 ? 'short' : classesOnline <= 1 && regionCap > 0 ? 'one-room' : 'clear';
        const note = status === 'short'
            ? 'demand outruns the room'
            : status === 'one-room'
                ? 'one room only'
                : `${(0.6 + served * 0.3).toFixed(1)} to start · clear`;
        return { id: country.id, name: country.name, flag: country.flag, demand: night, servedPct: clamp(served, 0, 1), status, note };
    }).sort((a, b) => b.demand - a.demand);

    const peak = countries.reduce((sum, country) => sum + country.demand * 0.42, 0);
    const sparePct = capacity <= 0 ? 0 : clamp((capacity - peak) / capacity, -1, 0.99);
    const held = capacity > 0 && peak <= capacity * 1.02;
    const failures: string[] = [];
    countries.filter(country => country.status !== 'clear').forEach(country => {
        failures.push(`${country.name} is a ${country.status === 'one-room' ? 'single room' : 'shortfall'}.`);
    });
    if (capacity <= 0) failures.push('Nothing is switched on.');
    const curve = Array.from({ length: 24 }, (_, hour) => {
        const bell = Math.exp(-Math.pow((hour - 16) / 5, 2));
        return Math.round(peak * bell * (mode === 'SURGE' ? 1 : 0.92));
    });
    return {
        mode,
        peak: Math.round(peak),
        capacity,
        sparePct,
        held,
        countries,
        failures,
        curve,
        cataloguePct: clamp(liveCatalogue(state).length / 12, 0.15, 1),
    };
};

export const listOwnedTitles = (player: Player): CataloguePick[] => {
    const picks: CataloguePick[] = [];
    const push = (pick: CataloguePick) => {
        if (picks.some(row => row.title.toLowerCase() === pick.title.toLowerCase())) return;
        picks.push(pick);
    };
    (player.pastProjects || []).forEach(project => {
        push({ id: `past:${project.id}`, source: 'OWNED', title: project.name, genre: project.genre, language: 'English', cost: 0 });
    });
    (player.activeReleases || []).forEach(release => {
        push({
            id: `rel:${release.id}`,
            source: 'OWNED',
            title: release.name,
            genre: release.projectDetails?.genre || 'Drama',
            language: 'English',
            cost: 0,
        });
    });
    (player.businesses || []).forEach(business => {
        (business.studioState?.scripts || []).forEach(script => {
            if (script.status === 'CONCEPT') return;
            push({
                id: `script:${script.id}`,
                source: 'OWNED',
                title: script.title,
                genre: script.genres?.[0] || 'Drama',
                language: 'English',
                cost: 0,
            });
        });
    });
    return picks;
};

export const licenceShelf = (): CataloguePick[] => LICENCE_SHELF.map(title => ({
    id: title.id,
    source: 'LICENCE' as const,
    title: title.title,
    genre: title.genre,
    language: title.language,
    cost: title.cost,
}));

const pushTransaction = (player: Player, amount: number, description: string) => {
    const safe = Math.trunc(amount);
    if (!safe) return;
    player.money = (Number.isFinite(player.money) ? player.money : 0) + safe;
    if (!player.finance) return;
    if (!Array.isArray(player.finance.history)) player.finance.history = [];
    player.finance.history.unshift({
        id: `tx_platform_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        week: player.currentWeek,
        year: player.age,
        amount: safe,
        category: 'BUSINESS',
        description,
    });
    if (player.finance.history.length > 200) player.finance.history.pop();
};

export const commissionPlatform = (player: Player): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open the launch first.' };
    const quote = quoteLaunch(player);
    const blockers = quote.blockers.filter(line => line !== 'Construction has already been signed.');
    if (player.ownPlatform.commissioned) return { player, error: 'Construction has already been signed.' };
    if (blockers.length) return { player, error: blockers[0] };
    const next = {
        ...player,
        logs: player.logs,
        finance: player.finance,
        ownPlatform: {
            ...player.ownPlatform,
            stage: 'CONSTRUCTING' as const,
            commissioned: true,
            constructionWeeksLeft: BUILD_WEEKS,
            weeklyBurn: quote.weeklyBurn,
        },
    };
    pushTransaction(next, -quote.dueNow, `${next.ownPlatform.name} commissioning`);
    next.logs = [...(player.logs || []), {
        week: player.currentWeek,
        year: player.age,
        message: `Signed the build for ${next.ownPlatform.name}. ${formatCompact(quote.dueNow)} left the treasury. ${BUILD_WEEKS} weeks of construction.`,
        type: 'neutral' as const,
    }];
    return { player: next };
};

export interface RightsLot {
    releaseId: string | null;
    title: string;
    genre: string;
    budget: number;
    gross: number;
    simulated: boolean;
    phase: string;
}

export const listRightsLots = (player: Player): RightsLot[] => {
    const lots: RightsLot[] = [];
    (player.activeReleases || []).forEach(release => {
        if (release.distributionPhase === 'STREAMING' && release.streaming) return;
        lots.push({
            releaseId: release.id,
            title: release.name,
            genre: release.projectDetails?.genre || 'Drama',
            budget: release.budget || 5_000_000,
            gross: release.totalGross || 0,
            simulated: false,
            phase: release.distributionPhase,
        });
    });
    (player.pastProjects || []).slice(0, 8).forEach(project => {
        if (lots.some(lot => lot.title === project.name)) return;
        lots.push({
            releaseId: null,
            title: project.name,
            genre: project.genre,
            budget: project.budget || 5_000_000,
            gross: project.gross || 0,
            simulated: false,
            phase: 'LIBRARY',
        });
    });
    return lots;
};

export const PRACTICE_LOT: RightsLot = {
    releaseId: null,
    title: 'Oxford Nights',
    genre: 'Drama',
    budget: 42_000_000,
    gross: 118_000_000,
    simulated: true,
    phase: 'PRACTICE',
};

const bidderWants = (bidder: DealBidder, genre: string) =>
    bidder.taste.some(taste => taste.toLowerCase() === genre.toLowerCase());

export const buildStandingOffers = (lot: RightsLot, tick: number): StandingOfferTerms[] => {
    const quality = clamp((lot.gross / Math.max(lot.budget, 1)) * 40 + 40, 25, 130);
    return DEAL_BIDDERS.map((bidder, index) => {
        const roll = hashString(`${lot.title}:${bidder.id}:${Math.floor(tick / 6)}`) % 100;
        const leaveRoll = hashString(`${lot.title}:${bidder.id}:leave`) % 100;
        if (tick > 18 && leaveRoll < 12 + index) return null;
        const taste = bidderWants(bidder, lot.genre) ? 1.18 : 0.86;
        const heat = 0.82 + (roll / 100) * 0.36 + Math.min(0.18, tick * 0.004);
        const guarantee = Math.round(lot.budget * bidder.guaranteeBias * taste * heat * (0.35 + quality / 180));
        const backendPct = clamp(Math.round(6 * bidder.backendBias + (roll % 7)), 4, 18);
        const recoupment = roll % 3 !== 0;
        const cap = roll % 4 === 0 ? 0 : Math.round(guarantee * (0.4 + (roll % 5) * 0.15));
        const years = 3 + (roll % 5);
        const exclusive = roll % 2 === 0;
        const localization = roll % 3 !== 1;
        const funding = roll % 5 === 0 ? Math.round(lot.budget * 0.08) : 0;
        const renewal = roll % 2 === 1;
        const windowLabel = exclusive ? 'Exclusive, first window' : 'Pay window, non-exclusive';
        const draft: StandingOfferTerms = {
            id: `${bidder.id}-${tick}`,
            bidderId: bidder.id,
            bidderName: bidder.name,
            platformId: bidder.platformId,
            audienceMult: bidder.audienceMult,
            color: bidder.color,
            guarantee,
            backendPct,
            recoupment,
            cap,
            years,
            exclusive,
            windowLabel,
            localization,
            funding,
            renewal,
            value: 0,
            note: taste > 1 ? 'The genre fits the slate.' : 'They want it, not desperately.',
        };
        draft.value = scoreOffer(draft, Math.max(lot.gross, lot.budget));
        if (draft.value > draft.guarantee * 1.12) draft.note = 'Worth more than the cheque suggests.';
        return draft;
    }).filter((row): row is StandingOfferTerms => Boolean(row))
        .sort((a, b) => b.value - a.value);
};

export const scoreOffer = (offer: StandingOfferTerms, expected: number): number => {
    const backendPool = offer.recoupment
        ? Math.max(0, expected * 0.18 - offer.guarantee * 0.25)
        : expected * 0.12;
    const backend = backendPool * (offer.backendPct / 100);
    const capped = offer.cap > 0 ? Math.min(backend, offer.cap) : backend;
    const localization = offer.localization ? expected * 0.025 : 0;
    const renewal = offer.renewal ? offer.guarantee * 0.08 : 0;
    const exclusiveDrag = offer.exclusive ? offer.guarantee * 0.05 : 0;
    return Math.round(offer.guarantee + capped + localization + renewal + offer.funding - exclusiveDrag);
};

export const forecastRelease = (lot: RightsLot, channels: string[], festivalId: string | null, weekendOffset: number): number => {
    const festival = FESTIVALS.find(row => row.id === festivalId);
    const channelLift = 1 + channels.length * 0.035;
    const crowd = weekendOffset === 0 ? 0.9 : weekendOffset === 2 ? 1.04 : 1;
    const base = Math.max(lot.gross, lot.budget * 0.8);
    return Math.round(base * (festival?.forecastMult || 1) * channelLift * crowd);
};

export const emptyReleasePlan = () => ({
    channels: ['social'],
    spend: 2_000_000,
    festivalId: 'none' as string | null,
    weekendOffset: 1,
    forecastUsd: 0,
    locked: false,
});

export const lockRightsDeal = (player: Player): { player: Player; error?: string } => {
    const pending = player.ownPlatform?.pendingDeal;
    if (!pending) return { player, error: 'No offer is on the table.' };
    if (pending.simulated) return { player, error: 'This room is a rehearsal. It cannot pay anyone.' };
    const spend = Math.max(0, Math.round(pending.plan.spend));
    const incoming = pending.offer.guarantee + pending.offer.funding;
    if (spend > incoming) return { player, error: 'The campaign costs more than the offer brings in.' };
    const net = incoming - spend;
    const offset = clampReleaseOffset(player.ownPlatform?.releaseSlot?.weekOffset ?? 0);
    const opening = releaseWeekParts(player.currentWeek, offset);
    const next: Player = {
        ...player,
        ownPlatform: player.ownPlatform ? {
            ...player.ownPlatform,
            pendingDeal: null,
            closedDeals: [
                {
                    id: `deal_${Date.now()}`,
                    title: pending.title,
                    bidderName: pending.offer.bidderName,
                    guarantee: pending.offer.guarantee,
                    backendPct: pending.offer.backendPct,
                    value: pending.offer.value,
                    netToTreasury: net,
                    week: player.currentWeek,
                    year: player.age,
                    opensWeek: opening.week,
                    opensYear: player.age + opening.yearsAhead,
                },
                ...(player.ownPlatform.closedDeals || []),
            ].slice(0, 40),
        } : player.ownPlatform,
        activeReleases: (player.activeReleases || []).map(release => {
            if (release.id !== pending.releaseId) return release;
            return {
                ...release,
                distributionPhase: release.distributionPhase === 'THEATRICAL' ? 'THEATRICAL' : 'STREAMING',
                royaltyPercentage: pending.offer.backendPct,
                bids: undefined,
                streaming: {
                    platformId: pending.offer.platformId,
                    streamerName: pending.offer.bidderName,
                    audienceMult: pending.offer.audienceMult,
                    weekOnPlatform: offset > 0 ? 0 : 1,
                    totalViews: 0,
                    weeklyViews: [],
                    isLeaving: false,
                    startWeekAbsolute: getAbsoluteWeek(player.age, player.currentWeek) + offset,
                },
            };
        }),
        logs: [...(player.logs || []), {
            week: player.currentWeek,
            year: player.age,
            message: `Locked ${pending.title} with ${pending.offer.bidderName}. Views begin ${releaseWeekLabel(player.currentWeek, offset)}. ${formatCompact(net)} net to the treasury after the campaign.`,
            type: 'positive' as const,
        }],
    };
    pushTransaction(next, pending.offer.guarantee, `${pending.offer.bidderName} guarantee · ${pending.title}`);
    if (pending.offer.funding > 0) pushTransaction(next, pending.offer.funding, `${pending.offer.bidderName} production funding`);
    if (spend > 0) pushTransaction(next, -spend, `${pending.title} release campaign`);
    return { player: next };
};

export const channelCost = (id: string): number => {
    const costs: Record<string, number> = {
        social: 400_000,
        tv: 2_400_000,
        outdoor: 1_600_000,
        premiere: 1_200_000,
        press: 700_000,
        influencers: 900_000,
        sports: 3_200_000,
        transit: 1_100_000,
    };
    return costs[id] || 500_000;
};

export const rivalWeekends = (player: Player, lot: RightsLot) => {
    const fromWorld = (player.world?.projects || []).slice(-3).map((project, index) => ({
        id: project.id,
        title: project.title,
        studio: String(project.studioId || 'A rival'),
        heat: 40 + (project.quality || 50) / 2,
        offset: index,
    }));
    if (fromWorld.length >= 2) return fromWorld;
    return [
        { id: 'w1', title: 'Glass Harbor', studio: 'Warner Bros.', heat: 78, offset: 0 },
        { id: 'w2', title: 'Kid Mercury', studio: 'Marvel Studios', heat: 91, offset: 1 },
        { id: 'w3', title: lot.genre === 'Drama' ? 'Small Mercies' : 'Night Market', studio: 'A24-style indie', heat: 44, offset: 2 },
    ];
};

export const regionCityLine = (regionId: LaunchRegionId): string =>
    REGION_CITIES[regionId].map(city => city.name).join(', ');

export const campaignChannelName = (id: string): string =>
    CAMPAIGN_CHANNELS.find(row => row.id === id)?.name || id;

export const identityById = (id: string) => IDENTITY_PRESETS.find(row => row.id === id) || IDENTITY_PRESETS[0];

export const storefrontById = (id: string) => STOREFRONTS.find(row => row.id === id) || STOREFRONTS[0];

/** Rival premieres follow audience, so a generated microstate does not host as many openings as India. */
export const pickAudienceCountry = (seed: string): MarketCountry => {
    const total = MARKET_COUNTRIES.reduce((sum, country) => sum + Math.max(0.05, country.audienceM), 0);
    let roll = ((hashString(seed) % 100000) / 100000) * total;
    for (const country of MARKET_COUNTRIES) {
        roll -= Math.max(0.05, country.audienceM);
        if (roll <= 0) return country;
    }
    return MARKET_COUNTRIES[0];
};

type ServerBox = 'scout' | 'workhorse' | 'titan';

const boxClass = (box: ServerBox): ServerClass['id'] => (box === 'scout' ? 'SCOUT' : box === 'workhorse' ? 'WORKHORSE' : 'TITAN');

const PREFERENCE: Record<InfraPresetId, ServerBox[]> = {
    LEAN: ['workhorse', 'scout'],
    BALANCED: ['workhorse', 'scout'],
    OWN: ['titan', 'workhorse'],
};

export const INFRA_PRESET_TARGET: Record<InfraPresetId, number> = {
    LEAN: 55,
    BALANCED: 90,
    OWN: 100,
};

export const INFRA_PRESETS: { id: InfraPresetId; name: string; blurb: string }[] = [
    { id: 'LEAN', name: 'Lean', blurb: 'Cover about 55% of opening night with the smaller rooms. Rented racks only appear if metal still comes up short.' },
    { id: 'BALANCED', name: 'Balanced', blurb: 'About 90% of the night, mostly workhorses. The usual way to open.' },
    { id: 'OWN', name: 'Own it all', blurb: 'Titans until the night fits in rooms you own. Rented racks go back to zero.' },
];

/** Pick the smallest box that covers most of the remaining gap, without buying a titan to finish a scout-sized hole. */
const fitServers = (need: number, kinds: ServerBox[]) => {
    const counts = { scout: 0, workhorse: 0, titan: 0 };
    let cap = 0;
    let guard = 0;
    while (cap + 1 < need && guard < 80) {
        guard += 1;
        const gap = need - cap;
        const choices = kinds
            .filter(kind => counts[kind] < 40)
            .map(kind => ({ kind, size: serverById(boxClass(kind)).capacity }))
            .sort((a, b) => a.size - b.size);
        if (!choices.length) break;
        const covering = choices.find(item => item.size >= gap * 0.8);
        let pick = covering || choices[choices.length - 1];
        if (pick.size > gap * 2.2) {
            const lesser = [...choices].reverse().find(item => item.size < pick.size);
            if (lesser) pick = lesser;
        }
        counts[pick.kind] += 1;
        cap += pick.size;
    }
    return counts;
};

const nightOfRegion = (state: OwnPlatformState, regionId: LaunchRegionId) => selectedCountries(state)
    .filter(country => country.regionId === regionId)
    .reduce((sum, country) => sum + nightDemand(country.audienceM), 0);

export const applyRegionCoverage = (state: OwnPlatformState, regionId: LaunchRegionId, coveragePct: number): OwnPlatformState => {
    const preset: InfraPresetId = state.infraPreset || 'BALANCED';
    const coverage = clamp(Math.round(coveragePct), 0, 100);
    const need = nightOfRegion(state, regionId) * (coverage / 100);
    const counts = coverage <= 0 ? { scout: 0, workhorse: 0, titan: 0 } : fitServers(need, PREFERENCE[preset]);
    return {
        ...state,
        infraPreset: preset,
        regionCoverage: { ...(state.regionCoverage || {}), [regionId]: coverage },
        regions: state.regions.map(region => region.regionId === regionId ? { ...region, ...counts } : region),
    };
};

/** Auto-build. Replaces server counts in every open region, and resets rented racks to whatever the preset still needs. */
export const applyInfraPreset = (state: OwnPlatformState, preset: InfraPresetId): OwnPlatformState => {
    const target = INFRA_PRESET_TARGET[preset];
    let next = syncRegions({ ...state, infraPreset: preset });
    next.regions.forEach(region => {
        next = applyRegionCoverage(next, region.regionId, target);
    });
    const shortfall = next.regions.reduce((sum, region) => {
        const need = nightOfRegion(next, region.regionId) * (target / 100);
        return sum + Math.max(0, need - regionCapacity(region));
    }, 0);
    if (preset === 'OWN' || shortfall < 1500) {
        return { ...next, infraPreset: preset, cloud: next.cloud.map(order => ({ ...order, racks: 0 })) };
    }
    const providerId = preset === 'LEAN' ? 'NORTHWIND' : 'ATLAS';
    const provider = CLOUD_PROVIDERS.find(row => row.id === providerId) || CLOUD_PROVIDERS[0];
    const racks = Math.min(provider.maxRacks, Math.ceil(shortfall / provider.capacityPerRack));
    return {
        ...next,
        infraPreset: preset,
        cloud: next.cloud.map(order => ({ ...order, racks: order.providerId === provider.id ? racks : 0 })),
    };
};

export { MARKET_COUNTRIES, LAUNCH_REGIONS, SERVER_CLASSES, CLOUD_PROVIDERS, STOREFRONTS, IDENTITY_PRESETS, FESTIVALS, CAMPAIGN_CHANNELS, REGION_CITIES };
