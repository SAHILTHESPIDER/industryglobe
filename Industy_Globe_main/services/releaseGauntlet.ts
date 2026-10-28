import {
    BudgetTier,
    Business,
    Commitment,
    CriticProfile,
    FestivalBidOffer,
    FestivalBiddingState,
    FestivalRunState,
    FestivalWinnerRecord,
    Genre,
    NewsItem,
    PendingEvent,
    Player,
    ProjectDetails,
    ProjectHiddenStats,
    Review,
    ReviewBombState,
    ActiveRelease,
    TestScreeningState,
} from '../types';
import { FESTIVALS } from './worldLogic';
import { PLATFORMS } from './streamingLogic';
import { STUDIO_CATALOG } from './studioLogic';

/**
 * Release gauntlet formulas
 *
 * Critic score = 70% quality + 30% script/director, then a relationship nudge of at most 8 points, then noise of ±5.
 * Audience score = 40% quality + 20% casting + 25% hype fit + 15% genre crowd, then noise of ±6.
 * Hype fit is 100 when the campaign matches the film and falls as hype and quality pull apart.
 * A test score is that audience score ± 8.
 * Festival heat = (reaction - 70) / 30. Bids scale with it.
 * Selection is 42% on the prestige bar, +2.4 points per quality point above, -1.6 below, clamped to 6–90%.
 */

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const GENRE_CROWD: Record<Genre, number> = {
    ACTION: 80,
    DRAMA: 48,
    COMEDY: 78,
    ROMANCE: 66,
    THRILLER: 60,
    HORROR: 82,
    SCI_FI: 70,
    ADVENTURE: 76,
    SUPERHERO: 88,
    MUSICAL: 58,
    BIOPIC: 46,
    SPORTS: 64,
    ANIMATION: 84,
    FANTASY: 74,
    CRIME: 55,
    DOCUMENTARY: 36,
};

const FESTIVAL_PRIZES: Record<string, string> = {
    sundance: 'Grand Jury Prize',
    berlin: 'Golden Bear',
    cannes: "Palme d'Or",
    venice: 'Golden Lion',
    tiff: "People's Choice Award",
};

const CRITIC_SEED: CriticProfile[] = [
    { id: 'mara_ellison', name: 'Mara Ellison', publication: 'The Atlantic Screen', tastes: ['DRAMA', 'BIOPIC', 'DOCUMENTARY'], feeling: 0 },
    { id: 'jonah_peck', name: 'Jonah Peck', publication: 'Variety Desk', tastes: ['ACTION', 'SUPERHERO', 'ADVENTURE'], feeling: 0 },
    { id: 'adele_cho', name: 'Adele Cho', publication: 'Cahiers', tastes: ['DRAMA', 'CRIME', 'THRILLER'], feeling: 0 },
    { id: 'luis_ortega', name: 'Luis Ortega', publication: 'IndieWire', tastes: ['DRAMA', 'HORROR', 'DOCUMENTARY'], feeling: 0 },
    { id: 'priya_raman', name: 'Priya Raman', publication: 'Entertainment Weekly', tastes: ['COMEDY', 'ROMANCE', 'MUSICAL'], feeling: 0 },
    { id: 'hank_voss', name: 'Hank Voss', publication: 'Box Office Weekly', tastes: ['SUPERHERO', 'ACTION', 'ANIMATION'], feeling: 0 },
    { id: 'simone_adler', name: 'Simone Adler', publication: 'Sight & Sound', tastes: ['DRAMA', 'FANTASY', 'BIOPIC'], feeling: 0 },
    { id: 'theo_marsh', name: 'Theo Marsh', publication: 'The Ringer', tastes: ['HORROR', 'SCI_FI', 'COMEDY'], feeling: 0 },
];

const POSITIVE_QUOTES = [
    'A stunner. I came in skeptical and left converted.',
    'The craft is doing real work, and it shows.',
    'This is the one they will still be quoting in December.',
    'Confident, specific, and harder to shake than it looks.',
];
const MIXED_QUOTES = [
    'Handsome, but it does not stick the landing.',
    'There is a sharper film trapped in this cut.',
    'I admired the nerve more than the result.',
    'Strong pieces, uneven picture.',
];
const NEGATIVE_QUOTES = [
    'A glossy miss. The center never holds.',
    'All budget, no pulse.',
    'I have rooted for this filmmaker before. Not this time.',
    'Loud, thin, and strangely unsure of itself.',
];

export const ensureCritics = (existing?: CriticProfile[]): CriticProfile[] => {
    const saved = Array.isArray(existing) ? existing.filter(critic => critic && critic.id && critic.name) : [];
    return CRITIC_SEED.map(seed => {
        const prior = saved.find(critic => critic.id === seed.id);
        if (!prior) return { ...seed, tastes: [...seed.tastes] };
        const feeling = typeof prior.feeling === 'number' && Number.isFinite(prior.feeling) ? clamp(prior.feeling, -100, 100) : 0;
        return {
            ...seed,
            ...prior,
            tastes: Array.isArray(prior.tastes) && prior.tastes.length ? prior.tastes : [...seed.tastes],
            feeling,
        };
    });
};

export const hydrateReleaseWorld = (player: Player): Player => {
    if (!player.world) return player;
    return {
        ...player,
        world: {
            ...player.world,
            critics: ensureCritics(player.world.critics),
            festivalWinners: Array.isArray(player.world.festivalWinners) ? player.world.festivalWinners : [],
        }
    };
};

