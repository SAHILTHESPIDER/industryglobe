import {
    FundingChoice,
    IpoDisclosure,
    IpoState,
    IpoVote,
    OwnedStreamer,
    PlatformLedgerLine,
    Player,
    ReleaseCalendarEntry,
    ReleaseSlot,
    Stock,
    StudioBooks,
} from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { calculateWeeklyLoanPayment, issueLoan } from '../loanLogic';
import { MARKET_COUNTRIES, hashString } from './catalog';
import { formatCompact, quoteLaunch } from './logic';
import { BuyFinancing, equityChequeAvailable, quoteAcquisition, quoteListedCompany, quotePrivateService } from './valuation';
import { clampReleaseOffset, releaseWeekLabel, releaseWeekParts, RELEASE_HORIZON } from './weeks';

const FACILITY_USD = 4_000_000;
const FACILITY_RATE = 0.09;
const PE_STAKE = 0.18;
const PE_NAME = 'Kestrel Long Fund';

export interface CommissionOrder {
    id: string;
    studio: string;
    color: string;
    title: string;
    genre: string;
    kind: string;
    fee: number;
    cap: number;
    minRating: number;
    weeks: number;
    blurb: string;
}

export interface PlatformDeal {
    id: string;
    name: string;
    price: number;
    householdsM: number;
    note: string;
    stockId?: string;
    rivalId?: string;
}

const DISCLOSURES: IpoDisclosure[] = [
    {
        id: 'sprint',
        title: 'Technical debt carried from sprint-built work',
        body: 'Parts of the platform were built fast and have not been finished property.',
        choice: null,
    },
    {
        id: 'licences',
        title: 'Licences expiring within twelve months',
        body: 'A material share of the catalogue is licensed rather than owned, and some windows close soon.',
        choice: null,
    },
    {
        id: 'control',
        title: 'The founder controls the vote',
        body: 'Outside shareholders will have no practical ability to steer the company.',
        choice: null,
    },
];

const BOARD: { name: string; role: string }[] = [
    { name: 'You', role: 'Founder' },
    { name: 'Marta Oyelaran', role: 'Executive' },
    { name: 'Dinah Ayre', role: 'Chief financial officer' },
    { name: 'Helena Brandt', role: 'Independent' },
    { name: 'Sir Alan Wray', role: 'Independent' },
    { name: 'Yusuf Karim', role: 'Investor' },
    { name: 'Nomi Reisz', role: 'Independent' },
    { name: 'Peter Lund', role: 'General counsel' },
];

const HOUSES = ['Warner Bros.', 'Universal', 'Paramount', 'A24', 'Marvel Studios', 'Blumhouse', 'Nordisk', 'Toho'];
const RIVAL_TITLES = [
    'Glass Harbor', 'Kid Mercury', 'Small Mercies', 'Night Market', 'Red Lanterns', 'The Quiet Mile', 'Paper Saints', 'Salt Choir',
    'Blue Meridian', 'The Last Tram', 'Copper Birds', 'Hotel Silence', 'North of Ordinary', 'Velvet Circuit', 'King of Small Things', 'Low Tide Radio', 'Marigold Office', 'The Borrowed Coat',
];

export const emptyBooks = (): StudioBooks => ({
    funding: 'OWN',
    debt: 0,
    equitySoldPct: 0,
    facilityRate: FACILITY_RATE,
    pePartner: PE_NAME,
    history: [],
    lines: [],
});

export const emptyIpo = (name: string): IpoState => ({
    stage: 'IDLE',
    valuation: 0,
    sharesForSale: 500_000,
    price: 12,
    floor: 10,
    cap: 16,
    founderKeepPct: 0.75,
    staffReservePct: 0.02,
    disclosures: DISCLOSURES.map(row => ({ ...row })),
    votes: [],
    anchorName: PE_NAME,
    anchorPct: 0,
    anchorWalked: false,
    bookMultiple: 0,
    bookDay: 0,
    openPrice: 0,
    lastPrice: 0,
    dayMove: [],
    ticker: tickerFrom(name),
});

export const defaultReleaseSlot = (player: Player): ReleaseSlot => {
    const countryId = player.ownPlatform?.selectedCountryIds[0] || 'US';
    const country = MARKET_COUNTRIES.find(row => row.id === countryId);
    return {
        title: player.ownPlatform?.pendingDeal?.title || player.ownPlatform?.name || 'Opening night',
        house: player.ownPlatform?.name || 'Empire+',
        countryId,
        language: country?.languages[0]?.name || 'English',
        weekOffset: 4,
    };
};

const tickerFrom = (name: string) => {
    const letters = name.replace(/[^a-z]/gi, '').toUpperCase();
    return (letters.slice(0, 3) || 'EMP').padEnd(3, 'P');
};

