/**
 * Script desk math.
 * Choices are open. Money, weeks, freshness, leaks, and reception move when you take them.
 * Nothing here refuses a rewrite, a song count, or a cast size for being "too many".
 */
import type {
    BookListing,
    BookSagaState,
    BookSplit,
    CharacterRoleSize,
    CoverageReport,
    CoverageVerdict,
    FilmIndustryId,
    Genre,
    IdeaSource,
    PlotTwistOffer,
    RemakeListing,
    Script,
    ScriptAttributes,
    ScriptCharacter,
    ScriptCraft,
    ScriptStage,
    StudioState,
    TrueStoryListing,
    Writer,
    WriterTier,
} from '../../types';
import {
    CLIMAXES,
    EffectChoice,
    EXTRA_ROLES,
    HOOKS,
    INDUSTRIES,
    INDUSTRY_ORDER,
    SONG_STYLES,
    TONES,
    TWIST_TEMPLATES,
    TwistTemplate,
    defaultRoles,
    isFilmIndustry,
} from './catalog';
import { attachScriptV2 } from './v2';

export { INDUSTRIES, INDUSTRY_ORDER, TONES, HOOKS, CLIMAXES, SONG_STYLES, EXTRA_ROLES, isFilmIndustry, defaultRoles };

export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const hashSeed = (input: string): number => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

export const mulberry32 = (seed: number) => {
    let a = seed || 1;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pick = <T>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length) % list.length];
let scriptSerial = 0;

export const songWeight = (industry: FilmIndustryId, genre?: Genre): number => {
    const culture = INDUSTRIES[industry]?.songs || 'optional';
    if (genre === 'MUSICAL') return 1;
    if (culture === 'central') return 1;
    if (culture === 'expected') return 0.72;
    if (industry === 'KOREAN' || industry === 'JAPANESE') return 0.28;
    return 0.4;
};

export interface SongScore {
    audience: number;
    critics: number;
    budget: number;
    freshness: number;
    weeks: number;
    note: string;
}

/** Songs are never blocked. Past the local sweet spot, extra numbers cost more and tire the audience. */
export const songEffects = (count: number, industry: FilmIndustryId, genre: Genre = 'DRAMA'): SongScore => {
    const weight = songWeight(industry, genre);
    const n = Math.max(0, Math.round(count));
    const sweet = weight >= 1 ? 5 : weight >= 0.7 ? 3 : weight > 0.35 ? 2 : 1;
    const musical = genre === 'MUSICAL';
    let audience = 0;
    if ((weight >= 1 || musical) && n === 0) audience = musical && weight < 1 ? -12 : -16;
    else {
        audience = Math.round(
            Math.min(n, sweet) * (weight >= 1 ? 3.1 : weight >= 0.7 ? 2.2 : 1.1)
            + Math.max(0, n - sweet) * (weight >= 1 ? 0.55 : 0.25)
            - Math.max(0, n - (sweet + 3)) * 1.5
        );
    }
    const critics = weight >= 1
        ? (n === 0 ? 5 : -Math.min(9, Math.round(n * 0.7)))
        : musical
            ? (n === 0 ? -8 : Math.min(6, n))
            : (n === 0 ? 1 : -Math.min(6, Math.round(n * 0.45)));
    const budget = Math.round(n * (weight >= 0.7 ? 1_600_000 : 900_000));
    const freshness = n > sweet + 3 ? -Math.round((n - sweet - 3) * 4) : 0;
    const weeks = Math.floor(n / 2);
    const note = weight >= 1 && n === 0
        ? 'A songless film in this industry is a real commercial risk. Critics may respect the nerve.'
        : n > sweet + 3
            ? 'The album is longer than the story. Audiences tire, even if a couple of numbers still land.'
            : n === 0
                ? 'No playback. The score has to carry the feeling, and the budget stays down.'
                : `${n} number${n === 1 ? '' : 's'}. Each one takes studio time and a slice of the budget.`;
    return { audience, critics, budget, freshness, weeks, note };
};

export const bookRightsCost = (popularity: number, publicDomain = false): number => {
    if (publicDomain) return 0;
    const p = clamp(popularity, 1, 100);
    return Math.round(120_000 + Math.pow(p, 2.35) * 420);
};

export const remakeRightsCost = (popularity: number, year: number, publicDomain = false): number => {
    if (publicDomain || year < 1930) return 0;
    return Math.round(bookRightsCost(popularity) * (1.15 + Math.min(0.4, (year - 1970) / 400)));
};

export const lifeRightsCost = (popularity: number, sensitivity: number): number => {
    const p = clamp(popularity, 1, 100);
    const s = clamp(sensitivity, 1, 100);
    return Math.round(180_000 + p * s * 95);
};

export const partsForSplit = (split: BookSplit): { total: number; projectType: 'MOVIE' | 'SERIES'; episodes?: number; note: string } => {
    if (split === 'SINGLE') return { total: 1, projectType: 'MOVIE', note: 'One sitting. The book has to fit, and the budget swells to hold it.' };
    if (split === 'TWO_PART') return { total: 2, projectType: 'MOVIE', note: 'A break in the middle. Part two lives or dies on how part one played.' };
    if (split === 'TRILOGY') return { total: 3, projectType: 'MOVIE', note: 'Three openings. The middle has to earn the third, or fatigue sets in.' };
    return { total: 4, projectType: 'SERIES', episodes: 8, note: 'A web series. Room to breathe, and more chances for the audience to wander off.' };
};

export const splitBudgetFactor = (split: BookSplit): number => {
    if (split === 'SINGLE') return 2_500_000;
    if (split === 'TWO_PART') return 800_000;
    if (split === 'TRILOGY') return 400_000;
    return -700_000;
};

export const returningBump = (performance: number): number => {
    const p = clamp(performance, 0, 100);
    return Math.round((1.05 + (p / 100) * 0.55) * 100) / 100;
};

export const choiceById = (list: EffectChoice[], id?: string): EffectChoice | undefined =>
    list.find(choice => choice.id === id);

export const choicesForGenre = (list: EffectChoice[], genre: Genre): EffectChoice[] => {
    const matched = list.filter(choice => !choice.genres || choice.genres.includes(genre));
    return matched.length >= 3 ? matched : list;
};

export interface DeskDraft {
    source: IdeaSource;
    genre: Genre;
    toneId?: string;
    hookId?: string;
    climaxId?: string;
    songs: number;
    songStyle?: string;
    twist?: PlotTwistOffer | null;
    characters: ScriptCharacter[];
    bookPopularity?: number;
    split?: BookSplit;
    remakePopularity?: number;
    trueStory?: { sensitivity: number; popularity: number; unauthorized?: boolean };
    priorHeat?: number;
}

export interface DeskScore {
    audience: number;
    critics: number;
    budget: number;
    freshness: number;
    weeks: number;
    quality: number;
    notes: string[];
}

const addChoice = (score: DeskScore, choice?: EffectChoice) => {
    if (!choice) return;
    score.audience += choice.audience;
    score.critics += choice.critics;
    score.budget += choice.budget;
};