export const legacyScores = (quality?: number, rating?: number): { criticScore: number; audienceScore: number } => {
    const q = clamp(typeof quality === 'number' && Number.isFinite(quality) ? quality : 50, 0, 100);
    const remembered = typeof rating === 'number' && rating > 0 ? rating * 10 : q;
    const r = clamp(remembered, 0, 100);
    return {
        criticScore: clamp(Math.round(q * 0.7 + r * 0.3), 0, 100),
        audienceScore: clamp(Math.round(q * 0.4 + r * 0.4 + 55 * 0.2), 0, 100),
    };
};

type ScoreCarrier = {
    criticScore?: number;
    audienceScore?: number;
    projectQuality?: number;
    rating?: number;
    imdbRating?: number;
    projectDetails?: ProjectDetails;
};

export function applyLegacyFilmScores<T extends ScoreCarrier>(film: T): T {
    const hidden = film.projectDetails?.hiddenStats;
    const storedCritic = typeof film.criticScore === 'number'
        ? film.criticScore
        : (typeof hidden?.criticScore === 'number' ? hidden.criticScore : undefined);
    const storedAudience = typeof film.audienceScore === 'number'
        ? film.audienceScore
        : (typeof hidden?.audienceScore === 'number' ? hidden.audienceScore : undefined);
    const quality = typeof film.projectQuality === 'number'
        ? film.projectQuality
        : hidden?.qualityScore;
    const rating = typeof film.imdbRating === 'number' && film.imdbRating > 0
        ? film.imdbRating
        : film.rating;
    const derived = legacyScores(quality, rating);
    const criticScore = typeof storedCritic === 'number' ? storedCritic : derived.criticScore;
    const audienceScore = typeof storedAudience === 'number' ? storedAudience : derived.audienceScore;
    if (!film.projectDetails || !hidden) return { ...film, criticScore, audienceScore };
    return {
        ...film,
        criticScore,
        audienceScore,
        projectDetails: {
            ...film.projectDetails,
            hiddenStats: { ...hidden, criticScore, audienceScore }
        }
    };
}

export const displayedAudienceScore = (score?: number, bomb?: ReviewBombState): number | undefined => {
    if (typeof score !== 'number' || !Number.isFinite(score)) return undefined;
    if (!bomb?.active) return clamp(Math.round(score), 0, 100);
    return clamp(Math.round(score - (bomb.drop || 0)), 0, 100);
};

export const selectionChance = (quality: number, prestigeReq: number): number => {
    const gap = quality - prestigeReq;
    const chance = 0.42 + gap * (gap >= 0 ? 0.024 : 0.016);
    return clamp(chance, 0.06, 0.9);
};

export const screeningCost = (tier: BudgetTier = 'MID'): number => {
    if (tier === 'LOW') return 50_000;
    if (tier === 'MID') return 100_000;
    return 250_000;
};

const hypeFitScore = (stats: ProjectHiddenStats): number => {
    const quality = stats.qualityScore ?? 50;
    const hype = stats.rawHype ?? 50;
    return clamp(100 - Math.abs(hype - quality) * 1.4, 0, 100);
};

export const audienceCore = (stats: ProjectHiddenStats, genre: Genre): number => {
    const quality = stats.qualityScore ?? 50;
    const casting = stats.castingStrength ?? 50;
    const crowd = GENRE_CROWD[genre] ?? 55;
    return quality * 0.4 + casting * 0.2 + hypeFitScore(stats) * 0.25 + crowd * 0.15;
};

const criticCore = (stats: ProjectHiddenStats, critics: CriticProfile[]): number => {
    const quality = stats.qualityScore ?? 50;
    const craft = ((stats.scriptQuality ?? 50) + (stats.directorQuality ?? 50)) / 2;
    const feeling = critics.length ? critics.reduce((sum, critic) => sum + critic.feeling, 0) / critics.length : 0;
    return quality * 0.7 + craft * 0.3 + (feeling / 100) * 8;
};

export const scoreFilm = (stats: ProjectHiddenStats, genre: Genre, critics: CriticProfile[]) => ({
    criticScore: clamp(Math.round(criticCore(stats, critics) + randInt(-5, 5)), 0, 100),
    audienceScore: clamp(Math.round(audienceCore(stats, genre) + randInt(-6, 6)), 0, 100),
});

const sentimentFor = (score: number): Review['sentiment'] => {
    if (score >= 68) return 'POSITIVE';
    if (score <= 42) return 'NEGATIVE';
    return 'MIXED';
};

const quoteFor = (sentiment: Review['sentiment'], genre: Genre, playerName: string): string => {
    if (sentiment === 'POSITIVE' && Math.random() < 0.45) return `${playerName} gives it a pulse the rest of the ${genre.replace(/_/g, ' ').toLowerCase()} picture can lean on.`;
    if (sentiment === 'NEGATIVE' && Math.random() < 0.35) return `I wanted to be on ${playerName}'s side. The film would not let me.`;
    if (sentiment === 'POSITIVE') return pick(POSITIVE_QUOTES);
    if (sentiment === 'NEGATIVE') return pick(NEGATIVE_QUOTES);
    return pick(MIXED_QUOTES);
};

