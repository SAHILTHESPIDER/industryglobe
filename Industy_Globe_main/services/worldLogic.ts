
import { WorldState, IndustryProject, StudioId, BudgetTier, Genre, Player, NPCActor, NewsItem, UniverseId, Universe, Festival, TargetAudience, FilmIndustryId } from '../types';
import { STUDIO_CATALOG } from './studioLogic';
import { NPC_DATABASE, calculateProjectFameMultiplier, captureNpcEconomy, syncNpcRoster } from './npcLogic';
import { generateProjectTitle, getEstimatedBudget, generateProjectDetails, sanitizeGross } from './roleLogic';
import { initUniverses, normalizeUniverseMap, processUniverseTurn } from './universeLogic';
import { processNpcVentures, syncNpcVenturesToStudios } from './npcVentureLogic';
import { ALL_GENRES } from './genreCatalog';
import { absoluteWeek, attachRunSkeleton, creditName, gameCalendarYear, simulateIndustryWeek, weekParts } from './boxOfficeSim';
import { INDUSTRY_ENGINE, calendarImpact, industryById, pickWeightedGenre, ratingForRoll, theatricalMultiplier } from './industryEngine';
import { INDUSTRY_ORDER } from './scriptDesk/catalog';
import { saveTalentPool } from './playerTalent';

// Helpers
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const GENRES: Genre[] = ALL_GENRES;

export const FESTIVALS: Festival[] = [
    { id: 'sundance', name: 'Sundance Film Festival', weeks: [3, 4], prestigeReq: 60, cost: 100000, description: 'Best for Indie/Limited releases. High prestige boost.' },
    { id: 'berlin', name: 'Berlin International Film Festival', weeks: [7, 8], prestigeReq: 68, cost: 180000, description: 'A winter competition slot. Serious films, serious buyers.' },
    { id: 'cannes', name: 'Cannes Film Festival', weeks: [19, 20, 21], prestigeReq: 80, cost: 500000, description: 'The most prestigious festival in the world. High quality required.' },
    { id: 'venice', name: 'Venice Film Festival', weeks: [35, 36], prestigeReq: 76, cost: 400000, description: 'The Golden Lion room. Prestige first, commerce second.' },
    { id: 'tiff', name: 'Toronto International Film Festival', weeks: [36, 37, 38], prestigeReq: 70, cost: 250000, description: 'The Oscar Launchpad. Great for building awards buzz.' }
];

export const CALENDAR_EVENTS = [
    { week: 1, name: 'New Year Weekend', impact: 1.2, description: 'High attendance for family films.' },
    { week: 7, name: 'Valentines Day', impact: 1.3, description: 'Massive boost for Romances.' },
    { week: 18, name: 'Summer Kickoff', impact: 1.4, description: 'Blockbuster season begins.' },
    { week: 26, name: 'July 4th Weekend', impact: 1.5, description: 'Peak summer attendance.' },
    { week: 44, name: 'Halloween', impact: 1.4, description: 'Horror movies dominate.' },
    { week: 47, name: 'Thanksgiving', impact: 1.3, description: 'Family movie peak.' },
    { week: 51, name: 'Christmas Week', impact: 1.6, description: 'The biggest week of the year.' }
];

// 1. Generate an Industry Project
const screenActors = () => NPC_DATABASE.filter(n => n.occupation === 'ACTOR' && (!n.talentKind || n.talentKind === 'ACTOR'));

