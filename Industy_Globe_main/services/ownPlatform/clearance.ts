/**
 * A streaming licence is one country, one regulator, one fee.
 * Nothing here is shared across a region.
 *
 * Market value for a country is
 *   64% of (audience × 1.8% × monthly price the country can pay × 12)
 *   + 36% of (population × $0.20)
 *   then nudged by that country's own growth rate.
 * The fee is 8.6% of that value, times the country's difficulty,
 * times 1.1 when the review is a government review,
 * times that regulator's own multiplier.
 * Renewal is 14% of the fee once a year. An appeal is 42% of the fee.
 * A rounded tie steps up so two countries never share a cheque.
 */
import { LicenceConditionKind, MarketApplication, OwnPlatformState, Player } from '../../types';
import { MARKET_COUNTRIES, MarketCountry, getCountry, hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { citiesInCountry, cityById } from './serverCities';
import { getAbsoluteWeek } from '../legacyLogic';

export const RENEWAL_RATE = 0.14;
export const APPEAL_RATE = 0.42;
const VALUE_RATE = 0.086;
const REVENUE_TAKE = 0.018;
const DOLLARS_PER_PERSON = 0.2;

export const CLEARANCE_FORMULA = 'Per country: market value = 64% of (audience × 1.8% × monthly ARPU × 12) + 36% of (population × $0.20), times a small growth nudge. Fee = market value × 8.6% × difficulty × government review × that regulator’s multiplier. Renewal is 14% of the fee a year. Appeal is 42% of the fee.';

const STATUSES = new Set(['FILED', 'APPROVED', 'DELAYED', 'CONDITIONS', 'REJECTED']);
const KINDS = new Set<LicenceConditionKind>(['LOCAL_QUOTA', 'LOCAL_OFFICE', 'DATA_SERVER', 'CONTENT_RULES']);
const EU = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);

const DIFFICULTY_MULT: Record<MarketCountry['difficulty'], number> = {
    OPEN: 0.88,
    CROWDED: 1,
    FOUGHT_OVER: 1.12,
    HARD: 1.26,
};

export interface RegulatorProfile {
    countryId: string;
    name: string;
    short: string;
    statute: string;
    /** 0–100. Higher means a harder file. */
    strictness: number;
    conditions: LicenceConditionKind[];
    feeMult: number;
    named: boolean;
}

export interface LicenceQuote {
    countryId: string;
    marketValueUsd: number;
    feeUsd: number;
    renewalUsd: number;
    appealUsd: number;
    reviewWeeks: number;
}

export interface LicenceActionQuote {
    kind: 'APPLY' | 'APPEAL' | 'REAPPLY' | 'ACCEPT' | 'RENEW' | 'WAIT' | 'LICENSED' | 'REVIEW';
    cost: number;
    missing: number;
    label: string;
    detail: string;
    waitWeeks: number;
    /** A second cheque, when a refusal can also be appealed or filed again. */
    secondary?: {
        kind: 'APPEAL' | 'REAPPLY';
        cost: number;
        missing: number;
        label: string;
        enabled: boolean;
        waitWeeks: number;
    };
}

export interface LicenceResult {
    player: Player;
    error?: string;
    missing?: number;
}

export interface ClearanceNote {
    msg: string;
    type: 'positive' | 'negative' | 'neutral';
}

interface NamedRegulator {
    id: string;
    name: string;
    short: string;
    statute: string;
    strictness: number;
    feeMult?: number;
    conditions?: LicenceConditionKind[];
}

