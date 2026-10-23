import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Business, CommissionBrief, CommissionControls, CommissionProject, Player } from '../../../types';
import { displayTitle, loadCatalogue } from '../../../services/rights/catalogue';
import { allRecords, rightsOf } from '../../../services/rights/logic';
import { headingFont } from '../../ownPlatform/ui';
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
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER').length;
    const lost = brief.status === 'LOST';
    return (
        <motion.aside
            data-testid="commission-toast"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="mx-4 mb-4 rounded-3xl border p-4 shadow-2xl"
            style={{ background: ink, borderColor: line, fontFamily: body }}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] font-black tracking-[0.18em]" style={{ color: brief.platformColor, fontFamily: headingFont }}>{brief.platformName.toUpperCase()}</div>
                    <div className="mt-1 text-sm" style={{ color: text }}>{brief.execName}</div>
                    <div className="text-[11px]" style={{ color: mute }}>{brief.execTitle}</div>
                </div>
                <div className="text-right text-[11px]" style={{ color: volt, fontFamily: mono }}>
                    {lost ? 'CLOSED' : `${weeksLeft(player, brief)}w left`}
                </div>
            </div>
            <p className="mt-3 text-sm" style={{ color: text }}>{brief.pitch}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider" style={{ fontFamily: mono, color: mute }}>
                <span className="rounded-full px-2 py-1" style={{ background: '#1A1260', color: '#C9F2FF' }}>{chip(brief)}</span>
                <span className="rounded-full px-2 py-1" style={{ background: '#0C0E16' }}>{usd(feeOf(brief.baseTerms))}</span>
                <span className="rounded-full px-2 py-1" style={{ background: '#0C0E16' }}>{brief.baseTerms.weeks}w</span>
                <span className="rounded-full px-2 py-1" style={{ background: '#0C0E16' }}>{brief.baseTerms.exclusivity ? 'Exclusive' : 'Non-exclusive'}</span>
            </div>
            <div className="mt-3 text-xs font-bold" style={{ color: lost ? bad : warn }}>
                {lost ? `${brief.winnerName} signed this deal` : `Competing studios: ${rivals}`}
            </div>
            <div className="mt-4 flex gap-2">
                <button data-testid="open-offer" onClick={() => onOpen(brief)} className="flex-1 rounded-full py-3 text-xs font-black uppercase tracking-wider text-white" style={{ background: indigo }}>
                    {lost ? 'See the loss' : brief.status === 'CONTRACT' ? 'Sign' : 'Open the offer'}
                </button>
                <button data-testid="offer-later" onClick={() => onLater(brief.id)} className="rounded-full px-4 py-3 text-xs uppercase tracking-wider" style={{ color: mute, border: `1px solid ${line}` }}>Later</button>
            </div>
        </motion.aside>
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

const Shell: React.FC<{ children: React.ReactNode; testId: string; onClose: () => void }> = ({ children, testId, onClose }) => (
    <div className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: 'rgba(5,6,10,0.88)', fontFamily: body }} data-testid={testId}>
        <div className="min-h-full w-full max-w-[1440px] mx-auto p-3 sm:p-6 lg:p-10">
            <button onClick={onClose} className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: mute }}>Close</button>
            {children}
        </div>
    </div>
);

