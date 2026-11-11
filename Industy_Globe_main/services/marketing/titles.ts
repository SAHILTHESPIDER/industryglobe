import type { MarketingTitleStatus, Player } from '../../types';
import { gameCalendarYear } from '../boxOfficeSim';
import type { MarketingTitle } from './core';

const safeImage = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value) return undefined;
    if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) return value;
    if (value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 80))) return `data:image/jpeg;base64,${value}`;
    return undefined;
};

const posterImage = (poster: { imageData?: string; canvasData?: { background?: string } } | undefined): string | undefined => {
    if (!poster) return undefined;
    return safeImage(poster.imageData) || safeImage(poster.canvasData?.background);
};

const castOf = (list: { name?: string; actorName?: string; salary?: number; status?: string; isPlayer?: boolean }[] | undefined) => (
    (list || [])
        .filter(person => person && (person.status === undefined || person.status === 'CONFIRMED' || person.status === 'SIGNED'))
        .map(person => ({ name: person.actorName || person.name || '', salary: person.salary }))
        .filter(person => person.name)
        .slice(0, 5)
);

const weeksUntil = (player: Player, releaseWeek?: number): number | undefined => {
    if (!releaseWeek || releaseWeek < 1) return undefined;
    const current = ((player.currentWeek - 1) % 52) + 1;
    if (releaseWeek >= current) return releaseWeek - current;
    return (52 - current) + releaseWeek;
};

const statusFromPhase = (phase: string | undefined, streaming: boolean): MarketingTitleStatus => {
    if (streaming) return 'Streaming';
    if (phase === 'THEATRICAL' || phase === 'IN THEATERS' || phase === 'STREAMING_BIDDING' || phase === 'BIDDING') return 'In Cinemas';
    if (phase === 'RELEASED') return 'Released';
    return 'Coming Soon';
};

export const listMarketingTitles = (player: Player, ownerKind: 'EMPIRE' | 'HOUSE', ownerId: string): MarketingTitle[] => {
    const year = gameCalendarYear(player.age || 18);
    const titles: MarketingTitle[] = [];
    const seen = new Set<string>();
    const push = (title: MarketingTitle) => {
        if (!title.id || !title.name || seen.has(title.id)) return;
        seen.add(title.id);
        titles.push(title);
    };

    if (ownerKind === 'HOUSE') {
        const house = (player.businesses || []).find(business => business.id === ownerId && business.type === 'PRODUCTION_HOUSE');
        const banner = house?.name || 'House';
        (player.commitments || []).forEach(commitment => {
            const details = commitment.projectDetails;
            if (!details) return;
            if (details.studioId && details.studioId !== ownerId) return;
            const streaming = details.releaseStrategy === 'STREAMING_ONLY';
            push({
                id: commitment.id,
                name: commitment.name || details.title,
                genre: details.genre || 'DRAMA',
                language: details.location?.region || 'English',
                cast: castOf(details.castList),
                director: details.directorName || '',
                banner,
                statusLine: streaming ? 'Streaming' : 'Coming Soon',
                releaseWeek: details.releaseDate,
                releaseYear: year,
                weeksUntil: weeksUntil(player, details.releaseDate),
                image: posterImage(details.customPoster),
                ownerKind,
                ownerId,
            });
        });
        (player.activeReleases || []).forEach(release => {
            if (release.projectDetails?.studioId !== ownerId) return;
            const streaming = release.distributionPhase === 'STREAMING';
            push({
                id: release.id,
                name: release.name,
                genre: release.projectDetails?.genre || 'DRAMA',
                language: 'English',
                cast: castOf(release.projectDetails?.castList),
                director: release.projectDetails?.directorName || '',
                banner,
                statusLine: statusFromPhase(release.distributionPhase, streaming),
                releaseWeek: release.releaseWeek,
                releaseYear: release.releaseCalendarYear || year,
                weeksUntil: streaming ? 0 : undefined,
                image: posterImage(release.projectDetails?.customPoster),
                ownerKind,
                ownerId,
            });
        });
        (player.pastProjects || []).forEach(project => {
            if (project.studioId !== ownerId) return;
            const streaming = Boolean(project.streamingRevenue || project.totalViews);
            push({
                id: project.id,
                name: project.name,
                genre: project.genre || 'DRAMA',
                language: 'English',
                cast: castOf(project.castList),
                director: '',
                banner,
                statusLine: streaming ? 'Streaming' : 'Released',
                releaseYear: year,
                image: posterImage(project.customPoster),
                ownerKind,
                ownerId,
            });
        });
        (house?.studioState?.scripts || []).forEach(script => {
            if (script.status === 'PRODUCED') return;
            push({
                id: script.id,
                name: script.title || script.name || 'Untitled',
                genre: script.genres?.[0] || 'DRAMA',
                language: 'English',
                cast: [],
                director: '',
                banner,
                statusLine: 'Coming Soon',
                image: posterImage(script.customPoster),
                ownerKind,
                ownerId,
            });
        });
        return titles;
    }

    const platform = player.ownPlatform;
    const banner = platform?.name || 'Empire+';
    (platform?.catalogue || []).forEach(row => {
        const offset = typeof row.releaseWeekOffset === 'number' ? row.releaseWeekOffset : 0;
        const live = row.releaseWeekOffset === undefined || offset <= 0;
        push({
            id: row.id,
            name: row.title,
            genre: row.genre || 'Drama',
            language: row.language || 'English',
            cast: [],
            director: '',
            banner,
            statusLine: live ? 'Streaming' : 'Coming Soon',
            releaseWeek: ((player.currentWeek - 1 + Math.max(0, offset)) % 52) + 1,
            releaseYear: year,
            weeksUntil: live ? 0 : offset,
            ownerKind,
            ownerId,
        });
    });
    (platform?.streamRights?.holdings || []).forEach(holding => {
        push({
            id: holding.id,
            name: holding.title,
            genre: holding.genre || 'Drama',
            language: holding.language || 'English',
            cast: [],
            director: '',
            banner,
            statusLine: 'Streaming',
            ownerKind,
            ownerId,
        });
    });
    if (platform?.releaseSlot?.title) {
        push({
            id: platform.releaseSlot.linkedReleaseId || `slot-${platform.releaseSlot.title}`,
            name: platform.releaseSlot.title,
            genre: 'Drama',
            language: platform.releaseSlot.language || 'English',
            cast: [],
            director: '',
            banner: platform.releaseSlot.house || banner,
            statusLine: 'Coming Soon',
            releaseWeek: ((player.currentWeek - 1 + (platform.releaseSlot.weekOffset || 0)) % 52) + 1,
            releaseYear: year,
            weeksUntil: platform.releaseSlot.weekOffset || 0,
            ownerKind,
            ownerId,
        });
    }
    (player.activeReleases || []).forEach(release => {
        if (release.distributionPhase !== 'STREAMING') return;
        const onService = release.streaming?.streamerName === banner || release.streaming?.platformId === 'YOUTUBE';
        if (!onService && release.projectDetails?.studioId) return;
        push({
            id: release.id,
            name: release.name,
            genre: release.projectDetails?.genre || 'DRAMA',
            language: 'English',
            cast: castOf(release.projectDetails?.castList),
            director: release.projectDetails?.directorName || '',
            banner,
            statusLine: 'Streaming',
            releaseWeek: release.releaseWeek,
            releaseYear: release.releaseCalendarYear || year,
            image: posterImage(release.projectDetails?.customPoster),
            ownerKind,
            ownerId,
        });
    });
    return titles;
};
