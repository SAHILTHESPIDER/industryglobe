import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Dices, Lock, PenLine, ScrollText } from 'lucide-react';
import type { Business, FilmIndustryId, Genre, Player, Script, Writer } from '../../../../types';
import { displayAuthor, displayTitle, loadCatalogue, preferredFormat, type IpRecord } from '../../../../services/rights/catalogue';
import { findRecord } from '../../../../services/rights/logic';
import { ALL_GENRES, formatGenreLabel } from '../../../../services/genreCatalog';
import { normalizeStudioState } from '../../../../services/businessLogic';
import { formatMoney } from '../../../../services/formatUtils';
import { INDUSTRIES } from '../../../../services/scriptDesk/catalog';
import {
    applyRewrite,
    buildScriptRecord,
    defaultRoles,
    lockScript,
    planWritersRoom,
    rewriteCost,
    slipLabel,
    stageLabel,
    suggestName,
    suggestTitle,
} from '../../../../services/scriptDesk/logic';
import {
    CLIMAXES,
    CONFLICTS,
    ENDINGS,
    EPISODE_HOOKS,
    GOALS,
    INTERVALS,
    MOTIVES,
    OPENINGS,
    SETTINGS,
    THEMES,
    TONE_OPTIONS,
    TWIST_PLACES,
    VILLAINS,
    ARC_OPTIONS,
    CLIFFHANGERS,
    SEASON_ARCS,
    SEETI,
    SET_PIECES,
    SUPPORT_SLOTS,
    applyV2,
    attachScriptV2,
    buildScriptBank,
    composeLogline,
    contentCeiling,
    defaultRating,
    emptyDraft,
    festivalsFor,
    genreFatigue,
    judgeFestival,
    loglineSuggestions,
    marketLabel,
    marketTrend,
    offerTableRead,
    personName,
    ratingsFor,
    remakeInto,
    resolvePitch,
    runtimeLine,
    salePrice,
    scoreV2,
    scriptFromListing,
    scriptMarkets,
    twistOfferFor,
    writeScene,
    writeSynopsis,
    type DeskOption,
    type V2Draft,
} from '../../../../services/scriptDesk/v2';
import { ScreenplayPage } from './ScreenplayPage';

type Step = 'FORMAT' | 'MARKET' | 'LOGLINE' | 'STORY' | 'STRUCTURE' | 'TRACKS' | 'RATING' | 'PAGES' | 'WRITERS' | 'DESK';

const ORDER: Step[] = ['FORMAT', 'MARKET', 'LOGLINE', 'STORY', 'STRUCTURE', 'TRACKS', 'RATING', 'PAGES', 'WRITERS'];

const ALIAS: Record<string, Step> = {
    FORMAT: 'FORMAT', MARKET: 'MARKET', LOGLINE: 'LOGLINE', STORY: 'STORY', STRUCTURE: 'STRUCTURE',
    TRACKS: 'TRACKS', RATING: 'RATING', PAGES: 'PAGES', WRITERS: 'WRITERS', DESK: 'DESK',
    SOURCE: 'FORMAT', PARTS: 'STORY', TWIST: 'STRUCTURE', CAST: 'TRACKS', LOOK: 'PAGES', ROOM: 'DESK',
};

const asGenre = (value?: string): Genre => (value && (ALL_GENRES as string[]).includes(value) ? value as Genre : 'DRAMA');

