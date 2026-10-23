/**
 * PES-style names. One deterministic edit: 1 letter on each identifying word,
 * or 2 when that word is 12 letters or longer. The first name is left alone
 * when the name has more than one word, so "Virat Kohli" stays recognisable
 * as "Virat Kohly". Function words (the, of, de, van) are not edited.
 * Real names must not be written into the game JSON. Callers ship this result.
 */

const SMALL = new Set([
    'the', 'and', 'of', 'de', 'da', 'del', 'van', 'von', 'bin', 'al', 'el', 'la', 'le', 'di',
    'dos', 'das', 'du', 'y', 'jr', 'sr', 'ii', 'iii', 'iv',
]);

const VOWEL = {
    a: 'e', e: 'a', i: 'y', o: 'a', u: 'o', y: 'i',
    à: 'è', á: 'é', â: 'ê', ä: 'ë',
    è: 'à', é: 'á', ê: 'â', ë: 'ä',
    ì: 'y', í: 'ý', î: 'y', ï: 'y',
    ò: 'à', ó: 'á', ô: 'â', ö: 'ä',
    ù: 'ò', ú: 'ó', û: 'o', ü: 'o',
    ý: 'í', ÿ: 'i',
};

const VOWEL_ALT = {
    a: 'o', e: 'i', i: 'e', o: 'u', u: 'a', y: 'e',
    à: 'ò', á: 'ó', â: 'ô', ä: 'ö',
    è: 'ì', é: 'í', ê: 'î', ë: 'ï',
    ò: 'ù', ó: 'ú', ô: 'û', ö: 'ü',
    ù: 'à', ú: 'á',
};

const CONS = {
    b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'c', c: 'k', s: 'z', z: 's',
    l: 'r', r: 'l', n: 'm', m: 'n', f: 'v', v: 'f',
};

const BANNED = [
    'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'rape', 'slut',
    'whore', 'kike', 'spic', 'chink', 'paki', 'coon', 'tranny', 'porn', 'nazi', 'hitler', 'kack',
];

const fold = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isOffensive = (value) => {
    const flat = fold(value);
    return BANNED.some(word => flat.includes(word));
};

const isLetter = (ch) => /\p{L}/u.test(ch);

const applySwap = (chars, index, table) => {
    const ch = chars[index];
    const lower = ch.toLowerCase();
    const next = table[lower] || table[fold(ch)];
    if (!next) return false;
    const replacement = ch === ch.toUpperCase() ? next.toUpperCase() : next;
    if (replacement === ch) return false;
    chars[index] = replacement;
    return true;
};

const vowelIndexes = (chars) => {
    const found = [];
    for (let i = 1; i < chars.length; i += 1) {
        if (VOWEL[chars[i].toLowerCase()] || VOWEL[fold(chars[i])]) found.push(i);
    }
    return found;
};

const editWord = (word, attempt) => {
    const chars = [...word];
    const vowels = vowelIndexes(chars);
    const changes = chars.length >= 12 ? 2 : 1;
    const picks = [];
    if (vowels.length) {
        const start = Math.min(attempt, Math.max(0, vowels.length - 1));
        for (let n = 0; n < changes; n += 1) {
            const index = vowels[vowels.length - 1 - start - n];
            if (index !== undefined) picks.push(index);
        }
    }
    if (!picks.length) {
        for (let i = chars.length - 1; i >= 1; i -= 1) {
            if (isLetter(chars[i])) {
                picks.push(i);
                break;
            }
        }
    }
    const table = attempt % 2 === 0 ? VOWEL : VOWEL_ALT;
    let changed = 0;
    picks.forEach(index => {
        if (applySwap(chars, index, table) || applySwap(chars, index, CONS)) changed += 1;
    });
    if (!changed && chars.length > 1) {
        applySwap(chars, chars.length - 1, CONS);
    }
    return chars.join('');
};

const contentIndexes = (parts) => {
    const indexes = [];
    parts.forEach((part, index) => {
        if (/^\s+$/.test(part)) return;
        const letters = [...part].filter(isLetter).join('');
        if (letters.length < 4) return;
        if (SMALL.has(fold(letters))) return;
        indexes.push(index);
    });
    return indexes;
};

export const alterName = (name) => {
    const source = String(name || '').trim();
    if (!source) return source;
    const parts = source.split(/(\s+)/);
    const indexes = contentIndexes(parts);
    if (!indexes.length) {
        const fallback = editWord(source, 0);
        return fallback === source ? `${source}e` : fallback;
    }
    const targets = indexes.length === 1 ? indexes : indexes.slice(1);
    let attempt = 0;
    let edited = parts.slice();
    const once = (pass) => {
        edited = parts.slice();
        targets.forEach(index => {
            edited[index] = editWord(parts[index], pass);
        });
        return edited.join('');
    };
    let result = once(0);
    while ((result === source || isOffensive(result)) && attempt < 5) {
        attempt += 1;
        result = once(attempt);
    }
    if (result === source || isOffensive(result)) {
        const forced = once(1);
        return forced === source ? `${source.slice(0, -1)}a` : forced;
    }
    return result;
};
