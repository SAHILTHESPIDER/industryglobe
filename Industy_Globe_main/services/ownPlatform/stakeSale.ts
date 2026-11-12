import {
    CompanyShareholder,
    OwnPlatformState,
    Player,
    StakeBuyerKind,
    StakeCondition,
    StakeConditionKind,
    StudioBooks,
} from '../../types';
import { NPC_DATABASE } from '../npcLogic';
import { publicBrandName, publicPersonName } from '../rights/alterName';
import type { IpRecord } from '../rights/catalogue';
import { getAbsoluteWeek } from '../legacyLogic';
import { DEAL_BIDDERS, hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { formatCompact } from './logic';

export const STAKE_SALE_LINE = 'Sell a slice of the company. Buyers make the offers.';
export const STAKE_CHIPS = [5, 10, 15, 25] as const;
const CONTROL_FLOOR = 0.51;
const VETO_USD = 8_000_000;
const MAX_ROUNDS = 2;

const HOUSES = ['Warner Bros.', 'Universal', 'Paramount', 'Sony Pictures', 'Lionsgate', 'A24', 'Blumhouse', 'Working Title'];

const KINDS: StakeBuyerKind[] = ['PRODUCTION', 'ACTOR', 'RIVAL', 'SPORT', 'BUSINESS'];

export type StakeOfferStatus = 'OPEN' | 'REJECTED' | 'WALKED';

export interface StakeOffer {
    id: string;
    buyerId: string;
    name: string;
    kind: StakeBuyerKind;
    /** Fraction of the company being sold. */
    pct: number;
    amount: number;
    rounds: number;
    status: StakeOfferStatus;
    conditions: StakeCondition[];
    note?: string;
}

export type NegotiateMove =
    | { type: 'PRICE'; ask: number }
    | { type: 'DROP'; kind: StakeConditionKind };

export const buyerKindLabel = (kind: StakeBuyerKind): string => {
    if (kind === 'PRODUCTION') return 'Production company';
    if (kind === 'ACTOR') return 'Actor';
    if (kind === 'RIVAL') return 'Streaming platform';
    if (kind === 'SPORT') return 'Sportsperson';
    return 'Businessman';
};

export const capSlices = (player: Player) => {
    const books = player.ownPlatform?.books;
    const ipo = player.ownPlatform?.ipo;
    const seed = clamp01(books?.seedStakePct);
    const legacy = clamp01(books?.equitySoldPct);
    const holders = (books?.shareholders || []).reduce((sum, row) => sum + clamp01(row.pct), 0);
    const listed = ipo?.stage === 'LISTED';
    const pub = listed ? clamp01(1 - (ipo?.founderKeepPct || 0.75)) : 0;
    const founder = Math.max(0, 1 - seed - legacy - holders - pub);
    return { seed, legacy, holders, pub, founder };
};

export interface OwnershipRow {
    id: string;
    label: string;
    kind: string;
    /** Fraction after the rows are scaled so they sum to 1. */
    fraction: number;
    /** Whole points that sum to 100. */
    points: number;
}

/**
 * Cap table for the ownership board.
 * Fractions are scaled so the slices sum to 1, then rounded so the points sum to 100.
 */
export const ownershipRows = (player: Player): OwnershipRow[] => {
    const slices = capSlices(player);
    const books = player.ownPlatform?.books;
    const draft: { id: string; label: string; kind: string; fraction: number }[] = [];
    const push = (id: string, label: string, kind: string, fraction: number) => {
        const safe = clamp01(fraction);
        if (safe <= 0 && id !== 'founder') return;
        draft.push({ id, label: label || 'Owner', kind, fraction: safe });
    };
    push('founder', player.name || 'Founder', 'Founder', slices.founder);
    if (slices.seed > 0) push('seed', books?.seedPartner || 'Seed investors', 'Seed', slices.seed);
    if (slices.legacy > 0) push('equity', books?.pePartner || 'Private equity', 'Private equity', slices.legacy);
    (books?.shareholders || []).forEach(row => push(row.id, row.name, buyerKindLabel(row.kind), row.pct));
    if (slices.pub > 0) push('public', 'Public float', 'Listed', slices.pub);
    const positive = draft.filter(row => row.fraction > 0);
    const founderRow = draft.find(row => row.id === 'founder');
    const withFounder = founderRow && founderRow.fraction <= 0 && positive.length ? [founderRow, ...positive] : positive;
    const rows = withFounder.length ? withFounder : [{ id: 'founder', label: player.name || 'Founder', kind: 'Founder', fraction: 1 }];
    const sum = rows.reduce((total, row) => total + row.fraction, 0) || 1;
    const scaled = rows.map(row => ({ ...row, fraction: row.fraction / sum }));
    const raw = scaled.map(row => row.fraction * 100);
    const points = raw.map(value => Math.floor(value));
    let left = 100 - points.reduce((total, value) => total + value, 0);
    const order = raw
        .map((value, index) => ({ index, frac: value - points[index] }))
        .sort((a, b) => b.frac - a.frac || a.index - b.index);
    for (let step = 0; step < left; step += 1) points[order[step % order.length].index] += 1;
    const drift = 100 - points.reduce((total, value) => total + value, 0);
    if (drift !== 0) {
        const founder = scaled.findIndex(row => row.id === 'founder');
        points[founder >= 0 ? founder : 0] += drift;
    }
    return scaled.map((row, index) => ({ ...row, points: points[index] }));
};

/** Whole percent the player can still sell. Never above 49, never above what they hold. */
export const maxSellPoints = (player: Player): number => {
    const owned = Math.floor(capSlices(player).founder * 100 + 1e-6);
    return Math.max(0, Math.min(49, owned));
};

export const losesControl = (player: Player, pct: number): boolean => {
    const after = capSlices(player).founder - pct;
    return after < CONTROL_FLOOR - 1e-9;
};

export const offerMoneyRange = (valuation: number, pct: number) => {
    const fair = Math.max(0, valuation) * Math.max(0, pct);
    return {
        fair: Math.round(fair),
        low: roundMoney(fair * 0.72),
        high: roundMoney(fair * 1.24),
    };
};

export const impliedValuation = (amount: number, pct: number): number => {
    if (pct <= 0) return 0;
    return Math.round(amount / pct);
};

const clamp01 = (value: unknown): number => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
};

