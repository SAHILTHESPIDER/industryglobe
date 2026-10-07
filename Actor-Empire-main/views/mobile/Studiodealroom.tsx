// Place next to ForbesApp.tsx (same folder, so the ../../ import paths match).
import React, { useEffect, useMemo, useState } from 'react';
import { Player } from '../../types';
import {
  ArrowLeft, Building2, Target, ShieldCheck, TrendingUp, Search, Zap,
  Check, Plus, AlertTriangle, Landmark, User, Briefcase, Minus,
} from 'lucide-react';
import {
  CommitmentKind, DealStructure, FundingMix, FundingSource, Deal,
  OWNERSHIP_TIERS, OFFER_ENERGY, DILIGENCE_ENERGY,
  computeFinancials, getVisibleFinancials, getOwnedPct, getDealQuote, previewOffer,
  getFundingCapacity, validateFunding, fileOffer, respondToCounter, runDueDiligence,
} from '../../services/deallogic';
import { StudioClosingCeremony } from './StudioClosingCermony';

// ------------------------------------------------------------------ helpers
const fmt = (n: number) => {
  const v = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (v >= 1e12) return `${s}$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${s}$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${s}$${(v / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(v).toLocaleString()}`;
};
const absWeek = (p: any) => (p.age || 18) * 52 + (p.currentWeek || 1);
const label = 'text-[8px] font-black uppercase tracking-[0.25em] text-zinc-500';

const ZONE_STYLE: Record<string, { text: string; hint: string }> = {
  INSULTING: { text: 'text-red-400', hint: 'The board will laugh at this.' },
  TESTING: { text: 'text-sky-400', hint: 'Expect a counter well above this.' },
  COMPETITIVE: { text: 'text-teal-300', hint: 'A serious bid. A counter is likely.' },
  STRONG: { text: 'text-emerald-400', hint: 'Hard to refuse.' },
};

const STATUS_LABEL: Record<string, string> = {
  OFFER_PENDING: 'Board reviewing', COUNTERED: 'Counter received', ACCEPTED: 'Awaiting your signature', REGULATORY: 'Regulatory review',
  TENDER: 'Tender open', CLOSED: 'Closed', REJECTED: 'Rejected', BLOCKED: 'Blocked', WITHDRAWN: 'Withdrawn',
};

const COMMITMENTS: { id: CommitmentKind; title: string; desc: string }[] = [
  { id: 'NAME', title: 'Name Protected', desc: 'Keep the label identity intact after close.' },
  { id: 'STAFF', title: 'Staff Protected', desc: 'Promise transition protection for existing employees.' },
  { id: 'SLATE', title: 'Slate Guaranteed', desc: 'Commit to future productions using the acquired studio.' },
];

const SOURCES: { id: FundingSource; title: string; icon: React.ReactNode }[] = [
  { id: 'PERSONAL', title: 'Personal Wealth', icon: <User size={20} /> },
  { id: 'COMPANY', title: 'Company Capital', icon: <Landmark size={20} /> },
  { id: 'DEBT', title: 'Bank Debt', icon: <Briefcase size={20} /> },
];

const getStudio = (p: any, id: string) => {
  const studios = p.world?.studios || {};
  return studios[id] || Object.values(studios).find((s: any) => s?.id === id);
};

// ------------------------------------------------------------------ gauge
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
};
const arc = (r: number, from: number, to: number) => {
  const [x1, y1] = polar(100, 100, r, from);
  const [x2, y2] = polar(100, 100, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
};

const Gauge: React.FC<{ chance: number; zone: string }> = ({ chance, zone }) => {
  const angle = 180 - Math.max(0, Math.min(1, chance)) * 180;
  const [nx, ny] = polar(100, 100, 66, angle);
  const segs = [
    { from: 180, to: 136, color: '#7f1d1d' }, { from: 134, to: 91, color: '#92400e' },
    { from: 89, to: 46, color: '#166534' }, { from: 44, to: 0, color: '#065f46' },
  ];
  const style = ZONE_STYLE[zone];
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-64 max-w-full">
        {segs.map((s, i) => <path key={i} d={arc(80, s.from, s.to)} stroke={s.color} strokeWidth="10" fill="none" strokeLinecap="round" />)}
        <path d={arc(80, 180, angle)} stroke="#38bdf8" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.9" />
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="#000" stroke="#f59e0b" strokeWidth="3" />
      </svg>
      <div className={`-mt-1 text-lg font-black tracking-[0.2em] ${style.text}`}>{zone}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{style.hint}</div>
      <div className="text-[10px] text-zinc-600 mt-1 font-mono">{Math.round(chance * 100)}% acceptance</div>
    </div>
  );
};

