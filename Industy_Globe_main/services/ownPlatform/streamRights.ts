import {
    LaunchRegionId,
    Player,
    StreamRightFormat,
    StreamRightKind,
    StreamRightsAuction,
    StreamRightsDesk,
    StreamRightsHolding,
    StreamRightsListing,
    StreamTerritoryKind,
} from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { publicBrandName } from '../rights/alterName';
import { DEAL_BIDDERS, LAUNCH_REGIONS, getCountry, getRegion, hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { cityById } from './serverCities';
import { contentVeto, firstLookDiscount } from './stakeSale';
import { formatCompact, formatPeople } from './logic';

export interface RightsAction {
    player: Player;
    error?: string;
    note?: string;
}

export interface TerritoryChoice {
    territory: StreamTerritoryKind;
    countryId?: string;
    regionId?: LaunchRegionId;
}

export interface RightsQuote {
    price: number;
    lift: number;
    weeklySubs: number;
    weeklyEarn: number;
    years: number;
    kind: StreamRightKind;
    territory: StreamTerritoryKind;
    countryId?: string;
    regionId?: LaunchRegionId;
    territoryName: string;
    kindLine: string;
    territoryLine: string;
    discountLine: string;
    liftLine: string;
}

export const RIGHT_LINES: Record<StreamRightKind, { label: string; line: string }> = {
    EXCLUSIVE: { label: 'Exclusive', line: 'Only on your platform. Higher price, bigger subscriber lift.' },
    NON_EXCLUSIVE: { label: 'Non-exclusive', line: 'Others can show it too. Cheaper, and the lift is smaller.' },
    WINDOW: { label: 'Window', line: 'First on you for six months, then it plays wider and the lift cools.' },
};

const TERRITORY_LINE: Record<StreamTerritoryKind, string> = {
    WORLD: 'Every country. Full price.',
    REGION: 'This region only. Cheaper than a world deal.',
    COUNTRY: 'This country only. An office here cuts the price again.',
};

const KIND_PRICE = { EXCLUSIVE: 1.65, NON_EXCLUSIVE: 0.68, WINDOW: 1.2 };
const KIND_LIFT = { EXCLUSIVE: 1.4, NON_EXCLUSIVE: 0.55, WINDOW: 1.08 };
const WINDOW_WEEKS = 26;
const REMIND_WEEKS = 8;
const HIT_LIFT = 18_000;
const KINDS = new Set<StreamRightKind>(['EXCLUSIVE', 'NON_EXCLUSIVE', 'WINDOW']);
const FORMATS = new Set<StreamRightFormat>(['FILM', 'SHOW']);
const TERRITORIES = new Set<StreamTerritoryKind>(['WORLD', 'REGION', 'COUNTRY']);
const REGIONS = new Set<LaunchRegionId>(LAUNCH_REGIONS.map(row => row.id));

interface Seed {
    id: string;
    title: string;
    format: StreamRightFormat;
    genre: string;
    language: string;
    home: string;
    base: number;
    years: number;
}

const SEEDS: Seed[] = [
    { id: 'wires-water', title: 'Wires Across Water', format: 'SHOW', genre: 'Documentary', language: 'English', home: 'GB', base: 2_400_000, years: 2 },
    { id: 'roof-open', title: 'The Roof Was Open', format: 'FILM', genre: 'Drama', language: 'Arabic', home: 'EG', base: 3_200_000, years: 2 },
    { id: 'harbour-light', title: 'Harbour Light', format: 'SHOW', genre: 'Drama', language: 'English', home: 'ZA', base: 3_600_000, years: 2 },
    { id: 'third-mainland', title: 'Third Mainland', format: 'FILM', genre: 'Crime', language: 'English', home: 'NG', base: 4_100_000, years: 2 },
    { id: 'low-tide', title: 'Low Tide Club', format: 'SHOW', genre: 'Comedy', language: 'English', home: 'AU', base: 4_800_000, years: 2 },
    { id: 'salt-lens', title: 'Salt on the Lens', format: 'FILM', genre: 'Romance', language: 'Portuguese', home: 'BR', base: 6_200_000, years: 3 },
    { id: 'grey-hour', title: 'Grey Hour', format: 'SHOW', genre: 'Crime', language: 'German', home: 'DE', base: 7_100_000, years: 3 },
    { id: 'night-market', title: 'Night Market', format: 'SHOW', genre: 'Thriller', language: 'Korean', home: 'KR', base: 7_600_000, years: 3 },
    { id: 'north-roma', title: 'North of Roma', format: 'FILM', genre: 'Action', language: 'Spanish', home: 'MX', base: 8_000_000, years: 3 },
    { id: 'after-credits', title: 'After the Credits', format: 'FILM', genre: 'Drama', language: 'French', home: 'FR', base: 8_400_000, years: 3 },
    { id: 'monsoon-office', title: 'Monsoon Office', format: 'SHOW', genre: 'Drama', language: 'Hindi', home: 'IN', base: 9_200_000, years: 3 },
    { id: 'glass-orchard', title: 'Glass Orchard', format: 'FILM', genre: 'Romance', language: 'Mandarin', home: 'CN', base: 9_800_000, years: 3 },
    { id: 'paper-cranes', title: 'Paper Cranes', format: 'SHOW', genre: 'Romance', language: 'Korean', home: 'KR', base: 11_000_000, years: 3 },
    { id: 'station-back', title: 'Station Back', format: 'FILM', genre: 'Thriller', language: 'Japanese', home: 'JP', base: 12_400_000, years: 4 },
    { id: 'red-signal', title: 'Red Signal', format: 'FILM', genre: 'Action', language: 'Hindi', home: 'IN', base: 13_500_000, years: 4 },
    { id: 'long-night', title: 'The Long Night', format: 'SHOW', genre: 'Thriller', language: 'English', home: 'US', base: 16_800_000, years: 4 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const nowOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);

export const rivalLook = (player: Player, rivalId: string): { name: string; color: string } => {
    const rival = player.ownPlatform?.rivals.find(row => row.id === rivalId);
    const bidder = DEAL_BIDDERS.find(row => row.id === rivalId);
    return {
        name: publicBrandName(rival?.name || bidder?.name || 'A rival'),
        color: bidder?.color || '#fb7185',
    };
};

export const territoryName = (choice: TerritoryChoice, listing?: StreamRightsListing): string => {
    if (choice.territory === 'WORLD') return 'World';
    if (choice.territory === 'REGION') return getRegion(choice.regionId || listing?.regionId || 'ASIA').name;
    const country = getCountry(choice.countryId || listing?.homeCountryId || '');
    return country?.name || 'One country';
};

const fork = (player: Player): Player => {
    const state = player.ownPlatform;
    if (!state) return { ...player };
    const desk = state.streamRights;
    return {
        ...player,
        logs: [...(player.logs || [])],
        ownPlatform: {
            ...state,
            rivals: (state.rivals || []).map(row => ({ ...row })),
            books: state.books
                ? { ...state.books, lines: [...state.books.lines], history: [...(state.books.history || [])] }
                : state.books,
            streamRights: desk
                ? {
                    ...desk,
                    listings: desk.listings.map(row => ({ ...row })),
                    holdings: desk.holdings.map(row => ({ ...row })),
                    auction: desk.auction ? { ...desk.auction } : null,
                }
                : desk,
        },
    };
};

const log = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral') => {
    player.logs = [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type }];
};

