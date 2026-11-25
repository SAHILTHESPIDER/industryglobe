/**
 * Script v2.
 * Genre, the target market's taste, the certificate, the tone, the shape, and the tracks
 * are scored together. A choice does not carry a fixed audience number.
 * Nothing here refuses a long film, a songless masala, or a certificate the scenes outrun.
 * Those choices change the budget, the crowd, the board, and how tired the draft gets.
 */
import type { FilmIndustryId, Genre, PlotTwistOffer, Script, ScriptV2 } from '../../types';
import { INDUSTRIES, INDUSTRY_ORDER, TONES, isFilmIndustry } from './catalog';
import { INDUSTRY_ENGINE, type RatingLabel } from '../industryEngine';
import { formatGenreLabel } from '../genreCatalog';
import { formatMismatchPenalty } from '../rights/formulas';

export interface DeskOption {
    id: string;
    label: string;
    detail: string;
    family: 'mass' | 'prestige' | 'romance' | 'dread' | 'plain';
}

const opt = (
    id: string,
    label: string,
    detail: string,
    family: DeskOption['family'],
): DeskOption => ({ id, label, detail, family });

export const SETTINGS: DeskOption[] = [
    opt('night-city', 'The city after midnight', 'Crowds, neon, and a last train.', 'mass'),
    opt('family-house', 'The family house', 'Everyone has a key. Nobody has privacy.', 'romance'),
    opt('workplace', 'The place that pays them', 'A shift, a boss, a thing they cannot afford to lose.', 'prestige'),
    opt('road', 'The road out', 'A way out that keeps getting longer.', 'mass'),
    opt('village', 'The place they left', 'Home is smaller than the memory of it.', 'romance'),
    opt('school', 'A school', 'Old friends, new ranks, a gate that still closes.', 'prestige'),
    opt('coast', 'The water', 'A port, a beach, or a river that the city pretends is an edge.', 'plain'),
    opt('one-room', 'One room', 'The secret does not have space to hide.', 'dread'),
];

export const GOALS: DeskOption[] = [
    opt('clear-name', 'Clear their name', 'The public story is wrong, and it is sticking.', 'prestige'),
    opt('save-family', 'Keep the family standing', 'Money, marriage, or a secret. The house comes first.', 'romance'),
    opt('win', 'Win the thing in public', 'A match, a stage, a case. The town is watching.', 'mass'),
    opt('escape', 'Get out before morning', 'Leaving is the plot.', 'dread'),
    opt('love', 'Be with the person', 'Class, family, or a contract is in the way.', 'romance'),
    opt('expose', 'Put the truth on the record', 'Somebody powerful needs it to stay quiet.', 'prestige'),
    opt('last-job', 'One last job', 'They said they were done.', 'mass'),
    opt('come-home', 'Come home and be believed', 'The return is the conflict.', 'romance'),
];

export const CONFLICTS: DeskOption[] = [
    opt('the-law', 'The law', 'A case, a cop, or a rule they cannot talk through.', 'prestige'),
    opt('the-family', 'The family', 'Love and duty are not on the same side.', 'romance'),
    opt('the-clock', 'The clock', 'A date, a deal, or a train that will not wait.', 'mass'),
    opt('a-rival', 'A rival', 'Someone wants the same prize and is ahead.', 'mass'),
    opt('poverty', 'The money', 'The right choice is the one they cannot afford.', 'plain'),
    opt('a-secret', 'A secret', 'Saying it would end the life they are protecting.', 'dread'),
    opt('the-city', 'The city itself', 'The place is the opponent. It has its own habits.', 'mass'),
    opt('the-past', 'What they already did', 'The third act belongs to a choice that is over.', 'prestige'),
];

export const VILLAINS: DeskOption[] = [
    opt('tycoon', 'An owner with a smile', 'Money, a stage, and the patience to wait.', 'mass'),
    opt('relative', 'Someone at the table', 'The harm wears a family face.', 'romance'),
    opt('officer', 'An officer of the rules', 'Not a monster. A person with a stamp.', 'prestige'),
    opt('lover', 'The person they want', 'Desire and damage are the same door.', 'romance'),
    opt('system', 'No single face', 'A company, a party, a board, a habit.', 'prestige'),
    opt('mentor', 'The one who taught them', 'The lesson was a leash.', 'dread'),
    opt('stranger', 'Someone from outside', 'They arrive with a reason the town does not know.', 'dread'),
    opt('mirror', 'The lead, eventually', 'The antagonist is the choice the hero keeps making.', 'prestige'),
];

export const MOTIVES: DeskOption[] = [
    opt('money', 'Money', 'A debt, a deal, or a lifestyle that has to be fed.', 'mass'),
    opt('honor', 'Honor', 'How the family will be talked about.', 'romance'),
    opt('grief', 'Grief', 'Somebody is already gone, and the story is how.', 'prestige'),
    opt('power', 'Power', 'A chair, a name, a crowd that obeys.', 'mass'),
    opt('love', 'Love', 'They think they are saving someone.', 'romance'),
    opt('faith', 'Faith', 'A belief that does not have a negotiation.', 'plain'),
    opt('revenge', 'Revenge', 'An old injury with a new address.', 'dread'),
    opt('survival', 'Survival', 'They are not grand. They are not ready to lose.', 'plain'),
];

export const OPENINGS: DeskOption[] = [
    opt('cold-open', 'Cold open', 'The worst moment first. Then the clock resets.', 'dread'),
    opt('song', 'A number', 'The film announces itself in music.', 'mass'),
    opt('wedding', 'A wedding', 'Everyone who matters is in one room.', 'romance'),
    opt('arrival', 'An arrival', 'A person steps into a place that has an opinion.', 'plain'),
    opt('crime', 'A crime already done', 'The story starts in the aftermath.', 'mass'),
    opt('morning', 'An ordinary morning', 'Work, tea, a door. The break comes late.', 'prestige'),
    opt('chase', 'Already running', 'The poster is the first scene.', 'mass'),
    opt('headline', 'A headline', 'The public knows a version before the lead does.', 'prestige'),
];

export const INTERVALS: DeskOption[] = [
    opt('song', 'A song that turns the plot', 'The interval number is not a break. It is a confession.', 'mass'),
    opt('reveal', 'A reveal', 'The audience gets a fact the lead does not.', 'prestige'),
    opt('loss', 'A loss', 'Someone or something does not make it to the second half.', 'romance'),
    opt('kiss', 'They finally meet it', 'Love, or the decision to refuse it, at the hinge.', 'romance'),
    opt('betrayal', 'A betrayal', 'The person in the poster is not the person to trust.', 'dread'),
    opt('fight', 'A fight that is not the last one', 'The house comes back because the fight was not enough.', 'mass'),
    opt('silence', 'A silence', 'No number, no speech. The cut is the interval.', 'prestige'),
    opt('promotion', 'A false win', 'They get what they wanted. It is the wrong prize.', 'mass'),
];

