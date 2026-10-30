import { LaunchRegionId } from '../../types';

/** A room where Scout, Workhorse, and Titan racks can stand. Prices still come from the server classes. */
export interface ServerCity {
    id: string;
    name: string;
    countryId: string;
    regionId: LaunchRegionId;
    lat: number;
    lon: number;
    /** Workhorse-sized racks the room can feed before power, cooling, or fibre gives way. */
    roomRacks: number;
    /** Multiplier on the rack's upfront and weekly price. 1 is the catalogue price. */
    costIndex: number;
}

const city = (
    id: string,
    name: string,
    countryId: string,
    regionId: LaunchRegionId,
    lat: number,
    lon: number,
    roomRacks: number,
    costIndex: number,
): ServerCity => ({ id, name, countryId, regionId, lat, lon, roomRacks, costIndex });

/** Real cities on the launch map. Ids of the original region dots are unchanged. */
export const SERVER_CITIES: ServerCity[] = [
    city('nyc', 'New York', 'US', 'NORTH_AMERICA', 40.71, -74.01, 24, 1.18),
    city('lax', 'Los Angeles', 'US', 'NORTH_AMERICA', 34.05, -118.24, 20, 1.12),
    city('chi', 'Chicago', 'US', 'NORTH_AMERICA', 41.88, -87.63, 16, 1.02),
    city('hou', 'Houston', 'US', 'NORTH_AMERICA', 29.76, -95.37, 14, 0.96),
    city('mia', 'Miami', 'US', 'NORTH_AMERICA', 25.76, -80.19, 12, 1.04),
    city('atl', 'Atlanta', 'US', 'NORTH_AMERICA', 33.75, -84.39, 12, 0.94),
    city('aus', 'Austin', 'US', 'NORTH_AMERICA', 30.27, -97.74, 10, 0.95),
    city('bna', 'Nashville', 'US', 'NORTH_AMERICA', 36.16, -86.78, 8, 0.93),
    city('yyz', 'Toronto', 'CA', 'NORTH_AMERICA', 43.65, -79.38, 14, 1.02),
    city('mex', 'Mexico City', 'MX', 'NORTH_AMERICA', 19.43, -99.13, 14, 0.9),
    city('sao', 'São Paulo', 'BR', 'SOUTH_AMERICA', -23.55, -46.63, 18, 0.96),
    city('rio', 'Rio de Janeiro', 'BR', 'SOUTH_AMERICA', -22.91, -43.17, 12, 0.98),
    city('eze', 'Buenos Aires', 'AR', 'SOUTH_AMERICA', -34.6, -58.38, 12, 0.92),
    city('bog', 'Bogotá', 'CO', 'SOUTH_AMERICA', 4.71, -74.07, 10, 0.9),
    city('lon', 'London', 'GB', 'EUROPE', 51.51, -0.13, 24, 1.15),
    city('par', 'Paris', 'FR', 'EUROPE', 48.86, 2.35, 16, 1.1),
    city('ber', 'Berlin', 'DE', 'EUROPE', 52.52, 13.4, 14, 1.0),
    city('fra', 'Frankfurt', 'DE', 'EUROPE', 50.11, 8.68, 24, 1.04),
    city('ams', 'Amsterdam', 'NL', 'EUROPE', 52.37, 4.9, 20, 1.06),
    city('mad', 'Madrid', 'ES', 'EUROPE', 40.42, -3.7, 12, 0.98),
    city('lis', 'Lisbon', 'PT', 'EUROPE', 38.72, -9.14, 10, 0.94),
    city('rom', 'Rome', 'IT', 'EUROPE', 41.9, 12.5, 12, 1.0),
    city('sto', 'Stockholm', 'SE', 'EUROPE', 59.33, 18.07, 10, 1.05),
    city('rek', 'Reykjavik', 'IS', 'EUROPE', 64.15, -21.94, 8, 1.08),
    city('los', 'Lagos', 'NG', 'AFRICA', 6.52, 3.38, 14, 0.84),
    city('jnb', 'Johannesburg', 'ZA', 'AFRICA', -26.2, 28.05, 12, 0.9),
    city('cai', 'Cairo', 'EG', 'AFRICA', 30.04, 31.24, 12, 0.86),
    city('nbo', 'Nairobi', 'KE', 'AFRICA', -1.29, 36.82, 10, 0.85),
    city('rak', 'Marrakech', 'MA', 'AFRICA', 31.63, -8.01, 8, 0.88),
    city('bom', 'Mumbai', 'IN', 'ASIA', 19.08, 72.88, 16, 0.9),
    city('del', 'Delhi', 'IN', 'ASIA', 28.61, 77.21, 16, 0.88),
    city('blr', 'Bengaluru', 'IN', 'ASIA', 12.97, 77.59, 18, 0.92),
    city('tyo', 'Tokyo', 'JP', 'ASIA', 35.68, 139.65, 20, 1.16),
    city('sel', 'Seoul', 'KR', 'ASIA', 37.57, 126.98, 16, 1.06),
    city('sha', 'Shanghai', 'CN', 'ASIA', 31.23, 121.47, 18, 1.0),
    city('sin', 'Singapore', 'SG', 'ASIA', 1.35, 103.82, 24, 1.12),
    city('dxb', 'Dubai', 'AE', 'ASIA', 25.2, 55.27, 14, 1.08),
    city('jkt', 'Jakarta', 'ID', 'ASIA', -6.21, 106.85, 12, 0.88),
    city('mnl', 'Manila', 'PH', 'ASIA', 14.6, 120.98, 10, 0.9),
    city('syd', 'Sydney', 'AU', 'OCEANIA', -33.87, 151.21, 14, 1.08),
    city('akl', 'Auckland', 'NZ', 'OCEANIA', -36.85, 174.76, 10, 1.04),
];

const BY_ID = new Map(SERVER_CITIES.map(row => [row.id, row]));

export const cityById = (id: string | undefined): ServerCity | undefined => (id ? BY_ID.get(id) : undefined);

export const citiesInRegion = (regionId: LaunchRegionId): ServerCity[] =>
    SERVER_CITIES.filter(row => row.regionId === regionId);

export const citiesInCountry = (countryId: string): ServerCity[] =>
    SERVER_CITIES.filter(row => row.countryId === countryId);
