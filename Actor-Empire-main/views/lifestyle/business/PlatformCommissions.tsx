import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CommissionBrief, CommissionControls, CommissionProject, CommissionTerms, Player } from '../../../types';
import { displayTitle, loadCatalogue } from '../../../services/rights/catalogue';
import { allRecords, rightsOf } from '../../../services/rights/logic';
import { headingFont } from '../../ownPlatform/ui';
import { ChanceGauge, PlatformWord, RivalBanner, StudioFrame, initials } from './commissionChrome';
import {
    acceptEmpireReply, aiHouses, declineBrief, deskOf, dismissBrief, feeOf, openContract, quoteCounter,
    sendCounter, sendEmpireBrief, setFidelity, setLead, signBrief, usd, walkEmpireBrief, winChanceFor,
    abandonProject,
} from '../../../services/commissions/logic';
import { emptyControls, payableOf, trancheOf } from '../../../services/commissions/formulas';

const mono = '"JetBrains Mono", ui-monospace, monospace';
const paperFont = '"Instrument Serif", Georgia, serif';
const body = 'Inter, system-ui, sans-serif';

const ink = '#121524';
const line = '#1E2233';
const text = '#F4F5FA';
const mute = '#8A8FA8';
const dim = '#565B73';
const indigo = '#4F3BFF';
const volt = '#8B7BFF';
const go = '#3DFFA0';
const warn = '#FFC44D';
const bad = '#FF5470';

type Screen = 'sheet' | 'counter' | 'reply' | 'contract' | 'signed' | 'lost' | 'project';

interface Flow {
    screen: Screen;
    briefId?: string;
    projectId?: string;
}

const chip = (brief: CommissionBrief) => brief.format === 'SERIES'
    ? `${brief.seasons}×${brief.episodes}×${brief.runtimeMin}m`
    : `Film · ${brief.runtimeMin}m`;

const weeksLeft = (player: Player, brief: CommissionBrief) => {
    const absolute = (player.age - 1) * 52 + (player.currentWeek - 1);
    return Math.max(0, brief.closesWeek - absolute);
};

const controlList = (controls: CommissionControls) => {
    const house = [
        controls.finalCut ? 'House final cut' : 'Platform final cut',
        controls.casting ? 'House casting' : 'Platform casting',
        controls.showrunner ? 'House showrunner' : 'Platform showrunner',
        controls.marketing ? 'House marketing' : 'Platform marketing',
    ];
    return house;
};

export const CommissionToast: React.FC<{
    player: Player;
    snoozed: string[];
    onOpen: (brief: CommissionBrief) => void;
    onLater: (id: string) => void;
}> = ({ player, snoozed, onOpen, onLater }) => {
    const brief = deskOf(player).briefs.find(row =>
        row.direction === 'IN'
        && !snoozed.includes(row.id)
        && (row.status === 'CONTRACT' || row.status === 'LOST' || row.status === 'OPEN' || row.status === 'REPLIED'));
    if (!brief) return null;
    const lost = brief.status === 'LOST';
    return createPortal(
        <div className="empire" style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none' }}>
            <div style={{ position: 'fixed', inset: 0, zIndex: 25, background: 'radial-gradient(60% 60% at 80% 10%, #E5091422, transparent), #03040A88', pointerEvents: 'none' }} />
            <motion.aside
                data-testid="commission-toast"
                className="toast"
                style={{ pointerEvents: 'auto', borderColor: `${brief.platformColor}66` }}
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.34, 1.4, 0.64, 1] }}
            >
                <div className="hdr" style={{ background: `linear-gradient(90deg, ${brief.platformColor}33, #120306)` }}>
                    <PlatformWord id={brief.platformId} name={brief.platformName} size={38} />
                    <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffb3bf' }}>{lost ? 'BRIEF CLOSED' : 'INCOMING COMMISSION'}</div>
                        <div className="tiny">Week {player.currentWeek} · just now</div>
                    </div>
                </div>
                <div style={{ padding: '18px 20px 20px' }}>
                    <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 34, lineHeight: 0.95, textTransform: 'uppercase' }}>
                        {lost ? `${brief.winnerName} signed first` : `${brief.platformName} wants your studio`}
                    </div>
                    <div className="row" style={{ marginTop: 14 }}>
                        <div className="av">{initials(brief.execName)}</div>
                        <div>
                            <div style={{ fontWeight: 700 }}>{brief.execName}</div>
                            <div className="tiny">{brief.execTitle} · {brief.platformName}</div>
                        </div>
                    </div>
                    <p className="quote" style={{ marginTop: 12 }}>&ldquo;{brief.pitch}&rdquo;</p>
                    <div className="chips" style={{ marginTop: 14 }}>
                        <span className="chip">{chip(brief)}</span>
                        <span className="chip">{usd(feeOf(brief.baseTerms))} {brief.baseTerms.payModel === 'LICENCE' ? 'licence' : 'cost-plus'}</span>
                        <span className="chip">{brief.baseTerms.weeks} weeks</span>
                        <span className="chip">{brief.baseTerms.exclusivity ? 'Exclusive' : 'Non-exclusive'}</span>
                    </div>
                    <div style={{ marginTop: 14 }}>
                        <RivalBanner brief={brief} weeks={weeksLeft(player, brief)} />
                    </div>
                    <div className="row" style={{ marginTop: 16 }}>
                        <button data-testid="open-offer" type="button" onClick={() => onOpen(brief)} className="btn pri" style={{ flex: 1 }}>{lost ? 'See the loss' : brief.status === 'CONTRACT' ? 'Sign the contract →' : 'Open the offer →'}</button>
                        <button data-testid="offer-later" type="button" onClick={() => onLater(brief.id)} className="btn gho">Later</button>
                    </div>
                    <p className="tiny" style={{ marginTop: 10 }}>Every studio on the brief sees the same offer. The first acceptable signature wins.</p>
                </div>
            </motion.aside>
        </div>,
        document.body,
    );
};

export const CommissionSlateCards: React.FC<{ player: Player; onOpen: (project: CommissionProject) => void }> = ({ player, onOpen }) => {
    const projects = deskOf(player).projects.filter(project => project.houseId === 'PLAYER' && project.stage !== 'ABANDONED');
    if (!projects.length) return null;
    return (
        <>
            {projects.map(project => (
                <button
                    key={project.id}
                    data-testid="slate-commission-card"
                    onClick={() => onOpen(project)}
                    className="min-w-[140px] w-[140px] h-[210px] rounded-lg text-left p-3 shrink-0 relative overflow-hidden"
                    style={{ background: '#0C0E16', border: `1px solid ${project.weeksLate > 0 ? bad : line}`, fontFamily: body }}
                >
                    <div className="text-[10px] font-black tracking-wider" style={{ color: project.platformColor, fontFamily: headingFont }}>{project.platformName.toUpperCase()}</div>
                    <div className="mt-2 text-lg font-black uppercase leading-none" style={{ fontFamily: headingFont, color: text }}>{project.title}</div>
                    <div className="mt-2 text-[10px] uppercase" style={{ color: volt, fontFamily: mono }}>{stageLabel(project)}</div>
                    <div className="absolute bottom-3 left-3 right-3 text-[10px]" style={{ color: project.weeksLate > 0 ? bad : mute }}>
                        {project.weeksLate > 0 ? `${project.weeksLate}w late` : usd(project.received)}
                    </div>
                </button>
            ))}
        </>
    );
};

const stageLabel = (project: CommissionProject) => {
    if (project.stage === 'SHOOTING') return `Shooting wk ${Math.max(1, project.shootWeek)}/${project.shootWeeks}`;
    if (project.stage === 'DEVELOPMENT') return 'Development';
    if (project.stage === 'PRE_PRODUCTION') return 'Pre-production';
    if (project.stage === 'POST') return 'Post';
    if (project.stage === 'DELIVERED') return 'Delivered';
    if (project.stage === 'TAKEN_OVER') return 'Taken over';
    return 'Abandoned';
};

