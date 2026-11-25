import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import type { CensorFiling, CensorStatus, Player, ProjectDetails } from '../../../types';
import { industryById } from '../../../services/industryEngine';
import { ratingsFor } from '../../../services/scriptDesk/v2';
import {
    acceptCensorCuts,
    acceptHigherRating,
    appealCensorRefusal,
    appealFee,
    censorStatusLabel,
    fileWithBoards,
    filingClock,
    filingProgress,
    orderedTerritories,
    recutFee,
    scheduleCertifiedCountry,
    scriptCertificate,
    suggestedRating,
    territoryById,
    homeTerritoryFor,
} from '../../../services/censorBoard';

interface DeskProject {
    id: string;
    name: string;
    projectPhase?: string;
    projectDetails?: ProjectDetails;
}

interface CensorDeskProps {
    player: Player;
    project: DeskProject;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
    onPlanRelease?: () => void;
}

const money = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${Math.round(value).toLocaleString()}`;
};

const tone: Record<CensorStatus, string> = {
    PENDING: 'bg-zinc-800 text-zinc-200',
    UNDER_REVIEW: 'bg-amber-400/15 text-amber-200',
    CUTS_REQUESTED: 'bg-orange-400/15 text-orange-200',
    RATING_OFFERED: 'bg-sky-400/15 text-sky-100',
    APPROVED: 'bg-emerald-400/15 text-emerald-200',
    REJECTED: 'bg-rose-500/15 text-rose-200',
};

const barTone: Record<CensorStatus, string> = {
    PENDING: 'bg-zinc-400',
    UNDER_REVIEW: 'bg-amber-400',
    CUTS_REQUESTED: 'bg-orange-400',
    RATING_OFFERED: 'bg-sky-400',
    APPROVED: 'bg-emerald-400',
    REJECTED: 'bg-rose-400',
};

const liveProject = (player: Player, project: DeskProject): DeskProject => {
    const commitment = player.commitments?.find(row => row.id === project.id);
    if (commitment) return { id: commitment.id, name: commitment.name, projectPhase: commitment.projectPhase, projectDetails: commitment.projectDetails };
    const release = player.activeReleases?.find(row => row.id === project.id);
    if (release) return { id: release.id, name: release.name, projectPhase: 'RELEASED', projectDetails: release.projectDetails };
    return project;
};

export const CensorDesk: React.FC<CensorDeskProps> = ({ player, project, onBack, onUpdatePlayer, onPlanRelease }) => {
    const live = liveProject(player, project);
    const details = live.projectDetails;
    const docket = details?.censor;
    const preview = scriptCertificate(player, details);
    const [error, setError] = useState('');
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [ratings, setRatings] = useState<Record<string, string>>({});
    const [laterWeeks, setLaterWeeks] = useState<Record<string, number>>({});

    const homeId = docket?.homeTerritoryId || (details ? homeTerritoryFor(player, details) : 'US');
    const scriptIndustry = docket?.scriptIndustryId || preview?.scriptIndustryId;
    const scriptRatingId = docket?.scriptRatingId || preview?.scriptRatingId;
    const territories = useMemo(() => orderedTerritories(homeId), [homeId]);
    const filed = new Set((docket?.filings || []).map(row => row.territoryId));
    const openTerritories = territories.filter(row => !filed.has(row.id));
    const locked = live.projectPhase === 'POST_PRODUCTION';
    const dated = !!details?.releaseStrategy || live.projectPhase === 'RELEASED';

    const apply = (result: { player: Player; error?: string }) => {
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onUpdatePlayer(result.player);
    };

    const file = () => {
        const picks = openTerritories.filter(row => picked[row.id]).map(row => ({
            territoryId: row.id,
            ratingId: ratings[row.id] || suggestedRating(row.industryId, scriptIndustry, scriptRatingId).id,
        }));
        apply(fileWithBoards(player, live.id, picks));
    };

    return (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-zinc-950 text-white">
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-4 sm:px-8 sm:py-8">
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-zinc-300">
                        <ArrowLeft size={16} /> Back
                    </button>
                    {onPlanRelease && !docket?.grandfathered && (
                        <button type="button" onClick={onPlanRelease} className="min-h-11 rounded-full bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-black">
                            Release plan
                        </button>
                    )}
                </div>

                <div className="mt-6 max-w-3xl">
                    <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">Certification</div>
                    <h1 className="mt-2 font-serif text-4xl font-light tracking-tight sm:text-6xl">{live.name}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                        Each country uses its own board. Nothing opens there without a certificate. A hotter print can mean cuts, a higher card, or a delay. It is not a wall.
                    </p>
                </div>

                {error && <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

                {docket?.grandfathered && (
                    <p className="mt-8 max-w-xl text-sm leading-relaxed text-zinc-300">This picture was already on the calendar. The boards are not reopening it, and the release is unchanged.</p>
                )}

                {!docket?.grandfathered && locked && (
                    <p className="mt-8 max-w-xl text-sm leading-relaxed text-zinc-300">Post is still finishing the cut. The boards take the print once it is locked.</p>
                )}

                {!docket?.grandfathered && !locked && (
                    <>
                        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">What the board is reading</div>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-200 sm:text-base">
                                {docket ? (
                                    <>Violence {Math.round(docket.violence)}, romance {Math.round(docket.intimacy)}, language {Math.round(docket.language)}
                                        {docket.scriptRatingLabel ? <> · the script asked its home board for {docket.scriptRatingLabel}</> : null}
                                        {docket.heat > 20 ? <> · heat {Math.round(docket.heat)}</> : null}.</>
                                ) : preview ? (
                                    <>Violence {Math.round(preview.violence)}, romance {Math.round(preview.intimacy)}, language {Math.round(preview.language)}
                                        {preview.scriptRatingLabel ? <> · filed at home as {preview.scriptRatingLabel}</> : null}. The board reads this when you submit.</>
                                ) : (
                                    <>The sliders come off the script. A certificate the scenes outrun is an argument, not a refusal on sight.</>
                                )}
                            </p>
                        </div>

                        {!!docket?.filings.length && (
                            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                {docket.filings.map(filing => (
                                    <FilingCard
                                        key={filing.territoryId}
                                        filing={filing}
                                        dated={dated}
                                        weeks={laterWeeks[filing.territoryId] ?? 4}
                                        onWeeks={value => setLaterWeeks(current => ({ ...current, [filing.territoryId]: value }))}
                                        onCuts={() => apply(acceptCensorCuts(player, live.id, filing.territoryId))}
                                        onRating={() => apply(acceptHigherRating(player, live.id, filing.territoryId))}
                                        onAppeal={() => apply(appealCensorRefusal(player, live.id, filing.territoryId))}
                                        onSchedule={() => apply(scheduleCertifiedCountry(player, live.id, filing.territoryId, laterWeeks[filing.territoryId] ?? 4))}
                                    />
                                ))}
                            </div>
                        )}

                        {openTerritories.length > 0 && (
                            <div className="mt-8">
                                <h2 className="font-serif text-2xl font-light">{docket?.filings.length ? 'File another country' : 'Choose the countries'}</h2>
                                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {openTerritories.map(territory => {
                                        const options = ratingsFor(territory.industryId);
                                        const suggested = suggestedRating(territory.industryId, scriptIndustry, scriptRatingId);
                                        const ratingId = ratings[territory.id] || suggested.id;
                                        const on = !!picked[territory.id];
                                        return (
                                            <label key={territory.id} className={`block rounded-3xl border p-4 ${on ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/10 bg-black/20'}`}>
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 h-5 w-5 accent-amber-400"
                                                        checked={on}
                                                        onChange={event => setPicked(current => ({ ...current, [territory.id]: event.target.checked }))}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-lg font-semibold">{territory.country}</div>
                                                        <div className="text-sm text-zinc-400">{territory.note}</div>
                                                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">{industryById(territory.industryId).censor.name}</div>
                                                        <select
                                                            aria-label={`${territory.country} rating`}
                                                            value={ratingId}
                                                            onChange={event => setRatings(current => ({ ...current, [territory.id]: event.target.value }))}
                                                            className="mt-3 w-full rounded-2xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
                                                        >
                                                            {options.filter(option => option.id !== 'HELD').map(option => (
                                                                <option key={option.id} value={option.id}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    data-testid="censor-file"
                                    onClick={file}
                                    className="mt-4 min-h-12 w-full rounded-full bg-amber-400 px-6 text-sm font-black uppercase tracking-[0.16em] text-black sm:w-auto"
                                >
                                    Submit to the boards
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const FilingCard: React.FC<{
    filing: CensorFiling;
    dated: boolean;
    weeks: number;
    onWeeks: (weeks: number) => void;
    onCuts: () => void;
    onRating: () => void;
    onAppeal: () => void;
    onSchedule: () => void;
}> = ({ filing, dated, weeks, onWeeks, onCuts, onRating, onAppeal, onSchedule }) => {
    const progress = Math.round(filingProgress(filing) * 100);
    const territory = territoryById(filing.territoryId);
    return (
        <article className="flex flex-col rounded-3xl border border-white/10 bg-zinc-900/80 p-4 sm:p-5" data-testid={`censor-card-${filing.territoryId}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">{filing.country}</div>
                    <div className="text-sm text-zinc-400">{filing.boardName}</div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tone[filing.status]}`}>
                    {censorStatusLabel(filing)}
                </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{territory.note}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Requested</div>
                    <div className="mt-1 font-semibold">{filing.requestedRatingLabel}</div>
                </div>
                <div className="rounded-2xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{filing.status === 'APPROVED' ? 'Granted' : 'On the table'}</div>
                    <div className="mt-1 font-semibold">{filing.grantedRatingLabel || filing.offeredRatingLabel || '—'}</div>
                </div>
            </div>
            <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {filingClock(filing)}</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full ${barTone[filing.status]}`} style={{ width: `${progress}%` }} />
                </div>
            </div>
            {!!filing.beats.length && (
                <ol className="mt-4 space-y-2 border-l border-white/10 pl-3">
                    {filing.beats.map((entry, index) => (
                        <li key={`${entry.week}-${index}`} className="text-sm leading-relaxed text-zinc-300">
                            <span className="text-zinc-500">Wk {entry.week} · </span>{entry.text}
                        </li>
                    ))}
                </ol>
            )}
            {!!filing.cuts.length && (
                <ul className="mt-4 space-y-2">
                    {filing.cuts.map(cut => (
                        <li key={cut.id} className="rounded-2xl border border-orange-400/20 bg-orange-400/5 px-3 py-2 text-sm">
                            <div className="font-semibold text-orange-100">{cut.scene}</div>
                            <p className="mt-1 text-zinc-300">{cut.detail}</p>
                        </li>
                    ))}
                </ul>
            )}
            {filing.note && !filing.beats.some(entry => entry.text === filing.note) && (
                <p className="mt-3 text-sm text-zinc-400">{filing.note}</p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {filing.status === 'CUTS_REQUESTED' && filing.cuts.length > 0 && (
                    <button type="button" onClick={onCuts} className="min-h-11 rounded-full bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-black">
                        Accept cuts · {money(recutFee(filing))}
                    </button>
                )}
                {filing.offeredRatingLabel && (filing.status === 'RATING_OFFERED' || filing.status === 'CUTS_REQUESTED') && (
                    <button type="button" onClick={onRating} className="min-h-11 rounded-full border border-white/15 px-4 text-xs font-black uppercase tracking-[0.14em]">
                        Accept {filing.offeredRatingLabel}
                    </button>
                )}
                {filing.status === 'REJECTED' && filing.appeals < 2 && (
                    <button type="button" onClick={onAppeal} className="min-h-11 rounded-full border border-rose-400/40 px-4 text-xs font-black uppercase tracking-[0.14em] text-rose-100">
                        Appeal · {money(appealFee(filing))}
                    </button>
                )}
                {filing.status === 'APPROVED' && !filing.opened && dated && !filing.inOpening && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <select
                            aria-label={`${filing.country} opening`}
                            value={weeks}
                            onChange={event => onWeeks(Number(event.target.value))}
                            className="min-h-11 rounded-2xl border border-white/10 bg-zinc-950 px-3 text-sm"
                        >
                            <option value={1}>Next week</option>
                            <option value={2}>In 2 weeks</option>
                            <option value={4}>In 4 weeks</option>
                            <option value={8}>In 8 weeks</option>
                        </select>
                        <button type="button" onClick={onSchedule} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-xs font-black uppercase tracking-[0.14em] text-black">
                            <CheckCircle2 size={14} /> Open in {filing.country}
                        </button>
                    </div>
                )}
                {filing.status === 'APPROVED' && filing.certificateNo && (
                    <div className="text-xs uppercase tracking-[0.16em] text-emerald-200/80">{filing.certificateNo}</div>
                )}
            </div>
        </article>
    );
};

export const CensorReleaseStrip: React.FC<{
    player: Player;
    project: { id: string; projectDetails?: ProjectDetails };
    streaming: boolean;
    selected: Record<string, { on: boolean; extra: number }>;
    onChange: (territoryId: string, next: { on: boolean; extra: number }) => void;
    onOpenDesk?: () => void;
}> = ({ player, project, streaming, selected, onChange, onOpenDesk }) => {
    const details = player.commitments.find(row => row.id === project.id)?.projectDetails || project.projectDetails;
    const docket = details?.censor;
    if (docket?.grandfathered) return null;
    const filings = docket?.filings || [];
    if (!filings.length) {
        return (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-50">
                <p>No country has a certificate yet. Exhibitors will not take a date.</p>
                {onOpenDesk && (
                    <button type="button" onClick={onOpenDesk} className="mt-3 min-h-11 rounded-full bg-amber-400 px-4 text-xs font-black uppercase tracking-[0.14em] text-black">
                        Open the censor desk
                    </button>
                )}
            </div>
        );
    }
    return (
        <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">Countries on this release</div>
            {filings.map(filing => {
                const approved = filing.status === 'APPROVED';
                const state = selected[filing.territoryId] || { on: approved, extra: 0 };
                return (
                    <div key={filing.territoryId} className={`rounded-3xl border px-4 py-3 ${approved ? 'border-white/10' : 'border-white/5 opacity-70'}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 accent-amber-400"
                                    disabled={!approved}
                                    checked={approved && state.on}
                                    onChange={event => onChange(filing.territoryId, { ...state, on: event.target.checked })}
                                />
                                <span>
                                    <span className="block font-semibold">{filing.country}</span>
                                    <span className="block text-sm text-zinc-400">
                                        {filing.boardName} · {censorStatusLabel(filing)}
                                        {filing.grantedRatingLabel ? ` · ${filing.grantedRatingLabel}` : ''}
                                        {!approved ? ' · no release without a certificate' : ''}
                                    </span>
                                </span>
                            </label>
                            {approved && state.on && !streaming && (
                                <select
                                    aria-label={`${filing.country} delay`}
                                    value={state.extra}
                                    onChange={event => onChange(filing.territoryId, { ...state, extra: Number(event.target.value) })}
                                    className="min-h-11 rounded-2xl border border-white/10 bg-zinc-950 px-3 text-sm"
                                >
                                    <option value={0}>Opens on this date</option>
                                    <option value={2}>2 weeks later</option>
                                    <option value={4}>4 weeks later</option>
                                    <option value={8}>8 weeks later</option>
                                </select>
                            )}
                        </div>
                    </div>
                );
            })}
            {streaming && <p className="text-sm text-zinc-400">Streaming opens in every selected country the same week. Theatrical dates can be staggered.</p>}
        </div>
    );
};
