import React, { useState } from 'react';
import { LaunchQuote, formatCompact, formatPeople } from '../../services/ownPlatform/logic';
import { brandVolt, markById } from '../../services/ownPlatform/brand';
import { BrandMark } from './BrandMark';
import { LaunchRegionId } from '../../types';
import { MARKET_COUNTRIES, REGION_CITIES } from '../../services/ownPlatform/catalog';
import './fonts';
import './empire.css';

export const headingFont = '"Barlow Condensed", "Arial Narrow", Impact, sans-serif';

export type EmpirePane = 'launch' | 'build' | 'rights' | 'ops' | 'world';

const DEFINE_STEPS: [string, string][] = [
    ['Name it', ''],
    ['Markets', ''],
    ['Clearance', ''],
    ['Ident', ''],
    ['Storefront', ''],
    ['Catalogue', ''],
    ['Pricing', ''],
    ['Blueprint', 'review'],
];
const BUILD_STEPS = ['Network', 'Cost', 'Rehearsal', 'Commission'];
const PANES: [EmpirePane, string][] = [
    ['launch', 'Launch'],
    ['build', 'Build'],
    ['rights', 'Rights'],
    ['ops', 'Operations'],
    ['world', 'World'],
];

const BoltMark = ({ fill = '#fff' }: { fill?: string }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill={fill} /></svg>
);

interface ShellProps {
    children: React.ReactNode;
    onBack: () => void;
    kicker: string;
    title: string;
    pane: EmpirePane;
    onPane: (pane: EmpirePane) => void;
    name: string;
    stage: string;
    money: number;
    defineStep: number;
    buildStep: number;
    pastDefine: boolean;
    onDefineStep: (step: number) => void;
    onBuildStep: (step: number) => void;
    onWatchIntro?: () => void;
    markId?: string;
    accent?: string;
    frameId?: 'circle' | 'rounded' | 'none';
    typefaceId?: string;
}

