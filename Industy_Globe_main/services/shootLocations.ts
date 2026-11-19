import type { FilmIndustryId } from '../types';

export interface ShootLocation {
    id: string;
    name: string;
    desc: string;
    cost: number;
    quality: number;
    x: number;
    y: number;
    industryId: FilmIndustryId;
    country: string;
    /** Shoot, a release city, a marketing city, or more than one. */
    uses: Array<'SHOOT' | 'RELEASE' | 'MARKETING'>;
}

const loc = (
    id: string,
    name: string,
    desc: string,
    cost: number,
    quality: number,
    x: number,
    y: number,
    industryId: FilmIndustryId,
    country: string,
    uses: ShootLocation['uses'] = ['SHOOT', 'RELEASE', 'MARKETING'],
): ShootLocation => ({ id, name, desc, cost, quality, x, y, industryId, country, uses });

/** Existing map pins, plus more cities per country. Costs of the original pins are unchanged. */
export const SHOOT_LOCATIONS: ShootLocation[] = [
    loc('LA', 'Los Angeles', 'The heart of Hollywood. Expensive but high quality.', 15000000, 10, 15, 35, 'HOLLYWOOD', 'United States'),
    loc('ATL', 'Atlanta', 'Generous tax credits. Good facilities.', 5000000, 5, 22, 38, 'HOLLYWOOD', 'United States'),
    loc('NYC', 'New York', 'Iconic urban scenery. Very expensive.', 20000000, 9, 25, 32, 'HOLLYWOOD', 'United States'),
    loc('CHI', 'Chicago', 'Elevated trains, winter light, and a real downtown.', 9000000, 8, 23, 33, 'HOLLYWOOD', 'United States'),
    loc('NOL', 'New Orleans', 'Tax credits, humidity, and streets that play period.', 4500000, 7, 21, 42, 'HOLLYWOOD', 'United States'),
    loc('AUS', 'Austin', 'Music rooms and a cheaper night shoot than the coasts.', 3500000, 6, 18, 40, 'HOLLYWOOD', 'United States'),
    loc('VAN', 'Vancouver', 'Versatile and budget friendly.', 3000000, 6, 12, 28, 'HOLLYWOOD', 'Canada'),
    loc('YVR', 'Montreal', 'Winter streets and a bilingual crew.', 3800000, 7, 24, 28, 'HOLLYWOOD', 'Canada'),
    loc('MEX', 'Mexico City', 'Vibrant culture and unique architecture.', 4000000, 7, 18, 45, 'LATIN', 'Mexico'),
    loc('GDL', 'Guadalajara', 'A second Mexican base. Studios and a festival crowd.', 2800000, 6, 16, 44, 'LATIN', 'Mexico'),
    loc('TOR', 'Toronto', 'Urban double for NYC/Chicago.', 3500000, 6, 20, 30, 'HOLLYWOOD', 'Canada'),
    loc('LDN', 'London', 'World-class studios and talent.', 12000000, 9, 48, 28, 'BRITISH', 'United Kingdom'),
    loc('MAN', 'Manchester', 'North of England streets at a lower rate than London.', 5000000, 7, 47, 26, 'BRITISH', 'United Kingdom'),
    loc('EDI', 'Edinburgh', 'Festival city and stone closes.', 4200000, 8, 46, 22, 'BRITISH', 'United Kingdom'),
    loc('PAR', 'Paris', 'Romantic and historic.', 10000000, 8, 50, 32, 'BRITISH', 'France'),
    loc('LYN', 'Lyon', 'A French city that does not charge Paris prices.', 4500000, 7, 50, 34, 'BRITISH', 'France'),
    loc('PRG', 'Prague', 'Old world charm on a budget.', 2000000, 7, 54, 30, 'BRITISH', 'Czechia'),
    loc('ROM', 'Rome', 'Eternal city with epic scale.', 9000000, 9, 53, 36, 'BRITISH', 'Italy'),
    loc('MIL', 'Milan', 'Fashion, rain, and a modern skyline.', 7000000, 7, 52, 34, 'BRITISH', 'Italy'),
    loc('BER', 'Berlin', 'Gritty urban and modern tech.', 7000000, 8, 53, 28, 'BRITISH', 'Germany'),
    loc('MUC', 'Munich', 'Clean period streets and a beer-hall square.', 5500000, 7, 54, 30, 'BRITISH', 'Germany'),
    loc('MAD', 'Madrid', 'Sunny and historic.', 5000000, 7, 46, 38, 'BRITISH', 'Spain'),
    loc('BCN', 'Barcelona', 'Coast, modernism, and a night shoot that looks expensive.', 5200000, 8, 48, 36, 'BRITISH', 'Spain'),
    loc('TOK', 'Tokyo', 'Neon futuristic vibes.', 14000000, 9, 88, 35, 'JAPANESE', 'Japan'),
    loc('OSA', 'Osaka', 'Street food, canals, and a louder night than Tokyo.', 8000000, 8, 86, 36, 'JAPANESE', 'Japan'),
    loc('KYO', 'Kyoto', 'Temples, wood, and a permit that takes patience.', 7000000, 9, 87, 35, 'JAPANESE', 'Japan'),
    loc('SEO', 'Seoul', 'Modern and efficient.', 8000000, 8, 84, 34, 'KOREAN', 'South Korea'),
    loc('PUS', 'Busan', 'Port, beaches, and a festival that premiere films use.', 4500000, 8, 85, 36, 'KOREAN', 'South Korea'),
    loc('BOM', 'Mumbai', 'The home of Bollywood.', 6000000, 7, 72, 48, 'BOLLYWOOD', 'India'),
    loc('DEL', 'Delhi', 'Government avenues, old city lanes, and winter fog.', 4500000, 7, 73, 42, 'BOLLYWOOD', 'India'),
    loc('JAI', 'Jaipur', 'Palaces that read as period without a build.', 2500000, 8, 71, 44, 'BOLLYWOOD', 'India'),
    loc('PNQ', 'Pune', 'A quieter Maharashtra base for schedules that cannot live in Mumbai.', 1800000, 6, 71, 48, 'BOLLYWOOD', 'India'),
    loc('GOI', 'Goa', 'Beaches and a song location that every unit already knows.', 2200000, 7, 70, 52, 'BOLLYWOOD', 'India'),
    loc('CCU', 'Kolkata', 'River light and old houses.', 2000000, 7, 76, 46, 'BOLLYWOOD', 'India'),
    loc('HYD', 'Hyderabad', 'Film Nagar, the rocks, and the Telugu industry\'s home sets.', 3500000, 8, 74, 50, 'TOLLYWOOD', 'India'),
    loc('MAA', 'Chennai', 'Marina, studios in Kodambakkam, and a Tamil release city.', 3200000, 7, 75, 54, 'KOLLYWOOD', 'India'),
    loc('COK', 'Kochi', 'Backwaters and a Malayalam unit that can move fast.', 1800000, 7, 73, 56, 'MOLLYWOOD', 'India'),
    loc('HKG', 'Hong Kong', 'Dense urban neon.', 11000000, 9, 80, 42, 'CHINESE', 'Hong Kong'),
    loc('BEI', 'Beijing', 'Grand scale and history.', 12000000, 8, 78, 32, 'CHINESE', 'China'),
    loc('SHA', 'Shanghai', 'The Bund at night and a skyline that sells a modern drama.', 10000000, 8, 82, 38, 'CHINESE', 'China'),
    loc('CTU', 'Chengdu', 'A western Chinese city with food, fog, and lower stage costs.', 4000000, 7, 74, 40, 'CHINESE', 'China'),
    loc('BKK', 'Bangkok', 'Chaotic energy and temples.', 3000000, 6, 75, 45, 'HOLLYWOOD', 'Thailand'),
    loc('RIO', 'Rio de Janeiro', 'Stunning natural beauty.', 5000000, 8, 32, 72, 'LATIN', 'Brazil'),
    loc('SAO', 'São Paulo', 'A concrete megacity for contemporary Brazilian stories.', 4200000, 7, 33, 74, 'LATIN', 'Brazil'),
    loc('BUE', 'Buenos Aires', 'European flair in South America.', 4000000, 7, 30, 85, 'LATIN', 'Argentina'),
    loc('BOG', 'Bogota', 'High altitude urban grit.', 2000000, 6, 25, 58, 'LATIN', 'Colombia'),
    loc('LIM', 'Lima', 'Coastal desert city.', 2500000, 6, 22, 65, 'LATIN', 'Peru'),
    loc('CPT', 'Cape Town', 'Diverse landscapes and great light.', 4000000, 8, 53, 82, 'NOLLYWOOD', 'South Africa'),
    loc('CAI', 'Cairo', 'Ancient wonders and desert heat.', 7000000, 7, 56, 42, 'BRITISH', 'Egypt'),
    loc('MAR', 'Marrakesh', 'Exotic colors and textures.', 3000000, 8, 46, 42, 'BRITISH', 'Morocco'),
    loc('LAG', 'Lagos', 'Bustling energy.', 2000000, 5, 48, 55, 'NOLLYWOOD', 'Nigeria'),
    loc('ABV', 'Abuja', 'A calmer Nigerian capital for offices and government scenes.', 1500000, 5, 49, 52, 'NOLLYWOOD', 'Nigeria'),
    loc('SYD', 'Sydney', 'Modern harbor and coastal beauty.', 10000000, 9, 88, 82, 'HOLLYWOOD', 'Australia'),
    loc('MEL', 'Melbourne', 'Arts and culture hub.', 8000000, 8, 86, 86, 'HOLLYWOOD', 'Australia'),
    loc('AKL', 'Auckland', 'Middle-earth landscapes.', 6000000, 10, 94, 88, 'HOLLYWOOD', 'New Zealand'),
    loc('DXB', 'Dubai', 'A marketing skyline. Permits are the real line item.', 9000000, 8, 64, 44, 'HOLLYWOOD', 'United Arab Emirates', ['SHOOT', 'MARKETING']),
];

export const SHOOT_LOCATION_GROUPS: Record<string, ShootLocation[]> = {
    NA: SHOOT_LOCATIONS.filter(row => ['United States', 'Canada', 'Mexico'].includes(row.country)),
    EU: SHOOT_LOCATIONS.filter(row => ['United Kingdom', 'France', 'Czechia', 'Italy', 'Germany', 'Spain'].includes(row.country)),
    AS: SHOOT_LOCATIONS.filter(row => ['Japan', 'South Korea', 'India', 'Hong Kong', 'China', 'Thailand', 'United Arab Emirates'].includes(row.country)),
    SA: SHOOT_LOCATIONS.filter(row => ['Brazil', 'Argentina', 'Colombia', 'Peru'].includes(row.country)),
    AF: SHOOT_LOCATIONS.filter(row => ['South Africa', 'Egypt', 'Morocco', 'Nigeria'].includes(row.country)),
    OC: SHOOT_LOCATIONS.filter(row => ['Australia', 'New Zealand'].includes(row.country)),
};

export const shootLocationById = (id: string): ShootLocation | undefined =>
    SHOOT_LOCATIONS.find(row => row.id === id);
