import React, { useMemo, useState } from 'react';
import { OwnPlatformState, Player } from '../../../types';
import {
    LadderRow,
    RungDef,
    SliderKind,
    TECH_TRACKS,
    TrackDef,
    ladderFor,
    moneyShort,
    nextVersion,
    pointPool,
    readDesk,
    rungById,
    tierWord,
    tileLevel,
    trackOfRung,
    unlockRung,
    versionCost,
    versionEffect,
} from '../../../services/ownPlatform/platformDesk';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    focusId?: string;
    shot?: 'grid' | 'detail' | 'ladder';
}

const Icon: React.FC<{ kind: SliderKind }> = ({ kind }) => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        {kind === 'picture' && <path fill="currentColor" d="M4 6h16v10H4zM8 18h8v2H8z" />}
        {kind === 'hdr' && <path fill="currentColor" d="M12 3l2.2 6.2L21 12l-6.8 2.8L12 21l-2.2-6.2L3 12l6.8-2.8z" />}
        {kind === 'colour' && <path fill="currentColor" d="M12 3a9 9 0 100 18c2 0 3-1.4 3-3 0-2.4 1.2-3 3-3A9 9 0 0012 3z" />}
        {kind === 'sound' && <path d="M4 9h3l4-3v12l-4-3H4zm10 1.2a3 3 0 010 3.6M16 7a6 6 0 010 10" stroke="currentColor" strokeWidth="1.6" fill="none" />}
        {kind === 'codec' && <path fill="currentColor" d="M3 7h8v4H3zm10 0h8v4h-8zM3 13h18v4H3z" />}
        {kind === 'scale' && <path fill="currentColor" d="M4 16l4-8 4 5 3-3 5 6z" />}
        {kind === 'playback' && <path fill="currentColor" d="M8 5v14l12-7z" />}
        {kind === 'devices' && <path fill="currentColor" d="M7 3h10v14H7zM10 19h4v2h-4z" />}
        {kind === 'drm' && <path fill="currentColor" d="M12 2l7 3v6c0 5-3 8-7 11-4-3-7-6-7-11V5z" />}
        {kind === 'ai' && <path fill="currentColor" d="M12 2l1.4 6.2L20 12l-6.6 3.8L12 22l-1.4-6.2L4 12l6.6-3.8z" />}
        {kind === 'family' && <path fill="currentColor" d="M8 10a3 3 0 110-6 3 3 0 010 6zm8 1a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM3 20c.4-3 2.4-5 5-5s4.6 2 5 5zm8 0c.2-2 1.4-3.5 3-4 2 .2 3.4 1.6 4 4z" />}
        {kind === 'ads' && <path fill="currentColor" d="M4 8h10v8H4zM14 10l6-2v8l-6-2z" />}
    </svg>
);

const Street: React.FC<{ bright: boolean }> = ({ bright }) => (
    <svg viewBox="0 0 360 168" width="100%" height="100%" aria-hidden="true">
        <rect width="360" height="168" fill={bright ? '#1b2a55' : '#070b16'} />
        <rect x="0" y="118" width="360" height="50" fill={bright ? '#243056' : '#10131c'} />
        {[28, 130, 232].map(x => (
            <g key={x}>
                <rect x={x} y={70} width="70" height="58" rx="4" fill={bright ? '#31406e' : '#161b2a'} />
                {[0, 1, 2].map(col => [0, 1].map(row => (
                    <rect key={`${col}-${row}`} x={x + 10 + col * 18} y={80 + row * 18} width="12" height="10" fill={bright ? '#ffd27a' : '#2a3348'} />
                )))}
            </g>
        ))}
        <path d="M20 40 H340 M40 40 V90 M180 40 V90 M300 40 V90" stroke={bright ? '#9eff6a' : '#3a4a38'} strokeWidth={bright ? 2.4 : 1.2} fill="none" />
    </svg>
);

