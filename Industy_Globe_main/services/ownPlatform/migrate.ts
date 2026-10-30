import {
    CloudOrder,
    InfraPresetId,
    IpoState,
    LaunchRegionId,
    OwnPlatformState,
    PlatformBrand,
    Player,
    PricingPlan,
    ReleaseSlot,
    RevenueLane,
    StudioBooks,
} from '../../types';
import { CLOUD_PROVIDERS, IDENTITY_PRESETS, LAUNCH_REGIONS, STOREFRONTS, createRivalRoster, getCountry } from './catalog';
import { brandFrom, legacyBrand } from './brand';
import { IDENTS, LEGACY_IDENT } from './identEffects';
import { anchorRates, decorateRival } from './fx';
import { sanitizeLocalisations, sanitizePasses, sanitizePlan, sanitizeTitleStore } from './commercial';
import { REVENUE_LANES, STANDARD_PLAN_USD, finiteSticker, syncRegions } from './logic';
import { addCompanyCash } from './companyCash';
import { LAUNCH_INVESTORS, LAUNCH_SEED_LINE, LAUNCH_SEED_STAKE, LAUNCH_SEED_USD, defaultReleaseSlot, emptyBooks, emptyIpo, launchSeedBooks } from './studio';
import { clampReleaseOffset } from './weeks';

const DEFAULT_PLAN: PricingPlan = {
    id: 'plan-standard',
    name: 'Standard',
    monthlyUsd: 11,
    ads: false,
    downloads: true,
    quality: 'HD',
    screens: 2,
};

const defaultPulse = () => ({
    recession: 0.05,
    inflation: 0.08,
    connectivity: 0.4,
    fatigue: 0.12,
    headline: 'Households are still adding services, slowly.',
});

export const createOwnPlatform = (player: Player): OwnPlatformState => {
    const state: OwnPlatformState = {
        version: 1,
        name: 'Empire+',
        stage: 'DEFINE',
        defineLayout: 2,
        introSeen: false,
        defineStep: 0,
        buildStep: 0,
        selectedCountryIds: [],
        applications: [],
        identityId: IDENTITY_PRESETS[0].id,
        identId: 'pulse',
        brand: { markId: 'globe', typefaceId: 'condensed', lockupId: 'beside' },
        storefrontId: STOREFRONTS[0].id,
        catalogue: [],
        plans: [{ ...DEFAULT_PLAN }],
        revenueLanes: ['SUBSCRIPTION'],
        regions: [],
        cloud: CLOUD_PROVIDERS.map(provider => ({ providerId: provider.id, racks: 0 })),
        commissioned: false,
        constructionWeeksLeft: 0,
        weeksLive: 0,
        subscribers: 0,
        piracyShare: 0,
        enforcement: 35,
        customerPressure: 10,
        rivals: createRivalRoster().map(row => decorateRival(row)),
        fxRates: anchorRates(),
        pulse: defaultPulse(),
        pendingDeal: null,
        closedDeals: [],
        lastWeeklyRevenue: 0,
        lastWeeklyBurn: 0,
        books: launchSeedBooks(player),
        releaseSlot: defaultReleaseSlot(player),
        ipo: emptyIpo('Empire+'),
        ownedStreamers: [],
        resolvedCommissions: [],
    };
    return syncRegions(state);
};

const asLanes = (value: unknown): RevenueLane[] => {
    if (!Array.isArray(value)) return ['SUBSCRIPTION'];
    const lanes = value.filter((lane): lane is RevenueLane => REVENUE_LANES.includes(lane as RevenueLane));
    return lanes.length ? lanes : ['SUBSCRIPTION'];
};

