import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Player, RivalPlatformState } from '../../../types';
import { formatCompact } from '../../../services/ownPlatform/logic';
import '../fonts';
import './intro.css';
import { renderIntro } from './render';
import { useTimeline } from './useTimeline';

const SHOWCASE = ['netflix', 'prime', 'disney', 'max', 'paramount', 'hotstar', 'hulu', 'apple', 'peacock', 'crunchyroll'];
const MARK: Record<string, string> = {
    netflix: 'w-netflix',
    prime: 'w-prime',
    disney: 'w-disney',
    max: 'w-max',
    paramount: 'w-paramount',
    hotstar: 'w-hotstar',
    hulu: 'w-hulu',
    apple: 'w-apple',
    peacock: 'w-peacock',
    crunchyroll: 'w-crunchy',
};
const REGION: Record<string, string> = {
    NORTH_AMERICA: 'N. America',
    SOUTH_AMERICA: 'S. America',
    EUROPE: 'Europe',
    ASIA: 'Asia',
    AFRICA: 'Africa',
    OCEANIA: 'Oceania',
};

const BOLT = (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#fff" /></svg>
);

const JOBS: { no: string; title: string; copy: string; viz: 'dots' | 'racks' | 'script' | 'spines' | 'ladder' | 'spark' }[] = [
    { no: '01', title: 'Launch', copy: 'Open in 24 markets across 6 regions. Each one has its own tax, language and rivals.', viz: 'dots' },
    { no: '02', title: 'Build', copy: 'Lay the network. Scouts, Workhorses and Titans, plus cloud racks for the surge.', viz: 'racks' },
    { no: '03', title: 'Commission', copy: 'Greenlight originals and series. Compete with every studio on Earth for the brief.', viz: 'script' },
    { no: '04', title: 'Buy rights', copy: '2,076 books and 966 life stories, from the Mahabharata to a cricket captain.', viz: 'spines' },
    { no: '05', title: 'Compete', copy: 'Take homes from 40 rivals, one country and one Friday night at a time.', viz: 'ladder' },
    { no: '06', title: 'Go public', copy: 'Ring the bell. List as EMP, raise money, and buy a rival outright.', viz: 'spark' },
];

const pad = (value: number) => String(value).padStart(2, '0');

const regionOf = (rival: RivalPlatformState) => rival.tier === 'GLOBAL' ? 'Global' : (REGION[rival.homeRegion] || rival.homeRegion);

interface Props {
    player: Player;
    onDone: () => void;
}