const pickRival = (player: Player, seedKey: string, regionId: LaunchRegionId): string | undefined => {
    const rivals = (player.ownPlatform?.rivals || []).filter(row => row.status === 'ACTIVE');
    if (!rivals.length) return undefined;
    const regional = rivals.filter(row => row.homeRegion === regionId);
    const pool = regional.length ? regional : rivals;
    return pool[hashString(seedKey) % pool.length].id;
};

const makeListing = (seed: Seed, player: Player, salt: number): StreamRightsListing => {
    const country = getCountry(seed.home);
    const roll = hashString(`${player.id}:${seed.id}:${salt}`);
    const suggested = (['EXCLUSIVE', 'NON_EXCLUSIVE', 'WINDOW'] as const)[roll % 3];
    return {
        id: seed.id,
        title: seed.title,
        format: seed.format,
        genre: seed.genre,
        language: seed.language,
        homeCountryId: seed.home,
        regionId: country?.regionId || 'ASIA',
        basePrice: seed.base,
        years: seed.years,
        suggested,
        rivalId: roll % 2 === 0 ? pickRival(player, `${seed.id}:${salt}`, country?.regionId || 'ASIA') : undefined,
        weeksLeft: 4 + (roll % 4),
    };
};

const buildDesk = (player: Player, salt: number): StreamRightsDesk => {
    const listings = SEEDS.slice(0, 8).map(seed => makeListing(seed, player, salt));
    return { anchorAbsolute: salt, listings, holdings: [], auction: null };
};

