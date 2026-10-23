import {
    Business, CommissionBrief, CommissionControls, CommissionDeskState, CommissionLedgerLine, CommissionPayModel,
    CommissionProject, CommissionScoreLine, CommissionSeat, CommissionTerms, Genre, IndustryDeal, Player, Script,
    XPost,
} from '../../types';
import { createBusiness } from '../businessLogic';
import { getAbsoluteWeek } from '../legacyLogic';
import { createRivalRoster, hashString } from '../ownPlatform/catalog';
import { ensureOwnPlatform } from '../ownPlatform/migrate';
import { displayTitle, IpRecord } from '../rights/catalogue';
import { rightsOf } from '../rights/logic';
import {
    SIGN_THRESHOLD, controlSteps, counterCost, displayedWinChance, emptyControls,
    hitBonusFor, licenceFor, marketChance, offerChance, payableOf, premiumFor,
    priceFitFrom, productionBudget, seasonBonusFor, seasonPipelineWeeks, shootWeeksFor, scoreStudio, speedFitFrom,
    trancheOf,
} from './formulas';

export interface CommissionResult {
    player: Player;
    error?: string;
    note?: string;
}

const AI_HOUSES: { id: string; name: string; reputation: number; relationship: number }[] = [
    { id: 'aurora', name: 'Aurora Pictures', reputation: 76, relationship: 68 },
    { id: 'lotus', name: 'Lotus Gate', reputation: 64, relationship: 55 },
    { id: 'northline', name: 'Northline', reputation: 58, relationship: 48 },
    { id: 'monsoon', name: 'Monsoon House', reputation: 70, relationship: 62 },
    { id: 'red-lantern', name: 'Red Lantern', reputation: 54, relationship: 44 },
];

const EXECS: [string, string][] = [
    ['Dana Whitlock', 'VP International Originals'],
    ['Arun Mehta', 'Head of India Originals'],
    ['Lila Cho', 'Director of Series'],
    ['Mateo Ruiz', 'VP Film'],
    ['Noor El-Sayed', 'Commissioning Editor'],
    ['Hanae Sato', 'Head of Local Originals'],
    ['Chris Pell', 'SVP Global Series'],
];

const PLATFORM_LOOK: Record<string, string> = {
    netflix: '#E50914',
    prime: '#00A8E1',
    hotstar: '#1E3A8A',
    disney: '#1D4ED8',
    apple: '#A1A1AA',
    max: '#7C3AED',
    hulu: '#1CE783',
    paramount: '#0064FF',
};

const ORIGINAL_TITLES = [
    'Glass Orchard', 'After the Siren', 'Night Market', 'Salt Vow', 'Paper Kingdom',
    'Low Tide', 'The Last Gate', 'Red Courtyard', 'Monsoon Office', 'White Harbour',
];

const ADAPT_TITLES: Record<string, string> = {
    book_pd_mahabharata_62: 'KARNA',
    book_pd_ramayana_63: 'SITA',
    'book_pd_journey-to-the-west_78': 'THE MONKEY KING',
};

const GENRES: Genre[] = ['DRAMA', 'THRILLER', 'CRIME', 'ACTION', 'FANTASY', 'SCI_FI', 'ROMANCE', 'ADVENTURE'];

const clone = (player: Player): Player => JSON.parse(JSON.stringify(player));

const roll = (key: string) => (hashString(key) % 10000) / 10000;

const nowOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);

export const houseOf = (player: Player): Business | undefined =>
    (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.studioState);

const saveHouse = (player: Player, house: Business) => {
    player.businesses = (player.businesses || []).map(business => business.id === house.id ? house : business);
};

export const emptyDesk = (): CommissionDeskState => ({
    version: 1,
    briefs: [],
    projects: [],
    feed: [],
    platformHoldings: [],
    cooldowns: [],
    relationships: {},
    reputation: 48,
    hitWeeks: [],
});

const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/** Old saves have no desk. Partial desks keep the fields that were written. */
export const normalizeDesk = (raw: Partial<CommissionDeskState> | undefined | null): CommissionDeskState => {
    const blank = emptyDesk();
    if (!raw || typeof raw !== 'object') return blank;
    return {
        version: 1,
        briefs: Array.isArray(raw.briefs) ? raw.briefs : [],
        projects: Array.isArray(raw.projects) ? raw.projects : [],
        feed: Array.isArray(raw.feed) ? raw.feed : [],
        platformHoldings: Array.isArray(raw.platformHoldings) ? raw.platformHoldings : [],
        cooldowns: Array.isArray(raw.cooldowns) ? raw.cooldowns : [],
        relationships: raw.relationships && typeof raw.relationships === 'object' ? raw.relationships : {},
        reputation: clampRep(num(raw.reputation, blank.reputation)),
        hitWeeks: Array.isArray(raw.hitWeeks) ? raw.hitWeeks.filter(week => typeof week === 'number') : [],
        lastRollWeek: typeof raw.lastRollWeek === 'number' ? raw.lastRollWeek : undefined,
    };
};

const clampRep = (value: number) => Math.max(1, Math.min(99, Math.round(value)));

export const deskOf = (player: Player): CommissionDeskState => normalizeDesk(player.commissionDesk);

const write = (player: Player, desk: CommissionDeskState) => {
    player.commissionDesk = desk;
};

export const platformRoster = () => createRivalRoster().map(row => ({
    ...row,
    color: PLATFORM_LOOK[row.id] || '#8B7BFF',
}));

const hitsLast52 = (desk: CommissionDeskState, absolute: number) =>
    desk.hitWeeks.filter(week => absolute - week <= 52).length;

const relationshipOf = (desk: CommissionDeskState, platformId: string) =>
    desk.relationships[platformId] ?? 42;

const shiftRelationship = (desk: CommissionDeskState, platformId: string, delta: number) => {
    const next = clampRep(relationshipOf(desk, platformId) + delta);
    desk.relationships = { ...desk.relationships, [platformId]: next };
};

const logLine = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    player.logs = [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type }].slice(-50);
};

const pushUsd = (player: Player, amount: number, description: string) => {
    if (!player.finance) return;
    if (!Array.isArray(player.finance.history)) player.finance.history = [];
    player.finance.history.unshift({
        id: `tx_commission_${nowOf(player)}_${hashString(description + amount)}`,
        week: player.currentWeek,
        year: player.age,
        amount: Math.trunc(amount),
        category: 'BUSINESS',
        description,
    });
    player.finance.history = player.finance.history.slice(0, 200);
};

const pushStudioLedger = (
    house: Business,
    player: Player,
    amount: number,
    type: 'COMMISSION' | 'PENALTY' | 'BONUS' | 'RESERVE' | 'PRODUCTION_SPEND',
    label: string,
    projectId: string,
) => {
    if (!house.studioState) return;
    const ledger = Array.isArray(house.studioState.financeLedger) ? house.studioState.financeLedger : [];
    house.studioState.financeLedger = [{
        id: `studio_commission_${projectId}_${ledger.length}_${player.currentWeek}`,
        week: player.currentWeek,
        year: player.age,
        amount,
        type,
        label,
        projectId,
    }, ...ledger].slice(0, 200);
};

const pushFeed = (desk: CommissionDeskState, player: Player, deal: Omit<IndustryDeal, 'id' | 'week' | 'year'>) => {
    desk.feed = [{
        id: `deal_${nowOf(player)}_${hashString(deal.headline)}`,
        week: player.currentWeek,
        year: player.age,
        ...deal,
    }, ...desk.feed].slice(0, 40);
};

