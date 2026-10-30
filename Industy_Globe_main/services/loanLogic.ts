import { Business, LoanBorrower, Player, PlayerLoan, TransactionCategory } from '../types';
import { addCompanyCash, readCompanyCash } from './ownPlatform/companyCash';
import { getAbsoluteWeek } from './legacyLogic';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toFinite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const getBusinessValuation = (business: Business) => {
    const baseBalance = toFinite(business.balance);
    const statsValuation = toFinite(business.stats?.valuation);
    return Math.max(baseBalance, statsValuation);
};

export const getOutstandingLoanBalance = (player: Player): number =>
    (player.finance?.loans || [])
        .filter(loan => loan.status !== 'PAID')
        .reduce((sum, loan) => sum + Math.max(0, toFinite(loan.principal)), 0);

export const getWeeklyDebtBurden = (player: Player): number =>
    (player.finance?.loans || [])
        .filter(loan => loan.status === 'ACTIVE')
        .reduce((sum, loan) => sum + Math.max(0, toFinite(loan.weeklyPayment)), 0);

export const getEstimatedNetWorth = (player: Player): number => {
    const cash = Math.max(0, toFinite(player.money));
    const assetValue = (player.customItems || []).reduce((sum, item) => sum + Math.max(0, toFinite((item as any).price)), 0);
    const portfolioValue = (player.portfolio || []).reduce((sum, holding) => {
        const stock = (player.stocks || []).find(s => s.id === holding.stockId);
        return sum + (stock ? Math.max(0, toFinite(stock.price) * toFinite(holding.shares)) : 0);
    }, 0);
    const businessValue = (player.businesses || []).reduce((sum, business) => sum + getBusinessValuation(business), 0);
    return cash + assetValue + portfolioValue + businessValue;
};

export const getAverageWeeklyCashFlow = (player: Player, lookbackWeeks = 26) => {
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const recentTransactions = (player.finance?.history || []).filter(tx => {
        const absoluteWeek = getAbsoluteWeek(tx.year, tx.week);
        return currentAbsoluteWeek - absoluteWeek < lookbackWeeks;
    });

    const weeksObserved = Math.max(8, Math.min(lookbackWeeks, currentAbsoluteWeek + 1));
    const income = recentTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = recentTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
        income: income / weeksObserved,
        expenses: expenses / weeksObserved,
        freeCashFlow: (income - expenses) / weeksObserved
    };
};

export const getCreditScore = (player: Player): number => {
    const netWorth = getEstimatedNetWorth(player);
    const outstandingDebt = getOutstandingLoanBalance(player);
    const weeklyDebt = getWeeklyDebtBurden(player);
    const cashFlow = getAverageWeeklyCashFlow(player);
    const credit = player.finance?.credit;

    const debtRatio = outstandingDebt > 0 ? outstandingDebt / Math.max(1, netWorth) : 0;
    const burdenRatio = weeklyDebt > 0 ? weeklyDebt / Math.max(25000, cashFlow.income) : 0;
    const profitabilityRatio = clamp(cashFlow.freeCashFlow / 200000, -1, 2);

    let score = 520;
    score += clamp(player.stats.reputation * 1.2, 0, 110);
    score += clamp(player.stats.fame * 0.45, 0, 50);
    score += clamp(Math.log10(Math.max(1000, netWorth)) * 42 - 120, 0, 120);
    score += clamp(profitabilityRatio * 65, -40, 90);
    score += clamp((player.businesses?.length || 0) * 10, 0, 40);
    score += clamp((credit?.successfulPayments || 0) * 4, 0, 70);
    score -= clamp((credit?.missedPayments || 0) * 24, 0, 180);
    score -= clamp((credit?.defaults || 0) * 120, 0, 240);
    score -= clamp(debtRatio * 520, 0, 260);
    score -= clamp(burdenRatio * 210, 0, 220);

    return Math.round(clamp(score, 300, 850));
};