const Gauge: React.FC<{ chance: number }> = ({ chance }) => (
    <div data-testid="win-chance">
        <div className="flex justify-between text-[10px] uppercase tracking-widest" style={{ color: mute, fontFamily: mono }}>
            <span>Win chance</span><span style={{ color: chance < 40 ? bad : volt }}>{chance}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: '#1E2233' }}>
            <div className="h-full" style={{ width: `${chance}%`, background: chance < 40 ? bad : indigo }} />
        </div>
    </div>
);

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
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER');
    const terms = brief.baseTerms;
    return (
        <Shell testId="offer-sheet" onClose={onClose}>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
                <article className="rounded-3xl p-5 sm:p-8" style={{ background: ink, border: `1px solid ${line}` }}>
                    <div className="text-xs tracking-[0.2em] font-black" style={{ color: brief.platformColor, fontFamily: headingFont }}>{brief.platformName.toUpperCase()}</div>
                    <h2 className="mt-2 text-4xl sm:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont, color: text }}>{brief.title}</h2>
                    <p className="mt-3 text-sm" style={{ color: mute }}>{brief.execName} · {brief.execTitle}</p>
                    <p className="mt-4 text-base" style={{ color: text }}>{brief.logline}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]" style={{ fontFamily: mono, color: '#C9F2FF' }}>
                        <span className="rounded-full px-3 py-1" style={{ background: '#1A1260' }}>{brief.format === 'SERIES' ? `${brief.seasons} seasons × ${brief.episodes} episodes × ${brief.runtimeMin} min` : `Feature · ${brief.runtimeMin} min`}</span>
                        <span className="rounded-full px-3 py-1" style={{ background: '#0C0E16', color: mute }}>{brief.genre.replace('_', ' ')}</span>
                    </div>
                    {brief.rightsTitle && (
                        <p className="mt-4 text-sm" style={{ color: volt }}>
                            Rights Library · {brief.platformName} owns {brief.rightsTitle}
                            {brief.publicDomain ? '. Public domain, so another version can exist and the audience splits.' : '. Copyrighted. The option is theirs.'}
                        </p>
                    )}
                    <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                        <Field label="Money" value={terms.payModel === 'COST_PLUS' ? `Cost-plus · budget ${usd(terms.budget)} + premium ${usd(terms.premium)} (${terms.premiumPct}%)` : `Licence fee ${usd(terms.licenceFee)}. You keep savings and pay overruns.`} />
                        <Field label="Tranches" value={`25 / 25 / 25 / 25 · ${usd(trancheOf(terms, brief.seasons))} a beat, per season`} />
                        <Field label="Deadline" value={`${terms.weeks} weeks`} />
                        <Field label="Window" value={`${terms.exclusivity ? 'Exclusive' : 'Non-exclusive'} · ${terms.territories}`} />
                        <Field label="Hit bonus" value={usd(terms.hitBonus)} />
                        <Field label="Season 2 bonus" value={brief.format === 'SERIES' ? usd(terms.season2Bonus) : '—'} />
                    </div>
                    <ul className="mt-4 text-xs space-y-1" style={{ color: mute }}>
                        {controlList(terms.controls).map(row => <li key={row}>{row}</li>)}
                        <li>Late: 2% of the open tranche per week. At 8 weeks they can take the show.</li>
                        <li>Spend past 110% of budget is yours.</li>
                    </ul>
                    <div className="mt-6 flex flex-col sm:flex-row gap-2">
                        <button data-testid="offer-decline" onClick={onDecline} className="rounded-full px-4 py-3 text-xs uppercase tracking-wider" style={{ color: mute, border: `1px solid ${line}` }}>Decline</button>
                        <button data-testid="offer-counter" onClick={onCounter} className="rounded-full px-4 py-3 text-xs uppercase tracking-wider text-white" style={{ background: '#1A1260' }}>Counter</button>
                        <button data-testid="offer-accept" onClick={onAccept} className="flex-1 rounded-full py-3 text-xs font-black uppercase tracking-wider text-white" style={{ background: indigo }}>Accept</button>
                    </div>
                </article>
                <aside className="rounded-3xl p-5 h-fit" style={{ background: '#0C0E16', border: `1px solid ${line}` }}>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: dim, fontFamily: mono }}>Your standing</div>
                    <div className="mt-2 text-sm" style={{ color: text }}>Reputation {desk.reputation}</div>
                    <div className="text-sm" style={{ color: mute }}>Relationship {desk.relationships[brief.platformId] ?? 42}</div>
                    <div className="mt-4"><Gauge chance={chance} /></div>
                    <div className="mt-4 text-[10px] uppercase tracking-widest" style={{ color: warn, fontFamily: mono }}>Competing studios: {rivals.length}</div>
                    <ul className="mt-2 space-y-2 text-sm">
                        {rivals.map(seat => (
                            <li key={seat.id} style={{ color: text }}>{seat.name}<span style={{ color: dim }}> · rep {seat.reputation}</span></li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs" style={{ color: mute }}>Accepting their terms answers now. A counter costs speed and price fit, and a rival can still sign first.</p>
                    <p className="mt-2 text-xs" style={{ color: volt, fontFamily: mono }}>{weeksLeft(player, brief)} weeks until this brief closes</p>
                </aside>
            </div>
        </Shell>
    );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-2xl p-3" style={{ background: '#0C0E16' }}>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: dim, fontFamily: mono }}>{label}</div>
        <div className="mt-1 text-sm" style={{ color: text }}>{value}</div>
    </div>
);

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
    const toggle = (key: keyof CommissionControls) => setControls(current => ({ ...current, [key]: !current[key] }));
    return (
        <Shell testId="counter-sheet" onClose={onClose}>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 pb-24 lg:pb-0">
                <article className="rounded-3xl p-5 sm:p-8" style={{ background: ink, border: `1px solid ${line}` }}>
                    <div className="text-[11px] uppercase tracking-widest" style={{ color: mute }}>Counter · {brief.title}</div>
                    <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont, color: text }}>Ask for more</h2>
                    <label className="block mt-6 text-xs" style={{ color: mute }}>Extra premium {extra}%</label>
                    <input data-testid="counter-premium" type="range" min={0} max={20} value={extra} onChange={event => setExtra(Number(event.target.value))} className="w-full" />
                    <label className="block mt-4 text-xs" style={{ color: mute }}>Extra weeks {weeks}</label>
                    <input data-testid="counter-weeks" type="range" min={0} max={10} value={weeks} onChange={event => setWeeks(Number(event.target.value))} className="w-full" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {(['finalCut', 'casting', 'showrunner', 'marketing'] as const).map(key => (
                            <button key={key} data-testid={`counter-${key}`} onClick={() => toggle(key)} className="rounded-2xl px-3 py-3 text-left text-xs uppercase tracking-wider" style={{ background: controls[key] ? '#1A1260' : '#0C0E16', color: controls[key] ? '#C9F2FF' : mute, border: `1px solid ${line}` }}>
                                {key} {controls[key] ? '· yours' : '· theirs'}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 text-sm" style={{ fontFamily: mono, color: text }}>
                        Their fee was {usd(payableOf(brief.baseTerms))}. You are asking {usd(payableOf(quote.ask))}.
                    </div>
                    <ul className="mt-3 text-xs space-y-1" style={{ color: mute, fontFamily: mono }}>
                        <li>Just for countering · -{quote.breakdown.countering.toFixed(0)}</li>
                        <li>Premium · -{quote.breakdown.premium.toFixed(1)}</li>
                        <li>Weeks · -{quote.breakdown.weeks}</li>
                        <li>Controls · -{quote.breakdown.controls}</li>
                    </ul>
                    <button data-testid="counter-send" onClick={() => onSend(extra, weeks, controls)} className="mt-6 w-full rounded-full py-3 text-xs font-black uppercase tracking-wider text-white" style={{ background: indigo }}>Send the counter</button>
                </article>
                <aside className="hidden lg:block rounded-3xl p-5 h-fit" style={{ background: '#0C0E16', border: `1px solid ${line}` }}>
                    <Gauge chance={quote.chance} />
                    <p className="mt-3 text-xs" style={{ color: mute }}>They rarely give up final cut. Money and time, they will meet about halfway.</p>
                </aside>
            </div>
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3" style={{ background: '#05060A', borderTop: `1px solid ${line}` }}>
                <Gauge chance={quote.chance} />
            </div>
        </Shell>
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
    const reply = brief.platformReply || brief.baseTerms;
    const asked = brief.playerAsk || brief.baseTerms;
    const chance = winChanceFor(brief, deskOf(player));
    const rows: [string, string, string, string][] = [
        ['Fee', usd(payableOf(brief.baseTerms)), usd(payableOf(asked)), usd(payableOf(reply))],
        ['Weeks', String(brief.baseTerms.weeks), String(asked.weeks), String(reply.weeks)],
        ['Final cut', brief.baseTerms.controls.finalCut ? 'House' : 'Platform', asked.controls.finalCut ? 'House' : 'Platform', reply.controls.finalCut ? 'House' : 'Platform'],
        ['Casting', brief.baseTerms.controls.casting ? 'House' : 'Platform', asked.controls.casting ? 'House' : 'Platform', reply.controls.casting ? 'House' : 'Platform'],
    ];
    return (
        <Shell testId="reply-sheet" onClose={onClose}>
            <article className="rounded-3xl p-5 sm:p-8 max-w-3xl" style={{ background: ink, border: `1px solid ${line}` }}>
                <div className="text-[11px] uppercase tracking-widest" style={{ color: volt }}>{brief.execName} · {brief.execTitle}</div>
                <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont, color: text }}>We can meet you partway</h2>
                <p className="mt-2 text-sm" style={{ color: mute }}>Money and time moved about halfway. Final cut almost never leaves the platform.</p>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm" style={{ fontFamily: mono }}>
                        <thead>
                            <tr style={{ color: dim }}><th className="text-left py-2"> </th><th className="text-left">Original</th><th className="text-left">You asked</th><th className="text-left">Platform now</th></tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row[0]} style={{ color: text }}>
                                    <td className="py-2 pr-3" style={{ color: mute }}>{row[0]}</td>
                                    <td>{row[1]}</td><td>{row[2]}</td><td style={{ color: volt }}>{row[3]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {brief.rivalAlert && <p className="mt-4 text-sm font-bold" style={{ color: warn }}>{brief.rivalAlert}</p>}
                <p className="mt-2 text-xs" style={{ color: volt, fontFamily: mono }}>{weeksLeft(player, brief)} weeks left · countering again drops the chance further</p>
                <div className="mt-4 max-w-xs"><Gauge chance={chance} /></div>
                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                    <button onClick={onDecline} className="rounded-full px-4 py-3 text-xs uppercase" style={{ color: mute, border: `1px solid ${line}` }}>Decline</button>
                    <button data-testid="reply-counter" onClick={onCounter} className="rounded-full px-4 py-3 text-xs uppercase text-white" style={{ background: '#1A1260' }}>Counter again</button>
                    <button data-testid="reply-accept" onClick={onAccept} className="flex-1 rounded-full py-3 text-xs font-black uppercase text-white" style={{ background: indigo }}>Take this</button>
                </div>
            </article>
        </Shell>
    );
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
                onSigned('held');
                return;
            }
            frame.current = requestAnimationFrame(step);
        };
        frame.current = requestAnimationFrame(step);
    };
    useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);
    const clauses = [
        `${brief.platformName} engages ${house?.name || 'the production house'} to produce ${brief.title}, a ${brief.format === 'SERIES' ? 'series' : 'feature'}.`,
        brief.rightsTitle
            ? `The picture is based on ${brief.rightsTitle}, which ${brief.platformName} controls.${brief.publicDomain ? ' The work is public domain. Another version may be made, and the audience may split.' : ''}`
            : 'The picture is an original commission.',
        brief.format === 'SERIES'
            ? `Order: ${brief.seasons} season${brief.seasons > 1 ? 's' : ''} × ${brief.episodes} episodes × ${brief.runtimeMin} minutes. Genre ${brief.genre.replace('_', ' ')}.`
            : `Runtime ${brief.runtimeMin} minutes. Genre ${brief.genre.replace('_', ' ')}.`,
        terms.payModel === 'COST_PLUS'
            ? `Cost-plus. Budget ${usd(terms.budget)} is a production reserve and is not income. Producer premium ${usd(terms.premium)} (${terms.premiumPct}%) is income, paid 25/25/25/25 at signature, principal photography, picture lock, and delivery.`
            : `Licence fee ${usd(terms.licenceFee)}, paid 25/25/25/25. The house keeps savings and pays overruns. The budget figure is not a second payment.`,
        `Delivery in ${terms.weeks} weeks. Late work costs 2% of the open tranche per week. At eight weeks the platform may take over. Paid tranches stay. The bonus does not. Relationship −20. Reputation −3.`,
        `${terms.exclusivity ? 'Exclusive' : 'Non-exclusive'} in ${terms.territories}.`,
        `Creative control. ${controlList(terms.controls).join('. ')}.`,
        `Hit bonus ${usd(terms.hitBonus)}.${brief.format === 'SERIES' ? ` Season-2 bonus ${usd(terms.season2Bonus)}, paid when that season opens. Further seasons can return as new briefs.` : ''}`,
        'Spend beyond 110% of budget is paid by the house. Abandonment repays unspent tranches, costs relationship −30, and silences this platform for 52 weeks.',
        `${brief.execName}, ${brief.execTitle}, has signed for ${brief.platformName}.`,
    ];
    return (
        <Shell testId="contract-sheet" onClose={onClose}>
            <article className="mx-auto max-w-3xl rounded-sm px-5 py-8 sm:px-12 sm:py-12" style={{ background: '#F2EADB', color: '#2A2418', fontFamily: paperFont }}>
                <div className="text-center text-xs tracking-[0.25em] uppercase" style={{ fontFamily: mono }}>Production & Licence Agreement</div>
                <h2 className="mt-2 text-center text-4xl sm:text-5xl" style={{ fontFamily: headingFont, fontWeight: 800 }}>{brief.title}</h2>
                <p className="text-center text-sm mt-1">{brief.platformName} and {house?.name || 'the house'}</p>
                <ol className="mt-8 space-y-3 text-[15px] leading-relaxed list-decimal pl-5">
                    {clauses.map(clause => <li key={clause.slice(0, 24)}>{clause}</li>)}
                </ol>
                <div className="mt-8 grid sm:grid-cols-2 gap-6 items-end">
                    <div>
                        <div className="text-2xl" style={{ fontFamily: paperFont }}>{brief.execName}</div>
                        <div className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono }}>Signed for {brief.platformName}</div>
                    </div>
                    <div>
                        <SignaturePad onChange={setDrawn} />
                        <div className="text-[10px] uppercase tracking-widest mt-1" style={{ fontFamily: mono }}>Draw your signature</div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-2" style={{ fontFamily: body }}>
                    <button data-testid="contract-sign" disabled={!drawn} onClick={() => drawn && onSigned(drawn)} className="flex-1 rounded-full py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40" style={{ background: indigo }}>Sign the drawn name</button>
                    <button
                        data-testid="contract-hold"
                        onPointerDown={startHold}
                        onPointerUp={stop}
                        onPointerLeave={stop}
                        className="flex-1 rounded-full py-3 text-xs font-black uppercase tracking-wider relative overflow-hidden"
                        style={{ background: '#2A2418', color: '#F2EADB' }}
                    >
                        <span className="relative z-10">Hold 1.5s to sign · {Math.round(hold * 100)}%</span>
                        <span className="absolute inset-y-0 left-0" style={{ width: `${hold * 100}%`, background: indigo }} />
                    </button>
                </div>
            </article>
        </Shell>
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
            className="w-full h-28 rounded-md bg-white/70 border border-[#2A2418]/20"
            style={{ touchAction: 'none' }}
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
    return (
        <Shell testId="signed-sheet" onClose={onSlate}>
            <style>{`@keyframes paperShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px) rotate(-0.4deg);} 75% { transform: translateX(8px) rotate(0.4deg);} }`}</style>
            <article className="mx-auto max-w-3xl rounded-sm px-6 py-10 relative" style={{ background: '#F2EADB', color: '#2A2418', fontFamily: paperFont, animation: shake ? 'paperShake 0.3s ease-out' : undefined }} data-testid="signed-paper">
                <motion.div
                    data-testid="signed-stamp"
                    initial={{ scale: 1.8, rotate: -18, opacity: 0 }}
                    animate={{ scale: 1, rotate: -8, opacity: 1 }}
                    transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute right-6 top-8 border-4 rounded-md px-3 py-1 text-3xl font-black tracking-widest"
                    style={{ color: '#E5352B', borderColor: '#E5352B', fontFamily: headingFont }}
                >SIGNED</motion.div>
                <div className="text-xs uppercase tracking-[0.2em]" style={{ fontFamily: mono }}>Filed</div>
                <h2 className="text-5xl uppercase" style={{ fontFamily: headingFont }}>{project.title}</h2>
                <p className="mt-4 text-lg">The advance is in the treasury.</p>
                <p className="text-4xl mt-2" style={{ fontFamily: mono }} data-testid="treasury-tick">{usd(shown)}</p>
                <p className="text-sm mt-1">Advance {usd(advance)} · reserve {project.terms.payModel === 'COST_PLUS' ? `${usd(project.reserve)} is not income` : 'licence is the income'}</p>
            </article>
            <div className="mx-auto max-w-3xl mt-4 flex flex-col sm:flex-row gap-2">
                <button data-testid="signed-slate" onClick={onSlate} className="flex-1 rounded-full py-3 text-xs font-black uppercase text-white" style={{ background: indigo }}>Go to slate</button>
                <button data-testid="signed-lab" onClick={onLab} className="flex-1 rounded-full py-3 text-xs font-black uppercase" style={{ background: '#1A1260', color: '#C9F2FF' }}>Open Dev Lab</button>
            </div>
        </Shell>
    );
};