export const generateIndustryProject = (
    currentWeek: number, 
    year: number, 
    forcedLead?: NPCActor,
    industryId?: FilmIndustryId,
    extraActors: NPCActor[] = [],
): IndustryProject => {
    const industry: FilmIndustryId = industryId && INDUSTRY_ENGINE[industryId] ? industryId : 'HOLLYWOOD';
    const engine = industryById(industry);

    // Hollywood still draws from the studio catalog. Other industries keep a catalog id for old readers and a local banner for the marquee.
    const studioId = (industry === 'HOLLYWOOD'
        ? pick(Object.keys(STUDIO_CATALOG))
        : 'ARTISAN_PICTURES') as StudioId;
    const studio = STUDIO_CATALOG[studioId];
    const regionalStudioName = industry === 'HOLLYWOOD' ? undefined : pick(engine.studios);
    
    // Pick Budget based on studio comfort. Smaller markets rarely open a Hollywood blockbuster.
    const tier = industry === 'HOLLYWOOD'
        ? pick(studio.budgetComfort)
        : pick(engine.marketScale < 0.35 ? ['LOW', 'MID', 'MID'] as BudgetTier[] : ['LOW', 'MID', 'HIGH'] as BudgetTier[]);
    
    const week = currentWeek > 52 ? ((currentWeek - 1) % 52) + 1 : currentWeek;
    const genre = industry === 'HOLLYWOOD'
        ? pick(GENRES)
        : pickWeightedGenre(industry, GENRES, Math.floor(Math.random() * 100000));
    
    // Pick Lead Actor. Most leads are local. A minority cross over, which is how stars move between industries.
    let lead: NPCActor;
    let partnerIndustryId: FilmIndustryId | undefined;
    if (forcedLead) {
        lead = forcedLead;
        if ((forcedLead.homeIndustryId || 'HOLLYWOOD') !== industry) partnerIndustryId = forcedLead.homeIndustryId;
    } else {
        const actors = [...screenActors(), ...extraActors.filter(actor => actor.occupation === 'ACTOR' && !actor.retired && actor.id !== 'PLAYER_CAST')];
        const local = actors.filter(n => (n.homeIndustryId || 'HOLLYWOOD') === industry);
        const outside = actors.filter(n => (n.homeIndustryId || 'HOLLYWOOD') !== industry);
        const cross = outside.length > 0 && Math.random() < engine.crossoverOpenness * 0.28;
        let pool = cross ? outside : (local.length ? local : actors);
        if (tier === 'HIGH') pool = pool.filter(n => n.tier === 'A_LIST' || n.tier === 'ESTABLISHED' || n.tier === 'ICON');
        else if (tier === 'MID') pool = pool.filter(n => n.tier === 'ESTABLISHED' || n.tier === 'RISING' || n.tier === 'A_LIST');
        else pool = pool.filter(n => n.tier === 'RISING' || n.tier === 'INDIE' || n.tier === 'ESTABLISHED' || n.tier === 'UNKNOWN');
        const fallback = local.length ? local : actors;
        lead = pick(pool.length > 0 ? pool : fallback);
        if (cross && lead && (lead.homeIndustryId || 'HOLLYWOOD') !== industry) partnerIndustryId = lead.homeIndustryId;
    }

    const directors = NPC_DATABASE.filter(n => n.occupation === 'DIRECTOR');
    const localDirectors = directors.filter(n => (n.homeIndustryId || 'HOLLYWOOD') === industry);
    const director = pick((localDirectors.length && Math.random() > 0.25 ? localDirectors : directors)) || NPC_DATABASE[0];

    // Generate Quality
    const leadTalent = lead.stats?.talent || 50;
    const budgetBonus = tier === 'HIGH' ? 20 : tier === 'MID' ? 10 : 0;
    const rng = Math.random() * 30;
    
    let directorSkill = 70;
    if (director.name === "Nyanika Mishra") directorSkill = 100; 
    else if (director.tier === 'A_LIST') directorSkill = 90;
    else if (director.tier === 'ESTABLISHED') directorSkill = 75;

    // Boosted quality formula to ensure ~50% of movies are decent (above 60) for awards
    const quality = Math.min(100, Math.floor((leadTalent + directorSkill + budgetBonus + rng) / 3) + 5);

    const budget = getEstimatedBudget(tier);
    const knownLead = NPC_DATABASE.some(npc => npc.id === lead.id);
    const fameMultiplier = calculateProjectFameMultiplier(
        [lead.id],
        director.name,
        0,
        knownLead ? undefined : lead.stats?.talent,
        knownLead ? 0 : (lead.stats?.fame || 0),
    );
    const qualityMod = quality / 50;
    
    let luck = 0.5 + Math.random();
    if (director.name === "Nyanika Mishra") luck = Math.max(luck, 1.5);
 
    const safeBudget = Number.isFinite(budget) ? budget : 0;
    let projected = safeBudget * fameMultiplier * qualityMod * luck;
    if (tier === 'HIGH' && projected < safeBudget) projected = safeBudget * 0.8;
    if (industry !== 'HOLLYWOOD') projected *= theatricalMultiplier(industry) * calendarImpact(industry, week, genre);
    if (partnerIndustryId) projected *= 0.92 + engine.crossoverOpenness * 0.12;
    const boxOffice = 0; 
    
    let review = "MIXED";
    if (quality > 80) review = "HIT";
    else if (quality < 40) review = "FLOP";

    const rating = ratingForRoll(industry, Math.floor(Math.random() * 1000));
    const targetAudience: TargetAudience = rating.minAge >= 18 ? 'NC-17' : rating.minAge >= 17 ? 'R' : rating.minAge >= 13 ? 'PG-13' : rating.minAge >= 8 ? 'PG' : 'G';

    const openedAbs = absoluteWeek(year, week);
    const project: IndustryProject = {
        id: `ind_proj_${Date.now()}_${Math.random()}`,
        title: generateProjectTitle([]),
        genre,
        targetAudience,
        studioId,
        budgetTier: tier,
        quality,
        boxOffice: sanitizeGross(boxOffice),
        year,
        weekReleased: week,
        leadActorId: lead.id,
        leadActorName: creditName(lead.name, (lead.age ?? 40) < 100),
        directorName: creditName(director.name, (director.age ?? 50) < 100),
        reviews: review,
        originIndustryId: industry,
        partnerIndustryId,
        regionalStudioName,
        censorRating: rating.label,
    };
    const seeded = attachRunSkeleton(project, gameCalendarYear(year), openedAbs);
    if (seeded.run) seeded.run.projectedGross = sanitizeGross(projected);
    seeded.run && (seeded.run.budgetUsd = safeBudget);
    return seeded;
};

