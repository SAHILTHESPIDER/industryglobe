/**
 * The running board. Extra weeks keep the rate card and drain the company or the house.
 * The audience that has already seen the work returns less. Nothing here refuses a week
 * because a counter filled up.
 */
import type { MarketingCampaign, Player } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { addCompanyCash, readCompanyCash } from '../ownPlatform/companyCash';
import { contentVeto } from '../ownPlatform/stakeSale';
import { normalizeMarketing } from './core';
import { citiesForChannel, cleanLaunchFlight, flightMoney, launchChannel } from './launchCatalog';
import { placeLine, runFormat, sceneFor, RUN_FORMATS, type CampaignScene } from './sceneRegistry';

const roundK = (value: number) => Math.round(value / 1000) * 1000;

/** 1 on the first week of a fresh buy. Falls as weeks and extensions pile up. Never hits zero. */
export const fatigueFactor = (extensions: number, weekIndex: number): number => {
    const worn = Math.max(0, extensions) + Math.max(0, weekIndex - 1) * 0.35;
    return 1 / (1 + worn * 0.42);
};

/** Same media rate, plus a little overtime once the buy has already been lengthened. */
export const extendCost = (weekly: number, weeks: number, extensions: number): number => {
    if (!(weekly > 0) || !(weeks > 0)) return 0;
    const overtime = 1 + Math.min(0.35, Math.max(0, extensions) * 0.04);
    return Math.max(1000, roundK(weekly * weeks * overtime));
};

/** Prepaid weeks that have not aired. The week in progress is spent. A held flight has aired nothing. */
export const refundForStop = (weekly: number, bookedWeeks: number, elapsedWeeks: number, held: boolean): number => {
    if (!(weekly > 0) || !(bookedWeeks > 0)) return 0;
    if (held) return roundK(weekly * bookedWeeks);
    const future = Math.max(0, bookedWeeks - Math.max(1, elapsedWeeks));
    return roundK(weekly * future);
};

export interface RunCard {
    formatId: string;
    title: string;
    subtitle: string;
    place: string;
    scene: CampaignScene;
    cities: string[];
}

export interface RunBoard {
    ownerKind: 'EMPIRE' | 'HOUSE';
    ownerId: string;
    titleId: string;
    titleName: string;
    logo: string;
    status: 'RUNNING' | 'HELD' | 'STOPPED' | 'COMPLETE' | 'EMPTY';
    statusLine: string;
    week: number;
    bookedWeeks: number;
    weekly: number;
    extend1: number;
    extend4: number;
    refund: number;
    fatigue: number;
    reachFactor: number;
    cards: RunCard[];
    cash: number;
}

const nowOf = (player: Player) => getAbsoluteWeek(player.age || 18, player.currentWeek || 1);

const houseOf = (player: Player, ownerId: string) => (
    (player.businesses || []).find(business => business.id === ownerId && business.type === 'PRODUCTION_HOUSE')
);

const activeCampaigns = (player: Player, ownerKind: 'EMPIRE' | 'HOUSE', ownerId: string, titleId?: string) => {
    const desk = normalizeMarketing(player.marketing);
    return desk.campaigns.filter(campaign => {
        if (campaign.rival || campaign.ownerKind !== ownerKind) return false;
        if (ownerId && campaign.ownerId !== ownerId) return false;
        if (titleId && campaign.titleId !== titleId) return false;
        return campaign.status !== 'COMPLETE';
    });
};

const cardFor = (formatId: string, cityIds: string[], fallbackCity: string): RunCard | null => {
    const format = runFormat(formatId);
    const cities = cityIds.filter(id => sceneFor(formatId, id));
    const cityId = cities[0] || fallbackCity;
    const scene = sceneFor(formatId, cityId);
    if (!format || !scene) return null;
    return {
        formatId,
        title: format.name,
        subtitle: format.subtitle,
        place: placeLine(formatId, cities.length ? cities : [cityId]),
        scene,
        cities: cities.length ? cities : [cityId],
    };
};

const moneyLine = (board: Omit<RunBoard, 'extend1' | 'extend4' | 'refund' | 'reachFactor'> & { extensions: number; held: boolean; elapsed: number }): RunBoard => {
    const extend1 = extendCost(board.weekly, 1, board.extensions);
    const extend4 = extendCost(board.weekly, 4, board.extensions);
    const refund = board.status === 'STOPPED' || board.status === 'COMPLETE' || board.status === 'EMPTY'
        ? 0
        : refundForStop(board.weekly, board.bookedWeeks, board.elapsed, board.held);
    const reachFactor = fatigueFactor(board.extensions, Math.max(1, board.week));
    return { ...board, extend1, extend4, refund, reachFactor };
};

