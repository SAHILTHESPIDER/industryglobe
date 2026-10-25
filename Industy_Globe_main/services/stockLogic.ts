import { Player, PortfolioItem, Stock, StockFundamentals } from '../types';
import { hashString } from './ownPlatform/catalog';

export interface MarketContext {
    /** Stable per player and week, for example `${player.id}:${absoluteWeek}`. */
    seed: string;
    week: number;
    /** Negative when a payment was missed. Applied to the player's listing and, more lightly, to media. */
    creditShock: number;
    empire?: StockFundamentals;
    headlines: string[];
    releases: { status: string; studioId?: string; gross: number; budget: number }[];
}

export interface MarketUpdateResult {
    stocks: Stock[];
    dividendsTotal: number;
    notifications: string[];
}

interface StockTemplate {
    id: string;
    symbol: string;
    name: string;
    sector: Stock['sector'];
    price: number;
    volatility: number;
    dividendYield: number;
    relatedBrandName?: string;
    relatedStudioId?: string;
    sharesOutstanding: number;
    platformHouseholdsM?: number;
    fundamentals: StockFundamentals;
}

const book = (row: Partial<StockFundamentals> & Pick<StockFundamentals, 'annualRevenue' | 'netDebt' | 'cash'>): StockFundamentals => ({
    revenueGrowth: 0.02,
    subscriberGrowth: 0.01,
    profitMargin: 0.14,
    debtToEquity: 0.35,
    subscribersM: 0,
    catalogueValue: 0,
    ...row,
});

