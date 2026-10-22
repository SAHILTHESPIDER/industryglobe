import { Player, RivalPlatformState, Stock } from '../../types';
import { formatCompact } from './logic';

export interface BuyFinancing {
    cash: number;
    loan: number;
    equity: boolean;
}

export interface VoteLine {
    name: string;
    role: string;
    vote: 'FOR' | 'AGAINST';
    note: string;
}

export interface AcquisitionQuote {
    id: string;
    name: string;
    kind: 'LISTED' | 'PRIVATE';
    tier: 'GLOBAL' | 'REGIONAL' | 'EMERGING' | 'COMPANY';
    householdsM: number;
    sharePrice: number;
    shares: number;
    marketCap: number;
    cash: number;
    debt: number;
    netDebt: number;
    enterpriseValue: number;
    annualRevenue: number;
    revenueMultiple: number;
    revenueValue: number;
    subscribersM: number;
    subscriberValue: number;
    catalogueValue: number;
    growthPct: number;
    growthValue: number;
    fundamentalValue: number;
    /** 0.20 to 0.50 on a change of control. */
    controlPremiumPct: number;
    /** Cash paid to the sellers. */
    equityCheque: number;
    /** Debt that moves onto the buyer's books. It is not part of the cheque. */
    assumedDebt: number;
    note: string;
    regulator: { ok: boolean; reason: string };
    board: { ok: boolean; lines: VoteLine[] };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: number | undefined, fallback = 0) => (Number.isFinite(value) ? (value as number) : fallback);

const hash = (value: string) => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

/** What the player's own service is worth before anyone else's multiple. */
export const playerCompanyValue = (player: Player): number => {
    const state = player.ownPlatform;
    if (!state) return 0;
    const listed = (player.stocks || []).find(stock => stock.playerCompany || stock.id === 'stk_emp');
    if (listed && finite(listed.price) > 0 && finite(listed.sharesOutstanding) > 0) {
        return listed.price * (listed.sharesOutstanding as number);
    }
    if (state.ipo?.valuation) return state.ipo.valuation;
    const titles = (state.catalogue?.length || 0) * 1_400_000 + (state.closedDeals?.length || 0) * 900_000;
    return Math.round(6_000_000 + (state.subscribers || 0) * 35 + titles + (state.stage === 'LIVE' ? 4_000_000 : 0));
};

const premiumFor = (enterpriseValue: number, tier: AcquisitionQuote['tier']): number => {
    if (enterpriseValue >= 200_000_000_000 || tier === 'GLOBAL' && enterpriseValue >= 80_000_000_000) return 0.5;
    if (enterpriseValue >= 80_000_000_000) return 0.45;
    if (tier === 'GLOBAL' || enterpriseValue >= 20_000_000_000) return 0.4;
    if (tier === 'REGIONAL' || enterpriseValue >= 2_000_000_000) return 0.32;
    if (enterpriseValue >= 200_000_000) return 0.28;
    return 0.22;
};

const boardFor = (player: Player, id: string, cheque: number, company: number): AcquisitionQuote['board'] => {
    const stretch = cheque / Math.max(1, company);
    const defaults = player.finance?.credit?.defaults || 0;
    const seats: { name: string; role: string; hard: number }[] = [
        { name: 'You', role: 'Founder', hard: 99 },
        { name: 'Marta Oyelaran', role: 'Executive', hard: 3.2 },
        { name: 'Dinah Ayre', role: 'Chief financial officer', hard: 1.8 },
        { name: 'Helena Brandt', role: 'Independent', hard: 2.4 },
        { name: 'Sir Alan Wray', role: 'Independent', hard: 2.8 },
        { name: 'Yusuf Karim', role: 'Investor', hard: 2.1 },
        { name: 'Peter Lund', role: 'General counsel', hard: 2.2 },
    ];
    const lines: VoteLine[] = seats.map(seat => {
        if (seat.role === 'Founder') {
            return { name: seat.name, role: seat.role, vote: 'FOR', note: 'The founder wants the company.' };
        }
        if (defaults > 0) {
            return { name: seat.name, role: seat.role, vote: 'AGAINST', note: 'A default is still on the credit file.' };
        }
        if (stretch <= 1.15) {
            return { name: seat.name, role: seat.role, vote: 'FOR', note: 'The cheque fits the company you already have.' };
        }
        if (stretch > seat.hard) {
            return { name: seat.name, role: seat.role, vote: 'AGAINST', note: 'This is too large for the balance sheet.' };
        }
        const swing = hash(`${player.id}:board:${id}:${seat.name}`) % 100;
        const pass = swing > 40 + stretch * 12;
        return {
            name: seat.name,
            role: seat.role,
            vote: pass ? 'FOR' : 'AGAINST',
            note: pass ? 'The price can be defended.' : 'The stretch is wider than the last quarter.',
        };
    });
    const fors = lines.filter(line => line.vote === 'FOR').length;
    return { ok: fors > lines.length / 2, lines };
};

