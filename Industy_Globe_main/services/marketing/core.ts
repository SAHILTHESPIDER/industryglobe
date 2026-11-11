/**
 * Marketing rules with no player, cash, or catalog imports.
 * The desk engine applies these results to company books and the house balance.
 * Personal cash is not a field this module can move.
 */
import type {
    MarketingActionId,
    MarketingAudience,
    MarketingCampaign,
    MarketingCategory,
    MarketingCreative,
    MarketingDateStyle,
    MarketingEmphasis,
    MarketingExposure,
    MarketingFeedPost,
    MarketingOutcome,
    MarketingOwnerKind,
    MarketingPoster,
    MarketingQuote,
    MarketingRecord,
    MarketingSocialFormat,
    MarketingState,
    MarketingStatus,
    MarketingTarget,
    MarketingTitleStatus,
} from '../../types';

export interface MarketingTitle {
    id: string;
    name: string;
    genre: string;
    language: string;
    cast: { name: string; salary?: number }[];
    director: string;
    banner: string;
    statusLine: MarketingTitleStatus;
    releaseWeek?: number;
    releaseYear?: number;
    weeksUntil?: number;
    image?: string;
    ownerKind: 'EMPIRE' | 'HOUSE';
    ownerId: string;
}

export interface MarketWorld {
    regions: { id: string; name: string }[];
    countries: { id: string; regionId: string; name: string; audienceM: number; languages: string[] }[];
    cities: { id: string; regionId: string; name: string }[];
}

export interface MarketingDraft {
    key: string;
    ownerKind: 'EMPIRE' | 'HOUSE';
    ownerId: string;
    ownerName: string;
    titleId: string;
    actionId: string;
    creative: MarketingCreative;
    target: MarketingTarget;
}

export interface WalletSnapshot {
    personal: number;
    companyCash: number;
    houseBalance: number;
    productionFund: number;
}

export interface WeekEffects {
    notes: string[];
    dirty: boolean;
    hype: { titleId: string; points: number }[];
    posts: MarketingFeedPost[];
}

const ACTIONS: {
    id: MarketingActionId;
    category: MarketingCategory;
    name: string;
    blurb: string;
    base: number;
    reach: number;
    hype: number;
    ticket: number;
    stream: number;
    needsCast: boolean;
    needsCity: boolean;
}[] = [
    { id: 'billboard', category: 'OUTDOOR', name: 'Outdoor billboards', blurb: 'A physical board on the way to work.', base: 160_000, reach: 22, hype: 8, ticket: 7, stream: 3, needsCast: false, needsCity: true },
    { id: 'digital_screen', category: 'OUTDOOR', name: 'Digital screens', blurb: 'Night-time spectaculars and mall LEDs.', base: 140_000, reach: 20, hype: 7, ticket: 5, stream: 5, needsCast: false, needsCity: true },
    { id: 'transit', category: 'OUTDOOR', name: 'Transit ads', blurb: 'Platforms, buses, and the long queue.', base: 75_000, reach: 16, hype: 5, ticket: 5, stream: 3, needsCast: false, needsCity: true },
    { id: 'standee', category: 'OUTDOOR', name: 'Cinema standees', blurb: 'The lobby, life size, in the way on purpose.', base: 35_000, reach: 8, hype: 4, ticket: 8, stream: 1, needsCast: false, needsCity: true },
    { id: 'city_tour', category: 'TOUR', name: 'City tour', blurb: 'A few cities, a car, and a rope line.', base: 240_000, reach: 11, hype: 10, ticket: 8, stream: 4, needsCast: true, needsCity: true },
    { id: 'fan_meet', category: 'TOUR', name: 'Fan meet', blurb: 'Country or international. The expensive hello.', base: 420_000, reach: 9, hype: 12, ticket: 7, stream: 6, needsCast: true, needsCity: true },
    { id: 'college', category: 'TOUR', name: 'College visit', blurb: 'A campus hall and a young crowd.', base: 28_000, reach: 6, hype: 4, ticket: 3, stream: 5, needsCast: true, needsCity: true },
    { id: 'mall', category: 'TOUR', name: 'Mall visit', blurb: 'A Saturday atrium. Parents and phones.', base: 48_000, reach: 8, hype: 4, ticket: 5, stream: 3, needsCast: true, needsCity: true },
    { id: 'announcement', category: 'STAGE', name: 'Film announcement', blurb: 'A stage, a title, a date. Nothing else yet.', base: 280_000, reach: 18, hype: 14, ticket: 6, stream: 8, needsCast: true, needsCity: false },
    { id: 'teaser', category: 'STAGE', name: 'Teaser launch', blurb: 'Twenty seconds and a question.', base: 70_000, reach: 14, hype: 7, ticket: 4, stream: 7, needsCast: false, needsCity: false },
    { id: 'trailer', category: 'STAGE', name: 'Trailer launch', blurb: 'The two-minute argument for the film.', base: 150_000, reach: 20, hype: 11, ticket: 8, stream: 8, needsCast: false, needsCity: false },
    { id: 'music', category: 'STAGE', name: 'Music launch', blurb: 'A song that has to travel without the plot.', base: 110_000, reach: 16, hype: 8, ticket: 4, stream: 9, needsCast: false, needsCity: false },
    { id: 'premiere', category: 'STAGE', name: 'Premiere', blurb: 'Carpet, lights, and a room that can still disappoint.', base: 380_000, reach: 12, hype: 15, ticket: 9, stream: 5, needsCast: true, needsCity: true },
    { id: 'reels', category: 'DIGITAL', name: 'Digital reels', blurb: 'Short vertical cuts for the phone feed.', base: 42_000, reach: 19, hype: 6, ticket: 3, stream: 8, needsCast: false, needsCity: false },
    { id: 'influencer', category: 'DIGITAL', name: 'Influencers', blurb: 'Someone else says it, which is the point.', base: 130_000, reach: 15, hype: 7, ticket: 4, stream: 7, needsCast: true, needsCity: false },
    { id: 'paid_ads', category: 'DIGITAL', name: 'Paid ads', blurb: 'Bought reach. Easy to ignore, hard to miss.', base: 190_000, reach: 24, hype: 5, ticket: 5, stream: 7, needsCast: false, needsCity: false },
    { id: 'bts', category: 'DIGITAL', name: 'Behind the scenes', blurb: 'A messy true thing from the set.', base: 26_000, reach: 8, hype: 4, ticket: 2, stream: 5, needsCast: false, needsCity: false },
    { id: 'interview', category: 'PRESS', name: 'Interviews', blurb: 'One chair, one host, a clip that escapes.', base: 22_000, reach: 7, hype: 5, ticket: 3, stream: 4, needsCast: true, needsCity: false },
    { id: 'presser', category: 'PRESS', name: 'Press conference', blurb: 'A long table and too many questions.', base: 85_000, reach: 10, hype: 7, ticket: 4, stream: 4, needsCast: true, needsCity: true },
    { id: 'tv_spot', category: 'PRESS', name: 'TV and reality', blurb: 'A late show or a reality couch. Parents see it.', base: 240_000, reach: 17, hype: 11, ticket: 7, stream: 6, needsCast: true, needsCity: false },
    { id: 'podcast', category: 'PRESS', name: 'Podcast', blurb: 'An hour that the fans will quote badly.', base: 18_000, reach: 5, hype: 3, ticket: 2, stream: 4, needsCast: true, needsCity: false },
    { id: 'tieup', category: 'BRAND', name: 'Brand tie-up', blurb: 'A partner pays part of the board and takes the logo.', base: 260_000, reach: 14, hype: 6, ticket: 5, stream: 4, needsCast: false, needsCity: false },
    { id: 'merch', category: 'BRAND', name: 'Merchandise', blurb: 'A shirt, a cup, a small proof of fandom.', base: 95_000, reach: 7, hype: 4, ticket: 3, stream: 3, needsCast: false, needsCity: false },
    { id: 'contest', category: 'BRAND', name: 'Contest', blurb: 'Fans do the posting. You pay the prize.', base: 55_000, reach: 12, hype: 5, ticket: 4, stream: 6, needsCast: false, needsCity: false },
    { id: 'giveaway', category: 'BRAND', name: 'Ticket giveaway', blurb: 'Seats or a streaming code. Warm, not wide.', base: 80_000, reach: 6, hype: 4, ticket: 9, stream: 5, needsCast: false, needsCity: false },
];

