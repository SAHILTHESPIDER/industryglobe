import type { FilmIndustryId, Genre } from '../types';
import { INDUSTRY_ORDER } from './scriptDesk/catalog';

export interface RatingLabel {
    id: string;
    label: string;
    minAge: number;
    restricted?: boolean;
}

export interface CensorSystem {
    id: string;
    name: string;
    notes: string;
    ratings: RatingLabel[];
}

export interface ReleaseNorm {
    id: string;
    label: string;
    detail: string;
}

export interface AnnouncementStyle {
    id: string;
    label: string;
    detail: string;
    /** Added to buzz when the player uses this beat. */
    buzz: number;
    cost: number;
}

export interface CrisisChoiceEffect {
    id: string;
    label: string;
    /** Player cash delta. Negative is a cost. */
    money: number;
    /** Added to production performance. */
    quality: number;
    buzz: number;
    reputation: number;
    /** Added to the office's contacts in this industry. */
    contacts: number;
    log: string;
}

export interface IndustryCrisisTemplate {
    id: string;
    title: string;
    detail: string;
    choices: CrisisChoiceEffect[];
}

export interface IndustryCalendarBeat {
    week: number;
    name: string;
    impact: number;
    genres?: Genre[];
}

export interface IndustryEngineDef {
    id: FilmIndustryId;
    name: string;
    hqCountry: string;
    hqCity: string;
    languages: string[];
    currency: { code: string; symbol: string; perUsd: number };
    /** Multiplies theatrical gross. Hollywood stays at 1 so old careers do not move. */
    marketScale: number;
    /** Extra share taken from the studio's half of theatrical receipts. Hollywood is 0. */
    taxOnStudioShare: number;
    taxLabel: string;
    /** Multiplier on crew and stages. Hollywood is 1. */
    crewCost: number;
    /** Quality bump for a lead whose home industry matches the shoot. */
    localStarBonus: number;
    /** Extra audience when the film's market is the HQ. */
    homeAudienceBonus: number;
    /** Cost to open an office in this industry. */
    regionOpenCost: number;
    /** How easily an outside star can open a film here. 0–1. */
    crossoverOpenness: number;
    genreBias: Partial<Record<Genre, number>>;
    calendar: IndustryCalendarBeat[];
    censor: CensorSystem;
    releaseNorms: ReleaseNorm[];
    announcements: AnnouncementStyle[];
    crises: IndustryCrisisTemplate[];
    studios: string[];
}

const indiaSongs: ReleaseNorm = {
    id: 'songs',
    label: 'Songs',
    detail: 'A popular film is expected to carry songs. A songless drama can still work. It will not travel the way a number does.',
};

const indiaInterval: ReleaseNorm = {
    id: 'interval',
    label: 'Interval',
    detail: 'The film is built in two halves with an interval. The second half has to reopen the house.',
};

const CBFC: CensorSystem = {
    id: 'CBFC',
    name: 'Central Board of Film Certification',
    notes: 'India. A film needs a certificate before it can open. Cuts are negotiated. Refusal means it does not release until it is recut.',
    ratings: [
        { id: 'U', label: 'U', minAge: 0 },
        { id: 'UA7', label: 'UA 7+', minAge: 7 },
        { id: 'UA13', label: 'UA 13+', minAge: 13 },
        { id: 'UA16', label: 'UA 16+', minAge: 16 },
        { id: 'A', label: 'A', minAge: 18, restricted: true },
    ],
};

const crisis = (
    id: string,
    title: string,
    detail: string,
    choices: CrisisChoiceEffect[],
): IndustryCrisisTemplate => ({ id, title, detail, choices });

const pay = (id: string, label: string, money: number, quality: number, buzz: number, reputation: number, contacts: number, log: string): CrisisChoiceEffect =>
    ({ id, label, money, quality, buzz, reputation, contacts, log });

const HOLLYWOOD_CRISES: IndustryCrisisTemplate[] = [
    crisis('date-clash', 'Opening against a tentpole', 'Another wide release lands on your date. Exhibitors will split the screens.', [
        pay('move', 'Move off the date', -180000, 0, -4, 1, 0, 'You gave up the date. The screens are yours. The buzz cools.'),
        pay('stay', 'Stay and spend', -900000, 0, 6, -1, 0, 'You bought the weekend. It cost more than the date was worth if the film is soft.'),
    ]),
    crisis('leak', 'A cut is on the internet', 'A workprint is circulating. The conversation started without you.', [
        pay('own', 'Release a clip yourself', -120000, -2, 5, 0, 0, 'You fed the clip. The leak looks planned. The cut is still unfinished.'),
        pay('quiet', 'Stay quiet', 0, 0, -3, 2, 1, 'You let it pass. Less noise, and the people who saw it already decided.'),
    ]),
    crisis('strike', 'A union stoppage', 'The crew will not call roll until the grievance is heard.', [
        pay('settle', 'Settle the grievance', -400000, 2, 0, 3, 4, 'The set is moving. The crew will remember who paid.'),
        pay('wait', 'Wait it out', 0, -6, -4, -2, -3, 'The day is lost. So is a little trust.'),
    ]),
    crisis('reshoot', 'The ending does not play', 'A test audience sat on its hands. The third act is the problem.', [
        pay('reshoot', 'Reshoot the ending', -1500000, 8, 2, 1, 0, 'New pages, new days. The film is better if the money holds.'),
        pay('cut', 'Recut with what you have', -80000, 2, 0, 0, 0, 'You found a version in the footage. It is tighter and smaller.'),
    ]),
    crisis('scandal', 'A name on the call sheet is in the news', 'The story is not about the film. It is about someone on it. You do not have to repeat the rumor.', [
        pay('statement', 'A short statement', -20000, 0, -2, 2, 1, 'You said the work continues. Some people wanted more. Some wanted less.'),
        pay('recast', 'Recast and reshoot', -2200000, -4, -6, 1, -2, 'The part is gone. The schedule is hurt. The film can still open.'),
    ]),
];

