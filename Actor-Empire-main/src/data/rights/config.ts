/**
 * One switch for the whole Rights Library. Read by scripts/generate-rights-catalogue.mjs.
 *
 * false: living people and copyrighted modern books, authors, and rights holders
 *        ship under alterName() (Virat Kohli -> Virat Kohly). The real string
 *        stays in the generator source and is not written into the JSON.
 * true:  those same entries ship under the real name.
 *
 * Public-domain books, myths, and long-deceased historical figures always keep
 * their real names. Flip the flag, then re-run `npm run generate:rights`.
 * The game shows the shipped name. It does not keep a second, hidden real name.
 */
export const REAL_NAMES_MODE = false;
