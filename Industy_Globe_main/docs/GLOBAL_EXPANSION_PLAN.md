# Global film-industry expansion plan

This is an investigation and design plan. It does not change gameplay. The goal is to turn Actor Empire from a Hollywood career sim into a sim where the player's career, studios, box office, awards, talent, news, market trends, and streaming can operate across several world film industries.

The recommended shape is: **one career, many industries**. The player has a home industry, fame that is stronger at home and weaker abroad, and projects that can travel. Hollywood stays the default so every existing save keeps working.

## What already exists that this plan should reuse

A few systems already look global, and they are the right hooks. They do not yet change the simulation.

| Hook | Where | What it actually does today |
| --- | --- | --- |
| Filming cities on a world map | `views/lifestyle/business/GreenlightWizard.tsx`, `mockLocations` (about lines 1447–1488) | Los Angeles, Mumbai, Lagos, Seoul, Tokyo, Beijing, Hong Kong, London, Paris, Rio, and others. Each city has a USD cost and a quality bonus. The city is a shoot location, not a market. |
| Release footprint | `types.ts` `ReleaseScale` (`GLOBAL` / `MASS` / `LIMITED`) and `ScreeningStrategy` (`REGIONAL` / `NATIONAL` / `INTERNATIONAL`) | `generateProjectDetails` in `services/roleLogic.ts` sets `releaseScale` from budget tier. `ReleaseWizard` lets the player pick a screening strategy and stores it on the project. Neither value is read by `calculateWeeklyBoxOffice`. |
| Festivals | `services/worldLogic.ts` `FESTIVALS` | Sundance, Cannes, and TIFF already exist. TIFF's description calls it "The Oscar Launchpad." |
| Country talent packs | `services/modTalentData.ts`, `services/npcLogic.ts` `GLOBAL_ACTOR_PACKS`, Settings → External Talent | 1,046 catalog rows across 21 countries (about 50 each), plus 210 hand-written `globalActor(...)` entries (10 per those same countries). Packs are opt-in mods stored on the save. They are not industries. |
| Studio genre heat | `services/marketTrends.ts`, `services/studioSpecialization.ts` | Demand is a seeded function of genre and week. A production house stores `studioState.marketTrends` and `genreReputation`. There is one market, not one per region. |
| UI language | `services/i18n.ts` | English and Brazilian Portuguese string tables exist. Gameplay copy, news, and titles stay English, and the language getter is locked to English (see bugs). |

Countries present in the talent catalog: United States, Canada, Mexico, United Kingdom, France, Germany, Spain, Italy, Sweden, Poland, Russia, India, Australia, Philippines, Indonesia, Nigeria, Brazil, Ireland, Netherlands, Türkiye, South Africa.

Countries the owner named that are **not** in that catalog: South Korea, China, Japan. Tollywood is also not split out from the single India pack. Mumbai, Seoul, Tokyo, Beijing, and Hong Kong exist only as shoot locations. A Korean, Chinese, Japanese, or Tollywood industry needs new talent, studios, and award data. Bollywood, Nollywood, and a European cluster can start from data the repo already has.

---

## 1. Where the game assumes Hollywood or a single industry

There is no `Industry` type. "The industry" is one shared `WorldState`, one fame number, one dollar ledger, and four award shows.

### Types and the save shape

`types.ts` is the contract every save is cloned into.

- `AwardType` (line 25) is the closed union `'OSCAR' | 'GOLDEN_GLOBE' | 'EMMY' | 'BAFTA'`.
- `StudioId` (line 23) and `PlatformId` (line 44) name US studios and streamers: Paramount, Warner Bros., Universal, HBO, Marvel, DC, Lucasfilm, Netflix, Apple TV+, Disney+, Hulu, YouTube.
- `UniverseId` (line 24) is `MCU`, `DCU`, and `SW`.
- `Stats.fame` (line 90) is one number from 0 to 100. There is no regional fame.
- `Player.money`, salaries, budgets, loans, and business balances are bare numbers with no currency code.
- `Award` (lines 576–585) stores show type, category, year, outcome, and project. No industry, no territory.
- `IndustryProject` (lines 1156–1173) is the world-sim movie: one `studioId`, one `boxOffice`, one lead. No home market and no territory split.
- `WorldState` (lines 1320–1330) is a single list of projects, one `trendingGenre`, one `awardHistory`, one studio map, and one platform map.
- `NPCActor` (lines 1010–1030) has no `country`, `homeIndustry`, or language. Country exists only on the pre-NPC `RealCeleb` object inside `npcLogic.ts` and is dropped in `createNPCFromCeleb` (lines 512–546). The fallback bio is `"Hollywood Icon."`
- `LocationDetails.region` (lines 509–518) is a string. It is not an industry id.
- `INITIAL_PLAYER` (lines 1678–1771) builds a Hollywood world: MCU / DCU / Star Wars, the US studio list, and the log line `"Welcome to Hollywood. Your journey starts today."`

Saves are the whole `Player` object. `services/storage.ts` writes it to IndexedDB database `ActorEmpireDB`, store `saves`, `DB_VERSION = 1`. There is no `schemaVersion` on the player. Old fields are filled in by hand:

- `App.tsx` hydration, starting around line 825, merges `world.universes` and `world.platforms` over `INITIAL_PLAYER.world`, then forces `settings.language = 'en'` (line 862).
- `processGameWeek` in `services/gameLoop.ts` (around lines 696–746) creates a world, `extraNPCs`, and stocks when they are missing.

That hydration is the migration point. IndexedDB itself should stay at version 1. A new `player.flags.schemaVersion` (or a top-level `schemaVersion`) is enough, because the save is one JSON-like object.