const roundMoney = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.max(1000, Math.round(value / 1000) * 1000);
};

const describe = (condition: StakeCondition): StakeCondition => {
    if (condition.kind === 'PROFIT_SHARE') {
        const shown = Math.max(1, Math.min(40, Math.round((condition.profitShareOfProfit || 0.04) * 100)));
        return {
            ...condition,
            profitShareOfProfit: shown / 100,
            label: `${shown}% of weekly profit`,
            effect: 'That share of company profit leaves company cash each week the company is in the black.',
        };
    }
    if (condition.kind === 'LOCK_IN') {
        const weeks = Math.max(4, Math.min(52, Math.round(condition.lockWeeks || 16)));
        return {
            ...condition,
            lockWeeks: weeks,
            label: `${weeks}-week lock-in`,
            effect: 'This block of shares cannot be sold again until the lock-in ends.',
        };
    }
    if (condition.kind === 'CONTENT_VETO') {
        const above = Math.max(1_000_000, Math.round(condition.vetoAboveUsd || VETO_USD));
        return {
            ...condition,
            vetoAboveUsd: above,
            label: 'Veto on big content buys',
            effect: `They can block a licence or commission over ${formatCompact(above)}. The buy does not go through.`,
        };
    }
    if (condition.kind === 'FIRST_LOOK') {
        const discount = Math.max(0.03, Math.min(0.2, condition.discountPct || 0.08));
        const shown = Math.round(discount * 100);
        return {
            ...condition,
            discountPct: shown / 100,
            label: 'First-look deal',
            effect: `Licences you add to the shelf cost ${shown}% less. Their house is first in line.`,
        };
    }
    if (condition.kind === 'BOARD_SEAT') {
        return {
            ...condition,
            kind: 'BOARD_SEAT',
            label: 'A board seat',
            effect: 'Their name sits on the company board, and they vote if you take the company public.',
        };
    }
    if (condition.kind === 'ROLE_GUARANTEE') {
        const who = condition.roleLabel || 'a cameo';
        return {
            ...condition,
            roleLabel: 'Cameo',
            label: condition.label || `A guaranteed ${who.toLowerCase()}`,
            effect: 'You owe them a cameo. It stays on the books until you cast them.',
        };
    }
    return {
        ...condition,
        kind: 'SPORTS_DEAL',
        label: 'Sports-content deal',
        effect: condition.effect || 'Sports viewing gets a weekly bump while they hold the stake.',
    };
};