const pushNews = (player: Player, headline: string, impact: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM') => {
    if (!Array.isArray(player.news)) player.news = [];
    player.news.unshift({
        id: `news_commission_${nowOf(player)}_${hashString(headline)}`,
        headline,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: impact,
    });
    player.news = player.news.slice(0, 80);
    if (!player.x) return;
    const post: XPost = {
        id: `x_commission_${nowOf(player)}_${hashString(headline)}`,
        authorId: 'trades_desk',
        authorName: 'Trades',
        authorHandle: '@TradesDesk',
        authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TradesDesk',
        content: headline,
        timestamp: Date.now(),
        likes: 1800 + (hashString(headline) % 9000),
        retweets: 400 + (hashString(headline) % 2000),
        replies: 60 + (hashString(headline) % 400),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'FILM_OPINION',
        sentiment: 'INDUSTRY',
    };
    player.x.feed = [post, ...(player.x.feed || [])].slice(0, 80);
};

const inboxFor = (player: Player, brief: CommissionBrief) => {
    if (!Array.isArray(player.inbox)) player.inbox = [];
    const id = `msg_commission_${brief.id}`;
    if (player.inbox.some(message => message.id === id)) return;
    const fee = payableOf(brief.baseTerms);
    player.inbox.unshift({
        id,
        sender: `${brief.execName}, ${brief.platformName}`,
        subject: `${brief.platformName} wants ${brief.title}`,
        text: `${brief.pitch}\n\n${brief.execTitle}. ${formatChip(brief)} Fee ${usd(fee)}. Closes in ${Math.max(0, brief.closesWeek - nowOf(player))} weeks.\n\nOpen it from Production House → Offers, or use the button below.`,
        type: 'OFFER_COMMISSION',
        data: { briefId: brief.id },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: Math.max(1, brief.closesWeek - nowOf(player)),
    });
    player.inbox = player.inbox.slice(0, 120);
};

export const usd = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
    return `${sign}$${Math.round(abs)}`;
};

const formatChip = (brief: CommissionBrief) => brief.format === 'SERIES'
    ? `${brief.seasons} seasons × ${brief.episodes} × ${brief.runtimeMin}m`
    : `Film · ${brief.runtimeMin}m`;

const termsFor = (
    budget: number,
    reputation: number,
    model: CommissionPayModel,
    weeks: number,
    series: boolean,
    exclusivity: boolean,
    territories: string,
): CommissionTerms => {
    const premium = premiumFor(budget, reputation);
    return {
        payModel: model,
        budget,
        premiumPct: budget > 0 ? Math.round((premium / budget) * 1000) / 10 : 8,
        premium,
        licenceFee: licenceFor(budget),
        weeks,
        exclusivity,
        territories,
        controls: emptyControls(),
        hitBonus: hitBonusFor(budget),
        season2Bonus: series ? seasonBonusFor(budget) : 0,
    };
};

const applyAsk = (base: CommissionTerms, extraPremiumPct: number, extraWeeks: number, controls: CommissionControls): CommissionTerms => {
    const premiumPct = Math.round((base.premiumPct + extraPremiumPct) * 10) / 10;
    return {
        ...base,
        premiumPct,
        premium: Math.round(base.budget * premiumPct / 100),
        licenceFee: Math.round(base.licenceFee * (1 + extraPremiumPct / 100)),
        weeks: base.weeks + extraWeeks,
        controls: { ...controls },
    };
};

export const quoteCounter = (
    brief: CommissionBrief,
    desk: CommissionDeskState,
    extraPremiumPct: number,
    extraWeeks: number,
    controls: CommissionControls,
) => {
    const steps = controlSteps(brief.baseTerms.controls, controls);
    const rounds = brief.counterRounds + 1;
    const penalty = counterCost(extraPremiumPct, extraWeeks, steps, rounds);
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER').length;
    const chance = displayedWinChance(desk.reputation, relationshipOf(desk, brief.platformId), rivals, penalty);
    const ask = applyAsk(brief.baseTerms, extraPremiumPct, extraWeeks, controls);
    return {
        chance,
        penalty,
        ask,
        steps,
        rounds,
        breakdown: {
            countering: 12 * rounds,
            premium: 0.5 * extraPremiumPct,
            weeks: extraWeeks,
            controls: 10 * steps,
        },
    };
};

const asIsChance = (brief: CommissionBrief, desk: CommissionDeskState) => {
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER').length;
    return displayedWinChance(desk.reputation, relationshipOf(desk, brief.platformId), rivals, 0);
};

export const winChanceFor = (brief: CommissionBrief, desk: CommissionDeskState) => {
    if (brief.status === 'REPLIED' && brief.playerAsk && brief.platformReply) {
        const extraP = Math.max(0, brief.platformReply.premiumPct - brief.baseTerms.premiumPct);
        const extraW = Math.max(0, brief.platformReply.weeks - brief.baseTerms.weeks);
        const steps = controlSteps(brief.baseTerms.controls, brief.platformReply.controls);
        const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER').length;
        return displayedWinChance(
            desk.reputation,
            relationshipOf(desk, brief.platformId),
            rivals,
            counterCost(extraP, extraW, steps, Math.max(1, brief.counterRounds)),
        );
    }
    if (brief.playerAsk) {
        const extraP = Math.max(0, brief.playerAsk.premiumPct - brief.baseTerms.premiumPct);
        const extraW = Math.max(0, brief.playerAsk.weeks - brief.baseTerms.weeks);
        const steps = controlSteps(brief.baseTerms.controls, brief.playerAsk.controls);
        const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER').length;
        return displayedWinChance(
            desk.reputation,
            relationshipOf(desk, brief.platformId),
            rivals,
            counterCost(extraP, extraW, steps, Math.max(1, brief.counterRounds)),
        );
    }
    return asIsChance(brief, desk);
};

const lineOf = (reputation: number, price: number, speed: number, relationship: number): CommissionScoreLine => ({
    reputation: Math.round(reputation),
    price: Math.round(price),
    speed: Math.round(speed),
    relationship: Math.round(relationship),
});

const seatScore = (seat: CommissionSeat, weekKey: string) => {
    const noise = (hashString(`${weekKey}:${seat.id}`) % 7) - 3;
    return scoreStudio(seat.reputation, priceFitFrom(seat.extraPremium), speedFitFrom(seat.extraWeeks), seat.relationship, noise);
};

const pickSeats = (key: string, hungry: boolean): CommissionSeat[] => {
    const count = 1 + (hashString(`${key}:n`) % 4);
    const pool = [...AI_HOUSES].sort((a, b) => hashString(`${key}:${a.id}`) - hashString(`${key}:${b.id}`));
    return pool.slice(0, count).map(house => ({
        id: house.id,
        name: house.name,
        reputation: hungry ? Math.min(92, house.reputation + 6) : house.reputation - 8,
        relationship: house.relationship,
        responded: false,
        extraPremium: hungry ? 10 : 16,
        extraWeeks: hungry ? 2 : 4,
        controlSteps: hashString(`${key}:${house.id}:c`) % 5 === 0 ? 1 : 0,
    }));
};

const playerSeat = (desk: CommissionDeskState, platformId: string): CommissionSeat => ({
    id: 'PLAYER',
    name: 'Your house',
    reputation: desk.reputation,
    relationship: relationshipOf(desk, platformId),
    responded: false,
    extraPremium: 0,
    extraWeeks: 0,
    controlSteps: 0,
});

interface BriefSeed {
    platformId: string;
    format?: 'FILM' | 'SERIES';
    title?: string;
    genre?: Genre;
    logline?: string;
    seasons?: number;
    episodes?: number;
    runtimeMin?: number;
    rightsIpId?: string;
    rightsTitle?: string;
    publicDomain?: boolean;
    direction?: 'IN' | 'OUT';
    targetHouseId?: string;
    targetHouseName?: string;
    hungry?: boolean;
    openedWeek?: number;
    id?: string;
}