const TEMPLATES: StockTemplate[] = [
    { id: 'stk_apple', symbol: 'AAPL', name: 'Apple Inc.', sector: 'TECH', price: 185, volatility: 0.02, dividendYield: 0.005, relatedBrandName: 'Apple', relatedStudioId: 'APPLE_TV', sharesOutstanding: 15_500_000_000, platformHouseholdsM: 45, fundamentals: book({ annualRevenue: 383_000_000_000, netDebt: -60_000_000_000, cash: 70_000_000_000, subscribersM: 45, catalogueValue: 40_000_000_000, profitMargin: 0.26, debtToEquity: 0.15, revenueGrowth: 0.01 }) },
    { id: 'stk_amzn', symbol: 'AMZN', name: 'Amazon', sector: 'TECH', price: 145, volatility: 0.03, dividendYield: 0, sharesOutstanding: 10_400_000_000, fundamentals: book({ annualRevenue: 575_000_000_000, netDebt: 35_000_000_000, cash: 70_000_000_000, profitMargin: 0.06, debtToEquity: 0.4, revenueGrowth: 0.025 }) },
    { id: 'stk_goog', symbol: 'GOOG', name: 'Alphabet', sector: 'TECH', price: 160, volatility: 0.025, dividendYield: 0, sharesOutstanding: 12_300_000_000, fundamentals: book({ annualRevenue: 307_000_000_000, netDebt: -90_000_000_000, cash: 110_000_000_000, profitMargin: 0.24, debtToEquity: 0.1, revenueGrowth: 0.02 }) },
    { id: 'stk_nflx', symbol: 'NFLX', name: 'Netflix', sector: 'MEDIA', price: 620, volatility: 0.05, dividendYield: 0, relatedStudioId: 'NETFLIX', sharesOutstanding: 430_000_000, platformHouseholdsM: 260, fundamentals: book({ annualRevenue: 33_700_000_000, netDebt: 14_000_000_000, cash: 7_000_000_000, subscribersM: 260, catalogueValue: 18_000_000_000, profitMargin: 0.18, debtToEquity: 0.7, revenueGrowth: 0.03, subscriberGrowth: 0.02 }) },
    { id: 'stk_dis', symbol: 'DIS', name: 'Disney', sector: 'MEDIA', price: 110, volatility: 0.03, dividendYield: 0.01, relatedStudioId: 'DISNEY_PLUS', sharesOutstanding: 1_830_000_000, platformHouseholdsM: 150, fundamentals: book({ annualRevenue: 89_000_000_000, netDebt: 42_000_000_000, cash: 8_000_000_000, subscribersM: 150, catalogueValue: 55_000_000_000, profitMargin: 0.08, debtToEquity: 0.55, revenueGrowth: 0.015, subscriberGrowth: 0.01 }) },
    { id: 'stk_wbd', symbol: 'WBD', name: 'Warner Bros. Discovery', sector: 'MEDIA', price: 12.5, volatility: 0.06, dividendYield: 0, relatedStudioId: 'WARNER_BROS', sharesOutstanding: 2_440_000_000, platformHouseholdsM: 95, fundamentals: book({ annualRevenue: 41_000_000_000, netDebt: 40_000_000_000, cash: 3_000_000_000, subscribersM: 95, catalogueValue: 28_000_000_000, profitMargin: -0.04, debtToEquity: 1.6, revenueGrowth: -0.01, subscriberGrowth: 0 }) },
    { id: 'stk_para', symbol: 'PARA', name: 'Paramount Global', sector: 'MEDIA', price: 13, volatility: 0.06, dividendYield: 0.03, relatedStudioId: 'PARAMOUNT', sharesOutstanding: 680_000_000, platformHouseholdsM: 70, fundamentals: book({ annualRevenue: 29_000_000_000, netDebt: 14_000_000_000, cash: 2_000_000_000, subscribersM: 70, catalogueValue: 12_000_000_000, profitMargin: -0.02, debtToEquity: 1.3, revenueGrowth: -0.005 }) },
    { id: 'stk_cmcsa', symbol: 'CMCSA', name: 'Comcast (Universal)', sector: 'MEDIA', price: 42, volatility: 0.02, dividendYield: 0.025, relatedStudioId: 'UNIVERSAL', sharesOutstanding: 3_900_000_000, platformHouseholdsM: 36, fundamentals: book({ annualRevenue: 121_000_000_000, netDebt: 90_000_000_000, cash: 8_000_000_000, subscribersM: 36, catalogueValue: 30_000_000_000, profitMargin: 0.12, debtToEquity: 1.1, revenueGrowth: 0.005 }) },
    { id: 'stk_nke', symbol: 'NKE', name: 'Nike', sector: 'FASHION', price: 105, volatility: 0.02, dividendYield: 0.015, relatedBrandName: 'Nike', sharesOutstanding: 1_510_000_000, fundamentals: book({ annualRevenue: 51_000_000_000, netDebt: 9_000_000_000, cash: 10_000_000_000, profitMargin: 0.11, debtToEquity: 0.6, revenueGrowth: 0.01 }) },
    { id: 'stk_ker', symbol: 'KER', name: 'Kering (Gucci)', sector: 'FASHION', price: 450, volatility: 0.04, dividendYield: 0.03, relatedBrandName: 'Gucci', sharesOutstanding: 124_000_000, fundamentals: book({ annualRevenue: 19_000_000_000, netDebt: 8_000_000_000, cash: 4_000_000_000, profitMargin: 0.16, debtToEquity: 0.5, revenueGrowth: 0.005 }) },
    { id: 'stk_ko', symbol: 'KO', name: 'Coca-Cola', sector: 'BEVERAGE', price: 60, volatility: 0.01, dividendYield: 0.035, relatedBrandName: 'Coca-Cola', sharesOutstanding: 4_310_000_000, fundamentals: book({ annualRevenue: 46_000_000_000, netDebt: 30_000_000_000, cash: 12_000_000_000, profitMargin: 0.23, debtToEquity: 1.4, revenueGrowth: 0.008 }) },
    { id: 'stk_pep', symbol: 'PEP', name: 'PepsiCo', sector: 'BEVERAGE', price: 168, volatility: 0.01, dividendYield: 0.03, relatedBrandName: 'Pepsi', sharesOutstanding: 1_370_000_000, fundamentals: book({ annualRevenue: 92_000_000_000, netDebt: 35_000_000_000, cash: 8_000_000_000, profitMargin: 0.1, debtToEquity: 2, revenueGrowth: 0.01 }) },
    { id: 'stk_tsla', symbol: 'TSLA', name: 'Tesla', sector: 'AUTOMOTIVE', price: 175, volatility: 0.08, dividendYield: 0, relatedBrandName: 'Tesla', sharesOutstanding: 3_180_000_000, fundamentals: book({ annualRevenue: 97_000_000_000, netDebt: -15_000_000_000, cash: 22_000_000_000, profitMargin: 0.1, debtToEquity: 0.15, revenueGrowth: 0.02 }) },
    { id: 'stk_tm', symbol: 'TM', name: 'Toyota', sector: 'AUTOMOTIVE', price: 230, volatility: 0.015, dividendYield: 0.025, relatedBrandName: 'Toyota', sharesOutstanding: 1_350_000_000, fundamentals: book({ annualRevenue: 290_000_000_000, netDebt: 120_000_000_000, cash: 50_000_000_000, profitMargin: 0.08, debtToEquity: 0.6, revenueGrowth: 0.01 }) },
    { id: 'stk_race', symbol: 'RACE', name: 'Ferrari', sector: 'AUTOMOTIVE', price: 410, volatility: 0.03, dividendYield: 0.008, relatedBrandName: 'Ferrari', sharesOutstanding: 180_000_000, fundamentals: book({ annualRevenue: 6_000_000_000, netDebt: 1_000_000_000, cash: 1_500_000_000, profitMargin: 0.22, debtToEquity: 0.4, revenueGrowth: 0.015 }) },
    { id: 'stk_lvmh', symbol: 'LVMH', name: 'LVMH', sector: 'FASHION', price: 850, volatility: 0.03, dividendYield: 0.015, relatedBrandName: 'Louis Vuitton', sharesOutstanding: 500_000_000, fundamentals: book({ annualRevenue: 86_000_000_000, netDebt: 12_000_000_000, cash: 10_000_000_000, profitMargin: 0.18, debtToEquity: 0.3, revenueGrowth: 0.012 }) },
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map(row => [row.id, row]));

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