export const CommissionModal: React.FC<{
    player: Player;
    flow: Flow;
    onFlow: (flow: Flow | null) => void;
    onUpdatePlayer: (player: Player) => void;
    onOpenLab: () => void;
}> = ({ player, flow, onFlow, onUpdatePlayer, onOpenLab }) => {
    const desk = deskOf(player);
    const brief = desk.briefs.find(row => row.id === flow.briefId);
    const project = desk.projects.find(row => row.id === flow.projectId) || desk.projects.find(row => row.briefId === flow.briefId && row.houseId === 'PLAYER');
    const apply = (result: { player: Player; error?: string }, next?: Flow | null) => {
        if (result.error) return;
        onUpdatePlayer(result.player);
        if (next !== undefined) onFlow(next);
    };
    if (flow.screen === 'project' && project) {
        return <ProjectSheet player={player} project={project} onClose={() => onFlow(null)} onUpdatePlayer={onUpdatePlayer} onOpenLab={onOpenLab} />;
    }
    if (!brief) return null;
    if (flow.screen === 'lost' || brief.status === 'LOST') {
        return <LostSheet player={player} brief={brief} onClose={() => onFlow(null)} onDismiss={() => apply(dismissBrief(player, brief.id), null)} />;
    }
    if (flow.screen === 'signed' && project) {
        return <SignedSheet player={player} project={project} onSlate={() => onFlow(null)} onLab={onOpenLab} />;
    }
    if (flow.screen === 'contract' || brief.status === 'CONTRACT' && flow.screen !== 'counter' && flow.screen !== 'reply' && flow.screen !== 'sheet') {
        return (
            <ContractSheet
                player={player}
                brief={brief}
                onClose={() => onFlow(null)}
                onSigned={(signature) => {
                    const result = signBrief(player, brief.id, signature);
                    if (result.error || !result.player) return;
                    const signed = deskOf(result.player).projects.find(row => row.briefId === brief.id);
                    onUpdatePlayer(result.player);
                    onFlow({ screen: 'signed', briefId: brief.id, projectId: signed?.id });
                }}
            />
        );
    }
    if (flow.screen === 'reply') {
        return (
            <ReplySheet
                player={player}
                brief={brief}
                onClose={() => onFlow(null)}
                onAccept={() => apply(openContract(player, brief.id, 'REPLY'), { screen: 'contract', briefId: brief.id })}
                onCounter={() => onFlow({ screen: 'counter', briefId: brief.id })}
                onDecline={() => apply(declineBrief(player, brief.id), null)}
            />
        );
    }
    if (flow.screen === 'counter') {
        return (
            <CounterSheet
                player={player}
                brief={brief}
                onClose={() => onFlow({ screen: brief.status === 'REPLIED' ? 'reply' : 'sheet', briefId: brief.id })}
                onSend={(extra, weeks, controls) => apply(sendCounter(player, brief.id, extra, weeks, controls), { screen: 'reply', briefId: brief.id })}
            />
        );
    }
    return (
        <OfferSheet
            player={player}
            brief={brief}
            onClose={() => onFlow(null)}
            onDecline={() => apply(declineBrief(player, brief.id), null)}
            onCounter={() => onFlow({ screen: 'counter', briefId: brief.id })}
            onAccept={() => apply(openContract(player, brief.id, 'BASE'), { screen: 'contract', briefId: brief.id })}
        />
    );
};

const CONTROL_KEYS = ['finalCut', 'casting', 'showrunner', 'marketing'] as const;

const CONTROL_LABEL: Record<(typeof CONTROL_KEYS)[number], string> = {
    finalCut: 'Final cut',
    casting: 'Casting',
    showrunner: 'Showrunner',
    marketing: 'Marketing',
};

const sideOf = (house: boolean, platform: string) => (house ? 'You' : platform);

const shapeOf = (brief: CommissionBrief) => brief.format === 'SERIES'
    ? `${brief.seasons} season${brief.seasons > 1 ? 's' : ''} · ${brief.episodes} episodes × ${brief.runtimeMin} min`
    : `Feature · ${brief.runtimeMin} min`;

const beatCopy = (brief: CommissionBrief): [string, string][] => [
    ['Upfront · on signing', '25% · paid the week you sign'],
    ['Milestone · principal photography', '25% · when the shoot starts'],
    ['Milestone · picture lock', brief.format === 'SERIES' ? `25% · all ${brief.episodes} episodes locked` : '25% · at picture lock'],
    ['Delivery', `25% · accepted by ${brief.platformName}`],
];

const FlowFoot: React.FC<{
    label: string;
    value: string;
    closeLabel: string;
    closeValue: string;
    children: React.ReactNode;
}> = ({ label, value, closeLabel, closeValue, children }) => (
    <footer className="foot">
        <div className="kv"><div className="l">{label}</div><div className="v">{value}</div></div>
        <div className="sep" />
        <div className="kv"><div className="l">{closeLabel}</div><div className="v">{closeValue}</div></div>
        <div className="sp" />
        {children}
    </footer>
);

const ControlRows: React.FC<{
    platform: string;
    controls: CommissionControls;
    onToggle?: (key: (typeof CONTROL_KEYS)[number]) => void;
}> = ({ platform, controls, onToggle }) => (
    <>
        {CONTROL_KEYS.map(key => {
            const yours = controls[key];
            const body = (
                <>
                    <span className={yours ? '' : 'on'}>{platform}</span>
                    <span className={yours ? 'on' : ''}>You</span>
                </>
            );
            return (
                <div key={key} className="between" style={{ padding: '8px 0', borderBottom: '1px solid #ffffff0d' }}>
                    <span className="small" style={{ color: 'var(--text)' }}>{CONTROL_LABEL[key]}</span>
                    {onToggle ? (
                        <button type="button" data-testid={`counter-${key}`} className="seg" onClick={() => onToggle(key)}>{body}</button>
                    ) : (
                        <span className="seg">{body}</span>
                    )}
                </div>
            );
        })}
    </>
);

const MoneyCard: React.FC<{ brief: CommissionBrief; terms: CommissionTerms }> = ({ brief, terms }) => {
    const tranche = trancheOf(terms, brief.seasons);
    const perSeason = brief.format === 'SERIES' && brief.seasons > 1;
    const rows = terms.payModel === 'COST_PLUS'
        ? [
            ['Production budget', usd(terms.budget), `${brief.platformName} funds it. Not studio income.`],
            ['Producer premium', usd(terms.premium), `${terms.premiumPct}% on top · your profit`],
            [`Total from ${brief.platformName}`, usd(terms.budget + terms.premium), 'Budget plus premium. Tranches below are the income only.'],
        ]
        : [
            ['Licence fee', usd(terms.licenceFee), 'This is the income. You fund the shoot.'],
            ['Savings', 'Yours', 'You keep anything left under budget.'],
            ['Overruns', 'Yours', 'You pay anything past the budget.'],
        ];
    return (
        <div className="card">
            <div className="between">
                <div className="lab">Money · how they pay</div>
                <span className="seg">
                    <span className={terms.payModel === 'COST_PLUS' ? 'on' : ''}>Cost-plus</span>
                    <span className={terms.payModel === 'LICENCE' ? 'on' : ''}>Licence fee</span>
                </span>
            </div>
            <div className="grid g3" style={{ gap: 12, marginTop: 14 }}>
                {rows.map(row => (
                    <div key={row[0]} className="kv">
                        <div className="l">{row[0]}</div>
                        <div className="v">{row[1]}</div>
                        <div className="tiny">{row[2]}</div>
                    </div>
                ))}
            </div>
            <div className="sec">
                {beatCopy(brief).map((beat, index) => (
                    <div key={beat[0]} className="trow">
                        <span className="n">{index + 1}</span>
                        <div>
                            <div style={{ fontWeight: 600 }}>{beat[0]}</div>
                            <div className="tiny">{beat[1]}{perSeason ? ' · each season' : ''}</div>
                        </div>
                        <div className="mono" style={{ fontWeight: 700 }}>{usd(tranche)}{perSeason ? ' / season' : ''}</div>
                    </div>
                ))}
            </div>
            <p className="tiny" style={{ marginTop: 10 }}>
                {terms.payModel === 'COST_PLUS'
                    ? 'Each beat is a quarter of the producer premium. The production budget stays a reserve and is not paid to the house as income.'
                    : 'Each beat is a quarter of the licence fee. The house keeps savings and pays overruns.'}
            </p>
        </div>
    );
};

