import { LaunchRegionId, PlatformId, RivalPlatformState, RivalTier } from '../../types';
import { buildMarketCountries } from './generateCountries';

export interface LaunchRegion {
    id: LaunchRegionId;
    name: string;
    short: string;
}

export interface MarketCity {
    id: string;
    name: string;
    x: number;
    y: number;
}

export interface MarketCountry {
    id: string;
    name: string;
    regionId: LaunchRegionId;
    flag: string;
    /** People who could watch on opening night, in millions. */
    audienceM: number;
    growthPct: number;
    /** Cost to clear the market, USD. */
    accessCost: number;
    unclaimedPct: number;
    competitors: { name: string; share: number }[];
    languages: { name: string; share: number }[];
    difficulty: 'OPEN' | 'CROWDED' | 'FOUGHT_OVER' | 'HARD';
    reviewLabel: string;
    reviewWeeks: number;
    taxLabel: string;
    taxRate: number;
    taxNote: string;
    privacyLabel: string;
    privacyNote: string;
    localContentLabel: string;
    localContentPct: number;
    localContentNote: string;
    filings: string[];
    paymentEase: number;
    affordability: number;
    x: number;
    y: number;
    /** Population in millions, from the seed. Tuned audience numbers are left alone. */
    populationM?: number;
    /** ISO currency code. The sticker itself still comes from the FX table. */
    currency?: string;
    /** Slice of the launch region, hand-set for the original markets and derived for the rest. */
    subRegion?: string;
}

export interface ServerClass {
    id: 'SCOUT' | 'WORKHORSE' | 'TITAN';
    name: string;
    reachKm: number;
    onceUsd: number;
    weeklyUsd: number;
    capacity: number;
    energyMwh: number;
    blurb: string;
}

export interface CloudProvider {
    id: string;
    name: string;
    weeklyPerRack: number;
    capacityPerRack: number;
    energyPerRack: number;
    maxRacks: number;
}

export interface StorefrontLayout {
    id: string;
    name: string;
    blurb: string;
    discovery: number;
    retention: number;
    localBoost: number;
}

export interface IdentityPreset {
    id: string;
    name: string;
    tagline: string;
    accent: string;
    toneHz: number;
}

export interface LicenceTitle {
    id: string;
    title: string;
    genre: string;
    language: string;
    cost: number;
}

export interface FestivalOption {
    id: string;
    name: string;
    city: string;
    forecastMult: number;
    note: string;
}

export interface DealBidder {
    id: string;
    name: string;
    platformId: PlatformId;
    audienceMult: number;
    color: string;
    taste: string[];
    guaranteeBias: number;
    backendBias: number;
    homeRegion: LaunchRegionId;
}

export const LAUNCH_REGIONS: LaunchRegion[] = [
    { id: 'NORTH_AMERICA', name: 'North America', short: 'N. America' },
    { id: 'SOUTH_AMERICA', name: 'South America', short: 'S. America' },
    { id: 'EUROPE', name: 'Europe', short: 'Europe' },
    { id: 'AFRICA', name: 'Africa', short: 'Africa' },
    { id: 'ASIA', name: 'Asia', short: 'Asia' },
    { id: 'OCEANIA', name: 'Oceania', short: 'Oceania' },
];

