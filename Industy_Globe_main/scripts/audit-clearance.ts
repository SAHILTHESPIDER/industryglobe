/**
 * Streaming-licence audit. Every country keeps its own fee, regulator, and file.
 * Run with npm run audit:clearance.
 */
import type { Player } from '../types';
import { MARKET_COUNTRIES, getCountry, hashString } from '../services/ownPlatform/catalog';
import {
    CLEARANCE_FORMULA,
    advanceStreamingReviews,
    allLicenceQuotes,
    appealLicence,
    applyForLicence,
    conditionMet,
    decisionOdds,
    isStreamingCleared,
    licenceAction,
    licenceQuote,
    licenceReach,
    regulatorFor,
    reapplyForLicence,
    tickStreamingLicences,
} from '../services/ownPlatform/clearance';
import { quoteLaunch } from '../services/ownPlatform/logic';
import { createOwnPlatform, normalizeOwnPlatform } from '../services/ownPlatform/migrate';

let failed = 0;
const need = (condition: unknown, message: string) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL ${message}`);
    }
};

const shell = (): Player => ({
    id: 'licence-audit',
    name: 'Asha',
    age: 30,
    currentWeek: 4,
    money: 20_000_000,
    logs: [],
    news: [],
    inbox: [],
} as unknown as Player);

const withCash = (cash: number, extra: Partial<Player['ownPlatform']> = {}): Player => {
    const platform = createOwnPlatform(shell());
    platform.books = { ...platform.books!, cash };
    platform.name = 'Empire+';
    return { ...shell(), ownPlatform: { ...platform, ...extra, books: { ...platform.books!, cash, ...(extra.books || {}) } } };
};

const before = MARKET_COUNTRIES.length;
need(before === 197, `country count changed: ${before}`);
need(getCountry('IN')?.accessCost === 22_000_000, 'India access cost was overwritten');
need(getCountry('US')?.audienceM === 225, 'US audience was overwritten');

const quotes = allLicenceQuotes();
need(quotes.length === MARKET_COUNTRIES.length, `a country is missing a fee (${quotes.length})`);
const fees = new Set(quotes.map(row => row.feeUsd));
need(fees.size === quotes.length, 'two countries share a licence fee');
const names = new Set<string>();
const shorts = new Set<string>();
quotes.forEach(row => {
    const country = getCountry(row.countryId);
    const profile = regulatorFor(row.countryId);
    need(Boolean(country && profile), `${row.countryId} lost its regulator`);
    if (!profile || !country) return;
    need(profile.countryId === country.id, `${country.id} regulator points at ${profile.countryId}`);
    need(row.feeUsd > 0 && row.marketValueUsd > 0, `${country.id} has an empty fee`);
    need(row.renewalUsd < row.feeUsd, `${country.id} renewal is not smaller than the fee`);
    need(row.appealUsd < row.feeUsd, `${country.id} appeal is not smaller than the fee`);
    need(row.renewalUsd > 0 && row.appealUsd > 0, `${country.id} renewal or appeal is free`);
    need(!names.has(profile.name), `regulator name shared: ${profile.name}`);
    need(!shorts.has(profile.short), `regulator short shared: ${profile.short}`);
    names.add(profile.name);
    shorts.add(profile.short);
});

const fee = (id: string) => licenceQuote(id)?.feeUsd || 0;
const us = fee('US');
const india = fee('IN');
const china = fee('CN');
const nz = fee('NZ');
const tuvalu = fee('TV');
const france = fee('FR');
const britain = fee('GB');
need(us > nz * 10 && india > nz * 10 && china > nz * 10, `giants are not much larger than New Zealand (${us}, ${india}, ${china}, ${nz})`);
need(china > tuvalu * 20 && us > tuvalu * 20, 'a microstate costs like a giant');
need(fee('CA') !== us && fee('MX') !== us, 'a region shares the US fee');
need(fee('DE') !== france && fee('IT') !== france, 'Europe shares one licence fee');
need(regulatorFor('EUROPE') === undefined && regulatorFor('ASIA') === undefined, 'a region id was treated as a country');

const chinaOdds = decisionOdds('CN', false);
const usOdds = decisionOdds('US', false);
const chinaAppeal = decisionOdds('CN', true);
need(chinaOdds.approve < 30 && chinaOdds.reject > 20, `China is not a hard review (${chinaOdds.approve}/${chinaOdds.reject})`);
need(chinaOdds.approve > 0 && chinaAppeal.approve > chinaOdds.approve, 'China is a hard cap, or an appeal does nothing');
need(usOdds.approve > chinaOdds.approve + 20, 'the US review is as hard as China');

let chinaApproved = 0;
let chinaRejected = 0;
for (let sample = 0; sample < 70; sample += 1) {
    const probe = withCash(0, {
        applications: [{
            countryId: 'CN',
            status: 'FILED',
            weeksLeft: 1,
            filedWeekAbsolute: 1,
            note: 'In review.',
            acceptedConditions: false,
            feePaid: china,
            regulatorId: 'CN',
        }],
    });
    probe.id = `cn-${sample}`;
    tickStreamingLicences(probe, 2_000 + sample * 3);
    const status = probe.ownPlatform?.applications.find(row => row.countryId === 'CN')?.status;
    if (status === 'APPROVED') chinaApproved += 1;
    if (status === 'REJECTED') chinaRejected += 1;
}
need(chinaApproved > 0 && chinaRejected > 0, `China samples never both grant and refuse (${chinaApproved} granted, ${chinaRejected} refused)`);
need(chinaApproved < chinaRejected, 'China grants more often than it refuses');

const poor = withCash(fee('TV') - 1);
const refused = applyForLicence(poor, 'TV');
need(Boolean(refused.error && refused.missing === 1), `short treasury did not report the missing dollar (${refused.missing})`);
need(refused.player === poor, 'a refused cheque copied the save');
need((poor.ownPlatform?.books?.cash || 0) === fee('TV') - 1, 'a refused cheque still took the money');
need(poor.money === 20_000_000, 'personal cash moved');

const payer = withCash(fee('NZ') + 50);
const personal = payer.money;
const paid = applyForLicence(payer, 'NZ');
need(!paid.error, paid.error || 'New Zealand apply failed');
need((paid.player.ownPlatform?.books?.cash || 0) === 50, `treasury after New Zealand is ${paid.player.ownPlatform?.books?.cash}`);
need(paid.player.money === personal, 'personal cash paid a government fee');
const nzFile = paid.player.ownPlatform?.applications.find(row => row.countryId === 'NZ');
need(nzFile?.status === 'FILED' && nzFile.feePaid === fee('NZ') && nzFile.weeksLeft > 1, 'New Zealand did not open its own file');
need(paid.player.ownPlatform?.selectedCountryIds.includes('NZ'), 'the licensed country was not added to the slate');
need((paid.player.news || []).some(item => item.headline.includes('NZ') || item.subtext?.includes('New Zealand')), 'applying wrote no news');
need((paid.player.inbox || []).length === 1, 'applying wrote no notification');
need(!isStreamingCleared(nzFile), 'a file under review can already stream');

const regionTry = applyForLicence(paid.player, 'EUROPE');
need(Boolean(regionTry.error), 'a region-wide licence was accepted');

const ticking = paid.player;
const weeksBefore = ticking.ownPlatform?.applications.find(row => row.countryId === 'NZ')?.weeksLeft || 0;
tickStreamingLicences(ticking, 400);
const afterTick = ticking.ownPlatform?.applications.find(row => row.countryId === 'NZ');
need((afterTick?.weeksLeft || 0) === weeksBefore - 1, 'the review clock did not move');

const ready = withCash(5_000_000);
ready.ownPlatform!.applications = [{
    countryId: 'FR',
    status: 'FILED',
    weeksLeft: 1,
    filedWeekAbsolute: 1,
    note: 'In review.',
    acceptedConditions: false,
    feePaid: fee('FR'),
    regulatorId: 'FR',
}];
ready.ownPlatform!.selectedCountryIds = ['FR'];
const newsBefore = (ready.news || []).length;
tickStreamingLicences(ready, 880);
const franceFile = ready.ownPlatform?.applications.find(row => row.countryId === 'FR');
need(franceFile && franceFile.status !== 'FILED', 'a finished review stayed filed');
need((ready.news || []).length > newsBefore, 'a decision wrote no news');
need((ready.inbox || []).length > 0, 'a decision wrote no notification');

const blocked = withCash(8_000_000, {
    stage: 'LIVE',
    selectedCountryIds: ['DE'],
    applications: [],
});
need(!isStreamingCleared(blocked.ownPlatform?.applications.find(row => row.countryId === 'DE')), 'a new live market streamed with no licence');

const grandfatherSource = withCash(2_000_000, {
    stage: 'LIVE',
    weeksLive: 6,
    subscribers: 1000,
    selectedCountryIds: ['US', 'IN'],
    applications: [
        { countryId: 'US', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: false },
        { countryId: 'IN', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: false },
    ],
});
const cashBefore = grandfatherSource.ownPlatform?.books?.cash || 0;
const migrated = normalizeOwnPlatform(grandfatherSource.ownPlatform, grandfatherSource);
need(migrated.books?.cash === cashBefore, 'grandfathering charged the treasury');
need(migrated.applications.find(row => row.countryId === 'US')?.grandfathered === true, 'the US licence was not grandfathered');
need(migrated.applications.find(row => row.countryId === 'IN')?.grandfathered === true, 'the India licence was not grandfathered');
need(isStreamingCleared(migrated.applications.find(row => row.countryId === 'US')), 'a launched market stopped streaming');
need(!migrated.applications.some(row => row.countryId === 'NZ'), 'migration invented a New Zealand file');
const newMarket = { ...grandfatherSource, ownPlatform: migrated };
need(!isStreamingCleared(newMarket.ownPlatform?.applications.find(row => row.countryId === 'BR')), 'a market that was never launched was cleared');

const quoted = quoteLaunch({
    ...shell(),
    ownPlatform: {
        ...withCash(0).ownPlatform!,
        selectedCountryIds: ['FR'],
        applications: [{
            countryId: 'FR',
            status: 'APPROVED',
            weeksLeft: 0,
            filedWeekAbsolute: 1,
            note: 'Paid.',
            acceptedConditions: false,
            feePaid: fee('FR'),
        }],
    },
});
need(quoted.access === 0, `a paid licence was billed again at launch (${quoted.access})`);

const legacy = quoteLaunch({
    ...shell(),
    ownPlatform: {
        ...withCash(0).ownPlatform!,
        selectedCountryIds: ['FR'],
        applications: [{ countryId: 'FR', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Old file.', acceptedConditions: false }],
    },
});
need(legacy.access === getCountry('FR')?.accessCost, `an unpaid old approval skipped market access (${legacy.access})`);

const harsh = withCash(0, {
    stage: 'LIVE',
    enforcement: 10,
    selectedCountryIds: ['CN'],
    catalogue: [],
    sites: [],
    offices: [],
    applications: [{
        countryId: 'CN',
        status: 'APPROVED',
        weeksLeft: 0,
        filedWeekAbsolute: 1,
        note: 'Granted.',
        acceptedConditions: true,
        feePaid: china,
        conditions: ['LOCAL_QUOTA', 'LOCAL_OFFICE', 'DATA_SERVER', 'CONTENT_RULES'],
        regulatorId: 'CN',
    }],
});
const cut = licenceReach(harsh.ownPlatform!, 'CN');
need(cut < 1 && cut >= 0.55, `China conditions closed the market or did nothing (${cut})`);
harsh.ownPlatform!.enforcement = 70;
harsh.ownPlatform!.offices = [{ countryId: 'CN', size: 'SMALL', localDeals: true }];
harsh.ownPlatform!.sites = [{ cityId: 'sha', scout: 1, workhorse: 0, titan: 0 }];
harsh.ownPlatform!.catalogue = [{ id: 'local', source: 'OWNED', title: 'Home', genre: 'Drama', language: 'Mandarin', cost: 0 }];
need(conditionMet(harsh.ownPlatform!, 'CN', 'LOCAL_QUOTA'), 'a Mandarin title did not meet the quota');
need(conditionMet(harsh.ownPlatform!, 'CN', 'LOCAL_OFFICE'), 'a China office did not meet the office rule');
need(conditionMet(harsh.ownPlatform!, 'CN', 'DATA_SERVER'), 'a Shanghai rack did not meet the server rule');
need(conditionMet(harsh.ownPlatform!, 'CN', 'CONTENT_RULES'), 'enforcement did not meet the content rule');
const restored = licenceReach(harsh.ownPlatform!, 'CN');
need(restored === 1, `meeting every rule left a penalty (${restored})`);

const renewing = withCash(80_000, {
    stage: 'LIVE',
    selectedCountryIds: ['NZ'],
    applications: [{
        countryId: 'NZ',
        status: 'APPROVED',
        weeksLeft: 0,
        filedWeekAbsolute: 1,
        note: 'Licensed.',
        acceptedConditions: false,
        feePaid: nz,
        renewalUsd: 20_000,
        renewsWeekAbsolute: 1,
        regulatorId: 'NZ',
    }],
});
tickStreamingLicences(renewing, 5000);
const renewed = renewing.ownPlatform?.applications.find(row => row.countryId === 'NZ');
need(isStreamingCleared(renewed), 'renewal switched the country off');
need((renewing.ownPlatform?.books?.cash || 0) === 60_000, `renewal cash is ${renewing.ownPlatform?.books?.cash}`);
need(renewed?.renewalOverdue !== true, 'a paid renewal was marked late');

const broke = withCash(1_000, {
    stage: 'LIVE',
    selectedCountryIds: ['NZ'],
    applications: [{
        countryId: 'NZ',
        status: 'APPROVED',
        weeksLeft: 0,
        filedWeekAbsolute: 1,
        note: 'Licensed.',
        acceptedConditions: false,
        feePaid: nz,
        renewalUsd: 20_000,
        renewsWeekAbsolute: 1,
        regulatorId: 'NZ',
    }],
});
tickStreamingLicences(broke, 5100);
const late = broke.ownPlatform?.applications.find(row => row.countryId === 'NZ');
need(late?.renewalOverdue === true && isStreamingCleared(late), 'a missed renewal closed the market');
need(licenceReach(broke.ownPlatform!, 'NZ') < 1, 'a missed renewal had no consequence');
need((broke.ownPlatform?.books?.cash || 0) === 1_000, 'a missed renewal took money the treasury did not have');

const refusedFile = withCash(fee('GB') * 2);
const first = applyForLicence(refusedFile, 'GB');
need(!first.error, first.error || 'Britain apply failed');
first.player.ownPlatform!.applications = first.player.ownPlatform!.applications.map(row => (
    row.countryId === 'GB'
        ? { ...row, status: 'REJECTED' as const, weeksLeft: 0, refileWeekAbsolute: 9_999, note: 'Refused.', appealSpent: false }
        : row
));
const brokeAppeal = { ...first.player, ownPlatform: { ...first.player.ownPlatform!, books: { ...first.player.ownPlatform!.books!, cash: 10 } } };
const appealMiss = appealLicence(brokeAppeal, 'GB');
need(Boolean(appealMiss.missing && appealMiss.missing > 0), 'an unaffordable appeal did not say what was missing');
const appealCash = fee('GB') * 2;
const canAppeal = { ...first.player, ownPlatform: { ...first.player.ownPlatform!, books: { ...first.player.ownPlatform!.books!, cash: appealCash } } };
const appealed = appealLicence(canAppeal, 'GB');
need(!appealed.error && appealed.player.ownPlatform?.applications.find(row => row.countryId === 'GB')?.status === 'FILED', 'appeal did not reopen the file');
need((appealed.player.ownPlatform?.books?.cash || 0) < appealCash, 'appeal did not charge');
const early = reapplyForLicence(first.player, 'GB');
need(Boolean(early.error), 'a refused file was reopened during the wait');

const appealRoll = (week: number) => hashString(`appeal-keep:CN:${week}:appeal`) % 100;
const plainRoll = (week: number) => hashString(`appeal-keep:CN:${week}:file`) % 100;
const appealOdds = decisionOdds('CN', true);
const plainOdds = decisionOdds('CN', false);
const inBucket = (roll: number, odds: { approve: number; delay: number; conditions: number }, bucket: 'delay' | 'reject') => {
    const delayEnd = odds.approve + odds.delay;
    const conditionEnd = delayEnd + odds.conditions;
    if (bucket === 'delay') return roll >= odds.approve && roll < delayEnd;
    return roll >= conditionEnd;
};
let delayWeek = 0;
let rejectWeek = 0;
let plainRejectWeek = 0;
for (let week = 1; week < 500 && (!delayWeek || !rejectWeek || !plainRejectWeek); week += 1) {
    if (!delayWeek && inBucket(appealRoll(week), appealOdds, 'delay')) delayWeek = week;
    if (!rejectWeek && inBucket(appealRoll(week), appealOdds, 'reject')) rejectWeek = week;
    if (!plainRejectWeek && inBucket(plainRoll(week), plainOdds, 'reject')) plainRejectWeek = week;
}
need(delayWeek > 0 && rejectWeek > 0 && plainRejectWeek > 0, 'could not find appeal delay and refusal rolls');
const delayedAppeal = withCash(0, {
    applications: [{
        countryId: 'CN',
        status: 'FILED',
        weeksLeft: 1,
        filedWeekAbsolute: 1,
        note: 'Appeal in.',
        acceptedConditions: false,
        feePaid: china,
        regulatorId: 'CN',
        appeal: true,
        appealSpent: true,
    }],
});
delayedAppeal.id = 'appeal-keep';
advanceStreamingReviews(delayedAppeal, delayWeek);
const held = delayedAppeal.ownPlatform?.applications.find(row => row.countryId === 'CN');
need(held?.status === 'DELAYED' && held.appeal === true, 'a delayed appeal dropped the paid odds');
held && (delayedAppeal.ownPlatform!.applications = [{ ...held, weeksLeft: 1 }]);
advanceStreamingReviews(delayedAppeal, delayWeek + 1);
const afterDelay = delayedAppeal.ownPlatform?.applications.find(row => row.countryId === 'CN');
if (afterDelay?.status === 'DELAYED') need(afterDelay.appeal === true, 'a second delay dropped the appeal');
else need(afterDelay?.appeal === false, 'a finished appeal stayed marked as an appeal');

const refusedAppeal = withCash(0, {
    applications: [{
        countryId: 'CN',
        status: 'FILED',
        weeksLeft: 1,
        filedWeekAbsolute: 1,
        note: 'Appeal in.',
        acceptedConditions: false,
        feePaid: china,
        regulatorId: 'CN',
        appeal: true,
        appealSpent: true,
    }],
});
refusedAppeal.id = 'appeal-keep';
advanceStreamingReviews(refusedAppeal, rejectWeek);
const refusedRow = refusedAppeal.ownPlatform?.applications.find(row => row.countryId === 'CN');
need(refusedRow?.status === 'REJECTED', 'the appeal refusal roll did not refuse');
need(Boolean(refusedRow?.note && !/Appeal for/.test(refusedRow.note)), `a spent appeal still offers another appeal (${refusedRow?.note})`);
need(!licenceAction(refusedAppeal, 'CN').secondary, 'the desk still offers an appeal after the appeal was refused');
need((refusedAppeal.news || []).every(item => !/Appeal for/.test(item.subtext || '')), 'news still tells the player to appeal');

const plainRefusal = withCash(0, {
    applications: [{
        countryId: 'CN',
        status: 'FILED',
        weeksLeft: 1,
        filedWeekAbsolute: 1,
        note: 'In review.',
        acceptedConditions: false,
        feePaid: china,
        regulatorId: 'CN',
        appeal: false,
        appealSpent: false,
    }],
});
plainRefusal.id = 'appeal-keep';
advanceStreamingReviews(plainRefusal, plainRejectWeek);
const plainRow = plainRefusal.ownPlatform?.applications.find(row => row.countryId === 'CN');
need(plainRow?.status === 'REJECTED' && /Appeal for/.test(plainRow.note), 'a first refusal hid the appeal');
need(licenceAction(plainRefusal, 'CN').secondary?.kind === 'APPEAL', 'a first refusal has no appeal on the desk');

const shown = ['US', 'IN', 'CN', 'GB', 'FR', 'NZ', 'TV'].map(id => {
    const row = licenceQuote(id);
    return `${id} $${Math.round((row?.feeUsd || 0) / 1_000_000 * 100) / 100}M`;
});
if (failed) {
    console.error(`${failed} clearance checks failed`);
    process.exitCode = 1;
} else {
    console.log(`ok ${quotes.length} licences · ${shown.join(' · ')}`);
    console.log(CLEARANCE_FORMULA);
}
