import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), 'yt-partner-audit-'));
const entry = join(tempDir, 'yt-partner-audit-entry.ts');
const bundle = join(tempDir, 'yt-partner-audit-bundle.mjs');

const source = `
import { INITIAL_PLAYER } from '${root}types.ts';
import { applyYoutubeReleaseBoost, migrateYoutubeSave } from '${root}services/youtubeMarketing.ts';
import {
  adDollars, buyPromotion, chargeYoutubeWallet, creditYoutubeWallet, ensureYoutubePartner,
  filmCollab, filmCollabFromOffer, quotePromotion, readAnalytics, runPremiere, scaleBrandPayout, settleYoutubePartnerWeek,
  sponsoredViewMultiplier, watchHoursFor, YPP_WATCH_HOURS,
} from '${root}services/youtubePartner/index.ts';

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

const video = (patch) => ({
  id: patch.id || 'vid',
  title: patch.title || 'Cut',
  type: patch.type || 'VLOG',
  thumbnailColor: 'poster-hero',
  views: patch.views || 0,
  likes: 10,
  earnings: patch.earnings || 0,
  weekUploaded: 1,
  yearUploaded: INITIAL_PLAYER.age,
  isPlayer: true,
  authorName: 'Player',
  qualityScore: patch.qualityScore ?? 70,
  weeklyHistory: patch.weeklyHistory || [patch.views || 0],
  comments: [],
  isShort: patch.isShort,
  channelKind: patch.channelKind,
  signals: patch.signals,
});

const playerWith = (youtubePatch, extra) => {
  const player = clone(INITIAL_PLAYER);
  player.youtube = { ...player.youtube, ...youtubePatch, videos: youtubePatch.videos || player.youtube.videos };
  if (extra) Object.assign(player, extra);
  player.youtube = ensureYoutubePartner(player.youtube);
  return player;
};

record('migrate', 'keeps a higher schema and foreign fields, and is idempotent', () => {
  const raw = {
    ...clone(INITIAL_PLAYER.youtube),
    schemaVersion: 7,
    playButton: 'gold',
    bannerTheme: { ink: 'custom' },
    partner: { futureField: 'keep', feature: 1, seeded: false, audience: [{ code: 'US', share: 1 }] },
    videos: [video({ id: 'old', views: 1000, earnings: 20 })],
  };
  const once = ensureYoutubePartner(raw);
  const twice = ensureYoutubePartner(once);
  assert(once.schemaVersion === 7, 'schema dropped to ' + once.schemaVersion);
  assert(once.playButton === 'gold', 'lost play button');
  assert(once.bannerTheme.ink === 'custom', 'lost banner theme');
  assert(once.partner.futureField === 'keep', 'lost future partner field');
  assert(once.partner.feature === 1, 'feature stamp missing');
  assert(once.partner.audience[0].code === 'US', 'audience was replaced');
  assert(JSON.stringify(once) === JSON.stringify(twice), 'second migrate changed the save');
  const fresh = ensureYoutubePartner({ ...clone(INITIAL_PLAYER.youtube), schemaVersion: 3 });
  assert(fresh.schemaVersion === 5, 'v3 did not move to 5');
});

record('migrate', 'v3, play-button v4, and partner v4 all land on schema 5', () => {
  const v3 = clone(INITIAL_PLAYER);
  v3.youtube = { ...v3.youtube, schemaVersion: 3, subscribers: 44000, isMonetized: true, looks: { personal: { name: 'Kept Name' } } };
  const fromV3 = migrateYoutubeSave(v3);
  assert(fromV3.schemaVersion === 5, 'v3 schema ' + fromV3.schemaVersion);
  assert(fromV3.partner && fromV3.partner.feature === 1, 'v3 missing partner');
  assert(fromV3.partner.monetized.personal === true, 'an already monetized v3 channel lost ads');
  assert(fromV3.zeroStart === false, 'v3 became a fresh career');
  assert(fromV3.extraChannelsUnlocked === true, 'v3 lost the account switch');
  assert(fromV3.looks.personal.name === 'Kept Name', 'v3 lost a look');

  const awards = clone(INITIAL_PLAYER);
  awards.youtube = {
    ...awards.youtube,
    schemaVersion: 4,
    subscribers: 0,
    isMonetized: false,
    zeroStart: true,
    extraChannelsUnlocked: false,
    looks: { personal: { name: 'Asha' } },
    playButtons: { personal: [{ tier: 'SILVER', subscribers: 100000, weekAbs: 4 }] },
  };
  const fromAwards = migrateYoutubeSave(awards);
  const fromAwardsAgain = migrateYoutubeSave({ ...awards, youtube: fromAwards });
  assert(fromAwards.schemaVersion === 5, 'awards schema ' + fromAwards.schemaVersion);
  assert(fromAwards.zeroStart === true, 'zero start was cleared');
  assert(fromAwards.extraChannelsUnlocked === false, 'locked switch was opened');
  assert(fromAwards.looks.personal.name === 'Asha', 'look was dropped');
  assert(fromAwards.playButtons.personal[0].tier === 'SILVER', 'play button was dropped');
  assert(fromAwards.partner && fromAwards.partner.monetized.personal !== true, 'zero start was grandfathered into ads');
  assert(JSON.stringify(fromAwards) === JSON.stringify(fromAwardsAgain), 'awards migration was not idempotent');

  const partnerSave = clone(INITIAL_PLAYER);
  partnerSave.youtube = {
    ...partnerSave.youtube,
    schemaVersion: 4,
    subscribers: 8000,
    isMonetized: true,
    partner: { feature: 1, seeded: true, hourWeeks: { personal: [5000], studio: [], empirePlus: [] }, customNote: 'keep-me' },
  };
  const fromPartner = migrateYoutubeSave(partnerSave);
  assert(fromPartner.schemaVersion === 5, 'partner schema ' + fromPartner.schemaVersion);
  assert(fromPartner.partner.customNote === 'keep-me', 'partner field was dropped');
  assert(fromPartner.partner.seeded === true, 'seeded flag was reset');
  assert(fromPartner.zeroStart === false, 'a partner save was marked fresh');
  assert(fromPartner.extraChannelsUnlocked === true, 'a partner save lost channel switching');
  assert(fromPartner.partner.monetized.personal === true, 'partner monetization was cleared');
});

record('ypp', 'ads need the partner flag, and a US audience pays more than India', () => {
  const long = video({ id: 'long', type: 'VLOG', views: 10000, qualityScore: 70 });
  const locked = playerWith({ isMonetized: false, subscribers: 5000, videos: [long] });
  locked.youtube.partner.monetized.personal = false;
  const none = adDollars(locked.youtube, long, 10000, 'personal', 10);
  assert(none === 0, 'unqualified channel earned ' + none);
  const us = playerWith({ isMonetized: true, subscribers: 5000, controversy: 0, videos: [long] });
  us.youtube.partner.audience = [{ code: 'US', share: 1 }];
  us.youtube.partner.monetized.personal = true;
  const india = playerWith({ isMonetized: true, subscribers: 5000, controversy: 0, videos: [long] });
  india.youtube.partner.audience = [{ code: 'IN', share: 1 }];
  india.youtube.partner.monetized.personal = true;
  const usPay = adDollars(us.youtube, long, 10000, 'personal', 10);
  const inPay = adDollars(india.youtube, long, 10000, 'personal', 10);
  assert(usPay > inPay * 4, 'US ' + usPay + ' vs IN ' + inPay);
  const short = video({ id: 's', type: 'SHORT', isShort: true, views: 10000, qualityScore: 70 });
  const shortPay = adDollars(us.youtube, short, 10000, 'personal', 10);
  assert(shortPay < usPay * 0.1, 'shorts pay ' + shortPay + ' vs long ' + usPay);
  const longHours = watchHoursFor(100000, long, 0);
  const shortHours = watchHoursFor(100000, short, 0);
  assert(longHours > YPP_WATCH_HOURS, 'long hours ' + longHours);
  assert(shortHours < longHours * 0.2, 'short hours ' + shortHours + ' vs ' + longHours);
  const poster = video({ id: 'poster', type: 'MOTION_POSTER', views: 50000, qualityScore: 70 });
  const posterHours = watchHoursFor(50000, poster, 0);
  const vlogHours = watchHoursFor(50000, long, 0);
  assert(posterHours < 1000, 'poster counted as a long video: ' + posterHours);
  assert(vlogHours > posterHours * 8, 'vlog hours ' + vlogHours + ' vs poster ' + posterHours);
  const shortFirst = playerWith({
    isMonetized: true,
    subscribers: 20000,
    videos: [short, long],
  });
  shortFirst.youtube.partner.audience = [{ code: 'US', share: 1 }];
  const analytics = readAnalytics(shortFirst.youtube, 'personal', 10);
  assert(analytics.blendedCpm > 5, 'CPM followed the short: ' + analytics.blendedCpm);
  const shortsOnly = playerWith({
    isMonetized: true,
    subscribers: 20000,
    videos: [short, video({ id: 's2', type: 'SHORT', isShort: true, views: 8000, qualityScore: 60 })],
  });
  shortsOnly.youtube.partner.audience = [{ code: 'US', share: 1 }];
  const shortsCpm = readAnalytics(shortsOnly.youtube, 'personal', 10).blendedCpm;
  assert(shortsCpm < 1, 'shorts-only channel showed long-form CPM ' + shortsCpm);
  assert(shortsCpm > 0.29 && shortsCpm < 0.35, 'shorts CPM was cut twice: ' + shortsCpm);
  const usShort = adDollars(shortsOnly.youtube, short, 10000, 'personal', 10);
  assert(usShort === Math.floor(10 * shortsCpm), 'short payout ' + usShort + ' vs cpm ' + shortsCpm);
});

record('ypp', 'a channel with the hours and the subs unlocks on the week tick', () => {
  const player = playerWith({
    isMonetized: false,
    subscribers: 1200,
    videos: [video({ id: 'hours', type: 'VLOG', views: 90000, qualityScore: 80, weeklyHistory: [90000] })],
  });
  player.youtube.partner.monetized.personal = false;
  player.youtube.isMonetized = false;
  const settled = settleYoutubePartnerWeek(player);
  assert(settled.player.youtube.partner.monetized.personal === true, 'did not unlock');
  assert(settled.player.youtube.isMonetized === true, 'flag stayed off');
  assert(settled.player.youtube.partner.hourWeeks.personal[0] >= YPP_WATCH_HOURS, 'hours not recorded');
});

record('collab', 'a bad fit still posts and causes backlash', () => {
  const player = playerWith({ creatorIdentity: 'PRESTIGE_FILMMAKER', subscribers: 4000, controversy: 5, fanMood: 60, audienceTrust: 70 });
  const bad = filmCollab(player, {
    id: 'roast', name: 'Roast Room', handle: '@roast', avatar: '', followers: 2_000_000,
    country: 'US', niche: 'Roast', heat: 78, kind: 'CREATOR',
  }, { title: 'Roast the prestige cut', type: 'SKIT' });
  assert(bad.player.youtube.videos[0].signals.collabWith === 'Roast Room', 'video missing');
  assert(bad.player.youtube.videos[0].views > 1000, 'no crossover views');
  assert((bad.player.youtube.controversy || 0) > 5, 'no backlash');
  const good = filmCollab(playerWith({ creatorIdentity: 'LIFESTYLE_ICON', subscribers: 4000, controversy: 5 }), {
    id: 'vlog', name: 'Soft Hour', handle: '@soft', avatar: '', followers: 2_000_000,
    country: 'IN', niche: 'Vlog', heat: 16, kind: 'CREATOR',
  }, { title: 'Day on set', type: 'VLOG' });
  assert((good.player.youtube.controversy || 0) < (bad.player.youtube.controversy || 0), 'good fit was harsher than the bad fit');
  const offered = filmCollabFromOffer(playerWith({ creatorIdentity: 'ACTOR_VLOGGER', subscribers: 4000, controversy: 5 }), {
    id: 'inbox_offer',
    creatorName: 'Someone Not On The Roster',
    creatorHandle: '@someone',
    creatorAvatar: '',
    conceptTitle: 'Inbox collab',
    requiredType: 'VLOG',
    energyCost: 10,
    qualityBonus: 4,
    bonusViews: 250000,
    bonusSubscribers: 400,
    description: 'A promised crossover.',
    expiresInWeeks: 2,
  });
  assert(offered.player.youtube.videos[0].views >= 250000, 'inbox collab ignored the promised views: ' + offered.player.youtube.videos[0].views);
});

record('sponsors', 'fatigue and repeat deals pay and land worse', () => {
  const fresh = sponsoredViewMultiplier(0, 1);
  const tired = sponsoredViewMultiplier(40, 4);
  assert(fresh > tired, fresh + ' vs ' + tired);
  const small = scaleBrandPayout({ subs: 5000, trust: 55, fatigue: 0, controversy: 0, recentSponsors: 0 });
  const large = scaleBrandPayout({ subs: 200000, trust: 55, fatigue: 0, controversy: 0, recentSponsors: 0 });
  const burned = scaleBrandPayout({ subs: 200000, trust: 55, fatigue: 70, controversy: 80, recentSponsors: 5 });
  assert(large > small * 5, 'payout did not scale');
  assert(burned < large, 'fatigue did not cut the offer');
});

record('ads', 'returns diminish and a weak video converts worse', () => {
  const small = quotePromotion({ budget: 1000, countries: ['US'], subs: 10000, quality: 80, adFatigue: 0, weeks: 1 });
  const big = quotePromotion({ budget: 50000, countries: ['US'], subs: 10000, quality: 80, adFatigue: 0, weeks: 1 });
  const weak = quotePromotion({ budget: 1000, countries: ['US'], subs: 10000, quality: 30, adFatigue: 0, weeks: 1 });
  assert(big.views / 50000 < small.views / 1000, 'no diminishing return');
  assert(weak.views < small.views, 'weak video reached as far');
  assert(weak.subs / Math.max(1, weak.views) < small.subs / Math.max(1, small.views), 'weak video converted as well');
  const player = playerWith({
    subscribers: 8000,
    videos: [video({ id: 'push', views: 2000, qualityScore: 30 })],
  });
  player.money = 200;
  const broke = buyPromotion(player, 'push', 2500, ['US'], 2);
  assert(!!broke.error, 'broke player bought ads');
  assert(broke.player.money === 200, 'personal cash moved on a failed buy');
  player.money = 8000;
  const bought = buyPromotion(player, 'push', 1000, ['IN'], 2);
  assert(!bought.error, bought.error || 'buy failed');
  assert(bought.player.money === 7000, 'not charged ' + bought.player.money);
  const crowded = playerWith({
    subscribers: 8000,
    videos: [video({ id: 'push', views: 2000, qualityScore: 70 })],
  });
  crowded.money = 100000;
  crowded.youtube.partner.promotions = Array.from({ length: 8 }, (_, index) => ({
    id: 'old_' + index,
    videoId: 'push',
    budget: 500,
    countries: ['US'],
    weeksLeft: 2,
    weeksTotal: 2,
    viewsDelivered: 0,
    subsDelivered: 0,
    viewsPlanned: 1000,
    subsPlanned: 4,
    wallet: 'personal',
    weak: false,
    efficiency: 0.5,
  }));
  const ninth = buyPromotion(crowded, 'push', 1000, ['US'], 1);
  assert(!ninth.error, ninth.error || 'ninth buy failed');
  const ids = (ninth.player.youtube.partner.promotions || []).map(row => row.id);
  assert(ids.length === 9, 'paid campaign was dropped, left ' + ids.length);
  assert(ids.includes('old_7'), 'an older paid campaign disappeared');
  const finished = playerWith({
    subscribers: 8000,
    videos: [video({ id: 'push', views: 2000, qualityScore: 70, signals: { trackedViews: 2000, trackedEarnings: 0 } })],
  });
  finished.youtube.partner.seeded = true;
  finished.youtube.partner.settledAbs = undefined;
  finished.youtube.partner.promotions = [{
    id: 'done',
    videoId: 'push',
    budget: 1000,
    countries: ['US'],
    weeksLeft: 0,
    weeksTotal: 2,
    viewsDelivered: 400,
    subsDelivered: 10,
    viewsPlanned: 1000,
    subsPlanned: 20,
    wallet: 'personal',
    weak: false,
    efficiency: 0.5,
  }];
  const after = settleYoutubePartnerWeek(finished);
  const done = after.player.youtube.partner.promotions.find(row => row.id === 'done');
  assert(done && done.viewsDelivered === 400 && done.subsDelivered === 10, 'a finished buy kept accruing ' + (done && done.viewsDelivered));
  const before = bought.player.youtube.videos[0].views;
  const settled = settleYoutubePartnerWeek(bought.player);
  assert(settled.player.youtube.videos[0].views > before, 'promotion delivered no views');
});

record('wallet', 'studio money stays in the house', () => {
  const player = playerWith({ subscribers: 10000, activeChannel: 'studio' });
  player.money = 50000;
  player.businesses = [{
    id: 'house', name: 'Lot', type: 'PRODUCTION_HOUSE', isActive: true, balance: 1000,
    stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 1, brandHealth: 40, customerSatisfaction: 40, riskLevel: 1, hype: 1 },
  }];
  const paid = creditYoutubeWallet(player, 'studio', 2500, 'YouTube studio ads');
  assert(paid.player.money === 50000, 'personal cash changed');
  assert(paid.player.businesses[0].balance === 3500, 'treasury ' + paid.player.businesses[0].balance);
  const broke = chargeYoutubeWallet(player, 'studio', 5000, 'YouTube promotion');
  assert(!!broke.error, 'overdraft was allowed');
  assert(broke.player.money === 50000, 'personal cash covered the studio');
  assert(broke.player.businesses[0].balance === 1000, 'balance moved on a declined charge');
  const personal = creditYoutubeWallet(player, 'personal', 400, 'YouTube personal ads');
  assert(personal.player.money === 50400, 'personal wallet missed the credit');
  const buyer = playerWith({
    subscribers: 4000,
    activeChannel: 'studio',
    videos: [video({ id: 'personal_cut', views: 3000, qualityScore: 70 })],
  });
  buyer.money = 9000;
  buyer.businesses = [{
    id: 'house2', name: 'Lot', type: 'PRODUCTION_HOUSE', isActive: true, balance: 8000,
    stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 1, brandHealth: 40, customerSatisfaction: 40, riskLevel: 1, hype: 1 },
  }];
  const boughtPersonal = buyPromotion(buyer, 'personal_cut', 1000, ['US'], 1);
  assert(!boughtPersonal.error, boughtPersonal.error || 'personal video buy failed');
  assert(boughtPersonal.player.money === 8000, 'studio switch billed the house instead of personal cash');
  assert(boughtPersonal.player.businesses[0].balance === 8000, 'house treasury moved for a personal video');
});

record('ads', 'a studio buy moves that audience, not an empty personal channel', () => {
  const player = playerWith({
    subscribers: 0,
    totalChannelViews: 0,
    videos: [],
    partner: undefined,
  });
  player.youtube.officialChannels = {
    studio: {
      handle: '@lot',
      subscribers: 20000,
      totalViews: 5000000,
      lifetimeEarnings: 0,
      videos: [video({
        id: 'studio_trailer',
        type: 'TRAILER_1',
        views: 5000000,
        qualityScore: 80,
        channelKind: 'studio',
        signals: { trackedViews: 5000000, trackedEarnings: 0, format: 'LONG' },
      })],
    },
  };
  player.youtube = ensureYoutubePartner(player.youtube);
  player.youtube.partner.audience = [{ code: 'IN', share: 1 }];
  player.youtube.partner.promotions = [{
    id: 'ad_studio',
    videoId: 'studio_trailer',
    budget: 1000,
    countries: ['US'],
    weeksLeft: 1,
    weeksTotal: 1,
    viewsDelivered: 0,
    subsDelivered: 0,
    viewsPlanned: 20000,
    subsPlanned: 40,
    wallet: 'studio',
    weak: false,
    efficiency: 0.5,
  }];
  player.youtube.partner.seeded = true;
  player.youtube.partner.settledAbs = undefined;
  const settled = settleYoutubePartnerWeek(player);
  const us = (settled.player.youtube.partner.audience || []).find(row => row.code === 'US');
  assert(us && us.share < 0.05, 'empty personal channel swung the mix to ' + (us && us.share));
  assert(us.share > 0, 'studio promo did not move the mix');
});

record('premiere', 'live chat moves opening hype', () => {
  const make = (mood, heat) => {
    const player = playerWith({ fanMood: mood, controversy: heat, subscribers: 20000, audienceTrust: 60 });
    const project = {
      id: 'film', name: 'Night Market', type: 'DIRECTOR_GIG', roleType: 'DIRECTOR', energyCost: 0, income: 0,
      projectDetails: {
        title: 'Night Market', genre: 'DRAMA', studioId: 'house', budgetTier: 'MID',
        hiddenStats: { scriptQuality: 60, directorQuality: 60, castingStrength: 60, distributionPower: 50, rawHype: 50, qualityScore: 80, prestigeBonus: 0 },
      },
    };
    player.commitments = [project];
    player.youtube.marketing = { film: { drops: [], campaignHype: 50, lastDropWeekAbs: 0, songs: [], songStreams: 0 } };
    return player;
  };
  const hot = runPremiere(make(92, 4), 'film', 'LIVE');
  const cold = runPremiere(make(8, 88), 'film', 'LIVE');
  const hotHype = hot.player.youtube.marketing.film.campaignHype;
  const coldHype = cold.player.youtube.marketing.film.campaignHype;
  assert(hotHype > coldHype + 5, 'chat did not separate hype ' + hotHype + ' vs ' + coldHype);
  const hotOpen = applyYoutubeReleaseBoost(hot.player, hot.player.commitments[0]);
  const coldOpen = applyYoutubeReleaseBoost(cold.player, cold.player.commitments[0]);
  assert(hotOpen && coldOpen && hotOpen.openingMultiplier > coldOpen.openingMultiplier, 'opening did not move');
});

record('settle', 'a second pass in the same week does not pay again', () => {
  const player = playerWith({
    isMonetized: true,
    subscribers: 5000,
    videos: [video({ id: 'grow', views: 4000, earnings: 80, weeklyHistory: [4000] })],
  });
  player.money = 1000;
  const first = settleYoutubePartnerWeek(player);
  const again = settleYoutubePartnerWeek(first.player);
  assert(again.player.money === first.player.money, 'money changed');
  assert(again.player.youtube.videos[0].views === first.player.youtube.videos[0].views, 'views changed');
  assert(again.logs.length === 0, 'second pass wrote logs');
  assert(again.player.youtube.partner.settledAbs === first.player.youtube.partner.settledAbs, 'cursor moved');
});

if (failures.length) {
  console.error(JSON.stringify({ checks, failures }, null, 2));
  process.exit(1);
}
console.log('youtube partner audit ok (' + checks + ' checks)');
`;

await writeFile(entry, source);
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  logLevel: 'silent',
});
await import(pathToFileURL(bundle).href);
await rm(tempDir, { recursive: true, force: true });
