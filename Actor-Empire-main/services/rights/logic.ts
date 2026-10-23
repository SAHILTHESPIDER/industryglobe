import {
    Business, FuturePotential, Genre, Player, ProjectHiddenStats, ProjectType, RightsActivity, RightsBid, RightsHolding,
    RightsLibraryState, Script, XPost,
} from '../../types';
import { currencyFor, formatLocalAmount, roundLocal, usdFromLocal } from '../ownPlatform/fx';
import { issueLoan } from '../loanLogic';
import { getAbsoluteWeek } from '../legacyLogic';
import { catalogueSync, displayAuthor, displayTitle, IpRecord, preferredFormat } from './catalogue';
import {
    awardBonus, clashMultiplier, fanbaseBoost, FAMOUS_FAME, formatMismatchPenalty, OPTION_WEEKS,
    profitShareAsk, settlementUsd,
} from './formulas';

export type PaySource = 'STUDIO' | 'EMPIRE' | 'LOAN';

export interface RightsResult {
    player: Player;
    error?: string;
    note?: string;
}

export const emptyRights = (): RightsLibraryState => ({
    holdings: [],
    bids: [],
    relations: [],
    activity: [],
    hotReleases: [],
    clashes: [],
});

export const rightsOf = (studio?: Business | null): RightsLibraryState => {
    const current = studio?.studioState?.rightsLibrary;
    if (!current) return emptyRights();
    return {
        holdings: Array.isArray(current.holdings) ? current.holdings : [],
        bids: Array.isArray(current.bids) ? current.bids : [],
        relations: Array.isArray(current.relations) ? current.relations : [],
        activity: Array.isArray(current.activity) ? current.activity : [],
        hotReleases: Array.isArray(current.hotReleases) ? current.hotReleases : [],
        lastHotYear: current.lastHotYear,
        clashes: Array.isArray(current.clashes) ? current.clashes : [],
    };
};

const clone = (player: Player): Player => JSON.parse(JSON.stringify(player));

