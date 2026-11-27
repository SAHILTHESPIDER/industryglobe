import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, MapPin, Sparkles, UserRound } from 'lucide-react';
import { CartoonFace, FilmIndustryId, Player } from '../types';
import { CartoonAvatar } from './ownPlatform/CartoonFace';
import { IndustryGlobeMark } from '../components/IndustryGlobeMark';
import { allIndustries } from '../services/industryEngine';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import {
    BIRTHPLACES,
    birthplaceById,
    STARTING_PATHS,
    STARTING_TRAITS,
    startingSocials,
} from '../services/characterSocial';
import {
    ACTING_FLAVOUR,
    ACTING_SKILL_KEYS,
    ActingSkillKey,
    allocateLevels,
    costForNextLevel,
    CUSTOM_TALENT_POOL,
    levelOf,
    STARTING_SKILL_POOL,
} from '../services/skillPointLedger';
import {
    CharacterDraft,
    CustomTalentDraft,
    defaultFace,
    sheetFromGrants,
    spendsFromDraft,
} from '../services/playerTalent';
import { pathById, traitById } from '../services/characterSocial';
import { PORTRAIT_HAIR, PORTRAIT_SHIRT, PORTRAIT_SKIN } from '../services/cartoonPortrait';

type StudioMode = 'new' | 'existing' | 'look' | 'talent';

interface Props {
    mode: StudioMode;
    player?: Player;
    onComplete?: (draft: CharacterDraft) => void;
    onTalent?: (draft: CustomTalentDraft) => void;
    onAppearance?: (face: CartoonFace) => void;
    onCancel?: () => void;
    onOpenStore?: () => void;
}

const STEPS_SELF = ['Name', 'Look', 'Path', 'Skills', 'Ready'] as const;
const STEPS_TALENT = ['Actor', 'Look', 'Skills', 'Ready'] as const;
const STEPS_LOOK = ['Look'] as const;

