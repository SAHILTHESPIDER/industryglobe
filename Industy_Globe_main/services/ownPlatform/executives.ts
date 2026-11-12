import {
    BoardTeamState,
    CartoonFace,
    CompanyExecutive,
    CompanyShareholder,
    ExecCandidate,
    ExecPosting,
    ExecRole,
    Player,
} from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { formatCompact } from './logic';
import { capSlices } from './stakeSale';

export const EXEC_ROLES: ExecRole[] = ['CFO', 'COO', 'CTO', 'CMO', 'CONTENT'];

export const roleLabel = (role: ExecRole): string => {
    if (role === 'CFO') return 'CFO';
    if (role === 'COO') return 'COO';
    if (role === 'CTO') return 'CTO';
    if (role === 'CMO') return 'CMO';
    return 'Head of Content';
};

export const roleEffect = (role: ExecRole): string => {
    if (role === 'CFO') return 'Lowers weekly costs and trims the interest on the bank facility.';
    if (role === 'COO') return 'Steadies operations and eases customer pressure.';
    if (role === 'CTO') return 'Cuts server burn and pulls piracy down.';
    if (role === 'CMO') return 'Widens reach. More homes find the service.';
    return 'Lifts the quality of what is on the shelf, and the weekly receipts.';
};

const TRAITS = [
    'Cost hawk',
    'Night owl',
    'Franchise mind',
    'Quiet closer',
    'Data first',
    'Talent whisperer',
    'Crisis calm',
    'Brand poet',
    'Rights hawk',
    'Global ear',
    'Long game',
    'Opening-night nerve',
];

interface Place {
    country: string;
    city: string;
    flag: string;
    names: string[];
}

const PLACES: Place[] = [
    { country: 'Nigeria', city: 'Lagos', flag: '🇳🇬', names: ['Adaeze Okonkwo', 'Tunde Balogun', 'Chioma Adeyemi'] },
    { country: 'South Korea', city: 'Seoul', flag: '🇰🇷', names: ['Minseo Park', 'Jae-won Choi', 'Hana Kim'] },
    { country: 'Brazil', city: 'São Paulo', flag: '🇧🇷', names: ['Helena Costa', 'Rafael Nogueira', 'Lia Ferreira'] },
    { country: 'India', city: 'Mumbai', flag: '🇮🇳', names: ['Ananya Shah', 'Kabir Mehta', 'Meera Iyer'] },
    { country: 'United Kingdom', city: 'London', flag: '🇬🇧', names: ['Priya Lang', 'Owen Blake', 'Amelia Ward'] },
    { country: 'France', city: 'Paris', flag: '🇫🇷', names: ['Camille Laurent', 'Noah Bernard', 'Inès Morel'] },
    { country: 'Japan', city: 'Tokyo', flag: '🇯🇵', names: ['Aiko Sato', 'Kenji Mori', 'Yuna Abe'] },
    { country: 'Mexico', city: 'Mexico City', flag: '🇲🇽', names: ['Camila Reyes', 'Diego Salazar', 'Luz Ortega'] },
    { country: 'Canada', city: 'Toronto', flag: '🇨🇦', names: ['Noah Singh', 'Maya Chen', 'Elliot Fraser'] },
    { country: 'Germany', city: 'Berlin', flag: '🇩🇪', names: ['Lena Vogel', 'Jonas Weber', 'Mara Klein'] },
    { country: 'Kenya', city: 'Nairobi', flag: '🇰🇪', names: ['Amina Otieno', 'David Kariuki', 'Zuri Mwangi'] },
    { country: 'Sweden', city: 'Stockholm', flag: '🇸🇪', names: ['Freja Lind', 'Erik Holm', 'Nora Ek'] },
    { country: 'United Arab Emirates', city: 'Dubai', flag: '🇦🇪', names: ['Layla Hassan', 'Omar Farid', 'Noor Alami'] },
    { country: 'Singapore', city: 'Singapore', flag: '🇸🇬', names: ['Mei Tan', 'Arun Lim', 'Sophie Goh'] },
    { country: 'Argentina', city: 'Buenos Aires', flag: '🇦🇷', names: ['Valentina Ruiz', 'Mateo Alvarez', 'Lola Pereyra'] },
    { country: 'South Africa', city: 'Johannesburg', flag: '🇿🇦', names: ['Thandi Nkosi', 'Johan Botha', 'Ayesha Patel'] },
    { country: 'Italy', city: 'Rome', flag: '🇮🇹', names: ['Giulia Romano', 'Marco Bianchi', 'Chiara Greco'] },
    { country: 'Spain', city: 'Madrid', flag: '🇪🇸', names: ['Lucia Navarro', 'Hugo Santos', 'Marta Vega'] },
    { country: 'Egypt', city: 'Cairo', flag: '🇪🇬', names: ['Nour Elmasry', 'Youssef Farouk', 'Salma Nazir'] },
    { country: 'Indonesia', city: 'Jakarta', flag: '🇮🇩', names: ['Sari Wijaya', 'Bima Putra', 'Dewi Hartono'] },
    { country: 'Ireland', city: 'Dublin', flag: '🇮🇪', names: ['Siobhan Kelly', 'Cian Byrne', 'Niamh Doyle'] },
    { country: 'Australia', city: 'Sydney', flag: '🇦🇺', names: ['Harper Quinn', 'Jack Nguyen', 'Ellie Brooks'] },
    { country: 'Poland', city: 'Warsaw', flag: '🇵🇱', names: ['Zofia Nowak', 'Adam Kowalski', 'Hanna Wójcik'] },
    { country: 'Ghana', city: 'Accra', flag: '🇬🇭', names: ['Akua Mensah', 'Kojo Boateng', 'Efua Darko'] },
];

