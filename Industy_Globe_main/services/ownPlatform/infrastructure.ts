import {
    BuildGoalId,
    CityLoadRow,
    CityRackPlacement,
    CityVerdict,
    IncidentKind,
    IncidentResponseId,
    InfraIncident,
    LaunchRegionId,
    LoadTestSnapshot,
    OfficeSize,
    OwnPlatformState,
    TrafficLoad,
} from '../../types';
import { getCountry, hashString, SERVER_CLASSES, ServerClass } from './catalog';
import { ServerCity, SERVER_CITIES, citiesInRegion, cityById } from './serverCities';
import { playerCityLabel } from '../boxOfficeSim';
import { Player } from '../../types';

const DRAW = { scout: 0.6, workhorse: 1, titan: 1.6 } as const;
type Box = keyof typeof DRAW;

const server = (id: ServerClass['id']): ServerClass => SERVER_CLASSES.find(row => row.id === id) || SERVER_CLASSES[0];

const boxOf = (box: Box): ServerClass => server(box === 'scout' ? 'SCOUT' : box === 'workhorse' ? 'WORKHORSE' : 'TITAN');

export const emptyPlacement = (cityId: string): CityRackPlacement => ({ cityId, scout: 0, workhorse: 0, titan: 0 });

export const rackCount = (row: CityRackPlacement): number => row.scout + row.workhorse + row.titan;

export const placementDraw = (row: CityRackPlacement): number =>
    row.scout * DRAW.scout + row.workhorse * DRAW.workhorse + row.titan * DRAW.titan;

export interface CityBill {
    steady: number;
    burst: number;
    once: number;
    weekly: number;
    limiting: 'NONE' | 'POWER' | 'COOLING' | 'FIBRE';
}

/** Power, cooling, and fibre ratios. The tightest one caps how many streams the room can start. */
export const cityBill = (row: CityRackPlacement, indexed = true): CityBill => {
    const place = cityById(row.cityId);
    const index = indexed && place ? place.costIndex : 1;
    const raw = row.scout * server('SCOUT').capacity
        + row.workhorse * server('WORKHORSE').capacity
        + row.titan * server('TITAN').capacity;
    const once = Math.round((
        row.scout * server('SCOUT').onceUsd
        + row.workhorse * server('WORKHORSE').onceUsd
        + row.titan * server('TITAN').onceUsd
    ) * index);
    const weekly = Math.round((
        row.scout * server('SCOUT').weeklyUsd
        + row.workhorse * server('WORKHORSE').weeklyUsd
        + row.titan * server('TITAN').weeklyUsd
    ) * index);
    const draw = placementDraw(row);
    if (!place || draw <= 0) {
        return { steady: raw, burst: Math.round(raw * 1.25), once, weekly, limiting: 'NONE' };
    }
    const ratios: Array<['POWER' | 'COOLING' | 'FIBRE', number]> = [
        ['POWER', place.roomRacks / draw],
        ['COOLING', (place.roomRacks * 0.92) / draw],
        ['FIBRE', (place.roomRacks * 1.08) / draw],
    ];
    ratios.sort((a, b) => a[1] - b[1]);
    const tight = ratios[0];
    const factor = Math.max(0, Math.min(1, tight[1]));
    const steady = Math.round(raw * factor);
    return {
        steady,
        burst: Math.round(raw * Math.max(factor, Math.min(1.25, factor * 1.25))),
        once,
        weekly,
        limiting: tight[1] >= 1 ? 'NONE' : tight[0],
    };
};

export const limitLine = (limiting: CityBill['limiting']): string => {
    if (limiting === 'POWER') return 'Power is the tight one. One more rack here will not run at full.';
    if (limiting === 'COOLING') return 'Cooling is the tight one. The room is hotter than the racks like.';
    if (limiting === 'FIBRE') return 'The fibre is the tight one. Viewers past this point start to buffer.';
    return 'This room can take more racks before power or cooling complains.';
};

export const sitesOnce = (sites: readonly CityRackPlacement[], indexed = true): number =>
    sites.reduce((sum, row) => sum + cityBill(row, indexed).once, 0);

export const sitesWeekly = (sites: readonly CityRackPlacement[], indexed = true): number =>
    sites.reduce((sum, row) => sum + cityBill(row, indexed).weekly, 0);

export const sitesSteady = (sites: readonly CityRackPlacement[], indexed = true): number =>
    sites.reduce((sum, row) => sum + cityBill(row, indexed).steady, 0);

export interface Redundancy {
    id: 'NONE' | 'SINGLE' | 'EXPOSED' | 'REDUNDANT';
    label: string;
    line: string;
}