const veto = (): StakeCondition => describe({ kind: 'CONTENT_VETO', label: '', effect: '', vetoAboveUsd: VETO_USD });
const board = (): StakeCondition => describe({ kind: 'BOARD_SEAT', label: '', effect: '' });
const lock = (weeks: number): StakeCondition => describe({ kind: 'LOCK_IN', label: '', effect: '', lockWeeks: weeks });
const profit = (fraction: number): StakeCondition => describe({ kind: 'PROFIT_SHARE', label: '', effect: '', profitShareOfProfit: fraction });
const firstLook = (): StakeCondition => describe({ kind: 'FIRST_LOOK', label: '', effect: '', discountPct: 0.08 });
const role = (name: string): StakeCondition => describe({
    kind: 'ROLE_GUARANTEE',
    label: `A guaranteed cameo for ${name}`,
    effect: '',
    roleLabel: 'Cameo',
});
const sportsDeal = (name: string): StakeCondition => describe({
    kind: 'SPORTS_DEAL',
    label: 'Sports-content deal',
    effect: `${name} brings a weekly bump in sports viewing while they hold the stake.`,
});

const conditionsFor = (kind: StakeBuyerKind, name: string, roll: number): StakeCondition[] => {
    if (kind === 'RIVAL') {
        const rows = [veto(), lock(18 + (roll % 14))];
        if (roll % 2 === 0) rows.push(profit(0.05));
        return rows.slice(0, 1 + (roll % 3));
    }
    if (kind === 'ACTOR') {
        const rows = [role(name)];
        if (roll % 2 === 0) rows.push(lock(12 + (roll % 8)));
        if (roll % 3 === 0) rows.push(profit(0.03));
        return rows.slice(0, 1 + (roll % 3));
    }
    if (kind === 'SPORT') {
        const rows = [sportsDeal(name)];
        if (roll % 2 === 0) rows.push(lock(10 + (roll % 10)));
        if (roll % 3 === 1) rows.push(profit(0.02));
        return rows.slice(0, 1 + (roll % 3));
    }
    if (kind === 'BUSINESS') {
        const rows = [board(), profit(0.04 + (roll % 5) / 100)];
        if (roll % 3 === 0) rows.push(lock(20 + (roll % 8)));
        return rows;
    }
    const rows = [firstLook()];
    if (roll % 2 === 0) rows.push(board());
    if (roll % 3 === 0) rows.push(lock(12 + (roll % 10)));
    return rows.slice(0, 3);
};

const priceMultiple = (kind: StakeBuyerKind, roll: number): number => {
    const step = (roll % 12) / 100;
    if (kind === 'RIVAL') return 1.08 + step;
    if (kind === 'BUSINESS') return 0.92 + (roll % 10) / 100;
    if (kind === 'PRODUCTION') return 0.84 + (roll % 10) / 100;
    if (kind === 'SPORT') return 0.8 + (roll % 12) / 100;
    return 0.72 + (roll % 14) / 100;
};

interface BuyerSeed {
    id: string;
    name: string;
}