export const CharacterStudio: React.FC<Props> = ({ mode, player, onComplete, onTalent, onAppearance, onCancel, onOpenStore }) => {
    const [kind, setKind] = useState<'self' | 'talent'>(mode === 'talent' ? 'talent' : 'self');
const lookOnly = mode === 'look' && kind === 'self';
    const steps = lookOnly ? STEPS_LOOK : kind === 'talent' ? STEPS_TALENT : STEPS_SELF;
    const [step, setStep] = useState(0);
    const [name, setName] = useState(player?.character?.created ? player.name : '');
    const [age, setAge] = useState(player?.age || 18);
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'NON_BINARY'>(player?.gender === 'FEMALE' || player?.gender === 'NON_BINARY' ? player.gender : 'MALE');
    const [industry, setIndustry] = useState<FilmIndustryId>(player?.homeIndustryId || 'HOLLYWOOD');
    const [birthplace, setBirthplace] = useState(player?.character?.birthplace || 'US');
    const [background, setBackground] = useState(player?.character?.background || 'FILM_SCHOOL');
    const [trait, setTrait] = useState(player?.character?.trait || 'NATURAL');
    const [face, setFace] = useState<CartoonFace>(player?.character?.appearance || defaultFace());
    const [acting, setActing] = useState<Partial<Record<ActingSkillKey, number>>>({});
    const [genres, setGenres] = useState<Partial<Record<string, number>>>({});
    const [fame, setFame] = useState(12);
    const [error, setError] = useState('');

    const pool = kind === 'talent' ? CUSTOM_TALENT_POOL : STARTING_SKILL_POOL;
    const place = birthplaceById(kind === 'talent' ? birthplace : birthplace);
    const preview = useMemo(() => {
        if (kind === 'talent') return allocateLevels(undefined, undefined, spendsFromDraft(acting, genres), pool);
        const path = pathById(background);
        const traitDef = traitById(trait);
        const grants = [path?.grant, traitDef?.grant].filter(Boolean) as { kind: 'acting' | 'genre'; key: string }[];
        return sheetFromGrants(grants as never, spendsFromDraft(acting, genres), pool);
    }, [acting, genres, kind, pool, background, trait]);

    const bump = (group: 'acting' | 'genre', key: string, delta: number) => {
        const source = group === 'acting' ? { ...acting } : { ...genres };
        const next = Math.max(0, Math.floor((source[key] || 0) + delta));
        source[key] = next;
        const trialActing = group === 'acting' ? source : acting;
        const trialGenre = group === 'genre' ? source : genres;
        const trial = kind === 'talent'
            ? allocateLevels(undefined, undefined, spendsFromDraft(trialActing, trialGenre), pool)
            : sheetFromGrants(
                [pathById(background)?.grant, traitById(trait)?.grant].filter(Boolean) as never,
                spendsFromDraft(trialActing, trialGenre),
                pool,
            );
        if (!trial.ok && delta > 0) {
            setError(trial.error || 'Not enough points.');
            return;
        }
        setError('');
        if (group === 'acting') setActing(source);
        else setGenres(source);
    };

    const finish = () => {
        if (lookOnly) {
            onAppearance?.(face);
            return;
        }
        if (kind === 'talent') {
            if (name.trim().length < 2) { setError('Give the actor a name.'); return; }
            if (!preview.ok) { setError(preview.error || 'Fix the skill sheet.'); return; }
            onTalent?.({ name: name.trim(), age, gender, appearance: face, country: birthplace, fame, actingLevels: acting, genreLevels: genres });
            return;
        }
        if (name.trim().length < 2) { setError('Enter a name.'); return; }
        if (age < 15 || age > 80) { setError('Age has to sit between 15 and 80.'); return; }
        if (!preview.ok) { setError(preview.error || 'Fix the skill sheet.'); return; }
        onComplete?.({
            name: name.trim(),
            age,
            gender,
            industry,
            appearance: face,
            birthplace,
            background,
            trait,
            actingLevels: acting,
            genreLevels: genres,
        });
    };

    const social = kind === 'self' ? startingSocials(name || 'New star', background, trait, place.name, player?.stats?.fame || 0) : null;
    const title = lookOnly ? 'Edit Look' : kind === 'talent' ? 'Add an Actor' : 'Create Your Star';

    return (
        <div className="h-full overflow-y-auto bg-[#07070b] text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
                <aside className="lg:sticky lg:top-6 lg:w-[320px] lg:self-start">
                    <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-zinc-900 to-black p-5">
                        <IndustryGlobeMark size={36} />
                        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">Casting</div>
                        <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
                        <div className="mt-5 flex justify-center">
                            <div className="rounded-full bg-black p-2 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                                <CartoonAvatar face={face} size={168} label={name || 'Portrait'} />
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <div className="text-lg font-black">{name.trim() || 'Unnamed'}</div>
                            <div className="text-xs text-zinc-400">{place.name} · age {age}</div>
                        </div>
                        {mode !== 'new' && !lookOnly && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => { setKind('self'); setStep(0); }} className={`rounded-xl px-3 py-2 text-xs font-bold ${kind === 'self' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>Your star</button>
                                <button type="button" onClick={() => { setKind('talent'); setStep(0); }} className={`rounded-xl px-3 py-2 text-xs font-bold ${kind === 'talent' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>Add actor</button>
                            </div>
                        )}
                    </div>
                </aside>

                <section className="min-w-0 flex-1 pb-24">
                    <div className="mb-4 flex items-center gap-2 overflow-x-auto">
                        {steps.map((label, index) => (
                            <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${index === step ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-500'}`}>{label}</button>
                        ))}
                    </div>

                    {steps[step] === 'Name' || steps[step] === 'Actor' ? (
                        <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
                            <Field label="Name">
                                <input value={name} onChange={event => setName(event.target.value)} maxLength={40} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-bold outline-none focus:border-amber-400" placeholder="Screen name" />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Age">
                                    <input type="number" min={15} max={kind === 'talent' ? 90 : 80} value={age} onChange={event => setAge(Number(event.target.value) || 18)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-bold outline-none focus:border-amber-400" />
                                </Field>
                                <Field label="Gender">
                                    <div className="grid grid-cols-3 gap-1">
                                        {(['MALE', 'FEMALE', 'NON_BINARY'] as const).map(option => (
                                            <button key={option} type="button" onClick={() => setGender(option)} className={`rounded-xl px-2 py-3 text-[10px] font-black uppercase ${gender === option ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}>{option === 'NON_BINARY' ? 'NB' : option === 'MALE' ? 'M' : 'F'}</button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                            {kind === 'self' && (
                                <Field label="Home industry">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {allIndustries().map(item => (
                                            <button key={item.id} type="button" onClick={() => setIndustry(item.id)} className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold ${industry === item.id ? 'border-amber-400 bg-amber-400/10 text-white' : 'border-zinc-800 text-zinc-400'}`}>{item.name}</button>
                                        ))}
                                    </div>
                                </Field>
                            )}
                            {kind === 'talent' && (
                                <Field label={`Fame ${fame}`}>
                                    <input type="range" min={0} max={80} value={fame} onChange={event => setFame(Number(event.target.value))} className="w-full" />
                                    <p className="text-xs text-zinc-500">Fame sets the tier, the ask, and which offers this actor is approached for. It stays on this save.</p>
                                </Field>
                            )}
                        </div>
                    ) : null}

                    {steps[step] === 'Look' ? (
                        <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
                            <Picker label="Skin" count={PORTRAIT_SKIN.length} value={face.skin} colors={PORTRAIT_SKIN} onChange={value => setFace({ ...face, skin: value })} />
                            <Picker label="Hair" count={PORTRAIT_HAIR.length} value={face.hair} colors={PORTRAIT_HAIR} onChange={value => setFace({ ...face, hair: value })} />
                            <Picker label="Hair style" count={6} value={face.hairStyle} onChange={value => setFace({ ...face, hairStyle: value })} />
                            <Picker label="Eyes" count={4} value={face.eyes} onChange={value => setFace({ ...face, eyes: value })} />
                            <Picker label="Mouth" count={4} value={face.mouth} onChange={value => setFace({ ...face, mouth: value })} />
                            <Picker label="Outfit" count={PORTRAIT_SHIRT.length} value={face.shirt} colors={PORTRAIT_SHIRT} onChange={value => setFace({ ...face, shirt: value })} />
                            <Picker label="Accessory" count={4} value={face.accessory} onChange={value => setFace({ ...face, accessory: value })} />
                        </div>
                    ) : null}

                    {steps[step] === 'Path' ? (
                        <div className="space-y-4">
                            <Field label="Birthplace">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {BIRTHPLACES.map(item => (
                                        <button key={item.id} type="button" onClick={() => setBirthplace(item.id)} className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold ${birthplace === item.id ? 'border-amber-400 bg-amber-400/10' : 'border-zinc-800 text-zinc-400'}`}><MapPin size={12} className="mb-1" />{item.name}</button>
                                    ))}
                                </div>
                            </Field>
                            <ChoiceGrid label="Background" options={STARTING_PATHS.map(item => ({ id: item.id, name: item.name, line: item.line }))} value={background} onChange={setBackground} />
                            <ChoiceGrid label="Starting trait" options={STARTING_TRAITS.map(item => ({ id: item.id, name: item.name, line: item.line }))} value={trait} onChange={setTrait} />
                        </div>
                    ) : null}

                    {steps[step] === 'Skills' ? (
                        <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Point pool</div>
                                    <div className="text-sm text-zinc-400">{kind === 'talent' ? 'This sheet belongs to the actor, not your wallet.' : 'Levels cost more as they rise. Background and trait already granted a free level.'}</div>
                                </div>
                                <div className="rounded-2xl bg-amber-400 px-3 py-2 text-sm font-black text-black">{preview.ok ? pool - preview.spent : pool} left</div>
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Acting</h3>
                            {ACTING_SKILL_KEYS.map(key => (
                                <SkillRow key={key} name={ACTING_FLAVOUR[key].name} flavour={ACTING_FLAVOUR[key].flavour} levels={acting[key] || 0} value={preview.skills[key]} onAdd={() => bump('acting', key, 1)} onRemove={() => bump('acting', key, -1)} />
                            ))}
                            <h3 className="pt-2 text-xs font-black uppercase tracking-widest text-zinc-500">Genres</h3>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {ALL_GENRES.map(genre => (
                                    <SkillRow key={genre} name={formatGenreLabel(genre)} flavour="" levels={genres[genre] || 0} value={preview.genreXP[genre] || 0} onAdd={() => bump('genre', genre, 1)} onRemove={() => bump('genre', genre, -1)} />
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {steps[step] === 'Ready' ? (
                        <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
                            <div className="flex items-start gap-3">
                                <Sparkles className="text-amber-300" />
                                <div>
                                    <div className="font-black">{kind === 'talent' ? `${name || 'This actor'} joins the casting pools as Custom talent.` : `${name || 'Your star'} is ready.`}</div>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        {kind === 'talent'
                                            ? 'They are stored on this save only. Casting, fees, and offers use the same talent lists as everyone else.'
                                            : 'X, Instagram, and YouTube profiles are created automatically. The avatar is the profile picture. You do not set up or manage those accounts.'}
                                    </p>
                                </div>
                            </div>
                            {social && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    <SocialChip network="Instagram" handle={social.handle} count={social.instagram} />
                                    <SocialChip network="X" handle={social.handle} count={social.x} />
                                    <SocialChip network="YouTube" handle={social.handle} count={social.youtube} />
                                </div>
                            )}
                            {onOpenStore ? (
                                <button type="button" onClick={onOpenStore} className="flex w-full items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-left">
                                    <span>
                                        <span className="block font-black">Character Creation · ₹1,500</span>
                                        <span className="text-xs text-zinc-400">150 premium skill points, after the store confirms the purchase. In India this shows ₹1,500. Other countries show the store price.</span>
                                    </span>
                                    <Clapperboard size={18} />
                                </button>
                            ) : (
                                <p className="text-sm text-zinc-400">After the career starts, the Store sells the Character Creation package for ₹1,500 in India (about $17.99 elsewhere until the store sends its own price). It includes 150 skill points, and only after the purchase is confirmed.</p>
                            )}
                        </div>
                    ) : null}

                    {error && <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

                    <div className="mt-4 flex gap-3">
                        {(onCancel || step > 0) && (
                            <button type="button" onClick={() => step === 0 ? onCancel?.() : setStep(value => value - 1)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300">
                                <ArrowLeft size={16} /> {step === 0 ? 'Back' : 'Previous'}
                            </button>
                        )}
                        {step < steps.length - 1 ? (
                            <button type="button" onClick={() => { setError(''); setStep(value => value + 1); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button type="button" onClick={finish} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black">
                                <Check size={16} /> {lookOnly ? 'Save look' : kind === 'talent' ? 'Add to talent' : mode === 'new' ? 'Start career' : 'Save character'}
                            </button>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>
        {children}
    </label>
);

const Picker: React.FC<{ label: string; count: number; value: number; colors?: string[]; onChange: (value: number) => void }> = ({ label, count, value, colors, onChange }) => (
    <div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</div>
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: count }, (_, index) => (
                <button key={index} type="button" onClick={() => onChange(index)} className={`h-9 min-w-9 rounded-full border px-2 text-xs font-bold ${value % count === index ? 'border-amber-300 ring-2 ring-amber-300' : 'border-white/10'}`} style={{ background: colors?.[index] || '#27272a' }} aria-label={`${label} ${index + 1}`} />
            ))}
        </div>
    </div>
);

const ChoiceGrid: React.FC<{ label: string; value: string; options: { id: string; name: string; line: string }[]; onChange: (id: string) => void }> = ({ label, value, options, onChange }) => (
    <div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map(option => (
                <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`rounded-2xl border p-3 text-left ${value === option.id ? 'border-amber-400 bg-amber-400/10' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-2 font-black"><UserRound size={14} /> {option.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">{option.line}</div>
                </button>
            ))}
        </div>
    </div>
);

const SkillRow: React.FC<{ name: string; flavour: string; levels: number; value: number; onAdd: () => void; onRemove: () => void }> = ({ name, flavour, levels, value, onAdd, onRemove }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2">
        <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{name}</div>
            {flavour && <div className="truncate text-[11px] text-zinc-500">{flavour}</div>}
        </div>
        <div className="text-right text-[10px] font-bold uppercase text-zinc-500">
            <div>{Math.round(value)} craft</div>
            <div>next {costForNextLevel(levelOf(value)) || 'max'}</div>
        </div>
        <button type="button" onClick={onRemove} className="h-8 w-8 rounded-full bg-zinc-800 font-black">–</button>
        <div className="w-6 text-center font-black">{levels}</div>
        <button type="button" onClick={onAdd} className="h-8 w-8 rounded-full bg-white font-black text-black">+</button>
    </div>
);

const SocialChip: React.FC<{ network: string; handle: string; count: number }> = ({ network, handle, count }) => (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{network}</div>
        <div className="font-bold">{handle}</div>
        <div className="text-xs text-zinc-400">{count.toLocaleString()} to start</div>
    </div>
);
