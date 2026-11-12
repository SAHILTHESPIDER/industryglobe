import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OwnPlatformState, Player } from '../../types';
import { openEmpire } from '../../services/ownPlatform/migrate';
import { LAUNCH_SEED_LINE } from '../../services/ownPlatform/studio';
import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import { formatLocalAmount } from '../../services/ownPlatform/fx';
import { publicBrandName } from '../../services/rights/alterName';
import { EmpirePane, Shell } from './ui';
import { EmpireIntro } from './intro/EmpireIntro';
import { DefineLaunch } from './DefineLaunch';
import { BuildPlatform } from './BuildPlatform';
import { RightsFloor } from './RightsFloor';
import { HqPrompt } from './PlacePanels';
import { Operations } from './Operations';
import { IdentBumper } from './IdentStage';
import { armPlatformIdent } from '../../services/ownPlatform/identAudio';
import { LAUNCH_REGIONS } from '../../services/ownPlatform/catalog';
import { brandAccent, brandFrom } from '../../services/ownPlatform/brand';
import { BrandColorStep } from './BrandColorStep';
import { BrandStudio } from './BrandStudio';

interface Props {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
    initialPane?: EmpirePane;
}

const LAUNCH_TITLES = [
    'Name it',
    'Day-one markets',
    'Clear the markets',
    'Choose the sound',
    'Pick a storefront',
    'Assemble the shelf',
    'Set the price',
    'Read the blueprint',
];

/* Fixed X that always returns to the home screen */
const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        aria-label="Close"
        style={{
            position: 'fixed',
            top: 'max(14px, env(safe-area-inset-top))',
            right: 14,
            zIndex: 10000,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(10,8,24,0.72)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontSize: 20,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
        }}
    >
        ×
    </button>
);