const NAMED_ROWS: NamedRegulator[] = [
    { id: 'US', name: 'Federal Communications Commission', short: 'FCC', strictness: 20, feeMult: 1.1, conditions: ['CONTENT_RULES'], statute: 'The FCC takes the streaming file. State consumer rules sit beside it. The door opens when the cheque clears.' },
    { id: 'CA', name: 'Canadian Radio-television and Telecommunications Commission', short: 'CRTC', strictness: 34, feeMult: 1.04, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'The CRTC expects Canadian programming and a French-language path. The licence is for Canada only.' },
    { id: 'MX', name: 'Instituto Federal de Telecomunicaciones', short: 'IFT', strictness: 28, conditions: ['LOCAL_QUOTA'], statute: 'The IFT registers a foreign streamer on its own. A US licence does not cross the border.' },
    { id: 'BR', name: 'ANCINE', short: 'ANCINE', strictness: 42, feeMult: 1.06, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'ANCINE wants a Portuguese catalogue and a tax file. The licence stops at Brazil.' },
    { id: 'GB', name: 'Ofcom', short: 'Ofcom', strictness: 36, feeMult: 1.08, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'Ofcom runs the British file. It is not an EU licence, and it does not open Ireland.' },
    { id: 'FR', name: 'Arcom', short: 'Arcom', strictness: 62, feeMult: 1.14, conditions: ['LOCAL_QUOTA', 'DATA_SERVER', 'CONTENT_RULES'], statute: 'Arcom enforces the AVMSD in France. The quota is French. A German licence does not play here.' },
    { id: 'DE', name: 'Die Medienanstalten', short: 'Medienanstalten', strictness: 50, feeMult: 1.08, conditions: ['LOCAL_QUOTA', 'DATA_SERVER', 'CONTENT_RULES'], statute: 'The state media authorities enforce the AVMSD in Germany. France’s licence is not accepted.' },
    { id: 'ES', name: 'Comisión Nacional de los Mercados y la Competencia', short: 'CNMC', strictness: 40, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'The CNMC keeps Spain’s own AVMSD file. The quota is Spanish.' },
    { id: 'IT', name: 'Autorità per le Garanzie nelle Comunicazioni', short: 'AGCOM', strictness: 46, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'AGCOM licenses Italy under the AVMSD. The file is national.' },
    { id: 'SE', name: 'Mediemyndigheten', short: 'Mediemyndigheten', strictness: 30, conditions: ['CONTENT_RULES'], statute: 'Sweden’s media authority reviews its own file. Nordic neighbours are separate markets.' },
    { id: 'NL', name: 'Commissariaat voor de Media', short: 'CvdM', strictness: 38, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'The Dutch media authority enforces the AVMSD at home. The licence is not Benelux-wide.' },
    { id: 'PL', name: 'Krajowa Rada Radiofonii i Telewizji', short: 'KRRiT', strictness: 48, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'KRRiT reviews Poland on its own. An EU directive is not a shared permit.' },
    { id: 'IE', name: 'Coimisiún na Meán', short: 'CnaM', strictness: 32, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'Coimisiún na Meán licenses Ireland. Ofcom’s British file does not carry over.' },
    { id: 'IN', name: 'Ministry of Information and Broadcasting', short: 'MIB', strictness: 52, feeMult: 1.08, conditions: ['LOCAL_QUOTA', 'LOCAL_OFFICE', 'CONTENT_RULES'], statute: 'The Ministry of Information and Broadcasting applies the IT Rules. A grievance office and a local catalogue are part of the file.' },
    { id: 'CN', name: 'National Radio and Television Administration', short: 'NRTA', strictness: 88, feeMult: 1.34, conditions: ['LOCAL_QUOTA', 'LOCAL_OFFICE', 'DATA_SERVER', 'CONTENT_RULES'], statute: 'The NRTA licenses foreign video. The review is slow, a refusal is common, and a licence here does not travel.' },
    { id: 'JP', name: 'Ministry of Internal Affairs and Communications', short: 'MIC', strictness: 58, feeMult: 1.12, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'Japan’s ministry expects Japanese-language programming. The file is not an East Asia permit.' },
    { id: 'KR', name: 'Korea Communications Commission', short: 'KCC', strictness: 46, feeMult: 1.06, conditions: ['LOCAL_QUOTA', 'LOCAL_OFFICE', 'CONTENT_RULES'], statute: 'The KCC wants a local agent and Korean programming. China and Japan are different desks.' },
    { id: 'AU', name: 'Australian Communications and Media Authority', short: 'ACMA', strictness: 32, feeMult: 1.04, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'ACMA classifies and registers the service in Australia. New Zealand is a separate file.' },
    { id: 'NZ', name: 'Te Mana Whakaatu Classification Office', short: 'Classification Office', strictness: 16, conditions: ['CONTENT_RULES'], statute: 'New Zealand classifies on its own. An Australian licence stays in Australia.' },
    { id: 'NG', name: 'National Broadcasting Commission', short: 'NBC', strictness: 30, conditions: ['LOCAL_QUOTA', 'LOCAL_OFFICE'], statute: 'Nigeria’s NBC wants a local face and Nollywood on the shelf. The licence is national.' },
    { id: 'ZA', name: 'Film and Publication Board', short: 'FPB', strictness: 34, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'The Film and Publication Board classifies what plays in South Africa. Neighbours file at home.' },
    { id: 'EG', name: 'Supreme Council for Media Regulation', short: 'SCMR', strictness: 64, feeMult: 1.08, conditions: ['CONTENT_RULES', 'LOCAL_OFFICE', 'LOCAL_QUOTA'], statute: 'Egypt’s media council can hold a title. A licence elsewhere in the region is not enough.' },
    { id: 'KE', name: 'Communications Authority of Kenya', short: 'CA', strictness: 26, conditions: ['LOCAL_QUOTA'], statute: 'Kenya’s communications authority registers the service on its own.' },
    { id: 'ID', name: 'Ministry of Communication and Informatics', short: 'Kominfo', strictness: 56, feeMult: 1.06, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA', 'LOCAL_OFFICE'], statute: 'Kominfo can stall a catalogue. The Indonesian file does not cover Malaysia or Singapore.' },
    { id: 'PH', name: 'Movie and Television Review and Classification Board', short: 'MTRCB', strictness: 30, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'The MTRCB classifies what streams in the Philippines. The permit is national.' },
    { id: 'RU', name: 'Roskomnadzor', short: 'Roskomnadzor', strictness: 78, feeMult: 1.22, conditions: ['CONTENT_RULES', 'DATA_SERVER', 'LOCAL_OFFICE'], statute: 'Roskomnadzor can refuse a foreign catalogue. The review is national and often hard.' },
    { id: 'SA', name: 'General Commission for Audiovisual Media', short: 'GCAM', strictness: 70, feeMult: 1.12, conditions: ['CONTENT_RULES', 'LOCAL_OFFICE', 'DATA_SERVER'], statute: 'Saudi Arabia’s audiovisual commission reviews content itself. A UAE permit does not enter.' },
    { id: 'AE', name: 'UAE Media Council', short: 'Media Council', strictness: 60, feeMult: 1.1, conditions: ['CONTENT_RULES', 'LOCAL_OFFICE'], statute: 'The UAE Media Council licenses this country only. Saudi Arabia is a different file.' },
    { id: 'TR', name: 'Radyo ve Televizyon Üst Kurulu', short: 'RTÜK', strictness: 58, feeMult: 1.08, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA', 'LOCAL_OFFICE'], statute: 'RTÜK licenses Turkey. A European approval does not substitute.' },
    { id: 'VN', name: 'Ministry of Information and Communications', short: 'MIC Vietnam', strictness: 74, feeMult: 1.16, conditions: ['CONTENT_RULES', 'DATA_SERVER', 'LOCAL_OFFICE'], statute: 'Vietnam’s ministry reviews foreign video slowly. A refusal can be appealed, not skipped.' },
    { id: 'SG', name: 'Infocomm Media Development Authority', short: 'IMDA', strictness: 36, feeMult: 1.05, conditions: ['CONTENT_RULES'], statute: 'IMDA licenses Singapore. The permit does not cover Malaysia.' },
    { id: 'HK', name: 'Communications Authority of Hong Kong', short: 'CAHK', strictness: 40, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'Hong Kong’s communications authority files separately from mainland China.' },
    { id: 'TW', name: 'National Communications Commission', short: 'NCC', strictness: 38, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'Taiwan’s NCC reviews its own catalogue. It is not a China licence.' },
    { id: 'TH', name: 'National Broadcasting and Telecommunications Commission', short: 'NBTC', strictness: 44, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'The NBTC licenses Thailand. A regional southeast Asian permit does not exist.' },
    { id: 'PK', name: 'Pakistan Electronic Media Regulatory Authority', short: 'PEMRA', strictness: 48, conditions: ['CONTENT_RULES', 'LOCAL_QUOTA'], statute: 'PEMRA licenses Pakistan. India’s MIB file does not cross the border.' },
    { id: 'BD', name: 'Ministry of Information of Bangladesh', short: 'MoI', strictness: 40, conditions: ['LOCAL_QUOTA', 'CONTENT_RULES'], statute: 'Bangladesh reviews its own streamer. The fee follows this market, not South Asia.' },
];

const NAMED = new Map(NAMED_ROWS.map(row => [row.id, row]));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const moneyShort = (amount: number): string => {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
    return `$${Math.round(abs)}`;
};

const roundMoney = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value < 250_000) return Math.round(value / 5_000) * 5_000;
    if (value < 2_000_000) return Math.round(value / 10_000) * 10_000;
    return Math.round(value / 50_000) * 50_000;
};