export const readRunBoard = (
    player: Player,
    ownerKind: 'EMPIRE' | 'HOUSE',
    ownerId: string,
    titleId?: string,
): RunBoard => {
    const cash = ownerKind === 'EMPIRE'
        ? readCompanyCash(player)
        : (houseOf(player, ownerId)?.balance || 0);
    const empty: RunBoard = {
        ownerKind, ownerId, titleId: titleId || '', titleName: '', logo: '',
        status: 'EMPTY', statusLine: 'NOTHING ON THE BOARDS', week: 0, bookedWeeks: 0,
        weekly: 0, extend1: 0, extend4: 0, refund: 0, fatigue: 0, reachFactor: 1, cards: [], cash,
    };
    if (ownerKind === 'EMPIRE') {
        const flight = cleanLaunchFlight(player.marketing?.launch);
        if (flight && (!titleId || flight.titleId === titleId || flight.what === 'PLATFORM')) {
            const now = nowOf(player);
            const held = Boolean(flight.held) && flight.stoppedAbsolute == null;
            const stopped = flight.stoppedAbsolute != null;
            const airStart = held ? 0 : (flight.airedAbsolute || flight.bookedAbsolute || 0);
            const raw = airStart <= 0 ? 0 : Math.max(1, now - airStart + 1);
            const elapsed = Math.min(flight.weeks, raw);
            const week = held ? 0 : elapsed;
            const status = stopped ? 'STOPPED' : held ? 'HELD' : raw > flight.weeks ? 'COMPLETE' : 'RUNNING';
            const formats = RUN_FORMATS.map(row => row.id).filter(id => flight.channelIds.includes(id));
            const cards = formats.flatMap(id => {
                const cities = citiesForChannel(id, flight.channelCities?.[id]?.length ? flight.channelCities[id] : flight.cityIds);
                const card = cardFor(id, cities, cities[0] || flight.cityIds[0] || 'bom');
                return card ? [card] : [];
            });
            const extensions = flight.extensions || 0;
            const logo = flight.titleName.trim().slice(0, 1).toUpperCase() || 'E';
            const statusLine = status === 'HELD'
                ? 'HELD · OPENS WITH THE SERVICE'
                : status === 'STOPPED'
                    ? `STOPPED · WEEK ${Math.max(1, week)} OF ${flight.weeks}`
                    : status === 'COMPLETE'
                        ? `COMPLETE · ${flight.weeks} WEEKS`
                        : `RUNNING · WEEK ${Math.max(1, week)} OF ${flight.weeks}`;
            return moneyLine({
                ownerKind, ownerId, titleId: flight.titleId, titleName: flight.titleName, logo,
                status, statusLine, week: Math.max(status === 'RUNNING' ? 1 : 0, week), bookedWeeks: flight.weeks,
                weekly: flight.weeklyBudget, fatigue: 1 - fatigueFactor(extensions, Math.max(1, week || 1)),
                cards, cash, extensions, held, elapsed,
            });
        }
    }
    const rows = activeCampaigns(player, ownerKind, ownerId, titleId);
    if (!rows.length) return empty;
    const sample = rows[0];
    const now = nowOf(player);
    const bookedWeeks = Math.max(...rows.map(row => Math.max(1, row.target.durationWeeks || 1)));
    const start = Math.min(...rows.map(row => row.startAbsolute));
    const held = start > now;
    const elapsed = held ? 0 : Math.max(1, Math.min(bookedWeeks, now - start + 1));
    const weekly = rows.reduce((sum, row) => sum + (row.chargeAmount / Math.max(1, row.target.durationWeeks || 1)), 0);
    const extensions = Math.max(...rows.map(row => row.extensions || 0));
    const cityIds = rows.flatMap(row => row.target.cityIds?.length ? row.target.cityIds : (row.target.cityId ? [row.target.cityId] : []));
    const uniqueCities = cityIds.filter((id, index) => cityIds.indexOf(id) === index);
    const formats = RUN_FORMATS.map(row => row.id).filter(id => rows.some(row => row.actionId === id));
    const cards = (formats.length ? formats : ['billboards']).flatMap(id => {
        const card = cardFor(id, uniqueCities.length ? uniqueCities : ['bom'], uniqueCities[0] || 'bom');
        return card ? [card] : [];
    });
    const logo = (sample.ownerName || sample.titleName).trim().slice(0, 1).toUpperCase() || 'H';
    const status = held ? 'HELD' : 'RUNNING';
    const statusLine = held
        ? 'HELD · NOT ON THE STREET YET'
        : `RUNNING · WEEK ${elapsed} OF ${bookedWeeks}`;
    return moneyLine({
        ownerKind, ownerId, titleId: sample.titleId, titleName: sample.titleName, logo,
        status, statusLine, week: held ? 0 : elapsed, bookedWeeks,
        weekly: roundK(weekly) || Math.round(weekly),
        fatigue: 1 - fatigueFactor(extensions, Math.max(1, elapsed || 1)),
        cards, cash, extensions, held, elapsed,
    });
};