const buildBrief = (player: Player, desk: CommissionDeskState, seed: BriefSeed): CommissionBrief => {
    const roster = platformRoster();
    const platform = roster.find(row => row.id === seed.platformId) || roster[0];
    const key = seed.id || `brief_${platform.id}_${nowOf(player)}_${hashString(seed.title || platform.id + player.currentWeek)}`;
    const format = seed.format || (hashString(key + 'fmt') % 5 < 3 ? 'SERIES' : 'FILM');
    const episodes = format === 'SERIES'
        ? (seed.episodes || (6 + (hashString(key + 'ep') % 19) + (hashString(key + 'plus') % 11 === 0 ? 4 : 0)))
        : 1;
    const seasons = format === 'SERIES' ? (seed.seasons || (1 + (hashString(key + 'sea') % 3))) : 1;
    const runtimeMin = seed.runtimeMin || [24, 32, 42, 48, 55, 63, 74][hashString(key + 'rt') % 7];
    const genre = seed.genre || GENRES[hashString(key + 'g') % GENRES.length];
    const budget = productionBudget(format, genre, episodes, seasons, platform.tier, platform.householdsM, roll(key + 'bud'));
    const pipeline = seasonPipelineWeeks(episodes) * Math.max(1, seasons);
    const model: CommissionPayModel = hashString(key + 'pay') % 2 === 0 ? 'COST_PLUS' : 'LICENCE';
    const exclusivity = platform.tier === 'GLOBAL' || hashString(key + 'ex') % 3 !== 0;
    const territories = exclusivity ? `${platform.homeRegion.replace(/_/g, ' ')} and worldwide` : platform.homeRegion.replace(/_/g, ' ');
    const baseTerms = termsFor(budget, desk.reputation, model, pipeline + 4, format === 'SERIES', exclusivity, territories);
    const exec = EXECS[hashString(key + 'ex') % EXECS.length];
    const title = seed.title || ORIGINAL_TITLES[hashString(key + 'ti') % ORIGINAL_TITLES.length];
    const openedWeek = seed.openedWeek ?? nowOf(player);
    const seats = seed.direction === 'OUT'
        ? []
        : [playerSeat(desk, platform.id), ...pickSeats(key, Boolean(seed.hungry))];
    const logline = seed.logline || (seed.rightsTitle
        ? `${platform.name} owns ${seed.rightsTitle} and wants ${title} built for the service.`
        : `An original ${genre.toLowerCase().replace('_', ' ')} for ${platform.name}.`);
    return {
        id: key,
        direction: seed.direction || 'IN',
        platformId: platform.id,
        platformName: platform.name,
        platformColor: platform.color,
        execName: exec[0],
        execTitle: exec[1],
        format,
        title,
        genre,
        logline,
        seasons,
        episodes,
        runtimeMin,
        rightsIpId: seed.rightsIpId,
        rightsTitle: seed.rightsTitle,
        publicDomain: seed.publicDomain,
        openedWeek,
        closesWeek: openedWeek + 4,
        baseTerms,
        status: 'OPEN',
        seats,
        counterRounds: 0,
        targetHouseId: seed.targetHouseId,
        targetHouseName: seed.targetHouseName,
        pitch: seed.rightsTitle
            ? `${platform.name} owns ${seed.rightsTitle}. They want you to make ${title}.`
            : `${platform.name} wants ${title} for the slate.`,
    };
};

const rememberHolding = (
    desk: CommissionDeskState,
    ipId: string,
    title: string,
    platformId: string,
    platformName: string,
    status: 'OPTION' | 'OWNED',
    publicDomain: boolean,
    week: number,
) => {
    desk.platformHoldings = [
        { ipId, title, platformId, platformName, status, publicDomain, week },
        ...desk.platformHoldings.filter(row => !(row.ipId === ipId && row.platformId === platformId)),
    ].slice(0, 80);
};

const syncHoldings = (player: Player, desk: CommissionDeskState) => {
    const roster = platformRoster();
    const names = new Map(roster.map(row => [row.name, row]));
    (player.businesses || []).forEach(business => {
        rightsOf(business).holdings.forEach(holding => {
            if (holding.owner !== 'RIVAL' || !holding.rivalName) return;
            if (holding.status !== 'OWNED' && holding.status !== 'OPTION') return;
            const platform = names.get(holding.rivalName);
            if (!platform) return;
            if (desk.platformHoldings.some(row => row.ipId === holding.ipId && row.platformId === platform.id)) return;
            rememberHolding(desk, holding.ipId, holding.ipId, platform.id, platform.name, holding.status, false, nowOf(player));
        });
    });
};

export const notePlatformBuy = (
    player: Player,
    ip: { id: string; proper: string; publicDomain: boolean },
    platformName: string,
    status: 'OPTION' | 'OWNED',
) => {
    const desk = deskOf(player);
    const platform = platformRoster().find(row => row.name === platformName);
    if (!platform) return;
    rememberHolding(desk, ip.id, ip.proper, platform.id, platform.name, status, ip.publicDomain, nowOf(player));
    write(player, desk);
};

const concession = (seat: CommissionSeat, weeksOpen: number): CommissionSeat => ({
    ...seat,
    responded: weeksOpen >= 0,
    extraPremium: Math.max(0, seat.extraPremium - weeksOpen * 5),
    extraWeeks: Math.max(0, seat.extraWeeks - weeksOpen),
});

const activeSeats = (brief: CommissionBrief, weeksOpen: number, desk: CommissionDeskState) => {
    const seats = brief.seats.map(seat => {
        if (seat.id === 'PLAYER') {
            const responded = brief.status === 'REPLIED' || brief.status === 'CONTRACT' || brief.counterRounds > 0;
            if (!responded) return { ...seat, responded: false };
            const terms = brief.platformReply || brief.playerAsk || brief.baseTerms;
            return {
                ...seat,
                responded: true,
                reputation: desk.reputation,
                relationship: relationshipOf(desk, brief.platformId),
                extraPremium: Math.max(0, terms.premiumPct - brief.baseTerms.premiumPct),
                extraWeeks: Math.max(0, terms.weeks - brief.baseTerms.weeks),
                controlSteps: controlSteps(brief.baseTerms.controls, terms.controls),
            };
        }
        if (weeksOpen < 1 && !brief.id.startsWith('seed-lose')) return { ...seat, responded: false };
        return concession(seat, Math.max(0, weeksOpen));
    });
    return seats;
};

const scoreLines = (seat: CommissionSeat) => lineOf(
    seat.reputation,
    priceFitFrom(seat.extraPremium),
    speedFitFrom(seat.extraWeeks),
    seat.relationship,
);

const loseBrief = (player: Player, desk: CommissionDeskState, brief: CommissionBrief, winner: CommissionSeat, weeksOpen: number) => {
    const you = brief.seats.find(seat => seat.id === 'PLAYER');
    const playerSeatNow = you
        ? activeSeats(brief, weeksOpen, desk).find(seat => seat.id === 'PLAYER') || you
        : undefined;
    const slow = brief.counterRounds > 0 && weeksOpen >= 2;
    if (slow) shiftRelationship(desk, brief.platformId, -5);
    brief.status = 'LOST';
    brief.winnerName = winner.name;
    brief.relationshipHit = slow ? -5 : 0;
    brief.why = {
        winner: winner.name,
        you: playerSeatNow && playerSeatNow.responded
            ? scoreLines(playerSeatNow)
            : lineOf(desk.reputation, 0, 0, relationshipOf(desk, brief.platformId)),
        them: scoreLines(winner),
    };
    const project = startProject(player, desk, brief, winner.id, winner.name, brief.baseTerms, false);
    project.feedLine = `${winner.name} signed ${brief.title} for ${brief.platformName}.`;
    desk.projects = [project, ...desk.projects].slice(0, 40);
    const fee = payableOf(brief.baseTerms);
    const headline = `${winner.name} signed ${brief.title} for ${brief.platformName}.`;
    pushFeed(desk, player, {
        headline,
        platformName: brief.platformName,
        houseName: winner.name,
        title: brief.title,
        fee,
        bidders: brief.seats.length,
        kind: 'LOST',
    });
    pushNews(player, headline, 'HIGH');
    logLine(player, headline, 'negative');
};

