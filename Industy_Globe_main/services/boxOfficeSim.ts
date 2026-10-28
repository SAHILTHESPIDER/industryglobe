import {
    ActiveRelease,
    BoxOfficeChartEntry,
    BoxOfficeWeekend,
    BudgetTier,
    Genre,
    IndustryProject,
    IndustryRun,
    NewsItem,
    Player,
    TargetAudience,
    XPost,
} from '../types';
import { getEstimatedBudget, sanitizeGross } from './roleLogic';
import { PROPERTY_CATALOG } from './lifestyleLogic';
import { publicPersonName } from './rights/alterName';
import { getPlayerLanguage } from './i18n';

/** Age 18 is calendar year 2026. Later birthdays move the year, not the dropdown. */
export const GAME_YEAR_AT_AGE_18 = 2026;
export const CHART_HISTORY_CAP = 78;
export const MAX_THEATRICAL_WEEKS = 16;

export const gameCalendarYear = (age: number) => GAME_YEAR_AT_AGE_18 + (age - 18);

export const absoluteWeek = (age: number, week: number) => age * 52 + Math.max(1, week);

export const weekParts = (abs: number) => {
    const safe = Math.max(1, Math.floor(abs));
    return {
        age: Math.floor((safe - 1) / 52),
        week: ((safe - 1) % 52) + 1,
    };
};

export const playerCityLabel = (player: Pick<Player, 'residenceId' | 'customItems'>): string => {
    const id = player.residenceId;
    if (!id) return 'Los Angeles';
    const owned = PROPERTY_CATALOG.find(property => property.id === id);
    if (owned?.location) return owned.location;
    const custom = (player.customItems || []).find(item => item.id === id);
    if (custom && 'location' in custom && custom.location) return custom.location;
    return 'Los Angeles';
};

/** Credits on generated films. Living names are altered unless REAL_NAMES_MODE is on. */
export const creditName = (name: string, living = true) => publicPersonName(name || 'Unknown', living);

const GENRE_FAMILIES: Genre[][] = [
    ['ACTION', 'ADVENTURE', 'SUPERHERO', 'SCI_FI', 'FANTASY'],
    ['HORROR', 'THRILLER', 'CRIME'],
    ['COMEDY', 'ROMANCE', 'MUSICAL'],
    ['DRAMA', 'BIOPIC', 'SPORTS'],
    ['ANIMATION', 'FANTASY'],
    ['DOCUMENTARY'],
];

