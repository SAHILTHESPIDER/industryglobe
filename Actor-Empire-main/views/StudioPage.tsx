import React, { useMemo, useState } from 'react';
import { Player, NPCActor, StudioContract, PaymentMode } from '../types';
import {
    Users, Star, TrendingUp, DollarSign, X, Check, Info, Film, ShieldAlert, PenTool,
    Search, Lock, Wallet, Flame, Scissors, ArrowUpDown, BadgeDollarSign, Gauge
} from 'lucide-react';
import { getAvailableTalent, NPC_DATABASE } from '../services/npcLogic';
import { calculateNPCAsk, evaluateOffer, createContract } from '../services/talentService';

interface StudioPageProps {
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onBack: () => void;
    businessId?: string;
}

type Tab = 'ROSTER' | 'MARKET';
type SortKey = 'FAME' | 'TALENT' | 'ASK';
type TierFilter = 'ALL' | 'UNKNOWN' | 'ESTABLISHED';

const MAX_ATTEMPTS = 3;
const COOLDOWN_WEEKS = 12;
const WEEKLY_PREMIUM = 1.1;
const INSTALLMENT_WEEKS = 52;

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const parseMoney = (s: string) => parseInt(s.replace(/,/g, '')) || 0;

export const StudioPage: React.FC<StudioPageProps> = ({ player, onUpdatePlayer, onBack, businessId }) => {
    const [activeTab, setActiveTab] = useState<Tab>('ROSTER');
    const [selectedNPC, setSelectedNPC] = useState<NPCActor | null>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPFRONT');
    const [negotiationDuration, setNegotiationDuration] = useState(3);
    const [offerAmountStr, setOfferAmountStr] = useState('');
    const [negotiationResult, setNegotiationResult] = useState<{ success: boolean; message: string; maintenanceFee?: number } | null>(null);

    // Market controls
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('FAME');

    // Roster controls
    const [releaseTarget, setReleaseTarget] = useState<StudioContract | null>(null);

    const studio = (businessId && player.businesses.find(b => b.id === businessId))
        || player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');

    const studioCount = player.businesses.filter(b => b.type === 'PRODUCTION_HOUSE').length;
    const signedContracts: StudioContract[] = studio?.studioState?.talentRoster
        || (studioCount <= 1 ? player.studio?.talentRoster : undefined)
        || [];

    const allSignedNpcIds = new Set([
        ...player.businesses.flatMap(b => b.studioState?.talentRoster || []).map(c => c.npcId),
        ...(player.studio?.talentRoster || []).map(c => c.npcId),
    ]);

    const studioMemory = player.studioMemory || {};
    const cooldowns: Record<string, number> = studioMemory.cooldowns || {};
    const attempts: Record<string, number> = studioMemory.attempts || {};

    const extraNPCs = player.flags.extraNPCs || [];

    const rawMarket = useMemo(
        () => getAvailableTalent(player.currentWeek, 'ACTOR', extraNPCs).filter(npc => !allSignedNpcIds.has(npc.id)),
        [player.currentWeek, extraNPCs, allSignedNpcIds]
    );

    const market = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rawMarket
            .filter(npc => tierFilter === 'ALL' || (tierFilter === 'UNKNOWN' ? npc.tier === 'UNKNOWN' : npc.tier !== 'UNKNOWN'))
            .filter(npc => !q || npc.name.toLowerCase().includes(q))
            .sort((a, b) => {
                if (sortKey === 'FAME') return (b.stats?.fame || 0) - (a.stats?.fame || 0);
                if (sortKey === 'TALENT') return (b.stats?.talent || 0) - (a.stats?.talent || 0);
                return calculateNPCAsk(a, 1).totalAmount - calculateNPCAsk(b, 1).totalAmount;
            });
    }, [rawMarket, search, tierFilter, sortKey]);

    const getNPCById = (id: string) => [...rawMarket, ...NPC_DATABASE, ...extraNPCs].find(n => n.id === id);

    // Studio overview numbers
    const weeklyUpkeep = signedContracts.reduce((s, c) => s + (c.maintenanceFee || 0), 0);
    const rosterNPCs = signedContracts.map(c => getNPCById(c.npcId)).filter(Boolean) as NPCActor[];
    const avgFame = rosterNPCs.length ? rosterNPCs.reduce((s, n) => s + (n.stats?.fame || 0), 0) / rosterNPCs.length : 0;
    const nearExpiry = signedContracts.filter(c => c.moviesRemaining <= 1).length;

    // Negotiation derived values
    const ask = selectedNPC ? calculateNPCAsk(selectedNPC, negotiationDuration) : null;
    const offerAmount = parseMoney(offerAmountStr);
    const offerTotal = paymentMode === 'UPFRONT' ? offerAmount : offerAmount * INSTALLMENT_WEEKS;
    const askTotal = ask ? (paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment * INSTALLMENT_WEEKS) : 0;
    const offerRatio = askTotal > 0 ? offerTotal / askTotal : 0;
    const canAfford = paymentMode === 'UPFRONT' ? player.money >= offerAmount : true;
    const currentAttempts = selectedNPC ? (attempts[selectedNPC.id] || 0) : 0;
    const attemptsLeft = MAX_ATTEMPTS - currentAttempts;

    // Purely a UI hint — the real decision is made by evaluateOffer()
    const reception = useMemo(() => {
        if (!offerAmount) return { label: 'Enter an offer', pct: 0, tone: 'text-zinc-400' };
        if (offerRatio >= 1.0) return { label: 'Very Likely', pct: 95, tone: 'text-emerald-600' };
        if (offerRatio >= 0.9) return { label: 'Likely', pct: 75, tone: 'text-emerald-600' };
        if (offerRatio >= 0.8) return { label: 'Risky', pct: 45, tone: 'text-amber-600' };
        if (offerRatio >= 0.7) return { label: 'Insulting', pct: 15, tone: 'text-red-600' };
        return { label: 'Lowball', pct: 5, tone: 'text-red-600' };
    }, [offerAmount, offerRatio]);

    const openDeal = (npc: NPCActor) => {
        setSelectedNPC(npc);
        setNegotiationResult(null);
        setOfferAmountStr('');
        setNegotiationDuration(3);
        setPaymentMode('UPFRONT');
    };

    const handlePaymentModeChange = (newMode: PaymentMode) => {
        if (newMode === paymentMode) return;
        const cur = parseMoney(offerAmountStr);
        if (cur > 0) {
            setOfferAmountStr(
                newMode === 'WEEKLY_INSTALLMENTS'
                    ? Math.ceil((cur * WEEKLY_PREMIUM) / INSTALLMENT_WEEKS).toLocaleString()
                    : Math.floor((cur * INSTALLMENT_WEEKS) / WEEKLY_PREMIUM).toLocaleString()
            );
        }
        setPaymentMode(newMode);
    };

    const applyQuickOffer = (multiplier: number) => {
        if (!ask) return;
        const base = paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment;
        setOfferAmountStr(Math.ceil(base * multiplier).toLocaleString());
    };

    const handleNegotiate = () => {
        if (!selectedNPC || !studio) return;

        const result = evaluateOffer(
            selectedNPC, negotiationDuration, offerAmount, paymentMode,
            player.stats.fame, studio.stats.valuation || 0
        );
        setNegotiationResult(result);

        const updated = { ...player };
        updated.studioMemory = { ...(updated.studioMemory || {}) };
        updated.studioMemory.attempts = { ...(updated.studioMemory.attempts || {}) };
        updated.studioMemory.cooldowns = { ...(updated.studioMemory.cooldowns || {}) };

        if (result.success && result.maintenanceFee !== undefined) {
            const newContract = createContract(
                selectedNPC.id, 'MOVIE_DEAL', paymentMode, negotiationDuration,
                result.totalContractValue, result.maintenanceFee, player.currentWeek
            );

            if (!updated.studio) updated.studio = { isUnlocked: true, baseType: 'GARAGE', talentRoster: [], lastTalentRefreshWeek: 0 };
            updated.studio = { ...updated.studio, talentRoster: [...(updated.studio.talentRoster || []), newContract] };

            updated.businesses = updated.businesses.map(b => {
                if (b.id !== studio.id) return b;
                const st = b.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
                return { ...b, studioState: { ...st, talentRoster: [...(st.talentRoster || []), newContract] } };
            });

            if (paymentMode === 'UPFRONT') {
                updated.money -= result.totalContractValue;
                updated.finance = {
                    ...updated.finance,
                    history: [{
                        id: `tx_upfront_${Date.now()}`,
                        week: player.currentWeek,
                        year: player.age,
                        amount: -result.totalContractValue,
                        category: 'EXPENSE',
                        description: `Contract Upfront: ${selectedNPC.name}`,
                    }, ...updated.finance.history],
                };
            }
            delete updated.studioMemory.attempts[selectedNPC.id];
        } else {
            const next = (updated.studioMemory.attempts[selectedNPC.id] || 0) + 1;
            updated.studioMemory.attempts[selectedNPC.id] = next;
            if (next >= MAX_ATTEMPTS) {
                updated.studioMemory.cooldowns[selectedNPC.id] = player.currentWeek + COOLDOWN_WEEKS;
                delete updated.studioMemory.attempts[selectedNPC.id];
            }
        }
        onUpdatePlayer(updated);
    };

    // Buyout = 8 weeks of upkeep per movie still owed (tweak freely)
    const buyoutFor = (c: StudioContract) => c.maintenanceFee * 8 * Math.max(1, c.moviesRemaining);

    const handleRelease = () => {
        if (!releaseTarget || !studio) return;
        const npc = getNPCById(releaseTarget.npcId);
        const fee = buyoutFor(releaseTarget);
        const updated = { ...player };

        updated.money -= fee;
        updated.finance = {
            ...updated.finance,
            history: [{
                id: `tx_buyout_${Date.now()}`,
                week: player.currentWeek,
                year: player.age,
                amount: -fee,
                category: 'EXPENSE',
                description: `Contract Buyout: ${npc?.name || 'Talent'}`,
            }, ...updated.finance.history],
        };
        if (updated.studio?.talentRoster) {
            updated.studio = { ...updated.studio, talentRoster: updated.studio.talentRoster.filter(c => c.id !== releaseTarget.id) };
        }
        updated.businesses = updated.businesses.map(b => {
            if (b.id !== studio.id || !b.studioState) return b;
            return { ...b, studioState: { ...b.studioState, talentRoster: (b.studioState.talentRoster || []).filter(c => c.id !== releaseTarget.id) } };
        });
        // Released talent won't talk to you for a bit
        updated.studioMemory = { ...(updated.studioMemory || {}), cooldowns: { ...(updated.studioMemory?.cooldowns || {}), [releaseTarget.npcId]: player.currentWeek + 6 } };

        onUpdatePlayer(updated);
        setReleaseTarget(null);
    };

    const StatPill = ({ icon, label, value, tone = 'text-white' }: { icon: React.ReactNode; label: string; value: string; tone?: string }) => (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{icon}{label}</div>
            <div className={`text-lg font-black mt-1 truncate ${tone}`}>{value}</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-5 mb-5">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="flex items-start justify-between gap-4 relative">
                    <div className="min-w-0">
                        <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">{studio?.name || 'Production House'}</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter italic truncate">Talent Management</h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Week {player.currentWeek} · Farm System & Roster</p>
                    </div>
                    <button onClick={onBack} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors shrink-0">
                        <X size={20} />
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 relative">
                    <StatPill icon={<Users size={12} />} label="Roster" value={`${signedContracts.length}`} />
                    <StatPill icon={<Wallet size={12} />} label="Upkeep" value={`${fmt(weeklyUpkeep)}/wk`} tone={weeklyUpkeep > player.money * 0.05 ? 'text-amber-400' : 'text-white'} />
                    <StatPill icon={<Flame size={12} />} label="Avg Fame" value={`${Math.floor(avgFame)}`} />
                    <StatPill icon={<Film size={12} />} label="Expiring" value={`${nearExpiry}`} tone={nearExpiry ? 'text-red-400' : 'text-white'} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 p-1 bg-zinc-900 rounded-2xl">
                {(['ROSTER', 'MARKET'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {tab === 'ROSTER' ? <Users size={16} /> : <Star size={16} />}
                        {tab === 'ROSTER' ? `Roster (${signedContracts.length})` : `Market (${rawMarket.length})`}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32">
                {activeTab === 'ROSTER' ? (
                    <div className="space-y-3">
                        {signedContracts.length === 0 ? (
                            <div className="text-center py-14 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
                                <Users size={48} className="mx-auto text-zinc-700 mb-4" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No talent signed yet</p>
                                <button onClick={() => setActiveTab('MARKET')} className="mt-4 px-4 py-2 bg-amber-500 text-black text-xs font-black uppercase rounded-xl hover:bg-amber-400">Browse the Market</button>
                            </div>
                        ) : signedContracts.map(contract => {
                            const npc = getNPCById(contract.npcId);
                            if (!npc) return null;
                            const progress = contract.totalMovies ? ((contract.totalMovies - contract.moviesRemaining) / contract.totalMovies) * 100 : 0;
                            const expiring = contract.moviesRemaining <= 1;
                            return (
                                <div key={contract.id} className={`bg-zinc-900 border rounded-3xl p-4 ${expiring ? 'border-red-500/40' : 'border-zinc-800'}`}>
                                    <div className="flex items-start gap-4">
                                        <img src={npc.avatar} alt={npc.name} className="w-16 h-16 rounded-2xl bg-black border border-zinc-700 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white truncate">{npc.name}</h3>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-md font-black uppercase">{npc.tier}</span>
                                                {expiring && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-md font-black uppercase">Last Film</span>}
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><TrendingUp size={12} /> {Math.floor(npc.stats?.fame || 0)}</span>
                                                <span className="flex items-center gap-1"><Star size={12} /> {Math.floor(npc.stats?.talent || 0)}</span>
                                                <span className="flex items-center gap-1"><DollarSign size={12} /> {fmt(contract.maintenanceFee)}/wk</span>
                                            </div>
                                            <div className="mt-3">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                                                    <span>Commitment</span>
                                                    <span>{contract.totalMovies - contract.moviesRemaining}/{contract.totalMovies} delivered</span>
                                                </div>
                                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                            </div>
                                            {contract.paymentMode === 'WEEKLY_INSTALLMENTS' && contract.installmentsPaid < contract.totalInstallments && (
                                                <div className="mt-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                                    Installments {contract.installmentsPaid}/{contract.totalInstallments}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setReleaseTarget(contract)}
                                            title="Buy out contract"
                                            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <Scissors size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Market toolbar */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search talent..."
                                    className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {(['ALL', 'UNKNOWN', 'ESTABLISHED'] as TierFilter[]).map(t => (
                                    <button key={t} onClick={() => setTierFilter(t)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tierFilter === t ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}>
                                        {t}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSortKey(k => (k === 'FAME' ? 'TALENT' : k === 'TALENT' ? 'ASK' : 'FAME'))}
                                    className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1"
                                >
                                    <ArrowUpDown size={12} /> {sortKey === 'ASK' ? 'Cheapest' : sortKey}
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex gap-3">
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
                                Pool refreshes every 3 weeks. Unknowns are cheap with upside; stars bring instant buzz. Three rejected offers lock a name for {COOLDOWN_WEEKS} weeks.
                            </p>
                        </div>

                        {market.length === 0 && (
                            <div className="text-center py-10 text-zinc-500 text-xs font-bold uppercase tracking-widest">No talent matches</div>
                        )}

                        {market.map(npc => {
                            const locked = cooldowns[npc.id] && cooldowns[npc.id] > player.currentWeek;
                            const quickAsk = calculateNPCAsk(npc, 1);
                            const tried = attempts[npc.id] || 0;
                            return (
                                <div key={npc.id} className={`bg-zinc-900 border rounded-3xl p-4 flex items-center gap-4 group transition-all ${locked ? 'border-zinc-800 opacity-60' : 'border-zinc-800 hover:border-amber-500/50'}`}>
                                    <img src={npc.avatar} alt={npc.name} className="w-16 h-16 rounded-2xl bg-black border border-zinc-700 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-white truncate">{npc.name}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase ${npc.tier === 'UNKNOWN' ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500/20 text-amber-500'}`}>{npc.tier}</span>
                                            {tried > 0 && !locked && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase bg-red-500/10 text-red-400">{MAX_ATTEMPTS - tried} tries left</span>}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 italic line-clamp-1 mb-2">"{npc.bio}"</p>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><TrendingUp size={10} /> {Math.floor(npc.stats?.fame || 0)}</span>
                                            <span className="flex items-center gap-1"><Star size={10} /> {Math.floor(npc.stats?.talent || 0)}</span>
                                            <span className="flex items-center gap-1 text-amber-500"><BadgeDollarSign size={10} /> {fmt(quickAsk.totalAmount)}/film</span>
                                        </div>
                                    </div>
                                    {locked ? (
                                        <div className="text-[10px] font-black uppercase text-zinc-500 flex flex-col items-center gap-1 shrink-0">
                                            <Lock size={14} />
                                            Wk {cooldowns[npc.id]}
                                        </div>
                                    ) : (
                                        <button onClick={() => openDeal(npc)} className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-all shrink-0">
                                            Deal
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Release / buyout modal */}
            {releaseTarget && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 text-center">
                        <ShieldAlert size={40} className="mx-auto text-red-400 mb-4" />
                        <h3 className="text-white font-black uppercase tracking-widest mb-2">Buy Out Contract?</h3>
                        <p className="text-zinc-400 text-sm mb-4">
                            Releasing <strong className="text-white">{getNPCById(releaseTarget.npcId)?.name}</strong> costs a buyout of <strong className="text-amber-400">{fmt(buyoutFor(releaseTarget))}</strong> and they won't negotiate with you for 6 weeks.
                        </p>
                        {player.money < buyoutFor(releaseTarget) && <p className="text-red-400 text-xs font-bold uppercase mb-3">Insufficient funds</p>}
                        <div className="flex gap-2">
                            <button onClick={() => setReleaseTarget(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-xs font-bold uppercase">Keep</button>
                            <button onClick={handleRelease} disabled={player.money < buyoutFor(releaseTarget)} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-xs font-bold uppercase disabled:opacity-40">Release</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Negotiation Modal */}
            {selectedNPC && ask && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[#fdfbf7] border-x-8 border-y-[12px] border-[#e8e4d9] rounded-sm w-full max-w-lg p-6 sm:p-8 shadow-2xl relative text-zinc-900 font-serif my-auto">
                        <button onClick={() => setSelectedNPC(null)} className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-zinc-700 z-20 bg-[#fdfbf7] rounded-full">
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6 border-b-2 border-zinc-300 pb-4">
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest">Talent Agreement</h2>
                            <p className="text-xs text-zinc-500 font-sans uppercase tracking-widest mt-1">Standard Motion Picture Contract</p>
                        </div>

                        {!negotiationResult ? (
                            <div className="space-y-5">
                                <p className="text-sm leading-relaxed">
                                    Between <strong>{studio?.name || 'The Studio'}</strong> ("Studio") and <strong>{selectedNPC.name}</strong> ("Artist").
                                </p>

                                <div className="bg-zinc-100 p-3 rounded border border-zinc-200 font-sans flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img src={selectedNPC.avatar} alt={selectedNPC.name} className="w-10 h-10 rounded-full border border-zinc-300" />
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold uppercase text-zinc-500">{selectedNPC.tier}</div>
                                            <div className="font-bold truncate">{selectedNPC.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-sm shrink-0">
                                        <div className="flex flex-col items-center"><span className="text-[10px] text-zinc-500 uppercase">Fame</span><span className="font-bold">{Math.floor(selectedNPC.stats?.fame || 0)}</span></div>
                                        <div className="flex flex-col items-center"><span className="text-[10px] text-zinc-500 uppercase">Talent</span><span className="font-bold">{Math.floor(selectedNPC.stats?.talent || 0)}</span></div>
                                    </div>
                                </div>

                                <div className="space-y-4 font-sans">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 flex justify-between">
                                            <span>1. Commitment</span><span className="text-zinc-900">{negotiationDuration} film{negotiationDuration > 1 ? 's' : ''}</span>
                                        </label>
                                        <input type="range" min={1} max={10} value={negotiationDuration}
                                            onChange={e => setNegotiationDuration(parseInt(e.target.value))}
                                            className="w-full accent-zinc-900" />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">2. Payment Structure</label>
                                        <div className="flex gap-2">
                                            {(['UPFRONT', 'WEEKLY_INSTALLMENTS'] as PaymentMode[]).map(m => (
                                                <button key={m} onClick={() => handlePaymentModeChange(m)}
                                                    className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest border transition-all ${paymentMode === m ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}>
                                                    {m === 'UPFRONT' ? 'Upfront' : `Weekly (${INSTALLMENT_WEEKS}w)`}
                                                </button>
                                            ))}
                                        </div>
                                        {paymentMode === 'WEEKLY_INSTALLMENTS' && <p className="text-[10px] text-zinc-500 mt-1 italic">* Includes a 10% financing premium.</p>}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">3. Compensation Offer</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={offerAmountStr}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/[^0-9]/g, '');
                                                    setOfferAmountStr(v ? parseInt(v).toLocaleString() : '');
                                                }}
                                                placeholder={(paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment).toLocaleString()}
                                                className={`w-full bg-white border rounded px-3 py-3 pl-7 font-bold text-lg focus:outline-none focus:border-amber-500 ${!canAfford ? 'border-red-400' : 'border-zinc-300'}`}
                                            />
                                            {paymentMode === 'WEEKLY_INSTALLMENTS' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">/ week</span>}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {[{ l: '-20%', m: 0.8 }, { l: '-10%', m: 0.9 }, { l: 'Match', m: 1 }, { l: '+5%', m: 1.05 }].map(q => (
                                                <button key={q.l} onClick={() => applyQuickOffer(q.m)} className="flex-1 py-1.5 text-[10px] font-black uppercase border border-zinc-300 rounded hover:bg-zinc-100">{q.l}</button>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
                                            <span>Market ask: {fmt(paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment)}{paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}</span>
                                            <span>+ {fmt(ask.maintenanceFee)}/wk upkeep</span>
                                        </div>
                                    </div>

                                    {/* Deal summary */}
                                    <div className="bg-zinc-50 border border-zinc-200 rounded p-3 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Cost</div>
                                            <div className="font-black text-sm">{fmt(offerTotal)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Per Film</div>
                                            <div className="font-black text-sm">{fmt(offerTotal / negotiationDuration)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center justify-center gap-1"><Gauge size={10} /> Reception</div>
                                            <div className={`font-black text-sm ${reception.tone}`}>{reception.label}</div>
                                        </div>
                                        <div className="col-span-3 h-1 bg-zinc-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-zinc-900 transition-all" style={{ width: `${reception.pct}%` }} />
                                        </div>
                                    </div>
                                    {!canAfford && <p className="text-xs text-red-600 font-bold">You only have {fmt(player.money)} — switch to weekly or lower the offer.</p>}
                                </div>

                                <div className="pt-4 border-t border-zinc-300 font-sans flex items-center justify-between">
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        Attempts Left: <span className={attemptsLeft === 1 ? 'text-red-600' : 'text-zinc-900'}>{attemptsLeft}</span>
                                    </div>
                                    <button
                                        onClick={handleNegotiate}
                                        disabled={!offerAmount || !canAfford}
                                        className="px-6 py-2 bg-zinc-900 text-white font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                                    >
                                        <PenTool size={16} /> Sign & Offer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center animate-in zoom-in-95 duration-300 py-4">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 bg-white ${negotiationResult.success ? 'border-emerald-600 text-emerald-600' : 'border-red-600 text-red-600'}`}>
                                    {negotiationResult.success ? <Check size={40} /> : <X size={40} />}
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-widest mb-2">{negotiationResult.success ? 'Agreement Executed' : 'Offer Rejected'}</h3>
                                <p className="text-zinc-700 italic text-lg mb-6 leading-relaxed px-4">"{negotiationResult.message}"</p>

                                {!negotiationResult.success && (
                                    <div className="mb-8 font-sans">
                                        {attemptsLeft > 0 ? (
                                            <p className="text-sm text-zinc-500 font-bold">{attemptsLeft} attempt(s) remaining.</p>
                                        ) : (
                                            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center justify-center gap-2 text-red-700 text-sm">
                                                <ShieldAlert size={16} /> Negotiations broke down. {COOLDOWN_WEEKS}-week cooldown applied.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {negotiationResult.success && (
                                    <div className="bg-zinc-50 rounded border border-zinc-200 p-4 mb-8 font-sans text-left grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Contract Value</div>
                                            <div className="text-lg font-black">{fmt(offerAmount)}{paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}</div>
                                            {paymentMode === 'WEEKLY_INSTALLMENTS' && <div className="text-[10px] text-zinc-500">× {INSTALLMENT_WEEKS} weeks</div>}
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Maintenance</div>
                                            <div className="text-lg font-black">{fmt(negotiationResult.maintenanceFee || 0)}/wk</div>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => (negotiationResult.success || attemptsLeft === 0 ? setSelectedNPC(null) : setNegotiationResult(null))}
                                    className="w-full py-3 bg-zinc-900 text-white font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-all font-sans"
                                >
                                    {negotiationResult.success || attemptsLeft === 0 ? 'Close Document' : 'Revise Offer'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};