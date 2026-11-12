import { Player, RivalPlatformState } from '../../types';
import { MARKET_COUNTRIES, hashString } from './catalog';
import { decorateRival, driftFxRates, formatLocalAmount } from './fx';
import { publicBrandName } from '../rights/alterName';
import { identById } from './identEffects';
import { addCompanyCash } from './companyCash';
import { introSpan, localisationWeekly } from './commercial';
import { countryPiracy, formatCompact, quoteLaunch, selectedCountries } from './logic';
import { officeWeekly, rollWeeklyIncident } from './infrastructure';
import { normalizeOwnPlatform } from './migrate';
import { sportsViewerBump } from './stakeSale';
import { tickStreamRights } from './streamRights';
import { settleBooks } from './studio';
import { executiveModifiers, payExecutiveSalaries, tickExecContracts } from './executives';
import { factorsAreIdentity, platformFactors, stampPlatformRevenue, techWeeklyBill, tickPlatformDesk } from './platformDesk';

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

const tickRivals = (rivals: RivalPlatformState[], weekKey: string, pulseShift: { recession: number; inflation: number; connectivity: number; fatigue: number }, fxRates?: Record<string, number>): { rivals: RivalPlatformState[]; headline: string } => {
    const next = rivals.map(rival => decorateRival(rival, fxRates));
    const active = next.filter(rival => rival.status === 'ACTIVE');
    if (active.length === 0) return { rivals: next, headline: 'The market went quiet.' };
    const focus = active[hashString(`${weekKey}:focus`) % active.length];
    const eventRoll = hashString(`${weekKey}:event`) % 100;
    const focusLocal = formatLocalAmount(focus.localMonthlyPrice || 0, focus.currency || 'USD');
    const focusName = publicBrandName(focus.name);
    const focusUsd = Number.isFinite(focus.monthlyPrice) ? focus.monthlyPrice.toFixed(2) : '0.00';
    let headline = `${focusName} held its price at ${focusLocal} (${focusUsd} USD).`;

    active.forEach(rival => {
        const drift = ((hashString(`${weekKey}:${rival.id}`) % 7) - 3) / 100;
        const connectivity = 1 + pulseShift.connectivity * 0.01;
        const recession = 1 - pulseShift.recession * 0.04;
        rival.householdsM = Math.max(0.05, rival.householdsM * (1 + drift) * connectivity * recession);
        if (pulseShift.inflation > 0.2 && (rival.localMonthlyPrice || 0) > 0) {
            rival.localMonthlyPrice = Math.round((rival.localMonthlyPrice || 0) * 1.01 * 100) / 100;
        }
        const refreshed = decorateRival(rival, fxRates);
        rival.monthlyPrice = refreshed.monthlyPrice;
        rival.currency = refreshed.currency;
    });

    if (eventRoll < 12) {
        focus.localMonthlyPrice = Math.max(0, Math.round((focus.localMonthlyPrice || 0) * 0.85 * 100) / 100);
        const refreshed = decorateRival(focus, fxRates);
        focus.monthlyPrice = refreshed.monthlyPrice;
        focus.householdsM *= 1.04;
        focus.note = 'Cut the local price. Neighbours feel it.';
        headline = `Price war: ${focusName} dropped to ${formatLocalAmount(focus.localMonthlyPrice || 0, focus.currency || 'USD')} a month.`;
    } else if (eventRoll < 24) {
        focus.householdsM *= 1.08;
        focus.reputation = clamp(focus.reputation + 3, 1, 99);
        focus.note = 'A hit landed.';
        headline = `${focusName} has a hit. Households moved.`;
    } else if (eventRoll < 34 && active.length > 8) {
        const preyPool = active.filter(rival => rival.tier === 'EMERGING' && rival.id !== focus.id);
        const prey = preyPool[hashString(`${weekKey}:prey`) % Math.max(1, preyPool.length)];
        if (prey && focus.tier !== 'EMERGING') {
            focus.householdsM += prey.householdsM * 0.7;
            prey.householdsM = 0;
            prey.status = 'ACQUIRED';
            prey.note = `Folded into ${focusName}.`;
            headline = `${focusName} acquired ${publicBrandName(prey.name)}.`;
        }
    } else if (eventRoll < 46) {
        focus.reputation = clamp(focus.reputation - 4, 1, 99);
        focus.note = 'A flagship licence expired.';
        headline = `${focusName} lost a flagship licence.`;
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
 * Operating receipts and costs land in company cash. They are not returned
 * as personal transactions. Rehearsals never call this.
 */
export const tickOwnPlatform = (player: Player, absoluteWeek: number): PlatformWeekResult => {
    if (!player.ownPlatform) return { notes: [], transactions: [] };
    player.ownPlatform = normalizeOwnPlatform(player.ownPlatform, player);
    const state = player.ownPlatform;
    const notes: PlatformWeekNote[] = [];
    const transactions: PlatformWeekTransaction[] = [];
    const weekKey = `${player.id}:${absoluteWeek}`;

    if (state.releaseSlot && state.releaseSlot.weekOffset > 0) {
        state.releaseSlot = { ...state.releaseSlot, weekOffset: state.releaseSlot.weekOffset - 1 };
    }
    state.catalogue = state.catalogue.map(row => (
        typeof row.releaseWeekOffset === 'number' && row.releaseWeekOffset > 0
            ? { ...row, releaseWeekOffset: row.releaseWeekOffset - 1 }
            : row
    ));
    if (state.pendingDeal && state.releaseSlot) {
        state.pendingDeal = {
            ...state.pendingDeal,
            plan: { ...state.pendingDeal.plan, weekendOffset: state.releaseSlot.weekOffset },
        };
    }

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
    state.fxRates = driftFxRates(state.fxRates, weekKey);
    const rivalTick = tickRivals(state.rivals, weekKey, pulse, state.fxRates);
    state.rivals = rivalTick.rivals;
    pulse.headline = rivalTick.headline;
    state.pulse = pulse;
    if (hashString(weekKey) % 3 === 0) {
        notes.push({ msg: rivalTick.headline, type: 'neutral' });
    }

    notes.push(...tickPlatformDesk(player, absoluteWeek));

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
        const mods = executiveModifiers(state.boardTeam);
        const piracyRaw = countries.length
            ? countries.reduce((sum, country) => sum + countryPiracy(state, country), 0) / countries.length
            : quote.piracyShare;
        const piracy = clamp((Number.isFinite(piracyRaw) ? piracyRaw : 0) - mods.piracyCut, 0.02, 0.72);
        state.piracyShare = piracy;
        const pressure = clamp(state.enforcement * 0.45 + piracy * 80 - mods.pressureCut, 0, 100);
        state.customerPressure = pressure;
        if (mods.techCut > 0 && state.uptime != null) {
            state.uptime = Math.min(100, Math.round(state.uptime + mods.techCut * 20));
        }
        const marketingPull = Math.max(0, Math.min(0.1, state.marketingDemand || 0));
        const factors = platformFactors(state);
        const shaped = !factorsAreIdentity(factors);
        const target = quote.households * (1 - pulse.recession * 0.15) * (pressure > 75 ? 0.9 : 1) * (1 + marketingPull) * (1 + mods.reach) * (shaped ? factors.demand : 1);
        const ident = identById(state.identId);
        const beforeSubs = state.subscribers;
        const growing = target > state.subscribers;
        const step = growing
            ? 0.18 * (shaped ? Math.min(1.15, factors.retention) : 1)
            : clamp((0.08 / Math.max(0.5, ident.retention)) * (shaped ? (2 - factors.retention) : 1), 0.04, 0.2);
        state.subscribers = Math.max(0, Math.round(state.subscribers + (target - state.subscribers) * step));
        state.subscribers += sportsViewerBump(state);
        const scale = quote.households > 0 ? state.subscribers / quote.households : 0;
        const adPart = quote.revenueParts.ads * scale * (shaped ? factors.adBoost : 1);
        const otherPart = (quote.forecastWeeklyRevenue - quote.revenueParts.ads) * scale;
        const revenueRaw = Math.round((shaped ? (adPart + otherPart) * factors.quality : quote.forecastWeeklyRevenue * scale) * (1 + mods.quality));
        const burnRaw = Math.round(quote.weeklyBurn * (1 - mods.costCut));
        const revenue = Number.isFinite(revenueRaw) ? revenueRaw : 0;
        const burn = Number.isFinite(burnRaw) ? burnRaw : 0;
        const officeRent = Math.round(officeWeekly(state) * (1 - mods.costCut));
        const locBill = Math.round(localisationWeekly(state) * (1 - mods.costCut));
        const infraBill = Math.max(0, Math.round(Math.max(0, burn - locBill - officeRent) * (1 - mods.techCut) * (shaped ? factors.bandwidth : 1)));
        const techBill = Math.round(techWeeklyBill(state));
        state.lastWeeklyRevenue = revenue;
        state.lastWeeklyBurn = infraBill + locBill + officeRent;
        if (revenue > 0) addCompanyCash(player, revenue, `${state.name} subscriber, ad, pass, and store receipts`, 'RECEIPTS');
        if (infraBill > 0) addCompanyCash(player, -infraBill, `${state.name} server racks and cloud`, 'BURN');
        if (locBill > 0) addCompanyCash(player, -locBill, `${state.name} subtitles and dubs`, 'BURN');
        if (officeRent > 0) addCompanyCash(player, -officeRent, `${state.name} country office rent`, 'BURN');
        if (techBill > 0) addCompanyCash(player, -techBill, `${state.name} tech running cost`, 'BURN');
        state.lastWeeklyBurn += techBill;
        stampPlatformRevenue(state, state.subscribers, quote.households, quote.revenueParts.ads * (shaped ? factors.adBoost : 1), quote.revenueParts.subscriptions, Math.max(0, beforeSubs - state.subscribers));
        if (state.weeksLive === 1) {
            notes.push({ msg: `${state.name} took its first week of real money. Piracy kept ${Math.round(piracy * 100)}% of viewing off the ledger.`, type: revenue >= burn ? 'positive' : 'neutral' });
            const span = introSpan(state);
            if (span > 0) notes.push({ msg: `${state.name} is on an intro price. Full price returns after ${span} weeks.`, type: 'neutral' });
            if (localisationWeekly(state) > 0) notes.push({ msg: 'Subtitles and dubs are on the weekly bill.', type: 'neutral' });
        } else if (introSpan(state) > 0 && state.weeksLive === introSpan(state) + 1) {
            notes.push({ msg: `${state.name} intro prices ended. New weeks bill the full plan.`, type: 'neutral' });
        } else if (pressure > 80) {
            notes.push({ msg: `Viewers are angry about enforcement on ${state.name}. Growth slowed.`, type: 'negative' });
        }
    }

    if (state.stage !== 'LIVE') {
        const officeCut = 1 - executiveModifiers(state.boardTeam).costCut;
        const officeRent = Math.round(officeWeekly(state) * officeCut);
        if (officeRent > 0) {
            addCompanyCash(player, -officeRent, `${state.name} country office rent`, 'BURN');
            notes.push({ msg: `Country offices cost ${formatCompact(officeRent)} this week, from company cash.`, type: 'neutral' });
        }
        state.lastWeeklyBurn = officeRent;
    }

    notes.push(...tickExecContracts(player));
    const payroll = payExecutiveSalaries(player);
    notes.push(...payroll.notes);

    const rolled = rollWeeklyIncident(player.ownPlatform, weekKey, player.currentWeek, player.age);
    player.ownPlatform = rolled.state;
    if (payroll.paid > 0 && player.ownPlatform) {
        player.ownPlatform.lastWeeklyBurn = (player.ownPlatform.lastWeeklyBurn || 0) + payroll.paid;
    }
    if (rolled.note) notes.push({ msg: rolled.note, type: 'negative' });

    notes.push(...tickStreamRights(player, absoluteWeek));

    const books = settleBooks(player);
    notes.push(...books.notes);
    transactions.push(...books.transactions);

    return { notes, transactions };
};