const Lake: React.FC<{ bright: boolean }> = ({ bright }) => (
    <svg viewBox="0 0 360 168" width="100%" height="100%" aria-hidden="true">
        <defs>
            <linearGradient id={bright ? 'skyB' : 'skyN'} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={bright ? '#ffb15a' : '#1a2033'} />
                <stop offset="1" stopColor={bright ? '#7a4bff' : '#0a0d16'} />
            </linearGradient>
        </defs>
        <rect width="360" height="168" fill={`url(#${bright ? 'skyB' : 'skyN'})`} />
        <circle cx="250" cy="48" r={bright ? 22 : 16} fill={bright ? '#fff4c8' : '#3a425c'} />
        <path d="M0 100 L70 78 L130 104 L200 70 L280 108 L360 84 V120 H0Z" fill={bright ? '#243056' : '#12151f'} />
        <rect y="118" width="360" height="50" fill={bright ? '#3a2a66' : '#0c1018'} />
        <path d="M0 132 Q90 122 180 132 T360 132" stroke={bright ? '#ffd7a1' : '#2a3148'} strokeWidth="3" fill="none" />
    </svg>
);

const Art: React.FC<{ kind: SliderKind; bright: boolean }> = ({ kind, bright }) => {
    if (kind === 'codec' || kind === 'scale' || kind === 'devices') return <Street bright={bright} />;
    if (kind === 'sound' || kind === 'playback') {
        return (
            <svg viewBox="0 0 360 168" width="100%" height="100%" aria-hidden="true">
                <rect width="360" height="168" fill="#070b16" />
                {Array.from({ length: bright ? 18 : 8 }).map((_, i) => (
                    <rect key={i} x={16 + i * 18} y={84 - (bright ? (i % 5) * 10 : (i % 3) * 6)} width="8" height={bright ? 40 + (i % 5) * 12 : 18 + (i % 3) * 8} rx="3" fill={bright ? '#3ddcff' : '#2a3148'} />
                ))}
            </svg>
        );
    }
    return <Lake bright={bright} />;
};

const caption = (kind: SliderKind) => kind === 'codec' ? '3 homes on one line' : kind === 'hdr' ? 'Same lake, more light' : 'Before  ·  after';