const actorPool = (): BuyerSeed[] => NPC_DATABASE
    .filter(npc => npc.occupation === 'ACTOR' && npc.name && (npc.netWorth || 0) >= 5_000_000)
    .map(npc => ({ id: `actor:${npc.id}`, name: publicPersonName(npc.name, true) }))
    .filter(row => row.name)
    .sort((a, b) => a.name.localeCompare(b.name));

const housePool = (): BuyerSeed[] => HOUSES.map(name => ({
    id: `house:${name}`,
    name: publicBrandName(name),
}));

const rivalPool = (player: Player): BuyerSeed[] => {
    const rivals = (player.ownPlatform?.rivals || [])
        .filter(row => row.status === 'ACTIVE' && row.name)
        .map(row => ({ id: `rival:${row.id}`, name: publicBrandName(row.name) }));
    if (rivals.length) return rivals.sort((a, b) => a.name.localeCompare(b.name));
    return DEAL_BIDDERS.map(row => ({ id: `bidder:${row.id}`, name: publicBrandName(row.name) }));
};

const lifePool = (records: IpRecord[] | undefined, category: string): BuyerSeed[] => (records || [])
    .filter(row => row.kind === 'LIFE' && row.living && row.category === category && row.proper)
    .sort((a, b) => (b.fame || 0) - (a.fame || 0) || a.proper.localeCompare(b.proper))
    .map(row => ({ id: `life:${row.id}`, name: row.proper }));

const poolFor = (kind: StakeBuyerKind, player: Player, records: IpRecord[] | undefined): BuyerSeed[] => {
    if (kind === 'PRODUCTION') return housePool();
    if (kind === 'ACTOR') return actorPool();
    if (kind === 'RIVAL') return rivalPool(player);
    if (kind === 'SPORT') return lifePool(records, 'athlete');
    return lifePool(records, 'ceo');
};

const takeBuyer = (rows: BuyerSeed[], roll: number, used: Set<string>): BuyerSeed | null => {
    if (!rows.length) return null;
    const start = roll % rows.length;
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[(start + index) % rows.length];
        if (used.has(row.id)) continue;
        used.add(row.id);
        return row;
    }
    return null;
};

const makeOffer = (
    player: Player,
    kind: StakeBuyerKind,
    pct: number,
    valuation: number,
    buyer: BuyerSeed,
    roll: number,
): StakeOffer => {
    const amount = roundMoney(valuation * pct * priceMultiple(kind, roll));
    return {
        id: `offer_${kind}_${buyer.id}_${roll % 997}`,
        buyerId: buyer.id,
        name: buyer.name,
        kind,
        pct,
        amount,
        rounds: 0,
        status: 'OPEN',
        conditions: conditionsFor(kind, buyer.name, roll),
    };
};

/**
 * Three to five bids, each from a different buyer type when the pools allow it.
 * People and brands already altered in the rights files are used as stored.
 * NPC names and live brands go through alterName.
 */
export const buildStakeOffers = (
    player: Player,
    pct: number,
    salt: number,
    valuation: number,
    records?: IpRecord[],
): StakeOffer[] => {
    const safePct = Math.round(Math.max(0.01, Math.min(0.49, pct)) * 100) / 100;
    const owned = capSlices(player).founder;
    const slice = Math.min(safePct, Math.max(0.01, Math.floor(owned * 100) / 100));
    const key = `${player.id}:${player.currentWeek}:${slice}:${salt}`;
    const roll = hashString(key);
    const count = 3 + (roll % 3);
    const order = [...KINDS].sort((a, b) => hashString(`${key}:${a}`) - hashString(`${key}:${b}`));
    const used = new Set<string>((player.ownPlatform?.books?.shareholders || []).map(row => row.buyerId));
    const offers: StakeOffer[] = [];
    const tryKind = (kind: StakeBuyerKind): StakeOffer | null => {
        const kindRoll = hashString(`${key}:${kind}:${offers.length}`);
        const buyer = takeBuyer(poolFor(kind, player, records), kindRoll, used);
        if (!buyer) return null;
        return makeOffer(player, kind, slice, Math.max(1, valuation), buyer, kindRoll);
    };
    order.slice(0, count).forEach(kind => {
        const offer = tryKind(kind);
        if (offer) offers.push(offer);
    });
    for (const kind of order) {
        if (offers.length >= count) break;
        if (offers.some(row => row.kind === kind)) continue;
        const offer = tryKind(kind);
        if (offer) offers.push(offer);
    }
    while (offers.length < 3) {
        const offer = tryKind('ACTOR') || tryKind('BUSINESS') || tryKind('PRODUCTION') || tryKind('RIVAL') || tryKind('SPORT');
        if (!offer) break;
        offers.push(offer);
    }
    return offers.slice(0, Math.max(count, Math.min(5, offers.length)));
};