export const REGION_CITIES: Record<LaunchRegionId, MarketCity[]> = {
    NORTH_AMERICA: [
        { id: 'mia', name: 'Miami', x: 24, y: 46 },
        { id: 'nyc', name: 'New York', x: 28, y: 36 },
        { id: 'chi', name: 'Chicago', x: 20, y: 36 },
        { id: 'hou', name: 'Houston', x: 18, y: 44 },
        { id: 'lax', name: 'Los Angeles', x: 12, y: 40 },
        { id: 'yyz', name: 'Toronto', x: 26, y: 32 },
        { id: 'mex', name: 'Mexico City', x: 16, y: 52 },
    ],
    SOUTH_AMERICA: [
        { id: 'sao', name: 'São Paulo', x: 34, y: 72 },
        { id: 'rio', name: 'Rio de Janeiro', x: 36, y: 70 },
        { id: 'eze', name: 'Buenos Aires', x: 32, y: 84 },
        { id: 'bog', name: 'Bogotá', x: 26, y: 58 },
    ],
    EUROPE: [
        { id: 'lon', name: 'London', x: 46, y: 30 },
        { id: 'par', name: 'Paris', x: 48, y: 34 },
        { id: 'ber', name: 'Berlin', x: 52, y: 30 },
        { id: 'mad', name: 'Madrid', x: 46, y: 40 },
        { id: 'rom', name: 'Rome', x: 52, y: 40 },
        { id: 'sto', name: 'Stockholm', x: 54, y: 22 },
    ],
    AFRICA: [
        { id: 'los', name: 'Lagos', x: 48, y: 56 },
        { id: 'jnb', name: 'Johannesburg', x: 54, y: 78 },
        { id: 'cai', name: 'Cairo', x: 56, y: 44 },
        { id: 'nbo', name: 'Nairobi', x: 58, y: 62 },
    ],
    ASIA: [
        { id: 'bom', name: 'Mumbai', x: 66, y: 48 },
        { id: 'tyo', name: 'Tokyo', x: 84, y: 38 },
        { id: 'sel', name: 'Seoul', x: 80, y: 36 },
        { id: 'jkt', name: 'Jakarta', x: 76, y: 64 },
        { id: 'mnl', name: 'Manila', x: 80, y: 54 },
        { id: 'sha', name: 'Shanghai', x: 78, y: 40 },
    ],
    OCEANIA: [
        { id: 'syd', name: 'Sydney', x: 86, y: 78 },
        { id: 'akl', name: 'Auckland', x: 94, y: 82 },
    ],
};

export const MARKET_COUNTRIES: MarketCountry[] = buildMarketCountries();

export const SERVER_CLASSES: ServerClass[] = [
    { id: 'SCOUT', name: 'Scout', reachKm: 296, onceUsd: 1_880_000, weeklyUsd: 42_000, capacity: 4_500, energyMwh: 4, blurb: 'Spreads cheap and wide.' },
    { id: 'WORKHORSE', name: 'Workhorse', reachKm: 520, onceUsd: 3_750_000, weeklyUsd: 96_000, capacity: 18_000, energyMwh: 18, blurb: 'The rack everything is measured against.' },
    { id: 'TITAN', name: 'Titan', reachKm: 1040, onceUsd: 8_250_000, weeklyUsd: 210_000, capacity: 48_000, energyMwh: 46, blurb: 'Centralises hard. One room, a lot of night.' },
];

export const CLOUD_PROVIDERS: CloudProvider[] = [
    { id: 'ATLAS', name: 'Atlas Compute', weeklyPerRack: 185_000, capacityPerRack: 22_000, energyPerRack: 9, maxRacks: 284 },
    { id: 'NORTHWIND', name: 'Northwind', weeklyPerRack: 140_000, capacityPerRack: 14_000, energyPerRack: 7, maxRacks: 284 },
    { id: 'MERIDIAN', name: 'Meridian Edge', weeklyPerRack: 220_000, capacityPerRack: 28_000, energyPerRack: 12, maxRacks: 284 },
];