const OfferSheet: React.FC<{
    player: Player;
    brief: CommissionBrief;
    onClose: () => void;
    onDecline: () => void;
    onCounter: () => void;
    onAccept: () => void;
}> = ({ player, brief, onClose, onDecline, onCounter, onAccept }) => {
    const desk = deskOf(player);
    const chance = winChanceFor(brief, desk);
    const terms = brief.baseTerms;
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER');
    return (
        <StudioFrame
            player={player}
            testId="offer-sheet"
            kicker={`Incoming commission · ${brief.platformName}`}
            title="The offer"
            phase={0}
            onClose={onClose}
            footer={(
                <FlowFoot label="Offer" value={`${brief.title} · ${brief.platformName}`} closeLabel="Brief closes" closeValue={`${weeksLeft(player, brief)}w`}>
                    <button data-testid="offer-decline" type="button" className="btn gho" onClick={onDecline}>Decline</button>
                    <button data-testid="offer-counter" type="button" className="btn gho" onClick={onCounter}>Counter</button>
                    <button data-testid="offer-accept" type="button" className="btn pri" onClick={onAccept}>Accept &amp; go to contract →</button>
                </FlowFoot>
            )}
        >
            <div className="grid g-side">
                <div className="stack">
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="between" style={{ padding: '14px 20px', background: `linear-gradient(90deg, ${brief.platformColor}33, #120306)` }}>
                            <PlatformWord id={brief.platformId} name={brief.platformName} />
                            <div className="mono tiny" style={{ color: '#ffb3bf', letterSpacing: '0.18em' }}>
                                BRIEF {brief.id.slice(0, 8).toUpperCase()} · OPEN TO {brief.seats.length} STUDIOS
                            </div>
                        </div>
                        <div style={{ padding: '20px 22px 22px' }}>
                            <div className="row" style={{ gap: 8 }}>
                                <span className="pill s-run">{brief.format === 'SERIES' ? 'Series' : 'Film'}</span>
                                <span className="chip" style={{ padding: '4px 10px' }}>{shapeOf(brief)}</span>
                                {brief.format === 'SERIES' && <span className="chip" style={{ padding: '4px 10px' }}>Season 2 option</span>}
                                <span className="chip" style={{ padding: '4px 10px' }}>{brief.genre.replaceAll('_', ' ').toLowerCase()}</span>
                            </div>
                            <div className="offer-title">{brief.title}</div>
                            <p className="quote" style={{ marginTop: 8, maxWidth: 640 }}>{brief.logline}</p>
                            {brief.rightsTitle && (
                                <div className="row" style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, background: '#4F3BFF14', border: '1px solid #4F3BFF55', gap: 12 }}>
                                    <div style={{ width: 30, height: 42, borderRadius: 5, background: 'linear-gradient(160deg,#d08a2a,#3a1a05)', flex: 'none' }} />
                                    <div style={{ flex: 1 }}>
                                        <div className="small" style={{ color: '#fff', fontWeight: 700 }}>Based on: {brief.rightsTitle}</div>
                                        <div className="tiny">Rights Library · {brief.publicDomain ? 'public domain · another version can split the audience' : 'the option is theirs'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <MoneyCard brief={brief} terms={terms} />
                    <div className="grid g2">
                        <div className="card">
                            <div className="lab">Deadline</div>
                            <div className="big" style={{ fontSize: 44, marginTop: 4 }}>{terms.weeks} weeks</div>
                            <div className="tiny">From the week you sign</div>
                            <div className="lab" style={{ marginTop: 14 }}>Exclusivity</div>
                            <div style={{ fontWeight: 700, marginTop: 4 }}>{terms.exclusivity ? 'Exclusive' : 'Non-exclusive'} · {terms.territories}</div>
                        </div>
                        <div className="card">
                            <div className="lab">Creative control</div>
                            <ControlRows platform={brief.platformName} controls={terms.controls} />
                            <p className="tiny" style={{ marginTop: 8 }}>Two sides on this desk: the platform holds it, or you do.</p>
                        </div>
                    </div>
                    <div className="grid g2">
                        <div className="card ok">
                            <div className="lab" style={{ color: 'var(--go)' }}>Hit bonus</div>
                            <div className="line"><span>Top 10 in 20+ countries, first 28 days</span><span style={{ color: 'var(--go)' }}>+{usd(terms.hitBonus)}</span></div>
                            <div className="line" style={{ border: 0 }}><span>Season 2 ordered</span><span style={{ color: 'var(--go)' }}>{brief.format === 'SERIES' ? `+${usd(terms.season2Bonus)}` : '—'}</span></div>
                        </div>
                        <div className="card bad">
                            <div className="lab" style={{ color: 'var(--bad)' }}>Penalties</div>
                            <div className="line"><span>Late delivery</span><span style={{ color: 'var(--bad)' }}>−2% of the open tranche / week</span></div>
                            <div className="line"><span>8+ weeks late</span><span style={{ color: 'var(--bad)' }}>{brief.platformName} can take over</span></div>
                            <div className="line" style={{ border: 0 }}><span>Over budget beyond 10%</span><span style={{ color: 'var(--bad)' }}>You pay the overrun</span></div>
                        </div>
                    </div>
                </div>
                <aside className="stack">
                    <div className="card">
                        <div className="row">
                            <div className="av">{initials(brief.execName)}</div>
                            <div>
                                <div style={{ fontWeight: 700 }}>{brief.execName}</div>
                                <div className="tiny">{brief.execTitle}</div>
                            </div>
                        </div>
                        <p className="quote" style={{ fontSize: 16, marginTop: 10 }}>&ldquo;{brief.pitch}&rdquo;</p>
                    </div>
                    <div className="card warn">
                        <RivalBanner brief={brief} weeks={weeksLeft(player, brief)} />
                        <div className="lab" style={{ marginTop: 14 }}>Your standing with {brief.platformName}</div>
                        <div className="kvs" style={{ marginTop: 8 }}>
                            <div className="kv"><div className="l">Reputation</div><div className="v">{desk.reputation}</div></div>
                            <div className="kv"><div className="l">Relationship</div><div className="v">{desk.relationships[brief.platformId] ?? 42}</div></div>
                            <div className="kv"><div className="l">Past deals</div><div className="v">{desk.projects.filter(row => row.platformId === brief.platformId && row.houseId === 'PLAYER').length}</div></div>
                            <div className="kv"><div className="l">Studios on it</div><div className="v">{rivals.length}</div></div>
                        </div>
                        <div className="between" style={{ marginTop: 14 }}>
                            <span className="small">Win chance if you accept now</span>
                            <b data-testid="win-chance" style={{ fontFamily: 'var(--h)', fontSize: 30, color: chance > 70 ? 'var(--go)' : chance > 40 ? 'var(--warn)' : 'var(--bad)' }}>{chance}%</b>
                        </div>
                        <p className="tiny">Accepting at these terms opens the contract. A rival can still sign first.</p>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const CounterSheet: React.FC<{
    player: Player;
    brief: CommissionBrief;
    onClose: () => void;
    onSend: (extraPremium: number, extraWeeks: number, controls: CommissionControls) => void;
}> = ({ player, brief, onClose, onSend }) => {
    const desk = deskOf(player);
    const [extra, setExtra] = useState(4);
    const [weeks, setWeeks] = useState(2);
    const [controls, setControls] = useState<CommissionControls>({ ...emptyControls(), ...(brief.playerAsk?.controls || {}) });
    const quote = quoteCounter(brief, desk, extra, weeks, controls);
    const acceptNow = winChanceFor(brief, desk);
    const basePay = payableOf(brief.baseTerms);
    const askPay = payableOf(quote.ask);
    const toggle = (key: (typeof CONTROL_KEYS)[number]) => setControls(current => ({ ...current, [key]: !current[key] }));
    const feePct = (extra / 20) * 100;
    const weekPct = (weeks / 10) * 100;
    return (
        <StudioFrame
            player={player}
            testId="counter-sheet"
            kicker={`Incoming commission · ${brief.platformName}`}
            title="Counter"
            phase={1}
            onClose={onClose}
            footer={(
                <FlowFoot label="Offer" value={`${brief.title} · ${brief.platformName}`} closeLabel="Brief closes" closeValue={`${weeksLeft(player, brief)}w`}>
                    <button type="button" className="btn gho" onClick={onClose}>← Back to offer</button>
                    <button data-testid="counter-send" type="button" className="btn pri" onClick={() => onSend(extra, weeks, controls)}>Send counter →</button>
                </FlowFoot>
            )}
        >
            <div className="card warn onlyM" style={{ position: 'sticky', top: 96, zIndex: 4, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="lab" style={{ color: 'var(--warn)' }}>Win chance</span>
                <b style={{ fontFamily: 'var(--h)', fontSize: 30, color: quote.chance > 70 ? 'var(--go)' : quote.chance > 40 ? 'var(--warn)' : 'var(--bad)' }}>{quote.chance}%</b>
            </div>
            <div className="grid g-side">
                <div className="stack">
                    <p className="p">Ask for more money, more time, or more control. Every ask costs points with {brief.platformName}, and the other studios can sign first.</p>
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div className="between">
                            <div className="lab">Producer fee</div>
                            <div>
                                <span className="tiny mono" style={{ textDecoration: 'line-through' }}>{usd(basePay)}</span>
                                <b style={{ fontFamily: 'var(--h)', fontSize: 30, marginLeft: 8 }}>{usd(askPay)}</b>
                            </div>
                        </div>
                        <div className="slider">
                            <div className="o" style={{ left: '0%' }} />
                            <div className="f" style={{ width: `${feePct}%` }} />
                            <div className="k" style={{ left: `${feePct}%` }} />
                            <input data-testid="counter-premium" className="range-hit" type="range" min={0} max={20} value={extra} onChange={event => setExtra(Number(event.target.value))} aria-label="Extra premium" />
                        </div>
                        <div className="between tiny mono"><span>+0%</span><span>Offered {usd(basePay)}</span><span>+20%</span></div>
                    </div>
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div className="between">
                            <div className="lab">Deadline</div>
                            <div>
                                <span className="tiny mono" style={{ textDecoration: 'line-through' }}>{brief.baseTerms.weeks} wks</span>
                                <b style={{ fontFamily: 'var(--h)', fontSize: 30, marginLeft: 8 }}>{brief.baseTerms.weeks + weeks} wks</b>
                            </div>
                        </div>
                        <div className="slider">
                            <div className="o" style={{ left: '0%' }} />
                            <div className="f" style={{ width: `${weekPct}%` }} />
                            <div className="k" style={{ left: `${weekPct}%` }} />
                            <input data-testid="counter-weeks" className="range-hit" type="range" min={0} max={10} value={weeks} onChange={event => setWeeks(Number(event.target.value))} aria-label="Extra weeks" />
                        </div>
                        <div className="between tiny mono"><span>+0</span><span>Offered {brief.baseTerms.weeks} weeks</span><span>+10</span></div>
                    </div>
                    <div className="card" style={{ padding: '16px 18px' }}>
                        <div className="lab">Creative control</div>
                        <ControlRows platform={brief.platformName} controls={controls} onToggle={toggle} />
                    </div>
                    <div className="card flat">
                        <div className="lab">What you gain</div>
                        <div className="kvs" style={{ marginTop: 8 }}>
                            <div className="kv"><div className="l">Extra profit</div><div className="v" style={{ color: 'var(--go)' }}>{askPay - basePay >= 0 ? '+' : ''}{usd(askPay - basePay)}</div></div>
                            <div className="kv"><div className="l">Extra weeks</div><div className="v">+{weeks}</div></div>
                            <div className="kv"><div className="l">Controls yours</div><div className="v">{CONTROL_KEYS.filter(key => controls[key]).length}</div></div>
                            <div className="kv"><div className="l">Win chance</div><div className="v" style={{ color: quote.chance > 70 ? 'var(--go)' : 'var(--warn)' }}>{quote.chance}%</div></div>
                        </div>
                    </div>
                </div>
                <aside className="stack">
                    <div className="card warn" style={{ textAlign: 'center' }}>
                        <ChanceGauge chance={quote.chance} was={acceptNow} />
                        <div style={{ textAlign: 'left', marginTop: 8 }}>
                            <div className="between small" style={{ padding: '7px 0', borderBottom: '1px solid #ffffff0d' }}><span>Just for countering</span><b className="mono" style={{ color: 'var(--bad)' }}>−{quote.breakdown.countering.toFixed(0)}</b></div>
                            <div className="between small" style={{ padding: '7px 0', borderBottom: '1px solid #ffffff0d' }}><span>Premium +{extra}%</span><b className="mono" style={{ color: 'var(--bad)' }}>−{quote.breakdown.premium.toFixed(1)}</b></div>
                            <div className="between small" style={{ padding: '7px 0', borderBottom: '1px solid #ffffff0d' }}><span>Deadline +{weeks} weeks</span><b className="mono" style={{ color: 'var(--bad)' }}>−{quote.breakdown.weeks}</b></div>
                            <div className="between small" style={{ padding: '7px 0' }}><span>Controls</span><b className="mono" style={{ color: 'var(--bad)' }}>−{quote.breakdown.controls}</b></div>
                        </div>
                    </div>
                    <div className="card">
                        <RivalBanner brief={brief} weeks={weeksLeft(player, brief)} />
                        <p className="tiny" style={{ marginTop: 10 }}>They rarely give up final cut. Money and time, they will meet about halfway. A rival can sign while you wait.</p>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const ReplySheet: React.FC<{
    player: Player;
    brief: CommissionBrief;
    onClose: () => void;
    onAccept: () => void;
    onCounter: () => void;
    onDecline: () => void;
}> = ({ player, brief, onClose, onAccept, onCounter, onDecline }) => {
    const desk = deskOf(player);
    const reply = brief.platformReply || brief.baseTerms;
    const asked = brief.playerAsk || brief.baseTerms;
    const chance = winChanceFor(brief, desk);
    const again = quoteCounter(
        brief,
        desk,
        Math.max(0, reply.premiumPct - brief.baseTerms.premiumPct),
        Math.max(0, reply.weeks - brief.baseTerms.weeks),
        reply.controls,
    );
    const rows: [string, string, string, string][] = [
        ['Fee', usd(payableOf(brief.baseTerms)), usd(payableOf(asked)), usd(payableOf(reply))],
        ['Weeks', `${brief.baseTerms.weeks} wks`, `${asked.weeks} wks`, `${reply.weeks} wks`],
        ...CONTROL_KEYS.map(key => [
            CONTROL_LABEL[key],
            sideOf(brief.baseTerms.controls[key], brief.platformName),
            sideOf(asked.controls[key], brief.platformName),
            sideOf(reply.controls[key], brief.platformName),
        ] as [string, string, string, string]),
    ];
    return (
        <StudioFrame
            player={player}
            testId="reply-sheet"
            kicker={`Incoming commission · ${brief.platformName}`}
            title={`${brief.platformName} replies`}
            phase={1}
            onClose={onClose}
            footer={(
                <FlowFoot label="Offer" value={`${brief.title} · ${brief.platformName}`} closeLabel="Brief closes" closeValue={`${weeksLeft(player, brief)}w`}>
                    <button type="button" className="btn gho" onClick={onDecline}>Decline</button>
                    <button data-testid="reply-counter" type="button" className="btn gho" onClick={onCounter}>Counter again</button>
                    <button data-testid="reply-accept" type="button" className="btn pri" onClick={onAccept}>Accept revised terms →</button>
                </FlowFoot>
            )}
        >
            <div className="grid g-side">
                <div className="stack">
                    <div className="bub me">
                        <div className="lab" style={{ color: 'var(--volt)' }}>You · week {brief.openedWeek}</div>
                        <p style={{ marginTop: 6 }}>Fee {usd(payableOf(asked))}, {asked.weeks} weeks. {CONTROL_KEYS.filter(key => asked.controls[key]).map(key => CONTROL_LABEL[key]).join(', ') || 'No extra control'} on our side.</p>
                    </div>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 10, flexWrap: 'nowrap' }}>
                        <div className="av" style={{ width: 34, height: 34, fontSize: 12 }}>{initials(brief.execName)}</div>
                        <div className="bub">
                            <div className="lab" style={{ color: '#ffb3bf' }}>{brief.execName} · {brief.platformName}</div>
                            <p style={{ marginTop: 6 }}>We can go to <b>{usd(payableOf(reply))}</b> and <b>{reply.weeks} weeks</b>. {CONTROL_KEYS.map(key => `${CONTROL_LABEL[key]} stays with ${sideOf(reply.controls[key], brief.platformName)}`).join('. ')}.</p>
                        </div>
                    </div>
                    <div className="card">
                        <div className="between">
                            <div className="lab">Where the deal stands</div>
                            <span className="pill s-ok">Revised offer</span>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: 0, fontSize: 13.5 }}>
                            <div className="lab" style={{ padding: '8px 0' }}>Term</div>
                            <div className="lab" style={{ padding: '8px 0' }}>Original</div>
                            <div className="lab" style={{ padding: '8px 0' }}>You asked</div>
                            <div className="lab" style={{ padding: '8px 0', color: 'var(--go)' }}>{brief.platformName} now</div>
                            {rows.map(row => (
                                <React.Fragment key={row[0]}>
                                    <div style={{ padding: '10px 0', borderTop: '1px solid #ffffff0d', color: 'var(--mute)' }}>{row[0]}</div>
                                    <div className="mono" style={{ padding: '10px 0', borderTop: '1px solid #ffffff0d' }}>{row[1]}</div>
                                    <div className="mono" style={{ padding: '10px 0', borderTop: '1px solid #ffffff0d' }}>{row[2]}</div>
                                    <div className="mono" style={{ padding: '10px 0', borderTop: '1px solid #ffffff0d', fontWeight: 700, color: 'var(--go)' }}>{row[3]}</div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
                <aside className="stack">
                    {brief.rivalAlert && (
                        <div className="card bad" style={{ background: '#1a0a12' }}>
                            <div className="lab" style={{ color: 'var(--bad)' }}>Heads up</div>
                            <p className="small" style={{ marginTop: 6, color: '#E4E6F0' }}>{brief.rivalAlert}</p>
                        </div>
                    )}
                    <div className="card">
                        <div className="lab">If you counter again</div>
                        <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 56, color: 'var(--bad)', lineHeight: 1, marginTop: 4 }}>{again.chance}%</div>
                        <p className="tiny">Win chance. A second counter usually loses to a rival who already said yes.</p>
                        <div className="lab" style={{ marginTop: 14 }}>This offer</div>
                        <div data-testid="win-chance" className="timer" style={{ fontSize: 22, marginTop: 4 }}>{chance}% · {weeksLeft(player, brief)}w left</div>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const contractClauses = (player: Player, brief: CommissionBrief, terms: CommissionTerms) => {
    const house = player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE');
    const tranche = trancheOf(terms, brief.seasons);
    const total = terms.payModel === 'COST_PLUS' ? terms.budget + terms.premium : terms.licenceFee;
    return [
        ['Programme', `${brief.title}, a ${brief.format === 'SERIES' ? `scripted series of ${brief.seasons} season${brief.seasons > 1 ? 's' : ''} × ${brief.episodes} episodes of about ${brief.runtimeMin} minutes` : `feature of about ${brief.runtimeMin} minutes`}. Genre ${brief.genre.replaceAll('_', ' ').toLowerCase()}.${brief.rightsTitle ? ` Based on ${brief.rightsTitle}${brief.publicDomain ? ' (public domain)' : ''}.` : ' An original commission.'}`],
        ['Fee', terms.payModel === 'COST_PLUS'
            ? `Cost-plus. The Platform funds a production budget of ${usd(terms.budget)} and pays the Producer a premium of ${usd(terms.premium)} (${terms.premiumPct}%), a total commitment of ${usd(total)}. The budget is a reserve and is not income.`
            : `Licence fee ${usd(terms.licenceFee)}. The Producer funds the shoot, keeps savings, and pays overruns.`],
        ['Payment', `In four tranches of ${usd(tranche)}${brief.seasons > 1 ? ' per season' : ''}: on signature; at the start of principal photography; at picture lock; and on accepted delivery.`],
        ['Delivery', `Delivery in ${terms.weeks} weeks. Late work costs 2% of the open tranche per week. From eight weeks late, the Platform may take over. Paid tranches stay. The bonus does not.`],
        ['Budget', 'Spend above 110% of the production budget is paid by the Producer.'],
        ['Territory', `${terms.exclusivity ? 'Exclusive' : 'Non-exclusive'} in ${terms.territories}.`],
        ['Control', controlList(terms.controls).join('. ') + '.'],
        ['Bonus', `Hit bonus ${usd(terms.hitBonus)}.${brief.format === 'SERIES' ? ` Season-2 bonus ${usd(terms.season2Bonus)}, paid when that season opens.` : ''}`],
        ['Failure', `If ${house?.name || 'the Producer'} abandons the production, unspent tranches are repaid, relationship falls by 30, and this platform goes quiet for 52 weeks.`],
    ] as [string, string][];
};

const ContractSheet: React.FC<{
    player: Player;
    brief: CommissionBrief;
    onClose: () => void;
    onSigned: (signature: string) => void;
}> = ({ player, brief, onClose, onSigned }) => {
    const terms = brief.finalTerms || brief.platformReply || brief.baseTerms;
    const house = player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE');
    const [drawn, setDrawn] = useState<string | null>(null);
    const [padKey, setPadKey] = useState(0);
    const [hold, setHold] = useState(0);
    const frame = useRef<number | null>(null);
    const stop = () => {
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = null;
        setHold(0);
    };
    const startHold = () => {
        const began = performance.now();
        const step = (now: number) => {
            const next = Math.min(1, (now - began) / 1500);
            setHold(next);
            if (next >= 1) {
                onSigned(drawn || 'held');
                return;
            }
            frame.current = requestAnimationFrame(step);
        };
        frame.current = requestAnimationFrame(step);
    };
    useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);
    const clauses = contractClauses(player, brief, terms);
    const tranche = trancheOf(terms, brief.seasons);
    return (
        <StudioFrame
            player={player}
            testId="contract-sheet"
            kicker={`Commission · ${brief.platformName}`}
            title="The contract"
            phase={2}
            onClose={onClose}
            footer={(
                <FlowFoot label="Contract" value={brief.id.slice(0, 12).toUpperCase()} closeLabel="Brief closes" closeValue={`${weeksLeft(player, brief)}w`}>
                    <button type="button" className="btn gho" onClick={() => { setDrawn(null); setPadKey(key => key + 1); }}>Clear</button>
                    <button data-testid="contract-sign" type="button" className={`btn gho ${drawn ? '' : 'dis'}`} disabled={!drawn} onClick={() => drawn && onSigned(drawn)}>Sign the drawn name</button>
                    <button
                        data-testid="contract-hold"
                        type="button"
                        className="holdbtn"
                        style={{ width: 280 }}
                        onPointerDown={startHold}
                        onPointerUp={stop}
                        onPointerLeave={stop}
                        onPointerCancel={stop}
                    >
                        <span className="fill" style={{ width: `${hold * 100}%` }} />
                        <span>{hold >= 1 ? 'Signed' : hold > 0 ? `Keep holding… ${Math.round(hold * 100)}%` : 'Hold to sign · 1.5s'}</span>
                    </button>
                </FlowFoot>
            )}
        >
            <div className="grid g-side" id="cg">
                <div>
                    <div className="contract" id="paper">
                        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.32em', color: '#6B5E44', textAlign: 'center' }}>CONTRACT · WEEK {player.currentWeek}</div>
                        <h2 style={{ marginTop: 10 }}>Production &amp; Licence Agreement</h2>
                        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#4A3F2B', marginTop: 8, fontSize: 16 }}>
                            between <b style={{ fontStyle: 'normal' }}>{brief.platformName}</b> (“the Platform”) and <b style={{ fontStyle: 'normal' }}>{house?.name || 'the Producer'}</b> (“the Producer”)
                        </p>
                        <div style={{ marginTop: 18, borderTop: '1px solid #221D1322', paddingTop: 6 }}>
                            {clauses.map((clause, index) => (
                                <div key={clause[0]} className="cl">
                                    <b>§{index + 1}</b>
                                    <div>
                                        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: '#6B5E44', textTransform: 'uppercase' }}>{clause[0]}</span>
                                        <br />
                                        {clause[1]}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid g2" style={{ gap: 28, marginTop: 30 }}>
                            <div>
                                <div className="sigpad" style={{ height: 80 }}>
                                    <svg viewBox="0 0 130 60" width="170" height="70" style={{ position: 'absolute', left: 4, bottom: 2 }}>
                                        <path d="M4 40 C20 10 26 46 40 30 S60 8 70 36 S96 44 120 22" fill="none" stroke="#1d2a6b" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: '#6B5E44', marginTop: 6 }}>FOR THE PLATFORM · {brief.execName.toUpperCase()}</div>
                            </div>
                            <div>
                                <div className="sigpad" style={{ height: 80 }}>
                                    <SignaturePad key={padKey} onChange={setDrawn} />
                                </div>
                                <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: '#6B5E44', marginTop: 6 }}>FOR THE PRODUCER · {(house?.name || 'THE HOUSE').toUpperCase()}</div>
                            </div>
                        </div>
                        <div className="seal" style={{ position: 'absolute', right: 40, top: 36, width: 62, height: 62, borderRadius: '50%', border: `2px solid ${brief.platformColor}66`, display: 'grid', placeItems: 'center', fontFamily: 'var(--h)', fontWeight: 900, color: brief.platformColor, fontSize: 11, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1 }}>{brief.platformName.split(' ')[0].toUpperCase()}</div>
                    </div>
                </div>
                <aside className="stack hideM">
                    <div className="card">
                        <div className="lab">Key terms</div>
                        <div className="line"><span>Fee</span><span>{usd(payableOf(terms))}</span></div>
                        <div className="line"><span>Tranches</span><span>4 × {usd(tranche)}{brief.seasons > 1 ? ' / season' : ''}</span></div>
                        <div className="line"><span>Delivery</span><span>{terms.weeks} wks</span></div>
                        <div className="line"><span>Window</span><span>{terms.exclusivity ? 'Exclusive' : 'Non-exclusive'}</span></div>
                        <div className="line"><span>Final cut</span><span>{sideOf(terms.controls.finalCut, brief.platformName)}</span></div>
                        <div className="line"><span>Hit bonus</span><span>{usd(terms.hitBonus)}</span></div>
                    </div>
                    <div className="card flat">
                        <div className="lab">Two ways to sign</div>
                        <p className="small" style={{ marginTop: 6 }}>Draw your signature on the line, or press and hold the button for 1.5 seconds. Either one binds the house.</p>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const SignaturePad: React.FC<{ onChange: (value: string | null) => void }> = ({ onChange }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const moved = useRef(0);
    const paint = () => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#2A2418';
        ctx.fillStyle = '#2A2418';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    const fit = () => {
        const canvas = ref.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const nextWidth = Math.floor(width * ratio);
        const nextHeight = Math.floor(height * ratio);
        if (canvas.width === nextWidth && canvas.height === nextHeight) {
            paint();
            return;
        }
        if (moved.current > 0) return;
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        const ctx = canvas.getContext('2d');
        ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
        paint();
    };
    useEffect(() => {
        fit();
        const canvas = ref.current;
        if (!canvas || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => fit());
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);
    const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = ref.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const commit = () => {
        if (moved.current < 2 || !ref.current) return;
        onChange(ref.current.toDataURL('image/png'));
    };
    return (
        <canvas
            ref={ref}
            data-testid="contract-canvas"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', background: 'transparent' }}
            onPointerDown={event => {
                event.preventDefault();
                fit();
                const canvas = ref.current;
                if (!canvas) return;
                try { canvas.setPointerCapture(event.pointerId); } catch { /* already captured */ }
                drawing.current = true;
                const ctx = canvas.getContext('2d');
                const p = point(event);
                ctx?.beginPath();
                ctx?.moveTo(p.x, p.y);
                ctx?.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
                ctx?.fill();
                moved.current += 1;
            }}
            onPointerMove={event => {
                if (!drawing.current) return;
                event.preventDefault();
                const ctx = ref.current?.getContext('2d');
                const p = point(event);
                ctx?.lineTo(p.x, p.y);
                ctx?.stroke();
                moved.current += 1;
                if (moved.current === 3) commit();
            }}
            onPointerUp={event => {
                drawing.current = false;
                const canvas = ref.current;
                if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
                commit();
            }}
            onPointerCancel={() => { drawing.current = false; commit(); }}
        />
    );
};

const SignedSheet: React.FC<{ player: Player; project: CommissionProject; onSlate: () => void; onLab: () => void }> = ({ player, project, onSlate, onLab }) => {
    const house = player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE');
    const advance = project.ledger.find(row => row.kind === 'TRANCHE')?.amount || 0;
    const target = house?.balance || 0;
    const [shown, setShown] = useState(Math.max(0, target - advance));
    const [shake, setShake] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setShake(true), 200);
        const from = Math.max(0, target - advance);
        const began = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - began) / 900);
            setShown(Math.round(from + (target - from) * t));
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
    }, [advance, target]);
    const briefLike = {
        format: project.format,
        seasons: project.seasons,
        episodes: project.episodes,
        runtimeMin: project.runtimeMin,
        platformName: project.platformName,
    } as CommissionBrief;
    return (
        <StudioFrame
            player={player}
            testId="signed-sheet"
            kicker={`Commission · ${project.platformName}`}
            title="Signed"
            phase={3}
            onClose={onSlate}
        >
            <div className="grid g-side">
                <div style={{ position: 'relative' }}>
                    <div className={`contract ${shake ? 'shaking' : ''}`} data-testid="signed-paper">
                        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.32em', color: '#6B5E44', textAlign: 'center' }}>FILED · WEEK {player.currentWeek}</div>
                        <h2 style={{ marginTop: 10 }}>Production &amp; Licence Agreement</h2>
                        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#4A3F2B', marginTop: 8, fontSize: 16 }}>
                            <b style={{ fontStyle: 'normal' }}>{project.title}</b> · {project.platformName} and {house?.name || 'the house'}
                        </p>
                        <div style={{ marginTop: 18, borderTop: '1px solid #221D1322', paddingTop: 6 }}>
                            <div className="cl"><b>§1</b><div><span className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: '#6B5E44' }}>PROGRAMME</span><br />{shapeOf(briefLike)}. The advance is in the treasury.</div></div>
                            <div className="cl"><b>§2</b><div><span className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: '#6B5E44' }}>ADVANCE</span><br />{usd(advance)} received. {project.terms.payModel === 'COST_PLUS' ? `Reserve ${usd(project.reserve)} is not income.` : 'The licence is the income.'}</div></div>
                        </div>
                        <div className="bigstamp" data-testid="signed-stamp" style={{ left: '50%', top: '58%', fontSize: 72, transform: 'translate(-50%, -50%) rotate(-14deg)' }}>SIGNED</div>
                    </div>
                </div>
                <aside className="stack">
                    <div className="card ok">
                        <div className="lab" style={{ color: 'var(--go)' }}>Deal closed · week {player.currentWeek}</div>
                        <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 42, lineHeight: 0.9, marginTop: 6 }}>{project.title} is yours</div>
                        <div className="line" style={{ marginTop: 12 }}><span>Advance received</span><span data-testid="treasury-tick" style={{ color: 'var(--go)' }}>+{usd(shown)}</span></div>
                        <div className="line"><span>Budget reserved</span><span>{project.terms.payModel === 'COST_PLUS' ? `${usd(project.reserve)} not income` : 'Licence is the income'}</span></div>
                        <div className="line" style={{ border: 0 }}><span>Next payment</span><span>Principal photography</span></div>
                        <div className="stack" style={{ marginTop: 12 }}>
                            <div className="row small"><span className="pill s-ok">Slate</span>Added to {house?.name || 'the house'}</div>
                            <div className="row small"><span className="pill s-run">Dev Lab</span>Writers&rsquo; room is open</div>
                        </div>
                        <div className="row" style={{ marginTop: 16 }}>
                            <button data-testid="signed-slate" type="button" className="btn pri" style={{ flex: 1 }} onClick={onSlate}>Go to slate →</button>
                            <button data-testid="signed-lab" type="button" className="btn gho" onClick={onLab}>Open Dev Lab</button>
                        </div>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const LostSheet: React.FC<{ player: Player; brief: CommissionBrief; onClose: () => void; onDismiss: () => void }> = ({ player, brief, onClose, onDismiss }) => {
    const why = brief.why;
    const winner = brief.seats.find(seat => seat.name === brief.winnerName);
    return (
        <StudioFrame
            player={player}
            testId="lost-sheet"
            kicker={`Commission · ${brief.platformName}`}
            title="Deal lost"
            phase={0}
            showPhases={false}
            onClose={onClose}
            footer={(
                <FlowFoot label="Brief" value={`${brief.title} · ${brief.platformName}`} closeLabel="Closed" closeValue={`Week ${player.currentWeek}`}>
                    <button type="button" className="btn gho" onClick={onClose}>Back to commissions</button>
                    <button data-testid="lost-dismiss" type="button" className="btn pri" onClick={onDismiss}>Dismiss</button>
                </FlowFoot>
            )}
        >
            <div className="grid g-side">
                <div className="stack">
                    <div className="card bad" style={{ background: 'linear-gradient(180deg,#1a0a12,#0C0E16)' }}>
                        <div className="row">
                            <PlatformWord id={brief.platformId} name={brief.platformName} size={30} />
                            <span className="pill" style={{ borderColor: '#FF547066', color: 'var(--bad)' }}>Brief closed</span>
                        </div>
                        <div data-testid="lost-banner" style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 60, lineHeight: 0.9, marginTop: 12 }}>{(brief.winnerName || 'A rival').toUpperCase()} SIGNED FIRST</div>
                        <p className="p" style={{ marginTop: 10 }}><b>{brief.title}</b> ({shapeOf(brief)}, {usd(feeOf(brief.finalTerms || brief.platformReply || brief.baseTerms))}) went to {brief.winnerName || 'another studio'}.</p>
                        <div className="kvs" style={{ marginTop: 14 }}>
                            <div className="kv"><div className="l">Winner</div><div className="v" style={{ color: 'var(--bad)' }}>{brief.winnerName || '—'}</div></div>
                            <div className="kv"><div className="l">Their reputation</div><div className="v">{winner?.reputation ?? '—'}</div></div>
                            <div className="kv"><div className="l">Relationship</div><div className="v">{brief.relationshipHit ? `${brief.relationshipHit}` : 'No hit'}</div></div>
                            <div className="kv"><div className="l">Money lost</div><div className="v">$0</div></div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="lab">What happened</div>
                        <div className="trow"><span className="n">1</span><div><div style={{ fontWeight: 600 }}>{brief.platformName} opened the brief to {brief.seats.length} studios</div><div className="tiny mono">Week {brief.openedWeek}</div></div><span /></div>
                        {brief.counterRounds > 0 && (
                            <div className="trow"><span className="n">2</span><div><div style={{ fontWeight: 600 }}>You countered {brief.counterRounds} time{brief.counterRounds === 1 ? '' : 's'}</div><div className="tiny mono">The brief stayed open</div></div><span /></div>
                        )}
                        <div className="trow"><span className="n" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{brief.counterRounds > 0 ? 3 : 2}</span><div><div style={{ fontWeight: 600 }}>{brief.winnerName || 'A rival'} signed. Your offer expired</div><div className="tiny mono">Closed for everyone else</div></div><span /></div>
                        {why && (
                            <div className="grid g2" style={{ marginTop: 12 }}>
                                <ScoreColumn title="You" lines={why.you} />
                                <ScoreColumn title={why.winner} lines={why.them} />
                            </div>
                        )}
                    </div>
                </div>
                <aside className="stack">
                    <div className="card flat">
                        <div className="lab">Lesson</div>
                        <p className="small" style={{ marginTop: 6 }}>The first acceptable signature wins. A counter leaves the brief open for every other studio on it.</p>
                    </div>
                    <div className="card">
                        <div className="lab">What you keep</div>
                        <p className="small" style={{ marginTop: 6 }}>Nothing was paid. The show joins {brief.winnerName || 'the winner'}&rsquo;s slate. {brief.relationshipHit ? `Relationship ${brief.relationshipHit}.` : 'No relationship hit.'}</p>
                    </div>
                </aside>
            </div>
        </StudioFrame>
    );
};

