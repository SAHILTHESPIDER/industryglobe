/**
 * Censor desk audit. Run with npm run audit:censor.
 * Checks the board, the week clock, migration, and that heat changes the outcome
 * without making a certificate impossible.
 */
import type { CensorFiling, Player, ProjectDetails, Script } from '../types';
import { INDUSTRY_ENGINE } from '../services/industryEngine';
import {
    acceptCensorCuts,
    acceptHigherRating,
    advanceCensorBoards,
    appealCensorRefusal,
    fileWithBoards,
    migrateCensorSaves,
    openingAbsolute,
    releaseBlockedByCensor,
    stampReleasePlan,
    territoryIsDue,
} from '../services/censorBoard';

const need = (ok: boolean, message: string) => {
    if (!ok) throw new Error(message);
};

const house = (industry: 'HOLLYWOOD' | 'BOLLYWOOD' | 'CHINESE') => ({
    id: 'house',
    type: 'PRODUCTION_HOUSE' as const,
    balance: 5_000_000,
    studioState: { hqIndustryId: industry, filmIndustry: industry, scripts: [] as Script[] },
});

const details = (over: Partial<ProjectDetails> = {}): ProjectDetails => ({
    title: 'Night Train',
    type: 'MOVIE',
    description: '',
    studioId: 'house' as ProjectDetails['studioId'],
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    budgetTier: 'MID',
    estimatedBudget: 8_000_000,
    visibleHype: 'MID',
    hiddenStats: { scriptQuality: 70, directorQuality: 70, castingStrength: 60, distributionPower: 50, rawHype: 40, qualityScore: 72, prestigeBonus: 0 },
    directorName: 'A. Director',
    visibleDirectorTier: 'Professional',
    visibleScriptBuzz: 'Good',
    visibleCastStrength: 'Strong',
    scriptId: 'script-1',
    ...over,
});

const script = (violence: number, intimacy: number, language: number, ratingId: string, ratingLabel: string, industry: 'HOLLYWOOD' | 'BOLLYWOOD' | 'CHINESE', boycott = 0): Script => ({
    id: 'script-1',
    title: 'Night Train',
    genres: ['DRAMA'],
    status: 'READY',
    quality: 70,
    options: [],
    writerId: null,
    weeksInDevelopment: 4,
    totalDevelopmentWeeks: 4,
    isOriginal: true,
    projectType: 'MOVIE',
    craft: {
        industry,
        source: 'ORIGINAL',
        songs: 0,
        stage: 'LOCKED',
        rewrites: 0,
        freshness: 80,
        audienceAppeal: 60,
        criticAppeal: 60,
        budgetDelta: 0,
        characters: [],
        v2: {
            version: 2,
            format: 'MOVIE',
            runtimeMinutes: 120,
            seasons: 1,
            episodesPerSeason: 8,
            episodeMinutes: 45,
            logline: 'A night train and a debt.',
            loglineMode: 'TYPED',
            settingId: 'road',
            settingLabel: 'The train',
            goalId: 'clear-name',
            goalLabel: 'Clear their name',
            conflictId: 'the-city',
            conflictLabel: 'The city',
            villainId: 'system',
            villainLabel: 'The board',
            motiveId: 'power',
            motiveLabel: 'Power',
            openingId: 'arrival',
            openingLabel: 'An arrival',
            intervalId: 'reveal',
            intervalLabel: 'A reveal',
            climaxId: 'quiet',
            climaxLabel: 'Quiet',
            endingId: 'bittersweet',
            endingLabel: 'Bittersweet',
            twistPlaceId: 'none',
            twistPlaceLabel: 'None',
            toneId: 'earnest',
            toneLabel: 'Earnest',
            tracks: { songs: 10, action: 20, romance: 20, comedy: 10 },
            themeId: industry === 'CHINESE' ? 'faith' : 'family',
            themeLabel: 'Family',
            ratingId,
            ratingLabel,
            censorName: INDUSTRY_ENGINE[industry].censor.name,
            violence,
            intimacy,
            language,
            synopsis: '',
            sampleScene: '',
            selfWritten: true,
            protagonist: 'Asha',
            villainName: 'The office',
            risks: { leak: 0, plagiarism: 0, credit: 0, boycott },
        },
    },
});