const ROLES_OK = new Set<string>(EXEC_ROLES);

const faceFrom = (seed: number): CartoonFace => ({
    skin: seed % 8,
    hair: (seed >> 3) % 7,
    hairStyle: (seed >> 6) % 6,
    eyes: (seed >> 9) % 4,
    mouth: (seed >> 11) % 4,
    accessory: (seed >> 13) % 4,
    shirt: (seed >> 15) % 8,
});

export const faceFor = (seed: string): CartoonFace => faceFrom(hashString(seed));

export const placeFor = (name: string): { country: string; city: string; flag: string } | undefined => {
    const found = PLACES.find(place => place.names.includes(name));
    if (!found) return undefined;
    return { country: found.country, city: found.city, flag: found.flag };
};

export const flagForCountry = (country: string): string => PLACES.find(place => place.country === country)?.flag || '🌐';

const clampSkill = (value: number) => Math.max(40, Math.min(96, Math.round(value)));

const feeFor = (skill: number) => Math.max(8_000, Math.round((7_500 + skill * 480) / 500) * 500);

const HOUSES = ['Aurora Play', 'Harbor+', 'Kitebox', 'Lumen', 'Red Lantern', 'Paper Saints', 'Marigold', 'Northstream', 'Velvet Circuit', 'Glass Harbor'];
const POST_TITLES: Record<ExecRole, string[]> = {
    CFO: ['Finance director', 'VP finance', 'Controller'],
    COO: ['Operations director', 'VP operations', 'Studio manager'],
    CTO: ['Head of platform', 'VP technology', 'Infrastructure lead'],
    CMO: ['Marketing director', 'VP growth', 'Brand lead'],
    CONTENT: ['Head of originals', 'VP content', 'Commissioning editor'],
};
const WINS = [
    'Opened three new countries without raising the weekly burn.',
    'Brought a franchise in under the licence cap.',
    'Cut a cloud bill by a fifth and kept the night from breaking.',
    'Signed a sports window that lifted weekend viewing.',
    'Rebuilt the home screen and held more subscribers.',
    'Closed a slate of originals that travelled outside the home market.',
];