const LostSheet: React.FC<{ player: Player; brief: CommissionBrief; onClose: () => void; onDismiss: () => void }> = ({ player, brief, onClose, onDismiss }) => {
    const why = brief.why;
    return (
        <Shell testId="lost-sheet" onClose={onClose}>
            <article className="max-w-3xl mx-auto rounded-3xl p-6 relative overflow-hidden" style={{ background: '#121524', border: `1px solid ${line}`, opacity: 0.95 }}>
                <div className="absolute right-6 top-6 border-4 rounded-md px-2 py-1 text-xl font-black tracking-widest" style={{ color: '#8A8FA8', borderColor: '#8A8FA8', fontFamily: headingFont, transform: 'rotate(-8deg)' }}>SIGNED ELSEWHERE</div>
                <h2 className="text-4xl font-black uppercase pr-24" style={{ fontFamily: headingFont, color: text }}>{brief.title}</h2>
                <p className="mt-3 text-sm font-bold" style={{ color: bad }} data-testid="lost-banner">{brief.winnerName} signed this deal</p>
                <p className="mt-2 text-xs" style={{ color: mute, fontFamily: mono }}>Opened week {brief.openedWeek} · closed for everyone else</p>
                {why && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: mono }}>
                        <div>
                            <div style={{ color: dim }}>You</div>
                            <Bar label="Reputation" value={why.you.reputation} />
                            <Bar label="Price" value={why.you.price} />
                            <Bar label="Speed" value={why.you.speed} />
                            <Bar label="Relationship" value={why.you.relationship} />
                        </div>
                        <div>
                            <div style={{ color: warn }}>{why.winner}</div>
                            <Bar label="Reputation" value={why.them.reputation} />
                            <Bar label="Price" value={why.them.price} />
                            <Bar label="Speed" value={why.them.speed} />
                            <Bar label="Relationship" value={why.them.relationship} />
                        </div>
                    </div>
                )}
                <p className="mt-4 text-sm" style={{ color: text }}>What changes: {brief.relationshipHit ? `relationship ${brief.relationshipHit}. ` : 'No relationship hit. '}The show joins {brief.winnerName}'s slate.</p>
                <p className="text-sm" style={{ color: mute }}>What you keep: nothing paid.</p>
                <div className="mt-5 flex gap-2">
                    <button data-testid="lost-dismiss" onClick={onDismiss} className="flex-1 rounded-full py-3 text-xs font-black uppercase text-white" style={{ background: indigo }}>Dismiss</button>
                    <button onClick={onClose} className="rounded-full px-4 py-3 text-xs uppercase" style={{ color: mute, border: `1px solid ${line}` }}>See in industry feed</button>
                </div>
            </article>
        </Shell>
    );
};