const pushMoney = (player: Player, amount: number, description: string) => {
    const safe = Math.trunc(amount);
    if (!safe) return;
    player.money = (Number.isFinite(player.money) ? player.money : 0) + safe;
    if (!player.finance) return;
    if (!Array.isArray(player.finance.history)) player.finance.history = [];
    player.finance.history.unshift({
        id: `tx_books_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        week: player.currentWeek,
        year: player.age,
        amount: safe,
        category: 'BUSINESS',
        description,
    });
    if (player.finance.history.length > 200) player.finance.history.pop();
};

const pushLine = (books: StudioBooks, player: Player, amount: number, label: string, source: PlatformLedgerLine['source']) => {
    books.lines.unshift({
        id: `line_${player.currentWeek}_${books.lines.length}_${source}`,
        week: player.currentWeek,
        year: player.age,
        amount: Math.trunc(amount),
        label,
        source,
    });
    if (books.lines.length > 40) books.lines.pop();
};

const log = (player: Player, message: string) => {
    player.logs = [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type: 'neutral' }];
};

export const quoteValuation = (player: Player): number => {
    const state = player.ownPlatform;
    if (!state) return 6_000_000;
    const quote = quoteLaunch(player);
    const homes = Math.max(state.subscribers, quote.households * 0.15);
    const titles = state.catalogue.length * 1_400_000 + state.closedDeals.length * 900_000;
    const acquired = (state.ownedStreamers || []).reduce((sum, row) => sum + row.householdsM * 800_000, 0);
    const live = state.stage === 'LIVE' ? 4_000_000 : state.commissioned ? 1_500_000 : 0;
    return Math.round(6_000_000 + homes * 35 + titles + acquired + live);
};

export const fairSharePrice = (player: Player): number => {
    const valuation = quoteValuation(player);
    const keep = player.ownPlatform?.ipo?.founderKeepPct ?? 0.75;
    const forSale = player.ownPlatform?.ipo?.sharesForSale || 500_000;
    const outstanding = forSale / Math.max(0.05, 1 - keep);
    return Math.max(4, Math.round((valuation / outstanding) * 100) / 100);
};

export const platformDealForStock = (player: Player, stock: Stock): PlatformDeal | null => {
    const quote = quoteListedCompany(player, stock);
    if (!quote) return null;
    const owned = (player.ownPlatform?.ownedStreamers || []).some(item => item.fromStockId === stock.id || item.name === quote.name);
    if (owned) return null;
    return {
        id: stock.id,
        stockId: stock.id,
        name: quote.name,
        price: quote.equityCheque,
        householdsM: quote.subscribersM || stock.platformHouseholdsM || 1,
        note: 'Listed company. The cheque is equity value plus a control premium. Net debt is assumed.',
    };
};

export const listPlatformDeals = (player: Player): PlatformDeal[] => {
    const fromStocks = (player.stocks || [])
        .map(stock => platformDealForStock(player, stock))
        .filter((row): row is PlatformDeal => Boolean(row));
    const taken = new Set(fromStocks.map(row => row.name.toLowerCase()));
    const rivals = (player.ownPlatform?.rivals || [])
        .filter(rival => rival.status === 'ACTIVE' && !taken.has(rival.name.toLowerCase()))
        .flatMap((rival): PlatformDeal[] => {
            const quote = quotePrivateService(player, rival);
            if (!quote) return [];
            return [{
                id: rival.id,
                rivalId: rival.id,
                name: rival.name,
                price: quote.equityCheque,
                householdsM: rival.householdsM,
                note: `${rival.tier.toLowerCase()} service · valued from revenue, subscribers, library, and debt`,
            }];
        })
        .sort((a, b) => a.price - b.price);
    return [...fromStocks, ...rivals];
};

export const purchasePlatform = (player: Player, dealId: string, financing?: BuyFinancing): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ before you buy another service.' };
    if (!financing) return { player, error: 'Open the valuation and show how the cheque gets paid.' };
    const quote = quoteAcquisition(player, dealId);
    if (!quote) return { player, error: 'That service is not for sale.' };
    const already = (player.ownPlatform.ownedStreamers || []).some(item => item.fromStockId === dealId || item.id === `own_${dealId}`);
    if (already) return { player, error: 'You already own that service.' };
    if (!quote.regulator.ok) return { player, error: quote.regulator.reason };
    if (!quote.board.ok) return { player, error: 'The board voted the purchase down. The cheque never left.' };
    const cash = Math.max(0, Math.floor(Number(financing.cash) || 0));
    const loanAmount = Math.max(0, Math.floor(Number(financing.loan) || 0));
    const equityCash = financing.equity ? equityChequeAvailable(player) : 0;
    if (financing.equity && equityCash <= 0) return { player, error: 'Outside owners are already on the cap table.' };
    if (cash > player.money) return { player, error: 'That cash is not in the treasury.' };
    const covered = cash + loanAmount + equityCash;
    if (covered < quote.equityCheque) {
        return { player, error: `The cheque is ${formatCompact(quote.equityCheque)}. Cash, the loan, and any equity cover ${formatCompact(covered)}.` };
    }
    let funded = player;
    if (financing.equity) {
        const sold = chooseFunding(funded, 'EQUITY');
        if (sold.error) return sold;
        funded = sold.player;
    }
    if (loanAmount > 0) {
        const lent = issueLoan(funded, loanAmount, 260, 'EMPIRE');
        if (lent.error) return { player, error: lent.error };
        funded = lent.player;
    }
    if (funded.money < quote.equityCheque) return { player, error: `You are short ${formatCompact(quote.equityCheque - funded.money)} after financing.` };
    const deal = listPlatformDeals(funded).find(row => row.id === dealId) || {
        id: dealId,
        name: quote.name,
        price: quote.equityCheque,
        householdsM: quote.subscribersM,
        stockId: quote.kind === 'LISTED' ? dealId : undefined,
        rivalId: quote.kind === 'PRIVATE' ? dealId : undefined,
        note: quote.note,
    };
    const source = funded.ownPlatform;
    if (!source) return { player, error: 'Open Empire+ before you buy another service.' };
    const next: Player = {
        ...funded,
        logs: [...(funded.logs || [])],
        finance: {
            ...funded.finance,
            loans: [...(funded.finance?.loans || [])],
            history: [...(funded.finance?.history || [])],
        },
        portfolio: funded.portfolio,
        stocks: funded.stocks,
        ownPlatform: {
            ...source,
            books: source.books ? { ...source.books, lines: [...source.books.lines] } : emptyBooks(),
            ownedStreamers: [...(source.ownedStreamers || [])],
            rivals: source.rivals.map(rival => ({ ...rival, languages: [...rival.languages] })),
        },
    };
    const state = next.ownPlatform!;
    const price = quote.equityCheque;
    const owned: OwnedStreamer = {
        id: `own_${deal.id}`,
        name: deal.name,
        pricePaid: price,
        householdsM: deal.householdsM,
        week: next.currentWeek,
        fromStockId: deal.stockId,
    };
    state.ownedStreamers = [...(state.ownedStreamers || []), owned];
    if (deal.rivalId) {
        state.rivals = state.rivals.map(rival => rival.id === deal.rivalId
            ? { ...rival, status: 'ACQUIRED' as const, householdsM: 0, note: `Bought by ${state.name}. The debt came too.` }
            : rival);
    }
    if (state.stage === 'LIVE') {
        state.subscribers += Math.round(Math.min(deal.householdsM, 20) * 1_000_000 * 0.02);
    }
    pushMoney(next, -price, `Acquired ${deal.name}`);
    pushLine(state.books!, next, -price, `Bought ${deal.name}`, 'ACQUISITION');
    if (quote.assumedDebt > 0 && next.finance) {
        const termWeeks = 260;
        const rate = 0.07;
        const assumed = {
            id: `loan_assumed_${deal.id}_${next.currentWeek}`,
            lenderName: `${deal.name} assumed debt`,
            lenderId: 'assumed',
            principal: quote.assumedDebt,
            originalPrincipal: quote.assumedDebt,
            annualInterestRate: rate,
            weeklyPayment: calculateWeeklyLoanPayment(quote.assumedDebt, rate, termWeeks),
            termWeeks,
            weeksRemaining: termWeeks,
            takenWeek: next.currentWeek,
            takenYear: next.age,
            takenAbsoluteWeek: getAbsoluteWeek(next.age, next.currentWeek),
            missedPayments: 0,
            successfulPayments: 0,
            status: 'ACTIVE' as const,
            borrower: 'EMPIRE' as const,
        };
        next.finance.loans = [...next.finance.loans, assumed];
        pushLine(state.books!, next, 0, `Assumed ${formatCompact(quote.assumedDebt)} of ${deal.name} debt`, 'DEBT');
    }
    log(next, `Bought ${deal.name} for ${formatCompact(price)}. Assumed debt ${formatCompact(quote.assumedDebt)}.`);
    return { player: next };
};

export const chooseFunding = (player: Player, choice: FundingChoice): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open the launch first.' };
    const state = player.ownPlatform;
    const books = state.books || emptyBooks();
    if (choice === 'BANK' && books.debt > 0) return { player, error: 'The facility is already drawn.' };
    if (choice === 'EQUITY' && (books.equitySoldPct > 0 || state.ipo?.stage === 'LISTED')) {
        return { player, error: 'Outside owners are already on the cap table.' };
    }
    const next: Player = {
        ...player,
        logs: player.logs,
        finance: player.finance,
        ownPlatform: { ...state, books: { ...books, lines: [...books.lines], history: [...books.history] } },
    };
    const nextBooks = next.ownPlatform!.books!;
    if (choice === 'OWN') {
        nextBooks.funding = 'OWN';
        log(next, `${state.name} will be built from the treasury. No new lender, no new partner.`);
        return { player: next };
    }
    if (choice === 'BANK') {
        nextBooks.funding = 'BANK';
        nextBooks.debt += FACILITY_USD;
        nextBooks.facilityRate = FACILITY_RATE;
        pushMoney(next, FACILITY_USD, `${state.name} bank facility`);
        pushLine(nextBooks, next, FACILITY_USD, 'Bank facility drawn', 'DEBT');
        log(next, `Drew ${formatCompact(FACILITY_USD)} against ${state.name}. It has to be paid down every week.`);
        return { player: next };
    }
    const cash = Math.round(quoteValuation(player) * PE_STAKE * 0.85);
    nextBooks.funding = 'EQUITY';
    nextBooks.equitySoldPct = PE_STAKE;
    nextBooks.pePartner = PE_NAME;
    pushMoney(next, cash, `${PE_NAME} equity cheque`);
    pushLine(nextBooks, next, cash, `${PE_NAME} bought ${Math.round(PE_STAKE * 100)}%`, 'EQUITY');
    log(next, `${PE_NAME} bought ${Math.round(PE_STAKE * 100)}% of ${state.name} for ${formatCompact(cash)}. They take that share of weekly profit.`);
    return { player: next };
};

export const listCommissions = (player: Player): CommissionOrder[] => {
    const resolved = new Set((player.ownPlatform?.resolvedCommissions || []).map(row => row.id));
    const seed = hashString(`${player.id}:commissions`);
    const orders: CommissionOrder[] = [
        { id: 'nflx-214', studio: 'Netflix', color: '#e50914', title: 'Stranger Things: The Hawkins Files', genre: 'Sci-fi series', kind: 'Commissioned production', fee: 16_000_000, cap: 180_000_000, minRating: 7.5, weeks: 40, blurb: 'Netflix wants your studio to produce it.' },
        { id: 'dis-498', studio: 'Disney+', color: '#1f6feb', title: 'The Atlas of Starlight', genre: 'Fantasy movie', kind: 'Commissioned production', fee: 14_000_000, cap: 150_000_000, minRating: 7.2, weeks: 40, blurb: 'Disney+ wants your studio to produce it.' },
        { id: 'atv-311', studio: 'Apple TV+', color: '#a1a1aa', title: 'Glass Orchard', genre: 'Drama limited', kind: 'Commissioned production', fee: 9_000_000, cap: 70_000_000, minRating: 7.4, weeks: 28, blurb: 'Apple TV+ wants your studio to produce it.' },
        { id: 'hulu-962', studio: 'Hulu', color: '#1ce783', title: 'After the Siren', genre: 'Crime series', kind: 'Commissioned production', fee: 7_500_000, cap: 55_000_000, minRating: 7.0, weeks: 32, blurb: 'Hulu wants your studio to produce it.' },
    ];
    return orders.filter((order, index) => !resolved.has(order.id) && (seed + index) % 5 !== 0);
};

export const resolveCommission = (player: Player, id: string, accept: boolean): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ first.' };
    const order = listCommissions(player).find(row => row.id === id);
    if (!order) return { player, error: 'That commission has already been answered.' };
    const next: Player = {
        ...player,
        logs: player.logs,
        finance: player.finance,
        ownPlatform: {
            ...player.ownPlatform,
            books: player.ownPlatform.books || emptyBooks(),
            catalogue: [...player.ownPlatform.catalogue],
            resolvedCommissions: [...(player.ownPlatform.resolvedCommissions || []), { id, accepted: accept }],
        },
    };
    if (!accept) {
        log(next, `Passed on ${order.studio}'s commission for ${order.title}.`);
        return { player: next };
    }
    const greenlight = Math.round(order.fee * 0.25);
    next.ownPlatform!.catalogue.push({
        id: `commission:${order.id}`,
        source: 'OWNED',
        title: order.title,
        genre: order.genre,
        language: 'English',
        cost: 0,
        releaseWeekOffset: Math.min(RELEASE_HORIZON, Math.max(0, Math.round(order.weeks))),
    });
    pushMoney(next, greenlight, `${order.studio} greenlight on ${order.title}`);
    pushLine(next.ownPlatform!.books!, next, greenlight, `${order.studio} paid 25% to start ${order.title}`, 'COMMISSION');
    log(next, `Accepted ${order.studio}'s commission. ${formatCompact(greenlight)} arrived now. The rest is due if you deliver.`);
    return { player: next };
};

const slotEntry = (slot: ReleaseSlot, id: string, title: string, language: string, weekOffset: number): ReleaseCalendarEntry => {
    const country = MARKET_COUNTRIES.find(row => row.id === slot.countryId);
    return {
        id,
        title,
        house: slot.house,
        countryId: slot.countryId,
        regionId: country?.regionId || 'NORTH_AMERICA',
        language,
        weekOffset: clampReleaseOffset(weekOffset),
        yours: true,
        heat: 70,
        clash: false,
    };
};

export const calendarEntries = (player: Player): ReleaseCalendarEntry[] => {
    const slot = player.ownPlatform?.releaseSlot || defaultReleaseSlot(player);
    const yours: ReleaseCalendarEntry[] = [
        slotEntry(slot, 'slot', slot.title, slot.language, slot.weekOffset),
        ...(player.ownPlatform?.catalogue || [])
            .filter(row => Number.isFinite(Number(row.releaseWeekOffset)))
            .map(row => slotEntry(slot, row.id, row.title, row.language || slot.language, Number(row.releaseWeekOffset))),
    ];
    const rivals: ReleaseCalendarEntry[] = RIVAL_TITLES.map((title, index) => {
        const country = MARKET_COUNTRIES[(hashString(`${player.id}:cal:${index}`) + index) % MARKET_COUNTRIES.length];
        const weekOffset = index < 8
            ? hashString(`${player.id}:week:${title}`) % 8
            : hashString(`${player.id}:year:${title}`) % 52;
        return {
            id: `rival-${index}`,
            title,
            house: HOUSES[index % HOUSES.length],
            countryId: country.id,
            regionId: country.regionId,
            language: country.languages[0]?.name || 'English',
            weekOffset: clampReleaseOffset(weekOffset),
            yours: false,
            heat: 40 + (hashString(title) % 55),
            clash: false,
        };
    });
    yours.forEach(row => {
        row.clash = rivals.some(other => other.weekOffset === row.weekOffset && (other.countryId === row.countryId || other.regionId === row.regionId));
    });
    rivals.forEach(other => {
        other.clash = yours.some(row => row.weekOffset === other.weekOffset && (other.countryId === row.countryId || other.regionId === row.regionId));
    });
    return [...yours, ...rivals];
};

const syncLockedRelease = (player: Player, slot: ReleaseSlot): Player => {
    const offset = clampReleaseOffset(slot.weekOffset);
    const parts = releaseWeekParts(player.currentWeek, offset);
    const startWeekAbsolute = getAbsoluteWeek(player.age, player.currentWeek) + offset;
    const activeReleases = (player.activeReleases || []).map(release => {
        if (!slot.linkedReleaseId || release.id !== slot.linkedReleaseId || !release.streaming) return release;
        return {
            ...release,
            streaming: {
                ...release.streaming,
                startWeekAbsolute,
                weekOnPlatform: offset > 0 ? 0 : Math.max(1, release.streaming.weekOnPlatform || 1),
            },
        };
    });
    if (!player.ownPlatform) return { ...player, activeReleases };
    return {
        ...player,
        activeReleases,
        ownPlatform: {
            ...player.ownPlatform,
            closedDeals: (player.ownPlatform.closedDeals || []).map(deal => (
                deal.title === slot.title && typeof deal.opensWeek === 'number'
                    ? { ...deal, opensWeek: parts.week, opensYear: player.age + parts.yearsAhead }
                    : deal
            )),
        },
    };
};

export const updateReleaseSlot = (player: Player, patch: Partial<ReleaseSlot>): Player => {
    if (!player.ownPlatform) return player;
    const current = player.ownPlatform.releaseSlot || defaultReleaseSlot(player);
    const country = patch.countryId ? MARKET_COUNTRIES.find(row => row.id === patch.countryId) : undefined;
    const weekOffset = patch.weekOffset === undefined
        ? clampReleaseOffset(current.weekOffset)
        : clampReleaseOffset(patch.weekOffset);
    const releaseSlot: ReleaseSlot = {
        ...current,
        ...patch,
        language: patch.language || (country ? country.languages[0]?.name || current.language : current.language),
        weekOffset,
        linkedReleaseId: patch.linkedReleaseId !== undefined
            ? (patch.linkedReleaseId || undefined)
            : current.linkedReleaseId,
    };
    const pending = player.ownPlatform.pendingDeal;
    const next: Player = {
        ...player,
        ownPlatform: {
            ...player.ownPlatform,
            releaseSlot,
            pendingDeal: pending
                ? { ...pending, plan: { ...pending.plan, weekendOffset: weekOffset } }
                : pending,
        },
    };
    return syncLockedRelease(next, releaseSlot);
};

export const shiftRelease = (player: Player, delta: number): Player => {
    const slot = player.ownPlatform?.releaseSlot || defaultReleaseSlot(player);
    return updateReleaseSlot(player, { weekOffset: slot.weekOffset + delta });
};

export const postponeRelease = (player: Player): Player => shiftRelease(player, 1);

export const moveCatalogueRelease = (player: Player, id: string, weekOffset: number): Player => {
    if (!player.ownPlatform) return player;
    const offset = clampReleaseOffset(weekOffset);
    return {
        ...player,
        ownPlatform: {
            ...player.ownPlatform,
            catalogue: player.ownPlatform.catalogue.map(row => (
                row.id === id ? { ...row, releaseWeekOffset: offset } : row
            )),
        },
    };
};

export const shiftCatalogueRelease = (player: Player, id: string, delta: number): Player => {
    const row = player.ownPlatform?.catalogue.find(item => item.id === id);
    const current = Number.isFinite(Number(row?.releaseWeekOffset)) ? Number(row?.releaseWeekOffset) : 0;
    return moveCatalogueRelease(player, id, current + delta);
};

const withIpo = (player: Player, recipe: (ipo: IpoState) => void): Player => {
    if (!player.ownPlatform) return player;
    const ipo: IpoState = {
        ...(player.ownPlatform.ipo || emptyIpo(player.ownPlatform.name)),
        disclosures: (player.ownPlatform.ipo?.disclosures || emptyIpo(player.ownPlatform.name).disclosures).map(row => ({ ...row })),
        votes: [...(player.ownPlatform.ipo?.votes || [])],
        dayMove: [...(player.ownPlatform.ipo?.dayMove || [])],
    };
    recipe(ipo);
    return { ...player, ownPlatform: { ...player.ownPlatform, ipo } };
};

export const beginIpo = (player: Player): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open the launch first.' };
    if (player.ownPlatform.ipo?.stage === 'LISTED') return { player, error: 'The company is already listed.' };
    const valuation = quoteValuation(player);
    const next = withIpo(player, ipo => {
        ipo.stage = 'RESOLUTION';
        ipo.valuation = valuation;
        ipo.ticker = tickerFrom(player.ownPlatform!.name);
        ipo.price = fairSharePrice({ ...player, ownPlatform: { ...player.ownPlatform!, ipo: { ...ipo, valuation } } });
        ipo.floor = Math.max(4, Math.round(ipo.price * 0.85 * 100) / 100);
        ipo.cap = Math.round(ipo.price * 1.25 * 100) / 100;
    });
    return { player: next };
};