const AUDIENCE_ORDER: TargetAudience[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

export interface ClashFilm {
    id: string;
    title: string;
    genre: string;
    audience?: string;
    starPower: number;
    hype: number;
    releaseAbs: number;
    budget: number;
}

export interface ClashWarning {
    id: string;
    title: string;
    genre: string;
    week: number;
    sameWeek: boolean;
    overlap: number;
    factor: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const sameFamily = (a: string, b: string) => {
    if (!a || !b) return false;
    if (a === b) return true;
    return GENRE_FAMILIES.some(family => family.includes(a as Genre) && family.includes(b as Genre));
};

const audienceOverlap = (a?: string, b?: string) => {
    if (!a || !b) return 0.15;
    if (a === b) return 0.35;
    const ia = AUDIENCE_ORDER.indexOf(a as TargetAudience);
    const ib = AUDIENCE_ORDER.indexOf(b as TargetAudience);
    if (ia < 0 || ib < 0) return 0.1;
    return Math.abs(ia - ib) === 1 ? 0.18 : 0;
};

export const overlapScore = (a: ClashFilm, b: ClashFilm) => {
    const weekGap = Math.abs(a.releaseAbs - b.releaseAbs);
    if (weekGap > 1) return 0;
    const genreScore = a.genre && a.genre === b.genre ? 0.55 : sameFamily(a.genre, b.genre) ? 0.28 : 0;
    if (genreScore <= 0) return 0;
    let score = genreScore + audienceOverlap(a.audience, b.audience);
    if (weekGap === 1) score *= 0.62;
    return clamp(score, 0, 1);
};

/** Opening/weekly multiplier. Stronger star power and hype give up less of the weekend. */
export const clashMultiplier = (subject: ClashFilm, others: ClashFilm[]) => {
    let factor = 1;
    others.forEach(other => {
        if (other.id === subject.id) return;
        const overlap = overlapScore(subject, other);
        if (overlap <= 0) return;
        const relativeStar = other.starPower / Math.max(20, subject.starPower);
        const relativeHype = (other.hype || 50) / Math.max(20, subject.hype || 50);
        const pressure = overlap * (0.28 + 0.34 * clamp(relativeStar, 0.4, 1.8) + 0.12 * clamp(relativeHype, 0.5, 1.6));
        factor *= 1 - clamp(pressure, 0, 0.42);
    });
    return clamp(factor, 0.48, 1);
};

export const describeClash = (subject: ClashFilm, others: ClashFilm[]): ClashWarning[] => {
    const factor = clashMultiplier(subject, others);
    return others
        .filter(other => other.id !== subject.id && overlapScore(subject, other) > 0)
        .map(other => ({
            id: other.id,
            title: other.title,
            genre: other.genre,
            week: weekParts(other.releaseAbs).week,
            sameWeek: other.releaseAbs === subject.releaseAbs,
            overlap: overlapScore(subject, other),
            factor,
        }))
        .sort((a, b) => b.overlap - a.overlap);
};

const tierStar = (tier: BudgetTier | undefined, quality: number) => {
    const base = tier === 'BLOCKBUSTER' || tier === 'HIGH' ? 78 : tier === 'MID' ? 58 : 40;
    return clamp(Math.round(base * 0.55 + quality * 0.45), 15, 99);
};

const maxWeeksFor = (tier: BudgetTier | undefined) => {
    if (tier === 'BLOCKBUSTER' || tier === 'HIGH') return 12 + Math.floor(Math.random() * 3);
    if (tier === 'MID') return 9 + Math.floor(Math.random() * 3);
    return 6 + Math.floor(Math.random() * 3);
};

export const isTheatricalProject = (project: { type?: string; budget?: number; projectType?: string }) => {
    const kind = project.type || project.projectType;
    if (kind === 'SERIES') return false;
    if (typeof project.budget === 'number' && project.budget <= 0) return false;
    return true;
};

const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

/** Split a legacy lifetime total into a decay curve. First week is the old 22% guess, flagged as an estimate. */
export const estimateWeeklyGrosses = (total: number, weeks = 6): number[] => {
    const safe = sanitizeGross(total);
    if (safe <= 0) return [];
    const count = clamp(weeks, 2, 8);
    const opening = sanitizeGross(safe * 0.22);
    const rest = Math.max(0, safe - opening);
    const weights: number[] = [];
    let weight = 1;
    for (let i = 0; i < count - 1; i++) {
        weights.push(weight);
        weight *= 0.62;
    }
    const weightSum = sum(weights) || 1;
    const weekly = [opening, ...weights.map(value => sanitizeGross(rest * (value / weightSum)))];
    const drift = safe - sum(weekly);
    weekly[weekly.length - 1] = Math.max(0, weekly[weekly.length - 1] + drift);
    return weekly;
};

const emptyRun = (calendarYear: number, budgetUsd: number, starPower: number, tier?: BudgetTier): IndustryRun => ({
    openingGross: 0,
    weeklyGrosses: [],
    starPower,
    budgetUsd,
    calendarYear,
    maxWeeks: maxWeeksFor(tier),
    inTheaters: false,
});

export const attachRunSkeleton = (project: IndustryProject, calendarYear: number, openedAbsoluteWeek?: number): IndustryProject => {
    const budgetUsd = project.run?.budgetUsd || getEstimatedBudget(project.budgetTier);
    const starPower = project.run?.starPower || tierStar(project.budgetTier, project.quality || 50);
    const projected = project.run?.projectedGross || project.boxOffice || 0;
    return {
        ...project,
        run: {
            ...emptyRun(calendarYear, budgetUsd, starPower, project.budgetTier),
            ...(project.run || {}),
            starPower,
            budgetUsd: project.run?.budgetUsd || budgetUsd,
            calendarYear: project.run?.calendarYear || calendarYear,
            projectedGross: projected,
            openedAbsoluteWeek: project.run?.openedAbsoluteWeek || openedAbsoluteWeek,
            maxWeeks: project.run?.maxWeeks || maxWeeksFor(project.budgetTier),
        },
    };
};

const migrateProject = (project: IndustryProject): IndustryProject => {
    if (project.run && (project.run.weeklyGrosses?.length || project.run.grossIsEstimate)) return project;
    const calendarYear = project.run?.calendarYear || gameCalendarYear(project.year || 18);
    const budgetUsd = getEstimatedBudget(project.budgetTier);
    if (project.boxOffice > 0 && (!project.run || !project.run.weeklyGrosses?.length)) {
        const weekly = estimateWeeklyGrosses(project.boxOffice);
        return {
            ...project,
            run: {
                ...emptyRun(calendarYear, budgetUsd, tierStar(project.budgetTier, project.quality || 50), project.budgetTier),
                ...(project.run || {}),
                openingGross: weekly[0] || 0,
                weeklyGrosses: weekly,
                calendarYear,
                budgetUsd,
                grossIsEstimate: true,
                inTheaters: false,
                projectedGross: project.run?.projectedGross || project.boxOffice,
            },
        };
    }
    return attachRunSkeleton(project, calendarYear);
};

const weekGrossFor = (run: IndustryRun, weekIndex: number, clash: number) => {
    const budget = Math.max(1, run.budgetUsd || 1);
    const star = run.starPower || 50;
    if (weekIndex === 0) {
        const base = budget * (0.16 + star / 420);
        const hype = 0.82 + star / 260;
        return sanitizeGross(base * hype * (0.86 + Math.random() * 0.28) * clash);
    }
    const previous = run.weeklyGrosses[weekIndex - 1] || 0;
    const decay = 0.52 + star / 380;
    return sanitizeGross(previous * decay * (0.9 + Math.random() * 0.12) * (0.9 + clash * 0.1));
};

export interface SimCandidate extends ClashFilm {
    source: 'RIVAL' | 'PLAYER' | 'UPCOMING';
}

const playerOpeningAbs = (player: Player, release: ActiveRelease) => {
    const weeksIn = Math.max(1, release.weeklyGross?.length || release.weekNum || 1);
    return absoluteWeek(player.age, player.currentWeek) - (weeksIn - 1);
};

export const collectClashFilms = (player: Player): SimCandidate[] => {
    const films: SimCandidate[] = [];
    const projects = player.world?.projects || [];
    projects.forEach(project => {
        const run = project.run;
        const abs = run?.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || player.currentWeek);
        films.push({
            id: project.id,
            title: project.title,
            genre: project.genre,
            audience: project.targetAudience,
            starPower: run?.starPower || tierStar(project.budgetTier, project.quality || 50),
            hype: project.quality || 50,
            releaseAbs: abs,
            budget: run?.budgetUsd || getEstimatedBudget(project.budgetTier),
            source: 'RIVAL',
        });
    });
    (player.world?.upcomingRivals || []).forEach(project => {
        const abs = project.run?.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || player.currentWeek);
        films.push({
            id: project.id,
            title: project.title,
            genre: project.genre,
            audience: project.targetAudience,
            starPower: project.run?.starPower || tierStar(project.budgetTier, project.quality || 50),
            hype: project.quality || 50,
            releaseAbs: abs,
            budget: project.run?.budgetUsd || getEstimatedBudget(project.budgetTier),
            source: 'UPCOMING',
        });
    });
    (player.activeReleases || []).forEach(release => {
        if (release.distributionPhase !== 'THEATRICAL') return;
        if (!isTheatricalProject({ type: release.type, budget: release.budget })) return;
        films.push({
            id: release.id,
            title: release.name,
            genre: release.projectDetails?.genre || 'DRAMA',
            audience: release.projectDetails?.targetAudience,
            starPower: release.projectDetails?.hiddenStats?.castingStrength || 55,
            hype: release.promotionalBuzz || release.projectDetails?.hiddenStats?.rawHype || 50,
            releaseAbs: playerOpeningAbs(player, release),
            budget: release.budget || 0,
            source: 'PLAYER',
        });
    });
    (player.commitments || []).forEach(commitment => {
        const releaseWeek = commitment.projectDetails?.releaseDate;
        if (!releaseWeek || !commitment.projectDetails) return;
        if (commitment.projectDetails.releaseStrategy === 'STREAMING_ONLY') return;
        if (!isTheatricalProject({ type: commitment.projectDetails.type, budget: commitment.projectDetails.estimatedBudget || commitment.lumpSum || 1 })) return;
        const ahead = releaseWeek >= player.currentWeek ? releaseWeek - player.currentWeek : (52 - player.currentWeek) + releaseWeek;
        films.push({
            id: commitment.id,
            title: commitment.name,
            genre: commitment.projectDetails.genre || 'DRAMA',
            audience: commitment.projectDetails.targetAudience,
            starPower: commitment.projectDetails.hiddenStats?.castingStrength || 55,
            hype: commitment.promotionalBuzz || commitment.projectDetails.hiddenStats?.rawHype || 50,
            releaseAbs: absoluteWeek(player.age, player.currentWeek) + ahead,
            budget: commitment.projectDetails.estimatedBudget || 0,
            source: 'PLAYER',
        });
    });
    return films;
};

