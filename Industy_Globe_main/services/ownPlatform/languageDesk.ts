import {
    LanguageDeskState,
    LanguageRegionState,
    LanguageTrackState,
    OwnPlatformState,
    Player,
} from '../../types';
import { MARKET_COUNTRIES, MarketCountry, getCountry } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { COUNTRY_SEEDS, CountrySeed } from './countrySeeds';
import { subRegionFor } from './generateCountries';

const SOUTH_ASIA = new Set(['AF', 'PK', 'IN', 'BD', 'BT', 'NP', 'LK', 'MV']);
const SOUTHEAST = new Set(['BN', 'KH', 'LA', 'MY', 'MM', 'SG', 'TH', 'TL', 'VN', 'ID', 'PH']);
const EAST_ASIA = new Set(['HK', 'JP', 'KR', 'CN', 'TW', 'MN', 'KP']);
const CENTRAL_ASIA = new Set(['KZ', 'KG', 'TJ', 'TM', 'UZ']);
const CENTRAL_AMERICA = new Set(['MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA']);

const PER_SUB = { subtitles: 0.0048, dubbing: 0.012 };
const PER_LEVEL = { subtitles: 0.018, dubbing: 0.042 };

const NATIVE: Record<string, string> = {
    French: 'Français', Arabic: 'العربية', Spanish: 'Español', Portuguese: 'Português',
    German: 'Deutsch', Russian: 'Русский', Mandarin: '中文', Dutch: 'Nederlands',
    Italian: 'Italiano', Swahili: 'Kiswahili', Korean: '한국어', Malay: 'Bahasa Melayu',
    Greek: 'Ελληνικά', Albanian: 'Shqip', Romanian: 'Română', Swedish: 'Svenska',
    Hindi: 'हिन्दी', Japanese: '日本語', Indonesian: 'Bahasa Indonesia', Dari: 'دری',
    Pashto: 'پښتو', Armenian: 'Հայերեն', Azerbaijani: 'Azərbaycan', Bengali: 'বাংলা',
    Dzongkha: 'རྫོང་ཁ', Khmer: 'ខ្មែរ', Georgian: 'ქართული', Cantonese: '廣東話',
    Persian: 'فارسی', Hebrew: 'עברית', Kazakh: 'Қазақша', Kyrgyz: 'Кыргызча',
    Lao: 'ລາວ', Dhivehi: 'ދިވެހި', Mongolian: 'Монгол', Burmese: 'မြန်မာ',
    Nepali: 'नेपाली', Urdu: 'اردو', Sinhala: 'සිංහල', Tajik: 'Тоҷикӣ', Thai: 'ไทย',
    Turkish: 'Türkçe', Turkmen: 'Türkmen', Uzbek: 'Oʻzbek', Vietnamese: 'Tiếng Việt',
    Catalan: 'Català', Belarusian: 'Беларуская', Bosnian: 'Bosanski', Bulgarian: 'Български',
    Croatian: 'Hrvatski', Czech: 'Čeština', Danish: 'Dansk', Estonian: 'Eesti',
    Finnish: 'Suomi', Hungarian: 'Magyar', Icelandic: 'Íslenska', Latvian: 'Latviešu',
    Lithuanian: 'Lietuvių', Maltese: 'Malti', Montenegrin: 'Crnogorski', Macedonian: 'Македонски',
    Norwegian: 'Norsk', Polish: 'Polski', Serbian: 'Српски', Slovak: 'Slovenčina',
    Slovene: 'Slovenščina', Ukrainian: 'Українська', Kirundi: 'Ikirundi', Tigrinya: 'ትግርኛ',
    Amharic: 'አማርኛ', Sotho: 'Sesotho', Kinyarwanda: 'Ikinyarwanda', Somali: 'Soomaali',
    'Haitian Creole': 'Kreyòl', Samoan: 'Gagana Samoa', Tongan: 'Lea faka-Tonga',
    Tamil: 'தமிழ்', Telugu: 'తెలుగు', Marathi: 'मराठी', Zulu: 'isiZulu', Yoruba: 'Yorùbá',
    Māori: 'Te Reo Māori', Afrikaans: 'Afrikaans', Hausa: 'Hausa', Igbo: 'Igbo',
};