const Meter: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone = 'bg-amber-300' }) => (
    <div>
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span>{label}</span>
            <span className="text-white">{Math.round(value)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    </div>
);

const ChoiceButton: React.FC<{ active: boolean; title: string; copy?: string; onClick: () => void; testId?: string }> = ({ active, title, copy, onClick, testId }) => (
    <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        className={`rounded-2xl border p-4 text-left transition ${active ? 'border-amber-300 bg-amber-300/10 shadow-[0_0_0_1px_rgba(252,211,77,0.35)]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
    >
        <div className="font-semibold leading-snug">{title}</div>
        {copy && <p className={`mt-1 text-sm leading-relaxed ${active ? 'text-amber-50/80' : 'text-zinc-400'}`}>{copy}</p>}
    </button>
);

const Grid: React.FC<{ title: string; options: DeskOption[]; selected: string; onPick: (id: string) => void }> = ({ title, options, selected, onPick }) => (
    <section>
        <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {options.map(option => (
                <ChoiceButton key={option.id} active={selected === option.id} title={option.label} copy={option.detail} onClick={() => onPick(option.id)} />
            ))}
        </div>
    </section>
);

const Stepper: React.FC<{ label: string; hint: string; value: number; onChange: (value: number) => void; testId?: string; step?: number }> = ({ label, hint, value, onChange, testId, step = 1 }) => (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
        <div className="mt-2 flex items-center gap-3">
            <button type="button" className="h-11 w-11 rounded-full bg-white/10 text-lg" onClick={() => onChange(Math.max(1, value - step))} aria-label={`Less ${label}`}>–</button>
            <input
                data-testid={testId}
                inputMode="numeric"
                value={value}
                onChange={event => {
                    const next = Math.round(Number(event.target.value));
                    if (Number.isFinite(next)) onChange(Math.max(1, next));
                }}
                className="w-24 bg-transparent text-center font-serif text-4xl text-white outline-none"
            />
            <button type="button" className="h-11 w-11 rounded-full bg-white text-lg text-black" onClick={() => onChange(value + step)} aria-label={`More ${label}`}>+</button>
        </div>
        <p className="mt-2 text-sm text-zinc-400">{hint}</p>
    </label>
);

export const ScriptDesk: React.FC<{
    player: Player;
    studio: Business;
    script?: Script | null;
    startStep?: string;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
}> = ({ player, studio, script, startStep, onBack, onUpdatePlayer }) => {
    const state = useMemo(
        () => normalizeStudioState(studio.studioState, player.currentWeek),
        [studio.studioState, player.currentWeek],
    );
    const hq: FilmIndustryId = state.filmIndustry && state.filmIndustry in INDUSTRIES ? state.filmIndustry : 'HOLLYWOOD';
    const managing = Boolean(script?.craft);
    const initial = ALIAS[startStep || ''] || 'FORMAT';
    const [step, setStep] = useState<Step>(managing ? 'DESK' : initial === 'DESK' ? 'FORMAT' : initial);
    const [draft, setDraft] = useState<V2Draft>(() => emptyDraft(hq, studio.id));
    const [namesTouched, setNamesTouched] = useState(false);
    const [tracksTouched, setTracksTouched] = useState(false);
    const [contentTouched, setContentTouched] = useState(false);
    const [logSalt, setLogSalt] = useState(0);
    const [useOwn, setUseOwn] = useState(false);
    const [ownPages, setOwnPages] = useState('');
    const [selfWrite, setSelfWrite] = useState(true);
    const [writerIds, setWriterIds] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [showPage, setShowPage] = useState(false);
    const [catalogTick, setCatalogTick] = useState(0);

    useEffect(() => {
        let live = true;
        loadCatalogue().then(() => { if (live) setCatalogTick(tick => tick + 1); }).catch(() => undefined);
        return () => { live = false; };
    }, []);

    const liveScript = script ? attachScriptV2(state.scripts.find(item => item.id === script.id) || script) : null;
    const playerSkill = player.writerStats
        ? Math.round(((player.writerStats.creativity || 0) + (player.writerStats.dialogue || 0) + (player.writerStats.structure || 0) + (player.writerStats.pacing || 0)) / 4)
        : (player.stats?.skills?.writing || 0);
    const fatigue = genreFatigue(state.scripts, draft.industry, draft.genre);
    const read = useMemo(
        () => scoreV2(draft, player.currentWeek || 1, selfWrite ? playerSkill : 48, fatigue),
        [draft, player.currentWeek, playerSkill, selfWrite, fatigue],
    );
    const suggestions = useMemo(() => loglineSuggestions(draft, logSalt), [draft, logSalt]);
    const rating = ratingsFor(draft.industry).find(item => item.id === draft.ratingId) || defaultRating(draft.industry);
    const cap = contentCeiling(rating);
    const chosenWriters = state.writers.filter(writer => writerIds.includes(writer.id));
    const room = planWritersRoom(chosenWriters, draft.genre, playerSkill, selfWrite);
    const held = useMemo(() => {
        const rows = (state.rightsLibrary?.holdings || []).filter(row =>
            row.owner === 'PLAYER' && (row.status === 'OWNED' || row.status === 'OPTION') && !row.developedScriptId);
        return rows
            .map(row => ({ row, ip: findRecord(player, row.ipId) }))
            .filter((item): item is { row: typeof rows[number]; ip: IpRecord } => Boolean(item.ip));
    }, [state.rightsLibrary, player, catalogTick]);

    const patch = (partial: Partial<V2Draft>) => setDraft(current => ({ ...current, ...partial }));

    const pickMarket = (id: FilmIndustryId) => {
        const nextRating = defaultRating(id);
        const nextCap = contentCeiling(nextRating);
        setDraft(current => ({
            ...current,
            industry: id,
            ratingId: nextRating.id,
            protagonist: namesTouched ? current.protagonist : personName(id, 'ANY', `${studio.id}|lead|${id}`),
            villainName: namesTouched ? current.villainName : personName(id, 'ANY', `${studio.id}|villain|${id}`),
            tracks: {
                ...current.tracks,
                songs: tracksTouched ? current.tracks.songs : INDUSTRIES[id].songs === 'central' ? 58 : INDUSTRIES[id].songs === 'expected' ? 36 : 12,
            },
            ...(contentTouched ? {} : {
                violence: Math.round(nextCap.violence * 0.7),
                intimacy: Math.round(nextCap.intimacy * 0.65),
                language: Math.round(nextCap.language * 0.55),
            }),
        }));
        setNote(`${marketLabel(id)} is the market for this script. The house stays where it is.`);
    };

    const pickRating = (id: string) => {
        const next = ratingsFor(draft.industry).find(item => item.id === id) || rating;
        const nextCap = contentCeiling(next);
        setDraft(current => ({
            ...current,
            ratingId: next.id,
            ...(contentTouched ? {} : {
                violence: Math.round(nextCap.violence * 0.7),
                intimacy: Math.round(nextCap.intimacy * 0.65),
                language: Math.round(nextCap.language * 0.55),
            }),
        }));
    };

    const takeIp = (ip: IpRecord) => {
        patch({
            title: draft.title || displayTitle(ip),
            genre: asGenre(ip.gameGenres?.[0]),
            logline: ip.logline || draft.logline,
            loglineMode: 'PICKED',
            adaptation: {
                ipId: ip.id,
                title: displayTitle(ip),
                author: displayAuthor(ip),
                kind: ip.kind,
                fame: ip.fame,
                fidelity: draft.adaptation?.ipId === ip.id ? draft.adaptation.fidelity : 55,
                preferred: preferredFormat(ip),
                unauthorized: false,
                publicDomain: Boolean(ip.publicDomain),
                fans: ip.fans || [],
                hot: Boolean(ip.hot),
                authorId: ip.authorId,
            },
        });
        const preferred = preferredFormat(ip);
        setNote(preferred === draft.format
            ? `${displayTitle(ip)} is in the draft. Faithfulness moves the fans and the critics. It does not lock the shape.`
            : `${displayTitle(ip)} wants a ${preferred === 'SERIES' ? 'series' : 'film'}. You can still write the other shape. The draft starts behind.`);
    };

    const saveStudio = (patchState: Partial<typeof state>, balanceDelta = 0) => {
        const nextStudio: Business = {
            ...studio,
            balance: studio.balance + balanceDelta,
            studioState: { ...state, ...patchState },
        };
        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(business => business.id === studio.id ? nextStudio : business),
        });
    };

    const fileScript = () => {
        if (studio.balance < room.fee) {
            setNote(`The room costs ${formatMoney(room.fee)}. The house has ${formatMoney(studio.balance)}. Drop a writer, or write it yourself.`);
            return;
        }
        const title = draft.title.trim() || suggestTitle(draft.industry, draft.genre, `${studio.id}|${player.currentWeek}|${draft.genre}`);
        const filed: V2Draft = { ...draft, title, logline: draft.logline.trim() || suggestions[0] || composeLogline(draft) };
        const people = defaultRoles(filed.genre, INDUSTRIES[filed.industry].songs).map((role, index) => ({
            id: `role_${role.role}_${index}`,
            name: /villain/i.test(role.role)
                ? filed.villainName
                : index === 0
                    ? filed.protagonist
                    : suggestName(filed.industry, role.gender, `${title}|${role.role}|${index}`),
            role: role.role,
            size: role.size,
            gender: role.gender,
        }));
        const book = filed.adaptation;
        const built = buildScriptRecord({
            title,
            genre: filed.genre,
            industry: filed.industry,
            draft: {
                source: book?.kind === 'LIFE' ? 'TRUE_STORY' : book ? 'BOOK' : 'ORIGINAL',
                genre: filed.genre,
                toneId: filed.toneId,
                hookId: 'wrong-place',
                climaxId: 'quiet',
                songs: Math.round(filed.tracks.songs / 20),
                characters: people,
                twist: twistOfferFor(filed),
                bookPopularity: book?.fame,
                trueStory: book?.kind === 'LIFE'
                    ? { sensitivity: book.unauthorized ? 80 : 45, popularity: book.fame, unauthorized: book.unauthorized }
                    : undefined,
            },
            room,
            week: player.currentWeek || 1,
            logline: filed.logline,
        });
        const sealed = applyV2(built.script, filed, scoreV2(filed, player.currentWeek || 1, room.skill, genreFatigue(state.scripts, filed.industry, filed.genre)), useOwn ? ownPages : '');
        const library = state.rightsLibrary;
            const rightsLibrary = library && book ? {
            ...library,
            holdings: library.holdings.map(row => row.ipId === book.ipId && row.owner === 'PLAYER'
                ? { ...row, developedScriptId: sealed.id }
                : row),
        } : undefined;
        saveStudio({
            scripts: [...state.scripts, sealed],
            ...(rightsLibrary ? { rightsLibrary } : {}),
            financeLedger: [{
                id: `script_${sealed.id}`,
                week: player.currentWeek,
                year: player.age,
                amount: -room.fee,
                type: 'SCRIPT',
                label: `Script: ${sealed.title}`,
                projectId: sealed.id,
            }, ...(state.financeLedger || [])].slice(0, 200),
        }, -room.fee);
        onBack();
    };

    const rewrite = () => {
        if (!liveScript) return;
        const cost = rewriteCost(liveScript);
        if (studio.balance < cost) {
            setNote(`This pass costs ${formatMoney(cost)}. The house is short ${formatMoney(cost - studio.balance)}.`);
            return;
        }
        const next = applyRewrite(liveScript);
        saveStudio({
            scripts: state.scripts.map(item => item.id === next.id ? next : item),
            financeLedger: [{
                id: `rewrite_${next.id}_${next.craft?.rewrites}`,
                week: player.currentWeek,
                year: player.age,
                amount: -cost,
                type: 'SCRIPT',
                label: `Rewrite ${next.craft?.rewrites}: ${next.title}`,
                projectId: next.id,
            }, ...(state.financeLedger || [])].slice(0, 200),
        }, -cost);
        setNote(`Rewrite ${next.craft?.rewrites} is on the clock. Freshness is ${Math.round(next.craft?.freshness || 0)}.`);
    };

    const lock = () => {
        if (!liveScript) return;
        const next = lockScript(liveScript);
        saveStudio({ scripts: state.scripts.map(item => item.id === next.id ? next : item) });
        setNote('Locked. Runtime stays what the script says. The date and the window are production’s problem.');
    };

    const putScript = (next: Script, balanceDelta = 0, extra: Partial<typeof state> = {}) => {
        saveStudio({
            scripts: state.scripts.some(item => item.id === next.id)
                ? state.scripts.map(item => item.id === next.id ? next : item)
                : [...state.scripts, next],
            ...extra,
        }, balanceDelta);
    };

    const acceptRead = (accept: boolean) => {
        if (!liveScript?.craft?.v2) return;
        const offer = liveScript.craft.v2.tableRead || offerTableRead(liveScript, 'desk');
        if (accept && offer.cost > studio.balance) {
            setNote(`${offer.star} wants ${formatMoney(offer.cost)}. The house does not have it.`);
            return;
        }
        const next: Script = {
            ...liveScript,
            hype: Math.max(0, Math.min(100, (liveScript.hype || 40) + (accept ? 3 : -2))),
            craft: {
                ...liveScript.craft,
                freshness: Math.max(0, liveScript.craft.freshness - (accept ? 4 : 0)),
                audienceAppeal: Math.max(0, Math.min(100, liveScript.craft.audienceAppeal + (accept ? 2 : -3))),
                budgetDelta: (liveScript.craft.budgetDelta || 0) + (accept ? Math.round(offer.cost * 0.35) : 0),
                v2: { ...liveScript.craft.v2, tableRead: { ...offer, accepted: accept } },
            },
        };
        putScript(next, accept ? -offer.cost : 0);
        setNote(accept ? `${offer.star} stays. ${offer.note}` : `${offer.star} walks. The part is still open, and the town noticed.`);
    };

    const weekNow = player.currentWeek || 1;
    const ownedScriptIds = new Set(state.scripts.map(item => item.id));
    const bankListings = state.scriptBankWeek === weekNow
        ? (state.scriptBank || [])
        : buildScriptBank(weekNow, studio.id).filter(listing => !ownedScriptIds.has(`script_${listing.id}`));

    const pitchTo = (to: 'STUDIO' | 'OTT' | 'STAR') => {
        if (!liveScript?.craft?.v2) return;
        const week = player.currentWeek || 1;
        const result = resolvePitch(liveScript, to, week);
        const next: Script = {
            ...liveScript,
            hype: Math.max(0, Math.min(100, (liveScript.hype || 40) + result.hype)),
            craft: {
                ...liveScript.craft,
                v2: {
                    ...liveScript.craft.v2,
                    pitches: [...(liveScript.craft.v2.pitches || []), { to, week, result: result.result, money: result.money }],
                },
            },
        };
        putScript(next);
        setNote(result.result);
    };

    const buyListing = (listing: ReturnType<typeof buildScriptBank>[number]) => {
        const week = player.currentWeek || 1;
        if (state.scripts.some(item => item.id === `script_${listing.id}`)) {
            setNote(`${listing.title} is already in the vault.`);
            return;
        }
        if (studio.balance < listing.price) {
            setNote(`That spec is ${formatMoney(listing.price)}. The house has ${formatMoney(studio.balance)}.`);
            return;
        }
        const bank = bankListings.filter(item => item.id !== listing.id);
        putScript(scriptFromListing(listing, week), -listing.price, { scriptBank: bank, scriptBankWeek: week });
        setNote(`${listing.title} is in the vault.`);
    };

    const sellThis = () => {
        if (!liveScript) return;
        if (liveScript.status === 'PRODUCED' || (state.concepts || []).some(concept => concept.scriptId === liveScript.id)) {
            setNote('It is already on a call sheet. Selling it now is a different fight.');
            return;
        }
        const price = salePrice(liveScript);
        saveStudio({ scripts: state.scripts.filter(item => item.id !== liveScript.id) }, price);
        setNote(`Sold for ${formatMoney(price)}.`);
        onBack();
    };

    const enterFestival = (id: string) => {
        if (!liveScript?.craft?.v2) return;
        const judged = judgeFestival(liveScript, id);
        if ((liveScript.craft.v2.awards || []).some(award => award.festival === judged.festival)) {
            setNote(`${judged.festival} already has this film. A festival takes a title once.`);
            return;
        }
        if (studio.balance < judged.fee) {
            setNote(`${judged.festival} wants ${formatMoney(judged.fee)} to enter.`);
            return;
        }
        const next: Script = {
            ...liveScript,
            hype: Math.max(0, Math.min(100, (liveScript.hype || 40) + (judged.result === 'PRIZE' ? 8 : judged.result === 'SELECTED' ? 4 : 1))),
            craft: {
                ...liveScript.craft,
                v2: {
                    ...liveScript.craft.v2,
                    awards: [...(liveScript.craft.v2.awards || []), { festival: judged.festival, result: judged.result, note: judged.note, week: player.currentWeek }],
                },
            },
        };
        putScript(next, -judged.fee);
        setNote(judged.note);
    };

    const spinRemake = (industry: FilmIndustryId) => {
        if (!liveScript) return;
        const fee = 75_000;
        if (studio.balance < fee) {
            setNote(`Clearing the pages for another market costs ${formatMoney(fee)}.`);
            return;
        }
        const salt = state.scripts.filter(item => item.craft?.industry === industry && item.craft?.v2?.remakeOf).length;
        putScript(remakeInto(liveScript, industry, player.currentWeek || 1, salt), -fee);
        setNote(`A ${marketLabel(industry)} version is in the vault. Critics will compare it. The release is still not chosen.`);
    };

    const go = (direction: 1 | -1) => {
        const index = ORDER.indexOf(step);
        if (direction < 0) {
            if (index <= 0) onBack();
            else setStep(ORDER[index - 1]);
            return;
        }
        if (step === 'WRITERS') {
            fileScript();
            return;
        }
        if (step === 'LOGLINE' && !draft.logline.trim()) {
            patch({ logline: suggestions[0] || '', loglineMode: 'PICKED' });
            setNote('The desk used a suggestion. You can still rewrite the line.');
        }
        if (index >= 0 && index < ORDER.length - 1) setStep(ORDER[index + 1]);
    };

    const markets = scriptMarkets();
    const pageText = liveScript?.craft?.pages || (useOwn && ownPages.trim() ? ownPages : writeScene(draft));
    const steps = managing ? [] : ORDER;

    return (
        <div data-testid="script-desk-v2" className="flex h-full min-h-0 flex-col bg-[#07080d] text-white">
            <header className="shrink-0 border-b border-white/10 bg-[radial-gradient(1200px_circle_at_0%_0%,rgba(251,191,36,0.12),transparent_40%),linear-gradient(#12141c,#07080d)] px-4 pb-4 pt-8 md:px-8">
                <div className="mx-auto flex max-w-5xl items-center gap-3">
                    <button type="button" onClick={() => (step === 'FORMAT' || step === 'DESK' ? onBack() : go(-1))} className="rounded-full bg-white/10 p-2" aria-label="Back">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Script desk</div>
                        <h2 className="truncate font-serif text-2xl tracking-tight md:text-3xl">{managing ? (liveScript?.title || 'Script') : (draft.title || 'New script')}</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">House</div>
                        <div className="font-mono text-sm font-bold">{formatMoney(studio.balance)}</div>
                    </div>
                </div>
                {steps.length > 0 && (
                    <div className="mx-auto mt-4 flex max-w-5xl gap-1">
                        {steps.map(item => (
                            <div key={item} className={`h-1 flex-1 rounded-full ${ORDER.indexOf(item) <= ORDER.indexOf(step) ? 'bg-amber-300' : 'bg-white/10'}`} />
                        ))}
                    </div>
                )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 md:px-8 md:py-8">
                    {note && <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm leading-relaxed text-amber-50">{note}</p>}

                    {step === 'FORMAT' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">What are you writing?</h3>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">Length is fixed here. Production can spend, recast, and argue. It does not get to change the runtime, and it does not pick a release date on this desk.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <ChoiceButton testId="script-format-movie" active={draft.format === 'MOVIE'} title="Movie" copy="One runtime. The length is a promise to the exhibitor and the audience." onClick={() => patch({ format: 'MOVIE' })} />
                                <ChoiceButton testId="script-format-series" active={draft.format === 'SERIES'} title="Web series" copy="Seasons, episodes, and a length per episode. The hook has to earn the next one." onClick={() => patch({ format: 'SERIES' })} />
                            </div>
                            {draft.format === 'MOVIE' ? (
                                <Stepper testId="script-runtime" step={5} label="Runtime (minutes)" value={draft.runtimeMinutes} hint={draft.runtimeMinutes > 170 ? 'A long cut loses a showtime. The budget and the fatigue both climb. You can still write it.' : draft.runtimeMinutes < 85 ? 'Short enough that a wide Friday has less to sell. Festivals can hold it.' : 'A length cinemas know how to book.'} onChange={value => patch({ runtimeMinutes: value })} />
                            ) : (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <Stepper label="Seasons" value={draft.seasons} hint="More seasons mean more chances to lose people." onChange={value => patch({ seasons: value })} />
                                    <Stepper label="Episodes / season" value={draft.episodesPerSeason} hint="A long season needs a hook that survives week eight." onChange={value => patch({ episodesPerSeason: value })} />
                                    <Stepper step={5} label="Minutes / episode" value={draft.episodeMinutes} hint={draft.episodeMinutes > 70 ? 'Long episodes ask for a feature’s attention every week.' : 'The length people will actually finish.'} onChange={value => patch({ episodeMinutes: value })} />
                                </div>
                            )}
                            <section className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Adapt a title you already hold</h3>
                                <p className="text-sm text-zinc-400">Originals need no rights. Adaptations come from the rights library, not from the house’s home country.</p>
                                {draft.adaptation && (
                                    <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-semibold">{draft.adaptation.title}</div>
                                                <p className="text-sm text-amber-50/80">{draft.adaptation.author} · wants a {draft.adaptation.preferred === 'SERIES' ? 'series' : 'film'}</p>
                                            </div>
                                            <button type="button" className="text-xs font-bold text-zinc-300" onClick={() => patch({ adaptation: undefined })}>Write an original</button>
                                        </div>
                                        <label className="mt-3 block text-sm">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Faithful {draft.adaptation.fidelity} — loose is the other end</span>
                                            <input type="range" min={0} max={100} value={draft.adaptation.fidelity} onChange={event => patch({ adaptation: { ...draft.adaptation!, fidelity: Number(event.target.value) } })} className="mt-2 w-full accent-amber-300" />
                                        </label>
                                    </div>
                                )}
                                {held.length === 0 && <p className="text-sm text-zinc-500">Nothing in the library is waiting on a draft. Buy or option a title, then come back.</p>}
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {held.map(item => (
                                        <ChoiceButton
                                            key={item.ip.id}
                                            active={draft.adaptation?.ipId === item.ip.id}
                                            title={displayTitle(item.ip)}
                                            copy={`${item.ip.kind === 'LIFE' ? 'Life' : 'Book'} · ${item.row.status === 'OPTION' ? 'Option' : 'Owned'} · ${item.ip.logline}`}
                                            onClick={() => takeIp(item.ip)}
                                        />
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {step === 'MARKET' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">Who is this for?</h3>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">The script can chase any industry. Picking one does not move the studio. Taste, songs, and the censor board follow the market, not the head office.</p>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {ALL_GENRES.map(genre => (
                                    <button key={genre} type="button" onClick={() => patch({ genre })} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${draft.genre === genre ? 'bg-amber-300 text-black' : 'bg-white/10 text-zinc-200'}`}>
                                        {formatGenreLabel(genre)}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {markets.map(market => {
                                    const trend = marketTrend(market.id, draft.genre, player.currentWeek || 1);
                                    return (
                                        <button
                                            key={market.id}
                                            type="button"
                                            data-testid={`script-market-${market.id}`}
                                            onClick={() => pickMarket(market.id)}
                                            className={`rounded-2xl border p-4 text-left ${draft.industry === market.id ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
                                        >
                                            <div className="font-semibold">{market.label}</div>
                                            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{market.place} · {market.country}</p>
                                            <p className="mt-2 text-sm text-zinc-300">{formatGenreLabel(draft.genre)} is {trend.label.toLowerCase()} here.</p>
                                            <p className="mt-1 text-xs text-zinc-500">{market.censor}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {fatigue > 1 && <p className="text-sm leading-relaxed text-amber-100/90">This house already has {fatigue} {formatGenreLabel(draft.genre).toLowerCase()} scripts aimed at {marketLabel(draft.industry)}. Taste fatigue is a bill, not a ban.</p>}
                        </div>
                    )}

                    {step === 'LOGLINE' && (
                        <div className="space-y-4">
                            <div className="flex items-end justify-between gap-3">
                                <h3 className="font-serif text-3xl tracking-tight">The logline</h3>
                                <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-black" onClick={() => setLogSalt(salt => salt + 1)}>
                                    <Dices size={14} /> New suggestions
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {suggestions.map(line => (
                                    <button key={line} type="button" onClick={() => patch({ logline: line, loglineMode: 'PICKED' })} className={`rounded-2xl border p-4 text-left font-serif text-lg leading-snug ${draft.logline === line ? 'border-amber-300 bg-amber-300/10' : 'border-white/10'}`}>
                                        {line}
                                    </button>
                                ))}
                            </div>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Or write your own</span>
                                <textarea data-testid="script-logline" value={draft.loglineMode === 'TYPED' ? draft.logline : ''} placeholder="One or two sentences." onChange={event => patch({ logline: event.target.value, loglineMode: 'TYPED' })} className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-serif text-lg leading-relaxed outline-none focus:border-amber-300" />
                            </label>
                        </div>
                    )}

                    {step === 'STORY' && (
                        <div className="space-y-6">
                            <h3 className="font-serif text-3xl tracking-tight">The people and the place</h3>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Protagonist</span>
                                    <input value={draft.protagonist} onChange={event => { setNamesTouched(true); patch({ protagonist: event.target.value }); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 outline-none focus:border-amber-300" />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Villain</span>
                                    <input value={draft.villainName} onChange={event => { setNamesTouched(true); patch({ villainName: event.target.value }); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 outline-none focus:border-amber-300" />
                                </label>
                            </div>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Title</span>
                                <div className="mt-1 flex gap-2">
                                    <input data-testid="script-title" value={draft.title} onChange={event => patch({ title: event.target.value })} placeholder="Untitled" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-3 outline-none focus:border-amber-300" />
                                    <button type="button" aria-label="Suggest a title" className="rounded-xl bg-white px-3 text-black" onClick={() => patch({ title: suggestTitle(draft.industry, draft.genre, `${Date.now()}`) })}><Dices size={18} /></button>
                                </div>
                            </label>
                            <Grid title="Setting" options={SETTINGS} selected={draft.settingId} onPick={id => patch({ settingId: id })} />
                            <Grid title="What the protagonist wants" options={GOALS} selected={draft.goalId} onPick={id => patch({ goalId: id })} />
                            <Grid title="What stands in the way" options={CONFLICTS} selected={draft.conflictId} onPick={id => patch({ conflictId: id })} />
                            <Grid title="The villain" options={VILLAINS} selected={draft.villainId} onPick={id => patch({ villainId: id })} />
                            <Grid title="Why they do it" options={MOTIVES} selected={draft.motiveId} onPick={id => patch({ motiveId: id })} />
                            <section>
                                <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Lead arc</h3>
                                <div className="flex flex-wrap gap-2">
                                    {ARC_OPTIONS.map(item => (
                                        <button key={item.id} type="button" onClick={() => patch({ arcLead: item.id })} className={`rounded-full px-3 py-2 text-xs font-bold ${draft.arcLead === item.id ? 'bg-amber-300 text-black' : 'bg-white/10'}`}>{item.label}</button>
                                    ))}
                                </div>
                            </section>
                            <section>
                                <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Supporting slot</h3>
                                <div className="flex flex-wrap gap-2">
                                    {SUPPORT_SLOTS.map(item => (
                                        <button key={item.id} type="button" onClick={() => patch({ arcSupport: item.id })} className={`rounded-full px-3 py-2 text-xs font-bold ${draft.arcSupport === item.id ? 'bg-white text-black' : 'bg-white/10'}`}>{item.label}</button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {step === 'STRUCTURE' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">How it turns</h3>
                                <p className="mt-2 text-sm text-zinc-400">Opening, interval, and climax are one argument. A market that lives on an interval will feel a silence. A market that does not will feel a song stuck in the middle.</p>
                            </div>
                            <Grid title="Opening" options={OPENINGS} selected={draft.openingId} onPick={id => patch({ openingId: id })} />
                            <Grid title="Interval" options={INTERVALS} selected={draft.intervalId} onPick={id => patch({ intervalId: id })} />
                            <Grid title="Climax" options={CLIMAXES} selected={draft.climaxId} onPick={id => patch({ climaxId: id })} />
                            <Grid title="Ending" options={ENDINGS} selected={draft.endingId} onPick={id => patch({ endingId: id })} />
                            <Grid title="Where the twist sits" options={TWIST_PLACES} selected={draft.twistPlaceId} onPick={id => patch({ twistPlaceId: id })} />
                            {draft.format === 'SERIES' && (
                                <>
                                    <Grid title="Season arc" options={SEASON_ARCS} selected={draft.seasonArc} onPick={id => patch({ seasonArc: id })} />
                                    <Grid title="Cliffhanger" options={CLIFFHANGERS} selected={draft.cliffhanger} onPick={id => patch({ cliffhanger: id })} />
                                </>
                            )}
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Sequel hook, if you want one</span>
                                <input value={draft.sequelHook} onChange={event => patch({ sequelHook: event.target.value })} placeholder="Leave blank if this story ends." className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 outline-none focus:border-amber-300" />
                            </label>
                        </div>
                    )}

                    {step === 'TRACKS' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">Tone, tracks, theme</h3>
                                <p className="mt-2 text-sm text-zinc-400">Songs, action, romance, and comedy are not separate bonuses. They land differently against the tone, the genre, and {marketLabel(draft.industry)}.</p>
                            </div>
                            <Grid title="Tone" options={TONE_OPTIONS} selected={draft.toneId} onPick={id => patch({ toneId: id })} />
                            {([
                                ['songs', 'Songs', draft.tracks.songs],
                                ['action', 'Action', draft.tracks.action],
                                ['romance', 'Romance', draft.tracks.romance],
                                ['comedy', 'Comedy', draft.tracks.comedy],
                            ] as const).map(([key, label, value]) => (
                                <label key={key} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span>{label}</span>
                                        <span className="font-mono text-zinc-300">{value}</span>
                                    </div>
                                    <input type="range" min={0} max={100} value={value} onChange={event => { setTracksTouched(true); patch({ tracks: { ...draft.tracks, [key]: Number(event.target.value) } }); }} className="mt-3 w-full accent-amber-300" />
                                </label>
                            ))}
                            <Grid title="Theme" options={THEMES} selected={draft.themeId} onPick={id => patch({ themeId: id })} />
                            <Grid title="Seeti-maar moment" options={SEETI} selected={draft.seetiId} onPick={id => patch({ seetiId: id })} />
                            <Grid title="Set piece" options={SET_PIECES} selected={draft.setPieceId} onPick={id => patch({ setPieceId: id })} />
                            <button type="button" onClick={() => patch({ punchline: !draft.punchline })} className={`w-full rounded-2xl border p-4 text-left ${draft.punchline ? 'border-amber-300 bg-amber-300/10' : 'border-white/10'}`}>
                                <div className="font-semibold">A punchline they can quote</div>
                                <p className="mt-1 text-sm text-zinc-400">Helps a comedy. On a grief story it reads as a dodge.</p>
                            </button>
                            {draft.format === 'SERIES' && <Grid title="Episode hook" options={EPISODE_HOOKS} selected={draft.episodeHookId} onPick={id => patch({ episodeHookId: id })} />}
                        </div>
                    )}

                    {step === 'RATING' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">The certificate</h3>
                                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{scriptMarkets().find(item => item.id === draft.industry)?.censor} rates {marketLabel(draft.industry)}. You can write past the line. The board, the budget, and a boycott notice.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                {ratingsFor(draft.industry).map(item => (
                                    <button key={item.id} type="button" data-testid={`script-rating-${item.id}`} onClick={() => pickRating(item.id)} className={`rounded-2xl border px-3 py-4 text-left ${draft.ratingId === item.id ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/10 bg-white/[0.03]'}`}>
                                        <div className="font-serif text-2xl">{item.label}</div>
                                        <div className={`text-xs ${draft.ratingId === item.id ? 'text-black/70' : 'text-zinc-500'}`}>{item.minAge === 0 ? 'All ages' : `${item.minAge}+`}{item.restricted ? ' · restricted' : ''}</div>
                                    </button>
                                ))}
                            </div>
                            {([
                                ['violence', 'Violence', draft.violence, cap.violence],
                                ['intimacy', 'Romance', draft.intimacy, cap.intimacy],
                                ['language', 'Language', draft.language, cap.language],
                            ] as const).map(([key, label, value, line]) => (
                                <label key={key} className="block">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span>{label}</span>
                                        <span className={value > line ? 'text-rose-300' : 'text-zinc-300'}>{value} · {rating.label} holds to {line}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={value}
                                        onChange={event => {
                                            setContentTouched(true);
                                            patch({ [key]: Number(event.target.value) });
                                        }}
                                        className="mt-2 w-full accent-amber-300"
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    {step === 'PAGES' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-serif text-3xl tracking-tight">The pages</h3>
                                <p className="mt-2 text-sm text-zinc-400">A logline, a synopsis, and one scene, written from the choices. Or throw them out and write the script yourself.</p>
                            </div>
                            <blockquote className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 font-serif text-xl leading-snug">{composeLogline({ ...draft, logline: draft.logline || suggestions[0] || '' })}</blockquote>
                            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
                                {writeSynopsis({ ...draft, logline: draft.logline || suggestions[0] || '' }).split('\n\n').map(paragraph => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
                            </div>
                            <button type="button" onClick={() => setUseOwn(value => !value)} className={`w-full rounded-2xl border p-4 text-left ${useOwn ? 'border-amber-300 bg-amber-300/10' : 'border-white/10'}`}>
                                <div className="font-semibold">I’ll write the script myself</div>
                                <p className="mt-1 text-sm text-zinc-400">Your pages replace the sample. A short page reads as a shrug until the draft grows. There is no minimum.</p>
                            </button>
                            {useOwn ? (
                                <textarea data-testid="script-own-pages" value={ownPages} onChange={event => setOwnPages(event.target.value)} placeholder="Write the scene, or the whole script." className="min-h-72 w-full rounded-2xl border border-white/10 bg-[#f6f1e6] p-4 font-mono text-sm leading-6 text-zinc-900 outline-none" />
                            ) : (
                                <ScreenplayPage text={writeScene({ ...draft, title: draft.title || 'Untitled', logline: draft.logline || suggestions[0] || '' })} />
                            )}
                        </div>
                    )}

                    {step === 'WRITERS' && (
                        <div className="space-y-3">
                            <h3 className="font-serif text-3xl tracking-tight">Who writes the rest</h3>
                            <p className="text-sm text-zinc-400">Hire nobody and the draft is yours. Hire a room and it costs fees, weeks, and the chance they slip. Release windows are still not chosen here.</p>
                            <button type="button" onClick={() => setSelfWrite(value => !value)} className={`w-full rounded-2xl border p-4 text-left ${selfWrite ? 'border-amber-300 bg-amber-300/10' : 'border-white/10'}`}>
                                <div className="font-semibold">Write it yourself</div>
                                <p className="mt-1 text-sm text-zinc-400">Skill {playerSkill}. No fee. A thin skill slips the date more often.</p>
                            </button>
                            {state.writers.map(writer => (
                                <WriterRow key={writer.id} writer={writer} genre={draft.genre} on={writerIds.includes(writer.id)} onToggle={() => setWriterIds(ids => ids.includes(writer.id) ? ids.filter(id => id !== writer.id) : [...ids, writer.id])} />
                            ))}
                            <div className="rounded-2xl bg-white/5 p-4 text-sm">
                                <div>Room skill {room.skill} · {room.weeks} weeks · {slipLabel(room.slipRisk)}</div>
                                <div className="mt-1 font-mono">{room.fee ? formatMoney(room.fee) : 'No fee'}</div>
                            </div>
                        </div>
                    )}

                    {step === 'DESK' && liveScript?.craft && (
                        <div className="space-y-5">
                            {liveScript.craft.v2?.inferred && <p className="text-sm text-zinc-400">This draft was filed before the new desk. The deal, the weeks, and the quality were left as they were.</p>}
                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-300">
                                <span className="rounded-full bg-white/10 px-3 py-1">{marketLabel(liveScript.craft.industry)}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">{liveScript.projectType === 'SERIES' ? 'Series' : 'Movie'}</span>
                                {runtimeLine(liveScript) && <span className="rounded-full bg-amber-300 px-3 py-1 text-black">{runtimeLine(liveScript)} locked</span>}
                                {liveScript.craft.v2?.ratingLabel && <span className="rounded-full bg-white/10 px-3 py-1">{liveScript.craft.v2.ratingLabel}</span>}
                            </div>
                            {liveScript.logline && <p className="font-serif text-2xl leading-snug">{liveScript.logline}</p>}
                            {liveScript.craft.v2?.synopsis && !liveScript.craft.v2.inferred && (
                                <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
                                    {liveScript.craft.v2.synopsis.split('\n\n').map(paragraph => <p key={paragraph.slice(0, 20)}>{paragraph}</p>)}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <Meter label="Crowd" value={liveScript.craft.audienceAppeal} tone="bg-orange-400" />
                                <Meter label="Critics" value={liveScript.craft.criticAppeal} tone="bg-sky-400" />
                                <Meter label="Freshness" value={liveScript.craft.freshness} tone="bg-emerald-400" />
                                <Meter label="Stage" value={liveScript.craft.stage === 'LOCKED' ? 100 : liveScript.craft.stage === 'REWRITES' ? 75 : 40} />
                            </div>
                            <p className="text-sm text-zinc-400">{stageLabel(liveScript.craft.stage)}. Week {liveScript.weeksInDevelopment} of {liveScript.totalDevelopmentWeeks}. The runtime stays. Premiere date, theatres, and streaming are production.</p>
                            <button type="button" onClick={() => setShowPage(value => !value)} className="inline-flex items-center gap-2 text-sm font-bold text-amber-200"><ScrollText size={16} /> {showPage ? 'Hide pages' : 'Read the pages'}</button>
                            {showPage && <ScreenplayPage text={liveScript.craft.pages || pageText} live={false} />}
                            {liveScript.craft.v2 && (
                                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Coverage</h3>
                                    <p className="mt-1 text-sm text-zinc-400">The score stays in the drawer. These are the notes a reader would actually write.</p>
                                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-200">
                                        {(liveScript.craft.v2.coverageHints || [liveScript.craft.v2.inferred ? 'This draft was filed before coverage. A rewrite or a pitch is what starts the notes.' : 'The spine is clear enough to spend a draft on.']).map(hint => <li key={hint}>{hint}</li>)}
                                    </ul>
                                    {typeof liveScript.craft.v2.binge === 'number' && (
                                        <div className="mt-4 max-w-xs"><Meter label="Binge" value={liveScript.craft.v2.binge} tone="bg-violet-400" /></div>
                                    )}
                                </section>
                            )}
                            {liveScript.craft.v2 && (
                                <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Meter label="Leak" value={liveScript.craft.v2.risks?.leak || 8} tone="bg-rose-400" />
                                    <Meter label="Plagiarism" value={liveScript.craft.v2.risks?.plagiarism || 6} tone="bg-rose-400" />
                                    <Meter label="Credit fight" value={liveScript.craft.v2.risks?.credit || 8} tone="bg-amber-300" />
                                    <Meter label="Boycott" value={liveScript.craft.v2.risks?.boycott || 6} tone="bg-rose-400" />
                                </section>
                            )}
                            {liveScript.craft.v2 && (
                                <section className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Table read</h3>
                                    {(() => {
                                        const stored = liveScript.craft?.v2?.tableRead;
                                        const offer = stored || offerTableRead(liveScript, 'desk');
                                        return (
                                            <div className="rounded-2xl border border-white/10 p-4">
                                                <div className="font-semibold">{offer.star}</div>
                                                <p className="mt-1 text-sm text-zinc-300">{offer.demand}. {offer.note}</p>
                                                <p className="mt-1 font-mono text-sm">{offer.cost ? formatMoney(offer.cost) : 'No fee, a different script'}</p>
                                                {stored?.accepted == null ? (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <button type="button" onClick={() => acceptRead(true)} className="rounded-xl bg-white py-2 text-sm font-bold text-black">Give them the note</button>
                                                        <button type="button" onClick={() => acceptRead(false)} className="rounded-xl bg-white/10 py-2 text-sm font-bold">Refuse</button>
                                                    </div>
                                                ) : <p className="mt-2 text-sm text-zinc-400">{stored?.accepted ? 'You took the note.' : 'You refused. The part is open.'}</p>}
                                            </div>
                                        );
                                    })()}
                                </section>
                            )}
                            {liveScript.craft.v2 && (
                                <section className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Pitch</h3>
                                    <p className="text-sm text-zinc-400">A meeting, not a release. Theatres and streaming are still chosen in production.</p>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                        {(['STUDIO', 'OTT', 'STAR'] as const).map(to => (
                                            <button key={to} type="button" onClick={() => pitchTo(to)} className="rounded-2xl border border-white/10 px-3 py-3 text-left text-sm font-semibold hover:border-white/30">{to === 'STUDIO' ? 'The house' : to === 'OTT' ? 'A platform' : 'A star'}</button>
                                        ))}
                                    </div>
                                    {(liveScript.craft.v2.pitches || []).slice(-3).map((item, index) => <p key={`${item.to}-${item.week}-${index}`} className="text-sm text-zinc-300">{item.result}</p>)}
                                </section>
                            )}
                            <section className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Script bank</h3>
                                <button type="button" onClick={sellThis} className="w-full rounded-2xl border border-white/10 p-4 text-left">
                                    <div className="font-semibold">Sell this draft · {formatMoney(salePrice(liveScript))}</div>
                                    <p className="mt-1 text-sm text-zinc-400">It leaves the vault. A script already on a call sheet cannot be sold.</p>
                                </button>
                                {bankListings.length === 0 && <p className="text-sm text-zinc-400">The shelf is empty this week. Another week brings another set of specs.</p>}
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {bankListings.map(listing => (
                                        <button key={listing.id} type="button" onClick={() => buyListing(listing)} className="rounded-2xl border border-white/10 p-4 text-left hover:border-white/30">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-semibold">{listing.title}</div>
                                                <div className="font-mono text-sm">{formatMoney(listing.price)}</div>
                                            </div>
                                            <p className="mt-1 text-sm text-zinc-400">{listing.logline}</p>
                                            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{marketLabel(listing.industry)} · {listing.seller}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Remake into another industry</h3>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {scriptMarkets().filter(market => market.id !== liveScript.craft?.industry).map(market => (
                                        <button key={market.id} type="button" onClick={() => spinRemake(market.id)} className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">{market.label}</button>
                                    ))}
                                </div>
                                {liveScript.craft.v2?.remakeOf && <p className="text-sm text-zinc-400">This draft already comes from {liveScript.craft.v2.remakeOf.title} ({marketLabel(liveScript.craft.v2.remakeOf.industry)}).</p>}
                                {liveScript.craft.v2?.sequelHook && <p className="text-sm text-zinc-300">Sequel hook: {liveScript.craft.v2.sequelHook}</p>}
                            </section>
                            <section className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Festivals</h3>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {festivalsFor(liveScript.craft.industry).map(fest => (
                                        <button key={fest.id} type="button" onClick={() => enterFestival(fest.id)} className="rounded-2xl border border-white/10 p-4 text-left hover:border-white/30">
                                            <div className="font-semibold">{fest.name}</div>
                                            <p className="mt-1 text-sm text-zinc-400">{fest.taste === 'critics' ? 'Critics carry it.' : 'A crowd preview.'} Entry {formatMoney(fest.fee)}.</p>
                                        </button>
                                    ))}
                                </div>
                                {(liveScript.craft.v2?.awards || []).map((award, index) => <p key={`${award.festival}-${award.week}-${index}`} className="text-sm text-zinc-300">{award.festival}: {award.result}. {award.note}</p>)}
                            </section>
                        </div>
                    )}

                    {step !== 'DESK' && (
                        <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Combined read · {marketLabel(draft.industry)}</div>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Meter label="Crowd" value={read.audience} tone="bg-orange-400" />
                                <Meter label="Critics" value={read.critics} tone="bg-sky-400" />
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Extra cost</div>
                                    <div className="mt-1 font-mono text-sm font-bold">{formatMoney(read.budget)}</div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {read.notes.map(line => <p key={line} className="text-sm leading-relaxed text-zinc-300">{line}</p>)}
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            <footer className="shrink-0 border-t border-white/10 bg-[#07080d]/95 px-4 py-3 backdrop-blur md:px-8">
                <div className="mx-auto max-w-5xl">
                    {step === 'DESK' && liveScript ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" data-testid="script-rewrite" onClick={rewrite} className="rounded-2xl bg-white/10 py-3 text-sm font-bold">Rewrite · {formatMoney(rewriteCost(liveScript))}</button>
                            <button type="button" data-testid="script-lock" onClick={lock} disabled={liveScript.status === 'READY'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3 text-sm font-black text-black disabled:opacity-40"><Lock size={16} /> {liveScript.status === 'READY' ? 'Locked' : 'Final lock'}</button>
                        </div>
                    ) : (
                        <button type="button" data-testid="script-next" onClick={() => go(1)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-black">
                            {step === 'WRITERS' ? <><PenLine size={16} /> File the script{room.fee ? ` · ${formatMoney(room.fee)}` : ''}</> : <><Clapperboard size={16} /> Continue</>}
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

const WriterRow: React.FC<{ writer: Writer; genre: Genre; on: boolean; onToggle: () => void }> = ({ writer, genre, on, onToggle }) => (
    <button type="button" onClick={onToggle} className={`w-full rounded-2xl border p-4 text-left ${on ? 'border-emerald-300 bg-emerald-400/10' : 'border-white/10'}`}>
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="font-semibold">{writer.name}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">{writer.tier.replace('_', ' ')} · skill {writer.skill}</div>
            </div>
            <div className="font-mono text-sm">{formatMoney(writer.fee)}</div>
        </div>
        <p className="mt-2 text-sm text-zinc-400">{writer.scheduleWeeks || 12} weeks · {slipLabel(writer.slipRisk || 0.15)} · {writer.genreStrengths?.includes(genre) ? 'In their lane.' : 'Outside their lane. You can still hire them.'}</p>
    </button>
);
