/**
 * Censor approval.
 * A finished film or series is filed with each country's real board.
 * The script's certificate, violence, romance, and language, plus genre and heat,
 * decide the weeks, the cuts, a higher card, or a refusal.
 * Nothing here is a hard ban. A hotter print waits longer, loses a scene, or opens smaller.
 * Pictures that already had a date, and pictures already out, are left on the old calendar.
 */
import type {
    CensorBeat,
    CensorCut,
    CensorDocket,
    CensorFiling,
    CensorStatus,
    Commitment,
    FilmIndustryId,
    Genre,
    NewsItem,
    Player,
    ProjectDetails,
} from '../types';
import { INDUSTRY_ENGINE, type RatingLabel } from './industryEngine';
import { getAbsoluteWeek } from './legacyLogic';
import { chargeProductionHouse } from './releaseGauntlet';
import { contentCeiling, ratingsFor } from './scriptDesk/v2';
import { isFilmIndustry } from './scriptDesk/catalog';
import { readHqIndustry } from './studioRegions';

export interface CensorTerritory {
    id: string;
    industryId: FilmIndustryId;
    country: string;
    note: string;
}

export const CENSOR_TERRITORIES: CensorTerritory[] = [
    { id: 'US', industryId: 'HOLLYWOOD', country: 'United States', note: 'The MPA card is a deal with exhibitors and parents. NC-17 is still a release. It is a smaller one.' },
    { id: 'INDIA', industryId: 'BOLLYWOOD', country: 'India', note: 'One CBFC certificate covers Hindi, Telugu, Tamil, and Malayalam dates.' },
    { id: 'NIGERIA', industryId: 'NOLLYWOOD', country: 'Nigeria', note: 'NFVCB classifies the film before cinemas can book it.' },
    { id: 'KOREA', industryId: 'KOREAN', country: 'South Korea', note: 'A restricted card cuts the show count. It does not erase the film.' },
    { id: 'UK', industryId: 'BRITISH', country: 'United Kingdom', note: 'European dates on this desk ride the BBFC card.' },
    { id: 'CHINA', industryId: 'CHINESE', country: 'China', note: 'Approval before the date. A hold moves the holiday. It is not a public age ladder.' },
    { id: 'MEXICO', industryId: 'LATIN', country: 'Mexico', note: 'Brazil and the neighbors share this age ladder on the desk.' },
    { id: 'JAPAN', industryId: 'JAPANESE', country: 'Japan', note: 'Eirin classifies the print. A restricted card changes which houses book it.' },
];

const REVIEW_WEEKS: Record<string, number> = {
    CBFC: 6,
    MPA: 3,
    BBFC: 4,
    KMRB: 5,
    EIRIN: 4,
    NFVCB: 5,
    CHINA: 8,
    LATAM: 5,
};

const APPEAL_FEE: Record<string, number> = {
    CBFC: 40_000,
    MPA: 80_000,
    BBFC: 35_000,
    KMRB: 45_000,
    EIRIN: 40_000,
    NFVCB: 18_000,
    CHINA: 140_000,
    LATAM: 28_000,
};

const RECUT_FEE: Record<string, number> = {
    CBFC: 35_000,
    MPA: 55_000,
    BBFC: 30_000,
    KMRB: 40_000,
    EIRIN: 32_000,
    NFVCB: 12_000,
    CHINA: 90_000,
    LATAM: 22_000,
};

const hash = (input: string): number => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const territoryById = (id?: string | null): CensorTerritory =>
    CENSOR_TERRITORIES.find(row => row.id === id) || CENSOR_TERRITORIES[0];

export const territoryForIndustry = (id?: FilmIndustryId | null): string => {
    if (id === 'BOLLYWOOD' || id === 'TOLLYWOOD' || id === 'KOLLYWOOD' || id === 'MOLLYWOOD') return 'INDIA';
    if (id === 'NOLLYWOOD') return 'NIGERIA';
    if (id === 'KOREAN') return 'KOREA';
    if (id === 'BRITISH') return 'UK';
    if (id === 'CHINESE') return 'CHINA';
    if (id === 'LATIN') return 'MEXICO';
    if (id === 'JAPANESE') return 'JAPAN';
    return 'US';
};

export const territoryScale = (territoryId: string): number => {
    if (territoryId === 'INDIA') {
        const south = INDUSTRY_ENGINE.TOLLYWOOD.marketScale
            + INDUSTRY_ENGINE.KOLLYWOOD.marketScale
            + INDUSTRY_ENGINE.MOLLYWOOD.marketScale;
        return INDUSTRY_ENGINE.BOLLYWOOD.marketScale + south * 0.45;
    }
    return INDUSTRY_ENGINE[territoryById(territoryId).industryId].marketScale;
};

export const orderedTerritories = (homeId?: string | null): CensorTerritory[] => {
    const home = territoryById(homeId);
    return [home, ...CENSOR_TERRITORIES.filter(row => row.id !== home.id)];
};

const boardOf = (industryId: FilmIndustryId) => INDUSTRY_ENGINE[industryId].censor;

const closestRating = (ratings: RatingLabel[], minAge: number): RatingLabel =>
    [...ratings].sort((a, b) => Math.abs(a.minAge - minAge) - Math.abs(b.minAge - minAge) || a.minAge - b.minAge)[0];

export const suggestedRating = (
    territoryIndustry: FilmIndustryId,
    scriptIndustry?: FilmIndustryId | null,
    scriptRatingId?: string | null,
): RatingLabel => {
    const ratings = ratingsFor(territoryIndustry);
    const scriptBoard = scriptIndustry ? INDUSTRY_ENGINE[scriptIndustry].censor.id : '';
    if (scriptBoard && scriptBoard === INDUSTRY_ENGINE[territoryIndustry].censor.id && scriptRatingId) {
        const match = ratings.find(row => row.id === scriptRatingId);
        if (match) return match;
    }
    const scriptRating = scriptIndustry && scriptRatingId
        ? ratingsFor(scriptIndustry).find(row => row.id === scriptRatingId)
        : undefined;
    return closestRating(ratings, scriptRating?.minAge ?? 13);
};

const stepUp = (ratings: RatingLabel[], ratingId: string, steps: number): RatingLabel => {
    const index = Math.max(0, ratings.findIndex(row => row.id === ratingId));
    return ratings[Math.min(ratings.length - 1, index + Math.max(0, steps))] || ratings[index] || ratings[0];
};

const ageGap = (ratings: RatingLabel[], fromId: string, toId: string): number => {
    const from = ratings.findIndex(row => row.id === fromId);
    const to = ratings.findIndex(row => row.id === toId);
    if (from < 0 || to < 0) return 0;
    return Math.max(0, to - from);
};

interface ContentRead {
    violence: number;
    intimacy: number;
    language: number;
    heat: number;
    genre?: Genre;
    themeId?: string;
    villainId?: string;
    toneId?: string;
    scriptRatingId?: string;
    scriptRatingLabel?: string;
    scriptIndustryId?: FilmIndustryId;
}

const socialHeat = (player: Player): number => Math.max(
    player.instagram?.controversy || 0,
    player.youtube?.controversy || 0,
);

