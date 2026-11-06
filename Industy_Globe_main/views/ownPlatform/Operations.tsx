import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CataloguePick, Player } from '../../types';
import { displayTitle, loadCatalogue, preferredFormat } from '../../services/rights/catalogue';
import { allRecords, rightsOf } from '../../services/rights/logic';
import { sendEmpireBrief } from '../../services/commissions/logic';
import { ContentDeskCommissions } from '../lifestyle/business/PlatformCommissions';
import { RightsLibrary } from '../lifestyle/business/RightsLibrary';
import { MARKET_COUNTRIES } from '../../services/ownPlatform/catalog';

import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import { officeWeekly, openIncident, redundancyOf, effectiveSites } from '../../services/ownPlatform/infrastructure';
import { cityById } from '../../services/ownPlatform/serverCities';
import { IncidentBoard } from './PlacePanels';
import {
    FACILITY_USD,
    LAUNCH_INVESTORS,
    LAUNCH_SEED_LINE,
    chooseFunding,
    drawFromCompany,
    investInCompany,
    listPlatformDeals,
    purchasePlatform,
    quoteValuation,
    revenueSplit,
    titleRows,
} from '../../services/ownPlatform/studio';
import {
    STAKE_SALE_LINE,
    buyerKindLabel,
    capSlices,
    castCameo,
    lockWeeksLeft,
    maxSellPoints,
    obligationLines,
} from '../../services/ownPlatform/stakeSale';
import { StakeSale } from './StakeSale';
import { IpoFlow } from './IpoFlow';
import { IPO_LINE, draftCanDrop, dropIpoDraft, ipoBlockers, showPct } from '../../services/ownPlatform/ipo';
import { releaseWeekLabel } from '../../services/ownPlatform/weeks';
import { BuyFinancing } from '../../services/ownPlatform/valuation';
import { Boardroom } from './Boardroom';
import { ValuationSheet } from './ValuationSheet';
import { PricingDesk } from './PricingDesk';
import { headingFont } from './ui';
import { STREAMING_SCENES, sceneStyle } from '../../services/ownPlatform/scenes';
import { IdentBumper } from './IdentStage';
import { armPlatformIdent } from '../../services/ownPlatform/identAudio';