const touchCampaign = (campaign: MarketingCampaign, weeks: number, extra: number) => {
    campaign.target = { ...campaign.target, durationWeeks: Math.max(1, (campaign.target.durationWeeks || 1) + weeks) };
    campaign.endAbsolute += weeks;
    campaign.extensions = (campaign.extensions || 0) + weeks;
    campaign.chargeAmount += extra;
    campaign.quote = {
        ...campaign.quote,
        saturation: Math.min(0.85, (campaign.quote.saturation || 0) + weeks * 0.05),
    };
};

const chargeEmpire = (player: Player, cost: number, label: string): string | null => {
    if (readCompanyCash(player) < cost) {
        const short = Math.ceil(cost - readCompanyCash(player));
        return `Company cash is short $${short.toLocaleString('en-US')}. Personal cash stays put.`;
    }
    const veto = contentVeto(player, cost);
    if (veto) return veto;
    const personal = player.money;
    addCompanyCash(player, -cost, label, 'BURN');
    player.money = personal;
    return null;
};

const chargeHouse = (player: Player, ownerId: string, cost: number, label: string): string | null => {
    const house = houseOf(player, ownerId);
    if (!house) return 'This production house is not on the books.';
    if ((house.balance || 0) < cost) {
        return `The house has $${Math.max(0, Math.floor(house.balance || 0)).toLocaleString('en-US')} and this costs $${Math.ceil(cost).toLocaleString('en-US')}. Personal cash and the production fund stay put.`;
    }
    const fund = house.studioState?.productionFund;
    house.balance -= cost;
    if (house.studioState && fund !== undefined) house.studioState.productionFund = fund;
    if (!house.studioState) {
        house.studioState = { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0, financeLedger: [] };
    }
    house.studioState.financeLedger = [{
        id: `mkt_ext_${player.currentWeek}_${Math.round(cost)}`,
        week: player.currentWeek,
        year: player.age,
        amount: -cost,
        type: 'MARKETING',
        label,
    }, ...(house.studioState.financeLedger || [])].slice(0, 200);
    return null;
};

const payHouse = (player: Player, ownerId: string, refund: number, label: string) => {
    const house = houseOf(player, ownerId);
    if (!house || refund <= 0) return;
    const fund = house.studioState?.productionFund;
    house.balance += refund;
    if (house.studioState && fund !== undefined) house.studioState.productionFund = fund;
    if (house.studioState) {
        house.studioState.financeLedger = [{
            id: `mkt_stop_${player.currentWeek}_${Math.round(refund)}`,
            week: player.currentWeek,
            year: player.age,
            amount: refund,
            type: 'MARKETING',
            label,
        }, ...(house.studioState.financeLedger || [])].slice(0, 200);
    }
};