export const STOREFRONTS: StorefrontLayout[] = [
    { id: 'editorial', name: 'Editorial', blurb: 'A front page with a point of view. Slower browse, stronger first click.', discovery: 1.08, retention: 1.06, localBoost: 0.02 },
    { id: 'billboard', name: 'Billboard', blurb: 'One giant title, then the rest. Good for opening night.', discovery: 1.12, retention: 0.98, localBoost: 0 },
    { id: 'rails', name: 'Rails', blurb: 'Rows of "because you watched". Familiar, a little anonymous.', discovery: 1.04, retention: 1.08, localBoost: 0.01 },
    { id: 'grid', name: 'Poster grid', blurb: 'Everything visible. Viewers who know what they want move fast.', discovery: 0.96, retention: 1.02, localBoost: 0 },
    { id: 'genre-rooms', name: 'Genre rooms', blurb: 'Horror, romance, and sport each get a door.', discovery: 1.06, retention: 1.04, localBoost: 0.02 },
    { id: 'continue', name: 'Continue watching', blurb: 'The home row is whatever they did not finish.', discovery: 0.94, retention: 1.14, localBoost: 0 },
    { id: 'kids-gate', name: 'Kids gate', blurb: 'A family front door. Reach shrinks, trust rises.', discovery: 0.9, retention: 1.1, localBoost: 0.03 },
    { id: 'sports-lane', name: 'Sports lane', blurb: 'Live and near-live sit above the catalogue.', discovery: 1.05, retention: 1.0, localBoost: 0.04 },
    { id: 'prestige', name: 'Prestige shelf', blurb: 'Fewer posters, more silence. Awards viewers stay.', discovery: 0.92, retention: 1.07, localBoost: 0.01 },
    { id: 'local-first', name: 'Local first', blurb: 'The home row speaks the country you are in.', discovery: 1.02, retention: 1.09, localBoost: 0.12 },
    { id: 'trending', name: 'Trending now', blurb: 'The chart is the product. Hits spike, flops vanish.', discovery: 1.14, retention: 0.94, localBoost: 0.02 },
    { id: 'bundles', name: 'Bundles', blurb: 'Channels and add-ons on the front door.', discovery: 1.0, retention: 1.05, localBoost: 0.02 },
    { id: 'search-first', name: 'Search first', blurb: 'A bar, then results. Power users love it. Everyone else leaves.', discovery: 0.88, retention: 1.03, localBoost: 0.01 },
];

export const IDENTITY_PRESETS: IdentityPreset[] = [
    { id: 'signal', name: 'Signal', tagline: 'A clean tone and a red mark.', accent: '#ff3b30', toneHz: 440 },
    { id: 'marquee', name: 'Marquee', tagline: 'Lights, a fanfare, a little vanity.', accent: '#f5c16c', toneHz: 523 },
    { id: 'noir', name: 'Noir', tagline: 'Low strings. The poster does the talking.', accent: '#9aa4b2', toneHz: 196 },
    { id: 'pulse', name: 'Pulse', tagline: 'A club hit for the bumper.', accent: '#fb7185', toneHz: 329 },
    { id: 'atlas', name: 'Atlas', tagline: 'Wide, calm, a little corporate.', accent: '#38bdf8', toneHz: 392 },
    { id: 'hearth', name: 'Hearth', tagline: 'Warm and domestic. Families stay.', accent: '#fb923c', toneHz: 349 },
    { id: 'voltage', name: 'Voltage', tagline: 'Sharp, young, impatient.', accent: '#a3e635', toneHz: 587 },
    { id: 'linen', name: 'Linen', tagline: 'Quiet luxury. Slow type, soft hit.', accent: '#e7e5e4', toneHz: 262 },
];

export const LICENCE_SHELF: LicenceTitle[] = [
    { id: 'lic-long-night', title: 'The Long Night', genre: 'Thriller', language: 'English', cost: 18_000_000 },
    { id: 'lic-monsoon', title: 'Monsoon Office', genre: 'Drama', language: 'Hindi', cost: 9_500_000 },
    { id: 'lic-lagos', title: 'Third Mainland', genre: 'Crime', language: 'English', cost: 4_200_000 },
    { id: 'lic-porto', title: 'Salt on the Lens', genre: 'Romance', language: 'Portuguese', cost: 6_400_000 },
    { id: 'lic-seine', title: 'After the Credits', genre: 'Drama', language: 'French', cost: 8_800_000 },
    { id: 'lic-han', title: 'Paper Cranes', genre: 'Romance', language: 'Korean', cost: 11_000_000 },
    { id: 'lic-edo', title: 'Station Back', genre: 'Thriller', language: 'Japanese', cost: 12_500_000 },
    { id: 'lic-cairo', title: 'The Roof Was Open', genre: 'Drama', language: 'Arabic', cost: 3_600_000 },
    { id: 'lic-berlin', title: 'Grey Hour', genre: 'Crime', language: 'German', cost: 7_200_000 },
    { id: 'lic-sydney', title: 'Low Tide Club', genre: 'Comedy', language: 'English', cost: 5_100_000 },
    { id: 'lic-mx', title: 'North of Roma', genre: 'Action', language: 'Spanish', cost: 8_000_000 },
    { id: 'lic-doc', title: 'Wires Across Water', genre: 'Documentary', language: 'English', cost: 2_200_000 },
];