const INDIA_CRISES: IndustryCrisisTemplate[] = [
    crisis('festival-clash', 'Two films want the festival Friday', 'Diwali, Eid, or Christmas already has a star vehicle. Your date is the fight.', [
        pay('move', 'Take the next open Friday', -100000, 0, -3, 1, 2, 'You left the festival window. The other film will own it.'),
        pay('stay', 'Hold the date and spend', -700000, 0, 7, -1, 0, 'You stayed on the festival. Advance booking has to be loud.'),
    ]),
    crisis('boycott', 'A boycott is trending', 'A group wants the film pulled. The charge may be thin. The noise is not.', [
        pay('meet', 'Meet the complainants', -60000, 0, -2, 3, 5, 'You sat down. The trend cooled. Not everyone is satisfied.'),
        pay('open', 'Open anyway', 0, 0, 4, -3, -4, 'You opened into the noise. Curiosity and anger both sell tickets.'),
    ]),
    crisis('censor', 'The board wants cuts', 'The examining committee has marked scenes. Without a certificate the film does not open.', [
        pay('cut', 'Accept the cuts', -40000, -5, -2, 0, 2, 'The certificate is coming. A scene the edit loved is gone.'),
        pay('revise', 'Revise and resubmit', -250000, -1, -4, 1, 1, 'You spent weeks and money. The certificate is cleaner and later.'),
    ]),
    crisis('song', 'The song is not landing', 'The interval number was supposed to travel. The cut feels long.', [
        pay('reshoot', 'Restage the number', -500000, 5, 4, 0, 0, 'A new location and a new mix. The reel can still move.'),
        pay('drop', 'Drop the song', 0, -2, -4, 1, 0, 'The film is shorter. The promoters lost their clip.'),
    ]),
    crisis('leak', 'A song leaked early', 'The track is everywhere before the label planned it.', [
        pay('drop', 'Drop the official video now', -150000, 0, 6, 0, 0, 'You owned the leak. The song is public on your terms.'),
        pay('hold', 'Hold the campaign', 0, 0, -3, 1, 0, 'You waited. The unofficial cut did the marketing for free, badly.'),
    ]),
];

const EAST_ASIA_SHARED = (place: string): IndustryCrisisTemplate[] => [
    crisis('date-clash', `A ${place} opener is on your date`, 'Screens and attention are finite. The other film has the bigger name this week.', [
        pay('move', 'Slide a week', -90000, 0, -2, 1, 1, 'You moved. The other film takes the conversation.'),
        pay('stay', 'Stay and add shows', -450000, 0, 5, 0, 0, 'You bought shows. The weekend has to be strong.'),
    ]),
    crisis('leak', 'Footage leaked', 'A scene is out before the trailer. Fans are already quoting it.', [
        pay('trailer', 'Pull the trailer forward', -200000, -1, 6, 0, 0, 'The trailer is early. The leak looks like a plan.'),
        pay('quiet', 'Ask platforms to pull it', -30000, 0, -2, 1, 1, 'Some copies came down. The people who saved it kept it.'),
    ]),
    crisis('scandal', 'A cast member is in the headlines', 'You do not need to describe the story. The film is attached to it.', [
        pay('distance', 'Keep the film separate', -20000, 0, -3, 2, 1, 'You talked about the work. The name still travels with the poster.'),
        pay('delay', 'Delay the campaign', -120000, 0, -6, 1, 0, 'The ads stopped. The date can still hold if the noise fades.'),
    ]),
];