export const buildNamedReviews = (
    details: ProjectDetails,
    critics: CriticProfile[],
    criticScore: number,
    audienceScore: number,
    playerName = 'the lead'
): Review[] => {
    const roster = ensureCritics(critics);
    const stats = details.hiddenStats;
    const craft = ((stats.scriptQuality ?? 50) + (stats.directorQuality ?? 50)) / 2;
    const chosen = [...roster].sort(() => Math.random() - 0.5).slice(0, 5);
    const reviews: Review[] = chosen.map((critic, index) => {
        const taste = critic.tastes.includes(details.genre);
        const personal = clamp(Math.round(
            (stats.qualityScore ?? criticScore) * 0.55
            + craft * 0.25
            + (taste ? 15 : -12)
            + (critic.feeling / 100) * 28
            + randInt(-4, 4)
        ), 0, 100);
        const sentiment = sentimentFor(personal);
        return {
            id: `critic_${critic.id}_${index}`,
            author: critic.name,
            publication: critic.publication,
            text: quoteFor(sentiment, details.genre, playerName),
            sentiment,
            type: 'CRITIC' as const,
            rating: clamp(Math.round(personal / 20), 1, 5),
        };
    });
    const audienceSentiment = sentimentFor(audienceScore);
    const audienceLine = audienceScore >= 70
        ? 'We came for the star and stayed because the movie actually moved.'
        : audienceScore >= 45
            ? 'Fine for a Friday. Nobody is texting their friends about it.'
            : 'The lobby was louder than the movie. People were checking the time.';
    reviews.push({
        id: `audience_${details.title}`,
        author: 'Opening-weekend crowd',
        publication: 'Audience notes',
        text: audienceLine,
        sentiment: audienceSentiment,
        type: 'AUDIENCE',
        rating: clamp(Math.round(audienceScore / 20), 1, 5),
    });
    return reviews;
};

export const lockReleaseScores = (details: ProjectDetails, critics: CriticProfile[], playerName: string) => {
    const fresh = scoreFilm(details.hiddenStats, details.genre, critics);
    const screening = details.testScreening;
    const sameCut = typeof screening?.trueAudience === 'number'
        && screening.anchorQuality === details.hiddenStats.qualityScore
        && screening.choice !== 'RECUT'
        && screening.choice !== 'RESHOOT';
    const audienceScore = sameCut ? screening!.trueAudience! : fresh.audienceScore;
    const criticScore = fresh.criticScore;
    return {
        criticScore,
        audienceScore,
        reviews: buildNamedReviews(details, critics, criticScore, audienceScore, playerName),
    };
};

const screeningNotes = (stats: ProjectHiddenStats, genre: Genre): string[] => {
    const notes: string[] = [];
    if ((stats.qualityScore ?? 50) < 64 || (stats.scriptQuality ?? 50) < 58) notes.push('Too long. The middle loses the room.');
    if ((stats.directorQuality ?? 50) < 64 || genre === 'THRILLER' || genre === 'CRIME' || genre === 'HORROR') notes.push('Ending too dark for this crowd.');
    if ((stats.castingStrength ?? 50) >= 70) notes.push('Loved the lead.');
    else notes.push('The lead never quite landed.');
    if ((stats.rawHype ?? 50) > (stats.qualityScore ?? 50) + 18) notes.push('The trailer promised a bigger film than the one they saw.');
    if ((stats.scriptQuality ?? 50) >= 80) notes.push('They were quoting the dialogue on the way out.');
    return notes.slice(0, 4);
};

const withLog = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral' = 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...(player.logs || [])].slice(0, 50),
});

const cloneBusinesses = (player: Player): Business[] => (player.businesses || []).map(business => ({
    ...business,
    stats: business.stats ? { ...business.stats } : business.stats,
    studioState: business.studioState ? {
        ...business.studioState,
        financeLedger: business.studioState.financeLedger ? [...business.studioState.financeLedger] : business.studioState.financeLedger,
    } : business.studioState,
}));

/** Operating cash first, then the production fund, then personal cash. The fund stays available for greenlights. */
export const chargeProductionHouse = (player: Player, studioId: string | undefined, amount: number, label: string): { player: Player; error?: string } => {
    if (amount <= 0) return { player };
    const businesses = cloneBusinesses(player);
    const studio = businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    let remaining = amount;
    let fromFund = 0;
    let fromBalance = 0;
    if (studio) {
        fromBalance = Math.min(Math.max(0, studio.balance || 0), remaining);
        remaining -= fromBalance;
        const fund = studio.studioState?.productionFund || 0;
        fromFund = Math.min(fund, remaining);
        remaining -= fromFund;
    }
    const fromPlayer = Math.min(Math.max(0, player.money || 0), remaining);
    remaining -= fromPlayer;
    if (remaining > 1) return { player, error: `Need $${Math.ceil(amount).toLocaleString()} and the house is short.` };
    if (studio) {
        studio.balance = (studio.balance || 0) - fromBalance;
        if (studio.studioState) {
            studio.studioState.productionFund = (studio.studioState.productionFund || 0) - fromFund;
            const entry = {
                id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                week: player.currentWeek,
                year: player.age,
                amount: -(fromBalance + fromFund),
                type: 'RELEASE',
                label,
            };
            if (fromBalance + fromFund > 0) {
                studio.studioState.financeLedger = [entry, ...(studio.studioState.financeLedger || [])].slice(0, 200);
            }
        }
    }
    const history = player.finance?.history || [];
    return {
        player: {
            ...player,
            money: player.money - fromPlayer,
            businesses,
            finance: player.finance ? {
                ...player.finance,
                history: fromPlayer > 0 ? [{
                    id: Math.random().toString(),
                    week: player.currentWeek,
                    year: player.age,
                    amount: -fromPlayer,
                    category: 'BUSINESS' as const,
                    description: label,
                }, ...history] : history,
            } : player.finance,
        }
    };
};