export const CLIMAXES: DeskOption[] = [
    opt('rooftop', 'Rooftop in the weather', 'Height, a crowd below, a choice.', 'mass'),
    opt('court', 'A room that has to tell the truth', 'Dialogue carries the money scene.', 'prestige'),
    opt('wedding', 'The wedding blows open', 'Family, color, and a secret with witnesses.', 'romance'),
    opt('chase', 'A chase through the real city', 'Streets the audience already knows.', 'mass'),
    opt('stage', 'A stage', 'The number, the speech, or the match they were afraid of.', 'mass'),
    opt('quiet', 'Two people, no music', 'The climax is a sentence.', 'prestige'),
    opt('arena', 'The whole city watching', 'A stadium, a festival, a broadcast.', 'mass'),
    opt('house', 'Back in the house', 'The ending was in the walls.', 'dread'),
];

export const ENDINGS: DeskOption[] = [
    opt('triumph', 'Triumph', 'They get it, and the house can cheer.', 'mass'),
    opt('bittersweet', 'Bittersweet', 'They win something and lose the rest.', 'prestige'),
    opt('tragedy', 'Tragedy', 'The cost is the point.', 'dread'),
    opt('open', 'Open', 'The film stops before the city does.', 'prestige'),
    opt('twist', 'The ending is the twist', 'The last movement changes the first.', 'dread'),
    opt('reunion', 'Reunion', 'The people who belong together are in the frame.', 'romance'),
    opt('sacrifice', 'Sacrifice', 'Someone pays so the others can leave.', 'prestige'),
    opt('joke', 'A joke that lands', 'The last beat is a laugh, if the film earned it.', 'mass'),
];

export const TWIST_PLACES: DeskOption[] = [
    opt('none', 'No twist', 'The story does what it promised.', 'plain'),
    opt('act-one', 'Early', 'The turn happens before the audience is comfortable.', 'prestige'),
    opt('interval', 'At the interval', 'The second half is a different film, on purpose.', 'mass'),
    opt('climax', 'Inside the climax', 'The reveal and the set piece are the same scene.', 'mass'),
    opt('last-line', 'The last line', 'One sentence. Easy to spoil, hard to forget.', 'dread'),
    opt('opening-payoff', 'The opening was the ending', 'The cold open was not a tease. It was the truth.', 'prestige'),
];

export const THEMES: DeskOption[] = [
    opt('family', 'Family', 'Who you owe, and who you choose.', 'romance'),
    opt('class', 'Class', 'The door that money opens, and the one it does not.', 'prestige'),
    opt('faith', 'Faith', 'Belief as a home and as a wall.', 'plain'),
    opt('fame', 'Fame', 'Being watched, and what that does to the work.', 'mass'),
    opt('home', 'Home', 'A place that will not stay still.', 'romance'),
    opt('justice', 'Justice', 'What the official story leaves out.', 'prestige'),
    opt('love', 'Love', 'Want, and the life built around it.', 'romance'),
    opt('freedom', 'Freedom', 'The cost of leaving.', 'mass'),
    opt('grief', 'Grief', 'A person-shaped absence.', 'prestige'),
    opt('ambition', 'Ambition', 'How far a person will go for a name.', 'mass'),
];

export const EPISODE_HOOKS: DeskOption[] = [
    opt('question', 'A question the episode will not answer', 'The next episode is the answer, or the refusal.', 'dread'),
    opt('new-body', 'Someone new is in trouble', 'The case gets a face.', 'dread'),
    opt('almost', 'They almost say it', 'Romance that stops one line early.', 'romance'),
    opt('next-job', 'The next job is already moving', 'The episode ends with a plan, not a bow.', 'mass'),
    opt('song', 'The song is unfinished', 'A number cuts off on the line that matters.', 'mass'),
    opt('text', 'A message lands', 'One text, after the plot thought it was done.', 'prestige'),
    opt('jump', 'A jump in time', 'The next week is not the next day.', 'prestige'),
    opt('smile', 'The villain smiles', 'They are not worried. That is the hook.', 'dread'),
];

const TONE_FAMILY: Record<string, DeskOption['family']> = {
    light: 'mass',
    earnest: 'prestige',
    dark: 'dread',
    satire: 'prestige',
    epic: 'mass',
    intimate: 'prestige',
    masala: 'mass',
};

export const TONE_OPTIONS = TONES.map(tone => ({
    id: tone.id,
    label: tone.label,
    detail: tone.detail,
    family: TONE_FAMILY[tone.id] || 'plain' as DeskOption['family'],
}));

export const byId = (list: DeskOption[], id?: string): DeskOption | undefined => list.find(item => item.id === id);

export interface V2Adaptation {
    ipId: string;
    title: string;
    author: string;
    kind: 'BOOK' | 'LIFE';
    fame: number;
    fidelity: number;
    preferred: 'MOVIE' | 'SERIES';
    unauthorized: boolean;
    publicDomain: boolean;
    fans: number[];
    hot: boolean;
    authorId?: string;
}

export interface V2Draft {
    format: 'MOVIE' | 'SERIES';
    runtimeMinutes: number;
    seasons: number;
    episodesPerSeason: number;
    episodeMinutes: number;
    industry: FilmIndustryId;
    genre: Genre;
    title: string;
    logline: string;
    loglineMode: 'TYPED' | 'PICKED';
    settingId: string;
    goalId: string;
    conflictId: string;
    villainId: string;
    motiveId: string;
    openingId: string;
    intervalId: string;
    climaxId: string;
    endingId: string;
    twistPlaceId: string;
    toneId: string;
    tracks: { songs: number; action: number; romance: number; comedy: number };
    themeId: string;
    episodeHookId: string;
    ratingId: string;
    violence: number;
    intimacy: number;
    language: number;
    protagonist: string;
    villainName: string;
    adaptation?: V2Adaptation;
}

export interface V2Read {
    audience: number;
    critics: number;
    budget: number;
    freshness: number;
    /** Stored, not shown on the writing steps. */
    quality: number;
    binge: number;
    censorHeat: number;
    boycott: number;
    leak: number;
    weeks: number;
    notes: string[];
    hints: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const hash = (input: string): number => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const mulberry = (seed: number) => {
    let a = seed || 1;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pick = <T,>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length) % list.length];