export const FESTIVALS: FestivalOption[] = [
    { id: 'sundance', name: 'Sundance', city: 'Park City', forecastMult: 1.04, note: 'Indie press, a softer commercial bump.' },
    { id: 'cannes', name: 'Cannes', city: 'Cannes', forecastMult: 1.08, note: 'Prestige travels. Europe pays attention.' },
    { id: 'tiff', name: 'TIFF', city: 'Toronto', forecastMult: 1.06, note: 'A North American launch pad.' },
    { id: 'berlin', name: 'Berlin', city: 'Berlin', forecastMult: 1.05, note: 'Critics, and a serious European buyer list.' },
    { id: 'venice', name: 'Venice', city: 'Venice', forecastMult: 1.07, note: 'Awards heat, narrower crowd.' },
    { id: 'busan', name: 'Busan', city: 'Busan', forecastMult: 1.05, note: 'The Asian sales corridor.' },
    { id: 'none', name: 'No festival', city: 'Straight to market', forecastMult: 1, note: 'Skip the carpet. Keep the weekend.' },
];

export const CAMPAIGN_CHANNELS = [
    { id: 'social', name: 'Social', blurb: 'Cheap, fast, easy to ignore.' },
    { id: 'tv', name: 'Television', blurb: 'Still how parents hear about a film.' },
    { id: 'outdoor', name: 'Outdoor', blurb: 'The title on the way to work.' },
    { id: 'premiere', name: 'Premiere', blurb: 'A night, a photograph, a quote.' },
    { id: 'press', name: 'Local press', blurb: 'Papers and radio in the cities you picked.' },
    { id: 'influencers', name: 'Creators', blurb: 'A clip that is not yours, which is the point.' },
    { id: 'sports', name: 'Sports bump', blurb: 'A spot next to a match. Expensive attention.' },
    { id: 'transit', name: 'Transit', blurb: 'Platforms, airports, the long queue.' },
];