export const getCreditTier = (score: number): 'Elite' | 'Strong' | 'Fair' | 'Risky' | 'Distressed' => {
    if (score >= 790) return 'Elite';
    if (score >= 710) return 'Strong';
    if (score >= 640) return 'Fair';
    if (score >= 560) return 'Risky';
    return 'Distressed';
};

export const getSafeBorrowingCapacity = (player: Player): number => {
    const netWorth = getEstimatedNetWorth(player);
    const outstandingDebt = getOutstandingLoanBalance(player);
    const cashFlow = getAverageWeeklyCashFlow(player);
    const score = getCreditScore(player);
    const creditMultiplier = clamp((score - 300) / 550, 0, 1);

    const incomeDriven = Math.max(150000, Math.max(0, cashFlow.freeCashFlow) * (32 + creditMultiplier * 26));
    const wealthDriven = Math.max(0, netWorth * (0.025 + creditMultiplier * 0.055));
    const fameDriven = (player.stats.fame * 18000) + (player.stats.reputation * 12000);
    const businessDriven = (player.businesses?.length || 0) * 350000;

    const grossCapacity = incomeDriven + wealthDriven + fameDriven + businessDriven;
    const absoluteCap = Math.max(500000, (netWorth * 0.16) + (Math.max(0, cashFlow.income) * 42));
    const debtPenalty = outstandingDebt * 1.1;

    return Math.max(0, Math.floor(Math.min(grossCapacity, absoluteCap) - debtPenalty));
};

export const getAbsoluteBorrowingCeiling = (player: Player): number => {
    const safeCapacity = getSafeBorrowingCapacity(player);
    const netWorth = getEstimatedNetWorth(player);
    const score = getCreditScore(player);
    const floor = score >= 640 ? 500000 : score >= 560 ? 200000 : 0;
    return Math.max(floor, Math.floor(Math.min(safeCapacity * 1.45, netWorth * 0.22 + safeCapacity * 0.35)));
};

const getRecentBorrowPressure = (player: Player) => {
    const lastLoanAbsoluteWeek = player.finance?.credit?.lastLoanAbsoluteWeek;
    if (typeof lastLoanAbsoluteWeek !== 'number') return 0;
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const weeksSinceLastLoan = currentAbsoluteWeek - lastLoanAbsoluteWeek;
    if (weeksSinceLastLoan <= 4) return 1;
    if (weeksSinceLastLoan <= 8) return 0.6;
    if (weeksSinceLastLoan <= 16) return 0.25;
    return 0;
};

const getRepeatDebtPressure = (player: Player) => {
    const activeLoans = (player.finance?.loans || []).filter(loan => loan.status === 'ACTIVE').length;
    const defaults = player.finance?.credit?.defaults || 0;
    const missedPayments = player.finance?.credit?.missedPayments || 0;
    return {
        activeLoans,
        repeatPressure: activeLoans > 1 ? (activeLoans - 1) * 0.18 : 0,
        distressPressure: defaults * 0.25 + Math.min(0.18, missedPayments * 0.03)
    };
};

export const getLoanAnnualRate = (player: Player, requestedAmount: number, termWeeks: number): number => {
    const score = getCreditScore(player);
    const safeCapacity = Math.max(1, getSafeBorrowingCapacity(player));
    const stressRatio = requestedAmount / safeCapacity;
    const termPenalty = termWeeks >= 104 ? 1.6 : termWeeks >= 52 ? 0.9 : termWeeks >= 26 ? 0.25 : 0;
    const recentBorrowPressure = getRecentBorrowPressure(player);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(player);
    const isFirstLoan = activeLoans === 0 && (player.finance?.credit?.totalBorrowed || 0) === 0;

    let rate = 0.24;
    rate -= clamp((score - 300) / 550, 0, 1) * 0.15;
    rate += clamp((stressRatio - 0.6) * 0.12, 0, 0.12);
    rate += termPenalty / 100;
    rate += recentBorrowPressure * 0.05;
    rate += repeatPressure;
    rate += distressPressure;
    if (isFirstLoan && requestedAmount <= safeCapacity * 0.75) rate -= 0.018;

    return Number(clamp(rate, 0.055, 0.31).toFixed(4));
};

