import React, { useMemo, useState } from 'react';
import type { PlatformBrand } from '../../types';
import { BRAND_TYPEFACES, brandAccent, typefaceById } from '../../services/ownPlatform/brand';
import { BrandMark } from '../ownPlatform/BrandMark';
import { formatCompact } from '../../services/ownPlatform/logic';
import {
    BRAND_PROMISES,
    COLOUR_PRESETS,
    draftToBrand,
    emptyDraft,
    promiseById,
    swatchRow,
    type FoundingDraft,
} from '../../services/brand/founding';
import '../ownPlatform/fonts';
import './foundry.css';

const STEPS = [
    { title: 'The Name', sub: 'What the world will type.' },
    { title: 'The Mark', sub: 'One shape, everywhere, forever.' },
    { title: 'The Wordmark', sub: 'How your name and mark travel together.' },
    { title: 'The Type', sub: 'The letters have to survive a billboard.' },
    { title: 'The Colour', sub: 'Everything you own will wear it.' },
    { title: 'The Manifesto', sub: 'What you promise — and what they will demand.' },
    { title: 'Incorporation', sub: 'Sign, pay, exist.' },
];

const MARKS: { label: string; ids: string[] }[] = [
    { label: 'Letterforms · from the first letter', ids: ['letter', 'slash', 'frame'] },
    { label: 'Geometric', ids: ['bolt', 'orbit', 'play', 'bars'] },
    { label: 'Emblem', ids: ['aperture', 'globe', 'crown'] },
    { label: 'Abstract', ids: ['wave', 'diamond', 'star'] },
];

const pad = (value: number) => String(value).padStart(2, '0');