const refill = (desk: StreamRightsDesk, player: Player, salt: number) => {
    const blocked = new Set<string>([
        ...desk.listings.map(row => row.id),
        ...desk.holdings.map(row => row.listingId || ''),
    ]);
    SEEDS.forEach(seed => {
        if (desk.listings.length >= 8) return;
        if (blocked.has(seed.id)) return;
        desk.listings.push(makeListing(seed, player, salt + desk.listings.length));
        blocked.add(seed.id);
    });
    desk.anchorAbsolute = salt;
};

export const quoteDeal = (player: Player, listing: StreamRightsListing, kind: StreamRightKind, choice: TerritoryChoice): RightsQuote => {
    const territory = choice.territory;
    const countryId = territory === 'COUNTRY' ? (choice.countryId || listing.homeCountryId) : undefined;
    const regionId = territory === 'REGION' ? (choice.regionId || listing.regionId) : undefined;
    const country = getCountry(countryId || listing.homeCountryId);
    const home = getCountry(listing.homeCountryId);
    const audience = country?.audienceM || home?.audienceM || 10;
    const territoryFactor = territory === 'WORLD'
        ? 1
        : territory === 'REGION'
            ? 0.64
            : clamp(0.4 + audience / 120, 0.42, 0.72);
    const state = player.ownPlatform;
    const offices = state?.offices || [];
    const hqCountry = cityById(state?.hqCityId)?.countryId;
    const dealCountry = territory === 'COUNTRY' ? countryId : listing.homeCountryId;
    const hasOffice = Boolean(dealCountry && offices.some(row => row.countryId === dealCountry));
    const hasHq = Boolean(dealCountry && hqCountry === dealCountry);
    let officeFactor = 1;
    let discountLine = '';
    const place = getCountry(dealCountry || '')?.name || 'This country';
    if (territory === 'COUNTRY' && hasOffice) {
        officeFactor = 0.75;
        discountLine = `${place} office cuts this local price.`;
    } else if (territory === 'COUNTRY' && hasHq) {
        officeFactor = 0.88;
        discountLine = `Headquarters in ${place} trims the home price.`;
    } else if (territory === 'REGION' && (hasOffice || hasHq)) {
        officeFactor = 0.86;
        discountLine = hasOffice ? `Your ${place} office trims this regional deal.` : `Headquarters in ${place} trims this regional deal.`;
    } else if (territory === 'WORLD' && hasOffice) {
        officeFactor = 0.92;
        discountLine = `Your ${place} office trims the world price a little.`;
    } else if (territory === 'WORLD' && hasHq) {
        officeFactor = 0.94;
        discountLine = `Headquarters in ${place} trims the world price a little.`;
    }
    const look = firstLookDiscount(player);
    const lookFactor = look ? 1 - look.rate : 1;
    if (look) discountLine = `${discountLine ? `${discountLine} ` : ''}${look.name}'s first-look takes ${Math.round(look.rate * 100)}% off.`;
    const price = Math.max(250_000, Math.round(listing.basePrice * KIND_PRICE[kind] * territoryFactor * officeFactor * lookFactor));
    const lift = Math.round(clamp((5_000 + listing.basePrice / 700) * KIND_LIFT[kind] * (territory === 'WORLD' ? 1 : territory === 'REGION' ? 0.72 : 0.5) * (hasOffice ? 1.08 : 1), 1_200, 90_000));
    const weeklySubs = Math.round(clamp(lift / 18, 150, 6_000));
    const weeklyEarn = Math.round(clamp(price / (listing.years * 52) * 0.35, 4_000, 180_000));
    const named = territoryName({ territory, countryId, regionId }, listing);
    return {
        price,
        lift,
        weeklySubs,
        weeklyEarn,
        years: listing.years,
        kind,
        territory,
        countryId,
        regionId,
        territoryName: named,
        kindLine: RIGHT_LINES[kind].line,
        territoryLine: TERRITORY_LINE[territory],
        discountLine,
        liftLine: `About +${formatPeople(lift)} subscribers while it is on.`,
    };
};