export const moveResolution = (player: Player): Player => withIpo(player, ipo => {
    if (ipo.stage === 'RESOLUTION') ipo.stage = 'PRICE';
});

export const setIpoTerms = (player: Player, price: number, sharesForSale: number): Player => withIpo(player, ipo => {
    const nextPrice = Number(price);
    const nextShares = Number(sharesForSale);
    if (Number.isFinite(nextPrice) && nextPrice > 0) ipo.price = Math.round(nextPrice * 100) / 100;
    if (Number.isFinite(nextShares) && nextShares > 0) {
        ipo.sharesForSale = Math.max(100_000, Math.min(2_000_000, Math.round(nextShares)));
    }
    ipo.valuation = quoteValuation(player);
});

export const submitForVote = (player: Player): Player => {
    const fair = fairSharePrice(player);
    const next = withIpo(player, ipo => {
        const stretch = ipo.price / Math.max(1, fair);
        const omitted = ipo.disclosures.filter(row => row.choice === 'OMIT').length;
        const votes: IpoVote[] = BOARD.map(seat => {
            if (seat.name === 'You' || seat.role === 'Executive') {
                return { ...seat, vote: 'FOR', note: 'The founder asked for the listing.' };
            }
            if (seat.role === 'Chief financial officer' && stretch > 1.2) {
                return { ...seat, vote: 'AGAINST', note: 'The price is ahead of the numbers.' };
            }
            if (seat.role === 'General counsel' && (stretch > 1.15 || omitted > 0)) {
                return { ...seat, vote: 'AGAINST', note: 'The filing is thinner than the price.' };
            }
            if (seat.role === 'Investor' && (stretch > 1.1 || omitted >= 2)) {
                return { ...seat, vote: 'AGAINST', note: 'Somebody in the building will not sign this.' };
            }
            if (seat.name === 'Helena Brandt' && stretch > 1.25) {
                return { ...seat, vote: 'AGAINST', note: 'Too aggressive for a first listing.' };
            }
            if (seat.name === 'Nomi Reisz' && omitted >= 1) {
                return { ...seat, vote: 'ABSTAIN', note: 'Waiting on the drawer.' };
            }
            return { ...seat, vote: 'FOR', note: 'The range can be defended.' };
        });
        ipo.votes = votes;
        ipo.stage = 'VOTE';
    });
    return next;
};