export const sanitizePrice = (value: number, fallback = 1): number => {
    if (!Number.isFinite(value) || value <= 0) return Math.max(0.5, Number.isFinite(fallback) && fallback > 0 ? fallback : 1);
    return Math.round(value * 100) / 100;
};

const backfillHistory = (id: string, price: number, volatility: number, existing: number[]): number[] => {
    const clean = (existing || []).filter(point => Number.isFinite(point) && point > 0).map(point => sanitizePrice(point, price));
    const target = sanitizePrice(price, clean[clean.length - 1] || 1);
    const have = clean.length ? clean : [target];
    if (have[have.length - 1] !== target) have[have.length - 1] = target;
    const missing = 52 - have.length;
    if (missing <= 0) return have.slice(-52);
    let cursor = have[0];
    const older: number[] = [];
    for (let step = missing; step >= 1; step -= 1) {
        const rng = mulberry32(hashString(`${id}:boot:${step}`));
        const move = (rng() - 0.5) * Math.max(0.02, volatility) * 1.5;
        cursor = sanitizePrice(cursor / (1 + move), target);
        older.push(cursor);
    }
    older.reverse();
    return [...older, ...have].slice(-52);
};

const cloneBooks = (row: StockFundamentals): StockFundamentals => ({ ...row });

export const initializeStocks = (): Stock[] => TEMPLATES.map(template => ({
    id: template.id,
    symbol: template.symbol,
    name: template.name,
    sector: template.sector,
    price: template.price,
    volatility: template.volatility,
    dividendYield: template.dividendYield,
    relatedBrandName: template.relatedBrandName,
    relatedStudioId: template.relatedStudioId as Stock['relatedStudioId'],
    sharesOutstanding: template.sharesOutstanding,
    platformHouseholdsM: template.platformHouseholdsM,
    fundamentals: cloneBooks(template.fundamentals),
    priceHistory: backfillHistory(template.id, template.price, template.volatility, [template.price]),
    lastDividendPayoutWeek: 0,
}));