### Studios, universes, and money

`services/studioLogic.ts` `STUDIO_CATALOG` is thirteen US companies. `selectStudioForProject` scores every studio in that catalog for every audition. `INITIAL_PLAYER.world.studios` repeats the same list with live valuation, cash, and reputation.

`services/universeLogic.ts` simulates MCU, DCU, and Star Wars releases into the same `world.projects` array.

`services/stockLogic.ts` `INITIAL_STOCKS` is a US/European luxury ticker list (AAPL, NFLX, DIS, WBD, PARA, CMCSA, plus Nike, LVMH, Toyota, Ferrari). Studio-linked stocks point at Hollywood `StudioId`s.

`services/formatUtils.ts` `formatMoney` always prefixes `$`. `services/lifeEventLogic.ts` formats rewards with `Intl.NumberFormat('en-US', { currency: 'USD' })`. `GreenlightWizard.tsx` labels the budget field `USD` (around line 4750). `views/mobile/BoxOfficeApp.tsx` formats gross as `$…M`.

`getEstimatedBudget` in `services/roleLogic.ts` (lines 328–333) returns roughly $0.5–5M, $20–80M, or $120–300M. `calculateProjectPay` multiplies role pay off those same tiers. `BOX_OFFICE_CAPS` (lines 818–824) caps a high-budget run at a $350M opening and a $1.6B total, with a `BLOCKBUSTER` tier that can reach $3B. Those numbers are global Hollywood blockbuster math. A Nollywood or mid-size European film that used the same function would be off by an order of magnitude.

### Awards

`services/awardLogic.ts` is a Hollywood season:

- `AWARD_CALENDAR` (lines 15–20): Golden Globes (ceremony week 2, invite week 50), BAFTA (week 4), Oscars (week 10), Emmys (week 38).
- `AWARD_SHOW_DB` hardcodes categories, prestige, and blurbs. The Golden Globes blurb still says "Hollywood Foreign Press Association."
- `checkAwardEligibility` (line 190) scores the player's last-year projects. Week 10 adds a drama/thriller bonus and uses an 85 threshold. Week 38 is TV-only. The invite sender in `gameLoop.ts` (line 3339) is always `'The Academy'`.
- `generateFullBallot` fills nominees from `player.world.projects` and `NPC_DATABASE`, with no region filter.
- `WorldState.awardHistory` is one list of `{ year, type, winners }`.

The ceremony UI in `views/mobile/ImdbApp.tsx` and `views/RedCarpetEvent.tsx` reads that same calendar. Red-carpet copy places the event in Los Angeles (`RedCarpetEvent.tsx` around lines 969 and 1056).

### Talent and NPC generation

Three pools exist, and only the first one drives the world:

1. **Base cast**, built once by `generateNPCs()` and exported as the module singleton `NPC_DATABASE` (`npcLogic.ts` line 717). It is the hand-written `REAL_ACTORS` and `REAL_DIRECTORS` (mostly Hollywood names, no country) plus 40 random directors and 50 random actors. Random bios include `"Chasing dreams in LA."` Names come from a short English list (`Kai`, `Luna`, `Stone`, `Wilder`, …).
2. **Country packs**, `GLOBAL_TALENT_EXPANSION`. Enabling a pack in `views/SettingsPage.tsx` `enableActorPack` appends NPCs to `player.flags.extraNPCs` and records `flags.enabledGlobalActorPacks`. Casting in `GreenlightWizard` and `StudioPage` does see `extraNPCs` through `getAvailableTalent`. Forbes, Instagram, and X also merge them in.
3. **World simulation does not.** `generateIndustryProject` and the weekly NPC economy in `services/worldLogic.ts` read and **mutate** `NPC_DATABASE` only. News headlines pick from `NPC_DATABASE`. Award ballots look up `NPC_DATABASE` by id and fall back to a coin flip when the id is missing, which is what happens for pack talent.

So Shah Rukh Khan can be cast in the player's movie after the India pack is enabled, and he can appear on Forbes, but he will not star in simulated Bollywood releases, and his country is not on the `NPCActor`.

Directors invented for auditions are a mash of Hollywood names (`roleLogic.ts` `generateProjectDetails`, lines 432–434): first names like Christopher, Greta, Quentin, Sofia; last names like Nolan, Gerwig, Tarantino, Villeneuve.

`services/famousMovieLogic.ts` `FAMOUS_MOVIE_DB` is a Hollywood canon list (Godfather, Titanic, Oppenheimer, Dark Knight, …). Parasite is the clear non-US title, and it is filed under `ARTISAN_PICTURES`. TV fame is Friends, Stranger Things, Breaking Bad, and similar.

### Box office, calendars, and markets

`calculateWeeklyBoxOffice` (`roleLogic.ts` lines 850–954) produces one weekly gross. Inputs are budget, hidden stats, buzz, genre multiplier, format, a single `marketDemand`, and studio genre reputation. Genre multipliers treat superhero and sci-fi as the money genres and drama, romance, horror, and documentary as smaller. That is a Hollywood-tentpole curve. It is the wrong curve for an industry whose hits are musicals, star-driven romances, or local comedies.

`GENRE_MULTIPLIERS` and `BOX_OFFICE_CAPS` are global constants.

`worldLogic.ts` `CALENDAR_EVENTS` (lines 20–28) boosts the one market for New Year, Valentine's Day, summer, July 4th, Halloween, Thanksgiving, and Christmas. Rival movies from `generateIndustryProject` use Hollywood studios, Hollywood budget tiers, and a single `boxOffice`. `processWorldTurn` keeps `world.projects` trimmed to the last 100 (lines 288–291).