export const CONDITION_COPY: Record<LicenceConditionKind, { title: string; unmet: string; met: string }> = {
    LOCAL_QUOTA: {
        title: 'Local content quota',
        unmet: 'The home language is thin, so fewer households subscribe.',
        met: 'A local title, or a main dub, covers the quota.',
    },
    LOCAL_OFFICE: {
        title: 'Local office',
        unmet: 'No office here. The regulator treats the service as a visitor and reach is lower.',
        met: 'An office or the headquarters is in this country.',
    },
    DATA_SERVER: {
        title: 'In-country servers',
        unmet: 'Streams still come from abroad. Playback is weaker until a rack stands here.',
        met: 'A server room in this country meets the data rule.',
    },
    CONTENT_RULES: {
        title: 'Content rules',
        unmet: 'Enforcement is light, so the content rules trim the audience.',
        met: 'Enforcement is high enough that the content rules are being kept.',
    },
};

const conditionsFor = (country: MarketCountry): LicenceConditionKind[] => {
    const list: LicenceConditionKind[] = [];
    const eu = EU.has(country.id);
    if (country.localContentPct >= 12 || eu && country.localContentPct >= 8) list.push('LOCAL_QUOTA');
    if (
        country.difficulty === 'HARD'
        || country.reviewLabel === 'Government'
        || country.filings.some(item => /local|partner|agent|representative|grievance/i.test(item))
    ) list.push('LOCAL_OFFICE');
    if (
        citiesInCountry(country.id).length > 0
        && (country.privacyLabel === 'State review' || country.id === 'CN' || country.id === 'RU' || country.id === 'VN' || country.id === 'SA')
    ) list.push('DATA_SERVER');
    if (
        country.reviewLabel === 'Government'
        || country.difficulty === 'HARD'
        || country.localContentLabel === 'Sensitive'
        || country.filings.some(item => /content|censor|youth|age|classification|rating/i.test(item))
    ) list.push('CONTENT_RULES');
    return list.filter((kind, index) => list.indexOf(kind) === index);
};

const strictnessFor = (country: MarketCountry): number => {
    const base = { OPEN: 18, CROWDED: 32, FOUGHT_OVER: 44, HARD: 60 }[country.difficulty];
    const government = country.reviewLabel === 'Government' ? 16 : 0;
    const quota = country.localContentPct >= 20 ? 6 : 0;
    const salt = hashString(`${country.id}:strict`) % 7;
    return clamp(base + government + quota + salt, 8, 92);
};

const applicable = (country: MarketCountry, kinds: LicenceConditionKind[]): LicenceConditionKind[] =>
    kinds.filter(kind => KINDS.has(kind) && (kind !== 'DATA_SERVER' || citiesInCountry(country.id).length > 0));

export const regulatorFor = (countryId: string): RegulatorProfile | undefined => {
    const country = getCountry(countryId);
    if (!country) return undefined;
    const named = NAMED.get(country.id);
    const eu = EU.has(country.id);
    const statute = named?.statute || (eu
        ? `${country.name} enforces the AVMSD itself. There is no EU-wide streaming licence. ${country.localContentNote}.`
        : country.reviewLabel === 'Government'
            ? `${country.name} reviews a foreign streamer in its own ministry. ${country.privacyNote}.`
            : `${country.name} issues its own streaming licence. ${country.taxNote}.`);
    return {
        countryId: country.id,
        name: named?.name || `${country.name} Audiovisual Authority`,
        short: named?.short || `${country.id} AVA`,
        statute,
        strictness: named?.strictness ?? strictnessFor(country),
        conditions: applicable(country, named?.conditions || conditionsFor(country)),
        feeMult: named?.feeMult && named.feeMult > 0 ? named.feeMult : 1,
        named: Boolean(named),
    };
};

export const marketValueUsd = (country: MarketCountry): number => {
    const audience = Math.max(0, country.audienceM);
    const arpu = Math.max(1, country.affordability);
    const population = Math.max(audience, country.populationM || audience);
    const annual = audience * 1_000_000 * REVENUE_TAKE * arpu * 12;
    const people = population * 1_000_000 * DOLLARS_PER_PERSON;
    const growth = 1 + Math.max(0, country.growthPct) / 250;
    return Math.max(0, (annual * 0.64 + people * 0.36) * growth);
};