export const Shell: React.FC<ShellProps> = ({
    children, onBack, kicker, title, pane, onPane, name, stage, money,
    defineStep, buildStep, pastDefine, onDefineStep, onBuildStep, onWatchIntro, markId, accent, frameId, typefaceId,
}) => {
    const live = stage === 'LIVE';
    const ink = accent || markById(markId).accent;
    const volt = brandVolt(ink);
    const stepNo = pane === 'launch'
        ? (defineStep >= 7 ? 'B' : String(defineStep + 1).padStart(2, '0'))
        : pane === 'build' ? String(buildStep + 1).padStart(2, '0') : '';
    const stepOf = pane === 'launch' && defineStep < 7 ? '07' : pane === 'build' ? '04' : '';
    const defineCursor = pane === 'launch' ? defineStep : (pastDefine ? 8 : defineStep);
    const buildCursor = pane === 'build' ? buildStep : (pastDefine || stage === 'BUILD' || stage === 'CONSTRUCTING' || live ? 4 : -1);
    const railCount = pane === 'build' ? 4 : pane === 'launch' ? 7 : 3;
    const railIndex = pane === 'build' ? buildStep : pane === 'launch' ? Math.min(defineStep, 6) : pane === 'ops' ? 1 : 0;

    return (
        <div className="empire fixed inset-0 z-[180]" data-screen="own-platform" style={{ paddingTop: 'env(safe-area-inset-top)', ['--indigo' as string]: ink, ['--volt' as string]: volt, ['--brand' as string]: ink }}>
            <div className="app">
                <aside className="rail">
                    <div className="brand">
                        <div className="bolt" style={{ background: markById(markId).ink, borderRadius: frameId === 'circle' ? 999 : 10 }}>
                            <BrandMark id={markById(markId).id} color={ink} size={22} letter={name} />
                        </div>
                        <div>
                            <div className="nm" style={typefaceId === 'script' ? { textTransform: 'none', fontStyle: 'italic' } : undefined}>{typefaceId === 'script' ? (name || 'Empire+') : (name || 'EMPIRE+').toUpperCase()}</div>
                            <div className="st" style={{ color: live ? 'var(--go)' : undefined }}>{live ? 'On air' : 'Paper company'}</div>
                        </div>
                    </div>
                    <div>
                        <div className="phase">Define · 7 steps</div>
                        <ul className="steps">
                            {DEFINE_STEPS.map(([label, note], index) => {
                                const done = index < defineCursor;
                                const current = pane === 'launch' && index === defineStep;
                                return (
                                    <li key={label} className={current ? 'cur' : done ? 'done' : ''}>
                                        <button type="button" className="step-link" onClick={() => onDefineStep(index)}>
                                            <span className="d">{done && !current ? '✓' : index === 7 ? 'B' : index + 1}</span>
                                            {label}
                                            {note ? <span className="r">{note}</span> : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="phase">Build · 4 stages</div>
                        <ul className="steps">
                            {BUILD_STEPS.map((label, index) => {
                                const done = index < buildCursor;
                                const current = pane === 'build' && index === buildStep;
                                return (
                                    <li key={label} className={current ? 'cur' : done ? 'done' : ''}>
                                        <button type="button" className="step-link" onClick={() => onBuildStep(index)}>
                                            <span className="d">{done && !current ? '✓' : index + 1}</span>
                                            {label}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="phase">Run</div>
                        <ul className="steps">
                            <li className={pane === 'ops' ? 'cur' : live ? 'done' : ''}>
                                <button type="button" className="step-link" onClick={() => onPane('ops')}>
                                    <span className="d">{live && pane !== 'ops' ? '✓' : '●'}</span>
                                    Operations
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="treas">
                        <div className="l">Company cash</div>
                        <div className="v" data-testid="company-cash" data-amount={money}>{formatCompact(money)}</div>
                        <div className="s">Not your personal cash</div>
                    </div>
                </aside>
                <div className="main">
                    <header className="top">
                        <div>
                            <div className="kick">{kicker}</div>
                            <h1>{title}</h1>
                            {onWatchIntro && pane === 'launch' && defineStep === 0 && (
                                <button type="button" className="btn gho sm" style={{ marginTop: 12 }} onClick={onWatchIntro}>Watch intro</button>
                            )}
                        </div>
                        <div className="topR">
                            <div className="tabs">
                                {PANES.map(([id, label]) => (
                                    <span key={id} className={pane === id ? 'on' : ''} onClick={() => onPane(id)} style={{ cursor: 'pointer' }}>{label}</span>
                                ))}
                            </div>
                            {stepNo ? <div className="stepno">{stepNo}{stepOf ? <span>/{stepOf}</span> : null}</div> : null}
                        </div>
                    </header>
                    <div className="mtop">
                        <div className="bar1">
                            <button type="button" className="back" onClick={onBack} aria-label="Back">←</button>
                            <div className="mid">
                                <div className="kick">{kicker}</div>
                                <div className="t">{title}</div>
                            </div>
                            {stepNo ? <div className="no">{stepNo}{stepOf ? <span>/{stepOf}</span> : null}</div> : <div />}
                        </div>
                        <div className="mrail">
                            {Array.from({ length: railCount }, (_, index) => (
                                <i key={index} className={index < railIndex ? 'done' : index === railIndex ? 'cur' : ''} />
                            ))}
                        </div>
                        <div className="mtabs">
                            {PANES.map(([id, label]) => (
                                <span key={id} className={pane === id ? 'on' : ''} onClick={() => onPane(id)} style={{ cursor: 'pointer' }}>{label}</span>
                            ))}
                        </div>
                    </div>
                    <div className="scroll">{children}</div>
                </div>
            </div>
        </div>
    );
};

export const FooterBar: React.FC<{
    leftLabel: string;
    leftValue: string;
    money: string;
    onBack?: () => void;
    onNext?: () => void;
    nextLabel: string;
    disabled?: boolean;
}> = ({ leftLabel, leftValue, money, onBack, onNext, nextLabel, disabled }) => (
    <footer className="foot">
        <div className="kv"><div className="l">{leftLabel}</div><div className="v">{leftValue}</div></div>
        <div className="sep" />
        <div className="kv"><div className="l">Company cash</div><div className="v">{money}</div></div>
        <div className="sp" />
        {onBack && <button type="button" onClick={onBack} className="btn gho">← Back</button>}
        {onNext && <button type="button" onClick={onNext} disabled={disabled} className={`btn pri ${disabled ? 'dis' : ''}`}>{nextLabel}</button>}
    </footer>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; active?: boolean; onClick?: () => void; tone?: 'ok' | 'warn' | 'bad' | 'flat' | 'paper' }> = ({ children, className = '', active, onClick, tone }) => (
    <div onClick={onClick} className={`card ${active ? 'sel' : ''} ${tone || ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}>
        {children}
    </div>
);

export const Pill: React.FC<{ tone?: 'ok' | 'warn' | 'bad' | 'run' | 'idle'; children: React.ReactNode }> = ({ tone = 'idle', children }) => (
    <span className={`pill s-${tone}`}>{children}</span>
);

export const Toggle: React.FC<{ label: string; on: boolean; onClick: () => void; disabled?: boolean }> = ({ label, on, onClick, disabled }) => (
    <button type="button" disabled={disabled} onClick={onClick} className={`tog ${on ? 'on' : ''}`}><i />{label}</button>
);

export const Segmented: React.FC<{ value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }> = ({ value, options, onChange, disabled }) => (
    <span className="seg">
        {options.map(option => (
            <button type="button" key={option} disabled={disabled} className={value === option ? 'on' : ''} onClick={() => onChange(option)}>{option}</button>
        ))}
    </span>
);

export const Stepper: React.FC<{ value: number; onChange: (next: number) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
    <div className="stepper" style={disabled ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
        <b role="button" onClick={() => onChange(Math.max(0, value - 1))}>−</b>
        <span>{value}</span>
        <b role="button" onClick={() => onChange(value + 1)}>+</b>
    </div>
);

export const MoneyBar: React.FC<{ ratio: number; tone?: 'go' | 'bad' | '' }> = ({ ratio, tone = '' }) => (
    <div className={`bar ${tone}`}><i style={{ width: `${Math.max(6, Math.min(100, ratio * 100))}%` }} /></div>
);

export const PreviewPanel: React.FC<{ name: string; quote: LaunchQuote; hint: string }> = ({ name, quote, hint }) => (
    <aside className="pv stack hideM">
        <div className="lab">Live preview</div>
        <div className="bb">
            <span className="tag">Billboard</span>
            <BoltMark />
            {(name || 'EMPIRE+').toUpperCase()}
            <small>Originals · Films · Series</small>
        </div>
        <div className="card bill">
            <div className="lab">Launch bill · nothing paid yet</div>
            <div className="tot" style={{ marginTop: 8 }}>{formatCompact(quote.dueNow)}</div>
            <div className="tiny" style={{ marginBottom: 6 }}>due at commission</div>
            <div className="line"><span>Weekly burn</span><span>{formatCompact(quote.weeklyBurn)}</span></div>
            <div className="line"><span>Forecast homes</span><span style={{ color: 'var(--go)' }}>{formatPeople(quote.households)}</span></div>
            <div className="line" style={{ border: 0 }}><span>Piracy</span><span>{Math.round(quote.piracyShare * 100)}% of viewing</span></div>
        </div>
        <div className="card flat">
            <div className="lab" style={{ color: 'var(--volt)' }}>This step</div>
            <p className="p" style={{ marginTop: 6 }}>{hint}</p>
        </div>
    </aside>
);

export const BillStrip: React.FC<{ quote: LaunchQuote }> = ({ quote }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" className="mstrip" onClick={() => setOpen(true)}>
                <div className="kv"><div className="l">Due</div><div className="v">{formatCompact(quote.dueNow)}</div></div>
                <div className="kv"><div className="l">Burn</div><div className="v">{formatCompact(quote.weeklyBurn)}/wk</div></div>
                <div className="kv"><div className="l">Homes</div><div className="v">{formatPeople(quote.households)}</div></div>
                <div className="up">▲ Bill</div>
            </button>
            {open && (
                <div className="sheet" onClick={() => setOpen(false)}>
                    <div className="panel card bill" onClick={event => event.stopPropagation()}>
                        <div className="between"><div className="lab">Launch bill</div><button type="button" className="tiny" onClick={() => setOpen(false)}>Close</button></div>
                        <div className="tot">{formatCompact(quote.dueNow)}</div>
                        <div className="line"><span>Weekly burn</span><span>{formatCompact(quote.weeklyBurn)}</span></div>
                        <div className="line"><span>Forecast homes</span><span>{formatPeople(quote.households)}</span></div>
                        <div className="line" style={{ border: 0 }}><span>Piracy</span><span>{Math.round(quote.piracyShare * 100)}%</span></div>
                    </div>
                </div>
            )}
        </>
    );
};

const dotFill = (on: boolean, ratio: number) => !on ? '#2A2F47' : ratio >= 0.9 ? '#3DFFA0' : ratio >= 0.45 ? '#FFC44D' : '#FF5470';

export const WorldDots: React.FC<{ selected: string[]; served?: Record<string, number> }> = ({ selected, served }) => (
    <svg viewBox="0 0 100 56" className="dotmap w-full h-44 lg:h-64">
        {MARKET_COUNTRIES.map(country => {
            const on = selected.includes(country.id);
            const ratio = served?.[country.regionId] ?? (on ? 0.5 : 0);
            return <rect key={country.id} x={country.x - 1.1} y={country.y * 0.56 - 1.1} width="2.2" height="2.2" rx="0.4" fill={dotFill(on, ratio)} />;
        })}
    </svg>
);

export const NetworkMap: React.FC<{ regions: LaunchRegionId[]; served: Record<string, number> }> = ({ regions, served }) => (
    <svg viewBox="0 0 100 56" className="dotmap w-full h-48 lg:h-72">
        {(Object.keys(REGION_CITIES) as LaunchRegionId[]).flatMap(regionId => REGION_CITIES[regionId].map(city => {
            const on = regions.includes(regionId);
            const ratio = served[regionId] ?? 0;
            return <rect key={city.id} x={city.x - 1.2} y={city.y * 0.56 - 1.2} width="2.4" height="2.4" rx="0.3" fill={dotFill(on, ratio)} />;
        }))}
    </svg>
);
