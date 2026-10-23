/**
 * Builds the committed Rights Library catalogue.
 * Rules and curated public-domain / historical seeds only. Nothing is scraped.
 *
 *   npm run generate:rights
 *
 * REAL_NAMES_MODE is read from src/data/rights/config.ts.
 * Living people and copyrighted books keep their real names in this source.
 * The JSON ships alterName() unless the flag is on. Public-domain works and
 * long-deceased historical figures always ship their real names.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { alterName } from './rights-alter-name.mjs';
import { ATHLETES, LIVING_FIGURES, MODERN_BOOKS } from './rights-real-names.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configSrc = fs.readFileSync(path.join(root, 'src/data/rights/config.ts'), 'utf8');
const REAL_NAMES_MODE = /export const REAL_NAMES_MODE\s*=\s*true/.test(configSrc);

[
    ['Virat Kohli', 'Virat Kohly'],
    ['Cristiano Ronaldo', 'Cristiano Ronalda'],
    ['Harry Potter', 'Harry Pottar'],
].forEach(([real, expected]) => {
    const got = alterName(real);
    if (got !== expected) {
        console.error(`alterName(${real}) => ${got}, expected ${expected}`);
        process.exit(1);
    }
});

const ship = (real, keep) => {
    if (keep || REAL_NAMES_MODE) return real;
    const altered = alterName(real);
    if (!altered || altered === real) {
        throw new Error(`alterName left a protected name unchanged: ${real}`);
    }
    return altered;
};

const REGIONS = ['NORTH_AMERICA', 'LATIN_AMERICA', 'UK_EUROPE', 'INDIA_SOUTH_ASIA', 'EAST_ASIA', 'SOUTHEAST_ASIA', 'MIDDLE_EAST', 'AFRICA', 'OCEANIA'];

const COUNTRIES = [
    ['US', 'United States', 'NORTH_AMERICA', 'English', 'US'],
    ['CA', 'Canada', 'NORTH_AMERICA', 'English', 'CA'],
    ['MX', 'Mexico', 'NORTH_AMERICA', 'Spanish', 'MX'],
    ['BR', 'Brazil', 'LATIN_AMERICA', 'Portuguese', 'BR'],
    ['AR', 'Argentina', 'LATIN_AMERICA', 'Spanish', 'AR'],
    ['CO', 'Colombia', 'LATIN_AMERICA', 'Spanish', 'CO'],
    ['CL', 'Chile', 'LATIN_AMERICA', 'Spanish', 'CL'],
    ['PE', 'Peru', 'LATIN_AMERICA', 'Spanish', 'PE'],
    ['CU', 'Cuba', 'LATIN_AMERICA', 'Spanish', 'MX'],
    ['GT', 'Guatemala', 'LATIN_AMERICA', 'Spanish', 'MX'],
    ['GB', 'United Kingdom', 'UK_EUROPE', 'English', 'GB'],
    ['IE', 'Ireland', 'UK_EUROPE', 'English', 'GB'],
    ['FR', 'France', 'UK_EUROPE', 'French', 'FR'],
    ['DE', 'Germany', 'UK_EUROPE', 'German', 'DE'],
    ['ES', 'Spain', 'UK_EUROPE', 'Spanish', 'ES'],
    ['IT', 'Italy', 'UK_EUROPE', 'Italian', 'IT'],
    ['SE', 'Sweden', 'UK_EUROPE', 'Swedish', 'SE'],
    ['RU', 'Russia', 'UK_EUROPE', 'Russian', 'FR'],
    ['GR', 'Greece', 'UK_EUROPE', 'Greek', 'FR'],
    ['PL', 'Poland', 'UK_EUROPE', 'Polish', 'FR'],
    ['NO', 'Norway', 'UK_EUROPE', 'Norwegian', 'SE'],
    ['NL', 'Netherlands', 'UK_EUROPE', 'Dutch', 'FR'],
    ['PT', 'Portugal', 'UK_EUROPE', 'Portuguese', 'ES'],
    ['BE', 'Belgium', 'UK_EUROPE', 'Dutch', 'FR'],
    ['HR', 'Croatia', 'UK_EUROPE', 'Croatian', 'FR'],
    ['RS', 'Serbia', 'UK_EUROPE', 'Serbian', 'FR'],
    ['CH', 'Switzerland', 'UK_EUROPE', 'German', 'DE'],
    ['AT', 'Austria', 'UK_EUROPE', 'German', 'DE'],
    ['DK', 'Denmark', 'UK_EUROPE', 'Danish', 'SE'],
    ['FI', 'Finland', 'UK_EUROPE', 'Finnish', 'SE'],
    ['UA', 'Ukraine', 'UK_EUROPE', 'Ukrainian', 'FR'],
    ['CZ', 'Czechia', 'UK_EUROPE', 'Czech', 'FR'],
    ['HU', 'Hungary', 'UK_EUROPE', 'Hungarian', 'FR'],
    ['RO', 'Romania', 'UK_EUROPE', 'Romanian', 'FR'],
    ['SI', 'Slovenia', 'UK_EUROPE', 'Slovenian', 'FR'],
    ['BY', 'Belarus', 'UK_EUROPE', 'Belarusian', 'FR'],
    ['GE', 'Georgia', 'UK_EUROPE', 'Georgian', 'FR'],
    ['MC', 'Monaco', 'UK_EUROPE', 'French', 'FR'],
    ['SK', 'Slovakia', 'UK_EUROPE', 'Slovak', 'FR'],
    ['BA', 'Bosnia', 'UK_EUROPE', 'Bosnian', 'FR'],
    ['BG', 'Bulgaria', 'UK_EUROPE', 'Bulgarian', 'FR'],
    ['UY', 'Uruguay', 'LATIN_AMERICA', 'Spanish', 'AR'],
    ['JM', 'Jamaica', 'LATIN_AMERICA', 'English', 'US'],
    ['VE', 'Venezuela', 'LATIN_AMERICA', 'Spanish', 'CO'],
    ['DO', 'Dominican Republic', 'LATIN_AMERICA', 'Spanish', 'MX'],
    ['EC', 'Ecuador', 'LATIN_AMERICA', 'Spanish', 'CO'],
    ['BO', 'Bolivia', 'LATIN_AMERICA', 'Spanish', 'PE'],
    ['BB', 'Barbados', 'LATIN_AMERICA', 'English', 'US'],
    ['LC', 'Saint Lucia', 'LATIN_AMERICA', 'English', 'US'],
    ['CM', 'Cameroon', 'AFRICA', 'French', 'FR'],
    ['CI', 'Cote d Ivoire', 'AFRICA', 'French', 'FR'],
    ['DZ', 'Algeria', 'AFRICA', 'Arabic', 'EG'],
    ['TN', 'Tunisia', 'AFRICA', 'Arabic', 'EG'],
    ['UG', 'Uganda', 'AFRICA', 'English', 'KE'],
    ['ZM', 'Zambia', 'AFRICA', 'English', 'ZA'],
    ['TZ', 'Tanzania', 'AFRICA', 'Swahili', 'KE'],
    ['RW', 'Rwanda', 'AFRICA', 'English', 'KE'],
    ['BJ', 'Benin', 'AFRICA', 'French', 'FR'],
    ['LR', 'Liberia', 'AFRICA', 'English', 'NG'],
    ['ER', 'Eritrea', 'AFRICA', 'Tigrinya', 'ET'],
    ['BW', 'Botswana', 'AFRICA', 'English', 'ZA'],
    ['QA', 'Qatar', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['JO', 'Jordan', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['LB', 'Lebanon', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['YE', 'Yemen', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['IN', 'India', 'INDIA_SOUTH_ASIA', 'Hindi', 'IN'],
    ['PK', 'Pakistan', 'INDIA_SOUTH_ASIA', 'Urdu', 'IN'],
    ['BD', 'Bangladesh', 'INDIA_SOUTH_ASIA', 'Bengali', 'IN'],
    ['LK', 'Sri Lanka', 'INDIA_SOUTH_ASIA', 'Sinhala', 'IN'],
    ['NP', 'Nepal', 'INDIA_SOUTH_ASIA', 'Nepali', 'IN'],
    ['JP', 'Japan', 'EAST_ASIA', 'Japanese', 'JP'],
    ['KR', 'South Korea', 'EAST_ASIA', 'Korean', 'KR'],
    ['CN', 'China', 'EAST_ASIA', 'Mandarin', 'CN'],
    ['TW', 'Taiwan', 'EAST_ASIA', 'Mandarin', 'CN'],
    ['HK', 'Hong Kong', 'EAST_ASIA', 'Cantonese', 'CN'],
    ['ID', 'Indonesia', 'SOUTHEAST_ASIA', 'Indonesian', 'ID'],
    ['PH', 'Philippines', 'SOUTHEAST_ASIA', 'Filipino', 'PH'],
    ['TH', 'Thailand', 'SOUTHEAST_ASIA', 'Thai', 'ID'],
    ['VN', 'Vietnam', 'SOUTHEAST_ASIA', 'Vietnamese', 'ID'],
    ['MY', 'Malaysia', 'SOUTHEAST_ASIA', 'Malay', 'ID'],
    ['SG', 'Singapore', 'SOUTHEAST_ASIA', 'English', 'ID'],
    ['MM', 'Myanmar', 'SOUTHEAST_ASIA', 'Burmese', 'ID'],
    ['EG', 'Egypt', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['SA', 'Saudi Arabia', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['IR', 'Iran', 'MIDDLE_EAST', 'Persian', 'EG'],
    ['TR', 'Turkey', 'MIDDLE_EAST', 'Turkish', 'EG'],
    ['IL', 'Israel', 'MIDDLE_EAST', 'Hebrew', 'EG'],
    ['AE', 'United Arab Emirates', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['PS', 'Palestine', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['OM', 'Oman', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['KW', 'Kuwait', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['SY', 'Syria', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['SD', 'Sudan', 'AFRICA', 'Arabic', 'EG'],
    ['SO', 'Somalia', 'AFRICA', 'Somali', 'KE'],
    ['AO', 'Angola', 'AFRICA', 'Portuguese', 'ZA'],
    ['MZ', 'Mozambique', 'AFRICA', 'Portuguese', 'ZA'],
    ['NI', 'Nicaragua', 'LATIN_AMERICA', 'Spanish', 'MX'],
    ['SV', 'El Salvador', 'LATIN_AMERICA', 'Spanish', 'MX'],
    ['IQ', 'Iraq', 'MIDDLE_EAST', 'Arabic', 'EG'],
    ['NG', 'Nigeria', 'AFRICA', 'English', 'NG'],
    ['ZA', 'South Africa', 'AFRICA', 'English', 'ZA'],
    ['KE', 'Kenya', 'AFRICA', 'Swahili', 'KE'],
    ['GH', 'Ghana', 'AFRICA', 'English', 'NG'],
    ['SN', 'Senegal', 'AFRICA', 'French', 'FR'],
    ['ET', 'Ethiopia', 'AFRICA', 'Amharic', 'KE'],
    ['MA', 'Morocco', 'AFRICA', 'Arabic', 'EG'],
    ['ML', 'Mali', 'AFRICA', 'French', 'FR'],
    ['CD', 'DR Congo', 'AFRICA', 'French', 'FR'],
    ['AU', 'Australia', 'OCEANIA', 'English', 'AU'],
    ['NZ', 'New Zealand', 'OCEANIA', 'English', 'NZ'],
    ['FJ', 'Fiji', 'OCEANIA', 'English', 'AU'],
    ['WS', 'Samoa', 'OCEANIA', 'Samoan', 'NZ'],
    ['PG', 'Papua New Guinea', 'OCEANIA', 'English', 'AU'],
    ['TT', 'Trinidad and Tobago', 'LATIN_AMERICA', 'English', 'US'],
    ['GY', 'Guyana', 'LATIN_AMERICA', 'English', 'US'],
    ['AG', 'Antigua and Barbuda', 'LATIN_AMERICA', 'English', 'US'],
    ['HT', 'Haiti', 'LATIN_AMERICA', 'French', 'US'],
    ['PR', 'Puerto Rico', 'LATIN_AMERICA', 'Spanish', 'US'],
    ['PA', 'Panama', 'LATIN_AMERICA', 'Spanish', 'CO'],
    ['AF', 'Afghanistan', 'INDIA_SOUTH_ASIA', 'Dari', 'IN'],
    ['ZW', 'Zimbabwe', 'AFRICA', 'English', 'ZA'],
    ['NA', 'Namibia', 'AFRICA', 'English', 'ZA'],
    ['MZ', 'Mozambique', 'AFRICA', 'Portuguese', 'ZA'],
    ['EE', 'Estonia', 'UK_EUROPE', 'Estonian', 'FR'],
    ['LV', 'Latvia', 'UK_EUROPE', 'Latvian', 'FR'],
    ['IS', 'Iceland', 'UK_EUROPE', 'Icelandic', 'SE'],
    ['LU', 'Luxembourg', 'UK_EUROPE', 'French', 'FR'],
    ['KZ', 'Kazakhstan', 'EAST_ASIA', 'Kazakh', 'CN'],
    ['UZ', 'Uzbekistan', 'EAST_ASIA', 'Uzbek', 'CN'],
    ['KG', 'Kyrgyzstan', 'EAST_ASIA', 'Kyrgyz', 'CN'],
    ['MN', 'Mongolia', 'EAST_ASIA', 'Mongolian', 'CN'],
    ['KP', 'North Korea', 'EAST_ASIA', 'Korean', 'KR'],
    ['AM', 'Armenia', 'UK_EUROPE', 'Armenian', 'FR'],
    ['AZ', 'Azerbaijan', 'UK_EUROPE', 'Azerbaijani', 'FR'],
    ['AL', 'Albania', 'UK_EUROPE', 'Albanian', 'FR'],
    ['MK', 'North Macedonia', 'UK_EUROPE', 'Macedonian', 'FR'],
    ['ME', 'Montenegro', 'UK_EUROPE', 'Montenegrin', 'FR'],
    ['XK', 'Kosovo', 'UK_EUROPE', 'Albanian', 'FR'],
    ['CY', 'Cyprus', 'UK_EUROPE', 'Greek', 'FR'],
    ['MT', 'Malta', 'UK_EUROPE', 'English', 'GB'],
    ['LI', 'Liechtenstein', 'UK_EUROPE', 'German', 'DE'],
    ['AD', 'Andorra', 'UK_EUROPE', 'Catalan', 'ES'],
    ['SM', 'San Marino', 'UK_EUROPE', 'Italian', 'IT'],
    ['VA', 'Vatican', 'UK_EUROPE', 'Italian', 'IT'],
    ['GL', 'Greenland', 'UK_EUROPE', 'Greenlandic', 'SE'],
];

const byId = Object.fromEntries(COUNTRIES.map(row => [row[0], {
    id: row[0], name: row[1], region: row[2], language: row[3], fx: row[4],
}]));

const CITIES = {
    US: ['Chicago', 'Detroit', 'Boston', 'Houston', 'Oakland', 'Atlanta'],
    CA: ['Toronto', 'Montreal', 'Vancouver', 'Winnipeg'],
    MX: ['Mexico City', 'Guadalajara', 'Monterrey'],
    BR: ['São Paulo', 'Rio', 'Salvador', 'Recife'],
    AR: ['Buenos Aires', 'Rosario', 'Córdoba'],
    CO: ['Bogotá', 'Medellín', 'Cali'],
    CL: ['Santiago', 'Valparaíso'],
    PE: ['Lima', 'Cusco'],
    CU: ['Havana', 'Santiago'],
    GT: ['Guatemala City'],
    GB: ['London', 'Manchester', 'Liverpool', 'Glasgow'],
    IE: ['Dublin', 'Cork'],
    FR: ['Paris', 'Lyon', 'Marseille'],
    DE: ['Berlin', 'Munich', 'Hamburg'],
    ES: ['Madrid', 'Barcelona', 'Seville'],
    IT: ['Rome', 'Milan', 'Naples'],
    SE: ['Stockholm', 'Gothenburg'],
    RU: ['Moscow', 'Saint Petersburg'],
    GR: ['Athens', 'Thessaloniki'],
    PL: ['Warsaw', 'Kraków'],
    NO: ['Oslo', 'Bergen'],
    NL: ['Amsterdam', 'Rotterdam'],
    IN: ['Ranchi', 'Mumbai', 'Chennai', 'Kolkata', 'Hyderabad', 'Lucknow'],
    PK: ['Lahore', 'Karachi', 'Multan'],
    BD: ['Dhaka', 'Chittagong'],
    LK: ['Colombo', 'Kandy'],
    NP: ['Kathmandu'],
    JP: ['Tokyo', 'Osaka', 'Fukuoka'],
    KR: ['Seoul', 'Busan'],
    CN: ['Shanghai', 'Beijing', 'Chengdu'],
    TW: ['Taipei', 'Kaohsiung'],
    HK: ['Hong Kong'],
    ID: ['Jakarta', 'Surabaya', 'Bandung'],
    PH: ['Manila', 'Cebu', 'Davao'],
    TH: ['Bangkok', 'Chiang Mai'],
    VN: ['Hanoi', 'Ho Chi Minh City'],
    MY: ['Kuala Lumpur', 'Penang'],
    SG: ['Singapore'],
    MM: ['Yangon'],
    EG: ['Cairo', 'Alexandria'],
    SA: ['Jeddah', 'Riyadh'],
    IR: ['Tehran', 'Isfahan'],
    TR: ['Istanbul', 'Ankara'],
    IL: ['Tel Aviv', 'Haifa'],
    AE: ['Dubai', 'Abu Dhabi'],
    IQ: ['Baghdad', 'Basra'],
    NG: ['Lagos', 'Kano', 'Enugu'],
    ZA: ['Johannesburg', 'Cape Town', 'Durban'],
    KE: ['Nairobi', 'Mombasa'],
    GH: ['Accra', 'Kumasi'],
    SN: ['Dakar'],
    ET: ['Addis Ababa'],
    MA: ['Casablanca', 'Marrakesh'],
    ML: ['Bamako'],
    CD: ['Kinshasa'],
    AU: ['Sydney', 'Melbourne', 'Perth'],
    NZ: ['Auckland', 'Wellington'],
    FJ: ['Suva'],
    WS: ['Apia'],
    PG: ['Port Moresby'],
};

const FIRST = {
    NORTH_AMERICA: ['Maya', 'Jonah', 'Alicia', 'Andre', 'Nora', 'Luis', 'Helen', 'Marcus'],
    LATIN_AMERICA: ['Camila', 'Mateo', 'Luiza', 'Joaquim', 'Valentina', 'Diego', 'Ana', 'Rafael'],
    UK_EUROPE: ['Elena', 'Jonas', 'Inès', 'Oskar', 'Freya', 'Luca', 'Nadia', 'Hugo'],
    INDIA_SOUTH_ASIA: ['Ayesha', 'Vikram', 'Meher', 'Arjun', 'Sana', 'Kabir', 'Anika', 'Rohan'],
    EAST_ASIA: ['Hana', 'Kenji', 'Minseo', 'Wei', 'Yuna', 'Haruto', 'Lian', 'Sora'],
    SOUTHEAST_ASIA: ['Putri', 'Arief', 'Mai', 'Ramon', 'Siti', 'Kiet', 'Linh', 'Aisha'],
    MIDDLE_EAST: ['Leila', 'Omar', 'Noor', 'Yusuf', 'Dina', 'Karim', 'Samira', 'Idris'],
    AFRICA: ['Amina', 'Kwame', 'Zola', 'Chidi', 'Fatou', 'Thabo', 'Imani', 'Jelani'],
    OCEANIA: ['Talia', 'Noah', 'Sienna', 'Mana', 'Aroha', 'Lachlan', 'Kiri', 'Hugo'],
};
const LAST = {
    NORTH_AMERICA: ['Ellison', 'Ward', 'Okoye', 'Bennett', 'Salazar', 'Cho', 'McKay', 'Duval'],
    LATIN_AMERICA: ['Vargas', 'Nunes', 'Iglesias', 'Paredes', 'Costa', 'Mendes', 'Rojas', 'Silva'],
    UK_EUROPE: ['Moreau', 'Keller', 'Rossi', 'Novak', 'Berg', 'Almeida', 'Petrov', 'Walsh'],
    INDIA_SOUTH_ASIA: ['Desai', 'Qureshi', 'Perera', 'Shrestha', 'Iyer', 'Rahman', 'Kapoor', 'Banerjee'],
    EAST_ASIA: ['Sato', 'Park', 'Liang', 'Chen', 'Kobayashi', 'Choi', 'Huang', 'Fujii'],
    SOUTHEAST_ASIA: ['Santoso', 'Reyes', 'Nguyen', 'Abdullah', 'Wong', 'Chai', 'Dela Cruz', 'Tan'],
    MIDDLE_EAST: ['Nasser', 'Farouk', 'Haddad', 'Demir', 'Azizi', 'Khoury', 'Sharif', 'El-Sayed'],
    AFRICA: ['Diallo', 'Mensah', 'Adeyemi', 'Ndlovu', 'Abebe', 'Kamara', 'Mwangi', 'Diop'],
    OCEANIA: ['Walker', 'Te Aho', 'Campbell', 'Nguyen', 'Fraser', 'Tui', 'Brooks', 'Singh'],
};

const BOOK_GENRES = ['NOVEL', 'MYTHOLOGY', 'EPIC', 'COMIC', 'MANGA', 'MANHWA', 'TRUE_CRIME', 'HISTORY', 'FANTASY', 'ROMANCE', 'THRILLER', 'CHILDREN'];
const GAME_GENRE = {
    NOVEL: 'DRAMA', MYTHOLOGY: 'FANTASY', EPIC: 'ADVENTURE', COMIC: 'SUPERHERO', MANGA: 'ACTION', MANHWA: 'FANTASY',
    TRUE_CRIME: 'CRIME', HISTORY: 'DRAMA', FANTASY: 'FANTASY', ROMANCE: 'ROMANCE', THRILLER: 'THRILLER', CHILDREN: 'ANIMATION',
};
const BASE_QUOTA = {
    NOVEL: 36, MYTHOLOGY: 16, EPIC: 14, COMIC: 18, MANGA: 12, MANHWA: 10,
    TRUE_CRIME: 20, HISTORY: 20, FANTASY: 28, ROMANCE: 26, THRILLER: 26, CHILDREN: 24,
};

const SPORTS = [
    ['cricket', 'Cricket', ['cricket captain', 'opening batter', 'fast bowler', 'spin bowler', 'wicket-keeper']],
    ['football', 'Football', ['football striker', 'midfielder', 'goalkeeper', 'football captain', 'winger']],
    ['basketball', 'Basketball', ['point guard', 'basketball center', 'shooting guard', 'forward']],
    ['american_football', 'American Football', ['quarterback', 'wide receiver', 'linebacker', 'running back']],
    ['baseball', 'Baseball', ['pitcher', 'slugger', 'shortstop', 'catcher']],
    ['tennis', 'Tennis', ['tennis champion', 'baseline grinder', 'serve-and-volley player']],
    ['boxing', 'Boxing', ['heavyweight', 'lightweight boxer', 'southpaw']],
    ['mma', 'MMA', ['MMA champion', 'strawweight', 'grappler']],
    ['f1', 'F1 and Motorsport', ['racing driver', 'rally driver', 'endurance driver']],
    ['athletics', 'Athletics', ['sprinter', 'marathon runner', 'jumper', 'hurdler']],
    ['olympics', 'Olympics', ['Olympic champion', 'multi-event athlete', 'Winter Olympian']],
    ['hockey', 'Hockey', ['hockey forward', 'goalkeeper', 'field hockey captain']],
    ['kabaddi', 'Kabaddi', ['kabaddi raider', 'kabaddi defender', 'kabaddi captain']],
    ['badminton', 'Badminton', ['badminton singles player', 'doubles specialist']],
    ['golf', 'Golf', ['golfer', 'links champion']],
    ['chess', 'Chess', ['chess grandmaster', 'chess prodigy']],
    ['wrestling', 'Wrestling', ['wrestler', 'freestyle wrestler']],
    ['esports', 'Esports', ['esports captain', 'tactics shooter star', 'fighting-game champion']],
    ['rugby', 'Rugby', ['rugby fly-half', 'rugby forward', 'rugby captain']],
    ['swimming', 'Swimming', ['swimmer', 'open-water swimmer']],
    ['cycling', 'Cycling', ['cyclist', 'sprinter on the bike', 'climber']],
    ['volleyball', 'Volleyball', ['volleyball setter', 'opposite hitter']],
    ['table_tennis', 'Table Tennis', ['table tennis player', 'chopper']],
    ['gymnastics', 'Gymnastics', ['gymnast', 'floor specialist']],
];

const FIGURES = [
    ['freedom_fighter', 'Freedom Fighter', ['freedom fighter', 'underground organiser', 'independence leader']],
    ['scientist', 'Scientist', ['scientist', 'physicist', 'physician']],
    ['musician', 'Musician', ['composer', 'singer', 'bandleader']],
    ['ceo', 'CEO', ['industrialist', 'studio chief', 'founder']],
    ['criminal', 'Criminal', ['outlaw', 'gang leader', 'con artist']],
    ['royal', 'Royal', ['monarch', 'queen', 'prince']],
    ['politician', 'Politician', ['prime minister', 'president', 'reformer']],
    ['artist', 'Artist', ['painter', 'sculptor', 'filmmaker']],
    ['explorer', 'Explorer', ['explorer', 'navigator', 'polar traveller']],
];

const TITLE_LEFT = ['Salt', 'Paper', 'Night', 'Glass', 'River', 'Red', 'Last', 'Quiet', 'Golden', 'Broken', 'Hidden', 'Winter', 'Copper', 'Blue', 'Little', 'Distant'];
const TITLE_RIGHT = {
    NOVEL: ['House', 'Season', 'Letters', 'Window', 'Family', 'City'],
    MYTHOLOGY: ['Gods', 'Oath', 'Serpent', 'Fire', 'Sky'],
    EPIC: ['March', 'Kingdom', 'Banner', 'War', 'Road'],
    COMIC: ['Mask', 'Issue', 'League', 'Signal'],
    MANGA: ['Blade', 'School', 'Spirit', 'Gate'],
    MANHWA: ['Tower', 'Hunter', 'Web', 'Crown'],
    TRUE_CRIME: ['File', 'Witness', 'Night Bus', 'Ledger'],
    HISTORY: ['Archive', 'Empire', 'Colony', 'Court'],
    FANTASY: ['Throne', 'Map', 'Wyrm', 'Gate'],
    ROMANCE: ['Monsoon', 'Letter', 'Wedding', 'Harbour'],
    THRILLER: ['Passenger', 'Signal', 'Floor', 'Alibi'],
    CHILDREN: ['Kite', 'Garden', 'Lantern', 'Fox'],
};

function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const irand = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function fansFor(region, fame, rng) {
    return REGIONS.map(id => {
        if (id === region) return Math.max(35, Math.min(100, Math.round(fame * 0.85 + irand(rng, -6, 10))));
        const near = region === 'UK_EUROPE' && id === 'NORTH_AMERICA' || region === 'NORTH_AMERICA' && id === 'UK_EUROPE';
        const base = near ? fame * 0.45 : fame * 0.18;
        return Math.max(0, Math.min(92, Math.round(base + irand(rng, -8, 12))));
    });
}

function bookMoney(fame, length, publicDomain) {
    if (publicDomain) return { optionUsd: 0, purchaseUsd: 0 };
    const lengthFactor = length === 'short' ? 0.55 : length === 'saga' ? 1.85 : 1;
    const optionUsd = Math.round((12_000 + (fame ** 1.65) * 420) * lengthFactor);
    const purchaseUsd = Math.round(optionUsd * (3.2 + fame / 45));
    return { optionUsd, purchaseUsd };
}

function lifeMoney(fame, living, controversy, publicDomain) {
    if (publicDomain) return { optionUsd: 0, purchaseUsd: 0 };
    const ask = Math.round((20_000 + (fame ** 1.7) * 500) * (living ? 1.35 : 0.75) * (1 + controversy / 200));
    return { optionUsd: 0, purchaseUsd: ask };
}

function lengthFor(genre, rng) {
    if (genre === 'CHILDREN' || genre === 'TRUE_CRIME') return rng() < 0.55 ? 'short' : 'novel';
    if (genre === 'EPIC' || genre === 'MYTHOLOGY') return rng() < 0.7 ? 'saga' : 'novel';
    if (genre === 'FANTASY' || genre === 'MANGA' || genre === 'MANHWA') return rng() < 0.45 ? 'saga' : 'novel';
    if (rng() < 0.18) return 'short';
    if (rng() < 0.28) return 'saga';
    return 'novel';
}

function seasonsFor(length, rng) {
    if (length === 'short') return 1;
    if (length === 'novel') return rng() < 0.25 ? 2 : 1;
    return irand(rng, 3, 6);
}

function quotaFor(region) {
    const quota = { ...BASE_QUOTA };
    if (region === 'EAST_ASIA') {
        quota.NOVEL -= 8; quota.MANGA += 8;
        quota.COMIC -= 6; quota.MANHWA += 6;
    } else if (region === 'INDIA_SOUTH_ASIA') {
        quota.THRILLER -= 8; quota.MYTHOLOGY += 8;
        quota.COMIC -= 4; quota.EPIC += 4;
    } else if (region === 'AFRICA' || region === 'OCEANIA') {
        quota.MANGA -= 4; quota.MYTHOLOGY += 4;
    }
    return quota;
}

const LOGLINE = {
    NOVEL: (place) => `A family in ${place} hides one decision for a generation.`,
    MYTHOLOGY: (place) => `An old bargain between gods and people comes due in ${place}.`,
    EPIC: (place) => `A long war walks from ${place} toward a capital that may not be there.`,
    COMIC: (place) => `A masked figure in ${place} inherits a city that does not want saving.`,
    MANGA: (place) => `A student in ${place} finds a power that keeps asking for more.`,
    MANHWA: (place) => `A climber in ${place} treats a living tower like a career.`,
    TRUE_CRIME: (place) => `A case file in ${place} was closed too neatly.`,
    HISTORY: (place) => `The official history of ${place} left one witness out.`,
    FANTASY: (place) => `A map of ${place} redraws itself after every rain.`,
    ROMANCE: (place) => `Two people in ${place} keep missing the same train on purpose.`,
    THRILLER: (place) => `A passenger through ${place} is carrying someone else's name.`,
    CHILDREN: (place) => `A child in ${place} follows a kite into a kinder version of the city.`,
};

/** Curated public-domain and traditional works. Real titles and authors. */
const PD_BOOKS = [
    ['Moby-Dick', 'Herman Melville', 1851, 'US', 'EPIC', 'saga', 92],
    ['The Adventures of Huckleberry Finn', 'Mark Twain', 1884, 'US', 'NOVEL', 'novel', 90],
    ['Little Women', 'Louisa May Alcott', 1868, 'US', 'NOVEL', 'novel', 86],
    ['The Call of the Wild', 'Jack London', 1903, 'US', 'NOVEL', 'short', 80],
    ['The Legend of Sleepy Hollow', 'Washington Irving', 1820, 'US', 'THRILLER', 'short', 78],
    ['The Wonderful Wizard of Oz', 'L. Frank Baum', 1900, 'US', 'CHILDREN', 'novel', 94],
    ['The Last of the Mohicans', 'James Fenimore Cooper', 1826, 'US', 'EPIC', 'novel', 74],
    ['The Scarlet Letter', 'Nathaniel Hawthorne', 1850, 'US', 'NOVEL', 'novel', 82],
    ['The Great Gatsby', 'F. Scott Fitzgerald', 1925, 'US', 'NOVEL', 'novel', 93],
    ['Coyote Stories', 'Traditional', 1800, 'US', 'MYTHOLOGY', 'short', 70],
    ['Anne of Green Gables', 'L. M. Montgomery', 1908, 'CA', 'CHILDREN', 'novel', 84],
    ['The Legend of the Fifth Sun', 'Mexica tradition', 1500, 'MX', 'MYTHOLOGY', 'short', 76],
    ['The Underdogs', 'Mariano Azuela', 1915, 'MX', 'NOVEL', 'novel', 72],
    ['Dom Casmurro', 'Machado de Assis', 1899, 'BR', 'NOVEL', 'novel', 88],
    ['The Posthumous Memoirs of Brás Cubas', 'Machado de Assis', 1881, 'BR', 'NOVEL', 'novel', 86],
    ['Iracema', 'José de Alencar', 1865, 'BR', 'ROMANCE', 'novel', 74],
    ['Martín Fierro', 'José Hernández', 1872, 'AR', 'EPIC', 'novel', 80],
    ['Facundo', 'Domingo Faustino Sarmiento', 1845, 'AR', 'HISTORY', 'novel', 70],
    ['María', 'Jorge Isaacs', 1867, 'CO', 'ROMANCE', 'novel', 72],
    ['Popol Vuh', 'Kʼicheʼ tradition', 1550, 'GT', 'MYTHOLOGY', 'saga', 90],
    ['Tradiciones Peruanas', 'Ricardo Palma', 1872, 'PE', 'HISTORY', 'novel', 68],
    ['Frankenstein', 'Mary Shelley', 1818, 'GB', 'THRILLER', 'novel', 96],
    ['Pride and Prejudice', 'Jane Austen', 1813, 'GB', 'ROMANCE', 'novel', 97],
    ['Jane Eyre', 'Charlotte Brontë', 1847, 'GB', 'ROMANCE', 'novel', 93],
    ['Wuthering Heights', 'Emily Brontë', 1847, 'GB', 'ROMANCE', 'novel', 90],
    ['Great Expectations', 'Charles Dickens', 1861, 'GB', 'NOVEL', 'saga', 91],
    ['A Christmas Carol', 'Charles Dickens', 1843, 'GB', 'CHILDREN', 'short', 92],
    ['Beowulf', 'Anonymous', 1000, 'GB', 'EPIC', 'saga', 88],
    ['The Canterbury Tales', 'Geoffrey Chaucer', 1400, 'GB', 'NOVEL', 'saga', 80],
    ['Hamlet', 'William Shakespeare', 1603, 'GB', 'NOVEL', 'novel', 98],
    ['Alice\'s Adventures in Wonderland', 'Lewis Carroll', 1865, 'GB', 'CHILDREN', 'novel', 95],
    ['Treasure Island', 'Robert Louis Stevenson', 1883, 'GB', 'CHILDREN', 'novel', 86],
    ['The Hound of the Baskervilles', 'Arthur Conan Doyle', 1902, 'GB', 'THRILLER', 'novel', 90],
    ['A Study in Scarlet', 'Arthur Conan Doyle', 1887, 'GB', 'TRUE_CRIME', 'novel', 84],
    ['Dracula', 'Bram Stoker', 1897, 'IE', 'THRILLER', 'novel', 96],
    ['The Táin', 'Irish tradition', 1100, 'IE', 'EPIC', 'saga', 78],
    ['Les Misérables', 'Victor Hugo', 1862, 'FR', 'EPIC', 'saga', 94],
    ['The Count of Monte Cristo', 'Alexandre Dumas', 1844, 'FR', 'THRILLER', 'saga', 95],
    ['The Three Musketeers', 'Alexandre Dumas', 1844, 'FR', 'EPIC', 'saga', 92],
    ['Madame Bovary', 'Gustave Flaubert', 1857, 'FR', 'NOVEL', 'novel', 88],
    ['The Hunchback of Notre-Dame', 'Victor Hugo', 1831, 'FR', 'NOVEL', 'saga', 86],
    ['Twenty Thousand Leagues Under the Sea', 'Jules Verne', 1870, 'FR', 'FANTASY', 'novel', 90],
    ['The Phantom of the Opera', 'Gaston Leroux', 1910, 'FR', 'THRILLER', 'novel', 89],
    ['Candide', 'Voltaire', 1759, 'FR', 'NOVEL', 'short', 82],
    ['The Song of Roland', 'Anonymous', 1100, 'FR', 'EPIC', 'saga', 76],
    ['Grimm\'s Fairy Tales', 'Jacob and Wilhelm Grimm', 1812, 'DE', 'CHILDREN', 'novel', 93],
    ['Faust', 'Johann Wolfgang von Goethe', 1808, 'DE', 'EPIC', 'saga', 90],
    ['The Metamorphosis', 'Franz Kafka', 1915, 'DE', 'NOVEL', 'short', 91],
    ['The Nibelungenlied', 'Anonymous', 1200, 'DE', 'EPIC', 'saga', 77],
    ['Don Quixote', 'Miguel de Cervantes', 1605, 'ES', 'NOVEL', 'saga', 97],
    ['The Divine Comedy', 'Dante Alighieri', 1320, 'IT', 'EPIC', 'saga', 96],
    ['The Decameron', 'Giovanni Boccaccio', 1353, 'IT', 'NOVEL', 'saga', 78],
    ['The Prince', 'Niccolò Machiavelli', 1532, 'IT', 'HISTORY', 'short', 88],
    ['The Aeneid', 'Virgil', -19, 'IT', 'EPIC', 'saga', 90],
    ['Crime and Punishment', 'Fyodor Dostoevsky', 1866, 'RU', 'THRILLER', 'novel', 95],
    ['War and Peace', 'Leo Tolstoy', 1869, 'RU', 'EPIC', 'saga', 96],
    ['Anna Karenina', 'Leo Tolstoy', 1877, 'RU', 'ROMANCE', 'saga', 95],
    ['Dead Souls', 'Nikolai Gogol', 1842, 'RU', 'NOVEL', 'novel', 74],
    ['The Odyssey', 'Homer', -700, 'GR', 'EPIC', 'saga', 99],
    ['The Iliad', 'Homer', -750, 'GR', 'EPIC', 'saga', 98],
    ['The Prose Edda', 'Snorri Sturluson', 1220, 'NO', 'MYTHOLOGY', 'saga', 80],
    ['The Kalevala', 'Elias Lönnrot', 1835, 'SE', 'MYTHOLOGY', 'saga', 76],
    ['Mahabharata', 'Vyasa', -400, 'IN', 'EPIC', 'saga', 99],
    ['Ramayana', 'Valmiki', -500, 'IN', 'EPIC', 'saga', 99],
    ['Bhagavad Gita', 'Vyasa', -400, 'IN', 'MYTHOLOGY', 'short', 94],
    ['Panchatantra', 'Vishnu Sharma', 300, 'IN', 'CHILDREN', 'novel', 86],
    ['Abhijnanashakuntalam', 'Kalidasa', 400, 'IN', 'ROMANCE', 'short', 78],
    ['Jataka Tales', 'Buddhist tradition', -300, 'IN', 'CHILDREN', 'novel', 80],
    ['Silappatikaram', 'Ilango Adigal', 500, 'IN', 'EPIC', 'saga', 74],
    ['Kathasaritsagara', 'Somadeva', 1070, 'IN', 'FANTASY', 'saga', 72],
    ['Gitanjali', 'Rabindranath Tagore', 1910, 'IN', 'NOVEL', 'short', 84],
    ['The Home and the World', 'Rabindranath Tagore', 1916, 'IN', 'NOVEL', 'novel', 76],
    ['Godaan', 'Munshi Premchand', 1936, 'IN', 'NOVEL', 'novel', 80],
    ['Umrao Jaan Ada', 'Mirza Hadi Ruswa', 1899, 'IN', 'ROMANCE', 'novel', 73],
    ['Heer Ranjha', 'Waris Shah', 1766, 'PK', 'ROMANCE', 'saga', 82],
    ['Mahavamsa', 'Buddhist tradition', 500, 'LK', 'HISTORY', 'saga', 70],
    ['Swayambhu Purana', 'Nepalese tradition', 1400, 'NP', 'MYTHOLOGY', 'novel', 64],
    ['Mangal-Kavya', 'Mukundaram Chakrabarti', 1600, 'BD', 'EPIC', 'saga', 66],
    ['Journey to the West', 'Wu Cheng\'en', 1592, 'CN', 'FANTASY', 'saga', 98],
    ['Romance of the Three Kingdoms', 'Luo Guanzhong', 1522, 'CN', 'EPIC', 'saga', 97],
    ['Dream of the Red Chamber', 'Cao Xueqin', 1791, 'CN', 'NOVEL', 'saga', 96],
    ['Water Margin', 'Shi Nai\'an', 1589, 'CN', 'EPIC', 'saga', 90],
    ['Strange Tales from a Chinese Studio', 'Pu Songling', 1766, 'CN', 'FANTASY', 'novel', 78],
    ['Classic of Mountains and Seas', 'Anonymous', -400, 'CN', 'MYTHOLOGY', 'saga', 82],
    ['Tao Te Ching', 'Laozi', -400, 'CN', 'MYTHOLOGY', 'short', 88],
    ['The Art of War', 'Sun Tzu', -500, 'CN', 'HISTORY', 'short', 94],
    ['The True Story of Ah Q', 'Lu Xun', 1921, 'CN', 'NOVEL', 'short', 74],
    ['The Tale of Genji', 'Murasaki Shikibu', 1021, 'JP', 'NOVEL', 'saga', 97],
    ['The Pillow Book', 'Sei Shonagon', 1002, 'JP', 'NOVEL', 'novel', 80],
    ['The Tale of the Heike', 'Anonymous', 1300, 'JP', 'EPIC', 'saga', 86],
    ['Kojiki', 'O no Yasumaro', 712, 'JP', 'MYTHOLOGY', 'saga', 84],
    ['Rashomon', 'Ryunosuke Akutagawa', 1915, 'JP', 'THRILLER', 'short', 86],
    ['Kokoro', 'Natsume Soseki', 1914, 'JP', 'NOVEL', 'novel', 82],
    ['Botchan', 'Natsume Soseki', 1906, 'JP', 'NOVEL', 'novel', 74],
    ['The Cloud Dream of the Nine', 'Kim Man-jung', 1689, 'KR', 'FANTASY', 'saga', 76],
    ['Chunhyangjeon', 'Korean tradition', 1800, 'KR', 'ROMANCE', 'novel', 80],
    ['Geumo Sinhwa', 'Kim Sisup', 1465, 'KR', 'FANTASY', 'short', 64],
    ['Ramakien', 'Thai tradition', 1797, 'TH', 'EPIC', 'saga', 86],
    ['Khun Chang Khun Phaen', 'Thai tradition', 1800, 'TH', 'EPIC', 'saga', 74],
    ['Phra Aphai Mani', 'Sunthorn Phu', 1844, 'TH', 'EPIC', 'saga', 70],
    ['The Tale of Kieu', 'Nguyen Du', 1820, 'VN', 'EPIC', 'saga', 90],
    ['Luc Van Tien', 'Nguyen Dinh Chieu', 1859, 'VN', 'EPIC', 'novel', 66],
    ['Hikayat Hang Tuah', 'Malay tradition', 1700, 'MY', 'EPIC', 'saga', 78],
    ['Sejarah Melayu', 'Malay tradition', 1612, 'MY', 'HISTORY', 'saga', 72],
    ['La Galigo', 'Bugis tradition', 1400, 'ID', 'EPIC', 'saga', 80],
    ['Negarakertagama', 'Mpu Prapanca', 1365, 'ID', 'HISTORY', 'novel', 64],
    ['Malin Kundang', 'Indonesian tradition', 1600, 'ID', 'CHILDREN', 'short', 70],
    ['Noli Me Tangere', 'José Rizal', 1887, 'PH', 'NOVEL', 'novel', 92],
    ['El Filibusterismo', 'José Rizal', 1891, 'PH', 'NOVEL', 'novel', 86],
    ['Florante at Laura', 'Francisco Balagtas', 1838, 'PH', 'EPIC', 'saga', 78],
    ['Biag ni Lam-ang', 'Ilocano tradition', 1600, 'PH', 'EPIC', 'novel', 74],
    ['Ibong Adarna', 'Filipino tradition', 1800, 'PH', 'FANTASY', 'novel', 76],
    ['The Legend of Maria Makiling', 'Filipino tradition', 1800, 'PH', 'MYTHOLOGY', 'short', 68],
    ['One Thousand and One Nights', 'Arabic tradition', 900, 'EG', 'FANTASY', 'saga', 99],
    ['The Book of the Dead', 'Egyptian tradition', -1550, 'EG', 'MYTHOLOGY', 'novel', 90],
    ['The Tale of Sinuhe', 'Egyptian tradition', -1875, 'EG', 'NOVEL', 'short', 72],
    ['The Epic of Gilgamesh', 'Sumerian tradition', -1800, 'IQ', 'EPIC', 'saga', 98],
    ['Shahnameh', 'Ferdowsi', 1010, 'IR', 'EPIC', 'saga', 96],
    ['Layla and Majnun', 'Nizami Ganjavi', 1188, 'IR', 'ROMANCE', 'novel', 86],
    ['The Conference of the Birds', 'Attar of Nishapur', 1177, 'IR', 'FANTASY', 'novel', 80],
    ['Rubaiyat', 'Omar Khayyam', 1120, 'IR', 'NOVEL', 'short', 84],
    ['Kalila wa Dimna', 'Ibn al-Muqaffa', 750, 'IR', 'CHILDREN', 'novel', 74],
    ['The Masnavi', 'Rumi', 1273, 'TR', 'MYTHOLOGY', 'saga', 90],
    ['The Book of Dede Korkut', 'Oghuz tradition', 1400, 'TR', 'EPIC', 'saga', 76],
    ['Nasreddin Hodja', 'Turkish tradition', 1300, 'TR', 'CHILDREN', 'short', 78],
    ['Antar', 'Arabic tradition', 800, 'SA', 'EPIC', 'saga', 70],
    ['The Muallaqat', 'Arabic tradition', 600, 'SA', 'HISTORY', 'short', 66],
    ['Antiquities of the Jews', 'Flavius Josephus', 94, 'IL', 'HISTORY', 'saga', 68],
    ['Sundiata', 'Mandinka tradition', 1300, 'ML', 'EPIC', 'saga', 88],
    ['Gassire\'s Lute', 'Soninke tradition', 1400, 'ML', 'EPIC', 'short', 64],
    ['The Epic of Askia Mohammed', 'Songhai tradition', 1500, 'ML', 'EPIC', 'novel', 66],
    ['Anansi Stories', 'Akan tradition', 1600, 'GH', 'CHILDREN', 'short', 82],
    ['The Kebra Nagast', 'Ethiopian tradition', 1320, 'ET', 'EPIC', 'saga', 84],
    ['The Ozidi Saga', 'Ijo tradition', 1700, 'NG', 'EPIC', 'saga', 70],
    ['The Tale of Bayajidda', 'Hausa tradition', 1500, 'NG', 'MYTHOLOGY', 'short', 68],
    ['Moremi of Ile-Ife', 'Yoruba tradition', 1400, 'NG', 'MYTHOLOGY', 'short', 72],
    ['The Epic of Mwindo', 'Nyanga tradition', 1600, 'CD', 'EPIC', 'saga', 74],
    ['The Lianja Epic', 'Mongo tradition', 1500, 'CD', 'EPIC', 'saga', 66],
    ['Liongo Fumo', 'Swahili tradition', 1600, 'KE', 'EPIC', 'novel', 64],
    ['Shaka Praise Poems', 'Zulu tradition', 1820, 'ZA', 'HISTORY', 'short', 70],
    ['The Mantis and the Moon', 'San tradition', 1800, 'ZA', 'CHILDREN', 'short', 66],
    ['The Legend of the Rain Queen', 'Lobedu tradition', 1800, 'ZA', 'MYTHOLOGY', 'short', 62],
    ['Ibonia', 'Malagasy tradition', 1600, 'MA', 'EPIC', 'saga', 64],
    ['The Epic of Silamaka', 'Fulani tradition', 1700, 'SN', 'EPIC', 'novel', 60],
    ['The Rainbow Serpent', 'Aboriginal tradition', 1700, 'AU', 'MYTHOLOGY', 'short', 84],
    ['The Seven Sisters', 'Aboriginal tradition', 1700, 'AU', 'MYTHOLOGY', 'short', 80],
    ['Tiddalik', 'Aboriginal tradition', 1700, 'AU', 'CHILDREN', 'short', 72],
    ['Such is Life', 'Joseph Furphy', 1903, 'AU', 'NOVEL', 'novel', 64],
    ['While the Billy Boils', 'Henry Lawson', 1896, 'AU', 'NOVEL', 'short', 66],
    ['Robbery Under Arms', 'Rolf Boldrewood', 1888, 'AU', 'THRILLER', 'novel', 62],
    ['Maui Snares the Sun', 'Maori tradition', 1600, 'NZ', 'MYTHOLOGY', 'short', 82],
    ['Maui Fishes Up the North Island', 'Maori tradition', 1600, 'NZ', 'EPIC', 'short', 80],
    ['The Voyage of Rata', 'Maori tradition', 1600, 'NZ', 'EPIC', 'short', 64],
    ['How the Kiwi Lost His Wings', 'Maori tradition', 1700, 'NZ', 'CHILDREN', 'short', 70],
    ['Sina and the Eel', 'Samoan tradition', 1600, 'WS', 'MYTHOLOGY', 'short', 74],
    ['The Firewalkers of Beqa', 'Fijian tradition', 1700, 'FJ', 'MYTHOLOGY', 'short', 66],
    ['The Hiri Voyage', 'Motu tradition', 1600, 'PG', 'HISTORY', 'short', 58],
];