const ScoreColumn: React.FC<{ title: string; lines: { reputation: number; price: number; speed: number; relationship: number } }> = ({ title, lines }) => (
    <div>
        <div className="lab">{title}</div>
        {(['reputation', 'price', 'speed', 'relationship'] as const).map(key => (
            <div key={key} className="line"><span style={{ textTransform: 'capitalize' }}>{key}</span><span className="mono">{lines[key]}</span></div>
        ))}
    </div>
);

const PIPE = ['Development', 'Pre-production', 'Shooting', 'Post', 'Delivered'] as const;

const pipeIndex = (project: CommissionProject) => {
    if (project.stage === 'DEVELOPMENT') return 0;
    if (project.stage === 'PRE_PRODUCTION') return 1;
    if (project.stage === 'SHOOTING') return 2;
    if (project.stage === 'POST') return 3;
    if (project.stage === 'DELIVERED') return 4;
    return 0;
};

const ProjectSheet: React.FC<{
    player: Player;
    project: CommissionProject;
    onClose: () => void;
    onUpdatePlayer: (player: Player) => void;
    onOpenLab: () => void;
}> = ({ player, project, onClose, onUpdatePlayer, onOpenLab }) => {
    const index = pipeIndex(project);
    const tranche = trancheOf(project.terms, project.seasons);
    const labels = ['Signing advance', 'Principal photography', 'Picture lock', 'Accepted delivery'];
    return (
        <StudioFrame
            player={player}
            testId="project-sheet"
            kicker={`${player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE')?.name || 'Studio'} · production slate`}
            title="Slate"
            phase={4}
            onClose={onClose}
        >
            <div className="grid g-side">
                <div className="stack">
                    <div className="card" style={{ borderColor: '#4F3BFF', boxShadow: '0 0 0 1px #4F3BFF55, 0 20px 60px -20px #4F3BFF66' }}>
                        <div className="between">
                            <div className="row">
                                <PlatformWord id={project.platformId} name={project.platformName} size={22} />
                                <span className="pill s-run">Commission</span>
                            </div>
                            <span className="tiny mono">{project.id.slice(0, 10).toUpperCase()}</span>
                        </div>
                        <div className="offer-title" style={{ fontSize: 64 }}>{project.title}</div>
                        <div className="small">{project.format === 'SERIES' ? `Series · S${project.seasonIndex} · ${project.episodes} × ${project.runtimeMin} min` : `Film · ${project.runtimeMin} min`}{project.rightsTitle ? ` · ${project.rightsTitle}` : ''}</div>
                        <div className="pipe" style={{ marginTop: 16 }}>
                            {PIPE.map((step, stepIndex) => <i key={step} className={stepIndex < index ? 'on' : stepIndex === index ? 'cur' : ''} />)}
                        </div>
                        <div className="between tiny mono" style={{ marginTop: 6 }}>
                            {PIPE.map((step, stepIndex) => <span key={step} style={{ color: stepIndex === index ? '#fff' : undefined }}>{step}</span>)}
                        </div>
                        <div className="kvs" style={{ marginTop: 14 }}>
                            <div className="kv"><div className="l">Stage</div><div className="v" style={{ fontSize: 16 }}>{stageLabel(project)}</div></div>
                            <div className="kv"><div className="l">Season</div><div className="v">{project.seasonIndex} / {project.seasons}</div></div>
                            <div className="kv"><div className="l">Spent</div><div className="v">{usd(project.spent)}</div></div>
                            <div className="kv"><div className="l">Paid</div><div className="v">{project.tranchesPaid}/4</div></div>
                        </div>
                        <div className="lab" style={{ marginTop: 16 }}>Payment milestones</div>
                        {labels.map((label, beat) => (
                            <div key={label} className={`trow ${beat < project.tranchesPaid ? 'paid' : beat === project.tranchesPaid ? 'next' : ''}`}>
                                <span className="n">{beat < project.tranchesPaid ? '✓' : beat + 1}</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{label}</div>
                                    <div className="tiny">{beat < project.tranchesPaid ? 'Paid' : 'Still open'}</div>
                                </div>
                                <div className="mono" style={{ fontWeight: 700, color: beat < project.tranchesPaid ? 'var(--go)' : '#fff' }}>{beat < project.tranchesPaid ? '+' : ''}{usd(tranche)}</div>
                            </div>
                        ))}
                        <p className="small" style={{ marginTop: 12, color: project.weeksLate >= 8 ? 'var(--bad)' : project.weeksLate > 0 ? 'var(--warn)' : 'var(--mute)' }} data-testid="deliver-warning">
                            Failure to deliver: {project.weeksLate} week{project.weeksLate === 1 ? '' : 's'} late. Late costs 2% of the open tranche a week. At 8 weeks {project.platformName} can take the show, keep your paid tranches, and cancel the bonus.
                        </p>
                        {project.rightsTitle && <p className="tiny" style={{ marginTop: 8 }}>Rights Library · {project.rightsTitle}{project.audienceSplit ? ' · versions will split the audience' : ''} · fidelity {project.fidelity ?? '—'}</p>}
                        <div className="row" style={{ marginTop: 14 }}>
                            <button type="button" className="btn pri" onClick={onOpenLab}>Open in Dev Lab →</button>
                            {project.stage !== 'DELIVERED' && project.stage !== 'TAKEN_OVER' && (
                                <button data-testid="abandon-project" type="button" className="btn gho" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => { const result = abandonProject(player, project.id); if (!result.error) { onUpdatePlayer(result.player); onClose(); } }}>Abandon</button>
                            )}
                        </div>
                    </div>
                </div>
                <aside className="stack">
                    <div className="card">
                        <div className="between"><div className="lab">Ledger</div><span className="tiny mono">USD</span></div>
                        {project.ledger.length === 0 && <p className="tiny" style={{ marginTop: 8 }}>No ledger lines yet.</p>}
                        {project.ledger.slice(0, 8).map(row => (
                            <div key={row.id} className="between small" style={{ padding: '9px 0', borderBottom: '1px solid #ffffff0d' }}>
                                <span>{row.label}</span>
                                <b className="mono" style={{ color: row.amount < 0 ? 'var(--bad)' : row.amount > 0 ? 'var(--go)' : 'var(--mute)' }}>{row.amount ? usd(row.amount) : row.kind}</b>
                            </div>
                        ))}
                        <div className="line" style={{ border: 0, marginTop: 6 }}><span>Received</span><span>{usd(project.received)}</span></div>
                    </div>
                    <div className="card bad" style={{ background: '#14090d' }}>
                        <div className="lab" style={{ color: 'var(--bad)' }}>If you can&rsquo;t deliver</div>
                        <p className="small" style={{ marginTop: 6, color: '#E4E6F0' }}>−2% of the open tranche each week late. From 8 weeks late, {project.platformName} can take the show. Walking away repays every unspent tranche.</p>
                    </div>
                    {project.feedLine && <div className="card flat"><div className="lab">Feed</div><p className="small" style={{ marginTop: 6 }}>{project.feedLine}</p></div>}
                </aside>
            </div>
        </StudioFrame>
    );
};

