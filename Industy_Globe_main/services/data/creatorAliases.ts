/**
 * One person, many public strings.
 * The first slug in a group is the key the audience book and the hiring pool share.
 * Bios never use these aliases to invent a personal story.
 */

const GROUPS: string[][] = [
    ['mrbeast', 'jimmydonaldson'],
    ['ishowspeed', 'darrenwatkinsjr', 'darrenwatkins'],
    ['pokimane', 'imaneanys'],
    ['ninja', 'tylerblevins'],
    ['xqc', 'felixlengyel'],
    ['pewdiepie', 'felixkjellberg'],
    ['markiplier', 'markfischbach'],
    ['ksi', 'olajideolatunji'],
    ['carryminati', 'ajeynagar'],
    ['bbkivines', 'bhuvanbam'],
    ['mortal', 'namanmathur'],
    ['jonathangaming', 'jonathanamaral'],
    ['payalgaming', 'payaldhare'],
    ['technogamerz', 'ujjwalchaurasia'],
    ['triggeredinsaan', 'nischaymalhan'],
    ['8bitthug', 'animeshagarwal'],
    ['hikakin', 'hikarukaihatsu'],
    ['faker', 'leesanghyeok'],
    ['mkbhd', 'marquesbrownlee'],
    ['snax', 'snaxgaming', 'rajvarma'],
    ['scout', 'scoutop', 'tanmaysingh'],
    ['dynamogaming', 'aadityasawant', 'aadityadeepaksawant'],
    ['totalgaming', 'ajjubhai', 'ajendravariya'],
    ['dudeperfect'],
    ['sidemen'],
    ['kaashplays'],
];

const TO_CANON = new Map<string, string>();
GROUPS.forEach(group => {
    const canon = group[0];
    group.forEach(slug => TO_CANON.set(slug, canon));
});

export const nameSlug = (value: string): string =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

/** Stable person key. Stage names and legal names that are the same career collapse here. */
export const canonicalKey = (nameOrId: string): string => {
    const raw = nameSlug(nameOrId.replace(/^roster_/, '').replace(/^yt_/, ''));
    return TO_CANON.get(raw) || raw;
};