export interface LocRegion {
    id: string;
    name: string;
    accent: string;
    sampleSub: string;
    sampleDub: string;
    countries: MarketCountry[];
    languages: string[];
    audienceM: number;
    once: number;
    weekly: number;
    /** Cash to buy level 1, 2, then 3. Index is the level already paid. */
    upgrades: number[];
    subNeed: number;
    dubNeed: number;
    wide: boolean;
}

const DEFS: Omit<LocRegion, 'countries' | 'languages' | 'audienceM' | 'once' | 'weekly' | 'upgrades' | 'subNeed' | 'dubNeed' | 'wide'>[] = [
    { id: 'southeast-asia', name: 'Southeast Asia', accent: '#3DDCFF', sampleSub: 'Kamu di mana?', sampleDub: 'Halo!' },
    { id: 'east-asia', name: 'East Asia', accent: '#FF5CAD', sampleSub: '你去哪儿了？', sampleDub: '你好！' },
    { id: 'mena', name: 'Middle East & Africa', accent: '#2EE6A6', sampleSub: 'أين كنت؟', sampleDub: 'مرحبا!' },
    { id: 'east-europe', name: 'Eastern Europe & Central Asia', accent: '#A855F7', sampleSub: 'Где ты был?', sampleDub: 'Привет!' },
    { id: 'south-asia', name: 'South Asia', accent: '#FF7A2F', sampleSub: 'तुम कहाँ थे?', sampleDub: 'नमस्ते!' },
    { id: 'latin-america', name: 'Latin America', accent: '#3DFF8A', sampleSub: '¿Dónde estabas?', sampleDub: '¡Hola!' },
    { id: 'western-europe', name: 'Western Europe', accent: '#5B8CFF', sampleSub: 'Où étais-tu ?', sampleDub: 'Bonjour !' },
    { id: 'north-america', name: 'North America', accent: '#E4B15A', sampleSub: '¿Dónde estabas?', sampleDub: 'Hey!' },
    { id: 'oceania', name: 'Oceania', accent: '#7EB6FF', sampleSub: 'Kei hea koe?', sampleDub: 'Kia ora' },
];

const assignSeed = (seed: CountrySeed): string => {
    const id = seed[0];
    const letter = seed[2];
    const sub = subRegionFor(seed);
    if (SOUTH_ASIA.has(id) || sub === 'South Asia') return 'south-asia';
    if (SOUTHEAST.has(id) || sub === 'Southeast Asia') return 'southeast-asia';
    if (EAST_ASIA.has(id) || sub === 'East Asia') return 'east-asia';
    if (CENTRAL_ASIA.has(id) || sub === 'Central Asia' || sub === 'Eastern Europe') return 'east-europe';
    if (letter === 'F' || sub === 'West Asia') return 'mena';
    if (letter === 'A') return 'mena';
    if (letter === 'S' || CENTRAL_AMERICA.has(id) || sub === 'Caribbean' || sub === 'Mexico & Central America') return 'latin-america';
    if (letter === 'N') return 'north-america';
    if (letter === 'E') return 'western-europe';
    return 'oceania';
};

const MEMBERSHIP = new Map<string, string>();
COUNTRY_SEEDS.forEach(seed => MEMBERSHIP.set(seed[0], assignSeed(seed)));

export const locRegionIdFor = (countryId: string): string => MEMBERSHIP.get(countryId) || 'oceania';

const roundTo = (value: number, step: number): number => {
    if (!Number.isFinite(value) || value <= 0) return step;
    return Math.max(step, Math.round(value / step) * step);
};