// ------------------------------------------------------------------ shell
interface Props {
  player: Player;
  studioId: string;
  rank?: number;
  onBack: () => void;
  onUpdatePlayer: (p: Player) => void;
}
type View = 'PROFILE' | 'DOSSIER' | 'WAR_ROOM';

export const StudioDealRoom: React.FC<Props> = ({ player, studioId, rank, onBack, onUpdatePlayer }) => {
  const [view, setView] = useState<View>('PROFILE');
  const [toast, setToast] = useState<string | null>(null);
  const [closingDealId, setClosingDealId] = useState<string | null>(null);
  const studio = getStudio(player, studioId);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  if (!studio) {
    return (
      <div className="absolute inset-0 z-50 bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-400 text-sm">Studio not found.</div>
        <button onClick={onBack} className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm">Back</button>
      </div>
    );
  }

  const shared = { player, studioId, studio, rank, onUpdatePlayer, notify: setToast };

  return (
    <div className="absolute inset-0 z-50 bg-black text-white flex flex-col font-sans animate-in slide-in-from-right duration-300">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-zinc-900 border border-amber-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold max-w-[90%] text-center">
          {toast}
        </div>
      )}
      {view === 'PROFILE' && <ProfileView {...shared} onBack={onBack} onApproach={() => setView('DOSSIER')} onOpenClosing={setClosingDealId} />}
      {view === 'DOSSIER' && <DossierView {...shared} onBack={() => setView('PROFILE')} onWarRoom={() => setView('WAR_ROOM')} />}
      {view === 'WAR_ROOM' && <WarRoomView {...shared} onBack={() => setView('DOSSIER')} onFiled={() => setView('PROFILE')} />}
      {closingDealId && (
        <StudioClosingCeremony
          player={player}
          dealId={closingDealId}
          onUpdatePlayer={onUpdatePlayer}
          onClose={() => setClosingDealId(null)}
        />
      )}
    </div>
  );
};

interface ViewProps {
  player: Player; studioId: string; studio: any; rank?: number;
  onUpdatePlayer: (p: Player) => void; notify: (m: string) => void;
}

