import { StorefrontLayout, STOREFRONTS } from './catalog';

/**
 * Six shelves the 13 layouts belong to. Unlock tiers are not a research tree:
 * fame, cash on hand, subscribers, or weeks on air. Any one of them opens the tier.
 * A layout already on the service stays selectable.
 */
export type StorefrontCategory = 'Editorial' | 'Spotlight' | 'Habit' | 'Rooms' | 'Local' | 'Direct';

export interface StorefrontMeta {
    category: StorefrontCategory;
    tier: 0 | 1 | 2;
}

export const STOREFRONT_CATEGORIES: StorefrontCategory[] = ['Editorial', 'Spotlight', 'Habit', 'Rooms', 'Local', 'Direct'];

export const STOREFRONT_META: Record<string, StorefrontMeta> = {
    editorial: { category: 'Editorial', tier: 0 },
    prestige: { category: 'Editorial', tier: 1 },
    billboard: { category: 'Spotlight', tier: 0 },
    trending: { category: 'Spotlight', tier: 1 },
    rails: { category: 'Habit', tier: 0 },
    continue: { category: 'Habit', tier: 1 },
    bundles: { category: 'Habit', tier: 1 },
    'genre-rooms': { category: 'Rooms', tier: 1 },
    'kids-gate': { category: 'Rooms', tier: 2 },
    'local-first': { category: 'Local', tier: 2 },
    'sports-lane': { category: 'Local', tier: 2 },
    grid: { category: 'Direct', tier: 0 },
    'search-first': { category: 'Direct', tier: 2 },
};

const TIER_RULE = {
    0: { fame: 0, cash: 0, subscribers: 0, weeksLive: 0, label: 'Open from the first sketch.' },
    1: { fame: 20, cash: 2_000_000, subscribers: 25_000, weeksLive: 4, label: 'Opens at 20 fame, $2M cash, 25,000 subscribers, or 4 weeks on air.' },
    2: { fame: 50, cash: 15_000_000, subscribers: 200_000, weeksLive: 12, label: 'Opens at 50 fame, $15M cash, 200,000 subscribers, or 12 weeks on air.' },
} as const;

export interface StorefrontAccess {
    unlocked: boolean;
    tier: 0 | 1 | 2;
    because: string;
}

export interface StorefrontProgress {
    fame: number;
    cash: number;
    subscribers: number;
    weeksLive: number;
    currentId?: string;
}

const signed = (points: number) => `${points > 0 ? '+' : '−'}${Math.abs(points)}%`;

/** The line the weekly forecast actually uses. Percentages match the catalogue multipliers. */
export const storefrontEffectLine = (layout: StorefrontLayout): string => {
    const viewers = Math.round((layout.discovery - 1) * 100);
    const stay = Math.round((layout.retention - 1) * 100);
    const parts = [`${signed(viewers)} new viewers`, `${signed(stay)} stay rate`];
    if (layout.localBoost > 0) {
        parts.push(`+${Math.round(layout.localBoost * 100)} pts when a title is in the local language`);
    }
    return parts.join(', ');
};

export const storefrontMeta = (id: string): StorefrontMeta => STOREFRONT_META[id] || { category: 'Editorial', tier: 0 };

export const storefrontAccess = (id: string, progress: StorefrontProgress): StorefrontAccess => {
    const meta = storefrontMeta(id);
    const rule = TIER_RULE[meta.tier];
    if (id && id === progress.currentId) {
        return { unlocked: true, tier: meta.tier, because: 'Already on this service, so it stays available.' };
    }
    if (meta.tier === 0) return { unlocked: true, tier: 0, because: rule.label };
    const open = progress.fame >= rule.fame
        || progress.cash >= rule.cash
        || progress.subscribers >= rule.subscribers
        || progress.weeksLive >= rule.weeksLive;
    return { unlocked: open, tier: meta.tier, because: open ? 'Unlocked. The forecast uses the line below.' : rule.label };
};

export const storefrontsInCategory = (category: StorefrontCategory): StorefrontLayout[] =>
    STOREFRONTS.filter(layout => storefrontMeta(layout.id).category === category);
