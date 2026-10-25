import { CommissionControls, CommissionTerms } from '../../types';

/** First studio at or above this score signs, and the brief closes. */
export const SIGN_THRESHOLD = 72;

export const GENRE_MULT: Record<string, number> = {
    ACTION: 1.25,
    SCI_FI: 1.3,
    FANTASY: 1.2,
    SUPERHERO: 1.45,
    DRAMA: 0.9,
    COMEDY: 0.85,
    HORROR: 0.8,
    ROMANCE: 0.75,
    THRILLER: 1.05,
    CRIME: 1,
    BIOPIC: 0.95,
    ADVENTURE: 1.15,
    ANIMATION: 1.1,
    DOCUMENTARY: 0.55,
    SPORTS: 0.9,
    MUSICAL: 0.8,
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const genreMult = (genre: string) => GENRE_MULT[genre] ?? 1;

/** GLOBAL / REGIONAL / EMERGING, scaled by the home market in RIVAL_SEEDS. */
export const platformTierMult = (tier: string, householdsM: number) => {
    const tierMult = tier === 'GLOBAL' ? 1.15 : tier === 'REGIONAL' ? 0.85 : 0.65;
    const market = 0.75 + Math.min(1, householdsM / 200) * 0.5;
    return tierMult * market;
};

/** Film base sits between $8M and $60M. */
export const filmBase = (roll: number) => Math.round(8_000_000 + clamp(roll, 0, 1) * 52_000_000);

/** Per-episode base sits between $1.5M and $8M. */
export const episodeBase = (roll: number) => Math.round(1_500_000 + clamp(roll, 0, 1) * 6_500_000);

export const productionBudget = (
    format: 'FILM' | 'SERIES',
    genre: string,
    episodes: number,
    seasons: number,
    tier: string,
    householdsM: number,
    roll: number,
) => {
    const scale = genreMult(genre) * platformTierMult(tier, householdsM);
    if (format === 'FILM') return Math.round(filmBase(roll) * scale);
    const eps = Math.max(1, episodes);
    const seas = Math.max(1, seasons);
    return Math.round(episodeBase(roll) * eps * seas * scale);
};

/** premium = budget * (8% + rep/100 * 10%). */
export const premiumFor = (budget: number, reputation: number) =>
    Math.round(budget * (0.08 + clamp(reputation, 0, 100) / 100 * 0.10));

/** Licence fee alternative = budget * 1.05. The house keeps savings and pays overruns. */
export const licenceFor = (budget: number) => Math.round(budget * 1.05);

export const hitBonusFor = (budget: number) => Math.round(budget * 0.15);

export const seasonBonusFor = (budget: number) => Math.round(budget * 0.10);

/**
 * Checked weekly per house.
 * chance = 4% + rep/100*10% + 3%*hitsLast52 + relationship/100*5%, capped at 30%.
 * Bigger home markets (RIVAL_SEEDS households) send more often, still capped at 30%.
 */
export const offerChance = (reputation: number, hitsLast52: number, relationship: number) =>
    clamp(0.04 + (reputation / 100) * 0.10 + 0.03 * hitsLast52 + (relationship / 100) * 0.05, 0, 0.30);

export const marketChance = (chance: number, householdsM: number) =>
    clamp(chance * (0.45 + householdsM / 400), 0, 0.30);

/** score = 0.35*reputation + 0.25*priceFit + 0.20*speed + 0.20*relationship + small noise. */
export const scoreStudio = (
    reputation: number,
    priceFit: number,
    speed: number,
    relationship: number,
    noise: number,
) => 0.35 * reputation + 0.25 * priceFit + 0.20 * speed + 0.20 * relationship + noise;

export const priceFitFrom = (extraPremiumPct: number) => clamp(100 - extraPremiumPct * 4, 0, 100);

export const speedFitFrom = (extraWeeks: number) => clamp(100 - extraWeeks * 8, 0, 100);

export const controlSteps = (base: CommissionControls, ask: CommissionControls) =>
    (['finalCut', 'casting', 'showrunner', 'marketing'] as const)
        .filter(key => ask[key] && !base[key]).length;

/**
 * About 0.5 win-chance points per extra premium percent, 1 per extra week,
 * 10 per control step, and about 12 just for countering. Another counter adds another 12.
 */
export const counterCost = (extraPremiumPct: number, extraWeeks: number, steps: number, rounds: number) =>
    12 * Math.max(1, rounds) + 0.5 * Math.max(0, extraPremiumPct) + Math.max(0, extraWeeks) + 10 * Math.max(0, steps);

export const standingChance = (reputation: number, relationship: number, rivals: number) =>
    64 + (reputation - 50) * 0.25 + (relationship - 40) * 0.15 - rivals * 3;

export const displayedWinChance = (
    reputation: number,
    relationship: number,
    rivals: number,
    penalty: number,
) => clamp(Math.round(standingChance(reputation, relationship, rivals) - penalty), 4, 96);

export const payableOf = (terms: CommissionTerms) =>
    terms.payModel === 'LICENCE' ? terms.licenceFee : terms.premium;

export const trancheOf = (terms: CommissionTerms, seasons: number) =>
    Math.round(payableOf(terms) / Math.max(1, seasons) / 4);

export const emptyControls = (): CommissionControls => ({
    finalCut: false,
    casting: false,
    showrunner: false,
    marketing: false,
});

export const shootWeeksFor = (episodes: number) => Math.max(4, Math.round(episodes * 0.45));

/** Development 2, pre-production 2, shooting, post 3. A milestone lands four weeks after signature. */
export const seasonPipelineWeeks = (episodes: number) => 2 + 2 + shootWeeksFor(episodes) + 3;