const withNote = (offer: StakeOffer, note: string, patch: Partial<StakeOffer> = {}): StakeOffer => ({
    ...offer,
    ...patch,
    conditions: patch.conditions || offer.conditions,
    note,
});

const soften = (condition: StakeCondition): StakeCondition => {
    if (condition.kind === 'PROFIT_SHARE') return describe({ ...condition, profitShareOfProfit: (condition.profitShareOfProfit || 0.04) / 2 });
    if (condition.kind === 'LOCK_IN') return describe({ ...condition, lockWeeks: Math.round((condition.lockWeeks || 16) / 2) });
    if (condition.kind === 'CONTENT_VETO') return describe({ ...condition, vetoAboveUsd: Math.round((condition.vetoAboveUsd || VETO_USD) * 1.75) });
    if (condition.kind === 'FIRST_LOOK') return describe({ ...condition, discountPct: (condition.discountPct || 0.08) / 2 });
    return condition;
};

/** One round of talks. The buyer can take the ask, meet halfway, or walk. Two rounds max. */
export const negotiateOffer = (offer: StakeOffer, move: NegotiateMove): StakeOffer => {
    if (offer.status !== 'OPEN') return offer;
    if (offer.rounds >= MAX_ROUNDS) {
        return withNote(offer, 'They will not talk again. Accept this offer or reject it.');
    }
    const roll = hashString(`${offer.id}:${offer.rounds}:${move.type}:${move.type === 'PRICE' ? move.ask : move.kind}`);
    if (move.type === 'PRICE') {
        const ask = roundMoney(move.ask);
        if (ask <= offer.amount) {
            return withNote(offer, 'That is not higher than their bid. Ask for more, or answer the offer as it stands.');
        }
        const lift = (ask - offer.amount) / offer.amount;
        const nextRound = offer.rounds + 1;
        if (lift <= 0.08) {
            return withNote(offer, `They agreed to ${formatCompact(ask)}.`, { amount: ask, rounds: nextRound });
        }
        if (lift <= 0.2 || (offer.rounds === 0 && lift <= 0.35 && roll % 5 !== 0)) {
            const mid = roundMoney((offer.amount + ask) / 2);
            return withNote(offer, `They met you halfway at ${formatCompact(mid)}.`, { amount: mid, rounds: nextRound });
        }
        return withNote(offer, 'They walked away from the offer.', { status: 'WALKED', rounds: nextRound });
    }
    const index = offer.conditions.findIndex(row => row.kind === move.kind);
    if (index < 0) return withNote(offer, 'That condition is not on this offer.');
    const nextRound = offer.rounds + 1;
    const clause = offer.conditions[index];
    if (roll % 5 === 0) {
        return withNote(offer, `They walked away rather than drop ${clause.label.toLowerCase()}.`, { status: 'WALKED', rounds: nextRound });
    }
    if (roll % 2 === 0) {
        const conditions = offer.conditions.filter(row => row.kind !== move.kind);
        const amount = roundMoney(offer.amount * 0.96);
        return withNote(offer, `They dropped ${clause.label.toLowerCase()}. The price is now ${formatCompact(amount)}.`, {
            conditions,
            amount,
            rounds: nextRound,
        });
    }
    const binary = clause.kind === 'BOARD_SEAT' || clause.kind === 'ROLE_GUARANTEE' || clause.kind === 'SPORTS_DEAL';
    if (binary) {
        const amount = roundMoney(offer.amount * 1.04);
        return withNote(offer, `They kept ${clause.label.toLowerCase()} and met you halfway by raising the price to ${formatCompact(amount)}.`, {
            amount,
            rounds: nextRound,
        });
    }
    const conditions = offer.conditions.map((row, rowIndex) => rowIndex === index ? soften(row) : row);
    return withNote(offer, `They met you halfway. ${conditions[index].label} is lighter, and the price stays ${formatCompact(offer.amount)}.`, {
        conditions,
        rounds: nextRound,
    });
};

