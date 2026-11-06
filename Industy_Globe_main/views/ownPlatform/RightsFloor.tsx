import React, { useEffect, useMemo, useState } from 'react';
import { Player, StreamRightKind, StreamRightsListing, StreamTerritoryKind } from '../../types';
import { LAUNCH_REGIONS, getCountry, getRegion } from '../../services/ownPlatform/catalog';
import { formatCompact, formatPeople } from '../../services/ownPlatform/logic';
import {
    RIGHT_LINES,
    RightsQuote,
    TerritoryChoice,
    buyListing,
    dropHolding,
    ensureRightsDesk,
    meetBid,
    openTable,
    quoteDeal,
    raiseBid,
    renewHolding,
    rivalLook,
    signTable,
    walkBid,
    weeksRemaining,
    windowOpen,
} from '../../services/ownPlatform/streamRights';
import { DealRoom } from './DealRoom';
import { Card, MoneyBar, Pill, headingFont } from './ui';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

type Desk = 'FLOOR' | 'VAULT' | 'SELL';
type SortKey = 'LOW' | 'HIGH';

const KINDS: StreamRightKind[] = ['EXCLUSIVE', 'NON_EXCLUSIVE', 'WINDOW'];

const badgeTone = (kind: StreamRightKind): 'run' | 'idle' | 'warn' =>
    kind === 'EXCLUSIVE' ? 'run' : kind === 'WINDOW' ? 'warn' : 'idle';