const readScript = (player: Player, details: ProjectDetails): ContentRead => {
    const studios = player.businesses || [];
    const scripts = studios.flatMap(business => business.studioState?.scripts || []);
    const script = scripts.find(row => row.id === details.scriptId)
        || scripts.find(row => row.title === details.title || row.name === details.title);
    const v2 = script?.craft?.v2;
    const industry = isFilmIndustry(script?.craft?.industry) ? script!.craft!.industry : undefined;
    const audienceAge: Record<string, number> = { G: 0, PG: 8, 'PG-13': 13, R: 17, 'NC-17': 18 };
    if (!v2) {
        const age = audienceAge[details.targetAudience || 'PG-13'] ?? 13;
        const mild = age >= 17 ? 60 : age >= 13 ? 36 : 18;
        return {
            violence: mild,
            intimacy: Math.round(mild * 0.7),
            language: Math.round(mild * 0.5),
            heat: 8,
            genre: details.genre,
            scriptIndustryId: industry,
        };
    }
    const leak = script?.craft?.leak?.heat || 0;
    const boycott = v2.risks?.boycott || 0;
    return {
        violence: clamp(v2.violence || 0, 0, 100),
        intimacy: clamp(v2.intimacy || 0, 0, 100),
        language: clamp(v2.language || 0, 0, 100),
        heat: clamp(boycott * 0.75 + leak * 0.45, 0, 100),
        genre: details.genre || script?.genres?.[0],
        themeId: v2.themeId,
        villainId: v2.villainId,
        toneId: v2.toneId,
        scriptRatingId: v2.ratingId,
        scriptRatingLabel: v2.ratingLabel,
        scriptIndustryId: industry,
    };
};

export const scriptCertificate = (player: Player, details?: ProjectDetails | null): ContentRead | null => {
    if (!details) return null;
    return readScript(player, details);
};

const emptyDocket = (homeTerritoryId: string, content: ContentRead, grandfathered = false): CensorDocket => ({
    grandfathered,
    filings: [],
    violence: content.violence,
    intimacy: content.intimacy,
    language: content.language,
    heat: content.heat,
    genre: content.genre,
    themeId: content.themeId,
    villainId: content.villainId,
    toneId: content.toneId,
    scriptRatingId: content.scriptRatingId,
    scriptRatingLabel: content.scriptRatingLabel,
    scriptIndustryId: content.scriptIndustryId,
    homeTerritoryId,
    inferred: grandfathered,
});

export const isHouseProject = (player: Player, details?: ProjectDetails | null): boolean =>
    !!details && (player.businesses || []).some(business => business.type === 'PRODUCTION_HOUSE' && business.id === details.studioId);

export const censorApplies = (player: Player, details?: ProjectDetails | null): boolean => {
    if (!details || details.censor?.grandfathered) return false;
    return isHouseProject(player, details);
};

export const homeTerritoryFor = (player: Player, details?: ProjectDetails | null): string => {
    const studio = (player.businesses || []).find(business => business.id === details?.studioId);
    return territoryForIndustry(readHqIndustry(studio?.studioState, player.homeIndustryId));
};

const grandfatherDocket = (): CensorDocket => emptyDocket('US', {
    violence: 0, intimacy: 0, language: 0, heat: 0,
}, true);

/** Old dates and pictures already in release stay on the old calendar. */
export const migrateCensorSaves = (player: Player): Player => {
    if (!player) return player;
    let changed = false;
    const commitments = (player.commitments || []).map(commitment => {
        const details = commitment.projectDetails;
        if (!details || details.censor) return commitment;
        if (!details.releaseStrategy) return commitment;
        changed = true;
        return { ...commitment, projectDetails: { ...details, censor: grandfatherDocket() } };
    });
    const activeReleases = (player.activeReleases || []).map(release => {
        if (!release.projectDetails || release.projectDetails.censor) return release;
        changed = true;
        return { ...release, projectDetails: { ...release.projectDetails, censor: grandfatherDocket() } };
    });
    if (!changed) return player;
    return { ...player, commitments, activeReleases };
};

const pushLog = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...(player.logs || [])].slice(0, 50),
});

const pushNews = (player: Player, item: NewsItem): Player => ({
    ...player,
    news: [item, ...(player.news || [])].slice(0, 50),
});

const newsItem = (player: Player, projectId: string, headline: string, subtext: string, impact: 'LOW' | 'MEDIUM' | 'HIGH'): NewsItem => ({
    id: `news_censor_${projectId}_${player.currentWeek}_${hash(headline + subtext).toString(36)}`,
    headline,
    subtext,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: impact,
    projectId,
});

interface Located {
    player: Player;
    details: ProjectDetails;
    write: (details: ProjectDetails, player?: Player) => Player;
    commitment?: Commitment;
}

const locate = (player: Player, projectId: string): Located | null => {
    const commitment = (player.commitments || []).find(row => row.id === projectId && row.projectDetails);
    if (commitment?.projectDetails) {
        return {
            player,
            details: commitment.projectDetails,
            commitment,
            write: (details, base = player) => ({
                ...base,
                commitments: base.commitments.map(row => row.id === projectId ? { ...row, projectDetails: details } : row),
            }),
        };
    }
    const release = (player.activeReleases || []).find(row => row.id === projectId && row.projectDetails);
    if (!release?.projectDetails) return null;
    return {
        player,
        details: release.projectDetails,
        write: (details, base = player) => ({
            ...base,
            activeReleases: (base.activeReleases || []).map(row => row.id === projectId ? { ...row, projectDetails: details } : row),
        }),
    };
};

const ensureDocket = (player: Player, details: ProjectDetails): CensorDocket => {
    if (details.censor && !details.censor.grandfathered) return details.censor;
    return emptyDocket(homeTerritoryFor(player, details), readScript(player, details));
};

const beat = (player: Player, text: string): CensorBeat => ({
    week: player.currentWeek,
    year: player.age,
    text,
});

const withBeat = (filing: CensorFiling, entry: CensorBeat): CensorFiling => ({
    ...filing,
    beats: [...filing.beats, entry].slice(-8),
});

export const censorStatusLabel = (filing: CensorFiling): string => {
    if (filing.status === 'PENDING') return 'Pending';
    if (filing.status === 'UNDER_REVIEW') return 'Under review';
    if (filing.status === 'CUTS_REQUESTED') return 'Cuts requested';
    if (filing.status === 'RATING_OFFERED') return 'Higher rating';
    if (filing.status === 'APPROVED') return 'Approved';
    return 'Rejected';
};

export const filingProgress = (filing: CensorFiling): number => {
    if (filing.status === 'APPROVED' || filing.status === 'REJECTED' || filing.status === 'CUTS_REQUESTED' || filing.status === 'RATING_OFFERED') return 1;
    const total = Math.max(1, filing.status === 'PENDING' ? 1 : filing.reviewWeeks);
    return clamp(1 - Math.max(0, filing.weeksLeft) / total, 0, 1);
};

export const filingClock = (filing: CensorFiling): string => {
    if (filing.status === 'PENDING') return filing.weeksLeft === 1 ? 'Paperwork · 1 week' : `Paperwork · ${filing.weeksLeft} weeks`;
    if (filing.status === 'UNDER_REVIEW') return filing.weeksLeft === 1 ? '1 week left' : `${Math.max(0, filing.weeksLeft)} weeks left`;
    if (filing.status === 'CUTS_REQUESTED') return 'The clock is stopped';
    if (filing.status === 'RATING_OFFERED') return 'Waiting on your answer';
    if (filing.status === 'APPROVED') return filing.certificateNo || 'Certified';
    return 'No certificate';
};

