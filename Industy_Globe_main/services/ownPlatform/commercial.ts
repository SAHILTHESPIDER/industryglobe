import { AdIntervalMin, CountryLocalisation, LocalLevel, OwnPlatformState, PlanBenefit, PricingPlan, RevenueLane } from '../../types';
import { getCountry } from './catalog';
import { titleIsLive } from './weeks';

export const MIN_PLAN_USD = 0.99;
export const MAX_PLAN_USD = 100;
export const AD_INTERVALS: AdIntervalMin[] = [5, 10, 15, 20, 30];

const AD_YIELD: Record<AdIntervalMin, number> = { 5: 2.4, 10: 1.7, 15: 1.2, 20: 0.85, 30: 0.45 };
/** Stay rate versus a plan with no timed breaks. Shorter breaks lose more households. */
const AD_STAY: Record<AdIntervalMin, number> = { 5: 0.82, 10: 0.9, 15: 0.95, 20: 0.98, 30: 1.02 };

const LEVELS = new Set<LocalLevel>(['OFF', 'MAIN', 'FULL']);
const BENEFITS = new Set<PlanBenefit>(['PREMIUM', 'EARLY_ACCESS']);

export interface RevenueParts {
    subscriptions: number;
    ads: number;
    passes: number;
    rentals: number;
    purchases: number;
}

export const emptyParts = (): RevenueParts => ({ subscriptions: 0, ads: 0, passes: 0, rentals: 0, purchases: 0 });

export const isAdInterval = (value: unknown): value is AdIntervalMin =>
    value === 5 || value === 10 || value === 15 || value === 20 || value === 30;

/** Paid stickers only. A stored 0 is left for the caller so an old free number is not rewritten here. */
export const clampPaidUsd = (value: number): number => {
    const number = Number.isFinite(value) ? value : 11;
    return Math.round(Math.min(MAX_PLAN_USD, Math.max(MIN_PLAN_USD, number)) * 100) / 100;
};

const clampPct = (value: unknown, max: number): number => {
    const number = Math.round(Number(value) || 0);
    return Math.max(0, Math.min(max, number));
};

const offerUsd = (value: unknown, max: number): number => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.round(Math.min(max, Math.max(MIN_PLAN_USD, number)) * 100) / 100;
};

export const sanitizePlan = (plan: PricingPlan): PricingPlan => {
    const freeWithAds = plan.freeWithAds === true;
    let monthlyUsd = Number.isFinite(plan.monthlyUsd) ? plan.monthlyUsd : 11;
    if (freeWithAds) monthlyUsd = 0;
    else if (monthlyUsd > 0 && monthlyUsd < MIN_PLAN_USD) monthlyUsd = MIN_PLAN_USD;
    else if (monthlyUsd > MAX_PLAN_USD) monthlyUsd = MAX_PLAN_USD;
    monthlyUsd = Math.round(monthlyUsd * 100) / 100;
    const adIntervalMin = isAdInterval(plan.adIntervalMin) ? plan.adIntervalMin : undefined;
    const annualDiscountPct = clampPct(plan.annualDiscountPct, 50);
    const introDiscountPct = clampPct(plan.introDiscountPct, 90);
    const introWeeks = Math.max(0, Math.min(13, Math.round(Number(plan.introWeeks) || 0)));
    const benefits = (plan.benefits || []).filter((benefit): benefit is PlanBenefit => BENEFITS.has(benefit));
    const tiers = new Set(['FREE_ADS', 'BASIC_ADS', 'STANDARD', 'PREMIUM', 'RENT_BUY', 'CUSTOM']);
    const subscribers = Number(plan.subscribers);
    return {
        ...plan,
        monthlyUsd,
        ads: freeWithAds ? true : Boolean(plan.ads),
        freeWithAds: freeWithAds || undefined,
        adIntervalMin: plan.ads || freeWithAds ? adIntervalMin : undefined,
        annualDiscountPct: annualDiscountPct || undefined,
        introDiscountPct: introDiscountPct || undefined,
        introWeeks: introDiscountPct > 0 ? Math.max(1, introWeeks || 4) : undefined,
        benefits: benefits.length ? benefits : undefined,
        tier: plan.tier && tiers.has(plan.tier) ? plan.tier : undefined,
        enabled: plan.enabled === false ? false : undefined,
        sealedAtLaunch: plan.sealedAtLaunch === true ? true : undefined,
        subscribers: Number.isFinite(subscribers) && subscribers >= 0 ? Math.round(subscribers) : undefined,
    };
};