export const rejectOffer = (offer: StakeOffer): StakeOffer => (
    offer.status === 'OPEN' ? { ...offer, status: 'REJECTED', note: 'You turned this buyer down.' } : offer
);

const log = (player: Player, message: string) => {
    player.logs = [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type: 'neutral' }];
};

export const acceptStakeOffer = (player: Player, offer: StakeOffer): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'Open the company before you sell a stake.' };
    if (offer.status !== 'OPEN') return { player, error: 'That offer is no longer open.' };
    if (!offer.name || offer.amount <= 0 || offer.pct <= 0) return { player, error: 'That offer is incomplete.' };
    if (offer.pct > 0.49 + 0.001) return { player, error: 'You cannot sell more than 49% in one sale.' };
    const founder = capSlices(player).founder;
    if (offer.pct - founder > 0.001) return { player, error: 'You do not own that much of the company.' };
    const books = state.books;
    if (!books) return { player, error: 'The company books are not open.' };
    const pct = Math.round(offer.pct * 100) / 100;
    const next: Player = {
        ...player,
        money: player.money,
        logs: [...(player.logs || [])],
        ownPlatform: {
            ...state,
            books: {
                ...books,
                lines: [...(books.lines || [])],
                history: [...(books.history || [])],
                shareholders: [...(books.shareholders || [])],
            },
        },
    };
    const nextBooks = next.ownPlatform!.books!;
    const lockWeeks = offer.conditions.reduce((longest, row) => (
        row.kind === 'LOCK_IN' ? Math.max(longest, row.lockWeeks || 0) : longest
    ), 0);
    const holder: CompanyShareholder = {
        id: `sh_${next.currentWeek}_${offer.buyerId}_${nextBooks.shareholders!.length}`,
        buyerId: offer.buyerId,
        name: offer.name,
        kind: offer.kind,
        pct,
        paid: offer.amount,
        week: next.currentWeek,
        year: next.age,
        lockUntilAbsolute: lockWeeks > 0 ? getAbsoluteWeek(next.age, next.currentWeek) + lockWeeks : undefined,
        conditions: offer.conditions.map(row => ({ ...row })),
    };
    nextBooks.shareholders = [...(nextBooks.shareholders || []), holder];
    if (nextBooks.funding === 'OWN') nextBooks.funding = 'EQUITY';
    const label = `Stake sale to ${offer.name}`;
    addCompanyCash(next, offer.amount, label, 'EQUITY');
    log(next, `${offer.name} bought ${Math.round(pct * 100)}% of ${state.name} for ${formatCompact(offer.amount)}. The cheque is company cash. Your personal cash did not move.`);
    return { player: next };
};

export const lockWeeksLeft = (player: Player, holder: CompanyShareholder): number => {
    if (!holder.lockUntilAbsolute) return 0;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return Math.max(0, holder.lockUntilAbsolute - now);
};

export const contentVeto = (player: Player, spend: number): string | null => {
    if (!Number.isFinite(spend) || spend <= 0) return null;
    const holders = player.ownPlatform?.books?.shareholders || [];
    for (const holder of holders) {
        for (const condition of holder.conditions || []) {
            if (condition.kind !== 'CONTENT_VETO') continue;
            const above = condition.vetoAboveUsd || VETO_USD;
            if (spend >= above) {
                return `${holder.name} vetoed this buy. Their stake lets them block content spends of ${formatCompact(above)} or more.`;
            }
        }
    }
    return null;
};