export const canAffordHouseCharge = (player: Player, studioId: string | undefined, amount: number): boolean => {
    if (amount <= 0) return true;
    const studio = (player.businesses || []).find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    const balance = Math.max(0, studio?.balance || 0);
    const fund = Math.max(0, studio?.studioState?.productionFund || 0);
    const personal = Math.max(0, player.money || 0);
    return balance + fund + personal + 1 >= amount;
};

const payFromHouse = chargeProductionHouse;

const creditHouse = (player: Player, studioId: string | undefined, amount: number, label: string, projectId: string): Player => {
    if (amount <= 0) return player;
    const businesses = cloneBusinesses(player);
    const studio = businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) {
        return {
            ...player,
            money: player.money + amount,
        };
    }
    studio.balance = (studio.balance || 0) + amount;
    if (studio.studioState) {
        studio.studioState.financeLedger = [{
            id: `ledger_sale_${projectId}_${player.currentWeek}`,
            week: player.currentWeek,
            year: player.age,
            amount,
            type: 'FESTIVAL_SALE',
            label,
            projectId,
        }, ...(studio.studioState.financeLedger || [])].slice(0, 200);
    }
    return { ...player, businesses };
};

const replaceCommitment = (player: Player, commitment: Commitment): Player => ({
    ...player,
    commitments: player.commitments.map(item => item.id === commitment.id ? commitment : item),
});

const liveCommitment = (player: Player, projectId: string) => player.commitments.find(item => item.id === projectId);

export const holdTestScreening = (player: Player, projectId: string): { player: Player; error?: string } => {
    const commitment = liveCommitment(player, projectId);
    const details = commitment?.projectDetails;
    if (!commitment || !details) return { player, error: 'That film is not on the lot.' };
    if (details.testScreening?.status !== 'OFFERED') return { player, error: 'The screening window has closed.' };
    const cost = screeningCost(details.budgetTier);
    const paid = payFromHouse(player, details.studioId, cost, `Test screening: ${commitment.name}`);
    if (paid.error) return paid;
    const trueAudience = clamp(Math.round(audienceCore(details.hiddenStats, details.genre) + randInt(-6, 6)), 0, 100);
    const testScore = clamp(trueAudience + randInt(-8, 8), 0, 100);
    const screening: TestScreeningState = {
        status: 'RESULTS',
        cost,
        testScore,
        trueAudience,
        anchorQuality: details.hiddenStats.qualityScore,
        notes: screeningNotes(details.hiddenStats, details.genre),
        spent: cost,
    };
    const next = replaceCommitment(paid.player, {
        ...commitment,
        projectDetails: { ...details, testScreening: screening },
    });
    return { player: withLog(next, `Test screening for "${commitment.name}" scored ${testScore}. The real number can still move.`, 'neutral') };
};

export const chooseTestScreening = (
    player: Player,
    projectId: string,
    choice: 'RELEASE' | 'RECUT' | 'RESHOOT' | 'BURY'
): { player: Player; error?: string } => {
    const commitment = liveCommitment(player, projectId);
    const details = commitment?.projectDetails;
    const screening = details?.testScreening;
    if (!commitment || !details || !screening || screening.status !== 'RESULTS') {
        return { player, error: 'Hold the screening before you recut anything.' };
    }
    if (choice === 'RELEASE') {
        const next = replaceCommitment(player, {
            ...commitment,
            projectDetails: { ...details, testScreening: { ...screening, status: 'RESOLVED', choice: 'RELEASE' } },
        });
        return { player: withLog(next, `"${commitment.name}" will go out in the screened cut.`, 'neutral') };
    }
    if (choice === 'BURY') {
        const next = replaceCommitment(player, {
            ...commitment,
            projectPhase: 'AWAITING_RELEASE',
            phaseWeeksLeft: 1,
            totalPhaseDuration: 1,
            projectDetails: {
                ...details,
                releaseStrategy: 'STREAMING_ONLY',
                campaignItems: [],
                totalCampaignSpend: 0,
                releaseDate: player.currentWeek + 1,
                hiddenStats: { ...details.hiddenStats, buriedFromScreening: true },
                testScreening: { ...screening, status: 'RESOLVED', choice: 'BURY' },
            },
        });
        return { player: withLog(next, `"${commitment.name}" is buried. Streaming only, and the marketing cheque stays in the drawer.`, 'neutral') };
    }
    const budget = details.estimatedBudget || 1_000_000;
    const recut = choice === 'RECUT';
    const weeks = recut ? randInt(2, 4) : 6;
    const pct = recut ? 0.03 + Math.random() * 0.05 : 0.10 + Math.random() * 0.05;
    const cost = Math.round(budget * pct);
    const qualityDelta = recut
        ? (Math.random() < 0.18 ? -randInt(1, 4) : randInt(2, 8))
        : (Math.random() < 0.4 ? -randInt(6, 15) : randInt(6, 15));
    const paid = payFromHouse(player, details.studioId, cost, `${recut ? 'Recut' : 'Reshoot'}: ${commitment.name}`);
    if (paid.error) return paid;
    const nextScreening: TestScreeningState = {
        ...screening,
        status: 'WORKING',
        choice,
        workWeeksLeft: weeks,
        qualityDelta,
        spent: (screening.spent || 0) + cost,
    };
    const next = replaceCommitment(paid.player, {
        ...commitment,
        phaseWeeksLeft: (commitment.phaseWeeksLeft || 0) + weeks,
        projectDetails: { ...details, testScreening: nextScreening },
    });
    const verb = recut ? `Recut booked. ${weeks} weeks, $${cost.toLocaleString()}.` : `Ending reshoot booked. About ${weeks} weeks, $${cost.toLocaleString()}.`;
    return { player: withLog(next, `"${commitment.name}": ${verb}`, 'neutral') };
};