export const scoreDraft = (draft: DeskDraft, industry: FilmIndustryId): DeskScore => {
    const score: DeskScore = { audience: 50, critics: 50, budget: 0, freshness: 86, weeks: 0, quality: 50, notes: [] };
    if (draft.source === 'ORIGINAL') {
        score.critics += 6;
        score.audience += 1;
        score.notes.push('Original. No rights check, and critics start kinder.');
    } else if (draft.source === 'BOOK') {
        const pop = draft.bookPopularity ?? 50;
        score.audience += Math.round(pop / 12);
        score.critics += 4;
        score.budget += splitBudgetFactor(draft.split || 'SINGLE');
        score.notes.push('The book arrives with a crowd. How you split it changes the bill and the wait.');
    } else if (draft.source === 'REMAKE') {
        const pop = draft.remakePopularity ?? 50;
        score.audience += Math.round(pop / 10);
        score.critics -= 7;
        score.notes.push('A remake opens on memory. Critics arrive skeptical.');
    } else {
        const story = draft.trueStory;
        score.audience += 6;
        score.critics += story?.unauthorized ? -12 : 10;
        if (story?.unauthorized) {
            score.audience += Math.round((story.sensitivity || 40) / 20);
            score.notes.push('No life rights. Curiosity is up, and so is the chance the subject fights you in public.');
        } else {
            score.notes.push('Life rights are closed. Critics treat it as access, not gossip.');
        }
    }
    const tone = choiceById(TONES, draft.toneId);
    if (tone?.id === 'masala' && songWeight(industry, draft.genre) < 0.7) {
        score.audience += 4;
        score.critics -= 6;
        score.budget += tone.budget;
        score.notes.push('Masala outside a song industry plays as a stunt. Some of the crowd still shows up.');
    } else {
        addChoice(score, tone);
    }
    addChoice(score, choiceById(HOOKS, draft.hookId));
    addChoice(score, choiceById(CLIMAXES, draft.climaxId));
    const songs = songEffects(draft.songs, industry, draft.genre);
    score.audience += songs.audience;
    score.critics += songs.critics;
    score.budget += songs.budget;
    score.freshness = clamp(score.freshness + songs.freshness);
    score.weeks += songs.weeks;
    score.notes.push(songs.note);
    if (draft.songStyle && draft.songs > 0) addChoice(score, choiceById(SONG_STYLES, draft.songStyle));
    if (draft.twist && draft.twist.id !== 'none') {
        score.audience += draft.twist.audience;
        score.critics += draft.twist.critics;
        score.notes.push(draft.twist.reward);
    } else if (draft.twist?.id === 'none') {
        score.critics -= 2;
        score.notes.push('No twist. Fewer spoilers, and less for the group chat to do.');
    }
    const supporting = draft.characters.filter(character => character.size === 'SUPPORTING').length;
    const cameos = draft.characters.filter(character => character.size === 'CAMEO').length;
    const leads = draft.characters.filter(character => character.size === 'LEAD').length;
    score.budget += supporting * 450_000 + cameos * 180_000 + Math.max(0, leads - 1) * 600_000;
    if (supporting >= 3) {
        score.audience += Math.min(8, supporting - 1);
        score.notes.push('A wide supporting bench costs more and can play as an ensemble.');
    }
    if (typeof draft.priorHeat === 'number') {
        const swing = Math.round((draft.priorHeat - 50) * 0.45);
        score.audience += swing;
        score.notes.push(swing >= 0
            ? 'The last part is still in the conversation. This one opens warmer.'
            : 'The last part cooled the room. This one has to win the audience back.');
    }
    score.audience = clamp(Math.round(score.audience));
    score.critics = clamp(Math.round(score.critics));
    score.quality = clamp(Math.round(score.critics * 0.55 + score.audience * 0.25 + 20));
    return score;
};

const NO_TWIST: PlotTwistOffer = {
    id: 'none',
    label: 'No twist',
    detail: 'The story does what it promised. The ending is the ending.',
    risk: 'Nothing for spoilers to ruin, and nothing for opening weekend to argue about.',
    reward: 'A straight film can still travel if the parts are good. It will not trend on a reveal.',
    audience: 0,
    critics: -2,
    leak: 0,
};

export const noTwist = (): PlotTwistOffer => ({ ...NO_TWIST });

export const generateTwistOffers = (
    genre: Genre,
    characters: { role: string }[],
    industry: FilmIndustryId,
    seed: string
): PlotTwistOffer[] => {
    const rng = mulberry32(hashSeed(`${seed}|${genre}|${industry}|twists`));
    const roles = new Set(characters.map(character => character.role));
    const pool = TWIST_TEMPLATES.filter(twist => {
        if (twist.genres && !twist.genres.includes(genre)) return false;
        if (twist.id === 'song-is-a-clue' && songWeight(industry, genre) < 0.7 && genre !== 'MUSICAL') return false;
        return true;
    });
    const linked = pool.filter(twist => twist.linkedRole && roles.has(twist.linkedRole));
    const rest = pool.filter(twist => !linked.includes(twist));
    const chosen: TwistTemplate[] = [];
    const friendTurn = linked.find(twist => twist.linkedRole === 'Best Friend');
    if (friendTurn) chosen.push(friendTurn);
    else if (linked.length) chosen.push(pick(rng, linked));
    const bag = [...linked.filter(twist => !chosen.includes(twist)), ...rest];
    while (chosen.length < 4 && bag.length) {
        const index = Math.floor(rng() * bag.length);
        chosen.push(bag.splice(index, 1)[0]);
    }
    return chosen.map(twist => ({
        id: twist.id,
        label: twist.linkedRole && roles.has(twist.linkedRole) ? twist.label : twist.label,
        detail: twist.linkedRole && !roles.has(twist.linkedRole)
            ? `${twist.detail} This asks for a ${twist.linkedRole.toLowerCase()} in the cast.`
            : twist.detail,
        risk: twist.risk,
        reward: twist.reward,
        audience: twist.audience,
        critics: twist.critics,
        leak: twist.leak,
        linkedRole: twist.linkedRole,
    }));
};

export const suggestName = (
    industry: FilmIndustryId,
    gender: 'MALE' | 'FEMALE' | 'ANY' = 'ANY',
    seed = `${Date.now()}`
): string => {
    const rng = mulberry32(hashSeed(`${industry}|${gender}|${seed}`));
    const bank = INDUSTRIES[industry] || INDUSTRIES.HOLLYWOOD;
    const useFemale = gender === 'FEMALE' || (gender === 'ANY' && rng() > 0.5);
    const first = pick(rng, useFemale ? bank.female : bank.male);
    const last = pick(rng, bank.last);
    return `${first} ${last}`;
};

const TITLE_LEFT = ['Last', 'Night', 'Glass', 'Paper', 'Red', 'Silent', 'Second', 'Royal', 'Winter', 'City', 'Broken', 'Golden'];
const TITLE_RIGHT = ['Train', 'House', 'Wedding', 'Monsoon', 'Verdict', 'Song', 'Debt', 'Gate', 'Hour', 'Name', 'Light', 'Return'];

export const suggestTitle = (industry: FilmIndustryId, genre: Genre, seed: string): string => {
    const rng = mulberry32(hashSeed(`title|${industry}|${genre}|${seed}`));
    const place = INDUSTRIES[industry].place.split(' ')[0];
    const roll = rng();
    if (roll < 0.25) return `${pick(rng, TITLE_LEFT)} ${pick(rng, TITLE_RIGHT)}`;
    if (roll < 0.5) return `The ${pick(rng, TITLE_RIGHT)} of ${place}`;
    if (roll < 0.75) return `${pick(rng, TITLE_LEFT)} ${place}`;
    return `${pick(rng, TITLE_LEFT)} ${pick(rng, TITLE_RIGHT)}`;
};

