import { OwnPlatformState, PricingPlan, RivalPlatformState } from '../../types';
import { MARKET_COUNTRIES, MarketCountry, hashString } from './catalog';

export interface CurrencyQuote {
    countryId: string;
    code: string;
    name: string;
    /** How many units of this currency one US dollar buys. */
    unitsPerUsd: number;
    /** 1 matches US purchasing power. Lower countries get a cheaper default sticker. */
    ppp: number;
}

/** Anchor rates. Weekly drift stays inside 8% of these. */
const CURRENCIES: Record<string, Omit<CurrencyQuote, 'countryId' | 'ppp'>> = {
    US: { code: 'USD', name: 'US dollar', unitsPerUsd: 1 },
    CA: { code: 'CAD', name: 'Canadian dollar', unitsPerUsd: 1.36 },
    MX: { code: 'MXN', name: 'Mexican peso', unitsPerUsd: 18.2 },
    BR: { code: 'BRL', name: 'Brazilian real', unitsPerUsd: 5.05 },
    AR: { code: 'ARS', name: 'Argentine peso', unitsPerUsd: 980 },
    CO: { code: 'COP', name: 'Colombian peso', unitsPerUsd: 4100 },
    GB: { code: 'GBP', name: 'Pound sterling', unitsPerUsd: 0.78 },
    FR: { code: 'EUR', name: 'Euro', unitsPerUsd: 0.92 },
    DE: { code: 'EUR', name: 'Euro', unitsPerUsd: 0.92 },
    ES: { code: 'EUR', name: 'Euro', unitsPerUsd: 0.92 },
    IT: { code: 'EUR', name: 'Euro', unitsPerUsd: 0.92 },
    SE: { code: 'SEK', name: 'Swedish krona', unitsPerUsd: 10.6 },
    NG: { code: 'NGN', name: 'Nigerian naira', unitsPerUsd: 1550 },
    ZA: { code: 'ZAR', name: 'South African rand', unitsPerUsd: 18.1 },
    EG: { code: 'EGP', name: 'Egyptian pound', unitsPerUsd: 48.5 },
    KE: { code: 'KES', name: 'Kenyan shilling', unitsPerUsd: 129 },
    IN: { code: 'INR', name: 'Indian rupee', unitsPerUsd: 83.5 },
    JP: { code: 'JPY', name: 'Yen', unitsPerUsd: 151 },
    KR: { code: 'KRW', name: 'Won', unitsPerUsd: 1350 },
    ID: { code: 'IDR', name: 'Rupiah', unitsPerUsd: 15800 },
    PH: { code: 'PHP', name: 'Philippine peso', unitsPerUsd: 57 },
    CN: { code: 'CNY', name: 'Yuan', unitsPerUsd: 7.24 },
    AU: { code: 'AUD', name: 'Australian dollar', unitsPerUsd: 1.52 },
    NZ: { code: 'NZD', name: 'New Zealand dollar', unitsPerUsd: 1.66 },
};

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'IDR', 'COP', 'NGN', 'VND']);

const RIVAL_HOME: Record<string, string> = {
    netflix: 'US', prime: 'US', disney: 'US', max: 'US', paramount: 'US', peacock: 'US', apple: 'US',
    hulu: 'US', youtube: 'US', crunchyroll: 'JP', mubi: 'GB', discovery: 'US',
    hotstar: 'IN', zee5: 'IN', sonyliv: 'IN', globoplay: 'BR', starplus: 'AR', vix: 'MX',
    canal: 'FR', itvx: 'GB', iplayer: 'GB', stan: 'AU', binge: 'AU', crave: 'CA',
    tving: 'KR', wavve: 'KR', iqiyi: 'CN', tencent: 'CN', showmax: 'ZA', shahid: 'EG',
    vidio: 'ID', viu: 'ID', coupang: 'KR', nightowl: 'US', 'red-lantern': 'CN',
    'lagos-stream': 'NG', pampas: 'AR', harbour: 'AU', kinohaus: 'DE', sahara: 'EG',
};

const mulberry32 = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const currencyFor = (countryId: string, rates?: Record<string, number>): CurrencyQuote => {
    const country = MARKET_COUNTRIES.find(row => row.id === countryId);
    const anchor = CURRENCIES[countryId] || { code: 'USD', name: 'US dollar', unitsPerUsd: 1 };
    const ppp = country ? Math.max(0.15, Math.min(1.15, country.affordability / 15)) : 1;
    const quoted = rates?.[anchor.code];
    const units = Number.isFinite(quoted) && (quoted as number) > 0 ? (quoted as number) : anchor.unitsPerUsd;
    return { countryId, ...anchor, unitsPerUsd: units, ppp };
};

export const anchorRates = (): Record<string, number> => {
    const rates: Record<string, number> = {};
    Object.values(CURRENCIES).forEach(row => {
        rates[row.code] = row.unitsPerUsd;
    });
    rates.USD = 1;
    return rates;
};