export const advanceScreeningWork = (commitment: Commitment): { commitment: Commitment; log?: string; tone?: 'positive' | 'negative' } => {
    const details = commitment.projectDetails;
    const screening = details?.testScreening;
    if (!details || !screening || screening.status !== 'WORKING') return { commitment };
    const left = (screening.workWeeksLeft || 1) - 1;
    if (left > 0) {
        return {
            commitment: {
                ...commitment,
                projectDetails: { ...details, testScreening: { ...screening, workWeeksLeft: left } },
            }
        };
    }
    const delta = screening.qualityDelta || 0;
    const stats = details.hiddenStats;
    const hiddenStats: ProjectHiddenStats = {
        ...stats,
        qualityScore: clamp((stats.qualityScore || 50) + delta, 1, 100),
        scriptQuality: clamp((stats.scriptQuality || 50) + Math.round(delta / 2), 1, 100),
        directorQuality: clamp((stats.directorQuality || 50) + (screening.choice === 'RESHOOT' ? Math.round(delta / 2) : 0), 1, 100),
    };
    return {
        tone: delta >= 0 ? 'positive' : 'negative',
        log: delta >= 0
            ? `The new cut of "${commitment.name}" plays stronger (+${delta} quality).`
            : `The new cut of "${commitment.name}" lost the thread (${delta} quality).`,
        commitment: {
            ...commitment,
            projectDetails: {
                ...details,
                hiddenStats,
                testScreening: { ...screening, status: 'RESOLVED', workWeeksLeft: 0 },
            }
        }
    };
};

const weekOfYear = (week: number) => ((week - 1) % 52) + 1;

export const submitToFestival = (player: Player, projectId: string, festivalId: string): { player: Player; error?: string } => {
    const fest = FESTIVALS.find(item => item.id === festivalId);
    if (!fest) return { player, error: 'That festival is not on the calendar.' };
    const commitment = liveCommitment(player, projectId);
    const details = commitment?.projectDetails;
    if (!commitment || !details) return { player, error: 'That film is not on the lot.' };
    if (details.type !== 'MOVIE') return { player, error: 'The circuit is booking features.' };
    if (details.festivalRun) return { player, error: 'This film is already on the circuit.' };
    const house = (player.businesses || []).some(business => business.id === details.studioId && business.type === 'PRODUCTION_HOUSE');
    if (!house) return { player, error: 'Only a film from your production house can play this circuit.' };
    const paid = payFromHouse(player, details.studioId, fest.cost, `${fest.name} submission`);
    if (paid.error) return paid;
    const run: FestivalRunState = {
        festivalId,
        status: 'SUBMITTED',
        submittedWeek: player.currentWeek,
        submittedYear: player.age,
    };
    let next = replaceCommitment(paid.player, {
        ...commitment,
        projectDetails: { ...details, festivalRun: run },
    });
    next = withLog(next, `Submitted "${commitment.name}" to ${fest.name}. Selection is not guaranteed.`, 'neutral');
    if (fest.weeks.includes(weekOfYear(next.currentWeek))) next = applyFestivalTurn(next);
    return { player: next };
};

const reactionScore = (stats: ProjectHiddenStats): number => {
    const quality = stats.qualityScore ?? 50;
    const craft = ((stats.scriptQuality ?? 50) + (stats.directorQuality ?? 50)) / 2;
    const casting = stats.castingStrength ?? 50;
    return quality * 0.62 + craft * 0.28 + casting * 0.1;
};

const buildBidding = (reaction: number, budget: number): FestivalBiddingState => {
    const heat = clamp((reaction - 70) / 30, 0, 1.2);
    let count = randInt(2, 5);
    if (heat > 0.7) count = Math.max(count, 3);
    const studios = ['PARAMOUNT', 'WARNER_BROS', 'UNIVERSAL', 'ARTISAN_PICTURES', 'HBO']
        .map(id => STUDIO_CATALOG[id])
        .filter(Boolean)
        .map(studio => ({ kind: 'STUDIO' as const, id: studio.id, name: studio.name }));
    const streamers = (Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[])
        .map(id => ({ kind: 'STREAMER' as const, id, name: PLATFORMS[id].name }));
    const pool = [...studios, ...streamers].sort(() => Math.random() - 0.5).slice(0, count);
    const offers: FestivalBidOffer[] = pool.map((bidder, index) => {
        const base = Math.max(250_000, budget * (0.22 + heat * 1.55));
        return {
            id: `bid_${bidder.id}_${index}`,
            bidderName: bidder.name,
            kind: bidder.kind,
            studioId: bidder.kind === 'STUDIO' ? bidder.id : undefined,
            platformId: bidder.kind === 'STREAMER' ? bidder.id : undefined,
            amount: Math.round(base * (0.75 + Math.random() * 0.7)),
            backendPct: bidder.kind === 'STREAMER' ? randInt(8, 18) : randInt(0, 6),
        };
    }).sort((a, b) => b.amount - a.amount);
    return { round: 1, maxRounds: 3, heat, offers, status: 'OPEN' };
};

