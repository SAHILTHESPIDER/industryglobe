/**
 * Empire+ launch rate card.
 * Weekly and opening prices are USD at cost index 1.
 * Mumbai is 0.90, so a city buy there is social $178K, short video $223K,
 * search $111K, connected TV $534K, creators $356K.
 * A second city adds its own index. Landmark nights only run where the building exists.
 * This module registers itself with the marketing rules. Those rules do not import it.
 */
import type { LaunchCityResult, LaunchFlight, MarketingCategory } from '../../types';
import { bindLaunchCatalog } from './core';
import { LAUNCH_REGIONS, getCountry } from '../ownPlatform/catalog';
import { SERVER_CITIES, type ServerCity } from '../ownPlatform/serverCities';

export type LaunchGroupId = 'social' | 'creators' | 'outdoor' | 'air' | 'sport' | 'night' | 'partner';
export type PlaceKind = 'landmark' | 'screen' | 'monument';
export type LaunchAnim =
    | 'feed' | 'video' | 'search' | 'ctv' | 'game' | 'music'
    | 'live' | 'celeb'
    | 'tv' | 'board' | 'train' | 'bus' | 'taxi' | 'shelter' | 'flyers' | 'airport' | 'mall' | 'city' | 'times'
    | 'radio' | 'podcast' | 'print' | 'cinema'
    | 'stadium' | 'jersey'
    | 'reveal' | 'light' | 'drone' | 'fest' | 'stunt' | 'carpet' | 'mob' | 'sky' | 'projection' | 'campus' | 'popup' | 'press'
    | 'telecom' | 'collab';

export interface CampaignCity {
    id: string;
    name: string;
    countryId: string;
    regionId: ServerCity['regionId'];
    lat: number;
    lon: number;
    costIndex: number;
    metroM: number;
    district: string;
}

export interface LaunchChannel {
    id: string;
    group: LaunchGroupId;
    category: MarketingCategory;
    name: string;
    blurb: string;
    weekly: number;
    opening: number;
    cpm: number;
    conv: number;
    freq: number;
    buzz: number;
    anim: LaunchAnim;
    place?: PlaceKind;
    engineReach: number;
    engineStream: number;
    crowd?: number;
    earned?: number;
    eventConv?: number;
}

export const LAUNCH_GROUPS: { id: LaunchGroupId; name: string; line: string }[] = [
    { id: 'social', name: 'Social & digital', line: 'Targeted reach and rapid creative testing.' },
    { id: 'creators', name: 'Creators', line: 'Trusted voices turn awareness into trial.' },
    { id: 'outdoor', name: 'Outdoor & traditional', line: 'Boards, wraps, and screens on the way through the city.' },
    { id: 'air', name: 'Broadcast & print', line: 'Radio, papers, podcasts, and the cinema.' },
    { id: 'sport', name: 'Sport', line: 'The ground, the jersey, and the replay.' },
    { id: 'night', name: 'Press & events · opening night', line: 'Earned attention around the opening moment.' },
    { id: 'partner', name: 'Partnerships', line: 'Someone else already has the audience.' },
];

const METRO: Record<string, number> = {
    nyc: 19.5, lax: 13.2, chi: 9.5, hou: 7.1, mia: 6.1, atl: 6.1, aus: 2.3, bna: 2.0,
    yyz: 6.4, mex: 21.8, sao: 22.0, rio: 13.5, eze: 15.2, bog: 11.0,
    lon: 14.8, par: 11.1, ber: 6.1, fra: 5.6, ams: 2.5, mad: 6.7, lis: 2.9, rom: 4.3, sto: 2.4, rek: 0.24,
    los: 21.0, jnb: 6.2, cai: 21.3, nbo: 5.1, rak: 1.3,
    bom: 21.0, del: 32.0, blr: 12.3, maa: 11.5, ccu: 15.1, hyd: 10.5,
    tyo: 37.4, sel: 25.5, sha: 27.8, sin: 5.7, dxb: 3.6, jkt: 33.0, mnl: 13.5,
    syd: 5.3, akl: 1.7,
};

const DISTRICT: Record<string, string> = {
    nyc: 'Hudson Yards', lax: 'Sunset', chi: 'the Magnificent Mile', hou: 'Downtown', mia: 'Brickell',
    atl: 'Midtown', aus: 'Downtown', bna: 'Broadway', yyz: 'King Street', mex: 'Reforma',
    sao: 'Paulista', rio: 'Copacabana', eze: 'Puerto Madero', bog: 'Zona Rosa',
    lon: 'Canary Wharf', par: 'La Défense', ber: 'Alexanderplatz', fra: 'Zeil', ams: 'Leidseplein',
    mad: 'Gran Vía', lis: 'Baixa', rom: 'Via del Corso', sto: 'Sergels Torg', rek: 'Laugavegur',
    los: 'Victoria Island', jnb: 'Sandton', cai: 'Zamalek', nbo: 'Westlands', rak: 'Gueliz',
    bom: 'Lower Parel', del: 'Connaught Place', blr: 'MG Road', maa: 'T. Nagar', ccu: 'Park Street', hyd: 'Banjara Hills',
    tyo: 'Shibuya', sel: 'Gangnam', sha: 'the Bund', sin: 'Orchard', dxb: 'Downtown',
    jkt: 'Sudirman', mnl: 'Makati', syd: 'Circular Quay',     akl: 'Britomart',
    prg: 'Old Town',
};

const fromServer = (row: ServerCity): CampaignCity => ({
    id: row.id,
    name: row.name,
    countryId: row.countryId,
    regionId: row.regionId,
    lat: row.lat,
    lon: row.lon,
    costIndex: row.costIndex,
    metroM: METRO[row.id] || 4,
    district: DISTRICT[row.id] || 'the centre',
});

