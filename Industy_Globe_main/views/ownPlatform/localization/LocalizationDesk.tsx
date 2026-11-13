import React, { useEffect, useMemo, useState } from 'react';
import { Player } from '../../../types';
import { formatCompact, formatPeople, quoteLaunch } from '../../../services/ownPlatform/logic';
import { titleIsLive } from '../../../services/ownPlatform/weeks';
import {
    LOC_REGIONS,
    LocRegion,
    bilingual,
    languageLine,
    marketsInRegion,
    presentTrack,
    readLanguageDesk,
    regionState,
    setupLanguageRegion,
    spendLanguageEnergy,
    upgradeLanguageLevel,
} from '../../../services/ownPlatform/languageDesk';
import { readCompanyCash } from '../../../services/ownPlatform/companyCash';
import { RegionMap } from './RegionMap';
import './localization.css';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    initialId?: string;
    focus?: 'grid' | 'detail';
}

const useCalm = () => {
    const [calm, setCalm] = useState(false);
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const settled = new URLSearchParams(window.location.search).get('settled') === '1';
        setCalm(reduce || settled);
    }, []);
    return calm;
};

const useTick = (value: number, calm: boolean) => {
    const [shown, setShown] = useState(value);
    useEffect(() => {
        if (calm) {
            setShown(value);
            return;
        }
        const start = performance.now();
        const begin = shown;
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 650);
            const eased = 1 - (1 - t) ** 3;
            setShown(begin + (value - begin) * eased);
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, calm]);
    return shown;
};

const useType = (text: string, calm: boolean) => {
    const [count, setCount] = useState(calm ? text.length : 0);
    useEffect(() => {
        if (calm) {
            setCount(text.length);
            return;
        }
        setCount(0);
        let index = 0;
        const timer = window.setInterval(() => {
            index += 1;
            setCount(index);
            if (index >= text.length) window.clearInterval(timer);
        }, 48);
        return () => window.clearInterval(timer);
    }, [text, calm]);
    return text.slice(0, count);
};

const Bolt = () => (
    <svg className="loc-bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" /></svg>
);

const Pips: React.FC<{ filled: number; accent: string }> = ({ filled, accent }) => (
    <span className="loc-piprow" style={{ ['--accent' as string]: accent }}>
        {[0, 1, 2].map(index => <i key={index} className={index < filled ? 'on' : ''} />)}
    </span>
);

const Flags: React.FC<{ region: LocRegion; count?: number }> = ({ region, count = 4 }) => (
    <div className="loc-flags" aria-label={`${region.name} flags`}>
        {region.countries.slice(0, count).map(country => (
            <span key={country.id} title={country.name}>{country.flag}</span>
        ))}
    </div>
);