const choiceFromAuction = (auction: StreamRightsAuction): TerritoryChoice => ({
    territory: auction.territory,
    countryId: auction.countryId,
    regionId: auction.regionId,
});

const shortCash = (player: Player, cost: number): string | null => {
    const have = readCompanyCash(player);
    if (have >= cost) return null;
    return `Company cash is short ${formatCompact(cost - have)}. Personal cash is not used.`;
};

const awardRival = (player: Player, rivalId: string, title: string, lift: number) => {
    const rival = player.ownPlatform?.rivals.find(row => row.id === rivalId);
    if (!rival) return;
    rival.householdsM = Math.max(0.05, rival.householdsM + Math.max(0.04, lift / 450_000));
    rival.note = `Took ${title}.`;
};

const hurtIfHit = (player: Player, holding: StreamRightsHolding, why: string): string => {
    if (holding.lift < HIT_LIFT || !player.ownPlatform) return why;
    const loss = Math.round(holding.lift * 0.35);
    player.ownPlatform.subscribers = Math.max(0, player.ownPlatform.subscribers - loss);
    return `${why} Subscribers felt ${holding.title} leave (−${formatPeople(loss)}).`;
};

const signHolding = (
    player: Player,
    listing: StreamRightsListing,
    quote: RightsQuote,
    paid: number,
    source: 'MARKET' | 'OWN_FILM',
    originId?: string,
): RightsAction => {
    if (!player.ownPlatform?.streamRights) return { player, error: 'Open the rights floor first.' };
    const veto = contentVeto(player, paid);
    if (veto) return { player, error: veto };
    const broke = paid > 0 ? shortCash(player, paid) : null;
    if (broke) return { player, error: broke };
    const next = fork(player);
    const desk = next.ownPlatform!.streamRights!;
    const absolute = nowOf(next);
    if (paid > 0) addCompanyCash(next, -paid, `Rights: ${listing.title} (${RIGHT_LINES[quote.kind].label}, ${quote.territoryName})`, 'TITLE');
    const holding: StreamRightsHolding = {
        id: `hold_${listing.id}_${absolute}`,
        listingId: source === 'MARKET' ? listing.id : undefined,
        title: listing.title,
        format: listing.format,
        genre: listing.genre,
        language: listing.language,
        kind: quote.kind,
        territory: quote.territory,
        countryId: quote.countryId,
        regionId: quote.regionId,
        years: quote.years,
        expiresAbsolute: absolute + quote.years * 52,
        windowEndsAbsolute: quote.kind === 'WINDOW' ? absolute + WINDOW_WEEKS : undefined,
        paid,
        lift: quote.lift,
        weeklySubs: quote.weeklySubs,
        weeklyEarn: source === 'OWN_FILM' ? quote.weeklyEarn : quote.weeklyEarn,
        lastEarn: 0,
        source,
        originId,
    };
    desk.holdings = [holding, ...desk.holdings].slice(0, 40);
    if (source === 'MARKET') {
        desk.listings = desk.listings.filter(row => row.id !== listing.id);
        if (desk.auction?.listingId === listing.id) desk.auction = null;
    }
    const note = paid > 0
        ? `Signed ${listing.title}. ${formatCompact(paid)} left company cash. Personal cash did not move.`
        : `${listing.title} is on Empire+. The film already cost money to make, so company cash did not move.`;
    log(next, note, 'positive');
    return { player: next, note };
};

export const ensureRightsDesk = (player: Player): Player => {
    const state = player.ownPlatform;
    if (!state) return player;
    if (state.streamRights && state.streamRights.listings.length > 0) return player;
    const next = fork(player);
    const existing = next.ownPlatform!.streamRights;
    const fresh = buildDesk(next, nowOf(next));
    if (!existing) {
        next.ownPlatform!.streamRights = fresh;
        return next;
    }
    existing.listings = fresh.listings.filter(row => !existing.holdings.some(hold => hold.listingId === row.id));
    if (existing.listings.length < 4) refill(existing, next, nowOf(next));
    next.ownPlatform!.streamRights = existing;
    return next;
};