export const generateIndustryWriters = (count: number, industry: FilmIndustryId, seed: string): Writer[] => {
    const rng = mulberry32(hashSeed(`writers|${industry}|${seed}`));
    const bank = INDUSTRIES[industry] || INDUSTRIES.HOLLYWOOD;
    const genres = Object.keys({
        ACTION: 1, DRAMA: 1, COMEDY: 1, ROMANCE: 1, THRILLER: 1, HORROR: 1, SCI_FI: 1, ADVENTURE: 1,
        SUPERHERO: 1, MUSICAL: 1, BIOPIC: 1, SPORTS: 1, ANIMATION: 1, FANTASY: 1, CRIME: 1, DOCUMENTARY: 1,
    }) as Genre[];
    const writers: Writer[] = [];
    for (let i = 0; i < count; i++) {
        const roll = rng();
        let tier: WriterTier = 'COMMON';
        let skill = 60;
        let fee = 80_000;
        let speed = 1.1;
        let scheduleWeeks = 14;
        let slipRisk = 0.14;
        if (roll < 0.18) {
            tier = 'A_LIST';
            skill = 82 + Math.floor(rng() * 16);
            fee = 420_000 + Math.floor(rng() * 800_000);
            speed = 1.35 + rng() * 0.4;
            scheduleWeeks = 18 + Math.floor(rng() * 9);
            slipRisk = 0.05 + rng() * 0.05;
        } else if (roll < 0.48) {
            tier = 'ASPIRING';
            skill = 18 + Math.floor(rng() * 24);
            fee = 4_000 + Math.floor(rng() * 14_000);
            speed = 0.75 + rng() * 0.2;
            scheduleWeeks = 7 + Math.floor(rng() * 4);
            slipRisk = 0.2 + rng() * 0.14;
        } else {
            skill = 48 + Math.floor(rng() * 30);
            fee = 40_000 + Math.floor(rng() * 120_000);
            speed = 1 + rng() * 0.25;
            scheduleWeeks = 11 + Math.floor(rng() * 6);
            slipRisk = 0.1 + rng() * 0.08;
        }
        const strengths: Genre[] = [];
        while (strengths.length < (skill > 85 ? 3 : 2)) {
            const genre = pick(rng, genres);
            if (!strengths.includes(genre)) strengths.push(genre);
        }
        if (INDUSTRIES[industry].songs !== 'optional' && rng() > 0.45 && !strengths.includes('MUSICAL')) {
            strengths[strengths.length - 1] = 'MUSICAL';
        }
        const female = rng() > 0.48;
        writers.push({
            id: `writer_${industry}_${hashSeed(seed).toString(36)}_${i}`,
            name: `${pick(rng, female ? bank.female : bank.male)} ${pick(rng, bank.last)}`,
            skill,
            fee,
            speed: Math.round(speed * 100) / 100,
            tier,
            scheduleWeeks,
            slipRisk: Math.round(slipRisk * 100) / 100,
            industry,
            genreStrengths: strengths,
            stats: {
                creativity: clamp(skill + Math.floor(rng() * 12 - 6)),
                dialogue: clamp(skill + Math.floor(rng() * 12 - 6)),
                structure: clamp(skill + Math.floor(rng() * 12 - 6)),
                pacing: clamp(skill + Math.floor(rng() * 12 - 6)),
            },
        });
    }
    return writers.sort((a, b) => b.skill - a.skill);
};

export const migrateWriter = (writer: Writer, industry: FilmIndustryId = 'HOLLYWOOD'): Writer => {
    if (writer.genreStrengths?.length && typeof writer.slipRisk === 'number' && typeof writer.scheduleWeeks === 'number') {
        return writer;
    }
    const tier = writer.tier || 'COMMON';
    const slipRisk = writer.slipRisk ?? (tier === 'A_LIST' ? 0.07 : tier === 'ASPIRING' ? 0.26 : 0.14);
    const scheduleWeeks = writer.scheduleWeeks ?? (tier === 'A_LIST' ? 20 : tier === 'ASPIRING' ? 9 : 13);
    const genreStrengths = writer.genreStrengths?.length
        ? writer.genreStrengths
        : (['DRAMA', 'THRILLER'] as Genre[]);
    return { ...writer, slipRisk, scheduleWeeks, genreStrengths, industry: writer.industry || industry };
};

export const writerFit = (writer: Pick<Writer, 'skill' | 'genreStrengths'>, genre: Genre): number => {
    const skill = writer.skill || 50;
    if (writer.genreStrengths?.includes(genre)) return Math.min(99, skill + 8);
    if (writer.genreStrengths?.length) return Math.max(8, skill - 6);
    return skill;
};

export interface RoomPlan {
    skill: number;
    fee: number;
    speed: number;
    weeks: number;
    slipRisk: number;
    names: string[];
    ids: string[];
}

export const planWritersRoom = (
    writers: Writer[],
    genre: Genre,
    playerSkill = 0,
    selfWrite = false
): RoomPlan => {
    const ids = writers.map(writer => writer.id);
    const names = writers.map(writer => writer.name);
    const fitted = writers.map(writer => writerFit(writer, genre));
    if (selfWrite) names.unshift('You');
    if (!writers.length && !selfWrite) {
        return { skill: 35, fee: 0, speed: 1.2, weeks: 14, slipRisk: 0.2, names: ['Unstaffed'], ids: [] };
    }
    const skills = selfWrite ? [playerSkill || 25, ...fitted] : fitted;
    const max = Math.max(...skills);
    const avg = skills.reduce((sum, skill) => sum + skill, 0) / skills.length;
    const roomBoost = Math.max(0, skills.length - 1) * 3;
    const skill = clamp(Math.round(max * 0.7 + avg * 0.3 + roomBoost), 8, 98);
    const fee = writers.reduce((sum, writer) => sum + (writer.fee || 0), 0);
    const weeksEach = [
        ...(selfWrite ? [playerSkill > 70 ? 10 : playerSkill > 40 ? 13 : 16] : []),
        ...writers.map(writer => writer.scheduleWeeks || Math.round(12 * (writer.speed || 1))),
    ];
    const weeks = Math.max(...weeksEach) + Math.max(0, skills.length - 1) * 2;
    const slips = [
        ...(selfWrite ? [playerSkill < 40 ? 0.28 : 0.12] : []),
        ...writers.map(writer => writer.slipRisk ?? 0.14),
    ];
    const slipRisk = Math.min(0.55, (slips.reduce((sum, slip) => sum + slip, 0) / slips.length) * (1 + Math.max(0, skills.length - 1) * 0.08));
    const speed = Math.round((weeks / 14) * 100) / 100;
    return { skill, fee, speed, weeks, slipRisk: Math.round(slipRisk * 100) / 100, names, ids };
};

const shelfRng = (industry: FilmIndustryId, salt: string) => mulberry32(hashSeed(`${industry}|${salt}|shelf`));