export const OwnPlatformApp: React.FC<Props> = ({ player, onBack, onUpdatePlayer, initialPane }) => {
    const [pane, setPane] = useState<EmpirePane>(initialPane || (player.ownPlatform?.stage === 'BUILD' || player.ownPlatform?.stage === 'CONSTRUCTING' || player.ownPlatform?.stage === 'LIVE' ? 'build' : 'launch'));
    const [replay, setReplay] = useState(false);
    const [studio, setStudio] = useState(false);
    const [showOpenIdent, setShowOpenIdent] = useState(false);
    const playedOpenIdent = useRef(false);

    useEffect(() => {
        const next = openEmpire(player);
        if (next !== player) onUpdatePlayer(next);
    }, [player, onUpdatePlayer]);

    const introBlocking = Boolean(player.ownPlatform) && (!player.ownPlatform.introSeen || replay) && pane !== 'rights';
    const shellReady = Boolean(player.ownPlatform && !introBlocking);

    useEffect(() => {
        if (!shellReady || playedOpenIdent.current) return;
        playedOpenIdent.current = true;
        if (player.ownPlatform?.identSound === false) return;
        setShowOpenIdent(true);
    }, [shellReady, player.ownPlatform?.identSound]);

    if (!player.ownPlatform) {
        return createPortal(
            <>
                <CloseButton onClick={onBack} />
                <Shell onBack={onBack} kicker="Empire+" title="Opening the books" pane="launch" onPane={setPane} name="Empire+" stage="DEFINE" money={0} defineStep={0} buildStep={0} pastDefine={false} onDefineStep={() => undefined} onBuildStep={() => undefined}>
                    <p className="p" style={{ padding: 32 }}>Preparing the launch…</p>
                </Shell>
            </>,
            document.body,
        );
    }

    const state = player.ownPlatform;
    const quote = quoteLaunch(player);
    const setPlatform = (next: OwnPlatformState) => onUpdatePlayer({ ...player, ownPlatform: next });
    const serviceName = state.name.trim() || 'Empire+';
    const stingId = state.identId || state.identityId;
    const pastDefine = state.stage !== 'DEFINE' || state.commissioned;
    const kicker = pane === 'launch'
        ? 'Define the launch'
        : pane === 'build' ? 'Build the platform' : pane === 'rights' ? 'Rights' : pane === 'ops' ? 'Operations' : 'The world';
    const needsColour = state.colorChosen === false && pane === 'launch';
    const title = needsColour
        ? 'Pick the colour'
        : pane === 'launch'
        ? LAUNCH_TITLES[state.defineStep] || serviceName
        : pane === 'build'
            ? (state.buildStep === 0 ? 'Lay the network' : state.buildStep === 1 ? 'Then find out what it costs' : state.buildStep === 2 ? 'Rehearse opening night' : 'Sign the build')
            : pane === 'rights'
                ? 'Rights'
                : pane === 'ops'
                    ? 'Run the company'
                    : 'Forty desks, one audience';

    if ((!state.introSeen || replay) && pane !== 'rights') {
        return (
            <>
                {createPortal(<CloseButton onClick={onBack} />, document.body)}
                <EmpireIntro
                    player={player}
                    onDone={() => {
                        const fromReplay = replay;
                        setReplay(false);
                        onUpdatePlayer({ ...player, ownPlatform: { ...state, introSeen: true } });
                        if (!fromReplay) armPlatformIdent({ ownPlatform: { ...state, introSeen: true, identId: state.identId || state.identityId } });
                    }}
                />
            </>
        );
    }

    return createPortal(
        <>
            <CloseButton onClick={onBack} />
            {showOpenIdent && (
                <IdentBumper name={serviceName} identityId={stingId} onDone={() => setShowOpenIdent(false)} />
            )}
            <Shell
                onBack={onBack}
                kicker={kicker}
                title={title}
                pane={pane}
                onPane={setPane}
                name={serviceName}
                stage={state.stage}
                money={state.books?.cash || 0}
                defineStep={state.defineStep}
                buildStep={state.buildStep}
                pastDefine={pastDefine}
                markId={state.brand?.markId}
                accent={brandAccent(state.brand)}
                frameId={state.brand?.frameId}
                typefaceId={state.brand?.typefaceId}
                onWatchIntro={() => setReplay(true)}
                onDefineStep={step => { setPane('launch'); setPlatform({ ...state, defineStep: step }); }}
                onBuildStep={step => { setPane('build'); setPlatform({ ...state, buildStep: step }); }}
            >
                <div style={{ padding: '12px 40px 0' }}>
                    <button type="button" className="btn gho sm" data-testid="open-brand-studio" onClick={() => setStudio(true)}>Brand studio</button>
                </div>
                {(state.books?.seedStakePct || 0) > 0 && (
                    <p data-testid="seed-funding-note" style={{ padding: '14px 40px 0', color: '#b7f7d4', fontSize: 14, lineHeight: 1.45 }}>{LAUNCH_SEED_LINE}</p>
                )}
                {state.stage === 'CONSTRUCTING' && <div className="pane-note" style={{ padding: '14px 40px 0' }}>{state.constructionWeeksLeft} weeks of construction · reserve is paying the burn</div>}
                {state.stage === 'LIVE' && pane !== 'launch' && <div className="pane-note" style={{ padding: '14px 40px 0' }}>{formatPeople(state.subscribers)} subscribers · week {state.weeksLive} · piracy {Math.round(state.piracyShare * 100)}%</div>}
                {needsColour && (
                    <div className="body">
                        <BrandColorStep
                            name={serviceName}
                            brand={brandFrom(state.brand)}
                            stepLabel="Step 1 of 8"
                            onColor={colorId => setPlatform({ ...state, brand: brandFrom({ ...state.brand, colorId }) })}
                            onMark={markId => setPlatform({ ...state, brand: brandFrom({ ...state.brand, markId }) })}
                            onFrame={frameId => setPlatform({ ...state, brand: brandFrom({ ...state.brand, frameId }) })}
                            onTypeface={typefaceId => setPlatform({ ...state, brand: brandFrom({ ...state.brand, typefaceId }) })}
                            onContinue={() => setPlatform({ ...state, colorChosen: true, brand: brandFrom(state.brand) })}
                        />
                    </div>
                )}
                {pane === 'launch' && !needsColour && (
                    <DefineLaunch
                        player={player}
                        onChange={setPlatform}
                        onBuild={() => { setPlatform({ ...state, stage: state.commissioned ? state.stage : 'BUILD', defineStep: 7 }); setPane('build'); }}
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
                {pane === 'rights' && <RightsFloor player={player} onPlayer={onUpdatePlayer} />}
                {pane === 'ops' && <Operations player={player} onPlayer={onUpdatePlayer} />}
                {pane === 'world' && (
                    <div className="body">
                        <div className="grid g-side">
                            <div className="stack">
                                <p className="p">{state.pulse.headline} Households, prices, and attention move every career week. Language, price, payment friction, missing rights, and enforcement decide how much of that attention is piracy. Pirated plays do not pay. Heavy enforcement makes customers restless.</p>
                                <div className="grid g3">
                                    {state.rivals.filter(rival => rival.status === 'ACTIVE').slice(0, 12).map(rival => (
                                        <div key={rival.id} className="card">
                                            <div className="between">
                                                <span className="lab">{rival.tier}</span>
                                                <span className="tiny">{LAUNCH_REGIONS.find(region => region.id === rival.homeRegion)?.short}</span>
                                            </div>
                                            <div className="h3" style={{ marginTop: 8 }}>{publicBrandName(rival.name)}</div>
                                            <div className="small" style={{ marginTop: 6 }}>{rival.householdsM.toFixed(1)}M homes · {formatLocalAmount(rival.localMonthlyPrice || 0, rival.currency || 'USD')}</div>
                                            <div className="tiny">About ${rival.monthlyPrice.toFixed(2)} USD · debt {formatCompact(rival.debtUsd || 0)}</div>
                                            <div className="tiny" style={{ marginTop: 6 }}>{rival.note}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="stack">
                                <div className="card">
                                    <div className="lab">Your service</div>
                                    <div className="h2" style={{ marginTop: 6 }}>{state.name}</div>
                                    <div className="small" style={{ marginTop: 8 }}>Forecast {formatCompact(quote.forecastWeeklyRevenue)} / week · burn {formatCompact(quote.weeklyBurn)}</div>
                                    <div className="small">Last receipts {formatCompact(state.lastWeeklyRevenue)} · last burn {formatCompact(state.lastWeeklyBurn)}</div>
                                    {state.stage === 'LIVE' && (
                                        <label className="block" style={{ marginTop: 16 }}>
                                            <span className="flab">Enforcement {state.enforcement}</span>
                                            <input type="range" min={0} max={100} value={state.enforcement} onChange={event => setPlatform({ ...state, enforcement: Number(event.target.value) })} className="w-full" />
                                        </label>
                                    )}
                                    <div className="tiny" style={{ marginTop: 8 }}>Customer pressure {Math.round(state.customerPressure)}</div>
                                    <button
                                        type="button"
                                        data-testid="ident-sound-toggle"
                                        onClick={() => setPlatform({ ...state, identSound: state.identSound === false ? undefined : false })}
                                        className="mt-4 w-full rounded-full border border-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-wider"
                                    >
                                        Ident sound {state.identSound === false ? 'Off' : 'On'}
                                    </button>
                                </div>
                                <div className="card flat">
                                    <div className="line"><span>Recession</span><span>{Math.round(state.pulse.recession * 100)}</span></div>
                                    <div className="line"><span>Inflation</span><span>{Math.round(state.pulse.inflation * 100)}</span></div>
                                    <div className="line"><span>Connectivity</span><span>{Math.round(state.pulse.connectivity * 100)}</span></div>
                                    <div className="line" style={{ border: 0 }}><span>Fatigue</span><span>{Math.round(state.pulse.fatigue * 100)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Shell>
            {studio && <BrandStudio player={player} onPlayer={onUpdatePlayer} onClose={() => setStudio(false)} />}
            {state.introSeen && !state.hqCityId && !state.hqPromptSeen && pane !== 'rights' && (
                <HqPrompt player={player} onPlayer={onUpdatePlayer} />
            )}
        </>,
        document.body,
    );
};