`createMarketTrends` (`marketTrends.ts`) hashes `genre + season`. `gameLoop.ts` (around line 2906) applies that demand only to the player's theatrical release, and only from that release's own production house. Rival gross in `worldLogic.ts` ignores market trends. `WorldState.trendingGenre` is stored and initialized to `ACTION`, and it is not what the trend math uses.

`ReleaseWizard.tsx` `SCREENING_STRATEGIES` (lines 28–32) already describes the fantasy this expansion wants:

- Regional: 500 screens, 35% exhibitor cut
- National: 3,000 screens, 45% cut
- International mass: 12,000 screens, 55% cut

The choice is shown on the project dashboard and then ignored by the gross formula. Campaign items are also Hollywood-shaped: "Times Square Billboards", "TV Talk Show Tour."

### Streaming

`services/streamingLogic.ts` `PLATFORMS` is Netflix, Apple TV+, Disney+, Hulu, and YouTube, with audience, prestige, and payout multipliers. `determineStreamingAcquisition` tries to bias by genre, but `genreBias` uses display strings (`'Thriller'`, `'Sci-Fi'`, `'RomCom'`) while `project.genre` is the enum (`'THRILLER'`, `'SCI_FI'`). The genre bonus never matches. See the bug list.

There is no territory. A streaming release is global by omission.

### News, social, lifestyle

`services/newsLogic.ts` templates are English (and a parallel Portuguese block later in the file) and name Hollywood, West Hollywood, Warner Bros., and Oscar buzz. `views/mobile/NewsApp.tsx` classifies stories with regexes for `oscar|emmy|bafta|globes` and US streamer names. The masthead string is `news.tagline`: "Hollywood's Daily" (`services/i18n.ts` line 42; Portuguese line 779 is "Diário de Hollywood").

`services/xLogic.ts` seeds `#Hollywood`, `#The Academy`. `services/youtubeLogic.ts` has "Chaos Day In Hollywood", "Vlog: A Day in Los Angeles", "Visiting the Hollywood Sign." `services/instagramLogic.ts` uses "Hollywood group chat." `services/geminiService.ts` flavor lines include "Just another week in Hollywood."

`services/lifestyleLogic.ts` homes are Silver Lake, West Hollywood, Hollywood Hills, Beverly Hills, Malibu, Bel Air. `ProductionHouseGame.tsx` (around line 670) labels a major studio "Hollywood, CA" and anything else "Burbank, CA." The X profile location is hard-coded "Los Angeles, CA" (`views/mobile/XApp.tsx` around line 683). The IMDb-style bio calls the player "A rising star in Hollywood" (`views/mobile/ImdbApp.tsx` around line 975).

### Summary of the assumption

Every system that should vary by industry currently reads one global table or one global number: studios, awards, fame, currency, box-office caps, calendar, news voice, and the NPC database. The pieces that already vary by place (shoot city, screening strategy, country talent packs) are either cosmetic or opt-in mods sitting beside the sim.

---

## 2. Proposed data model

Add an industry id and a catalog. Keep dollars as the save's unit of account. Attach industries to people, companies, films, awards, and markets. Derive a single global fame number so old formulas keep running.

### Industry catalog

New module, suggested path `services/industryCatalog.ts`. Data, not logic.

```ts
type IndustryId =
  | 'HOLLYWOOD'
  | 'BOLLYWOOD'
  | 'TOLLYWOOD'
  | 'NOLLYWOOD'
  | 'EUROPEAN'
  | 'KOREAN'
  | 'CHINESE'
  | 'JAPANESE';

interface FilmIndustry {
  id: IndustryId;
  name: string;                 // "Bollywood"
  homeCity: string;             // "Mumbai"
  languages: string[];          // ["hi", "en"]
  currency: { code: string; symbol: string; perUsd: number }; // display only
  marketScale: number;          // multiplies budget caps and gross caps
  theatricalWeight: number;     // share of a "home" release that is theatrical
  streamingWeight: number;
  genreMultipliers: Partial<Record<Genre, number>>;
  calendar: { week: number; name: string; impact: number; genres?: Genre[] }[];
  festivalIds: string[];
  awardShowIds: string[];
  studioIds: string[];
  platformIds: string[];
  crossoverOpenness: number;    // 0–1, how easily outside stars open films here
  localFameWeight: number;      // how much home fame beats imported fame
}
```

`marketScale` is the important balance knob. Hollywood stays at `1`. A first pass can put Bollywood near `0.45`, a grouped European industry near `0.35`, Nollywood near `0.12`, and leave Korean / Chinese / Japanese at `0` (unreleased) until they have studios and talent. These are starting points for tuning, not research claims.

Currency on the catalog is a **display** rate (`₹`, `₦`, `€`, `₩`, `¥`). `Player.money`, contracts, and gross stay USD numbers, which is what every save already stores. Showing a converted figure in industry UI is enough. Converting the ledger would rescale mansions, loans, and studio valuations and would break old saves.

### How entities point at an industry

