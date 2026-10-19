import { Player, RivalPlatformState } from '../../types';
import { MARKET_COUNTRIES, hashString } from './catalog';
import { countryPiracy, quoteLaunch, selectedCountries } from './logic';
import { normalizeOwnPlatform } from './migrate';
import { settleBooks } from './studio';

export interface PlatformWeekNote {
    msg: string;
    type: 'positive' | 'negative' | 'neutral';
}

export interface PlatformWeekTransaction {
    amount: number;
    description: string;
}

export interface PlatformWeekResult {
    notes: PlatformWeekNote[];
    transactions: PlatformWeekTransaction[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resolveApplication = (player: Player, countryId: string, absoluteWeek: number) => {
    const country = MARKET_COUNTRIES.find(row => row.id === countryId);
    if (!country) return { status: 'REJECTED' as const, weeksLeft: 0, note: 'Unknown market.', refileWeekAbsolute: absoluteWeek + 8 };
    const roll = hashString(`${player.id}:${countryId}:${absoluteWeek}`) % 100;
    const bias = country.difficulty === 'OPEN' ? 0 : country.difficulty === 'CROWDED' ? 10 : country.difficulty === 'FOUGHT_OVER' ? 18 : 28;
    const approveLine = 62 - bias;
    const delayLine = approveLine + 16;
    const conditionLine = delayLine + 14;
    if (roll < approveLine) {
        return { status: 'APPROVED' as const, weeksLeft: 0, note: `${country.name} cleared the file.`, refileWeekAbsolute: undefined };
    }
    if (roll < delayLine) {
        return { status: 'DELAYED' as const, weeksLeft: 3, note: `${country.name} asked for another pass. Three more weeks.`, refileWeekAbsolute: undefined };
    }
    if (roll < conditionLine) {
        return { status: 'CONDITIONS' as const, weeksLeft: 0, note: `${country.name} will allow the service if you accept a higher access bill and a local-content promise.`, refileWeekAbsolute: undefined };
    }
    return { status: 'REJECTED' as const, weeksLeft: 0, note: `${country.name} sent the file back. You can try again in eight weeks.`, refileWeekAbsolute: absoluteWeek + 8 };
};

const tickRivals = (rivals: RivalPlatformState[], weekKey: string, pulseShift: { recession: number; inflation: number; connectivity: number; fatigue: number }): { rivals: RivalPlatformState[]; headline: string } => {
    const next = rivals.map(rival => ({ ...rival, languages: [...rival.languages] }));
    const active = next.filter(rival => rival.status === 'ACTIVE');
    if (active.length === 0) return { rivals: next, headline: 'The market went quiet.' };
    const focus = active[hashString(`${weekKey}:focus`) % active.length];
    const eventRoll = hashString(`${weekKey}:event`) % 100;
    let headline = `${focus.name} held its price at $${focus.monthlyPrice.toFixed(2)}.`;

    active.forEach(rival => {
        const drift = ((hashString(`${weekKey}:${rival.id}`) % 7) - 3) / 100;
        const connectivity = 1 + pulseShift.connectivity * 0.01;
        const recession = 1 - pulseShift.recession * 0.04;
        rival.householdsM = Math.max(0.05, rival.householdsM * (1 + drift) * connectivity * recession);
        if (pulseShift.inflation > 0.2 && rival.monthlyPrice > 0) {
            rival.monthlyPrice = Math.round(rival.monthlyPrice * 1.01 * 100) / 100;
        }
    });

    if (eventRoll < 12) {
        focus.monthlyPrice = Math.max(0, Math.round(focus.monthlyPrice * 0.85 * 100) / 100);
        focus.householdsM *= 1.04;
        focus.note = 'Cut the price. Neighbours feel it.';
        headline = `Price war: ${focus.name} dropped to $${focus.monthlyPrice.toFixed(2)} a month.`;
    } else if (eventRoll < 24) {
        focus.householdsM *= 1.08;
        focus.reputation = clamp(focus.reputation + 3, 1, 99);
        focus.note = 'A hit landed.';
        headline = `${focus.name} has a hit. Households moved.`;
    } else if (eventRoll < 34 && active.length > 8) {
        const preyPool = active.filter(rival => rival.tier === 'EMERGING' && rival.id !== focus.id);
        const prey = preyPool[hashString(`${weekKey}:prey`) % Math.max(1, preyPool.length)];
        if (prey && focus.tier !== 'EMERGING') {
            focus.householdsM += prey.householdsM * 0.7;
            prey.householdsM = 0;
            prey.status = 'ACQUIRED';
            prey.note = `Folded into ${focus.name}.`;
            headline = `${focus.name} acquired ${prey.name}.`;
        }
    } else if (eventRoll < 46) {
        focus.reputation = clamp(focus.reputation - 4, 1, 99);
        focus.note = 'A flagship licence expired.';
        headline = `${focus.name} lost a flagship licence.`;
    } else if (eventRoll < 58) {
        pulseShift.fatigue = clamp(pulseShift.fatigue + 0.04, 0, 0.8);
        headline = 'Subscription fatigue is in the papers again.';
    } else if (eventRoll < 70) {
        pulseShift.connectivity = clamp(pulseShift.connectivity + 0.03, 0, 1);
        headline = 'More homes came online this week.';
    } else if (eventRoll < 80) {
        pulseShift.recession = clamp(pulseShift.recession + 0.05, 0, 0.85);
        headline = 'A soft recession is squeezing household budgets.';
    } else if (eventRoll > 92) {
        pulseShift.recession = clamp(pulseShift.recession - 0.04, 0, 0.85);
        pulseShift.inflation = clamp(pulseShift.inflation + 0.03, 0, 0.8);
        headline = 'Spending thawed, and prices crept up.';
    }

    return { rivals: next, headline };
};

/**
 * Advances the shared streaming economy and the player's service.
 * Money is not touched here. The caller posts the returned transactions
 * through the existing USD ledger.
 * Rehearsals never call this.
 */
export const tickOwnPlatform = (player: Player, absoluteWeek: number): PlatformWeekResult => {
    if (!player.ownPlatform) return { notes: [], transactions: [] };
    player.ownPlatform = normalizeOwnPlatform(player.ownPlatform, player);
    const state = player.ownPlatform;
    const notes: PlatformWeekNote[] = [];
    const transactions: PlatformWeekTransaction[] = [];
    const weekKey = `${player.id}:${absoluteWeek}`;

    state.applications = state.applications.map(application => {
        if (application.status !== 'FILED' && application.status !== 'DELAYED') return application;
        if (application.weeksLeft > 1) {
            return { ...application, weeksLeft: application.weeksLeft - 1 };
        }
        const resolved = resolveApplication(player, application.countryId, absoluteWeek);
        const country = MARKET_COUNTRIES.find(row => row.id === application.countryId);
        notes.push({
            msg: resolved.note,
            type: resolved.status === 'APPROVED' ? 'positive' : resolved.status === 'REJECTED' ? 'negative' : 'neutral',
        });
        return {
            ...application,
            status: resolved.status,
            weeksLeft: resolved.weeksLeft,
            note: resolved.note,
            refileWeekAbsolute: resolved.refileWeekAbsolute,
            acceptedConditions: false,
        };
    });

    const pulse = { ...state.pulse };
    const rivalTick = tickRivals(state.rivals, weekKey, pulse);
    state.rivals = rivalTick.rivals;
    pulse.headline = rivalTick.headline;
    state.pulse = pulse;
    if (hashString(weekKey) % 3 === 0) {
        notes.push({ msg: rivalTick.headline, type: 'neutral' });
    }

    if (state.stage === 'CONSTRUCTING') {
        state.constructionWeeksLeft = Math.max(0, state.constructionWeeksLeft - 1);
        if (state.constructionWeeksLeft === 0) {
            state.stage = 'LIVE';
            state.weeksLive = 0;
            notes.push({ msg: `${state.name} is on. Opening night is no longer a rehearsal.`, type: 'positive' });
        } else if (state.constructionWeeksLeft === 4) {
            notes.push({ msg: `${state.name} has four weeks of construction left. The reserve is covering the burn.`, type: 'neutral' });
        }
    }

    if (state.stage === 'LIVE') {
        state.weeksLive += 1;
        const quote = quoteLaunch(player);
        const countries = selectedCountries(state).filter(country => {
            const application = state.applications.find(row => row.countryId === country.id);
            return application && (application.status === 'APPROVED' || (application.status === 'CONDITIONS' && application.acceptedConditions));
        });
        const piracy = countries.length
            ? countries.reduce((sum, country) => sum + countryPiracy(state, country), 0) / countries.length
            : quote.piracyShare;
        state.piracyShare = piracy;
        const pressure = clamp(state.enforcement * 0.45 + piracy * 80, 0, 100);
        state.customerPressure = pressure;
        const target = quote.households * (1 - pulse.recession * 0.15) * (pressure > 75 ? 0.9 : 1);
        const step = target > state.subscribers ? 0.18 : 0.08;
        state.subscribers = Math.max(0, Math.round(state.subscribers + (target - state.subscribers) * step));
        const revenue = Math.round(quote.forecastWeeklyRevenue * (quote.households > 0 ? state.subscribers / quote.households : 0));
        const burn = Math.round(quote.weeklyBurn);
        state.lastWeeklyRevenue = revenue;
        state.lastWeeklyBurn = burn;
        if (revenue > 0) transactions.push({ amount: revenue, description: `${state.name} subscriber and ad receipts` });
        if (burn > 0) transactions.push({ amount: -burn, description: `${state.name} network burn` });
        if (state.weeksLive === 1) {
            notes.push({ msg: `${state.name} took its first week of real money. Piracy kept ${Math.round(piracy * 100)}% of viewing off the ledger.`, type: revenue >= burn ? 'positive' : 'neutral' });
        } else if (pressure > 80) {
            notes.push({ msg: `Viewers are angry about enforcement on ${state.name}. Growth slowed.`, type: 'negative' });
        }
    }

    const books = settleBooks(player);
    notes.push(...books.notes);
    transactions.push(...books.transactions);

    return { notes, transactions };
};