export const normalizeOwnPlatform = (raw: Partial<OwnPlatformState> | undefined, player: Player): OwnPlatformState => {
    const created = createOwnPlatform(player);
    if (!raw || typeof raw !== 'object') return created;
    const cloud: CloudOrder[] = CLOUD_PROVIDERS.map(provider => {
        const existing = Array.isArray(raw.cloud) ? raw.cloud.find(order => order?.providerId === provider.id) : undefined;
        return { providerId: provider.id, racks: Math.max(0, Math.min(provider.maxRacks, Math.round(Number(existing?.racks) || 0))) };
    });
    const selectedCountryIds = Array.isArray(raw.selectedCountryIds)
        ? raw.selectedCountryIds.filter(id => typeof id === 'string' && getCountry(id))
        : [];
    const legacyLayout = raw.defineLayout !== 2;
    const pastDefine = raw.stage === 'BUILD' || raw.stage === 'CONSTRUCTING' || raw.stage === 'LIVE' || Boolean(raw.commissioned);
    const defineStep = legacyLayout
        ? clampStep((Number(raw.defineStep) || 0) + 1, 7)
        : clampStep(raw.defineStep, 7);
    const introSeen = legacyLayout ? pastDefine : Boolean(raw.introSeen);
    const merged: OwnPlatformState = {
        ...created,
        ...raw,
        version: 1,
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 32) : created.name,
        stage: raw.stage === 'BUILD' || raw.stage === 'CONSTRUCTING' || raw.stage === 'LIVE' || raw.stage === 'DEFINE' ? raw.stage : 'DEFINE',
        defineLayout: 2,
        introSeen,
        defineStep,
        buildStep: clampStep(raw.buildStep, 3),
        selectedCountryIds,
        applications: Array.isArray(raw.applications) ? raw.applications.filter(row => row && getCountry(row.countryId)) : [],
        identityId: IDENTITY_PRESETS.some(row => row.id === raw.identityId) ? raw.identityId! : created.identityId,
        identId: IDENTS.some(row => row.id === raw.identId) ? raw.identId : (LEGACY_IDENT[raw.identityId || ''] || created.identId),
        identSound: raw.identSound === false ? false : undefined,
        brand: normalizeBrand(raw.brand, raw.identityId),
        storefrontId: STOREFRONTS.some(row => row.id === raw.storefrontId) ? raw.storefrontId! : created.storefrontId,
        catalogue: Array.isArray(raw.catalogue)
            ? raw.catalogue.filter(row => row && row.title).map(row => ({
                ...row,
                releaseWeekOffset: Number.isFinite(Number(row.releaseWeekOffset))
                    ? clampReleaseOffset(Number(row.releaseWeekOffset))
                    : undefined,
            }))
            : [],
        plans: Array.isArray(raw.plans) ? raw.plans.filter(plan => plan && plan.name).map(plan => {
            const countryEntries = plan.countryPrices && typeof plan.countryPrices === 'object'
                ? Object.entries(plan.countryPrices).flatMap(([key, value]) => {
                    const sticker = finiteSticker(value);
                    return sticker === undefined ? [] : [[key, sticker] as const];
                })
                : [];
            return sanitizePlan({
                ...plan,
                monthlyUsd: finiteSticker(plan.monthlyUsd) ?? STANDARD_PLAN_USD,
                screens: Math.max(1, Math.min(6, Math.round(Number(plan.screens) || 1))),
                countryPrices: countryEntries.length ? Object.fromEntries(countryEntries) : undefined,
            });
        }) : created.plans,
        localisations: sanitizeLocalisations(raw.localisations),
        passes: sanitizePasses(raw.passes),
        titleStore: sanitizeTitleStore(raw.titleStore),
        revenueLanes: asLanes(raw.revenueLanes),
        regions: Array.isArray(raw.regions) ? raw.regions.filter(row => row && row.regionId) : [],
        infraPreset: sanitizePreset(raw.infraPreset),
        regionCoverage: sanitizeCoverage(raw.regionCoverage),
        cloud,
        commissioned: Boolean(raw.commissioned),
        constructionWeeksLeft: Math.max(0, Math.round(Number(raw.constructionWeeksLeft) || 0)),
        weeksLive: Math.max(0, Math.round(Number(raw.weeksLive) || 0)),
        subscribers: Math.max(0, Math.round(Number(raw.subscribers) || 0)),
        piracyShare: Math.max(0, Math.min(1, Number(raw.piracyShare) || 0)),
        enforcement: Math.max(0, Math.min(100, Math.round(Number(raw.enforcement) || created.enforcement))),
        customerPressure: Math.max(0, Math.min(100, Math.round(Number(raw.customerPressure) || 0))),
        rivals: Array.isArray(raw.rivals) && raw.rivals.length >= 39
            ? raw.rivals.map(row => decorateRival(row, raw.fxRates))
            : created.rivals,
        fxRates: raw.fxRates && typeof raw.fxRates === 'object' ? { ...anchorRates(), ...raw.fxRates } : anchorRates(),
        pulse: raw.pulse && typeof raw.pulse === 'object' ? { ...created.pulse, ...raw.pulse } : created.pulse,
        pendingDeal: raw.pendingDeal && raw.pendingDeal.offer ? raw.pendingDeal : null,
        closedDeals: Array.isArray(raw.closedDeals) ? raw.closedDeals : [],
        lastWeeklyRevenue: Number(raw.lastWeeklyRevenue) || 0,
        lastWeeklyBurn: Number(raw.lastWeeklyBurn) || 0,
        books: normalizeBooks(raw.books),
        releaseSlot: normalizeSlot(raw.releaseSlot, player),
        ipo: normalizeIpo(raw.ipo, typeof raw.name === 'string' ? raw.name : created.name),
        ownedStreamers: Array.isArray(raw.ownedStreamers) ? raw.ownedStreamers.filter(row => row && row.name) : [],
        resolvedCommissions: Array.isArray(raw.resolvedCommissions) ? raw.resolvedCommissions.filter(row => row && row.id) : [],
    };
    return syncRegions(merged);
};