export const firstLookDiscount = (player: Player): { name: string; rate: number } | null => {
    let best: { name: string; rate: number } | null = null;
    (player.ownPlatform?.books?.shareholders || []).forEach(holder => {
        (holder.conditions || []).forEach(condition => {
            if (condition.kind !== 'FIRST_LOOK') return;
            const rate = condition.discountPct || 0.08;
            if (!best || rate > best.rate) best = { name: holder.name, rate };
        });
    });
    return best;
};

export const sportsViewerBump = (state: OwnPlatformState | undefined): number => {
    if (!state || state.stage !== 'LIVE') return 0;
    const deals = (state.books?.shareholders || []).filter(holder => holder.conditions?.some(row => row.kind === 'SPORTS_DEAL')).length;
    if (!deals) return 0;
    return 4000 * deals;
};

export const stakeBoardSeats = (player: Player): { name: string; role: string }[] => (
    (player.ownPlatform?.books?.shareholders || [])
        .filter(holder => holder.conditions?.some(row => row.kind === 'BOARD_SEAT'))
        .map(holder => ({ name: holder.name, role: 'Board seat' }))
);

export const stakeProfitCuts = (books: StudioBooks | undefined, revenue: number, burn: number): { name: string; cut: number }[] => {
    if (!books || revenue <= burn) return [];
    const profit = revenue - burn;
    const cuts: { name: string; cut: number }[] = [];
    (books.shareholders || []).forEach(holder => {
        (holder.conditions || []).forEach(condition => {
            if (condition.kind !== 'PROFIT_SHARE') return;
            const rate = condition.profitShareOfProfit || 0;
            const cut = Math.round(profit * rate);
            if (cut > 0) cuts.push({ name: holder.name, cut });
        });
    });
    return cuts;
};

export const obligationLines = (player: Player, cuts: { name: string; cut: number }[] = []): string[] => {
    const state = player.ownPlatform;
    const holders = state?.books?.shareholders || [];
    const lines: string[] = [];
    cuts.forEach(row => lines.push(`${row.name} took ${formatCompact(row.cut)} of company profit`));
    holders.forEach(holder => {
        const locked = lockWeeksLeft(player, holder);
        if (locked > 0) lines.push(`${holder.name}'s ${Math.round(holder.pct * 100)}% is locked for ${locked} more weeks and cannot be sold`);
        (holder.conditions || []).forEach(condition => {
            if (condition.kind === 'ROLE_GUARANTEE' && !condition.fulfilled) {
                lines.push(`You still owe ${holder.name} a cameo`);
            }
            if (condition.kind === 'CONTENT_VETO') {
                lines.push(`${holder.name} can veto a content buy over ${formatCompact(condition.vetoAboveUsd || VETO_USD)}`);
            }
            if (condition.kind === 'BOARD_SEAT') lines.push(`${holder.name} holds a board seat`);
            if (condition.kind === 'FIRST_LOOK') lines.push(`First-look with ${holder.name} is on, so new licences cost less`);
            if (condition.kind === 'SPORTS_DEAL') {
                lines.push(state?.stage === 'LIVE'
                    ? `${holder.name}'s sports deal brought more viewers`
                    : `${holder.name}'s sports deal waits until the service is live`);
            }
        });
    });
    return lines;
};

export const stakeObligationNote = (
    player: Player,
    cuts: { name: string; cut: number }[],
): { msg: string; type: 'positive' | 'negative' | 'neutral' } | null => {
    const lines = obligationLines(player, cuts);
    if (!lines.length) return null;
    const upbeat = cuts.length > 0 || lines.some(line => line.includes('more viewers'));
    return { msg: `Obligations: ${lines.join(' · ')}.`, type: upbeat ? 'positive' : 'neutral' };
};

