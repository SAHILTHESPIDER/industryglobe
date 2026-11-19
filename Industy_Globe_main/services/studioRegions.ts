import type { Business, FilmIndustryId, OperatingRegion, Player, StudioState } from '../types';
import { INDUSTRY_ENGINE, hqSummary, industryById } from './industryEngine';
import { INDUSTRY_ORDER, isFilmIndustry } from './scriptDesk/catalog';

const homeRegion = (industryId: FilmIndustryId, week: number, year: number): OperatingRegion => ({
    industryId,
    country: INDUSTRY_ENGINE[industryId].hqCountry,
    openedWeek: week,
    openedYear: year,
    contacts: 52,
    home: true,
});

export const readHqIndustry = (state?: StudioState | null, fallback?: FilmIndustryId | null): FilmIndustryId => {
    if (state?.hqIndustryId && isFilmIndustry(state.hqIndustryId)) return state.hqIndustryId;
    if (state?.filmIndustry && isFilmIndustry(state.filmIndustry)) return state.filmIndustry;
    if (fallback && isFilmIndustry(fallback)) return fallback;
    return 'HOLLYWOOD';
};

/** Fills HQ and the home office when a save or a new house does not have them yet. */
export const ensureHouseFootprint = (
    state: StudioState | undefined,
    week: number,
    year: number,
    fallback?: FilmIndustryId | null,
): StudioState => {
    const base = state || {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: week,
        lastWriterRefreshWeek: week,
    };
    const hq = readHqIndustry(base, fallback);
    const regions = Array.isArray(base.operatingRegions) ? [...base.operatingRegions] : [];
    if (!regions.some(region => region.industryId === hq)) {
        regions.unshift(homeRegion(hq, week, year));
    }
    return {
        ...base,
        filmIndustry: base.filmIndustry && isFilmIndustry(base.filmIndustry) ? base.filmIndustry : hq,
        hqIndustryId: hq,
        hqCountry: base.hqCountry || INDUSTRY_ENGINE[hq].hqCountry,
        operatingRegions: regions.map(region => ({
            ...region,
            country: region.country || INDUSTRY_ENGINE[region.industryId]?.hqCountry || INDUSTRY_ENGINE[hq].hqCountry,
            contacts: Math.max(0, Math.min(100, Number(region.contacts) || 0)),
        })),
    } as StudioState;
};

export const contactsIn = (state: StudioState | undefined, industryId: FilmIndustryId): number => {
    const region = state?.operatingRegions?.find(row => row.industryId === industryId);
    return region ? region.contacts : 0;
};

/**
 * Crew quote. A Hollywood house shooting a Hollywood city pays the listed cost.
 * An unopened foreign office costs more. Contacts bring that premium down.
 */
export const shootQuote = (
    state: StudioState | undefined,
    locationIndustry: FilmIndustryId | undefined,
    baseCost: number,
): number => {
    const amount = Number(baseCost) || 0;
    if (!locationIndustry) return Math.round(amount);
    const hq = readHqIndustry(state);
    if (hq === 'HOLLYWOOD' && locationIndustry === 'HOLLYWOOD') return Math.round(amount);
    let mult = INDUSTRY_ENGINE[hq].crewCost;
    if (locationIndustry === hq) mult *= hq === 'HOLLYWOOD' ? 1 : 0.92;
    else {
        const contacts = contactsIn(state, locationIndustry);
        mult *= contacts > 0 ? 1.08 - Math.min(40, contacts) / 500 : 1.12;
    }
    return Math.round(amount * mult);
};

export const localStarQuality = (state: StudioState | undefined, actorIndustry?: FilmIndustryId | null): number => {
    if (!actorIndustry) return 0;
    const hq = readHqIndustry(state);
    if (actorIndustry !== hq && contactsIn(state, actorIndustry) <= 0) return 0;
    const contacts = actorIndustry === hq ? Math.max(52, contactsIn(state, hq)) : contactsIn(state, actorIndustry);
    return Math.round(INDUSTRY_ENGINE[hq].localStarBonus * Math.min(1, contacts / 70));
};

export const openOperatingRegion = (
    player: Player,
    businessId: string,
    industryId: FilmIndustryId,
): { player: Player; error?: string } => {
    const house = player.businesses?.find(row => row.id === businessId && row.type === 'PRODUCTION_HOUSE');
    if (!house) return { player, error: 'No production house to open from.' };
    const state = ensureHouseFootprint(house.studioState, player.currentWeek, player.age, player.homeIndustryId);
    if (state.operatingRegions?.some(region => region.industryId === industryId)) {
        return { player, error: 'That office is already open.' };
    }
    const cost = INDUSTRY_ENGINE[industryId].regionOpenCost;
    if ((house.balance || 0) < cost) return { player, error: 'The house cannot afford that office yet.' };
    const nextState: StudioState = {
        ...state,
        operatingRegions: [
            ...(state.operatingRegions || []),
            {
                industryId,
                country: INDUSTRY_ENGINE[industryId].hqCountry,
                openedWeek: player.currentWeek,
                openedYear: player.age,
                contacts: 12,
                home: false,
            },
        ],
    };
    const nextHouse: Business = { ...house, balance: house.balance - cost, studioState: nextState };
    return {
        player: {
            ...player,
            businesses: player.businesses.map(row => row.id === house.id ? nextHouse : row),
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `Opened a ${INDUSTRY_ENGINE[industryId].name} office in ${hqSummary(industryId)}. Contacts there start low.`,
                type: 'neutral',
            }, ...(player.logs || [])].slice(0, 50),
        },
    };
};

export const growRegionContacts = (player: Player): Player => {
    if (!player.businesses?.length) return player;
    const businesses = player.businesses.map(house => {
        if (house.type !== 'PRODUCTION_HOUSE' || !house.studioState?.operatingRegions?.length) return house;
        const operatingRegions = house.studioState.operatingRegions.map(region => {
            const cap = region.home ? 94 : 88;
            const step = region.home ? 0.35 : 0.7;
            return { ...region, contacts: Math.min(cap, Math.round((region.contacts + step) * 10) / 10) };
        });
        return { ...house, studioState: { ...house.studioState, operatingRegions } };
    });
    return { ...player, businesses };
};

/** When the writers' room changes and the house has not opened other offices, the HQ follows. */
export const footprintForCreativeChange = (
    state: StudioState,
    next: FilmIndustryId,
    week: number,
    year: number,
): Partial<StudioState> => {
    const regions = state.operatingRegions || [];
    const foreign = regions.filter(region => !region.home && region.industryId !== state.hqIndustryId);
    if (foreign.length > 0 && state.hqIndustryId && state.hqIndustryId !== next) {
        return { filmIndustry: next };
    }
    const kept = regions.filter(region => region.industryId !== state.hqIndustryId && region.industryId !== next);
    return {
        filmIndustry: next,
        hqIndustryId: next,
        hqCountry: INDUSTRY_ENGINE[next].hqCountry,
        operatingRegions: [homeRegion(next, week, year), ...kept],
    };
};

export const regionChoices = () => INDUSTRY_ORDER.map(id => industryById(id));
