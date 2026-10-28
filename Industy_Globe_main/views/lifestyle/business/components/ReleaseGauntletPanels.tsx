import React, { useState } from 'react';
import { Player } from '../../../../types';
import { FESTIVALS } from '../../../../services/worldLogic';
import { chooseTestScreening, holdTestScreening, selectionChance, screeningCost, submitToFestival } from '../../../../services/releaseGauntlet';

interface ReleaseGauntletPanelsProps {
    player: Player;
    project: any;
    onUpdatePlayer: (player: Player) => void;
    onPlanRelease?: (project: any) => void;
}

const money = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${Math.round(value).toLocaleString()}`;
};

export const ReleaseGauntletPanels: React.FC<ReleaseGauntletPanelsProps> = ({ player, project, onUpdatePlayer, onPlanRelease }) => {
    const live = player.commitments.find(item => item.id === project.id);
    const details = live?.projectDetails || project.projectDetails;
    const [error, setError] = useState('');
    if (!live || !details || details.type !== 'MOVIE') return null;

    const screening = details.testScreening;
    const run = details.festivalRun;
    const phase = live.projectPhase;
    const releaseLocked = Boolean(details.releaseStrategy);
    const offerStillOpen = screening?.status === 'OFFERED' && !releaseLocked && (phase === 'POST_PRODUCTION' || phase === 'AWAITING_RELEASE');
    const showScreening = Boolean(screening) && (
        offerStillOpen
        || screening?.status === 'RESULTS'
        || screening?.status === 'WORKING'
        || (screening?.status === 'RESOLVED' && phase === 'POST_PRODUCTION')
    );
    const showFestival = phase === 'POST_PRODUCTION' || phase === 'AWAITING_RELEASE';
    if (!showScreening && !showFestival) return null;

    const apply = (result: { player: Player; error?: string }) => {
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onUpdatePlayer(result.player);
    };

    const quality = Math.round(details.hiddenStats?.qualityScore || 0);

    return (
        <div className="md:col-span-2 space-y-4">
            {error && <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

            {showScreening && screening && (
                <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6" data-testid="test-screening-panel">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">Test screening</div>
                    {screening.status === 'OFFERED' && (
                        <>
                            <p className="mt-2 text-sm text-zinc-300">A recruited audience, before you spend the marketing money. The number is a hint, not the review.</p>
                            <button
                                data-testid="test-screening-hold"
                                onClick={() => apply(holdTestScreening(player, live.id))}
                                className="mt-4 rounded-full bg-emerald-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black"
                            >
                                Hold screening · {money(screeningCost(details.budgetTier))}
                            </button>
                        </>
                    )}
                    {screening.status === 'RESULTS' && (
                        <div data-testid="test-screening-result" className="mt-3 space-y-4">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <div className="text-5xl font-black text-white">{screening.testScore}</div>
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Test score</div>
                                </div>
                                <p className="max-w-sm text-sm text-zinc-400">Within 8 points of the audience score this cut would earn. A recut can move the real number.</p>
                            </div>
                            <ul className="space-y-2 text-sm text-zinc-200">
                                {(screening.notes || []).map(note => <li key={note}>• {note}</li>)}
                            </ul>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => apply(chooseTestScreening(player, live.id, 'RELEASE'))} className="rounded-2xl bg-white py-3 text-[11px] font-black uppercase tracking-[0.14em] text-black">Release as is</button>
                                <button onClick={() => apply(chooseTestScreening(player, live.id, 'RECUT'))} className="rounded-2xl border border-white/15 py-3 text-[11px] font-black uppercase tracking-[0.14em]">Recut · 2–4 wks</button>
                                <button onClick={() => apply(chooseTestScreening(player, live.id, 'RESHOOT'))} className="rounded-2xl border border-white/15 py-3 text-[11px] font-black uppercase tracking-[0.14em]">Reshoot ending</button>
                                <button onClick={() => apply(chooseTestScreening(player, live.id, 'BURY'))} className="rounded-2xl border border-rose-400/40 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-rose-200" data-testid="test-screening-bury">Bury it</button>
                            </div>
                        </div>
                    )}
                    {screening.status === 'WORKING' && (
                        <p className="mt-2 text-sm text-zinc-300">
                            {screening.choice === 'RESHOOT' ? 'The ending is being reshot.' : 'The recut is on the bench.'} {screening.workWeeksLeft} weeks left. You will not see whether it helped until the work is done.
                        </p>
                    )}
                    {screening.status === 'RESOLVED' && (
                        <p className="mt-2 text-sm text-zinc-300">
                            {screening.choice === 'BURY' && 'Buried. It goes to streaming without a campaign.'}
                            {screening.choice === 'RELEASE' && 'Going out in the screened cut.'}
                            {screening.choice === 'RECUT' && 'The recut is locked.'}
                            {screening.choice === 'RESHOOT' && 'The reshoot is locked.'}
                        </p>
                    )}
                    {phase === 'AWAITING_RELEASE' && !releaseLocked && onPlanRelease && (
                        <button onClick={() => onPlanRelease(live)} className="mt-4 rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
                            Plan the release
                        </button>
                    )}
                </div>
            )}

            {showFestival && (
                <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6" data-testid="festival-submit-panel">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Festival circuit</div>
                    {!run && (
                        <>
                            <p className="mt-2 text-sm text-zinc-300">Submit once. The festival decides on its opening week. Quality {quality} raises the odds. It does not buy the slot.</p>
                            <div className="mt-4 space-y-2">
                                {FESTIVALS.map(fest => {
                                    const chance = Math.round(selectionChance(quality, fest.prestigeReq) * 100);
                                    const weeks = fest.weeks.length > 1 ? `Weeks ${fest.weeks[0]}–${fest.weeks[fest.weeks.length - 1]}` : `Week ${fest.weeks[0]}`;
                                    return (
                                        <button
                                            key={fest.id}
                                            data-testid={`festival-submit-${fest.id}`}
                                            onClick={() => apply(submitToFestival(player, live.id, fest.id))}
                                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left hover:border-amber-400/40"
                                        >
                                            <div>
                                                <div className="font-bold">{fest.name}</div>
                                                <div className="text-[11px] text-zinc-500">{weeks} · bar {fest.prestigeReq} · {chance}% chance</div>
                                            </div>
                                            <div className="text-sm font-mono text-amber-200">{money(fest.cost)}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {run && (
                        <div className="mt-3 text-sm text-zinc-200">
                            <div className="font-bold text-white">{FESTIVALS.find(fest => fest.id === run.festivalId)?.name}</div>
                            <div className="mt-1 uppercase tracking-[0.16em] text-[10px] text-amber-200">{run.status}</div>
                            {typeof run.reaction === 'number' && <div className="mt-2">Premiere reaction {run.reaction}{run.prize ? ` · ${run.prize}` : ''}</div>}
                            {run.status === 'SUBMITTED' && <p className="mt-2 text-zinc-400">Waiting on the festival week. Open the film before then and the submission is withdrawn.</p>}
                            {run.status === 'REJECTED' && <p className="mt-2 text-zinc-400">They passed. The fee stays spent.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