const closeIfWon = (player: Player, desk: CommissionDeskState, brief: CommissionBrief) => {
    if (brief.direction === 'OUT' || brief.status === 'SIGNED' || brief.status === 'CONTRACT' || brief.status === 'LOST') return;
    const weeksOpen = nowOf(player) - brief.openedWeek;
    const seats = activeSeats(brief, weeksOpen, desk).filter(seat => seat.responded && seat.id !== 'PLAYER');
    const ranked = seats
        .map(seat => ({ seat, score: seatScore(seat, `${brief.id}:${nowOf(player)}`) }))
        .sort((a, b) => b.score - a.score);
    const winner = ranked.find(row => row.score >= SIGN_THRESHOLD);
    if (!winner) {
        const loud = ranked[0];
        if (loud) brief.rivalAlert = `${loud.seat.name} replied.`;
        if (weeksOpen >= (brief.closesWeek - brief.openedWeek)) {
            brief.status = 'EXPIRED';
            pushFeed(desk, player, {
                headline: `${brief.platformName} closed ${brief.title} with no signature.`,
                platformName: brief.platformName,
                houseName: '—',
                title: brief.title,
                fee: payableOf(brief.baseTerms),
                bidders: brief.seats.length,
                kind: 'BRIEF',
            });
        }
        return;
    }
    const playerLive = activeSeats(brief, weeksOpen, desk).find(seat => seat.id === 'PLAYER' && seat.responded);
    const playerScore = playerLive ? seatScore(playerLive, `${brief.id}:${nowOf(player)}`) : 0;
    if (playerLive && playerScore >= winner.score && playerScore >= SIGN_THRESHOLD) {
        brief.status = 'CONTRACT';
        brief.finalTerms = brief.platformReply || brief.playerAsk || brief.baseTerms;
        brief.rivalAlert = `${brief.platformName} chose your house. Sign before the week turns.`;
        return;
    }
    loseBrief(player, desk, brief, winner.seat, weeksOpen);
};

const genreOf = (value: string | undefined): Genre =>
    (GENRES.includes(value as Genre) ? value : 'DRAMA') as Genre;

const makeScript = (player: Player, house: Business, project: CommissionProject): Script => {
    const script: Script = {
        id: `script_commission_${project.id}`,
        title: project.title,
        genres: [project.genre],
        status: 'IN_DEVELOPMENT',
        quality: 62,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: project.format === 'SERIES' ? 8 : 5,
        isOriginal: !project.rightsIpId,
        projectType: project.format === 'SERIES' ? 'SERIES' : 'MOVIE',
        format: 'LIVE_ACTION',
        episodes: project.format === 'SERIES' ? project.episodes : undefined,
        baseQuality: 62,
        logline: project.logline,
        sourceMaterial: project.rightsIpId ? 'ADAPTATION' : 'ORIGINAL',
        sourceMaterialType: project.rightsIpId ? 'BOOK' : undefined,
        subjectName: project.rightsTitle,
        fidelity: project.fidelity ?? 35,
        rightsIpId: project.rightsIpId,
        rightsKind: project.rightsIpId ? 'BOOK' : undefined,
        seriesSeasonsPotential: project.seasons,
        preferredFormat: project.format === 'SERIES' ? 'SERIES' : 'MOVIE',
        publicDomainSource: project.publicDomain,
        commissionProjectId: project.id,
        castingLocked: project.castingLocked,
        createdAtWeek: player.currentWeek,
        hype: 40,
    };
    house.studioState!.scripts = [script, ...(house.studioState!.scripts || [])];
    return script;
};

const startProject = (
    player: Player,
    desk: CommissionDeskState,
    brief: CommissionBrief,
    houseId: string,
    houseName: string,
    terms: CommissionTerms,
    forPlayer: boolean,
): CommissionProject => {
    const split = Boolean(brief.publicDomain && brief.rightsIpId && desk.platformHoldings.filter(row => row.ipId === brief.rightsIpId).length > 1);
    const project: CommissionProject = {
        id: `proj_${brief.id}`,
        briefId: brief.id,
        houseId,
        houseName,
        platformId: brief.platformId,
        platformName: brief.platformName,
        platformColor: brief.platformColor,
        title: brief.title,
        format: brief.format,
        genre: brief.genre,
        logline: brief.logline,
        seasons: brief.seasons,
        episodes: brief.episodes,
        runtimeMin: brief.runtimeMin,
        seasonIndex: 1,
        rightsIpId: brief.rightsIpId,
        rightsTitle: brief.rightsTitle,
        publicDomain: brief.publicDomain,
        audienceSplit: split,
        terms,
        stage: 'DEVELOPMENT',
        stageWeek: 0,
        shootWeeks: shootWeeksFor(brief.episodes),
        shootWeek: 0,
        weeksElapsed: 0,
        weeksLate: 0,
        tranchesPaid: 0,
        received: 0,
        spent: 0,
        reserve: terms.payModel === 'COST_PLUS' ? Math.round(terms.budget * 1.1) : terms.budget,
        fidelity: brief.rightsIpId ? 35 : undefined,
        castingLocked: !terms.controls.casting,
        ledger: [],
        feedLine: `${houseName} is making ${brief.title} for ${brief.platformName}.`,
    };
    if (forPlayer) {
        const house = houseOf(player);
        if (house?.studioState) {
            const script = makeScript(player, house, project);
            project.scriptId = script.id;
            saveHouse(player, house);
        }
    }
    return project;
};

const projectLedger = (project: CommissionProject, player: Player, amount: number, kind: CommissionLedgerLine['kind'], label: string) => {
    project.ledger = [{
        id: `pl_${project.id}_${project.ledger.length}_${player.currentWeek}`,
        week: player.currentWeek,
        year: player.age,
        amount,
        kind,
        label,
    }, ...project.ledger].slice(0, 24);
    project.feedLine = label;
};

const payTranche = (player: Player, desk: CommissionDeskState, project: CommissionProject, label: string) => {
    if (project.tranchesPaid >= 4 || project.houseId !== 'PLAYER') return 0;
    const amount = trancheOf(project.terms, project.seasons);
    project.tranchesPaid += 1;
    project.received += amount;
    const house = houseOf(player);
    if (house) {
        house.balance += amount;
        house.stats.lifetimeRevenue = (house.stats.lifetimeRevenue || 0) + amount;
        house.stats.weeklyRevenue = amount;
        pushStudioLedger(house, player, amount, 'COMMISSION', label, project.id);
        saveHouse(player, house);
    }
    pushUsd(player, amount, label);
    projectLedger(project, player, amount, 'TRANCHE', label);
    desk.reputation = clampRep(desk.reputation);
    return amount;
};

const payBonus = (player: Player, project: CommissionProject, amount: number, label: string) => {
    if (amount <= 0 || project.houseId !== 'PLAYER') return;
    const house = houseOf(player);
    if (house) {
        house.balance += amount;
        pushStudioLedger(house, player, amount, 'BONUS', label, project.id);
        saveHouse(player, house);
    }
    pushUsd(player, amount, label);
    projectLedger(project, player, amount, 'BONUS', label);
};