/** Long-deceased and historical figures. Real names. Living celebrities are never listed here. */
const REAL_LIVES = [
    ['Babe Ruth', 'athlete', 'baseball', 'US', '1920s', 1948, 96, 25],
    ['Jackie Robinson', 'athlete', 'baseball', 'US', '1940s', 1972, 94, 10],
    ['Jesse Owens', 'athlete', 'athletics', 'US', '1930s', 1980, 95, 5],
    ['Jim Thorpe', 'athlete', 'olympics', 'US', '1910s', 1953, 90, 20],
    ['Jack Johnson', 'athlete', 'boxing', 'US', '1910s', 1946, 88, 55],
    ['Rocky Marciano', 'athlete', 'boxing', 'US', '1950s', 1969, 84, 10],
    ['Joe Louis', 'athlete', 'boxing', 'US', '1930s', 1981, 90, 15],
    ['Babe Didrikson Zaharias', 'athlete', 'golf', 'US', '1930s', 1956, 86, 15],
    ['Bill Tilden', 'athlete', 'tennis', 'US', '1920s', 1953, 78, 40],
    ['Paul Morphy', 'athlete', 'chess', 'US', '1850s', 1884, 80, 20],
    ['Johnny Weissmuller', 'athlete', 'swimming', 'US', '1920s', 1984, 82, 20],
    ['Duke Kahanamoku', 'athlete', 'swimming', 'US', '1910s', 1968, 84, 5],
    ['Wilma Rudolph', 'athlete', 'athletics', 'US', '1960s', 1994, 86, 5],
    ['Mahatma Gandhi', 'freedom_fighter', '', 'IN', '1940s', 1948, 99, 20],
    ['Bhagat Singh', 'freedom_fighter', '', 'IN', '1920s', 1931, 90, 45],
    ['Rani Lakshmibai', 'freedom_fighter', '', 'IN', '1850s', 1858, 92, 15],
    ['Subhas Chandra Bose', 'freedom_fighter', '', 'IN', '1940s', 1945, 88, 40],
    ['Harriet Tubman', 'freedom_fighter', '', 'US', '1850s', 1913, 96, 10],
    ['Frederick Douglass', 'freedom_fighter', '', 'US', '1840s', 1895, 94, 15],
    ['Simón Bolívar', 'freedom_fighter', '', 'CO', '1820s', 1830, 95, 30],
    ['José de San Martín', 'freedom_fighter', '', 'AR', '1810s', 1850, 90, 10],
    ['Toussaint Louverture', 'freedom_fighter', '', 'CU', '1790s', 1803, 92, 25],
    ['José Martí', 'freedom_fighter', '', 'CU', '1890s', 1895, 90, 15],
    ['Emiliano Zapata', 'freedom_fighter', '', 'MX', '1910s', 1919, 88, 35],
    ['Che Guevara', 'freedom_fighter', '', 'AR', '1960s', 1967, 86, 70],
    ['Patrice Lumumba', 'freedom_fighter', '', 'CD', '1960s', 1961, 84, 40],
    ['Steve Biko', 'freedom_fighter', '', 'ZA', '1970s', 1977, 86, 30],
    ['Kwame Nkrumah', 'freedom_fighter', '', 'GH', '1950s', 1972, 82, 35],
    ['Sun Yat-sen', 'freedom_fighter', '', 'CN', '1910s', 1925, 88, 25],
    ['Qiu Jin', 'freedom_fighter', '', 'CN', '1900s', 1907, 74, 20],
    ['Joan of Arc', 'freedom_fighter', '', 'FR', '1400s', 1431, 96, 30],
    ['William Wallace', 'freedom_fighter', '', 'GB', '1290s', 1305, 84, 35],
    ['Nelson Mandela', 'freedom_fighter', '', 'ZA', '1990s', 2013, 99, 25],
    ['Martin Luther King Jr.', 'freedom_fighter', '', 'US', '1960s', 1968, 98, 20],
    ['Isaac Newton', 'scientist', '', 'GB', '1680s', 1727, 98, 30],
    ['Charles Darwin', 'scientist', '', 'GB', '1850s', 1882, 96, 35],
    ['Ada Lovelace', 'scientist', '', 'GB', '1840s', 1852, 90, 5],
    ['Michael Faraday', 'scientist', '', 'GB', '1830s', 1867, 84, 5],
    ['Alan Turing', 'scientist', '', 'GB', '1940s', 1954, 95, 20],
    ['Marie Curie', 'scientist', '', 'PL', '1900s', 1934, 98, 10],
    ['Albert Einstein', 'scientist', '', 'DE', '1910s', 1955, 99, 15],
    ['Nikola Tesla', 'scientist', '', 'US', '1890s', 1943, 94, 25],
    ['Galileo Galilei', 'scientist', '', 'IT', '1610s', 1642, 96, 40],
    ['Leonardo da Vinci', 'artist', '', 'IT', '1500s', 1519, 99, 10],
    ['Ibn Sina', 'scientist', '', 'IR', '1000s', 1037, 92, 10],
    ['Al-Khwarizmi', 'scientist', '', 'IQ', '800s', 850, 90, 5],
    ['Ibn al-Haytham', 'scientist', '', 'EG', '1000s', 1040, 86, 5],
    ['Hypatia', 'scientist', '', 'EG', '400s', 415, 84, 20],
    ['Aryabhata', 'scientist', '', 'IN', '500s', 550, 86, 5],
    ['Srinivasa Ramanujan', 'scientist', '', 'IN', '1910s', 1920, 94, 5],
    ['Rosalind Franklin', 'scientist', '', 'GB', '1950s', 1958, 88, 10],
    ['George Washington Carver', 'scientist', '', 'US', '1900s', 1943, 80, 5],
    ['Louis Pasteur', 'scientist', '', 'FR', '1860s', 1895, 90, 15],
    ['Zhang Heng', 'scientist', '', 'CN', '100s', 139, 74, 5],
    ['Wolfgang Amadeus Mozart', 'musician', '', 'DE', '1780s', 1791, 98, 15],
    ['Ludwig van Beethoven', 'musician', '', 'DE', '1800s', 1827, 98, 30],
    ['Johann Sebastian Bach', 'musician', '', 'DE', '1720s', 1750, 96, 5],
    ['Frédéric Chopin', 'musician', '', 'PL', '1830s', 1849, 92, 10],
    ['Clara Schumann', 'musician', '', 'DE', '1840s', 1896, 80, 5],
    ['Antonio Vivaldi', 'musician', '', 'IT', '1720s', 1741, 86, 10],
    ['Claude Debussy', 'musician', '', 'FR', '1890s', 1918, 84, 10],
    ['Scott Joplin', 'musician', '', 'US', '1900s', 1917, 82, 10],
    ['Billie Holiday', 'musician', '', 'US', '1930s', 1959, 92, 45],
    ['Robert Johnson', 'musician', '', 'US', '1930s', 1938, 86, 40],
    ['Enrico Caruso', 'musician', '', 'IT', '1900s', 1921, 84, 15],
    ['Umm Kulthum', 'musician', '', 'EG', '1950s', 1975, 96, 10],
    ['Sayed Darwish', 'musician', '', 'EG', '1910s', 1923, 74, 15],
    ['Béla Bartók', 'musician', '', 'DE', '1930s', 1945, 76, 10],
    ['Andrew Carnegie', 'ceo', '', 'US', '1890s', 1919, 80, 45],
    ['John D. Rockefeller', 'ceo', '', 'US', '1890s', 1937, 82, 55],
    ['Madam C. J. Walker', 'ceo', '', 'US', '1910s', 1919, 84, 5],
    ['Henry Ford', 'ceo', '', 'US', '1920s', 1947, 86, 60],
    ['Jamsetji Tata', 'ceo', '', 'IN', '1890s', 1904, 84, 15],
    ['Walt Disney', 'ceo', '', 'US', '1930s', 1966, 94, 35],
    ['Konosuke Matsushita', 'ceo', '', 'JP', '1950s', 1989, 74, 10],
    ['Jack the Ripper', 'criminal', '', 'GB', '1880s', 1888, 78, 95],
    ['Billy the Kid', 'criminal', '', 'US', '1870s', 1881, 76, 70],
    ['Ned Kelly', 'criminal', '', 'AU', '1870s', 1880, 82, 65],
    ['Al Capone', 'criminal', '', 'US', '1920s', 1947, 88, 90],
    ['Blackbeard', 'criminal', '', 'US', '1710s', 1718, 80, 85],
    ['Jesse James', 'criminal', '', 'US', '1870s', 1882, 74, 75],
    ['Bonnie Parker', 'criminal', '', 'US', '1930s', 1934, 78, 70],
    ['Cleopatra', 'royal', '', 'EG', '30s BCE', -30, 98, 40],
    ['Hatshepsut', 'royal', '', 'EG', '1400s BCE', -1458, 86, 15],
    ['Elizabeth I', 'royal', '', 'GB', '1580s', 1603, 96, 25],
    ['Victoria', 'royal', '', 'GB', '1870s', 1901, 90, 30],
    ['Catherine the Great', 'royal', '', 'RU', '1760s', 1796, 92, 40],
    ['Eleanor of Aquitaine', 'royal', '', 'FR', '1160s', 1204, 80, 25],
    ['Ashoka', 'royal', '', 'IN', '250s BCE', -232, 90, 30],
    ['Akbar', 'royal', '', 'IN', '1580s', 1605, 88, 25],
    ['Sejong the Great', 'royal', '', 'KR', '1440s', 1450, 86, 10],
    ['Suleiman', 'royal', '', 'TR', '1550s', 1566, 88, 30],
    ['Shaka', 'royal', '', 'ZA', '1820s', 1828, 86, 55],
    ['Mansa Musa', 'royal', '', 'ML', '1320s', 1337, 92, 20],
    ['Nzinga', 'royal', '', 'CD', '1640s', 1663, 84, 25],
    ['Pachacuti', 'royal', '', 'PE', '1440s', 1471, 80, 30],
    ['Kamehameha I', 'royal', '', 'US', '1790s', 1819, 82, 30],
    ['Haile Selassie', 'royal', '', 'ET', '1930s', 1975, 84, 40],
    ['Abraham Lincoln', 'politician', '', 'US', '1860s', 1865, 98, 35],
    ['Franklin D. Roosevelt', 'politician', '', 'US', '1930s', 1945, 92, 30],
    ['Winston Churchill', 'politician', '', 'GB', '1940s', 1965, 94, 45],
    ['Jawaharlal Nehru', 'politician', '', 'IN', '1950s', 1964, 86, 30],
    ['Indira Gandhi', 'politician', '', 'IN', '1970s', 1984, 84, 55],
    ['Golda Meir', 'politician', '', 'IL', '1970s', 1978, 78, 45],
    ['Benito Juárez', 'politician', '', 'MX', '1860s', 1872, 86, 25],
    ['Eva Perón', 'politician', '', 'AR', '1940s', 1952, 90, 40],
    ['Getúlio Vargas', 'politician', '', 'BR', '1930s', 1954, 74, 50],
    ['Thomas Sankara', 'politician', '', 'GH', '1980s', 1987, 80, 35],
    ['Frida Kahlo', 'artist', '', 'MX', '1930s', 1954, 96, 25],
    ['Vincent van Gogh', 'artist', '', 'NL', '1880s', 1890, 97, 40],
    ['Rembrandt', 'artist', '', 'NL', '1640s', 1669, 94, 20],
    ['Michelangelo', 'artist', '', 'IT', '1500s', 1564, 98, 20],
    ['Artemisia Gentileschi', 'artist', '', 'IT', '1620s', 1656, 86, 30],
    ['Katsushika Hokusai', 'artist', '', 'JP', '1820s', 1849, 92, 10],
    ['Amrita Sher-Gil', 'artist', '', 'IN', '1930s', 1941, 78, 15],
    ['Pablo Picasso', 'artist', '', 'ES', '1930s', 1973, 97, 40],
    ['Ibn Battuta', 'explorer', '', 'MA', '1340s', 1369, 90, 15],
    ['Zheng He', 'explorer', '', 'CN', '1410s', 1433, 88, 15],
    ['Xuanzang', 'explorer', '', 'CN', '640s', 664, 82, 5],
    ['James Cook', 'explorer', '', 'GB', '1770s', 1779, 86, 45],
    ['Ernest Shackleton', 'explorer', '', 'IE', '1910s', 1922, 88, 15],
    ['Roald Amundsen', 'explorer', '', 'NO', '1910s', 1928, 86, 20],
    ['Amelia Earhart', 'explorer', '', 'US', '1930s', 1937, 94, 10],
    ['Matthew Henson', 'explorer', '', 'US', '1900s', 1955, 76, 10],
    ['Sacagawea', 'explorer', '', 'US', '1800s', 1812, 84, 5],
    ['Leif Erikson', 'explorer', '', 'NO', '1000s', 1020, 80, 20],
    ['Jeanne Baret', 'explorer', '', 'FR', '1760s', 1807, 72, 10],
    ['Ibn Fadlan', 'explorer', '', 'IQ', '920s', 960, 70, 10],
    ['Dhyan Chand', 'athlete', 'hockey', 'IN', '1930s', 1979, 92, 5],
    ['Gama Pehlwan', 'athlete', 'wrestling', 'PK', '1910s', 1960, 84, 15],
    ['Paavo Nurmi', 'athlete', 'athletics', 'SE', '1920s', 1973, 86, 15],
    ['Abebe Bikila', 'athlete', 'athletics', 'ET', '1960s', 1973, 90, 5],
    ['Fausto Coppi', 'athlete', 'cycling', 'IT', '1940s', 1960, 82, 25],
    ['Suzanne Lenglen', 'athlete', 'tennis', 'FR', '1920s', 1938, 84, 20],
    ['José Raúl Capablanca', 'athlete', 'chess', 'CU', '1920s', 1942, 88, 15],
    ['Alexander Alekhine', 'athlete', 'chess', 'RU', '1930s', 1946, 82, 45],
    ['Wilhelm Steinitz', 'athlete', 'chess', 'DE', '1880s', 1900, 74, 20],
    ['Dixie Dean', 'athlete', 'football', 'GB', '1920s', 1980, 78, 10],
    ['Georg Hackenschmidt', 'athlete', 'wrestling', 'RU', '1900s', 1968, 70, 10],
    ['Sonja Henie', 'athlete', 'olympics', 'NO', '1930s', 1969, 80, 30],
];