export const generateBookShelf = (industry: FilmIndustryId, seed: string = industry): BookListing[] => {
    const rng = shelfRng(industry, seed + 'books');
    const bank = INDUSTRIES[industry];
    const genres: Genre[] = ['DRAMA', 'ROMANCE', 'ACTION', 'THRILLER', 'FANTASY', 'CRIME', 'COMEDY'];
    const titles = ['The Monsoon Deed', 'Paper Lantern', 'A House on the Ring Road', 'Salt and Verdict', 'The Second Sister', 'Night Market Gospel', 'The Last Local', 'Glass Bangles', 'River Debt', 'The Quiet Stadium'];
    return titles.slice(0, 6).map((title, index) => {
        const popularity = clamp(28 + Math.floor(rng() * 70));
        const author = `${pick(rng, bank.female)} ${pick(rng, bank.last)}`;
        const publicDomain = index === 5 && popularity < 55;
        return {
            id: `book_${industry}_${index}_${hashSeed(seed).toString(36)}`,
            title: index === 0 ? `${title}` : title,
            author,
            genre: genres[index % genres.length],
            popularity,
            pages: 180 + Math.floor(rng() * 520),
            publicDomain,
            blurb: publicDomain
                ? 'The copyright has lapsed. The audience may still think they know it.'
                : `A ${popularity > 75 ? 'breakout' : popularity > 50 ? 'respectable' : 'quiet'} novel. Readers already have a version in their head.`,
            industry,
            owned: publicDomain,
            paid: 0,
        };
    });
};

export const generateRemakeShelf = (industry: FilmIndustryId, seed: string = industry): RemakeListing[] => {
    const rng = shelfRng(industry, seed + 'remakes');
    const rows = [
        ['Station Road', 1978],
        ['The Wedding Ledger', 1994],
        ['Blue Courtyard', 2006],
        ['Third Bell', 1986],
        ['Open Ticket', 2014],
        ['Old Rain', 1924],
    ] as const;
    const genres: Genre[] = ['DRAMA', 'ROMANCE', 'ACTION', 'THRILLER', 'COMEDY', 'CRIME'];
    return rows.map(([title, year], index) => {
        const popularity = clamp(30 + Math.floor(rng() * 65));
        const publicDomain = year < 1930;
        return {
            id: `remake_${industry}_${index}_${hashSeed(seed).toString(36)}`,
            title,
            year,
            genre: genres[index % genres.length],
            popularity,
            blurb: publicDomain
                ? 'Old enough that the rights have fallen into the public. The title still means something to grandparents.'
                : `People of a certain age quote it. A new version will be compared, line for line.`,
            industry,
            publicDomain,
            owned: publicDomain,
            paid: 0,
        };
    });
};

export const generateTrueStoryShelf = (industry: FilmIndustryId, seed: string = industry): TrueStoryListing[] => {
    const rng = shelfRng(industry, seed + 'lives');
    const bank = INDUSTRIES[industry];
    const kinds = ['singer', 'captain', 'whistleblower', 'matriarch', 'coach', 'activist'];
    return kinds.map((kind, index) => {
        const subject = `${pick(rng, index % 2 ? bank.female : bank.male)} ${pick(rng, bank.last)}`;
        const popularity = clamp(35 + Math.floor(rng() * 60));
        const sensitivity = clamp(20 + Math.floor(rng() * 75));
        return {
            id: `life_${industry}_${index}_${hashSeed(seed).toString(36)}`,
            subject,
            kind,
            popularity,
            sensitivity,
            blurb: sensitivity > 70
                ? `A ${kind} whose family is still in the papers. Getting this wrong is a lawsuit and a boycott.`
                : `A known ${kind}. The public story is friendly. The private one is the film.`,
            industry,
        };
    });
};

export const listingCost = {
    book: (book: BookListing) => bookRightsCost(book.popularity, Boolean(book.publicDomain)),
    remake: (film: RemakeListing) => remakeRightsCost(film.popularity, film.year, Boolean(film.publicDomain)),
    life: (story: TrueStoryListing) => lifeRightsCost(story.popularity, story.sensitivity),
};

export const stageWeeks = (stage: ScriptStage, pace = 1): number => {
    const speed = Math.max(0.6, pace);
    if (stage === 'IDEA') return Math.max(1, Math.round(2 * speed));
    if (stage === 'TREATMENT') return Math.max(2, Math.round(3 * speed));
    if (stage === 'FIRST_DRAFT') return Math.max(4, Math.round(7 * speed));
    return 0;
};

export const leakChance = (script: Script): number => {
    const craft = script.craft;
    if (!craft || craft.legacy || craft.leak?.leaked) return 0;
    const stageBoost: Record<ScriptStage, number> = {
        IDEA: 0.004,
        TREATMENT: 0.012,
        FIRST_DRAFT: 0.028,
        REWRITES: 0.05,
        LOCKED: 0.02,
    };
    const weeks = script.weeksInDevelopment || 0;
    const twist = craft.twist?.leak || 0;
    return Math.min(0.45, stageBoost[craft.stage] + weeks * 0.004 + twist + (craft.rewrites || 0) * 0.006);
};

const RIVAL_TITLES = ['Same Street', 'The Other Wedding', 'After the Bell', 'Second Monsoon', 'Paper House', 'Open Secret'];

export const applyLeak = (script: Script, rng: () => number = Math.random): Script => {
    const craft = script.craft;
    if (!craft || craft.leak?.leaked) return script;
    const industry = INDUSTRIES[craft.industry] || INDUSTRIES.HOLLYWOOD;
    const rush = rng() < 0.62;
    const rivalTitle = rush ? `${pick(rng, RIVAL_TITLES)}` : undefined;
    const heat = rush ? 14 : 8;
    const next: ScriptCraft = {
        ...craft,
        audienceAppeal: clamp((craft.audienceAppeal || 50) - (rush ? 8 : 4)),
        leak: {
            leaked: true,
            risk: leakChance(script),
            rivalStudio: rush ? pick(rng, industry.rivals) : undefined,
            rivalTitle,
            heat,
        },
    };
    return { ...script, hype: clamp((script.hype || 40) - heat), craft: next };
};

const attributesFrom = (script: Script): ScriptAttributes => {
    const craft = script.craft;
    const critic = craft?.criticAppeal ?? script.quality ?? 50;
    const audience = craft?.audienceAppeal ?? 50;
    const writerDialogue = script.assignedSkill || 50;
    return {
        plot: clamp(critic * 0.6 + (craft?.twist && craft.twist.id !== 'none' ? 8 : 0) + 10),
        characters: clamp(50 + (craft?.characters?.length || 2) * 4),
        pacing: clamp(audience * 0.4 + critic * 0.3 + 15 - (craft?.rewrites || 0)),
        dialogue: clamp(writerDialogue * 0.7 + critic * 0.2),
        action: clamp(40 + (craft?.climaxId === 'chase' || craft?.climaxId === 'arena' ? 25 : 8)),
        originality: clamp((script.isOriginal ? 62 : 48) + (craft?.source === 'REMAKE' ? -8 : 4) - Math.floor((craft?.rewrites || 0) / 2)),
    };
};

export const previewQuality = (script: Script): number => {
    const craft = script.craft;
    if (!craft || craft.legacy) return script.quality;
    const base = craft.criticAppeal * 0.62 + craft.audienceAppeal * 0.22 + (script.assignedSkill || 40) * 0.16;
    const rewriteGain = rewriteQualityGain(script.assignedSkill || 40, craft.rewrites);
    const stale = craft.freshness < 40 ? (40 - craft.freshness) * 0.22 : 0;
    const early = craft.stage === 'IDEA' ? 12 : craft.stage === 'TREATMENT' ? 6 : 0;
    return clamp(Math.round(base + rewriteGain - stale - early), 8, 99);
};