export const queuePendingPremiere = (player: Player, event: PendingEvent): Player => {
    const queue = Array.isArray(player.pendingEventQueue) ? [...player.pendingEventQueue] : [];
    if (!player.pendingEvent) return { ...player, pendingEvent: event };
    if (player.pendingEvent.type === 'AWARD_CEREMONY' || player.pendingEvent.type === 'FESTIVAL_PREMIERE') {
        return { ...player, pendingEventQueue: [...queue, event] };
    }
    return { ...player, pendingEventQueue: [...queue, event] };
};

export const resolveDueFestivals = (player: Player): { player: Player; logs: string[]; news: NewsItem[] } => {
    const week = weekOfYear(player.currentWeek);
    let next = hydrateReleaseWorld(player);
    const logs: string[] = [];
    const news: NewsItem[] = [];
    const commitments = next.commitments.map(commitment => {
        const details = commitment.projectDetails;
        const run = details?.festivalRun;
        if (!details || !run || run.status !== 'SUBMITTED') return commitment;
        const fest = FESTIVALS.find(item => item.id === run.festivalId);
        if (!fest || !fest.weeks.includes(week)) return commitment;
        const quality = details.hiddenStats.qualityScore ?? 50;
        const selected = Math.random() < selectionChance(quality, fest.prestigeReq);
        if (!selected) {
            logs.push(`${fest.name} passed on "${commitment.name}".`);
            news.push({
                id: `news_fest_no_${commitment.id}_${week}`,
                headline: `${fest.name} passes on ${commitment.name}`,
                subtext: 'The film stays on your slate. The submission fee does not come back.',
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'LOW',
                projectId: commitment.id,
            });
            return {
                ...commitment,
                projectDetails: { ...details, festivalRun: { ...run, status: 'REJECTED' as const } },
            };
        }
        const reaction = clamp(Math.round(reactionScore(details.hiddenStats) + randInt(-8, 8)), 35, 99);
        let prize: string | null = null;
        if (quality >= fest.prestigeReq - 8) {
            const prizeChance = reaction >= 88 ? 0.34 : reaction >= 80 ? 0.16 : reaction >= 74 ? 0.08 : 0.04;
            if (Math.random() < prizeChance) prize = FESTIVAL_PRIZES[fest.id] || 'Jury Prize';
        }
        const house = (next.businesses || []).some(business => business.id === details.studioId && business.type === 'PRODUCTION_HOUSE');
        const breakout = house && (reaction >= 82 || Boolean(prize));
        const bidding = breakout ? buildBidding(reaction, details.estimatedBudget || 1_000_000) : null;
        const hiddenStats: ProjectHiddenStats = {
            ...details.hiddenStats,
            festivalPremiere: fest.id,
            festivalPrizeBonus: prize ? Math.max(5, details.hiddenStats.festivalPrizeBonus || 0) : details.hiddenStats.festivalPrizeBonus,
        };
        if (prize && (hiddenStats.festivalPrizeBonus || 0) > 5) hiddenStats.festivalPrizeBonus = 5;
        logs.push(prize
            ? `"${commitment.name}" premieres at ${fest.name} and wins the ${prize}.`
            : `"${commitment.name}" premieres at ${fest.name}. The room is at ${reaction}.`);
        news.push({
            id: `news_fest_yes_${commitment.id}_${week}`,
            headline: prize ? `${commitment.name} wins the ${prize}` : `${commitment.name} lands at ${fest.name}`,
            subtext: breakout ? 'Buyers are already in the hallway.' : `Premiere reaction ${reaction}.`,
            category: 'TOP_STORY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: prize ? 'HIGH' : 'MEDIUM',
            projectId: commitment.id,
        });
        const event: PendingEvent = {
            id: `festival_${fest.id}_${commitment.id}`,
            week: player.currentWeek,
            type: 'FESTIVAL_PREMIERE',
            title: fest.name,
            description: `${commitment.name} premieres at ${fest.name}.`,
            data: {
                projectId: commitment.id,
                projectName: commitment.name,
                festivalId: fest.id,
                festivalName: fest.name,
                reaction,
                prize,
                bidding,
                budget: details.estimatedBudget || 0,
            }
        };
        next = queuePendingPremiere(next, event);
        if (prize) {
            const winner: FestivalWinnerRecord = {
                festivalId: fest.id,
                festivalName: fest.name,
                year: player.age,
                week: player.currentWeek,
                projectId: commitment.id,
                projectName: commitment.name,
                prize,
                isPlayer: true,
            };
            next = {
                ...next,
                world: { ...next.world, festivalWinners: [...(next.world.festivalWinners || []), winner] },
            };
        }
        return {
            ...commitment,
            projectDetails: {
                ...details,
                hiddenStats,
                festivalRun: { ...run, status: 'SELECTED' as const, reaction, prize, bidding },
            }
        };
    });
    return { player: { ...next, commitments }, logs, news };
};