export const openTable = (player: Player, listingId: string, kind: StreamRightKind, choice: TerritoryChoice): RightsAction => {
    const listing = player.ownPlatform?.streamRights?.listings.find(row => row.id === listingId);
    if (!listing) return { player, error: 'That title has left the floor.' };
    if (!listing.rivalId) return { player, error: 'No rival is at this table. Sign it directly.' };
    if (!KINDS.has(kind) || !TERRITORIES.has(choice.territory)) return { player, error: 'Pick a rights type and a territory.' };
    const quote = quoteDeal(player, listing, kind, choice);
    const roll = hashString(`${player.id}:${listing.id}:bid`);
    const rivalBid = Math.round(quote.price * (0.9 + (roll % 22) / 100));
    const rivalCeiling = Math.round(quote.price * (1.08 + (roll % 20) / 100));
    const next = fork(player);
    next.ownPlatform!.streamRights!.auction = {
        listingId,
        kind,
        territory: choice.territory,
        countryId: quote.countryId,
        regionId: quote.regionId,
        ask: quote.price,
        playerBid: quote.price,
        rivalBid: Math.min(rivalBid, rivalCeiling),
        rivalCeiling: Math.max(rivalCeiling, rivalBid),
        rivalId: listing.rivalId,
        round: 1,
    };
    return { player: next, note: `${rivalLook(player, listing.rivalId).name} is at the table.` };
};

export const raiseBid = (player: Player): RightsAction => {
    const auction = player.ownPlatform?.streamRights?.auction;
    if (!auction) return { player, error: 'The table is empty.' };
    const step = Math.max(100_000, Math.round(auction.ask * 0.06));
    const nextBid = auction.playerBid + step;
    const broke = shortCash(player, nextBid);
    if (broke) return { player, error: broke };
    const veto = contentVeto(player, nextBid);
    if (veto) return { player, error: veto };
    const next = fork(player);
    const live = next.ownPlatform!.streamRights!.auction!;
    live.playerBid = nextBid;
    live.round += 1;
    if (live.rivalBid < live.rivalCeiling && hashString(`${live.listingId}:${live.round}`) % 100 < 72) {
        live.rivalBid = Math.min(live.rivalCeiling, live.rivalBid + Math.round(step * 0.85));
    }
    const ahead = live.playerBid >= live.rivalBid;
    return { player: next, note: ahead ? 'You are ahead. Sign it, or raise again.' : 'The rival answered. Raise, meet, or walk.' };
};

export const meetBid = (player: Player): RightsAction => {
    const auction = player.ownPlatform?.streamRights?.auction;
    if (!auction) return { player, error: 'The table is empty.' };
    const broke = shortCash(player, auction.rivalBid);
    if (broke) return { player, error: broke };
    const veto = contentVeto(player, auction.rivalBid);
    if (veto) return { player, error: veto };
    const next = fork(player);
    const live = next.ownPlatform!.streamRights!.auction!;
    live.playerBid = Math.max(live.playerBid, live.rivalBid);
    return { player: next, note: 'You matched the rival. Sign to close.' };
};

export const walkBid = (player: Player): RightsAction => {
    const desk = player.ownPlatform?.streamRights;
    const auction = desk?.auction;
    if (!desk || !auction) return { player, error: 'The table is empty.' };
    const listing = desk.listings.find(row => row.id === auction.listingId);
    const next = fork(player);
    const live = next.ownPlatform!.streamRights!;
    live.auction = null;
    const look = rivalLook(player, auction.rivalId);
    if (listing && auction.rivalBid >= auction.ask * 0.9) {
        const quote = quoteDeal(player, listing, auction.kind, choiceFromAuction(auction));
        live.listings = live.listings.filter(row => row.id !== listing.id);
        awardRival(next, auction.rivalId, listing.title, quote.lift);
        const note = `${look.name} took ${listing.title}. You paid nothing.`;
        log(next, note, 'negative');
        return { player: next, note };
    }
    if (listing) {
        const row = live.listings.find(item => item.id === listing.id);
        if (row) delete row.rivalId;
    }
    return { player: next, note: 'You walked. The title is still on the floor, without that rival.' };
};

export const signTable = (player: Player): RightsAction => {
    const desk = player.ownPlatform?.streamRights;
    const auction = desk?.auction;
    if (!desk || !auction) return { player, error: 'The table is empty.' };
    if (auction.playerBid < auction.rivalBid) return { player, error: 'The rival is still ahead. Raise or meet.' };
    const listing = desk.listings.find(row => row.id === auction.listingId);
    if (!listing) return { player, error: 'That title has left the floor.' };
    const quote = quoteDeal(player, listing, auction.kind, choiceFromAuction(auction));
    quote.price = auction.playerBid;
    return signHolding(player, listing, quote, auction.playerBid, 'MARKET');
};