export const voteCarried = (ipo: IpoState): boolean => {
    const fors = ipo.votes.filter(vote => vote.vote === 'FOR').length;
    const against = ipo.votes.filter(vote => vote.vote === 'AGAINST').length;
    return fors > against;
};

export const leaveVote = (player: Player): { player: Player; error?: string } => {
    const ipo = player.ownPlatform?.ipo;
    if (!ipo) return { player, error: 'No resolution is on the table.' };
    if (!voteCarried(ipo)) {
        return { player: withIpo(player, draft => { draft.stage = 'PRICE'; }), error: 'The resolution failed. Reprice it.' };
    }
    return { player: withIpo(player, draft => { draft.stage = 'FILING'; }) };
};

export const chooseDisclosure = (player: Player, id: string, choice: 'DISCLOSE' | 'OMIT'): Player => withIpo(player, ipo => {
    ipo.disclosures = ipo.disclosures.map(row => row.id === id ? { ...row, choice } : row);
});

export const fileWithRegulator = (player: Player): { player: Player; error?: string } => {
    const ipo = player.ownPlatform?.ipo;
    if (!ipo) return { player, error: 'Nothing is ready to file.' };
    if (ipo.disclosures.some(row => !row.choice)) return { player, error: 'Every risk factor needs a disclose or an omit.' };
    return { player: withIpo(player, draft => { draft.stage = 'BAND'; }) };
};