/** Fill shares, a 52-week tape, and books on saves written before prices moved for a reason. */
export const normalizeListedStocks = (stocks: Stock[] | undefined): Stock[] => {
    const incoming = Array.isArray(stocks) ? stocks.filter(row => row && row.id) : [];
    const seen = new Set<string>();
    const normalized: Stock[] = incoming.map(stock => {
        seen.add(stock.id);
        const template = TEMPLATE_BY_ID.get(stock.id);
        const volatility = Number.isFinite(stock.volatility) ? stock.volatility : (template?.volatility || 0.03);
        const price = sanitizePrice(stock.price, template?.price || 1);
        const playerCompany = Boolean(stock.playerCompany || stock.id === 'stk_emp');
        const shares = Number(stock.sharesOutstanding);
        const useTemplateShares = !playerCompany && template && (!Number.isFinite(shares) || shares < 100_000);
        return {
            ...stock,
            price,
            volatility,
            dividendYield: Number.isFinite(stock.dividendYield) ? stock.dividendYield : (template?.dividendYield || 0),
            sharesOutstanding: useTemplateShares ? template!.sharesOutstanding : (Number.isFinite(shares) ? shares : template?.sharesOutstanding),
            fundamentals: stock.fundamentals ? { ...cloneBooks(template?.fundamentals || book({ annualRevenue: 0, netDebt: 0, cash: 0 })), ...stock.fundamentals } : (template ? cloneBooks(template.fundamentals) : undefined),
            priceHistory: backfillHistory(stock.id, price, volatility, stock.priceHistory || []),
            lastDividendPayoutWeek: Number.isFinite(stock.lastDividendPayoutWeek) ? stock.lastDividendPayoutWeek : 0,
            playerCompany,
        };
    });
    TEMPLATES.forEach(template => {
        if (!seen.has(template.id)) normalized.push(initializeStocks().find(row => row.id === template.id)!);
    });
    return normalized;
};