export const buyListing = (player: Player, listingId: string, kind: StreamRightKind, choice: TerritoryChoice): RightsAction => {
    const listing = player.ownPlatform?.streamRights?.listings.find(row => row.id === listingId);
    if (!listing) return { player, error: 'That title has left the floor.' };
    if (listing.rivalId) return { player, error: 'A rival wants this. Open the table.' };
    const quote = quoteDeal(player, listing, kind, choice);
    return signHolding(player, listing, quote, quote.price, 'MARKET');
};

export interface OwnFilmLot {
    releaseId: string | null;
    title: string;
    genre: string;
    budget: number;
    gross: number;
    simulated: boolean;
}

export const shelveOwnFilm = (player: Player, lot: OwnFilmLot): RightsAction => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ first.' };
    if (lot.simulated) return { player, error: 'The practice room changes nothing.' };
    const ready = ensureRightsDesk(player);
    const holdings = ready.ownPlatform?.streamRights?.holdings || [];
    const already = holdings.some(row => row.source === 'OWN_FILM' && (row.originId === (lot.releaseId || lot.title) || row.title.toLowerCase() === lot.title.toLowerCase()));
    if (already) return { player, error: `${lot.title} is already in the contract vault.` };
    const listing: StreamRightsListing = {
        id: `own-${lot.releaseId || lot.title}`,
        title: lot.title,
        format: 'FILM',
        genre: lot.genre || 'Drama',
        language: 'English',
        homeCountryId: 'US',
        regionId: 'NORTH_AMERICA',
        basePrice: Math.max(lot.budget, 1_000_000),
        years: 5,
        suggested: 'EXCLUSIVE',
        weeksLeft: 0,
    };
    const quote = quoteDeal(ready, listing, 'EXCLUSIVE', { territory: 'WORLD' });
    const lift = Math.round(clamp(6_000 + (lot.gross || lot.budget) / 8_000, 4_000, 70_000));
    quote.lift = lift;
    quote.weeklySubs = Math.round(clamp(lift / 18, 200, 5_000));
    quote.weeklyEarn = Math.round(clamp((lot.gross || lot.budget) * 0.00035, 4_000, 80_000));
    quote.price = 0;
    return signHolding(ready, listing, quote, 0, 'OWN_FILM', lot.releaseId || lot.title);
};

export const renewHolding = (player: Player, holdingId: string): RightsAction => {
    const holding = player.ownPlatform?.streamRights?.holdings.find(row => row.id === holdingId);
    if (!holding) return { player, error: 'That contract is not in the vault.' };
    const cost = holding.paid > 0 ? Math.round(holding.paid * 0.72) : 0;
    const veto = contentVeto(player, cost);
    if (veto) return { player, error: veto };
    const broke = cost > 0 ? shortCash(player, cost) : null;
    if (broke) return { player, error: broke };
    const next = fork(player);
    const live = next.ownPlatform!.streamRights!.holdings.find(row => row.id === holdingId)!;
    if (cost > 0) addCompanyCash(next, -cost, `Renewed ${live.title}`, 'TITLE');
    const absolute = nowOf(next);
    live.expiresAbsolute = Math.max(absolute, live.expiresAbsolute) + live.years * 52;
    live.lastRemindAbsolute = undefined;
    const note = cost > 0
        ? `Renewed ${live.title} for ${formatCompact(cost)} of company cash.`
        : `Renewed ${live.title}. It is your film, so the renewal is free.`;
    log(next, note, 'positive');
    return { player: next, note };
};

export const dropHolding = (player: Player, holdingId: string): RightsAction => {
    const holding = player.ownPlatform?.streamRights?.holdings.find(row => row.id === holdingId);
    if (!holding || !player.ownPlatform?.streamRights) return { player, error: 'That contract is not in the vault.' };
    const next = fork(player);
    const desk = next.ownPlatform!.streamRights!;
    const live = desk.holdings.find(row => row.id === holdingId)!;
    desk.holdings = desk.holdings.filter(row => row.id !== holdingId);
    const note = hurtIfHit(next, live, `Dropped ${live.title}.`);
    log(next, note, live.lift >= HIT_LIFT ? 'negative' : 'neutral');
    return { player: next, note };
};