export const censorBadge = (details?: ProjectDetails | null): string => {
    const filings = details?.censor?.filings || [];
    if (!filings.length || details?.censor?.grandfathered) return '';
    if (filings.some(row => row.status === 'CUTS_REQUESTED')) return 'Cuts requested';
    if (filings.some(row => row.status === 'REJECTED')) return 'Board refused';
    if (filings.some(row => row.status === 'RATING_OFFERED')) return 'Higher rating';
    const approved = filings.filter(row => row.status === 'APPROVED').length;
    if (approved) return approved === 1 ? '1 certificate' : `${approved} certificates`;
    return 'With the board';
};

export interface CensorPick {
    territoryId: string;
    ratingId: string;
}

const certificateNo = (boardId: string, ratingId: string, year: number, seed: string): string => {
    const n = 1000 + (hash(seed) % 9000);
    return `${boardId}/${ratingId}/${year}/${n}`;
};

const calendarYear = (age: number) => 2024 + (age - 18);

interface OverLine {
    violence: number;
    intimacy: number;
    language: number;
    weighted: number;
    steps: number;
    politics: number;
}

const overLine = (docket: CensorDocket, rating: RatingLabel, industryId: FilmIndustryId, boardId: string): OverLine => {
    const cap = contentCeiling(rating);
    const violence = Math.max(0, docket.violence - cap.violence);
    const intimacy = Math.max(0, docket.intimacy - cap.intimacy);
    const language = Math.max(0, docket.language - cap.language);
    const politicsTheme = docket.themeId === 'faith' || docket.themeId === 'justice' || docket.themeId === 'class';
    const rawPolitics = (politicsTheme ? 16 : 0) + (docket.villainId === 'system' ? 10 : 0) + (docket.toneId === 'satire' ? 6 : 0);
    const politics = Math.max(0, rawPolitics - (docket.politicsTrim || 0));
    let wv = 1;
    let wi = 1;
    let wl = 1;
    if (boardId === 'CBFC') { wi = 1.45; wl = 1.35; }
    if (boardId === 'MPA') wv = 1.25;
    if (boardId === 'CHINA') { wi = 1.2; wl = 1.1; }
    const weighted = (violence * wv + intimacy * wi + language * wl) / (wv + wi + wl);
    const ratings = ratingsFor(industryId);
    let steps = 0;
    let cursor = rating;
    while (steps < ratings.length) {
        const nextCap = contentCeiling(cursor);
        const over = (
            Math.max(0, docket.violence - nextCap.violence)
            + Math.max(0, docket.intimacy - nextCap.intimacy)
            + Math.max(0, docket.language - nextCap.language)
        ) / 3;
        if (over <= 8) break;
        const higher = stepUp(ratings, cursor.id, 1);
        if (higher.id === cursor.id) break;
        steps += 1;
        cursor = higher;
    }
    const fright = (docket.genre === 'HORROR' || docket.genre === 'THRILLER') && rating.minAge < 12 ? 8 : 0;
    return { violence, intimacy, language, weighted: weighted + fright, steps, politics };
};

const cutLibrary: Record<CensorCut['axis'], { scene: string; detail: string }[]> = {
    violence: [
        { scene: 'The warehouse fight', detail: 'The examining committee marked the close shots. Shorten them, or lose the sequence.' },
        { scene: 'The third-act beating', detail: 'The blood stays on screen too long for the card you asked for.' },
        { scene: 'The opening kill', detail: 'They will pass the story. They will not pass the first two minutes as cut.' },
    ],
    intimacy: [
        { scene: 'The bedroom after the interval', detail: 'The scene can stay. The length of it cannot, not on this certificate.' },
        { scene: 'The hotel cutaway', detail: 'One shot is doing the work of a scene. They want it shorter.' },
        { scene: 'The kiss in the school corridor', detail: 'Too explicit for the age on the application.' },
    ],
    language: [
        { scene: 'The argument in the kitchen', detail: 'They counted the words. Mute them, or rewrite the fight.' },
        { scene: 'The interrogation', detail: 'The insult is the line they circled. The rest of the scene can stay.' },
        { scene: 'The end-credit sting', detail: 'One word, after the audience thinks the film is over. They still heard it.' },
    ],
    politics: [
        { scene: 'The minister’s speech', detail: 'The board will not pass the speech as written. Cut it or cover the line.' },
        { scene: 'The shrine', detail: 'The image is the problem, not the plot. Cover it or take it out.' },
        { scene: 'The protest montage', detail: 'The flags and the chant. The board wants that passage gone.' },
    ],
};

const makeCuts = (docket: CensorDocket, filing: CensorFiling, over: OverLine, seed: string): CensorCut[] => {
    const axes: CensorCut['axis'][] = [];
    if (over.violence > 6) axes.push('violence');
    if (over.intimacy > 6) axes.push('intimacy');
    if (over.language > 6) axes.push('language');
    if (over.politics > 14 && (filing.boardId === 'CHINA' || filing.boardId === 'CBFC' || filing.boardId === 'NFVCB')) axes.push('politics');
    if (!axes.length && over.weighted > 8) axes.push(over.violence >= over.intimacy ? 'violence' : 'intimacy');
    return axes.slice(0, 3).map((axis, index) => {
        const bank = cutLibrary[axis];
        const pick = bank[hash(`${seed}|${axis}|${index}`) % bank.length];
        const pressure = axis === 'politics' ? over.politics
            : axis === 'violence' ? over.violence
                : axis === 'intimacy' ? over.intimacy
                    : over.language;
        return {
            id: `${filing.territoryId}_${axis}_${index}`,
            axis,
            scene: pick.scene,
            detail: pick.detail,
            quality: clamp(Math.round(1 + pressure / 28), 1, 3),
            audience: pressure > 22 ? 2 : 1,
            slider: clamp(Math.round(8 + pressure / 4), 8, 18),
        };
    });
};

const reviewWeeksFor = (boardId: string, heat: number, seed: string): number => {
    const base = REVIEW_WEEKS[boardId] ?? 5;
    return base + (hash(seed) % 3) + (heat > 55 ? 1 : 0);
};

type Decision =
    | { kind: 'APPROVED'; rating: RatingLabel; note: string; crowdCut?: number }
    | { kind: 'CUTS'; cuts: CensorCut[]; offered?: RatingLabel; crowdCut?: number; note: string }
    | { kind: 'RATING'; rating: RatingLabel; note: string; crowdCut: number }
    | { kind: 'REJECTED'; note: string };