/** Clears a promised cameo. Personal cash is not touched. */
export const castCameo = (player: Player, holderId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    const holders = state?.books?.shareholders || [];
    const holder = holders.find(row => row.id === holderId);
    if (!state || !holder) return { player, error: 'That shareholder is not on the cap table.' };
    const owed = holder.conditions?.find(row => row.kind === 'ROLE_GUARANTEE' && !row.fulfilled);
    if (!owed) return { player, error: 'You do not owe that buyer a role.' };
    const next: Player = {
        ...player,
        money: player.money,
        logs: [...(player.logs || [])],
        ownPlatform: {
            ...state,
            subscribers: state.subscribers,
            books: {
                ...state.books!,
                lines: [...(state.books?.lines || [])],
                history: [...(state.books?.history || [])],
                shareholders: holders.map(row => row.id === holderId ? {
                    ...row,
                    conditions: row.conditions.map(condition => (
                        condition.kind === 'ROLE_GUARANTEE' ? { ...condition, fulfilled: true } : { ...condition }
                    )),
                } : row),
            },
        },
    };
    if (next.ownPlatform!.stage === 'LIVE') {
        next.ownPlatform!.subscribers += 6000;
    }
    log(next, `You cast ${holder.name} in the cameo their stake required. The obligation is cleared.`);
    return { player: next };
};

const CONDITION_KINDS: StakeConditionKind[] = [
    'BOARD_SEAT', 'CONTENT_VETO', 'ROLE_GUARANTEE', 'SPORTS_DEAL', 'PROFIT_SHARE', 'LOCK_IN', 'FIRST_LOOK',
];
const BUYER_KINDS: StakeBuyerKind[] = ['PRODUCTION', 'ACTOR', 'RIVAL', 'SPORT', 'BUSINESS'];

const sanitizeCondition = (raw: StakeCondition | undefined): StakeCondition | null => {
    if (!raw || !CONDITION_KINDS.includes(raw.kind)) return null;
    const condition = describe({
        ...raw,
        kind: raw.kind,
        label: typeof raw.label === 'string' ? raw.label : '',
        effect: typeof raw.effect === 'string' ? raw.effect : '',
        fulfilled: raw.fulfilled === true ? true : undefined,
    });
    if (raw.kind === 'ROLE_GUARANTEE' && typeof raw.label === 'string' && raw.label.trim()) {
        condition.label = raw.label.slice(0, 120);
    }
    if (raw.kind === 'SPORTS_DEAL' && typeof raw.effect === 'string' && raw.effect.trim()) {
        condition.effect = raw.effect.slice(0, 220);
    }
    return condition;
};

/** Fills optional stake fields. Legacy equitySoldPct and pePartner are left untouched. */
export const sanitizeShareholders = (raw: unknown): CompanyShareholder[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const rows: CompanyShareholder[] = [];
    raw.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const row = item as CompanyShareholder;
        if (!BUYER_KINDS.includes(row.kind)) return;
        const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : '';
        const pct = clamp01(row.pct);
        if (!name || pct <= 0) return;
        const conditions = (Array.isArray(row.conditions) ? row.conditions : [])
            .map(condition => sanitizeCondition(condition))
            .filter((condition): condition is StakeCondition => Boolean(condition))
            .slice(0, 4);
        const lockUntil = Number(row.lockUntilAbsolute);
        rows.push({
            id: typeof row.id === 'string' && row.id.trim() ? row.id.slice(0, 80) : `sh_${rows.length}_${name}`,
            buyerId: typeof row.buyerId === 'string' && row.buyerId.trim() ? row.buyerId.slice(0, 80) : `buyer:${name}`,
            name,
            kind: row.kind,
            pct: Math.min(0.49, Math.round(pct * 1000) / 1000),
            paid: Math.max(0, Math.round(Number(row.paid) || 0)),
            week: Math.max(0, Math.round(Number(row.week) || 0)),
            year: Math.max(0, Math.round(Number(row.year) || 0)),
            lockUntilAbsolute: Number.isFinite(lockUntil) ? Math.round(lockUntil) : undefined,
            conditions,
        });
    });
    return rows.length ? rows.slice(0, 12) : undefined;
};