export const extendRun = (
    player: Player,
    ownerKind: 'EMPIRE' | 'HOUSE',
    ownerId: string,
    weeks: number,
    titleId?: string,
): { player: Player; error?: string } => {
    const span = Math.max(1, Math.round(weeks));
    const board = readRunBoard(player, ownerKind, ownerId, titleId);
    if (board.status === 'EMPTY' || board.status === 'STOPPED' || board.status === 'COMPLETE') {
        return { player, error: 'Nothing is running to extend.' };
    }
    const priced = ownerKind === 'EMPIRE'
        ? extendCost(board.weekly, span, cleanLaunchFlight(player.marketing?.launch)?.extensions || 0)
        : extendCost(board.weekly, span, Math.max(0, ...activeCampaigns(player, ownerKind, ownerId, titleId).map(row => row.extensions || 0)));
    if (priced <= 0) return { player, error: 'This flight has no weekly media to lengthen.' };
    const next = JSON.parse(JSON.stringify(player)) as Player;
    const personal = next.money;
    const label = `Campaign +${span} week${span === 1 ? '' : 's'} · ${board.titleName}`;
    const error = ownerKind === 'EMPIRE' ? chargeEmpire(next, priced, label) : chargeHouse(next, ownerId, priced, label);
    if (error) return { player, error };
    next.money = personal;
    if (ownerKind === 'EMPIRE' && next.marketing?.launch) {
        const flight = cleanLaunchFlight(next.marketing.launch);
        if (!flight) return { player, error: 'The launch flight could not be read.' };
        const bump = Math.round((flight.subscribers / Math.max(1, flight.weeks)) * span * fatigueFactor(flight.extensions || 0, flight.weeks + 1));
        flight.weeks += span;
        flight.extensions = (flight.extensions || 0) + span;
        flight.totalCost += priced;
        flight.subscribers += bump;
        if (flight.demandUntil != null) flight.demandUntil += span;
        if (flight.appliedAbsolute != null && next.ownPlatform) {
            next.ownPlatform.subscribers = Math.max(0, Math.round((next.ownPlatform.subscribers || 0) + bump));
        }
        const ids = new Set(flight.campaignIds);
        const share = Math.round(priced / Math.max(1, ids.size));
        next.marketing = normalizeMarketing(next.marketing);
        next.marketing.campaigns.forEach(campaign => {
            if (ids.has(campaign.id)) touchCampaign(campaign, span, share);
        });
        next.marketing.launch = flight;
    } else {
        next.marketing = normalizeMarketing(next.marketing);
        const rows = next.marketing.campaigns.filter(campaign => (
            campaign.ownerKind === ownerKind && campaign.ownerId === ownerId && campaign.status !== 'COMPLETE'
            && (!titleId || campaign.titleId === titleId)
        ));
        const share = Math.round(priced / Math.max(1, rows.length));
        rows.forEach(campaign => touchCampaign(campaign, span, share));
    }
    next.money = personal;
    return { player: next };
};

export const stopRun = (
    player: Player,
    ownerKind: 'EMPIRE' | 'HOUSE',
    ownerId: string,
    titleId?: string,
): { player: Player; error?: string; refund?: number } => {
    const board = readRunBoard(player, ownerKind, ownerId, titleId);
    if (board.status === 'EMPTY' || board.status === 'STOPPED' || board.status === 'COMPLETE') {
        return { player, error: 'Nothing is running to stop.' };
    }
    const refund = board.refund;
    const next = JSON.parse(JSON.stringify(player)) as Player;
    const personal = next.money;
    const now = nowOf(next);
    if (ownerKind === 'EMPIRE') {
        if (refund > 0) addCompanyCash(next, refund, `Campaign stop · ${board.titleName}`, 'RECEIPTS');
        const flight = cleanLaunchFlight(next.marketing?.launch);
        if (flight) {
            flight.stoppedAbsolute = now;
            flight.held = false;
            flight.demandUntil = now - 1;
            if (flight.appliedAbsolute == null) flight.appliedAbsolute = now;
            const ids = new Set(flight.campaignIds);
            next.marketing = normalizeMarketing(next.marketing);
            next.marketing.campaigns.forEach(campaign => {
                if (!ids.has(campaign.id) || campaign.status === 'COMPLETE') return;
                campaign.status = 'COMPLETE';
                campaign.endAbsolute = Math.min(campaign.endAbsolute, now);
            });
            next.marketing.launch = flight;
        }
    } else {
        payHouse(next, ownerId, refund, `Campaign stop · ${board.titleName}`);
        next.marketing = normalizeMarketing(next.marketing);
        next.marketing.campaigns.forEach(campaign => {
            if (campaign.ownerKind !== ownerKind || campaign.ownerId !== ownerId) return;
            if (titleId && campaign.titleId !== titleId) return;
            if (campaign.status === 'COMPLETE') return;
            campaign.status = 'COMPLETE';
            campaign.endAbsolute = Math.min(campaign.endAbsolute, now);
        });
    }
    next.money = personal;
    return { player: next, refund };
};

export const formatRunMoney = (value: number) => flightMoney(value);

export const channelName = (id: string) => launchChannel(id)?.name || runFormat(id)?.name || id;