const decide = (docket: CensorDocket, filing: CensorFiling, social: number, seed: string): Decision => {
    const ratings = ratingsFor(filing.industryId);
    const requested = ratings.find(row => row.id === filing.requestedRatingId) || ratings[0];
    const over = overLine(docket, requested, filing.industryId, filing.boardId);
    const roll = (hash(seed) % 1000) / 1000;
    const heat = clamp(docket.heat * 0.65 + social * 0.4, 0, 100);
    const offered = stepUp(ratings, requested.id, Math.max(1, over.steps));
    const crowdCut = clamp(ageGap(ratings, requested.id, offered.id) * 0.035 + (offered.restricted ? 0.04 : 0), 0, 0.16);

    if (filing.passes > 0) {
        if (roll < 0.84 - heat / 500) {
            return { kind: 'APPROVED', rating: requested, note: `${filing.boardName} passed the recut as ${requested.label}.` };
        }
        if (over.steps > 0 && roll < 0.96) {
            return {
                kind: 'RATING',
                rating: offered,
                crowdCut,
                note: `The recut is cleaner. ${filing.boardName} will certificate it as ${offered.label}, not ${requested.label}.`,
            };
        }
    }

    const china = filing.boardId === 'CHINA';
    const prefersRating = filing.boardId === 'MPA' || filing.boardId === 'BBFC' || filing.boardId === 'EIRIN' || filing.boardId === 'KMRB' || filing.boardId === 'LATAM';
    const nasty = over.weighted > 22 || (over.politics > 22 && heat > 48);

    if (over.weighted < 7 && over.politics < 14 && heat < 78) {
        return { kind: 'APPROVED', rating: requested, note: `${requested.label} matches the print closely enough. ${filing.boardName} is not arguing.` };
    }

    if (china && nasty && roll < 0.34 + heat / 400) {
        return { kind: 'REJECTED', note: 'Held. The film is not approved, and a date that assumes otherwise will move.' };
    }
    if (!china && nasty && roll < 0.08 + heat / 700 && filing.boardId !== 'MPA') {
        return { kind: 'REJECTED', note: `${filing.boardName} refused the certificate. The print can come back. It cannot open like this.` };
    }

    if (prefersRating && over.steps > 0 && (over.weighted > 8 || roll < 0.55)) {
        if (over.weighted > 16 && roll < 0.28) {
            const cuts = makeCuts(docket, filing, over, seed).slice(0, 2);
            if (cuts.length) {
                return {
                    kind: 'CUTS',
                    cuts,
                    offered,
                    crowdCut,
                    note: `${filing.boardName} will go to ${offered.label}, or you can cut and try again for ${requested.label}.`,
                };
            }
        }
        return {
            kind: 'RATING',
            rating: offered,
            crowdCut,
            note: `The board will not call this a clean ${requested.label}. The certificate on the table is ${offered.label}.`,
        };
    }

    if (over.weighted > 6 || over.politics > 14 || heat > 62) {
        const cuts = makeCuts(docket, filing, over, seed);
        if (!cuts.length) {
            return { kind: 'APPROVED', rating: requested, note: `${filing.boardName} sat on it while the noise was loud. The print itself is inside ${requested.label}.` };
        }
        const alsoRating = over.steps > 0 && roll < 0.42;
        return {
            kind: 'CUTS',
            cuts,
            offered: alsoRating ? offered : undefined,
            crowdCut: alsoRating ? crowdCut : undefined,
            note: alsoRating
                ? `${filing.boardName} marked scenes. They will also certificate the uncut print as ${offered.label}.`
                : `${filing.boardName} marked scenes. Without the cuts, the certificate does not move.`,
        };
    }

    return { kind: 'APPROVED', rating: requested, note: `${filing.boardName} passed it as ${requested.label}. The argument was smaller than the print.` };
};

const applyDecision = (player: Player, filing: CensorFiling, docket: CensorDocket, social: number): CensorFiling => {
    const seed = `${filing.territoryId}|${filing.passes}|${Math.round(docket.violence)}|${Math.round(docket.intimacy)}|${Math.round(docket.language)}|${player.currentWeek}`;
    const decision = decide(docket, filing, social, seed);
    if (decision.kind === 'APPROVED') {
        const year = calendarYear(player.age);
        return withBeat({
            ...filing,
            status: 'APPROVED',
            weeksLeft: 0,
            grantedRatingId: decision.rating.id,
            grantedRatingLabel: decision.rating.label,
            offeredRatingId: undefined,
            offeredRatingLabel: undefined,
            cuts: [],
            crowdCut: decision.crowdCut || 0,
            certificateNo: certificateNo(filing.boardId, decision.rating.id, year, `${seed}|cert`),
            note: decision.note,
        }, beat(player, decision.note));
    }
    if (decision.kind === 'REJECTED') {
        return withBeat({
            ...filing,
            status: 'REJECTED',
            weeksLeft: 0,
            cuts: [],
            note: decision.note,
        }, beat(player, decision.note));
    }
    if (decision.kind === 'RATING') {
        return withBeat({
            ...filing,
            status: 'RATING_OFFERED',
            weeksLeft: 0,
            offeredRatingId: decision.rating.id,
            offeredRatingLabel: decision.rating.label,
            crowdCut: decision.crowdCut,
            cuts: [],
            note: decision.note,
        }, beat(player, decision.note));
    }
    if (!decision.cuts.length) {
        if (decision.offered) {
            return withBeat({
                ...filing,
                status: 'RATING_OFFERED',
                weeksLeft: 0,
                offeredRatingId: decision.offered.id,
                offeredRatingLabel: decision.offered.label,
                crowdCut: decision.crowdCut,
                cuts: [],
                note: decision.note,
            }, beat(player, decision.note));
        }
        const year = calendarYear(player.age);
        const note = `${filing.boardName} passed it as ${requestedSafe(filing).label}. There was no cut list.`;
        const rating = requestedSafe(filing);
        return withBeat({
            ...filing,
            status: 'APPROVED',
            weeksLeft: 0,
            grantedRatingId: rating.id,
            grantedRatingLabel: rating.label,
            cuts: [],
            certificateNo: certificateNo(filing.boardId, rating.id, year, `${filing.territoryId}|empty-cuts`),
            note,
        }, beat(player, note));
    }
    return withBeat({
        ...filing,
        status: 'CUTS_REQUESTED',
        weeksLeft: 0,
        cuts: decision.cuts,
        offeredRatingId: decision.offered?.id,
        offeredRatingLabel: decision.offered?.label,
        crowdCut: decision.crowdCut,
        note: decision.note,
    }, beat(player, decision.note));
};

const requestedSafe = (filing: CensorFiling): RatingLabel =>
    ratingsFor(filing.industryId).find(row => row.id === filing.requestedRatingId) || ratingsFor(filing.industryId)[0];

const outcomeTone = (status: CensorStatus): 'positive' | 'negative' | 'neutral' => {
    if (status === 'APPROVED') return 'positive';
    if (status === 'REJECTED' || status === 'CUTS_REQUESTED') return 'negative';
    return 'neutral';
};