const IPO_STAGES: IpoState['stage'][] = ['IDLE', 'RESOLUTION', 'PRICE', 'VOTE', 'FILING', 'BAND', 'ANCHOR', 'BOOK', 'TRADING', 'LISTED'];

const normalizeBooks = (raw: StudioBooks | undefined): StudioBooks => {
    const fresh = emptyBooks();
    if (!raw || typeof raw !== 'object') return fresh;
    return {
        ...fresh,
        ...raw,
        funding: raw.funding === 'BANK' || raw.funding === 'EQUITY' || raw.funding === 'OWN' ? raw.funding : 'OWN',
        debt: Math.max(0, Number(raw.debt) || 0),
        equitySoldPct: Math.max(0, Math.min(0.8, Number(raw.equitySoldPct) || 0)),
        seedStakePct: Math.max(0, Math.min(0.8, Number(raw.seedStakePct) || 0)),
        seedPartner: typeof raw.seedPartner === 'string' ? raw.seedPartner.slice(0, 80) : '',
        history: Array.isArray(raw.history) ? raw.history.slice(-16) : [],
        lines: Array.isArray(raw.lines) ? raw.lines.slice(0, 40) : [],
        cash: Number.isFinite(Number(raw.cash)) ? Number(raw.cash) : 0,
    };
};

const normalizeSlot = (raw: ReleaseSlot | undefined, player: Player): ReleaseSlot => {
    const fresh = defaultReleaseSlot(player);
    if (!raw || typeof raw !== 'object') return fresh;
    const countryId = getCountry(raw.countryId) ? raw.countryId : fresh.countryId;
    return {
        title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.slice(0, 80) : fresh.title,
        house: typeof raw.house === 'string' && raw.house.trim() ? raw.house.slice(0, 40) : fresh.house,
        countryId,
        language: typeof raw.language === 'string' && raw.language.trim() ? raw.language : fresh.language,
        weekOffset: Number.isFinite(Number(raw.weekOffset))
            ? clampReleaseOffset(Number(raw.weekOffset))
            : fresh.weekOffset,
        linkedReleaseId: typeof raw.linkedReleaseId === 'string' && raw.linkedReleaseId.trim()
            ? raw.linkedReleaseId
            : undefined,
    };
};

const normalizeIpo = (raw: IpoState | undefined, name: string): IpoState => {
    const fresh = emptyIpo(name);
    if (!raw || typeof raw !== 'object') return fresh;
    return {
        ...fresh,
        ...raw,
        stage: IPO_STAGES.includes(raw.stage) ? raw.stage : 'IDLE',
        disclosures: Array.isArray(raw.disclosures) && raw.disclosures.length ? raw.disclosures : fresh.disclosures,
        votes: Array.isArray(raw.votes) ? raw.votes : [],
        dayMove: Array.isArray(raw.dayMove) ? raw.dayMove : [],
        ticker: typeof raw.ticker === 'string' && raw.ticker.trim() ? raw.ticker.slice(0, 5).toUpperCase() : fresh.ticker,
    };
};

const sanitizePreset = (value: unknown): InfraPresetId | undefined =>
    value === 'LEAN' || value === 'BALANCED' || value === 'OWN' ? value : undefined;

