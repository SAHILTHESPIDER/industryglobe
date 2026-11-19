import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Dices, Lock, PenLine, Plus, RefreshCw, ScrollText, Users } from 'lucide-react';
import type { BookListing, BookSagaState, BookSplit, Business, FilmIndustryId, Genre, IdeaSource, Player, PlotTwistOffer, RemakeListing, Script, ScriptCharacter, TrueStoryListing, Writer } from '../../../../types';
import { footprintForCreativeChange } from '../../../../services/studioRegions';
import { ALL_GENRES, formatGenreLabel } from '../../../../services/genreCatalog';
import { normalizeStudioState } from '../../../../services/businessLogic';
import { formatMoney } from '../../../../services/formatUtils';
import { ScreenplayPage } from './ScreenplayPage';
import {
    CLIMAXES,
    EXTRA_ROLES,
    HOOKS,
    INDUSTRIES,
    INDUSTRY_ORDER,
    SONG_STYLES,
    TONES,
    buildScriptRecord,
    buildScreenplay,
    choicesForGenre,
    coverageLabel,
    defaultRoles,
    generateBookShelf,
    generateRemakeShelf,
    generateTrueStoryShelf,
    heatFromProjects,
    returningBump,
    isFilmIndustry,
    listingCost,
    lockScript,
    applyRewrite,
    planWritersRoom,
    rewriteCost,
    scoreDraft,
    slipLabel,
    songEffects,
    stageLabel,
    suggestName,
    suggestTitle,
    generateTwistOffers,
    noTwist,
    type DeskDraft,
} from '../../../../services/scriptDesk/logic';

type StepId = 'SOURCE' | 'RIGHTS' | 'PARTS' | 'TWIST' | 'CAST' | 'WRITERS' | 'LOOK' | 'ROOM';

const SOURCES: { id: IdeaSource; title: string; copy: string }[] = [
    { id: 'ORIGINAL', title: 'Original', copy: 'You own it. Critics start warmer. There is no built-in audience.' },
    { id: 'BOOK', title: 'Book adaptation', copy: 'Buy the rights. The price follows how many people already love the book.' },
    { id: 'REMAKE', title: 'Remake', copy: 'The title opens doors. Critics arrive ready to compare.' },
    { id: 'TRUE_STORY', title: 'True story', copy: 'Life rights, or shoot it anyway and live with the noise.' },
];

const SPLITS: { id: BookSplit; title: string; copy: string }[] = [
    { id: 'SINGLE', title: 'Single film', copy: 'The whole book in one sitting. The budget swells to hold it.' },
    { id: 'TWO_PART', title: 'Two parts', copy: 'Part two borrows heat from part one. Or inherits the cold.' },
    { id: 'TRILOGY', title: 'Trilogy', copy: 'Three openings. A soft middle makes the third a harder sell.' },
    { id: 'WEB_SERIES', title: 'Web series', copy: 'More hours, lower spectacle. Easy to lose people between seasons.' },
];