const extra = (
    id: string, name: string, countryId: string, lat: number, lon: number, costIndex: number, metroM: number, district: string, regionId: CampaignCity['regionId'] = 'ASIA',
): CampaignCity => ({ id, name, countryId, regionId, lat, lon, costIndex, metroM, district });

/** Server rooms, plus Indian metros the launch map sells into and does not rack. */
export const CAMPAIGN_CITIES: CampaignCity[] = [
    ...SERVER_CITIES.map(fromServer),
    extra('maa', 'Chennai', 'IN', 13.08, 80.27, 0.86, 11.5, 'T. Nagar'),
    extra('ccu', 'Kolkata', 'IN', 22.57, 88.36, 0.84, 15.1, 'Park Street'),
    extra('hyd', 'Hyderabad', 'IN', 17.39, 78.49, 0.87, 10.5, 'Banjara Hills'),
    extra('cok', 'Kochi', 'IN', 9.93, 76.27, 0.82, 3.3, 'Marine Drive'),
    extra('pnq', 'Pune', 'IN', 18.52, 73.86, 0.84, 7.4, 'Koregaon Park'),
    extra('goi', 'Goa', 'IN', 15.5, 73.83, 0.86, 1.5, 'Panaji'),
    extra('bjs', 'Beijing', 'CN', 39.9, 116.4, 0.98, 21.5, 'Sanlitun'),
    extra('hkg', 'Hong Kong', 'HK', 22.32, 114.17, 1.08, 7.5, 'Tsim Sha Tsui'),
    extra('pus', 'Busan', 'KR', 35.18, 129.08, 0.9, 3.4, 'Haeundae'),
    extra('osa', 'Osaka', 'JP', 34.69, 135.5, 1.02, 19.0, 'Namba'),
    extra('kix', 'Kyoto', 'JP', 35.01, 135.77, 0.96, 1.5, 'Gion'),
    extra('ctu', 'Chengdu', 'CN', 30.57, 104.07, 0.86, 16.3, 'Chunxi'),
    extra('yvr', 'Vancouver', 'CA', 49.28, -123.12, 1.02, 2.6, 'Yaletown', 'NORTH_AMERICA'),
    extra('abv', 'Abuja', 'NG', 9.06, 7.49, 0.8, 3.6, 'Maitama', 'AFRICA'),
    extra('man', 'Manchester', 'GB', 53.48, -2.24, 0.96, 2.8, 'Northern Quarter', 'EUROPE'),
    {
        id: 'prg',
        name: 'Prague',
        countryId: 'CZ',
        regionId: 'EUROPE',
        lat: 50.08,
        lon: 14.44,
        costIndex: 0.93,
        metroM: 2.7,
        district: 'Old Town',
    },
];

const CITY_BY_ID = new Map(CAMPAIGN_CITIES.map(row => [row.id, row]));
export const campaignCity = (id: string): CampaignCity | undefined => CITY_BY_ID.get(id);

export const citiesByRegion = () => LAUNCH_REGIONS.map(region => ({
    ...region,
    cities: CAMPAIGN_CITIES.filter(city => city.regionId === region.id),
}));

export const LANDMARK_LIGHT: Record<string, string> = {
    nyc: 'Empire State Building',
    dxb: 'Burj Khalifa',
    par: 'Eiffel Tower',
    sha: 'Shanghai Tower',
    tyo: 'Tokyo Tower',
    syd: 'Sydney Opera House',
    lon: 'Big Ben',
    sel: 'Lotte World Tower',
    cai: 'the Pyramids',
};

export const LANDMARK_SCREENS: Record<string, string> = {
    nyc: 'Times Square',
    tyo: 'Shibuya Crossing',
    lon: 'Piccadilly Circus',
    sha: 'Nanjing Road',
    sel: 'COEX',
    sin: 'Orchard Road',
    dxb: 'Sheikh Zayed Road',
    bom: 'Bandra',
    par: 'Champs-Élysées',
};

export type LandmarkKind =
    | 'burj' | 'eiffel' | 'empire' | 'bigben' | 'gateway' | 'sealink' | 'indiagate'
    | 'tokyotower' | 'opera' | 'christ' | 'mbs' | 'cntower' | 'lotte' | 'pyramids'
    | 'colosseum' | 'generic';

export interface CityLandmark {
    name: string;
    kind: LandmarkKind;
    /** Drone night uses this shape when the city's tower is not the thing in the sky. */
    droneKind?: LandmarkKind;
    droneName?: string;
}