| Entity | New fields | Rule |
| --- | --- | --- |
| `Player` | `homeIndustryId`, `fameByIndustry: Partial<Record<IndustryId, number>>`, `languages: string[]` | `stats.fame` becomes the public global fame: a weighted blend, capped at 100. Existing fame math keeps reading `stats.fame`. |
| `NPCActor` | `homeIndustryId`, `country?`, `fameByIndustry?`, `languages?` | Casting, news, and rival leads filter on this. |
| `Studio` and `NPCStudioState` | `homeIndustryId` | A studio greenlights in its home industry. Co-productions are a later flag, `partnerIndustryIds`. |
| `Business` (player production house) | `homeIndustryId` | Chosen at founding. Shoot cities stay a separate `LocationDetails`. |
| `ProjectDetails`, `PastProject`, `IndustryProject`, `ActiveRelease` | `originIndustryId` | The market the film was made for. |
| `ActiveRelease` | `territories?: TerritoryRun[]` | Optional. Absent means "one gross, the way saves work today." |
| `Award` and `AwardHistoryEntry` | `showId: string`, optional `industryId` | Keep `type: AwardType` so old records still load. New shows use `showId`. |
| `WorldState` | `industries: Record<IndustryId, IndustryMarketState>` | Per-industry project list, trending genres, and award history. The old `projects` and `awardHistory` arrays remain as the Hollywood mirror during migration. |
| `Script` | optional `originIndustryId`, `language` | Title generators can key off this later. |

```ts
interface TerritoryRun {
  industryId: IndustryId;
  mode: 'HOME' | 'DUB' | 'SUBTITLE' | 'COPRODUCTION';
  weeklyGross: number[];
  totalGross: number;
  status: 'RUNNING' | 'FINISHED';
}

interface IndustryMarketState {
  trendingGenre: Genre;
  projects: IndustryProject[];
  awardHistory: AwardHistoryEntry[];
  festivals: string[];
}
```

Fame for a casting check in industry `I`:

```
local = fameByIndustry[I] ?? 0
imported = stats.fame * industry.crossoverOpenness
effective = max(local, imported * industry.localFameWeight)
```

A Hollywood star can open a Bollywood co-production without being a local legend. A local star still wins a home-industry audition. Global fame on Forbes can stay `stats.fame`, updated whenever a territory run pays out a small spillover into other industries (for example 15% of a home-industry fame gain, 40% into the origin industry of a dubbed hit).

### Awards become shows, not a four-value union

Keep `AwardType` working. Add a catalog:

```ts
interface AwardShowDef {
  id: string;                  // "OSCAR", "FILMFARE", "BAFTA"
  legacyType?: AwardType;      // set for the four shows that already exist
  industryId: IndustryId;
  name: string;
  ceremonyWeek: number;
  inviteWeek: number;
  medium: 'MOVIE' | 'SERIES' | 'BOTH';
  prestige: number;
  categories: { id: string; kind: 'PICTURE' | 'ACTOR' | 'DIRECTOR' | 'CRAFT'; lead?: boolean }[];
  genreBias?: Genre[];
}
```

Oscars, Globes, BAFTA, and Emmys are Hollywood (BAFTA can later move to `EUROPEAN` without changing its id). New shows get new ids. `checkAwardEligibility` should take a `AwardShowDef` instead of a week number. The week-number `if (week === 10)` branches are the part that will not survive a fifth show.

### Markets

`createMarketTrends(week)` gains an `industryId` argument and folds it into the existing hash seed. Each production house keeps storing the snapshot it already stores. Rival releases in an industry use that industry's scale, genre multipliers, and calendar, then write an `IndustryProject` onto that industry's list.

`calculateWeeklyBoxOffice` gains an optional scale argument, defaulting to `1`, so Hollywood numbers do not move until a designer changes the catalog.

Screening strategy becomes the territory picker:

- `REGIONAL` and `NATIONAL` open the origin industry only, with the screen counts and cuts the wizard already shows.
- `INTERNATIONAL` opens the origin industry plus other industries whose `crossoverOpenness` is high enough, each as a `TerritoryRun` with a dub or subtitle penalty.

Until territory runs exist, the function can keep returning one number: `homeGross * (strategy === 'INTERNATIONAL' ? 1.35 : strategy === 'REGIONAL' ? 0.55 : 1)`. That makes the wizard honest before the full split ships.

### Save migration

Add `schemaVersion: 1` for "this save has been tagged with industries." Run it from the existing hydration in `App.tsx` and from the top of `processGameWeek`, so a save that skips the menu still migrates. The function must be idempotent.

For a save with no `homeIndustryId`:

1. Set `schemaVersion` to 1 and `homeIndustryId` to `HOLLYWOOD`.
2. Set `fameByIndustry.HOLLYWOOD` from `stats.fame`. Leave `stats.fame` as it is.
3. Set `languages` to `['en']`.
4. Stamp `originIndustryId: 'HOLLYWOOD'` and `homeIndustryId: 'HOLLYWOOD'` onto projects, releases, past projects, studios, businesses, universes, and stock-linked studios when the field is missing.
5. Copy `world.projects` and `world.awardHistory` into `world.industries.HOLLYWOOD`. Leave the original arrays in place. Readers can prefer the industry slice and fall back to the legacy array.
6. Map `flags.extraNPCs` by `flags.enabledGlobalActorPacks`: India pack to `BOLLYWOOD`, Nigeria pack to `NOLLYWOOD`, European country packs to `EUROPEAN`, Brazil stays a talent pool inside `EUROPEAN` or a later `BRAZILIAN` id, and the US pack to `HOLLYWOOD`. NPCs with no pack stay `HOLLYWOOD`.
7. Do not rescale `money`, budgets, gross, valuations, or award years.
8. Do not invent Korean, Chinese, Japanese, or Tollywood rows in old saves. Those industries appear when their catalog entries are enabled.

New games write the same fields from the start, with the player picking a home industry once that choice exists. Until that screen exists, new games are Hollywood too.

Back up nothing by hand: the migration only adds fields. A save from before this work still loads if the new code is reverted, because old readers ignore unknown fields. Avoid renaming `Award.type` or `stats.fame`.

