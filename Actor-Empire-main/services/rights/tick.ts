import { Player, RightsHolding, Script } from '../../types';
import { generateIPMarket } from '../../src/data/generators';
import { getAbsoluteWeek } from '../legacyLogic';
import { loadCatalogue, IpRecord, displayTitle } from './catalogue';
import { bookAnchor, lifeAnchor, OPTION_WEEKS } from './formulas';
import {
    allRecords, emptyRights, exclusiveHold, featuredScripts, findRecord, rightsOf,
} from './logic';
import { notePlatformBuy } from '../commissions/logic';

const RIVALS = ['Aurora Pictures', 'Lotus Gate', 'Northline', 'Red Lantern', 'Sahel Frame', 'Pampas Reels', 'Harbour & Co', 'Monsoon House', 'Netflix', 'Prime Video', 'Hotstar', 'Disney+', 'Apple TV+'];

const hash = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) h = (h * 33 + value.charCodeAt(i)) >>> 0;
    return h;
};

const houses = (player: Player) =>
    (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE' && business.studioState);

const ensure = (player: Player) => {
    houses(player).forEach(studio => {
        if (!studio.studioState!.rightsLibrary) studio.studioState!.rightsLibrary = emptyRights();
        else studio.studioState!.rightsLibrary = rightsOf(studio);
    });
};

const publish = (player: Player, headline: string, ipId: string, famous: boolean) => {
    houses(player).forEach(studio => {
        const library = rightsOf(studio);
        library.activity = [{
            id: `rival_${ipId}_${player.currentWeek}`,
            week: player.currentWeek,
            year: player.age,
            headline,
            ipId,
        }, ...library.activity].slice(0, 40);
        studio.studioState!.rightsLibrary = library;
    });
    if (!famous) return;
    if (!Array.isArray(player.news)) player.news = [];
    player.news.unshift({
        id: `news_rival_rights_${ipId}_${player.currentWeek}`,
        headline,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'MEDIUM',
    });
    player.news = player.news.slice(0, 80);
    if (!player.x) return;
    player.x.feed = [{
        id: `x_rival_rights_${ipId}_${player.currentWeek}`,
        authorId: 'trades_desk',
        authorName: 'Trades',
        authorHandle: '@TradesDesk',
        authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TradesDesk',
        content: headline,
        timestamp: Date.now(),
        likes: 2500,
        retweets: 600,
        replies: 90,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'FILM_OPINION' as const,
        sentiment: 'INDUSTRY' as const,
    }, ...(player.x.feed || [])].slice(0, 80);
};

const giveRival = (player: Player, ip: IpRecord, rival: string, status: 'OPTION' | 'OWNED') => {
    const holding: RightsHolding = {
        ipId: ip.id,
        kind: ip.kind,
        status,
        owner: 'RIVAL',
        rivalName: rival,
        paidUsd: status === 'OPTION' ? ip.optionUsd : ip.purchaseUsd,
        optionWeek: getAbsoluteWeek(player.age, player.currentWeek),
        expiresWeek: status === 'OPTION' ? getAbsoluteWeek(player.age, player.currentWeek) + OPTION_WEEKS : undefined,
    };
    houses(player).forEach(studio => {
        const library = rightsOf(studio);
        library.holdings = [holding, ...library.holdings.filter(row => {
            if (row.ipId !== ip.id || row.owner !== 'RIVAL') return true;
            if (ip.publicDomain) return row.rivalName !== rival;
            return false;
        })];
        const versions = library.holdings.filter(row => row.ipId === ip.id && (row.status === 'OWNED' || row.status === 'OPTION'));
        if (ip.publicDomain && versions.length > 1) {
            library.clashes = [...library.clashes.filter(row => row.ipId !== ip.id), { ipId: ip.id, rivalName: rival }];
        }
        studio.studioState!.rightsLibrary = library;
        studio.studioState!.ipMarket = (studio.studioState!.ipMarket || []).filter(script => script.rightsIpId !== ip.id || ip.publicDomain);
    });
};

const expire = (player: Player, logs: string[]) => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const lost: { ipId: string; rivalName: string }[] = [];
    houses(player).forEach(studio => {
        const library = rightsOf(studio);
        library.holdings = library.holdings.map(row => {
            if (row.owner === 'PLAYER' && row.status === 'OPTION' && row.expiresWeek && now > row.expiresWeek) {
                const ip = findRecord(player, row.ipId);
                logs.push(ip ? `Option expired on ${displayTitle(ip)}.` : 'An option expired.');
                return { ...row, status: 'EXPIRED' as const };
            }
            return row;
        });
        library.bids.forEach(bid => {
            if (bid.status === 'OPEN' && now - bid.openedWeek >= 1) lost.push({ ipId: bid.ipId, rivalName: bid.rivalName });
        });
        studio.studioState!.rightsLibrary = library;
    });
    lost.forEach(bid => {
        const ip = findRecord(player, bid.ipId);
        if (!ip) return;
        giveRival(player, ip, bid.rivalName, 'OWNED');
        const line = `${bid.rivalName} won the auction for ${displayTitle(ip)}.`;
        logs.push(line);
        publish(player, line, ip.id, true);
    });
    if (lost.length) {
        const lostIds = new Set(lost.map(bid => bid.ipId));
        houses(player).forEach(studio => {
            const library = rightsOf(studio);
            library.bids = library.bids.map(bid => lostIds.has(bid.ipId) && bid.status === 'OPEN' ? { ...bid, status: 'LOST' as const } : bid);
            studio.studioState!.rightsLibrary = library;
        });
    }
};

