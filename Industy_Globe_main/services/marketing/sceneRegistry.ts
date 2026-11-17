/**
 * One scene per format per campaign city.
 * The place label is always that city's own landmark or district.
 * A tower that stands in Dubai is never labelled with Mumbai.
 */
import {
    CAMPAIGN_CITIES,
    CITY_LANDMARK,
    LANDMARK_SCREENS,
    campaignCity,
    landmarkFor,
    type CampaignCity,
} from './launchCatalog';

export type SceneEffect = 'led' | 'billboard' | 'screen' | 'drone' | 'banner' | 'stunt' | 'festival';
export type FrameRatio = '1:9' | '3:1' | '16:9' | '3:4';
export type SkylineKind = 'gulf' | 'canyon' | 'plaza' | 'euro' | 'harbour' | 'tropical' | 'tower';

export interface SurfaceQuad {
    x: number;
    y: number;
    w: number;
    h: number;
    rotateY: number;
    skew: number;
}

export interface CampaignScene {
    id: string;
    formatId: string;
    formatName: string;
    subtitle: string;
    effect: SceneEffect;
    frame: FrameRatio;
    quad: SurfaceQuad;
    cityId: string;
    cityName: string;
    country: string;
    district: string;
    /** Words on the card. Never pairs a landmark with a city it does not stand in. */
    placeLabel: string;
    /** Scrolling line in the live modal. */
    marquee: string;
    /** Optional photo. Empty means the layered scene draws the night. */
    backdrop: string;
    skyline: SkylineKind;
    venue: string;
}

export interface RunFormat {
    id: string;
    name: string;
    subtitle: string;
    effect: SceneEffect;
    frame: FrameRatio;
}

export const RUN_FORMATS: RunFormat[] = [
    { id: 'airport_screens', name: 'Airport screens', subtitle: 'Gates and baggage halls', effect: 'screen', frame: '16:9' },
    { id: 'mall_screens', name: 'Mall screens', subtitle: 'Atriums and escalators', effect: 'screen', frame: '16:9' },
    { id: 'city_screens', name: 'City screens', subtitle: 'Municipal LEDs on the main roads', effect: 'screen', frame: '16:9' },
    { id: 'stunt', name: 'Live stunt show', subtitle: 'A ramp, a jump, then fireworks', effect: 'stunt', frame: '16:9' },
    { id: 'fan_fest', name: 'Fan festival', subtitle: 'A stage, a crowd, and the title', effect: 'festival', frame: '16:9' },
    { id: 'drone', name: 'Drone show', subtitle: 'The title formed in the night sky', effect: 'drone', frame: '16:9' },
    { id: 'building_reveal', name: 'Building reveal', subtitle: 'A banner down a tower', effect: 'banner', frame: '3:4' },
    { id: 'landmark_light', name: 'Landmark light show', subtitle: 'The tower wears the title', effect: 'led', frame: '1:9' },
    { id: 'billboards', name: 'Rooftop billboard', subtitle: 'Lit from the lamps below', effect: 'billboard', frame: '3:1' },
];

const FORMAT_BY_ID = new Map(RUN_FORMATS.map(row => [row.id, row]));

const QUAD: Record<SceneEffect, SurfaceQuad> = {
    led: { x: 62, y: 6, w: 11, h: 82, rotateY: -14, skew: -2 },
    billboard: { x: 16, y: 28, w: 68, h: 22, rotateY: 8, skew: -4 },
    screen: { x: 18, y: 30, w: 64, h: 34, rotateY: -6, skew: 0 },
    drone: { x: 22, y: 18, w: 56, h: 28, rotateY: 0, skew: 0 },
    banner: { x: 34, y: 8, w: 32, h: 62, rotateY: 4, skew: 0 },
    stunt: { x: 28, y: 22, w: 44, h: 26, rotateY: -4, skew: 0 },
    festival: { x: 22, y: 18, w: 56, h: 32, rotateY: 0, skew: 0 },
};

const COUNTRY: Record<string, string> = { CZ: 'Czechia' };

const VENUE: Record<string, Record<string, string>> = {
    airport_screens: {
        bom: 'Chhatrapati Shivaji', dxb: 'DXB', nyc: 'JFK', par: 'Charles de Gaulle',
        mad: 'Barajas', prg: 'Václav Havel', ber: 'BER', lon: 'Heathrow', tyo: 'Haneda',
    },
    mall_screens: {
        dxb: 'Dubai Mall', bom: 'Phoenix Mills', nyc: 'Hudson Yards', par: 'Forum des Halles',
        ber: 'Alexa', mad: 'Plaza Norte', prg: 'Palladium', lon: 'Westfield',
    },
    city_screens: {
        nyc: 'Times Square', ber: 'Alexanderplatz', tyo: 'Shibuya Crossing', lon: 'Piccadilly Circus',
        dxb: 'Sheikh Zayed Road', bom: 'Bandra', par: 'Champs-Élysées', mad: 'Gran Vía',
        prg: 'Wenceslas Square', sel: 'COEX', sha: 'Nanjing Road', sin: 'Orchard Road',
    },
};