const Bar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="mt-1">
        <div className="flex justify-between" style={{ color: mute }}><span>{label}</span><span>{value}</span></div>
        <div className="h-1 rounded-full" style={{ background: '#1E2233' }}><div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: volt }} /></div>
    </div>
);

const ProjectSheet: React.FC<{
    player: Player;
    project: CommissionProject;
    onClose: () => void;
    onUpdatePlayer: (player: Player) => void;
    onOpenLab: () => void;
}> = ({ player, project, onClose, onUpdatePlayer, onOpenLab }) => (
    <Shell testId="project-sheet" onClose={onClose}>
        <article className="rounded-3xl p-5 sm:p-8" style={{ background: ink, border: `1px solid ${project.weeksLate > 0 ? bad : line}` }}>
            <div className="text-[11px] font-black tracking-widest" style={{ color: project.platformColor, fontFamily: headingFont }}>{project.platformName.toUpperCase()}</div>
            <h2 className="text-4xl sm:text-6xl font-black uppercase" style={{ fontFamily: headingFont, color: text }}>{project.title}</h2>
            <p className="mt-2 text-sm" style={{ color: volt, fontFamily: mono }}>{stageLabel(project)} · season {project.seasonIndex}/{project.seasons}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase" style={{ fontFamily: mono, color: mute }}>
                {['Development', 'Pre-production', 'Shooting', 'Post', 'Delivered'].map(step => (
                    <span key={step} className="rounded-full px-2 py-1" style={{ background: stageLabel(project).toLowerCase().includes(step.toLowerCase().slice(0, 4)) ? '#1A1260' : '#0C0E16', color: text }}>{step}</span>
                ))}
            </div>
            <p className="mt-4 text-sm" style={{ color: text }}>{project.feedLine}</p>
            {project.rightsTitle && <p className="mt-2 text-sm" style={{ color: mute }}>Rights Library · {project.rightsTitle}{project.audienceSplit ? ' · versions will split the audience' : ''} · fidelity {project.fidelity ?? '—'}</p>}
            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                <Field label="Paid" value={`${project.tranchesPaid}/4 · ${usd(project.received)}`} />
                <Field label="Spent" value={usd(project.spent)} />
                <Field label="Reserve" value={project.terms.payModel === 'COST_PLUS' ? `${usd(project.reserve)} not income` : 'Licence is the income'} />
            </div>
            <p className="mt-4 text-sm" style={{ color: project.weeksLate >= 8 ? bad : project.weeksLate > 0 ? warn : mute }} data-testid="deliver-warning">
                Failure to deliver: {project.weeksLate} week{project.weeksLate === 1 ? '' : 's'} late. Late costs 2% of the open tranche a week. At 8 weeks {project.platformName} can take the show, keep your paid tranches, and cancel the bonus.
            </p>
            <div className="mt-4 space-y-2">
                {project.ledger.slice(0, 8).map(row => (
                    <div key={row.id} className="flex justify-between text-xs" style={{ fontFamily: mono, color: row.amount < 0 ? bad : row.amount > 0 ? go : mute }}>
                        <span>{row.label}</span><span>{row.amount ? usd(row.amount) : row.kind}</span>
                    </div>
                ))}
                {project.ledger.length === 0 && <p className="text-xs" style={{ color: dim }}>No ledger lines yet.</p>}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button onClick={onOpenLab} className="rounded-full px-4 py-3 text-xs font-black uppercase text-white" style={{ background: indigo }}>Writers' room</button>
                {project.stage !== 'DELIVERED' && project.stage !== 'TAKEN_OVER' && (
                    <button data-testid="abandon-project" onClick={() => { const result = abandonProject(player, project.id); if (!result.error) { onUpdatePlayer(result.player); onClose(); } }} className="rounded-full px-4 py-3 text-xs uppercase" style={{ color: bad, border: `1px solid ${bad}` }}>Abandon</button>
                )}
            </div>
        </article>
    </Shell>
);

