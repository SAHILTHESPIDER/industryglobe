import type { FilmIndustryId, Player } from '../types';
import { INDUSTRY_ENGINE } from './industryEngine';
import { INDUSTRY_ORDER, isFilmIndustry } from './scriptDesk/catalog';
import { ensureDebutClass } from './talentDebut';
import { ensureHouseFootprint, readHqIndustry } from './studioRegions';

export const GLOBAL_EXPANSION_VERSION = 1;

const asIndustry = (value: unknown): FilmIndustryId =>
    isFilmIndustry(value) ? value : 'HOLLYWOOD';

/**
 * Silent. Adds industry fields and never asks the player anything.
 * Safe to run on every load and every week. Does not rescale money, gross, or awards.
 */
export const migrateGlobalExpansion = (player: Player): Player => {
    if (!player || typeof player !== 'object') return player;
    const next: Player = { ...player, flags: { ...(player.flags || {}) } };
    const house = (next.businesses || []).find(row => row.type === 'PRODUCTION_HOUSE');
    const derived = asIndustry(next.homeIndustryId || house?.studioState?.hqIndustryId || house?.studioState?.filmIndustry);

    if (!isFilmIndustry(next.homeIndustryId)) next.homeIndustryId = derived;
    if (!next.fameByIndustry || typeof next.fameByIndustry !== 'object') {
        next.fameByIndustry = { [next.homeIndustryId]: Number(next.stats?.fame) || 0 };
    } else if (next.fameByIndustry[next.homeIndustryId] == null) {
        next.fameByIndustry = { ...next.fameByIndustry, [next.homeIndustryId]: Number(next.stats?.fame) || 0 };
    }
    if (!Array.isArray(next.languages) || next.languages.length === 0) {
        next.languages = [...INDUSTRY_ENGINE[next.homeIndustryId].languages];
    }

    if (Array.isArray(next.businesses)) {
        next.businesses = next.businesses.map(business => {
            if (business.type !== 'PRODUCTION_HOUSE') return business;
            const studioState = ensureHouseFootprint(business.studioState, next.currentWeek || 1, next.age || 18, next.homeIndustryId);
            return { ...business, studioState };
        });
    }

    if (next.world) {
        const projects = Array.isArray(next.world.projects) ? next.world.projects.map(project => (
            project.originIndustryId ? project : { ...project, originIndustryId: 'HOLLYWOOD' as const }
        )) : [];
        const industries = { ...(next.world.industries || {}) };
        INDUSTRY_ORDER.forEach(id => {
            const existing = industries[id];
            const slice = projects.filter(project => (project.originIndustryId || 'HOLLYWOOD') === id).slice(0, 24);
            industries[id] = {
                trendingGenre: existing?.trendingGenre || (id === 'HOLLYWOOD' ? (next.world.trendingGenre || 'ACTION') : 'DRAMA'),
                projects: existing?.projects?.length ? existing.projects : slice,
                awardHistory: id === 'HOLLYWOOD'
                    ? (existing?.awardHistory?.length ? existing.awardHistory : (next.world.awardHistory || []))
                    : (existing?.awardHistory || []),
            };
        });
        next.world = { ...next.world, projects, industries };
    }

    next.flags.globalExpansion = GLOBAL_EXPANSION_VERSION;
    const withDebut = ensureDebutClass(next);
    Object.assign(next, withDebut);
    if (house) {
        const hq = readHqIndustry(next.businesses?.find(row => row.id === house.id)?.studioState, next.homeIndustryId);
        if (!isFilmIndustry(next.homeIndustryId)) next.homeIndustryId = hq;
    }
    return next;
};