const regulatorFor = (
    player: Player,
    kind: AcquisitionQuote['kind'],
    tier: AcquisitionQuote['tier'],
    enterpriseValue: number,
    company: number,
): AcquisitionQuote['regulator'] => {
    if (!player.ownPlatform) {
        return { ok: false, reason: 'Open Empire+ before you buy another service. A personal cheque is not a change of control.' };
    }
    if (kind === 'LISTED' && enterpriseValue >= 8_000_000_000 && company < enterpriseValue * 0.06) {
        return {
            ok: false,
            reason: `The regulator will not clear this. ${formatCompact(company)} is not a buyer for a ${formatCompact(enterpriseValue)} enterprise.`,
        };
    }
    if (tier === 'GLOBAL' && company < enterpriseValue * 0.04) {
        return {
            ok: false,
            reason: 'A global service needs a buyer in the same league. The filing would be sent back.',
        };
    }
    if ((tier === 'REGIONAL' || tier === 'COMPANY') && company < 2_000_000 && (player.stats?.fame || 0) < 25) {
        return { ok: false, reason: 'Build the company, or a name, before you file for a regional service.' };
    }
    return { ok: true, reason: 'Nothing in the filing fails the competition test.' };
};

const pack = (draft: Omit<AcquisitionQuote, 'regulator' | 'board' | 'controlPremiumPct' | 'equityCheque'> & {
    company: number;
    player: Player;
}): AcquisitionQuote => {
    const controlPremiumPct = clamp(premiumFor(draft.enterpriseValue, draft.tier), 0.2, 0.5);
    const equityBase = draft.kind === 'LISTED'
        ? clamp(draft.marketCap, draft.fundamentalValue * 0.55, Math.max(draft.fundamentalValue * 1.7, draft.marketCap))
        : Math.max(0, draft.fundamentalValue - draft.netDebt);
    const equityCheque = Math.round(Math.max(250_000, equityBase) * (1 + controlPremiumPct));
    const regulator = regulatorFor(draft.player, draft.kind, draft.tier, draft.enterpriseValue, draft.company);
    const board = boardFor(draft.player, draft.id, equityCheque, draft.company);
    const { player: _player, company: _company, ...quote } = draft;
    return {
        ...quote,
        controlPremiumPct,
        equityCheque,
        regulator,
        board,
    };
};

const fromParts = (
    player: Player,
    parts: {
        id: string;
        name: string;
        kind: AcquisitionQuote['kind'];
        tier: AcquisitionQuote['tier'];
        householdsM: number;
        sharePrice: number;
        shares: number;
        marketCap: number;
        cash: number;
        debt: number;
        annualRevenue: number;
        subscribersM: number;
        catalogueValue: number;
        growthPct: number;
        multiple: number;
        note: string;
    },
): AcquisitionQuote => {
    const netDebt = parts.debt - parts.cash;
    const revenueValue = parts.annualRevenue * parts.multiple;
    const subscriberValue = parts.subscribersM * 1_000_000 * (parts.annualRevenue > 0 && parts.subscribersM > 0
        ? (parts.annualRevenue / (parts.subscribersM * 1_000_000)) * 3
        : 24);
    const growthValue = parts.annualRevenue * clamp(parts.growthPct, -0.2, 0.25) * 8;
    const fundamentalValue = Math.round(
        revenueValue * 0.55 + subscriberValue * 0.2 + parts.catalogueValue * 0.15 + growthValue * 0.1
    );
    const enterpriseFromMarket = parts.marketCap + netDebt;
    const enterpriseValue = parts.kind === 'LISTED'
        ? Math.max(0, enterpriseFromMarket)
        : Math.max(0, fundamentalValue);
    return pack({
        player,
        company: playerCompanyValue(player),
        id: parts.id,
        name: parts.name,
        kind: parts.kind,
        tier: parts.tier,
        householdsM: parts.householdsM,
        sharePrice: parts.sharePrice,
        shares: parts.shares,
        marketCap: Math.round(parts.marketCap),
        cash: Math.round(parts.cash),
        debt: Math.round(parts.debt),
        netDebt: Math.round(netDebt),
        enterpriseValue: Math.round(enterpriseValue),
        annualRevenue: Math.round(parts.annualRevenue),
        revenueMultiple: parts.multiple,
        revenueValue: Math.round(revenueValue),
        subscribersM: parts.subscribersM,
        subscriberValue: Math.round(subscriberValue),
        catalogueValue: Math.round(parts.catalogueValue),
        growthPct: parts.growthPct,
        growthValue: Math.round(growthValue),
        fundamentalValue,
        assumedDebt: Math.max(0, Math.round(netDebt)),
        note: parts.note,
    });
};