const charge = (player: Player, project: CommissionProject, amount: number, kind: 'PENALTY' | 'SPEND' | 'REPAY', label: string) => {
    if (amount <= 0 || project.houseId !== 'PLAYER') return;
    const house = houseOf(player);
    if (house) {
        house.balance -= amount;
        pushStudioLedger(house, player, -amount, kind === 'SPEND' ? 'PRODUCTION_SPEND' : 'PENALTY', label, project.id);
        saveHouse(player, house);
    }
    pushUsd(player, -amount, label);
    projectLedger(project, player, -amount, kind === 'SPEND' ? 'SPEND' : kind, label);
};

const signInto = (player: Player, desk: CommissionDeskState, brief: CommissionBrief, terms: CommissionTerms, signature: string) => {
    const house = houseOf(player);
    const houseName = house?.name || 'Your house';
    brief.status = 'SIGNED';
    brief.finalTerms = terms;
    const project = startProject(player, desk, brief, 'PLAYER', houseName, terms, true);
    project.signature = signature;
    if (project.terms.payModel === 'COST_PLUS') {
        projectLedger(project, player, 0, 'RESERVE', `Production reserve ${usd(project.reserve)} posted. Not income.`);
        const live = houseOf(player);
        if (live) {
            pushStudioLedger(live, player, 0, 'RESERVE', `Reserve ${usd(project.reserve)} for ${project.title}. Not income.`, project.id);
            saveHouse(player, live);
        }
    }
    const advance = payTranche(player, desk, project, `${brief.platformName} advance on ${brief.title}`);
    if (brief.format === 'SERIES' && brief.seasons >= 2) {
        // Season-2 bonus waits until that season opens.
    }
    desk.projects = [project, ...desk.projects.filter(row => row.id !== project.id)].slice(0, 40);
    const headline = `${houseName} signed ${brief.title} for ${brief.platformName}.`;
    pushFeed(desk, player, {
        headline,
        platformName: brief.platformName,
        houseName,
        title: brief.title,
        fee: payableOf(terms),
        bidders: brief.seats.length,
        kind: 'WON',
    });
    pushNews(player, headline, 'HIGH');
    logLine(player, `${headline} Advance ${usd(advance)}.`, 'positive');
    if (project.audienceSplit) {
        const clash = `Two versions of ${brief.rightsTitle} are in production. The audience will split.`;
        pushNews(player, clash, 'MEDIUM');
    }
    shiftRelationship(desk, brief.platformId, 4);
    return advance;
};

export const declineBrief = (playerIn: Player, briefId: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId);
    if (!brief || brief.status === 'SIGNED') return { player: playerIn, error: 'That offer is already closed.' };
    brief.status = 'DECLINED';
    shiftRelationship(desk, brief.platformId, -2);
    write(player, desk);
    logLine(player, `Passed on ${brief.platformName}'s offer for ${brief.title}.`);
    return { player, note: `Passed on ${brief.title}.` };
};

export const sendCounter = (playerIn: Player, briefId: string, extraPremiumPct: number, extraWeeks: number, controls: CommissionControls): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId);
    if (!brief || (brief.status !== 'OPEN' && brief.status !== 'REPLIED')) {
        return { player: playerIn, error: 'That offer is not open for a counter.' };
    }
    const quote = quoteCounter(brief, desk, extraPremiumPct, extraWeeks, controls);
    brief.playerAsk = quote.ask;
    brief.counterRounds = quote.rounds;
    const grant = { ...brief.baseTerms.controls };
    (['finalCut', 'casting', 'showrunner', 'marketing'] as const).forEach(key => {
        if (!controls[key]) return;
        const odds = key === 'finalCut' ? 8 : 45;
        if (hashString(`${brief.id}:${key}:${quote.rounds}`) % 100 < odds) grant[key] = true;
    });
    const meetPremium = brief.baseTerms.premiumPct + (extraPremiumPct / 2);
    const meetWeeks = brief.baseTerms.weeks + Math.round(extraWeeks / 2);
    brief.platformReply = {
        ...brief.baseTerms,
        premiumPct: Math.round(meetPremium * 10) / 10,
        premium: Math.round(brief.baseTerms.budget * meetPremium / 100),
        licenceFee: Math.round(brief.baseTerms.licenceFee * (1 + (extraPremiumPct / 2) / 100)),
        weeks: meetWeeks,
        controls: grant,
    };
    brief.status = 'REPLIED';
    const rival = brief.seats.find(seat => seat.id !== 'PLAYER');
    brief.rivalAlert = rival ? `${rival.name} has a reply in as well.` : undefined;
    const playerRow = brief.seats.find(seat => seat.id === 'PLAYER');
    if (playerRow) playerRow.responded = true;
    write(player, desk);
    logLine(player, `${brief.execName} answered your counter on ${brief.title}.`);
    return { player, note: `${brief.execName} met you partway.` };
};

export const openContract = (playerIn: Player, briefId: string, use: 'BASE' | 'REPLY'): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId);
    if (!brief || brief.status === 'LOST' || brief.status === 'SIGNED' || brief.status === 'DECLINED' || brief.status === 'EXPIRED') {
        return { player: playerIn, error: 'That offer is closed.' };
    }
    const terms = use === 'REPLY' ? (brief.platformReply || brief.baseTerms) : brief.baseTerms;
    brief.finalTerms = terms;
    brief.status = 'CONTRACT';
    write(player, desk);
    return { player };
};

export const signBrief = (playerIn: Player, briefId: string, signature: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId);
    if (!brief || brief.status !== 'CONTRACT') return { player: playerIn, error: 'The contract is not in front of you.' };
    if (!houseOf(player)) return { player: playerIn, error: 'Open a production house before you sign.' };
    const terms = brief.finalTerms || brief.baseTerms;
    const advance = signInto(player, desk, brief, terms, signature || 'held');
    write(player, desk);
    return { player, note: `${usd(advance)} landed in the studio treasury.` };
};

export const dismissBrief = (playerIn: Player, briefId: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId);
    if (brief && (brief.status === 'LOST' || brief.status === 'EXPIRED' || brief.status === 'DECLINED')) {
        desk.briefs = desk.briefs.filter(row => row.id !== briefId);
        write(player, desk);
    }
    return { player };
};

export const setFidelity = (playerIn: Player, projectId: string, fidelity: number): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const project = desk.projects.find(row => row.id === projectId && row.houseId === 'PLAYER');
    if (!project) return { player: playerIn, error: 'That commission is not on your slate.' };
    project.fidelity = Math.max(0, Math.min(100, Math.round(fidelity)));
    const house = houseOf(player);
    if (house?.studioState && project.scriptId) {
        house.studioState.scripts = (house.studioState.scripts || []).map(script =>
            script.id === project.scriptId ? { ...script, fidelity: project.fidelity } : script);
        saveHouse(player, house);
    }
    write(player, desk);
    return { player };
};

export const setLead = (playerIn: Player, projectId: string, name: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const project = desk.projects.find(row => row.id === projectId && row.houseId === 'PLAYER');
    if (!project) return { player: playerIn, error: 'That commission is not on your slate.' };
    if (project.castingLocked) return { player: playerIn, error: 'The platform kept lead casting.' };
    project.leadName = name.slice(0, 48);
    write(player, desk);
    return { player };
};

export const abandonProject = (playerIn: Player, projectId: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const project = desk.projects.find(row => row.id === projectId && row.houseId === 'PLAYER');
    if (!project || project.stage === 'DELIVERED' || project.stage === 'ABANDONED' || project.stage === 'TAKEN_OVER') {
        return { player: playerIn, error: 'That show cannot be abandoned.' };
    }
    const unspent = Math.max(0, project.received - project.spent);
    if (unspent > 0) charge(player, project, unspent, 'REPAY', `Repaid unspent tranche on ${project.title}`);
    project.stage = 'ABANDONED';
    shiftRelationship(desk, project.platformId, -30);
    desk.reputation = clampRep(desk.reputation - 2);
    desk.cooldowns = [
        { platformId: project.platformId, untilAbsolute: nowOf(player) + 52 },
        ...desk.cooldowns.filter(row => row.platformId !== project.platformId),
    ];
    const headline = `${houseOf(player)?.name || 'Your house'} walked off ${project.title}. ${project.platformName} goes cold for a year.`;
    pushNews(player, headline, 'HIGH');
    pushFeed(desk, player, {
        headline,
        platformName: project.platformName,
        houseName: project.houseName,
        title: project.title,
        fee: 0,
        bidders: 1,
        kind: 'LOST',
    });
    write(player, desk);
    logLine(player, headline, 'negative');
    return { player, note: headline };
};

