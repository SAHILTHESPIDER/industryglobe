import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookAnchor, fanbaseBoost, lifeAnchor, settlementUsd } from '../services/rights/formulas.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'rights');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const chunks = readdirSync(join(root, 'chunks')).filter(name => name.endsWith('.json'));
const rows = chunks.flatMap(name => JSON.parse(readFileSync(join(root, 'chunks', name), 'utf8')));
const books = rows.filter(row => row.kind === 'BOOK');
const lives = rows.filter(row => row.kind === 'LIFE');

const need = (condition, message) => {
    if (!condition) {
        console.error(`FAIL ${message}`);
        process.exitCode = 1;
    }
};

const regions = ['NORTH_AMERICA', 'LATIN_AMERICA', 'UK_EUROPE', 'INDIA_SOUTH_ASIA', 'EAST_ASIA', 'SOUTHEAST_ASIA', 'MIDDLE_EAST', 'AFRICA', 'OCEANIA'];
const sports = ['cricket', 'football', 'basketball', 'american_football', 'baseball', 'tennis', 'boxing', 'mma', 'f1', 'athletics', 'olympics', 'hockey', 'kabaddi', 'badminton', 'golf', 'chess', 'wrestling', 'esports'];
const figures = ['freedom_fighter', 'scientist', 'musician', 'ceo', 'criminal', 'royal', 'politician', 'artist', 'explorer'];
const bookFields = ['id', 'proper', 'descriptor', 'authorProper', 'country', 'language', 'genres', 'year', 'length', 'seasons', 'fame', 'fans', 'publicDomain', 'holder', 'optionUsd', 'purchaseUsd'];

const tally = (list, key) => list.reduce((map, row) => {
    const id = row[key] || 'none';
    map[id] = (map[id] || 0) + 1;
    return map;
}, {});

const booksByRegion = tally(books, 'region');
const livesBySport = tally(lives.filter(row => row.sport), 'sport');
const livesByCategory = tally(lives.filter(row => !row.sport), 'category');

need(books.length >= 2000, `books ${books.length} < 2000`);
need(lives.length >= 800, `lives ${lives.length} < 800`);
need(books.length === manifest.books, 'manifest book count drifted');
need(lives.length === manifest.lives, 'manifest life count drifted');
regions.forEach(region => need((booksByRegion[region] || 0) >= 200, `${region} has ${booksByRegion[region] || 0} books`));
sports.forEach(sport => need((livesBySport[sport] || 0) >= 20, `${sport} has ${livesBySport[sport] || 0} athletes`));
figures.forEach(category => need((livesByCategory[category] || 0) >= 15, `${category} has ${livesByCategory[category] || 0}`));

books.forEach(book => {
    bookFields.forEach(field => need(book[field] !== undefined && book[field] !== null, `${book.id} missing ${field}`));
    need(book.fame >= 0 && book.fame <= 100, `${book.id} fame`);
    need(Array.isArray(book.fans) && book.fans.length === 9, `${book.id} fans`);
    need(['short', 'novel', 'saga'].includes(book.length), `${book.id} length`);
    if (book.publicDomain) need(book.safeReal === true && book.optionUsd === 0, `${book.id} public domain pricing`);
    if (!book.safeReal) {
        need(book.descriptor === book.proper, `${book.id} ships one title`);
        need(book.authorDescriptor === book.authorProper, `${book.id} ships one author`);
        need(!/^a (late )?/.test(book.descriptor), `${book.id} still uses a placeholder`);
    }
});

lives.forEach(life => {
    need(life.fame >= 0 && life.fame <= 100, `${life.id} fame`);
    need(typeof life.living === 'boolean', `${life.id} living`);
    need(life.attitude, `${life.id} attitude`);
    if (life.living) need(life.safeReal === false && life.publicDomain === false, `${life.id} living person must stay fictional and under licence`);
    if (!life.safeReal) {
        need(life.descriptor === life.proper, `${life.id} ships one name`);
        need(!/^a (late )?/.test(life.descriptor), `${life.id} still uses a placeholder`);
        need(!/cricket captain|a writer in|football captain who/i.test(life.descriptor), `${life.id} placeholder`);
    }
});

const anchor = bookAnchor(80, 'saga', false);
need(anchor.optionUsd > 0 && anchor.purchaseUsd > anchor.optionUsd, 'book anchor');
need(bookAnchor(90, 'novel', true).optionUsd === 0, 'public domain anchor');
const fans = fanbaseBoost([80, 10, 10, 10, 10, 10, 10, 10, 10], 20, false);
need(fans.theatrical > 0 && fans.theatrical <= 0.35 && fans.streaming >= fans.theatrical, 'fanbase boost');
const loose = fanbaseBoost([80, 10, 10, 10, 10, 10, 10, 10, 10], 80, false);
need(loose.theatrical < fans.theatrical, 'loose adaptation backlash');
const suit = settlementUsd(80, 40, true);
need(suit >= 250_000 && suit <= 25_000_000, 'settlement band');
need(lifeAnchor(70, true, 20, false).purchaseUsd > lifeAnchor(70, false, 20, true).purchaseUsd, 'life ask');

const blob = chunks.map(name => readFileSync(join(root, 'chunks', name), 'utf8')).join('\n');
need(blob.includes('Kohly') && blob.includes('Ronalda') && blob.includes('Pottar'), 'PES samples missing');
need(blob.includes('Mahabharata') && blob.includes('The Odyssey'), 'public-domain titles missing');
need(!blob.includes('Virat Kohli') && !blob.includes('Cristiano Ronaldo') && !blob.includes('Harry Potter'), 'real sample leaked');
if (!manifest.generatedWithRealNames) {
    const { ATHLETES, LIVING_FIGURES, MODERN_BOOKS } = await import('./rights-real-names.mjs');
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const realStrings = [];
    MODERN_BOOKS.forEach(([title, author]) => realStrings.push(title, author));
    Object.values(ATHLETES).forEach(list => list.forEach(person => realStrings.push(person[0])));
    Object.values(LIVING_FIGURES).forEach(list => list.forEach(person => realStrings.push(person[0])));
    const leaked = [];
    realStrings.forEach(real => {
        if (!real || real.length < 8) return;
        // Exact JSON string only. PES keeps the first word, so a shorter real
        // title can sit inside a longer altered one ("The Stranger Besida Me").
        const pattern = new RegExp(`"${escapeRegExp(real)}"`, 'u');
        if (pattern.test(blob)) leaked.push(real);
    });
    need(leaked.length === 0, `real names leaked: ${leaked.slice(0, 12).join(' | ')}`);
}

console.log(JSON.stringify({
    books: books.length,
    lives: lives.length,
    booksByRegion,
    booksByGenre: tally(books.flatMap(book => book.genres.map(genre => ({ genre }))), 'genre'),
    publicDomainBooks: books.filter(book => book.publicDomain).length,
    livesBySport,
    livesByCategory,
    livingLives: lives.filter(life => life.living).length,
    chunks: chunks.length,
    formulas: { anchor, fans, loose, suit },
}, null, 2));

if (process.exitCode) process.exit(process.exitCode);
console.log('audit:rights ok');