/** The building the opening-night show is drawn on. A missing city falls back to a plain skyline. */
export const CITY_LANDMARK: Record<string, CityLandmark> = {
    dxb: { name: 'Burj Khalifa', kind: 'burj' },
    par: { name: 'Eiffel Tower', kind: 'eiffel' },
    nyc: { name: 'Empire State Building', kind: 'empire' },
    lon: { name: 'Big Ben', kind: 'bigben' },
    bom: { name: 'Gateway of India', kind: 'gateway', droneKind: 'sealink', droneName: 'Bandra-Worli Sea Link' },
    del: { name: 'India Gate', kind: 'indiagate' },
    tyo: { name: 'Tokyo Tower', kind: 'tokyotower' },
    syd: { name: 'Sydney Opera House', kind: 'opera' },
    rio: { name: 'Christ the Redeemer', kind: 'christ' },
    sin: { name: 'Marina Bay Sands', kind: 'mbs' },
    yyz: { name: 'CN Tower', kind: 'cntower' },
    sel: { name: 'Lotte World Tower', kind: 'lotte' },
    cai: { name: 'the Pyramids', kind: 'pyramids' },
    rom: { name: 'the Colosseum', kind: 'colosseum' },
    sha: { name: 'Shanghai Tower', kind: 'lotte' },
    ber: { name: 'Brandenburg Gate', kind: 'indiagate' },
    chi: { name: 'Willis Tower', kind: 'empire' },
    lax: { name: 'the Hollywood sign', kind: 'generic' },
    mex: { name: 'the Angel of Independence', kind: 'generic' },
    hou: { name: 'the Houston skyline', kind: 'generic' },
    mia: { name: 'the Miami skyline', kind: 'generic' },
    atl: { name: 'the Atlanta skyline', kind: 'generic' },
    aus: { name: 'the Austin skyline', kind: 'generic' },
    bna: { name: 'the Nashville skyline', kind: 'generic' },
    sao: { name: 'Avenida Paulista', kind: 'generic' },
    eze: { name: 'the Obelisk', kind: 'generic' },
    bog: { name: 'Monserrate', kind: 'generic' },
    fra: { name: 'the Frankfurt skyline', kind: 'generic' },
    ams: { name: 'the canal houses', kind: 'generic' },
    mad: { name: 'Puerta de Alcalá', kind: 'indiagate' },
    lis: { name: 'Belém Tower', kind: 'generic' },
    sto: { name: 'the Stockholm skyline', kind: 'generic' },
    rek: { name: 'Hallgrímskirkja', kind: 'generic' },
    los: { name: 'the Lagos skyline', kind: 'generic' },
    jnb: { name: 'the Johannesburg skyline', kind: 'generic' },
    nbo: { name: 'the Nairobi skyline', kind: 'generic' },
    rak: { name: 'the Koutoubia', kind: 'generic' },
    blr: { name: 'Vidhana Soudha', kind: 'generic' },
    jkt: { name: 'the National Monument', kind: 'cntower' },
    mnl: { name: 'the Manila skyline', kind: 'generic' },
    akl: { name: 'Sky Tower', kind: 'cntower' },
    maa: { name: 'the Marina lighthouse', kind: 'generic' },
    ccu: { name: 'Victoria Memorial', kind: 'generic' },
    hyd: { name: 'Charminar', kind: 'generic' },
    prg: { name: 'the Powder Tower', kind: 'generic' },
};

export const landmarkFor = (cityId: string, anim?: string): { name: string; kind: LandmarkKind } => {
    const row = CITY_LANDMARK[cityId];
    if (!row) return { name: 'the skyline', kind: 'generic' };
    if (anim === 'drone' && row.droneKind) return { name: row.droneName || row.name, kind: row.droneKind };
    return { name: row.name, kind: row.kind };
};

export const MONUMENTS: Record<string, string> = {
    par: 'the Louvre',
    rom: 'the Colosseum',
    cai: 'the Pyramids',
    del: 'India Gate',
    bom: 'the Gateway of India',
    lon: 'Tower Bridge',
    nyc: 'the Brooklyn Bridge',
    ber: 'the Brandenburg Gate',
    sha: 'the Bund',
};

const placeMap = (kind: PlaceKind): Record<string, string> => (
    kind === 'landmark' ? LANDMARK_LIGHT : kind === 'screen' ? LANDMARK_SCREENS : MONUMENTS
);

const ch = (row: LaunchChannel): LaunchChannel => row;