export const clashFactorFor = (player: Player, subject: ClashFilm) => {
    const others = collectClashFilms(player).filter(film => film.id !== subject.id);
    return clashMultiplier(subject, others);
};

export const scheduleClashWarnings = (
    player: Player,
    film: { id: string; title: string; genre?: string; audience?: string; starPower?: number; hype?: number; budget?: number },
    releaseWeek: number,
): ClashWarning[] => {
    const ahead = releaseWeek >= player.currentWeek ? releaseWeek - player.currentWeek : 0;
    const subject: ClashFilm = {
        id: film.id,
        title: film.title,
        genre: film.genre || 'DRAMA',
        audience: film.audience,
        starPower: film.starPower || 55,
        hype: film.hype || 50,
        releaseAbs: absoluteWeek(player.age, player.currentWeek) + ahead,
        budget: film.budget || 0,
    };
    return describeClash(subject, collectClashFilms(player));
};

const simulateOne = (project: IndustryProject, player: Player, currentAbs: number): IndustryProject => {
    const calendarYear = gameCalendarYear(player.age);
    let next = project.run ? project : attachRunSkeleton(project, calendarYear, currentAbs);
    const run = { ...(next.run as IndustryRun), weeklyGrosses: [...(next.run?.weeklyGrosses || [])] };
    if (run.grossIsEstimate) return { ...next, run };
    if (run.lastSimulatedAbs === currentAbs) return { ...next, run };

    const openAbs = run.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || player.currentWeek);
    if (currentAbs < openAbs) return { ...next, run: { ...run, openedAbsoluteWeek: openAbs, inTheaters: false } };
    if (!run.inTheaters && run.weeklyGrosses.length === 0 && currentAbs > openAbs + 1) {
        return migrateProject({ ...next, boxOffice: next.boxOffice || run.projectedGross || 0, run });
    }

    const weeksDue = currentAbs - openAbs;
    if (run.weeklyGrosses.length > weeksDue) return { ...next, run: { ...run, lastSimulatedAbs: currentAbs } };

    const subject: ClashFilm = {
        id: project.id,
        title: project.title,
        genre: project.genre,
        audience: project.targetAudience,
        starPower: run.starPower,
        hype: project.quality || 50,
        releaseAbs: openAbs,
        budget: run.budgetUsd,
    };
    const factor = clashFactorFor(player, subject);
    run.clashFactor = factor;

    while (run.weeklyGrosses.length <= weeksDue && run.weeklyGrosses.length < run.maxWeeks && run.weeklyGrosses.length < MAX_THEATRICAL_WEEKS) {
        const gross = weekGrossFor(run, run.weeklyGrosses.length, run.weeklyGrosses.length === 0 ? factor : (0.82 + factor * 0.18));
        if (run.weeklyGrosses.length > 2 && gross < run.budgetUsd * 0.015) break;
        run.weeklyGrosses.push(gross);
    }
    run.openingGross = run.weeklyGrosses[0] || 0;
    run.inTheaters = run.weeklyGrosses.length > 0 && run.weeklyGrosses.length < run.maxWeeks && (run.weeklyGrosses[run.weeklyGrosses.length - 1] || 0) >= run.budgetUsd * 0.015;
    run.lastSimulatedAbs = currentAbs;
    run.calendarYear = run.calendarYear || gameCalendarYear(weekParts(openAbs).age);
    const total = sum(run.weeklyGrosses);
    return { ...next, boxOffice: total, run };
};

