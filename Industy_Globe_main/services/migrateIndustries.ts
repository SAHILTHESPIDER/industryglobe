import type { FilmIndustryId, Player } from '../types';
import { nameSlug } from './data/creatorAliases';
import { INDUSTRY_ENGINE } from './industryEngine';
import { publicPersonName } from './rights/alterName';
import { INDUSTRY_ORDER, isFilmIndustry } from './scriptDesk/catalog';
import { ensureDebutClass } from './talentDebut';
import { applyAudienceToCast } from './talentAudience';
import { ensureHouseFootprint, readHqIndustry } from './studioRegions';
import { PUBLIC_CREATORS } from './youtubeCreators';

export const GLOBAL_EXPANSION_VERSION = 1;

const RENAMED_CREATORS: [string, string][] = [
    ['Jimmy Donaldson', 'MrBeast'],
    ['Mark Fischbach', 'Markiplier'],
    ['Imane Anys', 'Pokimane'],
    ['Darren Watkins Jr.', 'IShowSpeed'],
    ['Tyler Blevins', 'Ninja'],
    ['Felix Lengyel', 'xQc'],
    ['Felix Kjellberg', 'PewDiePie'],
    ['Olajide Olatunji', 'KSI'],
    ['Bhuvan Bam', 'BB Ki Vines'],
    ['Ajey Nagar', 'CarryMinati'],
    ['Hikaru Kaihatsu', 'HIKAKIN'],
    ['Lee Sang-hyeok', 'Faker'],
    ['Naman Mathur', 'Mortal'],
    ['Jonathan Amaral', 'Jonathan Gaming'],
    ['Ujjwal Chaurasia', 'Techno Gamerz'],
    ['Animesh Agarwal', '8Bit Thug'],
    ['Payal Dhare', 'Payal Gaming'],
    ['Nischay Malhan', 'Triggered Insaan'],
];

const talentIdAliases = (): Map<string, string> => {
    const map = new Map<string, string>();
    const point = (from: string, to: string) => {
        if (from && to && from !== to) map.set(from, to);
    };
    RENAMED_CREATORS.forEach(([legal, publicName]) => {
        const stable = `roster_${nameSlug(legal)}`;
        point(`roster_${nameSlug(publicName)}`, stable);
        point(`yt_${nameSlug(publicName)}`, stable);
        point(`yt_${nameSlug(legal)}`, stable);
        point(`yt_${nameSlug(publicPersonName(publicName))}`, stable);
        point(`yt_${nameSlug(publicPersonName(legal))}`, stable);
    });
    PUBLIC_CREATORS.forEach(creator => {
        point(`yt_${nameSlug(creator.name)}`, creator.id);
        point(`yt_${nameSlug(publicPersonName(creator.name, creator.living))}`, creator.id);
    });
    return map;
};

const remapTalentIds = (player: Player): Player => {
    const map = talentIdAliases();
    if (!map.size) return player;
    const fixId = (id?: string) => (id && map.get(id)) || id;
    const fixRoster = <T extends { npcId: string }>(roster?: T[]) =>
        roster?.map(contract => {
            const npcId = fixId(contract.npcId);
            return npcId && npcId !== contract.npcId ? { ...contract, npcId } : contract;
        });
    const studio = player.studio?.talentRoster
        ? { ...player.studio, talentRoster: fixRoster(player.studio.talentRoster) }
        : player.studio;
    const businesses = player.businesses?.map(business => {
        const roster = business.studioState?.talentRoster;
        if (!roster) return business;
        return { ...business, studioState: { ...business.studioState, talentRoster: fixRoster(roster) } };
    });
    const channel = player.youtube;
    const creatorChannels = channel?.creatorChannels?.map(row => {
        const id = fixId(row.id);
        return id && id !== row.id ? { ...row, id } : row;
    });
    const subscriptions = channel?.subscriptions?.map(id => fixId(id) || id);
    const economy = player.world?.npcEconomy;
    let npcEconomy = economy;
    if (economy) {
        npcEconomy = { ...economy };
        map.forEach((to, from) => {
            if (npcEconomy && npcEconomy[from] && !npcEconomy[to]) npcEconomy[to] = npcEconomy[from];
        });
    }
    return {
        ...player,
        studio,
        businesses: businesses || player.businesses,
        youtube: channel ? { ...channel, creatorChannels, subscriptions } : channel,
        world: player.world ? { ...player.world, npcEconomy } : player.world,
    };
};

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
    const withDebut = remapTalentIds(ensureDebutClass(next));
    Object.assign(next, withDebut);
    applyAudienceToCast(next);
    if (house) {
        const hq = readHqIndustry(next.businesses?.find(row => row.id === house.id)?.studioState, next.homeIndustryId);
        if (!isFilmIndustry(next.homeIndustryId)) next.homeIndustryId = hq;
    }
    return next;
};
