import { IncidentResponseId, OfficeSize, OwnPlatformState, Player } from '../../types';
import { addCompanyCash, readCompanyCash } from './companyCash';
import {
    effectiveSites,
    HQ_MOVE_USD,
    INCIDENT_RESPONSES,
    OFFICE_SPECS,
    openIncident,
    redundancyOf,
    responseById,
} from './infrastructure';
import { cityById } from './serverCities';
import { formatCompact } from './logic';

const clonePlatform = (player: Player, ownPlatform: OwnPlatformState): Player => ({
    ...player,
    ownPlatform: {
        ...ownPlatform,
        books: ownPlatform.books
            ? { ...ownPlatform.books, lines: [...ownPlatform.books.lines], history: [...(ownPlatform.books.history || [])] }
            : ownPlatform.books,
    },
});

const shortCash = (player: Player, cost: number): string | null => {
    const have = readCompanyCash(player);
    if (have >= cost) return null;
    return `Company cash is short ${formatCompact(cost - have)}. Personal cash is not used.`;
};

/** First headquarters is free. Moving later spends company cash. */
export const setHeadquarters = (player: Player, cityId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'Open the company first.' };
    const city = cityById(cityId);
    if (!city) return { player, error: 'That city is not on the map.' };
    if (state.hqCityId === cityId) {
        return { player: { ...player, ownPlatform: { ...state, hqPromptSeen: true } } };
    }
    const moving = Boolean(state.hqCityId);
    const cost = moving ? HQ_MOVE_USD : 0;
    const error = shortCash(player, cost);
    if (error) return { player, error };
    const next = clonePlatform(player, { ...state, hqCityId: cityId, hqPromptSeen: true });
    if (cost > 0) addCompanyCash(next, -cost, `Moved headquarters to ${city.name}`, 'BURN');
    return { player: next };
};

export const dismissHeadquartersPrompt = (player: Player): Player => {
    if (!player.ownPlatform) return player;
    return { ...player, ownPlatform: { ...player.ownPlatform, hqPromptSeen: true } };
};

export const openCountryOffice = (player: Player, countryId: string, size: OfficeSize): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'Open the company first.' };
    const spec = OFFICE_SPECS[size];
    if (!spec) return { player, error: 'Pick an office size.' };
    const existing = (state.offices || []).find(row => row.countryId === countryId);
    const previous = existing ? OFFICE_SPECS[existing.size].upfront : 0;
    const cost = Math.max(0, spec.upfront - previous);
    const error = shortCash(player, cost);
    if (error) return { player, error };
    const offices = [
        ...(state.offices || []).filter(row => row.countryId !== countryId),
        { countryId, size, localDeals: true },
    ];
    const next = clonePlatform(player, { ...state, offices });
    if (cost > 0) addCompanyCash(next, -cost, `${spec.name} opened`, 'BURN');
    return { player: next };
};

export const closeCountryOffice = (player: Player, countryId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'Open the company first.' };
    const offices = (state.offices || []).filter(row => row.countryId !== countryId);
    return { player: { ...player, ownPlatform: { ...state, offices } } };
};

export const respondToIncident = (player: Player, action: IncidentResponseId): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    const incident = state ? openIncident(state) : undefined;
    if (!state || !incident) return { player, error: 'Nothing is broken right now.' };
    const spec = responseById(action);
    if (action === 'REROUTE' && redundancyOf(effectiveSites(state)).id === 'SINGLE') {
        return { player, error: 'Ek hi sheher hai. Pehle doosra server lagao.' };
    }
    const known = INCIDENT_RESPONSES.some(row => row.id === action);
    if (!known) return { player, error: 'That response is not on the card.' };
    const error = shortCash(player, spec.cost);
    if (error) return { player, error };
    const incidents = (state.incidents || []).map(row => row.id === incident.id ? { ...row, open: false } : row);
    const next = clonePlatform(player, { ...state, incidents, uptime: spec.uptime });
    addCompanyCash(next, -spec.cost, `${spec.name} after the ${incident.kind.toLowerCase()} incident`, 'BURN');
    return { player: next };
};