export const simulateIndustryWeek = (player: Player): IndustryProject[] => {
    const currentAbs = absoluteWeek(player.age, player.currentWeek);
    return (player.world?.projects || []).map(project => {
        const migrated = project.run?.grossIsEstimate || (project.run?.weeklyGrosses?.length && project.run.grossIsEstimate)
            ? project
            : (!project.run && project.boxOffice > 0 && project.weekReleased !== player.currentWeek && project.year !== player.age
                ? migrateProject(project)
                : project);
        if (migrated.run?.grossIsEstimate) return migrated;
        const openAbs = migrated.run?.openedAbsoluteWeek || absoluteWeek(migrated.year || player.age, migrated.weekReleased || player.currentWeek);
        if (currentAbs - openAbs > MAX_THEATRICAL_WEEKS && migrated.run?.weeklyGrosses?.length) {
            return { ...migrated, run: { ...migrated.run, inTheaters: false } };
        }
        return simulateOne({ ...migrated, run: { ...(migrated.run || attachRunSkeleton(migrated, gameCalendarYear(player.age), openAbs).run!), openedAbsoluteWeek: openAbs } }, player, currentAbs);
    });
};

const chartEntry = (
    id: string,
    title: string,
    studioId: string,
    genre: string,
    weekGross: number,
    totalGross: number,
    weeksInRelease: number,
    isPlayer: boolean,
    grossIsEstimate: boolean | undefined,
    rank: number,
    previous?: BoxOfficeChartEntry,
): BoxOfficeChartEntry => ({
    id,
    title,
    studioId,
    genre,
    weekGross,
    totalGross,
    weeksInRelease,
    rank,
    previousRank: previous?.rank,
    isPlayer,
    grossIsEstimate,
});