/** Each rewrite still helps. The help shrinks, and freshness is what gives out. */
export const rewriteQualityGain = (skill: number, rewritesAlreadyDone: number): number => {
    let total = 0;
    for (let n = 1; n <= rewritesAlreadyDone; n++) {
        total += Math.max(1, Math.round((skill / 18) * Math.pow(0.82, n - 1)));
    }
    return total;
};

export const rewriteCost = (script: Script): number => {
    const craft = script.craft;
    const n = (craft?.rewrites || 0) + 1;
    const writerBill = Math.round((script.developmentCost || 80_000) * 0.12);
    return 70_000 + n * 45_000 + writerBill;
};

export const rewriteWeeks = (script: Script): number => {
    const n = (script.craft?.rewrites || 0) + 1;
    return 2 + Math.min(6, Math.floor(n / 2));
};

export const applyRewrite = (script: Script): Script => {
    const craft = script.craft;
    if (!craft || craft.legacy) return script;
    const n = craft.rewrites + 1;
    const gain = Math.max(1, Math.round(((script.assignedSkill || 40) / 18) * Math.pow(0.82, n - 1)));
    const freshness = clamp(craft.freshness - (6 + n), 0, 100);
    const nextCraft: ScriptCraft = {
        ...craft,
        rewrites: n,
        freshness,
        criticAppeal: clamp(craft.criticAppeal + Math.round(gain * 0.7)),
        audienceAppeal: clamp(craft.audienceAppeal + (freshness < 50 ? -1 : 1)),
        stage: craft.stage === 'LOCKED' ? 'REWRITES' : (craft.stage === 'IDEA' || craft.stage === 'TREATMENT' || craft.stage === 'FIRST_DRAFT' ? 'REWRITES' : craft.stage),
        rewriteWeeksLeft: rewriteWeeks(script),
        weeksAtStage: 0,
    };
    const next: Script = {
        ...script,
        status: 'IN_DEVELOPMENT',
        craft: nextCraft,
        totalDevelopmentWeeks: script.totalDevelopmentWeeks + rewriteWeeks(script),
    };
    next.quality = previewQuality(next);
    next.attributes = attributesFrom(next);
    return next;
};

export const lockScript = (script: Script): Script => {
    const craft = script.craft;
    if (!craft) return { ...script, status: 'READY' };
    const next: Script = {
        ...script,
        status: 'READY',
        craft: { ...craft, stage: 'LOCKED', rewriteWeeksLeft: 0 },
    };
    next.quality = previewQuality(next);
    next.attributes = attributesFrom(next);
    if (!next.craft?.pages) next.craft = { ...next.craft!, pages: buildScreenplay(next) };
    return next;
};

const promote = (script: Script): Script => {
    const craft = script.craft!;
    const order: ScriptStage[] = ['IDEA', 'TREATMENT', 'FIRST_DRAFT', 'REWRITES'];
    const index = order.indexOf(craft.stage);
    const stage = order[Math.min(order.length - 1, index + 1)];
    let next: Script = { ...script, craft: { ...craft, stage, weeksAtStage: 0 } };
    if (stage === 'REWRITES' && !next.craft!.coverage) {
        next = { ...next, craft: { ...next.craft!, coverage: buildCoverage(next) } };
    }
    if (stage === 'REWRITES' && !next.craft!.pages) {
        next = { ...next, craft: { ...next.craft!, pages: buildScreenplay(next) } };
    }
    next.quality = previewQuality(next);
    next.attributes = attributesFrom(next);
    return next;
};

export const advanceCraftScript = (script: Script, rng: () => number = Math.random): { script: Script; alerts: string[] } => {
    const craft = script.craft;
    if (!craft || craft.legacy || script.status !== 'IN_DEVELOPMENT') return { script, alerts: [] };
    const alerts: string[] = [];
    const rewriting = (craft.rewriteWeeksLeft || 0) > 0;
    let slipHold = craft.slipHold || 0;
    let slipped = 0;
    if (slipHold > 0) {
        slipHold -= 1;
    } else if (!rewriting && rng() < (craft.slipRisk ?? 0.1)) {
        slipped = 1 + Math.floor(rng() * 2);
        slipHold = slipped - 1;
    }
    const draftMoves = !rewriting && slipped === 0 && (craft.slipHold || 0) === 0;
    let next: Script = {
        ...script,
        weeksInDevelopment: (script.weeksInDevelopment || 0) + 1,
        totalDevelopmentWeeks: script.totalDevelopmentWeeks + slipped,
        craft: {
            ...craft,
            weeksAtStage: draftMoves ? (craft.weeksAtStage || 0) + 1 : (craft.weeksAtStage || 0),
            slipHold,
            slipWeeks: (craft.slipWeeks || 0) + slipped,
            freshness: clamp((craft.freshness ?? 80) - 0.35 - (slipped ? 2 : 0), 0, 100),
        },
    };
    if (slipped) {
        alerts.push(`The writers' room on "${script.title}" slipped ${slipped} week${slipped > 1 ? 's' : ''}. The date moves, the draft does not.`);
    }
    if (!next.craft!.leak?.leaked && rng() < leakChance(next)) {
        next = applyLeak(next);
        const leak = next.craft!.leak!;
        alerts.push(leak.rivalTitle
            ? `"${script.title}" leaked. ${leak.rivalStudio} is rushing a lookalike called "${leak.rivalTitle}".`
            : `Pages from "${script.title}" are in the group chats. The surprise is thinner.`);
    }
    if (draftMoves && (next.craft!.stage === 'IDEA' || next.craft!.stage === 'TREATMENT' || next.craft!.stage === 'FIRST_DRAFT')) {
        const need = stageWeeks(next.craft!.stage, next.assignedSpeed || 1);
        if ((next.craft!.weeksAtStage || 0) >= need) {
            const before = next.craft!.stage;
            next = promote(next);
            if (before === 'FIRST_DRAFT') {
                alerts.push(`First draft of "${script.title}" is in. Coverage is on the desk.`);
            }
        }
    } else if (next.craft!.stage === 'REWRITES') {
        if ((next.craft!.rewriteWeeksLeft || 0) > 0) {
            const left = next.craft!.rewriteWeeksLeft! - 1;
            next = {
                ...next,
                craft: {
                    ...next.craft!,
                    rewriteWeeksLeft: left,
                    weeksAtStage: left === 0 ? 0 : next.craft!.weeksAtStage,
                    pages: left === 0 ? buildScreenplay(next) : next.craft!.pages,
                },
            };
            if (left === 0) alerts.push(`Rewrite ${next.craft!.rewrites} of "${script.title}" landed. Freshness is ${Math.round(next.craft!.freshness)}.`);
        } else if (draftMoves && (next.craft!.weeksAtStage || 0) >= 8) {
            next = lockScript(next);
            alerts.push(`"${script.title}" locked itself. The calendar ran out before another rewrite.`);
        }
    }
    const risks = next.craft?.v2?.risks;
    if (risks && next.craft?.v2 && !next.craft.v2.inferred && !next.craft.legacy) {
        const roll = rng();
        const line = risks.plagiarism / 500;
        const creditLine = line + risks.credit / 500;
        const boycottLine = creditLine + risks.boycott / 500;
        if (roll < line) {
            alerts.push(`A plagiarism claim is circling "${script.title}". The premise is in a rival's mouth.`);
            next = {
                ...next,
                craft: {
                    ...next.craft,
                    audienceAppeal: clamp(next.craft.audienceAppeal - 4),
                    v2: { ...next.craft.v2, risks: { ...risks, plagiarism: clamp(risks.plagiarism + 8) } },
                },
            };
        } else if (roll < creditLine) {
            alerts.push(`The writers on "${script.title}" are arguing about the credit. The draft slows.`);
            next = { ...next, craft: { ...next.craft, freshness: clamp((next.craft.freshness || 70) - 3) } };
        } else if (roll < boycottLine) {
            alerts.push(`A boycott thread has named "${script.title}". Curiosity and anger are shopping for the same ticket.`);
            next = { ...next, hype: clamp((next.hype || 40) + 2), craft: { ...next.craft, audienceAppeal: clamp(next.craft.audienceAppeal - 2) } };
        }
    }
    next.quality = previewQuality(next);
    next.attributes = attributesFrom(next);
    return { script: next, alerts };
};