export const weeksRemaining = (player: Player, holding: StreamRightsHolding): number =>
    Math.max(0, holding.expiresAbsolute - nowOf(player));

export const windowOpen = (player: Player, holding: StreamRightsHolding): boolean =>
    Boolean(holding.windowEndsAbsolute && nowOf(player) < holding.windowEndsAbsolute);

export interface RightsWeekNote {
    msg: string;
    type: 'positive' | 'negative' | 'neutral';
}

const cooled = (player: Player, holding: StreamRightsHolding) => (windowOpen(player, holding) || holding.kind !== 'WINDOW' ? 1 : 0.55);

/** Ages the floor and the vault. Company cash and subscribers only. */
export const tickStreamRights = (player: Player, absoluteWeek: number): RightsWeekNote[] => {
    const state = player.ownPlatform;
    const desk = state?.streamRights;
    if (!state || !desk) return [];
    const notes: RightsWeekNote[] = [];
    desk.listings = desk.listings.map(row => ({ ...row, weeksLeft: row.weeksLeft - 1 }));
    const expired = desk.listings.filter(row => row.weeksLeft <= 0);
    expired.forEach(row => {
        if (desk.auction?.listingId === row.id) desk.auction = null;
        if (row.rivalId) {
            const quote = quoteDeal(player, row, row.suggested, { territory: 'WORLD' });
            awardRival(player, row.rivalId, row.title, quote.lift);
            notes.push({ msg: `${rivalLook(player, row.rivalId).name} took ${row.title} off the floor. You did not pay.`, type: 'negative' });
        }
    });
    desk.listings = desk.listings.filter(row => row.weeksLeft > 0);
    if (absoluteWeek - desk.anchorAbsolute >= 4 || desk.listings.length < 4) refill(desk, player, absoluteWeek);

    const still: StreamRightsHolding[] = [];
    desk.holdings.forEach(holding => {
        const left = holding.expiresAbsolute - absoluteWeek;
        if (left <= 0) {
            const msg = hurtIfHit(player, holding, `${holding.title} expired.`);
            notes.push({ msg, type: holding.lift >= HIT_LIFT ? 'negative' : 'neutral' });
            return;
        }
        if (left <= REMIND_WEEKS && holding.lastRemindAbsolute !== absoluteWeek) {
            holding.lastRemindAbsolute = absoluteWeek;
            notes.push({ msg: `${holding.title} expires in ${left} week${left === 1 ? '' : 's'}. Renew it or drop it in the contract vault.`, type: 'neutral' });
        }
        if (state.stage === 'LIVE') {
            const factor = cooled(player, holding);
            const earn = Math.round(holding.weeklyEarn * factor);
            const subs = Math.round(holding.weeklySubs * factor);
            if (earn > 0) {
                addCompanyCash(player, earn, `Rights earn: ${holding.title}`, 'TITLE');
                holding.lastEarn = earn;
            }
            if (subs > 0) state.subscribers += subs;
        }
        still.push(holding);
    });
    desk.holdings = still;
    return notes;
};

const asKind = (value: unknown): StreamRightKind | null => (KINDS.has(value as StreamRightKind) ? value as StreamRightKind : null);
const asFormat = (value: unknown): StreamRightFormat | null => (FORMATS.has(value as StreamRightFormat) ? value as StreamRightFormat : null);
const asTerritory = (value: unknown): StreamTerritoryKind | null => (TERRITORIES.has(value as StreamTerritoryKind) ? value as StreamTerritoryKind : null);

const cleanListing = (raw: unknown): StreamRightsListing | null => {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as StreamRightsListing;
    const format = asFormat(row.format);
    const suggested = asKind(row.suggested);
    const country = getCountry(row.homeCountryId);
    if (!row.id || !row.title || !format || !suggested || !country || !REGIONS.has(row.regionId)) return null;
    return {
        id: String(row.id).slice(0, 80),
        title: String(row.title).slice(0, 80),
        format,
        genre: String(row.genre || 'Drama').slice(0, 40),
        language: String(row.language || 'English').slice(0, 40),
        homeCountryId: country.id,
        regionId: row.regionId,
        basePrice: Math.max(0, Math.round(Number(row.basePrice) || 0)),
        years: clamp(Math.round(Number(row.years) || 1), 1, 12),
        suggested,
        rivalId: typeof row.rivalId === 'string' ? row.rivalId.slice(0, 40) : undefined,
        weeksLeft: clamp(Math.round(Number(row.weeksLeft) || 1), 1, 52),
    };
};