type Desk = 'content' | 'network' | 'audience' | 'board';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const Operations: React.FC<Props> = ({ player, onPlayer }) => {
    const [desk, setDesk] = useState<Desk>('board');
    const [error, setError] = useState('');
    const state = player.ownPlatform;
    if (!state) return null;
    const books = state.books;
    const quote = quoteLaunch(player);
    const apply = (result: { player: Player; error?: string }) => {
        setError(result.error || '');
        if (!result.error) onPlayer(result.player);
        else if (result.player !== player) onPlayer(result.player);
    };

    return (
        <div className="p-4 lg:p-10 space-y-4 rounded-3xl" data-screen="operations" style={sceneStyle('hills')}>
            <div
                className="h-36 lg:h-56 rounded-3xl border border-white/10 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(5,6,10,0.05), rgba(5,6,10,0.45)), url(${STREAMING_SCENES.hills})` }}
                role="img"
                aria-label="Dusk hills behind the operations desk"
            />
            <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7BFF]">Operations</div>
                <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Run {state.name}</h2>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Content Desk, Network, Audience, and the Boardroom. Each one is a different side of the same company.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {([
                    ['content', 'Content Desk'],
                    ['network', 'Network'],
                    ['audience', 'Audience'],
                    ['board', 'Boardroom'],
                ] as [Desk, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => { setDesk(id); setError(''); }} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider ${desk === id ? 'bg-[#4F3BFF] text-white' : 'bg-white/5 text-zinc-400'}`}>{label}</button>
                ))}
            </div>
            {error && <p className="text-rose-300 text-sm" data-testid="ops-error">{error}</p>}
            {desk === 'content' && <ContentDesk player={player} onApply={apply} />}
            {desk === 'network' && <NetworkDesk player={player} onPlayer={onPlayer} onError={setError} quoteHouseholds={quote.households} burn={quote.weeklyBurn} />}
            {desk === 'audience' && <AudienceDesk player={player} onPlayer={onPlayer} />}
            {desk === 'board' && (
                <div className="space-y-8">
                    <FinanceDesk player={player} onApply={apply} valuation={quoteValuation(player)} />
                    <AcquireDesk player={player} onApply={apply} />
                    <Boardroom player={player} onPlayer={onPlayer} />
                </div>
            )}
            {books && desk !== 'board' && (
                <p className="text-xs text-zinc-500">Funding {books.funding.toLowerCase()} · debt {formatCompact(books.debt)} · outside owners {showPct(capSlices(player).seed + capSlices(player).legacy + capSlices(player).holders + capSlices(player).pub)}</p>
            )}
        </div>
    );
};

const ContentDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void }> = ({ player, onApply }) => {
    const state = player.ownPlatform!;
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [catalogueReady, setCatalogueReady] = useState(false);
    const [detail, setDetail] = useState<CataloguePick | null>(null);
    const [bumper, setBumper] = useState<CataloguePick | null>(null);
    const [watchToken, setWatchToken] = useState(0);
    const bumperRef = useRef<CataloguePick | null>(null);
    bumperRef.current = bumper;
    const stingId = state.identId || state.identityId;
    const openTitle = (row: CataloguePick) => {
        if (state.identSound === false) {
            setBumper(null);
            setDetail(row);
            return;
        }
        setDetail(null);
        setWatchToken(token => token + 1);
        armPlatformIdent(player);
        setBumper(row);
    };
    useEffect(() => {
        let cancelled = false;
        loadCatalogue().then(() => { if (!cancelled) setCatalogueReady(true); });
        return () => { cancelled = true; };
    }, []);
    const house = player.businesses?.find(business => business.type === 'PRODUCTION_HOUSE');
    const ownedSeries = catalogueReady && house
        ? allRecords(player).filter(ip => {
            const holding = rightsOf(house).holdings.find(row => row.ipId === ip.id && row.owner === 'PLAYER' && row.status === 'OWNED');
            return Boolean(holding) && (preferredFormat(ip) === 'SERIES' || (ip.seasons || 1) >= 2);
        }).slice(0, 12)
        : [];
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400 max-w-2xl">Empire+ commissions rival studios from this desk. The same briefs, counters, and signatures run the other way. Owned library titles and public-domain stories can ride along. Inbound platform offers live on the production house.</p>
                <button data-testid="content-desk-rights" onClick={() => setLibraryOpen(true)} className="shrink-0 px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">Rights Library</button>
            </div>
            {ownedSeries.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {ownedSeries.map(ip => (
                        <article key={ip.id} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Library series</div>
                            <div className="text-xl font-black uppercase leading-none mt-1" style={{ fontFamily: headingFont }}>{displayTitle(ip)}</div>
                            <p className="text-xs text-zinc-400 mt-2">{ip.seasons || 1} seasons · {ip.countryName}</p>
                            <button onClick={() => onApply(sendEmpireBrief(player, { houseId: 'aurora', format: 'SERIES', seasons: Math.max(1, ip.seasons || 1), episodes: 8, runtimeMin: 48, rightsIpId: ip.id, rightsTitle: displayTitle(ip), publicDomain: ip.publicDomain, genre: ((ip.gameGenres && ip.gameGenres[0]) || 'DRAMA') as 'DRAMA' }))} className="mt-3 w-full py-3 rounded-full bg-[#4F3BFF] text-white text-[11px] font-black uppercase tracking-wider">Send as a brief</button>
                        </article>
                    ))}
                </div>
            )}
            <ContentDeskCommissions player={player} onApply={onApply} />
            <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">On the shelf</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {state.catalogue.length === 0 && <p className="text-sm text-zinc-500">No titles yet. Accept a commission or add one in the launch catalogue.</p>}
                    {state.catalogue.map(row => (
                        <button key={row.id} type="button" data-testid={`shelf-title-${row.id}`} onClick={() => openTitle(row)} className="rounded-2xl border border-white/10 px-3 py-2 text-left hover:border-white/30">
                            <div className="font-bold">{row.title}</div>
                            <div className="text-[11px] text-zinc-500">{row.genre} · {row.language} · {row.source}</div>
                            <div className="text-[11px] text-zinc-400 mt-1">
                                {typeof row.releaseWeekOffset === 'number'
                                    ? `On the calendar · ${releaseWeekLabel(player.currentWeek, row.releaseWeekOffset)}`
                                    : 'Already on the service'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            {libraryOpen && (
                <RightsLibrary player={player} studio={house} onBack={() => setLibraryOpen(false)} onUpdatePlayer={next => onApply({ player: next })} />
            )}
            {bumper && (
                <IdentBumper
                    key={watchToken}
                    name={state.name}
                    identityId={stingId}
                    purpose="title"
                    onDone={() => {
                        const row = bumperRef.current;
                        setBumper(null);
                        if (row) setDetail(row);
                    }}
                />
            )}
            {detail && createPortal(
                <div className="fixed inset-0 z-[250] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setDetail(null)}>
                    <div data-testid="title-detail" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12151c] p-6" onClick={event => event.stopPropagation()}>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Now playing · {state.name}</div>
                        <div className="text-4xl font-black uppercase leading-none mt-2" style={{ fontFamily: headingFont }}>{detail.title}</div>
                        <p className="text-sm text-zinc-400 mt-3">{detail.genre} · {detail.language} · {detail.source === 'OWNED' ? 'Yours' : 'Licensed'}</p>
                        <p className="text-sm text-zinc-500 mt-2">
                            {typeof detail.releaseWeekOffset === 'number'
                                ? `Opens ${releaseWeekLabel(player.currentWeek, detail.releaseWeekOffset)}`
                                : 'On the service now.'}
                        </p>
                        <button type="button" onClick={() => setDetail(null)} className="mt-5 w-full rounded-full bg-white text-black py-3 text-xs font-black uppercase tracking-wider">Close</button>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
};

const NetworkDesk: React.FC<{ player: Player; onPlayer: (next: Player) => void; onError: (message: string) => void; quoteHouseholds: number; burn: number }> = ({ player, onPlayer, onError, quoteHouseholds, burn }) => {
    const state = player.ownPlatform!;
    const sites = effectiveSites(state);
    const redundancy = redundancyOf(sites);
    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="space-y-3">
                <p className="text-sm text-zinc-400">Servers sit in cities. {redundancy.label}. {redundancy.line}</p>
                {sites.length === 0 && <p className="text-sm text-zinc-500">No city has a rack yet. Place them on the build map.</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                    {sites.map(site => {
                        const city = cityById(site.cityId);
                        const boxes = site.scout + site.workhorse + site.titan;
                        return (
                            <div key={site.cityId} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{city?.name || site.cityId}</div>
                                <div className="text-3xl font-black" style={{ fontFamily: headingFont }}>{boxes}</div>
                                <div className="text-xs text-zinc-400">{site.scout} scout · {site.workhorse} workhorse · {site.titan} titan</div>
                            </div>
                        );
                    })}
                </div>
                <IncidentBoard player={player} onPlayer={onPlayer} onError={onError} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 h-fit">
                <div className="text-[11px] uppercase text-zinc-500">Stage</div>
                <div className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.stage}</div>
                <div className="text-sm text-zinc-400 mt-2">Forecast homes {formatPeople(quoteHouseholds)}</div>
                <div className="text-sm text-zinc-400">Weekly burn {formatCompact(burn)}</div>
                <div className="text-sm text-zinc-400">Uptime {state.uptime == null ? 'Not scored' : `${state.uptime}%`}</div>
                <div className="text-sm text-zinc-400">Cloud racks {state.cloud.reduce((sum, row) => sum + row.racks, 0)}</div>
            </div>
        </div>
    );
};

const AudienceDesk: React.FC<{ player: Player; onPlayer: (next: Player) => void }> = ({ player, onPlayer }) => {
    const state = player.ownPlatform!;
    const [pricingOpen, setPricingOpen] = useState(false);
    const countries = MARKET_COUNTRIES.filter(row => state.selectedCountryIds.includes(row.id));
    return (
        <div className="space-y-4">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
                <Metric label="Subscribers" value={formatPeople(state.subscribers)} />
                <Metric label="Piracy" value={`${Math.round(state.piracyShare * 100)}%`} />
                <Metric label="Customer pressure" value={`${Math.round(state.customerPressure)}`} />
                <Metric label="Weeks on air" value={String(state.weeksLive)} />
                {countries.map(country => (
                    <div key={country.id} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                        <div className="font-bold">{country.flag} {country.name}</div>
                        <div className="text-xs text-zinc-400">{formatPeople(country.audienceM * 1_000_000)} possible · {country.languages.map(language => language.name).join(', ')}</div>
                    </div>
                ))}
                {countries.length === 0 && <p className="text-sm text-zinc-500">No day-one market yet.</p>}
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase text-zinc-500">This week</div>
                <p className="text-sm text-zinc-300 mt-2">{state.pulse.headline}</p>
                {openIncident(state) && <p className="text-sm text-rose-200 mt-2">{openIncident(state)?.note}</p>}
                <div className="text-xs text-zinc-500 mt-3">Owned services</div>
                {(state.ownedStreamers || []).length === 0 && <p className="text-sm text-zinc-500">You have not bought another platform.</p>}
                {(state.ownedStreamers || []).map(row => (
                    <div key={row.id} className="mt-2 text-sm">{row.name} · {row.householdsM.toFixed(1)}M homes · {formatCompact(row.pricePaid)}</div>
                ))}
            </div>
        </div>
        <button type="button" data-testid="open-live-pricing" onClick={() => setPricingOpen(open => !open)} className="px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">
            {pricingOpen ? 'Hide pricing' : 'Pricing and offers'}
        </button>
        {pricingOpen && (
            <PricingDesk player={player} state={state} locked={false} onChange={next => onPlayer({ ...player, ownPlatform: next })} />
        )}
        </div>
    );
};

const FinanceDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void; valuation: number }> = ({ player, onApply, valuation }) => {
    const state = player.ownPlatform!;
    const books = state.books;
    const titles = titleRows(player);
    const lanes = revenueSplit(player);
    const last = books?.history[books.history.length - 1];
    const profit = (state.lastWeeklyRevenue || 0) - (state.lastWeeklyBurn || 0);
    const slices = capSlices(player);
    const seedPct = slices.seed;
    const soldPct = slices.legacy;
    const founder = slices.founder;
    const holders = books?.shareholders || [];
    const seedName = books?.seedPartner || LAUNCH_INVESTORS;
    const [saleOpen, setSaleOpen] = useState(false);
    const [ipoOpen, setIpoOpen] = useState(false);
    const canSell = maxSellPoints(player) >= 1;
    const obligations = obligationLines(player);
    const listed = state.ipo?.stage === 'LISTED' || Boolean(state.ipo?.listing);
    const ipoReasons = listed ? [] : ipoBlockers(player);
    const publicPct = showPct(slices.pub);
    return (
        <div className="space-y-4" data-screen="studio-finance">
            <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Studio finance</div>
                <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>The company, in dollars</h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Cash still lives in the treasury. This desk tracks profit, burn, debt, titles, markets, and who owns the company. Build slowly with your own capital, draw a bank facility, or sell a stake.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Metric label="Company cash" value={formatCompact(books?.cash || 0)} testId="company-cash-desk" amount={books?.cash || 0} />
                <Metric label="Your cash" value={formatCompact(player.money)} testId="personal-cash" amount={player.money} />
                <Metric label="Last receipts" value={formatCompact(state.lastWeeklyRevenue)} />
                <Metric label="Burn" value={formatCompact(state.lastWeeklyBurn)} />
                <Metric label="Profit" value={formatCompact(profit)} />
                <Metric label="Debt" value={formatCompact(books?.debt || 0)} />
                <Metric label="Debt pressure" value={books && books.debt > 0 ? `${Math.round((books.facilityRate || 0.09) * 100)}% / year` : 'None'} />
                <Metric label="Valuation" value={formatCompact(valuation)} />
                <Metric label="Outside owners" value={showPct(seedPct + soldPct + slices.holders + slices.pub)} />
            </div>
            <CompanyTransfer player={player} onApply={onApply} />
            <div className="grid lg:grid-cols-2 gap-3">
                <Choice title="Company cash" body="No new money. Commissioning spends company cash. Your personal cash stays yours unless you invest it." action="Build from company cash" onClick={() => onApply(chooseFunding(player, 'OWN'))} />
                <Choice title="Bank facility" body={books?.debt ? `${formatCompact(books.debt)} is still outstanding. The payment leaves company cash every week.` : `Draw ${formatCompact(FACILITY_USD)} into the company. Interest and a paydown leave company cash every week until the balance is gone.`} action={books?.debt ? 'Facility is open' : 'Draw the facility'} onClick={() => onApply(chooseFunding(player, 'BANK'))} />
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                    <div className="text-[11px] uppercase text-zinc-500">Title performance</div>
                    {titles.length === 0 && <p className="text-sm text-zinc-500 mt-2">No title has earned a week yet.</p>}
                    {titles.map(row => (
                        <div key={row.title} className="flex justify-between gap-3 text-sm mt-2">
                            <span>{row.title} <span className="text-zinc-500">{row.source}{row.note ? ` · ${row.note}` : ''}</span></span>
                            <span>{row.note ? 'Waiting' : formatCompact(row.weekly)}</span>
                        </div>
                    ))}
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                    <div className="text-[11px] uppercase text-zinc-500">Revenue sources</div>
                    {lanes.length === 0 && <p className="text-sm text-zinc-500 mt-2">Receipts start when the service is live.</p>}
                    {lanes.map(row => (
                        <div key={row.lane} className="flex justify-between text-sm mt-2"><span>{row.lane}</span><span>{formatCompact(row.amount)}</span></div>
                    ))}
                    <div className="text-[11px] uppercase text-zinc-500 mt-4">Ownership</div>
                    {seedPct > 0 && <p className="text-sm text-zinc-300 mt-2">{LAUNCH_SEED_LINE}</p>}
                    <div className="text-sm mt-1 space-y-2" data-testid="cap-table">
                        <p>
                            You {showPct(founder)}
                            {seedPct > 0 ? ` · ${seedName} ${showPct(seedPct)} (seed funding)` : ''}
                            {soldPct > 0 ? ` · ${books?.pePartner || 'Partners'} ${showPct(soldPct)}` : ''}
                        </p>
                        {holders.map(holder => {
                            const locked = lockWeeksLeft(player, holder);
                            const cameo = holder.conditions.find(row => row.kind === 'ROLE_GUARANTEE' && !row.fulfilled);
                            return (
                                <div key={holder.id} data-testid="cap-holder" className="rounded-2xl border border-white/10 p-3">
                                    <div className="font-bold">{holder.name} · {buyerKindLabel(holder.kind)} · {showPct(holder.pct)}</div>
                                    <p className="text-xs text-zinc-500">Paid {formatCompact(holder.paid)} into company cash in week {holder.week}.</p>
                                    {holder.conditions.map(condition => (
                                        <div key={condition.kind} className="mt-2">
                                            <div className="text-sm">{condition.label}{condition.fulfilled ? ' · done' : ''}</div>
                                            <p className="text-xs text-zinc-400">{condition.effect}</p>
                                        </div>
                                    ))}
                                    {locked > 0 && <p className="text-xs text-amber-200 mt-2">Locked for {locked} more weeks. That stake cannot be sold.</p>}
                                    {cameo && (
                                        <div className="mt-2">
                                            <button type="button" data-testid="cast-cameo" onClick={() => onApply(castCameo(player, holder.id))} className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">Cast the cameo</button>
                                            <p className="text-xs text-zinc-500 mt-1">Puts them in the role you promised and clears that obligation.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4">
                        {canSell ? (
                            <>
                                <button type="button" data-testid="stake-becho" onClick={() => setSaleOpen(true)} className="px-4 py-2 rounded-full bg-[#FFC44D] text-black text-[11px] font-black uppercase tracking-wider">Stake becho</button>
                                <p className="text-sm text-zinc-300 mt-2">{STAKE_SALE_LINE}</p>
                            </>
                        ) : (
                            <p className="text-sm text-zinc-400">You do not hold a stake you can sell.</p>
                        )}
                    </div>
                    {obligations.length > 0 && (
                        <div className="mt-3" data-testid="stake-obligations">
                            <div className="text-[11px] uppercase text-zinc-500">Obligations</div>
                            {obligations.map(line => <p key={line} className="text-xs text-zinc-300 mt-1">{line}.</p>)}
                        </div>
                    )}
                    {listed && (
                        <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3" data-testid="cap-public-float">
                            <div className="font-bold">Public float · {publicPct} · {state.ipo?.listing?.exchange || state.ipo?.ticker}</div>
                            <p className="text-xs text-zinc-300 mt-1">
                                New shareholders hold this slice
                                {state.ipo?.ticker ? ` on ${state.ipo.ticker}` : ''}.
                                {state.ipo?.listing
                                    ? ` IPO proceeds ${formatCompact(state.ipo.listing.proceeds)} went to company cash, labelled IPO proceeds.`
                                    : ' The listing is on the company books.'}
                                {' '}Your personal cash did not change.
                            </p>
                        </div>
                    )}
                    {!listed && (
                        <div className="mt-4" data-testid="ipo-entry">
                            <button
                                type="button"
                                data-testid="ipo-open"
                                disabled={ipoReasons.length > 0}
                                onClick={() => { if (ipoReasons.length === 0) setIpoOpen(true); }}
                                className="px-4 py-2 rounded-full bg-[#e8c547] text-black text-[11px] font-black uppercase tracking-wider disabled:opacity-40"
                            >
                                IPO · List company
                            </button>
                            <p className="text-sm text-zinc-300 mt-2">{IPO_LINE}</p>
                            {ipoReasons.map(reason => (
                                <p key={reason} data-testid="ipo-reason" className="text-sm text-amber-200 mt-1">{reason}</p>
                            ))}
                            {draftCanDrop(player) && (
                                <div className="mt-2">
                                    <button type="button" data-testid="ipo-drop-draft" onClick={() => onApply(dropIpoDraft(player))} className="px-4 py-2 rounded-full border border-white/20 text-[11px] font-black uppercase tracking-wider">
                                        Drop the old draft
                                    </button>
                                    <p className="text-xs text-zinc-500 mt-1">Clears the unfinished boardroom listing. No money moves.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {last && <div className="text-xs text-zinc-500 mt-2">Last closed week profit {formatCompact(last.profit)}</div>}
                    {saleOpen && <StakeSale player={player} valuation={valuation} onClose={() => setSaleOpen(false)} onApply={onApply} />}
                    {ipoOpen && <IpoFlow player={player} onClose={() => setIpoOpen(false)} onApply={onApply} />}
                </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase text-zinc-500">Weekly company costs</div>
                <div className="flex justify-between text-sm mt-2"><span>Server racks and cloud</span><span>{formatCompact(quoteLaunch(player).weeklyOwn)}</span></div>
                <div className="flex justify-between text-sm mt-2"><span>Country office rent</span><span>{formatCompact(officeWeekly(state))}</span></div>
                <p className="text-xs text-zinc-500 mt-2">These lines leave company cash on the week advance. Your personal cash is not touched.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase text-zinc-500">Transactions</div>
                {(books?.lines || []).length === 0 && <p className="text-sm text-zinc-500 mt-2">No company transactions yet.</p>}
                <div className="divide-y divide-white/5">
                    {(books?.lines || []).slice(0, 8).map(line => (
                        <div key={line.id} className="flex justify-between gap-3 py-2 text-sm">
                            <span>W{line.week} · {line.label}</span>
                            <span className={line.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatCompact(line.amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AcquireDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void }> = ({ player, onApply }) => {
    const deals = listPlatformDeals(player);
    const [valuingId, setValuingId] = useState<string | null>(null);
    const file = (dealId: string, financing: BuyFinancing) => {
        setValuingId(null);
        onApply(purchasePlatform(player, dealId, financing));
    };
    return (
        <div className="space-y-3">
            <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Buy another service</div>
                <h3 className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>Purchase a streaming platform</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-2xl">The price is a valuation, not a sticker. Market cap or operating value, plus a control premium, and the debt comes with the company. Company cash or an Empire+ loan has to cover the cheque. Sell a stake from the cap table first if the company needs the money. The board and the regulator can still say no. A global service stays out of reach until your company is large enough.</p>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {deals.map(deal => (
                    <div key={deal.id} className="rounded-3xl border border-white/10 bg-[#12151c] p-4 min-w-0">
                        <div className="font-bold text-lg truncate">{deal.name}</div>
                        <div className="text-xs text-zinc-500">{deal.householdsM.toFixed(1)}M homes · {deal.note}</div>
                        <div className="text-2xl font-black mt-2">{formatCompact(deal.price)}</div>
                        <button onClick={() => setValuingId(deal.id)} className="mt-3 w-full py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">
                            Review valuation
                        </button>
                    </div>
                ))}
            </div>
            {valuingId && (
                <ValuationSheet
                    player={player}
                    dealId={valuingId}
                    onClose={() => setValuingId(null)}
                    onConfirm={file}
                />
            )}
        </div>
    );
};

const CompanyTransfer: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void }> = ({ player, onApply }) => {
    const [amount, setAmount] = useState('1000000');
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    return (
        <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4" data-testid="company-transfer">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Move money between you and the company</div>
            <label className="text-xs text-zinc-500 block mt-3">Amount (USD)
                <input data-testid="transfer-amount" value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
            </label>
            <div className="grid gap-3 mt-3">
                <div>
                    <p className="text-sm text-zinc-300">Puts your personal cash into the company, and stops at the cash you hold.</p>
                    <button type="button" data-testid="invest-cash" onClick={() => onApply(investInCompany(player, value))} className="mt-2 px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">Invest your cash</button>
                </div>
                <div>
                    <p className="text-sm text-zinc-300">Pays you a salary from company cash, and stops at the cash the company holds.</p>
                    <button type="button" data-testid="take-salary" onClick={() => onApply(drawFromCompany(player, value, 'SALARY'))} className="mt-2 px-4 py-2 rounded-full border border-white/20 text-[11px] font-black uppercase tracking-wider">Take a salary</button>
                </div>
                <div>
                    <p className="text-sm text-zinc-300">Pays you a dividend from company cash, and stops at the cash the company holds.</p>
                    <button type="button" data-testid="take-dividend" onClick={() => onApply(drawFromCompany(player, value, 'DIVIDEND'))} className="mt-2 px-4 py-2 rounded-full border border-white/20 text-[11px] font-black uppercase tracking-wider">Take a dividend</button>
                </div>
            </div>
        </div>
    );
};

const Choice: React.FC<{ title: string; body: string; action: string; onClick: () => void }> = ({ title, body, action, onClick }) => (
    <button onClick={onClick} className="text-left rounded-3xl border border-white/10 bg-[#12151c] p-4 hover:border-[#4F3BFF]">
        <div className="font-black uppercase" style={{ fontFamily: headingFont }}>{title}</div>
        <p className="text-sm text-zinc-400 mt-2">{body}</p>
        <div className="text-[11px] uppercase tracking-wider text-[#FFC44D] mt-3">{action}</div>
    </button>
);

const Metric: React.FC<{ label: string; value: string; testId?: string; amount?: number }> = ({ label, value, testId, amount }) => (
    <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-xl font-black" data-testid={testId} data-amount={amount}>{value}</div>
    </div>
);