export const RightsFloor: React.FC<Props> = ({ player, onPlayer }) => {
    const [desk, setDesk] = useState<Desk>('FLOOR');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [kind, setKind] = useState<StreamRightKind>('EXCLUSIVE');
    const [territory, setTerritory] = useState<StreamTerritoryKind>('COUNTRY');
    const [sort, setSort] = useState<SortKey>('LOW');
    const [region, setRegion] = useState('ALL');
    const [format, setFormat] = useState<'ALL' | 'FILM' | 'SHOW'>('ALL');
    const [kindFilter, setKindFilter] = useState<'ALL' | StreamRightKind>('ALL');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const next = ensureRightsDesk(player);
        if (next !== player) onPlayer(next);
    }, [player, onPlayer]);

    const state = player.ownPlatform;
    const rights = state?.streamRights;
    const listings = rights?.listings || [];
    const auction = rights?.auction || null;

    const filtered = useMemo(() => {
        const rows = listings.filter(row => {
            if (region !== 'ALL' && row.regionId !== region) return false;
            if (format !== 'ALL' && row.format !== format) return false;
            if (kindFilter !== 'ALL' && row.suggested !== kindFilter) return false;
            return true;
        });
        rows.sort((a, b) => sort === 'LOW' ? a.basePrice - b.basePrice : b.basePrice - a.basePrice);
        return rows;
    }, [listings, region, format, kindFilter, sort]);

    const selected = listings.find(row => row.id === selectedId) || null;

    const apply = (result: { player: Player; error?: string; note?: string }) => {
        if (result.error) {
            setError(result.error);
            setNotice('');
            return;
        }
        setError('');
        setNotice(result.note || '');
        if (result.player !== player) onPlayer(result.player);
    };

    const choose = (row: StreamRightsListing) => {
        setSelectedId(row.id);
        setKind(auction?.listingId === row.id ? auction.kind : row.suggested);
        setTerritory(auction?.listingId === row.id ? auction.territory : 'COUNTRY');
        setError('');
        setNotice('');
    };

    return (
        <div className="p-4 lg:p-10 space-y-4" data-screen="rights-market" data-testid="rights-market">
            <style>{'@media (prefers-reduced-motion: reduce) { [data-screen="rights-market"] * { animation: none !important; transition: none !important; } }'}</style>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Kahani khareedo</div>
                    <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>
                        {desk === 'VAULT' ? 'Contract Vault' : desk === 'SELL' ? 'Apni film becho' : 'Market Floor'}
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-xl mt-2">Buy shows for Empire+. Every cheque leaves company cash. Personal cash stays put.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {([['FLOOR', 'Market Floor'], ['VAULT', 'Contract Vault'], ['SELL', 'Apni film becho']] as [Desk, string][]).map(([id, label]) => (
                        <button key={id} type="button" data-testid={`rights-tab-${id.toLowerCase()}`} onClick={() => setDesk(id)} className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider ${desk === id ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'}`}>{label}</button>
                    ))}
                </div>
            </div>
            <span className="sr-only" data-testid="rights-personal" data-amount={player.money}>Personal cash is not in this room.</span>
            {desk === 'SELL' && <DealRoom player={player} onPlayer={onPlayer} />}
            {desk === 'VAULT' && (
                <Vault player={player} onRenew={id => apply(renewHolding(player, id))} onDrop={id => apply(dropHolding(player, id))} notice={notice} error={error} />
            )}
            {desk === 'FLOOR' && (
                <>
                    {notice && <p className="text-sm text-emerald-200" data-testid="rights-note">{notice}</p>}
                    {error && <p className="text-sm text-rose-200" data-testid="rights-error">{error}</p>}
                    <div className="flex flex-wrap gap-2" data-testid="rights-filters">
                        <Filter on={sort === 'LOW'} onClick={() => setSort('LOW')}>Price low</Filter>
                        <Filter on={sort === 'HIGH'} onClick={() => setSort('HIGH')}>Price high</Filter>
                        <Filter on={region === 'ALL'} onClick={() => setRegion('ALL')}>All regions</Filter>
                        {LAUNCH_REGIONS.map(row => (
                            <Filter key={row.id} on={region === row.id} onClick={() => setRegion(row.id)}>{row.short}</Filter>
                        ))}
                        <Filter on={format === 'ALL'} onClick={() => setFormat('ALL')}>Film + show</Filter>
                        <Filter on={format === 'FILM'} onClick={() => setFormat('FILM')}>Film</Filter>
                        <Filter on={format === 'SHOW'} onClick={() => setFormat('SHOW')}>Show</Filter>
                        <Filter on={kindFilter === 'ALL'} onClick={() => setKindFilter('ALL')}>Any right</Filter>
                        {KINDS.map(id => (
                            <Filter key={id} on={kindFilter === id} onClick={() => setKindFilter(id)}>{RIGHT_LINES[id].label}</Filter>
                        ))}
                    </div>
                    <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
                        <div className="space-y-2" data-screen="rights-floor">
                            {filtered.length === 0 && <p className="text-xs text-zinc-500">Nothing on the floor matches. Clear a filter, or wait a week.</p>}
                            {filtered.map(row => {
                                const home = getCountry(row.homeCountryId);
                                const ask = quoteDeal(player, row, row.suggested, { territory: 'WORLD' });
                                const rival = row.rivalId ? rivalLook(player, row.rivalId) : null;
                                return (
                                    <button key={row.id} type="button" data-testid={`rights-card-${row.id}`} onClick={() => choose(row)} className={`w-full text-left rounded-2xl border px-4 py-3 ${selectedId === row.id ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <Pill tone={badgeTone(row.suggested)}>{RIGHT_LINES[row.suggested].label}</Pill>
                                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">{row.format === 'SHOW' ? 'Show' : 'Film'}</span>
                                        </div>
                                        <div className="font-black text-xl uppercase leading-none mt-2" style={{ fontFamily: headingFont }}>{row.title}</div>
                                        <div className="text-lg font-black mt-1">{formatCompact(ask.price)}</div>
                                        <div className="text-[11px] text-zinc-400">{row.years} years · {home?.flag} {home?.name} · {getRegion(row.regionId).short}</div>
                                        <p className="text-xs text-zinc-300 mt-1">{ask.liftLine}</p>
                                        <div className="mt-2"><MoneyBar ratio={row.weeksLeft / 8} tone={row.weeksLeft <= 2 ? 'bad' : ''} /></div>
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">{row.weeksLeft} weeks on the floor{rival ? ` · ${rival.name} wants it` : ''}</div>
                                    </button>
                                );
                            })}
                        </div>
                        <div>
                            {!selected && <Card><p className="text-sm text-zinc-400">Pick a title. Exclusive stays only on you. Non-exclusive is cheaper. A window is yours first, then wider.</p></Card>}
                            {selected && (
                                <Negotiation
                                    player={player}
                                    listing={selected}
                                    kind={auction?.listingId === selected.id ? auction.kind : kind}
                                    territory={auction?.listingId === selected.id ? auction.territory : territory}
                                    locked={auction?.listingId === selected.id}
                                    notice={notice}
                                    error={error}
                                    onKind={next => { setKind(next); setNotice(''); setError(''); }}
                                    onTerritory={next => { setTerritory(next); setNotice(''); setError(''); }}
                                    onOpen={() => apply(openTable(player, selected.id, kind, choiceFor(selected, territory)))}
                                    onBuy={() => apply(buyListing(player, selected.id, kind, choiceFor(selected, territory)))}
                                    onRaise={() => apply(raiseBid(player))}
                                    onMeet={() => apply(meetBid(player))}
                                    onWalk={() => apply(walkBid(player))}
                                    onSign={() => apply(signTable(player))}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const choiceFor = (listing: StreamRightsListing, territory: StreamTerritoryKind): TerritoryChoice => ({
    territory,
    countryId: listing.homeCountryId,
    regionId: listing.regionId,
});

const Filter: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
    <button type="button" onClick={onClick} className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${on ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'}`}>{children}</button>
);

const Negotiation: React.FC<{
    player: Player;
    listing: StreamRightsListing;
    kind: StreamRightKind;
    territory: StreamTerritoryKind;
    locked: boolean;
    notice: string;
    error: string;
    onKind: (kind: StreamRightKind) => void;
    onTerritory: (territory: StreamTerritoryKind) => void;
    onOpen: () => void;
    onBuy: () => void;
    onRaise: () => void;
    onMeet: () => void;
    onWalk: () => void;
    onSign: () => void;
}> = ({ player, listing, kind, territory, locked, notice, error, onKind, onTerritory, onOpen, onBuy, onRaise, onMeet, onWalk, onSign }) => {
    const auction = player.ownPlatform?.streamRights?.auction;
    const live = auction?.listingId === listing.id ? auction : null;
    const quote: RightsQuote = live
        ? { ...quoteDeal(player, listing, live.kind, { territory: live.territory, countryId: live.countryId, regionId: live.regionId }), price: live.playerBid }
        : quoteDeal(player, listing, kind, choiceFor(listing, territory));
    const rival = listing.rivalId ? rivalLook(player, listing.rivalId) : null;
    const home = getCountry(listing.homeCountryId);
    const heat = live ? Math.min(100, (live.rivalBid / Math.max(live.rivalCeiling, 1)) * 100) : listing.rivalId ? 55 : 0;
    return (
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-3" data-screen="rights-table" data-testid="rights-table">
            <Card>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Negotiation table</div>
                <div className="text-3xl font-black uppercase leading-none mt-1" style={{ fontFamily: headingFont }}>{listing.title}</div>
                <div className="text-xs text-zinc-400 mt-2">{listing.genre} · {listing.language} · {listing.years} years</div>
                <div className="mt-3"><MoneyBar ratio={listing.weeksLeft / 8} tone={listing.weeksLeft <= 2 ? 'bad' : ''} /></div>
                <div className="text-[11px] text-zinc-500 mt-1">{listing.weeksLeft} weeks until it leaves the floor</div>
                <div className="mt-4 text-[11px] uppercase text-zinc-500">Your bid</div>
                <div className="text-4xl font-black" style={{ fontFamily: headingFont }} data-testid="rights-bid">{formatCompact(live ? live.playerBid : quote.price)}</div>
                <p className="text-xs text-zinc-400 mt-1">{quote.liftLine}</p>
                {rival && (
                    <div className="mt-4 rounded-2xl border border-white/10 p-3" data-testid="rights-rival">
                        <div className="text-[11px] uppercase tracking-wider" style={{ color: rival.color }}>Rival interest</div>
                        <div className="font-bold">{rival.name}</div>
                        <p className="text-xs text-zinc-400">They want this title. Raise, meet their number, or walk away unpaid.</p>
                        <div className="mt-2"><MoneyBar ratio={heat / 100} tone="bad" /></div>
                        {live && <div className="text-sm mt-2">Their bid <b>{formatCompact(live.rivalBid)}</b></div>}
                    </div>
                )}
                <p className="text-[11px] text-zinc-500 mt-3">Company cash only. Personal cash does not move.</p>
            </Card>
            <div className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                    {KINDS.map(id => (
                        <button key={id} type="button" data-testid={`rights-${id.toLowerCase().replace('_', '-')}`} disabled={locked} onClick={() => onKind(id)} className={`text-left rounded-2xl border p-3 ${kind === id ? 'border-[#4F3BFF] bg-[#4F3BFF]/15' : 'border-white/10 bg-[#12151c]'} ${locked ? 'opacity-70' : ''}`}>
                            <Pill tone={badgeTone(id)}>{RIGHT_LINES[id].label}</Pill>
                            <p className="text-xs text-zinc-300 mt-2">{RIGHT_LINES[id].line}</p>
                        </button>
                    ))}
                </div>
                <div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Territory</div>
                    <div className="flex flex-wrap gap-2">
                        <Chip on={territory === 'WORLD'} disabled={locked} onClick={() => onTerritory('WORLD')} testid="rights-world">World</Chip>
                        <Chip on={territory === 'REGION'} disabled={locked} onClick={() => onTerritory('REGION')} testid="rights-region">{getRegion(listing.regionId).name}</Chip>
                        <Chip on={territory === 'COUNTRY'} disabled={locked} onClick={() => onTerritory('COUNTRY')} testid="rights-country">{home?.flag} {home?.name}</Chip>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">{quote.territoryLine}</p>
                    {quote.discountLine && <p className="text-xs text-emerald-200 mt-1" data-testid="rights-discount">{quote.discountLine}</p>}
                </div>
                <div className="space-y-2">
                    <BidRow rank={1} name="You" color="#c9f2ff" detail={`${RIGHT_LINES[quote.kind].label} · ${quote.territoryName} · ${quote.years} years`} amount={live ? live.playerBid : quote.price} action={live ? 'Sign' : listing.rivalId ? 'Open table' : 'Sign'} testid={live || !listing.rivalId ? 'rights-buy' : 'open-rights-table'} onAction={live ? onSign : listing.rivalId ? onOpen : onBuy} />
                    {live && rival && (
                        <BidRow rank={2} name={rival.name} color={rival.color} detail="At the table. They do not pay you." amount={live.rivalBid} />
                    )}
                </div>
                {live && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" data-testid="rights-raise" onClick={onRaise} className="px-4 py-2 rounded-full bg-[#4F3BFF] text-xs font-black uppercase tracking-wider">Raise</button>
                        <button type="button" data-testid="rights-meet" onClick={onMeet} className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">Meet</button>
                        <button type="button" data-testid="rights-walk" onClick={onWalk} className="px-4 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-wider">Walk</button>
                    </div>
                )}
                <p className="text-[11px] text-zinc-500">Raise adds a step. The rival may answer. Meet matches them. Walk pays nothing, and they may take the title. Sign closes it if you are ahead.</p>
                {notice && <p className="text-sm text-emerald-200" data-testid="rights-note">{notice}</p>}
                {error && <p className="text-sm text-rose-200" data-testid="rights-error">{error}</p>}
            </div>
        </div>
    );
};

const Chip: React.FC<{ on: boolean; disabled?: boolean; onClick: () => void; testid: string; children: React.ReactNode }> = ({ on, disabled, onClick, testid, children }) => (
    <button type="button" data-testid={testid} disabled={disabled} onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-bold ${on ? 'bg-[#4F3BFF] text-white' : 'bg-white/10 text-zinc-200'} ${disabled ? 'opacity-70' : ''}`}>{children}</button>
);

const BidRow: React.FC<{ rank: number; name: string; color: string; detail: string; amount: number; action?: string; testid?: string; onAction?: () => void }> = ({ rank, name, color, detail, amount, action, testid, onAction }) => (
    <div className="rounded-2xl border border-white/10 bg-[#141820] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-8 font-black text-zinc-500">{rank}</div>
        <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ color }}>{name}</div>
            <div className="text-[11px] text-zinc-400">{detail}</div>
        </div>
        <div className="text-right">
            <div className="text-2xl font-black">{formatCompact(amount)}</div>
            {action && onAction && <button type="button" data-testid={testid} onClick={onAction} className="mt-1 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white" style={{ background: color === '#c9f2ff' ? '#4F3BFF' : color }}>{action}</button>}
        </div>
    </div>
);

const Vault: React.FC<{ player: Player; onRenew: (id: string) => void; onDrop: (id: string) => void; notice: string; error: string }> = ({ player, onRenew, onDrop, notice, error }) => {
    const holdings = player.ownPlatform?.streamRights?.holdings || [];
    const due = holdings.filter(row => {
        const left = weeksRemaining(player, row);
        return left > 0 && left <= 8;
    });
    return (
        <div className="space-y-3" data-screen="rights-vault" data-testid="rights-vault">
            {due.length > 0 && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3" data-testid="rights-reminder">
                    <div className="text-[11px] uppercase tracking-wider text-amber-200">Weekly reminder</div>
                    {due.map(row => <p key={row.id} className="text-sm text-amber-50">{row.title} expires in {weeksRemaining(player, row)} weeks. Renew or drop it.</p>)}
                </div>
            )}
            {notice && <p className="text-sm text-emerald-200" data-testid="vault-note">{notice}</p>}
            {error && <p className="text-sm text-rose-200">{error}</p>}
            {holdings.length === 0 && <Card><p className="text-sm text-zinc-400">The vault is empty. Sign a title on the market floor, or put one of your films on Empire+.</p></Card>}
            <div className="grid md:grid-cols-2 gap-3">
                {holdings.map(row => {
                    const left = weeksRemaining(player, row);
                    const total = Math.max(left, row.years * 52);
                    const country = row.countryId ? getCountry(row.countryId) : undefined;
                    const place = row.territory === 'WORLD' ? 'World' : row.territory === 'REGION' ? getRegion(row.regionId || 'ASIA').name : (country?.name || 'One country');
                    const renewCost = row.paid > 0 ? Math.round(row.paid * 0.72) : 0;
                    return (
                        <div key={row.id} data-testid={`vault-card-${row.id}`} className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1730] to-[#12151c] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Pill tone={badgeTone(row.kind)}>{RIGHT_LINES[row.kind].label}</Pill>
                                <Pill tone={row.source === 'OWN_FILM' ? 'ok' : 'idle'}>{row.source === 'OWN_FILM' ? 'Apni film' : 'Licensed'}</Pill>
                                {row.kind === 'WINDOW' && <Pill tone={windowOpen(player, row) ? 'warn' : 'idle'}>{windowOpen(player, row) ? 'Window open' : 'Window widened'}</Pill>}
                            </div>
                            <div className="text-3xl font-black uppercase leading-none mt-2" style={{ fontFamily: headingFont }}>{row.title}</div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-1 rounded-full bg-white/10 text-[11px]">{place}</span>
                                <span className="px-2 py-1 rounded-full bg-white/10 text-[11px]">{row.years} years</span>
                                <span className="px-2 py-1 rounded-full bg-white/10 text-[11px]">{row.format === 'SHOW' ? 'Show' : 'Film'}</span>
                            </div>
                            <div className="mt-3"><MoneyBar ratio={left / total} tone={left <= 8 ? 'bad' : left <= 16 ? '' : 'go'} /></div>
                            <div className="text-[11px] uppercase tracking-wider text-zinc-400 mt-1" data-testid="vault-expiry">{left} weeks left</div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                <div className="rounded-xl bg-black/30 p-2"><div className="text-[10px] uppercase text-zinc-500">Subs / week</div><div className="font-black">+{formatPeople(row.weeklySubs)}</div></div>
                                <div className="rounded-xl bg-black/30 p-2"><div className="text-[10px] uppercase text-zinc-500">Earn / week</div><div className="font-black">{formatCompact(row.lastEarn || row.weeklyEarn)}</div></div>
                            </div>
                            <p className="text-xs text-zinc-400 mt-2">About +{formatPeople(row.lift)} subscribers over the deal.</p>
                            <p className="text-xs text-zinc-500">Renew keeps the same deal. {renewCost > 0 ? `${formatCompact(renewCost)} from company cash.` : 'Your film renews free.'} Drop lets it go. A hit leaving costs subscribers.</p>
                            <div className="flex gap-2 mt-3">
                                <button type="button" data-testid="rights-renew" onClick={() => onRenew(row.id)} className="px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">Renew</button>
                                <button type="button" data-testid="rights-drop" onClick={() => onDrop(row.id)} className="px-4 py-2 rounded-full border border-white/20 text-[11px] font-black uppercase tracking-wider">Drop</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