/** Single, Exposed, or Redundant from how many cities actually hold a rack. */
export const redundancyOf = (sites: readonly CityRackPlacement[]): Redundancy => {
    const cities = new Set(sites.filter(rackCount).map(row => row.cityId)).size;
    if (cities >= 3) return { id: 'REDUNDANT', label: 'Redundant', line: 'Three or more cities. A local outage does not kill the service.' };
    if (cities === 2) return { id: 'EXPOSED', label: 'Exposed', line: 'Two cities. One can fail and the other limps.' };
    if (cities === 1) return { id: 'SINGLE', label: 'Single', line: 'One city. A power cut takes the night down.' };
    return { id: 'NONE', label: 'No rooms', line: 'No city has a server yet.' };
};

const hasRacks = (row: CityRackPlacement) => rackCount(row) > 0;

/** Preview spread for a save that only stored region totals. Does not invent a saved field. */
export const spreadRegions = (state: OwnPlatformState): CityRackPlacement[] => {
    const bags = new Map<string, CityRackPlacement>();
    const touch = (cityId: string) => {
        const existing = bags.get(cityId);
        if (existing) return existing;
        const created = emptyPlacement(cityId);
        bags.set(cityId, created);
        return created;
    };
    state.regions.forEach(region => {
        const cities = rankedCities(state).filter(row => row.regionId === region.regionId);
        const queue: Box[] = [];
        (['scout', 'workhorse', 'titan'] as Box[]).forEach(box => {
            for (let i = 0; i < region[box]; i += 1) queue.push(box);
        });
        if (!cities.length) return;
        let cursor = 0;
        queue.forEach(box => {
            let placed = false;
            for (let attempt = 0; attempt < cities.length; attempt += 1) {
                const city = cities[(cursor + attempt) % cities.length];
                const row = touch(city.id);
                if (placementDraw(row) + DRAW[box] <= city.roomRacks + 0.001) {
                    row[box] += 1;
                    cursor = (cursor + attempt + 1) % cities.length;
                    placed = true;
                    break;
                }
            }
            if (!placed) touch(cities[0].id)[box] += 1;
        });
    });
    return [...bags.values()].filter(hasRacks);
};

/** Saved rooms, or a preview spread when the save only has region totals. */
export const effectiveSites = (state: OwnPlatformState): CityRackPlacement[] => (
    Array.isArray(state.sites) ? state.sites.filter(row => cityById(row.cityId) && hasRacks(row)) : spreadRegions(state)
);

export const layoutKey = (state: OwnPlatformState): string => {
    const sites = effectiveSites(state)
        .map(row => `${row.cityId}:${row.scout}:${row.workhorse}:${row.titan}`)
        .sort()
        .join('|');
    const cloud = (state.cloud || []).map(row => `${row.providerId}:${row.racks}`).join('|');
    return `${sites}#${cloud}`;
};

export const loadTestFresh = (state: OwnPlatformState): boolean =>
    Boolean(state.loadTest && state.loadTest.layoutKey === layoutKey(state));

export interface RankedCity extends ServerCity {
    priority: number;
}

/** Headquarters and office countries first, then countries already on the slate, then audience. */
export const rankedCities = (state: OwnPlatformState): RankedCity[] => {
    const selected = new Set(state.selectedCountryIds || []);
    const offices = new Set((state.offices || []).map(row => row.countryId));
    const hq = cityById(state.hqCityId)?.countryId;
    const openRegions = new Set(state.regions.map(row => row.regionId));
    return SERVER_CITIES
        .filter(row => openRegions.has(row.regionId))
        .map(row => {
            const audience = getCountry(row.countryId)?.audienceM || 0;
            let priority = audience;
            if (selected.has(row.countryId)) priority += 1_000;
            if (offices.has(row.countryId)) priority += 2_500;
            if (hq && hq === row.countryId) priority += 5_000;
            if (state.hqCityId === row.id) priority += 800;
            return { ...row, priority };
        })
        .sort((a, b) => b.priority - a.priority || b.roomRacks - a.roomRacks || a.costIndex - b.costIndex || a.name.localeCompare(b.name));
};

export const roomFits = (row: CityRackPlacement | undefined, city: ServerCity, box: Box): boolean =>
    placementDraw(row || emptyPlacement(city.id)) + DRAW[box] <= city.roomRacks + 0.001;