export const TechTab: React.FC<Props> = ({ player, onPlayer, focusId, shot }) => {
    const state = player.ownPlatform!;
    const desk = readDesk(state);
    const initial = focusId ? trackOfRung(focusId)?.id || '' : '';
    const [trackId, setTrackId] = useState(shot === 'grid' ? '' : initial);
    const [rungId, setRungId] = useState(shot === 'grid' ? '' : (focusId || ''));
    const [error, setError] = useState('');
    const track = TECH_TRACKS.find(row => row.id === trackId);
    const sections = useMemo(() => {
        const order = ['PICTURE & SOUND', 'STREAMING', 'VIEWERS & MONEY'] as const;
        return order.map(name => ({ name, tracks: TECH_TRACKS.filter(row => row.section === name) }));
    }, []);

    const open = (next: TrackDef, rung?: string) => {
        setTrackId(next.id);
        setRungId(rung || '');
        setError('');
    };

    const focus = track ? (track.rungs.find(row => row.id === rungId) || track.rungs.find(row => (desk.owned?.[row.id] || 0) < 3) || track.rungs[0]) : undefined;

    return (
        <div className={track && shot !== 'grid' ? 'tech-layout' : ''} data-testid="tech-tab">
            <div data-testid="tech-grid">
                {sections.map(section => (
                    <div key={section.name}>
                        <div className="plat-section">{section.name}</div>
                        <div className="tech-grid">
                            {section.tracks.map(row => {
                                const level = tileLevel(row, desk);
                                const fresh = row.rungs.some(item => desk.freshUnlocks?.includes(item.id));
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        className={`tech-tile${trackId === row.id ? ' on' : ''}${fresh ? ' fresh' : ''}`}
                                        style={{ ['--accent' as string]: row.accent, ['--glow' as string]: row.glow }}
                                        onClick={() => open(row)}
                                    >
                                        <div className="tech-ico"><Icon kind={row.slider} /></div>
                                        <div className="plat-kicker" style={{ marginTop: 8 }}>{row.label}</div>
                                        <div className="lvl">{level.name}</div>
                                        <div className="tech-foot">
                                            <span className="tech-dots" aria-hidden="true">{[1, 2, 3].map(dot => <i key={dot} className={dot <= level.dots ? 'on' : ''} />)}</span>
                                            <span className="tech-tier">{level.tier}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {track && focus && shot !== 'grid' && (
                <TechDetail
                    player={player}
                    onPlayer={onPlayer}
                    track={track}
                    focus={focus}
                    error={error}
                    onError={setError}
                    onGo={id => {
                        const home = trackOfRung(id);
                        if (home) open(home, id);
                    }}
                    showLadder={shot !== 'detail'}
                />
            )}
        </div>
    );
};

const TechDetail: React.FC<{
    player: Player;
    onPlayer: (next: Player) => void;
    track: TrackDef;
    focus: RungDef;
    error: string;
    onError: (value: string) => void;
    onGo: (id: string) => void;
    showLadder: boolean;
}> = ({ player, onPlayer, track, focus, error, onError, onGo, showLadder }) => {
    const state = player.ownPlatform!;
    const desk = readDesk(state);
    const [cut, setCut] = useState(58);
    const ownedVersion = desk.owned?.[focus.id] || 0;
    const version = Math.min(3, ownedVersion + 1);
    const price = versionCost(focus, ownedVersion >= 3 ? 3 : version);
    const effect = versionEffect(focus, ownedVersion >= 3 ? 3 : version);
    const missing = focus.needs.filter(id => (desk.owned?.[id] || 0) < 1);
    const job = (desk.research || []).find(row => row.rungId === focus.id);
    const current = currentLabel(track, desk, focus);
    const upcoming = ownedVersion >= 3 ? current : `${focus.name} · ${tierWord(version, Boolean(focus.sparkle))}`;
    const load = Math.round(effect.load * 100);
    const buy = () => {
        const result = unlockRung(player, focus.id);
        onError(result.error || '');
        if (!result.error) onPlayer(result.player);
    };
    const main = ladderFor(track, desk, false);
    const side = ladderFor(track, desk, true);

    return (
        <div>
            <article className="detail" data-testid="tech-detail" style={{ ['--accent' as string]: track.accent }}>
                <div className="detail-top">
                    <div>
                        <div className="plat-kicker">{track.subtitle}</div>
                        <h3 style={{ fontSize: 34 }}>{ownedVersion >= 3 ? focus.name : `Unlock ${focus.name}`}</h3>
                        <p style={{ margin: '6px 0 0', color: '#c5cbe0' }}>{focus.blurb}</p>
                    </div>
                    <div className="points" data-testid="research-points">
                        <b>{pointPool(state, desk).toLocaleString('en-US')}</b>
                        <span>LAB</span>
                    </div>
                </div>
                <div className="slider" style={{ ['--cut' as string]: `${cut}%` }}>
                    <div className="layer"><Art kind={track.slider} bright={false} /></div>
                    <div className="layer after"><Art kind={track.slider} bright /></div>
                    <div className="slider-cap"><span>{caption(track.slider)}</span><span>{caption(track.slider)}</span></div>
                    <div className="handle" />
                    <input aria-label="Before and after" type="range" min={8} max={92} value={cut} onChange={event => setCut(Number(event.target.value))} />
                </div>
                <div className="now-next">
                    <div><span>Now</span><b>{current}</b></div>
                    <div><span>Next</span><b>{upcoming}</b></div>
                </div>
                <div className="chips">
                    <span>Arrives at version {Math.min(version, 3)} · {tierWord(Math.min(version, 3), Boolean(focus.sparkle))}</span>
                    {price.weekly > 0 && <span>{moneyShort(price.weekly)} a week to run</span>}
                    {load !== 0 && <span className="good">{load > 0 ? '+' : ''}{load}% load per viewer and cost</span>}
                    {effect.debt > 0 && <span className="debt">+{effect.debt} tech debt</span>}
                    {effect.demand > 0 && <span className="good">+{Math.round(effect.demand * 100)}% demand</span>}
                    {effect.churn < 0 && <span className="good">{Math.round(effect.churn * 1000) / 10}% churn</span>}
                </div>
                {missing.length > 0 ? (
                    <div>
                        <div className="need">Needs {rungById(missing[0])?.name || 'the rung below'} first.</div>
                        <button type="button" className="plat-btn gold" style={{ marginTop: 8 }} onClick={() => onGo(missing[0])}>Go to {rungById(missing[0])?.name}</button>
                    </div>
                ) : job ? (
                    <button type="button" className="unlock" disabled>In the lab · {job.weeksLeft} weeks</button>
                ) : ownedVersion >= 3 ? (
                    <button type="button" className="unlock" disabled>At the top of this rung</button>
                ) : (
                    <button type="button" className="unlock" data-testid="unlock-tech" onClick={buy}>
                        {price.once > 0 ? `${moneyShort(price.once)} once from the treasury` : `Unlock ${focus.name}`}
                    </button>
                )}
                {error && <p className="err">{error}</p>}
            </article>
            {showLadder && (
                <div data-testid="tech-ladder">
                    <div className="plat-section">Ladder</div>
                    <Ladder rows={main} accent={track.accent} onPick={id => onGo(id)} onUnlock={buy} focusId={focus.id} />
                    {side.length > 0 && (
                        <>
                            <div className="plat-section">Also in {track.label}</div>
                            <Ladder rows={side} accent={track.accent} onPick={id => onGo(id)} onUnlock={buy} focusId={focus.id} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const currentLabel = (track: TrackDef, desk: ReturnType<typeof readDesk>, focus: RungDef) => {
    const version = desk.owned?.[focus.id] || 0;
    if (version > 0) return `${focus.name} · ${tierWord(version, Boolean(focus.sparkle))}`;
    const level = tileLevel(track, desk);
    return `${level.name} · ${level.tier}`;
};

const Ladder: React.FC<{ rows: LadderRow[]; accent: string; onPick: (id: string) => void; onUnlock: () => void; focusId: string }> = ({ rows, accent, onPick, onUnlock, focusId }) => (
    <div className="ladder" style={{ ['--accent' as string]: accent }}>
        {rows.map(row => {
            const done = row.version > 0 && row.state !== 'research';
            const mode = row.rung.id === focusId && row.version < 3 ? 'next' : row.state === 'done' && row.version >= 3 ? 'done' : done ? 'done' : row.state;
            return (
                <div key={row.rung.id} className={`lad ${mode === 'locked' ? 'locked' : mode === 'done' ? 'done' : 'next'}`}>
                    <div className="mark">{mode === 'done' ? '✓' : mode === 'locked' ? '🔒' : row.version || 1}</div>
                    <div>
                        <b>{row.rung.name}{row.rung.sparkle ? <span className="spark"> ✦</span> : null}</b>
                        <small>
                            {mode === 'done' && `${tierWord(row.version, row.top)} · version ${row.version} of 3`}
                            {mode === 'research' && `In the lab · ${row.weeksLeft} of ${row.weeksTotal} weeks`}
                            {mode === 'next' && `${moneyShort(row.price.once)} · ${moneyShort(row.price.weekly)} a week`}
                            {mode === 'locked' && (row.rung.needsLabel || 'Locked')}
                        </small>
                    </div>
                    <div>
                        {mode === 'done' && <span className="tech-dots">{[1, 2, 3].map(dot => <i key={dot} className={dot <= row.version ? 'on' : ''} style={{ background: dot <= row.version ? accent : undefined }} />)}</span>}
                        {mode === 'next' && row.rung.id === focusId && <button type="button" className="pill" onClick={onUnlock}>Unlock</button>}
                        {mode === 'next' && row.rung.id !== focusId && <button type="button" className="pill" onClick={() => onPick(row.rung.id)}>Open</button>}
                        {mode === 'locked' && <button type="button" className="pill" style={{ background: '#2a2110', color: '#E4B15A' }} onClick={() => onPick(row.rung.needs[0])}>Needs</button>}
                    </div>
                </div>
            );
        })}
    </div>
);