export const sanitizeLocalisations = (rows: CountryLocalisation[] | undefined): CountryLocalisation[] | undefined => {
    if (!Array.isArray(rows)) return undefined;
    const next = rows.flatMap(row => {
        if (!row || !getCountry(row.countryId)) return [];
        const subtitles = LEVELS.has(row.subtitles) ? row.subtitles : 'OFF';
        const dub = LEVELS.has(row.dub) ? row.dub : 'OFF';
        if (subtitles === 'OFF' && dub === 'OFF') return [];
        return [{ countryId: row.countryId, subtitles, dub }];
    });
    return next.length ? next : undefined;
};

export const sanitizePasses = (raw: OwnPlatformState['passes']): OwnPlatformState['passes'] => {
    if (!raw || typeof raw !== 'object') return undefined;
    const hourUsd = offerUsd(raw.hourUsd, 20);
    const dayUsd = offerUsd(raw.dayUsd, 30);
    if (hourUsd <= 0 && dayUsd <= 0) return undefined;
    return { hourUsd, dayUsd };
};

export const sanitizeTitleStore = (raw: OwnPlatformState['titleStore']): OwnPlatformState['titleStore'] => {
    if (!raw || typeof raw !== 'object') return undefined;
    const rentUsd = offerUsd(raw.rentUsd, 40);
    const buyUsd = offerUsd(raw.buyUsd, 80);
    if (rentUsd <= 0 && buyUsd <= 0) return undefined;
    return { rentUsd, buyUsd };
};

/** Timed breaks on a plan that is off still count, so the old flat ad boost does not switch itself back on. */
const explicitAds = (state: OwnPlatformState) => state.plans.some(plan => plan.ads && isAdInterval(plan.adIntervalMin));

/**
 * Lanes that still use the old percent boost.
 * A lane with its own price is left out so that money is not counted twice.
 */
export const lanesForBoost = (state: OwnPlatformState): RevenueLane[] => {
    const rent = (state.titleStore?.rentUsd || 0) > 0;
    const buy = (state.titleStore?.buyUsd || 0) > 0;
    const pass = (state.passes?.hourUsd || 0) > 0 || (state.passes?.dayUsd || 0) > 0;
    const premium = state.plans.some(plan => plan.benefits?.includes('PREMIUM'));
    return state.revenueLanes.filter(lane => {
        if (lane === 'ADVERTISING' && explicitAds(state)) return false;
        if (lane === 'RENTAL' && rent) return false;
        if (lane === 'PURCHASE' && buy) return false;
        if (lane === 'DAY_PASS' && pass) return false;
        if (lane === 'PREMIUM' && premium) return false;
        return true;
    });
};

/** Flat ad uplift from older saves. Timed breaks replace it with their own ad line. */
export const adBoostFor = (state: OwnPlatformState): number => {
    if (explicitAds(state)) return 1;
    return state.revenueLanes.includes('ADVERTISING') ? 1.08 : 1;
};

export const localisationAudience = (row: CountryLocalisation | undefined, englishPrimary: boolean): number => {
    if (!row) return 1;
    const subtitles = row.subtitles === 'FULL' ? 0.08 : row.subtitles === 'MAIN' ? 0.04 : 0;
    const dub = row.dub === 'FULL' ? 0.22 : row.dub === 'MAIN' ? 0.12 : 0;
    return 1 + (subtitles + dub) * (englishPrimary ? 0.35 : 1);
};

export const localisationCost = (audienceM: number, row: CountryLocalisation | undefined): number => {
    if (!row) return 0;
    const scale = Math.max(0.2, Math.min(5, Math.max(0, audienceM) / 8));
    const subtitles = row.subtitles === 'FULL' ? 28_000 : row.subtitles === 'MAIN' ? 12_000 : 0;
    const dub = row.dub === 'FULL' ? 90_000 : row.dub === 'MAIN' ? 40_000 : 0;
    return Math.round((subtitles + dub) * scale);
};

