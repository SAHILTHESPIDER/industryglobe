import { LaunchRegionId, PlatformId, RivalPlatformState, RivalTier } from '../../types';

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

const country = (row: MarketCountry): MarketCountry => row;

export const MARKET_COUNTRIES: MarketCountry[] = [
    country({ id: 'US', name: 'United States', regionId: 'NORTH_AMERICA', flag: '🇺🇸', audienceM: 225, growthPct: 3, accessCost: 48_000_000, unclaimedPct: 33, competitors: [{ name: 'Netflix', share: 24 }, { name: 'Prime Video', share: 18 }, { name: 'Disney+', share: 15 }, { name: 'Hulu', share: 10 }], languages: [{ name: 'English', share: 76 }, { name: 'Spanish', share: 13 }], difficulty: 'FOUGHT_OVER', reviewLabel: 'Detailed', reviewWeeks: 5, taxLabel: 'Heavy', taxRate: 0.24, taxNote: '24% baseline tax', privacyLabel: 'Enforced hard', privacyNote: 'Strict privacy review', localContentLabel: 'Encouraged', localContentPct: 5, localContentNote: '5% local-content obligation', filings: ['Privacy filings', 'Age ratings', 'Consumer rules vary by state'], paymentEase: 0.95, affordability: 15, x: 22, y: 40 }),
    country({ id: 'CA', name: 'Canada', regionId: 'NORTH_AMERICA', flag: '🇨🇦', audienceM: 29, growthPct: 4, accessCost: 11_000_000, unclaimedPct: 34, competitors: [{ name: 'Netflix', share: 29 }, { name: 'Crave', share: 14 }, { name: 'Prime Video', share: 12 }, { name: 'Disney+', share: 11 }], languages: [{ name: 'English', share: 76 }, { name: 'French', share: 21 }], difficulty: 'CROWDED', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.15, taxNote: 'Federal plus provincial', privacyLabel: 'Enforced', privacyNote: 'Federal privacy law', localContentLabel: 'Some paperwork', localContentPct: 12, localContentNote: 'Canadian content expectations', filings: ['Broadcast notice', 'French-language availability'], paymentEase: 0.92, affordability: 14, x: 20, y: 30 }),
    country({ id: 'MX', name: 'Mexico', regionId: 'NORTH_AMERICA', flag: '🇲🇽', audienceM: 48, growthPct: 6, accessCost: 9_500_000, unclaimedPct: 41, competitors: [{ name: 'Netflix', share: 22 }, { name: 'ViX', share: 16 }, { name: 'Prime Video', share: 11 }, { name: 'Disney+', share: 10 }], languages: [{ name: 'Spanish', share: 93 }, { name: 'English', share: 5 }], difficulty: 'OPEN', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.16, taxNote: 'VAT on digital services', privacyLabel: 'Developing', privacyNote: 'Federal data law', localContentLabel: 'Encouraged', localContentPct: 8, localContentNote: 'Spanish catalogue expected', filings: ['Tax registration', 'Ratings board'], paymentEase: 0.72, affordability: 8, x: 16, y: 48 }),
    country({ id: 'BR', name: 'Brazil', regionId: 'SOUTH_AMERICA', flag: '🇧🇷', audienceM: 92, growthPct: 5, accessCost: 14_000_000, unclaimedPct: 38, competitors: [{ name: 'Globoplay', share: 21 }, { name: 'Netflix', share: 19 }, { name: 'Prime Video', share: 12 }, { name: 'Disney+', share: 10 }], languages: [{ name: 'Portuguese', share: 97 }], difficulty: 'CROWDED', reviewLabel: 'Detailed', reviewWeeks: 6, taxLabel: 'Heavy', taxRate: 0.22, taxNote: 'Layered digital taxes', privacyLabel: 'Enforced', privacyNote: 'LGPD applies', localContentLabel: 'Expected', localContentPct: 15, localContentNote: 'Portuguese dubs move the needle', filings: ['LGPD filing', 'ANCINE notice'], paymentEase: 0.7, affordability: 7, x: 34, y: 68 }),
    country({ id: 'AR', name: 'Argentina', regionId: 'SOUTH_AMERICA', flag: '🇦🇷', audienceM: 18, growthPct: 2, accessCost: 4_200_000, unclaimedPct: 46, competitors: [{ name: 'Netflix', share: 24 }, { name: 'Star+', share: 14 }, { name: 'Prime Video', share: 10 }], languages: [{ name: 'Spanish', share: 96 }], difficulty: 'OPEN', reviewLabel: 'Light', reviewWeeks: 3, taxLabel: 'Volatile', taxRate: 0.21, taxNote: 'Inflation makes pesos a trap. You still settle in USD.', privacyLabel: 'Patchy', privacyNote: 'Rules exist, enforcement varies', localContentLabel: 'Light', localContentPct: 4, localContentNote: 'Local films help, they are not required', filings: ['Tax id', 'Consumer notice'], paymentEase: 0.48, affordability: 5, x: 30, y: 82 }),
    country({ id: 'CO', name: 'Colombia', regionId: 'SOUTH_AMERICA', flag: '🇨🇴', audienceM: 19, growthPct: 7, accessCost: 3_800_000, unclaimedPct: 52, competitors: [{ name: 'Netflix', share: 20 }, { name: 'Disney+', share: 12 }, { name: 'Prime Video', share: 9 }], languages: [{ name: 'Spanish', share: 99 }], difficulty: 'OPEN', reviewLabel: 'Light', reviewWeeks: 3, taxLabel: 'Moderate', taxRate: 0.19, taxNote: 'VAT on foreign digital', privacyLabel: 'Developing', privacyNote: 'Habeas data rules', localContentLabel: 'Light', localContentPct: 5, localContentNote: 'Spanish is the real gate', filings: ['Tax registration'], paymentEase: 0.66, affordability: 6, x: 26, y: 58 }),
    country({ id: 'GB', name: 'United Kingdom', regionId: 'EUROPE', flag: '🇬🇧', audienceM: 44, growthPct: 2, accessCost: 18_000_000, unclaimedPct: 28, competitors: [{ name: 'Netflix', share: 23 }, { name: 'BBC iPlayer', share: 16 }, { name: 'Prime Video', share: 13 }, { name: 'Disney+', share: 12 }], languages: [{ name: 'English', share: 92 }], difficulty: 'FOUGHT_OVER', reviewLabel: 'Detailed', reviewWeeks: 5, taxLabel: 'Moderate', taxRate: 0.2, taxNote: 'Digital services tax plus VAT', privacyLabel: 'Enforced hard', privacyNote: 'UK GDPR', localContentLabel: 'Encouraged', localContentPct: 8, localContentNote: 'Public-service rivals already own the locals', filings: ['ICO notice', 'Age ratings', 'Ofcom awareness'], paymentEase: 0.94, affordability: 13, x: 46, y: 30 }),
    country({ id: 'FR', name: 'France', regionId: 'EUROPE', flag: '🇫🇷', audienceM: 32, growthPct: 3, accessCost: 16_000_000, unclaimedPct: 31, competitors: [{ name: 'Netflix', share: 18 }, { name: 'Canal+', share: 17 }, { name: 'Prime Video', share: 11 }, { name: 'Disney+', share: 10 }], languages: [{ name: 'French', share: 94 }], difficulty: 'HARD', reviewLabel: 'Detailed', reviewWeeks: 7, taxLabel: 'Heavy', taxRate: 0.25, taxNote: 'Cultural levy on streamers', privacyLabel: 'Enforced hard', privacyNote: 'CNIL watches the catalogue', localContentLabel: 'Required', localContentPct: 20, localContentNote: 'French and European quotas', filings: ['CSA / Arcom filing', 'Investment quota', 'Privacy notice'], paymentEase: 0.9, affordability: 12, x: 48, y: 36 }),
    country({ id: 'DE', name: 'Germany', regionId: 'EUROPE', flag: '🇩🇪', audienceM: 40, growthPct: 2, accessCost: 15_000_000, unclaimedPct: 36, competitors: [{ name: 'Netflix', share: 20 }, { name: 'Prime Video', share: 16 }, { name: 'Disney+', share: 11 }, { name: 'RTL+', share: 8 }], languages: [{ name: 'German', share: 90 }], difficulty: 'CROWDED', reviewLabel: 'Detailed', reviewWeeks: 5, taxLabel: 'Moderate', taxRate: 0.19, taxNote: 'VAT on digital', privacyLabel: 'Enforced hard', privacyNote: 'Strict consent rules', localContentLabel: 'Encouraged', localContentPct: 10, localContentNote: 'German dubs are expected', filings: ['Youth protection', 'Privacy notice'], paymentEase: 0.93, affordability: 13, x: 52, y: 32 }),
    country({ id: 'ES', name: 'Spain', regionId: 'EUROPE', flag: '🇪🇸', audienceM: 22, growthPct: 4, accessCost: 7_500_000, unclaimedPct: 40, competitors: [{ name: 'Netflix', share: 22 }, { name: 'Prime Video', share: 14 }, { name: 'Movistar', share: 12 }], languages: [{ name: 'Spanish', share: 88 }, { name: 'Catalan', share: 8 }], difficulty: 'OPEN', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.21, taxNote: 'Digital VAT', privacyLabel: 'Enforced', privacyNote: 'EU privacy rules', localContentLabel: 'Encouraged', localContentPct: 8, localContentNote: 'Castilian Spanish covers most homes', filings: ['Tax id', 'Age ratings'], paymentEase: 0.88, affordability: 11, x: 46, y: 40 }),
    country({ id: 'IT', name: 'Italy', regionId: 'EUROPE', flag: '🇮🇹', audienceM: 24, growthPct: 3, accessCost: 8_000_000, unclaimedPct: 39, competitors: [{ name: 'Netflix', share: 19 }, { name: 'Prime Video', share: 15 }, { name: 'Disney+', share: 11 }], languages: [{ name: 'Italian', share: 93 }], difficulty: 'CROWDED', reviewLabel: 'Standard', reviewWeeks: 5, taxLabel: 'Moderate', taxRate: 0.22, taxNote: 'Digital services tax', privacyLabel: 'Enforced', privacyNote: 'EU privacy rules', localContentLabel: 'Encouraged', localContentPct: 10, localContentNote: 'Italian dubs outperform subtitles', filings: ['Agcom notice', 'Tax id'], paymentEase: 0.84, affordability: 10, x: 52, y: 40 }),
    country({ id: 'SE', name: 'Sweden', regionId: 'EUROPE', flag: '🇸🇪', audienceM: 6.2, growthPct: 2, accessCost: 2_400_000, unclaimedPct: 44, competitors: [{ name: 'Netflix', share: 26 }, { name: 'Viaplay', share: 18 }, { name: 'Disney+', share: 8 }], languages: [{ name: 'Swedish', share: 86 }, { name: 'English', share: 12 }], difficulty: 'OPEN', reviewLabel: 'Light', reviewWeeks: 3, taxLabel: 'Moderate', taxRate: 0.25, taxNote: 'High VAT, clean payment rails', privacyLabel: 'Enforced hard', privacyNote: 'Nordic privacy expectations', localContentLabel: 'Light', localContentPct: 4, localContentNote: 'English travels, Swedish is warmer', filings: ['Consumer notice'], paymentEase: 0.96, affordability: 14, x: 54, y: 24 }),
    country({ id: 'NG', name: 'Nigeria', regionId: 'AFRICA', flag: '🇳🇬', audienceM: 38, growthPct: 11, accessCost: 3_200_000, unclaimedPct: 61, competitors: [{ name: 'Netflix', share: 12 }, { name: 'Showmax', share: 14 }, { name: 'YouTube', share: 9 }], languages: [{ name: 'English', share: 55 }, { name: 'Hausa', share: 15 }, { name: 'Yoruba', share: 14 }, { name: 'Igbo', share: 10 }], difficulty: 'OPEN', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Patchy', taxRate: 0.1, taxNote: 'Digital tax is young', privacyLabel: 'Developing', privacyNote: 'Data rules are catching up', localContentLabel: 'Expected', localContentPct: 18, localContentNote: 'Nollywood is the habit', filings: ['Broadcast commission', 'Tax registration'], paymentEase: 0.42, affordability: 4, x: 48, y: 54 }),
    country({ id: 'ZA', name: 'South Africa', regionId: 'AFRICA', flag: '🇿🇦', audienceM: 14, growthPct: 6, accessCost: 3_600_000, unclaimedPct: 48, competitors: [{ name: 'Showmax', share: 18 }, { name: 'Netflix', share: 16 }, { name: 'DStv', share: 14 }], languages: [{ name: 'English', share: 48 }, { name: 'Zulu', share: 18 }, { name: 'Afrikaans', share: 12 }], difficulty: 'CROWDED', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.15, taxNote: 'VAT on electronic services', privacyLabel: 'Enforced', privacyNote: 'POPIA applies', localContentLabel: 'Encouraged', localContentPct: 12, localContentNote: 'Local series keep the base', filings: ['POPIA notice', 'Films board'], paymentEase: 0.68, affordability: 6, x: 54, y: 78 }),
    country({ id: 'EG', name: 'Egypt', regionId: 'AFRICA', flag: '🇪🇬', audienceM: 28, growthPct: 8, accessCost: 4_800_000, unclaimedPct: 55, competitors: [{ name: 'Shahid', share: 18 }, { name: 'Netflix', share: 10 }, { name: 'Watchit', share: 12 }], languages: [{ name: 'Arabic', share: 96 }], difficulty: 'HARD', reviewLabel: 'Government', reviewWeeks: 8, taxLabel: 'Moderate', taxRate: 0.14, taxNote: 'Foreign platforms need a local face', privacyLabel: 'State review', privacyNote: 'Content can be held for review', localContentLabel: 'Sensitive', localContentPct: 10, localContentNote: 'Arabic catalogue, careful subjects', filings: ['Media authority', 'Local representative'], paymentEase: 0.5, affordability: 4, x: 56, y: 46 }),
    country({ id: 'KE', name: 'Kenya', regionId: 'AFRICA', flag: '🇰🇪', audienceM: 11, growthPct: 9, accessCost: 1_800_000, unclaimedPct: 64, competitors: [{ name: 'Showmax', share: 15 }, { name: 'Netflix', share: 11 }, { name: 'YouTube', share: 10 }], languages: [{ name: 'English', share: 42 }, { name: 'Swahili', share: 46 }], difficulty: 'OPEN', reviewLabel: 'Light', reviewWeeks: 3, taxLabel: 'Moderate', taxRate: 0.16, taxNote: 'Digital service tax', privacyLabel: 'Developing', privacyNote: 'Data act is new', localContentLabel: 'Encouraged', localContentPct: 8, localContentNote: 'Swahili and English both count', filings: ['Tax pin', 'Film board'], paymentEase: 0.58, affordability: 4, x: 58, y: 60 }),
    country({ id: 'IN', name: 'India', regionId: 'ASIA', flag: '🇮🇳', audienceM: 186, growthPct: 12, accessCost: 22_000_000, unclaimedPct: 36, competitors: [{ name: 'Hotstar', share: 18 }, { name: 'Netflix', share: 8 }, { name: 'Prime Video', share: 12 }, { name: 'ZEE5', share: 9 }], languages: [{ name: 'Hindi', share: 41 }, { name: 'English', share: 12 }, { name: 'Tamil', share: 8 }, { name: 'Telugu', share: 8 }], difficulty: 'FOUGHT_OVER', reviewLabel: 'Detailed', reviewWeeks: 6, taxLabel: 'Moderate', taxRate: 0.18, taxNote: 'GST on digital supplies', privacyLabel: 'Tightening', privacyNote: 'Data rules are still settling', localContentLabel: 'Essential', localContentPct: 30, localContentNote: 'A Hindi-only shelf misses most of the country', filings: ['GST', 'Content classification', 'Local grievance officer'], paymentEase: 0.74, affordability: 3, x: 68, y: 48 }),
    country({ id: 'JP', name: 'Japan', regionId: 'ASIA', flag: '🇯🇵', audienceM: 52, growthPct: 2, accessCost: 19_000_000, unclaimedPct: 34, competitors: [{ name: 'Netflix', share: 14 }, { name: 'U-NEXT', share: 13 }, { name: 'Prime Video', share: 12 }, { name: 'TVer', share: 11 }], languages: [{ name: 'Japanese', share: 98 }], difficulty: 'HARD', reviewLabel: 'Detailed', reviewWeeks: 6, taxLabel: 'Moderate', taxRate: 0.1, taxNote: 'Consumption tax', privacyLabel: 'Enforced', privacyNote: 'APPI consent', localContentLabel: 'Essential', localContentPct: 22, localContentNote: 'Japanese dubs or it feels foreign', filings: ['APPI notice', 'Broadcast-adjacent ratings'], paymentEase: 0.9, affordability: 12, x: 84, y: 38 }),
    country({ id: 'KR', name: 'South Korea', regionId: 'ASIA', flag: '🇰🇷', audienceM: 23, growthPct: 4, accessCost: 12_000_000, unclaimedPct: 30, competitors: [{ name: 'Netflix', share: 22 }, { name: 'Tving', share: 16 }, { name: 'Wavve', share: 14 }, { name: 'Coupang Play', share: 10 }], languages: [{ name: 'Korean', share: 97 }], difficulty: 'FOUGHT_OVER', reviewLabel: 'Detailed', reviewWeeks: 5, taxLabel: 'Moderate', taxRate: 0.1, taxNote: 'VAT', privacyLabel: 'Enforced hard', privacyNote: 'PIPA is strict', localContentLabel: 'Expected', localContentPct: 16, localContentNote: 'Local series are the habit', filings: ['PIPA', 'Age ratings', 'Local agent'], paymentEase: 0.93, affordability: 11, x: 80, y: 36 }),
    country({ id: 'ID', name: 'Indonesia', regionId: 'ASIA', flag: '🇮🇩', audienceM: 64, growthPct: 10, accessCost: 6_500_000, unclaimedPct: 58, competitors: [{ name: 'Vidio', share: 14 }, { name: 'Netflix', share: 9 }, { name: 'Viu', share: 11 }, { name: 'Disney+ Hotstar', share: 8 }], languages: [{ name: 'Indonesian', share: 78 }, { name: 'English', share: 8 }], difficulty: 'CROWDED', reviewLabel: 'Government', reviewWeeks: 6, taxLabel: 'Moderate', taxRate: 0.11, taxNote: 'VAT on foreign digital', privacyLabel: 'State review', privacyNote: 'Content clearance can stall a title', localContentLabel: 'Sensitive', localContentPct: 12, localContentNote: 'Bahasa catalogue and careful subjects', filings: ['Kominfo registration', 'Tax id'], paymentEase: 0.55, affordability: 4, x: 78, y: 62 }),
    country({ id: 'PH', name: 'Philippines', regionId: 'ASIA', flag: '🇵🇭', audienceM: 27, growthPct: 8, accessCost: 3_400_000, unclaimedPct: 57, competitors: [{ name: 'Netflix', share: 14 }, { name: 'Viu', share: 10 }, { name: 'Prime Video', share: 8 }, { name: 'iWant', share: 9 }], languages: [{ name: 'Filipino', share: 62 }, { name: 'English', share: 34 }], difficulty: 'OPEN', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.12, taxNote: 'Digital VAT', privacyLabel: 'Developing', privacyNote: 'Data privacy act', localContentLabel: 'Encouraged', localContentPct: 10, localContentNote: 'Local romance and variety travel', filings: ['Tax registration', 'MTRCB awareness'], paymentEase: 0.64, affordability: 5, x: 80, y: 52 }),
    country({ id: 'CN', name: 'China', regionId: 'ASIA', flag: '🇨🇳', audienceM: 240, growthPct: 3, accessCost: 40_000_000, unclaimedPct: 8, competitors: [{ name: 'iQiyi', share: 22 }, { name: 'Tencent Video', share: 24 }, { name: 'Youku', share: 16 }, { name: 'Bilibili', share: 12 }], languages: [{ name: 'Mandarin', share: 92 }], difficulty: 'HARD', reviewLabel: 'Government', reviewWeeks: 12, taxLabel: 'Heavy', taxRate: 0.2, taxNote: 'A foreign service does not simply switch on', privacyLabel: 'State review', privacyNote: 'Licences sit with the state', localContentLabel: 'Required', localContentPct: 40, localContentNote: 'Without a local partner the door stays shut', filings: ['Content licence', 'Local partner', 'Cybersecurity review'], paymentEase: 0.4, affordability: 6, x: 74, y: 40 }),
    country({ id: 'AU', name: 'Australia', regionId: 'OCEANIA', flag: '🇦🇺', audienceM: 14, growthPct: 3, accessCost: 6_800_000, unclaimedPct: 37, competitors: [{ name: 'Netflix', share: 26 }, { name: 'Stan', share: 14 }, { name: 'Binge', share: 10 }, { name: 'Disney+', share: 12 }], languages: [{ name: 'English', share: 92 }], difficulty: 'CROWDED', reviewLabel: 'Standard', reviewWeeks: 4, taxLabel: 'Moderate', taxRate: 0.1, taxNote: 'GST on imported digital', privacyLabel: 'Enforced', privacyNote: 'Privacy act', localContentLabel: 'Encouraged', localContentPct: 10, localContentNote: 'Local drama quotas are a political topic', filings: ['GST', 'Classification board'], paymentEase: 0.94, affordability: 13, x: 84, y: 76 }),
    country({ id: 'NZ', name: 'New Zealand', regionId: 'OCEANIA', flag: '🇳🇿', audienceM: 2.4, growthPct: 3, accessCost: 1_200_000, unclaimedPct: 49, competitors: [{ name: 'Netflix', share: 28 }, { name: 'TVNZ+', share: 12 }, { name: 'Neon', share: 9 }, { name: 'Disney+', share: 10 }], languages: [{ name: 'English', share: 90 }, { name: 'Māori', share: 4 }], difficulty: 'OPEN', reviewLabel: 'Light', reviewWeeks: 3, taxLabel: 'Moderate', taxRate: 0.15, taxNote: 'GST', privacyLabel: 'Enforced', privacyNote: 'Privacy act', localContentLabel: 'Light', localContentPct: 6, localContentNote: 'A small, online country', filings: ['GST'], paymentEase: 0.95, affordability: 12, x: 92, y: 82 }),
];

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