export const publishBoxOfficeWeekend = (player: Player): { news: NewsItem[]; post: XPost | null } => {
    const currentAbs = absoluteWeek(player.age, player.currentWeek);
    const calendarYear = gameCalendarYear(player.age);
    const rows: Omit<BoxOfficeChartEntry, 'rank' | 'previousRank'>[] = [];

    (player.world?.projects || []).forEach(project => {
        const run = project.run;
        if (!run?.weeklyGrosses?.length) return;
        if (run.budgetUsd <= 0) return;
        const openAbs = run.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || 1);
        const weeksOut = currentAbs - openAbs;
        if (weeksOut < 0 || weeksOut >= run.weeklyGrosses.length) return;
        const weekGross = run.weeklyGrosses[weeksOut] ?? run.weeklyGrosses[run.weeklyGrosses.length - 1] ?? 0;
        if (weekGross <= 0) return;
        rows.push({
            id: project.id,
            title: project.title,
            studioId: project.studioId,
            genre: project.genre,
            weekGross,
            totalGross: sum(run.weeklyGrosses),
            weeksInRelease: weeksOut + 1,
            isPlayer: false,
            grossIsEstimate: run.grossIsEstimate,
        });
    });

    (player.activeReleases || []).forEach(release => {
        if (release.distributionPhase !== 'THEATRICAL') return;
        if (!isTheatricalProject({ type: release.type, budget: release.budget })) return;
        const weekly = release.weeklyGross || [];
        if (!weekly.length) return;
        rows.push({
            id: release.id,
            title: release.name,
            studioId: release.projectDetails?.studioId || 'INDIE',
            genre: release.projectDetails?.genre || 'DRAMA',
            weekGross: weekly[weekly.length - 1] || 0,
            totalGross: release.totalGross || sum(weekly),
            weeksInRelease: weekly.length,
            isPlayer: true,
            grossIsEstimate: release.grossIsEstimate,
        });
    });

    rows.sort((a, b) => b.weekGross - a.weekGross);
    const previous = (player.world.boxOfficeCharts || [])[0];
    const previousById = new Map((previous?.entries || []).map(entry => [entry.id, entry]));
    const top = rows.slice(0, 10).map((row, index) => chartEntry(
        row.id,
        row.title,
        row.studioId,
        row.genre,
        row.weekGross,
        row.totalGross,
        row.weeksInRelease,
        row.isPlayer,
        row.grossIsEstimate,
        index + 1,
        previousById.get(row.id),
    ));

    const weekend: BoxOfficeWeekend = {
        week: player.currentWeek,
        calendarYear,
        absoluteWeek: currentAbs,
        entries: top,
    };
    const history = [weekend, ...(player.world.boxOfficeCharts || []).filter(chart => chart.absoluteWeek !== currentAbs)];
    player.world.boxOfficeCharts = history.slice(0, CHART_HISTORY_CAP);

    const news: NewsItem[] = [];
    const leader = top[0];
    const language = getPlayerLanguage(player);
    const pt = language === 'pt-BR';
    if (leader && leader.weeksInRelease === 1) {
        news.push({
            id: `news_bo_open_${currentAbs}`,
            headline: pt
                ? `${leader.title} abre em primeiro no fim de semana.`
                : `${leader.title} opens at number one.`,
            subtext: pt
                ? `Abertura de $${Math.round(leader.weekGross / 1_000_000)}M.`
                : `Opening weekend $${Math.round(leader.weekGross / 1_000_000)}M.`,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH',
        });
    }
    const record = player.world.boxOfficeRecord?.opening || 0;
    const bestOpening = rows.reduce((best, row) => Math.max(best, row.weeksInRelease === 1 ? row.weekGross : 0), 0);
    if (bestOpening > record && bestOpening > 0) {
        const recordFilm = rows.find(row => row.weeksInRelease === 1 && row.weekGross === bestOpening);
        player.world.boxOfficeRecord = {
            opening: bestOpening,
            title: recordFilm?.title || leader?.title || 'Unknown',
            calendarYear,
            week: player.currentWeek,
        };
        if (record > 0) {
            news.push({
                id: `news_bo_record_${currentAbs}`,
                headline: pt
                    ? `${player.world.boxOfficeRecord.title} quebra o recorde de abertura.`
                    : `${player.world.boxOfficeRecord.title} breaks the opening record.`,
                subtext: pt ? 'Novo melhor fim de semana da carreira.' : 'A new best opening weekend.',
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'HIGH',
            });
        }
    }

    const clashing = (player.world.projects || []).filter(project => (project.run?.clashFactor || 1) < 0.9 && project.run?.weeklyGrosses?.length === 1);
    if (clashing.length >= 2) {
        news.push({
            id: `news_bo_clash_${currentAbs}`,
            headline: pt
                ? `${clashing[0].title} e ${clashing[1].title} dividem o mesmo público.`
                : `${clashing[0].title} and ${clashing[1].title} split the same audience.`,
            subtext: pt ? 'A abertura dos dois caiu por causa do choque.' : 'Both openings took a hit from the clash.',
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM',
        });
    }

    if (!leader) return { news, post: null };
    const lines = top.slice(0, 3).map((entry, index) => `${index + 1}. ${entry.title} ($${(entry.weekGross / 1_000_000).toFixed(1)}M)`).join(' · ');
    const post: XPost = {
        id: `x_boxoffice_${calendarYear}_${player.currentWeek}`,
        authorId: 'boxoffice_daily',
        authorName: 'Box Office Daily',
        authorHandle: '@boxofficedaily',
        authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=BoxOfficeDaily',
        content: pt
            ? `Bilheteria do fim de semana: ${lines} #IndustryGlobe`
            : `Weekend box office: ${lines} #IndustryGlobe`,
        timestamp: player.currentWeek,
        likes: 8000 + Math.floor(Math.random() * 14000),
        retweets: 1200,
        replies: 400,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'CAREER',
        sentiment: 'INDUSTRY',
        system: true,
    };
    return { news, post };
};