---

## 3. Gameplay that the current code can actually support

These are ordered by how much of the current sim they reuse.

### Home industry and moving

The creation flow in `App.tsx` (`handleStart` around the `INITIAL_PLAYER` clone) can ask for a home industry the same way it asks for a name. The first playable choices should be Hollywood, Bollywood, and Nollywood, because those have talent rows and a shoot city. European can follow as one industry with London, Paris, Berlin, Rome, and Madrid already on the map. Korean, Chinese, Japanese, and Tollywood should stay locked in the catalog until a content pass adds names, studios, and a show.

Moving is a mid-game action, not a new character. A "relocate" life event spends money, sets `homeIndustryId`, and starts local fame low. `services/lifeEventLogic.ts` already runs paid life events. The player's Hollywood fame remains and helps only through `crossoverOpenness`. Agents and the studio roster stay; auditions start coming from the new industry's studios via `selectStudioForProject`.

### Regional fame

`stats.fame` already feeds pay, followers, casting bias (`Studio.castingBias`), and box office (`fameMultiplier` on hidden stats, applied in `calculateWeeklyBoxOffice`). The change is to feed that formula the effective fame from the section above. A lead in a home-industry hit should grant a large `fameByIndustry[home]` gain and a small `stats.fame` gain. A dubbed hit abroad grants a smaller foreign gain. Forbes can keep ranking on net worth, which is already global.

### Crossover projects

`ProjectSubtype` already includes `UNIVERSE_CROSSOVER`, and `Script.connectedProjectIntent` already includes `'CROSSOVER'`. Use a simpler, non-franchise meaning as well: a project whose cast or financing includes a second `industryId`.

A crossover is available when the player has enough fame in two industries, or hires a star whose `homeIndustryId` differs from the film's. Effects that fall out of systems that already exist:

- Budget uses the larger industry's scale, with a premium, because the Greenlight cost field is already a number.
- Quality gets a small bonus if the shoot city is in the partner industry (`mockLocations` quality is already per city).
- Each partner industry gets a `TerritoryRun` without the dub penalty.
- News can use the existing `{Title}` templates with a new crossover headline list.

MCU / DCU / Star Wars should stay Hollywood franchises. Regional industries can later get one franchise universe each by cloning `Universe` with a new id. That is a content task, not a requirement for the first crossover.

### Dubbing and international release

The screening step is the player-facing switch. Wire `screeningStrategy` into the gross path that already runs in `gameLoop.ts` around line 2903.

- National and regional: one territory, the origin industry, using that industry's caps and calendar.
- International: origin territory plus automatic foreign territories. Foreign gross is `homeFormula * marketScale * openness * languagePenalty`. Dubbing costs money up front (a campaign item next to the ones in `ReleaseWizard`) and lowers the penalty. Subtitles are cheaper and penalize harder, especially in industries with low `crossoverOpenness`.

Festivals already sit on the release calendar. Cannes should matter more for European and crossover prestige. TIFF can keep feeding the Hollywood awards path. Add festival ids onto the industry catalog rather than a new system.

### Regional awards

The ceremony pipeline is already data-shaped: invite week creates nominations and a ballot, ceremony week opens `RedCarpetEvent`, winners land in `awardHistory`. The part that is Hollywood-specific is the week `if` chain and the four-value union.

First new show should be one the India pack can fill, for example a Bollywood feature show on a week that does not collide with weeks 2, 4, 10, or 38. Eligibility looks at projects with `originIndustryId === 'BOLLYWOOD'` released in the last 52 weeks, using the same quality-plus-rating score. Prestige from a regional win raises regional fame more than global fame. An Oscar still raises global fame the most, which preserves the current power of `AWARD_SHOW_DB.OSCAR.prestige === 3`.

BAFTA can stay a Hollywood-season precursor at first, which is how the code treats it today ("BAFTA replaces Tony and acts as a precursor"). Moving it to the European industry is a later, explicit change.

### News, trends, and streaming

`newsLogic.ts` already has lines about international markets and regional crossover hits. Those templates should take `{Industry}` and `{City}` once projects know their origin. The News app's award regex should also look for the show name on the item, which means storing `showId` on the news item instead of guessing from the headline.

Market trends need the industry id in the seed and that industry's `genreMultipliers` applied when a project is priced. A Bollywood week can run hot on romance and musical while Hollywood runs hot on superhero, using the same `GenreMarketTrend` object the development lab already renders.

Streaming stays the global platforms at first. A territory run can send a fraction of gross to the existing platform bid (`determineStreamingAcquisition`) as "platform rest of world." Regional streamers are a later catalog addition, same shape as `PlatformProfile`, tagged with `homeIndustryId`.

### What not to build in the first playable slice

- A second currency ledger.
- Rewriting MCU logic into every industry.
- Player-authored languages. `pt-BR` strings can wait until `getPlayerLanguage` is unlocked. Industry flavor is data on the catalog, not a full localization.
- Real celebrity likeness rules. The country packs already use real names. New industries should follow whatever policy those packs already follow, and generated extras should use local name tables the way `generateRandomNPC` uses English ones.

---

## 4. Phased roadmap

Each phase is one pull request, shippable on its own, with Hollywood behavior unchanged unless the phase says otherwise. Do the bug-shaped prerequisites before adding a second industry's content.

### PR 1 — Industry catalog and silent migration

**Scope.** Add `IndustryId`, `FilmIndustry`, and `INDUSTRY_CATALOG` with Hollywood fully filled in and the other ids present but marked `enabled: false` except where noted in later PRs. Add optional fields on the types listed in section 2. Add `migrateToIndustries(player)` and call it from `App.tsx` hydration and `processGameWeek`. Set `schemaVersion`. No UI change. New games still start in Hollywood.