export const OffersPage: React.FC<{
    player: Player;
    onBack: () => void;
    onOpen: (brief: CommissionBrief) => void;
    onOpenProject: (project: CommissionProject) => void;
}> = ({ player, onBack, onOpen, onOpenProject }) => {
    const desk = deskOf(player);
    const incoming = desk.briefs.filter(brief => brief.direction === 'IN' && brief.status !== 'SIGNED');
    return (
        <div className="empire inline" data-testid="offers-inbox" style={{ minHeight: '100%', paddingBottom: 24 }}>
            <div className="between" style={{ padding: '18px 16px 0' }}>
                <div>
                    <div className="kick">Production house</div>
                    <div className="h2">Offers</div>
                </div>
                <button type="button" className="btn gho" onClick={onBack}>Back</button>
            </div>
            <div className="body stack">
                {incoming.length === 0 && <p className="p">No open briefs. Platforms check the house every week.</p>}
                {incoming.map(brief => (
                    <button key={brief.id} type="button" onClick={() => onOpen(brief)} className="card" style={{ textAlign: 'left', width: '100%', color: 'inherit' }}>
                        <div className="row">
                            <PlatformWord id={brief.platformId} name={brief.platformName} size={22} />
                            <span className={`pill ${brief.status === 'LOST' ? '' : 's-run'}`} style={brief.status === 'LOST' ? { color: 'var(--bad)', borderColor: '#FF547066' } : undefined}>{brief.status}</span>
                        </div>
                        <div className="h2" style={{ marginTop: 8 }}>{brief.title}</div>
                        <div className="tiny" style={{ marginTop: 6 }}>{chip(brief)} · {usd(feeOf(brief.baseTerms))} · {weeksLeft(player, brief)}w</div>
                    </button>
                ))}
                <h2 className="h2">On the slate</h2>
                {desk.projects.filter(project => project.houseId === 'PLAYER').map(project => (
                    <button key={project.id} type="button" onClick={() => onOpenProject(project)} className="card" style={{ textAlign: 'left', width: '100%', color: 'inherit' }}>
                        <div className="h3">{project.title}</div>
                        <div className="tiny" style={{ color: 'var(--volt)', marginTop: 4 }}>{stageLabel(project)}</div>
                    </button>
                ))}
                <IndustryFeed player={player} />
            </div>
        </div>
    );
};