const migratePast = (player: Player) => {
    player.pastProjects = (player.pastProjects || []).map(project => {
        if (project.openingGross !== undefined && project.grossIsEstimate !== undefined) return project;
        if (project.openingGross !== undefined && project.weeklyGrosses?.length) return project;
        const theatrical = isTheatricalProject({ type: project.projectType, budget: project.budget });
        if (!theatrical || !(project.gross > 0)) {
            return { ...project, openingGross: project.openingGross || 0, grossIsEstimate: project.gross > 0 ? project.grossIsEstimate : false, calendarYear: project.calendarYear || gameCalendarYear(project.year || player.age) };
        }
        const weekly = project.weeklyGrosses?.length ? project.weeklyGrosses : estimateWeeklyGrosses(project.gross || 0);
        return {
            ...project,
            openingGross: project.openingGross ?? weekly[0] ?? 0,
            weeklyGrosses: weekly,
            calendarYear: project.calendarYear || gameCalendarYear(project.year || player.age),
            grossIsEstimate: project.weeklyGrosses?.length ? Boolean(project.grossIsEstimate) : true,
        };
    });
};

const migrateReleases = (player: Player) => {
    player.activeReleases = (player.activeReleases || []).map(release => {
        const weekly = Array.isArray(release.weeklyGross) ? release.weeklyGross : [];
        const calendarYear = release.releaseCalendarYear || gameCalendarYear(player.age);
        if (weekly.length > 0) {
            return {
                ...release,
                openingGross: release.openingGross ?? weekly[0],
                releaseCalendarYear: calendarYear,
                releaseWeek: release.releaseWeek || player.currentWeek,
                grossIsEstimate: release.grossIsEstimate ?? false,
            };
        }
        if ((release.totalGross || 0) > 0 && release.distributionPhase !== 'STREAMING') {
            const estimated = estimateWeeklyGrosses(release.totalGross);
            return {
                ...release,
                openingGross: release.openingGross ?? estimated[0] ?? 0,
                releaseCalendarYear: calendarYear,
                grossIsEstimate: true,
            };
        }
        return { ...release, releaseCalendarYear: calendarYear };
    });
};