const Meter: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone = 'bg-amber-400' }) => (
    <div>
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span>{label}</span>
            <span className="text-white">{Math.round(value)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    </div>
);

const Delta: React.FC<{ audience: number; critics: number; budget?: number }> = ({ audience, critics, budget = 0 }) => (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
        <span className={audience >= 0 ? 'text-emerald-300' : 'text-rose-300'}>Audience {audience >= 0 ? '+' : ''}{audience}</span>
        <span className={critics >= 0 ? 'text-sky-300' : 'text-rose-300'}>Critics {critics >= 0 ? '+' : ''}{critics}</span>
        {budget !== 0 && <span className="text-amber-200">{budget > 0 ? '+' : ''}{formatMoney(budget)} budget</span>}
    </div>
);

export const ScriptDesk: React.FC<{
    player: Player;
    studio: Business;
    script?: Script | null;
    startStep?: StepId;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
}> = ({ player, studio, script, startStep, onBack, onUpdatePlayer }) => {
    const state = useMemo(
        () => normalizeStudioState(studio.studioState, player.currentWeek),
        [studio.studioState, player.currentWeek]
    );
    const industry: FilmIndustryId = isFilmIndustry(state.filmIndustry) ? state.filmIndustry : 'HOLLYWOOD';
    const managing = Boolean(script?.craft && !script.craft.legacy);
    const [step, setStep] = useState<StepId>(managing ? 'ROOM' : (startStep || 'SOURCE'));
    const [source, setSource] = useState<IdeaSource>(script?.craft?.source || 'ORIGINAL');
    const [title, setTitle] = useState(script?.title || '');
    const [genre, setGenre] = useState<Genre>(script?.genres?.[0] || 'DRAMA');
    const [toneId, setToneId] = useState(script?.craft?.toneId || 'earnest');
    const [hookId, setHookId] = useState(script?.craft?.hookId || '');
    const [climaxId, setClimaxId] = useState(script?.craft?.climaxId || '');
    const [songs, setSongs] = useState(script?.craft?.songs || (INDUSTRIES[industry].songs === 'central' ? 4 : 0));
    const [songStyle, setSongStyle] = useState(script?.craft?.songStyle || 'filmi');
    const [book, setBook] = useState<BookListing | null>(null);
    const [remake, setRemake] = useState<RemakeListing | null>(null);
    const [story, setStory] = useState<TrueStoryListing | null>(null);
    const [split, setSplit] = useState<BookSplit>('SINGLE');
    const [unauthorized, setUnauthorized] = useState(false);
    const [saga, setSaga] = useState<BookSagaState | null>(null);
    const [twistId, setTwistId] = useState(script?.craft?.twistId || '');
    const [twists, setTwists] = useState<PlotTwistOffer[]>(script?.craft?.twistOffers || []);
    const [characters, setCharacters] = useState<ScriptCharacter[]>(script?.craft?.characters || []);
    const [writerIds, setWriterIds] = useState<string[]>(script?.craft?.writerIds || []);
    const [selfWrite, setSelfWrite] = useState(false);
    const [showPage, setShowPage] = useState(startStep === 'LOOK');
    const [note, setNote] = useState('');

    const releases = useMemo(() => [
        ...(player.pastProjects || []).map(project => ({
            franchiseId: project.franchiseId,
            rating: project.rating,
            audienceScore: project.projectDetails?.hiddenStats?.audienceScore,
            title: project.name,
            name: project.name,
            installmentNumber: project.installmentNumber,
            castList: project.castList || project.projectDetails?.castList,
        })),
        ...(player.activeReleases || []).map(project => ({
            franchiseId: project.franchiseId || project.projectDetails?.franchiseId,
            rating: project.imdbRating,
            audienceScore: project.projectDetails?.hiddenStats?.audienceScore,
            title: project.name,
            name: project.name,
            installmentNumber: project.installmentNumber || project.projectDetails?.installmentNumber,
            castList: project.projectDetails?.castList,
        })),
    ], [player.pastProjects, player.activeReleases]);

    const openSagas = (state.bookSagas || []).map(row => {
        const scripts = state.scripts.filter(item => item.craft?.sagaId === row.id || item.franchiseId === row.id);
        const highest = scripts.reduce((max, item) => Math.max(max, item.craft?.partIndex || item.installmentNumber || 0), row.partsMade || 0);
        const nextPart = highest + 1;
        const busy = scripts.some(item => (item.craft?.partIndex || item.installmentNumber) === nextPart && item.status !== 'PRODUCED');
        return { saga: row, nextPart, busy };
    }).filter(row => row.nextPart <= row.saga.totalParts && !row.busy);

    const prior = saga ? heatFromProjects(releases, saga.id) : null;
    const draft: DeskDraft = {
        source: saga ? 'BOOK' : source,
        genre,
        toneId,
        hookId,
        climaxId,
        songs,
        songStyle,
        twist: twists.find(twist => twist.id === twistId) || (twistId === 'none' ? noTwist() : null),
        characters,
        bookPopularity: book?.popularity || saga?.popularity,
        split: saga?.split || split,
        remakePopularity: remake?.popularity,
        trueStory: story ? { sensitivity: story.sensitivity, popularity: story.popularity, unauthorized } : undefined,
        priorHeat: prior?.score,
    };
    const score = scoreDraft(draft, industry);
    const songsRead = songEffects(songs, industry, genre);
    const chosenWriters = state.writers.filter(writer => writerIds.includes(writer.id));
    const playerSkill = player.writerStats
        ? Math.round(((player.writerStats.creativity || 0) + (player.writerStats.dialogue || 0) + (player.writerStats.structure || 0) + (player.writerStats.pacing || 0)) / 4)
        : (player.stats?.skills?.writing || 0);
    const room = planWritersRoom(chosenWriters, genre, playerSkill, selfWrite);
    const liveScript = script && state.scripts.find(item => item.id === script.id) || script;

    useEffect(() => {
        if (step === 'CAST' && characters.length === 0) {
            setCharacters(defaultRoles(genre, INDUSTRIES[industry].songs).map((role, index) => ({
                id: `role_${role.role}_${index}`,
                name: suggestName(industry, role.gender, `${role.role}|${index}|open`),
                role: role.role,
                size: role.size,
                gender: role.gender,
            })));
        }
        if (step === 'TWIST' && twists.length < 4) {
            const people = characters.length ? characters : defaultRoles(genre, INDUSTRIES[industry].songs).map((role, index) => ({
                id: `role_${role.role}_${index}`,
                name: suggestName(industry, role.gender, `${role.role}|${index}|twist`),
                role: role.role,
                size: role.size,
                gender: role.gender,
            }));
            if (!characters.length) setCharacters(people);
            setTwists(generateTwistOffers(genre, people, industry, `${studio.id}|${title}|${genre}|open`));
        }
    }, [step]);

    const saveStudio = (patch: Partial<typeof state>, balanceDelta = 0) => {
        const nextStudio: Business = {
            ...studio,
            balance: studio.balance + balanceDelta,
            studioState: { ...state, ...patch },
        };
        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(business => business.id === studio.id ? nextStudio : business),
        });
    };

    const setIndustry = (next: FilmIndustryId) => {
        if (next === industry) return;
        const ownedBooks = (state.bookShelf || []).filter(item => item.owned && !item.publicDomain);
        const ownedRemakes = (state.remakeShelf || []).filter(item => item.owned && !item.publicDomain);
        const ownedLives = (state.trueStoryShelf || []).filter(item => item.owned);
        saveStudio({
            ...footprintForCreativeChange(state, next, player.currentWeek, player.age),
            filmIndustry: next,
            bookShelf: [...ownedBooks, ...generateBookShelf(next, `${studio.id}-${next}`)],
            remakeShelf: [...ownedRemakes, ...generateRemakeShelf(next, `${studio.id}-${next}`)],
            trueStoryShelf: [...ownedLives, ...generateTrueStoryShelf(next, `${studio.id}-${next}`)],
        });
        setSongs(INDUSTRIES[next].songs === 'central' ? 4 : 0);
        setNote(`${INDUSTRIES[next].label}. Names, songs, and the writers' room follow this industry.`);
    };

    const ensureCast = () => {
        if (characters.length) return characters;
        const seeded = defaultRoles(genre, INDUSTRIES[industry].songs).map((role, index) => ({
            id: `role_${role.role}_${index}`,
            name: suggestName(industry, role.gender, `${title}|${role.role}|${index}`),
            role: role.role,
            size: role.size,
            gender: role.gender,
        }));
        setCharacters(seeded);
        return seeded;
    };

    const ensureTwists = (people = characters) => {
        if (twists.length >= 4) return twists;
        const offers = generateTwistOffers(genre, people, industry, `${studio.id}|${title}|${genre}`);
        setTwists(offers);
        return offers;
    };

    const rightsReady = () => {
        if (saga) return true;
        if (source === 'ORIGINAL') return true;
        if (source === 'BOOK') return Boolean(book && (book.owned || book.publicDomain) && split);
        if (source === 'REMAKE') return Boolean(remake && (remake.owned || remake.publicDomain));
        return Boolean(story && (story.owned || unauthorized));
    };

    const buy = (cost: number, apply: () => void) => {
        if (cost > 0 && studio.balance < cost) {
            setNote(`The rights are ${formatMoney(cost)}. The house has ${formatMoney(studio.balance)}.`);
            return;
        }
        apply();
        if (cost > 0) setNote(`Rights closed for ${formatMoney(cost)}. That money is spent even if you abandon the draft.`);
    };

    const markBook = (item: BookListing) => {
        const cost = item.owned ? 0 : listingCost.book(item);
        buy(cost, () => {
            const next = { ...item, owned: true, paid: cost };
            setBook(next);
            saveStudio({
                bookShelf: (state.bookShelf || []).map(row => row.id === item.id ? next : row),
            }, -cost);
        });
    };

    const markRemake = (item: RemakeListing) => {
        const cost = item.owned ? 0 : listingCost.remake(item);
        buy(cost, () => {
            const next = { ...item, owned: true, paid: cost };
            setRemake(next);
            saveStudio({
                remakeShelf: (state.remakeShelf || []).map(row => row.id === item.id ? next : row),
            }, -cost);
        });
    };

    const pickStory = (item: TrueStoryListing) => {
        setStory(item);
        setUnauthorized(false);
        if (item.owned) setNote(`${item.subject}'s life rights are already closed.`);
        else setNote(`Life rights are ${formatMoney(listingCost.life(item))}. Buy them, or shoot it without them.`);
    };

    const markStory = (item: TrueStoryListing) => {
        if (item.owned) {
            pickStory(item);
            return;
        }
        const cost = listingCost.life(item);
        buy(cost, () => {
            const next = { ...item, owned: true, paid: cost };
            setStory(next);
            setUnauthorized(false);
            saveStudio({
                trueStoryShelf: (state.trueStoryShelf || []).map(row => row.id === item.id ? next : row),
            }, -cost);
        });
    };

    const startSaga = (row: BookSagaState) => {
        const previous = [...state.scripts].reverse().find(item => item.craft?.sagaId === row.id || item.franchiseId === row.id);
        const people = previous?.craft?.characters?.map(character => ({ ...character, actorId: character.actorId || null })) || [];
        setSaga(row);
        setSource('BOOK');
        setGenre(previous?.genres?.[0] || 'DRAMA');
        setToneId(previous?.craft?.toneId || 'earnest');
        setHookId(previous?.craft?.hookId || '');
        setClimaxId(previous?.craft?.climaxId || '');
        setSongs(previous?.craft?.songs ?? songs);
        setCharacters(people);
        setTitle(suggestTitle(industry, previous?.genres?.[0] || genre, `${row.id}|${row.partsMade + 1}`));
        setTwists([]);
        setStep('PARTS');
        const heat = heatFromProjects(releases, row.id);
        setNote(heat?.note || 'The earlier part has not opened yet. This one starts on curiosity, not a proven crowd.');
    };

    const commit = () => {
        if (studio.balance < room.fee) {
            setNote(`The room costs ${formatMoney(room.fee)}. You are short ${formatMoney(room.fee - studio.balance)}. Drop a writer or write it yourself.`);
            return;
        }
        const people = ensureCast();
        const heat = saga ? heatFromProjects(releases, saga.id) : null;
        const past = saga ? releases.find(item => item.franchiseId === saga.id) : null;
        const bump = heat ? returningBump(heat.score) : (saga?.castPremium || 1);
        const returning = (past?.castList || []).filter((member: { actorId?: string }) => member.actorId && member.actorId !== 'UNKNOWN').map((member: { actorId: string; salary?: number; roleType?: string; name?: string }) => ({
            role: member.roleType === 'LEAD' ? 'LEAD_ACTOR' as const : 'SUPPORTING_ACTOR' as const,
            id: member.actorId,
            originalSalary: member.salary || 100_000,
            newDemand: Math.round((member.salary || 100_000) * Math.max(bump, saga?.castPremium || 1)),
            negotiated: member.actorId === 'PLAYER_SELF',
            accepted: member.actorId === 'PLAYER_SELF',
            attemptsLeft: member.actorId === 'PLAYER_SELF' ? 0 : 3,
        }));
        const built = buildScriptRecord({
            title,
            genre,
            industry,
            draft: { ...draft, characters: people },
            room,
            week: player.currentWeek,
            book: book || undefined,
            remake: remake || undefined,
            story: story || undefined,
            split: saga?.split || (source === 'BOOK' ? split : undefined),
            saga: saga || undefined,
            partIndex: saga ? (openSagas.find(row => row.saga.id === saga.id)?.nextPart || (saga.partsMade + 1)) : 1,
            priorCharacters: people,
            returningTalent: returning.length ? returning : undefined,
            twists,
        });
        const sagas = built.saga
            ? [...(state.bookSagas || []).filter(row => row.id !== built.saga!.id), built.saga]
            : state.bookSagas;
        saveStudio({
            scripts: [...state.scripts, built.script],
            bookSagas: sagas,
            financeLedger: [{
                id: `script_${built.script.id}`,
                week: player.currentWeek,
                year: player.age,
                amount: -room.fee,
                type: 'SCRIPT',
                label: `Writers' room: ${built.script.title}`,
                projectId: built.script.id,
            }, ...(state.financeLedger || [])].slice(0, 200),
        }, -room.fee);
        setNote('');
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
        setNote(`Rewrite ${next.craft?.rewrites} is on the clock. Quality moves up. Freshness is ${Math.round(next.craft?.freshness || 0)}.`);
    };

    const lock = () => {
        if (!liveScript) return;
        const next = lockScript(liveScript);
        saveStudio({ scripts: state.scripts.map(item => item.id === next.id ? next : item) });
        setNote('Locked. Casting happens when you greenlight. Another rewrite means unlocking the draft and spending freshness.');
    };

    const go = (direction: 1 | -1) => {
        const order: StepId[] = ['SOURCE', 'RIGHTS', 'PARTS', 'TWIST', 'CAST', 'WRITERS', 'LOOK'];
        const filtered = order.filter(item => item !== 'RIGHTS' || source !== 'ORIGINAL');
        const index = filtered.indexOf(step);
        if (direction < 0) {
            if (index <= 0) onBack();
            else setStep(filtered[index - 1]);
            return;
        }
        if (step === 'SOURCE' && source !== 'ORIGINAL' && !saga) setStep('RIGHTS');
        else if (step === 'SOURCE') setStep('PARTS');
        else if (step === 'RIGHTS' && rightsReady()) setStep('PARTS');
        else if (step === 'RIGHTS') setNote('Close the rights, or choose to shoot the true story without them.');
        else if (step === 'PARTS' && title.trim() && hookId && climaxId) {
            const people = ensureCast();
            ensureTwists(people);
            setStep('TWIST');
        } else if (step === 'PARTS') setNote('Give it a title, a hook, and a climax. Each one moves the audience, the critics, or the budget.');
        else if (step === 'TWIST' && twistId) setStep('CAST');
        else if (step === 'TWIST') setNote('Pick a twist, or pick no twist. Both are a choice.');
        else if (step === 'CAST') setStep('WRITERS');
        else if (step === 'WRITERS' && (selfWrite || writerIds.length)) setStep('LOOK');
        else if (step === 'WRITERS') setNote('Hire at least one writer, or write it yourself.');
        else if (step === 'LOOK') commit();
    };

    const pageCharacters = characters.length ? characters : defaultRoles(genre, INDUSTRIES[industry].songs).map((role, index) => ({
        id: `role_${role.role}_${index}`,
        name: suggestName(industry, role.gender, `${role.role}|page|${index}`),
        role: role.role,
        size: role.size,
        gender: role.gender,
    }));
    const pageText = liveScript?.craft?.pages || buildScreenplay(buildScriptRecord({
        title: title || 'Untitled',
        genre,
        industry,
        draft: { ...draft, characters: pageCharacters },
        room,
        week: player.currentWeek,
        book: book || undefined,
        remake: remake || undefined,
        story: story || undefined,
        split: source === 'BOOK' ? (saga?.split || split) : undefined,
        saga: saga || undefined,
        twists,
    }).script);

    const steps: StepId[] = managing ? ['ROOM'] : ['SOURCE', 'RIGHTS', 'PARTS', 'TWIST', 'CAST', 'WRITERS', 'LOOK'].filter(item => item !== 'RIGHTS' || source !== 'ORIGINAL') as StepId[];

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#07080c] text-white">
            <header className="shrink-0 border-b border-white/10 px-4 pb-3 pt-10">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => (step === 'SOURCE' || step === 'ROOM' ? onBack() : go(-1))} className="rounded-full bg-white/10 p-2" aria-label="Back">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{INDUSTRIES[industry].label}</div>
                        <h2 className="truncate text-xl font-black">{managing ? (liveScript?.title || 'Script') : 'New script'}</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">House</div>
                        <div className="font-mono text-sm font-bold">{formatMoney(studio.balance)}</div>
                    </div>
                </div>
                {!managing && (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {steps.filter(item => item !== 'ROOM').map(item => (
                            <div key={item} className={`h-1 rounded-full ${steps.indexOf(item) <= steps.indexOf(step) ? 'bg-amber-400' : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                )}
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {note && <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{note}</p>}

                {step === 'SOURCE' && (
                    <div className="space-y-4">
                        <div>
                            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Industry</div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {INDUSTRY_ORDER.map(id => (
                                    <button key={id} type="button" onClick={() => setIndustry(id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${id === industry ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300'}`}>
                                        {INDUSTRIES[id].label}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">{INDUSTRIES[industry].place}. Song culture: {INDUSTRIES[industry].songs}. Names suggested in this room match it.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {SOURCES.map(item => (
                                <button key={item.id} type="button" data-testid={`script-source-${item.id.toLowerCase()}`} onClick={() => { setSource(item.id); setSaga(null); }} className={`rounded-2xl border p-4 text-left ${source === item.id && !saga ? 'border-amber-300 bg-amber-300/10' : 'border-zinc-800 bg-zinc-950'}`}>
                                    <div className="font-black">{item.title}</div>
                                    <p className="mt-1 text-sm text-zinc-400">{item.copy}</p>
                                </button>
                            ))}
                        </div>
                        {openSagas.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Complete the saga</div>
                                {openSagas.map(row => (
                                    <button key={row.saga.id} type="button" onClick={() => startSaga(row.saga)} className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
                                        <div className="font-black">{row.saga.title}</div>
                                        <p className="mt-1 text-sm text-emerald-100/80">Part {row.nextPart} of {row.saga.totalParts}. {row.saga.partsMade > 0 ? 'Earlier parts change the heat and the returning asks.' : 'Rights are already yours.'}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step === 'RIGHTS' && source === 'BOOK' && book?.owned && (
                    <div className="grid grid-cols-1 gap-2">
                        {SPLITS.map(item => (
                            <button key={item.id} type="button" onClick={() => setSplit(item.id)} className={`rounded-2xl border p-4 text-left ${split === item.id ? 'border-white bg-white text-black' : 'border-zinc-800'}`}>
                                <div className="font-black">{item.title}</div>
                                <p className={`mt-1 text-sm ${split === item.id ? 'text-zinc-700' : 'text-zinc-400'}`}>{item.copy}</p>
                            </button>
                        ))}
                    </div>
                )}
                {step === 'RIGHTS' && source === 'BOOK' && (
                    <Shelf
                        title="Buy the book"
                        rows={(state.bookShelf || []).map(item => ({
                            id: item.id,
                            title: item.title,
                            meta: `${item.author} · popularity ${item.popularity}`,
                            copy: item.blurb,
                            cost: listingCost.book(item),
                            owned: Boolean(item.owned || item.publicDomain),
                            selected: book?.id === item.id,
                            onPick: () => markBook(item),
                        }))}
                    />
                )}
                {step === 'RIGHTS' && source === 'REMAKE' && (
                    <Shelf
                        title="Buy the remake"
                        rows={(state.remakeShelf || []).map(item => ({
                            id: item.id,
                            title: `${item.title} (${item.year})`,
                            meta: `Popularity ${item.popularity}`,
                            copy: item.blurb,
                            cost: listingCost.remake(item),
                            owned: Boolean(item.owned || item.publicDomain),
                            selected: remake?.id === item.id,
                            onPick: () => markRemake(item),
                        }))}
                    />
                )}
                {step === 'RIGHTS' && source === 'TRUE_STORY' && (
                    <div className="space-y-2">
                        <Shelf
                            title="Life rights"
                            rows={(state.trueStoryShelf || []).map(item => ({
                                id: item.id,
                                title: item.subject,
                                meta: `${item.kind} · sensitivity ${item.sensitivity}`,
                                copy: item.blurb,
                                cost: listingCost.life(item),
                                owned: Boolean(item.owned),
                                selected: story?.id === item.id && !unauthorized,
                                onPick: () => pickStory(item),
                            }))}
                        />
                        {story && !story.owned && (
                            <div className="grid grid-cols-1 gap-2">
                                <button type="button" onClick={() => markStory(story)} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-left">
                                    <div className="font-black">Buy the life rights · {formatMoney(listingCost.life(story))}</div>
                                    <p className="mt-1 text-sm text-zinc-300">Critics treat it as access. The money is spent even if the draft dies.</p>
                                </button>
                                <button type="button" onClick={() => { setUnauthorized(true); setNote('No life rights. Curiosity goes up. Critics and the subject can punish you.'); }} className={`rounded-2xl border p-4 text-left ${unauthorized ? 'border-rose-400 bg-rose-500/10' : 'border-zinc-800'}`}>
                                    <div className="font-black">Shoot it without the rights</div>
                                    <p className="mt-1 text-sm text-zinc-400">No bill. The estate can make the lawsuit the story.</p>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'PARTS' && (
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Title</span>
                            <div className="mt-1 flex gap-2">
                                <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Untitled" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-base" />
                                <button type="button" aria-label="Suggest a title" onClick={() => setTitle(suggestTitle(industry, genre, `${Date.now()}`))} className="rounded-xl bg-white px-3 text-black"><Dices size={18} /></button>
                            </div>
                        </label>
                        <div className="flex gap-2 overflow-x-auto">
                            {ALL_GENRES.map(item => (
                                <button key={item} type="button" onClick={() => { setGenre(item); setHookId(''); setClimaxId(''); setCharacters([]); setTwists([]); }} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${item === genre ? 'bg-amber-300 text-black' : 'bg-zinc-900'}`}>{formatGenreLabel(item)}</button>
                            ))}
                        </div>
                        <ChoiceGrid title="Tone" rows={TONES} selected={toneId} onPick={setToneId} />
                        <ChoiceGrid title="Hook" rows={choicesForGenre(HOOKS, genre)} selected={hookId} onPick={setHookId} />
                        <ChoiceGrid title="Climax" rows={choicesForGenre(CLIMAXES, genre)} selected={climaxId} onPick={setClimaxId} />
                        <div className="rounded-2xl border border-zinc-800 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-black">Songs</div>
                                    <p className="text-sm text-zinc-400">{songsRead.note}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" className="h-10 w-10 rounded-full bg-zinc-800 text-lg" onClick={() => setSongs(Math.max(0, songs - 1))}>–</button>
                                    <span className="w-6 text-center font-black">{songs}</span>
                                    <button type="button" className="h-10 w-10 rounded-full bg-white text-lg text-black" onClick={() => setSongs(songs + 1)}>+</button>
                                </div>
                            </div>
                            <Delta audience={songsRead.audience} critics={songsRead.critics} budget={songsRead.budget} />
                            {songs > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto">
                                    {SONG_STYLES.map(style => (
                                        <button key={style.id} type="button" onClick={() => setSongStyle(style.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${songStyle === style.id ? 'bg-white text-black' : 'bg-zinc-900'}`}>{style.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'TWIST' && (
                    <div className="space-y-2">
                        {[...twists, noTwist()].map(twist => (
                            <button key={twist.id} type="button" data-testid={`script-twist-${twist.id}`} onClick={() => setTwistId(twist.id)} className={`w-full rounded-2xl border p-4 text-left ${twistId === twist.id ? 'border-amber-300 bg-amber-300/10' : 'border-zinc-800'}`}>
                                <div className="font-black">{twist.label}</div>
                                <p className="mt-1 text-sm text-zinc-300">{twist.detail}</p>
                                {twist.linkedRole && <p className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-200">Tied to {twist.linkedRole}</p>}
                                <p className="mt-2 text-xs text-rose-200">Risk: {twist.risk}</p>
                                <p className="mt-1 text-xs text-emerald-200">Reward: {twist.reward}</p>
                                <Delta audience={twist.audience} critics={twist.critics} />
                            </button>
                        ))}
                    </div>
                )}

                {step === 'CAST' && (
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-400">Each part is cast later. A star in a small role costs more. A wide bench costs more and can play as an ensemble. These names carry into the next part.</p>
                        {characters.map(character => (
                            <div key={character.id} className="rounded-2xl border border-zinc-800 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-black uppercase tracking-wider text-zinc-500">{character.role} · {character.size.toLowerCase()}</div>
                                    <button type="button" className="text-xs text-rose-300" onClick={() => setCharacters(characters.filter(item => item.id !== character.id))}>Remove</button>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <input value={character.name} onChange={event => setCharacters(characters.map(item => item.id === character.id ? { ...item, name: event.target.value } : item))} className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-3 py-3" />
                                    <button type="button" data-testid="script-suggest-name" aria-label={`Suggest a name for ${character.role}`} className="rounded-xl bg-white px-3 text-black" onClick={() => setCharacters(characters.map(item => item.id === character.id ? { ...item, name: suggestName(industry, character.gender || 'ANY', `${item.id}|${Date.now()}`) } : item))}>
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="flex gap-2 overflow-x-auto">
                            {EXTRA_ROLES.map(role => (
                                <button key={role.role} type="button" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-3 py-2 text-xs font-bold" onClick={() => setCharacters([...characters, { id: `role_${role.role}_${characters.length}_${Date.now()}`, name: suggestName(industry, role.gender, `${role.role}|${characters.length}|${Date.now()}`), role: role.role, size: role.size, gender: role.gender }])}>
                                    <Plus size={12} /> {role.role}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'WRITERS' && (
                    <div className="space-y-3">
                        <button type="button" onClick={() => setSelfWrite(!selfWrite)} className={`w-full rounded-2xl border p-4 text-left ${selfWrite ? 'border-amber-300 bg-amber-300/10' : 'border-zinc-800'}`}>
                            <div className="font-black">Write it yourself</div>
                            <p className="mt-1 text-sm text-zinc-400">Skill {playerSkill}. No fee. A thin skill slips the date more often.</p>
                        </button>
                        {state.writers.map(writer => (
                            <WriterCard key={writer.id} writer={writer} genre={genre} on={writerIds.includes(writer.id)} disabled={!writerIds.includes(writer.id) && studio.balance < writer.fee + chosenWriters.reduce((sum, item) => sum + item.fee, 0)} onToggle={() => setWriterIds(writerIds.includes(writer.id) ? writerIds.filter(id => id !== writer.id) : [...writerIds, writer.id])} />
                        ))}
                        <div className="rounded-2xl bg-zinc-900 p-4 text-sm">
                            <div>Room skill {room.skill} · {room.weeks} weeks · {slipLabel(room.slipRisk)}</div>
                            <div className="mt-1 font-mono">{room.fee ? formatMoney(room.fee) : 'No fee'}</div>
                            <p className="mt-2 text-zinc-400">A bigger name costs more and takes longer. A room of several writers is stronger and easier to delay.</p>
                        </div>
                    </div>
                )}

                {(step === 'LOOK' || showPage) && (
                    <ScreenplayPage text={pageText} />
                )}

                {step === 'ROOM' && liveScript?.craft && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {(['IDEA', 'TREATMENT', 'FIRST_DRAFT', 'REWRITES', 'LOCKED'] as const).map(stage => (
                                <div key={stage} className={`rounded-xl border px-3 py-2 text-xs font-bold ${liveScript.craft?.stage === stage ? 'border-amber-300 text-amber-200' : 'border-zinc-800 text-zinc-500'}`}>{stageLabel(stage)}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Meter label="Quality" value={liveScript.quality} />
                            <Meter label="Freshness" value={liveScript.craft.freshness} tone="bg-emerald-400" />
                            <Meter label="Audience" value={liveScript.craft.audienceAppeal} tone="bg-orange-400" />
                            <Meter label="Critics" value={liveScript.craft.criticAppeal} tone="bg-sky-400" />
                        </div>
                        <p className="text-sm text-zinc-400">Week {liveScript.weeksInDevelopment} of {liveScript.totalDevelopmentWeeks}. {liveScript.craft.slipWeeks ? `${liveScript.craft.slipWeeks} slipped. ` : ''}{liveScript.craft.rewriteWeeksLeft ? `Rewrite in progress, ${liveScript.craft.rewriteWeeksLeft} weeks left.` : 'Another rewrite raises the ceiling and spends freshness.'}</p>
                        {liveScript.craft.coverage && (
                            <div data-testid="coverage-report" className="rounded-2xl border border-zinc-800 p-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Coverage</div>
                                <div className="mt-1 text-2xl font-black">{coverageLabel(liveScript.craft.coverage.verdict)}</div>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <Meter label="Plot" value={liveScript.craft.coverage.plot} />
                                    <Meter label="Dialogue" value={liveScript.craft.coverage.dialogue} />
                                    <Meter label="Characters" value={liveScript.craft.coverage.characters} />
                                    <Meter label="Market" value={liveScript.craft.coverage.market} tone="bg-orange-400" />
                                </div>
                                <p className="mt-3 text-sm text-zinc-300">{liveScript.craft.coverage.note}</p>
                            </div>
                        )}
                        {liveScript.craft.leak?.leaked && (
                            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
                                The draft leaked.{liveScript.craft.leak.rivalTitle ? ` ${liveScript.craft.leak.rivalStudio} is rushing "${liveScript.craft.leak.rivalTitle}".` : ' The surprise is thinner.'} Audience heat drops by {liveScript.craft.leak.heat}.
                            </div>
                        )}
                        {liveScript.craft.characters.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {liveScript.craft.characters.map(character => (
                                    <div key={character.id} className="min-w-[9rem] rounded-xl bg-zinc-900 p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{character.role}</div>
                                        <div className="font-bold">{character.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button type="button" onClick={() => setShowPage(!showPage)} className="inline-flex items-center gap-2 text-sm font-bold text-amber-200"><ScrollText size={16} /> {showPage ? 'Hide pages' : 'Read the pages'}</button>
                        {liveScript.status === 'READY' && <p className="text-sm text-emerald-200">Locked. Greenlight it to cast. The names are already on the roles.</p>}
                    </div>
                )}

                {step !== 'ROOM' && step !== 'LOOK' && (
                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-zinc-900/80 p-3">
                        <Meter label="Audience" value={score.audience} tone="bg-orange-400" />
                        <Meter label="Critics" value={score.critics} tone="bg-sky-400" />
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Budget</div>
                            <div className="mt-1 font-mono text-sm font-black">{formatMoney(Math.max(0, score.budget))}</div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="shrink-0 border-t border-white/10 bg-[#07080c] px-4 py-3 pb-nav-safe">
                {step === 'ROOM' && liveScript ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" data-testid="script-rewrite" onClick={rewrite} className="rounded-2xl bg-zinc-800 py-3 text-sm font-black">Rewrite · {formatMoney(rewriteCost(liveScript))}</button>
                        <button type="button" data-testid="script-lock" onClick={lock} disabled={liveScript.status === 'READY'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3 text-sm font-black text-black disabled:opacity-40"><Lock size={16} /> {liveScript.status === 'READY' ? 'Locked' : 'Final lock'}</button>
                    </div>
                ) : (
                    <button type="button" data-testid="script-next" onClick={() => go(1)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-black">
                        {step === 'LOOK' ? <><PenLine size={16} /> Hire the room · {formatMoney(room.fee)}</> : step === 'WRITERS' ? <><Users size={16} /> See the pages</> : <><Clapperboard size={16} /> Continue</>}
                    </button>
                )}
            </footer>
        </div>
    );
};

const ChoiceGrid: React.FC<{ title: string; rows: { id: string; label: string; detail: string; audience: number; critics: number; budget: number }[]; selected: string; onPick: (id: string) => void }> = ({ title, rows, selected, onPick }) => (
    <div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</div>
        <div className="grid grid-cols-1 gap-2">
            {rows.map(row => (
                <button key={row.id} type="button" onClick={() => onPick(row.id)} className={`rounded-2xl border p-3 text-left ${selected === row.id ? 'border-amber-300 bg-amber-300/10' : 'border-zinc-800'}`}>
                    <div className="font-bold">{row.label}</div>
                    <p className="text-sm text-zinc-400">{row.detail}</p>
                    <Delta audience={row.audience} critics={row.critics} budget={row.budget} />
                </button>
            ))}
        </div>
    </div>
);

const Shelf: React.FC<{ title: string; rows: { id: string; title: string; meta: string; copy: string; cost: number; owned: boolean; selected: boolean; onPick: () => void }[] }> = ({ title, rows }) => (
    <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</div>
        {rows.map(row => (
            <button key={row.id} type="button" onClick={row.onPick} className={`w-full rounded-2xl border p-4 text-left ${row.selected ? 'border-amber-300 bg-amber-300/10' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="font-black">{row.title}</div>
                        <div className="text-xs text-zinc-500">{row.meta}</div>
                    </div>
                    <div className="shrink-0 font-mono text-sm font-bold">{row.owned ? 'Owned' : row.cost === 0 ? 'Public' : formatMoney(row.cost)}</div>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{row.copy}</p>
            </button>
        ))}
    </div>
);

const WriterCard: React.FC<{ writer: Writer; genre: Genre; on: boolean; disabled: boolean; onToggle: () => void }> = ({ writer, genre, on, disabled, onToggle }) => (
    <button type="button" disabled={disabled && !on} onClick={onToggle} className={`w-full rounded-2xl border p-4 text-left disabled:opacity-40 ${on ? 'border-emerald-300 bg-emerald-400/10' : 'border-zinc-800'}`}>
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="font-black">{writer.name}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">{writer.tier.replace('_', ' ')} · skill {writer.skill}</div>
            </div>
            <div className="text-right font-mono text-sm">{formatMoney(writer.fee)}</div>
        </div>
        <p className="mt-2 text-sm text-zinc-300">{writer.scheduleWeeks || 12} weeks · {slipLabel(writer.slipRisk || 0.15)} · {(writer.genreStrengths || []).map(item => formatGenreLabel(item)).join(', ')}</p>
        <p className="mt-1 text-xs text-zinc-500">{writer.genreStrengths?.includes(genre) ? 'In their lane for this genre.' : 'Outside their lane. The draft is weaker, and you can still hire them.'}</p>
    </button>
);