**Files.** `types.ts`, new `services/industryCatalog.ts`, new `services/migrateIndustries.ts`, `App.tsx`, `services/gameLoop.ts`.

**Risk.** Low if the migration only adds fields and is idempotent. Highest risk is the hydration merge in `App.tsx` overwriting a migrated `world` with `INITIAL_PLAYER.world`. The migration has to run after that merge. Add a unit-style check that a fixture save without the new fields gains `homeIndustryId: 'HOLLYWOOD'` and keeps `money` and `awards` identical.

### PR 2 — Put NPC state on the save

**Scope.** Stop writing fame and net worth onto the `NPC_DATABASE` singleton. Copy the base cast into `world.npcRoster` (or keep using `flags.extraNPCs` for everyone) the first time a save migrates, and have `processWorldTurn` update that roster. Stamp `homeIndustryId` from country packs. Casting, Forbes, and the world sim read the same roster.

**Files.** `services/npcLogic.ts`, `services/worldLogic.ts`, `services/newsLogic.ts`, `services/awardLogic.ts`, `services/universeLogic.ts`, `views/mobile/ForbesApp.tsx`, `views/SettingsPage.tsx`.

**Risk.** Medium. This is the fragile core (bug 1 and bug 2 below). Two saves in one session currently share mutated NPC wealth. After this PR they must not. Pack NPCs that were only in `flags.extraNPCs` need stable ids so re-enabling a pack does not duplicate them. `enableActorPack` already filters on id and name; keep that check.

### PR 3 — Make the release wizard affect money

**Scope.** Pass `screeningStrategy` and `originIndustryId` into `calculateWeeklyBoxOffice`. Hollywood scale stays `1`. Regional and international change the single gross and the exhibitor cut using the numbers already shown in `ReleaseWizard`. Still one `totalGross`. This makes an existing player choice real before territories exist.

**Files.** `services/roleLogic.ts`, `services/gameLoop.ts`, `views/lifestyle/business/ReleaseWizard.tsx`, `views/lifestyle/business/components/ProjectDashboardModal.tsx`.

**Risk.** Medium, because it changes box office for new releases. Default missing strategy to `NATIONAL` so old in-progress releases do not jump. Do not retune `BOX_OFFICE_CAPS` in this PR.

### PR 4 — Per-industry markets and calendars, Hollywood only in practice

**Scope.** `createMarketTrends(week, industryId)`. Store trends on the industry market state. `CALENDAR_EVENTS` move onto the Hollywood catalog entry; the function that reads them takes an industry id. Rival generation in `generateIndustryProject` takes an industry and uses its studios and scale. With only Hollywood enabled, results stay close to today.

**Files.** `services/marketTrends.ts`, `services/worldLogic.ts`, `services/industryCatalog.ts`, `views/lifestyle/business/DevelopmentLab.tsx`.

**Risk.** Medium. The trend hash will change if the seed gains a suffix, which would reshuffle the current Hollywood market. Keep the Hollywood seed identical to today's `${genre}:${season}` so this PR is behavior-neutral, and use `${industryId}:${genre}:${season}` only for other industries.

### PR 5 — Player home industry, Bollywood as the second live industry

**Scope.** Enable `BOLLYWOOD` in the catalog: Mumbai as home city, India pack as the default talent (not a mod), a small studio list, market scale under 1, romance/musical/action bias, and a calendar that is not July 4th. Character creation can pick Hollywood or Bollywood. Auditions and rival films come from the home industry's studios. Fame gains go to `fameByIndustry`. Global `stats.fame` still updates with a reduced spillover. News headlines gain an industry token for those films.

**Files.** `views/CreationMenu.tsx` or the start path in `App.tsx`, `services/studioLogic.ts`, `services/roleLogic.ts`, `services/worldLogic.ts`, `services/newsLogic.ts`, `services/industryCatalog.ts`.

**Risk.** High for balance, low for old saves if Hollywood remains the default and old saves are stamped Hollywood. Play a new Bollywood career for several in-game years and a migrated Hollywood save side by side. Studio valuations and Forbes should not mix the two scales without labeling them.

### PR 6 — Regional fame, crossover casting, and moving

**Scope.** Casting and pay use effective fame. A project may list one partner industry when a hired lead's home industry differs. Relocate life event. Shoot-city quality bonus stacks when the city matches the origin or partner industry.

**Files.** `services/npcLogic.ts` (`getAvailableTalent`, fame multiplier), `services/roleLogic.ts`, `services/lifeEventLogic.ts`, `views/lifestyle/business/GreenlightWizard.tsx`, `types.ts`.

**Risk.** Medium. Fame is on the hot path for auditions and box office. Keep `stats.fame` as the value old UI reads, and update it whenever `fameByIndustry` changes, so the home screen does not go stale.

### PR 7 — Territory gross, dubs, and subtitles

**Scope.** International screening creates `TerritoryRun`s. Add dub and subtitle campaign items beside the existing campaign list. Box office UI shows home and foreign gross. The legacy `totalGross` remains the sum, so outcome tiers and royalties keep working.

**Files.** `services/roleLogic.ts`, `services/gameLoop.ts`, `views/lifestyle/business/ReleaseWizard.tsx`, `views/mobile/BoxOfficeApp.tsx`, `components/ProjectDetailView.tsx`.

