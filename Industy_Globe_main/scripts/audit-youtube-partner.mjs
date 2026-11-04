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
import { applyYoutubeReleaseBoost } from '${root}services/youtubeMarketing.ts';
import {
  adDollars, buyPromotion, chargeYoutubeWallet, creditYoutubeWallet, ensureYoutubePartner,
  filmCollab, quotePromotion, runPremiere, scaleBrandPayout, settleYoutubePartnerWeek,
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
  assert(fresh.schemaVersion === 4, 'v3 did not move to 4');
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