export const LAUNCH_CHANNELS: LaunchChannel[] = [
    ch({ id: 'social_feed', group: 'social', category: 'DIGITAL', name: 'Social feed', blurb: 'Posts and ads in every feed', weekly: 198_000, opening: 0, cpm: 8, conv: 0.0011, freq: 0.28, buzz: 7, anim: 'feed', engineReach: 8, engineStream: 8 }),
    ch({ id: 'short_video', group: 'social', category: 'DIGITAL', name: 'Short video', blurb: 'Vertical cuts, sound on', weekly: 248_000, opening: 0, cpm: 9, conv: 0.00135, freq: 0.32, buzz: 8, anim: 'video', engineReach: 9, engineStream: 9 }),
    ch({ id: 'search_ads', group: 'social', category: 'DIGITAL', name: 'Search ads', blurb: 'First when people look for it', weekly: 123_000, opening: 0, cpm: 14, conv: 0.0042, freq: 0.55, buzz: 5, anim: 'search', engineReach: 7, engineStream: 10 }),
    ch({ id: 'ctv', group: 'social', category: 'DIGITAL', name: 'Connected TV', blurb: 'Ads on smart TVs and other apps', weekly: 593_000, opening: 0, cpm: 28, conv: 0.0015, freq: 0.4, buzz: 8, anim: 'ctv', engineReach: 6, engineStream: 7 }),
    ch({ id: 'gaming_ads', group: 'social', category: 'DIGITAL', name: 'Gaming in-app', blurb: 'Banners and rewarded spots inside games', weekly: 155_000, opening: 0, cpm: 7, conv: 0.001, freq: 0.3, buzz: 6, anim: 'game', engineReach: 7, engineStream: 6 }),
    ch({ id: 'music_ads', group: 'social', category: 'DIGITAL', name: 'Music streaming', blurb: 'Spots between songs', weekly: 125_000, opening: 0, cpm: 15, conv: 0.0012, freq: 0.45, buzz: 6, anim: 'music', engineReach: 6, engineStream: 6 }),
    ch({ id: 'creators_live', group: 'creators', category: 'DIGITAL', name: 'Creators', blurb: 'A live stream with the viewer count on', weekly: 396_000, opening: 0, cpm: 18, conv: 0.0021, freq: 0.42, buzz: 12, anim: 'live', engineReach: 8, engineStream: 9 }),
    ch({ id: 'celebrity', group: 'creators', category: 'BRAND', name: 'Celebrity endorsement', blurb: 'A famous face says the name', weekly: 720_000, opening: 0, cpm: 42, conv: 0.0018, freq: 0.35, buzz: 14, anim: 'celeb', engineReach: 6, engineStream: 7 }),
    ch({ id: 'tv_spots', group: 'outdoor', category: 'PRESS', name: 'TV spots', blurb: 'Prime-time breaks', weekly: 420_000, opening: 0, cpm: 24, conv: 0.0011, freq: 0.38, buzz: 9, anim: 'tv', engineReach: 6, engineStream: 6 }),
    ch({ id: 'billboards', group: 'outdoor', category: 'OUTDOOR', name: 'Billboards', blurb: 'Roadside and rooftop boards', weekly: 180_000, opening: 0, cpm: 6, conv: 0.00042, freq: 0.22, buzz: 6, anim: 'board', engineReach: 5, engineStream: 3 }),
    ch({ id: 'metro_wrap', group: 'outdoor', category: 'OUTDOOR', name: 'Metro wrap', blurb: 'Carriage wraps and the platform wall', weekly: 115_000, opening: 0, cpm: 5, conv: 0.00048, freq: 0.25, buzz: 5, anim: 'train', engineReach: 5, engineStream: 3 }),
    ch({ id: 'bus_wrap', group: 'outdoor', category: 'OUTDOOR', name: 'Bus wraps', blurb: 'City buses in the brand colour', weekly: 82_000, opening: 0, cpm: 4.5, conv: 0.0004, freq: 0.24, buzz: 5, anim: 'bus', engineReach: 5, engineStream: 3 }),
    ch({ id: 'taxi_wrap', group: 'outdoor', category: 'OUTDOOR', name: 'Taxi and auto wraps', blurb: 'Cabs and auto-rickshaws on the commute', weekly: 58_000, opening: 0, cpm: 4, conv: 0.00036, freq: 0.22, buzz: 4, anim: 'taxi', engineReach: 4, engineStream: 3 }),
    ch({ id: 'shelter', group: 'outdoor', category: 'OUTDOOR', name: 'Street posters', blurb: 'Bus shelters and a poster wall', weekly: 64_000, opening: 0, cpm: 5, conv: 0.00034, freq: 0.2, buzz: 4, anim: 'shelter', engineReach: 4, engineStream: 2 }),
    ch({ id: 'flyers', group: 'outdoor', category: 'OUTDOOR', name: 'Flyers', blurb: 'Hand to hand in busy streets', weekly: 99_000, opening: 0, cpm: 3.2, conv: 0.00022, freq: 0.7, buzz: 4, anim: 'flyers', engineReach: 4, engineStream: 2 }),
    ch({ id: 'airport_screens', group: 'outdoor', category: 'OUTDOOR', name: 'Airport screens', blurb: 'Gates and baggage halls', weekly: 593_000, opening: 0, cpm: 20, conv: 0.0009, freq: 0.35, buzz: 7, anim: 'airport', engineReach: 5, engineStream: 4 }),
    ch({ id: 'mall_screens', group: 'outdoor', category: 'OUTDOOR', name: 'Mall screens', blurb: 'Atriums and escalators', weekly: 396_000, opening: 0, cpm: 12, conv: 0.0007, freq: 0.3, buzz: 6, anim: 'mall', engineReach: 5, engineStream: 4 }),
    ch({ id: 'city_screens', group: 'outdoor', category: 'OUTDOOR', name: 'City screens', blurb: 'Municipal LEDs on the main roads', weekly: 1_778_000, opening: 0, cpm: 16, conv: 0.00065, freq: 0.26, buzz: 10, anim: 'city', engineReach: 4, engineStream: 4 }),
    ch({ id: 'landmark_screens', group: 'outdoor', category: 'OUTDOOR', name: 'Landmark screens', blurb: 'Times Square, Shibuya, Piccadilly', weekly: 980_000, opening: 0, cpm: 36, conv: 0.0008, freq: 0.3, buzz: 12, anim: 'times', place: 'screen', engineReach: 5, engineStream: 5 }),
    ch({ id: 'radio', group: 'air', category: 'PRESS', name: 'Radio', blurb: 'Drive-time spots on city stations', weekly: 120_000, opening: 0, cpm: 6, conv: 0.0007, freq: 0.4, buzz: 5, anim: 'radio', engineReach: 5, engineStream: 4 }),
    ch({ id: 'podcast_ads', group: 'air', category: 'PRESS', name: 'Podcast ads', blurb: 'Host-read ads in shows people finish', weekly: 48_000, opening: 0, cpm: 23, conv: 0.0034, freq: 0.6, buzz: 6, anim: 'podcast', engineReach: 4, engineStream: 5 }),
    ch({ id: 'print_ads', group: 'air', category: 'PRESS', name: 'Newspaper and magazine', blurb: 'A page in the paper and the weekly', weekly: 86_000, opening: 0, cpm: 18, conv: 0.00045, freq: 0.5, buzz: 4, anim: 'print', engineReach: 4, engineStream: 3 }),
    ch({ id: 'cinema', group: 'air', category: 'PRESS', name: 'Cinema pre-roll', blurb: 'Twenty seconds before the feature', weekly: 175_000, opening: 0, cpm: 32, conv: 0.0016, freq: 0.55, buzz: 7, anim: 'cinema', engineReach: 5, engineStream: 5 }),
    ch({ id: 'stadium', group: 'sport', category: 'BRAND', name: 'Stadium LED', blurb: 'Boards at the cricket ground and the stadium', weekly: 260_000, opening: 0, cpm: 14, conv: 0.0009, freq: 0.35, buzz: 9, anim: 'stadium', engineReach: 5, engineStream: 4 }),
    ch({ id: 'jersey', group: 'sport', category: 'BRAND', name: 'Sports sponsorship', blurb: 'The mark on a club jersey for the flight', weekly: 540_000, opening: 0, cpm: 40, conv: 0.00085, freq: 0.3, buzz: 11, anim: 'jersey', engineReach: 5, engineStream: 5 }),
    ch({ id: 'building_reveal', group: 'night', category: 'STAGE', name: 'Building reveal', blurb: 'A banner down a tower', weekly: 0, opening: 1_222_000, cpm: 0, conv: 0, freq: 0, buzz: 16, anim: 'reveal', engineReach: 4, engineStream: 6, crowd: 90_000, earned: 6, eventConv: 0.006 }),
    ch({ id: 'landmark_light', group: 'night', category: 'STAGE', name: 'Landmark light show', blurb: 'The tower wears the mark for one night', weekly: 0, opening: 2_800_000, cpm: 0, conv: 0, freq: 0, buzz: 18, anim: 'light', place: 'landmark', engineReach: 4, engineStream: 6, crowd: 220_000, earned: 11, eventConv: 0.005 }),
    ch({ id: 'drone', group: 'night', category: 'STAGE', name: 'Drone show', blurb: 'The mark formed in the night sky', weekly: 0, opening: 1_556_000, cpm: 0, conv: 0, freq: 0, buzz: 18, anim: 'drone', engineReach: 5, engineStream: 7, crowd: 180_000, earned: 8, eventConv: 0.008 }),
    ch({ id: 'fan_fest', group: 'night', category: 'STAGE', name: 'Fan festival', blurb: 'A stage, a crowd, and the catalogue', weekly: 0, opening: 2_000_000, cpm: 0, conv: 0, freq: 0, buzz: 17, anim: 'fest', engineReach: 4, engineStream: 7, crowd: 28_000, earned: 5, eventConv: 0.018 }),
    ch({ id: 'stunt', group: 'night', category: 'STAGE', name: 'Live stunt show', blurb: 'A ramp, a jump, then fireworks', weekly: 0, opening: 2_200_000, cpm: 0, conv: 0, freq: 0, buzz: 17, anim: 'stunt', engineReach: 4, engineStream: 6, crowd: 45_000, earned: 7, eventConv: 0.01 }),
    ch({ id: 'red_carpet', group: 'night', category: 'STAGE', name: 'Red carpet premiere', blurb: 'Cameras, a rope, and the first titles', weekly: 0, opening: 480_000, cpm: 0, conv: 0, freq: 0, buzz: 14, anim: 'carpet', engineReach: 4, engineStream: 5, crowd: 6_000, earned: 14, eventConv: 0.004 }),
    ch({ id: 'flash_mob', group: 'night', category: 'STAGE', name: 'Flash mob', blurb: 'A crowd that starts on cue', weekly: 0, opening: 210_000, cpm: 0, conv: 0, freq: 0, buzz: 12, anim: 'mob', engineReach: 4, engineStream: 4, crowd: 14_000, earned: 8, eventConv: 0.006 }),
    ch({ id: 'skywriting', group: 'night', category: 'STAGE', name: 'Sky writing', blurb: 'Skywriting and a hot-air balloon', weekly: 0, opening: 310_000, cpm: 0, conv: 0, freq: 0, buzz: 11, anim: 'sky', engineReach: 4, engineStream: 4, crowd: 160_000, earned: 3, eventConv: 0.002 }),
    ch({ id: 'projection', group: 'night', category: 'STAGE', name: 'Projection mapping', blurb: 'The mark mapped onto a monument', weekly: 0, opening: 860_000, cpm: 0, conv: 0, freq: 0, buzz: 15, anim: 'projection', place: 'monument', engineReach: 4, engineStream: 5, crowd: 70_000, earned: 6, eventConv: 0.005 }),
    ch({ id: 'campus_tour', group: 'night', category: 'TOUR', name: 'College tour', blurb: 'A campus week around opening', weekly: 0, opening: 95_000, cpm: 0, conv: 0, freq: 0, buzz: 6, anim: 'campus', engineReach: 3, engineStream: 4, crowd: 4_500, earned: 2, eventConv: 0.028 }),
    ch({ id: 'popup', group: 'night', category: 'TOUR', name: 'Pop-up store', blurb: 'A room that exists for a week', weekly: 0, opening: 390_000, cpm: 0, conv: 0, freq: 0, buzz: 10, anim: 'popup', engineReach: 3, engineStream: 5, crowd: 16_000, earned: 3, eventConv: 0.02 }),
    ch({ id: 'press_conference', group: 'night', category: 'PRESS', name: 'Press conference', blurb: 'A table, cameras, and a date', weekly: 0, opening: 95_000, cpm: 0, conv: 0, freq: 0, buzz: 9, anim: 'press', engineReach: 4, engineStream: 4, crowd: 500, earned: 24, eventConv: 0.003 }),
    ch({ id: 'telecom', group: 'partner', category: 'BRAND', name: 'Telecom and OTT bundle', blurb: 'The app rides a phone plan', weekly: 310_000, opening: 0, cpm: 11, conv: 0.0036, freq: 0.4, buzz: 8, anim: 'telecom', engineReach: 6, engineStream: 8 }),
    ch({ id: 'collab', group: 'partner', category: 'BRAND', name: 'Brand collaboration', blurb: 'A partner that already has the crowd', weekly: 240_000, opening: 0, cpm: 13, conv: 0.0014, freq: 0.35, buzz: 8, anim: 'collab', engineReach: 5, engineStream: 5 }),
];