export const addRack = (sites: CityRackPlacement[], cityId: string, box: Box): CityRackPlacement[] => {
    const next = sites.map(row => ({ ...row }));
    const found = next.find(row => row.cityId === cityId);
    if (found) found[box] += 1;
    else next.push({ ...emptyPlacement(cityId), [box]: 1 });
    return next;
};

export const networkOnce = (state: OwnPlatformState): number => (
    Array.isArray(state.sites) ? sitesOnce(state.sites) : sitesOnce(spreadRegions(state), false)
);

export const OFFICE_SPECS: Record<OfficeSize, { name: string; line: string; weekly: number; upfront: number; lift: number }> = {
    SMALL: {
        name: 'Chhota office',
        line: 'Chhota office: is desh mein +10% subscribers, $50k/hafta. Opening cheque $200k from company cash.',
        weekly: 50_000,
        upfront: 200_000,
        lift: 1.1,
    },
    MEDIUM: {
        name: 'Madhyam office',
        line: 'Madhyam office: is desh mein +20% subscribers, $120k/hafta. Opening cheque $600k from company cash.',
        weekly: 120_000,
        upfront: 600_000,
        lift: 1.2,
    },
    LARGE: {
        name: 'Bada office',
        line: 'Bada office: is desh mein +35% subscribers, $280k/hafta. Opening cheque $1.5M from company cash.',
        weekly: 280_000,
        upfront: 1_500_000,
        lift: 1.35,
    },
};

export const HQ_MOVE_USD = 1_500_000;
export const HQ_LICENCE_FACTOR = 0.88;
export const HQ_AWARENESS = 1.12;

export const officeWeekly = (state: OwnPlatformState): number =>
    (state.offices || []).reduce((sum, row) => sum + (OFFICE_SPECS[row.size]?.weekly || 0), 0);

export const countryLift = (state: OwnPlatformState, countryId: string): number => {
    let lift = 1;
    const hq = cityById(state.hqCityId)?.countryId;
    if (hq && hq === countryId) lift *= HQ_AWARENESS;
    const office = (state.offices || []).find(row => row.countryId === countryId);
    if (office && OFFICE_SPECS[office.size]) lift *= OFFICE_SPECS[office.size].lift;
    return lift;
};

export const suggestHqCity = (player: Player): ServerCity => {
    const label = playerCityLabel(player).toLowerCase();
    const named = SERVER_CITIES.find(row => label.includes(row.name.toLowerCase()));
    if (named) return named;
    const hints: Record<string, string> = {
        france: 'par',
        iceland: 'rek',
        portugal: 'lis',
        morocco: 'rak',
        atlanta: 'atl',
        austin: 'aus',
        nashville: 'bna',
    };
    const hint = Object.entries(hints).find(([word]) => label.includes(word));
    if (hint) {
        const city = cityById(hint[1]);
        if (city) return city;
    }
    const selected = player.ownPlatform?.selectedCountryIds?.[0];
    const inCountry = selected ? SERVER_CITIES.find(row => row.countryId === selected) : undefined;
    return inCountry || cityById('lax') || SERVER_CITIES[0];
};

const TRAFFIC: Record<TrafficLoad, number> = { QUIET: 0.58, NORMAL: 1, X2: 2, X5: 5 };

export const trafficLine = (mode: TrafficLoad): string => {
    if (mode === 'QUIET') return 'A slow night. About 60% of the usual crowd.';
    if (mode === 'X2') return 'Twice the crowd. A hit, or a holiday.';
    if (mode === 'X5') return 'Five times the crowd. The worst night you should still survive.';
    return 'The night you planned for.';
};

const nightOf = (audienceM: number) => audienceM * 280;