const stageCap = (project: CommissionProject) => {
    if (project.stage === 'DEVELOPMENT' || project.stage === 'PRE_PRODUCTION') return 2;
    if (project.stage === 'SHOOTING') return project.shootWeeks;
    if (project.stage === 'POST') return 3;
    return 0;
};

const advanceProject = (player: Player, desk: CommissionDeskState, project: CommissionProject) => {
    if (project.stage === 'DELIVERED' || project.stage === 'ABANDONED' || project.stage === 'TAKEN_OVER') return;
    project.weeksElapsed += 1;
    project.stageWeek += 1;
    if (project.stage === 'SHOOTING') project.shootWeek = Math.min(project.shootWeeks, project.stageWeek);
    const weeklyDraw = Math.round(project.terms.budget / Math.max(8, seasonPipelineWeeks(project.episodes) * project.seasons));
    if (project.stage === 'SHOOTING' || project.stage === 'POST') {
        project.spent += weeklyDraw;
        if (project.terms.payModel === 'COST_PLUS') {
            const covered = project.terms.budget * 1.1;
            if (project.spent > covered) {
                const over = Math.min(weeklyDraw, project.spent - covered);
                charge(player, project, over, 'SPEND', `Overspend on ${project.title}`);
            } else {
                project.reserve = Math.max(0, project.reserve - weeklyDraw);
                projectLedger(project, player, 0, 'SPEND', `Drew ${usd(weeklyDraw)} from the reserve.`);
            }
        } else {
            charge(player, project, weeklyDraw, 'SPEND', `Production spend on ${project.title}`);
        }
    }
    if (project.weeksElapsed > project.terms.weeks) {
        project.weeksLate += 1;
        const open = trancheOf(project.terms, project.seasons);
        const penalty = Math.round(open * 0.02);
        charge(player, project, penalty, 'PENALTY', `Late fee, week ${project.weeksLate} on ${project.title}`);
        if (project.weeksLate >= 8 && project.houseId === 'PLAYER') {
            project.stage = 'TAKEN_OVER';
            shiftRelationship(desk, project.platformId, -20);
            desk.reputation = clampRep(desk.reputation - 3);
            desk.cooldowns = [
                { platformId: project.platformId, untilAbsolute: nowOf(player) + 52 },
                ...desk.cooldowns.filter(row => row.platformId !== project.platformId),
            ];
            const headline = `${project.platformName} took over ${project.title}. The bonus is gone.`;
            pushNews(player, headline, 'HIGH');
            pushFeed(desk, player, {
                headline,
                platformName: project.platformName,
                houseName: project.houseName,
                title: project.title,
                fee: project.received,
                bidders: 1,
                kind: 'LOST',
            });
            logLine(player, headline, 'negative');
            return;
        }
    }
    if (project.stageWeek < stageCap(project)) return;
    if (project.stage === 'DEVELOPMENT') {
        project.stage = 'PRE_PRODUCTION';
        project.stageWeek = 0;
        return;
    }
    if (project.stage === 'PRE_PRODUCTION') {
        project.stage = 'SHOOTING';
        project.stageWeek = 0;
        project.shootWeek = 1;
        payTranche(player, desk, project, `${project.platformName} principal photography on ${project.title}`);
        return;
    }
    if (project.stage === 'SHOOTING') {
        project.stage = 'POST';
        project.stageWeek = 0;
        return;
    }
    if (project.stage === 'POST') {
        payTranche(player, desk, project, `${project.platformName} picture lock on ${project.title}`);
        if (project.seasonIndex < project.seasons) {
            payTranche(player, desk, project, `${project.platformName} delivery, season ${project.seasonIndex} of ${project.title}`);
            project.seasonIndex += 1;
            project.stage = 'DEVELOPMENT';
            project.stageWeek = 0;
            project.tranchesPaid = 0;
            project.shootWeek = 0;
            if (project.seasonIndex === 2) {
                payBonus(player, project, Math.round(project.terms.season2Bonus / Math.max(1, project.seasons - 1)), `Season 2 bonus on ${project.title}`);
            }
            project.feedLine = `Season ${project.seasonIndex} of ${project.title} is back in the writers' room.`;
            return;
        }
        project.stage = 'DELIVERED';
        project.stageWeek = 0;
        payTranche(player, desk, project, `${project.platformName} delivery payment on ${project.title}`);
        const hit = hashString(`${project.id}:hit`) % 100 < 70 && project.weeksLate === 0;
        if (hit) {
            payBonus(player, project, project.terms.hitBonus, `Hit bonus on ${project.title}`);
            desk.hitWeeks = [...desk.hitWeeks, nowOf(player)].slice(-52);
            desk.reputation = clampRep(desk.reputation + 2);
            if (project.houseId === 'PLAYER') {
                player.awards = [...(player.awards || []), {
                    id: `award_commission_${project.id}`,
                    name: project.format === 'SERIES' ? 'Emmys' : 'Oscars',
                    category: project.format === 'SERIES' ? 'Outstanding Drama Series' : 'Best Picture',
                    year: player.age,
                    outcome: 'NOMINATED',
                    projectId: project.id,
                    projectName: project.title,
                    type: project.format === 'SERIES' ? 'EMMY' : 'OSCAR',
                }];
            }
        }
        const headline = hit
            ? `${project.title} is on ${project.platformName}, and it is in the awards conversation.`
            : `${project.title} is now streaming on ${project.platformName}.`;
        pushNews(player, headline, hit ? 'HIGH' : 'MEDIUM');
        pushFeed(desk, player, {
            headline,
            platformName: project.platformName,
            houseName: project.houseName,
            title: project.title,
            fee: payableOf(project.terms),
            bidders: 1,
            kind: project.houseId === 'PLAYER' ? 'WON' : 'RIVAL',
        });
        if (project.platformId === 'empire' && player.ownPlatform) {
            player.ownPlatform.catalogue = [...player.ownPlatform.catalogue, {
                id: `commission-delivery:${project.id}`,
                source: 'OWNED',
                title: project.title,
                genre: project.genre,
                language: 'English',
                cost: 0,
                releaseWeekOffset: 1,
            }];
        }
        project.feedLine = headline;
        if (!project.renewalOffered && project.format === 'SERIES' && hashString(`${project.id}:renew`) % 100 < 40) {
            project.renewalOffered = true;
            const renewal = buildBrief(player, desk, {
                platformId: project.platformId === 'empire' ? 'netflix' : project.platformId,
                format: 'SERIES',
                title: `${project.title}: Season ${project.seasonIndex + 1}`,
                genre: project.genre,
                seasons: 1,
                episodes: project.episodes,
                runtimeMin: project.runtimeMin,
                rightsIpId: project.rightsIpId,
                rightsTitle: project.rightsTitle,
                publicDomain: project.publicDomain,
                logline: `${project.platformName} wants another season.`,
                id: `renew_${project.id}`,
            });
            renewal.pitch = `Renewal. ${project.platformName} wants season ${project.seasonIndex + 1} of ${project.title}.`;
            desk.briefs = [renewal, ...desk.briefs].slice(0, 24);
            if (renewal.direction === 'IN') inboxFor(player, renewal);
            pushFeed(desk, player, {
                headline: `${project.platformName} briefed a renewal of ${project.title}.`,
                platformName: project.platformName,
                houseName: 'Open',
                title: renewal.title,
                fee: payableOf(renewal.baseTerms),
                bidders: renewal.seats.length,
                kind: 'BRIEF',
            });
        }
    }
};

