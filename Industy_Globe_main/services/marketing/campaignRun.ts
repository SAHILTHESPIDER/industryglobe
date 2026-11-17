/**
 * The running board. Extra weeks keep the rate card and drain the company or the house.
 * The audience that has already seen the work returns less. Nothing here refuses a week
 * because a counter filled up.
 */
import type { MarketingCampaign, Player } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { addCompanyCash, readCompanyCash } from '../ownPlatform/companyCash';
import { contentVeto } from '../ownPlatform/stakeSale';
import { buildPoster, defaultCreative, normalizeMarketing } from './core';
import { citiesForChannel, cleanLaunchFlight, flightMoney, launchChannel, priceFlight } from './launchCatalog';
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

/** A one-night show has an opening price and no weekly rate. Extensions and refunds leave it alone. */
const openingOnly = (campaign: MarketingCampaign): boolean => {
    const channel = launchChannel(campaign.actionId);
    return Boolean(channel && !(channel.weekly > 0) && channel.opening > 0);
};

const weeklyShare = (campaign: MarketingCampaign): number => {
    if (openingOnly(campaign)) return 0;
    return campaign.chargeAmount / Math.max(1, campaign.target.durationWeeks || 1);
};

const citiesOf = (campaign: MarketingCampaign): string[] => (
    campaign.target.cityIds?.length
        ? campaign.target.cityIds
        : (campaign.target.cityId ? [campaign.target.cityId] : [])
);

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
    const weekly = rows.reduce((sum, row) => sum + weeklyShare(row), 0);
    const extensions = Math.max(...rows.map(row => row.extensions || 0));
    const formats = RUN_FORMATS.map(row => row.id).filter(id => rows.some(row => row.actionId === id));
    const cards = (formats.length ? formats : ['billboards']).flatMap(id => {
        const cityIds = rows.filter(row => row.actionId === id).flatMap(citiesOf);
        const unique = cityIds.filter((city, index) => cityIds.indexOf(city) === index);
        const card = cardFor(id, unique.length ? unique : ['bom'], unique[0] || 'bom');
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
        const media = rows.filter(row => !openingOnly(row));
        const share = Math.round(priced / Math.max(1, media.length));
        media.forEach(campaign => touchCampaign(campaign, span, share));
        rows.filter(openingOnly).forEach(campaign => {
            campaign.target = { ...campaign.target, durationWeeks: Math.max(1, (campaign.target.durationWeeks || 1) + span) };
            campaign.endAbsolute += span;
            campaign.extensions = (campaign.extensions || 0) + span;
        });
        if (ownerKind === 'HOUSE' && board.titleId) {
            const extensions = Math.max(0, ...rows.map(row => row.extensions || 0));
            const factor = fatigueFactor(extensions, Math.max(1, board.week + span));
            rows.forEach(campaign => {
                campaign.resolvedHype = Math.min(18, (campaign.resolvedHype || 0) + 1.2 * factor);
            });
            liftFilm(next, board.titleId, priced, extensions, Math.max(1, board.week));
        }
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

const FILM_CITIES: Record<string, string[]> = {
    airport_screens: ['bom', 'nyc', 'lon', 'par', 'dxb'],
    mall_screens: ['dxb'],
    city_screens: ['ber'],
    stunt: ['mad'],
    fan_fest: ['bom'],
    drone: ['par'],
    building_reveal: ['prg'],
    landmark_light: ['dxb'],
    billboards: ['nyc'],
};

const filmCityPool = () => [...new Set(Object.values(FILM_CITIES).flat())];

/** What the street costs a film before anyone is charged. */
export const filmStreetPrice = (): number => priceFlight({
    cityIds: filmCityPool(),
    channelIds: Object.keys(FILM_CITIES),
    weeks: 4,
    ratio: 1,
}).total;

const findFilm = (player: Player, titleId: string) => {
    const rows = [...(player.commitments || []), ...(player.activeReleases || [])];
    const row = rows.find(item => item.id === titleId);
    if (!row) return undefined;
    const details = row.projectDetails;
    return {
        id: titleId,
        name: details?.title || row.name || 'Untitled',
        image: (details as { image?: string } | undefined)?.image,
        row,
    };
};

/** Spend buys hype, then less. The cap is the one the weekly desk already uses. */
const liftFilm = (player: Player, titleId: string, spend: number, extensions: number, week: number) => {
    const factor = fatigueFactor(extensions, Math.max(1, week));
    const points = Math.round(Math.min(6, Math.log10(Math.max(10, spend)) * 0.42 * factor) * 10) / 10;
    const touch = (hidden: { rawHype?: number; marketingHypeAdded?: number; marketingLegs?: number } | undefined, buzz: number | undefined) => {
        if (!hidden) return buzz;
        const already = hidden.marketingHypeAdded || 0;
        const nextAdded = Math.min(24, already + points);
        const delta = nextAdded - already;
        hidden.marketingHypeAdded = nextAdded;
        hidden.rawHype = Math.max(0, Math.min(100, (hidden.rawHype ?? 50) + delta));
        hidden.marketingLegs = Math.min(1.12, 1 + Math.min(0.12, (nextAdded / 24) * factor));
        return Math.max(-20, Math.min(45, (buzz || 0) + delta));
    };
    (player.commitments || []).forEach(commitment => {
        if (commitment.id !== titleId) return;
        commitment.promotionalBuzz = touch(commitment.projectDetails?.hiddenStats, commitment.promotionalBuzz);
    });
    (player.activeReleases || []).forEach(release => {
        if (release.id !== titleId) return;
        release.promotionalBuzz = touch(release.projectDetails?.hiddenStats, release.promotionalBuzz);
    });
};

/** Puts a movie on the same street formats the streaming flight uses. The house pays. */
export const bookFilmRun = (player: Player, ownerId: string, titleId: string): { player: Player; error?: string } => {
    const house = houseOf(player, ownerId);
    if (!house) return { player, error: 'This production house is not on the books.' };
    const film = findFilm(player, titleId);
    if (!film) return { player, error: 'That film is not on the lot.' };
    const open = readRunBoard(player, 'HOUSE', ownerId, titleId);
    if (open.status === 'RUNNING' || open.status === 'HELD') return { player, error: 'This film is already on the boards.' };
    const quote = priceFlight({ cityIds: filmCityPool(), channelIds: Object.keys(FILM_CITIES), weeks: 4, ratio: 1 });
    if (quote.total <= 0) return { player, error: 'This flight has no price.' };
    const next = JSON.parse(JSON.stringify(player)) as Player;
    const personal = next.money;
    const fund = houseOf(next, ownerId)?.studioState?.productionFund;
    const error = chargeHouse(next, ownerId, quote.total, `Campaign · ${film.name}`);
    if (error) return { player, error };
    const booked = houseOf(next, ownerId);
    if (booked?.studioState && fund !== undefined) booked.studioState.productionFund = fund;
    next.money = personal;
    const now = nowOf(next);
    const creative = { ...defaultCreative(), tagline: film.name };
    const title = {
        id: film.id, name: film.name, genre: 'DRAMA', language: 'English', cast: [], director: '',
        banner: house.name, statusLine: 'Coming Soon' as const, ownerKind: 'HOUSE' as const, ownerId,
    };
    const poster = { ...buildPoster(title, creative), title: film.name, image: film.image };
    const desk = normalizeMarketing(next.marketing);
    const picked = quote.channels.filter(row => Object.prototype.hasOwnProperty.call(FILM_CITIES, row.id) && (row.spend > 0 || row.opening > 0));
    picked.forEach(row => {
        const cities = citiesForChannel(row.id, FILM_CITIES[row.id] || []);
        if (!cities.length) return;
        const weeklyCharge = Math.max(0, Math.round(row.spend * quote.weeks));
        const openingCharge = Math.max(0, Math.round(row.opening));
        const share = row.weekly > 0 ? Math.max(1000, weeklyCharge) : Math.max(1000, openingCharge);
        desk.campaigns.unshift({
            id: `film-${film.id}-${row.id}`.slice(0, 80),
            key: `film-${film.id}-${row.id}`,
            ownerKind: 'HOUSE',
            ownerId,
            ownerName: house.name.slice(0, 40),
            titleId: film.id,
            titleName: film.name.slice(0, 80),
            actionId: row.id,
            category: 'OUTDOOR',
            status: 'LIVE',
            startAbsolute: now,
            endAbsolute: now + quote.weeks - 1,
            charged: true,
            chargeAmount: share,
            creative,
            target: { regionId: 'WORLD', cityId: cities[0], cityIds: cities, durationWeeks: quote.weeks, startOffset: 0, audience: 'MASS' },
            quote: {
                cost: share, castFee: 0, reach: row.reach, reachLow: Math.round(row.reach * 0.74), reachHigh: Math.round(row.reach * 1.16),
                hype: 6, ticketInterest: 4, streamInterest: 2, competition: 0.1, saturation: 0, overexposed: false, notes: [],
            },
            roll: 1,
            resolvedReach: row.reach,
            resolvedHype: 4,
            resolvedTicket: 3,
            resolvedStream: 2,
            outcome: {
                reach: 0, hype: 0, ticketInterest: 0, streamInterest: 0, appliedWeeks: 0, overexposed: false, note: '',
                regions: [], channels: [],
            },
            castNames: [],
            poster,
            feedPostIds: [],
            rival: false,
        });
    });
    next.marketing = normalizeMarketing(desk);
    liftFilm(next, film.id, quote.total, 0, 1);
    next.money = personal;
    return { player: next };
};

export const formatRunMoney = (value: number) => flightMoney(value);

export const channelName = (id: string) => launchChannel(id)?.name || runFormat(id)?.name || id;