const player = (industry: 'HOLLYWOOD' | 'BOLLYWOOD' | 'CHINESE', violence: number, intimacy: number, language: number, ratingId: string, ratingLabel: string, boycott = 0, social = 0): Player => {
    const row = script(violence, intimacy, language, ratingId, ratingLabel, industry, boycott);
    return {
        age: 32,
        currentWeek: 10,
        money: 2_000_000,
        homeIndustryId: industry,
        commitments: [{
            id: 'proj-1',
            name: 'Night Train',
            type: 'JOB',
            energyCost: 0,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'AWAITING_RELEASE',
            projectDetails: details(),
        }],
        activeReleases: [],
        businesses: [{
            ...house(industry),
            studioState: { ...house(industry).studioState, scripts: [row] },
        }],
        instagram: { controversy: social },
        youtube: { controversy: social },
        news: [],
        logs: [],
    } as unknown as Player;
};

const runToDecision = (start: Player, territoryId: string) => {
    let current = start;
    let filing: CensorFiling | undefined;
    for (let week = 0; week < 24; week += 1) {
        const turned = advanceCensorBoards(current);
        current = { ...turned.player, currentWeek: current.currentWeek + 1 };
        filing = current.commitments[0].projectDetails?.censor?.filings.find(row => row.territoryId === territoryId);
        if (filing && filing.status !== 'PENDING' && filing.status !== 'UNDER_REVIEW') break;
    }
    return { player: current, filing };
};

const indiaRatings = INDUSTRY_ENGINE.BOLLYWOOD.censor.ratings.map(row => row.label);
need(indiaRatings.includes('U') && indiaRatings.includes('UA 13+') && indiaRatings.includes('A'), 'CBFC keeps U, UA 13+, and A');
need(INDUSTRY_ENGINE.HOLLYWOOD.censor.ratings.some(row => row.label === 'PG-13'), 'MPA keeps PG-13');
need(INDUSTRY_ENGINE.BOLLYWOOD.censor.name.includes('Central Board'), 'India uses the CBFC');

const old = {
    commitments: [{
        id: 'old',
        name: 'Already dated',
        projectDetails: { ...details({ title: 'Already dated' }), releaseStrategy: 'THEATRICAL' },
    }, {
        id: 'fresh',
        name: 'Still waiting',
        projectDetails: details({ title: 'Still waiting' }),
    }],
    activeReleases: [{ id: 'out', name: 'Out', projectDetails: details({ title: 'Out' }) }],
} as unknown as Player;
const migrated = migrateCensorSaves(old);
need(migrated.commitments[0].projectDetails?.censor?.grandfathered === true, 'a locked date is left alone');
need(!migrated.commitments[1].projectDetails?.censor, 'a picture with no date is not grandfathered');
need(migrated.activeReleases?.[0].projectDetails.censor?.grandfathered === true, 'a film already out is left alone');
need(releaseBlockedByCensor(migrated, migrated.commitments[0].projectDetails) === false, 'grandfathered films still open');
need(migrateCensorSaves(migrated) === migrated, 'migration is quiet the second time');

const mild = fileWithBoards(player('HOLLYWOOD', 20, 12, 8, 'PG13', 'PG-13'), 'proj-1', [
    { territoryId: 'US', ratingId: 'PG13' },
    { territoryId: 'INDIA', ratingId: 'UA13' },
]);
need(!mild.error, mild.error || 'mild filing should be accepted');
const mildFiled = mild.player.commitments[0].projectDetails?.censor?.filings || [];
need(mildFiled.length === 2, 'two boards take the print');
need(mildFiled.every(row => row.status === 'PENDING'), 'a new filing starts pending');
const mildUs = runToDecision(mild.player, 'US');
need(mildUs.filing?.status === 'APPROVED', `a print inside the line should be certified, got ${mildUs.filing?.status}`);
need(!!mildUs.filing?.certificateNo?.startsWith('MPA/'), 'the US certificate carries the MPA');
need(mildUs.filing?.grantedRatingLabel === 'PG-13', 'the granted card is the one they asked for');