export const calculateWeeklyLoanPayment = (amount: number, annualRate: number, termWeeks: number): number => {
    const principal = Math.max(0, Math.floor(amount));
    const weeks = Math.max(1, Math.floor(termWeeks));
    const weeklyRate = annualRate / 52;

    if (weeklyRate <= 0) return Math.ceil(principal / weeks);

    const factor = Math.pow(1 + weeklyRate, weeks);
    return Math.ceil((principal * weeklyRate * factor) / (factor - 1));
};

export const getLoanApprovalOdds = (player: Player, requestedAmount: number, termWeeks: number): number => {
    const safeCapacity = Math.max(1, getSafeBorrowingCapacity(player));
    const absoluteCap = getAbsoluteBorrowingCeiling(player);
    if (requestedAmount > absoluteCap) return 0;

    const score = getCreditScore(player);
    const burdenRatio = getWeeklyDebtBurden(player) / Math.max(25000, getAverageWeeklyCashFlow(player).income);
    const requestedRatio = requestedAmount / safeCapacity;
    const recentBorrowPressure = getRecentBorrowPressure(player);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(player);
    const isFirstLoan = activeLoans === 0 && (player.finance?.credit?.totalBorrowed || 0) === 0;

    let odds = 0.4 + clamp((score - 520) / 420, -0.2, 0.45);
    odds -= clamp((requestedRatio - 0.85) * 0.55, 0, 0.6);
    odds -= clamp(burdenRatio * 0.6, 0, 0.4);
    odds -= termWeeks >= 104 ? 0.05 : 0;
    odds -= recentBorrowPressure * 0.12;
    odds -= repeatPressure;
    odds -= distressPressure;
    if (isFirstLoan && requestedAmount <= safeCapacity * 0.75) odds += 0.14;
    if (requestedAmount <= 50000) odds += 0.08;

    return clamp(odds, 0, 0.98);
};

export const getLoanDecisionLabel = (odds: number): string => {
    if (odds >= 0.85) return 'Very Likely';
    if (odds >= 0.68) return 'Likely';
    if (odds >= 0.48) return 'Borderline';
    if (odds > 0) return 'Unlikely';
    return 'Declined';
};

export const createPlayerLoan = (player: Player, requestedAmount: number, termWeeks: number): PlayerLoan => {
    const annualInterestRate = getLoanAnnualRate(player, requestedAmount, termWeeks);
    const weeklyPayment = calculateWeeklyLoanPayment(requestedAmount, annualInterestRate, termWeeks);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);

    return {
        id: `loan_${absoluteWeek}_${Date.now()}`,
        lenderName: getCreditTier(getCreditScore(player)) === 'Elite' ? 'Premier Capital' : 'Citywide Credit',
        principal: Math.floor(requestedAmount),
        originalPrincipal: Math.floor(requestedAmount),
        annualInterestRate,
        weeklyPayment,
        termWeeks,
        weeksRemaining: termWeeks,
        takenWeek: player.currentWeek,
        takenYear: player.age,
        takenAbsoluteWeek: absoluteWeek,
        missedPayments: 0,
        successfulPayments: 0,
        status: 'ACTIVE',
        borrower: 'PERSONAL',
        lenderId: getCreditTier(getCreditScore(player)) === 'Elite' ? 'premier' : 'citywide',
    };
};

export const LENDERS: { id: string; name: string; minScore: number; spread: number }[] = [
    { id: 'premier', name: 'Premier Capital', minScore: 710, spread: -0.008 },
    { id: 'meridian', name: 'Meridian Picture Finance', minScore: 640, spread: 0 },
    { id: 'covenant', name: 'Pacific Covenant Bank', minScore: 560, spread: 0.008 },
    { id: 'harbor', name: 'Harbor & Pine', minScore: 500, spread: 0.014 },
    { id: 'citywide', name: 'Citywide Credit', minScore: 300, spread: 0.028 },
];