const houses = (player: Player): Business[] =>
    (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE' && business.studioState);

const houseById = (player: Player, studioId: string): Business | undefined =>
    houses(player).find(business => business.id === studioId) || houses(player)[0];

const saveHouse = (player: Player, studio: Business) => {
    player.businesses = (player.businesses || []).map(business => business.id === studio.id ? studio : business);
};

export const findRecord = (player: Player, ipId: string): IpRecord | null => {
    for (const studio of houses(player)) {
        const hot = rightsOf(studio).hotReleases.find(row => row.record?.id === ipId);
        if (hot?.record) return hot.record as unknown as IpRecord;
    }
    return catalogueSync()?.find(row => row.id === ipId) || null;
};

export const allRecords = (player: Player): IpRecord[] => {
    const base = catalogueSync() || [];
    const hot = houses(player).flatMap(studio => rightsOf(studio).hotReleases.map(row => row.record as unknown as IpRecord));
    const seen = new Set(base.map(row => row.id));
    return [...hot.filter(row => row?.id && !seen.has(row.id)), ...base];
};

const active = (holding?: RightsHolding | null) =>
    Boolean(holding && (holding.status === 'OPTION' || holding.status === 'OWNED'));

export const playerHolding = (player: Player, studioId: string, ipId: string): RightsHolding | undefined =>
    rightsOf(houseById(player, studioId)).holdings.find(row => row.ipId === ipId && row.owner === 'PLAYER' && active(row));

export const exclusiveHold = (player: Player, ip: IpRecord): RightsHolding | undefined => {
    if (ip.publicDomain) return undefined;
    for (const studio of houses(player)) {
        const hit = rightsOf(studio).holdings.find(row => row.ipId === ip.id && active(row));
        if (hit) return hit;
    }
    return undefined;
};

export const rivalHasVersion = (player: Player, ipId: string): boolean =>
    houses(player).some(studio => rightsOf(studio).holdings.some(row =>
        row.ipId === ipId && row.owner === 'RIVAL' && active(row),
    ));

const authorMood = (studio: Business, authorId?: string): number => {
    if (!authorId) return 55;
    return rightsOf(studio).relations.find(row => row.authorId === authorId)?.mood ?? 55;
};

const ratesOf = (player: Player) => player.ownPlatform?.fxRates;

export const quoteRecord = (player: Player, ip: IpRecord, kind: 'option' | 'purchase') => {
    const anchor = kind === 'option' ? ip.optionUsd : ip.purchaseUsd;
    const quote = currencyFor(ip.fx || 'US', ratesOf(player));
    const local = anchor <= 0 ? 0 : roundLocal(anchor * quote.unitsPerUsd, quote.code);
    const usd = anchor <= 0 ? 0 : Math.max(0, Math.round(usdFromLocal(local, ip.fx || 'US', ratesOf(player))));
    return { usd, local, code: quote.code, label: anchor <= 0 ? 'Free' : formatLocalAmount(local, quote.code) };
};

const logUsd = (player: Player, amount: number, description: string) => {
    if (!player.finance) return;
    if (!Array.isArray(player.finance.history)) player.finance.history = [];
    player.finance.history.unshift({
        id: `tx_rights_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        week: player.currentWeek,
        year: player.age,
        amount: Math.trunc(amount),
        category: 'BUSINESS',
        description,
    });
    if (player.finance.history.length > 200) player.finance.history.pop();
};

const logStudio = (studio: Business, player: Player, amount: number, label: string) => {
    if (!studio.studioState) return;
    const ledger = Array.isArray(studio.studioState.financeLedger) ? studio.studioState.financeLedger : [];
    studio.studioState.financeLedger = [{
        id: `rights_ledger_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        week: player.currentWeek,
        year: player.age,
        amount: Math.trunc(amount),
        type: 'RIGHTS' as const,
        label,
    }, ...ledger].slice(0, 200);
};

const pay = (player: Player, studio: Business, usd: number, source: PaySource, label: string): RightsResult => {
    if (usd <= 0) return { player };
    if (source === 'EMPIRE') {
        if ((player.money || 0) < usd) return { player, error: 'Empire+ treasury does not have that cash.' };
        player.money -= usd;
        logUsd(player, -usd, label);
        const books = player.ownPlatform?.books;
        if (books) {
            books.lines = [{
                id: `rights_emp_${player.currentWeek}_${books.lines.length}`,
                week: player.currentWeek,
                year: player.age,
                amount: -usd,
                label,
                source: 'ACQUISITION' as const,
            }, ...(books.lines || [])].slice(0, 40);
        }
        return { player };
    }
    if (source === 'LOAN') {
        const borrowed = Math.max(50_000, Math.ceil(usd / 50_000) * 50_000);
        const issued = issueLoan(player, borrowed, 104, 'HOUSE');
        if (issued.error) return { player, error: issued.error };
        player = issued.player;
        const funded = houseById(player, studio.id);
        if (!funded || funded.balance < usd) return { player, error: 'The loan cleared, but the studio still cannot cover the cheque.' };
        funded.balance -= usd;
        logUsd(player, -usd, label);
        logStudio(funded, player, -usd, label);
        saveHouse(player, funded);
        return { player };
    }
    if (studio.balance < usd) return { player, error: 'The production house does not have that cash.' };
    studio.balance -= usd;
    logUsd(player, -usd, label);
    logStudio(studio, player, -usd, label);
    saveHouse(player, studio);
    return { player };
};

const remember = (studio: Business, headline: string, ipId: string, player: Player) => {
    const library = rightsOf(studio);
    const entry: RightsActivity = {
        id: `rights_news_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        week: player.currentWeek,
        year: player.age,
        headline,
        ipId,
    };
    library.activity = [entry, ...library.activity].slice(0, 40);
    studio.studioState!.rightsLibrary = library;
};

const postTrade = (player: Player, headline: string, famous: boolean) => {
    if (!famous) return;
    if (!Array.isArray(player.news)) player.news = [];
    player.news.unshift({
        id: `news_rights_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        headline,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'HIGH',
    });
    player.news = player.news.slice(0, 80);
    const post: XPost = {
        id: `x_rights_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        authorId: 'deadline_desk',
        authorName: 'Deadline Desk',
        authorHandle: '@DeadlineDesk',
        authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=DeadlineDesk',
        content: headline,
        timestamp: Date.now(),
        likes: 4000 + Math.floor(Math.random() * 20000),
        retweets: 800 + Math.floor(Math.random() * 4000),
        replies: 120 + Math.floor(Math.random() * 600),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'FILM_OPINION',
        sentiment: 'INDUSTRY',
    };
    if (!player.x) return;
    player.x.feed = [post, ...(player.x.feed || [])].slice(0, 80);
};

const RIVALS = ['Aurora Pictures', 'Lotus Gate', 'Northline', 'Red Lantern', 'Sahel Frame', 'Pampas Reels', 'Harbour & Co', 'Monsoon House'];

const rivalName = (ipId: string) => RIVALS[Math.abs(hash(ipId)) % RIVALS.length];

function hash(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
    return h;
}

const openBid = (studio: Business, bid: RightsBid) => {
    const library = rightsOf(studio);
    library.bids = [bid, ...library.bids.filter(row => row.ipId !== bid.ipId)];
    studio.studioState!.rightsLibrary = library;
};

const winBook = (
    player: Player,
    studio: Business,
    ip: IpRecord,
    paid: number,
    profitShare?: number,
): void => {
    const library = rightsOf(studio);
    const holding: RightsHolding = {
        ipId: ip.id,
        kind: 'BOOK',
        status: 'OPTION',
        owner: 'PLAYER',
        paidUsd: paid,
        optionWeek: getAbsoluteWeek(player.age, player.currentWeek),
        expiresWeek: getAbsoluteWeek(player.age, player.currentWeek) + OPTION_WEEKS,
        profitShare,
    };
    library.holdings = [holding, ...library.holdings.filter(row => !(row.ipId === ip.id && row.owner === 'PLAYER'))];
    library.bids = library.bids.map(row => row.ipId === ip.id && row.status === 'OPEN'
        ? { ...row, status: profitShare ? 'SHARE' : 'WON', profitShare }
        : row);
    studio.studioState!.rightsLibrary = library;
    const line = profitShare
        ? `${studio.name} took ${displayTitle(ip)} with a ${profitShare}% profit share.`
        : `${studio.name} optioned ${displayTitle(ip)}.`;
    remember(studio, line, ip.id, player);
    postTrade(player, line, ip.fame >= FAMOUS_FAME);
};

export const optionBook = (playerIn: Player, studioId: string, ipId: string, source: PaySource): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    if (!studio?.studioState || !ip || ip.kind !== 'BOOK') return { player: playerIn, error: 'That book is not on the shelf.' };
    if (ip.publicDomain) return takePublicDomain(playerIn, studio.id, ipId);
    if (exclusiveHold(player, ip)) return { player: playerIn, error: 'Someone already controls that book.' };
    if (authorMood(studio, ip.authorId) < 35) {
        return { player: playerIn, error: `${displayAuthor(ip)} will not sell to you after the last adaptation.` };
    }
    const quote = quoteRecord(player, ip, 'option');
    const paid = pay(player, houseById(player, studio.id)!, quote.usd, source, `Option: ${displayTitle(ip)} (${quote.label})`);
    if (paid.error) return { player: playerIn, error: paid.error };
    const next = paid.player;
    const funded = houseById(next, studio.id)!;
    if (ip.fame >= FAMOUS_FAME) {
        const rivalUsd = Math.round(quote.usd * (1.12 + ip.fame / 280));
        openBid(funded, {
            ipId: ip.id,
            playerUsd: quote.usd,
            rivalUsd,
            rivalName: rivalName(ip.id),
            round: 0,
            openedWeek: getAbsoluteWeek(next.age, next.currentWeek),
            status: 'OPEN',
        });
        const line = `Bidding war: ${rivalName(ip.id)} wants ${displayTitle(ip)}.`;
        remember(funded, line, ip.id, next);
        postTrade(next, line, true);
        saveHouse(next, funded);
        return { player: next, note: `${rivalName(ip.id)} came in over your option. Raise, offer a profit share, or walk away.` };
    }
    winBook(next, funded, ip, quote.usd);
    saveHouse(next, funded);
    return { player: next, note: `Optioned for 18 months. ${quote.label} left the books.` };
};

export const raiseBid = (playerIn: Player, studioId: string, ipId: string, source: PaySource): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    const bid = studio ? rightsOf(studio).bids.find(row => row.ipId === ipId && row.status === 'OPEN') : undefined;
    if (!studio || !ip || !bid) return { player: playerIn, error: 'There is no open bid on that title.' };
    const target = Math.round(bid.rivalUsd * 1.08);
    const gap = Math.max(0, target - bid.playerUsd);
    const paid = pay(player, houseById(player, studio.id)!, gap, source, `Bid raise: ${displayTitle(ip)}`);
    if (paid.error) return { player: playerIn, error: paid.error };
    const next = paid.player;
    const funded = houseById(next, studio.id)!;
    const library = rightsOf(funded);
    const current = library.bids.find(row => row.ipId === ipId && row.status === 'OPEN')!;
    current.playerUsd += gap;
    current.round += 1;
    if (ip.fame >= 85 && current.round < 2) {
        current.rivalUsd = Math.round(current.playerUsd * 1.08);
        library.bids = library.bids.map(row => row.ipId === ipId ? current : row);
        funded.studioState!.rightsLibrary = library;
        const line = `${current.rivalName} raised again on ${displayTitle(ip)}.`;
        remember(funded, line, ip.id, next);
        postTrade(next, line, true);
        saveHouse(next, funded);
        return { player: next, note: line };
    }
    funded.studioState!.rightsLibrary = library;
    winBook(next, funded, ip, current.playerUsd);
    saveHouse(next, funded);
    return { player: next, note: `You won ${displayTitle(ip)}. The option runs 18 months.` };
};

export const walkBid = (playerIn: Player, studioId: string, ipId: string): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    if (!studio || !ip) return { player: playerIn, error: 'That bid is already closed.' };
    const library = rightsOf(studio);
    const bid = library.bids.find(row => row.ipId === ipId && row.status === 'OPEN');
    if (!bid) return { player: playerIn, error: 'That bid is already closed.' };
    bid.status = 'WALKED';
    const holding: RightsHolding = {
        ipId: ip.id, kind: 'BOOK', status: 'OWNED', owner: 'RIVAL', rivalName: bid.rivalName, paidUsd: bid.rivalUsd,
    };
    library.holdings = [holding, ...library.holdings.filter(row => row.ipId !== ip.id)];
    studio.studioState!.rightsLibrary = library;
    const line = `${bid.rivalName} took ${displayTitle(ip)} after you walked.`;
    remember(studio, line, ip.id, player);
    postTrade(player, line, true);
    saveHouse(player, studio);
    return { player, note: line };
};

export const shareBid = (playerIn: Player, studioId: string, ipId: string, source: PaySource): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    const bid = studio ? rightsOf(studio).bids.find(row => row.ipId === ipId && row.status === 'OPEN') : undefined;
    if (!studio || !ip || !bid) return { player: playerIn, error: 'There is no open bid on that title.' };
    const share = profitShareAsk(ip.fame);
    const floor = Math.round(bid.rivalUsd * 0.85);
    const gap = Math.max(0, floor - bid.playerUsd);
    const paid = pay(player, houseById(player, studio.id)!, gap, source, `Profit-share bid: ${displayTitle(ip)}`);
    if (paid.error) return { player: playerIn, error: paid.error };
    const next = paid.player;
    const funded = houseById(next, studio.id)!;
    winBook(next, funded, ip, Math.max(bid.playerUsd, floor), share);
    saveHouse(next, funded);
    return { player: next, note: `${displayTitle(ip)} is yours. The rights holder keeps ${share}% of profit.` };
};

export const exerciseOption = (playerIn: Player, studioId: string, ipId: string, source: PaySource): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    const holding = studio ? rightsOf(studio).holdings.find(row => row.ipId === ipId && row.owner === 'PLAYER' && row.status === 'OPTION') : undefined;
    if (!studio || !ip || !holding) return { player: playerIn, error: 'You do not have a live option on that book.' };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    if (holding.expiresWeek && now > holding.expiresWeek) return { player: playerIn, error: 'The option already expired.' };
    const quote = quoteRecord(player, ip, 'purchase');
    const paid = pay(player, houseById(player, studio.id)!, quote.usd, source, `Purchase: ${displayTitle(ip)} (${quote.label})`);
    if (paid.error) return { player: playerIn, error: paid.error };
    const next = paid.player;
    const funded = houseById(next, studio.id)!;
    const library = rightsOf(funded);
    library.holdings = library.holdings.map(row => row.ipId === ipId && row.owner === 'PLAYER'
        ? { ...row, status: 'OWNED', paidUsd: row.paidUsd + quote.usd }
        : row);
    funded.studioState!.rightsLibrary = library;
    const line = `${funded.name} bought ${displayTitle(ip)} outright.`;
    remember(funded, line, ip.id, next);
    postTrade(next, line, ip.fame >= FAMOUS_FAME);
    saveHouse(next, funded);
    return { player: next, note: line };
};

export const takePublicDomain = (playerIn: Player, studioId: string, ipId: string): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    if (!studio?.studioState || !ip) return { player: playerIn, error: 'That title is not in the library.' };
    if (!ip.publicDomain) return { player: playerIn, error: 'That title is not public domain.' };
    if (playerHolding(player, studio.id, ip.id)) return { player: playerIn, error: 'You already hold it. Send it to the Development Lab.' };
    const library = rightsOf(studio);
    library.holdings = [{
        ipId: ip.id,
        kind: ip.kind,
        status: 'OWNED',
        owner: 'PLAYER',
        paidUsd: 0,
    }, ...library.holdings.filter(row => !(row.ipId === ip.id && row.owner === 'PLAYER'))];
    studio.studioState.rightsLibrary = library;
    const raced = library.holdings.some(row => row.ipId === ip.id && row.owner === 'RIVAL');
    const line = raced
        ? `${studio.name} claimed ${displayTitle(ip)}. A rival version will split the audience.`
        : `${studio.name} claimed the public-domain title ${displayTitle(ip)}.`;
    remember(studio, line, ip.id, player);
    if (raced) {
        library.clashes = [...library.clashes.filter(row => row.ipId !== ip.id), { ipId: ip.id, rivalName: 'a rival studio' }];
        postTrade(player, line, ip.fame >= 70);
    }
    saveHouse(player, studio);
    return { player, note: line };
};

export interface LifeAsk {
    priceUsd: number;
    localLabel: string;
    profitShare: number;
    finalCut: boolean;
    cameo: boolean;
    refuses: boolean;
    tone: string;
}

export const lifeAsk = (player: Player, ip: IpRecord): LifeAsk => {
    const quote = quoteRecord(player, ip, 'purchase');
    const attitude = ip.attitude || 'OPEN';
    const refuses = attitude === 'HOSTILE' && Math.abs(hash(ip.id)) % 100 < 40;
    const priceUsd = attitude === 'WARY' ? Math.round(quote.usd * 1.15)
        : attitude === 'PROTECTIVE' ? Math.round(quote.usd * 1.35)
            : attitude === 'HOSTILE' ? Math.round(quote.usd * 2.2)
                : quote.usd;
    const local = priceUsd <= 0 ? 'Free' : formatLocalAmount(
        roundLocal(priceUsd * currencyFor(ip.fx || 'US', ratesOf(player)).unitsPerUsd, currencyFor(ip.fx || 'US', ratesOf(player)).code),
        currencyFor(ip.fx || 'US', ratesOf(player)).code,
    );
    return {
        priceUsd,
        localLabel: local,
        profitShare: attitude === 'EAGER' ? 0 : attitude === 'OPEN' ? 5 : attitude === 'WARY' ? 10 : attitude === 'PROTECTIVE' ? 15 : 20,
        finalCut: attitude === 'WARY' || attitude === 'PROTECTIVE' || attitude === 'HOSTILE',
        cameo: attitude === 'PROTECTIVE' || attitude === 'HOSTILE',
        refuses,
        tone: attitude === 'EAGER' ? 'They want the film made.'
            : attitude === 'OPEN' ? 'They will sell, and they want a small share.'
                : attitude === 'WARY' ? 'They want final cut.'
                    : attitude === 'PROTECTIVE' ? 'They want final cut, a cameo, and a share.'
                        : refuses ? 'The estate refused. Money will not move them.'
                            : 'They named a hard price, final cut, a cameo, and a share.',
    };
};

export const negotiateLife = (
    playerIn: Player,
    studioId: string,
    ipId: string,
    action: 'ACCEPT' | 'SWEETEN' | 'SHARE' | 'WALK' | 'WITHOUT',
    source: PaySource,
): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    if (!studio?.studioState || !ip || ip.kind !== 'LIFE') return { player: playerIn, error: 'That life is not in the library.' };
    if (ip.publicDomain) return takePublicDomain(playerIn, studio.id, ipId);
    if (exclusiveHold(player, ip)) return { player: playerIn, error: 'Someone already holds those life rights.' };
    if (action === 'WALK') return { player: playerIn, note: 'You left the table.' };
    const ask = lifeAsk(player, ip);
    if (action === 'WITHOUT') {
        const developed = developIp(playerIn, studio.id, ipId, preferredFormat(ip), 40, true);
        return developed.error ? developed : { ...developed, note: `You are shooting ${displayTitle(ip)} with no life rights. Expect a lawsuit.` };
    }
    if (ask.refuses && action !== 'SWEETEN') {
        return { player: playerIn, error: `${displayTitle(ip)} refused the film. You can still shoot without rights, and you will be sued.` };
    }
    let price = ask.priceUsd;
    let finalCut = ask.finalCut;
    let cameo = ask.cameo;
    let share = ask.profitShare;
    if (action === 'SWEETEN') {
        price = Math.round(price * 1.25);
        if (finalCut) finalCut = false;
        else cameo = false;
        if (ask.refuses) return { player: playerIn, error: 'A sweeter cheque did not change their mind.' };
    }
    if (action === 'SHARE') {
        price = Math.round(price * 0.9);
        share = Math.max(share, 12);
        finalCut = false;
        if (ask.refuses || ip.attitude === 'PROTECTIVE') {
            return { player: playerIn, error: 'They will not trade control for a share.' };
        }
    }
    const paid = pay(player, houseById(player, studio.id)!, price, source, `Life rights: ${displayTitle(ip)}`);
    if (paid.error) return { player: playerIn, error: paid.error };
    const next = paid.player;
    const funded = houseById(next, studio.id)!;
    const library = rightsOf(funded);
    library.holdings = [{
        ipId: ip.id,
        kind: 'LIFE',
        status: 'OWNED',
        owner: 'PLAYER',
        paidUsd: price,
        profitShare: share,
        finalCut,
        cameo,
    }, ...library.holdings.filter(row => !(row.ipId === ip.id && row.owner === 'PLAYER'))];
    funded.studioState!.rightsLibrary = library;
    const bits = [share ? `${share}% of profit` : '', finalCut ? 'final cut' : '', cameo ? 'a cameo' : ''].filter(Boolean);
    const line = `${funded.name} closed life rights to ${displayTitle(ip)}${bits.length ? ` (${bits.join(', ')})` : ''}.`;
    remember(funded, line, ip.id, next);
    postTrade(next, line, ip.fame >= 70);
    saveHouse(next, funded);
    return { player: next, note: line };
};

export const developIp = (
    playerIn: Player,
    studioId: string,
    ipId: string,
    format: ProjectType,
    fidelity: number,
    unauthorized = false,
): RightsResult => {
    const player = clone(playerIn);
    const studio = houseById(player, studioId);
    const ip = findRecord(player, ipId);
    if (!studio?.studioState || !ip) return { player: playerIn, error: 'That title is not in the library.' };
    const holding = rightsOf(studio).holdings.find(row => row.ipId === ip.id && row.owner === 'PLAYER' && active(row));
    if (!unauthorized) {
        if (!holding) return { player: playerIn, error: 'Acquire the rights before the lab starts a draft.' };
        if (holding.developedScriptId) return { player: playerIn, error: 'That title is already in the Development Lab.' };
    }
    const preferred = preferredFormat(ip);
    const faithful = Math.max(0, Math.min(100, Math.round(fidelity)));
    let quality = Math.round(42 + ip.fame * 0.45);
    quality -= formatMismatchPenalty(preferred, format);
    if (faithful <= 30) quality += 4;
    if (faithful >= 75) quality -= 3;
    quality = Math.max(15, Math.min(96, quality));
    const title = displayTitle(ip);
    const script: Script = {
        id: `script_rights_${ip.id}_${Date.now()}`,
        title: format === 'SERIES' ? title : title,
        genres: [(ip.gameGenres[0] || (ip.kind === 'LIFE' ? 'BIOPIC' : 'DRAMA')) as Genre],
        status: 'IN_DEVELOPMENT',
        quality,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: format === 'SERIES' ? 3 : 2,
        isOriginal: false,
        projectType: format,
        format: ip.gameGenres[0] === 'ANIMATION' ? 'ANIMATED' : 'LIVE_ACTION',
        episodes: format === 'SERIES' ? Math.max(6, (ip.seasons || 1) * 6) : undefined,
        baseQuality: quality,
        logline: ip.logline,
        sourceMaterial: 'ADAPTATION',
        sourceMaterialType: ip.kind === 'LIFE' ? 'LIFE_RIGHTS' : 'BOOK',
        subjectName: title,
        subjectType: ip.kind === 'LIFE' ? (ip.sport ? 'ATHLETE' : 'PUBLIC_FIGURE') : 'HISTORICAL_EVENT',
        author: displayAuthor(ip),
        hype: ip.fame,
        purchaseCost: ip.purchaseUsd,
        createdAtWeek: player.currentWeek,
        rightsIpId: ip.id,
        rightsKind: ip.kind,
        fidelity: faithful,
        seriesSeasonsPotential: ip.seasons || 1,
        preferredFormat: preferred,
        adaptationAuthorId: ip.authorId,
        regionalFanbase: ip.fans,
        sourceFame: ip.fame,
        publicDomainSource: ip.publicDomain,
        rightsHot: Boolean(ip.hot),
        unauthorizedLife: unauthorized,
        tags: [
            ip.kind === 'LIFE' ? 'BIOPIC' : 'ADAPTATION',
            preferred === format ? 'FORMAT_FIT' : 'FORMAT_STRETCH',
            faithful <= 30 ? 'FAITHFUL' : faithful >= 70 ? 'LOOSE' : 'BALANCED',
        ],
    };
    studio.studioState.scripts = [...(studio.studioState.scripts || []), script];
    studio.studioState.purchasedIPTitles = Array.from(new Set([...(studio.studioState.purchasedIPTitles || []), title]));
    if (holding) {
        const library = rightsOf(studio);
        library.holdings = library.holdings.map(row => row === holding || (row.ipId === ip.id && row.owner === 'PLAYER')
            ? { ...row, developedScriptId: script.id }
            : row);
        studio.studioState.rightsLibrary = library;
    }
    saveHouse(player, studio);
    const stretch = preferred === format ? '' : ` A ${format === 'SERIES' ? 'series' : 'film'} is the weaker shape, so the draft starts lower.`;
    return {
        player,
        note: `${title} is in the Development Lab as a ${format === 'SERIES' ? `${ip.seasons || 1}-season series` : 'film'} (${script.totalDevelopmentWeeks} weeks).${stretch}`,
    };
};

export const commissionLibrarySeries = (playerIn: Player, ipId: string): RightsResult => {
    if (!playerIn.ownPlatform) return { player: playerIn, error: 'Open Empire+ before the Content Desk can commission a series.' };
    const player = clone(playerIn);
    const studio = houses(player)[0];
    const ip = findRecord(player, ipId);
    if (!studio || !ip) return { player: playerIn, error: 'That title is not in the library.' };
    const holding = rightsOf(studio).holdings.find(row => row.ipId === ip.id && row.owner === 'PLAYER' && row.status === 'OWNED');
    if (!holding) return { player: playerIn, error: 'Empire+ only commissions series you already own.' };
    if (preferredFormat(ip) !== 'SERIES' && (ip.seasons || 1) < 2) {
        return { player: playerIn, error: 'That story is a film, not a series.' };
    }
    const fee = Math.max(750_000, Math.round((ip.purchaseUsd || 1_000_000) * 0.2));
    player.money += fee;
    logUsd(player, fee, `${player.ownPlatform!.name} commission: ${displayTitle(ip)}`);
    const books = player.ownPlatform!.books;
    if (books) {
        books.lines = [{
            id: `rights_commission_${ip.id}`,
            week: player.currentWeek,
            year: player.age,
            amount: fee,
            label: `Commissioned ${displayTitle(ip)}`,
            source: 'COMMISSION' as const,
        }, ...(books.lines || [])].slice(0, 40);
    }
    player.ownPlatform!.catalogue = [...player.ownPlatform!.catalogue, {
        id: `library:${ip.id}`,
        source: 'OWNED',
        title: displayTitle(ip),
        genre: ip.kind === 'LIFE' ? 'Biopic series' : 'Adaptation series',
        language: ip.language,
        cost: 0,
        releaseWeekOffset: 16,
    }];
    const drafted = developIp(player, studio.id, ip.id, 'SERIES', 35);
    if (drafted.error) return { player: playerIn, error: drafted.error };
    return { player: drafted.player, note: `${player.ownPlatform!.name} ordered a series. ${fee.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} arrived, and the lab has the draft.` };
};

export const rightsGreenlightBlock = (player: Player, studio: Business, script?: Script | null): string | null => {
    if (!script?.rightsIpId || script.unauthorizedLife) return null;
    const holding = rightsOf(studio).holdings.find(row => row.ipId === script.rightsIpId && row.owner === 'PLAYER');
    if (!holding || holding.status === 'EXPIRED' || holding.status === 'LOST') return 'Those rights expired before greenlight.';
    if (script.rightsKind === 'BOOK' && holding.status === 'OPTION' && !script.publicDomainSource) {
        return 'Greenlight needs the purchase price. Exercise the option in the Rights Library.';
    }
    if (script.rightsKind === 'LIFE' && holding.status !== 'OWNED' && !script.publicDomainSource) return 'Life rights are not closed.';
    return null;
};

export const rightsHiddenFromScript = (player: Player, script: Script): Partial<ProjectHiddenStats> => {
    if (!script.rightsIpId || !script.rightsKind) return {};
    const boosts = fanbaseBoost(script.regionalFanbase || [], script.fidelity ?? 50, Boolean(script.rightsHot));
    return {
        rightsIpId: script.rightsIpId,
        rightsKind: script.rightsKind,
        fidelity: script.fidelity,
        rightsFanbaseBoost: boosts.theatrical,
        rightsStreamBoost: boosts.streaming,
        rightsClash: clashMultiplier(rivalHasVersion(player, script.rightsIpId) || Boolean(script.publicDomainSource && rivalHasVersion(player, script.rightsIpId))),
        adaptationAwardBonus: awardBonus(script.rightsKind, script.fidelity ?? 50),
        adaptationAuthorId: script.adaptationAuthorId,
        franchiseSeed: script.projectType === 'SERIES' || (script.seriesSeasonsPotential || 1) >= 3,
    };
};

const hitStock = (player: Player, factor: number) => {
    player.stocks = (player.stocks || []).map(stock => {
        if (!(stock.playerCompany || stock.id === 'stk_emp')) return stock;
        const price = Math.max(0.5, Math.round(stock.price * factor * 100) / 100);
        return { ...stock, price, priceHistory: [...(stock.priceHistory || []), price].slice(-52) };
    });
};

export const applyUnauthorizedShoot = (player: Player, script: Script, studioId: string): Player => {
    if (!script.unauthorizedLife || !script.rightsIpId) return player;
    const ip = findRecord(player, script.rightsIpId);
    const fame = ip?.fame ?? script.sourceFame ?? 60;
    const controversy = ip?.controversy ?? 40;
    const living = Boolean(ip?.living);
    const cost = settlementUsd(fame, controversy, living);
    const studio = houseById(player, studioId);
    if (studio) {
        studio.balance -= cost;
        logStudio(studio, player, -cost, `Life-rights settlement: ${script.title}`);
        saveHouse(player, studio);
    }
    logUsd(player, -cost, `Lawsuit settlement: ${script.title}`);
    player.stats.fame = Math.max(0, player.stats.fame - (4 + Math.round(controversy / 15)));
    player.stats.reputation = Math.max(0, (player.stats.reputation || 0) - 6);
    hitStock(player, 0.9);
    const headline = `SCANDAL: ${script.title} shot without life rights. Lawsuit settlement hits the studio.`;
    if (!Array.isArray(player.news)) player.news = [];
    player.news.unshift({
        id: `news_rights_suit_${script.id}`,
        headline,
        category: 'YOU',
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'HIGH',
    });
    postTrade(player, headline, true);
    const lifeEvent = {
        id: `rights_scandal_${script.id}`,
        type: 'SCANDAL' as const,
        title: `Rights lawsuit: ${script.title}`,
        description: `The estate of ${script.subjectName || script.title} sued. A settlement of $${cost.toLocaleString()} has already left the studio, and the stock took the headline personally.`,
        options: [
            {
                label: 'Apologise and pay',
                description: 'The cheque is already gone. A public apology claws back a little reputation.',
                impact: (p: Player) => {
                    p.stats.reputation = Math.min(100, (p.stats.reputation || 0) + 2);
                    return { updatedPlayer: p, log: `You apologised for ${script.title}. The settlement stands.` };
                },
            },
            {
                label: 'Fight the estate',
                description: 'Risk a larger bill, a deeper fame hit, and another stock drop.',
                impact: (p: Player) => {
                    const extra = Math.round(cost * 0.4);
                    const biz = houseById(p, studioId);
                    if (biz) biz.balance -= extra;
                    p.stats.fame = Math.max(0, p.stats.fame - 6);
                    p.stats.reputation = Math.max(0, (p.stats.reputation || 0) - 4);
                    hitStock(p, 0.94);
                    return { updatedPlayer: p, log: `Fighting the estate of ${script.title} cost another $${extra.toLocaleString()}.` };
                },
            },
        ],
    };
    const scheduled = {
        id: lifeEvent.id,
        week: player.currentWeek,
        type: 'SCANDAL' as const,
        title: lifeEvent.title,
        data: { lifeEvent, rightsScandal: { scriptId: script.id, cost } },
    };
    player.pendingEvents = [scheduled, ...(player.pendingEvents || [])];
    return player;
};

export const applyRightsToPotential = (rel: { projectDetails: { hiddenStats?: ProjectHiddenStats; franchiseId?: string; rightsIpId?: string }; totalGross: number; budget: number; imdbRating?: number }, potential: FuturePotential): FuturePotential => {
    const stats = rel.projectDetails.hiddenStats;
    if (!stats?.franchiseSeed) return potential;
    const hit = rel.totalGross > rel.budget * 1.6 || (rel.imdbRating || 0) >= 7.2;
    if (!hit) return potential;
    potential.franchiseChance = Math.max(potential.franchiseChance, 70);
    potential.sequelChance = Math.max(potential.sequelChance, 60);
    potential.isFranchiseStarter = true;
    if (!rel.projectDetails.franchiseId && stats.rightsIpId) {
        rel.projectDetails.franchiseId = `rights_${stats.rightsIpId}`;
    }
    return potential;
};

export const registerAdaptationResult = (player: Player, rel: { imdbRating?: number; projectDetails: { studioId?: string; hiddenStats?: ProjectHiddenStats; title?: string } }) => {
    const authorId = rel.projectDetails.hiddenStats?.adaptationAuthorId;
    const studio = (player.businesses || []).find(business => business.id === rel.projectDetails.studioId);
    if (!authorId || !studio?.studioState) return;
    const rating = rel.imdbRating || 0;
    const fidelity = rel.projectDetails.hiddenStats?.fidelity ?? 50;
    let delta = rating >= 7 && fidelity <= 35 ? 18 : rating >= 7 ? 6 : rating < 5 ? -22 : -4;
    if (fidelity >= 70 && rating < 6.5) delta -= 10;
    const library = rightsOf(studio);
    const current = library.relations.find(row => row.authorId === authorId);
    const mood = Math.max(0, Math.min(100, (current?.mood ?? 55) + delta));
    library.relations = [
        { authorId, mood, lastRating: rating },
        ...library.relations.filter(row => row.authorId !== authorId),
    ];
    const backlash = (rel.projectDetails.hiddenStats?.fidelity || 0) >= 70
        && rating < 6.5
        && (rel.projectDetails.hiddenStats?.rightsFanbaseBoost || 0) >= 0.1;
    if (backlash) {
        const line = `Fans revolted against the loose adaptation of ${rel.projectDetails.title || 'the book'}.`;
        library.activity = [{ id: `fan_${Date.now()}`, week: player.currentWeek, year: player.age, headline: line, ipId: rel.projectDetails.hiddenStats?.rightsIpId || '' }, ...library.activity].slice(0, 40);
        postTrade(player, line, true);
    }
    const ipId = rel.projectDetails.hiddenStats?.rightsIpId;
    if (ipId) {
        library.holdings = library.holdings.map(row => row.ipId === ipId && row.owner === 'PLAYER'
            ? {
                ...row,
                sequelFlag: rating >= 7,
                franchiseFlag: Boolean(rel.projectDetails.hiddenStats?.franchiseSeed) && rating >= 7.2,
            }
            : row);
    }
    studio.studioState.rightsLibrary = library;
};

export const featuredScripts = (player: Player, week: number): Script[] => {
    const records = allRecords(player).filter(ip => !exclusiveHold(player, ip) || ip.publicDomain);
    const available = records.filter(ip => {
        if (ip.publicDomain) return !playerHolding(player, houses(player)[0]?.id || '', ip.id);
        return !exclusiveHold(player, ip);
    });
    const ranked = [...available].sort((a, b) => {
        const score = (ip: IpRecord) => (ip.hot ? 1000 : 0) + ip.fame + (hash(`${week}:${ip.id}`) % 17);
        return score(b) - score(a);
    });
    return ranked.slice(0, 4).map(ip => {
        const title = displayTitle(ip);
        const quote = quoteRecord(player, ip, ip.publicDomain ? 'purchase' : ip.kind === 'LIFE' ? 'purchase' : 'option');
        return {
            id: `shelf_${ip.id}`,
            title,
            author: displayAuthor(ip),
            genres: [(ip.gameGenres[0] || 'DRAMA') as Genre],
            status: 'READY' as const,
            quality: Math.round(40 + ip.fame * 0.5),
            options: [],
            writerId: null,
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: 0,
            isOriginal: false,
            projectType: preferredFormat(ip),
            baseQuality: Math.round(40 + ip.fame * 0.5),
            logline: ip.logline,
            sourceMaterial: 'ADAPTATION' as const,
            sourceMaterialType: ip.kind === 'LIFE' ? 'LIFE_RIGHTS' as const : 'BOOK' as const,
            hype: ip.fame,
            purchaseCost: quote.usd,
            rightsIpId: ip.id,
            rightsKind: ip.kind,
            tags: [ip.publicDomain ? 'PUBLIC_DOMAIN' : ip.fame >= FAMOUS_FAME ? 'BIDDING_WAR' : 'RIGHTS', ip.region],
        };
    });
};