export const publishBand = (player: Player, floor: number, cap: number): { player: Player; error?: string } => {
    if (cap < floor) return { player, error: 'The cap has to sit above the floor.' };
    const next = withIpo(player, ipo => {
        ipo.floor = Math.round(floor * 100) / 100;
        ipo.cap = Math.round(cap * 100) / 100;
        const omitted = ipo.disclosures.filter(row => row.choice === 'OMIT').length;
        const width = (ipo.cap - ipo.floor) / Math.max(1, ipo.floor);
        ipo.anchorWalked = omitted >= 2 || width > 0.45;
        ipo.anchorPct = ipo.anchorWalked ? 0.08 : 0.29 + (omitted === 0 ? 0.18 : 0);
        ipo.anchorName = ipo.anchorWalked ? 'Ardent Holdings' : PE_NAME;
        ipo.stage = 'ANCHOR';
    });
    return { player: next };
};

export const goOnAir = (player: Player): Player => withIpo(player, ipo => {
    ipo.stage = 'BOOK';
    ipo.bookDay = 1;
    const omitted = ipo.disclosures.filter(row => row.choice === 'OMIT').length;
    const fair = fairSharePrice(player);
    const cheap = ipo.price <= fair ? 0.2 : -0.15;
    ipo.bookMultiple = Math.max(0.4, Math.round((1.15 + cheap - omitted * 0.22) * 100) / 100);
});

