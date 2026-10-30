import type { LaunchRegionId } from '../../types';
import type { MarketCountry } from './catalog';
import { COUNTRY_SEEDS, CountrySeed, RegionLetter } from './countrySeeds';
import { TUNED_COUNTRIES } from './tunedCountries';

const REGION: Record<RegionLetter, LaunchRegionId> = {
    N: 'NORTH_AMERICA',
    S: 'SOUTH_AMERICA',
    E: 'EUROPE',
    F: 'AFRICA',
    A: 'ASIA',
    O: 'OCEANIA',
};

const RIVALS: Record<RegionLetter, string[]> = {
    N: ['Netflix', 'Prime Video', 'Disney+', 'Hulu'],
    S: ['Netflix', 'Disney+', 'Prime Video', 'Star+'],
    E: ['Netflix', 'Prime Video', 'Disney+', 'Local public'],
    F: ['Netflix', 'Showmax', 'YouTube', 'StarTimes'],
    A: ['Netflix', 'YouTube', 'Prime Video', 'Viu'],
    O: ['Netflix', 'Disney+', 'Prime Video', 'Stan'],
};

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const unit = (id: string, salt: string) => (hashString(`${id}:${salt}`) % 10000) / 10000;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const flagEmoji = (iso: string) => iso.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

/**
 * Addressable audience is population × internet share × a take-rate.
 * The take-rate rises with income (people who can pay) and with connectivity.
 * It is capped at 80 million so a generated market cannot outgrow the tuned giants,
 * and it can never exceed 85% of the population.
 * Access cost is about $80k–$360k per million viewers, cheaper in poor countries,
 * with a floor so a large poor country is not free and a ceiling so nothing generated
 * costs more than a mid-size rich market.
 */