const spawnOffers = (player: Player, desk: CommissionDeskState) => {
    const absolute = nowOf(player);
    if (desk.lastRollWeek === absolute) return;
    desk.lastRollWeek = absolute;
    if (!houseOf(player)) return;
    const hits = hitsLast52(desk, absolute);
    const cooled = new Set(desk.cooldowns.filter(row => row.untilAbsolute > absolute).map(row => row.platformId));
    const openPlatforms = new Set(desk.briefs.filter(row => row.status === 'OPEN' || row.status === 'REPLIED' || row.status === 'CONTRACT').map(row => row.platformId));
    const candidates = platformRoster().filter(row => !cooled.has(row.id) && !openPlatforms.has(row.id));
    const rolled = candidates.filter(row => {
        const chance = marketChance(offerChance(desk.reputation, hits, relationshipOf(desk, row.id)), row.householdsM);
        return roll(`${absolute}:${row.id}:offer`) < chance;
    }).sort((a, b) => b.householdsM - a.householdsM);
    const chosen = rolled[0];
    if (!chosen) return;
    const owned = desk.platformHoldings.find(row => row.platformId === chosen.id && roll(`${absolute}:${row.ipId}`) > 0.4);
    const title = owned ? (ADAPT_TITLES[owned.ipId] || owned.title.split(' ')[0].toUpperCase()) : undefined;
    const brief = buildBrief(player, desk, {
        platformId: chosen.id,
        title,
        rightsIpId: owned?.ipId,
        rightsTitle: owned?.title,
        publicDomain: owned?.publicDomain,
        logline: owned ? `${chosen.name} owns ${owned.title} and wants a version of its own.` : undefined,
    });
    desk.briefs = [brief, ...desk.briefs].slice(0, 24);
    inboxFor(player, brief);
    pushFeed(desk, player, {
        headline: `${chosen.name} briefed ${brief.title} to ${brief.seats.length} studios.`,
        platformName: chosen.name,
        houseName: 'Open',
        title: brief.title,
        fee: payableOf(brief.baseTerms),
        bidders: brief.seats.length,
        kind: 'BRIEF',
    });
    logLine(player, `${chosen.name} sent a commission for ${brief.title}.`, 'positive');
};

const finalizeEmpire = (player: Player, desk: CommissionDeskState, brief: CommissionBrief): string | null => {
    if (brief.status === 'SIGNED') return null;
    const terms = brief.platformReply || brief.baseTerms;
    const advance = trancheOf(terms, brief.seasons);
    if ((player.money || 0) < advance) return 'Empire+ cannot cover the advance.';
    player.money -= advance;
    pushUsd(player, -advance, `${player.ownPlatform?.name || 'Empire+'} advance to ${brief.targetHouseName} for ${brief.title}`);
    if (player.ownPlatform?.books) {
        player.ownPlatform.books.lines = [{
            id: `empire_commission_${brief.id}`,
            week: player.currentWeek,
            year: player.age,
            amount: -advance,
            label: `Advance to ${brief.targetHouseName} for ${brief.title}`,
            source: 'COMMISSION' as const,
        }, ...(player.ownPlatform.books.lines || [])].slice(0, 40);
    }
    brief.status = 'SIGNED';
    brief.finalTerms = terms;
    const project = startProject(player, desk, brief, brief.targetHouseId || 'aurora', brief.targetHouseName || 'Aurora Pictures', terms, false);
    project.signature = 'studio-signed';
    project.tranchesPaid = 1;
    project.received = advance;
    projectLedger(project, player, -advance, 'TRANCHE', `${brief.targetHouseName} took the advance on ${brief.title}`);
    desk.projects = [project, ...desk.projects.filter(row => row.id !== project.id)].slice(0, 40);
    if (player.ownPlatform) {
        player.ownPlatform.catalogue = [...(player.ownPlatform.catalogue || []), {
            id: `empire-brief:${brief.id}`,
            source: 'OWNED' as const,
            title: brief.title,
            genre: brief.genre,
            language: 'English',
            cost: 0,
            releaseWeekOffset: Math.min(52, terms.weeks),
        }];
    }
    const headline = `${brief.targetHouseName} signed ${brief.title} for ${brief.platformName}.`;
    pushFeed(desk, player, {
        headline,
        platformName: brief.platformName,
        houseName: brief.targetHouseName || 'Studio',
        title: brief.title,
        fee: payableOf(terms),
        bidders: 1,
        kind: 'EMPIRE',
    });
    pushNews(player, headline, 'MEDIUM');
    logLine(player, headline, 'positive');
    return null;
};

const advanceEmpire = (player: Player, desk: CommissionDeskState, brief: CommissionBrief) => {
    if (brief.status !== 'OPEN' && brief.status !== 'REPLIED') return;
    const weeksOpen = nowOf(player) - brief.openedWeek;
    if (brief.status === 'OPEN') {
        brief.status = 'REPLIED';
        brief.platformReply = {
            ...brief.baseTerms,
            weeks: brief.baseTerms.weeks + 2,
            premiumPct: Math.round((brief.baseTerms.premiumPct + 2) * 10) / 10,
            premium: Math.round(brief.baseTerms.budget * (brief.baseTerms.premiumPct + 2) / 100),
        };
        brief.rivalAlert = `${brief.targetHouseName || 'The studio'} asked for two more weeks and a little more fee.`;
        return;
    }
    if (weeksOpen >= 1) finalizeEmpire(player, desk, brief);
};

export const tickCommissionWeek = (player: Player): string[] => {
    if (!houseOf(player)) return [];
    const desk = deskOf(player);
    syncHoldings(player, desk);
    const logs: string[] = [];
    desk.briefs.forEach(brief => {
        if (brief.direction === 'OUT') {
            const before = brief.status;
            advanceEmpire(player, desk, brief);
            if (before !== brief.status && brief.status === 'SIGNED') logs.push(`${brief.targetHouseName} signed ${brief.title}.`);
            return;
        }
        if (brief.status === 'OPEN' || brief.status === 'REPLIED') closeIfWon(player, desk, brief);
    });
    desk.projects.forEach(project => advanceProject(player, desk, project));
    spawnOffers(player, desk);
    write(player, desk);
    return logs;
};