export const productionHouse = (player: Player): Business | undefined =>
    (player.businesses || [])
        .filter(business => business.type === 'PRODUCTION_HOUSE' && business.isActive !== false)
        .sort((a, b) => (b.stats?.valuation || 0) - (a.stats?.valuation || 0))[0];

export const loansFor = (player: Player, borrower: LoanBorrower): PlayerLoan[] =>
    (player.finance?.loans || []).filter(loan => (loan.borrower || 'PERSONAL') === borrower && loan.status !== 'PAID' && loan.principal > 0);

const empireAssets = (player: Player): number => {
    const state = player.ownPlatform;
    if (!state) return 0;
    const listed = (player.stocks || []).find(stock => stock.playerCompany || stock.id === 'stk_emp');
    if (listed && Number.isFinite(listed.price) && Number.isFinite(listed.sharesOutstanding)) {
        return Math.max(0, listed.price * (listed.sharesOutstanding || 0));
    }
    if (state.ipo?.valuation) return state.ipo.valuation;
    return 6_000_000 + (state.subscribers || 0) * 35 + (state.catalogue?.length || 0) * 1_400_000;
};

export interface BorrowerDesk {
    borrower: LoanBorrower;
    label: string;
    available: boolean;
    reason: string;
    cash: number;
    assets: number;
    weeklyIncome: number;
    debt: number;
    weeklyDebt: number;
    capacity: number;
    score: number;
}

export const borrowerDesk = (player: Player, borrower: LoanBorrower): BorrowerDesk => {
    if (borrower === 'HOUSE') {
        const house = productionHouse(player);
        const debt = loansFor(player, 'HOUSE').reduce((sum, loan) => sum + loan.principal, 0);
        const weeklyDebt = loansFor(player, 'HOUSE').filter(loan => loan.status === 'ACTIVE').reduce((sum, loan) => sum + loan.weeklyPayment, 0);
        if (!house) {
            return { borrower, label: 'Production house', available: false, reason: 'Found a production house before it can borrow.', cash: 0, assets: 0, weeklyIncome: 0, debt, weeklyDebt, capacity: 0, score: 300 };
        }
        const assets = Math.max(toFinite(house.balance), toFinite(house.stats?.valuation));
        const weeklyIncome = Math.max(0, toFinite(house.stats?.weeklyProfit), toFinite(house.stats?.weeklyRevenue) - toFinite(house.stats?.weeklyExpenses));
        const ratio = assets > 0 ? debt / assets : 1;
        const score = Math.round(clamp(620 + weeklyIncome / 20000 - ratio * 180 - (player.finance?.credit?.defaults || 0) * 80, 300, 850));
        const capacity = Math.max(0, Math.floor(Math.min(assets * 0.35, Math.max(100_000, weeklyIncome * 40) + assets * 0.08) - debt));
        return { borrower, label: house.name, available: true, reason: 'The house borrows against its own cash and catalogue.', cash: Math.max(0, toFinite(house.balance)), assets, weeklyIncome, debt, weeklyDebt, capacity, score };
    }
    if (borrower === 'EMPIRE') {
        const state = player.ownPlatform;
        const loans = loansFor(player, 'EMPIRE');
        const debt = (state?.books?.debt || 0) + loans.reduce((sum, loan) => sum + loan.principal, 0);
        const weeklyDebt = loans.filter(loan => loan.status === 'ACTIVE').reduce((sum, loan) => sum + loan.weeklyPayment, 0);
        if (!state) {
            return { borrower, label: 'Empire+', available: false, reason: 'Open Empire+ before the company can borrow.', cash: 0, assets: 0, weeklyIncome: 0, debt, weeklyDebt, capacity: 0, score: 300 };
        }
        const assets = empireAssets(player);
        const weeklyIncome = Math.max(0, toFinite(state.lastWeeklyRevenue));
        const ratio = assets > 0 ? debt / assets : 1;
        const score = Math.round(clamp(600 + weeklyIncome / 15000 + (state.subscribers || 0) / 200000 - ratio * 200 - (player.finance?.credit?.defaults || 0) * 90, 300, 850));
        const capacity = Math.max(0, Math.floor(Math.min(assets * 0.22, Math.max(150_000, weeklyIncome * 26)) - debt));
        return { borrower, label: state.name || 'Empire+', available: true, reason: 'Empire+ borrows against the service. The cash lands in the company, not in your pocket.', cash: Math.max(0, readCompanyCash(player)), assets, weeklyIncome, debt, weeklyDebt, capacity, score };
    }
    const debt = loansFor(player, 'PERSONAL').reduce((sum, loan) => sum + loan.principal, 0);
    const weeklyDebt = getWeeklyDebtBurden(player);
    return {
        borrower,
        label: 'You',
        available: true,
        reason: 'A personal loan. Your name is on it.',
        cash: Math.max(0, toFinite(player.money)),
        assets: getEstimatedNetWorth(player),
        weeklyIncome: Math.max(0, getAverageWeeklyCashFlow(player).income),
        debt,
        weeklyDebt,
        capacity: getAbsoluteBorrowingCeiling(player),
        score: getCreditScore(player),
    };
};

