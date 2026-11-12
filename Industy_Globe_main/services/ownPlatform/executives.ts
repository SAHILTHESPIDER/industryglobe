import {
    BoardTeamState,
    CartoonFace,
    CompanyExecutive,
    ExecCandidate,
    ExecRole,
    Player,
} from '../../types';
import { hashString } from './catalog';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { formatCompact } from './logic';

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
            rows.push({
                id: `cand_${role}_${slot}_${roll % 100000}`,
                role,
                name,
                country: place.country,
                city: place.city,
                skill,
                weeklyFee: feeFor(skill),
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
    return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 80) : `exec_${raw.role}_${hashString(name)}`,
        role: raw.role as ExecRole,
        name,
        country: typeof raw.country === 'string' && raw.country.trim() ? raw.country.slice(0, 40) : 'Unknown',
        city: typeof raw.city === 'string' && raw.city.trim() ? raw.city.slice(0, 40) : '',
        skill,
        weeklyFee: Math.max(1_000, Math.round(Number(raw.weeklyFee) || feeFor(skill))),
        trait: typeof raw.trait === 'string' && raw.trait.trim() ? raw.trait.slice(0, 40) : 'Steady hand',
        face: sanitizeFace(raw.face, name),
        hiredWeek: Math.max(1, Math.round(Number(raw.hiredWeek) || 1)),
        hiredYear: Math.max(1, Math.round(Number(raw.hiredYear) || 18)),
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

/** Pays the first week from company cash. Personal cash is not read or written. */
export const hireExecutive = (player: Player, candidateId: string): { player: Player; error?: string } => {
    if (!player.ownPlatform) return { player, error: 'Open Empire+ first.' };
    const candidate = candidateSlate(player).find(row => row.id === candidateId);
    if (!candidate) return { player, error: 'That candidate is not on this week\'s slate.' };
    if ((player.ownPlatform.boardTeam?.executives || []).some(row => row.role === candidate.role)) {
        return { player, error: `The ${roleLabel(candidate.role)} chair is already filled.` };
    }
    if (readCompanyCash(player) < candidate.weeklyFee) {
        return { player, error: `Company cash cannot cover ${formatCompact(candidate.weeklyFee)} for the first week. Personal cash stays put.` };
    }
    const next = cloneForHire(player);
    const hired: CompanyExecutive = {
        ...candidate,
        face: { ...candidate.face },
        hiredWeek: next.currentWeek || 1,
        hiredYear: next.age || 18,
    };
    const previous = next.ownPlatform!.boardTeam?.executives || [];
    next.ownPlatform!.boardTeam = { executives: [...previous, hired] };
    addCompanyCash(next, -candidate.weeklyFee, `${candidate.name} · ${roleLabel(candidate.role)} salary`, 'BURN');
    next.logs = [...(next.logs || []), {
        week: next.currentWeek,
        year: next.age,
        message: `Hired ${candidate.name} as ${roleLabel(candidate.role)}. ${formatCompact(candidate.weeklyFee)} left company cash.`,
        type: 'neutral',
    }];
    return { player: next };
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

/** Later weeks. The hire week was already paid. Never touches personal cash. */
export const payExecutiveSalaries = (player: Player): { msg: string; type: 'neutral' }[] => {
    const rows = player.ownPlatform?.boardTeam?.executives || [];
    const notes: { msg: string; type: 'neutral' }[] = [];
    rows.forEach(exec => {
        if (exec.hiredWeek === player.currentWeek && exec.hiredYear === player.age) return;
        const fee = Math.max(0, Math.round(exec.weeklyFee) || 0);
        if (!fee) return;
        addCompanyCash(player, -fee, `${exec.name} · ${roleLabel(exec.role)} salary`, 'BURN');
        notes.push({ msg: `${exec.name} (${roleLabel(exec.role)}) took ${formatCompact(fee)} from company cash.`, type: 'neutral' });
    });
    return notes;
};
