/**
 * Script desk: choices stay open, and the bill, the calendar, and the audience move.
 */
import type { Genre, Script, ScriptCharacter } from '../types';
import {
    advanceCraftScript,
    applyRewrite,
    attachLegacyCraft,
    bookRightsCost,
    buildCoverage,
    buildScriptRecord,
    generateTwistOffers,
    leakChance,
    migrateScriptDeskState,
    planWritersRoom,
    previewQuality,
    recordSagaScore,
    remakeRightsCost,
    returningBump,
    rewriteQualityGain,
    smallRolePremium,
    songEffects,
    suggestName,
    INDUSTRIES,
} from '../services/scriptDesk/logic';

let failed = 0;
const need = (condition: unknown, message: string) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL ${message}`);
    }
};

const popularity = [10, 40, 70, 95];
for (let i = 1; i < popularity.length; i++) {
    need(bookRightsCost(popularity[i]) > bookRightsCost(popularity[i - 1]), `book rights rise with popularity (${popularity[i]})`);
}
need(bookRightsCost(90, true) === 0, 'a public-domain book does not send a bill');
need(remakeRightsCost(80, 1924, true) === 0, 'a lapsed remake is free');
need(remakeRightsCost(80, 2012) > remakeRightsCost(40, 2012), 'a famous remake costs more than a forgotten one');

const bollywoodSilence = songEffects(0, 'BOLLYWOOD', 'ACTION');
const hollywoodSilence = songEffects(0, 'HOLLYWOOD', 'ACTION');
need(bollywoodSilence.audience < hollywoodSilence.audience, 'a songless Bollywood film loses more audience than a songless Hollywood one');
need(songEffects(5, 'BOLLYWOOD', 'ACTION').audience > songEffects(5, 'HOLLYWOOD', 'ACTION').audience, 'songs pay the Bollywood crowd more');
need(songEffects(12, 'BOLLYWOOD', 'ACTION').freshness < 0 || songEffects(12, 'BOLLYWOOD', 'ACTION').freshness < songEffects(4, 'BOLLYWOOD', 'ACTION').freshness, 'too many songs tire the audience instead of being refused');
need(songEffects(12, 'TOLLYWOOD', 'DRAMA').budget > songEffects(2, 'TOLLYWOOD', 'DRAMA').budget, 'extra songs still cost money');

const bare: Script = {
    id: 'old-1',
    title: 'Already Shooting',
    genres: ['DRAMA'],
    status: 'IN_DEVELOPMENT',
    quality: 63,
    options: [],
    writerId: 'writer-old',
    weeksInDevelopment: 4,
    totalDevelopmentWeeks: 12,
    isOriginal: true,
    projectType: 'MOVIE',
};
const legacy = attachLegacyCraft(bare, 'HOLLYWOOD');
need(legacy.quality === 63 && legacy.status === 'IN_DEVELOPMENT' && legacy.weeksInDevelopment === 4 && legacy.writerId === 'writer-old', 'migration leaves an in-progress script alone');
need(legacy.craft?.legacy === true, 'older scripts are marked so the new clock does not take them');
need(attachLegacyCraft(legacy, 'BOLLYWOOD') === legacy, 'migration does not rebuild a script that already has a craft block');

const studio = migrateScriptDeskState({
    scripts: [bare],
    concepts: [],
    writers: [{ id: 'w', name: 'Old Name', skill: 50, fee: 1000, speed: 1, tier: 'COMMON', stats: { creativity: 50, dialogue: 50, structure: 50 } }],
    ipMarket: [],
    lastMarketRefreshWeek: 2,
    lastWriterRefreshWeek: 2,
});
need(studio.scripts[0].quality === 63 && studio.scripts[0].craft?.legacy === true, 'studio migration is silent');
need(studio.writers[0].skill === 50 && studio.writers[0].fee === 1000 && typeof studio.writers[0].slipRisk === 'number', 'old writers keep their deal and gain a slip risk');
need((studio.bookShelf || []).length > 0 && (studio.remakeShelf || []).length > 0, 'a shelf appears without deleting the vault');
need(migrateScriptDeskState(studio).bookShelf === studio.bookShelf, 'a second load does not reshuffle the shelf');

const friend: ScriptCharacter = { id: 'f', name: 'Meera Shah', role: 'Best Friend', size: 'SUPPORTING' };
const twists = generateTwistOffers('THRILLER', [friend, { role: 'Hero' }], 'BOLLYWOOD', 'save-a');
need(twists.length === 4, 'every new script offers four twists');
need(twists.some(twist => twist.linkedRole === 'Best Friend'), 'a twist can belong to the best friend');
need(twists.every(twist => twist.risk && twist.reward), 'each twist shows a risk and a reward');

const room = planWritersRoom([
    { id: 'a', name: 'Big', skill: 90, fee: 800_000, speed: 1.5, tier: 'A_LIST', scheduleWeeks: 22, slipRisk: 0.06, genreStrengths: ['DRAMA'], stats: { creativity: 90, dialogue: 90, structure: 90 } },
    { id: 'b', name: 'New', skill: 30, fee: 8_000, speed: 0.8, tier: 'ASPIRING', scheduleWeeks: 8, slipRisk: 0.3, genreStrengths: ['COMEDY'], stats: { creativity: 30, dialogue: 30, structure: 30 } },
], 'DRAMA' as Genre);
need(room.fee === 808_000, 'the room costs the sum of the writers');
need(room.weeks > 22, 'a bigger room takes at least as long as the slowest writer, plus coordination');
need(room.skill > 80, 'a strong writer still lifts the room');

let script: Script = {
    ...bare,
    id: 'new-1',
    title: 'Monsoon Deed',
    status: 'IN_DEVELOPMENT',
    quality: 55,
    assignedSkill: 80,
    craft: {
        industry: 'BOLLYWOOD',
        source: 'ORIGINAL',
        songs: 4,
        stage: 'REWRITES',
        rewrites: 0,
        freshness: 86,
        audienceAppeal: 62,
        criticAppeal: 60,
        budgetDelta: 1_000_000,
        characters: [friend],
        slipRisk: 0.1,
    },
};
script.quality = previewQuality(script);
const first = applyRewrite(script);
const many = Array.from({ length: 12 }).reduce<Script>((current) => applyRewrite(current), script);
need(first.craft!.rewrites === 1 && first.status === 'IN_DEVELOPMENT', 'a rewrite is allowed');
need(many.craft!.rewrites === 12, 'the twelfth rewrite is still allowed');
need(many.craft!.freshness < first.craft!.freshness, 'rewrites spend freshness');
need(rewriteQualityGain(80, 1) > 0 && rewriteQualityGain(80, 12) > rewriteQualityGain(80, 1), 'later rewrites still add quality');
need(previewQuality(many) !== undefined, 'a tired draft still has a quality');
need((many.totalDevelopmentWeeks || 0) > (script.totalDevelopmentWeeks || 0), 'rewrites add weeks');

const early: Script = { ...script, weeksInDevelopment: 1, craft: { ...script.craft!, stage: 'IDEA' } };
const late: Script = { ...script, weeksInDevelopment: 20, craft: { ...script.craft!, stage: 'REWRITES', rewrites: 3, twist: twists[0] } };
need(leakChance(late) > leakChance(early), 'leak risk rises with stage and time');

const coverage = buildCoverage(late);
need(['PASS', 'CONSIDER', 'RECOMMEND'].includes(coverage.verdict), 'coverage ends in pass, consider, or recommend');
need(coverage.plot > 0 && coverage.dialogue > 0 && coverage.characters > 0 && coverage.market > 0, 'coverage scores plot, dialogue, characters, and market');

const hindi = suggestName('BOLLYWOOD', 'FEMALE', 'seed-1');
const korean = suggestName('KOREAN', 'MALE', 'seed-2');
const telugu = suggestName('TOLLYWOOD', 'MALE', 'seed-3');
const hindiBank = new Set([...INDUSTRIES.BOLLYWOOD.female, ...INDUSTRIES.BOLLYWOOD.last]);
const koreanBank = new Set([...INDUSTRIES.KOREAN.male, ...INDUSTRIES.KOREAN.last]);
const teluguBank = new Set([...INDUSTRIES.TOLLYWOOD.male, ...INDUSTRIES.TOLLYWOOD.last]);
need(hindi.split(' ').every(part => hindiBank.has(part)), `Hindi name stays in the Bollywood bank (${hindi})`);
need(korean.split(' ').every(part => koreanBank.has(part)), `Korean name stays in the Korean bank (${korean})`);
need(telugu.split(' ').every(part => teluguBank.has(part)), `Telugu name stays in the Tollywood bank (${telugu})`);

need(returningBump(90) > returningBump(40) && returningBump(10) >= 1, 'a hit raises the returning cast ask');
need(smallRolePremium('A_LIST', 'CAMEO') > smallRolePremium('A_LIST', 'LEAD'), 'a star in a cameo costs more than the same star in the lead');
need(smallRolePremium('RISING', 'CAMEO') === 1, 'a rising actor does not get the star premium');

const slipping: Script = {
    ...script,
    assignedSpeed: 1,
    totalDevelopmentWeeks: 10,
    craft: { ...script.craft!, stage: 'IDEA', weeksAtStage: 2, slipRisk: 1, slipHold: 0, rewriteWeeksLeft: 0 },
};
const rolls = [0, 1];
const slipped = advanceCraftScript(slipping, () => rolls.shift() ?? 1).script;
need((slipped.craft?.weeksAtStage || 0) === 2, 'a slip week does not advance the draft');
need((slipped.craft?.slipWeeks || 0) > 0, 'a slip is recorded');
need(slipped.totalDevelopmentWeeks > slipping.totalDevelopmentWeeks, 'a slip pushes the calendar');

let longPass: Script = {
    ...script,
    craft: { ...script.craft!, stage: 'REWRITES', rewrites: 20, weeksAtStage: 6, rewriteWeeksLeft: 0, freshness: 40 },
};
longPass = applyRewrite(longPass);
need((longPass.craft?.rewriteWeeksLeft || 0) >= 8, 'a late rewrite takes a long pass');
const passLength = longPass.craft?.rewriteWeeksLeft || 0;
for (let week = 0; week < passLength; week++) {
    longPass = advanceCraftScript(longPass, () => 1).script;
}
need(longPass.status === 'IN_DEVELOPMENT', 'rewrite labor does not lock the draft');
need((longPass.craft?.weeksAtStage || 0) === 0, 'the quiet clock starts when the rewrite lands');

const sameWeek = (title: string, week: number) => buildScriptRecord({
    title,
    genre: 'DRAMA',
    industry: 'HOLLYWOOD',
    draft: { source: 'ORIGINAL', genre: 'DRAMA', songs: 0, characters: [] },
    room: { skill: 40, fee: 0, speed: 1, weeks: 8, slipRisk: 0.1, names: ['You'], ids: [] },
    week,
}).script.id;
need(sameWeek('ab', 12) !== sameWeek('ab1', 2), 'titles that concatenate do not share a script id');

const scored = recordSagaScore({
    scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0,
    bookSagas: [{ id: 'saga-1', title: 'Deed', author: 'A', popularity: 40, rightsCost: 1, rightsOwned: true, split: 'TWO_PART', totalParts: 2, partsMade: 1, partScores: [], castPremium: 1.05 }],
}, 'saga-1', 1, 'Deed', 90);
need(scored.bookSagas?.[0].partScores[0]?.score === 90, 'a released part records its score');
need((scored.bookSagas?.[0].castPremium || 1) > 1.05, 'a hit raises the stored returning-cast premium');

if (failed) {
    console.error(`${failed} script-desk checks failed`);
    process.exit(1);
}
console.log('script desk checks passed');