const rawFee = (country: MarketCountry): number => {
    const profile = regulatorFor(country.id);
    const government = country.reviewLabel === 'Government' ? 1.1 : 1;
    const mult = DIFFICULTY_MULT[country.difficulty] * government * (profile?.feeMult || 1);
    let fee = marketValueUsd(country) * VALUE_RATE * mult;
    if (country.populationM < 2) {
        const people = Math.max(0, country.populationM) * 1_000_000;
        const floor = 20_000 + people * 0.08 + country.audienceM * 1_000_000 * Math.max(1, country.affordability) * 0.15;
        fee = Math.max(fee, floor);
    } else {
        fee = Math.max(fee, 75_000);
    }
    return roundMoney(fee);
};

const FEE_TABLE: Map<string, number> = (() => {
    const used = new Set<number>();
    const table = new Map<string, number>();
    MARKET_COUNTRIES.forEach(country => {
        const base = Math.max(5_000, rawFee(country));
        const step = base < 2_000_000 ? 1_000 : 10_000;
        const nudge = (hashString(`${country.id}:cheque`) % 19) * step;
        let fee = base + nudge;
        let guard = 0;
        while (used.has(fee) && guard < 40) {
            fee += step;
            guard += 1;
        }
        used.add(fee);
        table.set(country.id, fee);
    });
    return table;
})();

export const licenceQuote = (countryId: string): LicenceQuote | undefined => {
    const country = getCountry(countryId);
    if (!country) return undefined;
    const feeUsd = FEE_TABLE.get(country.id) || rawFee(country);
    return {
        countryId: country.id,
        marketValueUsd: Math.round(marketValueUsd(country)),
        feeUsd,
        renewalUsd: Math.max(5_000, roundMoney(feeUsd * RENEWAL_RATE)),
        appealUsd: Math.max(5_000, roundMoney(feeUsd * APPEAL_RATE)),
        reviewWeeks: Math.max(2, Math.round(country.reviewWeeks || 4)),
    };
};