/** Nudge every currency a fraction of a percent. USD stays at 1. */
export const driftFxRates = (current: Record<string, number> | undefined, seed: string): Record<string, number> => {
    const anchors = anchorRates();
    const next: Record<string, number> = { ...anchors, ...(current || {}) };
    Object.entries(anchors).forEach(([code, anchor]) => {
        if (code === 'USD') {
            next.USD = 1;
            return;
        }
        const rng = mulberry32(hashString(`${seed}:fx:${code}`));
        const prev = Number.isFinite(next[code]) && next[code] > 0 ? next[code] : anchor;
        const moved = prev * (1 + (rng() - 0.5) * 0.008);
        const clamped = Math.min(anchor * 1.08, Math.max(anchor * 0.92, moved));
        next[code] = Math.round(clamped * 10000) / 10000;
    });
    return next;
};

export const roundLocal = (amount: number, code: string): number => {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (ZERO_DECIMAL.has(code) || amount >= 800) {
        const step = amount >= 10000 ? 100 : amount >= 1000 ? 10 : 1;
        return Math.round(amount / step) * step;
    }
    if (amount >= 20) return Math.round(amount);
    return Math.round(amount * 2) / 2;
};

/** Purchasing-power default. A US $11 plan is about ₹184 in India and £7.50 in the UK. */
export const defaultLocalPrice = (usdAnchor: number, countryId: string, rates?: Record<string, number>): number => {
    const quote = currencyFor(countryId, rates);
    const usd = Math.max(0, Number.isFinite(usdAnchor) ? usdAnchor : 0);
    return roundLocal(usd * quote.ppp * quote.unitsPerUsd, quote.code);
};

export const localMonthly = (plan: PricingPlan, countryId: string, rates?: Record<string, number>): number => {
    const stored = plan.countryPrices?.[countryId];
    if (Number.isFinite(stored) && (stored as number) >= 0) return stored as number;
    return defaultLocalPrice(plan.monthlyUsd, countryId, rates);
};

export const usdFromLocal = (local: number, countryId: string, rates?: Record<string, number>): number => {
    const quote = currencyFor(countryId, rates);
    if (!Number.isFinite(local) || local <= 0 || quote.unitsPerUsd <= 0) return 0;
    return local / quote.unitsPerUsd;
};

export const planUsdInCountry = (plan: PricingPlan, countryId: string, rates?: Record<string, number>): number =>
    usdFromLocal(localMonthly(plan, countryId, rates), countryId, rates);

export const formatLocalAmount = (amount: number, code: string): string => {
    const digits = ZERO_DECIMAL.has(code) || Math.abs(amount) >= 100 ? 0 : 2;
    const formatted = (Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    return `${code} ${formatted}`;
};

const finite = (value: number | undefined, fallback: number) => (Number.isFinite(value) ? (value as number) : fallback);

export const decorateRival = (rival: RivalPlatformState, rates?: Record<string, number>): RivalPlatformState => {
    const homeCountryId = rival.homeCountryId || RIVAL_HOME[rival.id] || 'US';
    const quote = currencyFor(homeCountryId, rates);
    const usd = Math.max(0, finite(rival.monthlyPrice, 0));
    const local = Number.isFinite(rival.localMonthlyPrice)
        ? Math.max(0, rival.localMonthlyPrice as number)
        : roundLocal(usd * quote.unitsPerUsd, quote.code);
    const annual = Math.round(
        rival.householdsM * 1_000_000 * (usd > 0 ? usd : 1.5) * 12 * (usd === 0 ? 0.35 : 0.82)
    );
    const debtShare = rival.tier === 'GLOBAL' ? 0.55 : rival.tier === 'REGIONAL' ? 0.4 : 0.28;
    const growth = rival.tier === 'EMERGING' ? 0.08 : rival.tier === 'REGIONAL' ? 0.04 : 0.02;
    return {
        ...rival,
        languages: [...(rival.languages || [])],
        homeCountryId,
        currency: quote.code,
        localMonthlyPrice: local,
        monthlyPrice: quote.unitsPerUsd > 0 ? Math.round((local / quote.unitsPerUsd) * 100) / 100 : usd,
        debtUsd: finite(rival.debtUsd, Math.round(annual * debtShare)),
        cashUsd: finite(rival.cashUsd, Math.round(annual * 0.12)),
        annualRevenueUsd: finite(rival.annualRevenueUsd, annual),
        growthPct: finite(rival.growthPct, growth),
    };
};

export const refreshRivalUsd = (rival: RivalPlatformState, rates?: Record<string, number>): RivalPlatformState => {
    const decorated = decorateRival(rival, rates);
    return decorated;
};

export const countryCurrencyLabel = (country: MarketCountry, rates?: Record<string, number>): string => {
    const quote = currencyFor(country.id, rates);
    return `${quote.code} · ${quote.name}`;
};

export const ensureFxRates = (state: OwnPlatformState): Record<string, number> =>
    state.fxRates && Object.keys(state.fxRates).length ? { ...anchorRates(), ...state.fxRates } : anchorRates();