export const deriveCountry = (seed: CountrySeed): MarketCountry => {
    const [id, name, letter, popM, internetPct, income, , language, lat, lon, tags] = seed;
    const net = clamp(internetPct / 100, 0, 1);
    const income01 = (income - 1) / 3;
    const streamTake = 0.12 + income01 * 0.38 + net * 0.15;
    let audience = Math.min(popM * net * streamTake, popM * 0.85, 80);
    audience = Math.max(0, audience);
    if (audience >= 10) audience = Math.round(audience * 10) / 10;
    else if (audience >= 1) audience = Math.round(audience * 100) / 100;
    else audience = Math.round(audience * 1000) / 1000;

    let difficulty: MarketCountry['difficulty'] = 'OPEN';
    if (tags.includes('G')) difficulty = 'HARD';
    else if (audience >= 30 && income >= 3) difficulty = 'FOUGHT_OVER';
    else if (audience >= 12 && income >= 3) difficulty = 'CROWDED';
    else if (income >= 4 && audience >= 3) difficulty = 'CROWDED';
    else if (audience >= 18) difficulty = 'CROWDED';

    const difficultyMult = { OPEN: 0.75, CROWDED: 1, FOUGHT_OVER: 1.35, HARD: 1.15 }[difficulty];
    const perMillion = 80_000 + income01 * 280_000;
    const rawCost = audience * perMillion * difficultyMult;
    const floor = popM >= 5 ? 400_000 : popM >= 1 ? 200_000 : 80_000;
    const stepped = rawCost < 150_000 ? Math.round(rawCost / 10_000) * 10_000 : Math.round(rawCost / 100_000) * 100_000;
    const accessCost = clamp(Math.max(floor, stepped), floor, 28_000_000);

    const headroom = (1 - net) * 9 + (1 - income01) * 5;
    const growthJitter = unit(id, 'growth') > 0.66 ? 1 : unit(id, 'growth') < 0.2 ? -1 : 0;
    const growthPct = clamp(Math.round(1 + headroom) + growthJitter, 1, 14);

    let unclaimed = 62 - income01 * 30 - Math.min(24, audience * 0.35);
    if (difficulty === 'FOUGHT_OVER') unclaimed -= 12;
    if (difficulty === 'OPEN') unclaimed += 8;
    if (difficulty === 'HARD') unclaimed += 4;
    unclaimed += (unit(id, 'gap') - 0.5) * 8;
    const unclaimedPct = clamp(Math.round(unclaimed), 8, 70);

    const arabic = language.includes('Arabic') && (letter === 'F' || letter === 'A');
    const pool = arabic ? ['Shahid', 'Netflix', 'YouTube', 'Starzplay'] : RIVALS[letter];
    const rawShares = [0, 1, 2].map((index) => 8 + Math.floor(unit(id, `rival${index}`) * 14));
    const room = Math.max(12, 100 - unclaimedPct - 6);
    const shareSum = rawShares.reduce((sum, share) => sum + share, 0) || 1;
    const competitors = pool.slice(0, 3).map((rival, index) => ({
        name: rival,
        share: Math.max(4, Math.round((rawShares[index] / shareSum) * room)),
    }));

    const parts = language.split('/').map((item) => item.trim()).filter(Boolean);
    const primary = parts[0] || 'English';
    const languages = parts.length >= 2
        ? [{ name: parts[0], share: 62 }, { name: parts[1], share: 24 }]
        : [{ name: primary, share: primary === 'English' ? 90 : 84 }];
    if (languages.length === 1 && languages[0].name !== 'English' && (income >= 3 || net >= 0.8)) {
        languages.push({ name: 'English', share: income >= 4 ? 10 : 6 });
    }

    const government = tags.includes('G');
    const reviewLabel = government ? 'Government' : letter === 'E' && income >= 3 ? 'Detailed' : income <= 2 ? 'Light' : 'Standard';
    const reviewWeeks = government ? 7 + Math.floor(unit(id, 'review') * 4) : reviewLabel === 'Detailed' ? 5 : reviewLabel === 'Light' ? 3 : 4;

    let taxRate = clamp(Math.round(([0.09, 0.13, 0.17, 0.21][income - 1] + (unit(id, 'tax') - 0.5) * 0.04) * 100) / 100, 0.06, 0.28);
    if (letter === 'E' && income >= 4) taxRate = Math.max(taxRate, 0.19);
    const taxLabel = taxRate >= 0.22 ? 'Heavy' : taxRate >= 0.14 ? 'Moderate' : income === 1 ? 'Patchy' : 'Light';
    const taxNote = taxLabel === 'Heavy'
        ? 'A heavy cut on a foreign streamer'
        : taxLabel === 'Patchy'
            ? 'The digital tax is young and uneven'
            : 'VAT on digital services';

    const privacyLabel = government ? 'State review' : letter === 'E' && income >= 3 ? 'Enforced hard' : income >= 3 ? 'Enforced' : 'Developing';
    const privacyNote = government
        ? 'A title can sit with the censor before it airs'
        : privacyLabel === 'Enforced hard'
            ? 'Privacy rules are strict and the catalogue is in scope'
            : privacyLabel === 'Enforced'
                ? 'A privacy notice is part of opening'
                : 'The data law is still catching up';

    const quota = tags.includes('Q') || (languages[0].name !== 'English' && audience >= 20);
    const localContentPct = quota ? 18 : languages[0].name !== 'English' && audience >= 8 ? 10 : income >= 4 ? 6 : 4;
    const localContentLabel = localContentPct >= 16 ? 'Essential' : localContentPct >= 8 ? 'Encouraged' : 'Light';
    const localContentNote = localContentLabel === 'Essential'
        ? `${languages[0].name} has to lead the home row`
        : localContentLabel === 'Encouraged'
            ? `${languages[0].name} titles keep the base`
            : 'Local films help. They are not required';

    const filings = ['Tax registration'];
    if (privacyLabel !== 'Developing') filings.push('Privacy notice');
    if (government) filings.push('Content licence');
    if (localContentLabel === 'Essential') filings.push('Local catalogue note');
    else if (letter === 'E') filings.push('Age ratings');

    const paymentEase = Math.round(clamp(0.28 + income01 * 0.48 + net * 0.18, 0.25, 0.97) * 100) / 100;
    const affordability = [3, 5, 8, 13][income - 1];
    const x = Math.round(((lon + 180) / 360) * 1000) / 10;
    const y = Math.round(((90 - lat) / 180) * 1000) / 10;

    return {
        id,
        name,
        regionId: REGION[letter],
        flag: flagEmoji(id),
        audienceM: audience,
        growthPct,
        accessCost,
        unclaimedPct,
        competitors,
        languages,
        difficulty,
        reviewLabel,
        reviewWeeks,
        taxLabel,
        taxRate,
        taxNote,
        privacyLabel,
        privacyNote,
        localContentLabel,
        localContentPct,
        localContentNote,
        filings,
        paymentEase,
        affordability,
        x,
        y,
    };
};

