import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { OpeningPeakPlan, Player } from '../../../types';
import { brandFrom } from '../../../services/ownPlatform/brand';
import { formatCompact, formatPeople } from '../../../services/ownPlatform/logic';
import { launchChannel } from '../../../services/marketing/launchCatalog';
import { commitOpening, openingBrief, openingIsReplay, simulateOpening, type OpeningSim } from '../../../services/ownPlatform/openingNight';
import { WorldMap } from '../../marketing/launch/WorldMap';
import '../../marketing/launch/launch.css';
import { BrandMark } from '../BrandMark';
import { Confetti, CountUp, LiveFeed, Sparkline, tap } from '../../../components/motion';
import './opening.css';

const pad = (value: number) => String(value).padStart(2, '0');

export const OpeningNight: React.FC<{
    player: Player;
    onPlayer: (player: Player) => void;
    onClose: () => void;
    initialPhase?: 'ready' | 'control' | 'go';
    initialBeat?: number;
    hold?: boolean;
}> = ({ player, onPlayer, onClose, initialPhase = 'ready', initialBeat = 0, hold = false }) => {
    const reduce = useReducedMotion();
    const brief = useMemo(() => openingBrief(player), [player]);
    const [phase, setPhase] = useState<'ready' | 'control' | 'go'>(initialPhase);
    const [tick, setTick] = useState(hold && initialPhase === 'control' ? 10 : 10);
    const [plan, setPlan] = useState<OpeningPeakPlan>('GATES');
    const [step, setStep] = useState<'POLL' | 'GUARD' | 'LIVE'>('POLL');
    const [error, setError] = useState('');
    const [sim, setSim] = useState<OpeningSim | null>(initialPhase === 'go' ? simulateOpening(player, 'GATES') : null);
    const [beat, setBeat] = useState(initialBeat);
    const [count, setCount] = useState(hold ? 3 : 10);
    const forecast = useMemo(() => simulateOpening(player, plan), [player, plan]);
    const brand = brandFrom(player.ownPlatform?.brand);
    const formats = (player.marketing?.launch?.channelIds || []).slice(0, 4).map(id => launchChannel(id)?.name || id);

    useEffect(() => {
        if (phase !== 'control' || hold) return undefined;
        if (reduce) { setTick(0); return undefined; }
        const id = window.setInterval(() => setTick(value => (value <= 0 ? 0 : value - 1)), 1000);
        return () => window.clearInterval(id);
    }, [phase, reduce]);

    useEffect(() => {
        if (hold || phase !== 'go' || beat !== 0) return undefined;
        if (reduce) { setCount(1); return undefined; }
        const id = window.setInterval(() => setCount(value => (value <= 1 ? 1 : value - 1)), 700);
        return () => window.clearInterval(id);
    }, [phase, beat, reduce]);

    useEffect(() => {
        if (hold || phase !== 'go' || beat >= 7) return undefined;
        const wait = reduce ? 500 : beat === 0 ? 7600 : 3600;
        const id = window.setTimeout(() => setBeat(value => value + 1), wait);
        return () => window.clearTimeout(id);
    }, [phase, beat, reduce]);

    const go = () => {
        if (step === 'POLL') { tap('LIGHT'); setStep('GUARD'); return; }
        if (step === 'GUARD') { tap('MEDIUM'); setStep('LIVE'); return; }
        const result = commitOpening(player, plan);
        if (result.error) { setError(result.error); return; }
        tap('HEAVY');
        setError('');
        if (result.player !== player) onPlayer(result.player);
        setSim(result.sim);
        setBeat(0);
        setCount(reduce ? 1 : 10);
        setPhase('go');
    };

    const screen = phase === 'ready' ? 'opening-ready' : phase === 'control' ? 'opening-control' : 'opening-go';
    return (
        <div className="open-night" data-screen={screen} data-beat={beat}>
            {phase === 'ready' && (
                <div className="on-scroll">
                    <button type="button" className="live-x" aria-label="Close" onClick={onClose} style={{ position: 'absolute', right: 16, top: 16 }}>×</button>
                    <div className="on-kicker">{brief.service}</div>
                    <h1>OPENING NIGHT IS READY</h1>
                    <p>{brief.cities.length} {brief.cities.length === 1 ? 'city is' : 'cities are'} online</p>
                    <WorldMap className="on-map world-map" pins={brief.cities.map(city => ({ id: city.id, lat: city.lat, lon: city.lon, lit: true }))} />
                    <div className="check"><b>The network</b><span className={brief.networkReady ? 'done' : 'pend'}>{brief.networkReady ? 'DONE' : 'pending'}</span></div>
                    <div className="check"><b>Government clearance</b><span className={brief.clearanceReady ? 'done' : 'pend'}>{brief.clearanceReady ? 'DONE' : 'pending'}</span></div>
                    <div className="check"><b>Launch campaign</b><span className={brief.campaignReady ? 'done' : 'pend'}>{brief.campaignReady ? 'DONE' : 'pending'}</span></div>
                    <button type="button" className="on-go" onClick={() => { tap('MEDIUM'); setPhase('control'); }}>BEGIN OPENING NIGHT</button>
                </div>
            )}
            {phase === 'control' && (
                <div className="on-scroll" data-screen="launch-control">
                    <button type="button" className="live-x" aria-label="Close" onClick={onClose} style={{ position: 'absolute', right: 16, top: 16 }}>×</button>
                    <div className="on-kicker">LAUNCH CONTROL</div>
                    <div className="clock">T-00:00:{pad(tick)}</div>
                    <div className="panels">
                        <article className={`panel ${brief.networkReady ? 'go' : 'nogo'}`}><small>NETWORK</small><b>{brief.cities.length} cities online</b><span>{brief.networkReady ? 'GO' : 'NO-GO'}</span></article>
                        <article className={`panel ${brief.catalogueReady > 0 ? 'go' : 'nogo'}`}><small>CATALOGUE</small><b>{brief.catalogueReady} titles ready</b><span>{brief.catalogueReady > 0 ? 'GO' : 'NO-GO'}</span></article>
                        <article className={`panel ${brief.clearanceReady ? 'go' : 'nogo'}`}><small>MARKETS</small><b>{brief.clearedCount} countries cleared</b><div className="flags">{brief.markets.map(row => <span key={row.id} title={row.name}>{row.flag}</span>)}</div><span>{brief.clearanceReady ? 'GO' : 'NO-GO'}</span></article>
                        <article className={`panel ${brief.runwayWeeks >= 4 ? 'go' : 'nogo'}`}><small>TREASURY</small><b>{formatCompact(brief.cash)}</b><span>{brief.runwayWeeks} weeks of runway · {brief.runwayWeeks >= 4 ? 'GO' : 'NO-GO'}</span></article>
                        <article className={`panel ${brief.programmePct >= 80 ? 'go' : 'nogo'}`}><small>LAUNCH PROGRAMME</small><b>{brief.programmePct}% built</b><span>{brief.programmePct >= 80 ? 'GO' : 'NO-GO'}</span></article>
                    </div>
                    <div className="on-kicker">HOW WE TAKE THE PEAK</div>
                    <div className="plans">
                        {brief.plans.map(row => (
                            <button key={row.id} type="button" className={plan === row.id ? 'on' : ''} onClick={() => setPlan(row.id)}>
                                <b>{row.name}</b>
                                <span>{row.cost <= 0 ? 'FREE' : formatCompact(row.cost)} · {row.line}</span>
                            </button>
                        ))}
                    </div>
                    <div className="verdict">{forecast.verdict}</div>
                    <p>High case {formatPeople(forecast.peak)} against {formatPeople(forecast.capacity)} of capacity.</p>
                    {error && <p className="pend">{error}</p>}
                    <button type="button" className="on-go" disabled={tick > 0} onClick={go}>
                        {step === 'POLL' ? 'POLLING THE DESKS' : step === 'GUARD' ? 'LIFT THE GUARD' : 'GO LIVE'}
                    </button>
                    {openingIsReplay(player) && <p>This night already happened. The ceremony spends nothing the second time.</p>}
                </div>
            )}
            {phase === 'go' && sim && (
                <motion.div className="beat" key={beat} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <BrandMark id={brand.markId} color="#E4B15A" size={28} letter={brief.service} />
                    {beat === 0 && (
                        <>
                            <div className="particles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ left: `${(index * 19) % 100}%`, top: `${20 + (index % 6) * 10}%` }} />)}</div>
                            <div className="num">{count}</div>
                        </>
                    )}
                    {beat === 1 && (
                        <>
                            <h1>WE ARE LIVE</h1>
                            <p><CountUp value={sim.joined} format={formatPeople} /> watching</p>
                            <p><CountUp value={sim.subscribers} format={formatPeople} /> on the service</p>
                        </>
                    )}
                    {beat === 2 && (
                        <>
                            <h1>THE WORLD GOES LIVE</h1>
                            <div className="globe-wrap">
                                <WorldMap className="on-map world-map" pins={brief.cities.map(city => ({ id: city.id, lat: city.lat, lon: city.lon, lit: true }))} />
                                {formats.map((name, index) => (
                                    <span key={name} className="tip" style={{ left: `${12 + index * 22}%`, top: `${18 + (index % 2) * 28}%` }}>{name}</span>
                                ))}
                            </div>
                            <p>PEOPLE WHO JUST JOINED <CountUp value={sim.joined} format={formatPeople} /></p>
                            <div className="badges">
                                {sim.appStore && <span>APP STORE #1</span>}
                                {sim.trending && <span>TRENDING #1</span>}
                            </div>
                        </>
                    )}
                    {beat === 3 && (
                        <>
                            <h1>EVERY WINDOW, ONE TV AT A TIME</h1>
                            <div className="windows">{Array.from({ length: 24 }, (_, index) => <i key={index} className={index < (sim.held ? 18 : 7) ? 'on' : ''} />)}</div>
                            <p>STREAMING RIGHT NOW</p>
                        </>
                    )}
                    {beat === 4 && (
                        <>
                            <div className="room" aria-hidden="true">
                                <i className="person" style={{ left: '18%' }} />
                                <i className="person" style={{ left: '30%', height: 58 }} />
                                <i className="sofa" />
                            </div>
                            <div className="note"><small>{brief.service}</small><b>{brief.title} is streaming</b><span>Tap to watch</span></div>
                        </>
                    )}
                    {beat === 5 && (
                        <>
                            <h1>{sim.held ? 'Will it hold?' : sim.outage}</h1>
                            <Sparkline values={sim.curve.length ? sim.curve : [0, 1]} color={sim.held ? '#b6f3c8' : '#ff2d3a'} />
                            <p>{sim.held ? 'IT HELD' : 'THE ROOMS DROPPED'}</p>
                            {sim.held && <Confetti />}
                        </>
                    )}
                    {beat === 6 && (
                        <>
                            <h1>THE WORLD IS TALKING</h1>
                            <p><CountUp value={sim.social} format={formatPeople} /> posts</p>
                            <LiveFeed>
                                {sim.posts.map(post => <p key={post.handle}><b>{post.handle}</b> {post.text}</p>)}
                            </LiveFeed>
                        </>
                    )}
                    {beat >= 7 && (
                        <>
                            <h1>TONIGHT</h1>
                            <div className="panels">
                                <article className="panel"><small>SUBSCRIBERS</small><b><CountUp value={sim.subscribers} format={formatPeople} /></b></article>
                                <article className="panel"><small>PEAK AT ONCE</small><b><CountUp value={sim.peak} format={formatPeople} /></b></article>
                                <article className="panel"><small>PLAYED FIRST TIME</small><b>{sim.playedFirstPct}%</b></article>
                            </div>
                            <button type="button" className="on-go" onClick={onClose}>OPEN YOUR HQ</button>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};