/** Quiet, normal, 2x, or 5x. Each city comes back HELD, BURST, or BROKE. */
export const runLoadTest = (state: OwnPlatformState, mode: TrafficLoad): LoadTestSnapshot => {
    const sites = effectiveSites(state);
    const turnout = TRAFFIC[mode];
    const demandByCity = new Map<string, number>();
    const countries = (state.selectedCountryIds || [])
        .map(id => getCountry(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
    countries.forEach(country => {
        const demand = nightOf(country.audienceM) * turnout;
        const inRegion = sites.filter(row => cityById(row.cityId)?.regionId === country.regionId);
        const weight = inRegion.reduce((sum, row) => sum + Math.max(1, cityBill(row).steady), 0);
        if (!inRegion.length || weight <= 0) return;
        inRegion.forEach(row => {
            const share = Math.max(1, cityBill(row).steady) / weight;
            demandByCity.set(row.cityId, (demandByCity.get(row.cityId) || 0) + demand * share);
        });
    });
    const cities: CityLoadRow[] = sites.map(row => {
        const bill = cityBill(row, Array.isArray(state.sites));
        const demand = Math.round(demandByCity.get(row.cityId) || 0);
        let verdict: CityVerdict = 'HELD';
        if (demand > bill.burst) verdict = 'BROKE';
        else if (demand > bill.steady) verdict = 'BURST';
        const short = Math.max(0, demand - bill.steady);
        const extra = verdict === 'HELD' ? 0 : Math.max(1, Math.ceil(short / server('WORKHORSE').capacity));
        const suggestion = verdict === 'HELD' ? 'Theek hai.' : `yahan ${extra} server aur lagao`;
        return { cityId: row.cityId, verdict, suggestion, demand, steady: bill.steady };
    });
    const steady = cities.reduce((sum, row) => sum + row.steady, 0);
    const demand = cities.reduce((sum, row) => sum + row.demand, 0);
    return {
        mode,
        layoutKey: layoutKey(state),
        smoothViewers: Math.round(Math.min(steady, demand || steady)),
        cities,
    };
};

const weakestCity = (state: OwnPlatformState): { cityId: string; kind: IncidentKind } | null => {
    const sites = effectiveSites(state);
    if (!sites.length) return null;
    if (redundancyOf(sites).id === 'SINGLE') return { cityId: sites[0].cityId, kind: 'OUTAGE' };
    let worst: { cityId: string; kind: IncidentKind; ratio: number } | null = null;
    sites.forEach(row => {
        const place = cityById(row.cityId);
        const draw = Math.max(0.001, placementDraw(row));
        const ratios: Array<[IncidentKind, number]> = [
            ['POWER', (place?.roomRacks || 1) / draw],
            ['COOLING', ((place?.roomRacks || 1) * 0.92) / draw],
            ['OUTAGE', ((place?.roomRacks || 1) * 1.08) / draw],
        ];
        ratios.sort((a, b) => a[1] - b[1]);
        const [kind, ratio] = ratios[0];
        if (!worst || ratio < worst.ratio) worst = { cityId: row.cityId, kind, ratio };
    });
    return worst ? { cityId: worst.cityId, kind: worst.ratio < 1 ? worst.kind : 'POWER' } : null;
};

const incidentCopy = (kind: IncidentKind, cityName: string, uptime: number): string => {
    if (kind === 'COOLING') return `Cooling slipped in ${cityName}. Racks throttled. Uptime is ${uptime}%.`;
    if (kind === 'OUTAGE') return `${cityName} dropped off the network. Uptime is ${uptime}%.`;
    return `Power dipped in ${cityName}. Viewers buffered. Uptime is ${uptime}%.`;
};

/** Occasional incident from the weakest room. Does not move money. */
export const rollWeeklyIncident = (
    state: OwnPlatformState,
    weekKey: string,
    week: number,
    year: number,
): { state: OwnPlatformState; note?: string } => {
    if ((state.incidents || []).some(row => row.open)) return { state };
    const hit = weakestCity(state);
    if (!hit) return { state };
    const chance = hit.kind === 'OUTAGE' ? 18 : hit.kind === 'COOLING' ? 14 : 8;
    if (hashString(`${weekKey}:infra`) % 100 >= chance) return { state };
    const uptime = hit.kind === 'OUTAGE' ? 82 : hit.kind === 'COOLING' ? 90 : 96;
    const name = cityById(hit.cityId)?.name || hit.cityId;
    const note = incidentCopy(hit.kind, name, uptime);
    const subscribers = state.stage === 'LIVE'
        ? Math.max(0, Math.round(state.subscribers * (1 - (hit.kind === 'OUTAGE' ? 0.08 : hit.kind === 'COOLING' ? 0.06 : 0.04))))
        : state.subscribers;
    const incident: InfraIncident = {
        id: `inc_${week}_${hit.cityId}_${hit.kind}`,
        week,
        year,
        cityId: hit.cityId,
        kind: hit.kind,
        note,
        open: true,
        uptime,
    };
    return {
        note,
        state: {
            ...state,
            subscribers,
            uptime,
            incidents: [incident, ...(state.incidents || [])].slice(0, 8),
        },
    };
};

export const INCIDENT_RESPONSES: { id: IncidentResponseId; name: string; line: string; cost: number; uptime: number }[] = [
    { id: 'FAILOVER', name: 'Backup chalao', line: 'Switch this city onto its spare power. $80k from company cash.', cost: 80_000, uptime: 97 },
    { id: 'REROUTE', name: 'Doosre sheher bhejo', line: 'Send viewers to another city that is still up. $120k from company cash.', cost: 120_000, uptime: 94 },
    { id: 'REPAIR', name: 'Theek karao', line: 'Pay the crew to fix the room this week. $200k from company cash. Uptime comes back.', cost: 200_000, uptime: 100 },
];

export const responseById = (id: IncidentResponseId) => INCIDENT_RESPONSES.find(row => row.id === id) || INCIDENT_RESPONSES[0];

export const openIncident = (state: OwnPlatformState): InfraIncident | undefined =>
    (state.incidents || []).find(row => row.open);

export const uptimeFactor = (state: OwnPlatformState): number => {
    const incident = openIncident(state);
    if (!incident) return 1;
    return Math.max(0.5, Math.min(1, (state.uptime || incident.uptime) / 100));
};

const clampCount = (value: unknown) => Math.max(0, Math.min(40, Math.round(Number(value) || 0)));

export const sanitizeSites = (raw: unknown): CityRackPlacement[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const sites = raw.flatMap(row => {
        if (!row || typeof row !== 'object') return [];
        const cityId = String((row as CityRackPlacement).cityId || '');
        if (!cityById(cityId)) return [];
        return [{
            cityId,
            scout: clampCount((row as CityRackPlacement).scout),
            workhorse: clampCount((row as CityRackPlacement).workhorse),
            titan: clampCount((row as CityRackPlacement).titan),
        }];
    });
    return sites;
};

export const sanitizeGoal = (value: unknown): BuildGoalId | undefined =>
    value === 'CHEAP' || value === 'BALANCED' || value === 'BEST' ? value : undefined;

const LOADS = new Set<TrafficLoad>(['QUIET', 'NORMAL', 'X2', 'X5']);
const VERDICTS = new Set<CityVerdict>(['HELD', 'BURST', 'BROKE']);

export const sanitizeLoadTest = (raw: unknown): LoadTestSnapshot | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const row = raw as LoadTestSnapshot;
    if (!LOADS.has(row.mode) || typeof row.layoutKey !== 'string') return undefined;
    const cities = Array.isArray(row.cities) ? row.cities.flatMap(city => {
        if (!city || !cityById(city.cityId) || !VERDICTS.has(city.verdict)) return [];
        return [{
            cityId: city.cityId,
            verdict: city.verdict,
            suggestion: typeof city.suggestion === 'string' ? city.suggestion.slice(0, 80) : '',
            demand: Math.max(0, Math.round(Number(city.demand) || 0)),
            steady: Math.max(0, Math.round(Number(city.steady) || 0)),
        }];
    }) : [];
    return {
        mode: row.mode,
        layoutKey: row.layoutKey.slice(0, 400),
        smoothViewers: Math.max(0, Math.round(Number(row.smoothViewers) || 0)),
        cities,
    };
};

const KINDS = new Set<IncidentKind>(['POWER', 'COOLING', 'OUTAGE']);

export const sanitizeIncidents = (raw: unknown): InfraIncident[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const incidents = raw.flatMap(row => {
        if (!row || typeof row !== 'object') return [];
        const item = row as InfraIncident;
        if (!cityById(item.cityId) || !KINDS.has(item.kind)) return [];
        return [{
            id: String(item.id || `inc_${item.cityId}`).slice(0, 80),
            week: Math.max(0, Math.round(Number(item.week) || 0)),
            year: Math.max(0, Math.round(Number(item.year) || 0)),
            cityId: item.cityId,
            kind: item.kind,
            note: typeof item.note === 'string' ? item.note.slice(0, 180) : '',
            open: Boolean(item.open),
            uptime: Math.max(0, Math.min(100, Math.round(Number(item.uptime) || 0))),
        }];
    }).slice(0, 8);
    return incidents;
};

const SIZES = new Set<OfficeSize>(['SMALL', 'MEDIUM', 'LARGE']);

export const sanitizeOffices = (raw: unknown): OwnPlatformState['offices'] => {
    if (!Array.isArray(raw)) return undefined;
    const seen = new Set<string>();
    const offices = raw.flatMap(row => {
        if (!row || typeof row !== 'object') return [];
        const item = row as { countryId?: string; size?: OfficeSize };
        if (!item.countryId || !getCountry(item.countryId) || !item.size || !SIZES.has(item.size) || seen.has(item.countryId)) return [];
        seen.add(item.countryId);
        return [{ countryId: item.countryId, size: item.size, localDeals: true }];
    });
    return offices;
};

export const citiesForRegion = (regionId: LaunchRegionId): ServerCity[] => citiesInRegion(regionId);