export const advanceBook = (player: Player): Player => withIpo(player, ipo => {
    if (ipo.bookDay < 3) {
        ipo.bookDay += 1;
        ipo.bookMultiple = Math.round((ipo.bookMultiple + (ipo.bookMultiple >= 1 ? 0.06 : -0.04)) * 100) / 100;
    }
});

export const closeBook = (player: Player): { player: Player; error?: string } => {
    if (!player.ownPlatform?.ipo) return { player, error: 'The book is not open.' };
    if (player.ownPlatform.ipo.stage === 'LISTED' || player.ownPlatform.ipo.stage === 'TRADING') {
        return { player, error: 'The company is already listed.' };
    }
    if (player.ownPlatform.ipo.stage !== 'BOOK') return { player, error: 'The book is not ready to close.' };
    const ipo = player.ownPlatform.ipo;
    const covered = ipo.bookMultiple >= 1;
    const openPrice = covered ? ipo.cap : ipo.floor;
    const raise = Math.round(ipo.sharesForSale * openPrice * (1 - ipo.staffReservePct) * 0.96);
    const dayMove = [ipo.floor, openPrice * 0.97, openPrice * 1.03, openPrice * 0.99, openPrice].map(value => Math.round(value * 100) / 100);
    let next = withIpo(player, draft => {
        draft.openPrice = openPrice;
        draft.lastPrice = openPrice;
        draft.dayMove = dayMove;
        draft.stage = 'TRADING';
        draft.valuation = quoteValuation(player);
    });
    next = {
        ...next,
        logs: next.logs,
        finance: next.finance,
        stocks: [...(next.stocks || [])],
    };
    pushMoney(next, raise, `${next.ownPlatform!.name} listing proceeds`);
    const books = next.ownPlatform!.books || emptyBooks();
    next.ownPlatform = { ...next.ownPlatform!, books: { ...books, lines: [...books.lines] } };
    pushLine(next.ownPlatform.books!, next, raise, `Listing proceeds at $${openPrice.toFixed(2)}`, 'IPO');
    const ticker = next.ownPlatform.ipo!.ticker;
    const existing = next.stocks.findIndex(stock => stock.id === 'stk_emp' || stock.playerCompany);
    const listed: Stock = {
        id: 'stk_emp',
        symbol: ticker,
        name: next.ownPlatform.name,
        sector: 'MEDIA',
        price: openPrice,
        volatility: 0.06,
        dividendYield: 0,
        priceHistory: dayMove,
        lastDividendPayoutWeek: player.currentWeek,
        sharesOutstanding: Math.round(ipo.sharesForSale / Math.max(0.05, 1 - ipo.founderKeepPct)),
        playerCompany: true,
    };
    if (existing >= 0) next.stocks[existing] = { ...next.stocks[existing], ...listed };
    else next.stocks = [...next.stocks, listed];
    const founderShares = Math.max(25, Math.round(200 * ipo.founderKeepPct));
    const portfolio = [...(next.portfolio || [])];
    const held = portfolio.find(row => row.stockId === 'stk_emp');
    next.portfolio = held
        ? portfolio.map(row => row.stockId === 'stk_emp' ? { ...row, shares: row.shares + founderShares } : row)
        : [...portfolio, { stockId: 'stk_emp', shares: founderShares }];
    log(next, covered
        ? `${next.ownPlatform.name} listed. The book was covered ${ipo.bookMultiple.toFixed(2)}× and ${formatCompact(raise)} reached the treasury. ${founderShares} founder shares are in Stocks.`
        : `${next.ownPlatform.name} listed under the floor. The book was not covered. ${formatCompact(raise)} still arrived. ${founderShares} founder shares are in Stocks.`);
    return { player: next };
};