const postsFor = (role: ExecRole, roll: number): ExecPosting[] => {
    const titles = POST_TITLES[role];
    return [0, 1, 2].map(index => ({
        company: HOUSES[(roll + index * 3) % HOUSES.length],
        years: 2 + ((roll + index) % 5),
        title: titles[(roll + index) % titles.length],
    }));
};

export const RENEW_WEEKS = 8;

export interface HireTerms {
    annualSalary: number;
    termYears: number;
    signingBonus: number;
    /** Fraction, such as 0.02 for 2%. */
    stakePct: number;
}

export const annualOf = (exec: { annualSalary?: number; weeklyFee: number }) =>
    Math.max(1_000, Math.round(exec.annualSalary || exec.weeklyFee * 52));

export const weeklyOf = (exec: { annualSalary?: number; weeklyFee: number }) =>
    Math.max(1_000, Math.round(annualOf(exec) / 52));

const generateSlate = (playerId: string, week: number, year: number): ExecCandidate[] => {
    const used = new Set<string>();
    const rows: ExecCandidate[] = [];
    EXEC_ROLES.forEach((role, roleIndex) => {
        const seed = hashString(`${playerId}:${role}:${week}:${year}`);
        for (let slot = 0; slot < 4; slot += 1) {
            const roll = hashString(`${seed}:${slot}`);
            let place = PLACES[(roll + roleIndex * 3) % PLACES.length];
            let name = place.names[roll % place.names.length];
            let guard = 0;
            while (used.has(name) && guard < PLACES.length * 3) {
                place = PLACES[(roll + guard + 1) % PLACES.length];
                name = place.names[(roll + guard) % place.names.length];
                guard += 1;
            }
            used.add(name);
            const skill = clampSkill(48 + (roll % 46));
            const weeklyFee = feeFor(skill);
            const posts = postsFor(role, roll);
            rows.push({
                id: `cand_${role}_${slot}_${roll % 100000}`,
                role,
                name,
                country: place.country,
                city: place.city,
                skill,
                weeklyFee,
                annualAsk: weeklyFee * 52,
                stakeAppetite: (30 + (roll % 60)) / 100,
                posts,
                achievements: [WINS[roll % WINS.length], WINS[(roll + 3) % WINS.length]],
                totalYears: posts.reduce((sum, post) => sum + post.years, 0),
                trait: TRAITS[roll % TRAITS.length],
                face: faceFrom(roll),
            });
        }
    });
    return rows;
};

export const candidateSlate = (player: Player): ExecCandidate[] => {
    const id = player.id || 'player';
    const week = player.currentWeek || 1;
    const year = player.age || 18;
    return generateSlate(id, week, year);
};

const sanitizeFace = (raw: Partial<CartoonFace> | undefined, seed: string): CartoonFace => {
    const fallback = faceFor(seed);
    if (!raw || typeof raw !== 'object') return fallback;
    const num = (value: unknown, max: number, stand: number) => {
        const number = Math.round(Number(value));
        return Number.isFinite(number) ? ((number % max) + max) % max : stand;
    };
    return {
        skin: num(raw.skin, 8, fallback.skin),
        hair: num(raw.hair, 7, fallback.hair),
        hairStyle: num(raw.hairStyle, 6, fallback.hairStyle),
        eyes: num(raw.eyes, 4, fallback.eyes),
        mouth: num(raw.mouth, 4, fallback.mouth),
        accessory: num(raw.accessory, 4, fallback.accessory),
        shirt: num(raw.shirt, 8, fallback.shirt),
    };
};