// 2. Process World Turn (Runs Weekly)
export const processWorldTurn = (player: Player): { world: WorldState, news: NewsItem[], logs: string[] } => {
    syncNpcRoster(player.world?.npcEconomy ?? null);
    const customCast = saveTalentPool(player);
    let newWorld = { ...player.world };
    const news: NewsItem[] = [];
    const logs: string[] = [];
    if (!newWorld.npcVentures) newWorld.npcVentures = {};
    newWorld = syncNpcVenturesToStudios(newWorld);
    if (!newWorld.studios) newWorld.studios = {};
    Object.values(STUDIO_CATALOG).forEach(studio => {
        if (!newWorld.studios![studio.id]) {
            newWorld.studios![studio.id] = {
                id: studio.id,
                name: studio.name,
                valuation: studio.valuation,
                reputation: Math.round(Math.min(98, 72 + (studio.qualityBias.script * 8) + (studio.qualityBias.distribution * 5))),
                cashReserve: Math.round(studio.valuation * 120),
                recentHits: 0,
                archetype: studio.archetype
            };
        }
    });
    newWorld.universes = normalizeUniverseMap(newWorld.universes);

    // --- A. MAINTAIN RIVAL SCHEDULE ---
    // Each of the next 12 weeks opens 3 to 6 films. The count is fixed for that
    // absolute week, so an older save (which scheduled 2) tops up once and then holds.
    if (!newWorld.upcomingRivals) newWorld.upcomingRivals = [];

    const rivalAbs = (project: IndustryProject) => project.run?.openedAbsoluteWeek || absoluteWeek(project.year || player.age, project.weekReleased || player.currentWeek);
    const nowAbs = absoluteWeek(player.age, player.currentWeek);
    const RIVAL_HORIZON = 12;
    const rivalTarget = (abs: number) => 3 + (Math.abs(Math.trunc(abs)) % 4);

    const stampOpening = (project: IndustryProject, openAbs: number) => {
        const parts = weekParts(openAbs);
        if (project.run) {
            project.run.openedAbsoluteWeek = openAbs;
            project.run.calendarYear = gameCalendarYear(parts.age);
            project.run.inTheaters = false;
        }
        project.year = parts.age;
        project.weekReleased = parts.week;
        return project;
    };

    // --- B. RELEASE RIVALS THAT ARE DUE ---
    const due = newWorld.upcomingRivals.filter(project => rivalAbs(project) <= nowAbs);
    newWorld.upcomingRivals = newWorld.upcomingRivals.filter(project => rivalAbs(project) > nowAbs);

    const openingThisWeek = due.filter(project => rivalAbs(project) === nowAbs);
    const overdue = due.filter(project => rivalAbs(project) < nowAbs);
    const targetNow = rivalTarget(nowAbs);
    const industryForSlot = (abs: number, slot: number): FilmIndustryId =>
        INDUSTRY_ORDER[(Math.abs(Math.trunc(abs)) + slot) % INDUSTRY_ORDER.length];

    while (openingThisWeek.length < targetNow) {
        openingThisWeek.push(stampOpening(generateIndustryProject(player.currentWeek, player.age, undefined, industryForSlot(nowAbs, openingThisWeek.length), customCast), nowAbs));
    }
    const releasing = [...overdue, ...openingThisWeek];

    for (let ahead = 1; ahead <= RIVAL_HORIZON; ahead += 1) {
        const openAbs = nowAbs + ahead;
        const target = rivalTarget(openAbs);
        let scheduled = newWorld.upcomingRivals.filter(project => rivalAbs(project) === openAbs).length;
        while (scheduled < target) {
            const parts = weekParts(openAbs);
            newWorld.upcomingRivals.push(stampOpening(generateIndustryProject(parts.week, parts.age, undefined, industryForSlot(openAbs, scheduled), customCast), openAbs));
            scheduled += 1;
        }
    }

    const seenIndustries = new Set(
        [...(newWorld.projects || []), ...newWorld.upcomingRivals].map(project => project.originIndustryId || 'HOLLYWOOD')
    );
    let extra = 0;
    INDUSTRY_ORDER.forEach(id => {
        if (seenIndustries.has(id) || extra >= 4) return;
        const openAbs = nowAbs + 1 + extra;
        const parts = weekParts(openAbs);
        newWorld.upcomingRivals.push(stampOpening(generateIndustryProject(parts.week, parts.age, undefined, id, customCast), openAbs));
        extra += 1;
    });

    newWorld.upcomingRivals.sort((a, b) => rivalAbs(a) - rivalAbs(b));
    releasing.forEach(project => {
        newWorld.projects.unshift(project);

        // Find and Pay the Lead Actor
        const lead = NPC_DATABASE.find(n => n.id === project.leadActorId);
        if (lead && lead.stats) {
            // Fame Boost
            const fameGain = project.budgetTier === 'HIGH' ? 3 : project.budgetTier === 'MID' ? 1 : 0.3;
            lead.stats.fame = Math.min(100, lead.stats.fame + fameGain);
            
            // Salary Logic
            let salary = 0;
            if (project.budgetTier === 'HIGH') {
                salary = 12000000 + Math.floor(Math.random() * 18000000); // $12M - $30M
            } else if (project.budgetTier === 'MID') {
                salary = 1500000 + Math.floor(Math.random() * 3500000); // $1.5M - $5M
            } else {
                salary = 50000 + Math.floor(Math.random() * 200000); // $50k - $250k
            }

            // Backend Logic
            const estimatedBudget = getEstimatedBudget(project.budgetTier);
            const trackedGross = project.run?.projectedGross || project.boxOffice;
            if (trackedGross > estimatedBudget * 2.5 && project.budgetTier !== 'LOW') {
                const points = 0.01 + (Math.random() * 0.03);
                const backend = Math.floor(trackedGross * points);
                salary += backend;
            }

            const market = project.originIndustryId && project.originIndustryId !== 'HOLLYWOOD'
                ? INDUSTRY_ENGINE[project.originIndustryId].marketScale
                : 1;
            lead.netWorth += Math.floor(salary * Math.max(0.2, market));
        }

        const trackedGross = project.run?.projectedGross || project.boxOffice;
        const isHit = trackedGross > getEstimatedBudget(project.budgetTier) * 3;
        const isFlop = trackedGross > 0 && trackedGross < getEstimatedBudget(project.budgetTier) * 0.8;
        
        if (project.budgetTier === 'HIGH' || isHit || isFlop || project.directorName === "Nyanika Mishra") {
            const marketName = project.originIndustryId && project.originIndustryId !== 'HOLLYWOOD'
                ? industryById(project.originIndustryId).name
                : '';
            let headline = marketName ? `${marketName}: '${project.title}' releases this week.` : `'${project.title}' releases this week.`;
            if (isHit) headline = `Global Smash: '${project.title}' dominates box office.`;
            if (isFlop) headline = `Box Office Disaster: '${project.title}' flops hard.`;
            if (project.quality > 90) headline = `Masterpiece: Critics hail '${project.title}' as best of year.`;
            
            if (project.directorName === "Nyanika Mishra") {
                headline = `Visionary Nyanika Mishra delivers another hit with '${project.title}'.`;
            }

            news.push({
                id: `news_world_${project.id}`,
                headline,
                subtext: `Starring ${project.leadActorName}. Directed by ${project.directorName}.${project.regionalStudioName ? ` ${project.regionalStudioName}.` : ''}${project.censorRating ? ` Rated ${project.censorRating}.` : ''}`,
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: isHit || isFlop ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    // --- C. SIMULATE NPC ECONOMY (Passive) ---
    // Apply small market fluctuations to all NPCs to keep the Forbes list dynamic
    NPC_DATABASE.forEach(npc => {
        // -0.5% to +1.0% weekly swing
        const percentChange = (Math.random() * 0.015) - 0.005; 
        const change = Math.floor(npc.netWorth * percentChange);
        npc.netWorth += change;
    });

    // --- D. EVOLVE PLATFORMS & STUDIOS ---
    if (newWorld.platforms) {
        Object.values(newWorld.platforms).forEach(platform => {
            // Subscribers grow or shrink slightly based on reputation and recent hits
            const hitBonus = platform.recentHits * 0.5; // 0.5M subs per recent hit
            const churnPenalty = platform.churnRate === 'FAST' ? 0.3 : platform.churnRate === 'MEDIUM' ? 0.1 : 0;
            const subChange = (Math.random() * 2 - 0.8) + hitBonus - churnPenalty; // -0.8M to +1.2M base
            platform.subscribers = Math.max(1, platform.subscribers + subChange);
            
            // Valuation fluctuates based on subscribers
            const valChange = (platform.subscribers * 0.05) * (Math.random() * 0.1 - 0.04);
            platform.valuation = Math.max(1, platform.valuation + valChange);
            
            // Cash reserve grows slowly, drops if they buy something (handled elsewhere)
            platform.cashReserve += Math.floor(platform.subscribers * 0.1); 
            
            // Decay recent hits slowly
            if (Math.random() < 0.1 && platform.recentHits > 0) {
                platform.recentHits--;
            }
        });
    }

    if (newWorld.studios) {
        Object.values(newWorld.studios).forEach(studio => {
            if (studio.isNpcVenture) return;
            // Valuation fluctuates
            const valChange = studio.valuation * (Math.random() * 0.02 - 0.009); // -0.9% to +1.1%
            studio.valuation = Math.max(1, studio.valuation + valChange);
            
            // Cash reserve grows
            studio.cashReserve += Math.floor(studio.valuation * 0.5);
            
            // Decay recent hits
            if (Math.random() < 0.1 && studio.recentHits > 0) {
                studio.recentHits--;
            }
        });
    }

    const ventureResult = processNpcVentures(player, newWorld);
    newWorld = ventureResult.world;
    news.push(...ventureResult.news);
    logs.push(...ventureResult.logs);
    newWorld.universes = normalizeUniverseMap(newWorld.universes);

    if (!newWorld.universes || Object.keys(newWorld.universes).length === 0) {
        newWorld.universes = initUniverses();
    }

    (Object.keys(newWorld.universes) as UniverseId[]).forEach(uid => {
        const uni = newWorld.universes[uid];
        const res = processUniverseTurn(player, uni);
        newWorld.universes[uid] = res.universe;
        news.push(...res.news);
        
        if (res.project) {
            const stamped = attachRunSkeleton({
                ...res.project,
                leadActorName: creditName(res.project.leadActorName),
                directorName: creditName(res.project.directorName),
            }, gameCalendarYear(player.age), nowAbs);
            if (stamped.run) {
                stamped.run.openedAbsoluteWeek = nowAbs;
                stamped.run.projectedGross = res.project.boxOffice;
                stamped.run.budgetUsd = getEstimatedBudget(res.project.budgetTier);
            }
            stamped.boxOffice = 0;
            stamped.year = player.age;
            stamped.weekReleased = player.currentWeek;
            newWorld.projects.unshift(stamped);
            news.push({
                id: `news_uni_rel_${res.project.id}`,
                headline: `Universe Release: ${res.project.title} lands in theaters.`,
                category: 'UNIVERSE',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'HIGH'
            });
        }
    });

    // Shared calendar. A higher cap so eleven industries are not wiped by one Hollywood month.
    if (newWorld.projects.length > 180) {
        newWorld.projects = newWorld.projects.slice(0, 180);
    }

    newWorld.projects = simulateIndustryWeek({ ...player, world: newWorld });
    if (newWorld.projects.length > 180) {
        newWorld.projects = newWorld.projects.slice(0, 180);
    }

    const industries = { ...(newWorld.industries || {}) };
    INDUSTRY_ORDER.forEach(id => {
        const prior = industries[id];
        industries[id] = {
            trendingGenre: prior?.trendingGenre || (id === 'HOLLYWOOD' ? newWorld.trendingGenre : 'DRAMA'),
            projects: newWorld.projects.filter(project => (project.originIndustryId || 'HOLLYWOOD') === id).slice(0, 24),
            awardHistory: id === 'HOLLYWOOD' ? (newWorld.awardHistory || []) : (prior?.awardHistory || []),
        };
    });
    newWorld.industries = industries;

    newWorld.npcEconomy = captureNpcEconomy();
    return { world: newWorld, news, logs };
};
