import { REAL_NAMES_MODE } from '../../src/data/rights/config';
import { RightsRegionId } from '../../types';

export interface IpRecord {
    id: string;
    kind: 'BOOK' | 'LIFE';
    proper: string;
    descriptor: string;
    authorProper?: string;
    authorDescriptor?: string;
    authorId?: string;
    safeReal: boolean;
    country: string;
    countryName: string;
    fx: string;
    region: RightsRegionId;
    language: string;
    genres: string[];
    gameGenres: string[];
    sport?: string | null;
    category?: string;
    categoryLabel?: string;
    year: number;
    length?: 'short' | 'novel' | 'saga';
    seasons: number;
    era?: string;
    living?: boolean;
    controversy?: number;
    fame: number;
    fans: number[];
    publicDomain: boolean;
    attitude?: 'EAGER' | 'OPEN' | 'WARY' | 'PROTECTIVE' | 'HOSTILE';
    holder: string;
    optionUsd: number;
    purchaseUsd: number;
    singleEvent?: boolean;
    logline: string;
    hot?: boolean;
    hotLabel?: string;
}

export const RIGHTS_REGIONS: RightsRegionId[] = [
    'NORTH_AMERICA', 'LATIN_AMERICA', 'UK_EUROPE', 'INDIA_SOUTH_ASIA', 'EAST_ASIA',
    'SOUTHEAST_ASIA', 'MIDDLE_EAST', 'AFRICA', 'OCEANIA',
];

export const REGION_LABEL: Record<RightsRegionId, string> = {
    NORTH_AMERICA: 'North America',
    LATIN_AMERICA: 'Latin America',
    UK_EUROPE: 'UK and Europe',
    INDIA_SOUTH_ASIA: 'India and South Asia',
    EAST_ASIA: 'East Asia',
    SOUTHEAST_ASIA: 'Southeast Asia',
    MIDDLE_EAST: 'Middle East',
    AFRICA: 'Africa',
    OCEANIA: 'Oceania',
};

const LOADERS: Array<() => Promise<unknown>> = [
    () => import('../../src/data/rights/chunks/books-north-america.json'),
    () => import('../../src/data/rights/chunks/books-latin-america.json'),
    () => import('../../src/data/rights/chunks/books-uk-europe.json'),
    () => import('../../src/data/rights/chunks/books-india-south-asia.json'),
    () => import('../../src/data/rights/chunks/books-east-asia.json'),
    () => import('../../src/data/rights/chunks/books-southeast-asia.json'),
    () => import('../../src/data/rights/chunks/books-middle-east.json'),
    () => import('../../src/data/rights/chunks/books-africa.json'),
    () => import('../../src/data/rights/chunks/books-oceania.json'),
    () => import('../../src/data/rights/chunks/bios-sports-field.json'),
    () => import('../../src/data/rights/chunks/bios-sports-combat.json'),
    () => import('../../src/data/rights/chunks/bios-figures.json'),
];

let cache: IpRecord[] | null = null;
let loading: Promise<IpRecord[]> | null = null;

export const catalogueSync = (): IpRecord[] | null => cache;

export const loadCatalogue = (): Promise<IpRecord[]> => {
    if (cache) return Promise.resolve(cache);
    if (!loading) {
        loading = Promise.all(LOADERS.map(load => load())).then(modules => {
            const rows = modules.flatMap(mod => ((mod as { default?: IpRecord[] }).default || []) as IpRecord[]);
            cache = rows;
            return rows;
        });
    }
    return loading;
};

export const displayTitle = (ip: Pick<IpRecord, 'proper' | 'descriptor' | 'safeReal'>): string =>
    (ip.safeReal || REAL_NAMES_MODE ? ip.proper : ip.descriptor);

export const displayAuthor = (ip: IpRecord): string => {
    if (ip.kind === 'LIFE') return displayTitle(ip);
    if (ip.safeReal || REAL_NAMES_MODE) return ip.authorProper || 'Unknown';
    return ip.authorDescriptor || 'An author';
};

export const preferredFormat = (ip: IpRecord): 'MOVIE' | 'SERIES' => {
    if (ip.kind === 'LIFE') return ip.singleEvent ? 'MOVIE' : 'SERIES';
    if (ip.length === 'short') return 'MOVIE';
    if (ip.length === 'saga' || (ip.seasons || 1) >= 3) return 'SERIES';
    return 'MOVIE';
};
