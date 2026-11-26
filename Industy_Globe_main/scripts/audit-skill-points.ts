import { ActorSkills } from '../types';
import { autoBio, handleFromName, startingSocials } from '../services/characterSocial';
import {
    CUSTOM_TALENT_POOL,
    CHARACTER_PACK_INR,
    STARTING_SKILL_POOL,
    SKILL_POINT_PACKS,
    actingScore,
    allocateLevels,
    applyPremiumSnapshot,
    castTalentStat,
    clientMayRaisePremium,
    costForNextLevel,
    craftModifiers,
    creditVerifiedPack,
    displayPackPrice,
    emptyPremiumLedger,
    grantFreeLevel,
    levelOf,
    offerPayMultiplier,
    smallerPacksAreCheaper,
    spendPremiumPoints,
    tierForFame,
    valueAfterLevel,
} from '../services/skillPointLedger';
import { buildCustomTalent, playerTalentRecord, saveTalentPool } from '../services/playerTalent';
import { INITIAL_PLAYER } from '../types';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const zero = (): ActorSkills => ({
    delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0,
});

const costs = Array.from({ length: 20 }, (_, level) => costForNextLevel(level));
assert(costs[0] === 1 && costs[19] === 20, 'first level costs 1 and the last costs 20');
assert(costs.every((cost, index) => index === 0 || cost > costs[index - 1]), 'each level costs more than the one before it');
assert(costForNextLevel(20) === 0, 'a maxed skill cannot be bought again');
assert(levelOf(0) === 0 && levelOf(19) === 3 && valueAfterLevel(19) === 20, 'levels step by 5 craft points');

const overspent = allocateLevels(zero(), {}, [
    { target: { kind: 'acting', key: 'delivery' }, levels: 30 },
], STARTING_SKILL_POOL);
assert(!overspent.ok, 'the starting pool refuses an overspend');

const mixed = allocateLevels(zero(), {}, [
    { target: { kind: 'acting', key: 'delivery' }, levels: 2 },
    { target: { kind: 'genre', key: 'DRAMA' }, levels: 2 },
], STARTING_SKILL_POOL);
assert(mixed.ok, mixed.error || 'a legal sheet should save');
assert(mixed.skills.delivery === 10, 'two acting levels land on the acting skill');
assert(mixed.genreXP.DRAMA === 10, 'two genre levels land on the genre');
assert(mixed.spent === 1 + 2 + 1 + 2, 'the second level of each track costs 2');

const skills = zero();
const genres: Record<string, number> = { DRAMA: 0 };
grantFreeLevel(skills, genres, { kind: 'acting', key: 'presence' });
assert(skills.presence === 5, 'a background grant is one free level');

const lowCraft = craftModifiers(10, 0);
const highCraft = craftModifiers(80, 70);
assert(highCraft.performanceBonus > lowCraft.performanceBonus, 'higher acting skill raises performance');
assert(highCraft.castingBonus > lowCraft.castingBonus, 'higher genre skill raises casting');
assert(highCraft.boxOfficeCraft > lowCraft.boxOfficeCraft, 'higher craft raises the box-office term');
assert(castTalentStat(80, 80) > castTalentStat(10, 0), 'the talent stat used by fees rises with craft');
assert(offerPayMultiplier(80, 70, 60) > offerPayMultiplier(10, 0, 0), 'offers pay more for skill, genre, and fame');
assert(tierForFame(90) === 'A_LIST' && tierForFame(0) === 'UNKNOWN', 'fame still picks the existing tier');

assert(clientMayRaisePremium() === false, 'the client is not allowed to raise premium points');
const untouched = { premium: 4, characterUnlock: false };
assert(applyPremiumSnapshot(untouched, undefined).premium === 4, 'a missing server snapshot does not change the cache');
const confirmed = applyPremiumSnapshot(untouched, { premiumBalance: 150, characterUnlock: true });
assert(confirmed.premium === 150 && confirmed.characterUnlock, 'a confirmed snapshot replaces the balance, it does not add');
assert(applyPremiumSnapshot({ premium: 10, characterUnlock: true }, { premiumBalance: 0, characterUnlock: false }).premium === 0, 'the server balance can lower a stale cache');

