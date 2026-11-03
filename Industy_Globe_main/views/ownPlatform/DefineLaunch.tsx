import React, { useState } from 'react';
import { OwnPlatformState, Player } from '../../types';
import { contentVeto, firstLookDiscount } from '../../services/ownPlatform/stakeSale';
import { getCountry } from '../../services/ownPlatform/catalog';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import {
    formatAveragePlanPrice,
    formatCompact,
    formatPeople,
    licenceShelf,
    listOwnedTitles,
    quoteLaunch,
    storefrontById,
    syncRegions,
} from '../../services/ownPlatform/logic';
import { sceneForDefineStep, sceneStyle } from '../../services/ownPlatform/scenes';
import { markById } from '../../services/ownPlatform/brand';
import { identById } from '../../services/ownPlatform/identEffects';
import { IdentPicker } from './IdentPicker';
import { StorefrontDesigner } from './StorefrontDesigner';
import { DayOneMarkets } from './DayOneMarkets';
import { NameIt } from './NameIt';
import { PricingDesk } from './PricingDesk';
import { BillStrip, Card, FooterBar, Pill, PreviewPanel, headingFont } from './ui';

const STEPS = ['Name it', 'Markets', 'Clearance', 'Ident', 'Storefront', 'Catalogue', 'Pricing', 'Blueprint'];
const HINTS = [
    '',
    '',
    'Filing is free. Access fees sit on the launch bill and leave the treasury only when you commission.',
    'Each sting says what it sounds like and what it does to viewers. A clip you upload only replaces the sound.',
    'The green line is the discovery and stay rate the weekly forecast uses.',
    'A licence fee joins the launch bill. Nothing leaves the treasury today.',
    'Paid plans stay between $0.99 and $100. The forecast updates with each change.',
    'This sheet is the whole company. Money still does not move until you sign the build.',
];

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onBuild: () => void;
}