export const INDUSTRY_ENGINE: Record<FilmIndustryId, IndustryEngineDef> = {
    HOLLYWOOD: {
        id: 'HOLLYWOOD', name: 'Hollywood', hqCountry: 'United States', hqCity: 'Los Angeles',
        languages: ['en'], currency: { code: 'USD', symbol: '$', perUsd: 1 },
        marketScale: 1, taxOnStudioShare: 0, taxLabel: 'The studio half of theatrical receipts is unchanged from the existing split.',
        crewCost: 1, localStarBonus: 4, homeAudienceBonus: 0, regionOpenCost: 2_500_000, crossoverOpenness: 0.72,
        genreBias: { ACTION: 1.2, SUPERHERO: 1.3, SCI_FI: 1.15, COMEDY: 1, DRAMA: 0.9 },
        calendar: [
            { week: 1, name: 'New Year', impact: 1.15 },
            { week: 7, name: 'Valentine\'s Day', impact: 1.25, genres: ['ROMANCE', 'COMEDY'] },
            { week: 18, name: 'Summer', impact: 1.3, genres: ['ACTION', 'SUPERHERO', 'ADVENTURE'] },
            { week: 26, name: 'July 4th', impact: 1.35, genres: ['ACTION', 'ADVENTURE'] },
            { week: 44, name: 'Halloween', impact: 1.3, genres: ['HORROR', 'THRILLER'] },
            { week: 47, name: 'Thanksgiving', impact: 1.2, genres: ['COMEDY', 'ANIMATION'] },
            { week: 51, name: 'Christmas', impact: 1.4 },
        ],
        censor: {
            id: 'MPA', name: 'MPA rating',
            notes: 'United States. The rating is a contract with exhibitors and parents, not a government license. NC-17 narrows the theater count.',
            ratings: [
                { id: 'G', label: 'G', minAge: 0 },
                { id: 'PG', label: 'PG', minAge: 8 },
                { id: 'PG13', label: 'PG-13', minAge: 13 },
                { id: 'R', label: 'R', minAge: 17, restricted: true },
                { id: 'NC17', label: 'NC-17', minAge: 18, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'three-act', label: 'Three acts', detail: 'Setup, confrontation, resolution. A tentpole that skips the turn loses the Saturday audience.' },
            { id: 'wide', label: 'Wide release', detail: 'National means thousands of screens in one weekend. The opening is the campaign.' },
            { id: 'awards', label: 'Awards corridor', detail: 'Autumn platform releases feed the winter awards, which still sit on the Hollywood calendar.' },
        ],
        announcements: [
            { id: 'comic-con', label: 'Comic-Con hall', detail: 'A footage debut in a loud room. Built for fantasy, superhero, and horror.', buzz: 14, cost: 900_000 },
            { id: 'super-bowl', label: 'Super Bowl spot', detail: 'Thirty seconds in the biggest TV window. The cost is the point.', buzz: 18, cost: 4_500_000 },
            { id: 'trailer', label: 'Trailer drop', detail: 'A dated trailer on a Thursday. Comments do the rest.', buzz: 8, cost: 150_000 },
        ],
        crises: HOLLYWOOD_CRISES,
        studios: ['Northline Pictures', 'Harbor & Co', 'Metro Crown', 'Sable Studios'],
    },
    BOLLYWOOD: {
        id: 'BOLLYWOOD', name: 'Bollywood', hqCountry: 'India', hqCity: 'Mumbai',
        languages: ['hi', 'en'], currency: { code: 'INR', symbol: '₹', perUsd: 83 },
        marketScale: 0.52, taxOnStudioShare: 0.12, taxLabel: 'GST and state levies come off the studio share of ticket money.',
        crewCost: 0.72, localStarBonus: 10, homeAudienceBonus: 0.12, regionOpenCost: 900_000, crossoverOpenness: 0.48,
        genreBias: { ROMANCE: 1.3, ACTION: 1.25, MUSICAL: 1.4, COMEDY: 1.15, DRAMA: 1.05, SUPERHERO: 0.7 },
        calendar: [
            { week: 3, name: 'Republic Day window', impact: 1.15 },
            { week: 16, name: 'Eid window', impact: 1.35, genres: ['ACTION', 'COMEDY', 'ROMANCE'] },
            { week: 34, name: 'Independence week', impact: 1.2, genres: ['ACTION', 'DRAMA'] },
            { week: 43, name: 'Diwali', impact: 1.5, genres: ['ACTION', 'COMEDY', 'ROMANCE', 'MUSICAL'] },
            { week: 51, name: 'Christmas', impact: 1.25 },
        ],
        censor: CBFC,
        releaseNorms: [
            indiaInterval,
            indiaSongs,
            { id: 'festival', label: 'Festival Friday', detail: 'Eid, Diwali, and Christmas are the dates that can carry a star film. A clash on those Fridays is the business.' },
        ],
        announcements: [
            { id: 'mahurat', label: 'Mahurat', detail: 'A short ceremony and a clap. The film exists because people saw it start.', buzz: 8, cost: 180_000 },
            { id: 'first-look', label: 'First look', detail: 'One image, the title, and a date. The rest can wait.', buzz: 9, cost: 80_000 },
            { id: 'festival-date', label: 'Festival date', detail: 'Announce the Friday before anyone else takes it.', buzz: 12, cost: 60_000 },
            { id: 'birthday', label: 'Birthday teaser', detail: 'Drop the teaser on the lead\'s birthday. The fan clubs do the posting.', buzz: 11, cost: 120_000 },
        ],
        crises: INDIA_CRISES,
        studios: ['Lotus Frame Films', 'Juhu Night Pictures', 'Red Verandah', 'Gateway Talkies'],
    },
    TOLLYWOOD: {
        id: 'TOLLYWOOD', name: 'Tollywood', hqCountry: 'India', hqCity: 'Hyderabad',
        languages: ['te', 'en'], currency: { code: 'INR', symbol: '₹', perUsd: 83 },
        marketScale: 0.4, taxOnStudioShare: 0.12, taxLabel: 'GST and state levies come off the studio share of ticket money.',
        crewCost: 0.68, localStarBonus: 12, homeAudienceBonus: 0.14, regionOpenCost: 750_000, crossoverOpenness: 0.4,
        genreBias: { ACTION: 1.45, DRAMA: 1.1, MUSICAL: 1.2, ROMANCE: 1, COMEDY: 1, SUPERHERO: 0.85 },
        calendar: [
            { week: 2, name: 'Sankranti', impact: 1.55, genres: ['ACTION', 'DRAMA', 'COMEDY'] },
            { week: 16, name: 'Eid window', impact: 1.15 },
            { week: 30, name: 'Summer mass', impact: 1.25, genres: ['ACTION'] },
            { week: 43, name: 'Diwali', impact: 1.2 },
        ],
        censor: CBFC,
        releaseNorms: [
            indiaInterval,
            indiaSongs,
            { id: 'sankranti', label: 'Sankranti', detail: 'The Telugu calendar\'s big theatrical date. A star film that misses it waits a year or fights summer.' },
        ],
        announcements: [
            { id: 'mahurat', label: 'Opening ceremony', detail: 'A pooja and a clap on a Hyderabad stage.', buzz: 8, cost: 140_000 },
            { id: 'first-look', label: 'First look', detail: 'The look is the announcement. The title can already be known.', buzz: 10, cost: 70_000 },
            { id: 'birthday', label: 'Birthday glimpse', detail: 'A glimpse on the hero\'s birthday. Fan clubs carry it further than ads.', buzz: 12, cost: 90_000 },
        ],
        crises: INDIA_CRISES,
        studios: ['Deccan Banner', 'Pearl City Frames', 'Nizam Talkies', 'Tank Bund Pictures'],
    },
    KOLLYWOOD: {
        id: 'KOLLYWOOD', name: 'Kollywood', hqCountry: 'India', hqCity: 'Chennai',
        languages: ['ta', 'en'], currency: { code: 'INR', symbol: '₹', perUsd: 83 },
        marketScale: 0.38, taxOnStudioShare: 0.12, taxLabel: 'GST and state levies come off the studio share of ticket money.',
        crewCost: 0.7, localStarBonus: 11, homeAudienceBonus: 0.13, regionOpenCost: 720_000, crossoverOpenness: 0.36,
        genreBias: { ACTION: 1.35, DRAMA: 1.2, MUSICAL: 1.15, THRILLER: 1.1, COMEDY: 1, ROMANCE: 0.95 },
        calendar: [
            { week: 2, name: 'Pongal', impact: 1.55, genres: ['ACTION', 'DRAMA', 'COMEDY'] },
            { week: 16, name: 'Tamil New Year window', impact: 1.25 },
            { week: 43, name: 'Diwali', impact: 1.35, genres: ['ACTION', 'COMEDY'] },
        ],
        censor: CBFC,
        releaseNorms: [
            indiaInterval,
            indiaSongs,
            { id: 'pongal', label: 'Pongal', detail: 'The Tamil theatrical holiday. A clash on Pongal is a political and commercial event, not just a calendar note.' },
        ],
        announcements: [
            { id: 'mahurat', label: 'Pooja', detail: 'The film is announced when the pooja happens, not when a trade blog guesses.', buzz: 7, cost: 100_000 },
            { id: 'first-look', label: 'First look', detail: 'One still, often on a birthday or a festival morning.', buzz: 10, cost: 60_000 },
            { id: 'audio', label: 'Audio launch', detail: 'A stage, the songs, and the date said out loud.', buzz: 9, cost: 220_000 },
        ],
        crises: INDIA_CRISES,
        studios: ['Marina Reel Co', 'Kodambakkam Gate', 'Bay of Bengal Pictures', 'Palm Shadow Films'],
    },
    MOLLYWOOD: {
        id: 'MOLLYWOOD', name: 'Mollywood', hqCountry: 'India', hqCity: 'Kochi',
        languages: ['ml', 'en'], currency: { code: 'INR', symbol: '₹', perUsd: 83 },
        marketScale: 0.22, taxOnStudioShare: 0.12, taxLabel: 'GST and state levies come off the studio share of ticket money.',
        crewCost: 0.62, localStarBonus: 9, homeAudienceBonus: 0.1, regionOpenCost: 480_000, crossoverOpenness: 0.42,
        genreBias: { DRAMA: 1.35, THRILLER: 1.25, COMEDY: 1.1, ROMANCE: 1, ACTION: 0.9, MUSICAL: 0.85 },
        calendar: [
            { week: 16, name: 'Vishu', impact: 1.3 },
            { week: 34, name: 'Onam', impact: 1.45, genres: ['DRAMA', 'COMEDY', 'THRILLER'] },
            { week: 51, name: 'Christmas', impact: 1.25 },
        ],
        censor: CBFC,
        releaseNorms: [
            { id: 'onam', label: 'Onam release', detail: 'Onam is the Malayalam date that can carry a film across Kerala in one weekend.' },
            { id: 'small', label: 'Small and sharp', detail: 'A Malayalam film can win without a song count. Critics and the diaspora both count.' },
        ],
        announcements: [
            { id: 'poster', label: 'Poster drop', detail: 'A single poster and a release window. The rest is word of mouth.', buzz: 6, cost: 25_000 },
            { id: 'teaser', label: 'Teaser', detail: 'Short, specific, and usually earlier than the songs.', buzz: 7, cost: 40_000 },
        ],
        crises: INDIA_CRISES,
        studios: ['Backwater Frames', 'Monsoon Gate', 'Spice Coast Pictures', 'Lighthouse Talkies'],
    },
    NOLLYWOOD: {
        id: 'NOLLYWOOD', name: 'Nollywood', hqCountry: 'Nigeria', hqCity: 'Lagos',
        languages: ['en', 'yo', 'ig', 'ha'], currency: { code: 'NGN', symbol: '₦', perUsd: 1500 },
        marketScale: 0.16, taxOnStudioShare: 0.08, taxLabel: 'Local levies trim the studio share. Most of the money is still in volume, not ticket price.',
        crewCost: 0.45, localStarBonus: 8, homeAudienceBonus: 0.08, regionOpenCost: 280_000, crossoverOpenness: 0.34,
        genreBias: { DRAMA: 1.3, COMEDY: 1.25, ROMANCE: 1.2, THRILLER: 1.1, ACTION: 0.9 },
        calendar: [
            { week: 1, name: 'New Year', impact: 1.2 },
            { week: 16, name: 'Easter window', impact: 1.25 },
            { week: 51, name: 'Detty December', impact: 1.45, genres: ['COMEDY', 'DRAMA', 'ROMANCE'] },
        ],
        censor: {
            id: 'NFVCB', name: 'NFVCB',
            notes: 'Nigeria. Classification before exhibition. A film can live on platforms and still need a theatrical certificate for cinemas.',
            ratings: [
                { id: 'G', label: 'G', minAge: 0 },
                { id: 'PG', label: 'PG', minAge: 8 },
                { id: '12', label: '12', minAge: 12 },
                { id: '15', label: '15', minAge: 15 },
                { id: '18', label: '18', minAge: 18, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'cinema-and-platform', label: 'Cinema and platforms', detail: 'A Lagos cinema run and a platform drop can be the same release, weeks apart. Streaming itself stays on its own system.' },
            { id: 'december', label: 'December', detail: 'Detty December is when the diaspora and the city are both in the seats.' },
        ],
        announcements: [
            { id: 'poster', label: 'Character poster', detail: 'Faces first. The plot can wait.', buzz: 7, cost: 20_000 },
            { id: 'trailer', label: 'Trailer premiere', detail: 'A small Lagos screening for the trailer, then the phones.', buzz: 8, cost: 45_000 },
        ],
        crises: [
            ...EAST_ASIA_SHARED('Lagos'),
            crisis('censor', 'The board wants a trim', 'A scene is flagged before cinemas can book it.', [
                pay('cut', 'Trim the scene', -15000, -3, -1, 0, 1, 'The certificate moves. The scene is shorter.'),
                pay('hold', 'Hold the cinema date', 0, 0, -4, 1, 0, 'Cinemas wait. The argument is not over.'),
            ]),
        ],
        studios: ['Lagoon Pictures', 'Third Mainland Films', 'Palm Wine Gate', 'Island Reel Co'],
    },
    KOREAN: {
        id: 'KOREAN', name: 'Korean cinema', hqCountry: 'South Korea', hqCity: 'Seoul',
        languages: ['ko'], currency: { code: 'KRW', symbol: '₩', perUsd: 1350 },
        marketScale: 0.46, taxOnStudioShare: 0.1, taxLabel: 'A VAT slice comes off the studio share of ticket money.',
        crewCost: 0.84, localStarBonus: 8, homeAudienceBonus: 0.1, regionOpenCost: 1_400_000, crossoverOpenness: 0.55,
        genreBias: { THRILLER: 1.35, DRAMA: 1.25, ACTION: 1.15, ROMANCE: 1.1, HORROR: 1.1, COMEDY: 1 },
        calendar: [
            { week: 1, name: 'New Year', impact: 1.2 },
            { week: 5, name: 'Seollal', impact: 1.35 },
            { week: 30, name: 'Summer', impact: 1.25, genres: ['THRILLER', 'HORROR', 'ACTION'] },
            { week: 40, name: 'Chuseok', impact: 1.45 },
        ],
        censor: {
            id: 'KMRB', name: 'Korea Media Rating Board',
            notes: 'South Korea. A rating is required before exhibition. Restricted ratings cut the show count.',
            ratings: [
                { id: 'ALL', label: 'All', minAge: 0 },
                { id: '12', label: '12', minAge: 12 },
                { id: '15', label: '15', minAge: 15 },
                { id: '19', label: '19', minAge: 19, restricted: true },
                { id: 'RESTRICTED', label: 'Restricted', minAge: 19, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'series', label: '12 to 16 episodes', detail: 'A Korean series is often 12 or 16 episodes. A film can still be two hours. The series shape is the one platforms and Fridays expect.' },
            { id: 'weekend', label: 'Wednesday or holiday open', detail: 'Local films often open midweek or on Seollal and Chuseok, not only on a Hollywood Friday.' },
        ],
        announcements: [
            { id: 'lineup', label: 'Lineup press conference', detail: 'The cast sits at a long table and the date is said once.', buzz: 8, cost: 160_000 },
            { id: 'poster', label: 'Teaser poster', detail: 'A poster with almost no copy. The names do the work.', buzz: 7, cost: 50_000 },
            { id: 'still', label: 'Still cut', detail: 'One frame, released when the edit can spare it.', buzz: 6, cost: 20_000 },
        ],
        crises: [
            ...EAST_ASIA_SHARED('Seoul'),
            crisis('series-cut', 'The episode order changed', 'The buyer wants 12 episodes. You wrote 16. Or the other way around.', [
                pay('cut', 'Cut to the order', -180000, -3, 1, 1, 2, 'The order matches the slot. A subplot is gone.'),
                pay('hold', 'Keep the cut and shop it', 0, 2, -4, -1, -2, 'You kept the episodes. The buyer may walk.'),
            ]),
        ],
        studios: ['Han River Films', 'Night Bus Pictures', 'Gangnam Gate', 'Blue Tile Studio'],
    },
    BRITISH: {
        id: 'BRITISH', name: 'British and European film', hqCountry: 'United Kingdom', hqCity: 'London',
        languages: ['en'], currency: { code: 'GBP', symbol: '£', perUsd: 0.78 },
        marketScale: 0.36, taxOnStudioShare: 0.08, taxLabel: 'UK incentive math is already a discount. This slice is the extra levy on the studio share.',
        crewCost: 0.9, localStarBonus: 6, homeAudienceBonus: 0.06, regionOpenCost: 1_200_000, crossoverOpenness: 0.7,
        genreBias: { DRAMA: 1.3, THRILLER: 1.15, COMEDY: 1.1, BIOPIC: 1.2, ACTION: 0.85, SUPERHERO: 0.6 },
        calendar: [
            { week: 8, name: 'Berlin window', impact: 1.1, genres: ['DRAMA'] },
            { week: 20, name: 'Cannes window', impact: 1.2, genres: ['DRAMA', 'THRILLER'] },
            { week: 36, name: 'Venice and autumn', impact: 1.15, genres: ['DRAMA', 'BIOPIC'] },
            { week: 51, name: 'Christmas', impact: 1.25, genres: ['COMEDY', 'DRAMA'] },
        ],
        censor: {
            id: 'BBFC', name: 'BBFC',
            notes: 'United Kingdom. Age ratings for cinemas and home video. An 18 narrows the multiplex.',
            ratings: [
                { id: 'U', label: 'U', minAge: 0 },
                { id: 'PG', label: 'PG', minAge: 8 },
                { id: '12A', label: '12A', minAge: 12 },
                { id: '15', label: '15', minAge: 15 },
                { id: '18', label: '18', minAge: 18, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'festival', label: 'Festival first', detail: 'Cannes, Venice, Berlin, or London can be the opening. The wide date comes after the reviews.' },
            { id: 'three-act', label: 'Three acts, smaller scale', detail: 'The shape is still three acts. The budget is not a Hollywood tentpole unless someone else is paying.' },
        ],
        announcements: [
            { id: 'festival', label: 'Festival selection', detail: 'Being in the lineup is the announcement.', buzz: 10, cost: 40_000 },
            { id: 'trade', label: 'Trade announcement', detail: 'A cast note and a sales badge. Quiet on purpose.', buzz: 5, cost: 15_000 },
        ],
        crises: [
            crisis('censor', 'The BBFC is at 15 or 18', 'The rating will decide which screens take the film.', [
                pay('cut', 'Cut for a lower rating', -70000, -3, -1, 0, 0, 'The rating dropped. A scene is softer.'),
                pay('keep', 'Keep the higher rating', 0, 2, -2, 2, 0, 'You kept the cut. Fewer screens, cleaner reviews.'),
            ]),
            ...HOLLYWOOD_CRISES.filter(row => row.id === 'date-clash' || row.id === 'reshoot'),
        ],
        studios: ['Thames & Grey', 'Pine Court Pictures', 'North Circular Films', 'Wet Wool Studio'],
    },
    CHINESE: {
        id: 'CHINESE', name: 'Chinese cinema', hqCountry: 'China', hqCity: 'Beijing',
        languages: ['zh'], currency: { code: 'CNY', symbol: '¥', perUsd: 7.2 },
        marketScale: 0.7, taxOnStudioShare: 0.14, taxLabel: 'A levy comes off the studio share. Approval, not the tax, is what stops a date.',
        crewCost: 0.8, localStarBonus: 9, homeAudienceBonus: 0.12, regionOpenCost: 1_800_000, crossoverOpenness: 0.28,
        genreBias: { ACTION: 1.2, COMEDY: 1.3, DRAMA: 1.15, FANTASY: 1.2, ROMANCE: 1.15, SUPERHERO: 0.7 },
        calendar: [
            { week: 6, name: 'Spring Festival', impact: 1.6, genres: ['COMEDY', 'ACTION', 'FANTASY'] },
            { week: 18, name: 'May holiday', impact: 1.25 },
            { week: 28, name: 'Summer', impact: 1.3 },
            { week: 40, name: 'National Day', impact: 1.45, genres: ['ACTION', 'DRAMA'] },
        ],
        censor: {
            id: 'CHINA', name: 'Film approval',
            notes: 'China. A film needs approval before it can be released or promoted. A foreign co-production is a different path from a local film. This is a delay and a cut list, not a public rating board like the MPA.',
            ratings: [
                { id: 'APPROVED', label: 'Approved', minAge: 0 },
                { id: 'CUTS', label: 'Approved with cuts', minAge: 0 },
                { id: 'HELD', label: 'Held', minAge: 0, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'approval', label: 'Approval before the date', detail: 'You do not announce a locked date until the film is through. A hold moves the holiday, not just the ads.' },
            { id: 'holiday', label: 'Holiday windows', detail: 'Spring Festival and National Day are the windows that can return a big local film.' },
        ],
        announcements: [
            { id: 'still', label: 'First still', detail: 'A still, the title, and the cast. The date stays soft until approval.', buzz: 7, cost: 40_000 },
            { id: 'conference', label: 'Press conference', detail: 'The producers and the lead in one room, after the film is allowed to be discussed.', buzz: 9, cost: 200_000 },
        ],
        crises: [
            crisis('approval', 'Approval is not through', 'The date is close and the film is still held. Promotion that assumes a date can be pulled.', [
                pay('wait', 'Wait and keep the cut', 0, 2, -8, 1, -1, 'You waited. The holiday may leave without you.'),
                pay('cut', 'Make the requested cuts', -300000, -4, -2, 0, 2, 'The list is shorter. The date can still happen.'),
            ]),
            crisis('date-clash', 'Another film has the holiday', 'Spring Festival or National Day cannot hold every tentpole.', [
                pay('move', 'Take the next window', -200000, 0, -4, 1, 1, 'You left the holiday. The other film will be the one people quote.'),
                pay('stay', 'Stay on the holiday', -800000, 0, 6, -1, 0, 'You stayed. Screens will be split.'),
            ]),
            crisis('leak', 'A copy leaked', 'An early copy is being passed around before approval allows a trailer.', [
                pay('quiet', 'Stay off it', 0, 0, -2, 1, 0, 'You did not amplify it. The copy still exists.'),
                pay('hold', 'Hold the campaign', -50000, 0, -5, 2, 1, 'The ads stopped until the situation is clearer.'),
            ]),
        ],
        studios: ['North Capital Frames', 'Pearl Delta Pictures', 'Old City Gate', 'Lantern Reel'],
    },
    LATIN: {
        id: 'LATIN', name: 'Latin American cinema', hqCountry: 'Mexico', hqCity: 'Mexico City',
        languages: ['es', 'pt'], currency: { code: 'MXN', symbol: 'MX$', perUsd: 17 },
        marketScale: 0.3, taxOnStudioShare: 0.1, taxLabel: 'Local tax comes off the studio share. Incentives, if you have them, are already in the crew cost.',
        crewCost: 0.66, localStarBonus: 7, homeAudienceBonus: 0.08, regionOpenCost: 640_000, crossoverOpenness: 0.5,
        genreBias: { DRAMA: 1.3, THRILLER: 1.2, COMEDY: 1.15, ROMANCE: 1.1, HORROR: 1.1, ACTION: 0.95 },
        calendar: [
            { week: 7, name: 'Valentine window', impact: 1.15, genres: ['ROMANCE', 'COMEDY'] },
            { week: 20, name: 'Cannes corridor', impact: 1.1, genres: ['DRAMA'] },
            { week: 28, name: 'Summer', impact: 1.2 },
            { week: 44, name: 'Day of the Dead window', impact: 1.2, genres: ['HORROR', 'DRAMA'] },
        ],
        censor: {
            id: 'LATAM', name: 'Local classification',
            notes: 'Mexico, Brazil, and neighbors each classify films. The set here is the shared age ladder the release desk can read. A local board can still ask for a card or a cut.',
            ratings: [
                { id: 'AA', label: 'AA / L', minAge: 0 },
                { id: 'A', label: 'A / 10', minAge: 10 },
                { id: 'B', label: 'B / 12', minAge: 12 },
                { id: 'B15', label: 'B15 / 14', minAge: 14 },
                { id: 'C', label: 'C / 16', minAge: 16, restricted: true },
                { id: 'D', label: 'D / 18', minAge: 18, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'festival', label: 'Festival then home', detail: 'A Latin film often meets the world at a festival and the home audience after.' },
            { id: 'three-act', label: 'Three acts', detail: 'The dramatic shape is three acts. Comedy can be looser if the star is the reason to buy the ticket.' },
        ],
        announcements: [
            { id: 'festival', label: 'Festival premiere', detail: 'The premiere is the announcement.', buzz: 9, cost: 180_000 },
            { id: 'trailer', label: 'Trailer', detail: 'A trailer once the home date exists.', buzz: 6, cost: 40_000 },
        ],
        crises: [
            crisis('censor', 'A board wants a card or a cut', 'The classification came back higher than the exhibitor plan.', [
                pay('cut', 'Cut for the lower card', -60000, -3, -1, 0, 1, 'The card dropped. A scene is shorter.'),
                pay('keep', 'Keep the card', 0, 1, -2, 1, 0, 'You kept it. Some screens will pass.'),
            ]),
            ...EAST_ASIA_SHARED('Mexico City'),
        ],
        studios: ['Azteca Frame', 'South Sea Pictures', 'Plaza Mayor Films', 'Cordillera Gate'],
    },
    JAPANESE: {
        id: 'JAPANESE', name: 'Japanese cinema', hqCountry: 'Japan', hqCity: 'Tokyo',
        languages: ['ja'], currency: { code: 'JPY', symbol: '¥', perUsd: 150 },
        marketScale: 0.44, taxOnStudioShare: 0.1, taxLabel: 'Consumption tax comes off the studio share of ticket money.',
        crewCost: 0.92, localStarBonus: 8, homeAudienceBonus: 0.1, regionOpenCost: 1_600_000, crossoverOpenness: 0.38,
        genreBias: { DRAMA: 1.25, ANIMATION: 1.4, HORROR: 1.2, ROMANCE: 1.1, ACTION: 1, THRILLER: 1.1 },
        calendar: [
            { week: 1, name: 'New Year', impact: 1.35 },
            { week: 18, name: 'Golden Week', impact: 1.4 },
            { week: 32, name: 'Obon', impact: 1.25 },
            { week: 40, name: 'Autumn', impact: 1.1, genres: ['DRAMA'] },
        ],
        censor: {
            id: 'EIRIN', name: 'Eirin',
            notes: 'Japan. Eirin classifies films for exhibition. A restricted rating changes which houses will book it.',
            ratings: [
                { id: 'G', label: 'G', minAge: 0 },
                { id: 'PG12', label: 'PG12', minAge: 12 },
                { id: 'R15', label: 'R15+', minAge: 15, restricted: true },
                { id: 'R18', label: 'R18+', minAge: 18, restricted: true },
            ],
        },
        releaseNorms: [
            { id: 'committee', label: 'Committee', detail: 'A film often has a committee of backers. They want a say in the date, the cut, and the magazine cover.' },
            { id: 'golden-week', label: 'Golden Week and New Year', detail: 'Those weeks carry the wide releases. A smaller film can hide in a quieter month and live longer.' },
        ],
        announcements: [
            { id: 'magazine', label: 'Magazine cover', detail: 'The cast on a weekly. The announcement is the newsstand.', buzz: 7, cost: 120_000 },
            { id: 'countdown', label: 'Countdown site', detail: 'A page, a date, and a new still every few days.', buzz: 6, cost: 30_000 },
            { id: 'stage', label: 'Stage greeting plan', detail: 'The cast will stand in cinemas. Announce it with the date.', buzz: 8, cost: 200_000 },
        ],
        crises: [
            ...EAST_ASIA_SHARED('Tokyo'),
            crisis('committee', 'The committee wants another pass', 'A backer has notes. The date assumes their yes.', [
                pay('notes', 'Take the notes', -220000, -2, -2, 1, 3, 'You took the pass. The backer stays. The cut moved.'),
                pay('hold', 'Hold the cut', 0, 3, -3, -1, -3, 'You held the cut. A backer may step back.'),
            ]),
        ],
        studios: ['Yamanote Pictures', 'Paper Door Films', 'Night Train Studio', 'Cedar Gate'],
    },
};

export const countryToIndustry = (country?: string): FilmIndustryId => {
    const key = (country || '').trim().toLowerCase();
    const table: Record<string, FilmIndustryId> = {
        'united states': 'HOLLYWOOD', usa: 'HOLLYWOOD', canada: 'HOLLYWOOD', australia: 'HOLLYWOOD',
        'united kingdom': 'BRITISH', uk: 'BRITISH', ireland: 'BRITISH', france: 'BRITISH', germany: 'BRITISH',
        italy: 'BRITISH', spain: 'BRITISH', sweden: 'BRITISH', poland: 'BRITISH', netherlands: 'BRITISH',
        'türkiye': 'BRITISH', turkey: 'BRITISH', russia: 'BRITISH',
        india: 'BOLLYWOOD',
        nigeria: 'NOLLYWOOD', 'south africa': 'NOLLYWOOD', ghana: 'NOLLYWOOD', kenya: 'NOLLYWOOD',
        mexico: 'LATIN', brazil: 'LATIN', argentina: 'LATIN', colombia: 'LATIN', chile: 'LATIN',
        'south korea': 'KOREAN', korea: 'KOREAN',
        japan: 'JAPANESE',
        china: 'CHINESE', 'hong kong': 'CHINESE',
        philippines: 'HOLLYWOOD', indonesia: 'HOLLYWOOD',
    };
    return table[key] || 'HOLLYWOOD';
};

export const industryById = (id?: string | null): IndustryEngineDef =>
    INDUSTRY_ENGINE[(id && id in INDUSTRY_ENGINE ? id : 'HOLLYWOOD') as FilmIndustryId];

export const allIndustries = (): IndustryEngineDef[] => INDUSTRY_ORDER.map(id => INDUSTRY_ENGINE[id]);

export const theatricalMultiplier = (industryId?: FilmIndustryId | null): number => {
    const row = industryById(industryId);
    return row.marketScale * (1 + row.homeAudienceBonus);
};

export const calendarImpact = (industryId: FilmIndustryId | undefined, week: number, genre?: Genre): number => {
    if (!industryId || industryId === 'HOLLYWOOD') return 1;
    const beats = INDUSTRY_ENGINE[industryId].calendar.filter(beat => beat.week === week);
    if (!beats.length) return 1;
    const beat = beats.find(item => !item.genres || !genre || item.genres.includes(genre)) || beats[0];
    if (beat.genres && genre && !beat.genres.includes(genre)) return 1;
    return beat.impact;
};

export const pickWeightedGenre = (industryId: FilmIndustryId, genres: Genre[], roll: number): Genre => {
    if (industryId === 'HOLLYWOOD') return genres[roll % genres.length];
    const weights = genres.map(genre => Math.max(0.35, INDUSTRY_ENGINE[industryId].genreBias[genre] ?? 1));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = (roll % 1000) / 1000 * total;
    for (let index = 0; index < genres.length; index += 1) {
        cursor -= weights[index];
        if (cursor <= 0) return genres[index];
    }
    return genres[genres.length - 1];
};

export const ratingForRoll = (industryId: FilmIndustryId, roll: number): RatingLabel => {
    const ratings = INDUSTRY_ENGINE[industryId].censor.ratings;
    return ratings[roll % ratings.length];
};

export const pickIndustryCrisis = (industryId: FilmIndustryId, salt: string): IndustryCrisisTemplate => {
    const list = INDUSTRY_ENGINE[industryId].crises;
    let hash = 0;
    const key = `${industryId}:${salt}`;
    for (let index = 0; index < key.length; index += 1) hash = (hash * 33 + key.charCodeAt(index)) >>> 0;
    return list[hash % list.length];
};

export const hqSummary = (industryId?: FilmIndustryId | null): string => {
    const row = industryById(industryId);
    return `${row.hqCity}, ${row.hqCountry}`;
};
