import type { FilmIndustryId, NPCActor, Player, TalentKind } from '../types';
import { cartoonAvatarUrl } from './cartoonAvatar';
import { hydrateGenreXP } from './genreCatalog';
import { INDUSTRY_ENGINE } from './industryEngine';
import { bindDebutCast, NPC_DATABASE } from './npcLogic';
import { INDUSTRIES, INDUSTRY_ORDER } from './scriptDesk/catalog';
import { ageTalentAudience } from './talentAudience';

/**
 * Once each in-game year, every industry debuts a few fictional names.
 * They live on the save, use cartoon faces, and start small enough to grow.
 */

const hash = (value: string): number => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

const generatedOf = (player: Player): NPCActor[] =>
    Array.isArray(player.flags?.generatedTalent) ? player.flags.generatedTalent as NPCActor[] : [];

const pick = (list: string[], seed: number) => list[seed % list.length] || 'Nova';

const makePerson = (
    industry: FilmIndustryId,
    kind: TalentKind,
    gender: 'MALE' | 'FEMALE',
    year: number,
    slot: number,
    taken: Set<string>,
): NPCActor => {
    const profile = INDUSTRIES[industry];
    const industryRow = INDUSTRY_ENGINE[industry];
    let name = '';
    for (let attempt = 0; attempt < 8 && (!name || taken.has(name.toLowerCase())); attempt += 1) {
        const seed = hash(`${industry}:${year}:${slot}:${attempt}`);
        const firsts = gender === 'FEMALE' ? profile.female : profile.male;
        name = `${pick(firsts, seed)} ${pick(profile.last, seed >>> 4)}`;
    }
    taken.add(name.toLowerCase());
    const seed = hash(name + year);
    const followers = 1800 + (seed % 22000);
    const fame = 6 + (seed % 12);
    const talent = 42 + (seed % 26);
    return {
        id: `debut_${industry.toLowerCase()}_${year}_${slot}`,
        name,
        handle: `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
        gender,
        avatar: cartoonAvatarUrl(name),
        tier: 'RISING',
        prestigeBias: kind === 'INFLUENCER' ? 'COMMERCIAL' : 'MIXED',
        openness: 55,
        followers,
        netWorth: 40_000 + (seed % 120_000),
        occupation: 'ACTOR',
        bio: `${industryRow.hqCountry} ${kind === 'INFLUENCER' ? 'influencer' : gender === 'FEMALE' ? 'actress' : 'actor'}.`,
        age: 18 + (seed % 6),
        stats: { talent, fame, genreXP: hydrateGenreXP() },
        traits: ['AMBITIOUS', 'PROFESSIONAL'],
        potential: 74 + (seed % 20),
        isIndependent: true,
        homeIndustryId: industry,
        country: industryRow.hqCountry,
        talentKind: kind,
        fameByIndustry: { [industry]: fame },
    };
};

const debutYear = (player: Player, year: number, existing: NPCActor[]): NPCActor[] => {
    const taken = new Set<string>([
        ...NPC_DATABASE.map(npc => npc.name.toLowerCase()),
        ...existing.map(npc => npc.name.toLowerCase()),
    ]);
    const fresh: NPCActor[] = [];
    INDUSTRY_ORDER.forEach(industry => {
        fresh.push(makePerson(industry, 'ACTOR', 'MALE', year, 0, taken));
        fresh.push(makePerson(industry, 'ACTOR', 'FEMALE', year, 1, taken));
        const influencerGender = year % 2 === 0 ? 'FEMALE' : 'MALE';
        fresh.push(makePerson(industry, 'INFLUENCER', influencerGender, year, 2, taken));
    });
    return fresh;
};

const capList = (list: NPCActor[]): NPCActor[] => {
    const active = list.filter(person => !person.retired);
    const retired = list.filter(person => person.retired);
    if (active.length <= 400) return [...active, ...retired].slice(0, 460);
    const overflow = active.length - 400;
    const oldest = [...active].sort((a, b) => (b.age || 0) - (a.age || 0));
    oldest.slice(0, overflow).forEach(person => { person.retired = true; });
    return [...active, ...retired].slice(0, 460);
};

export const bindGenerated = (player: Player): void => {
    bindDebutCast(generatedOf(player));
};

/**
 * Fills this year's class when a save has never had one.
 * Later birthdays call debutTalentYear so a long save does not spawn a class per missed year.
 */
export const ensureDebutClass = (player: Player): Player => {
    if (!player || player.flags?.talentDebutYear != null) {
        bindGenerated(player);
        return player;
    }
    const year = player.age || 18;
    const existing = generatedOf(player);
    const fresh = debutYear(player, year, existing);
    const next: Player = {
        ...player,
        flags: { ...player.flags, generatedTalent: capList([...existing, ...fresh]), talentDebutYear: year },
    };
    bindGenerated(next);
    return next;
};

/** Runs when the player's age increments. Ages the pool, then debuts one class. */
export const debutTalentYear = (player: Player): { player: Player; notes: string[] } => {
    const aged = ageTalentAudience(player);
    const year = aged.player.age || 18;
    if (aged.player.flags?.talentDebutYear === year) {
        bindGenerated(aged.player);
        return { player: aged.player, notes: aged.note ? [aged.note] : [] };
    }
    const existing = generatedOf(aged.player).map(person => {
        const age = (person.age || 20) + Math.max(1, year - (Number(aged.player.flags?.talentDebutYear) || year));
        const slowed = age >= 50 || person.slowed;
        const retired = person.retired || (age >= 70 && hash(`${person.id}:${age}`) % 4 === 0);
        return { ...person, age, slowed, retired };
    });
    const fresh = debutYear(aged.player, year, existing);
    const sample = fresh[0]?.name;
    const next: Player = {
        ...aged.player,
        flags: { ...aged.player.flags, generatedTalent: capList([...existing, ...fresh]), talentDebutYear: year },
    };
    bindGenerated(next);
    const notes = [`New faces debuted across the industries${sample ? `, including ${sample}` : ''}.`];
    if (aged.note) notes.push(aged.note);
    return { player: next, notes };
};