export const scriptMarkets = () => INDUSTRY_ORDER.map(id => ({
    id,
    label: id === 'HOLLYWOOD' ? 'United States' : INDUSTRIES[id].label,
    place: INDUSTRIES[id].place,
    country: INDUSTRY_ENGINE[id].hqCountry,
    censor: INDUSTRY_ENGINE[id].censor.name,
    songs: INDUSTRIES[id].songs,
}));

export const marketLabel = (id: FilmIndustryId) => scriptMarkets().find(market => market.id === id)?.label || INDUSTRIES[id].label;

export const ratingsFor = (industry: FilmIndustryId): RatingLabel[] => INDUSTRY_ENGINE[industry].censor.ratings;

export const defaultRating = (industry: FilmIndustryId): RatingLabel => {
    const ratings = ratingsFor(industry);
    return ratings[Math.floor((ratings.length - 1) / 2)] || ratings[0];
};

export const contentCeiling = (rating: RatingLabel) => {
    const age = rating.minAge;
    if (rating.restricted && age >= 18) return { violence: 100, intimacy: 100, language: 100 };
    if (age >= 17) return { violence: 86, intimacy: 78, language: 84 };
    if (age >= 15) return { violence: 70, intimacy: 62, language: 55 };
    if (age >= 12) return { violence: 48, intimacy: 40, language: 32 };
    if (age >= 7) return { violence: 30, intimacy: 22, language: 16 };
    if (age > 0) return { violence: 26, intimacy: 18, language: 12 };
    return { violence: 16, intimacy: 10, language: 6 };
};

export const marketTrend = (industry: FilmIndustryId, genre: Genre, week: number) => {
    const bias = INDUSTRY_ENGINE[industry].genreBias[genre] ?? 1;
    const season = Math.floor(Math.max(1, week) / 6);
    const swing = ((hash(`${industry}:${genre}:${season}`) % 17) - 8) / 100;
    const demand = Math.max(0.72, Math.min(1.48, bias * (1 + swing)));
    const label = demand >= 1.22 ? 'Hot' : demand >= 1.06 ? 'Warm' : demand <= 0.86 ? 'Cold' : demand < 0.97 ? 'Soft' : 'Steady';
    return { demand, label, bias };
};

export const personName = (industry: FilmIndustryId, gender: 'MALE' | 'FEMALE' | 'ANY', seed: string) => {
    const rng = mulberry(hash(`${industry}|${gender}|${seed}`));
    const bank = INDUSTRIES[industry] || INDUSTRIES.HOLLYWOOD;
    const female = gender === 'FEMALE' || (gender === 'ANY' && rng() > 0.5);
    return `${pick(rng, female ? bank.female : bank.male)} ${pick(rng, bank.last)}`;
};

const track = (value: number) => clamp(Math.round(value), 0, 100);

export const emptyDraft = (industry: FilmIndustryId, seed: string): V2Draft => {
    const safe = isFilmIndustry(industry) ? industry : 'HOLLYWOOD';
    const rating = defaultRating(safe);
    const cap = contentCeiling(rating);
    return {
        format: 'MOVIE',
        runtimeMinutes: 128,
        seasons: 1,
        episodesPerSeason: 8,
        episodeMinutes: 42,
        industry: safe,
        genre: 'DRAMA',
        title: '',
        logline: '',
        loglineMode: 'PICKED',
        settingId: SETTINGS[0].id,
        goalId: GOALS[0].id,
        conflictId: CONFLICTS[1].id,
        villainId: VILLAINS[0].id,
        motiveId: MOTIVES[0].id,
        openingId: OPENINGS[3].id,
        intervalId: INTERVALS[1].id,
        climaxId: CLIMAXES[1].id,
        endingId: ENDINGS[1].id,
        twistPlaceId: 'none',
        toneId: 'earnest',
        tracks: { songs: INDUSTRIES[safe].songs === 'central' ? 58 : 12, action: 28, romance: 36, comedy: 22 },
        themeId: THEMES[0].id,
        episodeHookId: EPISODE_HOOKS[0].id,
        ratingId: rating.id,
        violence: Math.round(cap.violence * 0.7),
        intimacy: Math.round(cap.intimacy * 0.65),
        language: Math.round(cap.language * 0.55),
        protagonist: personName(safe, 'ANY', `${seed}|lead`),
        villainName: personName(safe, 'ANY', `${seed}|villain`),
    };
};