const sanitizeExec = (raw: Partial<CompanyExecutive> | undefined): CompanyExecutive | null => {
    if (!raw || typeof raw !== 'object') return null;
    if (!ROLES_OK.has(String(raw.role))) return null;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : '';
    if (!name) return null;
    const skill = clampSkill(Number(raw.skill) || 60);
    const weeklyFee = Math.max(1_000, Math.round(Number(raw.weeklyFee) || feeFor(skill)));
    const hiredWeek = Math.max(1, Math.round(Number(raw.hiredWeek) || 1));
    const hiredYear = Math.max(1, Math.round(Number(raw.hiredYear) || 18));
    const termYears = Math.max(1, Math.min(5, Math.round(Number(raw.termYears) || 2)));
    const annualSalary = Math.max(weeklyFee, Math.round(Number(raw.annualSalary) || weeklyFee * 52));
    const hiredAbs = getAbsoluteWeek(hiredYear, hiredWeek);
    const endsAbsolute = Number.isFinite(Number(raw.endsAbsolute))
        ? Math.round(Number(raw.endsAbsolute))
        : hiredAbs + termYears * 52;
    const posts = Array.isArray(raw.posts)
        ? raw.posts.flatMap(post => {
            if (!post || typeof post.company !== 'string' || typeof post.title !== 'string') return [];
            return [{ company: post.company.slice(0, 40), title: post.title.slice(0, 40), years: Math.max(1, Math.min(20, Math.round(Number(post.years) || 1))) }];
        }).slice(0, 4)
        : undefined;
    return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 80) : `exec_${raw.role}_${hashString(name)}`,
        role: raw.role as ExecRole,
        name,
        country: typeof raw.country === 'string' && raw.country.trim() ? raw.country.slice(0, 40) : 'Unknown',
        city: typeof raw.city === 'string' && raw.city.trim() ? raw.city.slice(0, 40) : '',
        skill,
        weeklyFee,
        annualSalary,
        termYears,
        signingBonus: Math.max(0, Math.round(Number(raw.signingBonus) || 0)),
        stakePct: Math.max(0, Math.min(0.08, Number(raw.stakePct) || 0)),
        endsAbsolute,
        posts,
        achievements: Array.isArray(raw.achievements) ? raw.achievements.filter(line => typeof line === 'string').slice(0, 3) : undefined,
        totalYears: Number.isFinite(Number(raw.totalYears)) ? Math.round(Number(raw.totalYears)) : posts?.reduce((sum, post) => sum + post.years, 0),
        trait: typeof raw.trait === 'string' && raw.trait.trim() ? raw.trait.slice(0, 40) : 'Steady hand',
        face: sanitizeFace(raw.face, name),
        hiredWeek,
        hiredYear,
    };
};

/** Drops a broken team instead of inventing officers. One person per chair. */
export const sanitizeBoardTeam = (raw: BoardTeamState | undefined): BoardTeamState | undefined => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.executives)) return undefined;
    const seen = new Set<string>();
    const executives = raw.executives.flatMap(row => {
        const clean = sanitizeExec(row);
        if (!clean || seen.has(clean.role)) return [];
        seen.add(clean.role);
        return [clean];
    });
    if (!executives.length) return undefined;
    return { executives };
};

export interface ExecModifiers {
    /** Share of weekly burn removed. CFO plus a little from the COO. */
    costCut: number;
    /** Share of facility interest removed. CFO only. */
    financeRateCut: number;
    /** Share of the server line removed. CTO. */
    techCut: number;
    /** Points of piracy removed. CTO. */
    piracyCut: number;
    /** Extra reach on the household target. CMO. */
    reach: number;
    /** Extra weekly receipts. Head of Content. */
    quality: number;
    /** Customer-pressure points removed. COO. */
    pressureCut: number;
}

const skillOf = (team: BoardTeamState | undefined, role: ExecRole): number => {
    const row = team?.executives?.find(exec => exec.role === role);
    if (!row) return 0;
    return clampSkill(row.skill) / 100;
};

export const executiveModifiers = (team: BoardTeamState | undefined): ExecModifiers => {
    const cfo = skillOf(team, 'CFO');
    const coo = skillOf(team, 'COO');
    const cto = skillOf(team, 'CTO');
    const cmo = skillOf(team, 'CMO');
    const content = skillOf(team, 'CONTENT');
    return {
        costCut: Math.min(0.18, cfo * 0.12 + coo * 0.04),
        financeRateCut: Math.min(0.2, cfo * 0.18),
        techCut: Math.min(0.16, cto * 0.14),
        piracyCut: Math.min(0.08, cto * 0.07),
        reach: Math.min(0.14, cmo * 0.12),
        quality: Math.min(0.12, content * 0.1),
        pressureCut: Math.min(12, coo * 10),
    };
};

