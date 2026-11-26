import { FilmIndustryId } from '../types';

export type StartingPathId =
    | 'STAGE_KID'
    | 'FILM_SCHOOL'
    | 'STREET_PERFORMER'
    | 'WRITERS_ROOM'
    | 'INFLUENCER'
    | 'FAMILY_BUSINESS';

export type StartingTraitId =
    | 'NATURAL'
    | 'WORKHORSE'
    | 'CHARMER'
    | 'METHOD'
    | 'SHOWMAN'
    | 'QUIET_PRO';

export interface PathDef {
    id: StartingPathId;
    name: string;
    line: string;
    /** Free first level, before the point pool. */
    grant: { kind: 'acting' | 'genre'; key: string };
    followers: number;
}

export interface TraitDef {
    id: StartingTraitId;
    name: string;
    line: string;
    grant: { kind: 'acting' | 'genre'; key: string };
}

export const STARTING_PATHS: PathDef[] = [
    { id: 'STAGE_KID', name: 'Stage Kid', line: 'Grew up in the wings. The room already knows your face.', grant: { kind: 'acting', key: 'presence' }, followers: 900 },
    { id: 'FILM_SCHOOL', name: 'Film School', line: 'Short films, late notes, and a reputation for showing up prepared.', grant: { kind: 'acting', key: 'discipline' }, followers: 180 },
    { id: 'STREET_PERFORMER', name: 'Street Performer', line: 'You learned timing in front of people who could walk away.', grant: { kind: 'acting', key: 'improvisation' }, followers: 1600 },
    { id: 'WRITERS_ROOM', name: 'Writers\' Room Runner', line: 'You fetched coffee and left with a feel for the page.', grant: { kind: 'acting', key: 'writing' }, followers: 220 },
    { id: 'INFLUENCER', name: 'Already Online', line: 'A camera has been in your life longer than a call sheet.', grant: { kind: 'acting', key: 'charisma' }, followers: 8400 },
    { id: 'FAMILY_BUSINESS', name: 'Industry Family', line: 'Sets were dinner conversation before they were a job.', grant: { kind: 'genre', key: 'DRAMA' }, followers: 480 },
];

export const STARTING_TRAITS: TraitDef[] = [
    { id: 'NATURAL', name: 'Natural', line: 'The camera likes you before you have done anything to earn it.', grant: { kind: 'acting', key: 'presence' } },
    { id: 'WORKHORSE', name: 'Workhorse', line: 'You bank craft a little faster. The hours were never the hard part.', grant: { kind: 'acting', key: 'discipline' } },
    { id: 'CHARMER', name: 'Charmer', line: 'Press lines come out clean. People remember the interview.', grant: { kind: 'acting', key: 'charisma' } },
    { id: 'METHOD', name: 'Method', line: 'You disappear into the feeling and come back with the scene.', grant: { kind: 'acting', key: 'expression' } },
    { id: 'SHOWMAN', name: 'Showman', line: 'Big rooms, big gestures, and a genre that likes an entrance.', grant: { kind: 'genre', key: 'ACTION' } },
    { id: 'QUIET_PRO', name: 'Quiet Pro', line: 'You know the line and you know where to stand.', grant: { kind: 'acting', key: 'memorization' } },
];

export const pathById = (id?: string) => STARTING_PATHS.find(path => path.id === id);
export const traitById = (id?: string) => STARTING_TRAITS.find(trait => trait.id === id);

export const BIRTHPLACES: { id: string; name: string; industry: FilmIndustryId }[] = [
    { id: 'US', name: 'United States', industry: 'HOLLYWOOD' },
    { id: 'IN', name: 'India', industry: 'BOLLYWOOD' },
    { id: 'NG', name: 'Nigeria', industry: 'NOLLYWOOD' },
    { id: 'KR', name: 'South Korea', industry: 'KOREAN' },
    { id: 'GB', name: 'United Kingdom', industry: 'BRITISH' },
    { id: 'CN', name: 'China', industry: 'CHINESE' },
    { id: 'MX', name: 'Mexico', industry: 'LATIN' },
    { id: 'JP', name: 'Japan', industry: 'JAPANESE' },
    { id: 'BR', name: 'Brazil', industry: 'LATIN' },
    { id: 'FR', name: 'France', industry: 'BRITISH' },
    { id: 'DE', name: 'Germany', industry: 'BRITISH' },
    { id: 'AU', name: 'Australia', industry: 'HOLLYWOOD' },
    { id: 'CA', name: 'Canada', industry: 'HOLLYWOOD' },
    { id: 'ES', name: 'Spain', industry: 'LATIN' },
    { id: 'ZA', name: 'South Africa', industry: 'NOLLYWOOD' },
    { id: 'ELSE', name: 'Somewhere else', industry: 'HOLLYWOOD' },
];

export const birthplaceById = (id?: string) => BIRTHPLACES.find(place => place.id === id) || BIRTHPLACES[0];

export const handleFromName = (name: string): string => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22);
    return `@${slug || 'newstar'}`;
};

export const autoBio = (name: string, pathId: string | undefined, traitId: string | undefined, placeName: string): string => {
    const path = pathById(pathId);
    const trait = traitById(traitId);
    const who = name.trim() || 'New face';
    const from = placeName || 'the industry';
    const pathLine = path ? path.name.toLowerCase() : 'new arrival';
    const traitLine = trait ? trait.name.toLowerCase() : 'working actor';
    return `${who}. ${traitLine} from ${from}. ${pathLine} · fictional account inside Industry Globe.`;
};

export interface SocialStart {
    handle: string;
    bio: string;
    instagram: number;
    x: number;
    youtube: number;
}

/** Followers scale with the background and whatever fame the career already has. */
export const startingSocials = (
    name: string,
    pathId: string | undefined,
    traitId: string | undefined,
    placeName: string,
    fame: number,
): SocialStart => {
    const path = pathById(pathId);
    const base = path?.followers ?? 240;
    const safeFame = Math.max(0, fame || 0);
    const instagram = Math.round(base + safeFame * 45);
    return {
        handle: handleFromName(name),
        bio: autoBio(name, pathId, traitId, placeName),
        instagram,
        x: Math.round(instagram * 0.62),
        youtube: Math.round(instagram * 0.38),
    };
};

export const isDefaultHandle = (handle?: string): boolean => {
    const value = (handle || '').trim().toLowerCase();
    return !value || value === '@player' || value === '@';
};