/** One decimal on millions, so a $52.6M cheque is not shown as $53M. */
export const formatLicenceUsd = (amount: number): string => {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `${sign}$${(Math.round(abs / 10_000_000) / 100).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(Math.round(abs / 100_000) / 10).toFixed(1)}M`;
    if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}k`;
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
};

export const allLicenceQuotes = (): LicenceQuote[] =>
    MARKET_COUNTRIES.flatMap(country => {
        const quote = licenceQuote(country.id);
        return quote ? [quote] : [];
    });

export const decisionOdds = (countryId: string, appeal: boolean): { approve: number; delay: number; conditions: number; reject: number } => {
    const country = getCountry(countryId);
    const profile = regulatorFor(countryId);
    if (!country || !profile) return { approve: 0, delay: 0, conditions: 0, reject: 100 };
    const salt = hashString(`${countryId}:odds`) % 5;
    let approve = Math.round(78 - profile.strictness * 0.75 + salt);
    let delay = 8 + (country.reviewWeeks >= 8 ? 8 : country.reviewWeeks >= 5 ? 4 : 1);
    let conditions = Math.min(38, Math.max(6, profile.conditions.length * 8 + (hashString(`${countryId}:cond`) % 5)));
    if (profile.conditions.length === 0) conditions = 6 + (hashString(`${countryId}:cond`) % 4);
    if (appeal) {
        approve += 16;
        delay = Math.max(4, delay - 3);
    }
    approve = clamp(approve, 8, 78);
    delay = clamp(delay, 4, 22);
    conditions = clamp(conditions, 4, 40);
    let reject = 100 - approve - delay - conditions;
    if (reject < 6) {
        const need = 6 - reject;
        approve = Math.max(8, approve - need);
        reject = 100 - approve - delay - conditions;
        if (reject < 6) {
            conditions = Math.max(4, conditions - (6 - reject));
            reject = 100 - approve - delay - conditions;
        }
    }
    return { approve, delay, conditions, reject };
};

export const isStreamingCleared = (application: MarketApplication | undefined): boolean => {
    if (!application) return false;
    if (application.status === 'APPROVED') return true;
    return application.status === 'CONDITIONS' && application.acceptedConditions;
};

export const licenceFeeSettled = (application: MarketApplication | undefined): boolean =>
    Boolean(application && (application.grandfathered || (application.feePaid || 0) > 0));

export const conditionMet = (state: OwnPlatformState, countryId: string, kind: LicenceConditionKind): boolean => {
    if (kind === 'LOCAL_QUOTA') {
        const primary = getCountry(countryId)?.languages[0]?.name;
        if (primary && (state.catalogue || []).some(row => row.language === primary)) return true;
        const local = (state.localisations || []).find(row => row.countryId === countryId);
        return Boolean(local && (local.dub === 'FULL' || local.dub === 'MAIN'));
    }
    if (kind === 'LOCAL_OFFICE') {
        if ((state.offices || []).some(row => row.countryId === countryId)) return true;
        return cityById(state.hqCityId)?.countryId === countryId;
    }
    if (kind === 'DATA_SERVER') {
        const cities = new Set(citiesInCountry(countryId).map(row => row.id));
        if (!cities.size) return true;
        return (state.sites || []).some(site => cities.has(site.cityId) && site.scout + site.workhorse + site.titan > 0);
    }
    return (state.enforcement || 0) >= 50;
};

/** Unmet rules and a late renewal cut reach. They never close the market. */
export const licenceReach = (state: OwnPlatformState, countryId: string): number => {
    const application = (state.applications || []).find(row => row.countryId === countryId);
    if (!application || !isStreamingCleared(application)) return 1;
    let reach = 1;
    (application.conditions || []).forEach(kind => {
        if (KINDS.has(kind) && !conditionMet(state, countryId, kind)) reach *= 0.86;
    });
    if (application.renewalOverdue) reach *= 0.82;
    return Math.max(0.55, Math.min(1, reach));
};

const absoluteNow = (player: Player) => getAbsoluteWeek(player.age || 1, player.currentWeek || 1);

const sanitizeApplication = (raw: MarketApplication): MarketApplication | undefined => {
    if (!raw || !getCountry(raw.countryId) || !STATUSES.has(raw.status)) return undefined;
    const conditions = Array.isArray(raw.conditions)
        ? raw.conditions.filter((kind): kind is LicenceConditionKind => KINDS.has(kind))
        : undefined;
    return {
        ...raw,
        weeksLeft: Math.max(0, Math.round(Number(raw.weeksLeft) || 0)),
        filedWeekAbsolute: Math.max(0, Math.round(Number(raw.filedWeekAbsolute) || 0)),
        acceptedConditions: Boolean(raw.acceptedConditions),
        note: typeof raw.note === 'string' ? raw.note : '',
        feePaid: Number.isFinite(Number(raw.feePaid)) ? Math.max(0, Math.round(Number(raw.feePaid))) : undefined,
        renewalUsd: Number.isFinite(Number(raw.renewalUsd)) ? Math.max(0, Math.round(Number(raw.renewalUsd))) : undefined,
        renewsWeekAbsolute: Number.isFinite(Number(raw.renewsWeekAbsolute)) ? Math.round(Number(raw.renewsWeekAbsolute)) : undefined,
        refileWeekAbsolute: Number.isFinite(Number(raw.refileWeekAbsolute)) ? Math.round(Number(raw.refileWeekAbsolute)) : undefined,
        conditions: conditions && conditions.length ? conditions : undefined,
        regulatorId: raw.countryId,
    };
};

/** Launched markets keep the licence they already earned. The treasury is not charged. */
export const grandfatherLaunchedLicences = (state: OwnPlatformState, player: Player): OwnPlatformState => {
    const launched = state.stage === 'LIVE' || state.stage === 'CONSTRUCTING' || Boolean(state.commissioned);
    const absolute = absoluteNow(player);
    const cleaned = (state.applications || []).flatMap(row => {
        const next = sanitizeApplication(row);
        return next ? [next] : [];
    });
    if (!launched) {
        const same = cleaned.length === (state.applications || []).length
            && cleaned.every((row, index) => row === (state.applications || [])[index]);
        return same ? state : { ...state, applications: cleaned };
    }
    let changed = cleaned.length !== (state.applications || []).length;
    const applications = cleaned.map(app => {
        if (!isStreamingCleared(app)) {
            if (app.regulatorId === app.countryId) return app;
            changed = true;
            return { ...app, regulatorId: app.countryId };
        }
        const quote = licenceQuote(app.countryId);
        const paid = (app.feePaid || 0) > 0;
        const grandfathered = paid ? Boolean(app.grandfathered) : true;
        const renewsWeekAbsolute = app.renewsWeekAbsolute || absolute + 52;
        const renewalUsd = app.renewalUsd || quote?.renewalUsd || 0;
        if (
            app.grandfathered === grandfathered
            && app.renewsWeekAbsolute === renewsWeekAbsolute
            && app.renewalUsd === renewalUsd
            && app.regulatorId === app.countryId
        ) return app;
        changed = true;
        return {
            ...app,
            grandfathered,
            regulatorId: app.countryId,
            renewalUsd,
            renewsWeekAbsolute,
            grantedWeekAbsolute: app.grantedWeekAbsolute || app.filedWeekAbsolute || absolute,
        };
    });
    if (!changed) return state;
    return { ...state, applications };
};

const serviceName = (player: Player) => player.ownPlatform?.name?.trim() || 'The service';

const pushSignal = (
    player: Player,
    id: string,
    headline: string,
    subtext: string,
    impact: 'LOW' | 'MEDIUM' | 'HIGH',
    sender: string,
) => {
    player.news = [{
        id,
        headline,
        subtext,
        category: 'INDUSTRY',
        week: player.currentWeek || 1,
        year: player.age || 1,
        impactLevel: impact,
    }, ...(Array.isArray(player.news) ? player.news : [])].slice(0, 80);
    player.inbox = [{
        id: `inbox_${id}`,
        sender,
        subject: headline,
        text: subtext,
        type: 'SYSTEM' as const,
        isRead: false,
        weekSent: player.currentWeek || 1,
        expiresIn: 8,
    }, ...(Array.isArray(player.inbox) ? player.inbox : [])].slice(0, 80);
};

const cloneForCheque = (player: Player): Player => {
    const state = player.ownPlatform;
    if (!state) return { ...player };
    const books = state.books
        ? { ...state.books, lines: [...(state.books.lines || [])], history: [...(state.books.history || [])] }
        : state.books;
    return {
        ...player,
        news: [...(Array.isArray(player.news) ? player.news : [])],
        inbox: [...(Array.isArray(player.inbox) ? player.inbox : [])],
        ownPlatform: {
            ...state,
            books,
            selectedCountryIds: [...state.selectedCountryIds],
            applications: state.applications.map(row => ({ ...row })),
        },
    };
};

const takeCheque = (player: Player, amount: number, label: string): { player: Player; missing: number } => {
    const cash = readCompanyCash(player);
    const missing = Math.max(0, amount - cash);
    if (missing > 0 || amount <= 0) return { player, missing };
    const next = cloneForCheque(player);
    addCompanyCash(next, -amount, label, 'BURN');
    return { player: next, missing: 0 };
};

const upsertApplication = (state: OwnPlatformState, next: MarketApplication): OwnPlatformState => {
    const rest = state.applications.filter(row => row.countryId !== next.countryId);
    const selected = state.selectedCountryIds.includes(next.countryId)
        ? state.selectedCountryIds
        : [...state.selectedCountryIds, next.countryId];
    return { ...state, selectedCountryIds: selected, applications: [...rest, next] };
};

export const licenceAction = (player: Player, countryId: string): LicenceActionQuote => {
    const quote = licenceQuote(countryId);
    const empty: LicenceActionQuote = { kind: 'WAIT', cost: 0, missing: 0, label: 'Unavailable', detail: 'That market is not on the map.', waitWeeks: 0 };
    if (!quote || !player.ownPlatform) return empty;
    const cash = readCompanyCash(player);
    const absolute = absoluteNow(player);
    const app = player.ownPlatform.applications.find(row => row.countryId === countryId);
    const short = (cost: number) => Math.max(0, cost - cash);
    if (!app) {
        return {
            kind: 'APPLY',
            cost: quote.feeUsd,
            missing: short(quote.feeUsd),
            label: 'Apply',
            detail: `Pay ${quote.feeUsd} from the treasury. The review takes ${quote.reviewWeeks} weeks.`,
            waitWeeks: quote.reviewWeeks,
        };
    }
    if (app.status === 'FILED' || app.status === 'DELAYED') {
        return {
            kind: 'REVIEW',
            cost: 0,
            missing: 0,
            label: 'Under review',
            detail: `${app.weeksLeft} week${app.weeksLeft === 1 ? '' : 's'} left on this country's clock.`,
            waitWeeks: app.weeksLeft,
        };
    }
    if (app.status === 'CONDITIONS' && !app.acceptedConditions) {
        return {
            kind: 'ACCEPT',
            cost: 0,
            missing: 0,
            label: 'Accept conditions',
            detail: 'Streaming can start. Each unmet rule cuts the audience until you meet it.',
            waitWeeks: 0,
        };
    }
    if (isStreamingCleared(app)) {
        if (app.renewalOverdue) {
            const cost = app.renewalUsd || quote.renewalUsd;
            return {
                kind: 'RENEW',
                cost,
                missing: short(cost),
                label: 'Pay renewal',
                detail: 'The annual fee was missed. The service still streams, and reach is lower until this is paid.',
                waitWeeks: 0,
            };
        }
        return {
            kind: 'LICENSED',
            cost: app.renewalUsd || quote.renewalUsd,
            missing: 0,
            label: app.grandfathered ? 'Licensed' : 'Licensed',
            detail: app.grandfathered
                ? 'This market was already open. The old licence stands.'
                : 'The licence is in force.',
            waitWeeks: 0,
        };
    }
    const waitWeeks = Math.max(0, (app.refileWeekAbsolute || 0) - absolute);
    const appeal: LicenceActionQuote['secondary'] = app.appealSpent ? undefined : {
        kind: 'APPEAL',
        cost: quote.appealUsd,
        missing: short(quote.appealUsd),
        label: 'Appeal',
        enabled: short(quote.appealUsd) === 0,
        waitWeeks: Math.max(2, Math.round(quote.reviewWeeks * 0.4)),
    };
    const reapplyReady = waitWeeks === 0;
    return {
        kind: reapplyReady ? 'REAPPLY' : 'WAIT',
        cost: quote.feeUsd,
        missing: reapplyReady ? short(quote.feeUsd) : 0,
        label: reapplyReady ? 'Apply again' : 'Waiting',
        detail: reapplyReady
            ? 'A new cheque opens a new file.'
            : `A new file can be opened in ${waitWeeks} week${waitWeeks === 1 ? '' : 's'}.`,
        waitWeeks,
        secondary: appeal,
    };
};