const hotOutcomes = new Set<string>();
for (let seed = 0; seed < 12; seed += 1) {
    const hotPlayer = player('BOLLYWOOD', 88, 70, 64, 'U', 'U', 55, 40);
    hotPlayer.commitments[0].id = `proj-${seed}`;
    const filed = fileWithBoards(hotPlayer, hotPlayer.commitments[0].id, [{ territoryId: 'INDIA', ratingId: 'U' }]);
    const done = runToDecision(filed.player, 'INDIA');
    hotOutcomes.add(done.filing?.status || 'NONE');
}
need(hotOutcomes.size > 1 || !hotOutcomes.has('REJECTED'), `a U certificate with a hard print is an argument, not one fixed refusal (${[...hotOutcomes].join(', ')})`);
need(!hotOutcomes.has('APPROVED') || hotOutcomes.has('CUTS_REQUESTED') || hotOutcomes.has('RATING_OFFERED') || hotOutcomes.has('REJECTED'), 'the hot print is not waved through every time');

const cutPlayer = player('BOLLYWOOD', 40, 20, 10, 'UA13', 'UA 13+');
const cutFiled = fileWithBoards(cutPlayer, 'proj-1', [{ territoryId: 'INDIA', ratingId: 'UA13' }]);
const cutDetails = cutFiled.player.commitments[0].projectDetails!;
const cutFiling = cutDetails.censor!.filings[0];
cutFiling.status = 'CUTS_REQUESTED';
cutFiling.cuts = [{ id: 'c1', axis: 'violence', scene: 'The warehouse fight', detail: 'Shorten it.', quality: 2, audience: 1, slider: 12 }];
const beforeQuality = cutDetails.hiddenStats.qualityScore;
const cut = acceptCensorCuts(cutFiled.player, 'proj-1', 'INDIA');
need(!cut.error, cut.error || 'cuts should be acceptable');
const after = cut.player.commitments[0].projectDetails!;
need(after.hiddenStats.qualityScore < beforeQuality, 'accepted cuts move quality');
need(beforeQuality - after.hiddenStats.qualityScore <= 8, 'the quality hit stays small');
need(after.censor?.filings[0].status === 'UNDER_REVIEW', 'a recut goes back to the board');
need((after.censor?.filings[0].weeksLeft || 0) >= 3, 'the resubmission takes more weeks');
need((after.censor?.violence || 0) < (cutDetails.censor?.violence || 0), 'the cut pulls the violence slider down');

const ratePlayer = fileWithBoards(player('HOLLYWOOD', 70, 40, 40, 'PG13', 'PG-13'), 'proj-1', [{ territoryId: 'US', ratingId: 'PG13' }]).player;
const rateDetails = ratePlayer.commitments[0].projectDetails!;
const rateFiling = rateDetails.censor!.filings[0];
const qualityBeforeRating = rateDetails.hiddenStats.qualityScore;
rateFiling.status = 'RATING_OFFERED';
rateFiling.offeredRatingId = 'R';
rateFiling.offeredRatingLabel = 'R';
rateFiling.crowdCut = 0.07;
const taken = acceptHigherRating(ratePlayer, 'proj-1', 'US');
need(taken.player.commitments[0].projectDetails?.censor?.filings[0].status === 'APPROVED', 'accepting the higher card certifies the film');
need(taken.player.commitments[0].projectDetails?.censor?.filings[0].grantedRatingLabel === 'R', 'the granted card is the higher one');
need(!!taken.player.commitments[0].projectDetails?.censor?.filings[0].certificateNo, 'a certificate number is issued');
need(taken.player.commitments[0].projectDetails?.hiddenStats.qualityScore === qualityBeforeRating, 'taking the higher card keeps the scenes');

const refused = fileWithBoards(player('CHINESE', 80, 50, 40, 'APPROVED', 'Approved', 70, 60), 'proj-1', [{ territoryId: 'CHINA', ratingId: 'APPROVED' }]).player;
const refusedFiling = refused.commitments[0].projectDetails!.censor!.filings[0];
refusedFiling.status = 'REJECTED';
const appeal = appealCensorRefusal(refused, 'proj-1', 'CHINA');
need(!appeal.error, appeal.error || 'an appeal should be heard');
const appealed = appeal.player.commitments[0].projectDetails!.censor!.filings[0];
need(appealed.status === 'UNDER_REVIEW' && !!appealed.pendingAppeal, 'an appeal takes weeks before it rules');
need((appealed.weeksLeft || 0) >= 4, 'the appeal sitting is several weeks');