const languagesOf = (countries: MarketCountry[]): string[] => {
    const totals = new Map<string, number>();
    countries.forEach(country => {
        (country.languages || []).forEach(language => {
            if (!language?.name) return;
            const weight = Math.max(0, country.audienceM) * (Math.max(0, language.share) / 100);
            totals.set(language.name, (totals.get(language.name) || 0) + weight);
        });
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
};

const buildRegion = (def: typeof DEFS[number]): LocRegion => {
    const countries = MARKET_COUNTRIES
        .filter(country => locRegionIdFor(country.id) === def.id)
        .sort((a, b) => b.audienceM - a.audienceM);
    const audienceM = countries.reduce((sum, country) => sum + Math.max(0, country.audienceM || 0), 0);
    const once = roundTo(Math.max(1_500_000, audienceM * 32_000), 500_000);
    const weekly = roundTo(once * 0.015, 5_000);
    const upgrades = [0.22, 0.4, 0.62].map(part => roundTo(once * part, 100_000));
    const subNeed = Math.max(8, Math.min(36, Math.round(8 + audienceM / 20)));
    return {
        ...def,
        countries,
        languages: languagesOf(countries),
        audienceM,
        once,
        weekly,
        upgrades,
        subNeed,
        dubNeed: subNeed * 2,
        wide: countries.length >= 16,
    };
};

export const LOC_REGIONS: LocRegion[] = DEFS.map(buildRegion);

export const locRegionById = (id: string): LocRegion | undefined => LOC_REGIONS.find(region => region.id === id);

export const bilingual = (name: string): string => {
    const native = NATIVE[name];
    if (!native || native.toLowerCase() === name.toLowerCase()) return name;
    return `${name} ${native}`;
};

export const languageLine = (names: string[], shown: number): string => {
    const head = names.slice(0, shown).map(bilingual);
    const rest = names.length - head.length;
    if (!head.length) return 'Local languages';
    return rest > 0 ? `${head.join(' · ')} +${rest} more` : head.join(' · ');
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const emptyTrack = (): LanguageTrackState => ({ level: 0, sub: 0, energy: 0 });

const cleanTrack = (raw: Partial<LanguageTrackState> | undefined): LanguageTrackState => {
    const level = clamp(Math.round(Number(raw?.level) || 0), 0, 3);
    if (level >= 3) return { level: 3, sub: 0, energy: 0 };
    const sub = clamp(Math.round(Number(raw?.sub) || 0), 0, 3);
    const energy = sub >= 3 ? 0 : Math.max(0, Math.round(Number(raw?.energy) || 0));
    return { level, sub, energy };
};

/** Folds leftover energy into finished sub-levels so a full bar can be upgraded. */
export const presentTrack = (track: LanguageTrackState, need: number): LanguageTrackState => {
    let next = cleanTrack(track);
    let guard = 0;
    while (next.level < 3 && next.sub < 3 && need > 0 && next.energy >= need && guard < 4) {
        next = { level: next.level, sub: next.sub + 1, energy: next.energy - need };
        guard += 1;
    }
    if (next.sub >= 3 || next.level >= 3) return { ...next, energy: 0, sub: next.level >= 3 ? 0 : next.sub };
    return next;
};

export const sanitizeLanguageDesk = (raw: LanguageDeskState | undefined): LanguageDeskState | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const known = new Set(LOC_REGIONS.map(region => region.id));
    const regions = Array.isArray(raw.regions)
        ? raw.regions.flatMap(row => {
            if (!row || typeof row.id !== 'string' || !known.has(row.id)) return [];
            const next: LanguageRegionState = {
                id: row.id,
                setup: row.setup === true,
                subtitles: cleanTrack(row.subtitles),
                dubbing: cleanTrack(row.dubbing),
            };
            if (!next.setup && next.subtitles.level === 0 && next.dubbing.level === 0) return [];
            return [next];
        })
        : [];
    const energy = Math.max(0, Math.round(Number(raw.energy) || 0));
    const earnedThisWeek = Math.max(0, Math.round(Number(raw.earnedThisWeek) || 0));
    const banked = Math.max(0, Math.round(Number(raw.banked) || 0));
    const earnedWeek = Number.isFinite(Number(raw.earnedWeek)) ? Math.round(Number(raw.earnedWeek)) : undefined;
    if (!regions.length && energy === 0 && earnedThisWeek === 0 && banked === 0 && earnedWeek == null) return undefined;
    return { regions, energy, earnedThisWeek, banked, earnedWeek };
};

export const readLanguageDesk = (state: OwnPlatformState | undefined): LanguageDeskState => (
    sanitizeLanguageDesk(state?.languageDesk) || { regions: [], energy: 0, earnedThisWeek: 0, banked: 0 }
);

export const regionState = (desk: LanguageDeskState, id: string): LanguageRegionState => (
    desk.regions.find(row => row.id === id) || { id, setup: false, subtitles: emptyTrack(), dubbing: emptyTrack() }
);

/** Company energy earned on a live week. Comes from the shelf and the subscriber book. */
export const energyGrant = (state: OwnPlatformState): number => {
    const titles = state.catalogue?.length || 0;
    const subs = Math.max(0, state.subscribers || 0);
    const weeks = Math.max(0, state.weeksLive || 0);
    const raw = 36 + titles * 2 + Math.min(90, Math.floor(subs / 150_000)) + (weeks >= 8 ? 16 : 0);
    return Math.max(12, Math.min(220, Math.round(raw)));
};

export const tickLanguageEnergy = (player: Player, absoluteWeek: number): { msg: string; type: 'neutral' } | null => {
    const state = player.ownPlatform;
    if (!state || state.stage !== 'LIVE') return null;
    const current = readLanguageDesk(state);
    if (current.earnedWeek === absoluteWeek) return null;
    const earned = energyGrant(state);
    const next: LanguageDeskState = {
        ...current,
        banked: current.energy,
        earnedThisWeek: earned,
        energy: Math.min(80_000, current.energy + earned),
        earnedWeek: absoluteWeek,
    };
    const first = current.earnedWeek == null;
    state.languageDesk = next;
    return first ? { msg: `${state.name} banked ${earned} language energy for subtitles and dubs.`, type: 'neutral' } : null;
};

const needFor = (region: LocRegion, kind: 'subtitles' | 'dubbing') => (kind === 'dubbing' ? region.dubNeed : region.subNeed);

/** Extra viewers from one ladder. Paid levels keep the sub-levels that were filled to buy them. */
export const trackLift = (track: LanguageTrackState, kind: 'subtitles' | 'dubbing', need: number): number => {
    const level = clamp(Math.round(track.level) || 0, 0, 3);
    if (level >= 3) return 3 * (3 * PER_SUB[kind] + PER_LEVEL[kind]);
    const sub = clamp(Math.round(track.sub) || 0, 0, 3);
    const partial = sub >= 3 || need <= 0 ? 0 : clamp((Number(track.energy) || 0) / need, 0, 0.999);
    return level * (3 * PER_SUB[kind] + PER_LEVEL[kind]) + (sub + partial) * PER_SUB[kind];
};

/** Multiplier on a country's viewers. 1 when the region is not set up, so old saves are unchanged. */
export const languageScaleFor = (state: OwnPlatformState, countryId: string): number => {
    const desk = state.languageDesk;
    if (!desk?.regions?.length) return 1;
    const region = locRegionById(locRegionIdFor(countryId));
    const row = region && desk.regions.find(item => item.id === region.id && item.setup);
    if (!region || !row) return 1;
    const country = getCountry(countryId);
    const english = country?.languages?.[0]?.name === 'English';
    const lift = 0.012
        + trackLift(row.subtitles, 'subtitles', region.subNeed)
        + trackLift(row.dubbing, 'dubbing', region.dubNeed);
    return 1 + lift * (english ? 0.35 : 1);
};

/** Weekly company-cash bill for regions that are set up. */
export const languageDeskWeekly = (state: OwnPlatformState): number => {
    const desk = state.languageDesk;
    if (!desk?.regions?.length) return 0;
    return desk.regions.reduce((sum, row) => {
        if (!row.setup) return sum;
        return sum + (locRegionById(row.id)?.weekly || 0);
    }, 0);
};

const clonePlayer = (player: Player): Player => {
    const state = player.ownPlatform;
    if (!state) return { ...player };
    const books = state.books
        ? { ...state.books, lines: [...(state.books.lines || [])], history: [...(state.books.history || [])] }
        : state.books;
    const desk = state.languageDesk
        ? {
            ...state.languageDesk,
            regions: state.languageDesk.regions.map(row => ({
                ...row,
                subtitles: { ...row.subtitles },
                dubbing: { ...row.dubbing },
            })),
        }
        : undefined;
    return { ...player, money: player.money, ownPlatform: { ...state, books, languageDesk: desk } };
};

const writeRegion = (desk: LanguageDeskState, row: LanguageRegionState): LanguageDeskState => {
    const regions = desk.regions.filter(item => item.id !== row.id);
    const idle = !row.setup && row.subtitles.level === 0 && row.subtitles.sub === 0 && row.dubbing.level === 0 && row.dubbing.sub === 0;
    return { ...desk, regions: idle ? regions : [...regions, row] };
};

export const setupLanguageRegion = (player: Player, regionId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    const region = locRegionById(regionId);
    if (!state || !region) return { player, error: 'That region is not on the language map.' };
    const desk = readLanguageDesk(state);
    if (regionState(desk, regionId).setup) return { player, error: `${region.name} is already set up.` };
    if (readCompanyCash(player) < region.once) {
        return { player, error: `Company cash is short. Personal cash stays put.` };
    }
    const next = clonePlayer(player);
    addCompanyCash(next, -region.once, `Set up ${region.name} subtitles and dubs`, 'BURN');
    const row = regionState(readLanguageDesk(next.ownPlatform), regionId);
    next.ownPlatform!.languageDesk = writeRegion(readLanguageDesk(next.ownPlatform), { ...row, setup: true });
    return { player: next };
};

export const spendLanguageEnergy = (
    player: Player,
    regionId: string,
    kind: 'subtitles' | 'dubbing',
    mode: 'step' | 'fill',
): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    const region = locRegionById(regionId);
    if (!state || !region) return { player, error: 'That region is not on the language map.' };
    const desk = readLanguageDesk(state);
    const row = regionState(desk, regionId);
    if (!row.setup) return { player, error: `Set up ${region.name} first.` };
    const track = presentTrack(row[kind], needFor(region, kind));
    if (track.level >= 3) return { player, error: 'That ladder is already finished.' };
    if (track.sub >= 3) return { player, error: 'Pay the upgrade before the next sub-level.' };
    const need = needFor(region, kind);
    const room = Math.max(0, need - track.energy);
    if (room <= 0) return { player, error: 'This sub-level is already full.' };
    const spend = mode === 'step' ? Math.min(5, room, desk.energy) : Math.min(room, desk.energy);
    if (spend <= 0) return { player, error: 'Not enough company energy. It arrives on a live week. Personal energy stays put.' };
    const next = clonePlayer(player);
    const live = readLanguageDesk(next.ownPlatform);
    const current = regionState(live, regionId);
    const healed = presentTrack(current[kind], need);
    const filling = { ...healed };
    filling.energy += spend;
    if (filling.energy >= need) {
        filling.sub += 1;
        filling.energy = 0;
    }
    next.ownPlatform!.languageDesk = writeRegion(
        { ...live, energy: live.energy - spend },
        { ...current, [kind]: filling },
    );
    return { player: next };
};

export const upgradeLanguageLevel = (
    player: Player,
    regionId: string,
    kind: 'subtitles' | 'dubbing',
): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    const region = locRegionById(regionId);
    if (!state || !region) return { player, error: 'That region is not on the language map.' };
    const row = regionState(readLanguageDesk(state), regionId);
    if (!row.setup) return { player, error: `Set up ${region.name} first.` };
    const track = presentTrack(row[kind], needFor(region, kind));
    if (track.level >= 3) return { player, error: 'That ladder is already finished.' };
    if (track.sub < 3) return { player, error: 'Fill all three sub-levels with energy first.' };
    const cost = region.upgrades[track.level] || 0;
    if (readCompanyCash(player) < cost) return { player, error: 'Company cash is short. Personal cash stays put.' };
    const next = clonePlayer(player);
    const label = kind === 'dubbing' ? 'dubbing' : 'subtitles';
    addCompanyCash(next, -cost, `${region.name} ${label} level ${track.level + 1}`, 'BURN');
    const live = readLanguageDesk(next.ownPlatform);
    const current = regionState(live, regionId);
    next.ownPlatform!.languageDesk = writeRegion(live, {
        ...current,
        [kind]: { level: current[kind].level + 1, sub: 0, energy: 0 },
    });
    return { player: next };
};

export const marketsInRegion = (state: OwnPlatformState, regionId: string): MarketCountry[] => {
    const open = new Set(state.selectedCountryIds || []);
    return (locRegionById(regionId)?.countries || []).filter(country => open.has(country.id));
};
