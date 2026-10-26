import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OwnPlatformState, Player } from '../../types';
import { ensureOwnPlatform } from '../../services/ownPlatform/migrate';
import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import { formatLocalAmount } from '../../services/ownPlatform/fx';
import { EmpirePane, Shell } from './ui';
import { EmpireIntro } from './intro/EmpireIntro';
import { DefineLaunch } from './DefineLaunch';
import { BuildPlatform } from './BuildPlatform';
import { DealRoom } from './DealRoom';
import { Operations } from './Operations';
import { LAUNCH_REGIONS } from '../../services/ownPlatform/catalog';

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

export const EMPIRE_UNLOCK_PRICE = 75_000_000;
const UNLOCK_FLAG = 'ownPlatformUnlocked';

const isEmpireUnlocked = (player: Player) => Boolean((player.flags as any)?.[UNLOCK_FLAG]);

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

/* One-time paywall */
const EmpirePaywall: React.FC<{ player: Player; onBack: () => void; onUnlock: () => void }> = ({ player, onBack, onUnlock }) => {
    const canAfford = player.money >= EMPIRE_UNLOCK_PRICE;
    const shortBy = Math.max(0, EMPIRE_UNLOCK_PRICE - player.money);
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                color: '#fff',
                background: 'radial-gradient(circle at 20% 15%, rgba(120,70,255,0.35), transparent 45%), radial-gradient(circle at 80% 85%, rgba(0,140,255,0.28), transparent 45%), #07061a',
                fontFamily: 'inherit',
            }}
        >
            <CloseButton onClick={onBack} />
            <div
                style={{
                    width: '100%',
                    maxWidth: 520,
                    borderRadius: 28,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(16px)',
                    padding: '36px 32px',
                    textAlign: 'center',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
                }}
            >
                <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.6 }}>Empire+</div>
                <div style={{ fontSize: 34, fontWeight: 800, marginTop: 10, letterSpacing: '-0.02em' }}>Own your own platform</div>
                <p style={{ opacity: 0.75, lineHeight: 1.55, marginTop: 14, fontSize: 15 }}>
                    Build a streaming service, clear markets, sign distribution deals, and run the company week to week.
                    One-time entry fee. Unlocks permanently for this career.
                </p>

                <div
                    style={{
                        margin: '26px auto 0',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        padding: '18px 28px',
                        borderRadius: 18,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', opacity: 0.55 }}>Entry fee</span>
                    <span style={{ fontSize: 40, fontWeight: 900, marginTop: 4 }}>{formatCompact(EMPIRE_UNLOCK_PRICE)}</span>
                    <span style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>You have {formatCompact(player.money)}</span>
                </div>

                <button
                    onClick={onUnlock}
                    disabled={!canAfford}
                    style={{
                        marginTop: 26,
                        width: '100%',
                        padding: '16px 20px',
                        borderRadius: 16,
                        border: 0,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        fontWeight: 800,
                        fontSize: 15,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: canAfford ? '#0b0620' : 'rgba(255,255,255,0.5)',
                        background: canAfford
                            ? 'linear-gradient(90deg, #a78bfa, #60a5fa)'
                            : 'rgba(255,255,255,0.08)',
                        boxShadow: canAfford ? '0 14px 40px rgba(124,92,255,0.45)' : 'none',
                    }}
                >
                    {canAfford ? `Purchase for ${formatCompact(EMPIRE_UNLOCK_PRICE)}` : `Need ${formatCompact(shortBy)} more`}
                </button>

                <button
                    onClick={onBack}
                    style={{ marginTop: 14, background: 'transparent', border: 0, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}
                >
                    Not now
                </button>
            </div>
        </div>
    );
};

export const OwnPlatformApp: React.FC<Props> = ({ player, onBack, onUpdatePlayer, initialPane }) => {
    const [pane, setPane] = useState<EmpirePane>(initialPane || (player.ownPlatform?.stage === 'BUILD' || player.ownPlatform?.stage === 'CONSTRUCTING' || player.ownPlatform?.stage === 'LIVE' ? 'build' : 'launch'));
    const [replay, setReplay] = useState(false);

    useEffect(() => {
        if (!player.ownPlatform) onUpdatePlayer(ensureOwnPlatform(player));
    }, [player, onUpdatePlayer]);

    const unlocked = isEmpireUnlocked(player);

    const handleUnlock = () => {
        if (player.money < EMPIRE_UNLOCK_PRICE) return;
        onUpdatePlayer({
            ...player,
            money: player.money - EMPIRE_UNLOCK_PRICE,
            flags: { ...(player.flags || {}), [UNLOCK_FLAG]: true },
        });
    };

    /* ---- Gate: one-time $75M purchase ---- */
    if (!unlocked) {
        return createPortal(
            <EmpirePaywall player={player} onBack={onBack} onUnlock={handleUnlock} />,
            document.body,
        );
    }

    if (!player.ownPlatform) {
        return createPortal(
            <>
                <CloseButton onClick={onBack} />
                <Shell onBack={onBack} kicker="Empire+" title="Opening the books" pane="launch" onPane={setPane} name="Empire+" stage="DEFINE" money={player.money} defineStep={0} buildStep={0} pastDefine={false} onDefineStep={() => undefined} onBuildStep={() => undefined}>
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
    const pastDefine = state.stage !== 'DEFINE' || state.commissioned;
    const kicker = pane === 'launch'
        ? 'Define the launch'
        : pane === 'build' ? 'Build the platform' : pane === 'rights' ? 'Film distribution' : pane === 'ops' ? 'Operations' : 'The world';
    const title = pane === 'launch'
        ? LAUNCH_TITLES[state.defineStep] || serviceName
        : pane === 'build'
            ? (state.buildStep === 0 ? 'Lay the network' : state.buildStep === 1 ? 'Then find out what it costs' : state.buildStep === 2 ? 'Rehearse opening night' : 'Sign the build')
            : pane === 'rights'
                ? 'Who gets the film'
                : pane === 'ops'
                    ? 'Run the company'
                    : 'Forty desks, one audience';

    if (!state.introSeen || replay) {
        return (
            <>
                {createPortal(<CloseButton onClick={onBack} />, document.body)}
                <EmpireIntro
                    player={player}
                    onDone={() => {
                        setReplay(false);
                        onUpdatePlayer({ ...player, ownPlatform: { ...state, introSeen: true } });
                    }}
                />
            </>
        );
    }

    return createPortal(
        <>
            <CloseButton onClick={onBack} />
            <Shell
                onBack={onBack}
                kicker={kicker}
                title={title}
                pane={pane}
                onPane={setPane}
                name={serviceName}
                stage={state.stage}
                money={player.money}
                defineStep={state.defineStep}
                buildStep={state.buildStep}
                pastDefine={pastDefine}
                onWatchIntro={() => setReplay(true)}
                onDefineStep={step => { setPane('launch'); setPlatform({ ...state, defineStep: step }); }}
                onBuildStep={step => { setPane('build'); setPlatform({ ...state, buildStep: step }); }}
            >
                {state.stage === 'CONSTRUCTING' && <div className="pane-note" style={{ padding: '14px 40px 0' }}>{state.constructionWeeksLeft} weeks of construction · reserve is paying the burn</div>}
                {state.stage === 'LIVE' && pane !== 'launch' && <div className="pane-note" style={{ padding: '14px 40px 0' }}>{formatPeople(state.subscribers)} subscribers · week {state.weeksLive} · piracy {Math.round(state.piracyShare * 100)}%</div>}
                {pane === 'launch' && (
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
                {pane === 'rights' && <DealRoom player={player} onPlayer={onUpdatePlayer} />}
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
                                            <div className="h3" style={{ marginTop: 8 }}>{rival.name}</div>
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
        </>,
        document.body,
    );
};