const blocked = fileWithBoards(player('HOLLYWOOD', 20, 10, 8, 'PG13', 'PG-13'), 'proj-1', [{ territoryId: 'US', ratingId: 'PG13' }]).player;
need(releaseBlockedByCensor(blocked, blocked.commitments[0].projectDetails) === true, 'a pending board cannot open');
const badStamp = stampReleasePlan(blocked, 'proj-1', 4, [{ territoryId: 'INDIA', extraWeeks: 0 }], false);
need(!!badStamp.error, 'an uncertified country cannot be dated');
const approved = runToDecision(blocked, 'US');
need(approved.filing?.status === 'APPROVED', 'the quiet US print gets its card');
const stamped = stampReleasePlan(approved.player, 'proj-1', 4, [
    { territoryId: 'US', extraWeeks: 0 },
], false);
need(!stamped.error, stamped.error || 'a certified country can be dated');
need(stamped.wait === 4, 'the first country uses the chosen wait');
need(releaseBlockedByCensor(stamped.player, stamped.player.commitments[0].projectDetails) === false, 'the dated certificate can open');
const staggered = stampReleasePlan(approved.player, 'proj-1', 4, [{ territoryId: 'US', extraWeeks: 6 }], false);
need(staggered.wait === 10, 'delaying the only country moves the opening');

const fresh = player('HOLLYWOOD', 20, 10, 8, 'PG13', 'PG-13');
need(releaseBlockedByCensor(fresh, fresh.commitments[0].projectDetails) === true, 'a house picture with no filing cannot open');

const loud = player('HOLLYWOOD', 12, 8, 4, 'PG13', 'PG-13', 100, 100);
loud.instagram = { controversy: 100 } as Player['instagram'];
loud.youtube = { controversy: 100 } as Player['youtube'];
const loudFiled = fileWithBoards(loud, 'proj-1', [{ territoryId: 'US', ratingId: 'PG13' }]);
const loudDone = runToDecision(loudFiled.player, 'US');
need(loudDone.filing?.status === 'APPROVED', `noise delays a clean print, it does not freeze it (${loudDone.filing?.status})`);
need((loudDone.filing?.cuts.length || 0) === 0, 'a clean print does not come back with an empty cut list');

const political = player('CHINESE', 10, 8, 4, 'APPROVED', 'Approved');
const politicalFiled = fileWithBoards(political, 'proj-1', [{ territoryId: 'CHINA', ratingId: 'APPROVED' }]);
const politicalDetails = politicalFiled.player.commitments[0].projectDetails!;
politicalDetails.censor!.themeId = 'faith';
politicalDetails.censor!.villainId = 'system';
politicalDetails.censor!.toneId = 'satire';
politicalDetails.censor!.filings[0].status = 'CUTS_REQUESTED';
politicalDetails.censor!.filings[0].cuts = [{
    id: 'pol',
    axis: 'politics',
    scene: 'The shrine',
    detail: 'Cover it.',
    quality: 2,
    audience: 1,
    slider: 14,
}];
const eased = acceptCensorCuts(politicalFiled.player, 'proj-1', 'CHINA');
need(!eased.error, eased.error || 'a politics cut should be acceptable');
need((eased.player.commitments[0].projectDetails?.censor?.politicsTrim || 0) >= 100, 'accepting the political scene takes it off the next sitting');
const easedDone = runToDecision(eased.player, 'CHINA');
need(easedDone.filing?.status !== 'CUTS_REQUESTED' || easedDone.filing.cuts.every(cut => cut.axis !== 'politics'), 'the same political scene does not come back');

const stampedAbs = 400;
const waitPresses = 4;
const firstWave = openingAbsolute(stampedAbs, waitPresses);
const oneWeekLater = firstWave + 1;
let mainTick = -1;
let laterTick = -1;
let countdown = waitPresses;
for (let press = 0; press < 8; press += 1) {
    const absNow = stampedAbs + press;
    countdown -= 1;
    if (countdown <= 0 && mainTick < 0) mainTick = press;
    if (territoryIsDue(absNow, oneWeekLater) && laterTick < 0) laterTick = press;
}
need(mainTick === 3, 'the first wave opens on the fourth press');
need(laterTick === mainTick + 1, 'a one-week stagger opens the week after, not on opening weekend');
need(territoryIsDue(stampedAbs + mainTick, firstWave), 'the first wave is due on its own tick');
need(!territoryIsDue(stampedAbs + mainTick, oneWeekLater), 'the staggered country is not due on opening weekend');

console.log('censor audit ok');
console.log('hot CBFC outcomes:', [...hotOutcomes].join(', '));