let ledger = emptyPremiumLedger();
const denied = creditVerifiedPack(ledger, { productId: 'character_creation', transactionId: 'dev_1', platform: 'dev', devTest: true, devGrantsEnabled: false });
assert(!denied.ok && ledger.premiumBalance === 0, 'a dev grant is refused when the server flag is off');
const credited = creditVerifiedPack(ledger, { productId: 'character_creation', transactionId: 'dev_1', platform: 'dev', devTest: true, devGrantsEnabled: true });
assert(credited.ok && credited.ledger.premiumBalance === 150 && credited.ledger.characterUnlock, 'the character pack credits 150 points once');
const again = creditVerifiedPack(credited.ledger, { productId: 'character_creation', transactionId: 'dev_1', platform: 'dev', devTest: true, devGrantsEnabled: true });
assert(again.alreadyCredited && again.ledger.premiumBalance === 150, 'the same transaction cannot credit twice');
const unknown = creditVerifiedPack(ledger, { productId: 'nope', transactionId: 'tx_1', platform: 'ios' });
assert(!unknown.ok, 'an unknown product is not credited');
const broke = spendPremiumPoints(emptyPremiumLedger(), 5, 'req_1');
assert(!broke.ok, 'premium points cannot be spent before they exist');
const spent = spendPremiumPoints(credited.ledger, 3, 'req_1');
assert(spent.ok && spent.ledger.premiumBalance === 147, 'a confirmed spend lowers the server balance');
const replay = spendPremiumPoints(spent.ledger, 3, 'req_1');
assert(replay.alreadySpent && replay.ledger.premiumBalance === 147, 'a repeated spend id does not charge twice');

const flagship = SKILL_POINT_PACKS.find(pack => pack.flagship);
assert(flagship?.inr === CHARACTER_PACK_INR && flagship.storeProductId === 'com.sahil.industryglobe.character.creation', 'the character package is the ₹1500 product');
assert(smallerPacksAreCheaper(), 'smaller packs cost less than the character package');
assert(displayPackPrice(flagship!, undefined, true) === '₹1,500', 'India shows ₹1,500');
assert(displayPackPrice(flagship!, '€19.99', false) === '€19.99', 'other countries show the store price');
assert(displayPackPrice(flagship!, undefined, false) === '$17.99', 'web without a store price falls back to $17.99');
assert(displayPackPrice(flagship!, '$4.99', true) === '₹1,500', 'India keeps ₹1,500 even if a dollar label is cached');

const social = startingSocials('Asha Rao', 'INFLUENCER', 'CHARMER', 'India', 20);
assert(social.handle === '@asharao' && !social.handle.includes(' '), 'the handle is derived from the name');
assert(social.instagram > startingSocials('Asha Rao', 'FILM_SCHOOL', 'NATURAL', 'India', 0).instagram, 'an online background starts with more followers');
assert(startingSocials('Asha Rao', 'FILM_SCHOOL', 'NATURAL', 'India', 40).instagram > startingSocials('Asha Rao', 'FILM_SCHOOL', 'NATURAL', 'India', 0).instagram, 'fame adds followers');
assert(autoBio('Asha Rao', 'FILM_SCHOOL', 'NATURAL', 'India').includes('Asha Rao'), 'the bio names the character');
assert(handleFromName('!!!') === '@newstar', 'a name with no letters still gets a handle');

const custom = buildCustomTalent({
    name: 'Missing Star',
    age: 34,
    gender: 'FEMALE',
    appearance: { skin: 2, hair: 1, hairStyle: 2, eyes: 1, mouth: 0, accessory: 1, shirt: 3 },
    country: 'IN',
    fame: 40,
    actingLevels: { delivery: 2 },
    genreLevels: { DRAMA: 1 },
});
assert(custom.npc?.custom === true, 'added actors are marked custom');
assert((custom.npc?.stats?.talent || 0) > 0 && (custom.npc?.stats?.genreXP?.DRAMA || 0) > 0, 'custom actors carry acting and genre skill');
assert(custom.npc && !JSON.stringify(INITIAL_PLAYER).includes(custom.npc.id), 'custom actors are not written into the shipped player');

const withTalent = {
    ...INITIAL_PLAYER,
    name: 'Asha Rao',
    character: { version: 1 as const, appearance: { skin: 0, hair: 0, hairStyle: 0, eyes: 0, mouth: 0, accessory: 0, shirt: 0 }, birthplace: 'IN', background: 'FILM_SCHOOL', trait: 'NATURAL', created: true as const },
    customTalent: custom.npc ? [custom.npc] : [],
    stats: { ...INITIAL_PLAYER.stats, fame: 30, skills: { ...zero(), delivery: 40 }, genreXP: { ...INITIAL_PLAYER.stats.genreXP, DRAMA: 35 } },
};
const pool = saveTalentPool(withTalent);
assert(pool.some(npc => npc.id === 'PLAYER_CAST') && pool.some(npc => npc.custom), 'the player and custom actors both enter the casting pool');
const self = playerTalentRecord(withTalent);
assert((self?.stats?.talent || 0) > actingScore(zero()), 'the player talent record feeds the fee formula with real craft');
assert(pool.filter(npc => npc.custom).every(npc => npc.custom), 'only save talent is marked custom');

const sheet = allocateLevels(zero(), {}, [
    { target: { kind: 'acting', key: 'delivery' }, levels: 4 },
], CUSTOM_TALENT_POOL);
assert(sheet.ok && sheet.spent === 10, 'custom sheets use the same rising cost, inside their own pool');

console.log('skill-point and casting audit passed');
console.log(`character package ${flagship?.storeProductId} at ₹${CHARACTER_PACK_INR}`);