const feedColor = (kind: string) => {
    if (kind === 'LOST') return 'var(--bad)';
    if (kind === 'EMPIRE') return 'var(--volt)';
    if (kind === 'WON') return 'var(--go)';
    return 'var(--mute)';
};

export const IndustryFeed: React.FC<{ player: Player }> = ({ player }) => {
    const [filter, setFilter] = useState<'ALL' | 'YOURS' | 'RIVALS' | 'BRIEFS'>('ALL');
    const feed = deskOf(player).feed;
    const rows = feed.filter(row => {
        if (filter === 'YOURS') return row.kind === 'WON' || row.kind === 'EMPIRE';
        if (filter === 'RIVALS') return row.kind === 'RIVAL' || row.kind === 'LOST';
        if (filter === 'BRIEFS') return row.kind === 'BRIEF' || row.kind === 'EMPIRE';
        return true;
    });
    return (
        <section data-testid="industry-feed" className="card">
            <h3 className="h3">Industry deals</h3>
            <div className="chips" style={{ marginTop: 12 }}>
                {(['ALL', 'YOURS', 'RIVALS', 'BRIEFS'] as const).map(id => (
                    <button key={id} type="button" data-testid={`feed-${id.toLowerCase()}`} onClick={() => setFilter(id)} className={`chip ${filter === id ? 'on' : ''}`}>{id === 'ALL' ? 'All' : id === 'YOURS' ? 'Yours' : id === 'RIVALS' ? 'Rivals' : 'Briefs'}</button>
                ))}
            </div>
            <ul className="stack" style={{ marginTop: 12, listStyle: 'none', padding: 0 }}>
                {rows.length === 0 && <li className="tiny">No deals in this filter yet.</li>}
                {rows.slice(0, 12).map(row => (
                    <li key={row.id} className="small mono" style={{ color: feedColor(row.kind) }}>
                        {row.headline} · {usd(row.fee)} · {row.bidders} bid
                    </li>
                ))}
            </ul>
        </section>
    );
};