/** Weekly localisation bill for countries actually on the slate. */
export const localisationWeekly = (state: OwnPlatformState): number => {
    const open = new Set(state.selectedCountryIds);
    return (state.localisations || []).reduce((sum, row) => {
        if (!open.has(row.countryId)) return sum;
        const country = getCountry(row.countryId);
        if (!country) return sum;
        return sum + localisationCost(country.audienceM, row);
    }, 0);
};

/** Off plans stay on the shelf. A missing `enabled` means on, so old saves keep every plan. */
export const enabledPlans = (plans: PricingPlan[]): PricingPlan[] =>
    plans.filter(plan => plan.enabled !== false);

export const introSpan = (state: OwnPlatformState): number =>
    enabledPlans(state.plans).reduce((max, plan) => (
        (plan.introDiscountPct || 0) > 0 ? Math.max(max, plan.introWeeks || 0) : max
    ), 0);

const commercialTouched = (state: OwnPlatformState): boolean => {
    if ((state.passes?.hourUsd || 0) > 0 || (state.passes?.dayUsd || 0) > 0) return true;
    if ((state.titleStore?.rentUsd || 0) > 0 || (state.titleStore?.buyUsd || 0) > 0) return true;
    return enabledPlans(state.plans).some(plan =>
        plan.freeWithAds
        || isAdInterval(plan.adIntervalMin)
        || (plan.annualDiscountPct || 0) > 0
        || (plan.introDiscountPct || 0) > 0
        || (plan.benefits && plan.benefits.length > 0)
    );
};

/**
 * Quarter and half-year cuts. Same shares as the offer card blend.
 * 1 when the player has not tuned billing, so an old save is unchanged.
 */
const billingPriceFactor = (state: OwnPlatformState): number => {
    const billing = state.platformDesk?.billing;
    if (!billing?.tuned) return 1;
    const quarter = Math.min(40, Math.max(0, Number(billing.quarterPct) || 0)) / 100;
    const half = Math.min(40, Math.max(0, Number(billing.halfPct) || 0)) / 100;
    const quarterShare = quarter > 0 ? 0.12 : 0;
    const halfShare = half > 0 ? 0.08 : 0;
    return 1 - (quarterShare * quarter + halfShare * half);
};

export interface CommercialRollup {
    households: number;
    monthly: number;
    parts: RevenueParts;
}

/**
 * Adjusts the subscription book already priced in quoteLaunch.
 * Untouched saves return the same households and the same monthly total.
 * A tuned quarter or half-year discount still cuts that total, on this path and the one below.
 * Ads, passes, rentals, and buys are added once, not as a second lane percent.
 * Plans with enabled set to false are left out of price, ads, and demand.
 */