export const LocalizationDesk: React.FC<Props> = ({ player, onPlayer, initialId = 'southeast-asia', focus = 'detail' }) => {
    const calm = useCalm();
    const state = player.ownPlatform;
    const [regionId, setRegionId] = useState(initialId);
    const [error, setError] = useState('');
    const [stamp, setStamp] = useState<{ id: number; text: string; where: string } | null>(null);
    const desk = readLanguageDesk(state);
    const quote = useMemo(() => (state ? quoteLaunch(player) : null), [player, state]);
    const region = LOC_REGIONS.find(row => row.id === regionId) || LOC_REGIONS[0];
    const row = regionState(desk, region.id);
    const markets = state ? marketsInRegion(state, region.id) : [];
    const reach = quote?.languageReach.find(item => item.id === region.id);
    const extra = Math.max(0, Math.round((reach?.households || 0) - (reach?.baseHouseholds || 0)));
    const boostPct = reach && reach.baseHouseholds > 0
        ? Math.max(0, Math.round(((reach.households / reach.baseHouseholds) - 1) * 1000) / 10)
        : 0;
    const reachPct = reach && reach.openAudience > 0 ? Math.round((reach.viewers / reach.openAudience) * 1000) / 10 : 0;
    const cash = readCompanyCash(player);
    const energyShown = Math.round(useTick(desk.energy, calm));
    const earnedShown = Math.round(useTick(desk.earnedThisWeek, calm));
    const bankedShown = Math.round(useTick(desk.banked, calm));

    useEffect(() => {
        if (focus !== 'detail') return;
        const node = document.querySelector('[data-testid="loc-detail"]');
        node?.scrollIntoView({ block: 'start' });
    }, [focus, region.id]);

    useEffect(() => {
        if (!stamp) return;
        const timer = window.setTimeout(() => setStamp(current => current?.id === stamp.id ? null : current), 1100);
        return () => window.clearTimeout(timer);
    }, [stamp]);

    if (!state) return null;

    const flash = (text: string, where: string) => {
        if (calm) return;
        setStamp({ id: Date.now(), text, where });
    };

    const apply = (result: { player: Player; error?: string }, stampText?: string, where?: string) => {
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        if (stampText && where) flash(stampText, where);
        if (result.player !== player) onPlayer(result.player);
    };

    const live = state.stage === 'LIVE';
    const libraryCount = state.catalogue.filter(item => titleIsLive(item.releaseWeekOffset)).length;
    const releaseCount = state.catalogue.filter(item => typeof item.releaseWeekOffset === 'number' && item.releaseWeekOffset > 0).length;

    return (
        <div className={`loc${calm ? ' settled' : ''}`} data-testid="localization-desk" data-region={region.id}>
            <span className="sr-only" data-testid="loc-personal" data-amount={player.money}>Personal cash is not used.</span>
            {error && <p className="loc-note" data-testid="loc-error">{error}</p>}
            <div className="loc-grid" data-testid="loc-grid">
                {LOC_REGIONS.map(item => {
                    const saved = regionState(desk, item.id);
                    const selected = item.id === region.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            data-testid={`loc-card-${item.id}`}
                            className={`loc-card${item.wide ? ' wide' : ''}${selected ? ' on' : ''}`}
                            style={{ ['--accent' as string]: item.accent }}
                            onClick={() => { setRegionId(item.id); setError(''); }}
                        >
                            <div className="loc-card-map">
                                <RegionMap ids={item.countries.map(country => country.id)} accent={item.accent} label={`${item.name} map`} />
                                <div className="loc-card-fade" />
                            </div>
                            <div className="loc-card-body">
                                <Flags region={item} count={item.wide ? 6 : 4} />
                                <h3>{item.name}</h3>
                                <div className="loc-pips">
                                    <b>Sub<Pips filled={saved.subtitles.level} accent={item.accent} /></b>
                                    <b>Dub<Pips filled={saved.dubbing.level} accent={item.accent} /></b>
                                </div>
                                <p className="loc-langs">
                                    {item.wide ? `${item.countries.length} countries · ` : ''}
                                    {languageLine(item.languages, item.wide ? 3 : 2)}
                                </p>
                                <div className="loc-price">
                                    {saved.setup ? `Set up · level ${Math.max(saved.subtitles.level, saved.dubbing.level)}/3` : `Set up · ${formatCompact(item.once)}`}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            <section className="loc-detail" data-testid="loc-detail" style={{ ['--accent' as string]: region.accent }}>
                <div className="loc-banner">
                    <div className="loc-banner-map">
                        <RegionMap ids={region.countries.map(country => country.id)} accent={region.accent} glow label={`${region.name} highlighted`} />
                    </div>
                    <div className="loc-banner-shade" />
                    <div className={`loc-chip${row.setup ? ' set' : ''}`}>{row.setup ? 'Set up' : 'Not set up'}</div>
                    <div className="loc-banner-body">
                        <Flags region={region} count={6} />
                        <h3>{region.name}</h3>
                        <p className="loc-langs">{languageLine(region.languages, 4)}</p>
                        {markets.length === 0 && <p className="loc-copy">None of your markets speak these languages yet.</p>}
                        {!live && <p className="loc-copy">Figures start the week your service goes live.</p>}
                        {live && markets.length > 0 && (
                            <p className="loc-copy" data-testid="loc-forecast">
                                Reach {reachPct}% of the open audience · {formatPeople(Math.round(reach?.households || 0))} forecast subscribers here
                                {extra > 0 ? ` · +${boostPct}% reach · +${formatPeople(extra)} subscribers from this ladder` : ''}.
                            </p>
                        )}
                        {!row.setup && (
                            <ol className="loc-steps">
                                <li><em>1</em><span>Set up {region.name}: your service speaks {languageLine(region.languages, 4)}.</span></li>
                                <li><em>2</em><span>Raise Subtitles and Dubbing with energy: the library first, then new releases, then premieres from day one. Company cash buys each level.</span></li>
                            </ol>
                        )}
                        {!row.setup && (
                            <button
                                type="button"
                                className="loc-setup"
                                data-testid="loc-setup"
                                disabled={cash < region.once}
                                onClick={() => apply(setupLanguageRegion(player, region.id), 'Set up', 'banner')}
                            >
                                <b>Set up {region.name}</b>
                                <small>{formatCompact(region.once)} once · {formatCompact(region.weekly)} a week</small>
                            </button>
                        )}
                        <p className="loc-cashline">Company cash {formatCompact(cash)}. Personal cash stays put.</p>
                    </div>
                    {stamp?.where === 'banner' && <Stamp text={stamp.text} />}
                </div>
                {row.setup && (
                    <>
                        <div className="loc-energy" data-testid="loc-energy">
                            <p>Raise a level with energy</p>
                            <span className="loc-energy-chip">
                                <Bolt />
                                {energyShown.toLocaleString('en-US')} · {earnedShown} this week · {bankedShown.toLocaleString('en-US')} banked
                            </span>
                        </div>
                        <p className="loc-cashline">Company energy, banked from the live service. It is not your personal energy bar. Weekly dubbing {formatCompact(region.weekly)} leaves company cash.</p>
                        <div className="loc-tracks" data-testid="loc-tracks">
                            <Track
                                kind="subtitles"
                                title="Subtitles"
                                blurb="They read along in their language"
                                sample={region.sampleSub}
                                region={region}
                                track={presentTrack(row.subtitles, region.subNeed)}
                                need={region.subNeed}
                                energy={desk.energy}
                                libraryCount={libraryCount}
                                releaseCount={releaseCount}
                                calm={calm}
                                cash={cash}
                                stamp={stamp?.where === 'subtitles' ? stamp.text : ''}
                                onSpend={mode => apply(spendLanguageEnergy(player, region.id, 'subtitles', mode))}
                                onUpgrade={() => apply(upgradeLanguageLevel(player, region.id, 'subtitles'), `Level ${row.subtitles.level + 1}`, 'subtitles')}
                            />
                            <Track
                                kind="dubbing"
                                title="Dubbing"
                                blurb="They hear it in their language · the bigger lift"
                                sample={region.sampleDub}
                                region={region}
                                track={presentTrack(row.dubbing, region.dubNeed)}
                                need={region.dubNeed}
                                energy={desk.energy}
                                libraryCount={libraryCount}
                                releaseCount={releaseCount}
                                calm={calm}
                                cash={cash}
                                stamp={stamp?.where === 'dubbing' ? stamp.text : ''}
                                onSpend={mode => apply(spendLanguageEnergy(player, region.id, 'dubbing', mode))}
                                onUpgrade={() => apply(upgradeLanguageLevel(player, region.id, 'dubbing'), `Level ${row.dubbing.level + 1}`, 'dubbing')}
                            />
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

const Stamp: React.FC<{ text: string }> = ({ text }) => (
    <div className="loc-stamp" aria-hidden="true">
        <b>{text}</b>
        <i className="loc-spark" style={{ left: '30%', top: '34%' }} />
        <i className="loc-spark" style={{ left: '62%', top: '28%', animationDelay: '0.1s' }} />
        <i className="loc-spark" style={{ left: '48%', top: '58%', animationDelay: '0.16s' }} />
    </div>
);

const CcIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M8 12.5a2.2 2.2 0 1 1 0-1M14 12.5a2.2 2.2 0 1 1 0-1" />
    </svg>
);

const MicIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </svg>
);

const STEPS = [
    { name: 'Library', caption: (library: number) => `${library} titles` },
    { name: 'New releases', caption: (library: number, releases: number) => `${releases} titles` },
    { name: 'Day-one premieres', caption: () => 'every premiere' },
];

const Track: React.FC<{
    kind: 'subtitles' | 'dubbing';
    title: string;
    blurb: string;
    sample: string;
    region: LocRegion;
    track: { level: number; sub: number; energy: number };
    need: number;
    energy: number;
    libraryCount: number;
    releaseCount: number;
    calm: boolean;
    cash: number;
    stamp: string;
    onSpend: (mode: 'step' | 'fill') => void;
    onUpgrade: () => void;
}> = ({ kind, title, blurb, sample, region, track, need, energy, libraryCount, releaseCount, calm, cash, stamp, onSpend, onUpgrade }) => {
    const typed = useType(sample, calm);
    const done = track.level >= 3;
    const ready = !done && track.sub >= 3;
    const working = Math.min(2, track.level);
    const cost = region.upgrades[track.level] || 0;
    const room = Math.max(0, need - track.energy);
    const names = languageLine(region.languages, 3);
    const levelName = STEPS[working]?.name || 'Library';
    const kindWord = kind === 'dubbing' ? 'Dubbing' : 'Subtitles';
    return (
        <article className="loc-track" data-testid={`loc-track-${kind}`} style={{ ['--accent' as string]: region.accent }}>
            <div className="loc-track-head">
                <div className="loc-ico">{kind === 'dubbing' ? <MicIcon /> : <CcIcon />}</div>
                <div style={{ minWidth: 0 }}>
                    <h4>{title}</h4>
                    <p>{blurb}</p>
                </div>
                <span className="loc-level">Level {Math.min(3, track.level)}/3</span>
            </div>
            {kind === 'dubbing' ? (
                <div className="loc-wavebox">
                    <MicIcon />
                    <b>{typed}</b>
                    <span className="loc-wave" aria-hidden="true">
                        {Array.from({ length: 16 }, (_, index) => (
                            <i key={index} style={{ animationDelay: `${index * 0.06}s`, height: `${8 + ((index * 5) % 14)}px` }} />
                        ))}
                    </span>
                </div>
            ) : (
                <div className="loc-preview-line">
                    <span>{typed || ' '}</span>
                    {!calm && typed.length < sample.length ? <i className="loc-caret" /> : null}
                </div>
            )}
            <div className="loc-ladder" aria-hidden={false}>
                <div className="loc-ladder-line"><i style={{ width: `${Math.min(100, (track.level / 2) * 100)}%` }} /></div>
                {STEPS.map((step, index) => {
                    const paid = track.level > index;
                    const current = !done && track.level === index;
                    const pips = paid || done ? 3 : current ? track.sub : 0;
                    return (
                        <div key={step.name} className="loc-step">
                            <div className={`loc-node${paid || done ? ' done' : ''}${current ? ' now' : ''}`}>{paid || done ? '✓' : index + 1}</div>
                            <div className="loc-subpips" data-testid={`loc-pips-${kind}-${index}`}>
                                {[0, 1, 2].map(pip => <i key={pip} className={pip < pips ? 'on' : ''} />)}
                            </div>
                            <b>{step.name}</b>
                            <small>{step.caption(libraryCount, releaseCount)}</small>
                        </div>
                    );
                })}
            </div>
            {done ? (
                <p className="loc-done-line">Every title, from its first day. {kindWord} is complete here.</p>
            ) : (
                <>
                    <p className="loc-level-copy">
                        <strong>Level {track.level + 1} · {levelName}</strong>
                        Sub-level {track.level + 1}.{Math.min(3, track.sub + (ready ? 0 : 1))} · {names}. {kindWord} for this step covers the shelf in {bilingual(region.languages[0] || 'the local language')}.
                    </p>
                    {ready ? (
                        <button type="button" className="loc-upgrade" data-testid={`loc-upgrade-${kind}`} disabled={cash < cost} onClick={onUpgrade}>
                            <b>Upgrade to Level {track.level + 1} · {formatCompact(cost)}</b>
                            <small>Company cash · paperwork seals the level</small>
                        </button>
                    ) : (
                        <>
                            <div className="loc-meter">
                                <b>{track.energy} / {need}</b>
                                <button type="button" className="loc-energy-btn" data-testid={`loc-plus-${kind}`} disabled={energy < 1 || room <= 0} onClick={() => onSpend('step')}>+5</button>
                                <button type="button" className="loc-energy-btn ghost" data-testid={`loc-fill-${kind}`} disabled={energy < 1 || room <= 0} onClick={() => onSpend('fill')}>Fill · {room}</button>
                            </div>
                            <div className="loc-bar" data-testid={`loc-bar-${kind}`}>
                                {[0, 1, 2].map(index => {
                                    const width = index < track.sub ? 100 : index === track.sub ? (need > 0 ? (track.energy / need) * 100 : 0) : 0;
                                    return <span key={index}><i style={{ width: `${width}%` }} /></span>;
                                })}
                            </div>
                        </>
                    )}
                </>
            )}
            {stamp ? <Stamp text={stamp} /> : null}
        </article>
    );
};