**Risk.** High for the economy. Cap foreign territories at a small count (origin plus up to three) so the week loop stays cheap. Royalty math in `gameLoop.ts` (the payout block around line 3260) must keep using total gross or be explicitly switched. Write that choice down in the PR.

### PR 8 — Award shows as data, plus one regional show

**Scope.** Move `AWARD_CALENDAR` and `AWARD_SHOW_DB` into show definitions. `checkAwardEligibility` and `generateFullBallot` take a show and an industry project list. Add one Bollywood feature show on a free week. Imdb and red carpet read the catalog. Oscars, Globes, BAFTA, and Emmys keep their weeks, names, and categories.

**Files.** `services/awardLogic.ts`, `services/gameLoop.ts`, `views/mobile/ImdbApp.tsx`, `views/RedCarpetEvent.tsx`, `views/HomePage.tsx` (debug ceremony).

**Risk.** High. Award weeks already drop events on the floor when two things share a week (bug 6). Fix that in this PR or in a tiny PR just before it. Do not put the new show on weeks 2, 4, 10, or 38.

### PR 9 — Nollywood and European as catalog entries

**Scope.** Enable those two industries with studios, scales, calendars, name tables for random extras, and one award show each. Reuse Lagos, London, Paris, Berlin, Rome, Madrid. Map the existing Nigeria pack to Nollywood and the UK/France/Germany/Italy/Spain/Sweden/Poland/Ireland/Netherlands packs to European. No new sim rules.

**Files.** `services/industryCatalog.ts`, `services/npcLogic.ts` name tables, `services/studioLogic.ts`, award catalog, `services/lifestyleLogic.ts` if a couple of home-city properties are added.

**Risk.** Low if PR 5–8 are in. Content quality is the risk, not architecture. Random English names in `generateRandomNPC` will look wrong here, so the name table is part of the PR, not a follow-up.

### PR 10 — News voice, social flavor, and the phone apps

**Scope.** Template banks per industry for news, X hashtags, Instagram, and YouTube flavor. News source detection uses structured fields (`showId`, `industryId`) and can keep the English regex as a fallback. Production-house city label reads the studio's home city. Player X location reads home city.

**Files.** `services/newsLogic.ts`, `services/i18n.ts`, `views/mobile/NewsApp.tsx`, `services/xLogic.ts`, `services/instagramLogic.ts`, `services/youtubeLogic.ts`, `views/lifestyle/business/ProductionHouseGame.tsx`, `views/mobile/XApp.tsx`, `views/mobile/ImdbApp.tsx`.

**Risk.** Low. Copy-only, but the news file is large and has an English and a Portuguese block that must stay in sync.

### PR 11 — Streaming territories

**Scope.** A foreign territory can be a theatrical holdover or a platform sale. `determineStreamingAcquisition` takes the origin industry. Fix genre bias matching as part of this PR. Optional regional platform entries follow `PlatformProfile` and only bid on their home industry.

**Files.** `services/streamingLogic.ts`, `services/gameLoop.ts`, `views/mobile/StreamingPage.tsx`, `views/mobile/BoxOfficeApp.tsx`.

**Risk.** Medium. Platform valuations are already inconsistent across files (bug 4). Do not retune Netflix or Disney in this PR. Add new platforms beside them.

### PR 12 — Korean, Chinese, Japanese, and Tollywood content packs

**Scope.** These four need talent, studios, a festival, a show, and a name table. The map pins for Seoul, Tokyo, Beijing, and Hong Kong can be reused. Tollywood should be a separate industry id that shares some India talent and uses a different home city, genre bias, and show, so it does not require a second copy of every actor.

**Files.** New data modules under `services/data/` or rows in `modTalentData.ts`, plus catalog entries. No new rules.

**Risk.** Content and naming, not code. Ship one industry per PR if the talent list is large. `modTalentData.ts` is generated by `scripts/import-mod-talent-csv.mjs`; add rows through that pipeline.

### Suggested order

PR 1 → PR 2 → PR 3 → PR 4 → PR 5 is the first playable milestone: old saves stay Hollywood, a new game can start in Bollywood, and the release wizard's reach choice changes gross. PR 6–8 make the career feel different across industries. PR 9–12 are content once the pipes exist.

---

## 5. Bugs and fragile spots that will get in the way

These are observations from this pass. They are not fixed here.

1. **NPC economy lives on a module singleton.** `export const NPC_DATABASE = generateNPCs()` (`npcLogic.ts` line 717). `processWorldTurn` adds salary and fame directly onto those objects (`worldLogic.ts` around lines 156–183 and 212–217, and again around lines 298–325). The changes are not in the save. Two slots in one session share the mutated roster. A regional fame model cannot sit on this object.

2. **Country packs never reach the sim.** `createNPCFromCeleb` drops `country`. Packs are stored on `flags.extraNPCs`. World projects, news picks, universe casting, and award lookups use `NPC_DATABASE` only. Award gender filters coin-flip when the actor id is missing (`awardLogic.ts` around lines 348–360). Enabling the India pack does not create Indian releases.

3. **Screening strategy and release scale are stored and ignored.** `ReleaseScale` is set in `generateProjectDetails`. `ScreeningStrategy` is chosen in `ReleaseWizard` and displayed in `ProjectDashboardModal`. `calculateWeeklyBoxOffice` does not take either argument. International release has no mechanical effect.