export const openRoles = (team: BoardTeamState | undefined): ExecRole[] => {
    const filled = new Set((team?.executives || []).map(row => row.role));
    return EXEC_ROLES.filter(role => !filled.has(role));
};

const cloneForHire = (player: Player): Player => {
    const state = player.ownPlatform!;
    return {
        ...player,
        logs: [...(player.logs || [])],
        money: player.money,
        ownPlatform: {
            ...state,
            books: state.books
                ? { ...state.books, lines: [...state.books.lines], history: [...(state.books.history || [])] }
                : state.books,
            boardTeam: state.boardTeam
                ? { executives: state.boardTeam.executives.map(row => ({ ...row, face: { ...row.face } })) }
                : undefined,
        },
    };
};

const clamp01 = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** How likely they sign, and a counter when the offer is close but short. */
export const readOffer = (candidate: ExecCandidate, terms: HireTerms): { chance: number; verdict: 'SIGN' | 'COUNTER' | 'WALK'; counter?: HireTerms } => {
    const ask = Math.max(1, candidate.annualAsk);
    const salary = clamp01(terms.annualSalary / ask, 0, 1.6);
    const years = clamp01(terms.termYears, 1, 5);
    const bonus = clamp01(terms.signingBonus / ask, 0, 1);
    const stake = clamp01(terms.stakePct, 0, 0.05);
    const score = salary * 0.72 + (years - 1) * 0.06 + bonus * 0.2 + stake * candidate.stakeAppetite * 5;
    const chance = Math.round(clamp01((score - 0.22) / 0.7, 0.04, 0.98) * 100) / 100;
    if (chance >= 0.7) return { chance, verdict: 'SIGN' };
    if (chance >= 0.38) {
        return {
            chance,
            verdict: 'COUNTER',
            counter: {
                annualSalary: Math.round(Math.max(terms.annualSalary, ask * 0.94) / 50_000) * 50_000,
                termYears: Math.max(years, 2),
                signingBonus: terms.signingBonus,
                stakePct: stake,
            },
        };
    }
    return { chance, verdict: 'WALK' };
};

export const stakeRoom = (player: Player, execId?: string): number => {
    const slices = capSlices(player);
    const held = (player.ownPlatform?.books?.shareholders || [])
        .filter(row => row.id === `exec-stake-${execId || ''}`)
        .reduce((sum, row) => sum + row.pct, 0);
    return Math.max(0, Math.round((slices.founder + held - 0.51) * 1000) / 1000);
};

const stakeId = (execId: string) => `exec-stake-${execId}`;

const writeStake = (player: Player, exec: { id: string; name: string }, pct: number) => {
    const state = player.ownPlatform;
    if (!state) return;
    const books = state.books;
    if (!books) return;
    const rest = (books.shareholders || []).filter(row => row.id !== stakeId(exec.id));
    if (pct <= 0.0005) {
        books.shareholders = rest.length ? rest : undefined;
        return;
    }
    const row: CompanyShareholder = {
        id: stakeId(exec.id),
        buyerId: exec.id,
        name: exec.name,
        kind: 'BUSINESS',
        pct: Math.round(pct * 1000) / 1000,
        paid: 0,
        week: player.currentWeek,
        year: player.age,
        conditions: [],
    };
    books.shareholders = [...rest, row];
};

const cleanTerms = (terms: HireTerms, room: number): HireTerms => ({
    annualSalary: Math.max(50_000, Math.round(terms.annualSalary / 50_000) * 50_000),
    termYears: Math.max(1, Math.min(5, Math.round(terms.termYears))),
    signingBonus: Math.max(0, Math.round(terms.signingBonus / 50_000) * 50_000),
    stakePct: Math.max(0, Math.min(room, Math.round(terms.stakePct * 200) / 200)),
});