export const applyFestivalTurn = (player: Player): Player => {
    const turn = resolveDueFestivals(player);
    let next = turn.player;
    if (turn.logs.length) {
        next = {
            ...next,
            logs: [
                ...turn.logs.map(message => ({ week: next.currentWeek, year: next.age, message, type: 'neutral' as const })),
                ...(next.logs || []),
            ].slice(0, 50),
        };
    }
    if (turn.news.length) next = { ...next, news: [...turn.news, ...(next.news || [])].slice(0, 50) };
    return next;
};

const patchRun = (player: Player, projectId: string, recipe: (details: ProjectDetails) => ProjectDetails): Player => {
    const commitment = liveCommitment(player, projectId);
    if (!commitment?.projectDetails) return player;
    return replaceCommitment(player, { ...commitment, projectDetails: recipe(commitment.projectDetails) });
};

export const persistFestivalBidding = (player: Player, projectId: string, bidding: FestivalBiddingState): Player => {
    const next = patchRun(player, projectId, details => ({
        ...details,
        festivalRun: details.festivalRun ? { ...details.festivalRun, bidding } : details.festivalRun,
    }));
    const stamp = (event: PendingEvent | null | undefined): PendingEvent | null | undefined => {
        if (!event || event.type !== 'FESTIVAL_PREMIERE') return event;
        if (String(event.data?.projectId || '') !== projectId) return event;
        return { ...event, data: { ...(event.data || {}), bidding } };
    };
    return {
        ...next,
        pendingEvent: stamp(next.pendingEvent) ?? null,
        pendingEventQueue: Array.isArray(next.pendingEventQueue)
            ? next.pendingEventQueue.map(event => stamp(event) || event)
            : next.pendingEventQueue,
    };
};

export const counterFestivalBids = (bidding: FestivalBiddingState): FestivalBiddingState => {
    if (bidding.status !== 'OPEN' || bidding.round >= bidding.maxRounds) return bidding;
    const nextRound = bidding.round + 1;
    const raised = bidding.offers.flatMap(offer => {
        const stays = Math.random() < (0.35 + bidding.heat * 0.55);
        if (!stays) return [];
        return [{ ...offer, id: `${offer.id}_r${nextRound}`, amount: Math.round(offer.amount * (1.08 + Math.random() * 0.1)) }];
    });
    let offers = raised;
    if (!offers.length && bidding.heat >= 0.25 && bidding.offers[0]) {
        offers = [{ ...bidding.offers[0], id: `${bidding.offers[0].id}_r${nextRound}` }];
    }
    if (!offers.length) {
        return { ...bidding, round: nextRound, offers: [], status: 'WALKED', note: 'The room emptied after the counter.' };
    }
    return {
        ...bidding,
        round: nextRound,
        offers: offers.sort((a, b) => b.amount - a.amount),
        note: `Round ${nextRound}. The table moved.`,
    };
};

export const acceptFestivalBid = (
    player: Player,
    projectId: string,
    offer: FestivalBidOffer,
    bidding: FestivalBiddingState
): { player: Player; error?: string } => {
    const commitment = liveCommitment(player, projectId);
    const details = commitment?.projectDetails;
    if (!commitment || !details) return { player, error: 'The film is no longer on the lot.' };
    let next = creditHouse(player, details.studioId, offer.amount, `${offer.bidderName} festival bid`, projectId);
    const streamer = offer.kind === 'STREAMER' && offer.platformId;
    next = patchRun(next, projectId, current => ({
        ...current,
        releaseStrategy: streamer ? 'STREAMING_ONLY' : 'THEATRICAL',
        screeningStrategy: streamer ? current.screeningStrategy : (current.screeningStrategy || 'INTERNATIONAL'),
        hiddenStats: {
            ...current.hiddenStats,
            platformId: streamer ? offer.platformId : current.hiddenStats.platformId,
            backendPct: offer.backendPct,
            distributionPower: streamer ? current.hiddenStats.distributionPower : Math.min(100, (current.hiddenStats.distributionPower || 50) + 12),
        },
        festivalRun: current.festivalRun ? {
            ...current.festivalRun,
            status: 'PREMIERED',
            bidding: { ...bidding, status: 'ACCEPTED', acceptedOfferId: offer.id, note: `Sold to ${offer.bidderName}.` },
        } : current.festivalRun,
    }));
    return {
        player: withLog(next, `${offer.bidderName} takes "${commitment.name}" for $${offer.amount.toLocaleString()}.`, 'positive')
    };
};

export const walkFestivalBid = (player: Player, projectId: string, bidding: FestivalBiddingState): Player => {
    const commitment = liveCommitment(player, projectId);
    if (!commitment) return player;
    const next = patchRun(player, projectId, details => ({
        ...details,
        festivalRun: details.festivalRun ? {
            ...details.festivalRun,
            status: 'PREMIERED',
            bidding: { ...bidding, status: 'WALKED', offers: bidding.status === 'WALKED' ? [] : bidding.offers, note: 'You walked. The film is still yours.' },
        } : details.festivalRun,
    }));
    return withLog(next, `You walked out of the bidding for "${commitment.name}". The premiere buzz stays.`, 'neutral');
};