4. **Streaming genre bias never matches.** `PLATFORMS.*.genreBias` uses strings like `'Thriller'` and `'Sci-Fi'`. `determineStreamingAcquisition` compares them to `Genre` enums like `'THRILLER'` (`streamingLogic.ts` lines 96–99). The `+20` genre fit is dead. YouTube's valuation is also different in each table: `350` in `STUDIO_CATALOG` and `streamingLogic`, `1800` on `INITIAL_PLAYER.world.studios`, with subscriber counts `2500` on the world platform and `2700` on the streaming profile. Marvel, DC, and Lucasfilm use archetype `UNIVERSE_ARCHITECT` in the catalog and `FRANCHISE` on the initial world studios. Apple TV's valuation of `2900` is a parent-company figure sitting in the same field as studio valuations of `3` to `74`.

5. **Language is hard-locked to English.** `getPlayerLanguage` always returns `'en'` (`i18n.ts` lines 1488–1490). Hydration sets `safePlayer.settings.language = 'en'` (`App.tsx` line 862). The `pt-BR` table is unused by that path. Industry copy can still ship in English, but anyone planning to unlock Portuguese will have to undo both locks.

6. **One `pendingEvent` slot, and the week list is cleared in bulk.** At the start of `processGameWeek` (`gameLoop.ts` lines 1101–1121), every scheduled event whose `week` equals the current week is removed. Award shows and most other types assign `pendingEvent`, so a second event that week replaces the first and the first is gone. Regional shows must not share weeks 2, 4, 10, or 38, and the slot should become a queue before several industries hold ceremonies.

7. **Award year is not one number.** Nominations use `getAwardCeremonyYear`, which can return `age + 1` when the invite week is after the ceremony week (Golden Globes: invite 50, ceremony 2). The ceremony-week history write uses `nextPlayer.age` (`gameLoop.ts` lines 3350–3356). History lookup in `ImdbApp` compares that year to the show year. A Globes season can miss its own history row. Player-attended ceremonies write history from `RedCarpetEvent.tsx` (around line 565); if the player never opens the event, the week-10/week-2 path is the only writer, and it is skipped while `pendingEvent` is that ceremony.

8. **`world.projects` is capped at 100.** `processWorldTurn` keeps the newest 100 (`worldLogic.ts` lines 288–291). One list shared by every industry will crowd out smaller industries and will also starve award ballots, which read this list. The cap needs to be per industry before a second industry generates weekly films.

9. **Rival volume is not the comment's "2 per week."** The scheduler fills 24 upcoming rivals at two per week, then a separate `Math.random() < 0.7` block releases yet another project and pays the lead again. Multiplying that by eight industries will flood news and the 100-item cap. Fix the rate when industry-scoped generation lands.

10. **`getEstimatedBudget` has no `BLOCKBUSTER` branch.** The tier exists on `BudgetTier` and on `BOX_OFFICE_CAPS`, but `getEstimatedBudget` (`roleLogic.ts` lines 328–333) returns `undefined` for it. Any industry scale that multiplies that result will produce `NaN` gross. `calculateRunOutcome` divides by budget.

11. **Duplicate `LegalCase` interface.** `types.ts` declares `LegalCase` twice (lines 779–786 and 805–816). The second definition wins. Unrelated to industries, but it is a sign the types file is already drifting, and the industry fields should be added once, in the interfaces that are actually used.

12. **Missing-world fallback drops the rest of the world.** `views/mobile/MobilePage.tsx` (around line 138), if `world` is missing while accepting a famous-movie offer, replaces it with a partial object and no studios or platforms. `gameLoop.ts` has a similar partial rebuild around line 715. Industry migration should funnel through one function so these fallbacks do not wipe `world.industries`.

13. **Market trends do not drive the world, and they are snapshotted per studio.** Rival gross ignores `createMarketTrends`. The player's gross reads `studioState.marketTrends` from the producing business only (`gameLoop.ts` around line 2906). Two industries cannot have different seasons until the trend input is the film's industry, not whichever studio happened to refresh its lab.

14. **News classification is a Hollywood keyword list.** `NewsApp.tsx` `getSource` and `getTags` match `oscar|emmy|bafta|globes` and US platform names. A Filmfare or Baeksang headline will be filed as a generic trade story. Structured `showId` / `industryId` on `NewsItem` avoids growing that regex forever.

15. **Special-case director and English title collision.** `worldLogic.ts` hardcodes `"Nyanika Mishra"` as a perfect director who always trends. `src/data/generators.ts` `TITLES_BY_GENRE` reuses real titles (`The Godfather`, `The Matrix`, `Parasite` is not in that list, but `Parasite` is in the famous-movie DB). A regional title generator should not share that list. Generated extras use one English name table.

16. **US holiday calendar is the only demand calendar.** July 4th, Thanksgiving, and Halloween in `CALENDAR_EVENTS` will boost every industry if the array stays global. Move it with the Hollywood catalog entry in PR 4 before enabling a second industry.

17. **Gendered award categories assume male or female.** `checkAwardEligibility` uses `player.gender === 'FEMALE' ? 'Actress' : 'Actor'`. `NON_BINARY` becomes Actor. A data-driven category model should decide this explicitly when shows are rewritten in PR 8.

18. **No save schema version today.** IndexedDB `DB_VERSION` is 1 and the object store is unkeyed beyond the slot. All of the defensive `if (!player.world)` branches are the migration system. A `schemaVersion` check belongs in one function, called from both hydration sites, or the industry fields will be half-applied depending on whether the player opened a slot or advanced a week.

---

## Suggested first milestone

Ship PR 1 through PR 5. After that, an old save still loads as a Hollywood career with the same money, awards, and studios, and a new game can start in Bollywood with its own studios, talent, scale, and calendar. The release wizard's regional / national / international choice changes the gross. Everything after that — dubs, moving, regional awards, Nollywood, Europe, and the industries that still need talent — stacks on those fields without another save-format break.
