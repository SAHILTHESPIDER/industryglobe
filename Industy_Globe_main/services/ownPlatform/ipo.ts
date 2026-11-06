import {
    IpoListing,
    IpoValueDriver,
    Player,
    Stock,
} from '../../types';
import { publicBrandName } from '../rights/alterName';
import { hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { formatCompact, quoteLaunch } from './logic';
import { cityById } from './serverCities';
import { capSlices } from './stakeSale';

/** One line under the finance-desk button. */
export const IPO_LINE = 'Company ko stock market pe list karo, investors se paisa aayega.';

export const MIN_WEEKS_LIVE = 4;
export const MIN_VALUATION = 12_000_000;
export const MIN_SUBSCRIBERS = 8_000;
export const MIN_TITLES = 2;
export const CONTROL_LINE = 0.51;
export const FLOAT_CHOICES = [0.1, 0.15, 0.2, 0.25, 0.3] as const;

const BASE_VALUE = 6_000_000;
const LIVE_PREMIUM = 4_000_000;
const BUILD_PREMIUM = 1_500_000;

export interface IpoBank {
    id: string;
    name: string;
    feePct: number;
    spreadPct: number;
    pitchMultiple: number;
    /** What picking this bank does. */
    line: string;
}

interface BankSource {
    id: string;
    source: string;
    feePct: number;
    spreadPct: number;
    pitchMultiple: number;
    line: string;
}

const BANK_SOURCES: BankSource[] = [
    {
        id: 'gold',
        source: 'Goldman Sachs',
        feePct: 0.05,
        spreadPct: 0.035,
        pitchMultiple: 1.28,
        line: 'They pitch a rich price. The fee and the underwriting cut are the highest.',
    },
    {
        id: 'morgan',
        source: 'Morgan Stanley',
        feePct: 0.035,
        spreadPct: 0.025,
        pitchMultiple: 1.08,
        line: 'A middle price. The fee and the cut sit in the middle too.',
    },
    {
        id: 'jpm',
        source: 'JPMorgan',
        feePct: 0.02,
        spreadPct: 0.015,
        pitchMultiple: 0.92,
        line: 'A careful price, and the cheapest fee. The book fills more easily.',
    },
];

const STOP_IDS = ['bom', 'lon', 'nyc', 'sin', 'lax'] as const;

const FUNDS = [
    'North Quay Capital',
    'Sable Peak',
    'Lantern House',
    'River Malt',
    'Kite and Rowan',
    'Harbour Lane',
    'Paper Kite Desk',
    'Yellow Tram',
];

export interface IpoStop {
    id: string;
    city: string;
    /** 0 to 1, how full that city's bar gets. */
    demand: number;
    lat: number;
    lon: number;
}

export interface IpoOrder {
    name: string;
    shares: number;
}

export interface IpoQuote {
    valuation: number;
    drivers: IpoValueDriver[];
    bank: IpoBank;
    floatPct: number;
    pitched: number;
    shares: number;
    price: number;
    gross: number;
    fees: number;
    net: number;
    oversubscription: number;
    stops: IpoStop[];
    orders: IpoOrder[];
    founderBefore: number;
    founderAfter: number;
    losesControl: boolean;
    exchange: string;
    ticker: string;
    headline: string;
    dayMove: number[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 15% or 8.5%, so several lines still add to 100. */
export const showPct = (value: number): string => {
    const tenths = Math.round((Number(value) || 0) * 1000) / 10;
    if (!Number.isFinite(tenths)) return '0%';
    return Number.isInteger(tenths) ? `${tenths.toFixed(0)}%` : `${tenths.toFixed(1)}%`;
};

/** One decimal under $100M, so a 1.28× pitch does not jump from $12.8M to $13M. */
export const showIpoMoney = (amount: number): string => {
    const abs = Math.abs(amount);
    if (!Number.isFinite(amount)) return '$0';
    if (abs >= 1_000_000 && abs < 100_000_000) {
        const sign = amount < 0 ? '-' : '';
        return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    }
    return formatCompact(amount);
};

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const ipoBanks = (): IpoBank[] => BANK_SOURCES.map(bank => ({
    id: bank.id,
    name: publicBrandName(bank.source),
    feePct: bank.feePct,
    spreadPct: bank.spreadPct,
    pitchMultiple: bank.pitchMultiple,
    line: bank.line,
}));

export const ipoExchange = (): string => publicBrandName('Nasdaq');

export const readValuationParts = (player: Player): { total: number; drivers: IpoValueDriver[] } => {
    const state = player.ownPlatform;
    if (!state) {
        return {
            total: BASE_VALUE,
            drivers: [{
                label: 'Company floor',
                line: 'A company with no service yet still has a starting value.',
                amount: BASE_VALUE,
            }],
        };
    }
    const quote = quoteLaunch(player);
    const homes = Math.max(state.subscribers, quote.households * 0.15);
    const audience = homes * 35;
    const shelf = state.catalogue.length * 1_400_000 + state.closedDeals.length * 900_000;
    const bought = (state.ownedStreamers || []).reduce((sum, row) => sum + row.householdsM * 800_000, 0);
    const air = state.stage === 'LIVE' ? LIVE_PREMIUM : state.commissioned ? BUILD_PREMIUM : 0;
    const total = Math.round(BASE_VALUE + audience + shelf + bought + air);
    const audienceR = Math.round(audience);
    const shelfR = Math.round(shelf);
    const boughtR = Math.round(bought);
    const airR = Math.round(air);
    const baseR = total - audienceR - shelfR - boughtR - airR;
    const drivers: IpoValueDriver[] = [
        {
            label: 'Company floor',
            line: 'The starting value before audience, shelf, or the fact that you are on air.',
            amount: baseR,
        },
        {
            label: 'Paying homes',
            line: 'Subscribers, or the homes the launch forecast already implies, each add a little.',
            amount: audienceR,
        },
        {
            label: 'Shelf',
            line: 'Shows and films on the service, yours or licensed.',
            amount: shelfR,
        },
    ];
    if (boughtR > 0) {
        drivers.push({
            label: 'Services you bought',
            line: 'Other streaming companies already on your books.',
            amount: boughtR,
        });
    }
    if (airR > 0) {
        drivers.push({
            label: state.stage === 'LIVE' ? 'On air' : 'Under construction',
            line: state.stage === 'LIVE'
                ? 'The service is open, so the company is worth more than a plan.'
                : 'The build is signed, so part of the opening value is already real.',
            amount: airR,
        });
    }
    return { total, drivers };
};

const tickerFrom = (name: string) => {
    const letters = name.replace(/[^a-z]/gi, '').toUpperCase();
    return (letters.slice(0, 3) || 'EMP').padEnd(3, 'P');
};

export const founderStake = (player: Player): number => capSlices(player).founder;

/** Founder fraction after new shares equal to floatPct of the company. */
export const founderAfterFloat = (player: Player, floatPct: number): number => (
    founderStake(player) * (1 - clamp(floatPct, 0, 0.9))
);

export const losesMajority = (player: Player, floatPct: number): boolean => (
    founderAfterFloat(player, floatPct) < CONTROL_LINE - 1e-9
);

const snapFloat = (value: number): number => FLOAT_CHOICES.reduce((best, row) => (
    Math.abs(row - value) < Math.abs(best - value) ? row : best
), FLOAT_CHOICES[1]);

export const ipoBlockers = (player: Player): string[] => {
    const state = player.ownPlatform;
    if (!state) return ['Too early. Open Empire+ before you list it.'];
    if (state.ipo?.stage === 'LISTED' || state.ipo?.listing) {
        return ['This company is already on the exchange.'];
    }
    const reasons: string[] = [];
    const stage = state.ipo?.stage || 'IDLE';
    if (stage === 'TRADING') {
        reasons.push('The first trading day is still open in the boardroom. Finish it there.');
    } else if (stage !== 'IDLE') {
        reasons.push('A listing draft is already open in the boardroom. Drop it here, or finish it there, before you start this one.');
    }
    if (state.stage !== 'LIVE') {
        reasons.push('Too early. The service is not on air yet. Finish the build first.');
    } else if ((state.weeksLive || 0) < MIN_WEEKS_LIVE) {
        reasons.push(`Too early. Run the service for ${MIN_WEEKS_LIVE} weeks after it opens. You are on week ${state.weeksLive || 0}.`);
    }
    const titles = (state.catalogue?.length || 0) + (state.closedDeals?.length || 0);
    const subs = state.subscribers || 0;
    if (subs < MIN_SUBSCRIBERS && titles < MIN_TITLES) {
        reasons.push(`Too small. Need ${MIN_SUBSCRIBERS.toLocaleString()} subscribers, or ${MIN_TITLES} titles on the shelf. You have ${subs.toLocaleString()} subscribers and ${titles} titles.`);
    }
    const value = readValuationParts(player).total;
    if (value < MIN_VALUATION) {
        reasons.push(`Too small. The company is worth ${formatCompact(value)}, under ${formatCompact(MIN_VALUATION)}. Subscribers and the shelf raise it.`);
    }
    if (losesMajority(player, FLOAT_CHOICES[0])) {
        reasons.push('A 10% listing would drop you under 51%. You would not control the company.');
    }
    return reasons;
};

export const canStartIpo = (player: Player): boolean => ipoBlockers(player).length === 0;

export const draftCanDrop = (player: Player): boolean => {
    const stage = player.ownPlatform?.ipo?.stage;
    return Boolean(stage && stage !== 'IDLE' && stage !== 'TRADING' && stage !== 'LISTED' && !player.ownPlatform?.ipo?.listing);
};

/** Clears an unfinished boardroom draft. Does not move cash. */
export const dropIpoDraft = (player: Player): { player: Player; error?: string } => {
    if (!player.ownPlatform?.ipo) return { player, error: 'There is no listing draft.' };
    if (!draftCanDrop(player)) return { player, error: 'This listing can no longer be dropped.' };
    const name = player.ownPlatform.name;
    const fresh = {
        ...player.ownPlatform.ipo,
        stage: 'IDLE' as const,
        valuation: 0,
        votes: [],
        bookMultiple: 0,
        bookDay: 0,
        anchorPct: 0,
        anchorWalked: false,
        openPrice: 0,
        lastPrice: 0,
        dayMove: [],
        ticker: tickerFrom(name),
    };
    delete fresh.listing;
    delete fresh.valueDrivers;
    return {
        player: {
            ...player,
            money: player.money,
            ownPlatform: { ...player.ownPlatform, ipo: fresh },
        },
    };
};

export const quoteIpo = (player: Player, bankId: string, floatPct: number): IpoQuote | null => {
    const state = player.ownPlatform;
    const bank = ipoBanks().find(row => row.id === bankId);
    if (!state || !bank) return null;
    const floated = snapFloat(floatPct);
    const { total, drivers } = readValuationParts(player);
    const pitched = Math.round(total * bank.pitchMultiple);
    const titles = (state.catalogue?.length || 0) + (state.closedDeals?.length || 0);
    const salt = hashString(`${player.id}:ipo:${bank.id}:${floated}:${state.subscribers}:${titles}:${state.weeksLive}`);
    const cheap = bank.pitchMultiple < 1 ? 0.38 : bank.pitchMultiple > 1.2 ? -0.3 : 0.1;
    const oversubscription = Math.round(clamp(
        0.9
        + Math.min(0.85, (state.subscribers || 0) / 350_000)
        + Math.min(0.5, titles * 0.09)
        + Math.min(0.4, (state.weeksLive || 0) / 24)
        + cheap
        + ((salt % 17) - 8) / 40,
        0.6,
        4.4,
    ) * 100) / 100;
    const lift = clamp(1 + (oversubscription - 1) * 0.14, 0.8, 1.62);
    const roughGross = pitched * floated * lift;
    const targetPrice = Math.max(8, Math.round(18 * bank.pitchMultiple * 100) / 100);
    const shares = Math.max(100_000, Math.round(roughGross / targetPrice / 1000) * 1000);
    const price = Math.max(1, Math.round((roughGross / shares) * 100) / 100);
    const gross = Math.round(shares * price);
    const feeRate = bank.feePct + bank.spreadPct;
    const fees = Math.round(gross * feeRate);
    const net = Math.max(0, gross - fees);
    const exchange = ipoExchange();
    const ticker = tickerFrom(state.name);
    const stops: IpoStop[] = STOP_IDS.map((id, index) => {
        const city = cityById(id);
        const jitter = ((hashString(`${salt}:${id}`) % 25) - 8) / 100;
        return {
            id,
            city: city?.name || id,
            demand: clamp(oversubscription / 3.2 + 0.2 + index * 0.04 + jitter, 0.28, 1),
            lat: city?.lat || 0,
            lon: city?.lon || 0,
        };
    });
    const weights = FUNDS.map((_, index) => 1 + ((hashString(`${salt}:ord:${index}`) % 9)));
    const weightSum = weights.reduce((sum, row) => sum + row, 0);
    const demanded = Math.max(shares, Math.round(shares * oversubscription));
    let used = 0;
    const orders: IpoOrder[] = FUNDS.map((name, index) => {
        const last = index === FUNDS.length - 1;
        const room = Math.max(0, demanded - used);
        const slice = last ? room : Math.min(room, Math.round(demanded * (weights[index] / weightSum)));
        used += slice;
        return { name, shares: slice };
    }).filter(row => row.shares > 0);
    const filled = orders.reduce((sum, row) => sum + row.shares, 0);
    const covered = Math.round((filled / shares) * 100) / 100;
    const dayMove = [0, -0.04, 0.03, -0.02, 0.05, 0.01, -0.015, 0.035, 0.02, -0.01, 0.028, 0.018, 0.024, 0.02]
        .map(delta => Math.round(price * (1 + delta) * 100) / 100);
    return {
        valuation: total,
        drivers,
        bank,
        floatPct: floated,
        pitched,
        shares,
        price,
        gross,
        fees,
        net,
        oversubscription: covered,
        stops,
        orders,
        founderBefore: founderStake(player),
        founderAfter: founderAfterFloat(player, floated),
        losesControl: losesMajority(player, floated),
        exchange,
        ticker,
        headline: `${state.name} opens on ${exchange}. The book was ${covered.toFixed(1)}× covered.`,
        dayMove,
    };
};

export interface IpoChoice {
    bankId: string;
    floatPct: number;
    /** Required when this listing drops the founder under 51%. */
    acceptControlLoss: boolean;
}

/**
 * Issues the public float, pays the net cheque into company cash, and records the listing hook.
 * Personal cash is not moved. Call this only after the documents are signed.
 */
export const completeIpo = (player: Player, choice: IpoChoice): { player: Player; error?: string } => {
    if (!canStartIpo(player)) {
        const reason = ipoBlockers(player)[0] || 'The company cannot list yet.';
        return { player, error: reason };
    }
    const quote = quoteIpo(player, choice.bankId, choice.floatPct);
    if (!quote) return { player, error: 'Pick a bank before you sign.' };
    if (quote.losesControl && !choice.acceptControlLoss) {
        return { player, error: 'This listing drops you under 51%. Confirm that on the bank step before you sign.' };
    }
    if (quote.net <= 0) return { player, error: 'This book does not raise any company cash.' };
    const state = player.ownPlatform!;
    const books = state.books;
    const factor = 1 - quote.floatPct;
    const holders = (books?.shareholders || []).map(row => ({
        ...row,
        conditions: row.conditions.map(condition => ({ ...condition })),
        pct: Math.round(row.pct * factor * 1000) / 1000,
    })).filter(row => row.pct > 0);
    const listing: IpoListing = {
        floatPct: quote.floatPct,
        proceeds: quote.net,
        gross: quote.gross,
        sharePrice: quote.price,
        shares: quote.shares,
        oversubscription: quote.oversubscription,
        exchange: quote.exchange,
        bankId: quote.bank.id,
        bankName: quote.bank.name,
        feePct: quote.bank.feePct,
        spreadPct: quote.bank.spreadPct,
        ticker: quote.ticker,
        week: player.currentWeek,
        year: player.age,
        headline: quote.headline,
        founderAfter: Math.round(quote.founderAfter * 1000) / 1000,
    };
    const priorIpo = state.ipo;
    const next: Player = {
        ...player,
        money: player.money,
        logs: [...(player.logs || [])],
        stocks: [...(player.stocks || [])],
        portfolio: player.portfolio ? player.portfolio.map(row => ({ ...row })) : player.portfolio,
        ownPlatform: {
            ...state,
            books: {
                funding: books?.funding || 'OWN',
                debt: books?.debt || 0,
                equitySoldPct: Math.round((books?.equitySoldPct || 0) * factor * 1000) / 1000,
                seedStakePct: Math.round((books?.seedStakePct || 0) * factor * 1000) / 1000,
                seedPartner: books?.seedPartner || '',
                facilityRate: books?.facilityRate || 0.09,
                pePartner: books?.pePartner || 'Kestrel Long Fund',
                history: [...(books?.history || [])],
                lines: [...(books?.lines || [])],
                cash: readCompanyCash(player),
                shareholders: holders.length ? holders : undefined,
            },
            ipo: {
                stage: 'LISTED',
                valuation: quote.pitched,
                sharesForSale: quote.shares,
                price: quote.price,
                floor: Math.round(quote.price * 0.85 * 100) / 100,
                cap: Math.round(quote.price * 1.2 * 100) / 100,
                founderKeepPct: Math.round((1 - quote.floatPct) * 1000) / 1000,
                staffReservePct: priorIpo?.staffReservePct || 0,
                disclosures: (priorIpo?.disclosures || []).map(row => ({ ...row })),
                votes: [],
                anchorName: quote.bank.name,
                anchorPct: 0,
                anchorWalked: false,
                bookMultiple: quote.oversubscription,
                bookDay: quote.stops.length,
                openPrice: quote.price,
                lastPrice: quote.dayMove[quote.dayMove.length - 1] || quote.price,
                dayMove: quote.dayMove,
                ticker: quote.ticker,
                listing,
                valueDrivers: quote.drivers.map(row => ({ ...row })),
            },
        },
    };
    addCompanyCash(next, quote.net, 'IPO proceeds', 'IPO');
    const listed: Stock = {
        id: 'stk_emp',
        symbol: quote.ticker,
        name: state.name,
        sector: 'MEDIA',
        price: quote.price,
        volatility: 0.06,
        dividendYield: 0,
        priceHistory: quote.dayMove,
        lastDividendPayoutWeek: player.currentWeek,
        sharesOutstanding: Math.round(quote.shares / quote.floatPct),
        playerCompany: true,
    };
    const existing = next.stocks.findIndex(stock => stock.id === 'stk_emp' || stock.playerCompany);
    if (existing >= 0) next.stocks[existing] = { ...next.stocks[existing], ...listed, dividendYield: 0 };
    else next.stocks = [...next.stocks, listed];
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `${state.name} listed on ${quote.exchange} as ${quote.ticker}. IPO proceeds ${formatCompact(quote.net)} landed in company cash. Your personal cash did not move.`,
        type: 'positive',
    }];
    return { player: next };
};

export const sanitizeIpoListing = (raw: IpoListing | undefined): IpoListing | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const floatPct = Number(raw.floatPct);
    const proceeds = Number(raw.proceeds);
    if (!Number.isFinite(floatPct) || !Number.isFinite(proceeds) || floatPct <= 0) return undefined;
    return {
        floatPct: clamp(floatPct, 0, 0.49),
        proceeds: Math.round(proceeds),
        gross: Math.max(0, Math.round(Number(raw.gross) || proceeds)),
        sharePrice: Math.max(0, Math.round((Number(raw.sharePrice) || 0) * 100) / 100),
        shares: Math.max(0, Math.round(Number(raw.shares) || 0)),
        oversubscription: Math.max(0, Math.round((Number(raw.oversubscription) || 0) * 100) / 100),
        exchange: clip(raw.exchange, 40) || ipoExchange(),
        bankId: clip(raw.bankId, 24),
        bankName: clip(raw.bankName, 60),
        feePct: clamp(Number(raw.feePct) || 0, 0, 0.4),
        spreadPct: clamp(Number(raw.spreadPct) || 0, 0, 0.4),
        ticker: (clip(raw.ticker, 5) || 'EMP').toUpperCase(),
        week: Math.max(0, Math.round(Number(raw.week) || 0)),
        year: Math.max(0, Math.round(Number(raw.year) || 0)),
        headline: clip(raw.headline, 180),
        founderAfter: clamp(Number(raw.founderAfter) || 0, 0, 1),
    };
};

export const sanitizeValueDrivers = (raw: unknown): IpoValueDriver[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const rows: IpoValueDriver[] = [];
    raw.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const row = item as IpoValueDriver;
        const label = clip(row.label, 80);
        if (!label) return;
        rows.push({
            label,
            line: clip(row.line, 180),
            amount: Math.round(Number(row.amount) || 0),
        });
    });
    return rows.length ? rows.slice(0, 8) : undefined;
};
