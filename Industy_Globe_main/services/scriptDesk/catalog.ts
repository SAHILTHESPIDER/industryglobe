import type { FilmIndustryId, Genre, CharacterRoleSize } from '../../types';

export interface IndustryProfile {
    id: FilmIndustryId;
    label: string;
    place: string;
    /** How much a songless film hurts. central = Indian popular cinema. */
    songs: 'central' | 'expected' | 'optional';
    male: string[];
    female: string[];
    last: string[];
    scenes: string[];
    rivals: string[];
}

const english = {
    male: ['Jonah', 'Eli', 'Marcus', 'Adrian', 'Cole', 'Nathan', 'Leo', 'Owen', 'Felix', 'Grant', 'Miles', 'Calvin'],
    female: ['June', 'Nora', 'Celia', 'Mara', 'Ivy', 'Helen', 'Ruth', 'Clara', 'Eden', 'Willa', 'Sable', 'Vera'],
    last: ['Hale', 'Brooks', 'Keller', 'Voss', 'Adler', 'Quinn', 'Marsh', 'Ellison', 'Crowe', 'Bennett', 'Shaw', 'Drake'],
};

export const INDUSTRIES: Record<FilmIndustryId, IndustryProfile> = {
    HOLLYWOOD: {
        id: 'HOLLYWOOD', label: 'Hollywood', place: 'Los Angeles', songs: 'optional',
        ...english,
        scenes: ['STUDIO BACKLOT', 'DINER OFF HIGHWAY 5', 'GLASS PENTHOUSE', 'DESERT MOTEL', 'PRECINCT BULLPEN'],
        rivals: ['Northline Pictures', 'Harbor & Co', 'Metro Crown', 'Sable Studios'],
    },
    BOLLYWOOD: {
        id: 'BOLLYWOOD', label: 'Bollywood', place: 'Mumbai', songs: 'central',
        male: ['Aarav', 'Kabir', 'Vihaan', 'Reyansh', 'Arjun', 'Dev', 'Rohan', 'Ishaan', 'Vivaan', 'Aditya', 'Kunal', 'Farhan'],
        female: ['Ananya', 'Meera', 'Aisha', 'Kiara', 'Diya', 'Myra', 'Saanvi', 'Ira', 'Navya', 'Zara', 'Pari', 'Anika'],
        last: ['Kapoor', 'Malhotra', 'Sharma', 'Singh', 'Chopra', 'Mehra', 'Bajaj', 'Khanna', 'Joshi', 'Khan', 'Sethi', 'Bhatt'],
        scenes: ['MUMBAI LOCAL', 'BANDRA TERRACE', 'HAVELI COURTYARD', 'WEDDING HALL', 'MARINE DRIVE'],
        rivals: ['Lotus Frame Films', 'Juhu Night Pictures', 'Red Verandah', 'Gateway Talkies'],
    },
    TOLLYWOOD: {
        id: 'TOLLYWOOD', label: 'Tollywood', place: 'Hyderabad', songs: 'central',
        male: ['Arjun', 'Venkat', 'Surya', 'Karthik', 'Rishi', 'Tarun', 'Charan', 'Nandan', 'Varun', 'Teja', 'Harsha', 'Akhil'],
        female: ['Anitha', 'Padma', 'Lakshmi', 'Sruthi', 'Deepika', 'Harini', 'Bhavana', 'Keerthi', 'Niharika', 'Sravani', 'Divya', 'Amulya'],
        last: ['Reddy', 'Rao', 'Naidu', 'Chowdary', 'Varma', 'Goud', 'Prasad', 'Sharma', 'Murthy', 'Raju'],
        scenes: ['CHARMINAR LANE', 'GOLCONDA RAMPART', 'VILLAGE THRESHING FLOOR', 'FILM NAGAR BUNGALOW', 'GODAVARI GHAT'],
        rivals: ['Deccan Banner', 'Pearl City Frames', 'Nizam Talkies', 'Tank Bund Pictures'],
    },
    KOLLYWOOD: {
        id: 'KOLLYWOOD', label: 'Kollywood', place: 'Chennai', songs: 'central',
        male: ['Karthik', 'Arun', 'Murugan', 'Siva', 'Dhanush', 'Vetri', 'Gautham', 'Rahul', 'Pranav', 'Harish', 'Kishore', 'Aravind'],
        female: ['Divya', 'Priya', 'Meenakshi', 'Kavya', 'Anjali', 'Nila', 'Shreya', 'Aishwarya', 'Deepa', 'Oviya', 'Lakshmi', 'Revathi'],
        last: ['Murugan', 'Selvam', 'Iyer', 'Kumar', 'Pillai', 'Narayanan', 'Subramanian', 'Rajan', 'Krishnan', 'Velu'],
        scenes: ['MARINA BEACH', 'TEA STALL AT DAWN', 'TEMPLE TANK', 'KODAMBAKKAM STUDIO', 'MADURAI LANE'],
        rivals: ['Marina Reel Co', 'Kodambakkam Gate', 'Bay of Bengal Pictures', 'Palm Shadow Films'],
    },
    MOLLYWOOD: {
        id: 'MOLLYWOOD', label: 'Mollywood', place: 'Kochi', songs: 'expected',
        male: ['Aadil', 'Nikhil', 'Vishnu', 'Fahad', 'Nivin', 'Tovino', 'Basil', 'Unni', 'Jithin', 'Arjun', 'Sreenath', 'Govind'],
        female: ['Meera', 'Devika', 'Anna', 'Aparna', 'Nimisha', 'Grace', 'Malavika', 'Darshana', 'Nazriya', 'Parvathy', 'Kani', 'Rima'],
        last: ['Nair', 'Menon', 'Pillai', 'Krishnan', 'Varma', 'Joseph', 'Thomas', 'Kurian', 'Panicker', 'Mathew'],
        scenes: ['BACKWATER JETTY', 'KOCHI ALLEY IN RAIN', 'HILL STATION BUNGALOW', 'RUBBER ESTATE', 'FORT KOCHI VERANDA'],
        rivals: ['Backwater Frames', 'Monsoon Gate', 'Spice Coast Pictures', 'Lighthouse Talkies'],
    },
    NOLLYWOOD: {
        id: 'NOLLYWOOD', label: 'Nollywood', place: 'Lagos', songs: 'optional',
        male: ['Chinedu', 'Adebayo', 'Tunde', 'Emeka', 'Kunle', 'Segun', 'Ikenna', 'Femi', 'Obinna', 'Yusuf', 'Dayo', 'Chuka'],
        female: ['Ngozi', 'Funke', 'Amaka', 'Zainab', 'Chioma', 'Aisha', 'Yetunde', 'Adaeze', 'Halima', 'Bisola', 'Nneka', 'Sade'],
        last: ['Okonkwo', 'Adeyemi', 'Balogun', 'Okafor', 'Nwosu', 'Adebisi', 'Eze', 'Lawal', 'Okeke', 'Bello'],
        scenes: ['LAGOS DANFO', 'VICTORIA ISLAND FLAT', 'FAMILY COMPOUND', 'NIGHT MARKET', 'CHURCH AUDITORIUM'],
        rivals: ['Lagoon Pictures', 'Third Mainland Films', 'Palm Wine Gate', 'Island Reel Co'],
    },
    KOREAN: {
        id: 'KOREAN', label: 'Korean cinema', place: 'Seoul', songs: 'optional',
        male: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Do-yun', 'Ha-joon', 'Eun-woo', 'Si-woo', 'Jae-won', 'Gun-woo', 'Tae-yang'],
        female: ['Seo-yeon', 'Ha-eun', 'Ji-woo', 'Soo-ah', 'Ye-jin', 'Min-seo', 'Hae-won', 'Na-eun', 'Chae-won', 'Yuna'],
        last: ['Park', 'Kim', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han'],
        scenes: ['HAN RIVER BENCH', 'PC BANG', 'ROOFTOP IN ITAEWON', 'RAIN-SOAKED ALLEY', 'CORPORATE BOARDROOM'],
        rivals: ['Han River Films', 'Night Bus Pictures', 'Gangnam Gate', 'Blue Tile Studio'],
    },
    BRITISH: {
        id: 'BRITISH', label: 'British film', place: 'London', songs: 'optional',
        male: ['Arthur', 'Hugh', 'Callum', 'Edmund', 'Patrick', 'Simon', 'Theo', 'Alfie', 'George', 'Nigel', 'Rowan', 'Kit'],
        female: ['Imogen', 'Beatrice', 'Freya', 'Helen', 'Martha', 'Pippa', 'Agnes', 'Cressida', 'Elsie', 'Nora', 'Tabitha', 'Wren'],
        last: ['Ashworth', 'Pembroke', 'Hale', 'Singh', 'Okoye', 'Clarke', 'Whitaker', 'Begum', 'Doyle', 'Fraser', 'Khan', 'Moss'],
        scenes: ['TERRACED HOUSE', 'RAIN ON THE SOUTH BANK', 'COUNTRY KITCHEN', 'NIGHT BUS', 'GREY COURTROOM'],
        rivals: ['Thames & Grey', 'Pine Court Pictures', 'North Circular Films', 'Wet Wool Studio'],
    },
    CHINESE: {
        id: 'CHINESE', label: 'Chinese cinema', place: 'Beijing', songs: 'optional',
        male: ['Wei', 'Jun', 'Tao', 'Hao', 'Lei', 'Ming', 'Bo', 'Chen', 'Feng', 'Yang'],
        female: ['Mei', 'Xia', 'Ling', 'Hui', 'Yan', 'Jing', 'Na', 'Qian', 'Xue', 'Lin'],
        last: ['Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Zhao', 'Huang', 'Wu', 'Zhou', 'Xu'],
        scenes: ['HUTONG AT DUSK', 'HIGH-SPEED TRAIN', 'NIGHT MARKET STALL', 'RIVER TOWN INN', 'GLASS OFFICE'],
        rivals: ['North Capital Frames', 'Pearl Delta Pictures', 'Old City Gate', 'Lantern Reel'],
    },
    LATIN: {
        id: 'LATIN', label: 'Latin American cinema', place: 'Mexico City', songs: 'optional',
        male: ['Mateo', 'Javier', 'Andres', 'Diego', 'Santiago', 'Emilio', 'Rafael', 'Luis', 'Camilo', 'Hector'],
        female: ['Lucia', 'Camila', 'Valeria', 'Renata', 'Sofia', 'Mariana', 'Elena', 'Jimena', 'Paula', 'Ines'],
        last: ['Rojas', 'Vega', 'Morales', 'Herrera', 'Cruz', 'Delgado', 'Navarro', 'Silva', 'Ortega', 'Reyes'],
        scenes: ['ROOFTOP IN THE HEAT', 'NIGHT BUS TERMINAL', 'FAMILY COURTYARD', 'COAST ROAD', 'NEWSROOM'],
        rivals: ['Azteca Frame', 'South Sea Pictures', 'Plaza Mayor Films', 'Cordillera Gate'],
    },
    JAPANESE: {
        id: 'JAPANESE', label: 'Japanese cinema', place: 'Tokyo', songs: 'optional',
        male: ['Haruto', 'Ren', 'Sota', 'Yuki', 'Kaito', 'Haru', 'Minato', 'Asahi', 'Riku', 'Daiki'],
        female: ['Aoi', 'Yui', 'Hana', 'Mio', 'Sakura', 'Rin', 'Mei', 'Koharu', 'Nao', 'Emi'],
        last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'],
        scenes: ['CONVENIENCE STORE', 'RAIN ON THE YAMANOTE', 'COUNTRYSIDE STATION', 'CRAMPED APARTMENT', 'SCHOOL ROOF'],
        rivals: ['Yamanote Pictures', 'Paper Door Films', 'Night Train Studio', 'Cedar Gate'],
    },
};

export const INDUSTRY_ORDER: FilmIndustryId[] = [
    'HOLLYWOOD', 'BOLLYWOOD', 'TOLLYWOOD', 'KOLLYWOOD', 'MOLLYWOOD',
    'NOLLYWOOD', 'KOREAN', 'BRITISH', 'CHINESE', 'LATIN', 'JAPANESE',
];

export const isFilmIndustry = (value: unknown): value is FilmIndustryId =>
    typeof value === 'string' && value in INDUSTRIES;

export interface EffectChoice {
    id: string;
    label: string;
    detail: string;
    audience: number;
    critics: number;
    budget: number;
    genres?: Genre[];
}

export const TONES: EffectChoice[] = [
    { id: 'light', label: 'Light', detail: 'A crowd can watch it tired. Critics call it slight.', audience: 8, critics: -2, budget: 0 },
    { id: 'earnest', label: 'Earnest', detail: 'Sincere, a little uncool, and easy to root for.', audience: 4, critics: 6, budget: 200_000 },
    { id: 'dark', label: 'Dark', detail: 'Meaner reviews, smaller Saturday night.', audience: -3, critics: 8, budget: 350_000 },
    { id: 'satire', label: 'Satirical', detail: 'Lands with critics. Half the audience thinks it is a joke on them.', audience: 1, critics: 7, budget: 150_000 },
    { id: 'epic', label: 'Epic', detail: 'Scale sells tickets and eats the budget.', audience: 10, critics: 3, budget: 8_000_000 },
    { id: 'intimate', label: 'Intimate', detail: 'Two rooms and a face. Cheap, and critics lean in.', audience: 2, critics: 9, budget: -600_000 },
    { id: 'masala', label: 'Masala', detail: 'Songs, fights, family, a tear, a joke. Built for a full house.', audience: 12, critics: -4, budget: 2_400_000 },
];

export const HOOKS: EffectChoice[] = [
    { id: 'wrong-place', label: 'Wrong place, wrong night', detail: 'An ordinary person is pulled into the plot.', audience: 6, critics: 1, budget: 400_000 },
    { id: 'family-debt', label: 'A family debt comes due', detail: 'The story starts at home. Relatives will not stay out of it.', audience: 7, critics: 4, budget: 500_000 },
    { id: 'last-job', label: 'One last job', detail: 'Familiar, and audiences still buy the ticket.', audience: 5, critics: -2, budget: 1_200_000, genres: ['ACTION', 'CRIME', 'THRILLER', 'ADVENTURE'] },
    { id: 'missing-person', label: 'Someone does not come home', detail: 'A search gives critics a spine and audiences a reason to stay.', audience: 5, critics: 6, budget: 300_000 },
    { id: 'arranged', label: 'A match nobody agreed to', detail: 'Marriage, class, and a city that is watching.', audience: 8, critics: 3, budget: 700_000, genres: ['ROMANCE', 'DRAMA', 'COMEDY', 'MUSICAL'] },
    { id: 'underdog', label: 'The town writes them off', detail: 'Sports, songs, or a stage. The comeback is the sell.', audience: 9, critics: 2, budget: 1_500_000, genres: ['SPORTS', 'MUSICAL', 'DRAMA', 'COMEDY'] },
    { id: 'first-contact', label: 'Something arrives', detail: 'A new rule for the world. The budget follows the idea.', audience: 7, critics: 5, budget: 4_000_000, genres: ['SCI_FI', 'HORROR', 'FANTASY', 'SUPERHERO'] },
    { id: 'scandal', label: 'A public name, a private mess', detail: 'Curiosity is free. Lawyers are not.', audience: 6, critics: 7, budget: 250_000, genres: ['BIOPIC', 'DRAMA', 'DOCUMENTARY', 'THRILLER'] },
    { id: 'heist-wedding', label: 'The wedding is a cover', detail: 'Color, crowd, and a set piece hiding in a celebration.', audience: 8, critics: 1, budget: 2_200_000 },
    { id: 'quiet-horror', label: 'The house is wrong', detail: 'Dread on a small budget, if the audience will sit with it.', audience: 2, critics: 8, budget: -200_000, genres: ['HORROR', 'THRILLER', 'DRAMA'] },
];

export const CLIMAXES: EffectChoice[] = [
    { id: 'rooftop', label: 'Rooftop in the rain', detail: 'A clean visual. Stunts and weather insurance.', audience: 6, critics: 3, budget: 1_800_000 },
    { id: 'court', label: 'A room that has to tell the truth', detail: 'Dialogue carries it. Cheap if the pages are good.', audience: 3, critics: 8, budget: 200_000, genres: ['DRAMA', 'CRIME', 'BIOPIC', 'THRILLER'] },
    { id: 'wedding', label: 'The wedding blows open', detail: 'Family, crowd, and a song if you have one.', audience: 9, critics: 2, budget: 2_000_000 },
    { id: 'chase', label: 'A chase through the real city', detail: 'The poster writes itself. The city charges for it.', audience: 8, critics: 1, budget: 3_500_000, genres: ['ACTION', 'ADVENTURE', 'CRIME', 'SUPERHERO', 'THRILLER'] },
    { id: 'stage', label: 'The number they were afraid to sing', detail: 'Pays off songs. Without songs it is just a speech.', audience: 7, critics: 4, budget: 1_400_000, genres: ['MUSICAL', 'ROMANCE', 'DRAMA', 'COMEDY'] },
    { id: 'quiet', label: 'Two people, no music', detail: 'Critics remember the silence. Some audiences check their phones.', audience: 1, critics: 9, budget: -300_000 },
    { id: 'arena', label: 'The whole city is watching', detail: 'Stadium, final, or festival night. Scale and fatigue.', audience: 10, critics: 2, budget: 6_000_000, genres: ['SPORTS', 'ACTION', 'MUSICAL', 'SUPERHERO'] },
    { id: 'reveal-house', label: 'They walk back into the house', detail: 'The twist has to be in the walls. Small and nasty.', audience: 4, critics: 7, budget: 250_000, genres: ['HORROR', 'THRILLER', 'SCI_FI'] },
];

export const SONG_STYLES: EffectChoice[] = [
    { id: 'filmi', label: 'Filmi spectacle', detail: 'A full number. Costumes, playback, a location.', audience: 6, critics: -2, budget: 900_000 },
    { id: 'ballad', label: 'A ballad under the scene', detail: 'One song, used like a confession.', audience: 3, critics: 3, budget: 250_000 },
    { id: 'item', label: 'Item number', detail: 'A spike in chatter. Critics roll their eyes. The reel travels.', audience: 5, critics: -4, budget: 700_000 },
    { id: 'folk', label: 'Folk chorus', detail: 'Place and family. Lands when the industry already sings.', audience: 4, critics: 2, budget: 400_000 },
    { id: 'choir', label: 'Choir and theme', detail: 'Closer to a score than a jukebox.', audience: 2, critics: 4, budget: 500_000 },
    { id: 'hiphop', label: 'Street track', detail: 'Youth audience. Dates fast if the film sits in rewrites.', audience: 4, critics: 0, budget: 300_000 },
];

export interface TwistTemplate {
    id: string;
    label: string;
    detail: string;
    risk: string;
    reward: string;
    audience: number;
    critics: number;
    leak: number;
    linkedRole?: string;
    genres?: Genre[];
}

export const TWIST_TEMPLATES: TwistTemplate[] = [
    {
        id: 'friend-villain',
        label: 'The best friend is the villain',
        detail: 'The person the hero trusts has been steering the harm.',
        risk: 'If the turn is cheap, the audience feels cheated and spoiler posts do the marketing for free.',
        reward: 'A fair betrayal is what critics quote. Opening week gets a second conversation.',
        audience: 6, critics: 9, leak: 0.045, linkedRole: 'Best Friend',
    },
    {
        id: 'parent-secret',
        label: 'A parent kept the real story',
        detail: 'The family table was a cover. The third act belongs to them.',
        risk: 'Family audiences can turn on a cruel parent twist. The estate, if this is a true story, will notice.',
        reward: 'Home-market dramas live on this. Later parts inherit the argument.',
        audience: 5, critics: 7, leak: 0.03, linkedRole: 'Parent',
    },
    {
        id: 'hero-did-it',
        label: 'The hero caused it',
        detail: 'The lead is not framed. They did the thing the film has been mourning.',
        risk: 'Star vehicles hate this. A bankable lead may refuse the ending, or take a premium to play it.',
        reward: 'Critics take the film seriously. A brave audience stays to argue.',
        audience: -2, critics: 11, leak: 0.05, linkedRole: 'Hero',
    },
    {
        id: 'villain-right',
        label: 'The villain was telling the truth',
        detail: 'The moral frame flips in the last reel. Nobody leaves clean.',
        risk: 'A muddled ending plays as confusion, not complexity. Word of mouth can stall in week two.',
        reward: 'Think-pieces and a longer tail, especially in Korean, British, and prestige lanes.',
        audience: 2, critics: 8, leak: 0.035, linkedRole: 'Villain',
    },
    {
        id: 'sidekick-lead',
        label: 'The sidekick was the story',
        detail: 'The poster face is a decoy. The supporting part carries the ending.',
        risk: 'The lead actor notices. A big name in a shrinking part asks for more money.',
        reward: 'Ensemble films and sequels get a character people already love.',
        audience: 4, critics: 6, leak: 0.025, linkedRole: 'Sidekick',
    },
    {
        id: 'comic-break',
        label: 'The comic relief breaks',
        detail: 'The joke character stops joking. The laugh curdles.',
        risk: 'If the film needed them to be funny, the last act feels like a different movie.',
        reward: 'Audiences remember the moment. Critics stop calling the film empty.',
        audience: 3, critics: 5, leak: 0.02, linkedRole: 'Comic Relief',
    },
    {
        id: 'dead-all-along',
        label: 'They have been dead the whole time',
        detail: 'A classic. The film has to earn it or it is a punchline.',
        risk: 'Seen-it fatigue. One leaked page and the campaign is the twist, not the movie.',
        reward: 'When it works, the second weekend holds because people bring a friend.',
        audience: 4, critics: -1, leak: 0.07, genres: ['HORROR', 'THRILLER', 'DRAMA'],
    },
    {
        id: 'same-city',
        label: 'It was the next street over',
        detail: 'The epic shrinks to a neighborhood. The scale they paid for was a misdirect.',
        risk: 'Spend-thrill audiences feel shortchanged if the poster promised a war.',
        reward: 'A sharp, local ending travels as a story people retell.',
        audience: 1, critics: 7, leak: 0.02,
    },
    {
        id: 'song-is-a-clue',
        label: 'The song was the confession',
        detail: 'The lyrics have been telling the ending since the interval.',
        risk: 'Without real songs, this plays as a gimmick and critics say so.',
        reward: 'In a song industry, fans replay the number and find the plot.',
        audience: 7, critics: 4, leak: 0.04, genres: ['MUSICAL', 'ROMANCE', 'DRAMA', 'ACTION', 'COMEDY'],
    },
    {
        id: 'two-endings',
        label: 'The city gets a different ending',
        detail: 'Not a reshoot trick. The film argues with itself and picks a side late.',
        risk: 'Test audiences split. A rewrite culture can sand it down until it is neither.',
        reward: 'Debate keeps the title alive after opening week.',
        audience: 3, critics: 6, leak: 0.03,
    },
];

export interface RoleTemplate {
    role: string;
    size: CharacterRoleSize;
    gender: 'MALE' | 'FEMALE' | 'ANY';
}

export const EXTRA_ROLES: RoleTemplate[] = [
    { role: 'Hero', size: 'LEAD', gender: 'ANY' },
    { role: 'Heroine', size: 'LEAD', gender: 'FEMALE' },
    { role: 'Villain', size: 'LEAD', gender: 'ANY' },
    { role: 'Love Interest', size: 'LEAD', gender: 'ANY' },
    { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Comic Relief', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Sibling', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Cop', size: 'SUPPORTING', gender: 'ANY' },
    { role: 'Cameo', size: 'CAMEO', gender: 'ANY' },
    { role: 'Item Star', size: 'CAMEO', gender: 'ANY' },
];

export const defaultRoles = (genre: Genre, songs: IndustryProfile['songs']): RoleTemplate[] => {
    const base: Record<Genre, RoleTemplate[]> = {
        ACTION: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
        ],
        DRAMA: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
        ],
        COMEDY: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Comic Relief', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
        ],
        ROMANCE: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Heroine', size: 'LEAD', gender: 'FEMALE' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
        ],
        THRILLER: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Cop', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
        ],
        HORROR: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Cameo', size: 'CAMEO', gender: 'ANY' },
        ],
        SCI_FI: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
        ],
        ADVENTURE: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
        ],
        SUPERHERO: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Cameo', size: 'CAMEO', gender: 'ANY' },
        ],
        MUSICAL: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Heroine', size: 'LEAD', gender: 'FEMALE' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
        ],
        BIOPIC: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
        ],
        SPORTS: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Parent', size: 'SUPPORTING', gender: 'ANY' },
        ],
        ANIMATION: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
        ],
        FANTASY: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Mentor', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Sidekick', size: 'SUPPORTING', gender: 'ANY' },
        ],
        CRIME: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Villain', size: 'LEAD', gender: 'ANY' },
            { role: 'Cop', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
        ],
        DOCUMENTARY: [
            { role: 'Hero', size: 'LEAD', gender: 'ANY' },
            { role: 'Best Friend', size: 'SUPPORTING', gender: 'ANY' },
            { role: 'Rival', size: 'SUPPORTING', gender: 'ANY' },
        ],
    };
    const roles = [...(base[genre] || base.DRAMA)];
    if (songs === 'central') {
        if (!roles.some(role => role.role === 'Heroine') && genre !== 'DOCUMENTARY') {
            roles.splice(1, 0, { role: 'Heroine', size: 'LEAD', gender: 'FEMALE' });
        }
        if (!roles.some(role => role.role === 'Comic Relief')) roles.push({ role: 'Comic Relief', size: 'SUPPORTING', gender: 'ANY' });
        if (!roles.some(role => role.role === 'Parent')) roles.push({ role: 'Parent', size: 'SUPPORTING', gender: 'ANY' });
        if (!roles.some(role => role.role === 'Item Star')) roles.push({ role: 'Item Star', size: 'CAMEO', gender: 'ANY' });
    } else if (songs === 'expected' && !roles.some(role => role.role === 'Comic Relief')) {
        roles.push({ role: 'Comic Relief', size: 'SUPPORTING', gender: 'ANY' });
    }
    return roles;
};