const finishAppeal = (player: Player, filing: CensorFiling): CensorFiling => {
    const ratings = ratingsFor(filing.industryId);
    const requested = ratings.find(row => row.id === filing.requestedRatingId) || ratings[0];
    const year = calendarYear(player.age);
    const clear = { pendingAppeal: undefined };
    if (filing.pendingAppeal === 'WON') {
        const note = `The appeal committee certified it as ${requested.label}.`;
        return withBeat({
            ...filing,
            ...clear,
            status: 'APPROVED',
            weeksLeft: 0,
            grantedRatingId: requested.id,
            grantedRatingLabel: requested.label,
            certificateNo: certificateNo(filing.boardId, requested.id, year, `${filing.territoryId}|appeal|${filing.appeals}`),
            note,
        }, beat(player, note));
    }
    if (filing.pendingAppeal === 'PARTIAL') {
        const offered = ratings.find(row => row.id === filing.offeredRatingId) || stepUp(ratings, requested.id, 1);
        const note = `The appeal did not restore ${requested.label}. They certified the print as ${offered.label}.`;
        return withBeat({
            ...filing,
            ...clear,
            status: 'APPROVED',
            weeksLeft: 0,
            grantedRatingId: offered.id,
            grantedRatingLabel: offered.label,
            crowdCut: filing.crowdCut || clamp(0.04 + (offered.restricted ? 0.04 : 0), 0, 0.16),
            certificateNo: certificateNo(filing.boardId, offered.id, year, `${filing.territoryId}|appeal-partial|${filing.appeals}`),
            note,
        }, beat(player, note));
    }
    const note = `The appeal was dismissed. ${filing.boardName} stood by the refusal.`;
    return withBeat({
        ...filing,
        ...clear,
        status: 'REJECTED',
        weeksLeft: 0,
        note: filing.appeals >= 2 ? `${note} They will not hear it again.` : note,
    }, beat(player, note));
};

const headlineFor = (title: string, before: CensorFiling, after: CensorFiling): { headline: string; subtext: string; impact: 'LOW' | 'MEDIUM' | 'HIGH' } | null => {
    if (before.status === after.status && before.weeksLeft + 1 === after.weeksLeft) return null;
    if (after.status === 'UNDER_REVIEW' && before.status === 'PENDING') {
        return {
            headline: `${after.boardName} is examining ${title}`,
            subtext: after.note || `The print is with the committee in ${after.country}.`,
            impact: 'LOW',
        };
    }
    if (before.heldWeeks !== after.heldWeeks) {
        return {
            headline: `${title} is stuck at ${after.boardName}`,
            subtext: after.beats[after.beats.length - 1]?.text || 'The sitting slipped.',
            impact: 'MEDIUM',
        };
    }
    if (after.status === 'APPROVED') {
        return {
            headline: `${after.boardName} certified ${title}`,
            subtext: `${after.grantedRatingLabel} in ${after.country}. ${after.certificateNo || ''}`.trim(),
            impact: 'MEDIUM',
        };
    }
    if (after.status === 'CUTS_REQUESTED') {
        return {
            headline: `${after.boardName} wants cuts on ${title}`,
            subtext: after.note,
            impact: 'HIGH',
        };
    }
    if (after.status === 'RATING_OFFERED') {
        return {
            headline: `${after.boardName} offered ${title} a ${after.offeredRatingLabel}`,
            subtext: `The application asked for ${after.requestedRatingLabel}. ${after.note}`,
            impact: 'MEDIUM',
        };
    }
    if (after.status === 'REJECTED') {
        return {
            headline: `${after.boardName} refused ${title}`,
            subtext: after.note,
            impact: 'HIGH',
        };
    }
    return null;
};

const tickFiling = (player: Player, title: string, projectId: string, docket: CensorDocket, filing: CensorFiling): { filing: CensorFiling; log?: string; news?: NewsItem; tone: 'positive' | 'negative' | 'neutral' } => {
    if (filing.status === 'APPROVED' || filing.status === 'REJECTED' || filing.status === 'CUTS_REQUESTED' || filing.status === 'RATING_OFFERED') {
        return { filing, tone: 'neutral' };
    }
    const social = socialHeat(player);
    const pressure = docket.heat * 0.65 + social * 0.45;
    let next: CensorFiling = { ...filing, beats: [...filing.beats] };
    if (next.status === 'UNDER_REVIEW' && !next.delayUsed && next.weeksLeft <= 2 && pressure > 38) {
        const roll = hash(`${projectId}|${filing.territoryId}|${filing.passes}|delay|${player.currentWeek}`) % 100;
        if (roll < 18 + Math.min(36, pressure / 2)) {
            const extra = 1 + (hash(`${projectId}|${filing.territoryId}|extra|${player.currentWeek}`) % (pressure > 72 ? 3 : 2));
            const why = social > docket.heat ? 'The controversy outside the office' : 'A boycott';
            const text = `${why} slowed the ${filing.boardName} sitting by ${extra} week${extra === 1 ? '' : 's'}.`;
            next = withBeat({
                ...next,
                weeksLeft: next.weeksLeft + extra,
                reviewWeeks: next.reviewWeeks + extra,
                heldWeeks: next.heldWeeks + extra,
                delayUsed: true,
                note: text,
            }, beat(player, text));
        }
    }
    next = { ...next, weeksLeft: next.weeksLeft - 1 };
    if (next.weeksLeft > 0) {
        const item = headlineFor(title, filing, next);
        return {
            filing: next,
            tone: next.heldWeeks !== filing.heldWeeks ? 'negative' : 'neutral',
            log: next.heldWeeks !== filing.heldWeeks ? next.note : undefined,
            news: item ? newsItem(player, projectId, item.headline, item.subtext, item.impact) : undefined,
        };
    }
    if (next.status === 'PENDING') {
        const weeks = reviewWeeksFor(next.boardId, docket.heat + social * 0.3, `${projectId}|${next.territoryId}|review`);
        const text = `${next.boardName} has the print. The committee starts its ${weeks}-week sitting.`;
        next = withBeat({
            ...next,
            status: 'UNDER_REVIEW',
            reviewWeeks: weeks,
            weeksLeft: weeks,
            note: text,
        }, beat(player, text));
        return {
            filing: next,
            tone: 'neutral',
            log: `${title} is under review at ${next.boardName}.`,
            news: newsItem(player, projectId, `${next.boardName} is examining ${title}`, text, 'LOW'),
        };
    }
    const resolved = next.pendingAppeal
        ? finishAppeal(player, next)
        : applyDecision(player, { ...next, status: 'UNDER_REVIEW' }, docket, social);
    const item = headlineFor(title, filing, resolved);
    return {
        filing: resolved,
        tone: outcomeTone(resolved.status),
        log: resolved.note,
        news: item ? newsItem(player, projectId, item.headline, item.subtext, item.impact) : undefined,
    };
};

export interface CensorTick {
    player: Player;
    logs: { msg: string; type: 'positive' | 'negative' | 'neutral' }[];
    news: NewsItem[];
}

const tickList = (
    player: Player,
    title: string,
    projectId: string,
    docket: CensorDocket,
): { docket: CensorDocket; logs: CensorTick['logs']; news: NewsItem[] } => {
    if (docket.grandfathered || !docket.filings.length) return { docket, logs: [], news: [] };
    const logs: CensorTick['logs'] = [];
    const news: NewsItem[] = [];
    const filings = docket.filings.map(filing => {
        const turned = tickFiling(player, title, projectId, docket, filing);
        if (turned.log) logs.push({ msg: `📋 ${turned.log}`, type: turned.tone });
        if (turned.news) news.push(turned.news);
        return turned.filing;
    });
    const changed = filings.some((row, index) => row !== docket.filings[index]);
    if (!changed) return { docket, logs, news };
    return { docket: { ...docket, filings }, logs, news };
};