// ------------------------------------------------------------------ 1. STUDIO PROFILE
const ProfileView: React.FC<ViewProps & { onBack: () => void; onApproach: () => void; onOpenClosing: (id: string) => void }> = ({
  player, studioId, studio, rank, onUpdatePlayer, notify, onBack, onApproach, onOpenClosing,
}) => {
  const p: any = player;
  const fin = getVisibleFinancials(player, studioId);
  const owned = getOwnedPct(player, studioId);
  const stake = p.equityStakes?.[studioId];
  const controlled = !!stake?.controlled;
  const isPublic = (p.stocks || []).some((s: any) => s.relatedStudioId === studioId);
  const reputation = Math.round(Number(studio.reputation ?? studio.stats?.brandHealth ?? 50));
  const positionValue = fin.equityValue * (owned / 100);
  const totalReturn = stake?.costBasis ? ((positionValue - stake.costBasis) / stake.costBasis) * 100 : 0;
  const cooldownWeeks = Math.max(0, (p.world?.dealCooldowns?.[studioId] || 0) - absWeek(p));
  const liveDeals: Deal[] = (p.world?.deals || []).filter((d: Deal) => d.studioId === studioId);
  const hasLiveDeal = liveDeals.some(d => ['OFFER_PENDING', 'COUNTERED', 'ACCEPTED', 'REGULATORY', 'TENDER'].includes(d.status));
  const nextTier = OWNERSHIP_TIERS.find(t => t.at > owned);

  const answerCounter = (deal: Deal, accept: boolean) => {
    const res = respondToCounter(player, deal.id, accept);
    if (res.error) return notify(res.error);
    onUpdatePlayer(res.player);
    notify(accept ? 'Counter accepted. The deal moves forward.' : 'Offer withdrawn. Funds returned.');
  };

  return (
    <>
      <div className="bg-zinc-900 p-4 pt-12 pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl bg-zinc-800 border border-white/10"><ArrowLeft size={18} /></button>
        <div className="text-center">
          <div className="text-xl font-black tracking-[0.25em] font-serif italic">FORBES</div>
          <div className="text-[7px] tracking-[0.35em] text-zinc-500 uppercase font-black">Studio Intelligence</div>
        </div>
        <div className="border border-amber-500/40 bg-amber-500/10 rounded-xl px-3 py-1.5 text-center">
          <div className="text-[6px] font-black tracking-widest text-amber-500/80 uppercase">Market Rank</div>
          <div className="text-lg font-black text-amber-400 leading-none">#{rank ?? '-'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-24">
        <div className="border-l-4 border-amber-500 pl-3">
          <div className={label}>Legacy · Company Profile</div>
          <h1 className="text-3xl font-black font-serif italic uppercase tracking-tight leading-tight mt-1">{studio.name}</h1>
        </div>

        <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3">
          <div className="flex justify-between mb-2"><span className={label}>Market Reputation</span><span className="text-[10px] font-black text-amber-400">{reputation}/100</span></div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${reputation}%` }} /></div>
        </div>

        {/* Acquisition state */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-200"><ShieldCheck size={16} /><span className="text-[9px] font-black uppercase tracking-[0.25em]">Acquisition State</span></div>
            <span className="text-[8px] font-black uppercase tracking-widest border border-white/30 rounded-full px-3 py-1">
              {controlled ? 'Player Owned' : isPublic ? 'Publicly Traded' : 'Private'}
            </span>
          </div>
          <p className="text-sm text-indigo-300/80">
            {controlled ? 'You control this studio.' : isPublic ? 'Ownership moves through the public market.' : 'Ownership moves through private negotiation.'}
          </p>
        </div>

        {/* Your position */}
        <div className="border-t border-sky-500/20 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-sky-400">Your Position</span>
            <span className={label}>{owned > 0 ? `${owned.toFixed(2)}% stake` : 'No current stake'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className={label}>Ownership</div><div className="text-2xl font-black text-zinc-300 mt-1">{owned.toFixed(owned >= 10 ? 0 : 1)}%</div></div>
            <div><div className={label}>Position Value</div><div className="text-sm font-black mt-2 font-mono">{fmt(positionValue)}</div></div>
            <div><div className={label}>Total Return</div>
              <div className={`text-sm font-black mt-2 font-mono ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</div></div>
          </div>
          {nextTier && (
            <div className="mt-4">
              <div className="flex justify-between"><span className={label}>Influence</span><span className={label}>{nextTier.at}% {nextTier.label}</span></div>
              <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${Math.min(100, (owned / nextTier.at) * 100)}%` }} /></div>
              <p className="text-[10px] text-zinc-600 mt-1">{nextTier.effect}</p>
            </div>
          )}
        </div>

        {/* Live deals */}
        {liveDeals.filter(d => d.status !== 'CLOSED').slice(-3).reverse().map(deal => (
          <div key={deal.id} className="bg-zinc-900/70 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className={label}>{deal.structure === 'FULL' ? 'Full Acquisition' : 'Minority Stake'} · {deal.pct.toFixed(1)}%</div>
                <div className="font-black mt-1">{fmt(deal.offerPrice)}</div>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-full px-2 py-1">{STATUS_LABEL[deal.status]}</span>
            </div>
            {['OFFER_PENDING', 'ACCEPTED', 'REGULATORY', 'TENDER', 'COUNTERED'].includes(deal.status) && (
              <div className="text-[10px] text-zinc-500 mt-2">{deal.weeksLeft} week{deal.weeksLeft === 1 ? '' : 's'} left</div>
            )}
            {deal.status === 'ACCEPTED' && (
              <div className="mt-3">
                <div className="text-sm text-emerald-300 font-bold">The board said yes. Sign the closing papers to complete the deal.</div>
                <button onClick={() => onOpenClosing(deal.id)} className="mt-3 w-full py-3 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-black text-xs font-black uppercase tracking-widest">
                  Complete Closing
                </button>
              </div>
            )}
            {deal.status === 'COUNTERED' && deal.counterPrice && (
              <div className="mt-3">
                <div className="text-sm">Board wants <span className="font-black text-amber-300">{fmt(deal.counterPrice)}</span> <span className="text-zinc-500">(+{fmt(deal.counterPrice - deal.offerPrice)} from personal cash)</span></div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => answerCounter(deal, false)} className="py-2.5 rounded-xl bg-zinc-800 text-xs font-bold">Walk Away</button>
                  <button onClick={() => answerCounter(deal, true)} className="py-2.5 rounded-xl bg-amber-400 text-black text-xs font-black">Accept Counter</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Ownership command */}
        {!controlled && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-3"><Building2 size={14} /><span className="text-[9px] font-black uppercase tracking-[0.25em]">Ownership Command</span></div>
            <div className="flex gap-3 items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400"><Target size={22} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest">{hasLiveDeal ? 'Deal in progress' : cooldownWeeks > 0 ? 'Board not taking calls' : 'Acquisition route available'}</div>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {cooldownWeeks > 0 ? `Talks resume in ${cooldownWeeks} weeks.` : 'Make an opening offer immediately or purchase optional due diligence first.'}
                </p>
              </div>
            </div>
            <button
              disabled={hasLiveDeal || cooldownWeeks > 0}
              onClick={onApproach}
              className="w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 bg-amber-400 text-black disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <Target size={16} /> Approach Studio
            </button>
          </div>
        )}

        {/* Financial command */}
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-3"><Landmark size={14} /><span className="text-[9px] font-black uppercase tracking-[0.25em]">Financial Command</span></div>
          <div className="grid grid-cols-2 border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/40">
            <div className="p-4 border-r border-b border-white/10"><div className={label}>Valuation</div><div className="text-xl font-black font-mono mt-1">{fmt(fin.enterpriseValue)}</div></div>
            <div className="p-4 border-b border-white/10"><div className={label}>Equity Value</div><div className="text-xl font-black font-mono text-emerald-400 mt-1">{fmt(fin.shownEquity)}</div></div>
            <div className="p-4 border-r border-white/10"><div className={label}>{fin.verified ? 'Verified Debt' : 'Estimated Debt'}</div><div className="text-xl font-black font-mono mt-1">{fmt(fin.debt)}</div></div>
            <div className="p-4"><div className={label}>Profitability</div><div className="text-xl font-black font-mono text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp size={14} />{fmt(fin.annualIncome)}</div></div>
          </div>
          <div className="text-[10px] text-zinc-600 mt-2">Share price {fmt(fin.pricePerShare)} · {(fin.sharesOutstanding / 1e9).toFixed(2)}B shares</div>
        </div>
      </div>
    </>
  );
};

// ------------------------------------------------------------------ 2. TARGET DOSSIER
const DossierView: React.FC<ViewProps & { onBack: () => void; onWarRoom: () => void }> = ({
  player, studioId, studio, onUpdatePlayer, notify, onBack, onWarRoom,
}) => {
  const p: any = player;
  const fin = getVisibleFinancials(player, studioId);
  const owned = getOwnedPct(player, studioId);
  const remaining = 50 - owned;
  const rawHit = Number(studio.hitRate ?? 0.5);
  const hitRate = Math.round((rawHit > 1 ? rawHit / 100 : rawHit) * 100);
  const reputation = Math.round(Number(studio.reputation ?? studio.stats?.brandHealth ?? 50));
  const catalog = studio.catalogCount ?? studio.catalog?.length;
  const talent = studio.keyTalent?.length;
  const controlValue = fin.equityValue * 0.5 * 1.25;
  const stakeCredit = fin.equityValue * (owned / 100);
  const remainingTender = Math.max(0, controlValue - stakeCredit);

  const diligence = () => {
    const res = runDueDiligence(player, studioId);
    if (res.error) return notify(res.error);
    onUpdatePlayer(res.player);
    notify('Due diligence complete. Debt and liabilities verified.');
  };

  const Card: React.FC<{ t: string; v: React.ReactNode; tone?: string }> = ({ t, v, tone }) => (
    <div className="bg-[#efe2c0] rounded-xl p-3 border border-[#c9ad73]">
      <div className="text-[7px] font-black uppercase tracking-[0.2em] text-[#8a7240]">{t}</div>
      <div className={`font-black mt-1 ${tone || 'text-[#2b2110]'}`}>{v}</div>
    </div>
  );

  return (
    <>
      <div className="p-4 pt-12 flex items-center shrink-0 bg-gradient-to-b from-[#2b2110] to-black">
        <button onClick={onBack} className="p-2 rounded-xl bg-black/40 border border-white/10"><ArrowLeft size={18} /></button>
        <div className="flex-1 text-center pr-9"><div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-500">The Deal Room</div><div className="text-lg font-black">Target Dossier</div></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
        <div className="bg-[#d9c28d] rounded-3xl p-4 space-y-4 text-[#2b2110] shadow-2xl">
          <div className="flex justify-between items-start border-b border-[#a88b4c] pb-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.25em] text-[#8a7240]">Legacy</div>
              <div className="text-2xl font-black font-serif leading-tight">{studio.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a7240]">Street Valuation</div>
              <div className="text-xl font-black font-mono">{fmt(fin.enterpriseValue)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Card t="Catalog" v={catalog !== undefined ? `${catalog} titles` : '—'} />
            <Card t="Hit Rate" v={`${hitRate}%`} />
            <Card t="Reputation" v={`${reputation}/100`} />
            <Card t="Key Talent" v={talent !== undefined ? `${talent} names` : '—'} />
          </div>

          <div className="bg-[#efe2c0] rounded-2xl p-3 border border-[#c9ad73]">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a7240] mb-2">Your Market Position</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#d9c28d] rounded-lg p-2"><div className="text-[7px] font-black uppercase text-[#8a7240]">Already Owned</div><div className="font-black text-sm">{owned.toFixed(2)}%</div></div>
              <div className="bg-[#d9c28d] rounded-lg p-2"><div className="text-[7px] font-black uppercase text-[#8a7240]">Control Target</div><div className="font-black text-sm">50%</div></div>
              <div className="bg-[#d9c28d] rounded-lg p-2"><div className="text-[7px] font-black uppercase text-[#8a7240]">Still Required</div><div className="font-black text-sm">{Math.max(0, remaining).toFixed(2)}%</div></div>
            </div>
            <div className="h-1.5 rounded-full bg-[#c9ad73] mt-3 overflow-hidden"><div className="h-full bg-[#2b2110]" style={{ width: `${Math.min(100, owned * 2)}%` }} /></div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[9px]">
              <div><div className="text-[#8a7240] font-black uppercase text-[7px]">50% Control Value</div><div className="font-black font-mono">{fmt(controlValue)}</div></div>
              <div><div className="text-[#8a7240] font-black uppercase text-[7px]">Stake Credit</div><div className="font-black font-mono text-emerald-800">-{fmt(stakeCredit)}</div></div>
              <div><div className="text-[#8a7240] font-black uppercase text-[7px]">Remaining Tender</div><div className="font-black font-mono">{fmt(remainingTender)}</div></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a7240]">Financial Exposure</div>
              <span className={`text-[8px] font-black uppercase ${fin.verified ? 'text-emerald-800' : 'text-red-800'}`}>{fin.verified ? 'Verified' : 'Unverified'}</span>
            </div>
            <div className="space-y-2">
              <div className="bg-[#efe2c0] rounded-xl p-3 border border-[#c9ad73] flex justify-between"><span className="text-xs font-bold">{fin.verified ? 'Verified' : 'Estimated'} Debt</span><span className="font-black font-mono">{fmt(fin.debt)}</span></div>
              <div className="bg-[#efe2c0] rounded-xl p-3 border border-[#c9ad73] flex justify-between"><span className="text-xs font-bold">Hidden Liabilities</span><span className="font-black font-mono">{fin.verified ? fmt(fin.hiddenLiabilities) : '???'}</span></div>
              <div className="bg-[#efe2c0] rounded-xl p-3 border border-[#c9ad73] flex justify-between"><span className="text-xs font-bold">Expected Annual Income</span><span className="font-black font-mono">{fmt(fin.annualIncome)}</span></div>
            </div>
          </div>

          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a7240] mb-2">Risk Flags</div>
            {fin.verified ? (
              fin.hiddenLiabilities > fin.debt * 0.5
                ? <div className="bg-[#efe2c0] border border-[#c9ad73] rounded-xl p-3 text-xs text-red-800 font-bold flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />Hidden liabilities materially weaken the headline valuation.</div>
                : <div className="bg-[#efe2c0] border border-[#c9ad73] rounded-xl p-3 text-xs text-emerald-900 font-bold">No major risk flags found.</div>
            ) : (
              <div className="bg-[#efe2c0] border border-[#c9ad73] rounded-xl p-3 text-xs text-[#6b5a2f] font-bold flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />Unverified. Hidden liabilities may be missing from these numbers.</div>
            )}
          </div>

          {!fin.verified && (
            <button onClick={diligence} className="w-full py-3 rounded-xl bg-[#2b2110] text-[#efe2c0] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
              <Search size={14} /> Run Due Diligence <span className="opacity-70 flex items-center"><Zap size={10} />{DILIGENCE_ENERGY}E</span>
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <button onClick={onWarRoom} className="w-full py-4 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-black font-black text-sm shadow-xl">Open the War Room →</button>
      </div>
    </>
  );
};

// ------------------------------------------------------------------ 3. WAR ROOM
const WarRoomView: React.FC<ViewProps & { onBack: () => void; onFiled: () => void }> = ({
  player, studioId, studio, onUpdatePlayer, notify, onBack, onFiled,
}) => {
  const p: any = player;
  const owned = getOwnedPct(player, studioId);
  const maxPct = Math.max(1, Math.floor(100 - owned));

  const [structure, setStructure] = useState<DealStructure>('MINORITY');
  const [pctInput, setPctInput] = useState(Math.min(10, maxPct));
  const [commitments, setCommitments] = useState<CommitmentKind[]>([]);
  const [sources, setSources] = useState<Set<FundingSource>>(new Set(['PERSONAL']));

  const quote = useMemo(
    () => getDealQuote(player, studioId, structure, pctInput, commitments),
    [player, studioId, structure, pctInput, commitments]
  );
  const [offer, setOffer] = useState(quote.fairOffer);
  useEffect(() => { setOffer(quote.fairOffer); }, [structure, quote.pct]); // reset when what you are buying changes

  const capacity = useMemo(() => getFundingCapacity(player), [player]);

  const funding: FundingMix = useMemo(() => {
    let left = offer;
    const mix: FundingMix = {};
    (['PERSONAL', 'COMPANY', 'DEBT'] as FundingSource[]).forEach(k => {
      if (!sources.has(k)) return;
      const take = Math.min(left, capacity[k]);
      if (take > 0) { mix[k] = Math.floor(take); left -= take; }
    });
    return mix;
  }, [offer, sources, capacity]);

  const check = useMemo(() => validateFunding(player, offer, funding, capacity.businessId), [player, offer, funding, capacity]);
  const preview = useMemo(
    () => previewOffer(player, studioId, structure, quote.pct, offer, commitments, funding),
    [player, studioId, structure, quote.pct, offer, commitments, funding]
  );

  const step = Math.max(1, Math.round(quote.fair * 0.01));
  const toggleCommit = (id: CommitmentKind) => setCommitments(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
  const toggleSource = (id: FundingSource) => setSources(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const energyOk = (p.energy?.current ?? 0) >= OFFER_ENERGY;

  const submit = () => {
    const res = fileOffer(player, {
      studioId, structure, pct: quote.pct, offerPrice: offer, funding,
      businessId: capacity.businessId, commitments,
    });
    if (res.error) return notify(res.error);
    onUpdatePlayer(res.player);
    notify(`Offer filed. The board will respond in ${structure === 'FULL' || quote.controlAfter ? 3 : 1} week(s).`);
    onFiled();
  };

  const Chip: React.FC<{ t: string; pct: number; v: number }> = ({ t, pct, v }) => (
    <button
      onClick={() => setOffer(v)}
      className={`flex-1 py-2.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${Math.abs(offer - v) < 2 ? 'border-amber-400 text-amber-300 bg-amber-400/10' : 'border-white/10 text-zinc-400 bg-zinc-900/60'}`}
    >{t} · {pct}%</button>
  );

  return (
    <>
      <div className="p-4 pt-12 flex items-center shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl bg-zinc-900 border border-white/10"><ArrowLeft size={18} /></button>
        <div className="flex-1 text-center pr-9"><div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-500">The Deal Room</div><div className="text-xl font-black">The War Room</div></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32 space-y-6">
        {/* Structure */}
        <div>
          <div className={`${label} mb-2`}>Deal Structure</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['FULL', 'Full Acquisition', `Buy the remaining ${(100 - owned).toFixed(0)}%`],
              ['MINORITY', 'Minority Stake', 'Influence without control'],
            ] as [DealStructure, string, string][]).map(([id, title, desc]) => (
              <button key={id} onClick={() => setStructure(id)}
                className={`text-left p-3 rounded-2xl border ${structure === id ? 'border-amber-400/70 bg-amber-400/5' : 'border-white/10 bg-zinc-900/60'}`}>
                <div className="font-black text-sm">{title}</div><div className="text-[10px] text-zinc-500 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
          {structure === 'MINORITY' && (
            <div className="flex items-center justify-center gap-6 mt-3">
              <button onClick={() => setPctInput(v => Math.max(1, v - 1))} className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center"><Minus size={18} /></button>
              <div className="text-center"><div className="text-3xl font-black font-mono">{quote.pct}%</div><div className={label}>of the company</div></div>
              <button onClick={() => setPctInput(v => Math.min(maxPct, v + 1))} className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center"><Plus size={18} /></button>
            </div>
          )}
          {quote.controlAfter && <div className="mt-3 text-center text-[10px] font-bold text-amber-400">This takes you past 50%: you gain control of the studio.</div>}
        </div>

        {/* Number */}
        <div>
          <div className={`${label} mb-2`}>Your Number</div>
          <div className="border border-amber-500/30 bg-zinc-900/60 rounded-2xl p-4 flex items-center justify-between">
            <button onClick={() => setOffer(o => Math.max(step, o - step))} className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center"><Minus size={20} /></button>
            <div className="text-center">
              <div className="text-3xl font-black font-mono text-amber-300">{fmt(offer)}</div>
              <div className={`${label} mt-1`}>For {quote.pct}% · Ref {fmt(quote.fair)}</div>
            </div>
            <button onClick={() => setOffer(o => o + step)} className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center"><Plus size={20} /></button>
          </div>
          <div className="flex gap-2 mt-3">
            <Chip t="Conservative" pct={88} v={quote.conservative} />
            <Chip t="Fair" pct={100} v={quote.fairOffer} />
            <Chip t="Aggressive" pct={115} v={quote.aggressive} />
          </div>
        </div>

        <Gauge chance={preview.chance} zone={preview.zone} />

        {/* Commitments */}
        <div>
          <div className={`${label} mb-2`}>Seller Commitments <span className="normal-case tracking-normal text-zinc-600">sweeten the deal · bind you after closing</span></div>
          <div className="space-y-2">
            {COMMITMENTS.map(c => {
              const on = commitments.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCommit(c.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left ${on ? 'border-amber-400/60 bg-amber-400/5' : 'border-white/10 bg-zinc-900/50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${on ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>{on ? <Check size={16} /> : <Plus size={16} />}</div>
                  <div><div className="font-black text-sm">{c.title}</div><div className="text-[11px] text-zinc-500">{c.desc}</div></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Funding vault */}
        <div>
          <div className={`${label} mb-2`}>Funding Vault</div>
          <div className="space-y-2">
            {SOURCES.map(s => {
              const on = sources.has(s.id);
              const used = (funding[s.id] || 0);
              const cap = capacity[s.id];
              return (
                <button key={s.id} onClick={() => toggleSource(s.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left ${on ? 'border-amber-400/60 bg-amber-400/5' : 'border-white/10 bg-zinc-900/50 opacity-70'}`}>
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm">{s.id === 'COMPANY' && p.businesses?.length ? `${(p.businesses.find((b: any) => b.id === capacity.businessId)?.name || 'Company')} Capital` : s.title}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{fmt(cap)} available{on && used > 0 ? ` · using ${fmt(used)}` : ''}</div>
                  </div>
                  {on && <Check size={18} className="text-amber-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[10px]"><span className={label}>Compliance Heat</span><span className={`font-black ${check.heat >= 70 ? 'text-red-400' : 'text-amber-300'}`}>{check.heat}/100</span></div>
            <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden"><div className={`h-full ${check.heat >= 70 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${check.heat}%` }} /></div>
          </div>

          {!check.ok && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                {check.errors[0]}
                {check.gap > 1 && structure === 'FULL' && <div className="text-red-400/70 mt-1">Short by {fmt(check.gap)}. Add debt or switch to a minority stake.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <button
          onClick={submit}
          disabled={!check.ok || !energyOk}
          className="w-full py-4 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600"
        >
          File the Offer with the Board
          <span className="bg-black/20 rounded-md px-1.5 py-0.5 text-[10px] flex items-center"><Zap size={10} />{OFFER_ENERGY}E</span>
        </button>
        {!energyOk && <div className="text-center text-[10px] text-red-400 mt-1">Not enough energy.</div>}
      </div>
    </>
  );
};