/**
 * One switch for the whole Rights Library.
 *
 * false: copyrighted modern books and living people show a lightly fictionalized
 *        label ("a cricket captain from Ranchi", "a 2016 fantasy novel from Lagos").
 * true:  those same entries show the generated proper name and title.
 *
 * Public-domain books, myths, and long-deceased historical figures always use
 * their real names. The catalogue stores both forms, so changing this flag
 * does not require a scrape and does not require new source data.
 * Re-run `npm run generate:rights` only if you want the manifest stamp refreshed.
 */
export const REAL_NAMES_MODE = false;