export const DefineLaunch: React.FC<Props> = ({ player, onChange, onBuild }) => {
    const state = player.ownPlatform!;
    const step = state.defineStep;
    const quote = quoteLaunch(player);
    const locked = state.commissioned;
    const patch = (recipe: (current: OwnPlatformState) => OwnPlatformState) => {
        if (locked && step < 7) return;
        onChange(recipe(state));
    };
    const go = (next: number) => onChange({ ...state, defineStep: Math.max(0, Math.min(7, next)) });

    const fileAll = () => {
        const absolute = getAbsoluteWeek(player.age, player.currentWeek);
        patch(current => {
            const applications = [...current.applications];
            current.selectedCountryIds.forEach(id => {
                const country = getCountry(id);
                if (!country) return;
                const existing = applications.find(row => row.countryId === id);
                if (existing && existing.status !== 'REJECTED') return;
                if (existing?.status === 'REJECTED' && (existing.refileWeekAbsolute || 0) > absolute) return;
                const nextApp = {
                    countryId: id,
                    status: 'FILED' as const,
                    weeksLeft: country.reviewWeeks,
                    filedWeekAbsolute: absolute,
                    note: 'Application filed. Reviews run on their own from here.',
                    acceptedConditions: false,
                };
                if (existing) applications[applications.indexOf(existing)] = nextApp;
                else applications.push(nextApp);
            });
            return { ...current, applications };
        });
    };

    const acceptConditions = (id: string) => {
        patch(current => ({
            ...current,
            applications: current.applications.map(row => row.countryId === id ? { ...row, acceptedConditions: true, note: 'Conditions accepted. The access bill is higher.' } : row),
        }));
    };

    const footer = (
        <FooterBar
            leftLabel="Network"
            leftValue={`${state.selectedCountryIds.length} countries`}
            money={formatCompact(state.books?.cash || 0)}
            onBack={step > 0 ? () => go(step - 1) : undefined}
            onNext={() => step === 7 ? onBuild() : go(step + 1)}
            nextLabel={step === 7 ? 'Next · Build' : `Next · ${STEPS[step + 1]}`}
        />
    );

    return (
        <>
            <div className="body" style={sceneStyle(sceneForDefineStep(step))}>
                {step === 0 && (
                    <NameIt
                        state={state}
                        locked={locked}
                        quote={quote}
                        onName={name => patch(current => ({ ...current, name }))}
                        onBrand={brand => patch(current => ({ ...current, brand }))}
                    />
                )}
                {step === 1 && (
                    <DayOneMarkets state={state} locked={locked} onPatch={(recipe) => patch(current => syncRegions(recipe(current)))} />
                )}
                {step === 3 && (
                    <IdentPicker player={player} state={state} locked={locked} onChange={onChange} />
                )}
                {step === 4 && (
                    <StorefrontDesigner player={player} state={state} locked={locked} onChange={onChange} />
                )}
                {step > 1 && step !== 3 && step !== 4 && (
                <div className="grid g-side">
                <div className="stack">

                {step === 2 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Clearance</div>
                                    <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>File, then wait the weeks out</h2>
                                </div>
                                <button onClick={fileAll} disabled={locked} className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40">File selected</button>
                            </div>
                            <p className="text-sm text-zinc-400 max-w-2xl">Nothing is charged for filing. Access fees sit on the launch bill and leave the treasury only when you commission. Advance the career week to hear back. A file can clear, stall, come back with conditions, or be refused.</p>
                            <div className="grid md:grid-cols-2 gap-3">
                                {state.selectedCountryIds.map(id => {
                                    const country = getCountry(id);
                                    const application = state.applications.find(row => row.countryId === id);
                                    if (!country) return null;
                                    return (
                                        <Card key={id}>
                                            <div className="flex justify-between">
                                                <div className="font-black text-xl" style={{ fontFamily: headingFont }}>{country.flag} {country.name}</div>
                                                <StatusPill status={application?.status} />
                                            </div>
                                            <p className="text-sm text-zinc-400 mt-2">{application?.note || 'Not filed.'}</p>
                                            {application && (application.status === 'FILED' || application.status === 'DELAYED') && (
                                                <div className="mt-3 text-sm"><span className="text-[#8B7BFF] font-bold">{application.weeksLeft} weeks</span> left on the clock</div>
                                            )}
                                            {application?.status === 'CONDITIONS' && !application.acceptedConditions && (
                                                <button onClick={() => acceptConditions(id)} className="mt-3 text-xs font-black uppercase tracking-wider text-black bg-[#f5c16c] rounded-full px-3 py-2">Accept conditions</button>
                                            )}
                                            {application?.status === 'CONDITIONS' && application.acceptedConditions && <div className="mt-2 text-emerald-300 text-sm">Conditions accepted.</div>}
                                        </Card>
                                    );
                                })}
                                {state.selectedCountryIds.length === 0 && <Card><p className="text-zinc-400">Choose markets first.</p></Card>}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Markets cleared</div>
                            <div className="text-4xl font-black" style={{ fontFamily: headingFont }}>
                                {state.applications.filter(row => row.status === 'APPROVED' || (row.status === 'CONDITIONS' && row.acceptedConditions)).length}
                                <span className="text-zinc-500 text-2xl">/{state.selectedCountryIds.length}</span>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${state.selectedCountryIds.length ? (state.applications.filter(row => row.status === 'APPROVED' || row.acceptedConditions).length / state.selectedCountryIds.length) * 100 : 0}%` }} />
                            </div>
                            <p className="text-sm text-zinc-400 mt-4">Each market keeps its own clock. A delay is not a no. A rejection can be filed again after eight weeks.</p>
                        </Card>
                    </div>
                )}

                {step === 5 && (
                    <CatalogueStep player={player} state={state} locked={locked} onChange={onChange} />
                )}

                {step === 6 && (
                    <PricingDesk player={player} state={state} locked={locked} onChange={onChange} />
                )}

                {step === 7 && (
                    <div className="grid lg:grid-cols-3 gap-3">
                        <Card className="lg:col-span-2 blueprint">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Blueprint</div>
                            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.name}</h2>
                            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <Line label="Markets" value={`${state.selectedCountryIds.length} chosen`} />
                                <Line label="Cleared" value={`${state.applications.filter(row => row.status === 'APPROVED' || row.acceptedConditions).length}`} />
                                <Line label="Mark" value={markById(state.brand?.markId).name} />
                                <Line label="Ident" value={identById(state.identId).name} />
                                <Line label="Storefront" value={storefrontById(state.storefrontId).name} />
                                <Line label="Catalogue" value={`${state.catalogue.length} titles`} />
                                <Line label="Plans" value={`${state.plans.length} · ${formatAveragePlanPrice(state)}`} />
                                <Line label="Funding pressure" value={quote.fundingLabel} />
                                <Line label="Due at commission" value={formatCompact(quote.dueNow)} />
                                <Line label="Weekly burn" value={formatCompact(quote.weeklyBurn)} />
                                <Line label="Forecast revenue / wk" value={formatCompact(quote.forecastWeeklyRevenue)} />
                                <Line label="Households" value={formatPeople(quote.households)} />
                                <Line label="Piracy" value={`${Math.round(quote.piracyShare * 100)}% of viewing`} />
                                <Line label="Lanes" value={state.revenueLanes.join(', ') || 'None'} />
                            </div>
                        </Card>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Blockers</div>
                            {quote.blockers.filter(line => line !== 'Construction has already been signed.').length === 0 ? (
                                <p className="mt-3 text-emerald-300">Nothing is standing in the way of a signature. The bill is still unpaid.</p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                                    {quote.blockers.filter(line => line !== 'Construction has already been signed.').map(line => <li key={line}>· {line}</li>)}
                                </ul>
                            )}
                            <p className="text-xs text-zinc-500 mt-4">You can walk the build while reviews are still out. Money does not move until you commission.</p>
                        </Card>
                    </div>
                )}
                </div>
                <PreviewPanel name={state.name} quote={quote} hint={HINTS[step] || ''} />
                </div>
                )}
                <BillStrip quote={quote} />
            </div>
            {footer}
        </>
    );
};

const CatalogueStep: React.FC<{ player: Player; state: OwnPlatformState; locked: boolean; onChange: (next: OwnPlatformState) => void }> = ({ player, state, locked, onChange }) => {
    const owned = listOwnedTitles(player);
    const shelf = licenceShelf();
    const look = firstLookDiscount(player);
    const [block, setBlock] = useState('');
    const priceOf = (cost: number) => look ? Math.round(cost * (1 - look.rate)) : cost;
    const toggle = (pick: typeof shelf[number]) => {
        if (locked) return;
        const exists = state.catalogue.some(row => row.id === pick.id);
        if (exists) {
            setBlock('');
            onChange({ ...state, catalogue: state.catalogue.filter(row => row.id !== pick.id) });
            return;
        }
        const veto = contentVeto(player, pick.cost);
        if (veto) {
            setBlock(veto);
            return;
        }
        const cost = pick.source === 'LICENCE' ? priceOf(pick.cost) : pick.cost;
        setBlock(look && pick.source === 'LICENCE' ? `${look.name}'s first-look cut this licence to ${formatCompact(cost)}.` : '');
        onChange({ ...state, catalogue: [...state.catalogue, { ...pick, cost }] });
    };
    return (
        <div className="grid lg:grid-cols-2 gap-4">
            <div>
                <h3 className="text-2xl font-black uppercase mb-3" style={{ fontFamily: headingFont }}>Owned</h3>
                <div className="space-y-2">
                    {owned.length === 0 && <Card><p className="text-sm text-zinc-400">No productions of your own yet. Licence a shelf for opening night, or come back when a film is finished.</p></Card>}
                    {owned.map(title => (
                        <TitleRow key={title.id} title={title.title} meta={`${title.genre} · yours · free`} on={state.catalogue.some(row => row.id === title.id)} onClick={() => toggle(title)} />
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-black uppercase mb-3" style={{ fontFamily: headingFont }}>Licences</h3>
                <p className="text-sm text-zinc-500 mb-2">The fee is added to the launch bill. It is not taken today.{look ? ` ${look.name}'s first-look takes ${Math.round(look.rate * 100)}% off.` : ''}</p>
                {block && <p className={`text-sm mb-2 ${block.includes('vetoed') ? 'text-rose-200' : 'text-emerald-200'}`} data-testid="licence-block">{block}</p>}
                <div className="space-y-2">
                    {shelf.map(title => {
                        const held = state.catalogue.find(row => row.id === title.id);
                        const cost = held ? held.cost : priceOf(title.cost);
                        return (
                            <TitleRow
                                key={title.id}
                                title={title.title}
                                meta={`${title.genre} · ${title.language} · ${formatCompact(cost)}${look && !held ? ' · first-look price' : ''}`}
                                on={Boolean(held)}
                                onClick={() => toggle(title)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const TitleRow: React.FC<{ title: string; meta: string; on: boolean; onClick: () => void }> = ({ title, meta, on, onClick }) => (
    <button onClick={onClick} className={`w-full text-left rounded-2xl border px-4 py-3 ${on ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-zinc-400">{meta}</div>
    </button>
);

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
    const label = status === 'APPROVED' ? 'Approved' : status === 'DELAYED' ? 'Delayed' : status === 'CONDITIONS' ? 'Conditions' : status === 'REJECTED' ? 'Rejected' : status === 'FILED' ? 'Filed' : 'Not filed';
    const tone = status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'bad' : status === 'CONDITIONS' || status === 'DELAYED' ? 'warn' : status === 'FILED' ? 'run' : 'idle';
    return <Pill tone={tone}>{label}</Pill>;
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-right">{value}</span>
    </div>
);