const CHANNEL_BY_ID = new Map(LAUNCH_CHANNELS.map(row => [row.id, row]));
export const launchChannel = (id: string): LaunchChannel | undefined => CHANNEL_BY_ID.get(id);

export const placeRule = (id: string): { ids: string[]; label: string } | null => {
    const channel = CHANNEL_BY_ID.get(id);
    if (!channel?.place) return null;
    const map = placeMap(channel.place);
    if (channel.place === 'landmark') return { ids: Object.keys(map), label: 'Only at Burj Khalifa, Empire State Building' };
    if (channel.place === 'screen') return { ids: Object.keys(map), label: 'Only in cities with a landmark screen, such as Times Square' };
    return { ids: Object.keys(map), label: 'Only at a monument the show can cover' };
};

export const launchActionDefs = LAUNCH_CHANNELS.map(row => ({
    id: row.id,
    category: row.category,
    name: row.name,
    blurb: row.blurb,
    base: row.weekly || row.opening,
    reach: row.engineReach,
    hype: Math.min(18, row.buzz),
    ticket: 2,
    stream: row.engineStream,
    needsCast: false,
    needsCity: row.group === 'outdoor' || row.group === 'night' || row.group === 'sport',
}));

export const KEY_ARTS: { id: string; name: string; line: string; factor: number }[] = [
    { id: 'night', name: 'Night city', line: 'The mark over a skyline.', factor: 1 },
    { id: 'gold', name: 'Gold lockup', line: 'The word, large, on house gold.', factor: 1.05 },
    { id: 'portrait', name: 'Portrait', line: 'A face from the shelf, the mark small.', factor: 1.03 },
    { id: 'type', name: 'Type only', line: 'No picture. The letters do it.', factor: 0.98 },
];