export const pickLender = (score: number, lenderId?: string) => {
    const open = LENDERS.filter(lender => score >= lender.minScore);
    const chosen = LENDERS.find(lender => lender.id === lenderId);
    if (chosen && score >= chosen.minScore) return chosen;
    return open[0] || LENDERS[LENDERS.length - 1];
};

const entityRate = (desk: BorrowerDesk, amount: number, termWeeks: number, spread: number): number => {
    const stress = desk.capacity > 0 ? amount / desk.capacity : 2;
    let rate = 0.12 + spread;
    rate += clamp(stress - 0.5, 0, 1) * 0.06;
    rate += desk.assets > 0 ? clamp(desk.debt / desk.assets, 0, 2) * 0.07 : 0.08;
    rate -= clamp((desk.score - 500) / 350, 0, 1) * 0.05;
    if (termWeeks >= 104) rate += 0.012;
    return Number(clamp(rate, 0.055, 0.29).toFixed(4));
};

export const quoteLoan = (player: Player, amount: number, termWeeks: number, borrower: LoanBorrower, lenderId?: string) => {
    const desk = borrowerDesk(player, borrower);
    const lender = pickLender(desk.score, lenderId);
    const rate = borrower === 'PERSONAL'
        ? Number(clamp(getLoanAnnualRate(player, amount, termWeeks) + lender.spread, 0.055, 0.31).toFixed(4))
        : entityRate(desk, amount, termWeeks, lender.spread);
    const weekly = calculateWeeklyLoanPayment(amount, rate, termWeeks);
    const tooSmall = amount < 50_000;
    const tooLarge = !desk.available || amount > desk.capacity;
    let odds = 0;
    if (!tooSmall && !tooLarge) {
        odds = borrower === 'PERSONAL'
            ? getLoanApprovalOdds(player, amount, termWeeks)
            : clamp(0.72 - (desk.capacity > 0 ? amount / desk.capacity : 1) * 0.25, 0.15, 0.9);
    }
    return { desk, lender, rate, weekly, odds, tooSmall, tooLarge };
};