const driftBooks = (books: StockFundamentals, rng: () => number, forced?: Partial<StockFundamentals>): StockFundamentals => {
    const next: StockFundamentals = {
        ...books,
        revenueGrowth: clamp(books.revenueGrowth + (rng() - 0.5) * 0.012, -0.12, 0.14),
        subscriberGrowth: clamp(books.subscriberGrowth + (rng() - 0.5) * 0.01, -0.1, 0.12),
        profitMargin: clamp(books.profitMargin + (rng() - 0.48) * 0.01, -0.35, 0.4),
        debtToEquity: clamp(books.debtToEquity + (rng() - 0.5) * 0.04, 0, 3.5),
    };
    return { ...next, ...forced };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const noteFor = (walk: number, books: StockFundamentals, extra: number): string => {
    const bits: string[] = [];
    if (books.revenueGrowth >= 0.02) bits.push('revenue is growing');
    else if (books.revenueGrowth <= -0.015) bits.push('revenue slipped');
    if (books.subscriberGrowth >= 0.015) bits.push('subscribers are up');
    else if (books.subscriberGrowth <= -0.01) bits.push('subscribers fell');
    if (books.profitMargin < 0) bits.push('the company is losing money');
    if (books.debtToEquity >= 1.2) bits.push('the debt load is heavy');
    if (extra <= -0.02) bits.push('a missed payment hit the tape');
    else if (extra >= 0.02) bits.push('a hit moved the tape');
    else if (walk > 0.01) bits.push('buyers showed up');
    else if (walk < -0.01) bits.push('sellers showed up');
    return bits.slice(0, 2).join(', ') || 'a quiet week';
};

/**
 * One seeded step per listed company.
 * Weekly move ≈ random walk × volatility + revenue, subscribers, profit, debt, hits, and news.
 * Price is never negative and never NaN.
 */
export const processStockMarket = (stocks: Stock[], ctx: MarketContext): MarketUpdateResult => {
    const notifications: string[] = [];
    const headlines = (ctx.headlines || []).join(' ').toLowerCase();
    let news = 0;
    if (headlines.includes('recession') || headlines.includes('flop') || headlines.includes('default')) news -= 0.012;
    if (headlines.includes('scandal') || headlines.includes('lawsuit')) news -= 0.02;
    if (headlines.includes('record') || headlines.includes('blockbuster') || headlines.includes('hit')) news += 0.008;
    const releaseHit = (ctx.releases || []).filter(row => row.status === 'BLOCKBUSTER_TRACK' || (row.budget > 0 && row.gross > row.budget * 2));
    const releaseFlop = (ctx.releases || []).filter(row => row.status === 'FLOP_WARNING' || (row.budget > 0 && row.gross > 0 && row.gross < row.budget * 0.35));

    const updated = (stocks || []).map(stock => {
        const price = sanitizePrice(stock.price, stock.priceHistory?.find(point => point > 0) || 1);
        const volatility = clamp(Number.isFinite(stock.volatility) ? stock.volatility : 0.03, 0.005, 0.2);
        const rng = mulberry32(hashString(`${ctx.seed}:${stock.id}`));
        const baseBooks = stock.fundamentals || book({ annualRevenue: price * (stock.sharesOutstanding || 1) * 0.05, netDebt: 0, cash: 0 });
        const forced = stock.playerCompany && ctx.empire ? ctx.empire : undefined;
        const books = driftBooks(baseBooks, rng, forced);

        const studioHit = releaseHit.some(row => row.studioId && row.studioId === stock.relatedStudioId);
        const studioFlop = releaseFlop.some(row => row.studioId && row.studioId === stock.relatedStudioId);
        let extra = news * (stock.sector === 'MEDIA' ? 1 : 0.4);
        if (stock.playerCompany) {
            if (releaseHit.length) extra += 0.03;
            if (releaseFlop.length) extra -= 0.035;
            extra += ctx.creditShock;
        } else if (stock.sector === 'MEDIA') {
            if (studioHit || releaseHit.length) extra += studioHit ? 0.02 : 0.006;
            if (studioFlop || releaseFlop.length) extra -= studioFlop ? 0.025 : 0.006;
            if (ctx.creditShock < -0.02) extra += ctx.creditShock * 0.35;
        }
        if (studioHit) extra += 0.02;
        if (studioFlop) extra -= 0.025;

        const walk = (rng() - 0.48) * Math.max(0.045, volatility * 1.7);
        const fundamental = clamp(books.revenueGrowth, -0.12, 0.14) * 0.45
            + clamp(books.subscriberGrowth, -0.1, 0.12) * 0.35
            + clamp(books.profitMargin, -0.3, 0.4) * 0.12
            - clamp(books.debtToEquity, 0, 3.5) * 0.012;
        const move = clamp(walk + fundamental + extra, -0.18, 0.18);
        const nextPrice = sanitizePrice(price * (1 + move), price);
        const history = [...(stock.priceHistory || []).filter(point => Number.isFinite(point) && point > 0), nextPrice].slice(-52);
        let lastPayout = stock.lastDividendPayoutWeek || 0;
        if (stock.dividendYield > 0 && ctx.week - lastPayout >= 12) lastPayout = ctx.week;
        const described: Stock = {
            ...stock,
            price: nextPrice,
            priceHistory: history,
            lastDividendPayoutWeek: lastPayout,
            fundamentals: { ...books, lastNote: noteFor(walk, books, extra) },
        };
        return { stock: described, move };
    });

    const movers = [...updated].sort((a, b) => Math.abs(b.move) - Math.abs(a.move)).slice(0, 2);
    movers.forEach(row => {
        if (Math.abs(row.move) < 0.035) return;
        const direction = row.move >= 0 ? 'up' : 'down';
        const pct = (Math.abs(row.move) * 100).toFixed(1);
        notifications.push(`${row.stock.symbol} is ${direction} ${pct}% this week. ${row.stock.fundamentals?.lastNote || ''}`.trim());
    });

    return {
        stocks: updated.map(row => row.stock),
        dividendsTotal: 0,
        notifications,
    };
};

export const weekChangePct = (stock: Stock): number => {
    const history = (stock.priceHistory || []).filter(point => Number.isFinite(point) && point > 0);
    const previous = history.length >= 2 ? history[history.length - 2] : stock.price;
    if (!previous) return 0;
    const change = (sanitizePrice(stock.price, previous) - previous) / previous;
    return Number.isFinite(change) ? change : 0;
};

export const fiftyTwoWeek = (stock: Stock): { high: number; low: number } => {
    const history = (stock.priceHistory || []).filter(point => Number.isFinite(point) && point > 0);
    const price = sanitizePrice(stock.price, history[history.length - 1] || 1);
    const pool = history.length ? history : [price];
    return { high: Math.max(price, ...pool), low: Math.min(price, ...pool) };
};

export const marketCap = (stock: Stock): number => {
    const shares = Number(stock.sharesOutstanding);
    if (!Number.isFinite(shares) || shares <= 0) return 0;
    return sanitizePrice(stock.price, 0) * shares;
};

export const calculatePortfolioValue = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    return (portfolio || []).reduce((total, item) => {
        const stock = stocks.find(row => row.id === item.stockId);
        const price = stock ? sanitizePrice(stock.price, 0) : 0;
        const shares = Number(item.shares);
        if (!Number.isFinite(shares) || shares <= 0 || price <= 0) return total;
        return total + shares * price;
    }, 0);
};