export const EmpireIntro: React.FC<Props> = ({ player, onDone }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const handoffAt = useRef(Number.POSITIVE_INFINITY);
    const finished = useRef(false);
    const { t, tRef, seek, play, reducedMotion } = useTimeline(25.6);
    const rivals = player.ownPlatform?.rivals || [];
    const wall = useMemo(() => {
        const byId = new Map(rivals.map(rival => [rival.id, rival]));
        const featured = SHOWCASE.map(id => byId.get(id)).filter((row): row is RivalPlatformState => Boolean(row));
        const rest = [...rivals].filter(rival => !SHOWCASE.includes(rival.id)).sort((a, b) => b.householdsM - a.householdsM);
        const top = [...featured, ...rest].slice(0, 10);
        const more = rivals.filter(rival => !top.some(row => row.id === rival.id));
        return { top, more };
    }, [rivals]);
    const money = Math.max(0, player.money || 0);
    const rivalCount = rivals.length || 40;

    const finish = () => {
        if (finished.current) return;
        finished.current = true;
        onDone();
    };
    const handoff = () => {
        if (reducedMotion) {
            finish();
            return;
        }
        if (handoffAt.current === Number.POSITIVE_INFINITY) handoffAt.current = tRef.current;
    };
    const replay = () => {
        finished.current = false;
        handoffAt.current = Number.POSITIVE_INFINITY;
        seek(0);
        play();
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') handoff(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    useLayoutEffect(() => {
        if (reducedMotion || !rootRef.current) return;
        const done = renderIntro(rootRef.current, t, handoffAt.current, money);
        if (done) finish();
    });

    const cashLabel = formatCompact(money);

    if (reducedMotion) {
        return createPortal(
            <div id="empire-intro" data-screen="empire-intro">
                <div id="stage">
                    <section className="layer on" id="s6" style={{ opacity: 1 }}>
                        <div className="wrap">
                            <div className="kick">Your move</div>
                            <div className="hd" style={{ marginTop: 14 }}>Every giant started<br />as paperwork.</div>
                            <div className="chips">
                                <span>{cashLabel} cash</span><span>0 homes</span><span>0 titles</span><span>{rivalCount} rivals</span>
                            </div>
                            <button id="cta" type="button" onClick={finish}>Found your streamer <span>→</span></button>
                            <div className="next">Next · Step 1 of 7 · Name it</div>
                        </div>
                    </section>
                    <button id="skip" type="button" onClick={finish}>Skip →</button>
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div id="empire-intro" ref={rootRef} data-screen="empire-intro">
            <div id="stage">
                <div id="hud">
                    <div className="id"><span className="boltI">{BOLT}</span><b>EMPIRE+</b><span className="pl">· PROLOGUE</span></div>
                    <div id="segs">{Array.from({ length: 6 }, (_, index) => <i key={index}><b /></i>)}</div>
                    <button id="skip" type="button" aria-label="Skip intro" onClick={handoff}>Skip →</button>
                </div>

                <section className="layer" id="s1">
                    <div className="beam" />
                    <div>
                        <div className="wk">Week 1 · The world, tonight</div>
                        <div className="hd big" id="s1big">A billion homes<br />press play.</div>
                        <div className="sub" id="s1sub"><b>Forty platforms</b> are fighting for the same evening.</div>
                    </div>
                </section>

                <section className="layer" id="s2">
                    <div id="wallHead">
                        <div className="swap">
                            <div className="kick">The incumbents</div>
                            <div className="hd">They got here first.</div>
                        </div>
                        <div className="tot"><div className="n" id="tot">0</div><div className="l">homes · top ten</div></div>
                    </div>
                    <div id="wall">
                        {wall.top.map((rival, index) => (
                            <div className="tile" data-i={index} data-homes={rival.householdsM} key={rival.id}>
                                <div className="top"><span>#{pad(index + 1)}</span><span>{regionOf(rival)}</span></div>
                                <span className="rank">{pad(index + 1)}</span>
                                <div className="wm"><span className={`w ${MARK[rival.id] || 'w-plain'}`}>{rival.name}</span></div>
                                <div className="ct"><span className="c">0</span><small>homes</small></div>
                            </div>
                        ))}
                        <div className="tile more" data-i={10}>
                            <div className="top"><span>#11–{rivals.length || 40}</span><span>Everywhere</span></div>
                            <span className="rank">11+</span>
                            <div className="wm">{wall.more.slice(0, 12).map(rival => rival.name).join(' · ') || 'The rest of the field'}</div>
                            <div className="ct">+{Math.max(0, rivalCount - 10)} more</div>
                        </div>
                        <div className="tile slot" id="slot" data-i={11}>
                            <span className="rank">{rivalCount + 1}</span>
                            <span className="q">?</span>
                        </div>
                    </div>
                </section>

                <section className="layer" id="s3">
                    <div id="s3head"><div className="kick">New entrant</div><div className="hd">Now there are {rivalCount + 1}.</div></div>
                </section>
                <svg id="strike" viewBox="0 0 200 900" preserveAspectRatio="none" width="260">
                    <path id="strikeP" d="M120 0 L70 380 L130 380 L60 900" fill="none" stroke="#fff" strokeWidth="9" strokeLinejoin="miter" />
                </svg>
                <div id="you">
                    <svg className="bg" viewBox="0 0 24 24"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#fff" /></svg>
                    <div className="big">
                        <div className="tag"><span>New · Global</span><span>Slot {rivalCount + 1}</span></div>
                        <div className="nm">
                            <svg className="b" viewBox="0 0 24 24" width="54" height="54"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#fff" /></svg>
                            <span id="ytype" />
                            <i className="cur" id="ycur" />
                        </div>
                        <div className="tag"><span>0 homes · for now</span><span className="hideM">Originals · Films · Series</span></div>
                    </div>
                    <div className="sm">
                        <div className="nm">
                            <svg className="b" viewBox="0 0 24 24" width="24" height="24"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#fff" /></svg>
                            Your name here+
                        </div>
                        <div className="tag"><span>0 homes</span><span className="hideM">· you</span></div>
                    </div>
                </div>

                <section className="layer" id="s4">
                    <div id="s4head">
                        <div><div className="kick">The job</div><div className="hd">Run the whole machine.</div></div>
                        <div className="ctr" id="s4ctr">01 / 06</div>
                    </div>
                    <div id="cards">
                        {JOBS.map(job => (
                            <div className="card" key={job.no}>
                                <div className="mini"><span className="nn">{job.no}</span>{job.title}<span className="ck">✓ Yours</span></div>
                                <div className="full">
                                    <div className="no"><span>{job.no} / 06</span><span className="ok">Unlocked</span></div>
                                    <h3>{job.title}</h3>
                                    <p>{job.copy}</p>
                                    <div className="viz">{vizFor(job.viz)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="layer" id="s5">
                    <div id="s5head"><div className="d0">Day 0</div><div className="hd">You are a paper company.</div></div>
                    <div id="s5body">
                        <div style={{ position: 'relative' }}>
                            <div id="cert">
                                <div className="t">Certificate of Incorporation</div>
                                <div className="no">No. 0000041 · Registrar of Companies</div>
                                <div className="co">Your Name Here+ Media, Inc.</div>
                                <div className="tx">is hereby registered as a company. It has no subscribers, no catalogue, no servers and no office. It has a name, a bank account, and you.</div>
                                <div className="foot">
                                    <div>
                                        <div className="sig">
                                            <svg width="140" height="40" viewBox="0 0 140 40"><path id="sigP" d="M4 30 C14 6 22 6 24 26 S40 34 46 14 S60 6 62 24 S78 36 88 12 S104 20 110 26 S126 18 136 14" fill="none" stroke="#2A2418" strokeWidth="1.6" /></svg>
                                        </div>
                                        <div style={{ marginTop: 6 }}>Founder</div>
                                    </div>
                                    <div className="seal"><svg viewBox="0 0 24 24" width="26"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#4F3BFF" /></svg></div>
                                    <div style={{ textAlign: 'right' }}>Filed · Week {player.currentWeek || 1}<br />Year {player.age || 1}</div>
                                </div>
                            </div>
                            <div id="stamp">PAPER COMPANY</div>
                        </div>
                        <div id="stats">
                            <div className="st cash"><div><div className="l">Cash · seed</div><div className="n">From your own savings. Spend it once.</div></div><div className="v" id="cash">$0</div></div>
                            <div className="st zero"><div className="l">Homes</div><div className="v">0</div><div className="n">Nobody has heard of you.</div></div>
                            <div className="st zero"><div className="l">Titles</div><div className="v">0</div><div className="n">An empty shelf.</div></div>
                            <div className="st zero"><div className="l">Servers</div><div className="v">0</div><div className="n">Not one rack.</div></div>
                            <div className="st zero off"><div className="l">Office</div><div className="v">1 desk</div><div className="n">Shared. Floor 3. Rent due Friday.</div></div>
                            <div className="st zero"><div className="l">Rivals</div><div className="v" style={{ color: 'var(--bad)' }}>{rivalCount}</div><div className="n">Already live, already loved.</div></div>
                        </div>
                    </div>
                </section>

                <section className="layer" id="s6">
                    <svg className="bgb" viewBox="0 0 24 24"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#8B7BFF" /></svg>
                    <div className="wrap">
                        <div className="kick">Your move</div>
                        <div className="hd" style={{ marginTop: 14 }}>Every giant started<br />as paperwork.</div>
                        <div className="chips">
                            <span>{cashLabel} cash</span><span>0 homes</span><span>0 titles</span><span>{rivalCount} rivals</span>
                        </div>
                        <button id="cta" type="button" onClick={handoff}>Found your streamer <span>→</span></button>
                        <div className="next">Next · Step 1 of 7 · Name it</div>
                    </div>
                </section>

                <div id="nameit">
                    <div className="wrap">
                        <div>
                            <div className="k">Step 1 / 7 · Define the launch</div>
                            <h1>Name it</h1>
                            <div className="rail">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div>
                            <div className="inp"><b />UNNAMED</div>
                            <div className="hint">Short names survive on a billboard. You get the “+” free.</div>
                            <button className="back" id="back" type="button" onClick={replay}>← Replay intro</button>
                        </div>
                        <div><div className="bill"><svg viewBox="0 0 24 24" width="64"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#05060A" /></svg>UNNAMED</div></div>
                    </div>
                </div>
                <div id="wipe"><svg viewBox="0 0 24 24"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#05060A" /></svg></div>
                <div id="flash" />
                <div id="vig" />
                <div id="grain" />
                <div id="cap">01 · Cold open</div>
                <button id="replay" type="button" aria-label="Replay intro" onClick={replay}>↻ Replay</button>
            </div>
        </div>,
        document.body,
    );
};

const vizFor = (kind: string) => {
    if (kind === 'dots') return <div className="dots">{Array.from({ length: 72 }, (_, index) => <i key={index} />)}</div>;
    if (kind === 'racks') {
        return (
            <div className="racks">
                {['Scouts', 'Workhorses', 'Titans'].map(label => (
                    <div className="col" key={label}>
                        <div className="cells">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
                        <div className="lab">{label}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (kind === 'script') {
        return (
            <>
                <div className="script"><b>DEAD SIGNAL</b>EP 1 · COLD OPEN<br />INT. RELAY STATION – NIGHT<br />A signal nobody sent.</div>
                <div className="gstamp">GREENLIT</div>
            </>
        );
    }
    if (kind === 'spines') {
        return (
            <>
                <div className="bkc"><span className="bn">0</span><small>titles to option</small></div>
                <div className="spines">
                    {Array.from({ length: 26 }, (_, index) => <i key={index} style={{ background: `hsl(${(index * 47) % 360} 45% ${30 + (index * 13) % 30}%)` }} />)}
                </div>
            </>
        );
    }
    if (kind === 'ladder') {
        return (
            <div className="ladder">
                {['#06 · Hotstar', '#07 · hulu', '#08 · Apple TV+', '#09 · peacock'].map(row => (
                    <div className="r" key={row}><span>{row}</span><span>▼</span></div>
                ))}
                <div className="me"><span className="mr">#41 · You</span><span>▲</span></div>
            </div>
        );
    }
    return (
        <>
            <div className="tick"><span className="tk">EMP</span><small>listed · week 1</small></div>
            <svg className="spark" viewBox="0 0 300 70" preserveAspectRatio="none">
                <polyline className="sp" fill="none" stroke="#3DFFA0" strokeWidth="3" points="0,62 25,58 50,60 75,50 100,52 125,40 150,44 175,30 200,34 225,20 250,22 275,10 300,6" />
            </svg>
        </>
    );
};