/** Pays the bonus and the first week from company cash. A stake, if offered, comes off the founder's slice. */
export const signContract = (player: Player, candidateId: string, terms: HireTerms): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ first.' };
    const candidate = candidateSlate(player).find(row => row.id === candidateId);
    if (!candidate) return { player, error: 'That candidate is not on this week\'s slate.' };
    if ((player.ownPlatform.boardTeam?.executives || []).some(row => row.role === candidate.role)) {
        return { player, error: `The ${roleLabel(candidate.role)} chair is already filled.` };
    }
    const room = stakeRoom(player);
    const deal = cleanTerms(terms, room);
    const offer = readOffer(candidate, deal);
    if (offer.verdict !== 'SIGN') {
        return { player, error: offer.verdict === 'WALK' ? `${candidate.name} walked. The offer was too thin.` : `${candidate.name} has not accepted. Meet the counter, or improve the terms.` };
    }
    const due = deal.signingBonus + Math.round(deal.annualSalary / 52);
    if (readCompanyCash(player) < due) {
        return { player, error: `Company cash cannot cover ${formatCompact(due)}. Personal cash stays put.` };
    }
    const next = cloneForHire(player);
    const hired: CompanyExecutive = {
        ...candidate,
        face: { ...candidate.face },
        posts: candidate.posts.map(post => ({ ...post })),
        achievements: [...candidate.achievements],
        weeklyFee: Math.round(deal.annualSalary / 52),
        annualSalary: deal.annualSalary,
        termYears: deal.termYears,
        signingBonus: deal.signingBonus,
        stakePct: deal.stakePct,
        hiredWeek: next.currentWeek || 1,
        hiredYear: next.age || 18,
        endsAbsolute: getAbsoluteWeek(next.age || 18, next.currentWeek || 1) + deal.termYears * 52,
    };
    const previous = next.ownPlatform!.boardTeam?.executives || [];
    next.ownPlatform!.boardTeam = { executives: [...previous, hired] };
    if (deal.signingBonus > 0) addCompanyCash(next, -deal.signingBonus, `${candidate.name} signing bonus`, 'BURN');
    addCompanyCash(next, -hired.weeklyFee, `${candidate.name} · ${roleLabel(candidate.role)} salary`, 'BURN');
    if (deal.stakePct > 0) writeStake(next, hired, deal.stakePct);
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `Hired ${candidate.name} as ${roleLabel(candidate.role)} for ${deal.termYears} years. ${formatCompact(due)} left company cash.`,
        type: 'neutral',
    }];
    return { player: next };
};

/** Signs at the candidate's yearly ask for two years. Used when a hire has no negotiated sheet. */
export const hireExecutive = (player: Player, candidateId: string): { player: Player; error?: string } => {
    const candidate = candidateSlate(player).find(row => row.id === candidateId);
    if (!candidate) return { player, error: 'That candidate is not on this week\'s slate.' };
    return signContract(player, candidateId, {
        annualSalary: candidate.annualAsk,
        termYears: 2,
        signingBonus: 0,
        stakePct: 0,
    });
};

export const releaseExecutive = (player: Player, execId: string): { player: Player; error?: string } => {
    if (!player.ownPlatform?.boardTeam) return { player, error: 'That chair is already empty.' };
    const row = player.ownPlatform.boardTeam.executives.find(exec => exec.id === execId);
    if (!row) return { player, error: 'That officer has already left.' };
    const next = cloneForHire(player);
    const left = (next.ownPlatform!.boardTeam?.executives || []).filter(exec => exec.id !== execId);
    next.ownPlatform!.boardTeam = left.length ? { executives: left } : undefined;
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `${row.name} left the ${roleLabel(row.role)} chair. No cheque. The weekly salary stops.`,
        type: 'neutral',
    }];
    return { player: next };
};