const fileApplication = (
    player: Player,
    countryId: string,
    mode: 'APPLY' | 'APPEAL' | 'REAPPLY',
): LicenceResult => {
    const state = player.ownPlatform;
    const country = getCountry(countryId);
    const quote = licenceQuote(countryId);
    const profile = regulatorFor(countryId);
    if (!state || !country || !quote || !profile) return { player, error: 'That market is not on the map.' };
    const existing = state.applications.find(row => row.countryId === countryId);
    if (existing && (existing.status === 'FILED' || existing.status === 'DELAYED')) {
        return { player, error: `${country.name} is already under review.` };
    }
    if (existing && isStreamingCleared(existing)) return { player, error: `${country.name} already has a licence.` };
    if (existing?.status === 'CONDITIONS' && !existing.acceptedConditions) {
        return { player, error: `${country.name} is waiting on conditions.` };
    }
    const absolute = absoluteNow(player);
    if (mode === 'APPLY' && existing) return { player, error: `${country.name} already has a file.` };
    if (mode === 'APPEAL') {
        if (!existing || existing.status !== 'REJECTED') return { player, error: `${country.name} has no refusal to appeal.` };
        if (existing.appealSpent) return { player, error: `${country.name} already used its appeal. File again when the wait is over.` };
    }
    if (mode === 'REAPPLY') {
        if (!existing || existing.status !== 'REJECTED') return { player, error: `${country.name} is not waiting on a new file.` };
        if ((existing.refileWeekAbsolute || 0) > absolute) {
            const left = (existing.refileWeekAbsolute || 0) - absolute;
            return { player, error: `${country.name} can be filed again in ${left} week${left === 1 ? '' : 's'}.`, missing: 0 };
        }
    }
    const cost = mode === 'APPEAL' ? quote.appealUsd : quote.feeUsd;
    const label = mode === 'APPEAL'
        ? `${country.name} licence appeal · ${profile.short}`
        : `${country.name} streaming licence · ${profile.short}`;
    const paid = takeCheque(player, cost, label);
    if (paid.missing > 0) {
        return {
            player,
            missing: paid.missing,
            error: `The treasury is short $${paid.missing.toLocaleString('en-US')} for ${country.name}.`,
        };
    }
    const weeks = mode === 'APPEAL' ? Math.max(2, Math.round(quote.reviewWeeks * 0.4)) : quote.reviewWeeks;
    const nextApp: MarketApplication = {
        countryId: country.id,
        status: 'FILED',
        weeksLeft: weeks,
        filedWeekAbsolute: absolute,
        note: mode === 'APPEAL'
            ? `${profile.short} accepted the ${country.name} appeal. ${weeks} weeks on a shorter clock.`
            : `${profile.name} has the ${country.name} file. ${weeks} weeks under review.`,
        acceptedConditions: false,
        feePaid: cost,
        renewalUsd: quote.renewalUsd,
        regulatorId: country.id,
        appeal: mode === 'APPEAL',
        appealSpent: mode === 'APPEAL' ? true : false,
        conditions: undefined,
        grandfathered: false,
    };
    const next = paid.player;
    next.ownPlatform = upsertApplication(next.ownPlatform!, nextApp);
    pushSignal(
        next,
        `licence_file_${country.id}_${absolute}_${mode}`,
        `${serviceName(next)} files with ${profile.short}`,
        `${country.name}: ${nextApp.note}`,
        'LOW',
        profile.short,
    );
    return { player: next };
};