export const MARKETING_ACTIONS = ACTIONS;

export const MARKETING_CATEGORIES: { id: MarketingCategory; name: string; line: string }[] = [
    { id: 'OUTDOOR', name: 'Outdoor', line: 'Boards, screens, transit, lobbies' },
    { id: 'TOUR', name: 'Tour', line: 'Cities, campuses, malls, fan halls' },
    { id: 'STAGE', name: 'Stage', line: 'Announcements, trailers, premieres' },
    { id: 'DIGITAL', name: 'Digital', line: 'Reels, creators, ads, set scraps' },
    { id: 'PRESS', name: 'Press', line: 'Chairs, tables, television, mics' },
    { id: 'BRAND', name: 'Brand', line: 'Partners, merch, contests, seats' },
];

export const LAYOUTS: { id: string; name: string }[] = [
    { id: 'stack', name: 'Stacked' },
    { id: 'lead', name: 'Lead' },
    { id: 'skyline', name: 'Skyline' },
    { id: 'type', name: 'Type only' },
    { id: 'split', name: 'Split cast' },
    { id: 'strip', name: 'Transit strip' },
    { id: 'standee', name: 'Standee' },
    { id: 'lightbox', name: 'Lightbox' },
];

export const PALETTES: { id: string; name: string; gradient: string; accent: string; ink: string }[] = [
    { id: 'midnight', name: 'Midnight gold', gradient: 'linear-gradient(165deg,#140e08 0%,#3c2a12 42%,#0c0b10 100%)', accent: '#f0c36a', ink: '#f7f1e4' },
    { id: 'paper', name: 'Paper', gradient: 'linear-gradient(180deg,#f6f1e7,#d8cfc2)', accent: '#1c140c', ink: '#1c140c' },
    { id: 'crimson', name: 'Crimson', gradient: 'linear-gradient(160deg,#2a0608,#8e1d24 55%,#140306)', accent: '#ffd0c2', ink: '#fff4ef' },
    { id: 'monsoon', name: 'Monsoon', gradient: 'linear-gradient(165deg,#04241f,#0e6b62 50%,#02110f)', accent: '#d6fff4', ink: '#f3fffb' },
    { id: 'noir', name: 'Noir', gradient: 'linear-gradient(180deg,#0a0a0a,#2a2a2a)', accent: '#f2f2f2', ink: '#f5f5f5' },
    { id: 'saffron', name: 'Festival', gradient: 'linear-gradient(160deg,#2a1200,#e07a12 45%,#4a1608)', accent: '#fff1c9', ink: '#fff8ea' },
    { id: 'ice', name: 'Ice', gradient: 'linear-gradient(180deg,#e7f2f6,#8aa4b3)', accent: '#102029', ink: '#102029' },
    { id: 'studio', name: 'Studio blue', gradient: 'linear-gradient(155deg,#071226,#163a86 60%,#04060f)', accent: '#d7e4ff', ink: '#f4f7ff' },
];

export const SIZES: { id: string; name: string; cost: number; reach: number }[] = [
    { id: 'sheet', name: '48-sheet', cost: 1, reach: 1 },
    { id: 'spectacular', name: 'Spectacular', cost: 2.35, reach: 1.7 },
    { id: 'bus', name: 'Bus king', cost: 0.72, reach: 0.8 },
    { id: 'lobby', name: 'Lobby', cost: 0.4, reach: 0.45 },
    { id: 'screen', name: 'Platform screen', cost: 1.25, reach: 1.15 },
];

export const STAGE_THEMES: { id: string; name: string; wash: string; curtain: string }[] = [
    { id: 'velvet', name: 'Velvet', wash: '#f0c36a', curtain: '#4a1020' },
    { id: 'neon', name: 'Neon', wash: '#7af0ff', curtain: '#12081f' },
    { id: 'daylight', name: 'Daylight', wash: '#fff4d2', curtain: '#c9b89a' },
    { id: 'monsoon', name: 'Monsoon', wash: '#b8fff0', curtain: '#06332e' },
    { id: 'blacktie', name: 'Black tie', wash: '#ffffff', curtain: '#0c0c0c' },
];

export const DATE_STYLES: { id: MarketingDateStyle; name: string }[] = [
    { id: 'FULL', name: 'Month and year' },
    { id: 'SEASON', name: 'Season' },
    { id: 'COUNTDOWN', name: 'Countdown' },
    { id: 'NONE', name: 'No date' },
];

export const SOCIAL_FORMATS: { id: MarketingSocialFormat; name: string }[] = [
    { id: 'STILL', name: 'Still' },
    { id: 'REEL', name: 'Reel' },
    { id: 'TRAILER', name: 'Trailer card' },
    { id: 'ANNOUNCEMENT', name: 'Announcement' },
    { id: 'THREAD', name: 'Thread' },
];

export const EMPHASIS: { id: MarketingEmphasis; name: string }[] = [
    { id: 'ENSEMBLE', name: 'Ensemble' },
    { id: 'LEAD', name: 'Lead' },
    { id: 'DIRECTOR', name: 'Director' },
    { id: 'TITLE', name: 'Title only' },
];

export const AUDIENCES: { id: MarketingAudience; name: string }[] = [
    { id: 'MASS', name: 'Mass' },
    { id: 'YOUTH', name: 'Youth' },
    { id: 'FAMILY', name: 'Family' },
    { id: 'PRESTIGE', name: 'Prestige' },
    { id: 'GENRE', name: 'Genre fans' },
];