export const advanceCensorBoards = (player: Player): CensorTick => {
    const logs: CensorTick['logs'] = [];
    const news: NewsItem[] = [];
    const commitments = (player.commitments || []).map(commitment => {
        const docket = commitment.projectDetails?.censor;
        if (!docket || !commitment.projectDetails) return commitment;
        const turned = tickList(player, commitment.name, commitment.id, docket);
        logs.push(...turned.logs);
        news.push(...turned.news);
        if (turned.docket === docket) return commitment;
        return { ...commitment, projectDetails: { ...commitment.projectDetails, censor: turned.docket } };
    });
    const activeReleases = (player.activeReleases || []).map(release => {
        const docket = release.projectDetails?.censor;
        if (!docket) return release;
        const turned = tickList(player, release.name, release.id, docket);
        logs.push(...turned.logs);
        news.push(...turned.news);
        if (turned.docket === docket) return release;
        return { ...release, projectDetails: { ...release.projectDetails, censor: turned.docket } };
    });
    return { player: { ...player, commitments, activeReleases }, logs, news };
};

export const fileWithBoards = (player: Player, projectId: string, picks: CensorPick[]): { player: Player; error?: string } => {
    const found = locate(player, projectId);
    if (!found) return { player, error: 'That picture is not on the lot.' };
    if (!censorApplies(player, found.details) && found.details.censor?.grandfathered) {
        return { player, error: 'This one already had a release. The boards are not reopening it.' };
    }
    if (!isHouseProject(player, found.details)) return { player, error: 'Only a film from your house goes to these boards.' };
    if (found.commitment && found.commitment.projectPhase !== 'AWAITING_RELEASE' && found.commitment.projectPhase !== 'POST_PRODUCTION') {
        return { player, error: 'The boards take a print after the picture is cut.' };
    }
    if (found.commitment?.projectPhase === 'POST_PRODUCTION') {
        return { player, error: 'Post is still working. File when the cut is locked.' };
    }
    const unique = picks.filter((pick, index) => picks.findIndex(other => other.territoryId === pick.territoryId) === index);
    if (!unique.length) return { player, error: 'Pick at least one country.' };
    const docket = ensureDocket(player, found.details);
    const existing = new Set(docket.filings.map(row => row.territoryId));
    const added: CensorFiling[] = [];
    for (const pick of unique) {
        if (existing.has(pick.territoryId)) continue;
        const territory = CENSOR_TERRITORIES.find(row => row.id === pick.territoryId);
        if (!territory) continue;
        const ratings = ratingsFor(territory.industryId);
        const rating = ratings.find(row => row.id === pick.ratingId) || suggestedRating(territory.industryId, docket.scriptIndustryId, docket.scriptRatingId);
        const board = boardOf(territory.industryId);
        const text = `Filed with ${board.name} for a ${rating.label}. The paperwork week starts now.`;
        added.push({
            territoryId: territory.id,
            industryId: territory.industryId,
            country: territory.country,
            boardId: board.id,
            boardName: board.name,
            requestedRatingId: rating.id,
            requestedRatingLabel: rating.label,
            status: 'PENDING',
            reviewWeeks: 1,
            weeksLeft: 1,
            cuts: [],
            beats: [beat(player, text)],
            appeals: 0,
            passes: 0,
            heldWeeks: 0,
            note: text,
        });
    }
    if (!added.length) return { player, error: 'Those countries are already filed.' };
    const names = added.map(row => row.boardName).join(', ');
    let next = found.write({ ...found.details, censor: { ...docket, grandfathered: false, filings: [...docket.filings, ...added] } });
    next = pushLog(next, `Filed "${found.details.title}" with ${names}.`, 'neutral');
    next = pushNews(next, newsItem(
        player,
        projectId,
        `${found.details.title} goes to the board`,
        `${names} ${added.length === 1 ? 'has' : 'have'} the application. Nothing opens in a country without its certificate.`,
        'MEDIUM',
    ));
    return { player: next };
};

const patchFiling = (
    player: Player,
    projectId: string,
    territoryId: string,
    map: (filing: CensorFiling, docket: CensorDocket, details: ProjectDetails) => { filing: CensorFiling; details?: ProjectDetails; error?: string },
): { player: Player; error?: string; filing?: CensorFiling } => {
    const found = locate(player, projectId);
    if (!found?.details.censor) return { player, error: 'Nothing is filed in that country.' };
    const docket = found.details.censor;
    const current = docket.filings.find(row => row.territoryId === territoryId);
    if (!current) return { player, error: 'That country is not on the docket.' };
    const turned = map(current, docket, found.details);
    if (turned.error) return { player, error: turned.error };
    const details = turned.details || found.details;
    const docketNow = details.censor || docket;
    const filings = (docketNow.filings || docket.filings).map(row => row.territoryId === territoryId ? turned.filing : row);
    return {
        player: found.write({ ...details, censor: { ...docketNow, filings } }, player),
        filing: turned.filing,
    };
};

const applyCutCost = (details: ProjectDetails, cuts: CensorCut[], docket: CensorDocket, rating: RatingLabel): { details: ProjectDetails; docket: CensorDocket } => {
    const qualityHit = Math.min(8, cuts.reduce((sum, cut) => sum + cut.quality, 0));
    const audienceHit = Math.min(5, cuts.reduce((sum, cut) => sum + cut.audience, 0));
    const hidden = details.hiddenStats;
    const cap = contentCeiling(rating);
    const pull = (value: number, axis: CensorCut['axis'], ceiling: number) => {
        const dropped = cuts.filter(cut => cut.axis === axis).reduce((sum, cut) => sum + cut.slider, 0);
        if (!dropped) return value;
        return clamp(Math.min(value - dropped * 0.65, ceiling + 2), 0, 100);
    };
    return {
        details: {
            ...details,
            hiddenStats: {
                ...hidden,
                qualityScore: clamp((hidden.qualityScore || 50) - qualityHit, 1, 100),
                scriptQuality: clamp((hidden.scriptQuality || 50) - Math.round(qualityHit * 0.7), 1, 100),
                ...(typeof hidden.audienceScore === 'number' ? { audienceScore: clamp(hidden.audienceScore - audienceHit, 1, 100) } : {}),
            },
        },
        docket: {
            ...docket,
            violence: pull(docket.violence, 'violence', cap.violence),
            intimacy: pull(docket.intimacy, 'intimacy', cap.intimacy),
            language: pull(docket.language, 'language', cap.language),
            heat: Math.max(0, docket.heat - 6),
            politicsTrim: cuts.some(cut => cut.axis === 'politics')
                ? 100
                : (docket.politicsTrim || 0),
        },
    };
};

const resubmit = (player: Player, filing: CensorFiling, note: string): CensorFiling => {
    const weeks = 3 + (hash(`${filing.territoryId}|resubmit|${filing.passes}|${player.currentWeek}`) % 3);
    const text = note.replace('{weeks}', String(weeks));
    return withBeat({
        ...filing,
        status: 'UNDER_REVIEW',
        passes: filing.passes + 1,
        reviewWeeks: weeks,
        weeksLeft: weeks,
        delayUsed: false,
        cuts: [],
        offeredRatingId: undefined,
        offeredRatingLabel: undefined,
        pendingAppeal: undefined,
        note: text,
    }, beat(player, text));
};