export const buildCoverage = (script: Script, week = 0): CoverageReport => {
    const craft = script.craft;
    const skill = script.assignedSkill || 50;
    const plot = clamp(Math.round((craft?.criticAppeal || 50) * 0.5 + skill * 0.3 + ((craft?.twist && craft.twist.id !== 'none') ? 8 : 0)));
    const dialogue = clamp(Math.round(skill * 0.65 + (craft?.criticAppeal || 50) * 0.2));
    const characters = clamp(Math.round(48 + (craft?.characters?.length || 2) * 5 + (craft?.freshness || 70) * 0.1));
    const market = clamp(Math.round((craft?.audienceAppeal || 50) * 0.75 + (craft?.leak?.leaked ? -10 : 0) + (100 - (craft?.freshness || 70)) * -0.15));
    const avg = (plot + dialogue + characters + market) / 4;
    const verdict: CoverageVerdict = avg >= 78 ? 'RECOMMEND' : avg >= 58 ? 'CONSIDER' : 'PASS';
    const note = verdict === 'RECOMMEND'
        ? 'Reader would send this upstairs. The market line is strong enough to spend real money.'
        : verdict === 'CONSIDER'
            ? 'Reader is not in love. A rewrite could move it, and another rewrite might sand the life out of it.'
            : 'Reader would pass. You can still make it. The building will not pretend it is ready.';
    return { plot, dialogue, characters, market, verdict, note, week };
};

export const buildScreenplay = (script: Script): string => {
    const craft = script.craft;
    const industry = INDUSTRIES[craft?.industry || 'HOLLYWOOD'] || INDUSTRIES.HOLLYWOOD;
    const place = industry.scenes[hashSeed(script.title || 'script') % industry.scenes.length];
    const people = (craft?.characters?.length ? craft.characters : [
        { id: 'h', name: 'ALEX', role: 'Hero', size: 'LEAD' as const },
        { id: 'v', name: 'MORGAN', role: 'Villain', size: 'LEAD' as const },
    ]);
    const lead = people.find(person => person.size === 'LEAD') || people[0];
    const second = people.find(person => person.id !== lead.id) || lead;
    const cue = (person: ScriptCharacter) => person.name.toUpperCase();
    const songs = craft?.songs || 0;
    const lines = [
        (script.title || 'UNTITLED').toUpperCase(),
        `by ${(craft?.writerNames || []).filter(name => name && name !== 'Unstaffed').join(' & ') || (script.author && script.author !== 'Unstaffed' ? script.author : 'the writers\' room')}`,
        '',
        'FADE IN:',
        '',
        `INT. ${place} - NIGHT`,
        '',
        `${cue(lead)} comes in out of the weather. ${craft?.hookLabel || 'Something has already gone wrong'}. The room pretends not to notice.`,
        '',
        cue(lead),
        craft?.toneLabel === 'Light' ? 'Tell me this is the funny version.' : 'Start from the part you left out.',
        '',
        cue(second),
        craft?.source === 'TRUE_STORY' ? 'If we say it out loud, they can sue us for the sentence.' : 'You already know how this ends. You bought a ticket.',
        '',
    ];
    if (songs > 0) {
        lines.push(
            `INT. ${place} - LATER`,
            '',
            `The lights drop. A ${craft?.songStyle || 'song'} starts, too loud for the size of the room.`,
            '',
            `SONG: "${(script.title || 'UNTITLED').toUpperCase()} (REPRISE)"`,
            '',
            `${cue(lead)} moves through the crowd. The lyric is doing plot work the dialogue was afraid of.`,
            ''
        );
    }
    lines.push(
        `EXT. ${place} - DAWN`,
        '',
        craft?.climaxLabel
            ? `The climax they paid for: ${craft.climaxLabel.toLowerCase()}.`
            : 'The street is empty enough to tell the truth.',
        '',
        cue(lead),
        craft?.twist && craft.twist.id !== 'none'
            ? craft.twist.label.endsWith('.') ? craft.twist.label : `${craft.twist.label}.`
            : 'That is the whole story. I am not adding a door behind it.',
        '',
        craft?.twist?.linkedRole
            ? `${craft.twist.linkedRole.toUpperCase()} is still in the frame. The turn belongs to them.`
            : 'Nobody speaks for a moment. The weather does.',
        '',
        'FADE OUT.',
        '',
        'THE END',
    );
    return lines.join('\n');
};

export const smallRolePremium = (tier?: string, roleType?: string): number => {
    if (tier === 'A_LIST' && roleType === 'CAMEO') return 2.6;
    if (tier === 'A_LIST' && roleType === 'SUPPORTING') return 1.55;
    if ((tier === 'ESTABLISHED' || tier === 'ICON') && roleType === 'CAMEO') return 1.9;
    if ((tier === 'ESTABLISHED' || tier === 'ICON') && roleType === 'SUPPORTING') return 1.2;
    return 1;
};

export const castFitBonus = (
    cast: { roleType?: string; actorId?: string | null; talent?: number; fame?: number }[]
): number => {
    let bonus = 0;
    let supporting = 0;
    cast.forEach(role => {
        if (!role.actorId) return;
        const talent = role.talent ?? 50;
        const fame = role.fame ?? 20;
        if (role.roleType === 'LEAD') {
            if (talent >= 72) bonus += 3;
            else if (talent < 45) bonus -= 4;
        } else if (role.roleType === 'SUPPORTING') {
            supporting += 1;
            if (talent >= 50 && talent < 88) bonus += 1.5;
            if (talent >= 92) bonus -= 1;
        } else if (role.roleType === 'CAMEO' && fame >= 75) {
            bonus += 2;
        }
    });
    if (supporting >= 3) bonus += 3;
    return Math.max(-12, Math.min(12, Math.round(bonus)));
};

export const productionBudgetDelta = (script?: Script | null): number => {
    if (!script?.craft || script.craft.legacy) return 0;
    return Math.round(script.craft.budgetDelta || 0);
};

export const releaseHypeBonus = (script?: Script | null): number => {
    if (!script?.craft || script.craft.legacy) return 0;
    const craft = script.craft;
    const appeal = Math.round((craft.audienceAppeal - 50) * 0.55);
    const fatigue = craft.freshness < 45 ? Math.round((45 - craft.freshness) * 0.35) : 0;
    const leak = craft.leak?.heat || 0;
    const prior = craft.priorScore != null
        ? 0
        : craft.book
            ? Math.round(((craft.book.partScores[craft.book.partScores.length - 1]?.score ?? 50) - 50) * 0.3)
            : 0;
    return appeal + prior - fatigue - leak;
};