/** Later weeks. The hire week was already paid. Never touches personal cash. `paid` is this week's payroll. */
export const weeksLeft = (player: Player, exec: CompanyExecutive): number => {
    if (!Number.isFinite(exec.endsAbsolute)) return 999;
    return (exec.endsAbsolute as number) - getAbsoluteWeek(player.age, player.currentWeek);
};

/** New terms for someone already in the chair. Buy-back pays the stake's share of company value from company cash. */
export const renewContract = (
    player: Player,
    execId: string,
    terms: HireTerms,
    buyBack: boolean,
    buyPrice: number,
): { player: Player; error?: string } => {
    const exec = player.ownPlatform?.boardTeam?.executives.find(row => row.id === execId);
    if (!exec || !player.ownPlatform) return { player, error: 'That officer is not at the table.' };
    const room = stakeRoom(player, execId);
    const deal = cleanTerms(terms, room);
    const due = deal.signingBonus + (buyBack && (exec.stakePct || 0) > 0 ? Math.max(0, Math.round(buyPrice)) : 0);
    if (readCompanyCash(player) < due) {
        return { player, error: `Company cash cannot cover ${formatCompact(due)}. Personal cash stays put.` };
    }
    const next = cloneForHire(player);
    const team = next.ownPlatform!.boardTeam!.executives.map(row => {
        if (row.id !== execId) return row;
        return {
            ...row,
            weeklyFee: Math.round(deal.annualSalary / 52),
            annualSalary: deal.annualSalary,
            termYears: deal.termYears,
            signingBonus: deal.signingBonus,
            stakePct: buyBack ? 0 : deal.stakePct,
            endsAbsolute: getAbsoluteWeek(next.age, next.currentWeek) + deal.termYears * 52,
        };
    });
    next.ownPlatform!.boardTeam = { executives: team };
    const seated = team.find(row => row.id === execId)!;
    if (deal.signingBonus > 0) addCompanyCash(next, -deal.signingBonus, `${seated.name} renewal bonus`, 'BURN');
    if (buyBack && (exec.stakePct || 0) > 0) {
        addCompanyCash(next, -Math.max(0, Math.round(buyPrice)), `Bought back ${seated.name}'s stake`, 'EQUITY');
        writeStake(next, seated, 0);
    } else {
        writeStake(next, seated, deal.stakePct);
    }
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `Renewed ${seated.name} for ${deal.termYears} years. The money left company cash.`,
        type: 'neutral',
    }];
    return { player: next };
};

/** Drops officers whose contract ended. Their stake, if any, stays on the cap table. */
export const tickExecContracts = (player: Player): { msg: string; type: 'neutral' }[] => {
    const team = player.ownPlatform?.boardTeam?.executives;
    if (!team?.length || !player.ownPlatform) return [];
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const kept = team.filter(exec => !Number.isFinite(exec.endsAbsolute) || (exec.endsAbsolute as number) >= now);
    const gone = team.filter(exec => Number.isFinite(exec.endsAbsolute) && (exec.endsAbsolute as number) < now);
    if (!gone.length) return [];
    player.ownPlatform.boardTeam = kept.length ? { executives: kept } : undefined;
    return gone.map(exec => ({
        msg: `${exec.name}'s contract ended. The chair is empty. Their stake, if they held one, stays on the books.`,
        type: 'neutral' as const,
    }));
};

export const payExecutiveSalaries = (player: Player): { notes: { msg: string; type: 'neutral' }[]; paid: number } => {
    const rows = player.ownPlatform?.boardTeam?.executives || [];
    const notes: { msg: string; type: 'neutral' }[] = [];
    let paid = 0;
    rows.forEach(exec => {
        if (exec.hiredWeek === player.currentWeek && exec.hiredYear === player.age) return;
        const fee = weeklyOf(exec);
        addCompanyCash(player, -fee, `${exec.name} · ${roleLabel(exec.role)} salary`, 'BURN');
        paid += fee;
        notes.push({ msg: `${exec.name} (${roleLabel(exec.role)}) took ${formatCompact(fee)} from company cash.`, type: 'neutral' });
    });
    return { notes, paid };
};