export const finishTradingDay = (player: Player): Player => withIpo(player, ipo => {
    ipo.stage = 'LISTED';
});

const dealHasOpened = (player: Player, opensWeek: number | undefined, opensYear: number | undefined): boolean => {
    if (typeof opensWeek !== 'number') return true;
    const year = opensYear ?? player.age;
    if (year < player.age) return true;
    if (year > player.age) return false;
    return opensWeek <= player.currentWeek;
};

export const titleRows = (player: Player): { title: string; weekly: number; source: string; note: string }[] => {
    const state = player.ownPlatform;
    if (!state) return [];
    const pool = Math.max(0, state.lastWeeklyRevenue);
    const titles = [
        ...state.catalogue.map(row => {
            const waiting = Number.isFinite(Number(row.releaseWeekOffset)) && Number(row.releaseWeekOffset) > 0;
            return {
                title: row.title,
                source: row.source === 'OWNED' ? 'Owned' : 'Licensed',
                waiting,
                note: waiting ? `Opens ${releaseWeekLabel(player.currentWeek, Number(row.releaseWeekOffset))}` : '',
            };
        }),
        ...state.closedDeals.map(row => {
            const waiting = !dealHasOpened(player, row.opensWeek, row.opensYear);
            const yearNote = (row.opensYear ?? player.age) > player.age ? ' · next year' : '';
            const label = typeof row.opensWeek === 'number' ? `Week ${row.opensWeek}${yearNote}` : 'later';
            return {
                title: row.title,
                source: row.bidderName,
                waiting,
                note: waiting ? `Views begin ${label}` : '',
            };
        }),
    ];
    if (!titles.length) return [];
    const live = titles.filter(row => !row.waiting);
    const weight = live.reduce((sum, _, index) => sum + (live.length - index), 0);
    return titles.slice(0, 8).map(row => {
        if (row.waiting || weight <= 0) {
            return { title: row.title, source: row.source, weekly: 0, note: row.note };
        }
        const index = live.indexOf(row);
        return {
            title: row.title,
            source: row.source,
            weekly: Math.round(pool * ((live.length - index) / weight)),
            note: '',
        };
    });
};