export const rolesForGreenlight = (script?: Script | null) => {
    const people = script?.craft?.characters || [];
    if (!people.length || script?.craft?.legacy) return null;
    return people.map(person => ({
        id: person.id,
        role: person.role,
        roleType: person.size,
        actorId: person.actorId || null,
        actorName: person.actorName,
        characterId: person.id,
        characterName: person.name,
    }));
};

export interface BuiltScript {
    script: Script;
    saga?: BookSagaState;
}

export interface BuildScriptInput {
    id?: string;
    title: string;
    genre: Genre;
    secondaryGenre?: Genre;
    industry: FilmIndustryId;
    draft: DeskDraft;
    room: RoomPlan;
    week: number;
    book?: BookListing;
    remake?: RemakeListing;
    story?: TrueStoryListing;
    split?: BookSplit;
    saga?: BookSagaState;
    partIndex?: number;
    priorCharacters?: ScriptCharacter[];
    returningTalent?: Script['returningTalent'];
    twists?: PlotTwistOffer[];
    logline?: string;
}

export const buildScriptRecord = (input: BuildScriptInput): BuiltScript => {
    const score = scoreDraft({ ...input.draft, priorHeat: input.draft.priorHeat }, input.industry);
    const split = input.split || input.saga?.split;
    const parts = split ? partsForSplit(split) : { total: 1, projectType: 'MOVIE' as const, episodes: undefined, note: '' };
    const partIndex = input.partIndex || (input.saga ? input.saga.partsMade + 1 : 1);
    const source = input.draft.source;
    const twist = input.draft.twist && input.draft.twist.id !== 'none' ? input.draft.twist : input.draft.twist?.id === 'none' ? input.draft.twist : undefined;
    const bookState: BookSagaState | undefined = input.book && split ? {
        id: input.saga?.id || `saga_${input.book.id}`,
        title: input.book.title,
        author: input.book.author,
        popularity: input.book.popularity,
        rightsCost: input.book.paid ?? listingCost.book(input.book),
        rightsOwned: true,
        split,
        totalParts: input.saga?.totalParts || parts.total,
        partsMade: input.saga?.partsMade || 0,
        partScores: input.saga?.partScores || [],
        castPremium: input.saga?.castPremium || 1.05,
    } : input.saga;
    const rightsPaid = source === 'BOOK'
        ? (bookState?.rightsCost || 0)
        : source === 'REMAKE'
            ? (input.remake?.paid ?? (input.remake ? listingCost.remake(input.remake) : 0))
            : source === 'TRUE_STORY' && !input.draft.trueStory?.unauthorized
                ? (input.story?.paid ?? (input.story ? listingCost.life(input.story) : 0))
                : 0;
    const characters = (input.priorCharacters?.length ? input.priorCharacters : input.draft.characters).map(character => ({ ...character }));
    const craft: ScriptCraft = {
        industry: input.industry,
        source,
        toneId: input.draft.toneId,
        toneLabel: choiceById(TONES, input.draft.toneId)?.label,
        hookId: input.draft.hookId,
        hookLabel: choiceById(HOOKS, input.draft.hookId)?.label,
        climaxId: input.draft.climaxId,
        climaxLabel: choiceById(CLIMAXES, input.draft.climaxId)?.label,
        songs: input.draft.songs,
        songStyle: input.draft.songStyle,
        twistId: twist?.id,
        twist: twist || undefined,
        twistOffers: input.twists,
        stage: 'IDEA',
        rewrites: 0,
        freshness: score.freshness,
        audienceAppeal: score.audience,
        criticAppeal: score.critics,
        budgetDelta: Math.max(0, score.budget),
        characters,
        writerIds: input.room.ids,
        writerNames: input.room.names,
        weeksAtStage: 0,
        slipWeeks: 0,
        slipRisk: input.room.slipRisk,
        priorScore: typeof input.draft.priorHeat === 'number' ? input.draft.priorHeat : undefined,
        partIndex,
        sagaId: bookState?.id,
        book: bookState,
        remake: input.remake ? {
            title: input.remake.title,
            year: input.remake.year,
            popularity: input.remake.popularity,
            rightsCost: input.remake.paid ?? listingCost.remake(input.remake),
            rightsOwned: true,
            publicDomain: input.remake.publicDomain,
        } : undefined,
        trueStory: input.story || input.draft.trueStory ? {
            subject: input.story?.subject || 'Untitled subject',
            sensitivity: input.draft.trueStory?.sensitivity ?? input.story?.sensitivity ?? 40,
            popularity: input.draft.trueStory?.popularity ?? input.story?.popularity ?? 40,
            rightsCost: input.story ? listingCost.life(input.story) : 0,
            rightsOwned: !input.draft.trueStory?.unauthorized,
            unauthorized: Boolean(input.draft.trueStory?.unauthorized),
        } : undefined,
    };
    const title = input.title.trim() || 'Untitled';
    const script: Script = {
        id: input.id || `script_${hashSeed(`${title}|${input.week}|${input.genre}`).toString(36)}_${input.week}_${++scriptSerial}`,
        title,
        genres: input.secondaryGenre && input.secondaryGenre !== input.genre ? [input.genre, input.secondaryGenre] : [input.genre],
        status: 'IN_DEVELOPMENT',
        quality: 40,
        options: [
            { questionId: 'source', choiceId: source },
            { questionId: 'tone', choiceId: input.draft.toneId || 'earnest' },
            { questionId: 'hook', choiceId: input.draft.hookId || 'wrong-place' },
            { questionId: 'climax', choiceId: input.draft.climaxId || 'quiet' },
            { questionId: 'twist', choiceId: twist?.id || 'none' },
        ],
        writerId: input.room.ids[0] || (input.room.names.includes('You') ? 'player' : 'room'),
        assignedSkill: input.room.skill,
        assignedSpeed: input.room.speed,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: Math.max(4, input.room.weeks + score.weeks + stageWeeks('IDEA', input.room.speed) + stageWeeks('TREATMENT', input.room.speed) + stageWeeks('FIRST_DRAFT', input.room.speed)),
        isOriginal: source === 'ORIGINAL',
        projectType: parts.projectType,
        episodes: parts.episodes,
        targetAudience: input.draft.toneId === 'dark' ? 'R' : 'PG-13',
        logline: input.logline || loglineFor(title, input.genre, craft),
        attributes: { plot: 50, characters: 50, pacing: 50, dialogue: 50 },
        sourceMaterial: source === 'ORIGINAL' ? 'ORIGINAL' : 'ADAPTATION',
        sourceMaterialType: source === 'BOOK' ? 'BOOK' : source === 'REMAKE' ? 'SCREENPLAY' : source === 'TRUE_STORY' ? 'LIFE_RIGHTS' : undefined,
        subjectName: craft.trueStory?.subject,
        author: input.room.names.join(', '),
        hype: clamp(40 + Math.round((score.audience - 50) * 0.4) + (input.draft.priorHeat ? Math.round((input.draft.priorHeat - 50) * 0.25) : 0)),
        developmentCost: 0,
        purchaseCost: partIndex > 1 ? 0 : rightsPaid,
        rightsKind: source === 'BOOK' ? 'BOOK' : source === 'TRUE_STORY' ? 'LIFE' : undefined,
        fidelity: source === 'BOOK' ? 70 : source === 'REMAKE' ? 40 : source === 'TRUE_STORY' ? 80 : undefined,
        unauthorizedLife: Boolean(craft.trueStory?.unauthorized),
        createdAtWeek: input.week,
        franchiseId: bookState?.id,
        installmentNumber: bookState ? partIndex : undefined,
        returningTalent: input.returningTalent,
        craft,
    };
    script.quality = previewQuality(script);
    script.attributes = attributesFrom(script);
    script.craft = { ...script.craft!, pages: buildScreenplay(script) };
    return { script, saga: bookState };
};