export const shiftCriticsFromX = (critics: CriticProfile[] | undefined, controversy: number): CriticProfile[] => {
    const roster = ensureCritics(critics);
    if (!controversy) return roster;
    const delta = controversy >= 6 ? -8 : controversy <= -4 ? 6 : controversy > 0 ? -3 : 3;
    return roster.map(critic => ({ ...critic, feeling: clamp(critic.feeling + delta, -100, 100) }));
};

export const shiftCriticsFromTalkShow = (critics: CriticProfile[] | undefined, player: Player): CriticProfile[] => {
    const roster = ensureCritics(critics);
    const heat = player.flags?.heat || 0;
    const youtubeHeat = player.youtube?.controversy || 0;
    const reputation = player.stats?.reputation || 0;
    return roster.map(critic => {
        const prestige = critic.tastes.some(taste => taste === 'DRAMA' || taste === 'DOCUMENTARY' || taste === 'BIOPIC');
        let delta = 2;
        if (heat >= 25 || youtubeHeat >= 40) delta = prestige ? -9 : -4;
        else if (reputation >= 55) delta = prestige ? 8 : 5;
        return { ...critic, feeling: clamp(critic.feeling + delta, -100, 100) };
    });
};

const shiftCriticsFromCallOut = (critics: CriticProfile[] | undefined): CriticProfile[] => ensureCritics(critics).map(critic => ({
    ...critic,
    feeling: clamp(critic.feeling + (critic.feeling >= 0 ? 8 : -10), -100, 100),
}));

const patchBomb = <T extends { id: string; reviewBomb?: ReviewBombState }>(list: T[], projectId: string, reviewBomb: ReviewBombState): T[] => (
    list.map(item => item.id === projectId ? { ...item, reviewBomb } : item)
);

export const respondToReviewBomb = (
    player: Player,
    projectId: string,
    response: 'IGNORE' | 'CALL_OUT' | 'CLEANUP'
): Player => {
    const active = (player.activeReleases || []).find(release => release.id === projectId);
    const past = (player.pastProjects || []).find(project => project.id === projectId);
    const current = active?.reviewBomb || past?.reviewBomb;
    if (!current?.active || current.response) return player;
    let reviewBomb: ReviewBombState = { ...current, response };
    let critics = player.world?.critics;
    let message = `You let the review bomb on the film run its course.`;
    if (response === 'CALL_OUT') {
        reviewBomb = { ...reviewBomb, drop: Math.max(6, reviewBomb.drop - 4) };
        critics = shiftCriticsFromCallOut(critics);
        message = 'You called out the review bomb. Friends leaned in. The feud got louder.';
    } else if (response === 'CLEANUP') {
        reviewBomb = { ...reviewBomb, recoveryWeeksLeft: 2 };
        message = 'The platform is cleaning the review bomb up. The audience score recovers over 2 weeks.';
    }
    return {
        ...player,
        world: player.world ? { ...player.world, critics } : player.world,
        activeReleases: patchBomb(player.activeReleases || [], projectId, reviewBomb),
        pastProjects: patchBomb(player.pastProjects || [], projectId, reviewBomb),
        logs: [{ week: player.currentWeek, year: player.age, message, type: 'neutral' as const }, ...(player.logs || [])].slice(0, 50),
    };
};

export const advanceReviewBomb = (player: Player, release: ActiveRelease): { reviewBomb?: ReviewBombState; log?: string; news?: NewsItem } => {
    const current = release.reviewBomb;
    if (current?.active) {
        if (current.response === 'CLEANUP') {
            const left = current.recoveryWeeksLeft ?? 2;
            if (left <= 1) return { reviewBomb: { ...current, drop: 0, active: false, recoveryWeeksLeft: 0, weeksLeft: 0 } };
            return { reviewBomb: { ...current, drop: Math.max(0, Math.round(current.drop / 2)), recoveryWeeksLeft: left - 1, weeksLeft: Math.max(0, left - 1) } };
        }
        const weeksLeft = current.weeksLeft - 1;
        return { reviewBomb: { ...current, weeksLeft, active: weeksLeft > 0, drop: weeksLeft > 0 ? current.drop : 0 } };
    }
    if (current) return {};
    const heat = player.flags?.heat || 0;
    const youtubeHeat = player.youtube?.controversy || 0;
    if (heat < 25 && youtubeHeat < 30) return {};
    const odds = Math.min(0.45, Math.max(0, heat) / 400 + Math.max(0, youtubeHeat) / 350);
    if (Math.random() > odds) return {};
    const drop = randInt(10, 30);
    const reviewBomb: ReviewBombState = { active: true, drop, weeksLeft: 4 };
    return {
        reviewBomb,
        log: `Review bombing hit "${release.name}". Audience score drops ${drop} points for a few weeks.`,
        news: {
            id: `news_bomb_${release.id}_${player.currentWeek}`,
            headline: `Review bomb hits ${release.name}`,
            subtext: `Audience score is down ${drop} while the pile-on lasts. You can ignore it, call it out, or ask for a cleanup.`,
            category: 'TOP_STORY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH',
            projectId: release.id,
        }
    };
};

export const offerTestScreeningOnWrap = (player: Player, commitment: Commitment): Commitment => {
    const details = commitment.projectDetails;
    if (!details || details.type !== 'MOVIE' || details.testScreening) return commitment;
    const house = (player.businesses || []).some(business => business.id === details.studioId && business.type === 'PRODUCTION_HOUSE');
    if (!house) return commitment;
    return { ...commitment, projectDetails: { ...details, testScreening: { status: 'OFFERED' } } };
};