export const applyForLicence = (player: Player, countryId: string): LicenceResult => fileApplication(player, countryId, 'APPLY');
export const appealLicence = (player: Player, countryId: string): LicenceResult => fileApplication(player, countryId, 'APPEAL');
export const reapplyForLicence = (player: Player, countryId: string): LicenceResult => fileApplication(player, countryId, 'REAPPLY');

export const acceptLicenceConditions = (player: Player, countryId: string): LicenceResult => {
    const state = player.ownPlatform;
    const country = getCountry(countryId);
    const profile = regulatorFor(countryId);
    if (!state || !country || !profile) return { player, error: 'That market is not on the map.' };
    const existing = state.applications.find(row => row.countryId === countryId);
    if (!existing || existing.status !== 'CONDITIONS' || existing.acceptedConditions) {
        return { player, error: `${country.name} is not asking for conditions.` };
    }
    const next = cloneForCheque(player);
    const updated: MarketApplication = {
        ...existing,
        acceptedConditions: true,
        regulatorId: country.id,
        note: `${profile.short} cleared ${country.name} with conditions. Unmet rules cut reach. They do not switch the country off.`,
        renewsWeekAbsolute: existing.renewsWeekAbsolute || absoluteNow(player) + 52,
        renewalUsd: existing.renewalUsd || licenceQuote(country.id)?.renewalUsd,
        grantedWeekAbsolute: existing.grantedWeekAbsolute || absoluteNow(player),
    };
    next.ownPlatform = upsertApplication(next.ownPlatform!, updated);
    pushSignal(
        next,
        `licence_terms_${country.id}_${absoluteNow(player)}`,
        `${country.name} clears ${serviceName(next)} with conditions`,
        updated.note,
        'MEDIUM',
        profile.short,
    );
    return { player: next };
};

export const payLicenceRenewal = (player: Player, countryId: string): LicenceResult => {
    const state = player.ownPlatform;
    const country = getCountry(countryId);
    const quote = licenceQuote(countryId);
    const profile = regulatorFor(countryId);
    if (!state || !country || !quote || !profile) return { player, error: 'That market is not on the map.' };
    const existing = state.applications.find(row => row.countryId === countryId);
    if (!existing || !isStreamingCleared(existing)) return { player, error: `${country.name} has no licence to renew.` };
    if (!existing.renewalOverdue) return { player, error: `${country.name} is not due a renewal.` };
    const cost = existing.renewalUsd || quote.renewalUsd;
    const paid = takeCheque(player, cost, `${country.name} licence renewal · ${profile.short}`);
    if (paid.missing > 0) {
        return { player, missing: paid.missing, error: `The treasury is short $${paid.missing.toLocaleString('en-US')} for the ${country.name} renewal.` };
    }
    const absolute = absoluteNow(player);
    const next = paid.player;
    next.ownPlatform = upsertApplication(next.ownPlatform!, {
        ...existing,
        renewalOverdue: false,
        renewalUsd: cost,
        renewsWeekAbsolute: absolute + 52,
        regulatorId: country.id,
        note: `${profile.short} renewed ${country.name} for a year.`,
    });
    pushSignal(
        next,
        `licence_renew_${country.id}_${absolute}`,
        `${country.name} renews ${serviceName(next)}'s licence`,
        `${profile.short} took the annual fee. Reach is back to the licence's own rules.`,
        'LOW',
        profile.short,
    );
    return { player: next };
};

const outcomeFor = (
    player: Player,
    country: MarketCountry,
    profile: RegulatorProfile,
    application: MarketApplication,
    absoluteWeek: number,
): { status: MarketApplication['status']; weeksLeft: number; note: string; refileWeekAbsolute?: number; conditions?: LicenceConditionKind[] } => {
    const odds = decisionOdds(country.id, Boolean(application.appeal));
    const roll = hashString(`${player.id || 'player'}:${country.id}:${absoluteWeek}:${application.appeal ? 'appeal' : 'file'}`) % 100;
    const quote = licenceQuote(country.id);
    if (roll < odds.approve) {
        const standing = profile.strictness >= 74 ? profile.conditions : [];
        const rule = standing.length ? ` ${profile.short} still expects ${standing.map(kind => CONDITION_COPY[kind].title.toLowerCase()).join(', ')}. Unmet rules cut reach.` : '';
        return {
            status: 'APPROVED',
            weeksLeft: 0,
            note: `${profile.short} granted a streaming licence in ${country.name}.${rule}`,
            conditions: standing.length ? standing : undefined,
        };
    }
    if (roll < odds.approve + odds.delay) {
        const extra = 3 + (hashString(`${country.id}:${absoluteWeek}:delay`) % 2);
        return {
            status: 'DELAYED',
            weeksLeft: extra,
            note: `${profile.short} asked for another pass on ${country.name}. ${extra} more weeks.`,
        };
    }
    if (roll < odds.approve + odds.delay + odds.conditions) {
        const kinds: LicenceConditionKind[] = profile.conditions.length ? profile.conditions : ['CONTENT_RULES'];
        return {
            status: 'CONDITIONS',
            weeksLeft: 0,
            note: `${profile.short} will allow ${country.name} if you accept ${kinds.map(kind => CONDITION_COPY[kind].title.toLowerCase()).join(', ')}.`,
            conditions: kinds,
        };
    }
    const wait = 6 + Math.round(profile.strictness / 14);
    const alreadyAppealed = Boolean(application.appeal);
    return {
        status: 'REJECTED',
        weeksLeft: 0,
        note: alreadyAppealed
            ? `${profile.short} refused the ${country.name} appeal. A new file can be opened in ${wait} weeks.`
            : `${profile.short} refused ${country.name}. Appeal for ${quote ? moneyShort(quote.appealUsd) : 'a fee'}, or apply again in ${wait} weeks.`,
        refileWeekAbsolute: absoluteWeek + wait,
    };
};