export const OffersPage: React.FC<{
    player: Player;
    onBack: () => void;
    onOpen: (brief: CommissionBrief) => void;
    onOpenProject: (project: CommissionProject) => void;
}> = ({ player, onBack, onOpen, onOpenProject }) => {
    const desk = deskOf(player);
    const incoming = desk.briefs.filter(brief => brief.direction === 'IN' && brief.status !== 'SIGNED');
    return (
        <div className="min-h-full pb-24" style={{ background: '#07080D', color: text, fontFamily: body }} data-testid="offers-inbox">
            <div className="p-4 flex items-center gap-3">
                <button onClick={onBack} className="text-xs uppercase tracking-widest" style={{ color: mute }}>Back</button>
                <h2 className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>Offers</h2>
            </div>
            <div className="px-4 grid gap-3">
                {incoming.length === 0 && <p className="text-sm" style={{ color: mute }}>No open briefs. Platforms check the house every week.</p>}
                {incoming.map(brief => (
                    <button key={brief.id} onClick={() => onOpen(brief)} className="text-left rounded-3xl p-4" style={{ background: ink, border: `1px solid ${line}` }}>
                        <div className="text-[11px] font-black" style={{ color: brief.status === 'LOST' ? bad : brief.platformColor, fontFamily: headingFont }}>{brief.platformName.toUpperCase()} · {brief.status}</div>
                        <div className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{brief.title}</div>
                        <div className="text-xs mt-1" style={{ color: mute }}>{chip(brief)} · {usd(feeOf(brief.baseTerms))} · {weeksLeft(player, brief)}w</div>
                    </button>
                ))}
            </div>
            <div className="px-4 mt-6">
                <h3 className="text-xl font-black uppercase" style={{ fontFamily: headingFont }}>On the slate</h3>
                <div className="mt-3 grid gap-3">
                    {desk.projects.filter(project => project.houseId === 'PLAYER').map(project => (
                        <button key={project.id} onClick={() => onOpenProject(project)} className="text-left rounded-3xl p-4" style={{ background: ink, border: `1px solid ${line}` }}>
                            <div className="text-lg font-black uppercase" style={{ fontFamily: headingFont }}>{project.title}</div>
                            <div className="text-xs" style={{ color: volt, fontFamily: mono }}>{stageLabel(project)}</div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-4 mt-6">
                <IndustryFeed player={player} />
            </div>
        </div>
    );
};

const feedColor = (kind: string) => {
    if (kind === 'LOST') return bad;
    if (kind === 'EMPIRE' || kind === 'BRIEF') return kind === 'EMPIRE' ? volt : mute;
    if (kind === 'WON') return go;
    return '#8A8FA8';
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
        <section data-testid="industry-feed" className="rounded-3xl p-4" style={{ background: ink, border: `1px solid ${line}` }}>
            <h3 className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>Industry deals</h3>
            <div className="mt-3 flex gap-2 overflow-x-auto">
                {(['ALL', 'YOURS', 'RIVALS', 'BRIEFS'] as const).map(id => (
                    <button key={id} data-testid={`feed-${id.toLowerCase()}`} onClick={() => setFilter(id)} className="rounded-full px-3 py-1 text-[10px] uppercase tracking-wider" style={{ background: filter === id ? indigo : '#0C0E16', color: text }}>{id === 'ALL' ? 'All' : id === 'YOURS' ? 'Yours' : id === 'RIVALS' ? 'Rivals' : 'Briefs'}</button>
                ))}
            </div>
            <ul className="mt-3 space-y-2">
                {rows.length === 0 && <li className="text-sm" style={{ color: dim }}>No deals in this filter yet.</li>}
                {rows.slice(0, 12).map(row => (
                    <li key={row.id} className="text-sm" style={{ color: feedColor(row.kind), fontFamily: mono }}>
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
        <div className="space-y-4" data-testid="empire-briefs">
            <IndustryFeed player={player} />
            <section className="rounded-3xl p-4" style={{ background: '#121524', border: '1px solid #1E2233' }}>
                <h3 className="text-2xl font-black uppercase" style={{ fontFamily: headingFont, color: volt }}>Your briefs out</h3>
                <p className="text-sm mt-1" style={{ color: mute }}>Empire+ uses this desk. A rival studio gets the same offer, can answer, and can sign.</p>
                {!live && <p className="mt-2 text-sm" style={{ color: warn }}>Empire+ has to be live before it can send a brief.</p>}
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                    <label style={{ color: mute }}>Studio
                        <select data-testid="empire-house" value={houseId} onChange={event => setHouseId(event.target.value)} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white">
                            {aiHouses().map(house => <option key={house.id} value={house.id}>{house.name}</option>)}
                        </select>
                    </label>
                    <label style={{ color: mute }}>Shape
                        <select value={format} onChange={event => setFormat(event.target.value as 'FILM' | 'SERIES')} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white">
                            <option value="SERIES">Series</option>
                            <option value="FILM">Film</option>
                        </select>
                    </label>
                    {format === 'SERIES' && (
                        <>
                            <label style={{ color: mute }}>Seasons
                                <input data-testid="empire-seasons" type="number" min={1} max={6} value={seasons} onChange={event => setSeasons(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white" />
                            </label>
                            <label style={{ color: mute }}>Episodes
                                <input data-testid="empire-episodes" type="number" min={6} max={30} value={episodes} onChange={event => setEpisodes(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white" />
                            </label>
                        </>
                    )}
                    <label style={{ color: mute }}>Runtime (min)
                        <input type="number" min={20} max={90} value={runtime} onChange={event => setRuntime(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white" />
                    </label>
                    <label style={{ color: mute }}>Rights
                        <select data-testid="empire-rights" value={rightsId} onChange={event => setRightsId(event.target.value)} className="mt-1 w-full rounded-xl bg-black/40 p-2 text-white">
                            <option value="">Original</option>
                            {rightsChoices.map(ip => <option key={ip.id} value={ip.id}>{displayTitle(ip)}{ip.publicDomain ? ' · public domain' : ''}</option>)}
                        </select>
                    </label>
                </div>
                <button
                    data-testid="empire-send"
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
                    className="mt-3 w-full rounded-full py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"
                    style={{ background: indigo }}
                >Send the brief</button>
                <ul className="mt-4 space-y-2">
                    {outgoing.length === 0 && <li className="text-sm" style={{ color: dim }}>Nothing sent yet.</li>}
                    {outgoing.map(brief => (
                        <li key={brief.id} className="rounded-2xl p-3" style={{ background: '#0C0E16' }} data-testid="empire-out-row">
                            <div className="font-bold">{brief.title} → {brief.targetHouseName}</div>
                            <div className="text-[11px]" style={{ color: brief.status === 'SIGNED' ? go : volt, fontFamily: mono }}>
                                {brief.status === 'OPEN' ? 'Sent' : brief.status === 'REPLIED' ? 'Replied' : brief.status} · closes in {weeksLeft(player, brief)}w · {usd(feeOf(brief.finalTerms || brief.platformReply || brief.baseTerms))}
                            </div>
                            {brief.rivalAlert && <p className="text-xs mt-1" style={{ color: warn }}>{brief.rivalAlert}</p>}
                            {brief.status === 'REPLIED' && (
                                <div className="mt-2 flex gap-2">
                                    <button data-testid="empire-accept" onClick={() => onApply(acceptEmpireReply(player, brief.id))} className="rounded-full px-3 py-2 text-[10px] uppercase text-white" style={{ background: indigo }}>Meet them and sign</button>
                                    <button onClick={() => onApply(walkEmpireBrief(player, brief.id))} className="rounded-full px-3 py-2 text-[10px] uppercase" style={{ color: mute, border: `1px solid ${line}` }}>Walk</button>
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
        <div className="mb-4 space-y-3" data-testid="writers-room">
            {projects.map(project => (
                <article key={project.id} className="rounded-2xl border border-amber-500/30 bg-zinc-950 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Writers' room · {project.platformName}</div>
                    <h3 className="text-xl font-black text-white">{project.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{project.format === 'SERIES' ? `${project.seasons} seasons × ${project.episodes} episodes` : 'Feature'} · {project.rightsTitle || 'Original'}</p>
                    <p className="text-xs text-zinc-300 mt-2">{project.castingLocked ? 'The platform kept lead casting. You cannot recast the lead.' : 'Lead casting is yours.'}</p>
                    {!project.castingLocked && (
                        <input
                            data-testid="writers-lead"
                            defaultValue={project.leadName || ''}
                            placeholder="Lead"
                            onBlur={event => onUpdatePlayer(setLead(player, project.id, event.target.value).player)}
                            className="mt-2 w-full rounded-xl bg-black/40 border border-zinc-700 px-3 py-2 text-sm text-white"
                        />
                    )}
                    {project.rightsIpId && (
                        <label className="block mt-3 text-xs text-zinc-400">
                            Fidelity {project.fidelity ?? 35} · low is faithful
                            <input data-testid="writers-fidelity" type="range" min={0} max={100} defaultValue={project.fidelity ?? 35} onChange={event => onUpdatePlayer(setFidelity(player, project.id, Number(event.target.value)).player)} className="w-full" />
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
