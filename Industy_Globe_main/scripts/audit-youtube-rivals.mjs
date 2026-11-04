import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), 'yt-rival-audit-'));
const entry = join(tempDir, 'yt-rival-audit-entry.ts');
const bundle = join(tempDir, 'yt-rival-audit-bundle.mjs');

const source = `
import { INITIAL_PLAYER } from '${root}types.ts';
import { getAbsoluteWeek } from '${root}services/legacyLogic.ts';
import { STUDIO_CATALOG } from '${root}services/studioLogic.ts';
import { PLATFORMS } from '${root}services/streamingLogic.ts';
import {
  slotUnlocked, trailerWarShare, openingMultiplier, applyYoutubeReleaseBoost, migrateYoutubeSave, priorReleasedOfType,
} from '${root}services/youtubeMarketing.ts';
import { clashMultiplier, dropOutlook, repeatMultiplier, timingBand } from '${root}services/youtubeConsequences.ts';
import {
  MUSIC_LABELS, personalityFor, pruneRivalChannels, syncRivalYoutube,
} from '${root}services/youtubeRivals.ts';
import { publishUpload, toggleSubscription } from '${root}views/mobile/youtube/actions.ts';

const failures = [];
let checks = 0;
const record = (scope, item, run) => {
  checks += 1;
  try { run(); } catch (error) {
    failures.push({ scope, item, error: error instanceof Error ? error.message : String(error) });
  }
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const clone = (value) => JSON.parse(JSON.stringify(value));

const film = (id, studioId, weeksAhead, title) => ({
  id,
  title,
  genre: 'ACTION',
  studioId,
  budgetTier: 'HIGH',
  quality: studioId === 'HULU' ? 42 : 78,
  boxOffice: 0,
  year: INITIAL_PLAYER.age,
  weekReleased: INITIAL_PLAYER.currentWeek + weeksAhead,
  leadActorId: 'lead_' + id,
  leadActorName: 'Lead ' + id,
  directorName: 'Director ' + id,
  reviews: 'HIT',
});

const worldWithSlate = () => {
  const player = clone(INITIAL_PLAYER);
  player.world.upcomingRivals = [
    film('eclipse', 'MARVEL_STUDIOS', 4, 'Eclipse Run'),
    film('quiet', 'ARTISAN_PICTURES', 10, 'Quiet Room'),
    film('hulu-cut', 'HULU', 3, 'Late Night Cut'),
    film('uni', 'UNIVERSAL', 6, 'Harbor Song'),
    film('netflix-show', 'NETFLIX', 2, 'Signal Lost'),
    film('hbo-slow', 'HBO', 14, 'The Long Table'),
  ];
  player.world.projects = [
    { ...film('old-warners', 'WARNER_BROS', -2, 'Already Out'), year: INITIAL_PLAYER.age, weekReleased: 1 },
  ];
  return player;
};

record('roster', 'every house gets a channel', () => {
  const player = worldWithSlate();
  const synced = syncRivalYoutube(player, player.youtube, 'view').channel;
  const ids = new Set((synced.rivalChannels || []).map(channel => channel.houseId));
  Object.keys(STUDIO_CATALOG).forEach(id => assert(ids.has(id), 'missing studio channel ' + id));
  Object.keys(PLATFORMS).forEach(id => assert(ids.has(id), 'missing platform channel ' + id));
  MUSIC_LABELS.forEach(label => assert(ids.has(label.id), 'missing label ' + label.name));
  const abroad = (synced.rivalChannels || []).filter(channel => channel.country !== 'IN');
  assert(abroad.length >= 8, 'expected non-Indian houses, saw ' + abroad.length);
  (synced.rivalChannels || []).forEach(channel => {
    assert(!!channel.language && !!channel.country, channel.name + ' needs language and country');
    assert(channel.handle.startsWith('@'), channel.name + ' needs a handle');
    channel.videos.forEach(video => {
      assert(video.language === channel.language && video.country === channel.country, 'video market should match the channel');
      assert(video.rivalChannelId === channel.id, 'video should point at its channel');
      assert((video.comments || []).length > 0, 'offline comments should exist without an API key');
      assert((video.weeklyHistory || []).length <= 12, 'history should stay capped');
    });
  });
  assert((synced.rivalChannels || []).reduce((sum, channel) => sum + channel.videos.length, 0) <= 260, 'global video cap');
  assert(synced.schemaVersion === 3, 'schema should move to 3');
});

record('personality', 'stable per house', () => {
  assert(personalityFor('MARVEL_STUDIOS', 'STUDIO', 'UNIVERSE_ARCHITECT') === 'AGGRESSIVE', 'Marvel markets hard');
  assert(personalityFor('ARTISAN_PICTURES', 'STUDIO', 'PRESTIGE') === 'MYSTERY', 'Artisan stays quiet');
  assert(personalityFor('HBO', 'STUDIO', 'PRESTIGE') === 'PRESTIGE', 'HBO is a slow burn');
  assert(personalityFor('UNIVERSAL', 'STUDIO', 'LEGACY') === 'MUSIC_LED', 'Universal leans on music');
  assert(personalityFor('HULU', 'PLATFORM', 'PLATFORM') === 'SPAMMY', 'Hulu posts constantly');
  assert(personalityFor('tseries', 'LABEL') === 'MUSIC_LED', 'T-Series is music-led');
  assert(personalityFor('hybe', 'LABEL') === 'AGGRESSIVE', 'HYBE is an aggressive label');
  const venture = personalityFor('npc_venture_alpha', 'STUDIO', 'GENRE_HOUSE');
  assert(venture === personalityFor('npc_venture_alpha', 'STUDIO', 'GENRE_HOUSE'), 'venture personality should not drift');
});

record('consequences', 'repeats timing and clashes', () => {
  assert(slotUnlocked('FINAL_TRAILER', { gate: 'greenlit', filmed: 0, releaseWeekAbs: null, released: false, open: true }), 'final trailer is not locked at greenlight');
  assert(repeatMultiplier(0) > repeatMultiplier(1) && repeatMultiplier(1) > repeatMultiplier(4), 'repeats diminish');
  assert(clashMultiplier(1) === 1, 'one big drop does not clash');
  assert(clashMultiplier(6) < clashMultiplier(2), 'a crowded week splits attention');
  assert(timingBand('TEASER', 20) === 'early', 'a teaser 20 weeks out is early');
  assert(timingBand('TEASER', 6) === 'sweet', 'a teaser 6 weeks out is on time');
  assert(timingBand('TRAILER_1', -3) === 'after', 'a trailer after release is late to the conversation');
  const first = dropOutlook({ type: 'TEASER', weeksBefore: 6, repeats: 0, sameWeekPosts: 1, rivalBigDrops: 1, quality: 70 });
  const second = dropOutlook({ type: 'TEASER', weeksBefore: 6, repeats: 1, sameWeekPosts: 1, rivalBigDrops: 1, quality: 70 });
  const spam = dropOutlook({ type: 'TEASER', weeksBefore: 6, repeats: 3, sameWeekPosts: 4, rivalBigDrops: 6, quality: 40 });
  assert(second.viewMultiplier < first.viewMultiplier, 'second teaser reaches fewer people');
  assert(spam.backlash > first.backlash, 'spam and a weak cut draw backlash');
  assert(spam.note.length > 10, 'the player can read the consequence');
  const opening = { id: 'a', type: 'TEASER', status: 'SCHEDULED', scheduledWeekAbs: 10 };
  const followUp = { id: 'b', type: 'TEASER', status: 'SCHEDULED', scheduledWeekAbs: 14 };
  assert(priorReleasedOfType([opening, followUp], opening) === 0, 'a teaser still on the calendar should not penalize the one releasing now');
  opening.status = 'RELEASED';
  assert(priorReleasedOfType([opening, followUp], followUp) === 1, 'the next teaser should see the one that already went out');
});

record('saves', 'old channel survives migration', () => {
  const player = worldWithSlate();
  player.youtube = { ...player.youtube, schemaVersion: 2, videos: [{ id: 'keep_me', title: 'Old vlog', type: 'VLOG', thumbnailColor: 'poster-hero', views: 10, likes: 1, earnings: 0, weekUploaded: 1, yearUploaded: player.age, isPlayer: true, authorName: player.name, qualityScore: 40, weeklyHistory: Array.from({ length: 40 }, () => 1), comments: ['hi'] }] };
  const migrated = migrateYoutubeSave(player);
  assert(migrated.videos.some(video => video.id === 'keep_me'), 'old personal video should remain');
  assert((migrated.videos.find(video => video.id === 'keep_me').weeklyHistory || []).length <= 26, 'personal history should trim');
  assert(migrated.schemaVersion === 3, 'migration bumps schema');
  assert(migrated.handle === '@player', 'handle stays');
  const withHouses = syncRivalYoutube(player, migrated, 'view').channel;
  assert((withHouses.rivalChannels || []).length > 10, 'opening the app adds rival channels onto the old save');
  assert(withHouses.videos.some(video => video.id === 'keep_me'), 'rival sync should keep the old video');
});

record('uploads', 'two teasers and a broke drop still schedule', () => {
  const player = clone(INITIAL_PLAYER);
  player.money = 0;
  player.commitments = [{ id: 'proj', name: 'Moon', type: 'ACTING_GIG', energyCost: 0, income: 0, payoutType: 'LUMPSUM' }];
  const first = publishUpload(player, { title: 'Moon teaser', type: 'TEASER', plan: 'SAFE', projectId: 'proj' });
  assert(!first.error, first.error || 'first teaser should schedule');
  const second = publishUpload(first.player, { title: 'Moon teaser 2', type: 'TEASER', plan: 'SAFE', projectId: 'proj' });
  assert(!second.error, second.error || 'repeat teaser should schedule');
  const drops = second.player.youtube.marketing.proj.drops;
  assert(drops.length === 2, 'both teasers should be on the campaign');
  assert(drops.every(drop => drop.underfunded), 'no cash should not block the drop');
});

record('uploads', 'studio treasury covers an empty personal wallet', () => {
  const player = clone(INITIAL_PLAYER);
  player.money = 0;
  player.businesses = [{ id: 'house', name: 'Empire', type: 'PRODUCTION_HOUSE', isActive: true, balance: 500000 }];
  player.commitments = [{ id: 'proj', name: 'Moon', type: 'ACTING_GIG', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectDetails: { estimatedBudget: 1000000, hiddenStats: {} } }];
  const result = publishUpload(player, { title: 'Moon teaser', type: 'TEASER', plan: 'SAFE', projectId: 'proj' });
  assert(!result.error, result.error || 'house-funded teaser should schedule');
  const drop = result.player.youtube.marketing.proj.drops[0];
  assert(drop.underfunded !== true, 'house cash should count as paid');
  const house = result.player.businesses.find(item => item.type === 'PRODUCTION_HOUSE');
  assert(house.balance < 500000, 'the house should be billed');
  assert(result.player.money === 0, 'personal cash stays empty');
});

record('roster', 'a bought studio is not a rival channel', () => {
  const player = worldWithSlate();
  player.world.studios.NETFLIX.isPlayerOwned = true;
  player.world.studios.HBO.mergedIntoBusinessId = 'biz_player';
  const synced = syncRivalYoutube(player, player.youtube, 'view').channel;
  const ids = new Set((synced.rivalChannels || []).map(channel => channel.houseId));
  assert(!ids.has('NETFLIX'), 'owned Netflix should leave the rival slate');
  assert(!ids.has('HBO'), 'a merged studio should leave the rival slate');
  assert(ids.has('MARVEL_STUDIOS'), 'studios the player does not own stay');
});

record('competition', 'release boost uses real rival hype', () => {
  const player = worldWithSlate();
  const synced = syncRivalYoutube(player, player.youtube, 'view').channel;
  const abs = getAbsoluteWeek(player.age, player.currentWeek);
  (synced.rivalChannels || []).forEach(channel => channel.videos.forEach(video => { video.type = 'CLIP'; }));
  const rival = (synced.rivalChannels || []).find(channel => channel.videos.length > 0);
  assert(rival, 'backfill should post at least one scored video');
  const video = rival.videos[0];
  video.hype = 20;
  video.weekUploaded = player.currentWeek;
  video.yearUploaded = player.age;
  video.type = 'TRAILER_1';
  player.youtube = synced;
  player.youtube.marketing = { gig: { drops: [], campaignHype: 80, lastDropWeekAbs: abs, songStreams: 0 } };
  const commitment = {
    id: 'gig',
    name: 'Moon',
    type: 'ACTING_GIG',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectDetails: { hiddenStats: { rawHype: 50, qualityScore: 70 } },
  };
  const result = applyYoutubeReleaseBoost(player, commitment);
  assert(result, 'boost should run when a campaign exists');
  const fakeShare = trailerWarShare(80, [80 * 0.86, 80 * 0.74]);
  const realShare = trailerWarShare(80, [20]);
  const fake = openingMultiplier(80) * (0.9 + 0.2 * fakeShare);
  const real = openingMultiplier(80) * (0.9 + 0.2 * realShare);
  assert(Math.abs(fake - real) > 0.01, 'real rival hype should not match the old fake pair');
  assert(Math.abs(result.openingMultiplier - Math.max(0.8, Math.min(1.5, real))) < 0.02, 'boost should follow the real share');
});

record('subscribe', 'toggle is saved on the channel', () => {
  const player = worldWithSlate();
  player.youtube = syncRivalYoutube(player, player.youtube, 'view').channel;
  const id = player.youtube.rivalChannels[0].id;
  const on = toggleSubscription(player, id);
  assert(!on.error, on.error || '');
  assert(on.player.youtube.subscriptions.includes(id), 'subscribe should stick');
  const off = toggleSubscription(on.player, id);
  assert(!off.player.youtube.subscriptions.includes(id), 'unsubscribe should stick');
});

record('prune', 'old videos and history drop', () => {
  const videos = Array.from({ length: 30 }, (_, index) => ({
    id: 'v' + index,
    title: 'Old ' + index,
    type: 'TEASER',
    thumbnailColor: 'poster-hero',
    views: index,
    likes: 1,
    earnings: 0,
    weekUploaded: (index % 52) + 1,
    yearUploaded: 18,
    isPlayer: false,
    authorName: 'House',
    qualityScore: 50,
    weeklyHistory: Array.from({ length: 40 }, () => index),
    comments: ['a', 'b', 'c', 'd', 'e', 'f'],
  }));
  const pruned = pruneRivalChannels([{
    id: 'house:TEST', houseId: 'TEST', kind: 'STUDIO', name: 'Test', handle: '@test',
    subscribers: 10, totalViews: 10, videos, personality: 'SPAMMY', language: 'en', country: 'US', fatigue: 0, backlash: 0,
  }]);
  assert(pruned[0].videos.length <= 16, 'per-channel cap');
  assert(pruned[0].videos.every(video => video.weeklyHistory.length <= 12), 'history cap');
  assert(pruned[0].videos.every(video => video.comments.length <= 4), 'comment cap');
});

record('sync', 'a second pass does not duplicate the week', () => {
  const player = worldWithSlate();
  const once = syncRivalYoutube(player, player.youtube, 'week').channel;
  const twice = syncRivalYoutube({ ...player, youtube: once }, once, 'week').channel;
  const firstCount = (once.rivalChannels || []).reduce((sum, channel) => sum + channel.videos.length, 0);
  const secondCount = (twice.rivalChannels || []).reduce((sum, channel) => sum + channel.videos.length, 0);
  assert(firstCount > 0, 'the week should post something');
  assert(firstCount === secondCount, 'the same week should not post again');
});

if (failures.length) {
  console.error(JSON.stringify({ ok: false, checks, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checks }, null, 2));
`;

try {
  await writeFile(entry, source);
  await build({
    entryPoints: [entry],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
    external: ['@google/genai'],
  });
  await import(pathToFileURL(bundle).href);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
