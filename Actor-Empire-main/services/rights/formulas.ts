/** Pure rights math. The catalogue generator stamps the same option and purchase anchors. */

export const OPTION_WEEKS = 78;
export const FAMOUS_FAME = 74;

export const fanbaseBoost = (
    fans: number[],
    fidelity: number,
    hot: boolean,
): { theatrical: number; streaming: number } => {
    const safe = Array.isArray(fans) && fans.length ? fans : [0];
    const homeFan = Math.max(...safe.map(value => (Number.isFinite(value) ? value : 0)));
    const homeIndex = safe.findIndex(value => value === homeFan);
    const others = safe.filter((_, index) => index !== homeIndex);
    const otherAvg = others.length ? others.reduce((sum, value) => sum + value, 0) / others.length : 0;
    let boost = (homeFan / 100) * 0.18 + (otherAvg / 100) * 0.06;
    if (fidelity <= 30) boost += 0.05;
    if (fidelity >= 70) boost += 0.08;
    if (fidelity >= 70 && homeFan >= 60) boost -= 0.06;
    if (hot) boost += 0.08;
    const theatrical = Math.max(0, Math.min(0.35, boost));
    const streaming = Math.max(0, Math.min(0.4, theatrical + (otherAvg / 100) * 0.04));
    return { theatrical, streaming };
};

export const clashMultiplier = (rivalAlso: boolean): number => (rivalAlso ? 0.62 : 1);

export const awardBonus = (kind: 'BOOK' | 'LIFE', fidelity: number): number => {
    let bonus = kind === 'LIFE' ? 8 : 5;
    if (fidelity <= 30) bonus += 3;
    return bonus;
};

export const settlementUsd = (fame: number, controversy: number, living: boolean): number => {
    const raw = fame * 90_000 * (1 + controversy / 100) * (living ? 1.5 : 1);
    return Math.round(Math.max(250_000, Math.min(25_000_000, raw)));
};

export const formatMismatchPenalty = (preferred: 'MOVIE' | 'SERIES', chosen: 'MOVIE' | 'SERIES'): number =>
    preferred === chosen ? 0 : 12;

/** Mirrors scripts/generate-rights-catalogue.mjs so yearly hot titles use the same sticker. */
export const bookAnchor = (fame: number, length: 'short' | 'novel' | 'saga', publicDomain: boolean) => {
    if (publicDomain) return { optionUsd: 0, purchaseUsd: 0 };
    const lengthFactor = length === 'short' ? 0.55 : length === 'saga' ? 1.85 : 1;
    const optionUsd = Math.round((12_000 + (fame ** 1.65) * 420) * lengthFactor);
    const purchaseUsd = Math.round(optionUsd * (3.2 + fame / 45));
    return { optionUsd, purchaseUsd };
};

export const lifeAnchor = (fame: number, living: boolean, controversy: number, publicDomain: boolean) => {
    if (publicDomain) return { optionUsd: 0, purchaseUsd: 0 };
    const ask = Math.round((20_000 + (fame ** 1.7) * 500) * (living ? 1.35 : 0.75) * (1 + controversy / 200));
    return { optionUsd: 0, purchaseUsd: ask };
};

export const profitShareAsk = (fame: number): number => Math.min(25, Math.round(10 + fame / 10));