const pushHistory = (player: Player, amount: number, description: string) => {
    if (!player.finance.history) player.finance.history = [];
    player.finance.history.unshift({
        id: `tx_loan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        week: player.currentWeek,
        year: player.age,
        amount: Math.trunc(amount),
        category: 'LOAN' as TransactionCategory,
        description,
    });
    if (player.finance.history.length > 200) player.finance.history.pop();
};

export const issueLoan = (
    player: Player,
    amount: number,
    termWeeks: number,
    borrower: LoanBorrower,
    lenderId?: string,
): { player: Player; error?: string } => {
    const requested = Math.floor(amount);
    const quote = quoteLoan(player, requested, termWeeks, borrower, lenderId);
    if (!quote.desk.available) return { player, error: quote.desk.reason };
    if (quote.tooSmall) return { player, error: 'The smallest note any of these desks will write is $50,000.' };
    if (quote.tooLarge || quote.odds <= 0) return { player, error: `${quote.lender.name} will not lend that much against ${quote.desk.label}.` };
    const house = borrower === 'HOUSE' ? productionHouse(player) : undefined;
    const loan: PlayerLoan = {
        id: `loan_${borrower}_${getAbsoluteWeek(player.age, player.currentWeek)}_${Date.now()}`,
        lenderName: quote.lender.name,
        lenderId: quote.lender.id,
        principal: requested,
        originalPrincipal: requested,
        annualInterestRate: quote.rate,
        weeklyPayment: quote.weekly,
        termWeeks,
        weeksRemaining: termWeeks,
        takenWeek: player.currentWeek,
        takenYear: player.age,
        takenAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        missedPayments: 0,
        successfulPayments: 0,
        status: 'ACTIVE',
        borrower,
        businessId: house?.id,
    };
    const next: Player = {
        ...player,
        money: player.money,
        businesses: (player.businesses || []).map(business => ({ ...business, stats: { ...business.stats } })),
        finance: {
            ...player.finance,
            loans: [...(player.finance.loans || []), loan],
            history: [...(player.finance.history || [])],
            credit: {
                ...(player.finance.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }),
                totalBorrowed: (player.finance.credit?.totalBorrowed || 0) + requested,
                lastLoanAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
            },
        },
        logs: [...(player.logs || [])],
        ownPlatform: player.ownPlatform ? { ...player.ownPlatform, books: player.ownPlatform.books ? { ...player.ownPlatform.books, lines: [...(player.ownPlatform.books.lines || [])] } : player.ownPlatform.books } : undefined,
    };
    if (borrower === 'HOUSE' && house) {
        next.businesses = next.businesses.map(business => business.id === house.id ? { ...business, balance: business.balance + requested } : business);
    } else if (borrower === 'EMPIRE') {
        addCompanyCash(next, requested, `${loan.lenderName} company loan. This is not personal cash.`, 'DEBT');
    } else {
        next.money += requested;
    }
    const where = borrower === 'HOUSE' ? house?.name || 'the production house' : borrower === 'EMPIRE' ? (next.ownPlatform?.name || 'Empire+') : 'you';
    if (borrower !== 'EMPIRE') pushHistory(next, requested, `${loan.lenderName} funded ${where}`);
    next.logs = [...next.logs, { week: next.currentWeek, year: next.age, type: 'neutral', message: `🏦 ${loan.lenderName} lent ${where} $${requested.toLocaleString()} at ${(quote.rate * 100).toFixed(1)}%. $${loan.weeklyPayment.toLocaleString()} leaves every week.` }];
    return { player: next };
};

export const repayLoan = (player: Player, loanId: string, mode: 'SCHEDULED' | 'BALANCE'): { player: Player; error?: string } => {
    const loan = (player.finance?.loans || []).find(row => row.id === loanId);
    if (!loan || loan.status === 'PAID') return { player, error: 'That loan is already closed.' };
    const borrower = loan.borrower || 'PERSONAL';
    const balance = Math.max(0, Math.floor(loan.principal));
    const payment = mode === 'BALANCE' ? balance : Math.min(balance, Math.max(1, Math.floor(loan.weeklyPayment)));
    if (payment <= 0) return { player, error: 'Nothing is left on that note.' };
    const house = borrower === 'HOUSE'
        ? (player.businesses || []).find(business => business.id === loan.businessId) || productionHouse(player)
        : undefined;
    const cash = borrower === 'HOUSE' ? (house?.balance || 0) : borrower === 'EMPIRE' ? readCompanyCash(player) : player.money;
    if (cash < payment) {
        return { player, error: borrower === 'HOUSE' ? 'The production house does not have that cash.' : borrower === 'EMPIRE' ? 'The company does not have that cash. Your personal money is untouched.' : 'Not enough personal cash.' };
    }
    const nextPrincipal = Math.max(0, balance - payment);
    const paidOff = nextPrincipal <= 0;
    const next: Player = {
        ...player,
        money: player.money,
        businesses: (player.businesses || []).map(business => ({ ...business })),
        finance: {
            ...player.finance,
            loans: (player.finance.loans || []).map(row => row.id === loan.id ? {
                ...row,
                principal: nextPrincipal,
                weeksRemaining: paidOff ? 0 : row.weeksRemaining,
                successfulPayments: row.successfulPayments + 1,
                status: paidOff ? 'PAID' as const : row.status,
            } : row),
            history: [...(player.finance.history || [])],
            credit: {
                ...(player.finance.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }),
                successfulPayments: (player.finance.credit?.successfulPayments || 0) + 1,
                totalRepaid: (player.finance.credit?.totalRepaid || 0) + payment,
            },
        },
        logs: [...(player.logs || [])],
        ownPlatform: player.ownPlatform ? { ...player.ownPlatform, books: player.ownPlatform.books ? { ...player.ownPlatform.books, lines: [...player.ownPlatform.books.lines] } : player.ownPlatform.books } : undefined,
    };
    if (borrower === 'HOUSE' && house) {
        next.businesses = next.businesses.map(business => business.id === house.id ? { ...business, balance: business.balance - payment } : business);
    } else if (borrower === 'EMPIRE') {
        addCompanyCash(next, -payment, paidOff ? `${loan.lenderName} paid off from company cash` : `${loan.lenderName} payment from company cash`, 'DEBT');
    } else {
        next.money -= payment;
    }
    if (borrower !== 'EMPIRE') pushHistory(next, -payment, `${loan.lenderName} ${paidOff ? 'payoff' : 'payment'} · ${borrower === 'HOUSE' ? 'production house' : 'personal'}`);
    next.logs = [...next.logs, { week: next.currentWeek, year: next.age, type: paidOff ? 'positive' as const : 'neutral' as const, message: paidOff ? `🏦 ${loan.lenderName} is paid off.` : `🏦 Paid $${payment.toLocaleString()} to ${loan.lenderName}.` }];
    return { player: next };
};

export interface DebtPicture {
    personal: number;
    house: number;
    empire: number;
    assumed: number;
    total: number;
    equity: number;
    ratio: number;
    weekly: number;
    upcoming: { id: string; lender: string; borrower: LoanBorrower; weekly: number; weeks: number; principal: number; status: PlayerLoan['status'] }[];
}

export const debtPicture = (player: Player): DebtPicture => {
    const sum = (borrower: LoanBorrower) => loansFor(player, borrower).reduce((total, loan) => total + loan.principal, 0);
    const personal = sum('PERSONAL');
    const house = sum('HOUSE');
    const empireLoans = sum('EMPIRE');
    const empire = empireLoans + (player.ownPlatform?.books?.debt || 0);
    const assumed = ((player.flags?.acquisitionDebts as { principal?: number }[]) || []).reduce((total, row) => total + Math.max(0, toFinite(row?.principal)), 0);
    const total = personal + house + empire + assumed;
    const equity = Math.max(0, getEstimatedNetWorth(player));
    const ratio = equity > 1000 ? total / equity : (total > 0 ? Number.POSITIVE_INFINITY : 0);
    const upcoming = (player.finance?.loans || [])
        .filter(loan => loan.status === 'ACTIVE' && loan.principal > 0)
        .map(loan => ({
            id: loan.id,
            lender: loan.lenderName,
            borrower: (loan.borrower || 'PERSONAL') as LoanBorrower,
            weekly: loan.weeklyPayment,
            weeks: loan.weeksRemaining,
            principal: loan.principal,
            status: loan.status,
        }));
    const facility = player.ownPlatform?.books?.debt || 0;
    const facilityRate = player.ownPlatform?.books?.facilityRate || 0.09;
    const facilityWeekly = facility > 0
        ? Math.round(facility * facilityRate / 52) + Math.min(facility, Math.max(25_000, Math.round(facility * 0.02)))
        : 0;
    const weekly = upcoming.reduce((total, row) => total + row.weekly, 0) + facilityWeekly
        + ((player.flags?.acquisitionDebts as { principal?: number; weeklyRate?: number }[]) || []).reduce((total, row) => total + Math.round(toFinite(row?.principal) * toFinite(row?.weeklyRate)), 0);
    return { personal, house, empire, assumed, total, equity, ratio, weekly, upcoming };
};

export const serviceWeeklyLoans = (
    player: Player,
    addTransaction: (amount: number, category: TransactionCategory, description: string) => void,
): { logs: { msg: string; type: 'positive' | 'negative' | 'neutral' }[]; shock: number } => {
    const logs: { msg: string; type: 'positive' | 'negative' | 'neutral' }[] = [];
    let shock = 0;
    if (!player.finance.credit) {
        player.finance.credit = { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
    }
    player.finance.loans = (player.finance.loans || []).map(loan => {
        if (loan.status !== 'ACTIVE') return loan;
        const borrower = loan.borrower || 'PERSONAL';
        const interestDue = Math.max(0, Math.round(loan.principal * (loan.annualInterestRate / 52)));
        const scheduled = Math.max(loan.weeklyPayment, interestDue + 1);
        const house = borrower === 'HOUSE'
            ? (player.businesses || []).find(business => business.id === loan.businessId) || productionHouse(player)
            : undefined;
        const available = borrower === 'HOUSE' ? (house?.balance || 0) : borrower === 'EMPIRE' ? readCompanyCash(player) : player.money;
        if (available >= scheduled) {
            if (borrower === 'HOUSE' && house) {
                house.balance -= scheduled;
                pushHistory(player, -scheduled, `${loan.lenderName} weekly payment from ${house.name}`);
            } else if (borrower === 'EMPIRE') {
                addCompanyCash(player, -scheduled, `${loan.lenderName} weekly payment from company cash`, 'DEBT');
            } else {
                addTransaction(-scheduled, 'LOAN', `${loan.lenderName} weekly loan payment`);
            }
            const principalPaid = Math.max(0, scheduled - interestDue);
            const newPrincipal = Math.max(0, loan.principal - principalPaid);
            const weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
            player.finance.credit.successfulPayments += 1;
            player.finance.credit.totalRepaid += scheduled;
            if (newPrincipal <= 0 || weeksRemaining === 0) {
                logs.push({ msg: `🏦 ${loan.lenderName} is paid off.`, type: 'positive' });
                return { ...loan, principal: 0, weeksRemaining: 0, successfulPayments: loan.successfulPayments + 1, status: 'PAID' as const };
            }
            return { ...loan, principal: newPrincipal, weeksRemaining, successfulPayments: loan.successfulPayments + 1 };
        }
        const lateFee = Math.max(1000, Math.round(loan.originalPrincipal * 0.01));
        const missedPayments = loan.missedPayments + 1;
        player.finance.credit.missedPayments += 1;
        player.stats.reputation = Math.max(0, player.stats.reputation - 2);
        player.stats.happiness = Math.max(0, player.stats.happiness - 3);
        shock -= borrower === 'PERSONAL' ? 0.02 : 0.035;
        logs.push({ msg: `⚠️ Missed a loan payment to ${loan.lenderName}. The tape will notice.`, type: 'negative' });
        if (missedPayments >= 3) {
            player.finance.credit.defaults += 1;
            player.stats.reputation = Math.max(0, player.stats.reputation - 8);
            shock -= 0.06;
            logs.push({ msg: `🚨 ${loan.lenderName} marked the loan in default.`, type: 'negative' });
            return { ...loan, principal: loan.principal + interestDue + lateFee, missedPayments, status: 'DEFAULTED' as const };
        }
        return { ...loan, principal: loan.principal + interestDue + lateFee, missedPayments };
    });
    return { logs, shock };
};
