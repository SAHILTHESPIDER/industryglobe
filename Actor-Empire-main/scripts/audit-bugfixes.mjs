import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), 'actor-bugfix-audit-'));
const entry = join(tempDir, 'bugfix-audit-entry.ts');
const bundle = join(tempDir, 'bugfix-audit-bundle.mjs');

const source = `
import { INITIAL_PLAYER } from '${root}types.ts';
import { getPlayerLanguage } from '${root}services/i18n.ts';
import { PLATFORMS, genreBiasMatches } from '${root}services/streamingLogic.ts';
import { STUDIO_CATALOG } from '${root}services/studioLogic.ts';
import { NPC_DATABASE, applyNpcEconomy, captureNpcEconomy } from '${root}services/npcLogic.ts';
import { getEstimatedBudget, calculateWeeklyBoxOffice, sanitizeGross } from '${root}services/roleLogic.ts';
import { assignScheduledEvents, promotePendingEvent } from '${root}services/gameLoop.ts';
import { processWorldTurn } from '${root}services/worldLogic.ts';

const failures: { scope: string; item: string; error: string }[] = [];
let checks = 0;

const record = (scope: string, item: string, run: () => void) => {
  checks += 1;
  try {
    run();
  } catch (error) {
    failures.push({ scope, item, error: error instanceof Error ? error.message : String(error) });
  }
};

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

record('language', 'default_english', () => {
  assert(getPlayerLanguage(null) === 'en', 'missing player should default to English');
  assert(getPlayerLanguage({ settings: { language: 'en' } }) === 'en', 'English should stay English');
  assert(getPlayerLanguage({ settings: { language: 'nope' as any } }) === 'en', 'unknown language should default to English');
});

record('language', 'portuguese', () => {
  assert(getPlayerLanguage({ settings: { language: 'pt-BR' } }) === 'pt-BR', 'pt-BR should be respected');
});

record('genre', 'display_labels_match_enums', () => {
  assert(genreBiasMatches(PLATFORMS.NETFLIX.genreBias, 'THRILLER'), 'Thriller should match THRILLER');
  assert(genreBiasMatches(PLATFORMS.NETFLIX.genreBias, 'ACTION'), 'Action should match ACTION');
  assert(genreBiasMatches(PLATFORMS.NETFLIX.genreBias, 'ROMANCE'), 'RomCom should match ROMANCE');
  assert(genreBiasMatches(PLATFORMS.NETFLIX.genreBias, 'SCI_FI'), 'Sci-Fi should match SCI_FI');
  assert(genreBiasMatches(PLATFORMS.DISNEY_PLUS.genreBias, 'FANTASY'), 'Fantasy should match FANTASY');
  assert(genreBiasMatches(PLATFORMS.YOUTUBE.genreBias, 'HORROR'), 'Horror should match HORROR');
  assert(!genreBiasMatches(PLATFORMS.NETFLIX.genreBias, 'DOCUMENTARY'), 'unlisted genre should not match');
  assert(!genreBiasMatches(PLATFORMS.YOUTUBE.genreBias, 'DRAMA'), 'Indie is not a project genre');
});

record('catalog', 'youtube_and_universe_archetypes', () => {
  assert(STUDIO_CATALOG.YOUTUBE.valuation === 350, 'catalog YouTube valuation');
  assert(PLATFORMS.YOUTUBE.valuation === STUDIO_CATALOG.YOUTUBE.valuation, 'streaming YouTube valuation should match the catalog');
  assert(INITIAL_PLAYER.world.studios?.YOUTUBE.valuation === STUDIO_CATALOG.YOUTUBE.valuation, 'new-game studio valuation should match the catalog');
  assert(INITIAL_PLAYER.world.platforms?.YOUTUBE.valuation === PLATFORMS.YOUTUBE.valuation, 'new-game platform valuation should match the streaming profile');
  assert(INITIAL_PLAYER.world.platforms?.YOUTUBE.subscribers === PLATFORMS.YOUTUBE.subscribers, 'new-game YouTube subscribers should match the streaming profile');
  (['MARVEL_STUDIOS', 'DC_STUDIOS', 'LUCASFILM'] as const).forEach(id => {
    assert(INITIAL_PLAYER.world.studios?.[id].archetype === STUDIO_CATALOG[id].archetype, id + ' archetype should match the catalog');
    assert(STUDIO_CATALOG[id].archetype === 'UNIVERSE_ARCHITECT', id + ' should be a universe architect');
  });
});

record('budget', 'blockbuster_is_finite', () => {
  for (let i = 0; i < 20; i += 1) {
    const budget = getEstimatedBudget('BLOCKBUSTER');
    assert(Number.isFinite(budget) && budget >= 300_000_000 && budget < 500_000_000, 'blockbuster budget out of range: ' + budget);
  }
  const gross = calculateWeeklyBoxOffice(
    1,
    getEstimatedBudget('BLOCKBUSTER'),
    { scriptQuality: 70, directorQuality: 70, castingStrength: 80, distributionPower: 80, rawHype: 80, qualityScore: 75 } as any,
    0,
    40,
    'BLOCKBUSTER',
    'ACTION'
  );
  assert(Number.isFinite(gross) && gross > 0, 'blockbuster opening should be a positive finite gross');
  assert(sanitizeGross(Number.NaN) === 0, 'NaN gross should become 0');
  const guarded = calculateWeeklyBoxOffice(2, undefined as any, {} as any, Number.NaN, undefined, 'BLOCKBUSTER', 'ACTION');
  assert(Number.isFinite(guarded) && guarded >= 0, 'NaN previous gross should not stay NaN');
});

record('events', 'same_week_ceremonies_queue', () => {
  const globes = { id: 'globes', week: 2, type: 'AWARD_CEREMONY' as const, title: 'Golden Globes', data: { nominations: [{ category: 'Best Actor' }], awardDef: { type: 'GOLDEN_GLOBE' } } };
  const oscars = { id: 'oscars', week: 2, type: 'AWARD_CEREMONY' as const, title: 'Oscars', data: { nominations: [{ category: 'Best Picture' }], awardDef: { type: 'OSCAR' } } };
  const premiere = { id: 'premiere', week: 2, type: 'PREMIERE' as const, title: 'Premiere' };
  const life = { id: 'life', week: 2, type: 'LIFE_EVENT' as const, title: 'Party' };
  const watching = { id: 'home', week: 2, type: 'AWARD_CEREMONY' as const, title: 'Emmys', data: { nominations: [] } };
  const assigned = assignScheduledEvents(null, [], [], [globes, watching, oscars, premiere, life]);
  assert(assigned.pendingEvent?.id === 'globes', 'first attended ceremony should open');
  assert(assigned.pendingEventQueue.map(event => event.id).join(',') === 'oscars,premiere', 'later slot events should queue in order');
  assert(assigned.pendingEvents.map(event => event.id).join(',') === 'life', 'life events should stay on their own queue');
  assert(!assigned.pendingEventQueue.some(event => event.id === 'home'), 'a ceremony without nominations is not a player event');
  const next = promotePendingEvent({ pendingEvent: null, pendingEventQueue: assigned.pendingEventQueue });
  assert(next.pendingEvent?.id === 'oscars', 'completing an event should promote the next one');
  assert(next.pendingEventQueue.map(event => event.id).join(',') === 'premiere', 'the rest of the queue should remain');
  const held = assignScheduledEvents(globes, [], [], [oscars]);
  assert(held.pendingEvent?.id === 'globes', 'an event already on screen should stay there');
  assert(held.pendingEventQueue[0]?.id === 'oscars', 'the new ceremony should wait behind it');
});

record('npc', 'economy_is_per_save', () => {
  applyNpcEconomy(null);
  const base = captureNpcEconomy();
  const npc = NPC_DATABASE[0];
  const slotA = { [npc.id]: { fame: 11, netWorth: 1_000_000_000_000 } };
  const slotB = { [npc.id]: { fame: 22, netWorth: 50 } };
  applyNpcEconomy(slotA);
  assert(npc.netWorth === 1_000_000_000_000 && npc.stats?.fame === 11, 'slot A should apply');
  applyNpcEconomy(slotB);
  assert(npc.netWorth === 50 && npc.stats?.fame === 22, 'slot B should replace slot A');
  applyNpcEconomy(null);
  assert(npc.netWorth === base[npc.id].netWorth && npc.stats?.fame === base[npc.id].fame, 'an old save without a snapshot should use the base roster');

  const playerA = clone(INITIAL_PLAYER);
  delete (playerA.world as any).npcEconomy;
  const resultA = processWorldTurn(playerA);
  assert(resultA.world.npcEconomy && Object.keys(resultA.world.npcEconomy).length === NPC_DATABASE.length, 'a week should store every NPC');
  const storedA = resultA.world.npcEconomy[npc.id].netWorth;
  const playerB = clone(INITIAL_PLAYER);
  playerB.world.npcEconomy = { [npc.id]: { fame: 4, netWorth: 1_000_000_000_000 } };
  const resultB = processWorldTurn(playerB);
  assert(resultA.world.npcEconomy[npc.id].netWorth === storedA, 'simulating another slot should not rewrite the first snapshot');
  assert(Math.abs(resultB.world.npcEconomy[npc.id].netWorth - 1_000_000_000_000) < 20_000_000_000, 'slot B should keep its own wealth');
  applyNpcEconomy(resultA.world.npcEconomy);
  assert(npc.netWorth === storedA, 'reloading slot A should restore its snapshot');
  applyNpcEconomy(null);
});

if (failures.length > 0) {
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
