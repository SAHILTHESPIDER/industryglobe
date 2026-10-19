/** Weeks from the current game week. 0 is this week. 51 is the same week next year. */
export const RELEASE_HORIZON = 51;

export const clampReleaseOffset = (value: number): number => {
    const rounded = Math.round(Number(value));
    if (!Number.isFinite(rounded)) return 0;
    return Math.max(0, Math.min(RELEASE_HORIZON, rounded));
};

/** A title with no offset, or an offset of 0, is already out. */
export const titleIsLive = (offset: number | undefined): boolean =>
    !(typeof offset === 'number' && Number.isFinite(offset) && offset > 0);

export const releaseWeekParts = (currentWeek: number, offset: number): { week: number; yearsAhead: number } => {
    const safeWeek = Math.min(52, Math.max(1, Math.round(Number(currentWeek)) || 1));
    const safeOffset = clampReleaseOffset(offset);
    const absolute = safeWeek + safeOffset;
    return {
        yearsAhead: Math.floor((absolute - 1) / 52),
        week: ((absolute - 1) % 52) + 1,
    };
};

export const releaseWeekLabel = (currentWeek: number, offset: number): string => {
    const { week, yearsAhead } = releaseWeekParts(currentWeek, offset);
    if (yearsAhead <= 0) return `Week ${week}`;
    if (yearsAhead === 1) return `Week ${week} · next year`;
    return `Week ${week} · ${yearsAhead} years on`;
};

/** Week-of-year 1–52. A week that has already passed this year lands next year. */
export const offsetForWeekNumber = (currentWeek: number, weekNumber: number): number => {
    const raw = Math.round(Number(weekNumber));
    if (!Number.isFinite(raw)) return 0;
    const week = ((raw - 1) % 52 + 52) % 52 + 1;
    const current = Math.min(52, Math.max(1, Math.round(Number(currentWeek)) || 1));
    let offset = week - current;
    if (offset < 0) offset += 52;
    return clampReleaseOffset(offset);
};