export const getDividendPayout = (portfolio: PortfolioItem[], stocks: Stock[], week: number): number => {
    let total = 0;
    (portfolio || []).forEach(item => {
        const stock = stocks.find(row => row.id === item.stockId);
        if (stock && stock.dividendYield > 0 && stock.lastDividendPayoutWeek === week) {
            const quarterlyPerShare = (sanitizePrice(stock.price, 0) * stock.dividendYield) / 4;
            total += quarterlyPerShare * item.shares;
        }
    });
    return Math.floor(Number.isFinite(total) ? total : 0);
};

export const empireFundamentals = (player: Player): StockFundamentals | undefined => {
    const state = player.ownPlatform;
    if (!state) return undefined;
    const history = state.books?.history || [];
    const previous = history.length >= 2 ? history[history.length - 2] : undefined;
    const revenue = Number(state.lastWeeklyRevenue) || 0;
    const burn = Number(state.lastWeeklyBurn) || 0;
    const profit = revenue - burn;
    const prevRevenue = previous?.revenue || 0;
    const revenueGrowth = prevRevenue > 0 ? clamp((revenue - prevRevenue) / prevRevenue, -0.4, 0.4) : (revenue > 0 ? 0.02 : 0);
    const listed = (player.stocks || []).find(stock => stock.playerCompany || stock.id === 'stk_emp');
    const prevSubs = listed?.fundamentals?.subscribersM || 0;
    const subsM = (state.subscribers || 0) / 1_000_000;
    const subscriberGrowth = prevSubs > 0.01 ? clamp((subsM - prevSubs) / prevSubs, -0.4, 0.4) : 0;
    const empireLoans = (player.finance?.loans || [])
        .filter(loan => (loan.borrower || 'PERSONAL') === 'EMPIRE' && loan.status !== 'PAID')
        .reduce((sum, loan) => sum + Math.max(0, loan.principal), 0);
    const debt = (state.books?.debt || 0) + empireLoans;
    const equity = Math.max(1_000_000, (listed && listed.sharesOutstanding ? listed.price * listed.sharesOutstanding : 0) || (state.ipo?.valuation || 6_000_000));
    const annual = revenue * 52;
    return {
        revenueGrowth,
        subscriberGrowth,
        profitMargin: revenue > 0 ? clamp(profit / revenue, -1, 0.8) : (profit < 0 ? -0.25 : 0),
        debtToEquity: debt / equity,
        netDebt: debt,
        annualRevenue: annual,
        subscribersM: subsM,
        catalogueValue: (state.catalogue?.length || 0) * 1_400_000,
        cash: Math.max(0, player.money),
    };
};