export const sendEmpireBrief = (
    playerIn: Player,
    input: {
        houseId: string;
        format: 'FILM' | 'SERIES';
        seasons: number;
        episodes: number;
        runtimeMin: number;
        rightsIpId?: string;
        rightsTitle?: string;
        publicDomain?: boolean;
        title?: string;
        genre?: Genre;
    },
): CommissionResult => {
    const player = clone(playerIn);
    if (!player.ownPlatform || player.ownPlatform.stage !== 'LIVE') {
        return { player: playerIn, error: 'Empire+ has to be live before it can commission a rival studio.' };
    }
    const house = AI_HOUSES.find(row => row.id === input.houseId) || AI_HOUSES[0];
    const desk = deskOf(player);
    const seasons = input.format === 'SERIES' ? Math.max(1, Math.min(6, Math.round(input.seasons || 1))) : 1;
    const episodes = input.format === 'SERIES' ? Math.max(6, Math.min(30, Math.round(input.episodes || 8))) : 1;
    const brief = buildBrief(player, desk, {
        platformId: 'netflix',
        direction: 'OUT',
        format: input.format,
        seasons,
        episodes,
        runtimeMin: Math.max(20, Math.min(90, Math.round(input.runtimeMin || 48))),
        rightsIpId: input.rightsIpId,
        rightsTitle: input.rightsTitle,
        publicDomain: input.publicDomain,
        title: input.title || (input.rightsTitle ? (ADAPT_TITLES[input.rightsIpId || ''] || input.rightsTitle.split(' ')[0].toUpperCase()) : undefined),
        genre: input.genre,
        targetHouseId: house.id,
        targetHouseName: house.name,
        id: `empire_${nowOf(player)}_${hashString(house.id + (input.rightsIpId || 'orig') + player.currentWeek + desk.briefs.length)}`,
    });
    brief.platformId = 'empire';
    brief.platformName = player.ownPlatform.name || 'Empire+';
    brief.platformColor = '#8B7BFF';
    brief.execName = player.name || 'You';
    brief.execTitle = 'Commissioner, Empire+';
    brief.pitch = `${brief.platformName} asked ${house.name} to make ${brief.title}.`;
    const empireBudget = productionBudget(brief.format, brief.genre, brief.episodes, brief.seasons, 'GLOBAL', 40, 0.45);
    brief.baseTerms = termsFor(empireBudget, 70, 'COST_PLUS', seasonPipelineWeeks(brief.episodes) * brief.seasons + 4, brief.format === 'SERIES', true, 'Worldwide');
    brief.status = 'REPLIED';
    brief.platformReply = {
        ...brief.baseTerms,
        weeks: brief.baseTerms.weeks + 2,
        premiumPct: Math.round((brief.baseTerms.premiumPct + 2) * 10) / 10,
        premium: Math.round(brief.baseTerms.budget * (brief.baseTerms.premiumPct + 2) / 100),
    };
    brief.rivalAlert = `${house.name} asked for two more weeks and a little more fee.`;
    desk.briefs = [brief, ...desk.briefs].slice(0, 24);
    pushFeed(desk, player, {
        headline: `${brief.platformName} briefed ${brief.title} to ${house.name}.`,
        platformName: brief.platformName,
        houseName: house.name,
        title: brief.title,
        fee: payableOf(brief.baseTerms),
        bidders: 1,
        kind: 'EMPIRE',
    });
    write(player, desk);
    logLine(player, brief.pitch, 'positive');
    return { player, note: `${house.name} has the brief. They usually answer the same week.` };
};

export const acceptEmpireReply = (playerIn: Player, briefId: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId && row.direction === 'OUT');
    if (!brief || (brief.status !== 'OPEN' && brief.status !== 'REPLIED')) {
        return { player: playerIn, error: 'That outgoing brief is closed.' };
    }
    const error = finalizeEmpire(player, desk, brief);
    if (error) return { player: playerIn, error };
    write(player, desk);
    return { player, note: `${brief.targetHouseName} signed ${brief.title}.` };
};

export const walkEmpireBrief = (playerIn: Player, briefId: string): CommissionResult => {
    const player = clone(playerIn);
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === briefId && row.direction === 'OUT');
    if (!brief) return { player: playerIn, error: 'That brief is already gone.' };
    brief.status = 'DECLINED';
    write(player, desk);
    return { player, note: `You let ${brief.title} go.` };
};

export const outgoingBriefs = (player: Player) =>
    deskOf(player).briefs.filter(brief => brief.direction === 'OUT');

export const seedCommissionPlaytest = (playerIn: Player): Player => {
    const player = clone(playerIn);
    if (!player.name || player.name === 'New Player') player.name = 'Asha Quinn';
    player.money = Math.max(player.money || 0, 250_000_000);
    if (!houseOf(player)) {
        const created = createBusiness(
            'Asha Pictures',
            'PRODUCTION_HOUSE',
            'MAJOR_STUDIO',
            { quality: 'PREMIUM', pricing: 'HIGH', marketing: 'HIGH' },
            '🎬',
            player.currentWeek,
        );
        created.balance = 80_000_000;
        player.businesses = [...(player.businesses || []), created];
    }
    const house = houseOf(player)!;
    house.balance = Math.max(house.balance, 80_000_000);
    const library = rightsOf(house);
    library.holdings = [{
        ipId: 'book_pd_mahabharata_62',
        kind: 'BOOK',
        status: 'OWNED',
        owner: 'RIVAL',
        rivalName: 'Netflix',
        paidUsd: 0,
    }, ...library.holdings.filter(row => !(row.ipId === 'book_pd_mahabharata_62' && row.rivalName === 'Netflix'))];
    house.studioState!.rightsLibrary = library;
    saveHouse(player, house);
    const empire = ensureOwnPlatform(player);
    empire.ownPlatform!.stage = 'LIVE';
    empire.ownPlatform!.name = empire.ownPlatform!.name || 'Empire+';
    empire.ownPlatform!.weeksLive = Math.max(empire.ownPlatform!.weeksLive || 0, 6);
    empire.ownPlatform!.subscribers = Math.max(empire.ownPlatform!.subscribers || 0, 2_000_000);
    empire.money = Math.max(empire.money || 0, 250_000_000);
    const desk = deskOf(empire);
    desk.reputation = Math.max(desk.reputation, 58);
    desk.relationships = { ...desk.relationships, netflix: Math.max(relationshipOf(desk, 'netflix'), 64) };
    rememberHolding(desk, 'book_pd_mahabharata_62', 'Mahabharata', 'netflix', 'Netflix', 'OWNED', true, nowOf(empire));
    if (!desk.briefs.some(brief => brief.title === 'KARNA')) {
        const karna = buildBrief(empire, desk, {
            id: 'seed-karna',
            platformId: 'netflix',
            format: 'SERIES',
            title: 'KARNA',
            genre: 'ADVENTURE',
            seasons: 2,
            episodes: 10,
            runtimeMin: 48,
            rightsIpId: 'book_pd_mahabharata_62',
            rightsTitle: 'Mahabharata',
            publicDomain: true,
            logline: 'Netflix owns the Mahabharata adaptation and wants KARNA, told from the son the war would not claim.',
        });
        karna.execName = 'Dana Whitlock';
        karna.execTitle = 'VP International Originals';
        karna.pitch = 'Netflix owns the Mahabharata. They want you to make KARNA.';
        karna.seats = [playerSeat(desk, 'netflix'), ...pickSeats('seed-karna', false)];
        desk.briefs.unshift(karna);
        inboxFor(empire, karna);
    }
    if (!desk.briefs.some(brief => brief.id === 'seed-lose')) {
        const lose = buildBrief(empire, desk, {
            id: 'seed-lose',
            platformId: 'prime',
            format: 'FILM',
            title: 'LOW TIDE',
            genre: 'THRILLER',
            runtimeMin: 118,
            hungry: true,
            openedWeek: nowOf(empire) - 1,
            logline: 'Prime wants a coastal thriller, and Aurora is already in the room.',
        });
        lose.execName = 'Mateo Ruiz';
        lose.execTitle = 'VP Film';
        lose.pitch = 'Prime Video wants Low Tide. Aurora Pictures is ahead of you.';
        lose.seats = [playerSeat(desk, 'prime'), ...pickSeats('seed-lose', true).slice(0, 2)];
        desk.briefs.unshift(lose);
        inboxFor(empire, lose);
    }
    desk.briefs = [
        ...desk.briefs.filter(brief => brief.id === 'seed-karna'),
        ...desk.briefs.filter(brief => brief.id !== 'seed-karna'),
    ];
    write(empire, desk);
    return empire;
};

export const knownAdaptationTitle = (ipId: string, fallback: string) => ADAPT_TITLES[ipId] || fallback;

export const aiHouses = () => AI_HOUSES;

export const feeOf = payableOf;

export const genreFromRecord = (record: IpRecord): Genre => genreOf(record.gameGenres?.[0]);

export const displayRecordTitle = (record: IpRecord) => displayTitle(record);
