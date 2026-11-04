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
import { migrateYoutubeSave } from '${root}services/youtubeMarketing.ts';
import {
  PARTNER_SUBS, PARTNER_WATCH_HOURS, SHORT_RPM, adRevenue, collabOutlook, partnerReady,
  premiereProject, promoteVideo, quotePromotion, rpmFor, sponsorViewMultiplier, walletBalance, postCommunity,
} from '${root}services/youtubePartner.ts';

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
const video = (partial) => ({
  id: partial.id || 'v', title: partial.title || 'Cut', type: partial.type || 'VLOG', thumbnailColor: 'poster-hero',
  views: partial.views || 1000, likes: 10, earnings: 0, weekUploaded: 1, yearUploaded: 18, isPlayer: true,
  authorName: 'Asha', qualityScore: partial.qualityScore ?? 70, weeklyHistory: [1000], comments: [], country: partial.country || 'IN',
  isShort: partial.type === 'SHORT', uploadPlan: partial.uploadPlan, ...partial,
});

record('partner', 'needs subs and watch hours', () => {
  assert(PARTNER_SUBS === 1000 && PARTNER_WATCH_HOURS === 4000, 'real YPP bar');
  assert(!partnerReady(1000, 3999), 'hours short');
  assert(!partnerReady(999, 4000), 'subs short');
  assert(partnerReady(1000, 4000), 'both clears');
});

record('cpm', 'country and shorts differ', () => {
  const longIn = rpmFor(video({ country: 'IN', type: 'VLOG' }));
  const longUs = rpmFor(video({ country: 'US', type: 'VLOG' }));
  const short = rpmFor(video({ type: 'SHORT', isShort: true }));
  assert(longUs > longIn, 'US pays more than India');
  assert(short === SHORT_RPM && short < longIn, 'shorts pay less');
  assert(adRevenue(10000, video({ country: 'US', type: 'VLOG' })) > adRevenue(10000, video({ country: 'IN', type: 'VLOG' })), 'revenue follows CPM');
});

record('collab', 'mismatch still publishes and costs trust', () => {
  const easy = collabOutlook(5000, 8000, 10, 70);
  const messy = collabOutlook(500, 5_000_000, 70, 30);
  assert(easy.views > 0 && messy.views > 0, 'both collabs go out');
  assert(messy.backlash > easy.backlash, 'a bad fit draws backlash');
  assert(easy.subs > 0, 'the other audience crosses over');
});

record('promo', 'spend diminishes and a weak cut fatigues', () => {
  const small = quotePromotion(1000, 1, ['IN'], 70);
  const big = quotePromotion(8000, 1, ['IN'], 70);
  assert(big.views > small.views, 'more budget, more views');
  assert(big.views < small.views * 8, 'returns diminish');
  const tired = quotePromotion(5000, 2, ['US'], 30);
  assert(tired.fatigued, 'a weak video pushed hard fatigues');
  assert(tired.views < quotePromotion(5000, 2, ['US'], 80).views, 'the weak cut converts worse');
});

record('sponsor', 'a third ad in the window tires people', () => {
  const abs = 100;
  const ads = [0, 1, 2].map((index) => video({ id: 'ad' + index, uploadPlan: 'SPONSOR_HEAVY', weekUploaded: 48, yearUploaded: 2 }));
  assert(sponsorViewMultiplier(ads.slice(0, 2), abs) === 1, 'two sponsors are fine');
  assert(sponsorViewMultiplier(ads, abs) < 1, 'the third one shrinks reach');
});

record('wallet', 'personal cash pays for a promo and a broke wallet does not', () => {
  const player = clone(INITIAL_PLAYER);
  player.money = 500;
  player.youtube = { ...migrateYoutubeSave(player), videos: [video({ id: 'cut' })], activeChannel: 'personal' };
  assert(walletBalance(player, 'personal') === 500, 'personal wallet');
  const bought = promoteVideo(player, { videoId: 'cut', budget: 200, countries: ['IN'], weeks: 1 });
  assert(!bought.error, bought.error || '');
  assert(bought.player.money === 300, 'personal cash was charged');
  assert(bought.player.youtube.videos.find(item => item.id === 'cut').views > 1000, 'views were bought');
  assert(bought.player.youtube.watchHours > 0, 'bought views count as watch time');
  assert((bought.player.youtube.audienceMix || {}).IN > 0, 'the buy is in the country mix');
  const broke = promoteVideo(bought.player, { videoId: 'cut', budget: 5000, countries: ['IN'], weeks: 1 });
  assert(broke.error, 'a short wallet should refuse the buy');
});

record('wallet', 'studio ads bill the house', () => {
  const player = clone(INITIAL_PLAYER);
  player.money = 0;
  player.businesses = [{ id: 'house', name: 'Northlight', type: 'PRODUCTION_HOUSE', isActive: true, balance: 2000 }];
  player.youtube = { ...migrateYoutubeSave(player), activeChannel: 'studio', officialChannels: { studio: { handle: '@northlightstudios', subscribers: 0, totalViews: 0, lifetimeEarnings: 0, videos: [video({ id: 'housecut' })] } } };
  const bought = promoteVideo(player, { videoId: 'housecut', budget: 400, countries: ['US'], weeks: 1 });
  assert(!bought.error, bought.error || '');
  assert(bought.player.money === 0, 'personal cash stays put');
  assert(bought.player.businesses[0].balance === 1600, 'the house paid');
  const board = bought.player.youtube.officialChannels.studio;
  assert(board.subscribers > 0 && board.totalViews > 1000, 'the studio board records the bought audience');
  const mix = bought.player.youtube.audienceMix || {};
  assert((mix.US || 0) > (mix.IN || 0), 'a US buy shifts RPM away from India');
});

record('community', 'heat can trend without blocking the post', () => {
  const player = clone(INITIAL_PLAYER);
  player.youtube = { ...migrateYoutubeSave(player), controversy: 50, fanMood: 40 };
  const posted = postCommunity(player, 'The co-star cannot act.', 'HEAT');
  assert(!posted.error, posted.error || '');
  assert(posted.player.youtube.communityPosts.length === 1, 'the post is saved');
  assert(posted.player.youtube.controversy > 50, 'heat rose');
});

record('premiere', 'chat hype is stored on the campaign', () => {
  const player = clone(INITIAL_PLAYER);
  player.energy = { current: 40, max: 100 };
  player.youtube = { ...migrateYoutubeSave(player), fanMood: 80, controversy: 5, marketing: { gig: { drops: [], campaignHype: 50, lastDropWeekAbs: 0 } } };
  const premiered = premiereProject(player, 'gig');
  assert(!premiered.error, premiered.error || '');
  assert(premiered.player.youtube.marketing.gig.premiereHype > 50, 'a warm room lifts the premiere');
  assert(premiered.player.energy.current < 40, 'a premiere costs energy');
});

record('saves', 'v4 numbers survive the partner migration', () => {
  const player = clone(INITIAL_PLAYER);
  player.youtube = { ...player.youtube, schemaVersion: 4, subscribers: 22000, videos: [video({ id: 'keep', views: 900 })] };
  const migrated = migrateYoutubeSave(player);
  assert(migrated.schemaVersion === 5, 'schema 5');
  assert(migrated.subscribers === 22000, 'subs stay');
  assert(migrated.videos.some(item => item.id === 'keep'), 'the video stays');
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