const HAND_SUB: Record<string, string> = {
    US: 'United States', CA: 'Canada', MX: 'Mexico & Central America',
    BR: 'Brazil', AR: 'Southern Cone', CO: 'Andes',
    GB: 'British Isles', FR: 'Western Europe', DE: 'Western Europe',
    ES: 'Southern Europe', IT: 'Southern Europe', SE: 'Northern Europe',
    NG: 'West Africa', ZA: 'Southern Africa', EG: 'North Africa', KE: 'East Africa',
    IN: 'South Asia', JP: 'East Asia', KR: 'East Asia', ID: 'Southeast Asia',
    PH: 'Southeast Asia', CN: 'East Asia', AU: 'Australia & New Zealand', NZ: 'Australia & New Zealand',
};

const CENTRAL_AMERICA = new Set(['MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA']);
const SOUTH_ASIA = new Set(['AF', 'PK', 'IN', 'BD', 'BT', 'NP', 'LK', 'MV']);
const SOUTHEAST_ASIA = new Set(['BN', 'KH', 'LA', 'MY', 'MM', 'SG', 'TH', 'TL', 'VN', 'ID', 'PH']);
const EAST_ASIA = new Set(['HK', 'JP', 'KR', 'CN', 'TW', 'MN', 'KP']);
const CENTRAL_ASIA = new Set(['KZ', 'KG', 'TJ', 'TM', 'UZ']);

/** Hand labels for the original 24. Everyone else is placed from the region and the map. */
export const subRegionFor = (seed: CountrySeed): string => {
    const [id, , letter, , , , , , lat, lon] = seed;
    if (HAND_SUB[id]) return HAND_SUB[id];
    if (letter === 'N') {
        if (CENTRAL_AMERICA.has(id)) return 'Mexico & Central America';
        if (lat < 28) return 'Caribbean';
        return 'Northern America';
    }
    if (letter === 'S') {
        if (id === 'BR') return 'Brazil';
        if (lat <= -28 || (lon > -65 && lat < -15)) return 'Southern Cone';
        if (lat > 2) return 'Northern South America';
        return 'Andes';
    }
    if (letter === 'E') {
        if (id === 'GB' || id === 'IE') return 'British Isles';
        if (id === 'RU') return 'Eastern Europe';
        if (lat >= 55) return 'Northern Europe';
        if (lon >= 15) return 'Eastern Europe';
        if (lat < 46) return 'Southern Europe';
        return 'Western Europe';
    }
    if (letter === 'F') {
        if (lat > 18) return 'North Africa';
        if (lat < -8) return 'Southern Africa';
        if (lon < 18) return 'West Africa';
        if (lon > 28) return 'East Africa';
        return 'Central Africa';
    }
    if (letter === 'A') {
        if (SOUTH_ASIA.has(id)) return 'South Asia';
        if (SOUTHEAST_ASIA.has(id)) return 'Southeast Asia';
        if (EAST_ASIA.has(id)) return 'East Asia';
        if (CENTRAL_ASIA.has(id)) return 'Central Asia';
        return 'West Asia';
    }
    if (id === 'AU' || id === 'NZ') return 'Australia & New Zealand';
    return 'Pacific';
};

/** Tuned markets keep every hand-set number. Everyone else is derived from the seed row. */
export const buildMarketCountries = (): MarketCountry[] => {
    const tuned = new Map(TUNED_COUNTRIES.map((country) => [country.id, country]));
    return COUNTRY_SEEDS.map((seed) => {
        const base = tuned.get(seed[0]) || deriveCountry(seed);
        return {
            ...base,
            populationM: seed[3],
            currency: seed[6],
            subRegion: subRegionFor(seed),
        };
    });
};