const sanitizeCoverage = (value: OwnPlatformState['regionCoverage']): OwnPlatformState['regionCoverage'] => {
    if (!value || typeof value !== 'object') return undefined;
    const next: NonNullable<OwnPlatformState['regionCoverage']> = {};
    (Object.keys(value) as LaunchRegionId[]).forEach(regionId => {
        if (!LAUNCH_REGIONS.some(region => region.id === regionId)) return;
        const pct = Number(value[regionId]);
        if (!Number.isFinite(pct)) return;
        next[regionId] = Math.max(0, Math.min(100, Math.round(pct)));
    });
    return Object.keys(next).length ? next : undefined;
};

const normalizeBrand = (raw: PlatformBrand | undefined, identityId?: string): PlatformBrand => {
    if (raw && typeof raw === 'object' && raw.markId) return brandFrom(raw);
    if (identityId) return legacyBrand(identityId);
    return brandFrom(undefined);
};

const clampStep = (value: unknown, max: number) => {
    const step = Math.round(Number(value) || 0);
    return Math.max(0, Math.min(max, step));
};

/** Leaves saves that never opened the service completely untouched. */
export const ensureOwnPlatform = (player: Player): Player => {
    if (!player.ownPlatform) return { ...player, ownPlatform: createOwnPlatform(player) };
    const normalized = normalizeOwnPlatform(player.ownPlatform, player);
    return { ...player, ownPlatform: normalized };
};

const UNLOCK_FLAG = 'ownPlatformUnlocked';

/** A company the player already started, funded, or paid for. A blank DEFINE slate is not this. */
const companyAlreadyOpened = (state: OwnPlatformState): boolean => {
    if (state.stage === 'BUILD' || state.stage === 'CONSTRUCTING' || state.stage === 'LIVE') return true;
    if (state.commissioned) return true;
    if ((state.defineStep || 0) > 0) return true;
    if ((state.buildStep || 0) > 0) return true;
    if ((state.closedDeals || []).length > 0) return true;
    if ((state.weeksLive || 0) > 0) return true;
    if ((state.subscribers || 0) > 0) return true;
    if ((state.ownedStreamers || []).length > 0) return true;
    if ((state.catalogue || []).length > 0) return true;
    const books = state.books;
    if ((books?.cash || 0) > 0) return true;
    if ((books?.lines || []).length > 0) return true;
    if ((books?.seedStakePct || 0) > 0) return true;
    if ((books?.equitySoldPct || 0) > 0) return true;
    if ((books?.debt || 0) > 0) return true;
    return false;
};

const noteSeed = (player: Player) => {
    player.logs = [...(player.logs || []), {
        week: player.currentWeek,
        year: player.age,
        message: LAUNCH_SEED_LINE,
        type: 'neutral',
    }];
};

/**
 * Opens Empire+ without touching personal cash.
 * A new company receives the investor seed once.
 * A save that already has a company, including one that paid the old fee, is left as it is.
 */
export const openEmpire = (player: Player): Player => {
    const unlocked = Boolean(player.flags?.[UNLOCK_FLAG]);
    if (unlocked && player.ownPlatform) return player;
    if (!player.ownPlatform) {
        const next = ensureOwnPlatform({
            ...player,
            flags: { ...(player.flags || {}), [UNLOCK_FLAG]: true },
        });
        noteSeed(next);
        return next;
    }
    if (companyAlreadyOpened(player.ownPlatform)) {
        return {
            ...player,
            flags: { ...(player.flags || {}), [UNLOCK_FLAG]: true },
        };
    }
    const next = ensureOwnPlatform({
        ...player,
        flags: { ...(player.flags || {}), [UNLOCK_FLAG]: true },
    });
    const state = next.ownPlatform!;
    const books = state.books || emptyBooks();
    state.books = {
        ...books,
        lines: [...(books.lines || [])],
        history: [...(books.history || [])],
        seedStakePct: LAUNCH_SEED_STAKE,
        seedPartner: LAUNCH_INVESTORS,
    };
    addCompanyCash(next, LAUNCH_SEED_USD, LAUNCH_SEED_LINE, 'EQUITY');
    noteSeed(next);
    return next;
};

export const migrateOwnPlatformOnLoad = (player: Player): Player => {
    if (!player.ownPlatform) return player;
    return { ...player, ownPlatform: normalizeOwnPlatform(player.ownPlatform, player) };
};