export const DEAL_BIDDERS: DealBidder[] = [
    { id: 'netflix', name: 'Netflix', platformId: 'NETFLIX', audienceMult: 1.5, color: '#e50914', taste: ['Thriller', 'Action', 'Romance', 'Sci-Fi'], guaranteeBias: 1.15, backendBias: 0.7, homeRegion: 'NORTH_AMERICA' },
    { id: 'max', name: 'Max', platformId: 'HULU', audienceMult: 1.05, color: '#7c3aed', taste: ['Drama', 'Crime', 'Comedy'], guaranteeBias: 0.95, backendBias: 1.05, homeRegion: 'NORTH_AMERICA' },
    { id: 'prime', name: 'Prime Video', platformId: 'NETFLIX', audienceMult: 1.35, color: '#00a8e1', taste: ['Action', 'Comedy', 'Drama'], guaranteeBias: 1.05, backendBias: 0.85, homeRegion: 'NORTH_AMERICA' },
    { id: 'paramount', name: 'Paramount+', platformId: 'HULU', audienceMult: 0.85, color: '#0064ff', taste: ['Action', 'Thriller', 'Comedy'], guaranteeBias: 0.82, backendBias: 1.1, homeRegion: 'NORTH_AMERICA' },
    { id: 'peacock', name: 'Peacock', platformId: 'HULU', audienceMult: 0.8, color: '#f5c518', taste: ['Comedy', 'Drama', 'Sports'], guaranteeBias: 0.78, backendBias: 1.15, homeRegion: 'NORTH_AMERICA' },
    { id: 'disney', name: 'Disney+', platformId: 'DISNEY_PLUS', audienceMult: 1.4, color: '#1d4ed8', taste: ['Fantasy', 'Action', 'Animation'], guaranteeBias: 1.08, backendBias: 0.75, homeRegion: 'NORTH_AMERICA' },
    { id: 'apple', name: 'Apple TV+', platformId: 'APPLE_TV', audienceMult: 0.6, color: '#d4d4d8', taste: ['Drama', 'Thriller'], guaranteeBias: 0.9, backendBias: 0.9, homeRegion: 'NORTH_AMERICA' },
    { id: 'hulu', name: 'Hulu', platformId: 'HULU', audienceMult: 0.9, color: '#1ce783', taste: ['Drama', 'Romance', 'Thriller'], guaranteeBias: 0.8, backendBias: 1, homeRegion: 'NORTH_AMERICA' },
    { id: 'canal', name: 'Canal+', platformId: 'APPLE_TV', audienceMult: 0.55, color: '#111111', taste: ['Drama', 'Crime'], guaranteeBias: 0.7, backendBias: 1.2, homeRegion: 'EUROPE' },
    { id: 'globoplay', name: 'Globoplay', platformId: 'HULU', audienceMult: 0.7, color: '#fb7185', taste: ['Drama', 'Romance'], guaranteeBias: 0.62, backendBias: 1.05, homeRegion: 'SOUTH_AMERICA' },
    { id: 'hotstar', name: 'Hotstar', platformId: 'DISNEY_PLUS', audienceMult: 1.2, color: '#1e3a8a', taste: ['Action', 'Romance', 'Sports'], guaranteeBias: 0.74, backendBias: 0.95, homeRegion: 'ASIA' },
    { id: 'stan', name: 'Stan', platformId: 'HULU', audienceMult: 0.4, color: '#38bdf8', taste: ['Drama', 'Thriller'], guaranteeBias: 0.5, backendBias: 1.1, homeRegion: 'OCEANIA' },
    { id: 'showmax', name: 'Showmax', platformId: 'HULU', audienceMult: 0.45, color: '#f97316', taste: ['Drama', 'Crime'], guaranteeBias: 0.42, backendBias: 1, homeRegion: 'AFRICA' },
    { id: 'tving', name: 'TVING', platformId: 'HULU', audienceMult: 0.5, color: '#ff2d55', taste: ['Romance', 'Thriller'], guaranteeBias: 0.66, backendBias: 1.05, homeRegion: 'ASIA' },
];

interface RivalSeed {
    id: string;
    name: string;
    tier: RivalTier;
    homeRegion: LaunchRegionId;
    householdsM: number;
    monthlyPrice: number;
    reputation: number;
    languages: string[];
}