export const acceptCensorCuts = (player: Player, projectId: string, territoryId: string): { player: Player; error?: string } => {
    const found = locate(player, projectId);
    const filing = found?.details.censor?.filings.find(row => row.territoryId === territoryId);
    if (!filing || filing.status !== 'CUTS_REQUESTED' || !filing.cuts.length) {
        return { player, error: 'This board is not waiting on a cut list.' };
    }
    const fee = RECUT_FEE[filing.boardId] ?? 30_000;
    const paid = chargeProductionHouse(player, found?.details.studioId, fee, `${filing.boardName} recut`);
    if (paid.error) return { player: paid.player, error: paid.error };
    const ratings = ratingsFor(filing.industryId);
    const requested = ratings.find(row => row.id === filing.requestedRatingId) || ratings[0];
    const result = patchFiling(paid.player, projectId, territoryId, (current, docket, details) => {
        const cost = applyCutCost(details, current.cuts, docket, requested);
        const note = `The cuts are in. ${current.boardName} has the recut for another {weeks} weeks. The picture is a little smaller.`;
        return {
            filing: resubmit(paid.player, current, note),
            details: { ...cost.details, censor: cost.docket },
        };
    });
    if (result.error || !result.filing) return result;
    let next = pushLog(result.player, `Accepted the ${filing.boardName} cuts on "${found?.details.title}". Quality moved a little.`, 'neutral');
    next = pushNews(next, newsItem(player, projectId, `${found?.details.title} is recut for ${filing.boardName}`, result.filing.note, 'MEDIUM'));
    return { player: next };
};

export const acceptHigherRating = (player: Player, projectId: string, territoryId: string): { player: Player; error?: string } => {
    const found = locate(player, projectId);
    const filing = found?.details.censor?.filings.find(row => row.territoryId === territoryId);
    if (!filing?.offeredRatingId || (filing.status !== 'RATING_OFFERED' && filing.status !== 'CUTS_REQUESTED')) {
        return { player, error: 'This board has not offered another certificate.' };
    }
    const year = calendarYear(player.age);
    const label = filing.offeredRatingLabel || filing.offeredRatingId;
    const note = `You took the ${label}. The scenes stay. The crowd that cannot get in is the cost.`;
    const result = patchFiling(player, projectId, territoryId, current => ({
        filing: withBeat({
            ...current,
            status: 'APPROVED',
            weeksLeft: 0,
            grantedRatingId: current.offeredRatingId,
            grantedRatingLabel: current.offeredRatingLabel,
            cuts: [],
            certificateNo: certificateNo(current.boardId, current.offeredRatingId || current.requestedRatingId, year, `${projectId}|${territoryId}|take`),
            note,
        }, beat(player, note)),
    }));
    if (result.error || !result.filing) return result;
    let next = pushLog(result.player, `${filing.boardName} certified "${found?.details.title}" as ${label}.`, 'positive');
    next = pushNews(next, newsItem(player, projectId, `${found?.details.title} takes a ${label}`, `${filing.country}. ${result.filing.certificateNo}.`, 'MEDIUM'));
    return { player: next };
};

export const appealCensorRefusal = (player: Player, projectId: string, territoryId: string): { player: Player; error?: string } => {
    const found = locate(player, projectId);
    const filing = found?.details.censor?.filings.find(row => row.territoryId === territoryId);
    if (!filing || filing.status !== 'REJECTED') return { player, error: 'There is no refusal to appeal.' };
    if (filing.appeals >= 2) return { player, error: `${filing.boardName} will not hear this film again.` };
    const fee = (APPEAL_FEE[filing.boardId] ?? 40_000) * (filing.appeals + 1);
    const paid = chargeProductionHouse(player, found?.details.studioId, fee, `${filing.boardName} appeal`);
    if (paid.error) return { player: paid.player, error: paid.error };
    const docket = found?.details.censor;
    const social = socialHeat(player);
    const ratings = ratingsFor(filing.industryId);
    const requested = ratings.find(row => row.id === filing.requestedRatingId) || ratings[0];
    const over = docket ? overLine(docket, requested, filing.industryId, filing.boardId) : undefined;
    const heat = (docket?.heat || 0) * 0.5 + social * 0.35;
    const chance = clamp(0.46 - (over?.weighted || 0) / 90 - filing.appeals * 0.16 - heat / 280 + (filing.passes > 0 ? 0.12 : 0), 0.1, 0.78);
    const roll = (hash(`${projectId}|${territoryId}|appeal|${filing.appeals}|${player.currentWeek}`) % 1000) / 1000;
    const won = roll < chance;
    const partial = !won && roll < chance + 0.16 && !!over && over.steps > 0;
    const weeks = 4 + (hash(`${projectId}|appeal-wait|${filing.appeals}`) % 3);
    const offered = stepUp(ratings, requested.id, 1);
    const pendingAppeal = won ? 'WON' : partial ? 'PARTIAL' : 'LOST';
    const note = `${filing.boardName} accepted the appeal papers. The committee will take ${weeks} weeks. The fee is spent either way.`;
    const nextFiling: CensorFiling = withBeat({
        ...filing,
        status: 'UNDER_REVIEW',
        appeals: filing.appeals + 1,
        reviewWeeks: weeks,
        weeksLeft: weeks,
        delayUsed: false,
        pendingAppeal,
        offeredRatingId: partial ? offered.id : filing.offeredRatingId,
        offeredRatingLabel: partial ? offered.label : filing.offeredRatingLabel,
        crowdCut: partial ? clamp(0.04 + (offered.restricted ? 0.04 : 0), 0, 0.16) : filing.crowdCut,
        note,
    }, beat(paid.player, note));
    const written = patchFiling(paid.player, projectId, territoryId, () => ({ filing: nextFiling }));
    if (written.error) return written;
    let next = pushLog(written.player, note, 'neutral');
    next = pushNews(next, newsItem(player, projectId, `${filing.boardName} will hear ${found?.details.title}`, note, 'MEDIUM'));
    return { player: next };
};

export const appealFee = (filing: CensorFiling): number => (APPEAL_FEE[filing.boardId] ?? 40_000) * (filing.appeals + 1);
export const recutFee = (filing: CensorFiling): number => RECUT_FEE[filing.boardId] ?? 30_000;

export interface ReleasePick {
    territoryId: string;
    extraWeeks: number;
}

export const weekOneScaleFor = (filings: CensorFiling[], homeTerritoryId: string): number => {
    const opening = filings.filter(row => row.inOpening && row.status === 'APPROVED');
    if (!opening.length) return 1;
    const home = Math.max(0.2, territoryScale(homeTerritoryId));
    const homeOpening = opening.some(row => row.territoryId === homeTerritoryId);
    if (homeOpening) {
        const extra = opening
            .filter(row => row.territoryId !== homeTerritoryId)
            .reduce((sum, row) => sum + territoryScale(row.territoryId) * (1 - (row.crowdCut || 0)), 0);
        return clamp(1 + 0.2 * (extra / home), 1, 1.6);
    }
    const sum = opening.reduce((total, row) => total + territoryScale(row.territoryId) * (1 - (row.crowdCut || 0)), 0);
    return clamp((sum / home) * 0.75, 0.22, 0.95);
};