const countryOf = (id) => {
    const found = byId[id];
    if (!found) throw new Error(`Unknown country code ${id}`);
    return found;
};

const lastName = (value) => {
    const parts = String(value).split(/\s+/).filter(word => word.replace(/[^A-Za-z]/g, '').length > 2);
    return (parts[parts.length - 1] || value).replace(/[^A-Za-zÀ-ÿ'-]/g, '');
};

function pushBook(list, raw, rng, seenTitles) {
    const country = countryOf(raw.country);
    const duplicate = seenTitles.has(raw.proper.toLowerCase());
    seenTitles.add(raw.proper.toLowerCase());
    const length = raw.length || lengthFor(raw.genre, rng);
    const publicDomain = Boolean(raw.publicDomain);
    const fame = Math.max(1, Math.min(100, raw.fame));
    const money = bookMoney(fame, length, publicDomain);
    const year = raw.year;
    // Alter the title first. A country suffix on the raw title would leave the
    // copyrighted wording intact ("The Sorrow of War (Vietnam)").
    let title = ship(raw.proper, publicDomain);
    if (duplicate) title = `${title} (${country.name})`;
    const author = ship(raw.authorProper, publicDomain);
    list.push({
        id: raw.id,
        kind: 'BOOK',
        proper: title,
        descriptor: title,
        authorProper: author,
        authorDescriptor: author,
        authorId: slug(author),
        safeReal: publicDomain,
        country: country.id,
        countryName: country.name,
        fx: country.fx,
        region: country.region,
        language: country.language,
        genres: [raw.genre],
        gameGenres: [GAME_GENRE[raw.genre] || 'DRAMA'],
        year,
        length,
        seasons: raw.seasons || seasonsFor(length, rng),
        fame,
        fans: fansFor(country.region, fame, rng),
        publicDomain,
        holder: publicDomain ? 'Public domain' : `${lastName(author)} Literary`,
        optionUsd: money.optionUsd,
        purchaseUsd: money.purchaseUsd,
        logline: raw.logline || LOGLINE[raw.genre](CITIES[country.id]?.[0] || country.name),
    });
}

function attitudeFor(living, controversy, fame, rng) {
    if (controversy >= 78) return rng() < 0.55 ? 'HOSTILE' : 'PROTECTIVE';
    if (controversy >= 55) return 'PROTECTIVE';
    if (!living && controversy < 25) return rng() < 0.5 ? 'OPEN' : 'EAGER';
    if (living && fame >= 85) return 'WARY';
    if (fame < 42) return 'EAGER';
    return 'OPEN';
}

function pushLife(list, raw, rng) {
    const country = countryOf(raw.country);
    const city = pick(rng, CITIES[country.id] || [country.name]);
    const living = Boolean(raw.living);
    const deathYear = raw.deathYear ?? null;
    const publicDomain = !living && typeof deathYear === 'number' && deathYear > 0 && deathYear <= 1955;
    const safeReal = Boolean(raw.safeReal);
    const fame = Math.max(1, Math.min(100, raw.fame));
    const controversy = Math.max(0, Math.min(100, raw.controversy ?? 20));
    const money = lifeMoney(fame, living, controversy, publicDomain);
    const role = raw.role || 'public figure';
    const sportLabel = SPORTS.find(row => row[0] === raw.sport)?.[1];
    const categoryLabel = raw.category === 'athlete'
        ? (sportLabel || 'Athlete')
        : (FIGURES.find(row => row[0] === raw.category)?.[1] || 'Public figure');
    const name = ship(raw.proper, safeReal);
    const singleEvent = raw.singleEvent ?? (raw.sport ? rng() < 0.42 : false);
    list.push({
        id: raw.id,
        kind: 'LIFE',
        proper: name,
        descriptor: name,
        safeReal,
        country: country.id,
        countryName: country.name,
        fx: country.fx,
        region: country.region,
        language: country.language,
        genres: [raw.sport ? 'SPORT' : raw.category.toUpperCase()],
        gameGenres: raw.sport ? ['BIOPIC', 'SPORTS'] : ['BIOPIC'],
        sport: raw.sport || null,
        category: raw.category === 'athlete' ? 'athlete' : raw.category,
        categoryLabel,
        year: living ? 2018 : (deathYear || 1900),
        era: raw.era,
        living,
        controversy,
        fame,
        fans: fansFor(country.region, fame, rng),
        publicDomain,
        attitude: raw.attitude || attitudeFor(living, controversy, fame, rng),
        holder: publicDomain ? 'Public domain' : living ? `${lastName(name)} representation` : `${lastName(name)} estate`,
        optionUsd: money.optionUsd,
        purchaseUsd: money.purchaseUsd,
        seasons: singleEvent ? 1 : irand(rng, 3, 6),
        singleEvent,
        length: singleEvent ? 'short' : 'saga',
        logline: `The life of ${name}, told from ${city}.`,
    });
}

function buildBooks() {
    const books = [];
    const seen = new Set();
    const rng = mulberry32(0x51A7);
    PD_BOOKS.forEach((row, index) => {
        const [proper, author, year, country, genre, length, fame] = row;
        pushBook(books, {
            id: `book_pd_${slug(proper)}_${index}`,
            proper, authorProper: author, year, country, genre, length, fame,
            publicDomain: true,
            seasons: length === 'saga' ? 4 : length === 'short' ? 1 : 2,
        }, rng, seen);
    });

    let serial = 0;
    MODERN_BOOKS.forEach(row => {
        const [title, author, year, country, genre, fame] = row;
        if (!BOOK_GENRES.includes(genre)) throw new Error(`Bad genre ${genre} on ${title}`);
        const region = countryOf(country).region;
        const spread = 36 + ((serial * 17 + title.length) % 58);
        pushBook(books, {
            id: `book_${region.toLowerCase()}_${genre.toLowerCase()}_${serial}`,
            proper: title,
            authorProper: author,
            year,
            country,
            genre,
            fame: fame || spread,
            publicDomain: false,
        }, rng, seen);
        serial += 1;
    });
    return books;
}

function buildLives() {
    const lives = [];
    const rng = mulberry32(0x11FE);
    const used = new Set();
    REAL_LIVES.forEach((row, index) => {
        const [proper, category, sport, country, era, deathYear, fame, controversy] = row;
        const key = `${category}:${sport}:${proper}`;
        if (used.has(key)) return;
        used.add(key);
        const sportMeta = SPORTS.find(item => item[0] === sport);
        const figure = FIGURES.find(item => item[0] === category);
        pushLife(lives, {
            id: `life_real_${slug(proper)}_${index}`,
            proper,
            category: category === 'athlete' ? 'athlete' : category,
            sport: sport || null,
            role: sportMeta ? sportMeta[2][0] : figure?.[2][0],
            country,
            era,
            deathYear,
            fame,
            controversy,
            living: false,
            safeReal: true,
            singleEvent: Boolean(sport) && index % 3 === 0,
        }, rng);
    });

    const takePerson = (person, label) => {
        const [name, country, livingFlag, fame, deathYear] = person;
        const living = livingFlag !== false && livingFlag !== 0;
        if (!living && !(Number(deathYear) > 1955)) {
            throw new Error(`${label} ${name} needs a death year after 1955, or a REAL_LIVES entry`);
        }
        countryOf(country);
        return { name, country, living, fame: fame || 70, deathYear: living ? null : Number(deathYear) };
    };

    SPORTS.forEach(([sport, , roles]) => {
        const have = lives.filter(life => life.sport === sport).length;
        const target = 32;
        const seeds = ATHLETES[sport] || [];
        for (let n = have; n < target; n += 1) {
            const person = seeds[n - have];
            if (!person) throw new Error(`Need ${target - have} real ${sport} names, have ${seeds.length}`);
            const row = takePerson(person, sport);
            pushLife(lives, {
                id: `life_${sport}_${n}_${row.country.toLowerCase()}`,
                proper: row.name,
                category: 'athlete',
                sport,
                role: roles[n % roles.length],
                country: row.country,
                era: row.living ? '2010s' : '1990s',
                deathYear: row.deathYear,
                fame: row.fame,
                controversy: irand(rng, 0, row.living ? 55 : 40),
                living: row.living,
                safeReal: false,
            }, rng);
        }
    });

    FIGURES.forEach(([category, , roles]) => {
        const have = lives.filter(life => life.category === category).length;
        const target = 22;
        const seeds = LIVING_FIGURES[category] || [];
        for (let n = have; n < target; n += 1) {
            const person = seeds[n - have];
            if (!person) throw new Error(`Need ${target - have} real ${category} names, have ${seeds.length}`);
            const row = takePerson(person, category);
            pushLife(lives, {
                id: `life_${category}_${n}_${row.country.toLowerCase()}`,
                proper: row.name,
                category,
                sport: null,
                role: roles[n % roles.length],
                country: row.country,
                era: row.living ? '2010s' : '1990s',
                deathYear: row.deathYear,
                fame: row.fame,
                controversy: irand(rng, 5, category === 'criminal' ? 90 : 45),
                living: row.living,
                safeReal: false,
                singleEvent: false,
            }, rng);
        }
    });
    return lives;
}

function countBy(rows, keyFn) {
    const out = {};
    rows.forEach(row => {
        const key = keyFn(row);
        out[key] = (out[key] || 0) + 1;
    });
    return out;
}

const books = buildBooks();
const lives = buildLives();
const outDir = path.join(root, 'src/data/rights/chunks');
fs.mkdirSync(outDir, { recursive: true });

REGIONS.forEach(region => {
    const slice = books.filter(book => book.region === region);
    const file = `books-${region.toLowerCase().replace(/_/g, '-')}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(slice));
});

const sportFileGroups = [
    ['bios-sports-field.json', ['cricket', 'football', 'basketball', 'american_football', 'baseball', 'tennis', 'hockey', 'kabaddi', 'badminton', 'volleyball', 'table_tennis']],
    ['bios-sports-combat.json', ['boxing', 'mma', 'wrestling', 'f1', 'athletics', 'olympics', 'golf', 'chess', 'esports', 'rugby', 'swimming', 'cycling', 'gymnastics']],
];
sportFileGroups.forEach(([file, sports]) => {
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(lives.filter(life => sports.includes(life.sport))));
});
fs.writeFileSync(path.join(outDir, 'bios-figures.json'), JSON.stringify(lives.filter(life => !life.sport)));

const manifest = {
    generatedWithRealNames: REAL_NAMES_MODE,
    realNamesFlag: 'src/data/rights/config.ts',
    regions: REGIONS,
    books: books.length,
    lives: lives.length,
    booksByRegion: countBy(books, book => book.region),
    booksByGenre: countBy(books, book => book.genres[0]),
    publicDomainBooks: books.filter(book => book.publicDomain).length,
    livesBySport: countBy(lives.filter(life => life.sport), life => life.sport),
    livesByCategory: countBy(lives, life => life.sport ? `sport:${life.sport}` : life.category),
    figureCategories: countBy(lives.filter(life => !life.sport), life => life.category),
    livingLives: lives.filter(life => life.living).length,
    safeRealLives: lives.filter(life => life.safeReal).length,
    chunks: fs.readdirSync(outDir).filter(name => name.endsWith('.json')),
};
fs.writeFileSync(path.join(root, 'src/data/rights/manifest.json'), JSON.stringify(manifest, null, 2));

const problems = [];
if (books.length < 2000) problems.push(`books ${books.length} < 2000`);
if (lives.length < 800) problems.push(`lives ${lives.length} < 800`);
REGIONS.forEach(region => {
    if ((manifest.booksByRegion[region] || 0) < 200) problems.push(`${region} books low`);
});
SPORTS.forEach(([sport]) => {
    if ((manifest.livesBySport[sport] || 0) < 20) problems.push(`${sport} low`);
});
FIGURES.forEach(([category]) => {
    if ((manifest.figureCategories[category] || 0) < 15) problems.push(`${category} low`);
});
BOOK_GENRES.forEach(genre => {
    if ((manifest.booksByGenre[genre] || 0) < 40) problems.push(`genre ${genre} low`);
});
if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
}
console.log(JSON.stringify({
    books: manifest.books,
    lives: manifest.lives,
    booksByRegion: manifest.booksByRegion,
    livesBySport: manifest.livesBySport,
    figureCategories: manifest.figureCategories,
    realNamesMode: REAL_NAMES_MODE,
}, null, 2));
