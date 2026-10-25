import React, { useEffect, useMemo, useState } from 'react';
import { Business, Player, ProjectType } from '../../../types';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import {
    IpRecord, REGION_LABEL, RIGHTS_REGIONS, displayAuthor, displayTitle, loadCatalogue, preferredFormat,
} from '../../../services/rights/catalogue';
import { FAMOUS_FAME, OPTION_WEEKS } from '../../../services/rights/formulas';
import {
    PaySource, RightsResult, allRecords, developIp, exerciseOption, exclusiveHold, lifeAsk,
    negotiateLife, optionBook, playerHolding, quoteRecord, raiseBid, rightsOf, rivalHasVersion,
    shareBid, takePublicDomain, walkBid,
} from '../../../services/rights/logic';

interface Props {
    player: Player;
    studio?: Business;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
}

type Tab = 'CATALOGUE' | 'MINE' | 'HOT';
type SortKey = 'FAME' | 'PRICE' | 'YEAR' | 'TITLE';

const money = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${Math.round(value)}`;
};

const studioOf = (player: Player, studio?: Business) =>
    studio || player.businesses?.find(business => business.type === 'PRODUCTION_HOUSE');

export const RightsLibrary: React.FC<Props> = ({ player, studio, onBack, onUpdatePlayer }) => {
    const house = studioOf(player, studio);
    const [records, setRecords] = useState<IpRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('CATALOGUE');
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState('ALL');
    const [country, setCountry] = useState('ALL');
    const [language, setLanguage] = useState('ALL');
    const [kind, setKind] = useState('ALL');
    const [genre, setGenre] = useState('ALL');
    const [sport, setSport] = useState('ALL');
    const [domain, setDomain] = useState('ALL');
    const [availability, setAvailability] = useState('ALL');
    const [priceBand, setPriceBand] = useState('ALL');
    const [sort, setSort] = useState<SortKey>('FAME');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [format, setFormat] = useState<ProjectType>('MOVIE');
    const [fidelity, setFidelity] = useState(35);
    const [source, setSource] = useState<PaySource>('STUDIO');
    const [notice, setNotice] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadCatalogue().then(rows => {
            if (cancelled) return;
            setRecords(rows);
            setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const library = rightsOf(house);
    const absolute = getAbsoluteWeek(player.age, player.currentWeek);
    const merged = useMemo(() => allRecords(player).length ? allRecords(player) : records, [player, records]);
    const selected = merged.find(row => row.id === selectedId) || null;

    const countries = useMemo(() => Array.from(new Set(merged.map(row => row.countryName))).sort(), [merged]);
    const languages = useMemo(() => Array.from(new Set(merged.map(row => row.language))).sort(), [merged]);
    const genres = useMemo(() => Array.from(new Set(merged.flatMap(row => row.genres))).sort(), [merged]);
    const sports = useMemo(() => Array.from(new Set(merged.map(row => row.sport).filter(Boolean) as string[])).sort(), [merged]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const rows = merged.filter(row => {
            if (tab === 'HOT' && !row.hot) return false;
            if (tab === 'MINE') {
                const mine = library.holdings.some(holding => holding.ipId === row.id && holding.owner === 'PLAYER' && holding.status !== 'LOST');
                if (!mine) return false;
            }
            if (region !== 'ALL' && row.region !== region) return false;
            if (country !== 'ALL' && row.countryName !== country) return false;
            if (language !== 'ALL' && row.language !== language) return false;
            if (kind === 'BOOK' && row.kind !== 'BOOK') return false;
            if (kind === 'LIFE' && row.kind !== 'LIFE') return false;
            if (genre !== 'ALL' && !row.genres.includes(genre)) return false;
            if (sport !== 'ALL' && row.sport !== sport) return false;
            if (domain === 'PUBLIC' && !row.publicDomain) return false;
            if (domain === 'COPYRIGHT' && row.publicDomain) return false;
            const taken = Boolean(exclusiveHold(player, row)) || Boolean(playerHolding(player, house?.id || '', row.id));
            if (availability === 'AVAILABLE' && taken && !row.publicDomain) return false;
            if (availability === 'TAKEN' && !taken) return false;
            const price = row.publicDomain ? 0 : row.kind === 'LIFE' ? row.purchaseUsd : row.optionUsd;
            if (priceBand === 'FREE' && price > 0) return false;
            if (priceBand === 'UNDER_100K' && (price <= 0 || price >= 100_000)) return false;
            if (priceBand === 'UNDER_1M' && (price < 100_000 || price >= 1_000_000)) return false;
            if (priceBand === 'UNDER_10M' && (price < 1_000_000 || price >= 10_000_000)) return false;
            if (priceBand === 'OVER_10M' && price < 10_000_000) return false;
            if (!needle) return true;
            const blob = `${displayTitle(row)} ${row.proper} ${row.descriptor} ${displayAuthor(row)} ${row.countryName} ${row.sport || ''} ${row.genres.join(' ')}`.toLowerCase();
            return blob.includes(needle);
        });
        rows.sort((a, b) => {
            if (sort === 'PRICE') return (a.purchaseUsd || a.optionUsd) - (b.purchaseUsd || b.optionUsd);
            if (sort === 'YEAR') return b.year - a.year;
            if (sort === 'TITLE') return displayTitle(a).localeCompare(displayTitle(b));
            return b.fame - a.fame;
        });
        return rows;
    }, [merged, query, region, country, language, kind, genre, sport, domain, availability, priceBand, sort, tab, library.holdings, player, house?.id]);

    const apply = (result: RightsResult) => {
        setNotice(result.error || result.note || '');
        if (!result.error) onUpdatePlayer(result.player);
    };

    const open = (row: IpRecord) => {
        setSelectedId(row.id);
        setFormat(preferredFormat(row));
        setFidelity(30);
        setNotice('');
    };

    return (
        <div data-screen="rights-library" className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
            <header className="shrink-0 border-b border-zinc-800 px-4 py-3 lg:px-8 lg:py-5 flex items-start justify-between gap-3">
                <div>
                    <button onClick={onBack} className="text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">Back</button>
                    <h1 className="text-2xl lg:text-4xl font-black uppercase tracking-tight">Rights Library</h1>
                    <p className="text-xs lg:text-sm text-zinc-400 max-w-xl">Books and life stories for your studio and every rival. Public domain is free. Famous books go to auction.</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                    <div>Studio {money(house?.balance || 0)}</div>
                    <div>Treasury {money(player.money || 0)}</div>
                </div>
            </header>
            <div className="shrink-0 px-4 lg:px-8 py-3 flex gap-2 overflow-x-auto border-b border-zinc-900">
                {([['CATALOGUE', 'Catalogue'], ['MINE', 'My rights'], ['HOT', 'Hot this year']] as [Tab, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider ${tab === id ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400'}`}>{label}</button>
                ))}
                <button onClick={() => setFiltersOpen(value => !value)} className="lg:hidden shrink-0 px-4 py-2 rounded-full bg-zinc-900 text-[11px] font-black uppercase tracking-wider">Filters</button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block lg:w-72 shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 space-y-3`}>
                    <input data-testid="rights-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, places, sports" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm" />
                    <Select label="Region" value={region} onChange={setRegion} options={[['ALL', 'Every region'], ...RIGHTS_REGIONS.map(id => [id, REGION_LABEL[id]] as [string, string])]} />
                    <Select label="Country" value={country} onChange={setCountry} options={[['ALL', 'Every country'], ...countries.map(name => [name, name] as [string, string])]} />
                    <Select label="Language" value={language} onChange={setLanguage} options={[['ALL', 'Every language'], ...languages.map(name => [name, name] as [string, string])]} />
                    <Select testId="rights-type" label="Type" value={kind} onChange={setKind} options={[['ALL', 'Books and lives'], ['BOOK', 'Books'], ['LIFE', 'Life stories']]} />
                    <Select label="Genre" value={genre} onChange={setGenre} options={[['ALL', 'Every genre'], ...genres.map(name => [name, name.replace(/_/g, ' ')] as [string, string])]} />
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Sport
                        <select data-testid="rights-sport" value={sport} onChange={event => setSport(event.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
                            <option value="ALL">Every sport</option>
                            {sports.map(name => <option key={name} value={name}>{name.replace(/_/g, ' ')}</option>)}
                        </select>
                    </label>
                    <Select testId="rights-domain" label="Rights" value={domain} onChange={setDomain} options={[['ALL', 'Any'], ['PUBLIC', 'Public domain'], ['COPYRIGHT', 'Copyrighted']]} />
                    <Select label="Availability" value={availability} onChange={setAvailability} options={[['ALL', 'Available or taken'], ['AVAILABLE', 'Available'], ['TAKEN', 'Taken']]} />
                    <Select label="Price" value={priceBand} onChange={setPriceBand} options={[['ALL', 'Any price'], ['FREE', 'Free'], ['UNDER_100K', 'Under $100k'], ['UNDER_1M', '$100k–$1M'], ['UNDER_10M', '$1M–$10M'], ['OVER_10M', '$10M+']]} />
                    <Select label="Sort" value={sort} onChange={value => setSort(value as SortKey)} options={[['FAME', 'Fame'], ['PRICE', 'Price'], ['YEAR', 'Year'], ['TITLE', 'Title']]} />
                    <p className="text-[11px] text-zinc-500">{loading ? 'Opening the stacks…' : `${filtered.length.toLocaleString()} titles`}</p>
                </aside>
                <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
                    {library.activity.length > 0 && (
                        <div data-testid="rights-activity" className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trades</div>
                            {library.activity.slice(0, 4).map(row => (
                                <p key={row.id} className="text-sm text-zinc-200">{row.headline}</p>
                            ))}
                        </div>
                    )}
                    {loading && <p className="text-zinc-400">Loading the worldwide catalogue…</p>}
                    {!loading && filtered.length === 0 && <p className="text-zinc-500">Nothing matches those filters.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filtered.slice(0, 120).map(row => {
                            const holding = library.holdings.find(item => item.ipId === row.id && item.owner === 'PLAYER' && item.status !== 'LOST');
                            const quote = quoteRecord(player, row, row.kind === 'LIFE' || row.publicDomain ? 'purchase' : 'option');
                            return (
                                <button key={row.id} data-testid="rights-card" data-kind={row.kind} data-sport={row.sport || ''} data-domain={row.publicDomain ? 'public' : 'copyright'} data-fame={row.fame} onClick={() => open(row)} className="text-left rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:border-amber-500/60">
                                    <div className="flex justify-between gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                                        <span>{row.kind === 'BOOK' ? row.genres[0]?.replace(/_/g, ' ') : (row.sport || row.categoryLabel || 'Life')}</span>
                                        <span>{row.publicDomain ? 'Public domain' : row.hot ? 'Hot' : row.fame >= FAMOUS_FAME ? 'Auction' : 'Option'}</span>
                                    </div>
                                    <div className="mt-2 font-black text-lg leading-tight">{displayTitle(row)}</div>
                                    <div className="text-xs text-zinc-400 mt-1">{displayAuthor(row)} · {row.countryName}</div>
                                    <div className="mt-3 flex justify-between text-xs">
                                        <span className="text-amber-400">Fame {row.fame}</span>
                                        <span>{holding ? holding.status : quote.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {filtered.length > 120 && <p className="text-xs text-zinc-500 mt-4">Showing the first 120. Narrow the filters to see the rest.</p>}
                </main>
            </div>
            {selected && (
                <Detail
                    player={player}
                    house={house}
                    ip={selected}
                    format={format}
                    fidelity={fidelity}
                    source={source}
                    notice={notice}
                    absolute={absolute}
                    onFormat={setFormat}
                    onFidelity={setFidelity}
                    onSource={setSource}
                    onClose={() => setSelectedId(null)}
                    onApply={apply}
                />
            )}
        </div>
    );
};

const Select: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: [string, string][]; testId?: string }> = ({ label, value, onChange, options, testId }) => (
    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}
        <select data-testid={testId} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
            {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
    </label>
);

const Detail: React.FC<{
    player: Player;
    house?: Business;
    ip: IpRecord;
    format: ProjectType;
    fidelity: number;
    source: PaySource;
    notice: string;
    absolute: number;
    onFormat: (format: ProjectType) => void;
    onFidelity: (value: number) => void;
    onSource: (source: PaySource) => void;
    onClose: () => void;
    onApply: (result: RightsResult) => void;
}> = ({ player, house, ip, format, fidelity, source, notice, absolute, onFormat, onFidelity, onSource, onClose, onApply }) => {
    if (!house) {
        return (
            <Sheet onClose={onClose}>
                <h2 className="text-2xl font-black">{displayTitle(ip)}</h2>
                <p className="text-sm text-zinc-400 mt-2">Open a production house before you can buy rights.</p>
            </Sheet>
        );
    }
    const holding = rightsOf(house).holdings.find(row => row.ipId === ip.id && row.owner === 'PLAYER');
    const bid = rightsOf(house).bids.find(row => row.ipId === ip.id && row.status === 'OPEN');
    const optionQuote = quoteRecord(player, ip, 'option');
    const buyQuote = quoteRecord(player, ip, 'purchase');
    const ask = ip.kind === 'LIFE' ? lifeAsk(player, ip) : null;
    const preferred = preferredFormat(ip);
    const weeksLeft = holding?.expiresWeek ? holding.expiresWeek - absolute : null;
    const rival = rivalHasVersion(player, ip.id);
    const run = (result: RightsResult) => onApply(result);

    return (
        <Sheet onClose={onClose}>
            <div className="text-[10px] uppercase tracking-widest text-amber-500">{ip.kind === 'BOOK' ? 'Book' : 'Life rights'} · {ip.region.replace(/_/g, ' ')}</div>
            <h2 className="text-3xl font-black leading-none mt-1">{displayTitle(ip)}</h2>
            <p className="text-sm text-zinc-400 mt-2">{displayAuthor(ip)} · {ip.countryName} · {ip.language} · {ip.year}</p>
            <p className="text-sm text-zinc-300 mt-3">{ip.logline}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <Fact label="Fame" value={String(ip.fame)} />
                <Fact label="Shape" value={preferred === 'SERIES' ? `${ip.seasons || 1} seasons` : ip.length || 'story'} />
                <Fact label="Option" value={optionQuote.label} />
                <Fact label="Purchase" value={buyQuote.label} />
                <Fact label="Holder" value={ip.holder} />
                <Fact label="Status" value={holding ? holding.status : rival ? 'Rival version' : 'Available'} />
            </div>
            {ip.fans?.length > 0 && (
                <p className="text-[11px] text-zinc-500 mt-3">Home crowd {Math.max(...ip.fans)}. That fan base lifts box office and streaming in its region, and is the hook for a later dub.</p>
            )}
            {holding?.status === 'OPTION' && weeksLeft !== null && (
                <p className="mt-3 text-sm text-amber-300">Option expires in {Math.max(0, weeksLeft)} weeks. {OPTION_WEEKS} weeks is the full term.</p>
            )}
            {holding?.franchiseFlag && <p className="mt-2 text-sm text-emerald-300">Franchise flag is up. Sequels and merchandise can use it later.</p>}
            {notice && <p className="mt-3 text-sm text-amber-200">{notice}</p>}
            <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Pay from</div>
                <div className="flex gap-2 mt-2">
                    {(['STUDIO', 'EMPIRE', 'LOAN'] as PaySource[]).map(id => (
                        <button key={id} onClick={() => onSource(id)} className={`px-3 py-2 rounded-full text-[10px] font-black uppercase ${source === id ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>
                            {id === 'STUDIO' ? 'Studio cash' : id === 'EMPIRE' ? 'Empire+' : 'Loan'}
                        </button>
                    ))}
                </div>
            </div>
            {bid && (
                <div className="mt-4 rounded-2xl border border-amber-500/40 p-3">
                    <div className="font-black">Bidding war vs {bid.rivalName}</div>
                    <p className="text-sm text-zinc-400 mt-1">You {money(bid.playerUsd)} · them {money(bid.rivalUsd)} · round {bid.round + 1}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button data-testid="rights-raise" onClick={() => run(raiseBid(player, house.id, ip.id, source))} className="px-3 py-2 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase">Raise</button>
                        <button data-testid="rights-share-bid" onClick={() => run(shareBid(player, house.id, ip.id, source))} className="px-3 py-2 rounded-full bg-zinc-800 text-[10px] font-black uppercase">Profit share</button>
                        <button data-testid="rights-walk" onClick={() => run(walkBid(player, house.id, ip.id))} className="px-3 py-2 rounded-full bg-zinc-800 text-[10px] font-black uppercase">Walk away</button>
                    </div>
                </div>
            )}
            {!bid && ip.kind === 'BOOK' && !ip.publicDomain && holding?.status !== 'OWNED' && holding?.status !== 'OPTION' && (
                <button data-testid="rights-option" onClick={() => run(optionBook(player, house.id, ip.id, source))} className="mt-4 w-full py-3 rounded-full bg-amber-500 text-black font-black uppercase tracking-wider text-xs">
                    {ip.fame >= FAMOUS_FAME ? `Open bidding war · ${optionQuote.label}` : `Option for 18 months · ${optionQuote.label}`}
                </button>
            )}
            {holding?.status === 'OPTION' && (
                <button onClick={() => run(exerciseOption(player, house.id, ip.id, source))} className="mt-4 w-full py-3 rounded-full bg-white text-black font-black uppercase tracking-wider text-xs">Buy the rights · {buyQuote.label}</button>
            )}
            {ip.publicDomain && !holding && (
                <button data-testid="rights-pd" onClick={() => run(takePublicDomain(player, house.id, ip.id))} className="mt-4 w-full py-3 rounded-full bg-emerald-500 text-black font-black uppercase tracking-wider text-xs">Take the public-domain rights</button>
            )}
            {ask && !ip.publicDomain && holding?.status !== 'OWNED' && (
                <div className="mt-4 rounded-2xl border border-zinc-800 p-3 space-y-2">
                    <div className="font-black">Life-rights table</div>
                    <p className="text-sm text-zinc-400">{ask.tone}</p>
                    <p className="text-sm">Ask {money(ask.priceUsd)} · {ask.localLabel}{ask.profitShare ? ` · ${ask.profitShare}% profit` : ''}{ask.finalCut ? ' · final cut' : ''}{ask.cameo ? ' · cameo' : ''}</p>
                    <div className="flex flex-wrap gap-2">
                        <button data-testid="rights-life-accept" onClick={() => run(negotiateLife(player, house.id, ip.id, 'ACCEPT', source))} className="px-3 py-2 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase">Accept</button>
                        <button onClick={() => run(negotiateLife(player, house.id, ip.id, 'SWEETEN', source))} className="px-3 py-2 rounded-full bg-zinc-800 text-[10px] font-black uppercase">Sweeten the cheque</button>
                        <button onClick={() => run(negotiateLife(player, house.id, ip.id, 'SHARE', source))} className="px-3 py-2 rounded-full bg-zinc-800 text-[10px] font-black uppercase">Offer a share</button>
                        <button onClick={() => run(negotiateLife(player, house.id, ip.id, 'WALK', source))} className="px-3 py-2 rounded-full bg-zinc-800 text-[10px] font-black uppercase">Walk</button>
                        <button onClick={() => run(negotiateLife(player, house.id, ip.id, 'WITHOUT', source))} className="px-3 py-2 rounded-full bg-rose-700 text-[10px] font-black uppercase">Shoot without rights</button>
                    </div>
                </div>
            )}
            {(holding?.status === 'OWNED' || holding?.status === 'OPTION' || ip.publicDomain && holding) && !holding?.developedScriptId && (
                <div className="mt-4 rounded-2xl border border-zinc-800 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Development Lab</div>
                    <p className="text-xs text-zinc-400 mt-1">{preferred === 'SERIES' ? 'A series fits.' : 'A film fits.'} The other shape is allowed, with a quality penalty. Faithful pleases fans and the author. Loose travels further.</p>
                    <div className="flex gap-2 mt-3">
                        {(['MOVIE', 'SERIES'] as ProjectType[]).map(id => (
                            <button key={id} onClick={() => onFormat(id)} className={`px-3 py-2 rounded-full text-[10px] font-black uppercase ${format === id ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>{id === 'MOVIE' ? 'Movie' : 'Web series'}</button>
                        ))}
                    </div>
                    <label className="block mt-3 text-[10px] uppercase tracking-widest text-zinc-500">Fidelity {fidelity <= 30 ? 'Faithful' : fidelity >= 70 ? 'Loose' : 'Balanced'}
                        <input data-testid="rights-fidelity" type="range" min={0} max={100} value={fidelity} onChange={event => onFidelity(Number(event.target.value))} className="w-full mt-2" />
                    </label>
                    <button data-testid="rights-develop" onClick={() => run(developIp(player, house.id, ip.id, format, fidelity))} className="mt-3 w-full py-3 rounded-full bg-white text-black font-black uppercase tracking-wider text-xs">Send to Development Lab</button>
                </div>
            )}
            {holding?.developedScriptId && <p className="mt-4 text-sm text-emerald-300">Already in the Development Lab.</p>}
        </Sheet>
    );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-xl bg-zinc-900 px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
        <div className="font-bold truncate">{value}</div>
    </div>
);

const Sheet: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end lg:items-stretch lg:justify-end" onClick={onClose}>
        <div data-testid="rights-detail" className="w-full lg:w-[440px] max-h-[92vh] lg:max-h-none overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl lg:rounded-none p-5" onClick={event => event.stopPropagation()}>
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Close</button>
            {children}
        </div>
    </div>
);