export const TRAILER_CUTS: { id: string; name: string; line: string; factor: number }[] = [
    { id: 'sting', name: '6 second sting', line: 'The ident and a title.', factor: 1 },
    { id: 'open', name: '30 second open', line: 'Enough plot to stop a thumb.', factor: 1.04 },
    { id: 'story', name: '90 second story', line: 'A real trailer. Costs attention, not cash.', factor: 1.07 },
];

export const TAGLINES = [
    'The night the city presses play.',
    'Every screen. One mark.',
    'Open the door. Stay for the story.',
    'Before the lights, this.',
];

export const NIGHT_ORDER = ['drone', 'building_reveal', 'landmark_light', 'stunt', 'fan_fest', 'projection', 'skywriting', 'red_carpet', 'flash_mob', 'popup', 'campus_tour', 'press_conference'];

export const creativeFactor = (artId: string, trailerId: string): number => {
    const art = KEY_ARTS.find(row => row.id === artId)?.factor ?? 1;
    const trailer = TRAILER_CUTS.find(row => row.id === trailerId)?.factor ?? 1;
    return Math.round(art * trailer * 1000) / 1000;
};

const roundK = (value: number) => Math.round(value / 1000) * 1000;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const flightMoney = (value: number): string => {
    const sign = value < 0 ? '-' : '';
    const n = Math.abs(Math.round(value));
    if (n >= 1_000_000) {
        const millions = Math.round((n / 1_000_000) * 10) / 10;
        return `${sign}$${millions}M`;
    }
    if (n >= 10_000) return `${sign}$${Math.round(n / 1000)}K`;
    if (n >= 1_000) return `${sign}$${(n / 1000).toFixed(1)}K`;
    return `${sign}$${n}`;
};