const PREMIUM_CITIES = new Set(['nyc', 'lax', 'lon', 'bom', 'tyo', 'par', 'syd']);
const YOUTH = new Set(['COMEDY', 'HORROR', 'ROMANCE', 'SUPERHERO', 'ACTION', 'FANTASY', 'SCI_FI']);
const PRESTIGE = new Set(['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'CRIME', 'THRILLER']);
const FAMILY = new Set(['ANIMATION', 'ADVENTURE', 'MUSICAL', 'FAMILY']);
const LOCAL_CITY = new Set(['billboard', 'digital_screen', 'transit', 'standee', 'city_tour', 'fan_meet', 'college', 'mall', 'premiere', 'presser']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const unit = (seed: string) => (hashString(seed) % 10000) / 10000;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const actionById = (id: string) => ACTIONS.find(action => action.id === id);
export const paletteById = (id: string) => PALETTES.find(row => row.id === id) || PALETTES[0];
export const sizeById = (id: string) => SIZES.find(row => row.id === id) || SIZES[0];
export const themeById = (id: string) => STAGE_THEMES.find(row => row.id === id) || STAGE_THEMES[0];

export const defaultCreative = (): MarketingCreative => ({
    layoutId: 'stack',
    paletteId: 'midnight',
    sizeId: 'sheet',
    castEmphasis: 'ENSEMBLE',
    tagline: 'This season, the city picks a side.',
    dateStyle: 'FULL',
    socialFormat: 'STILL',
    stageTheme: 'velvet',
    languageVariant: '',
});

export const defaultTarget = (): MarketingTarget => ({
    regionId: 'NORTH_AMERICA',
    countryId: 'US',
    cityId: 'nyc',
    language: 'English',
    durationWeeks: 2,
    startOffset: 0,
    audience: 'MASS',
});

export const emptyMarketing = (): MarketingState => ({
    version: 1,
    campaigns: [],
    posts: [],
    exposure: [],
    records: [],
});

const asStatus = (value: unknown): MarketingStatus => (
    value === 'LIVE' || value === 'COMPLETE' || value === 'SCHEDULED' ? value : 'SCHEDULED'
);

const asOwner = (value: unknown): MarketingOwnerKind => (
    value === 'EMPIRE' || value === 'HOUSE' || value === 'RIVAL_PLATFORM' || value === 'RIVAL_HOUSE' ? value : 'HOUSE'
);

const cleanCreative = (raw: Partial<MarketingCreative> | undefined): MarketingCreative => {
    const base = defaultCreative();
    if (!raw || typeof raw !== 'object') return base;
    return {
        layoutId: LAYOUTS.some(row => row.id === raw.layoutId) ? raw.layoutId! : base.layoutId,
        paletteId: PALETTES.some(row => row.id === raw.paletteId) ? raw.paletteId! : base.paletteId,
        sizeId: SIZES.some(row => row.id === raw.sizeId) ? raw.sizeId! : base.sizeId,
        castEmphasis: EMPHASIS.some(row => row.id === raw.castEmphasis) ? raw.castEmphasis! : base.castEmphasis,
        tagline: typeof raw.tagline === 'string' && raw.tagline.trim() ? raw.tagline.slice(0, 90) : base.tagline,
        dateStyle: DATE_STYLES.some(row => row.id === raw.dateStyle) ? raw.dateStyle! : base.dateStyle,
        socialFormat: SOCIAL_FORMATS.some(row => row.id === raw.socialFormat) ? raw.socialFormat! : base.socialFormat,
        stageTheme: STAGE_THEMES.some(row => row.id === raw.stageTheme) ? raw.stageTheme! : base.stageTheme,
        languageVariant: typeof raw.languageVariant === 'string' ? raw.languageVariant.slice(0, 40) : '',
    };
};

const cleanTarget = (raw: Partial<MarketingTarget> | undefined): MarketingTarget => {
    const base = defaultTarget();
    if (!raw || typeof raw !== 'object') return base;
    const audience = AUDIENCES.some(row => row.id === raw.audience) ? raw.audience! : base.audience;
    return {
        regionId: typeof raw.regionId === 'string' && raw.regionId ? raw.regionId : base.regionId,
        countryId: typeof raw.countryId === 'string' ? raw.countryId : undefined,
        cityId: typeof raw.cityId === 'string' ? raw.cityId : undefined,
        language: typeof raw.language === 'string' ? raw.language.slice(0, 40) : undefined,
        durationWeeks: clamp(Math.round(finite(raw.durationWeeks, base.durationWeeks)), 0, 52),
        startOffset: clamp(Math.round(finite(raw.startOffset, 0)), -1, 80),
        audience,
    };
};

const cleanPoster = (raw: Partial<MarketingPoster> | undefined, title: string): MarketingPoster => {
    const palette = paletteById(raw?.paletteId || 'midnight');
    return {
        title: typeof raw?.title === 'string' && raw.title.trim() ? raw.title.slice(0, 80) : title,
        tagline: typeof raw?.tagline === 'string' ? raw.tagline.slice(0, 90) : '',
        castLine: typeof raw?.castLine === 'string' ? raw.castLine.slice(0, 120) : '',
        directorLine: typeof raw?.directorLine === 'string' ? raw.directorLine.slice(0, 80) : '',
        banner: typeof raw?.banner === 'string' ? raw.banner.slice(0, 40) : '',
        statusLine: raw?.statusLine === 'In Cinemas' || raw?.statusLine === 'Streaming' || raw?.statusLine === 'Released' || raw?.statusLine === 'Coming Soon'
            ? raw.statusLine
            : 'Coming Soon',
        dateLine: typeof raw?.dateLine === 'string' ? raw.dateLine.slice(0, 40) : '',
        layoutId: typeof raw?.layoutId === 'string' ? raw.layoutId : 'stack',
        paletteId: palette.id,
        sizeId: typeof raw?.sizeId === 'string' ? raw.sizeId : 'sheet',
        emphasis: EMPHASIS.some(row => row.id === raw?.emphasis) ? raw!.emphasis : 'ENSEMBLE',
        gradient: palette.gradient,
        accent: palette.accent,
        ink: palette.ink,
        image: typeof raw?.image === 'string' ? raw.image : undefined,
    };
};

const cleanOutcome = (raw: Partial<MarketingOutcome> | undefined): MarketingOutcome => ({
    reach: Math.max(0, finite(raw?.reach)),
    hype: finite(raw?.hype),
    ticketInterest: Math.max(0, finite(raw?.ticketInterest)),
    streamInterest: Math.max(0, finite(raw?.streamInterest)),
    appliedWeeks: Math.max(0, Math.round(finite(raw?.appliedWeeks))),
    overexposed: Boolean(raw?.overexposed),
    note: typeof raw?.note === 'string' ? raw.note.slice(0, 180) : '',
    regions: Array.isArray(raw?.regions) ? raw!.regions.filter(row => row && row.id).slice(0, 8).map(row => ({
        id: String(row.id),
        name: String(row.name || row.id),
        reach: Math.max(0, finite(row.reach)),
        interest: Math.max(0, finite(row.interest)),
    })) : [],
    channels: Array.isArray(raw?.channels) ? raw!.channels.filter(row => row && row.id).slice(0, 4).map(row => ({
        id: String(row.id),
        name: String(row.name || row.id),
        reach: Math.max(0, finite(row.reach)),
        sentiment: clamp(finite(row.sentiment, 50), 0, 100),
    })) : [],
});

const cleanQuote = (raw: Partial<MarketingQuote> | undefined): MarketingQuote => ({
    cost: Math.max(0, finite(raw?.cost)),
    castFee: Math.max(0, finite(raw?.castFee)),
    reach: Math.max(0, finite(raw?.reach)),
    reachLow: Math.max(0, finite(raw?.reachLow)),
    reachHigh: Math.max(0, finite(raw?.reachHigh)),
    hype: finite(raw?.hype),
    ticketInterest: Math.max(0, finite(raw?.ticketInterest)),
    streamInterest: Math.max(0, finite(raw?.streamInterest)),
    competition: clamp(finite(raw?.competition), 0, 1),
    saturation: clamp(finite(raw?.saturation), 0, 1),
    overexposed: Boolean(raw?.overexposed),
    notes: Array.isArray(raw?.notes) ? raw!.notes.filter(note => typeof note === 'string').slice(0, 8) : [],
});

export const normalizeMarketing = (raw: unknown): MarketingState => {
    const empty = emptyMarketing();
    if (!raw || typeof raw !== 'object') return empty;
    const source = raw as Partial<MarketingState>;
    const campaigns = Array.isArray(source.campaigns) ? source.campaigns.flatMap(row => {
        if (!row || typeof row !== 'object') return [];
        const item = row as Partial<MarketingCampaign>;
        if (typeof item.id !== 'string' || !item.id) return [];
        if (typeof item.titleName !== 'string' || !item.titleName.trim()) return [];
        if (!actionById(String(item.actionId || ''))) return [];
        const action = actionById(String(item.actionId))!;
        const campaign: MarketingCampaign = {
            id: item.id.slice(0, 80),
            key: typeof item.key === 'string' && item.key ? item.key.slice(0, 80) : item.id,
            ownerKind: asOwner(item.ownerKind),
            ownerId: typeof item.ownerId === 'string' ? item.ownerId.slice(0, 80) : '',
            ownerName: typeof item.ownerName === 'string' ? item.ownerName.slice(0, 40) : '',
            titleId: typeof item.titleId === 'string' ? item.titleId.slice(0, 80) : item.id,
            titleName: item.titleName.slice(0, 80),
            actionId: action.id,
            category: action.category,
            status: asStatus(item.status),
            startAbsolute: Math.round(finite(item.startAbsolute)),
            endAbsolute: Math.round(finite(item.endAbsolute, finite(item.startAbsolute))),
            charged: Boolean(item.charged),
            chargeAmount: Math.max(0, finite(item.chargeAmount)),
            lastAppliedAbsolute: Number.isFinite(Number(item.lastAppliedAbsolute)) ? Math.round(Number(item.lastAppliedAbsolute)) : undefined,
            creative: cleanCreative(item.creative),
            target: cleanTarget(item.target),
            quote: cleanQuote(item.quote),
            roll: clamp(finite(item.roll, 1), 0.5, 1.4),
            resolvedReach: Math.max(0, finite(item.resolvedReach)),
            resolvedHype: finite(item.resolvedHype),
            resolvedTicket: Math.max(0, finite(item.resolvedTicket)),
            resolvedStream: Math.max(0, finite(item.resolvedStream)),
            outcome: cleanOutcome(item.outcome),
            castNames: Array.isArray(item.castNames) ? item.castNames.filter(name => typeof name === 'string').slice(0, 8) : [],
            poster: cleanPoster(item.poster, item.titleName),
            feedPostIds: Array.isArray(item.feedPostIds) ? item.feedPostIds.filter(id => typeof id === 'string').slice(0, 8) : [],
            rival: Boolean(item.rival) || asOwner(item.ownerKind) === 'RIVAL_PLATFORM' || asOwner(item.ownerKind) === 'RIVAL_HOUSE',
        };
        return [campaign];
    }).slice(0, 80) : [];
    const posts = Array.isArray(source.posts) ? source.posts.flatMap(row => {
        if (!row || typeof row !== 'object' || typeof row.id !== 'string') return [];
        const item = row as Partial<MarketingFeedPost>;
        const post: MarketingFeedPost = {
            id: item.id!.slice(0, 80),
            campaignId: typeof item.campaignId === 'string' ? item.campaignId : '',
            network: item.network === 'WIRE' ? 'WIRE' : 'FRAME',
            ownerKind: asOwner(item.ownerKind),
            ownerName: typeof item.ownerName === 'string' ? item.ownerName.slice(0, 40) : 'Desk',
            handle: typeof item.handle === 'string' ? item.handle.slice(0, 32) : '@desk',
            avatarHue: Math.round(finite(item.avatarHue, 30)) % 360,
            titleName: typeof item.titleName === 'string' ? item.titleName.slice(0, 80) : '',
            caption: typeof item.caption === 'string' ? item.caption.slice(0, 280) : '',
            format: item.format === 'REEL' || item.format === 'MICRO' || item.format === 'REPOST' ? item.format : 'PHOTO',
            likes: Math.max(0, Math.round(finite(item.likes))),
            comments: Math.max(0, Math.round(finite(item.comments))),
            shares: Math.max(0, Math.round(finite(item.shares))),
            reposts: Math.max(0, Math.round(finite(item.reposts))),
            commentList: Array.isArray(item.commentList) ? item.commentList.filter(note => typeof note === 'string').slice(0, 6) : [],
            week: Math.max(1, Math.round(finite(item.week, 1))),
            year: Math.round(finite(item.year, 18)),
            absoluteWeek: Math.round(finite(item.absoluteWeek)),
            trending: Boolean(item.trending),
            poster: cleanPoster(item.poster, typeof item.titleName === 'string' ? item.titleName : 'Untitled'),
            rival: Boolean(item.rival),
            actionId: typeof item.actionId === 'string' ? item.actionId : 'billboard',
        };
        return [post];
    }).slice(0, 120) : [];
    const exposure = Array.isArray(source.exposure) ? source.exposure.flatMap(row => {
        if (!row || typeof row.titleId !== 'string') return [];
        const item = row as MarketingExposure;
        return [{
            titleId: item.titleId,
            regionId: typeof item.regionId === 'string' ? item.regionId : 'WORLD',
            category: typeof item.category === 'string' ? item.category : 'OUTDOOR',
            heat: clamp(finite(item.heat), 0, 100),
            lastAbsolute: Math.round(finite(item.lastAbsolute)),
        }];
    }).slice(0, 80) : [];
    const records = Array.isArray(source.records) ? source.records.flatMap(row => {
        if (!row || (row.ownerKind !== 'EMPIRE' && row.ownerKind !== 'HOUSE') || typeof row.titleId !== 'string') return [];
        const item = row as MarketingRecord;
        return [{
            ownerKind: item.ownerKind,
            ownerId: typeof item.ownerId === 'string' ? item.ownerId : '',
            titleId: item.titleId,
            titleName: typeof item.titleName === 'string' ? item.titleName : item.titleId,
            spent: Math.max(0, finite(item.spent)),
            reach: Math.max(0, finite(item.reach)),
            hype: finite(item.hype),
            ticketInterest: Math.max(0, finite(item.ticketInterest)),
            streamInterest: Math.max(0, finite(item.streamInterest)),
        }];
    }).slice(0, 80) : [];
    return {
        version: 1,
        campaigns,
        posts,
        exposure,
        records,
        npcWeek: Number.isFinite(Number(source.npcWeek)) ? Math.round(Number(source.npcWeek)) : undefined,
        exposureWeek: Number.isFinite(Number(source.exposureWeek)) ? Math.round(Number(source.exposureWeek)) : undefined,
    };
};

export const formatCount = (value: number): string => {
    const n = Math.abs(value);
    if (n >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(value / 1_000)}K`;
    if (n >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(Math.round(value));
};

export const formatMoney = (value: number): string => {
    const sign = value < 0 ? '-' : '';
    const n = Math.abs(Math.round(value));
    if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
    if (n >= 1_000) return `${sign}$${Math.round(n / 1_000)}K`;
    return `${sign}$${n}`;
};

export const genreKey = (genre: string) => genre.toUpperCase().replace(/&/g, 'AND').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export const dateLineFor = (title: MarketingTitle, style: MarketingDateStyle): string => {
    if (style === 'NONE') return '';
    const week = title.releaseWeek;
    const year = title.releaseYear;
    if (style === 'COUNTDOWN') {
        if (typeof title.weeksUntil !== 'number') return title.statusLine;
        if (title.weeksUntil > 0) return `${title.weeksUntil} weeks`;
        if (title.weeksUntil === 0) return 'This week';
        return 'Out now';
    }
    if (!week || !year) return title.statusLine === 'Coming Soon' ? 'Date to come' : '';
    if (style === 'SEASON') {
        const season = week < 14 ? 'Spring' : week < 27 ? 'Summer' : week < 40 ? 'Autumn' : 'Winter';
        return `${season} ${year}`;
    }
    const month = MONTHS[clamp(Math.floor(((week - 1) / 52) * 12), 0, 11)];
    return `${month} ${year}`;
};

export const castLineFor = (title: MarketingTitle, emphasis: MarketingEmphasis): string => {
    if (emphasis === 'TITLE') return '';
    if (emphasis === 'DIRECTOR') return title.director ? `A film by ${title.director}` : '';
    const names = title.cast.map(person => person.name).filter(Boolean);
    if (!names.length) return emphasis === 'LEAD' ? 'Lead to be announced' : '';
    if (emphasis === 'LEAD') return names[0];
    return names.slice(0, 3).join('  ·  ');
};

export const buildPoster = (title: MarketingTitle, creative: MarketingCreative): MarketingPoster => {
    const palette = paletteById(creative.paletteId);
    return {
        title: title.name,
        tagline: creative.tagline.trim() || 'A new picture.',
        castLine: castLineFor(title, creative.castEmphasis),
        directorLine: title.director ? title.director : '',
        banner: title.banner,
        statusLine: title.statusLine,
        dateLine: dateLineFor(title, creative.dateStyle),
        layoutId: creative.layoutId,
        paletteId: palette.id,
        sizeId: creative.sizeId,
        emphasis: creative.castEmphasis,
        gradient: palette.gradient,
        accent: palette.accent,
        ink: palette.ink,
        image: title.image,
    };
};

const escapeXml = (value: string) => value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));

export const posterSvg = (poster: MarketingPoster): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1208"/><stop offset="1" stop-color="#3a2412"/></linearGradient></defs>
      <rect width="900" height="1200" fill="url(#g)"/>
      <text x="64" y="120" fill="${poster.accent}" font-family="Georgia, serif" font-size="28">${escapeXml(poster.banner || 'A picture')}</text>
      <text x="64" y="180" fill="${poster.accent}" font-family="Impact, sans-serif" font-size="26" letter-spacing="4">${escapeXml(poster.statusLine)}</text>
      <text x="64" y="560" fill="${poster.ink}" font-family="Impact, sans-serif" font-size="92">${escapeXml(poster.title)}</text>
      <text x="64" y="680" fill="${poster.ink}" font-family="Georgia, serif" font-size="32">${escapeXml(poster.tagline)}</text>
      <text x="64" y="980" fill="${poster.ink}" font-family="Impact, sans-serif" font-size="28">${escapeXml(poster.castLine)}</text>
      <text x="64" y="1080" fill="${poster.accent}" font-family="Impact, sans-serif" font-size="36">${escapeXml(poster.dateLine)}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const validateTarget = (target: MarketingTarget, world: MarketWorld, actionId: string): string | null => {
    if (!target || typeof target !== 'object') return 'Pick a place.';
    if (target.regionId !== 'WORLD' && !world.regions.some(region => region.id === target.regionId)) return 'That region is not on the map.';
    const weeks = Math.round(finite(target.durationWeeks));
    if (weeks < 1 || weeks > 12) return 'Run it for 1 to 12 weeks.';
    const offset = Math.round(finite(target.startOffset));
    if (offset < 0 || offset > 52) return 'Schedule it within the next year.';
    if (!AUDIENCES.some(row => row.id === target.audience)) return 'Pick an audience.';
    const country = target.countryId ? world.countries.find(row => row.id === target.countryId) : undefined;
    if (target.countryId && !country) return 'That country is not on the map.';
    if (country && target.regionId !== 'WORLD' && country.regionId !== target.regionId) return 'That country is outside the region you picked.';
    if (target.cityId) {
        const regionForCity = target.regionId === 'WORLD' ? country?.regionId : target.regionId;
        if (!regionForCity) return 'Name a country before a city when you buy the whole world.';
        const city = world.cities.find(row => row.id === target.cityId);
        if (!city || city.regionId !== regionForCity) return 'That city is not in this region.';
    }
    if (target.language && (typeof target.language !== 'string' || target.language.length > 40)) return 'That language variant is not usable.';
    if (LOCAL_CITY.has(actionId) && target.regionId !== 'WORLD' && !target.cityId) return 'Pick a city for this buy.';
    return null;
};

const audienceFactor = (audience: MarketingAudience, genre: string): number => {
    const key = genreKey(genre || '');
    if (audience === 'MASS') return 1;
    if (audience === 'GENRE') return 1.08;
    if (audience === 'YOUTH') return YOUTH.has(key) ? 1.14 : 0.7;
    if (audience === 'PRESTIGE') return PRESTIGE.has(key) ? 1.16 : 0.68;
    if (audience === 'FAMILY') return FAMILY.has(key) ? 1.14 : 0.66;
    return 1;
};

const rangesOverlap = (a0: number, a1: number, b0: number, b1: number) => a0 <= b1 && b0 <= a1;

export const exposureHeat = (exposure: MarketingExposure[], titleId: string, regionId: string, category: string): number => (
    exposure
        .filter(row => row.titleId === titleId && (row.regionId === regionId || row.regionId === 'WORLD' || regionId === 'WORLD') && row.category === category)
        .reduce((sum, row) => sum + row.heat, 0)
);

export interface QuoteInput {
    draft: MarketingDraft;
    title: MarketingTitle;
    world: MarketWorld;
    campaigns: MarketingCampaign[];
    exposure: MarketingExposure[];
    now: number;
    castFee: number;
    castBooked: boolean;
}

export const quoteBuy = (input: QuoteInput): { quote?: MarketingQuote; error?: string } => {
    const action = actionById(input.draft.actionId);
    if (!action) return { error: 'That campaign is not on the menu.' };
    if (!input.draft.key || typeof input.draft.key !== 'string') return { error: 'This buy has no ticket.' };
    if (input.draft.ownerKind !== 'EMPIRE' && input.draft.ownerKind !== 'HOUSE') return { error: 'Campaigns bill a company, not a person.' };
    const targetError = validateTarget(input.draft.target, input.world, action.id);
    if (targetError) return { error: targetError };
    const target = input.draft.target;
    const country = target.countryId ? input.world.countries.find(row => row.id === target.countryId) : undefined;
    const weeks = clamp(Math.round(target.durationWeeks), 1, 12);
    const size = action.category === 'OUTDOOR' ? sizeById(input.draft.creative.sizeId) : { cost: 1, reach: 1, id: 'sheet', name: '' };
    const cityPremium = target.cityId && PREMIUM_CITIES.has(target.cityId) ? 1.28 : 1;
    const worldPremium = target.regionId === 'WORLD' ? 2.15 : 1;
    const durationDiscount = weeks >= 6 ? 0.82 : weeks >= 4 ? 0.9 : 1;
    const partner = action.id === 'tieup' ? 0.62 : 1;
    const castFee = action.needsCast ? Math.max(0, Math.round(input.castFee * (input.castBooked ? 1.55 : 1))) : 0;
    const media = Math.round(action.base * weeks * size.cost * cityPremium * worldPremium * durationDiscount * partner);
    const cost = media + castFee;
    const match = audienceFactor(target.audience, input.title.genre);
    const languages = (country?.languages || []).map(language => language.toLowerCase());
    const wanted = (target.language || input.draft.creative.languageVariant || input.title.language || '').trim().toLowerCase();
    let languageFactor = 1;
    const notes: string[] = [];
    if (wanted && languages.length) {
        const hit = languages.some(language => language.includes(wanted) || wanted.includes(language));
        languageFactor = hit ? 1.08 : 0.58;
        if (!hit) notes.push(`${wanted} is a weak fit for ${country?.name || 'this country'}. Reach drops.`);
    }
    if (match < 0.85) notes.push('The audience you bought is not this picture\'s crowd.');
    if (input.castBooked && action.needsCast) notes.push('That cast is already booked. The fee went up and the stop will feel rushed.');
    if (!input.title.cast.length && action.needsCast) notes.push('No confirmed cast yet. The poster cannot put a name on the night.');
    const audienceScale = target.regionId === 'WORLD'
        ? 1.9
        : clamp((country?.audienceM || 40) / 80, 0.35, 2.1);
    const start = input.now + Math.max(0, Math.round(target.startOffset));
    const end = start + weeks - 1;
    const rivals = input.campaigns.filter(campaign => campaign.rival && campaign.status !== 'COMPLETE' && rangesOverlap(start, end, campaign.startAbsolute, campaign.endAbsolute) && (campaign.target.regionId === target.regionId || campaign.target.regionId === 'WORLD' || target.regionId === 'WORLD'));
    const competition = clamp(0.08 + rivals.length * 0.09 + (target.regionId === 'WORLD' ? 0.06 : 0), 0.08, 0.5);
    if (rivals.length) notes.push(`${rivals.length} rival ${rivals.length === 1 ? 'desk has' : 'desks have'} the same window. This can miss.`);
    else notes.push('No rival is booked on this window yet. The market can still ignore you.');
    const heat = exposureHeat(input.exposure, input.title.id, target.regionId, action.category);
    const saturation = clamp(heat / 100, 0, 0.85);
    const overexposed = heat >= 70;
    if (overexposed) notes.push('This title is already loud here. Another buy buys less.');
    const reach = Math.round(cost * action.reach * match * languageFactor * audienceScale * size.reach * (1 - competition) * (1 - saturation * 0.75));
    const hype = clamp(action.hype * match * languageFactor * (1 - competition * 0.65) * (1 - saturation * 0.9) * (action.id === 'giveaway' ? 0.7 : 1), 0, 18);
    const ticketWeight = input.title.statusLine === 'Streaming' ? 0.35 : input.draft.ownerKind === 'EMPIRE' ? 0.25 : 0.7;
    const streamWeight = input.draft.ownerKind === 'EMPIRE' || input.title.statusLine === 'Streaming' ? 0.8 : 0.4;
    const ticketInterest = clamp(action.ticket * ticketWeight * match * (1 - saturation * 0.5) * (1 - competition * 0.4), 0, 20);
    const streamInterest = clamp(action.stream * streamWeight * match * languageFactor * (1 - competition * 0.35), 0, 20);
    if (hype < 3) notes.push('Estimated hype is thin. Money alone will not open the film.');
    return {
        quote: {
            cost,
            castFee,
            reach,
            reachLow: Math.round(reach * 0.74),
            reachHigh: Math.round(reach * 1.16),
            hype: Math.round(hype * 10) / 10,
            ticketInterest: Math.round(ticketInterest * 10) / 10,
            streamInterest: Math.round(streamInterest * 10) / 10,
            competition,
            saturation,
            overexposed,
            notes,
        },
    };
};

/** Company or house cash only. Personal money and the production fund are copied through untouched. */
export const spendForCampaign = (
    wallet: WalletSnapshot,
    owner: 'EMPIRE' | 'HOUSE',
    cost: number,
    alreadyCharged: boolean,
): { wallet: WalletSnapshot; error?: string } => {
    const next: WalletSnapshot = {
        personal: wallet.personal,
        companyCash: wallet.companyCash,
        houseBalance: wallet.houseBalance,
        productionFund: wallet.productionFund,
    };
    if (alreadyCharged) return { wallet, error: 'This campaign is already on the books.' };
    if (!Number.isFinite(cost) || cost <= 0) return { wallet, error: 'This campaign has no price.' };
    if (owner === 'EMPIRE') {
        if (next.companyCash < cost) {
            return { wallet, error: `Company cash is short $${Math.ceil(cost - next.companyCash).toLocaleString()}. Personal cash stays put.` };
        }
        next.companyCash -= cost;
        return { wallet: next };
    }
    if (next.houseBalance < cost) {
        return { wallet, error: `The house has $${Math.max(0, Math.floor(next.houseBalance)).toLocaleString()} and this costs $${Math.ceil(cost).toLocaleString()}. Personal cash and the production fund stay put.` };
    }
    next.houseBalance -= cost;
    return { wallet: next };
};

const FAN_LINES = [
    'Already looking up showtimes.',
    'The poster is doing too much and I respect it.',
    'Put the lead on every board.',
    'I will watch this the night it drops.',
    'This city did not ask, but fine.',
    'Over it already. Next.',
    'The banner looks like money.',
    'Take the song, leave the plot.',
    'Who approved the tagline. I like them.',
    'Save me a seat or a login.',
];

export const commentsFor = (seed: string, overexposed: boolean): string[] => {
    const start = hashString(seed) % FAN_LINES.length;
    const lines = [0, 1, 2].map(step => FAN_LINES[(start + step * 3) % FAN_LINES.length]);
    if (overexposed) lines[2] = 'I have seen this title every day this month.';
    return lines;
};

const captionFor = (actionName: string, poster: MarketingPoster, city: string, format: MarketingSocialFormat): string => {
    const place = city ? ` in ${city}` : '';
    const cast = poster.castLine ? ` ${poster.castLine}.` : '';
    const date = poster.dateLine ? ` ${poster.dateLine}.` : '';
    if (format === 'REEL') return `${poster.title} — new reel${place}.${cast} ${poster.tagline}`;
    if (format === 'TRAILER') return `Trailer. ${poster.title}.${cast} ${poster.statusLine}.${date} ${poster.tagline}`;
    if (format === 'ANNOUNCEMENT') return `${poster.banner} announces ${poster.title}.${date} ${poster.statusLine}. ${poster.tagline}`;
    if (format === 'THREAD') return `${actionName}: ${poster.title}${place}. ${poster.tagline}${cast}`;
    return `${poster.title}${place}. ${poster.statusLine}.${date} ${poster.tagline}${cast}`;
};

export const materializeCampaign = (input: QuoteInput & { quote: MarketingQuote; week: number; year: number }): MarketingCampaign => {
    const action = actionById(input.draft.actionId)!;
    const weeks = clamp(Math.round(input.draft.target.durationWeeks), 1, 12);
    const start = input.now + Math.max(0, Math.round(input.draft.target.startOffset));
    const roll = 0.74 + unit(`${input.draft.key}:roll`) * 0.42;
    const poster = buildPoster(input.title, input.draft.creative);
    const resolvedReach = Math.round(input.quote.reach * roll);
    const resolvedHype = Math.round(input.quote.hype * roll * 10) / 10;
    const resolvedTicket = Math.round(input.quote.ticketInterest * roll * 10) / 10;
    const resolvedStream = Math.round(input.quote.streamInterest * roll * 10) / 10;
    const regionName = input.draft.target.regionId === 'WORLD'
        ? 'World'
        : (input.world.regions.find(region => region.id === input.draft.target.regionId)?.name || input.draft.target.regionId);
    const outcome: MarketingOutcome = {
        reach: 0,
        hype: 0,
        ticketInterest: 0,
        streamInterest: 0,
        appliedWeeks: 0,
        overexposed: input.quote.overexposed,
        note: roll < 0.85 ? 'The buy ran. The crowd was colder than the plan.' : roll > 1.08 ? 'The city actually stopped for this one.' : 'In market. Nothing is promised yet.',
        regions: [{ id: input.draft.target.regionId, name: regionName, reach: 0, interest: 0 }],
        channels: [{ id: action.category, name: action.name, reach: 0, sentiment: clamp(Math.round(50 + (roll - 0.9) * 80), 5, 95) }],
    };
    return {
        id: `mkt_${hashString(input.draft.key).toString(16)}`,
        key: input.draft.key,
        ownerKind: input.draft.ownerKind,
        ownerId: input.draft.ownerId,
        ownerName: input.draft.ownerName,
        titleId: input.title.id,
        titleName: input.title.name,
        actionId: action.id,
        category: action.category,
        status: start <= input.now ? 'LIVE' : 'SCHEDULED',
        startAbsolute: start,
        endAbsolute: start + weeks - 1,
        charged: true,
        chargeAmount: input.quote.cost,
        creative: input.draft.creative,
        target: input.draft.target,
        quote: input.quote,
        roll,
        resolvedReach,
        resolvedHype,
        resolvedTicket,
        resolvedStream,
        outcome,
        castNames: input.title.cast.map(person => person.name).slice(0, 4),
        poster,
        feedPostIds: [],
        rival: false,
    };
};

const sliceShare = (total: number, index: number, count: number): number => {
    if (count <= 0) return 0;
    const base = Math.floor((total / count) * 1000) / 1000;
    const used = base * count;
    const remainder = Math.round((total - used) * 1000) / 1000;
    return index === 0 ? base + remainder : base;
};

export const postsForCampaign = (
    campaign: MarketingCampaign,
    week: number,
    year: number,
    absoluteWeek: number,
    cityName: string,
): MarketingFeedPost[] => {
    const action = actionById(campaign.actionId);
    const format = campaign.creative.socialFormat;
    const frameFormat = format === 'REEL' || campaign.category === 'DIGITAL' ? 'REEL' : format === 'TRAILER' || campaign.actionId === 'trailer' || campaign.actionId === 'teaser' || campaign.actionId === 'music' ? 'PHOTO' : 'PHOTO';
    const likes = Math.max(80, Math.round(campaign.resolvedReach * 0.004 * campaign.roll));
    const comments = commentsFor(campaign.id, campaign.outcome.overexposed);
    const hue = hashString(campaign.ownerName) % 360;
    const handle = `@${campaign.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'desk'}`;
    const frame: MarketingFeedPost = {
        id: `frame_${campaign.id}`,
        campaignId: campaign.id,
        network: 'FRAME',
        ownerKind: campaign.ownerKind,
        ownerName: campaign.ownerName,
        handle,
        avatarHue: hue,
        titleName: campaign.titleName,
        caption: captionFor(action?.name || 'Campaign', campaign.poster, cityName, format === 'THREAD' ? 'STILL' : format),
        format: frameFormat,
        likes,
        comments: Math.max(3, Math.round(likes * 0.04)),
        shares: Math.max(2, Math.round(likes * 0.02)),
        reposts: 0,
        commentList: comments,
        week,
        year,
        absoluteWeek,
        trending: likes > 50_000,
        poster: campaign.poster,
        rival: campaign.rival,
        actionId: campaign.actionId,
    };
    const wire: MarketingFeedPost = {
        id: `wire_${campaign.id}`,
        campaignId: campaign.id,
        network: 'WIRE',
        ownerKind: campaign.ownerKind,
        ownerName: campaign.ownerName,
        handle,
        avatarHue: hue,
        titleName: campaign.titleName,
        caption: captionFor(action?.name || 'Campaign', campaign.poster, cityName, 'THREAD').slice(0, 240),
        format: 'MICRO',
        likes: Math.max(40, Math.round(likes * 0.35)),
        comments: Math.max(2, Math.round(likes * 0.01)),
        shares: 0,
        reposts: Math.max(2, Math.round(likes * 0.015)),
        commentList: comments,
        week,
        year,
        absoluteWeek,
        trending: likes > 80_000,
        poster: campaign.poster,
        rival: campaign.rival,
        actionId: campaign.actionId,
    };
    return [frame, wire];
};

const addRecord = (records: MarketingRecord[], campaign: MarketingCampaign, spent: number, reach: number, hype: number, ticket: number, stream: number) => {
    if (campaign.ownerKind !== 'EMPIRE' && campaign.ownerKind !== 'HOUSE') return;
    const found = records.find(row => row.ownerKind === campaign.ownerKind && row.ownerId === campaign.ownerId && row.titleId === campaign.titleId);
    if (found) {
        found.spent += spent;
        found.reach += reach;
        found.hype += hype;
        found.ticketInterest += ticket;
        found.streamInterest += stream;
        found.titleName = campaign.titleName;
        return;
    }
    records.unshift({
        ownerKind: campaign.ownerKind,
        ownerId: campaign.ownerId,
        titleId: campaign.titleId,
        titleName: campaign.titleName,
        spent,
        reach,
        hype,
        ticketInterest: ticket,
        streamInterest: stream,
    });
};

const bumpExposure = (exposure: MarketingExposure[], campaign: MarketingCampaign, now: number) => {
    const found = exposure.find(row => row.titleId === campaign.titleId && row.regionId === campaign.target.regionId && row.category === campaign.category);
    if (found) {
        found.heat = clamp(found.heat + 22, 0, 100);
        found.lastAbsolute = now;
        return;
    }
    exposure.unshift({
        titleId: campaign.titleId,
        regionId: campaign.target.regionId,
        category: String(campaign.category),
        heat: 22,
        lastAbsolute: now,
    });
};

export const advanceMarketing = (
    raw: unknown,
    now: number,
    week: number,
    year: number,
    cityName: (campaign: MarketingCampaign) => string,
    rivalCampaigns: MarketingCampaign[],
    rivalPosts: MarketingFeedPost[],
): { state: MarketingState; effects: WeekEffects } => {
    const state = normalizeMarketing(raw);
    const effects: WeekEffects = { notes: [], dirty: false, hype: [], posts: [] };
    if (state.exposureWeek !== now) {
        state.exposure = state.exposure.map(row => ({ ...row, heat: clamp(row.heat - 7, 0, 100) })).filter(row => row.heat > 0);
        state.exposureWeek = now;
        effects.dirty = true;
    }
    if (state.npcWeek !== now && (rivalCampaigns.length || rivalPosts.length)) {
        const existing = new Set(state.campaigns.map(campaign => campaign.id));
        rivalCampaigns.forEach(campaign => {
            if (!existing.has(campaign.id)) state.campaigns.unshift(campaign);
        });
        const postIds = new Set(state.posts.map(post => post.id));
        rivalPosts.forEach(post => {
            if (!postIds.has(post.id)) {
                state.posts.unshift(post);
                effects.posts.push(post);
            }
        });
        state.npcWeek = now;
        effects.dirty = true;
        if (rivalCampaigns.length) effects.notes.push('Rival desks bought the week. Their posts are in the feeds.');
    }
    state.campaigns.forEach(campaign => {
        if (campaign.rival) {
            if (campaign.status !== 'COMPLETE' && now > campaign.endAbsolute) {
                campaign.status = 'COMPLETE';
                effects.dirty = true;
            }
            return;
        }
        if (campaign.status === 'SCHEDULED' && now >= campaign.startAbsolute) {
            campaign.status = 'LIVE';
            effects.dirty = true;
            effects.notes.push(`${campaign.poster.title} is up. ${campaign.ownerName} bought ${actionById(campaign.actionId)?.name || 'a campaign'}.`);
        }
        if (campaign.status === 'LIVE' && campaign.feedPostIds.length === 0) {
            const posts = postsForCampaign(campaign, week, year, now, cityName(campaign));
            posts.forEach(post => state.posts.unshift(post));
            campaign.feedPostIds = posts.map(post => post.id);
            effects.posts.push(...posts);
            effects.dirty = true;
        }
        const inWindow = now >= campaign.startAbsolute && now <= campaign.endAbsolute;
        if (campaign.status === 'LIVE' && inWindow && campaign.lastAppliedAbsolute !== now) {
            const count = Math.max(1, campaign.endAbsolute - campaign.startAbsolute + 1);
            const index = campaign.outcome.appliedWeeks;
            const reach = sliceShare(campaign.resolvedReach, index, count);
            const hype = sliceShare(campaign.resolvedHype, index, count);
            const ticket = sliceShare(campaign.resolvedTicket, index, count);
            const stream = sliceShare(campaign.resolvedStream, index, count);
            campaign.outcome.reach += reach;
            campaign.outcome.hype += hype;
            campaign.outcome.ticketInterest += ticket;
            campaign.outcome.streamInterest += stream;
            campaign.outcome.appliedWeeks += 1;
            campaign.outcome.regions = campaign.outcome.regions.map(region => ({
                ...region,
                reach: region.reach + reach,
                interest: region.interest + ticket + stream,
            }));
            campaign.outcome.channels = campaign.outcome.channels.map(channel => ({ ...channel, reach: channel.reach + reach }));
            campaign.lastAppliedAbsolute = now;
            bumpExposure(state.exposure, campaign, now);
            addRecord(state.records, campaign, 0, reach, hype, ticket, stream);
            if (hype) effects.hype.push({ titleId: campaign.titleId, points: hype });
            effects.dirty = true;
        }
        if (campaign.status === 'LIVE' && now > campaign.endAbsolute) {
            campaign.status = 'COMPLETE';
            effects.dirty = true;
            effects.notes.push(`${campaign.titleName} wrapped its ${actionById(campaign.actionId)?.name || 'campaign'}. Reach ${formatCount(campaign.outcome.reach)}.`);
        }
    });
    state.campaigns = state.campaigns.slice(0, 80);
    state.posts = state.posts.slice(0, 120);
    state.records = state.records.slice(0, 80);
    state.version = 1;
    return { state, effects };
};

export const tourStops = (world: MarketWorld, target: MarketingTarget, seed: string): { id: string; name: string; x: number; y: number; note: string }[] => {
    const regionId = target.regionId === 'WORLD' ? (world.countries.find(country => country.id === target.countryId)?.regionId || 'NORTH_AMERICA') : target.regionId;
    const cities = world.cities.filter(city => city.regionId === regionId);
    const pool = cities.length ? cities : world.cities;
    const count = clamp(Math.round(target.durationWeeks) + 1, 2, 5);
    const start = hashString(seed) % Math.max(1, pool.length);
    const notes = ['Press stop', 'Fan rope', 'Campus', 'Mall atrium', 'Premiere night'];
    return Array.from({ length: Math.min(count, pool.length) }, (_, index) => {
        const city = pool[(start + index) % pool.length];
        return {
            id: city.id,
            name: city.name,
            x: 18 + ((hashString(city.id) % 64)),
            y: 22 + ((hashString(`${city.id}:y`) % 48)),
            note: notes[index % notes.length],
        };
    });
};

export const recordSpend = (records: MarketingRecord[], campaign: MarketingCampaign) => {
    addRecord(records, campaign, campaign.chargeAmount, 0, 0, 0, 0);
};

export const livePressure = (campaigns: MarketingCampaign[]) => {
    const live = campaigns.filter(campaign => !campaign.rival && campaign.status === 'LIVE');
    return live.map(campaign => ({
        titleId: campaign.titleId,
        ownerKind: campaign.ownerKind,
        stream: campaign.resolvedStream / Math.max(1, campaign.endAbsolute - campaign.startAbsolute + 1),
        ticket: campaign.resolvedTicket / Math.max(1, campaign.endAbsolute - campaign.startAbsolute + 1),
        outdoor: campaign.category === 'OUTDOOR' || campaign.category === 'TOUR' || campaign.category === 'STAGE',
    }));
};