const majority = (families: DeskOption['family'][]) => {
    const counts = new Map<string, number>();
    families.forEach(family => counts.set(family, (counts.get(family) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
};

export const scoreV2 = (draft: V2Draft, week = 1, writerSkill = 45): V2Read => {
    const industry = isFilmIndustry(draft.industry) ? draft.industry : 'HOLLYWOOD';
    const engine = INDUSTRY_ENGINE[industry];
    const culture = INDUSTRIES[industry].songs;
    const genre = draft.genre;
    const tone = TONE_OPTIONS.find(item => item.id === draft.toneId) || TONE_OPTIONS[1];
    const opening = byId(OPENINGS, draft.openingId) || OPENINGS[0];
    const interval = byId(INTERVALS, draft.intervalId) || INTERVALS[0];
    const climax = byId(CLIMAXES, draft.climaxId) || CLIMAXES[0];
    const ending = byId(ENDINGS, draft.endingId) || ENDINGS[0];
    const twist = byId(TWIST_PLACES, draft.twistPlaceId) || TWIST_PLACES[0];
    const theme = byId(THEMES, draft.themeId) || THEMES[0];
    const hook = byId(EPISODE_HOOKS, draft.episodeHookId) || EPISODE_HOOKS[0];
    const rating = ratingsFor(industry).find(item => item.id === draft.ratingId) || defaultRating(industry);
    const cap = contentCeiling(rating);
    const songs = track(draft.tracks.songs);
    const action = track(draft.tracks.action);
    const romance = track(draft.tracks.romance);
    const comedy = track(draft.tracks.comedy);
    const violence = track(draft.violence);
    const intimacy = track(draft.intimacy);
    const language = track(draft.language);
    const trend = marketTrend(industry, genre, week);
    const notes: { w: number; text: string }[] = [];
    const note = (w: number, text: string) => notes.push({ w, text });

    let audience = 46;
    let critics = 46;
    let budget = 0;
    let freshness = 90;
    let boycott = 4;
    let binge = draft.format === 'SERIES' ? 48 : 0;

    const crew = engine.crewCost;
    const minutes = draft.format === 'MOVIE'
        ? Math.max(1, draft.runtimeMinutes)
        : Math.max(1, draft.seasons) * Math.max(1, draft.episodesPerSeason) * Math.max(1, draft.episodeMinutes);

    audience += (trend.demand - 1) * 22;
    critics += (trend.bias - 1) * 6;
    note(Math.abs(trend.demand - 1) * 10 + 1, trend.demand >= 1.06
        ? `${formatGenreLabel(genre)} is ${trend.label.toLowerCase()} in ${marketLabel(industry)} right now. The market is already leaning toward this shape.`
        : trend.demand <= 0.97
            ? `${formatGenreLabel(genre)} is ${trend.label.toLowerCase()} in ${marketLabel(industry)}. A strong script can still open. It will not get a free crowd.`
            : `${formatGenreLabel(genre)} is a steady sell in ${marketLabel(industry)}. Execution has to do the work.`);

    const shape = [opening.family, interval.family, climax.family];
    const [topFamily, topCount] = majority(shape) || ['plain', 1];
    const coherence = topCount === 3 ? 1 : topCount === 2 ? 0.62 : 0.28;
    audience += (coherence - 0.5) * 10;
    critics += (coherence - 0.45) * 8;
    if (coherence < 0.4) {
        note(8, 'The opening, the interval, and the climax are telling three different films. Audiences can enjoy the parts and still forget the whole.');
    } else if (coherence === 1) {
        note(5, 'Opening, interval, and climax are the same kind of promise. The film will feel designed, which is what a second viewing needs.');
    }

    if (tone.family === topFamily) {
        audience += 4;
        critics += 3;
    } else if (tone.family !== 'plain' && topFamily !== 'plain') {
        audience -= 3;
        critics -= 2;
        note(6, `The tone is ${tone.label.toLowerCase()} and the shape is not. The poster and the last reel will argue.`);
    }

    const songSweet = genre === 'MUSICAL' || culture === 'central' ? 64 : culture === 'expected' ? 42 : 18;
    const songOver = Math.max(0, songs - songSweet - 18);
    const songUnder = (culture === 'central' || genre === 'MUSICAL') && songs < 28 ? 28 - songs : 0;
    audience += Math.min(songs, songSweet) * (culture === 'central' || genre === 'MUSICAL' ? 0.12 : culture === 'expected' ? 0.06 : 0.02);
    audience -= songUnder * 0.45;
    audience -= songOver * 0.18;
    critics += culture === 'central' && songs === 0 ? 4 : songOver * (culture === 'optional' ? -0.08 : -0.03);
    freshness -= songOver * 0.35;
    budget += songs * (culture === 'central' ? 22_000 : 14_000) * crew;
    budget += songOver * 18_000;
    if (songUnder > 8) {
        note(9, `Songs are how ${marketLabel(industry)} carries a popular film. This one is almost songless. Critics may respect it. Saturday night is harder.`);
    } else if (songOver > 12 && culture === 'optional') {
        note(7, 'The track list is doing the job of the script. In this market that reads as imported, and the budget still has to shoot every number.');
    } else if (songs > 40 && culture === 'central') {
        note(4, 'The songs are inside the market, not pasted on. They cost real money and they can carry a reel.');
    }

    if (culture !== 'optional' && interval.id === 'silence') {
        audience -= culture === 'central' ? 7 : 3;
        critics += 3;
        note(7, 'A silent interval in a cinema that waits for the turn. The second half has to win the house back without a number.');
    }
    if (culture === 'optional' && interval.id === 'song' && genre !== 'MUSICAL') {
        audience -= 2;
        critics -= 4;
        budget += 400_000;
        note(6, 'An interval song in a market that does not sell songs. It can still be beautiful. It will be called a detour.');
    }
    if (culture === 'central' && interval.family === 'mass') {
        audience += 4;
    }

    const masalaFit = tone.id === 'masala'
        ? (songs > 50 ? 0.35 : 0) + (romance > 40 ? 0.25 : 0) + (action > 25 ? 0.2 : 0) + (comedy > 25 ? 0.2 : 0)
        : 0;
    if (tone.id === 'masala') {
        const home = culture === 'central' ? 1 : culture === 'expected' ? 0.55 : 0.28;
        audience += masalaFit * 14 * home;
        critics += masalaFit * 4 * home - (1 - home) * 6;
        budget += 900_000 * crew;
        note(8, home > 0.7
            ? 'Masala with songs, feeling, and a fight is the local grammar. The crowd knows where to clap.'
            : 'Masala outside a song market plays as a stunt. Some of the crowd still comes. Critics arrive armed.');
    }
    if (tone.id === 'dark' && comedy > 60) {
        audience -= 4;
        critics -= 5;
        note(6, 'A dark film with a loud comic track. The joke lets the audience off the hook the tone just built.');
    }
    if (tone.id === 'light' && violence > 55) {
        audience -= 5;
        critics -= 2;
        note(5, 'Light tone, heavy harm. Families who came for the tone will feel ambushed.');
    }
    if (tone.id === 'epic') {
        budget += 2_600_000 * crew;
        if (draft.format === 'MOVIE' && draft.runtimeMinutes < 110) {
            audience -= 6;
            note(7, 'Epic scale in a short cut. The poster promises a journey the runtime does not pay for.');
        } else if (action > 50) {
            audience += 5;
        }
    }
    if (tone.id === 'intimate') {
        budget -= 500_000;
        critics += action < 40 ? 6 : -2;
        audience += romance > 30 || genre === 'DRAMA' ? 3 : -2;
        if (draft.format === 'MOVIE' && draft.runtimeMinutes > 160) {
            freshness -= 6;
            audience -= 3;
            note(5, 'An intimate film at a length built for a war. Fatigue arrives before the last conversation.');
        }
    }
    if (tone.id === 'satire' && (comedy < 35 || language < 15)) {
        critics -= 4;
        note(4, 'Satire without a tooth. The joke has to be allowed to speak.');
    }

    const excess = (
        Math.max(0, violence - cap.violence)
        + Math.max(0, intimacy - cap.intimacy)
        + Math.max(0, language - cap.language)
    ) / 3;
    const slack = rating.minAge >= 15 ? (
        Math.max(0, cap.violence * 0.45 - violence)
        + Math.max(0, cap.intimacy * 0.45 - intimacy)
    ) / 2 : 0;
    const censorHeat = excess;
    if (excess > 8) {
        audience -= excess * 0.22;
        critics -= excess * 0.08;
        budget += excess * 28_000;
        boycott += excess * 0.35;
        freshness -= excess * 0.15;
        note(9, `${engine.censor.name} will not call this a clean ${rating.label}. You can keep the scenes. The certificate, the cuts, and the argument all cost.`);
    } else {
        note(2, `${rating.label} from ${engine.censor.name} matches the violence, the romance, and the language closely enough to open without a fight.`);
    }
    if (slack > 18) {
        audience -= 4;
        critics -= 3;
        note(6, `The certificate says ${rating.label} and the scenes are milder than the people who seek that certificate wanted.`);
    }
    if (rating.minAge <= 8 && (genre === 'HORROR' || genre === 'THRILLER') && violence > cap.violence * 0.8) {
        audience -= 6;
        note(6, 'A fright film wearing a family certificate. Parents and horror fans are two different lines, and this cut is trying to be both.');
    }
    if (rating.restricted && (genre === 'COMEDY' || genre === 'ANIMATION') && tone.id !== 'satire' && tone.id !== 'dark') {
        audience -= 5;
        note(5, 'A soft genre with a hard certificate. The crowd that laughs in groups gets smaller, and the joke has to be worth the trip.');
    }
    if (rating.minAge === 0 && tone.id === 'masala' && excess < 8 && culture === 'central') {
        audience += 3;
    }

    if (genre === 'ROMANCE' && romance > 55) {
        audience += trend.demand > 1 ? 5 : 2;
        critics += intimacy > cap.intimacy ? -2 : 2;
    }
    if (genre === 'ACTION' && action < 30) {
        audience -= 5;
        note(5, 'Action is the genre and not the track. The set pieces will feel borrowed from a drama.');
    }
    if (genre === 'ACTION' && action > 60 && trend.bias >= 1.1) audience += 4;
    if ((genre === 'HORROR' || genre === 'THRILLER') && twist.id === 'none') {
        critics -= 4;
        note(4, 'A thriller with no turn. It can still be cruel and exact. The group chat will have less to do.');
    }
    if (twist.id === 'last-line') {
        critics += tone.family === 'dread' || genre === 'THRILLER' ? 5 : 1;
        audience += 2;
        freshness -= 2;
        note(5, 'A last-line twist is the easiest page to leak and the hardest to forget when it is fair.');
    }
    if (twist.id === 'none' && tone.id === 'earnest') critics += 1;
    if (ending.family !== tone.family && ending.family !== 'plain' && tone.family !== 'plain') {
        audience -= 2;
        if (tone.id === 'masala' && ending.id === 'tragedy') {
            audience -= 4;
            note(5, 'A masala film that ends in tragedy. The house came to be fed. Some will call it brave. More will call it a broken promise.');
        }
    }
    if (ending.id === 'joke' && (genre === 'BIOPIC' || theme.id === 'grief')) {
        critics -= 5;
        audience -= 2;
        note(4, 'The last beat makes a joke of a story the theme asked the audience to take seriously.');
    }
    if (theme.id === 'faith' && draft.villainId === 'stranger') {
        critics -= 2;
        note(3, 'Faith as a theme needs a villain who belongs to the world. A stranger makes it a pamphlet.');
    }

    if (draft.format === 'MOVIE') {
        const runtime = draft.runtimeMinutes;
        if (runtime > 170) {
            freshness -= Math.min(18, (runtime - 170) / 8);
            budget += (runtime - 170) * 35_000 * crew;
            audience -= tone.id === 'epic' ? 1 : 4;
            note(6, `${runtime} minutes. Exhibitors lose a show. The film can still be worth it. The second week feels the length.`);
        } else if (runtime < 85) {
            audience -= genre === 'COMEDY' ? 1 : 5;
            budget -= 250_000;
            note(5, `${runtime} minutes. Festivals can hold it. A wide Friday has less to sell, and the budget does come down.`);
        }
    } else {
        const episodes = Math.max(1, draft.seasons) * Math.max(1, draft.episodesPerSeason);
        const hookFit = hook.family === tone.family || hook.family === topFamily ? 1 : 0.4;
        binge += hookFit * 18;
        binge += draft.episodeMinutes >= 28 && draft.episodeMinutes <= 65 ? 8 : -6;
        binge -= Math.max(0, episodes - 24) * 0.8;
        binge += draft.seasons > 1 ? 4 : 0;
        if (hook.id === 'song' && culture === 'optional' && genre !== 'MUSICAL') binge -= 6;
        audience += (binge - 50) * 0.12;
        freshness -= Math.max(0, episodes - 30) * 0.4;
        budget += episodes * draft.episodeMinutes * 8_000 * crew;
        if (binge >= 62) note(6, 'The episode hook matches the tone, and the length is one people finish. That is a binge, not a library of hours.');
        else note(6, 'The season asks for more hours than the hook is holding. People will sample it. They may not stay.');
        if (draft.seasons > 4 && trend.demand < 1) {
            freshness -= 4;
            note(4, 'Several seasons of a genre the market is not chasing. Fatigue is a bill you pay in year three.');
        }
    }

    if (draft.adaptation) {
        const book = draft.adaptation;
        const mismatch = formatMismatchPenalty(book.preferred, draft.format);
        audience += Math.round(book.fame / 18);
        critics += book.fidelity >= 70 ? 5 : book.fidelity <= 30 ? -4 : 2;
        audience += book.fidelity >= 75 ? 3 : book.fidelity <= 25 ? -3 : 1;
        critics -= mismatch > 0 ? 4 : 0;
        audience -= mismatch > 0 ? 3 : 0;
        boycott += book.unauthorized ? 28 : book.fidelity <= 25 ? 12 : 0;
        if (book.unauthorized) {
            audience += 5;
            critics -= 8;
            note(9, `No life rights on ${book.title}. Curiosity is up. So is the lawsuit, and the boycott has a name.`);
        } else if (book.fidelity <= 30) {
            note(6, `A loose pass on ${book.title}. Critics miss the book. Fans of the original can turn, and the film may find a crowd the book never had.`);
        } else if (book.fidelity >= 75) {
            note(5, `Close to ${book.title}. The built-in audience arrives. Originality is the thing you spent.`);
        }
        if (mismatch > 0) note(5, `The rights want a ${book.preferred === 'SERIES' ? 'series' : 'film'} and this draft is the other shape. The story can survive. It starts behind.`);
    }

    const supportNoise = (action > 70 ? 1 : 0) + (songs > 75 ? 1 : 0) + (comedy > 75 ? 1 : 0);
    if (supportNoise >= 2) {
        freshness -= 5;
        audience -= 2;
        note(4, 'Two tracks are shouting. The theme gets harder to hear, and the shoot gets longer.');
    }

    audience = clamp(Math.round(audience));
    critics = clamp(Math.round(critics));
    freshness = clamp(Math.round(freshness), 22, 97);
    binge = clamp(Math.round(binge));
    boycott = clamp(Math.round(boycott));
    const quality = clamp(Math.round(
        critics * 0.46
        + audience * 0.22
        + coherence * 14
        + writerSkill * 0.16
        - excess * 0.18
        - (100 - freshness) * 0.08
    ));
    const leak = twist.id === 'none' ? 0.01 : twist.id === 'last-line' ? 0.07 : twist.id === 'opening-payoff' ? 0.02 : 0.04;
    const weeks = draft.format === 'MOVIE'
        ? Math.max(0, Math.round((draft.runtimeMinutes - 120) / 25)) + Math.round(songs / 40)
        : Math.round(draft.seasons * draft.episodesPerSeason / 5);

    const hints: string[] = [];
    if (excess > 10) hints.push('Coverage will flag the certificate. The scenes and the rating are not the same film.');
    if (coherence < 0.45) hints.push('The reader will say the structure changes genre at the interval.');
    if (songUnder > 8) hints.push('Commercial coverage in this market will ask where the songs went.');
    if (audience >= 68 && critics < 48) hints.push('A reader would call it a crowd picture and ask what the second viewing is for.');
    if (critics >= 68 && audience < 48) hints.push('It reads. The note will doubt the opening weekend.');
    if (draft.format === 'SERIES' && binge < 52) hints.push('The episode ending is not yet a reason to play the next one.');
    if (draft.adaptation && draft.adaptation.fidelity <= 30) hints.push('Adaptation coverage will spend a paragraph on what was thrown out.');
    if (!hints.length) hints.push('The spine is clear enough to spend a draft on. The risk is execution, not the premise.');
    if (freshness < 70) hints.push('The draft is already spending freshness. Another loud pass will sand it.');

    notes.sort((a, b) => b.w - a.w);
    const seen = new Set<string>();
    const lines = notes.map(item => item.text).filter(text => {
        if (seen.has(text)) return false;
        seen.add(text);
        return true;
    }).slice(0, 3);

    return {
        audience,
        critics,
        budget: Math.round(Math.max(-800_000, budget)),
        freshness,
        quality,
        binge,
        censorHeat,
        boycott,
        leak,
        weeks,
        notes: lines,
        hints: hints.slice(0, 3),
    };
};

export const loglineSuggestions = (draft: V2Draft, salt = 0): string[] => {
    const place = INDUSTRIES[draft.industry]?.place || 'the city';
    const who = draft.protagonist || 'A local';
    const goal = (byId(GOALS, draft.goalId)?.label || 'finish what they started').toLowerCase();
    const against = (byId(CONFLICTS, draft.conflictId)?.label || 'the city').toLowerCase();
    const genre = formatGenreLabel(draft.genre).toLowerCase();
    const shape = draft.format === 'SERIES' ? 'series' : 'film';
    const villain = draft.villainName || 'someone close';
    const theme = (byId(THEMES, draft.themeId)?.label || 'the choice').toLowerCase();
    const pool = [
        `In ${place}, ${who} has to ${goal}, and ${against} is the thing in the way.`,
        `A ${genre} ${shape} about ${who}, ${villain}, and a promise ${place} will not let them keep.`,
        `${who} wants one clean ending. ${place} has already sold the tickets to a messier one.`,
        `${villain} is counting on ${who} to stay quiet. ${place} has other plans.`,
        `Before the interval, ${who} still thinks this is a story about ${theme}.`,
        `Everyone in ${place} knows ${who}. Nobody knows what they did to ${goal}.`,
    ];
    const rng = mulberry(hash(`log|${draft.industry}|${draft.genre}|${who}|${salt}`));
    const chosen: string[] = [];
    const bag = [...pool];
    while (chosen.length < 3 && bag.length) {
        chosen.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
    }
    return chosen;
};

export const composeLogline = (draft: V2Draft): string => {
    if (draft.logline.trim()) return draft.logline.trim();
    return loglineSuggestions(draft)[0];
};

export const writeSynopsis = (draft: V2Draft): string => {
    const place = INDUSTRIES[draft.industry]?.place || 'the city';
    const setting = byId(SETTINGS, draft.settingId);
    const goal = byId(GOALS, draft.goalId);
    const conflict = byId(CONFLICTS, draft.conflictId);
    const villain = byId(VILLAINS, draft.villainId);
    const motive = byId(MOTIVES, draft.motiveId);
    const opening = byId(OPENINGS, draft.openingId);
    const interval = byId(INTERVALS, draft.intervalId);
    const climax = byId(CLIMAXES, draft.climaxId);
    const ending = byId(ENDINGS, draft.endingId);
    const theme = byId(THEMES, draft.themeId);
    const twist = byId(TWIST_PLACES, draft.twistPlaceId);
    const who = draft.protagonist || 'The lead';
    const foe = draft.villainName || 'the opposition';
    const length = draft.format === 'MOVIE'
        ? `${draft.runtimeMinutes} minutes`
        : `${draft.seasons} season${draft.seasons === 1 ? '' : 's'} of ${draft.episodesPerSeason} episodes, ${draft.episodeMinutes} minutes each`;
    const twistLine = !twist || twist.id === 'none'
        ? 'There is no hidden door. The ending is the one the opening promised.'
        : `The turn sits ${twist.label.toLowerCase()}.`;
    return [
        `${composeLogline(draft)} It runs ${length}, aimed at ${marketLabel(draft.industry)}, and it is about ${theme?.label.toLowerCase() || 'the choice'}.`,
        `${who} moves through ${setting?.label.toLowerCase() || place}. The goal is to ${goal?.label.toLowerCase() || 'finish'}. ${conflict?.label || 'The world'} stands in the way. ${foe} is ${villain?.label.toLowerCase() || 'the opposition'}, and the motive is ${motive?.label.toLowerCase() || 'survival'}.`,
        `It opens on ${opening?.label.toLowerCase() || 'an arrival'}. At the interval, ${interval?.label.toLowerCase() || 'the story turns'}. The climax is ${climax?.label.toLowerCase() || 'a confrontation'}, and the ending is ${ending?.label.toLowerCase() || 'unresolved'}. ${twistLine}`,
    ].join('\n\n');
};

const sceneSlug = (draft: V2Draft) => {
    const scenes = INDUSTRIES[draft.industry]?.scenes || INDUSTRIES.HOLLYWOOD.scenes;
    const index = hash(`${draft.settingId}|${draft.industry}`) % scenes.length;
    return scenes[index];
};

export const writeScene = (draft: V2Draft): string => {
    const slug = sceneSlug(draft);
    const lead = (draft.protagonist || 'ALEX').toUpperCase();
    const foe = (draft.villainName || 'MORGAN').toUpperCase();
    const goal = (byId(GOALS, draft.goalId)?.label || 'finish this').toLowerCase();
    const motive = (byId(MOTIVES, draft.motiveId)?.label || 'survive').toLowerCase();
    const tone = TONE_OPTIONS.find(item => item.id === draft.toneId);
    const songs = track(draft.tracks.songs);
    const lines = [
        (draft.title || 'UNTITLED').toUpperCase(),
        '',
        'FADE IN:',
        '',
        `INT. ${slug} - NIGHT`,
        '',
        `${draft.protagonist || 'The lead'} wants to ${goal}. The room already knows.`,
        '',
        lead,
        tone?.id === 'light' ? 'Tell me the version where this is funny.' : 'Start from the part you left out.',
        '',
        foe,
        `I did it for ${motive}. You bought a ticket to be surprised.`,
        '',
    ];
    if (songs >= 45) {
        lines.push(
            'The lights drop. A song starts, too exact to be background.',
            '',
            `SONG: "${(draft.title || 'UNTITLED').toUpperCase()} (INTERVAL)"`,
            '',
            `${lead} moves through the crowd. The lyric is doing the plot work the dialogue avoided.`,
            '',
        );
    }
    if (draft.format === 'SERIES') {
        const hook = byId(EPISODE_HOOKS, draft.episodeHookId);
        lines.push(`${hook?.label || 'A question'} hangs on the cut.`, '');
    }
    lines.push('FADE OUT.');
    return lines.join('\n');
};

export const twistOfferFor = (draft: V2Draft): PlotTwistOffer => {
    const twist = byId(TWIST_PLACES, draft.twistPlaceId) || TWIST_PLACES[0];
    const leak = twist.id === 'none' ? 0 : twist.id === 'last-line' ? 0.07 : twist.id === 'opening-payoff' ? 0.025 : 0.04;
    return {
        id: twist.id,
        label: twist.label,
        detail: twist.detail,
        risk: twist.id === 'none'
            ? 'Nothing for a leak to ruin, and less for opening weekend to argue about.'
            : 'If the turn leaks, the campaign becomes the spoiler.',
        reward: twist.detail,
        audience: 0,
        critics: 0,
        leak,
    };
};

export const blueprintFrom = (draft: V2Draft, read: V2Read, ownPages = ''): ScriptV2 => {
    const industry = isFilmIndustry(draft.industry) ? draft.industry : 'HOLLYWOOD';
    const rating = ratingsFor(industry).find(item => item.id === draft.ratingId) || defaultRating(industry);
    const label = (list: DeskOption[], id: string) => byId(list, id)?.label || id;
    const tone = TONE_OPTIONS.find(item => item.id === draft.toneId);
    const own = ownPages.trim();
    return {
        version: 2,
        format: draft.format,
        runtimeMinutes: draft.format === 'MOVIE' ? Math.max(1, Math.round(draft.runtimeMinutes)) : Math.max(1, Math.round(draft.episodeMinutes)),
        seasons: Math.max(1, Math.round(draft.seasons)),
        episodesPerSeason: Math.max(1, Math.round(draft.episodesPerSeason)),
        episodeMinutes: Math.max(1, Math.round(draft.episodeMinutes)),
        logline: composeLogline(draft),
        loglineMode: draft.loglineMode,
        settingId: draft.settingId,
        settingLabel: label(SETTINGS, draft.settingId),
        goalId: draft.goalId,
        goalLabel: label(GOALS, draft.goalId),
        conflictId: draft.conflictId,
        conflictLabel: label(CONFLICTS, draft.conflictId),
        villainId: draft.villainId,
        villainLabel: label(VILLAINS, draft.villainId),
        motiveId: draft.motiveId,
        motiveLabel: label(MOTIVES, draft.motiveId),
        openingId: draft.openingId,
        openingLabel: label(OPENINGS, draft.openingId),
        intervalId: draft.intervalId,
        intervalLabel: label(INTERVALS, draft.intervalId),
        climaxId: draft.climaxId,
        climaxLabel: label(CLIMAXES, draft.climaxId),
        endingId: draft.endingId,
        endingLabel: label(ENDINGS, draft.endingId),
        twistPlaceId: draft.twistPlaceId,
        twistPlaceLabel: label(TWIST_PLACES, draft.twistPlaceId),
        toneId: draft.toneId,
        toneLabel: tone?.label || 'Earnest',
        tracks: {
            songs: track(draft.tracks.songs),
            action: track(draft.tracks.action),
            romance: track(draft.tracks.romance),
            comedy: track(draft.tracks.comedy),
        },
        themeId: draft.themeId,
        themeLabel: label(THEMES, draft.themeId),
        episodeHookId: draft.format === 'SERIES' ? draft.episodeHookId : undefined,
        episodeHookLabel: draft.format === 'SERIES' ? label(EPISODE_HOOKS, draft.episodeHookId) : undefined,
        ratingId: rating.id,
        ratingLabel: rating.label,
        censorName: INDUSTRY_ENGINE[industry].censor.name,
        violence: track(draft.violence),
        intimacy: track(draft.intimacy),
        language: track(draft.language),
        synopsis: writeSynopsis(draft),
        sampleScene: writeScene(draft),
        ownPages: own || undefined,
        selfWritten: own.length > 0,
        protagonist: draft.protagonist,
        villainName: draft.villainName,
        hiddenQuality: read.quality,
        coverageHints: read.hints,
        binge: draft.format === 'SERIES' ? read.binge : undefined,
    };
};

const legacyAudience = (minAge: number): Script['targetAudience'] => {
    if (minAge <= 0) return 'G';
    if (minAge <= 8) return 'PG';
    if (minAge <= 13) return 'PG-13';
    if (minAge >= 18) return 'NC-17';
    return 'R';
};

export const applyV2 = (script: Script, draft: V2Draft, read: V2Read, ownPages = ''): Script => {
    const v2 = blueprintFrom(draft, read, ownPages);
    const industry = isFilmIndustry(draft.industry) ? draft.industry : 'HOLLYWOOD';
    const rating = ratingsFor(industry).find(item => item.id === draft.ratingId) || defaultRating(industry);
    const book = draft.adaptation;
    const pages = v2.selfWritten ? (v2.ownPages || v2.sampleScene) : v2.sampleScene;
    const episodes = draft.format === 'SERIES'
        ? Math.max(1, Math.round(draft.seasons) * Math.round(draft.episodesPerSeason))
        : undefined;
    const next: Script = {
        ...script,
        title: draft.title.trim() || script.title,
        genres: [draft.genre],
        projectType: draft.format,
        episodes,
        runtimeMinutes: v2.runtimeMinutes,
        logline: v2.logline,
        targetAudience: legacyAudience(rating.minAge),
        isOriginal: !book,
        sourceMaterial: book ? 'ADAPTATION' : 'ORIGINAL',
        sourceMaterialType: book?.kind === 'LIFE' ? 'LIFE_RIGHTS' : book ? 'BOOK' : undefined,
        subjectName: book?.title,
        author: script.author,
        rightsIpId: book?.ipId,
        rightsKind: book?.kind,
        fidelity: book ? Math.round(book.fidelity) : undefined,
        unauthorizedLife: Boolean(book?.unauthorized),
        publicDomainSource: book?.publicDomain,
        rightsHot: book?.hot,
        adaptationAuthorId: book?.authorId,
        regionalFanbase: book?.fans,
        sourceFame: book?.fame,
        seriesSeasonsPotential: draft.format === 'SERIES' ? Math.max(1, Math.round(draft.seasons)) : undefined,
        preferredFormat: book?.preferred,
        hype: clamp(40 + Math.round((read.audience - 50) * 0.35)),
        totalDevelopmentWeeks: Math.max(script.totalDevelopmentWeeks || 8, (script.totalDevelopmentWeeks || 8) + read.weeks),
        craft: {
            ...script.craft!,
            industry,
            source: book?.kind === 'LIFE' ? 'TRUE_STORY' : book ? 'BOOK' : 'ORIGINAL',
            toneId: draft.toneId,
            toneLabel: v2.toneLabel,
            hookId: draft.goalId,
            hookLabel: v2.goalLabel,
            climaxId: draft.climaxId,
            climaxLabel: v2.climaxLabel,
            songs: Math.round(v2.tracks.songs / 20),
            songStyle: v2.tracks.songs >= 50 ? 'filmi' : v2.tracks.songs > 0 ? 'ballad' : undefined,
            twistId: draft.twistPlaceId,
            audienceAppeal: read.audience,
            criticAppeal: read.critics,
            budgetDelta: read.budget,
            freshness: read.freshness,
            pages,
            v2,
        },
    };
    if (v2.selfWritten && (v2.ownPages || '').length < 180) {
        next.craft = {
            ...next.craft!,
            v2: {
                ...v2,
                hiddenQuality: clamp((v2.hiddenQuality || 50) - 6),
                coverageHints: ['The pages the player wrote are still short. Coverage will treat that as a shrug until the draft grows.', ...(v2.coverageHints || [])].slice(0, 3),
            },
        };
    }
    return next;
};

export const inferScriptV2 = (script: Script): ScriptV2 => {
    const craft = script.craft;
    const industry = isFilmIndustry(craft?.industry) ? craft!.industry : 'HOLLYWOOD';
    const engine = INDUSTRY_ENGINE[industry];
    const rating = defaultRating(industry);
    const format = script.projectType === 'SERIES' ? 'SERIES' : 'MOVIE';
    const songs = clamp((craft?.songs || 0) * 20);
    const lead = craft?.characters?.[0];
    const foe = craft?.characters?.find(person => /villain/i.test(person.role));
    return {
        version: 2,
        format,
        runtimeMinutes: script.runtimeMinutes || (format === 'SERIES' ? 45 : 120),
        seasons: 1,
        episodesPerSeason: format === 'SERIES' ? Math.max(1, script.episodes || 8) : 8,
        episodeMinutes: format === 'SERIES' ? (script.runtimeMinutes || 45) : 45,
        logline: script.logline || '',
        loglineMode: 'INFERRED',
        settingId: 'night-city',
        settingLabel: craft?.hookLabel || INDUSTRIES[industry].place,
        goalId: 'clear-name',
        goalLabel: craft?.hookLabel || 'Finish the story',
        conflictId: 'the-city',
        conflictLabel: 'The city',
        villainId: 'tycoon',
        villainLabel: 'The opposition',
        motiveId: 'power',
        motiveLabel: 'Power',
        openingId: 'arrival',
        openingLabel: 'An arrival',
        intervalId: 'reveal',
        intervalLabel: 'A reveal',
        climaxId: craft?.climaxId || 'quiet',
        climaxLabel: craft?.climaxLabel || 'Two people, no music',
        endingId: 'bittersweet',
        endingLabel: 'Bittersweet',
        twistPlaceId: craft?.twistId && craft.twistId !== 'none' ? 'climax' : 'none',
        twistPlaceLabel: craft?.twist?.label || 'No twist',
        toneId: craft?.toneId || 'earnest',
        toneLabel: craft?.toneLabel || 'Earnest',
        tracks: { songs, action: 35, romance: 30, comedy: 20 },
        themeId: 'family',
        themeLabel: 'Family',
        ratingId: rating.id,
        ratingLabel: rating.label,
        censorName: engine.censor.name,
        violence: 24,
        intimacy: 16,
        language: 10,
        synopsis: script.logline || '',
        sampleScene: craft?.pages || '',
        selfWritten: false,
        protagonist: lead?.name || '',
        villainName: foe?.name || '',
        inferred: true,
        hiddenQuality: script.quality,
    };
};

/** Adds a v2 block to older drafts. Does not retune quality, weeks, or money. */
export const attachScriptV2 = (script: Script): Script => {
    if (!script.craft || script.craft.v2) return script;
    return { ...script, craft: { ...script.craft, v2: inferScriptV2(script) } };
};

export const runtimeLine = (script: Pick<Script, 'projectType' | 'episodes' | 'runtimeMinutes' | 'craft'>): string => {
    const v2 = script.craft?.v2;
    if (v2?.inferred && script.projectType === 'SERIES') {
        return script.episodes ? `${script.episodes} episodes` : '';
    }
    if (v2?.format === 'SERIES') {
        return `${v2.seasons} season${v2.seasons === 1 ? '' : 's'} · ${v2.episodesPerSeason} × ${v2.episodeMinutes} min`;
    }
    if (v2?.format === 'MOVIE') return `${v2.runtimeMinutes} min`;
    if (script.runtimeMinutes) return `${script.runtimeMinutes} min`;
    if (script.projectType === 'SERIES' && script.episodes) return `${script.episodes} episodes`;
    return '';
};