export const rollCommercial = (state: OwnPlatformState, households: number, monthly: number): CommercialRollup => {
    const weekly = Math.round((Number.isFinite(monthly) ? monthly : 0) / 4.3);
    const priceCut = billingPriceFactor(state);
    if (!commercialTouched(state)) {
        if (priceCut === 1) return { households, monthly, parts: { ...emptyParts(), subscriptions: weekly } };
        const adjusted = (Number.isFinite(monthly) ? monthly : 0) * priceCut;
        return { households, monthly: adjusted, parts: { ...emptyParts(), subscriptions: Math.round(adjusted / 4.3) } };
    }
    let factor = 1;
    let priceFactor = 1;
    const plans = enabledPlans(state.plans);
    const paid = plans.filter(plan => !plan.freeWithAds);
    const free = plans.filter(plan => plan.freeWithAds);
    if (paid.length) {
        const offs = paid.map(plan => {
            const discount = plan.introDiscountPct || 0;
            const weeks = plan.introWeeks || 0;
            if (discount <= 0 || weeks <= 0 || state.weeksLive > weeks) return 0;
            return Math.min(90, discount) / 100;
        });
        priceFactor *= 1 - offs.reduce((sum, off) => sum + off, 0) / paid.length;
        const annual = paid.reduce((sum, plan) => sum + Math.min(50, Math.max(0, plan.annualDiscountPct || 0)), 0) / paid.length / 100;
        priceFactor *= 1 - annual * 0.4;
        priceFactor *= priceCut;
    }
    if (free.length && plans.length) {
        factor *= 1 + Math.min(0.65, free.length / plans.length) * 0.28;
    }
    const intervals = plans.map(plan => plan.adIntervalMin).filter(isAdInterval);
    let ads = 0;
    if (intervals.length) {
        const shortest = Math.min(...intervals) as AdIntervalMin;
        factor *= AD_STAY[shortest];
        const adShare = free.length
            ? Math.min(0.7, 0.35 + free.length / plans.length * 0.4)
            : Math.min(0.5, intervals.length / plans.length);
        ads = households * factor * adShare * AD_YIELD[shortest];
    }
    if (plans.some(plan => plan.benefits?.includes('EARLY_ACCESS'))) factor *= 1.04;
    if (plans.some(plan => plan.benefits?.includes('PREMIUM'))) factor *= 1.03;
    const hour = state.passes?.hourUsd || 0;
    const day = state.passes?.dayUsd || 0;
    let passes = 0;
    if (hour > 0) {
        passes += households * factor * 0.05 * hour;
        factor *= 1.01;
    }
    if (day > 0) {
        passes += households * factor * 0.018 * day;
        factor *= 1.015;
    }
    const live = state.catalogue.filter(title => titleIsLive(title.releaseWeekOffset)).length;
    const rent = state.titleStore?.rentUsd || 0;
    const buy = state.titleStore?.buyUsd || 0;
    const rentals = rent > 0 && live > 0 ? households * factor * 0.012 * rent * Math.min(live, 8) / 8 : 0;
    const purchases = buy > 0 && live > 0 ? households * factor * 0.004 * buy * Math.min(live, 8) / 8 : 0;
    const subscriptions = (Number.isFinite(monthly) ? monthly : 0) * factor * priceFactor;
    const parts: RevenueParts = {
        subscriptions: Math.round(subscriptions / 4.3),
        ads: Math.round(ads / 4.3),
        passes: Math.round(passes / 4.3),
        rentals: Math.round(rentals / 4.3),
        purchases: Math.round(purchases / 4.3),
    };
    return {
        households: Math.round(households * factor),
        monthly: subscriptions + ads + passes + rentals + purchases,
        parts,
    };
};

export const fundingPressure = (weeklyRevenue: number, weeklyBurn: number, cash: number, debt: number): { score: number; label: string; line: string } => {
    const burn = Math.max(0, weeklyBurn);
    const revenue = Math.max(0, weeklyRevenue);
    const gap = burn - revenue;
    let score = 0;
    if (gap > 0 && burn > 0) score += Math.min(0.7, gap / burn);
    const cover = burn > 0 ? Math.max(0, cash) / burn : 99;
    if (cover < 8) score += 0.25;
    if (debt > Math.max(revenue, 1) * 30) score += 0.15;
    score = Math.max(0, Math.min(1, score));
    const label = score < 0.25 ? 'Calm' : score < 0.55 ? 'Tight' : 'Strained';
    const line = score < 0.25
        ? 'Receipts cover the week. Company cash is not under pressure.'
        : cover < 8
            ? `Burn is ahead of receipts. Company cash covers about ${Math.max(0, Math.floor(cover))} weeks.`
            : 'Burn is ahead of receipts. A lower price or a smaller footprint eases the company, not your personal cash.';
    return { score, label, line };
};

/** 1 is the busiest ad reel. Viewers put off is 1 at a break every 5 minutes. */
export const adBreakBars = (minutes: AdIntervalMin): { money: number; putOff: number } => ({
    money: AD_YIELD[minutes] / AD_YIELD[5],
    putOff: Math.max(0, (1 - AD_STAY[minutes]) / (1 - AD_STAY[5])),
});

export const adIntervalLine = (minutes: AdIntervalMin): string => {
    if (minutes === 5) return 'An ad every 5 minutes. The most ad money, and the most people who cancel.';
    if (minutes === 10) return 'An ad every 10 minutes. Strong ad money, with noticeable cancellations.';
    if (minutes === 15) return 'An ad every 15 minutes. A middle path between ad money and people leaving.';
    if (minutes === 20) return 'An ad every 20 minutes. Less ad money, and fewer people quit.';
    return 'An ad every 30 minutes. The least ad money, and viewers stay a little longer.';
};

export const withLane = (lanes: RevenueLane[], lane: RevenueLane, on: boolean): RevenueLane[] => {
    if (on) return lanes.includes(lane) ? lanes : [...lanes, lane];
    return lanes.filter(item => item !== lane);
};