const loglineFor = (title: string, genre: Genre, craft: ScriptCraft): string => {
    const hook = craft.hookLabel || 'a choice nobody can take back';
    const twist = craft.twist && craft.twist.id !== 'none' ? ` Then: ${craft.twist.label.toLowerCase()}.` : '';
    const songs = craft.songs > 0 ? ` ${craft.songs} song${craft.songs === 1 ? '' : 's'}.` : '';
    return `${title} is a ${genre.replace(/_/g, ' ').toLowerCase()} about ${hook.toLowerCase()}.${songs}${twist}`;
};

export const attachLegacyCraft = (script: Script, industry: FilmIndustryId): Script => {
    if (script.craft) return script;
    const source: IdeaSource = script.sourceMaterialType === 'LIFE_RIGHTS'
        ? 'TRUE_STORY'
        : script.sourceMaterialType === 'SCREENPLAY'
            ? 'REMAKE'
            : script.sourceMaterial === 'ADAPTATION'
                ? 'BOOK'
                : 'ORIGINAL';
    const stage: ScriptStage = script.status === 'READY' || script.status === 'PRODUCED'
        ? 'LOCKED'
        : script.status === 'IN_DEVELOPMENT'
            ? 'FIRST_DRAFT'
            : 'IDEA';
    return {
        ...script,
        craft: {
            legacy: true,
            industry,
            source,
            songs: script.genres?.includes('MUSICAL') ? 4 : 0,
            stage,
            rewrites: 0,
            freshness: 70,
            audienceAppeal: clamp(script.hype ?? 50),
            criticAppeal: clamp(script.quality ?? 50),
            budgetDelta: 0,
            characters: [],
        },
    };
};

export const migrateScriptDeskState = (state: StudioState): StudioState => {
    const industry = isFilmIndustry(state.filmIndustry) ? state.filmIndustry : 'HOLLYWOOD';
    const scripts = (state.scripts || []).map(script => attachScriptV2(attachLegacyCraft(script, industry)));
    const writers = (state.writers || []).map(writer => migrateWriter(writer, industry));
    const seed = `${industry}|${state.lastWriterRefreshWeek || 0}`;
    const bookShelf = state.bookShelf?.length ? state.bookShelf : generateBookShelf(industry, seed);
    const remakeShelf = state.remakeShelf?.length ? state.remakeShelf : generateRemakeShelf(industry, seed);
    const trueStoryShelf = state.trueStoryShelf?.length ? state.trueStoryShelf : generateTrueStoryShelf(industry, seed);
    return {
        ...state,
        filmIndustry: state.filmIndustry && isFilmIndustry(state.filmIndustry) ? state.filmIndustry : industry,
        scripts,
        writers,
        bookShelf,
        remakeShelf,
        trueStoryShelf,
        bookSagas: state.bookSagas || [],
    };
};

export const markSagaProduced = (state: StudioState, script: Script): StudioState => {
    const sagaId = script.craft?.sagaId || script.craft?.book?.id;
    if (!sagaId) return state;
    const sagas = (state.bookSagas || []).map(saga => {
        if (saga.id !== sagaId) return saga;
        const part = script.craft?.partIndex || saga.partsMade + 1;
        if (saga.partScores.some(row => row.part === part)) return saga;
        return { ...saga, partsMade: Math.max(saga.partsMade, part) };
    });
    const book = script.craft?.book;
    if (book && !sagas.some(saga => saga.id === book.id)) {
        sagas.push({ ...book, partsMade: Math.max(book.partsMade, script.craft?.partIndex || 1) });
    }
    return { ...state, bookSagas: sagas };
};

/**
 * Book-saga parts keep the desk's part number. Every other new script also stores partIndex 1,
 * and that must not override an existing franchise's next installment.
 */
export const deskSagaPart = (script?: { installmentNumber?: number; craft?: { sagaId?: string; book?: { id?: string }; partIndex?: number } } | null): number | undefined => {
    if (!script) return undefined;
    if (script.craft?.sagaId || script.craft?.book) return script.craft.partIndex || script.installmentNumber;
    return script.installmentNumber;
};

/** Prefer the part the script desk stored for a book saga. Otherwise use the number greenlight already chose. */
export const partNumberForRelease = (
    scripts: { title?: string; name?: string; franchiseId?: string; installmentNumber?: number; craft?: { sagaId?: string; book?: { id?: string }; partIndex?: number } }[],
    sagaId: string,
    title: string,
    fallback?: number,
): number => {
    const match = scripts.find(script =>
        (script.franchiseId === sagaId || script.craft?.sagaId === sagaId)
        && (script.title === title || script.name === title)
    );
    return deskSagaPart(match) || fallback || 1;
};

export const recordSagaScore = (state: StudioState, sagaId: string, part: number, title: string, score: number): StudioState => {
    const sagas = (state.bookSagas || []).map(saga => {
        if (saga.id !== sagaId) return saga;
        const partScores = saga.partScores.filter(row => row.part !== part).concat([{ part, title, score: clamp(score) }]);
        const latest = partScores[partScores.length - 1]?.score ?? 50;
        return { ...saga, partScores, castPremium: returningBump(latest) };
    });
    return { ...state, bookSagas: sagas };
};

export const heatFromProjects = (
    projects: { franchiseId?: string; rating?: number; audienceScore?: number; title?: string; name?: string; installmentNumber?: number }[],
    sagaId: string
): { score: number; title: string; note: string } | null => {
    const rows = projects.filter(project => project.franchiseId === sagaId);
    if (!rows.length) return null;
    const latest = [...rows].sort((a, b) => (b.installmentNumber || 0) - (a.installmentNumber || 0))[0];
    const score = typeof latest.audienceScore === 'number'
        ? latest.audienceScore
        : typeof latest.rating === 'number'
            ? clamp(latest.rating * 10)
            : 55;
    const title = latest.title || latest.name || 'the last part';
    const note = score >= 70
        ? `${title} played. The town wants the next one, and the cast knows it.`
        : score >= 50
            ? `${title} did fine. The next part is a choice, not a coronation.`
            : `${title} cooled the audience. A sequel asks them to come back anyway.`;
    return { score, title, note };
};

export const coverageLabel = (verdict: CoverageVerdict) =>
    verdict === 'PASS' ? 'Pass' : verdict === 'CONSIDER' ? 'Consider' : 'Recommend';

export const slipLabel = (risk: number) => risk < 0.1 ? 'Rare slip' : risk < 0.2 ? 'Can slip' : 'Slips often';

export const stageLabel = (stage: ScriptStage) => {
    if (stage === 'IDEA') return 'Idea';
    if (stage === 'TREATMENT') return 'Treatment';
    if (stage === 'FIRST_DRAFT') return 'First draft';
    if (stage === 'REWRITES') return 'Rewrites';
    return 'Final lock';
};