const city = ['Lagos', 'Seoul', 'Mexico City', 'Mumbai', 'London', 'Nairobi', 'São Paulo'];
const hotBook = (player: Player, index: number): IpRecord => {
    const fame = 90 + (index % 6);
    const money = bookAnchor(fame, 'novel', false);
    const place = city[index % city.length];
    return {
        id: `hot_book_${player.age}_${index}`,
        kind: 'BOOK',
        proper: `The ${place} Breakout`,
        descriptor: `The ${place} Breakout`,
        authorProper: 'A. Season',
        authorDescriptor: 'A. Season',
        authorId: `hot-author-${player.age}-${index}`,
        safeReal: false,
        country: 'US',
        countryName: place,
        fx: 'US',
        region: 'NORTH_AMERICA',
        language: 'English',
        genres: ['NOVEL'],
        gameGenres: ['DRAMA'],
        year: 2026,
        length: 'novel',
        seasons: 2,
        fame,
        fans: [80, 40, 55, 30, 35, 28, 22, 33, 30],
        publicDomain: false,
        holder: 'Season Literary',
        optionUsd: money.optionUsd,
        purchaseUsd: money.purchaseUsd,
        logline: `The book everyone on the ${place} commute is hiding behind a newspaper.`,
        hot: true,
        hotLabel: 'BREAKOUT_NOVEL',
    };
};

const hotLife = (player: Player, label: 'CHAMPIONSHIP' | 'VIRAL_TRUE', index: number): IpRecord => {
    const fame = label === 'CHAMPIONSHIP' ? 93 : 88;
    const money = lifeAnchor(fame, true, label === 'VIRAL_TRUE' ? 60 : 20, false);
    const sport = label === 'CHAMPIONSHIP' ? 'football' : null;
    return {
        id: `hot_life_${player.age}_${label.toLowerCase()}`,
        kind: 'LIFE',
        proper: label === 'CHAMPIONSHIP' ? 'Nico Vale' : 'The Platform Witness',
        descriptor: label === 'CHAMPIONSHIP' ? 'Nico Vale' : 'The Platform Witness',
        safeReal: false,
        country: 'BR',
        countryName: 'Brazil',
        fx: 'BR',
        region: 'LATIN_AMERICA',
        language: 'Portuguese',
        genres: [sport ? 'SPORT' : 'VIRAL'],
        gameGenres: sport ? ['BIOPIC', 'SPORTS'] : ['DRAMA'],
        sport,
        category: sport ? 'athlete' : 'criminal',
        categoryLabel: sport ? 'Football' : 'Viral true story',
        year: 2026,
        era: '2020s',
        living: true,
        controversy: label === 'VIRAL_TRUE' ? 62 : 18,
        fame,
        fans: [70, 88, 60, 40, 36, 44, 30, 50, 28],
        publicDomain: false,
        attitude: label === 'VIRAL_TRUE' ? 'WARY' : 'OPEN',
        holder: 'Night agency',
        optionUsd: 0,
        purchaseUsd: money.purchaseUsd,
        seasons: label === 'CHAMPIONSHIP' ? 1 : 4,
        singleEvent: label === 'CHAMPIONSHIP',
        length: label === 'CHAMPIONSHIP' ? 'short' : 'saga',
        logline: label === 'CHAMPIONSHIP'
            ? 'The season just ended and every studio wants the final.'
            : 'A clip no one can verify is already a limited series in someone\'s head.',
        hot: true,
        hotLabel: label,
    };
};