export const ContentDeskCommissions: React.FC<{
    player: Player;
    onApply: (result: { player: Player; error?: string }) => void;
}> = ({ player, onApply }) => {
    const live = player.ownPlatform?.stage === 'LIVE';
    const [houseId, setHouseId] = useState(aiHouses()[0].id);
    const [format, setFormat] = useState<'FILM' | 'SERIES'>('SERIES');
    const [seasons, setSeasons] = useState(2);
    const [episodes, setEpisodes] = useState(10);
    const [runtime, setRuntime] = useState(48);
    const [rightsId, setRightsId] = useState('');
    const [ready, setReady] = useState(false);
    useEffect(() => { loadCatalogue().then(() => setReady(true)); }, []);
    const rightsChoices = useMemo(() => {
        if (!ready) return [];
        const famous = allRecords(player).filter(ip => ip.publicDomain).sort((a, b) => b.fame - a.fame).slice(0, 6);
        const house = player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE');
        const owned = house ? allRecords(player).filter(ip => rightsOf(house).holdings.some(row => row.ipId === ip.id && row.owner === 'PLAYER' && (row.status === 'OWNED' || row.status === 'OPTION'))) : [];
        const seen = new Set<string>();
        return [...owned, ...famous].filter(ip => (seen.has(ip.id) ? false : (seen.add(ip.id), true)));
    }, [player, ready]);
    const picked = rightsChoices.find(ip => ip.id === rightsId);
    const outgoing = deskOf(player).briefs.filter(brief => brief.direction === 'OUT');
    return (
        <div className="empire inline stack" data-testid="empire-briefs">
            <IndustryFeed player={player} />
            <section className="card">
                <h3 className="h3" style={{ color: 'var(--volt)' }}>Your briefs out</h3>
                <p className="p" style={{ marginTop: 6 }}>Empire+ uses this desk. A rival studio gets the same offer, can answer, and can sign.</p>
                {!live && <p className="small" style={{ marginTop: 8, color: 'var(--warn)' }}>Empire+ has to be live before it can send a brief.</p>}
                <div className="grid g2" style={{ marginTop: 12 }}>
                    <label><span className="flab">Studio</span>
                        <select data-testid="empire-house" value={houseId} onChange={event => setHouseId(event.target.value)} className="input">
                            {aiHouses().map(house => <option key={house.id} value={house.id}>{house.name}</option>)}
                        </select>
                    </label>
                    <label><span className="flab">Shape</span>
                        <select value={format} onChange={event => setFormat(event.target.value as 'FILM' | 'SERIES')} className="input">
                            <option value="SERIES">Series</option>
                            <option value="FILM">Film</option>
                        </select>
                    </label>
                    {format === 'SERIES' && (
                        <>
                            <label><span className="flab">Seasons</span>
                                <input data-testid="empire-seasons" type="number" min={1} max={6} value={seasons} onChange={event => setSeasons(Number(event.target.value))} className="input" />
                            </label>
                            <label><span className="flab">Episodes</span>
                                <input data-testid="empire-episodes" type="number" min={6} max={30} value={episodes} onChange={event => setEpisodes(Number(event.target.value))} className="input" />
                            </label>
                        </>
                    )}
                    <label><span className="flab">Runtime (min)</span>
                        <input type="number" min={20} max={90} value={runtime} onChange={event => setRuntime(Number(event.target.value))} className="input" />
                    </label>
                    <label><span className="flab">Rights</span>
                        <select data-testid="empire-rights" value={rightsId} onChange={event => setRightsId(event.target.value)} className="input">
                            <option value="">Original</option>
                            {rightsChoices.map(ip => <option key={ip.id} value={ip.id}>{displayTitle(ip)}{ip.publicDomain ? ' · public domain' : ''}</option>)}
                        </select>
                    </label>
                </div>
                <button
                    data-testid="empire-send"
                    type="button"
                    disabled={!live}
                    onClick={() => onApply(sendEmpireBrief(player, {
                        houseId,
                        format,
                        seasons,
                        episodes,
                        runtimeMin: runtime,
                        rightsIpId: picked?.id,
                        rightsTitle: picked ? displayTitle(picked) : undefined,
                        publicDomain: picked?.publicDomain,
                        genre: picked ? ((picked.gameGenres?.[0] || 'DRAMA') as CommissionBrief['genre']) : 'DRAMA',
                    }))}
                    className={`btn pri full ${live ? '' : 'dis'}`}
                    style={{ marginTop: 14 }}
                >Send the brief</button>
                <ul className="stack" style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
                    {outgoing.length === 0 && <li className="tiny">Nothing sent yet.</li>}
                    {outgoing.map(brief => (
                        <li key={brief.id} className="card flat" data-testid="empire-out-row">
                            <div style={{ fontWeight: 700 }}>{brief.title} → {brief.targetHouseName}</div>
                            <div className="tiny" style={{ color: brief.status === 'SIGNED' ? 'var(--go)' : 'var(--volt)', marginTop: 4 }}>
                                {brief.status === 'OPEN' ? 'Sent' : brief.status === 'REPLIED' ? 'Replied' : brief.status} · closes in {weeksLeft(player, brief)}w · {usd(feeOf(brief.finalTerms || brief.platformReply || brief.baseTerms))}
                            </div>
                            {brief.rivalAlert && <p className="tiny" style={{ color: 'var(--warn)', marginTop: 6 }}>{brief.rivalAlert}</p>}
                            {brief.status === 'REPLIED' && (
                                <div className="row" style={{ marginTop: 10 }}>
                                    <button data-testid="empire-accept" type="button" onClick={() => onApply(acceptEmpireReply(player, brief.id))} className="btn pri sm">Meet them and sign</button>
                                    <button type="button" onClick={() => onApply(walkEmpireBrief(player, brief.id))} className="btn gho sm">Walk</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export const WritersRoom: React.FC<{ player: Player; onUpdatePlayer: (player: Player) => void }> = ({ player, onUpdatePlayer }) => {
    const projects = deskOf(player).projects.filter(project => project.houseId === 'PLAYER' && project.scriptId && project.stage !== 'DELIVERED' && project.stage !== 'ABANDONED');
    if (!projects.length) return null;
    return (
        <div className="empire inline stack" data-testid="writers-room" style={{ marginBottom: 16 }}>
            {projects.map(project => (
                <article key={project.id} className="card">
                    <div className="lab" style={{ color: 'var(--warn)' }}>Writers&rsquo; room · {project.platformName}</div>
                    <h3 className="h3" style={{ marginTop: 6 }}>{project.title}</h3>
                    <p className="tiny" style={{ marginTop: 4 }}>{project.format === 'SERIES' ? `${project.seasons} seasons × ${project.episodes} episodes` : 'Feature'} · {project.rightsTitle || 'Original'}</p>
                    <p className="small" style={{ marginTop: 8 }}>{project.castingLocked ? 'The platform kept lead casting. You cannot recast the lead.' : 'Lead casting is yours.'}</p>
                    {!project.castingLocked && (
                        <input
                            data-testid="writers-lead"
                            defaultValue={project.leadName || ''}
                            placeholder="Lead"
                            onBlur={event => onUpdatePlayer(setLead(player, project.id, event.target.value).player)}
                            className="input"
                            style={{ marginTop: 8 }}
                        />
                    )}
                    {project.rightsIpId && (
                        <label className="small" style={{ display: 'block', marginTop: 12 }}>
                            Fidelity {project.fidelity ?? 35} · low is faithful
                            <input data-testid="writers-fidelity" type="range" min={0} max={100} defaultValue={project.fidelity ?? 35} onChange={event => onUpdatePlayer(setFidelity(player, project.id, Number(event.target.value)).player)} style={{ width: '100%' }} />
                        </label>
                    )}
                </article>
            ))}
        </div>
    );
};

export const openBriefScreen = (brief: CommissionBrief): Screen => {
    if (brief.status === 'LOST') return 'lost';
    if (brief.status === 'CONTRACT') return 'contract';
    if (brief.status === 'REPLIED') return 'reply';
    return 'sheet';
};
