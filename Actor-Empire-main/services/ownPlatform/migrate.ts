import {
    CloudOrder,
    OwnPlatformState,
    Player,
    PricingPlan,
    RevenueLane,
} from '../../types';
import { CLOUD_PROVIDERS, IDENTITY_PRESETS, STOREFRONTS, createRivalRoster, getCountry } from './catalog';
import { REVENUE_LANES, syncRegions } from './logic';

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
        defineStep: 0,
        buildStep: 0,
        selectedCountryIds: [],
        applications: [],
        identityId: IDENTITY_PRESETS[0].id,
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
        rivals: createRivalRoster(),
        pulse: defaultPulse(),
        pendingDeal: null,
        closedDeals: [],
        lastWeeklyRevenue: 0,
        lastWeeklyBurn: 0,
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
    const merged: OwnPlatformState = {
        ...created,
        ...raw,
        version: 1,
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 32) : created.name,
        stage: raw.stage === 'BUILD' || raw.stage === 'CONSTRUCTING' || raw.stage === 'LIVE' || raw.stage === 'DEFINE' ? raw.stage : 'DEFINE',
        defineStep: clampStep(raw.defineStep, 6),
        buildStep: clampStep(raw.buildStep, 3),
        selectedCountryIds,
        applications: Array.isArray(raw.applications) ? raw.applications.filter(row => row && getCountry(row.countryId)) : [],
        identityId: IDENTITY_PRESETS.some(row => row.id === raw.identityId) ? raw.identityId! : created.identityId,
        storefrontId: STOREFRONTS.some(row => row.id === raw.storefrontId) ? raw.storefrontId! : created.storefrontId,
        catalogue: Array.isArray(raw.catalogue) ? raw.catalogue.filter(row => row && row.title) : [],
        plans: Array.isArray(raw.plans) ? raw.plans.filter(plan => plan && plan.name) : created.plans,
        revenueLanes: asLanes(raw.revenueLanes),
        regions: Array.isArray(raw.regions) ? raw.regions.filter(row => row && row.regionId) : [],
        cloud,
        commissioned: Boolean(raw.commissioned),
        constructionWeeksLeft: Math.max(0, Math.round(Number(raw.constructionWeeksLeft) || 0)),
        weeksLive: Math.max(0, Math.round(Number(raw.weeksLive) || 0)),
        subscribers: Math.max(0, Math.round(Number(raw.subscribers) || 0)),
        piracyShare: Math.max(0, Math.min(1, Number(raw.piracyShare) || 0)),
        enforcement: Math.max(0, Math.min(100, Math.round(Number(raw.enforcement) || created.enforcement))),
        customerPressure: Math.max(0, Math.min(100, Math.round(Number(raw.customerPressure) || 0))),
        rivals: Array.isArray(raw.rivals) && raw.rivals.length >= 39 ? raw.rivals : created.rivals,
        pulse: raw.pulse && typeof raw.pulse === 'object' ? { ...created.pulse, ...raw.pulse } : created.pulse,
        pendingDeal: raw.pendingDeal && raw.pendingDeal.offer ? raw.pendingDeal : null,
        closedDeals: Array.isArray(raw.closedDeals) ? raw.closedDeals : [],
        lastWeeklyRevenue: Number(raw.lastWeeklyRevenue) || 0,
        lastWeeklyBurn: Number(raw.lastWeeklyBurn) || 0,
    };
    return syncRegions(merged);
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

export const migrateOwnPlatformOnLoad = (player: Player): Player => {
    if (!player.ownPlatform) return player;
    return { ...player, ownPlatform: normalizeOwnPlatform(player.ownPlatform, player) };
};
