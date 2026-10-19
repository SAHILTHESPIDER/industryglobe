import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OwnPlatformState, Player } from '../../types';
import { ensureOwnPlatform } from '../../services/ownPlatform/migrate';
import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import { Shell } from './ui';
import { DefineLaunch } from './DefineLaunch';
import { BuildPlatform } from './BuildPlatform';
import { DealRoom } from './DealRoom';
import { LAUNCH_REGIONS } from '../../services/ownPlatform/catalog';

type Pane = 'launch' | 'build' | 'rights' | 'world';

interface Props {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
    initialPane?: Pane;
}

export const OwnPlatformApp: React.FC<Props> = ({ player, onBack, onUpdatePlayer, initialPane }) => {
    const [pane, setPane] = useState<Pane>(initialPane || (player.ownPlatform?.stage === 'BUILD' || player.ownPlatform?.stage === 'CONSTRUCTING' || player.ownPlatform?.stage === 'LIVE' ? 'build' : 'launch'));

    useEffect(() => {
        if (!player.ownPlatform) onUpdatePlayer(ensureOwnPlatform(player));
    }, [player, onUpdatePlayer]);

    if (!player.ownPlatform) {
        return createPortal(
            <Shell onBack={onBack} kicker="Empire+" title="Opening the books" step="">
                <p className="p-8 text-zinc-400">Preparing the launch…</p>
            </Shell>,
            document.body
        );
    }

    const state = player.ownPlatform;
    const quote = quoteLaunch(player);
    const setPlatform = (next: OwnPlatformState) => onUpdatePlayer({ ...player, ownPlatform: next });
    const serviceName = state.name.trim() || 'Empire+';
    const launchTitles = [
        serviceName,
        'Clear the markets',
        'Choose the sound',
        'Pick a storefront',
        'Assemble the shelf',
        'Set the price',
        'Read the blueprint',
    ];
    const kicker = pane === 'launch' ? 'Define the launch' : pane === 'build' ? 'Build the platform' : pane === 'rights' ? 'Film distribution' : 'The world';
    const title = pane === 'launch'
        ? launchTitles[state.defineStep] || serviceName
        : pane === 'build'
            ? (state.buildStep === 0 ? 'Lay the network across the world' : state.buildStep === 1 ? 'Then find out what it costs' : state.buildStep === 2 ? 'Rehearse opening night' : 'Sign the build')
            : pane === 'rights'
                ? 'Who gets the film'
                : 'Forty desks, one audience';
    const stepLabel = pane === 'launch' ? `${state.defineStep + 1} / 7` : pane === 'build' ? `${state.buildStep + 1} / 4` : '';

    return createPortal(
        <Shell onBack={onBack} kicker={kicker} title={title} step={stepLabel}>
            <div className="px-4 lg:px-10 pt-3 flex flex-wrap gap-2 items-center">
                {([
                    ['launch', 'Launch'],
                    ['build', 'Build'],
                    ['rights', 'Rights'],
                    ['world', 'World'],
                ] as [Pane, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setPane(id)} className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${pane === id ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>{label}</button>
                ))}
                {state.stage === 'CONSTRUCTING' && <span className="text-xs text-amber-200">{state.constructionWeeksLeft} weeks of construction · reserve is paying the burn</span>}
                {state.stage === 'LIVE' && <span className="text-xs text-emerald-300">{formatPeople(state.subscribers)} subscribers · week {state.weeksLive} · piracy {Math.round(state.piracyShare * 100)}%</span>}
            </div>
            {pane === 'launch' && (
                <DefineLaunch
                    player={player}
                    onChange={setPlatform}
                    onBuild={() => { setPlatform({ ...state, stage: state.commissioned ? state.stage : 'BUILD' }); setPane('build'); }}
                />
            )}
            {pane === 'build' && (
                <BuildPlatform
                    player={player}
                    onChange={setPlatform}
                    onPlayer={onUpdatePlayer}
                    onLaunch={() => setPane('launch')}
                />
            )}
            {pane === 'rights' && <DealRoom player={player} onPlayer={onUpdatePlayer} />}
            {pane === 'world' && (
                <div className="p-4 lg:p-10 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
                    <div>
                        <p className="text-sm text-zinc-400 max-w-2xl">{state.pulse.headline} Households, prices, and attention move every career week. Language, price, payment friction, missing rights, and enforcement decide how much of that attention is piracy. Pirated plays do not pay. Heavy enforcement makes customers restless.</p>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                            {state.rivals.filter(rival => rival.status === 'ACTIVE').map(rival => (
                                <div key={rival.id} className="rounded-2xl border border-white/10 bg-[#12151c] p-3">
                                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
                                        <span>{rival.tier}</span>
                                        <span>{LAUNCH_REGIONS.find(region => region.id === rival.homeRegion)?.short}</span>
                                    </div>
                                    <div className="font-bold mt-1">{rival.name}</div>
                                    <div className="text-sm text-zinc-300">{rival.householdsM.toFixed(1)}M homes · ${rival.monthlyPrice.toFixed(2)}</div>
                                    <div className="text-[11px] text-zinc-500 mt-1">{rival.languages.slice(0, 3).join(', ')}</div>
                                    <div className="text-[11px] text-zinc-400 mt-1">{rival.note}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Your service</div>
                            <div className="text-2xl font-black">{state.name}</div>
                            <div className="text-sm text-zinc-400 mt-2">Forecast {formatCompact(quote.forecastWeeklyRevenue)} / week · burn {formatCompact(quote.weeklyBurn)}</div>
                            <div className="text-sm text-zinc-400">Last receipts {formatCompact(state.lastWeeklyRevenue)} · last burn {formatCompact(state.lastWeeklyBurn)}</div>
                            {state.stage === 'LIVE' && (
                                <label className="block mt-4 text-xs text-zinc-400">
                                    Enforcement {state.enforcement}
                                    <input type="range" min={0} max={100} value={state.enforcement} onChange={(event) => setPlatform({ ...state, enforcement: Number(event.target.value) })} className="w-full" />
                                </label>
                            )}
                            <div className="text-xs text-zinc-500 mt-2">Customer pressure {Math.round(state.customerPressure)}</div>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 text-sm space-y-1">
                            <div>Recession {Math.round(state.pulse.recession * 100)}</div>
                            <div>Inflation {Math.round(state.pulse.inflation * 100)}</div>
                            <div>Connectivity {Math.round(state.pulse.connectivity * 100)}</div>
                            <div>Fatigue {Math.round(state.pulse.fatigue * 100)}</div>
                        </div>
                    </div>
                </div>
            )}
        </Shell>,
        document.body
    );
};