export const quoteListedCompany = (player: Player, stock: Stock): AcquisitionQuote | null => {
    const shares = finite(stock.sharesOutstanding);
    const price = finite(stock.price);
    if (shares < 100_000 || price <= 0 || stock.playerCompany) return null;
    const books = stock.fundamentals;
    const marketCap = price * shares;
    const annual = finite(books?.annualRevenue, marketCap * 0.08);
    const growth = finite(books?.revenueGrowth, 0.02);
    const margin = finite(books?.profitMargin, 0.12);
    const multiple = clamp(3.2 + growth * 18 + margin * 2, 2.2, 8);
    const subs = finite(books?.subscribersM, stock.platformHouseholdsM || 0);
    return fromParts(player, {
        id: stock.id,
        name: stock.name,
        kind: 'LISTED',
        tier: marketCap >= 80_000_000_000 ? 'GLOBAL' : marketCap >= 8_000_000_000 ? 'REGIONAL' : 'COMPANY',
        householdsM: subs,
        sharePrice: price,
        shares,
        marketCap,
        cash: finite(books?.cash, marketCap * 0.04),
        debt: finite(books?.netDebt, marketCap * 0.12) + finite(books?.cash, marketCap * 0.04),
        annualRevenue: annual,
        subscribersM: subs,
        catalogueValue: finite(books?.catalogueValue, annual * 0.35),
        growthPct: growth,
        multiple,
        note: 'The cheque is the equity. Net debt comes with the company and is not cash you hand over.',
    });
};

export const quotePrivateService = (player: Player, rival: RivalPlatformState): AcquisitionQuote | null => {
    if (rival.status !== 'ACTIVE') return null;
    const subs = Math.max(0, rival.householdsM);
    const usd = Math.max(0, finite(rival.monthlyPrice));
    const annual = finite(rival.annualRevenueUsd, Math.round(subs * 1_000_000 * (usd > 0 ? usd : 1.5) * 12 * (usd === 0 ? 0.35 : 0.82)));
    const growth = finite(rival.growthPct, rival.tier === 'EMERGING' ? 0.08 : 0.03);
    const multiple = clamp(
        (rival.tier === 'GLOBAL' ? 5.2 : rival.tier === 'REGIONAL' ? 3.2 : 2.1) + clamp(growth, 0, 0.15) * 8,
        1.6,
        8,
    );
    const catalogue = rival.tier === 'GLOBAL'
        ? 400_000_000 + subs * 1_000_000 * 4
        : rival.tier === 'REGIONAL'
            ? 25_000_000 + subs * 1_000_000 * 1.5
            : 6_000_000 + subs * 1_000_000 * 2;
    const cash = finite(rival.cashUsd, annual * 0.12);
    const debt = finite(rival.debtUsd, annual * 0.3);
    return fromParts(player, {
        id: rival.id,
        name: rival.name,
        kind: 'PRIVATE',
        tier: rival.tier,
        householdsM: subs,
        sharePrice: 0,
        shares: 0,
        marketCap: 0,
        cash,
        debt,
        annualRevenue: annual,
        subscribersM: subs,
        catalogueValue: catalogue,
        growthPct: growth,
        multiple,
        note: 'No public tape. The price is revenue, subscribers, the library, and growth, minus net debt, plus a control premium.',
    });
};

export const quoteAcquisition = (player: Player, dealId: string): AcquisitionQuote | null => {
    const stock = (player.stocks || []).find(row => row.id === dealId);
    if (stock) {
        const listed = quoteListedCompany(player, stock);
        if (listed) return listed;
    }
    const rival = (player.ownPlatform?.rivals || []).find(row => row.id === dealId);
    if (rival) return quotePrivateService(player, rival);
    return null;
};

export const equityChequeAvailable = (player: Player): number => {
    const books = player.ownPlatform?.books;
    if (!books || books.equitySoldPct > 0 || player.ownPlatform?.ipo?.stage === 'LISTED') return 0;
    return Math.round(playerCompanyValue(player) * 0.18 * 0.85);
};
