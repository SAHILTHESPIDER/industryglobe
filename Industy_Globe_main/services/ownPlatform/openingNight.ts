/**
 * Opening night reads the save: rooms, clearance, catalogue, cash, and the launch flight.
 * The peak plan spends company cash and changes how hard the first hour hits the rooms.
 * It does not touch awards.
 */
import type { OpeningNightRecord, OpeningPeakPlan, Player } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { cleanLaunchFlight } from '../marketing/launchCatalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { BUILD_WEEKS, formatPeople, quoteLaunch, rehearseOpeningNight } from './logic';
import { CLOUD_PROVIDERS, getCountry } from './catalog';
import { SERVER_CITIES } from './serverCities';
import { contentVeto } from './stakeSale';

export interface OnlineCity {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

export interface MarketFlag {
    id: string;
    name: string;
    flag: string;
    cleared: boolean;
}

export interface PeakChoice {
    id: OpeningPeakPlan;
    name: string;
    line: string;
    cost: number;
    peakScale: number;
    capacityBonus: number;
}

export interface OpeningBrief {
    service: string;
    title: string;
    cities: OnlineCity[];
    networkReady: boolean;
    clearanceReady: boolean;
    campaignReady: boolean;
    catalogueReady: number;
    markets: MarketFlag[];
    clearedCount: number;
    cash: number;
    runwayWeeks: number;
    programmePct: number;
    capacity: number;
    plans: PeakChoice[];
}

export interface OpeningSim {
    plan: OpeningPeakPlan;
    held: boolean;
    verdict: string;
    peak: number;
    capacity: number;
    subscribers: number;
    joined: number;
    playedFirstPct: number;
    social: number;
    posts: { handle: string; text: string }[];
    curve: number[];
    appStore: boolean;
    trending: boolean;
    outage: string;
    cost: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const burstProvider = () => CLOUD_PROVIDERS.find(row => row.id === 'MERIDIAN') || CLOUD_PROVIDERS[0];

export const onlineCities = (player: Player): OnlineCity[] => {
    const state = player.ownPlatform;
    if (!state) return [];
    const sites = Array.isArray(state.sites) ? state.sites : [];
    const liveSites = sites.filter(row => (row.scout || 0) + (row.workhorse || 0) + (row.titan || 0) > 0);
    if (liveSites.length) {
        return liveSites.flatMap(row => {
            const city = SERVER_CITIES.find(item => item.id === row.cityId);
            return city ? [{ id: city.id, name: city.name, lat: city.lat, lon: city.lon }] : [];
        });
    }
    const regions = new Set(state.regions.filter(row => (row.scout || 0) + (row.workhorse || 0) + (row.titan || 0) > 0).map(row => row.regionId));
    return SERVER_CITIES.filter(city => regions.has(city.regionId)).map(city => ({
        id: city.id, name: city.name, lat: city.lat, lon: city.lon,
    }));
};

const titlesReady = (player: Player) => {
    const rows = player.ownPlatform?.catalogue || [];
    return rows.filter(row => row.releaseWeekOffset == null || row.releaseWeekOffset <= 0).length;
};

const marketsOf = (player: Player): MarketFlag[] => {
    const state = player.ownPlatform;
    if (!state) return [];
    return (state.selectedCountryIds || []).flatMap(id => {
        const country = getCountry(id);
        if (!country) return [];
        const application = (state.applications || []).find(row => row.countryId === id);
        const cleared = Boolean(application && (application.status === 'APPROVED' || (application.status === 'CONDITIONS' && application.acceptedConditions)));
        return [{ id, name: country.name, flag: country.flag, cleared }];
    });
};

export const peakChoices = (player: Player): PeakChoice[] => {
    const state = player.ownPlatform;
    const empty: PeakChoice[] = [
        { id: 'GATES', name: 'Open the gates', line: 'Everyone at once. No extra rooms.', cost: 0, peakScale: 1, capacityBonus: 0 },
        { id: 'BURST', name: 'Reserve cloud burst', line: 'Buy the hour from the cloud.', cost: 0, peakScale: 1, capacityBonus: 0 },
        { id: 'STAGGER', name: 'Stagger the premiere', line: 'Let the countries in by waves.', cost: 0, peakScale: 0.68, capacityBonus: 0 },
    ];
    if (!state) return empty;
    let quote: ReturnType<typeof quoteLaunch> | null = null;
    try { quote = quoteLaunch(player); } catch { quote = null; }
    const surge = rehearseOpeningNight(state, 'SURGE');
    const provider = burstProvider();
    const gap = Math.max(0, surge.peak - surge.capacity);
    const racks = Math.min(provider.maxRacks, Math.max(1, Math.ceil((gap || provider.capacityPerRack) / provider.capacityPerRack)));
    const burstCost = racks * provider.weeklyPerRack;
    const staggerCost = Math.round((quote?.weeklyBurn || 0) * 0.35);
    return [
        { id: 'GATES', name: 'Open the gates', line: 'Everyone at once. No extra rooms.', cost: 0, peakScale: 1, capacityBonus: 0 },
        {
            id: 'BURST',
            name: 'Reserve cloud burst',
            line: `${racks} ${provider.name} rack${racks === 1 ? '' : 's'} for the first hour.`,
            cost: burstCost,
            peakScale: 1,
            capacityBonus: racks * provider.capacityPerRack,
        },
        {
            id: 'STAGGER',
            name: 'Stagger the premiere',
            line: 'Window the drop. The peak is lower. So is the crush.',
            cost: staggerCost,
            peakScale: 0.68,
            capacityBonus: 0,
        },
    ];
};

export const openingBrief = (player: Player): OpeningBrief => {
    const state = player.ownPlatform;
    const markets = marketsOf(player);
    const cities = onlineCities(player);
    let runway = 0;
    let capacity = 0;
    try {
        const quote = quoteLaunch(player);
        const burn = quote.weeklyBurn || 0;
        const operating = burn > 0 ? Math.floor(readCompanyCash(player) / burn) : 0;
        runway = state?.stage === 'LIVE' || state?.stage === 'CONSTRUCTING' ? operating : quote.runwayWeeks;
        capacity = quote.capacity;
    } catch {
        runway = 0;
    }
    const programmePct = !state ? 0
        : state.stage === 'LIVE' ? 100
            : state.commissioned ? Math.round((1 - (state.constructionWeeksLeft / BUILD_WEEKS)) * 100)
                : Math.round((state.buildStep / 3) * 40);
    const flight = cleanLaunchFlight(state ? player.marketing?.launch : undefined);
    return {
        service: state?.name?.trim() || 'Empire+',
        title: flight?.what === 'TITLE' ? flight.titleName : (state?.catalogue?.[0]?.title || state?.name || 'Tonight'),
        cities,
        networkReady: cities.length > 0 && capacity > 0,
        clearanceReady: markets.length > 0 && markets.every(row => row.cleared),
        campaignReady: Boolean(flight),
        catalogueReady: titlesReady(player),
        markets,
        clearedCount: markets.filter(row => row.cleared).length,
        cash: readCompanyCash(player),
        runwayWeeks: runway,
        programmePct: clamp(programmePct, 0, 100),
        capacity,
        plans: peakChoices(player),
    };
};

const choice = (player: Player, plan: OpeningPeakPlan) => peakChoices(player).find(row => row.id === plan) || peakChoices(player)[0];

export const simulateOpening = (player: Player, plan: OpeningPeakPlan): OpeningSim => {
    const state = player.ownPlatform;
    const picked = choice(player, plan);
    const rehearsal = state ? rehearseOpeningNight(state, plan === 'STAGGER' ? 'LIKELY' : 'SURGE') : null;
    const peak = Math.round((rehearsal?.peak || 0) * picked.peakScale);
    const capacity = Math.round((rehearsal?.capacity || 0) + picked.capacityBonus);
    const held = capacity > 0 && peak <= capacity * 1.02;
    const flight = cleanLaunchFlight(player.marketing?.launch);
    let households = 0;
    try { households = quoteLaunch(player).households || 0; } catch { households = 0; }
    const grant = flight && flight.appliedAbsolute == null ? flight.subscribers : 0;
    const turnout = plan === 'STAGGER' ? 0.045 : plan === 'BURST' ? 0.08 : 0.1;
    const wave = Math.round(households * turnout);
    const joined = Math.round(Math.max(grant, wave) * (held ? 1 : 0.48) * (plan === 'STAGGER' ? 0.86 : 1));
    const already = state?.subscribers || 0;
    const subscribers = already + (flight?.appliedAbsolute == null ? joined : Math.round(joined * 0.15));
    const ready = titlesReady(player);
    const playedFirstPct = ready <= 0 ? 0 : Math.round(clamp(36 + ready * 4 + (held ? 14 : -16) + (plan === 'STAGGER' ? -6 : 0), 4, 96));
    const social = Math.round(joined * 0.08 + ready * 40 + (held ? 800 : 200));
    const service = state?.name?.trim() || 'Empire+';
    const title = flight?.what === 'TITLE' ? flight.titleName : (state?.catalogue?.[0]?.title || service);
    const places = (rehearsal?.countries || []).slice(0, 4);
    const posts = [
        { handle: '@nightbus', text: held ? `${service} did not blink. ${title} is on.` : `${service} coughed in the first minute. ${title} spun.` },
        { handle: '@aisle4', text: places[0] ? `${places[0].flag} ${places[0].name} is in.` : 'Waiting on a city.' },
        { handle: '@lastrow', text: held ? 'Stream held. I am on the sofa.' : 'Buffering on the title card. Rude.' },
        { handle: '@wirecopy', text: `${formatPeople(joined)} people hit play together.` },
    ];
    const curve = (rehearsal?.curve?.length ? rehearsal.curve : Array.from({ length: 24 }, () => 0)).map((value, index) => {
        const shaped = Math.round(value * picked.peakScale);
        if (held || index < 14) return shaped;
        return Math.round(shaped * (0.35 - (index - 14) * 0.02));
    });
    const outage = held ? '' : (rehearsal?.failures[0] || 'The rooms dropped the hour.');
    const verdict = held ? 'EXPECT SMOOTH' : `SHORT ${formatPeople(Math.max(0, peak - capacity))} AT THE PEAK`;
    return {
        plan,
        held,
        verdict,
        peak,
        capacity,
        subscribers,
        joined,
        playedFirstPct,
        social,
        posts,
        curve,
        appStore: held && joined >= 50_000 && ready > 0,
        trending: held && (joined >= 10_000 || (flight?.buzz || 0) >= 40),
        outage,
        cost: picked.cost,
    };
};

/** A service that already lived through opening night replays the ceremony without spending again. */
export const openingIsReplay = (player: Player): boolean => {
    const state = player.ownPlatform;
    if (!state) return false;
    if (state.openingNight?.played) return true;
    return (state.weeksLive || 0) > 0;
};

export const commitOpening = (player: Player, plan: OpeningPeakPlan): { player: Player; error?: string; sim: OpeningSim } => {
    const sim = simulateOpening(player, plan);
    if (!player.ownPlatform) return { player, error: 'The streaming company is not open.', sim };
    if (openingIsReplay(player)) return { player, sim };
    const personal = player.money;
    if (sim.cost > 0) {
        if (readCompanyCash(player) < sim.cost) {
            const short = Math.ceil(sim.cost - readCompanyCash(player));
            return { player, error: `Company cash is short $${short.toLocaleString('en-US')}. Personal cash stays put.`, sim };
        }
        const veto = contentVeto(player, sim.cost);
        if (veto) return { player, error: veto, sim };
    }
    const next = JSON.parse(JSON.stringify(player)) as Player;
    next.money = personal;
    if (sim.cost > 0) addCompanyCash(next, -sim.cost, `Opening night · ${plan === 'BURST' ? 'cloud burst' : 'stagger'}`, 'BURN');
    const state = next.ownPlatform;
    if (!state) return { player, error: 'The streaming company is not open.', sim };
    if (plan === 'BURST') {
        const picked = choice(player, plan);
        const provider = burstProvider();
        const racks = provider.capacityPerRack > 0 ? Math.round(picked.capacityBonus / provider.capacityPerRack) : 0;
        const order = state.cloud.find(row => row.providerId === provider.id);
        if (order) order.racks = Math.min(provider.maxRacks, order.racks + racks);
        else state.cloud.push({ providerId: provider.id, racks: Math.min(provider.maxRacks, racks) });
    }
    if (plan === 'STAGGER') {
        state.marketingDemand = Math.max(0, Math.min(0.1, (state.marketingDemand || 0) * 0.85));
    }
    const record: OpeningNightRecord = {
        version: 1,
        played: true,
        plan,
        held: sim.held,
        subscribers: sim.subscribers,
        peak: sim.peak,
        playedFirstPct: sim.playedFirstPct,
        joined: sim.joined,
        at: getAbsoluteWeek(next.age || 18, next.currentWeek || 1),
    };
    state.openingNight = record;
    next.money = personal;
    return { player: next, sim };
};