const COUNTRY_ALIAS: Record<string, string> = { CZ: 'Czechia' };
const countryName = (id: string) => getCountry(id)?.name || COUNTRY_ALIAS[id] || id;
const joinNames = (names: string[]) => (names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`);

export interface PlaceCopy {
    disabled: boolean;
    reason: string;
    place: string;
    country: string;
    eligible: CampaignCity[];
}

export const describePlace = (row: LaunchChannel, cities: CampaignCity[]): PlaceCopy => {
    const countries = [...new Set(cities.map(city => countryName(city.countryId)))];
    const country = countries.length === 1 ? countries[0] : countries.length ? joinNames(countries) : '';
    if (!cities.length) return { disabled: true, reason: 'Pick a city first.', place: '', country: '', eligible: [] };
    if (row.place) {
        const map = placeMap(row.place);
        const eligible = cities.filter(city => map[city.id]);
        if (!eligible.length) {
            const reason = row.place === 'landmark'
                ? 'Only at Burj Khalifa, Empire State Building'
                : row.place === 'screen'
                    ? 'Only in cities with a landmark screen, such as Times Square'
                    : 'Only at a monument the show can cover';
            return { disabled: true, reason, place: reason, country, eligible: [] };
        }
        return {
            disabled: false,
            reason: '',
            place: joinNames(eligible.map(city => `${map[city.id]} · ${city.name}`)),
            country,
            eligible,
        };
    }
    if (row.id === 'city_screens') {
        const place = cities.length === 1 ? `${cities[0].name}, ${cities[0].district}` : joinNames(cities.map(city => city.name));
        return { disabled: false, reason: '', place, country, eligible: cities };
    }
    if (row.group === 'night') {
        const place = cities.length === 1 ? cities[0].name : joinNames(cities.map(city => city.name));
        return { disabled: false, reason: '', place, country, eligible: cities };
    }
    return { disabled: false, reason: '', place: '', country, eligible: cities };
};

/** Cities a format can actually run in. A landmark never inherits a city that does not have it. */
export const citiesForChannel = (channelId: string, cityIds: string[]): string[] => {
    const channel = launchChannel(channelId);
    const cities = cityIds.map(campaignCity).filter((row): row is CampaignCity => Boolean(row));
    if (!channel) return cities.map(city => city.id);
    return describePlace(channel, cities).eligible.map(city => city.id);
};

export interface FlightChannelLine {
    id: string;
    name: string;
    group: LaunchGroupId;
    blurb: string;
    anim: LaunchAnim;
    weekly: number;
    opening: number;
    spend: number;
    reach: number;
    subscribers: number;
    disabled: boolean;
    reason: string;
    place: string;
    country: string;
}

export interface FlightQuote {
    weeks: number;
    weekly: number;
    opening: number;
    total: number;
    reach: number;
    buzz: number;
    subscribers: number;
    demand: number;
    channels: FlightChannelLine[];
    cities: LaunchCityResult[];
    notes: string[];
}

export interface PriceInput {
    cityIds: string[];
    channelIds: string[];
    weeks: number;
    ratio: number;
    weights?: Record<string, number>;
    creative?: number;
    factors?: Record<string, number>;
}

const weeklyEffect = (row: LaunchChannel, city: CampaignCity, spend: number, weeks: number, creative: number) => {
    if (spend <= 0 || row.cpm <= 0) return { reach: 0, subscribers: 0 };
    const impressions = (spend / row.cpm) * 1000;
    const unique = Math.min(city.metroM * 1_000_000 * 0.8, impressions * row.freq);
    return { reach: unique, subscribers: unique * row.conv * creative * Math.pow(Math.max(1, weeks), 0.74) };
};

const nightEffect = (row: LaunchChannel, city: CampaignCity, creative: number) => {
    const viewers = Math.min(city.metroM * 1_000_000 * 0.02, (row.crowd || 0) * (0.55 + city.metroM / 18));
    const reach = viewers * (row.earned || 1);
    return { reach, subscribers: reach * (row.eventConv || 0) * creative };
};

export const priceFlight = (input: PriceInput): FlightQuote => {
    const weeks = clamp(Math.round(input.weeks || 1), 1, 8);
    const ratio = clamp(Number.isFinite(input.ratio) ? input.ratio : 1, 0.35, 1);
    const creative = input.creative && input.creative > 0 ? input.creative : 1;
    const factors = input.factors || {};
    const picked = new Set(input.channelIds);
    const cities = input.cityIds.map(campaignCity).filter((row): row is CampaignCity => Boolean(row));
    const notes: string[] = [];
    if (!cities.length) notes.push('Pick at least one city. Every channel is priced there.');

    const rated = LAUNCH_CHANNELS.map(row => {
        const copy = describePlace(row, cities);
        const indexSum = copy.eligible.reduce((sum, city) => sum + city.costIndex, 0);
        return {
            row,
            copy,
            weekly: row.weekly && copy.eligible.length ? roundK(row.weekly * indexSum) : 0,
            opening: row.opening && copy.eligible.length ? roundK(row.opening * indexSum) : 0,
        };
    });
    const selected = rated.filter(row => picked.has(row.row.id) && !row.copy.disabled && (row.weekly > 0 || row.opening > 0));
    const rateTotal = selected.reduce((sum, row) => sum + row.weekly, 0);
    const budget = ratio >= 0.999 ? rateTotal : roundK(rateTotal * ratio);
    const usingShares = Object.values(input.weights || {}).some(value => value > 0);
    const weightOf = (row: { row: LaunchChannel; weekly: number }) => {
        const custom = input.weights?.[row.row.id];
        if (custom && custom > 0) return custom;
        return usingShares ? 50 : (row.weekly || 1);
    };
    const weeklySelected = selected.filter(row => row.weekly > 0);
    const weightSum = weeklySelected.reduce((sum, row) => sum + weightOf(row), 0) || 1;
    const spendById = new Map<string, number>();
    if (ratio >= 0.999) weeklySelected.forEach(row => spendById.set(row.row.id, row.weekly));
    else if (budget > 0) {
        const parts = weeklySelected.map(row => ({ id: row.row.id, spend: Math.min(row.weekly, (budget * weightOf(row)) / weightSum), rate: row.weekly }));
        for (let guard = 0; guard < 6; guard += 1) {
            const left = budget - parts.reduce((sum, part) => sum + part.spend, 0);
            if (left < 500) break;
            const room = parts.filter(part => part.rate - part.spend >= 500);
            if (!room.length) break;
            const add = left / room.length;
            room.forEach(part => { part.spend = Math.min(part.rate, part.spend + add); });
        }
        parts.forEach(part => spendById.set(part.id, roundK(part.spend)));
    }

    const perCity = new Map<string, LaunchCityResult>();
    cities.forEach(city => perCity.set(city.id, { id: city.id, name: city.name, country: countryName(city.countryId), reach: 0, subscribers: 0, cost: 0 }));
    let buzzScore = 0;
    const overlapCut = selected.length <= 1 ? 1 : Math.max(0.62, 1 - (selected.length - 1) * 0.045);
    const lines: FlightChannelLine[] = rated.map(row => {
        const on = selected.some(item => item.row.id === row.row.id);
        const spend = on ? (spendById.get(row.row.id) || 0) : 0;
        const opening = on ? row.opening : 0;
        let reach = 0;
        let subscribers = 0;
        if (on) {
            buzzScore += row.row.buzz;
            const indexSum = row.copy.eligible.reduce((sum, item) => sum + item.costIndex, 0) || 1;
            row.copy.eligible.forEach(city => {
                const share = city.costIndex / indexSum;
                const effect = row.row.opening ? nightEffect(row.row, city, creative) : weeklyEffect(row.row, city, spend * share, weeks, creative);
                const factor = factors[city.countryId] ?? 1;
                const bucket = perCity.get(city.id);
                if (!bucket) return;
                const cityReach = effect.reach * overlapCut;
                const citySubs = effect.subscribers * factor * overlapCut;
                bucket.reach += cityReach;
                bucket.subscribers += citySubs;
                bucket.cost += (row.row.weekly ? spend * share * weeks : 0) + opening * share;
                reach += cityReach;
                subscribers += citySubs;
            });
        }
        return {
            id: row.row.id, name: row.row.name, group: row.row.group, blurb: row.row.blurb, anim: row.row.anim,
            weekly: row.weekly, opening: row.opening, spend, reach: Math.round(reach), subscribers: Math.round(subscribers),
            disabled: row.copy.disabled, reason: row.copy.reason, place: row.copy.place, country: row.copy.country,
        };
    });

    perCity.forEach((bucket, id) => {
        const city = campaignCity(id);
        if (!city) return;
        bucket.reach = Math.round(Math.min(bucket.reach, city.metroM * 1_000_000 * 0.85));
        bucket.subscribers = Math.round(Math.min(bucket.subscribers, city.metroM * 1_000_000 * 0.015));
    });
    const weekly = [...spendById.values()].reduce((sum, value) => sum + value, 0);
    const openingCost = selected.reduce((sum, row) => sum + row.opening, 0);
    const total = weekly * weeks + openingCost;
    const cityLines = [...perCity.values()].filter(row => row.cost > 0 || row.reach > 0 || row.subscribers > 0);
    const costRaw = cityLines.reduce((sum, row) => sum + row.cost, 0);
    if (costRaw > 0 && total > 0) {
        let used = 0;
        cityLines.forEach((row, index) => {
            if (index === cityLines.length - 1) row.cost = Math.max(0, total - used);
            else {
                row.cost = roundK(total * (row.cost / costRaw));
                used += row.cost;
            }
        });
    }
    const subscribers = cityLines.reduce((sum, row) => sum + row.subscribers, 0);
    const reach = cityLines.reduce((sum, row) => sum + row.reach, 0);
    if (selected.some(row => row.opening > 0)) notes.push('Opening night is booked once in each city that can hold it. It is not multiplied by the weeks.');
    if (weeks > 1 && weekly > 0) notes.push(`Weekly media is prepaid for ${weeks} weeks.`);
    if (ratio < 0.999 && rateTotal > 0) notes.push('A lighter flight buys fewer impressions. The rate card did not get cheaper.');
    return {
        weeks,
        weekly,
        opening: openingCost,
        total,
        reach,
        buzz: Math.round(clamp(buzzScore * Math.min(1.35, 0.7 + cities.length * 0.06) * Math.min(creative, 1.12), 0, 100)),
        subscribers,
        demand: subscribers <= 0 ? 0 : Math.round(clamp(subscribers / 800_000, 0.008, 0.1) * 1000) / 1000,
        channels: lines,
        cities: cityLines,
        notes,
    };
};

const finite = (value: unknown, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const cleanLaunchFlight = (raw: unknown): LaunchFlight | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const row = raw as Partial<LaunchFlight>;
    if (!Array.isArray(row.cityIds) || !Array.isArray(row.channelIds)) return undefined;
    const cityIds = row.cityIds.filter((id): id is string => typeof id === 'string' && Boolean(campaignCity(id))).slice(0, 48);
    const channelIds = row.channelIds.filter((id): id is string => typeof id === 'string' && Boolean(launchChannel(id))).slice(0, 48);
    if (!cityIds.length || !channelIds.length) return undefined;
    const cities = Array.isArray(row.cities) ? row.cities.flatMap(item => {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !campaignCity(item.id)) return [];
        return [{
            id: item.id,
            name: campaignCity(item.id)!.name,
            country: countryName(campaignCity(item.id)!.countryId),
            reach: Math.max(0, finite(item.reach)),
            subscribers: Math.max(0, finite(item.subscribers)),
            cost: Math.max(0, finite(item.cost)),
        }];
    }).slice(0, 48) : [];
    return {
        version: 1,
        what: row.what === 'TITLE' ? 'TITLE' : 'PLATFORM',
        titleId: typeof row.titleId === 'string' ? row.titleId.slice(0, 80) : 'platform',
        titleName: typeof row.titleName === 'string' && row.titleName.trim() ? row.titleName.slice(0, 80) : 'Empire+',
        cityIds,
        channelIds,
        creativeId: KEY_ARTS.some(art => art.id === row.creativeId) ? row.creativeId! : 'night',
        trailerId: TRAILER_CUTS.some(cut => cut.id === row.trailerId) ? row.trailerId! : 'open',
        tagline: typeof row.tagline === 'string' ? row.tagline.slice(0, 90) : TAGLINES[0],
        weeks: clamp(Math.round(finite(row.weeks, 1)), 1, 520),
        weeklyBudget: Math.max(0, finite(row.weeklyBudget)),
        openingCost: Math.max(0, finite(row.openingCost)),
        totalCost: Math.max(0, finite(row.totalCost)),
        reach: Math.max(0, finite(row.reach)),
        buzz: clamp(finite(row.buzz), 0, 100),
        subscribers: Math.max(0, finite(row.subscribers)),
        demand: clamp(finite(row.demand), 0, 0.1),
        demandUntil: Number.isFinite(Number(row.demandUntil)) ? Math.round(Number(row.demandUntil)) : undefined,
        cities,
        campaignIds: Array.isArray(row.campaignIds) ? row.campaignIds.filter((id): id is string => typeof id === 'string').slice(0, 80) : [],
        appliedAbsolute: Number.isFinite(Number(row.appliedAbsolute)) ? Math.round(Number(row.appliedAbsolute)) : undefined,
        bookedAbsolute: Math.round(finite(row.bookedAbsolute)),
        airedAbsolute: Number.isFinite(Number(row.airedAbsolute)) ? Math.round(Number(row.airedAbsolute)) : undefined,
        held: Boolean(row.held),
        extensions: Math.max(0, Math.round(finite(row.extensions))),
        stoppedAbsolute: Number.isFinite(Number(row.stoppedAbsolute)) ? Math.round(Number(row.stoppedAbsolute)) : undefined,
        channelCities: cleanChannelCities(row.channelCities),
    };
};

const cleanChannelCities = (raw: unknown): Record<string, string[]> | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const next: Record<string, string[]> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([id, value]) => {
        if (!launchChannel(id) || !Array.isArray(value)) return;
        const ids = value.filter((cityId): cityId is string => typeof cityId === 'string' && Boolean(campaignCity(cityId))).slice(0, 48);
        if (ids.length) next[id] = ids;
    });
    return Object.keys(next).length ? next : undefined;
};

bindLaunchCatalog({
    actions: launchActionDefs,
    place: placeRule,
    clean: cleanLaunchFlight,
});