/** Backfill weekly numbers and one current chart so older saves open without a blank hub. */
export const migrateBoxOfficeHistory = (player: Player): Player => {
    if (!player.world) return player;
    if (!Array.isArray(player.world.projects)) player.world.projects = [];
    if (!Array.isArray(player.world.upcomingRivals)) player.world.upcomingRivals = [];
    player.world.projects = player.world.projects.map(project => {
        if (project.run?.weeklyGrosses?.length) return project;
        if ((project.boxOffice || 0) > 0) return migrateProject(project);
        return attachRunSkeleton(project, gameCalendarYear(project.year || player.age), absoluteWeek(project.year || player.age, project.weekReleased || 1));
    });
    player.world.upcomingRivals = player.world.upcomingRivals.map(project => {
        const aheadAbs = project.run?.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || player.currentWeek);
        return attachRunSkeleton(project, gameCalendarYear(weekParts(aheadAbs).age), aheadAbs);
    });
    migratePast(player);
    migrateReleases(player);
    if (!Array.isArray(player.world.boxOfficeCharts)) player.world.boxOfficeCharts = [];
    if (player.world.boxOfficeCharts.length === 0) {
        publishBoxOfficeWeekend(player);
    }
    return player;
};

export interface HubFilm {
    id: string;
    name: string;
    calendarYear: number;
    gross: number;
    opening: number;
    studio: string;
    genre: string;
    isPlayer: boolean;
    isLive: boolean;
    grossIsEstimate: boolean;
    releaseWeek: number;
    budget: number;
    excluded: boolean;
}