export const advanceStreamingReviews = (player: Player, absoluteWeek: number): ClearanceNote[] => {
    const state = player.ownPlatform;
    if (!state) return [];
    const notes: ClearanceNote[] = [];
    state.applications = (state.applications || []).map(application => {
        if (application.status !== 'FILED' && application.status !== 'DELAYED') return application;
        if (application.weeksLeft > 1) return { ...application, weeksLeft: application.weeksLeft - 1, regulatorId: application.countryId };
        const country = getCountry(application.countryId);
        const profile = regulatorFor(application.countryId);
        if (!country || !profile) return application;
        const resolved = outcomeFor(player, country, profile, application, absoluteWeek);
        const quote = licenceQuote(country.id);
        const cleared = resolved.status === 'APPROVED';
        notes.push({
            msg: resolved.note,
            type: resolved.status === 'APPROVED' ? 'positive' : resolved.status === 'REJECTED' ? 'negative' : 'neutral',
        });
        const impact = resolved.status === 'REJECTED' ? 'HIGH' : resolved.status === 'APPROVED' ? 'MEDIUM' : 'LOW';
        pushSignal(
            player,
            `licence_${country.id}_${absoluteWeek}_${resolved.status}`,
            `${profile.short} on ${country.name}`,
            resolved.note,
            impact,
            profile.short,
        );
        return {
            ...application,
            status: resolved.status,
            weeksLeft: resolved.weeksLeft,
            note: resolved.note,
            refileWeekAbsolute: resolved.refileWeekAbsolute,
            acceptedConditions: false,
            appeal: resolved.status === 'DELAYED' ? Boolean(application.appeal) : false,
            appealSpent: application.appeal ? true : application.appealSpent,
            conditions: resolved.conditions,
            regulatorId: country.id,
            renewalUsd: application.renewalUsd || quote?.renewalUsd,
            renewsWeekAbsolute: cleared ? absoluteWeek + 52 : application.renewsWeekAbsolute,
            grantedWeekAbsolute: cleared ? absoluteWeek : application.grantedWeekAbsolute,
        };
    });
    return notes;
};

/** Annual fees are taken after the week's receipts, so a payable renewal is not marked late. */
export const renewStreamingLicences = (player: Player, absoluteWeek: number): { notes: ClearanceNote[]; spent: number } => {
    const state = player.ownPlatform;
    if (!state) return { notes: [], spent: 0 };
    const notes: ClearanceNote[] = [];
    let spent = 0;
    state.applications = (state.applications || []).map(application => {
        if (!isStreamingCleared(application)) return application;
        const due = application.renewsWeekAbsolute;
        if (!due || due > absoluteWeek) return application;
        const country = getCountry(application.countryId);
        const profile = regulatorFor(application.countryId);
        const quote = licenceQuote(application.countryId);
        if (!country || !profile || !quote) return application;
        const cost = application.renewalUsd || quote.renewalUsd;
        if (readCompanyCash(player) >= cost) {
            addCompanyCash(player, -cost, `${country.name} licence renewal · ${profile.short}`, 'BURN');
            spent += cost;
            const wasLate = Boolean(application.renewalOverdue);
            notes.push({
                msg: wasLate
                    ? `${profile.short} took the late renewal for ${country.name}. Reach recovers.`
                    : `${profile.short} renewed the ${country.name} licence for a year.`,
                type: 'neutral',
            });
            pushSignal(
                player,
                `licence_renew_${country.id}_${absoluteWeek}`,
                `${country.name} licence renewed`,
                `${serviceName(player)} paid ${profile.short} the annual fee.`,
                'LOW',
                profile.short,
            );
            return {
                ...application,
                renewalOverdue: false,
                renewalUsd: cost,
                renewsWeekAbsolute: absoluteWeek + 52,
                note: `${profile.short} renewed ${country.name}.`,
            };
        }
        if (!application.renewalOverdue) {
            notes.push({
                msg: `${country.name} renewal is unpaid. ${profile.short} left the service on, and reach fell until the fee is caught up.`,
                type: 'negative',
            });
            pushSignal(
                player,
                `licence_lapse_${country.id}_${absoluteWeek}`,
                `${country.name} licence renewal missed`,
                `The treasury could not pay ${profile.short}. Streaming continues at a lower reach.`,
                'MEDIUM',
                profile.short,
            );
        }
        return { ...application, renewalOverdue: true, renewalUsd: cost };
    });
    return { notes, spent };
};

export const tickStreamingLicences = (player: Player, absoluteWeek: number): { notes: ClearanceNote[]; spent: number } => {
    const notes = advanceStreamingReviews(player, absoluteWeek);
    const renewed = renewStreamingLicences(player, absoluteWeek);
    return { notes: [...notes, ...renewed.notes], spent: renewed.spent };
};