const RIVAL_SEEDS: RivalSeed[] = [
    { id: 'netflix', name: 'Netflix', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 260, monthlyPrice: 15.5, reputation: 78, languages: ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Hindi', 'Korean', 'Japanese'] },
    { id: 'prime', name: 'Prime Video', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 200, monthlyPrice: 8.99, reputation: 70, languages: ['English', 'Spanish', 'German', 'Hindi', 'Japanese'] },
    { id: 'disney', name: 'Disney+', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 150, monthlyPrice: 13.99, reputation: 82, languages: ['English', 'Spanish', 'French', 'Portuguese'] },
    { id: 'max', name: 'Max', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 95, monthlyPrice: 16.99, reputation: 76, languages: ['English', 'Spanish'] },
    { id: 'paramount', name: 'Paramount+', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 70, monthlyPrice: 11.99, reputation: 64, languages: ['English', 'Spanish'] },
    { id: 'peacock', name: 'Peacock', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 36, monthlyPrice: 7.99, reputation: 58, languages: ['English'] },
    { id: 'apple', name: 'Apple TV+', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 45, monthlyPrice: 9.99, reputation: 88, languages: ['English', 'French', 'German', 'Japanese'] },
    { id: 'hulu', name: 'Hulu', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 48, monthlyPrice: 9.99, reputation: 66, languages: ['English', 'Spanish'] },
    { id: 'youtube', name: 'YouTube', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 400, monthlyPrice: 13.99, reputation: 60, languages: ['English', 'Spanish', 'Hindi', 'Portuguese', 'Arabic'] },
    { id: 'crunchyroll', name: 'Crunchyroll', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 15, monthlyPrice: 7.99, reputation: 72, languages: ['Japanese', 'English'] },
    { id: 'mubi', name: 'Mubi', tier: 'GLOBAL', homeRegion: 'EUROPE', householdsM: 4, monthlyPrice: 14.99, reputation: 86, languages: ['English', 'French', 'Spanish'] },
    { id: 'discovery', name: 'Discovery+', tier: 'GLOBAL', homeRegion: 'NORTH_AMERICA', householdsM: 24, monthlyPrice: 8.99, reputation: 62, languages: ['English'] },
    { id: 'hotstar', name: 'Hotstar', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 55, monthlyPrice: 3.5, reputation: 74, languages: ['Hindi', 'Tamil', 'Telugu', 'English'] },
    { id: 'zee5', name: 'ZEE5', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 22, monthlyPrice: 2.2, reputation: 60, languages: ['Hindi', 'Tamil', 'Telugu'] },
    { id: 'sonyliv', name: 'SonyLIV', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 18, monthlyPrice: 3, reputation: 63, languages: ['Hindi', 'English'] },
    { id: 'globoplay', name: 'Globoplay', tier: 'REGIONAL', homeRegion: 'SOUTH_AMERICA', householdsM: 28, monthlyPrice: 5.5, reputation: 77, languages: ['Portuguese'] },
    { id: 'starplus', name: 'Star+', tier: 'REGIONAL', homeRegion: 'SOUTH_AMERICA', householdsM: 16, monthlyPrice: 6.5, reputation: 68, languages: ['Spanish', 'Portuguese'] },
    { id: 'vix', name: 'ViX', tier: 'REGIONAL', homeRegion: 'NORTH_AMERICA', householdsM: 14, monthlyPrice: 6.99, reputation: 64, languages: ['Spanish'] },
    { id: 'canal', name: 'Canal+', tier: 'REGIONAL', homeRegion: 'EUROPE', householdsM: 20, monthlyPrice: 22, reputation: 80, languages: ['French'] },
    { id: 'itvx', name: 'ITVX', tier: 'REGIONAL', homeRegion: 'EUROPE', householdsM: 12, monthlyPrice: 5.99, reputation: 66, languages: ['English'] },
    { id: 'iplayer', name: 'BBC iPlayer', tier: 'REGIONAL', homeRegion: 'EUROPE', householdsM: 18, monthlyPrice: 0, reputation: 90, languages: ['English'] },
    { id: 'stan', name: 'Stan', tier: 'REGIONAL', homeRegion: 'OCEANIA', householdsM: 2.6, monthlyPrice: 12, reputation: 70, languages: ['English'] },
    { id: 'binge', name: 'Binge', tier: 'REGIONAL', homeRegion: 'OCEANIA', householdsM: 1.8, monthlyPrice: 10, reputation: 64, languages: ['English'] },
    { id: 'crave', name: 'Crave', tier: 'REGIONAL', homeRegion: 'NORTH_AMERICA', householdsM: 3.1, monthlyPrice: 14, reputation: 68, languages: ['English', 'French'] },
    { id: 'tving', name: 'TVING', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 6, monthlyPrice: 9.5, reputation: 73, languages: ['Korean'] },
    { id: 'wavve', name: 'Wavve', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 5.2, monthlyPrice: 9, reputation: 69, languages: ['Korean'] },
    { id: 'iqiyi', name: 'iQiyi', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 90, monthlyPrice: 4, reputation: 71, languages: ['Mandarin'] },
    { id: 'tencent', name: 'Tencent Video', tier: 'REGIONAL', homeRegion: 'ASIA', householdsM: 100, monthlyPrice: 4.2, reputation: 73, languages: ['Mandarin'] },
    { id: 'showmax', name: 'Showmax', tier: 'EMERGING', homeRegion: 'AFRICA', householdsM: 3.4, monthlyPrice: 4, reputation: 66, languages: ['English', 'Zulu', 'Afrikaans'] },
    { id: 'shahid', name: 'Shahid', tier: 'EMERGING', homeRegion: 'AFRICA', householdsM: 4.1, monthlyPrice: 5, reputation: 64, languages: ['Arabic'] },
    { id: 'vidio', name: 'Vidio', tier: 'EMERGING', homeRegion: 'ASIA', householdsM: 8, monthlyPrice: 2.4, reputation: 58, languages: ['Indonesian'] },
    { id: 'viu', name: 'Viu', tier: 'EMERGING', homeRegion: 'ASIA', householdsM: 9, monthlyPrice: 3, reputation: 61, languages: ['Indonesian', 'Filipino', 'Hindi', 'English'] },
    { id: 'coupang', name: 'Coupang Play', tier: 'EMERGING', homeRegion: 'ASIA', householdsM: 5, monthlyPrice: 0, reputation: 62, languages: ['Korean'] },
    { id: 'nightowl', name: 'Nightowl', tier: 'EMERGING', homeRegion: 'NORTH_AMERICA', householdsM: 1.2, monthlyPrice: 6.99, reputation: 54, languages: ['English', 'Spanish'] },
    { id: 'red-lantern', name: 'Red Lantern', tier: 'EMERGING', homeRegion: 'ASIA', householdsM: 2.4, monthlyPrice: 4.5, reputation: 57, languages: ['Mandarin', 'English'] },
    { id: 'lagos-stream', name: 'Lagos Stream', tier: 'EMERGING', homeRegion: 'AFRICA', householdsM: 1.6, monthlyPrice: 2.5, reputation: 55, languages: ['English', 'Yoruba'] },
    { id: 'pampas', name: 'Pampas Play', tier: 'EMERGING', homeRegion: 'SOUTH_AMERICA', householdsM: 0.9, monthlyPrice: 3.5, reputation: 52, languages: ['Spanish'] },
    { id: 'harbour', name: 'Harbour', tier: 'EMERGING', homeRegion: 'OCEANIA', householdsM: 0.4, monthlyPrice: 8, reputation: 60, languages: ['English'] },
    { id: 'kinohaus', name: 'KinoHaus', tier: 'EMERGING', homeRegion: 'EUROPE', householdsM: 1.1, monthlyPrice: 9.5, reputation: 71, languages: ['German', 'English'] },
    { id: 'sahara', name: 'Sahara Box', tier: 'EMERGING', homeRegion: 'AFRICA', householdsM: 0.8, monthlyPrice: 2, reputation: 48, languages: ['Arabic', 'French', 'English'] },
];

export const RIVAL_COUNT = RIVAL_SEEDS.length;

export const createRivalRoster = (): RivalPlatformState[] => RIVAL_SEEDS.map(seed => ({
    id: seed.id,
    name: seed.name,
    tier: seed.tier,
    homeRegion: seed.homeRegion,
    householdsM: seed.householdsM,
    monthlyPrice: seed.monthlyPrice,
    reputation: seed.reputation,
    languages: seed.languages,
    status: 'ACTIVE',
    note: seed.tier === 'GLOBAL' ? 'Already in the living room.' : seed.tier === 'REGIONAL' ? 'Owns the local habit.' : 'Still buying its first hit.',
}));

export const getCountry = (id: string): MarketCountry | undefined => MARKET_COUNTRIES.find(row => row.id === id);

export const getRegion = (id: LaunchRegionId): LaunchRegion => LAUNCH_REGIONS.find(row => row.id === id) || LAUNCH_REGIONS[0];

export const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};