export const hubFilms = (player: Player): HubFilm[] => {
    const films: HubFilm[] = [];
    (player.pastProjects || []).forEach(project => {
        const excluded = !isTheatricalProject({ type: project.projectType, budget: project.budget });
        films.push({
            id: project.id,
            name: project.name,
            calendarYear: project.calendarYear || gameCalendarYear(project.year || player.age),
            gross: project.gross || 0,
            opening: project.openingGross ?? (project.weeklyGrosses?.[0] ?? 0),
            studio: (project.studioId || 'Independent').replace(/_/g, ' '),
            genre: (project.genre || 'Drama').replace(/_/g, ' '),
            isPlayer: true,
            isLive: false,
            grossIsEstimate: Boolean(project.grossIsEstimate),
            releaseWeek: project.releaseWeek || 1,
            budget: project.budget || 0,
            excluded,
        });
    });
    (player.activeReleases || []).forEach(release => {
        const excluded = !isTheatricalProject({ type: release.type, budget: release.budget }) || release.distributionPhase === 'STREAMING';
        const theatrical = release.distributionPhase === 'THEATRICAL';
        films.push({
            id: release.id,
            name: release.name,
            calendarYear: release.releaseCalendarYear || gameCalendarYear(player.age),
            gross: release.totalGross || 0,
            opening: release.openingGross ?? release.weeklyGross?.[0] ?? 0,
            studio: (release.projectDetails?.studioId || 'Independent').replace(/_/g, ' '),
            genre: (release.projectDetails?.genre || 'Drama').replace(/_/g, ' '),
            isPlayer: true,
            isLive: theatrical,
            grossIsEstimate: Boolean(release.grossIsEstimate),
            releaseWeek: release.releaseWeek || player.currentWeek,
            budget: release.budget || 0,
            excluded: excluded && !theatrical,
        });
    });
    (player.world?.projects || []).forEach(project => {
        const run = project.run;
        const budget = run?.budgetUsd || 0;
        films.push({
            id: project.id,
            name: project.title,
            calendarYear: run?.calendarYear || gameCalendarYear(project.year || player.age),
            gross: run?.weeklyGrosses?.length ? sum(run.weeklyGrosses) : (project.boxOffice || 0),
            opening: run?.openingGross || run?.weeklyGrosses?.[0] || 0,
            studio: (project.studioId || 'Independent').replace(/_/g, ' '),
            genre: (project.genre || 'Drama').replace(/_/g, ' '),
            isPlayer: false,
            isLive: Boolean(run?.inTheaters),
            grossIsEstimate: Boolean(run?.grossIsEstimate),
            releaseWeek: project.weekReleased || 1,
            budget,
            excluded: budget <= 0 && !run?.weeklyGrosses?.length,
        });
    });
    const seen = new Set<string>();
    return films.filter(film => {
        if (film.excluded) return false;
        if (!(film.gross > 0 || film.isLive)) return false;
        if (seen.has(film.id)) return false;
        seen.add(film.id);
        return true;
    });
};

export const activeClashes = (player: Player): ClashWarning[] => {
    const films = collectClashFilms(player).filter(film => {
        const now = absoluteWeek(player.age, player.currentWeek);
        return Math.abs(film.releaseAbs - now) <= 1;
    });
    const seen = new Set<string>();
    const warnings: ClashWarning[] = [];
    films.forEach(film => {
        describeClash(film, films).forEach(warning => {
            const key = [film.id, warning.id].sort().join(':');
            if (seen.has(key)) return;
            seen.add(key);
            warnings.push({ ...warning, title: `${film.title} × ${warning.title}` });
        });
    });
    return warnings.slice(0, 6);
};