const spawnHot = (player: Player, logs: string[]) => {
    const studio = houses(player)[0];
    if (!studio) return;
    const library = rightsOf(studio);
    if (library.lastHotYear === player.age) return;
    if (player.currentWeek !== 1 && library.lastHotYear !== undefined) return;
    const records = [hotBook(player, player.age), hotLife(player, 'CHAMPIONSHIP', 1), hotLife(player, 'VIRAL_TRUE', 2)];
    const until = getAbsoluteWeek(player.age, player.currentWeek) + 30;
    const hotReleases = records.map(record => ({
        id: record.id,
        label: (record.hotLabel || 'BREAKOUT_NOVEL') as 'BREAKOUT_NOVEL' | 'CHAMPIONSHIP' | 'VIRAL_TRUE',
        untilAbsolute: until,
        year: player.age,
        record: record as unknown as Record<string, any>,
    }));
    houses(player).forEach(row => {
        const lib = rightsOf(row);
        lib.hotReleases = [...hotReleases, ...lib.hotReleases].slice(0, 18);
        lib.lastHotYear = player.age;
        row.studioState!.rightsLibrary = lib;
    });
    const line = `New heat: a breakout novel, a championship, and a viral true story just hit the rights market.`;
    logs.push(line);
    publish(player, line, records[0].id, true);
};

const rivalsAct = (player: Player, logs: string[]) => {
    const pool = allRecords(player).filter(ip => ip.publicDomain || !exclusiveHold(player, ip));
    if (!pool.length) return;
    const count = 1 + (hash(`${player.age}:${player.currentWeek}:n`) % 2);
    for (let n = 0; n < count; n += 1) {
        const weighted = [...pool].sort((a, b) => {
            const score = (ip: IpRecord) => (ip.hot ? 500 : 0) + ip.fame + (hash(`${player.currentWeek}:${ip.id}:${n}`) % 30);
            return score(b) - score(a);
        });
        const ip = weighted.find(row => {
            if (!row.publicDomain && exclusiveHold(player, row)) return false;
            return !houses(player).some(studio => rightsOf(studio).holdings.some(held =>
                held.ipId === row.id && held.owner === 'RIVAL' && (held.status === 'OWNED' || held.status === 'OPTION'),
            ));
        });
        if (!ip) continue;
        const rival = RIVALS[hash(`${ip.id}:${player.currentWeek}`) % RIVALS.length];
        const status = ip.publicDomain || ip.fame >= 80 ? 'OWNED' : 'OPTION';
        giveRival(player, ip, rival, status);
        if (['Netflix', 'Prime Video', 'Hotstar', 'Disney+', 'Apple TV+'].includes(rival)) {
            notePlatformBuy(player, { id: ip.id, proper: displayTitle(ip), publicDomain: ip.publicDomain }, rival, status);
        }
        const verb = status === 'OPTION' ? 'optioned' : 'bought';
        const line = `${rival} ${verb} ${displayTitle(ip)}.`;
        logs.push(line);
        publish(player, line, ip.id, ip.fame >= 70 || Boolean(ip.hot));
        pool.splice(pool.findIndex(row => row.id === ip.id), 1);
    }
};

const refreshShelf = (player: Player) => {
    houses(player).forEach(studio => {
        const state = studio.studioState!;
        const due = player.currentWeek - (state.lastMarketRefreshWeek || 0) >= 3
            || !(state.ipMarket || []).some(script => script.rightsIpId);
        if (!due && (state.ipMarket || []).length > 0) return;
        const specs = generateIPMarket(2, state.purchasedIPTitles || [], player.currentWeek)
            .filter(script => !script.rightsIpId) as Script[];
        state.ipMarket = [...featuredScripts(player, player.currentWeek), ...specs].slice(0, 6);
        state.lastMarketRefreshWeek = player.currentWeek;
    });
};

export const loadRightsShelf = async (player: Player, week: number, exclude: string[] = []): Promise<Script[]> => {
    await loadCatalogue();
    const specs = generateIPMarket(2, exclude, week).filter(script => !script.rightsIpId);
    return [...featuredScripts(player, week), ...specs].slice(0, 6);
};

export const tickRightsWeek = async (player: Player): Promise<string[]> => {
    if (!houses(player).length) return [];
    await loadCatalogue();
    ensure(player);
    const logs: string[] = [];
    expire(player, logs);
    spawnHot(player, logs);
    rivalsAct(player, logs);
    refreshShelf(player);
    return logs;
};