export const streamReachFor = (filings: CensorFiling[], homeTerritoryId: string): number => {
    const carried = filings.filter(row => row.status === 'APPROVED' && row.inOpening);
    if (!carried.length) return 1;
    const home = Math.max(0.25, territoryScale(homeTerritoryId));
    const hasHome = carried.some(row => row.territoryId === homeTerritoryId);
    const crowd = carried.reduce((sum, row) => sum + (1 - (row.crowdCut || 0)), 0) / carried.length;
    if (hasHome) {
        const extra = carried
            .filter(row => row.territoryId !== homeTerritoryId)
            .reduce((sum, row) => sum + territoryScale(row.territoryId), 0);
        return clamp((1 + 0.22 * (extra / home)) * crowd, 0.7, 1.85);
    }
    const sum = carried.reduce((total, row) => total + territoryScale(row.territoryId), 0);
    return clamp((sum / home) * 0.7 * crowd, 0.2, 0.9);
};

export const territoryOpeningBump = (openingGross: number, filing: CensorFiling, homeTerritoryId: string): number => {
    const home = Math.max(0.2, territoryScale(homeTerritoryId));
    const scale = territoryScale(filing.territoryId) / home;
    return Math.max(0, Math.round(openingGross * Math.min(0.7, scale * 0.34) * (1 - (filing.crowdCut || 0))));
};

/**
 * The week button opens a picture on the pass where the countdown hits zero,
 * before the calendar number rolls forward. `waits` presses from `absNow`
 * land on this absolute week.
 */
export const openingAbsolute = (absNow: number, waits: number): number => absNow + Math.max(1, waits) - 1;

/** A later country opens on the tick whose absolute week has reached the stamped one. */
export const territoryIsDue = (absNow: number, releaseAbsolute: number): boolean => absNow >= releaseAbsolute;

/** Puts approved countries on a date. Unapproved countries are refused. */
export const stampReleasePlan = (
    player: Player,
    projectId: string,
    primaryWait: number,
    picks: ReleasePick[],
    streaming: boolean,
): { player: Player; error?: string; wait: number } => {
    const found = locate(player, projectId);
    if (!found?.details.censor || found.details.censor.grandfathered) {
        if (found && censorApplies(player, found.details)) {
            return { player, error: 'File the picture with a board before you lock a date.', wait: primaryWait };
        }
        return { player, wait: primaryWait };
    }
    if (!censorApplies(player, found.details)) return { player, wait: primaryWait };
    const chosen = picks.filter(pick => pick.extraWeeks >= 0);
    if (!chosen.length) return { player, error: 'Pick a country that already has a certificate.', wait: primaryWait };
    const filings = found.details.censor.filings;
    for (const pick of chosen) {
        const filing = filings.find(row => row.territoryId === pick.territoryId);
        if (!filing || filing.status !== 'APPROVED') {
            const country = territoryById(pick.territoryId).country;
            return { player, error: `${country} has no certificate. It cannot open.`, wait: primaryWait };
        }
    }
    const minExtra = streaming ? 0 : Math.min(...chosen.map(pick => pick.extraWeeks));
    const wait = Math.max(1, primaryWait) + (streaming ? 0 : minExtra);
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const chosenIds = new Set(chosen.map(pick => pick.territoryId));
    const nextFilings = filings.map(filing => {
        if (!chosenIds.has(filing.territoryId) || filing.status !== 'APPROVED') {
            return { ...filing, inOpening: false, releaseAbsolute: undefined, opened: filing.opened };
        }
        const extra = streaming ? 0 : (chosen.find(pick => pick.territoryId === filing.territoryId)?.extraWeeks || 0) - minExtra;
        return {
            ...filing,
            inOpening: extra === 0,
            opened: false,
            releaseAbsolute: openingAbsolute(abs, wait) + extra,
        };
    });
    const docket: CensorDocket = {
        ...found.details.censor,
        filings: nextFilings,
        weekOneScale: streaming ? 1 : weekOneScaleFor(nextFilings, found.details.censor.homeTerritoryId),
    };
    const reach = streaming ? streamReachFor(nextFilings, docket.homeTerritoryId) : found.details.hiddenStats.censorStreamReach;
    const details: ProjectDetails = {
        ...found.details,
        censor: docket,
        hiddenStats: { ...found.details.hiddenStats, ...(streaming ? { censorStreamReach: reach } : {}) },
    };
    return { player: found.write(details), wait };
};

export const releaseBlockedByCensor = (player: Player, details?: ProjectDetails | null): boolean => {
    if (!details || !censorApplies(player, details)) return false;
    const opening = (details.censor?.filings || []).filter(row => row.inOpening && row.status === 'APPROVED');
    return opening.length === 0;
};

export const approvedFilings = (details?: ProjectDetails | null): CensorFiling[] =>
    (details?.censor?.filings || []).filter(row => row.status === 'APPROVED');

/** Adds one already-certified country to a date that is already locked, or to a film already out. */
export const scheduleCertifiedCountry = (
    player: Player,
    projectId: string,
    territoryId: string,
    weeksFromNow: number,
): { player: Player; error?: string } => {
    const found = locate(player, projectId);
    if (!found?.details.censor || found.details.censor.grandfathered) {
        return { player, error: 'This picture is not on the censor calendar.' };
    }
    const filing = found.details.censor.filings.find(row => row.territoryId === territoryId);
    if (!filing || filing.status !== 'APPROVED') return { player, error: 'That country does not have a certificate yet.' };
    if (filing.opened) return { player, error: `${filing.country} is already open.` };
    if (found.commitment && !found.commitment.projectDetails?.releaseStrategy && !player.activeReleases?.some(row => row.id === projectId)) {
        return { player, error: 'Lock a release date first. A certified country can join that date, or open after it.' };
    }
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const wait = Math.max(1, Math.round(weeksFromNow));
    let releaseAbsolute = openingAbsolute(abs, wait);
    let inOpening = false;
    if (found.commitment?.projectDetails?.releaseStrategy) {
        const openingAbs = openingAbsolute(abs, Math.max(1, found.commitment.phaseWeeksLeft || 1));
        releaseAbsolute = Math.max(openingAbs, openingAbsolute(abs, wait));
        inOpening = releaseAbsolute === openingAbs;
    }
    const filings = found.details.censor.filings.map(row => row.territoryId === territoryId
        ? { ...row, releaseAbsolute, inOpening, opened: false }
        : row);
    const docket: CensorDocket = {
        ...found.details.censor,
        filings,
        weekOneScale: found.commitment ? weekOneScaleFor(filings, found.details.censor.homeTerritoryId) : found.details.censor.weekOneScale,
    };
    let next = found.write({ ...found.details, censor: docket });
    const when = inOpening ? 'with the first wave' : `in ${wait} week${wait === 1 ? '' : 's'}`;
    next = pushLog(next, `${filing.country} will open ${when} on a ${filing.grantedRatingLabel} certificate.`, 'positive');
    next = pushNews(next, newsItem(
        player,
        projectId,
        `${found.details.title} is dated for ${filing.country}`,
        `${filing.grantedRatingLabel}. ${filing.certificateNo || filing.boardName}.`,
        'LOW',
    ));
    return { player: next };
};