const cleanHolding = (raw: unknown): StreamRightsHolding | null => {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as StreamRightsHolding;
    const format = asFormat(row.format);
    const kind = asKind(row.kind);
    const territory = asTerritory(row.territory);
    if (!row.id || !row.title || !format || !kind || !territory) return null;
    if (row.source !== 'MARKET' && row.source !== 'OWN_FILM') return null;
    const countryId = row.countryId && getCountry(row.countryId) ? row.countryId : undefined;
    const regionId = row.regionId && REGIONS.has(row.regionId) ? row.regionId : undefined;
    return {
        id: String(row.id).slice(0, 80),
        listingId: typeof row.listingId === 'string' ? row.listingId.slice(0, 80) : undefined,
        title: String(row.title).slice(0, 80),
        format,
        genre: String(row.genre || 'Drama').slice(0, 40),
        language: String(row.language || 'English').slice(0, 40),
        kind,
        territory,
        countryId,
        regionId,
        years: clamp(Math.round(Number(row.years) || 1), 1, 12),
        expiresAbsolute: Math.max(0, Math.round(Number(row.expiresAbsolute) || 0)),
        windowEndsAbsolute: Number.isFinite(Number(row.windowEndsAbsolute)) ? Math.round(Number(row.windowEndsAbsolute)) : undefined,
        paid: Math.max(0, Math.round(Number(row.paid) || 0)),
        lift: Math.max(0, Math.round(Number(row.lift) || 0)),
        weeklySubs: Math.max(0, Math.round(Number(row.weeklySubs) || 0)),
        weeklyEarn: Math.max(0, Math.round(Number(row.weeklyEarn) || 0)),
        lastEarn: Math.max(0, Math.round(Number(row.lastEarn) || 0)),
        source: row.source,
        originId: typeof row.originId === 'string' ? row.originId.slice(0, 80) : undefined,
        lastRemindAbsolute: Number.isFinite(Number(row.lastRemindAbsolute)) ? Math.round(Number(row.lastRemindAbsolute)) : undefined,
    };
};

/** Drops a broken desk. A missing desk stays missing so old saves load clean. */
export const sanitizeStreamRights = (raw: unknown): StreamRightsDesk | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const row = raw as StreamRightsDesk;
    const listings = Array.isArray(row.listings) ? row.listings.map(cleanListing).filter((item): item is StreamRightsListing => Boolean(item)).slice(0, 12) : [];
    const holdings = Array.isArray(row.holdings) ? row.holdings.map(cleanHolding).filter((item): item is StreamRightsHolding => Boolean(item)).slice(0, 40) : [];
    const auctionRaw = row.auction;
    let auction: StreamRightsAuction | null = null;
    if (auctionRaw && typeof auctionRaw === 'object' && listings.some(item => item.id === auctionRaw.listingId)) {
        const kind = asKind(auctionRaw.kind);
        const territory = asTerritory(auctionRaw.territory);
        if (kind && territory && auctionRaw.rivalId) {
            auction = {
                listingId: auctionRaw.listingId,
                kind,
                territory,
                countryId: auctionRaw.countryId && getCountry(auctionRaw.countryId) ? auctionRaw.countryId : undefined,
                regionId: auctionRaw.regionId && REGIONS.has(auctionRaw.regionId) ? auctionRaw.regionId : undefined,
                ask: Math.max(0, Math.round(Number(auctionRaw.ask) || 0)),
                playerBid: Math.max(0, Math.round(Number(auctionRaw.playerBid) || 0)),
                rivalBid: Math.max(0, Math.round(Number(auctionRaw.rivalBid) || 0)),
                rivalCeiling: Math.max(0, Math.round(Number(auctionRaw.rivalCeiling) || 0)),
                rivalId: String(auctionRaw.rivalId).slice(0, 40),
                round: Math.max(1, Math.round(Number(auctionRaw.round) || 1)),
            };
        }
    }
    return {
        anchorAbsolute: Math.max(0, Math.round(Number(row.anchorAbsolute) || 0)),
        listings,
        holdings,
        auction,
    };
};