export const revenueSplit = (player: Player): { lane: string; amount: number }[] => {
    const state = player.ownPlatform;
    if (!state) return [];
    const lanes = state.revenueLanes.length ? state.revenueLanes : ['SUBSCRIPTION'];
    const total = state.lastWeeklyRevenue;
    return lanes.map((lane, index) => ({
        lane,
        amount: Math.round(total * ((lanes.length - index) / lanes.reduce((sum, _, i) => sum + (lanes.length - i), 0))),
    }));
};

/** Weekly debt service and private-equity share. Money is returned for the ledger. */
export const settleBooks = (player: Player): { notes: { msg: string; type: 'positive' | 'negative' | 'neutral' }[]; transactions: { amount: number; description: string }[] } => {
    const state = player.ownPlatform;
    if (!state) return { notes: [], transactions: [] };
    const books = state.books || emptyBooks();
    state.books = books;
    const notes: { msg: string; type: 'positive' | 'negative' | 'neutral' }[] = [];
    const transactions: { amount: number; description: string }[] = [];
    const revenue = state.lastWeeklyRevenue || 0;
    const burn = state.lastWeeklyBurn || 0;
    let profit = revenue - burn;
    if (books.debt > 0) {
        const interest = Math.round(books.debt * (books.facilityRate || FACILITY_RATE) / 52);
        const principal = Math.min(books.debt, Math.max(25_000, Math.round(books.debt * 0.02)));
        books.debt = Math.max(0, books.debt - principal);
        const due = interest + principal;
        transactions.push({ amount: -due, description: `${state.name} facility payment` });
        pushLine(books, player, -due, 'Facility interest and paydown', 'DEBT');
        profit -= due;
        if (books.debt === 0) notes.push({ msg: `${state.name} cleared its bank facility.`, type: 'positive' });
    }
    if (books.equitySoldPct > 0 && revenue > burn) {
        const cut = Math.round((revenue - burn) * books.equitySoldPct);
        if (cut > 0) {
            transactions.push({ amount: -cut, description: `${books.pePartner} profit share` });
            pushLine(books, player, -cut, `${books.pePartner} took its share`, 'EQUITY');
            profit -= cut;
        }
    }
    books.history = [...books.history, { week: player.currentWeek, revenue, burn, profit }].slice(-16);
    if (state.ipo?.stage === 'LISTED' && state.ipo) {
        const stock = (player.stocks || []).find(row => row.playerCompany || row.id === 'stk_emp');
        if (stock && Number.isFinite(stock.price)) state.ipo.lastPrice = stock.price;
    }
    return { notes, transactions };
};

export { FACILITY_USD, PE_STAKE, PE_NAME };