export const BrandFoundry: React.FC<{
    founder: string;
    cash: number;
    fee: number;
    kind?: 'stream' | 'house' | 'venture';
    initialName?: string;
    initialStep?: number;
    hold?: boolean;
    onCancel: () => void;
    onFile: (draft: FoundingDraft, brand: PlatformBrand) => string | void;
}> = ({ founder, cash, fee, kind = 'venture', initialName = '', initialStep = 0, hold = false, onCancel, onFile }) => {
    const [step, setStep] = useState(Math.max(0, Math.min(6, initialStep)));
    const [draft, setDraft] = useState<FoundingDraft>(emptyDraft(initialName));
    const [editing, setEditing] = useState(true);
    const [error, setError] = useState('');
    const brand = useMemo(() => draftToBrand(draft), [draft]);
    const accent = brandAccent(brand);
    const face = typefaceById(draft.typefaceId);
    const promise = promiseById(draft.promiseId);
    const swatches = swatchRow(brand);
    const letter = (draft.name.trim() || 'S').slice(0, 1).toUpperCase();
    const shown = (draft.name.trim() || 'SHADOW').toUpperCase();
    const patch = (next: Partial<FoundingDraft>) => setDraft(current => ({ ...current, ...next }));
    const domain = `watch.${(draft.name.trim() || 'shadow').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'shadow'}.com`;

    const fileMark = (file?: File) => {
        if (!file) return;
        if (file.size > 60_000) {
            setError('That file is too heavy for the books. Keep it under 60KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const value = typeof reader.result === 'string' ? reader.result : '';
            if (!value.startsWith('data:image/')) return;
            patch({ customMark: value, markId: 'letter' });
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const next = () => {
        if (step === 0 && !draft.name.trim()) {
            setError('The company needs a name.');
            return;
        }
        if (step < 6) {
            setError('');
            if (!hold) setStep(step + 1);
            return;
        }
        if (cash < fee) {
            setError(`Personal cash is short ${formatCompact(fee - cash)}.`);
            return;
        }
        const result = onFile(draft, brand);
        if (result) setError(result);
    };

    return (
        <div className="foundry" data-screen="brand-foundry" data-step={step + 1}>
            <header className="fy-top">
                <button type="button" className="fy-back" aria-label="Back" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>←</button>
                <div>
                    <h1>{STEPS[step].title}</h1>
                    <p>{STEPS[step].sub}</p>
                </div>
                <div className="fy-count">{pad(step + 1)} / 07</div>
            </header>
            <div className="fy-slider" aria-hidden="true"><i style={{ width: `${((step + 1) / 7) * 100}%` }} /></div>
            <div className="fy-scroll">
                <aside className="fy-board" data-screen="brand-preview">
                    <div className="fy-kicker">PLATFORM IDENTITY · LIVE PREVIEW</div>
                    <div className="fy-tiles">
                        <div className="fy-tile fy-word" style={{ fontFamily: face.css, color: accent }}>
                            {draft.customMark ? <img src={draft.customMark} alt="" width={28} height={28} /> : <BrandMark id={draft.markId} color={accent} size={26} letter={letter} />}
                            <div><b>{shown}™</b><small>ORIGINALS · FILMS · SERIES</small></div>
                        </div>
                        <div className="fy-tile"><div className="fy-icon" style={{ background: accent }}>{draft.customMark ? <img src={draft.customMark} alt="" width={24} height={24} /> : <BrandMark id={draft.markId} color="#fff" size={22} letter={letter} />}<i className="fy-badge">3</i></div></div>
                        <div className="fy-tile"><div className="fy-icon" style={{ background: '#1c2438', color: accent }}><BrandMark id={draft.markId} color={accent} size={20} letter={letter} /></div><small>Avatar</small></div>
                        <div className="fy-tile" style={{ color: accent }}><div className="fy-seal"><b>{shown}</b><span>STREAM ANYWHERE</span></div></div>
                        <div className="fy-tile"><small>Watch — {shown}</small><b style={{ fontSize: 11 }}>https://{domain}/</b></div>
                        <div className="fy-tile"><small>Dock</small><div className="fy-icon" style={{ background: accent, width: 32, height: 32 }}><BrandMark id={draft.markId} color="#fff" size={16} letter={letter} /></div></div>
                        <div className="fy-tile" style={{ gridColumn: '1 / -1' }}><b>ONE SUBSCRIPTION THE WHOLE HOUSE AGREES ON</b><small>THE {shown} PROMISE</small></div>
                        <div className="fy-tile"><small>Player</small><b>DEAD SIGNAL 12:04</b><small>/ 47:22</small></div>
                        <div className="fy-tile" style={{ gridColumn: 'span 2' }}><small>SUNDAY · PREMIERE NIGHT 17:44</small><b style={{ color: accent }}>{shown} · now streaming</b></div>
                    </div>
                    <div className="fy-swatches">{swatches.map(hex => <i key={hex} style={{ background: hex }} title={hex} />)}<span style={{ fontSize: 10, color: '#445' }}>{swatches.join(' ')}</span></div>
                </aside>
                <div>
                    {step === 0 && (
                        <label>
                            <div className="fy-section">THE NAME</div>
                            <input value={draft.name} maxLength={24} onChange={event => patch({ name: event.target.value.slice(0, 24) })} aria-label="Company name" style={{ width: '100%', background: '#10182c', border: '1px solid #243056', borderRadius: 14, padding: 14, fontSize: 28, fontFamily: face.css }} />
                        </label>
                    )}
                    {step === 1 && (
                        <>
                            {MARKS.map(group => (
                                <div key={group.label}>
                                    <div className="fy-section">{group.label.toUpperCase()}</div>
                                    <div className="fy-grid">
                                        {group.ids.map(id => (
                                            <button key={id} type="button" className={!draft.customMark && draft.markId === id ? 'on' : ''} onClick={() => patch({ markId: id, customMark: undefined })}>
                                                <BrandMark id={id} color={accent} size={28} letter={letter} />
                                                <span>{id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="fy-section">YOUR OWN</div>
                            <label className="fy-note">
                                <input type="file" accept="image/webp,image/png,image/jpeg" hidden onChange={event => fileMark(event.target.files?.[0])} />
                                <span style={{ display: 'inline-block', border: '1px solid #243056', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}>
                                    {draft.customMark ? 'Custom mark loaded · tap to replace' : 'Upload a mark'}
                                </span>
                            </label>
                            {draft.customMark && <p className="fy-note">WebP optimized · safe area protected</p>}
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <div className="fy-section">MARK + NAME LOCKUP</div>
                            <div className="fy-lock">
                                {([
                                    ['word', 'Wordmark'],
                                    ['beside', 'Horizontal'],
                                    ['stacked', 'Stacked'],
                                ] as const).map(([id, label]) => (
                                    <button key={id} type="button" className={draft.lockupId === id ? 'on' : ''} onClick={() => patch({ lockupId: id })}>
                                        <b>{label}</b>
                                        <div style={{ display: 'flex', flexDirection: id === 'stacked' ? 'column' : 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6, fontFamily: face.css }}>
                                            {id !== 'word' && <BrandMark id={draft.markId} color={accent} size={22} letter={letter} />}
                                            <span>{shown}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="fy-note">This is the official lockup filed with your company identity. It is the one the boards, the app, and the certificate use.</p>
                        </>
                    )}
                    {step === 3 && (
                        <div className="fy-grid">
                            {BRAND_TYPEFACES.map(row => (
                                <button key={row.id} type="button" className={draft.typefaceId === row.id ? 'on' : ''} onClick={() => patch({ typefaceId: row.id })}>
                                    <b style={{ fontFamily: row.css, fontSize: 20 }}>{shown.slice(0, 8)}</b>
                                    <span>{row.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {step === 4 && (
                        <>
                            <div className="fy-colour" style={{ background: accent }}>hsl({Math.round(draft.hue)} {Math.round(12 + draft.intensity * 0.83)}% 58%)</div>
                            <div className="fy-section">HUE</div>
                            <input type="range" min={0} max={360} value={draft.hue} aria-label="Hue" onChange={event => patch({ hue: Number(event.target.value) })} />
                            <div className="fy-section">INTENSITY</div>
                            <input type="range" min={0} max={100} value={draft.intensity} aria-label="Intensity" onChange={event => patch({ intensity: Number(event.target.value) })} />
                            <div className="fy-section">PRESETS</div>
                            <div className="fy-presets">
                                {COLOUR_PRESETS.map(row => (
                                    <button key={row.name} type="button" aria-label={row.name} className={draft.hue === row.hue ? 'on' : ''} style={{ background: `hsl(${row.hue} ${12 + row.intensity * 0.83}% 58%)` }} onClick={() => patch({ hue: row.hue, intensity: row.intensity })} />
                                ))}
                            </div>
                        </>
                    )}
                    {step === 5 && (
                        <>
                            <div className="fy-section">PUBLIC MANIFESTO</div>
                            <textarea className="fy-quote" maxLength={160} value={draft.manifesto} readOnly={!editing} aria-label="Manifesto" onChange={event => patch({ manifesto: event.target.value.slice(0, 160) })} />
                            <div className="fy-row">
                                <span>{draft.manifesto.length} / 160</span>
                                <button type="button" onClick={() => setEditing(value => !value)}>{editing ? 'DONE' : 'EDIT'}</button>
                            </div>
                            <p className="fy-note">— {shown}, FOUNDING CHARTER</p>
                            <p className="fy-note">STRATEGY · {promise.strategy} <button type="button" onClick={() => patch({ manifesto: promise.manifesto })}>PRESET WORDING</button></p>
                            <div className="fy-section">THE EXPECTATION CONTRACT</div>
                            <ul>{promise.expects.map(line => <li key={line}>{line}</li>)}</ul>
                            <p className="fy-forgive">Forgives: {promise.forgives}</p>
                            <p className="fy-punish">Punishes: {promise.punishes}</p>
                            <div className="fy-section">CHOOSE YOUR PROMISE</div>
                            <div className="fy-chips">
                                {BRAND_PROMISES.map(row => (
                                    <button key={row.id} type="button" className={draft.promiseId === row.id ? 'on' : ''} onClick={() => patch({ promiseId: row.id, manifesto: row.manifesto })}>{row.name}</button>
                                ))}
                            </div>
                            <p className="fy-note">Your words are public. {promise.strategy} remains the gameplay strategy used for audience, content, churn and press reactions.</p>
                        </>
                    )}
                    {step === 6 && (
                        <article className="fy-paper" data-screen="brand-certificate">
                            <div className="fy-kicker">REGISTRAR OF ENTERTAINMENT COMPANIES</div>
                            <div>FORM EP-01 · EP-{String(founder.length * 17 + shown.length).padStart(6, '0')}</div>
                            <h2>Articles of incorporation</h2>
                            <b>{shown}</b>
                            <p>PRIVATELY HELD {kind === 'stream' ? 'STREAMING COMPANY' : kind === 'house' ? 'PRODUCTION COMPANY' : 'COMPANY'}</p>
                            <p>ONE-TIME INCORPORATION PAYMENT {formatCompact(fee)}</p>
                            <p>PERSONAL WEALTH · {cash >= fee ? 'FUNDS VERIFIED' : 'FUNDS SHORT'}</p>
                            <div className="fy-meta">
                                <div><span>FOUNDER</span><b>{founder || 'Founder'}</b></div>
                                <div><span>OWNERSHIP</span><b>100%</b></div>
                                <div><span>STATUS</span><b>Privately held</b></div>
                                <div><span>WORDMARK</span><b>{draft.lockupId}</b></div>
                                <div><span>TYPEFACE</span><b>{face.name}</b></div>
                                <div><span>BRAND PROMISE</span><b>{promise.name}</b></div>
                            </div>
                            <div className="fy-sign">{founder || 'Founder'}</div>
                            <div className="fy-seal" style={{ color: accent }}><b>{letter}</b><span>CORPORATE SEAL</span></div>
                        </article>
                    )}
                </div>
            </div>
            <div className="fy-go">
                {error && <p className="fy-error">{error}</p>}
                <button type="button" disabled={step === 6 && cash < fee} onClick={next}>
                    {step === 6 ? `SIGN & PAY ${formatCompact(fee)}` : 'Continue →'}
                </button>
            </div>
        </div>
    );
};