const skylineFor = (city: CampaignCity): SkylineKind => {
    if (city.id === 'dxb' || city.id === 'cai') return 'gulf';
    if (city.id === 'nyc' || city.id === 'chi' || city.id === 'sha') return 'canyon';
    if (city.id === 'ber' || city.id === 'mad' || city.id === 'prg' || city.id === 'rom') return 'plaza';
    if (city.id === 'syd' || city.id === 'sin' || city.regionId === 'OCEANIA') return 'harbour';
    if (city.id === 'tyo' || city.id === 'sel' || city.id === 'yyz') return 'tower';
    if (city.regionId === 'EUROPE') return 'euro';
    if (city.regionId === 'ASIA' || city.regionId === 'AFRICA' || city.regionId === 'SOUTH_AMERICA') return 'tropical';
    return 'canyon';
};

const countryOf = (city: CampaignCity) => COUNTRY[city.countryId] || city.countryId;

export const sceneId = (formatId: string, cityId: string) => `${formatId}:${cityId}`;

const venueFor = (formatId: string, city: CampaignCity): string => {
    const named = VENUE[formatId]?.[city.id];
    if (named) return named;
    if (formatId === 'city_screens') return LANDMARK_SCREENS[city.id] || city.district;
    if (formatId === 'landmark_light') return landmarkFor(city.id, 'light').name;
    if (formatId === 'drone') return landmarkFor(city.id, 'drone').name;
    if (formatId === 'building_reveal') return CITY_LANDMARK[city.id]?.name || city.district;
    return city.district;
};

/** Card line. One city uses the place. Many cities keep the first city's own name, then the count. */
export const placeLine = (formatId: string, cityIds: string[]): string => {
    const cities = cityIds.map(campaignCity).filter((row): row is CampaignCity => Boolean(row));
    if (!cities.length) return '';
    const first = cities[0];
    if (formatId === 'landmark_light') {
        const name = landmarkFor(first.id, 'light').name;
        if (cities.length === 1) return name;
        return `${name} · ${first.name} and ${cities.length - 1} more`;
    }
    if (cities.length === 1) return first.name;
    return `${first.name} · ${first.name} and ${cities.length - 1} more`;
};

export const sceneFor = (formatId: string, cityId: string): CampaignScene | undefined => {
    const format = FORMAT_BY_ID.get(formatId);
    const city = campaignCity(cityId);
    if (!format || !city) return undefined;
    const venue = venueFor(formatId, city);
    const country = countryOf(city);
    const placeLabel = formatId === 'landmark_light'
        ? landmarkFor(city.id, 'light').name
        : formatId === 'city_screens'
            ? venue
            : city.name;
    const headline = formatId === 'landmark_light'
        ? `${venue} light show`
        : format.name;
    const where = formatId === 'landmark_light'
        ? `${city.district} ${city.name}`
        : formatId === 'city_screens' || formatId === 'mall_screens' || formatId === 'airport_screens'
            ? `${venue}, ${city.name}`
            : city.name;
    return {
        id: sceneId(formatId, city.id),
        formatId,
        formatName: format.name,
        subtitle: format.subtitle,
        effect: format.effect,
        frame: format.frame,
        quad: QUAD[format.effect],
        cityId: city.id,
        cityName: city.name,
        country,
        district: city.district,
        placeLabel,
        marquee: `${headline} · ${where}`.toUpperCase(),
        backdrop: '',
        skyline: skylineFor(city),
        venue,
    };
};

let cached: CampaignScene[] | null = null;

/** Every format the board can play, in every city the campaign map already sells. */
export const allCampaignScenes = (): CampaignScene[] => {
    if (cached) return cached;
    cached = RUN_FORMATS.flatMap(format => CAMPAIGN_CITIES.flatMap(city => {
        const scene = sceneFor(format.id, city.id);
        return scene ? [scene] : [];
    }));
    return cached;
};

export const scenesForFormat = (formatId: string): CampaignScene[] => (
    allCampaignScenes().filter(scene => scene.formatId === formatId)
);

export const runFormat = (id: string) => FORMAT_BY_ID.get(id);

/** A landmark label that mentions a city must be that landmark's city. */
export const labelMatchesCity = (scene: CampaignScene): boolean => {
    const landmark = landmarkFor(scene.cityId, scene.effect === 'drone' ? 'drone' : 'light').name.toLowerCase();
    const label = `${scene.placeLabel} ${scene.marquee}`.toLowerCase();
    if (landmark.includes('burj') && !scene.cityId.includes('dxb') && label.includes('burj')) return false;
    if (scene.cityId === 'dxb' && label.includes('mumbai')) return false;
    if (scene.cityId === 'bom' && label.includes('burj')) return false;
    return label.includes(scene.cityName.toLowerCase()) || label.includes(scene.placeLabel.toLowerCase());
};
