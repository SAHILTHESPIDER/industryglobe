import React, { useState } from 'react';
import { OwnPlatformState, Player } from '../../types';
import { contentVeto, firstLookDiscount } from '../../services/ownPlatform/stakeSale';
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
import { BillStrip, Card, FooterBar, PreviewPanel, headingFont } from './ui';
import { ClearanceDesk } from './ClearanceDesk';

const STEPS = ['Name it', 'Markets', 'Clearance', 'Ident', 'Storefront', 'Catalogue', 'Offer', 'Blueprint'];
const HINTS = [
    '',
    '',
    'Each country has its own licence fee. The cheque leaves the treasury when you apply.',
    'Each sting says what it sounds like and what it does to viewers. A clip you upload only replaces the sound.',
    'The green line is the discovery and stay rate the weekly forecast uses.',
    'A licence fee joins the launch bill. Nothing leaves the treasury today.',
    'Paid plans stay between $0.99 and $100. The forecast updates with each change.',
    'This sheet is the whole company. Money still does not move until you sign the build.',
];

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onPlayer: (next: Player) => void;
    onBuild: () => void;
}

export const DefineLaunch: React.FC<Props> = ({ player, onChange, onPlayer, onBuild }) => {
    const state = player.ownPlatform!;
    const step = state.defineStep;
    const quote = quoteLaunch(player);
    const locked = state.commissioned;
    const patch = (recipe: (current: OwnPlatformState) => OwnPlatformState) => {
        if (locked && step < 7) return;
        onChange(recipe(state));
    };
    const go = (next: number) => onChange({ ...state, defineStep: Math.max(0, Math.min(7, next)) });

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
                {step === 6 && (
                    <PricingDesk player={player} state={state} locked={locked} onChange={onChange} />
                )}

                {step === 2 && <ClearanceDesk player={player} onPlayer={onPlayer} />}
                {step > 1 && step !== 2 && step !== 3 && step !== 4 && step !== 6 && (
                <div className="grid g-side">
                <div className="stack">

                {step === 5 && (
                    <CatalogueStep player={player} state={state} locked={locked} onChange={onChange} />
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

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-right">{value}</span>
    </div>
);

