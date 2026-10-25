// Place next to StudioDealRoom.tsx.
// Flow: NEWS (board said YES) -> MEMO -> DOCS (stamp 3 documents) -> CLAUSES 1-4 (last one is the signature) -> WON
import React, { useEffect, useState } from 'react';
import { Player } from '../../types';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import {
  getClosingPreview, completeClosing, markDecisionSeen, computeFinancials, CLOSING_ENERGY,
} from '../../services/deallogic';

// ------------------------------------------------------------------ helpers
const fmt = (n: number) => {
  const v = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (v >= 1e12) return `${s}$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${s}$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${s}$${(v / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(v).toLocaleString()}`;
};

type Phase = 'NEWS' | 'MEMO' | 'DOCS' | 'C1' | 'C2' | 'C3' | 'C4' | 'WON';
const STEPS = ['FILE', 'WAR', 'SEND', 'NEWS', 'TALK', 'DOCS', 'SIGN', 'WON'];
const STEP_OF: Record<Phase, number> = { NEWS: 3, MEMO: 4, DOCS: 5, C1: 6, C2: 6, C3: 6, C4: 6, WON: 7 };
const CLAUSE_ORDER: Phase[] = ['C1', 'C2', 'C3', 'C4'];
const TAKEOVER: Record<Phase, number> = { NEWS: 0, MEMO: 0, DOCS: 0, C1: 0, C2: 25, C3: 50, C4: 75, WON: 100 };

const COMMIT_LABEL: Record<string, string> = {
  NAME: 'Name Protected', STAFF: 'Staff Protected', SLATE: 'Slate Guaranteed',
};

const goldBtn = 'bg-gradient-to-b from-amber-300 to-amber-500 text-black font-black shadow-[0_10px_30px_rgba(245,158,11,0.25)]';
const paper = 'bg-[#efe6d0] text-[#2b2110]';
const row = 'bg-[#e1d6bb] border border-[#cdbf99] rounded-xl';
const tiny = 'text-[8px] font-black uppercase tracking-[0.2em] text-[#8a7240]';

interface Props {
  player: Player;
  dealId: string;
  onUpdatePlayer: (p: Player) => void;
  onClose: () => void;
}

export const StudioClosingCeremony: React.FC<Props> = ({ player, dealId, onUpdatePlayer, onClose }) => {
  const p: any = player;
  // Frozen on mount: after signing, ownership changes and would double count.
  const [pv] = useState(() => getClosingPreview(player, dealId));
  const [phase, setPhase] = useState<Phase>(() => (pv?.deal.decisionSeen === false ? 'NEWS' : 'MEMO'));
  const [stamped, setStamped] = useState<string[]>([]);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ player: Player; outcome: 'CLOSED' | 'REGULATORY' | 'TENDER' } | null>(null);
  const [revealed, setRevealed] = useState(0);

  // staggered social cards on the NEWS screen
  useEffect(() => {
    if (phase !== 'NEWS') return;
    setRevealed(0);
    const t = setInterval(() => setRevealed(r => (r < 5 ? r + 1 : r)), 650);
    return () => clearInterval(t);
  }, [phase]);

  const markSeen = () => {
    if (pv && pv.deal.decisionSeen === false) onUpdatePlayer(markDecisionSeen(player, dealId));
  };
  const close = () => { markSeen(); onClose(); };

  if (!pv) {
    return (
      <div className="fixed inset-0 z-[120] bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-400 text-sm">This deal is no longer available.</div>
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm">Close</button>
      </div>
    );
  }

  const buyer: string = p.name;
  const studio = pv.studioName;
  const energyNow = Math.floor(p.energy?.current ?? 0);
  const energyOk = energyNow >= CLOSING_ENERGY;

  const back = () => {
    if (phase === 'NEWS' || phase === 'MEMO') return close();
    if (phase === 'DOCS') return setPhase('MEMO');
    if (phase === 'C1') return setPhase('DOCS');
    if (phase === 'C2') return setPhase('C1');
    if (phase === 'C3') return setPhase('C2');
    if (phase === 'C4') return setPhase('C3');
  };

  const sign = () => {
    const res = completeClosing(player, dealId);
    if (res.error || !res.outcome) return setError(res.error || 'Could not complete the deal.');
    onUpdatePlayer(res.player);
    setResult({ player: res.player, outcome: res.outcome });
    setPhase('WON');
  };

  // ---------- shared pieces
  const StepBar = () => (
    <div className="flex justify-center gap-1.5 pt-12 pb-2 shrink-0">
      {STEPS.map((s, i) => (
        <span key={s} className={`text-[7px] font-black tracking-[0.2em] px-1.5 py-1 rounded-full ${
          i === STEP_OF[phase] ? 'bg-amber-400 text-black' : i < STEP_OF[phase] ? 'text-amber-500/80' : 'text-zinc-600'}`}>{s}</span>
      ))}
    </div>
  );

  const ClauseHeader = () => (
    <div className="shrink-0 px-4 pt-10">
      <div className="text-center text-[8px] font-black tracking-[0.35em] text-amber-400">EQUITY CLOSING CEREMONY</div>
      <div className="flex items-center mt-2">
        <button onClick={back} className="w-10 h-10 rounded-xl bg-black/50 border border-amber-500/30 flex items-center justify-center"><ArrowLeft size={18} /></button>
        <div className="flex-1 text-center pr-10 text-2xl font-serif italic font-bold leading-tight">{studio}</div>
      </div>
      <div className="flex gap-1.5 mt-3">
        {CLAUSE_ORDER.map((c, i) => (
          <div key={c} className={`h-1.5 flex-1 rounded-full ${CLAUSE_ORDER.indexOf(phase) >= i ? 'bg-amber-400' : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 border border-amber-500/25 rounded-xl px-3 py-2 bg-black/40">
        <span className="text-[8px] font-black tracking-[0.2em] text-amber-400/80">TAKEOVER METER</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${TAKEOVER[phase]}%` }} /></div>
        <span className="text-[10px] font-black text-amber-300">{TAKEOVER[phase]}%</span>
      </div>
    </div>
  );

  const ClauseFooter: React.FC<{ onNext: () => void; nextLabel?: string; disabled?: boolean; energy?: boolean }> = ({ onNext, nextLabel = 'Confirm Clause · Next →', disabled, energy }) => (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent grid grid-cols-[1fr_1.6fr] gap-3">
      <button onClick={back} className="py-4 rounded-2xl border border-white/15 bg-black text-sm font-bold">Previous</button>
      <button onClick={onNext} disabled={disabled} className={`py-4 rounded-2xl text-sm flex items-center justify-center gap-2 ${goldBtn} disabled:opacity-40 disabled:shadow-none`}>
        {nextLabel}
        {energy && <span className="bg-black/20 rounded-md px-1.5 py-0.5 text-[10px] flex items-center"><Zap size={10} />{CLOSING_ENERGY}E</span>}
      </button>
    </div>
  );

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 z-[120] bg-black text-white flex flex-col font-sans animate-in fade-in duration-300">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(133,87,12,0.35),transparent_60%)]" />
      <div className="relative flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );

  // ================================================================== NEWS
  if (phase === 'NEWS') {
    const strong = pv.ratio >= 1.1;
    const cards = [
      { k: 'press', outlet: 'HOLLYWOOD NOW', text: pv.controlled ? `${studio} sells — ${buyer}'s empire grows overnight` : `${buyer} buys into ${studio}` },
      { k: 'x', handle: '@TradeDeskLeaks', time: '2m', text: `${fmt(pv.price)}?? and the board took it ${pv.ratio >= 1.05 ? 'on the FIRST call' : 'after one tough call'} 😳`, stats: ['4.2K', '18.6K'] },
      { k: 'ig', handle: 'filmstan.daily', time: 'just now', text: `new era unlocked 🎬🔥 ${studio} x ${buyer}`, stats: ['12.8K likes'] },
      { k: 'press', outlet: 'CINEWIRE', text: strong ? 'Analysts call it "a statement price, not a bargain"' : 'Analysts call it "a measured bet on the studio\'s future"' },
      { k: 'x', handle: '@BoardroomBanter', time: '2m', text: 'somewhere a rival exec is throwing a chair rn 🪑💥', stats: ['2.9K', '9.4K'] },
    ];
    return shell(
      <>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-12 pb-32">
          <div className="flex justify-center">
            <div className="bg-amber-400 text-black font-black text-[11px] tracking-[0.35em] px-5 py-1.5 -rotate-2 shadow-lg">BREAKING</div>
          </div>
          <h1 className="text-center text-5xl font-serif font-black italic leading-[0.95] mt-5">DEAL OF THE<br />DECADE</h1>
          <p className="text-center text-sm text-zinc-400 mt-3 mb-5">{studio} board said YES</p>
          <div className="space-y-3">
            {cards.slice(0, revealed).map((c, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {c.k === 'press' ? (
                  <div className="bg-[#efe6d0] text-[#1a1408] rounded-2xl p-4 border-l-4 border-red-800">
                    <div className="text-[8px] font-black tracking-[0.2em] text-red-800">{c.outlet}</div>
                    <div className="font-serif font-bold text-lg leading-snug mt-1">{c.text}</div>
                  </div>
                ) : (
                  <div className={`rounded-2xl p-4 bg-zinc-900 border ${c.k === 'ig' ? 'border-rose-900/60' : 'border-white/10'}`}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${c.k === 'ig' ? 'bg-gradient-to-br from-fuchsia-500 to-amber-400' : 'bg-zinc-700'}`}>{c.k === 'ig' ? '◎' : 'X'}</span>
                      <b>{c.handle}</b><span className="text-zinc-500">· {c.time}</span>
                    </div>
                    <div className="mt-2 text-sm">{c.text}</div>
                    <div className="mt-2 text-[10px] text-zinc-500 flex gap-4">{c.stats?.map((st, j) => <span key={j}>{st}</span>)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <button onClick={() => { markSeen(); setPhase('MEMO'); }} className={`w-full py-4 rounded-2xl text-sm ${goldBtn}`}>Review the Board Decision</button>
        </div>
      </>
    );
  }

  // ================================================================== MEMO
  if (phase === 'MEMO') {
    const vote = pv.ratio >= 1.1 ? 'Unanimous — terms approved' : pv.ratio >= 1.0 ? 'Majority — 6 to 1' : 'Narrow — 5 to 4';
    return shell(
      <>
        <StepBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28">
          <div className="text-[9px] font-black tracking-[0.35em] text-amber-400">THEY SAID YES</div>
          <h2 className="text-3xl font-serif italic font-bold mt-2 text-amber-100">The pen is on the table.</h2>
          <div className={`relative ${paper} rounded-xl p-5 mt-6 w-full max-w-sm shadow-2xl`}>
            <div className="absolute -top-4 -right-3 rotate-6 border-4 border-emerald-700 text-emerald-700 bg-[#efe6d0] font-black tracking-[0.25em] text-xs px-3 py-1 rounded">ACCEPTED</div>
            <div className="text-center text-[8px] font-black tracking-[0.2em] text-[#8a7240] border-b-2 border-[#2b2110] pb-2">DEAL MEMO · {studio.toUpperCase()}</div>
            <div className="text-center text-4xl font-serif font-black my-4">{fmt(pv.price)}</div>
            <div className="space-y-2 text-xs border-t border-dashed border-[#8a7240] pt-3">
              <div className="flex justify-between"><span className={tiny}>Board vote</span><b>{vote}</b></div>
              <div className="flex justify-between"><span className={tiny}>Stake</span><b>{pv.deal.pct.toFixed(1)}% → {pv.afterPct.toFixed(1)}% total</b></div>
              <div className="flex justify-between"><span className={tiny}>Commitments</span><b>{pv.commitments.length ? 'Bound at closing' : 'None'}</b></div>
              <div className="flex justify-between"><span className={tiny}>Next step</span><b>Closing packet · signature</b></div>
            </div>
            <svg viewBox="0 0 200 40" className="w-40 mx-auto mt-4">
              <path d="M10 28 Q90 4 170 18 L190 24 L170 30 Q90 38 10 28 Z" fill="#1a1408" />
              <rect x="120" y="19" width="6" height="8" fill="#d4a017" transform="rotate(8 123 23)" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400 mt-5">All that remains is the paperwork.</p>
          <p className="text-[10px] text-zinc-600 mt-1">Sign within {pv.weeksToSign} week{pv.weeksToSign === 1 ? '' : 's'} or the offer lapses and your funds return.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <button onClick={() => setPhase('DOCS')} className={`w-full py-4 rounded-2xl text-sm ${goldBtn}`}>Proceed to Closing →</button>
        </div>
      </>
    );
  }

  // ================================================================== DOCS (stamp each)
  if (phase === 'DOCS') {
    const fundText = pv.fundingLines.map(l => l.label).join(' + ') || 'Escrow';
    const docs = [
      { id: 'EQ', title: 'Equity Subscription', mono: fmt(pv.price), sub: `Paid from ${fundText}` },
      { id: 'IR', title: 'Investor Rights', mono: pv.controlled ? 'Controlling interest' : 'Strategic minority position', sub: pv.controlled ? 'The studio joins your group' : 'The studio remains independently operated' },
      { id: 'SR', title: 'Stake Register', mono: pv.controlled ? 'Control instrument' : 'Influence instrument', sub: 'Equity is recorded at final signature' },
    ];
    const all = stamped.length === docs.length;
    return shell(
      <>
        <div className="shrink-0 px-4 pt-10">
          <div className="text-center text-[8px] font-black tracking-[0.35em] text-amber-400">CLOSING PACKET</div>
          <div className="flex items-center mt-2">
            <button onClick={back} className="w-10 h-10 rounded-xl bg-black/50 border border-amber-500/30 flex items-center justify-center"><ArrowLeft size={18} /></button>
            <div className="flex-1 text-center pr-10 text-xl font-black">Stamp Every Document</div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">Three documents stand between you and {studio}. Tap each to stamp it.</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-32 space-y-3">
          {docs.map(d => {
            const on = stamped.includes(d.id);
            return (
              <button key={d.id} onClick={() => setStamped(s => (s.includes(d.id) ? s : [...s, d.id]))}
                className={`w-full text-left ${paper} rounded-2xl p-4 flex items-center justify-between gap-3 ${on ? 'ring-2 ring-emerald-800/40' : ''}`}>
                <div className="min-w-0">
                  <div className="font-serif font-bold text-lg leading-tight">{d.title}</div>
                  <div className="font-mono text-xs text-[#7a5f12] font-bold mt-0.5">{d.mono}</div>
                  <div className="text-[10px] text-[#8a7240] mt-0.5">{d.sub}</div>
                </div>
                {on ? (
                  <div className="shrink-0 rotate-[-6deg] border-[3px] border-emerald-700 text-emerald-700 font-black tracking-[0.15em] text-xs px-3 py-1.5 rounded animate-in zoom-in-50 duration-200">REVIEWED</div>
                ) : (
                  <div className="shrink-0 border border-dashed border-[#b9a66d] text-[#b9a66d] text-[8px] font-black tracking-[0.2em] px-3 py-2 rounded">TAP TO STAMP</div>
                )}
              </button>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <button onClick={() => setPhase('C1')} disabled={!all} className={`w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 ${goldBtn} disabled:opacity-40 disabled:shadow-none`}>
            Enter the Signing Room
          </button>
        </div>
      </>
    );
  }

  // ================================================================== CLAUSES
  if (phase === 'C1' || phase === 'C2' || phase === 'C3' || phase === 'C4') {
    const docNo = `NPCV-${String(dealId).replace(/\D/g, '').slice(-5)}`;
    const Row: React.FC<{ t: string; v: React.ReactNode; note?: string }> = ({ t, v, note }) => (
      <div className={`${row} px-4 py-3`}>
        <div className="flex justify-between items-center gap-3"><span className={tiny}>{t}</span><span className="font-mono font-bold text-sm text-right">{v}</span></div>
        {note && <div className="text-[10px] text-[#8a7240] mt-1">{note}</div>}
      </div>
    );
    const next = () => setPhase(CLAUSE_ORDER[CLAUSE_ORDER.indexOf(phase) + 1]);

    return shell(
      <>
        <ClauseHeader />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-32">
          <div className={`${paper} rounded-2xl p-4 shadow-2xl`}>
            {phase === 'C1' && (
              <>
                <div className={`${tiny} border-b-2 border-[#2b2110] pb-2`}>Clause 1 · Deal Summary · Doc #{docNo}</div>
                <p className="text-sm font-medium mt-3 mb-3">Seller terms are accepted. Confirm the price, funding source, and transfer authority.</p>
                <div className="space-y-2">
                  <Row t="Stake Price" v={fmt(pv.price)} note={`${pv.deal.pct.toFixed(1)}% of ${studio}`} />
                  <div className={`${row} px-4 py-3`}>
                    <div className={tiny}>Funding Source</div>
                    {pv.fundingLines.map(l => (
                      <div key={l.source} className="flex justify-between font-mono text-sm mt-1"><span>{l.label}</span><b>{fmt(l.amount)}</b></div>
                    ))}
                  </div>
                  <Row t="Studio" v={studio} />
                  <Row t="Resulting Stake" v={`${pv.afterPct.toFixed(1)}%`} note={pv.controlled ? 'Past 50%: you take control.' : 'Below 50%: minority position with dividends.'} />
                </div>
              </>
            )}
            {phase === 'C2' && (
              <>
                <div className={`${tiny} border-b-2 border-[#2b2110] pb-2`}>Clause 2 · Assets + Risk · Doc #{docNo}</div>
                <p className="text-sm font-medium mt-3 mb-3">Review what moves into your company group when the signature lands.</p>
                <div className="space-y-2">
                  <Row t="Catalog" v={pv.catalog !== undefined ? `${pv.catalog} titles` : 'Not disclosed'} />
                  <Row t="Debt + Liabilities" v={fmt(pv.debtAndLiabilities)}
                    note={pv.verified ? 'Verified by due diligence.' : 'Unverified: hidden liabilities may be missing.'} />
                  <Row t="Expected Income" v={`${fmt(pv.income)}/yr`} />
                </div>
                {pv.controlled && !pv.verified && (
                  <div className="mt-3 text-[11px] font-bold text-red-800 bg-red-100/60 border border-red-300 rounded-xl p-3">
                    Control without diligence: hidden liabilities can hit about 4 weeks after closing.
                  </div>
                )}
                {pv.controlled && (
                  <div className="mt-3 text-[11px] text-[#6b5a2f]">The studio's own debt becomes yours and accrues interest weekly.</div>
                )}
              </>
            )}
            {phase === 'C3' && (
              <>
                <div className={`${tiny} border-b-2 border-[#2b2110] pb-2`}>Clause 3 · Binding Clauses · Doc #{docNo}</div>
                <p className="text-sm font-medium mt-3 mb-3">These promises become active obligations after the seal.</p>
                {pv.commitments.length ? (
                  <div className="space-y-2">
                    {pv.commitments.map(c => (
                      <div key={c} className="rounded-xl px-4 py-3 bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-black text-[11px] tracking-[0.15em] uppercase flex items-center gap-2">
                        <Check size={14} />{COMMIT_LABEL[c] || c}
                      </div>
                    ))}
                    <div className="text-[10px] text-[#8a7240] pt-1">Valid for 2 years. Breaking one costs reputation and cash.</div>
                  </div>
                ) : (
                  <div className={`${row} px-4 py-4 text-sm`}>No commitments were made. Nothing binds you after closing.</div>
                )}
              </>
            )}
            {phase === 'C4' && (
              <>
                <div className={`${tiny} border-b-2 border-[#2b2110] pb-2`}>Clause 4 · Signature · Doc #{docNo}</div>
                <p className="text-sm font-medium mt-3 mb-3">One signature files the transfer. Funds and energy are checked first.</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl p-2.5 border bg-emerald-100/70 border-emerald-300"><div className={tiny}>Funds</div><div className="font-black text-xs text-emerald-900 mt-1">Ready</div></div>
                  <div className={`rounded-xl p-2.5 border ${energyOk ? 'bg-emerald-100/70 border-emerald-300' : 'bg-red-100/70 border-red-300'}`}>
                    <div className={tiny}>Energy</div><div className={`font-black text-xs mt-1 ${energyOk ? 'text-emerald-900' : 'text-red-800'}`}>{energyNow}/{CLOSING_ENERGY}E</div>
                  </div>
                  <div className="rounded-xl p-2.5 border bg-emerald-100/70 border-emerald-300"><div className={tiny}>Terms</div><div className="font-black text-xs text-emerald-900 mt-1">Accepted</div></div>
                </div>
                <button onClick={() => setSigned(true)} className={`mt-4 w-full rounded-2xl border-2 border-dashed ${signed ? 'border-emerald-700 bg-emerald-50' : 'border-[#8a7240] bg-[#e6dcc2]'} py-8 px-4 transition-colors`}>
                  {signed ? (
                    <div className="font-serif italic text-4xl text-[#1b2a6b] -rotate-2 animate-in zoom-in-75 duration-300">{buyer}</div>
                  ) : (
                    <div className="font-serif italic text-3xl text-[#b9a66d]">Tap to sign</div>
                  )}
                  <div className="border-t-2 border-[#2b2110] mt-3 pt-1.5 text-[9px] font-black tracking-[0.2em]">{buyer.toUpperCase()} · BUYER OF RECORD</div>
                </button>
                {error && <div className="mt-3 text-xs font-bold text-red-800">{error}</div>}
                {!energyOk && <div className="mt-3 text-xs font-bold text-red-800">You need {CLOSING_ENERGY} energy. Rest or restore energy, then come back; the offer stays valid for {pv.weeksToSign} week(s).</div>}
              </>
            )}
          </div>
        </div>
        {phase === 'C4'
          ? <ClauseFooter onNext={sign} nextLabel="Sign the Transfer" disabled={!signed || !energyOk} energy />
          : <ClauseFooter onNext={next} />}
      </>
    );
  }

  // ================================================================== WON
  const rp: any = result?.player;
  const stake = rp?.equityStakes?.[pv.deal.studioId];
  const rStudio = rp?.world?.studios && (rp.world.studios[pv.deal.studioId] || Object.values(rp.world.studios).find((s: any) => s?.id === pv.deal.studioId));
  const rFin = computeFinancials(rStudio);
  const outcome = result?.outcome;
  const closed = outcome === 'CLOSED';
  const finalPct = stake?.pct ?? pv.afterPct;
  const value = rFin.equityValue * (finalPct / 100);
  const weeklyDiv = (rFin.annualIncome / 52) * (finalPct / 100) * 0.4;

  const Line: React.FC<{ t: string; v: React.ReactNode }> = ({ t, v }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-[#b9a66d] last:border-0">
      <span className={tiny}>{t}</span><span className="font-mono font-bold text-sm text-right">{v}</span>
    </div>
  );

  return shell(
    <>
      <StepBar />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-28">
        <div className="text-center">
          <div className="text-[9px] font-black tracking-[0.35em] text-amber-400">
            {closed ? (pv.controlled ? 'TAKEOVER COMPLETE' : 'STAKE SECURED') : outcome === 'REGULATORY' ? 'FILED · UNDER REVIEW' : 'FILED · TENDER OPEN'}
          </div>
          <h2 className="text-4xl font-serif italic font-bold mt-2 text-amber-100">
            {closed ? (pv.controlled ? `${studio} is yours.` : 'The deal is done.') : outcome === 'REGULATORY' ? 'Regulators are reading.' : 'The tender is live.'}
          </h2>
          <div className="text-6xl font-black font-mono text-amber-300 mt-4">{closed ? `${finalPct.toFixed(1)}%` : `${pv.afterPct.toFixed(1)}%`}</div>
          <div className="text-[10px] tracking-[0.25em] text-zinc-500 font-black uppercase mt-1">{closed ? 'of ' + studio : 'pending completion'}</div>
        </div>

        <div className={`${paper} rounded-2xl p-4 mt-6 shadow-2xl`}>
          <Line t="Price paid" v={fmt(pv.price)} />
          {closed && <Line t="Position value" v={fmt(value)} />}
          {closed && !pv.controlled && <Line t="Est. dividends" v={`${fmt(weeklyDiv)}/wk`} />}
          {closed && pv.controlled && <Line t="Studio" v="Added to your companies" />}
          {closed && pv.controlled && <Line t="Debt assumed" v={fmt(pv.debt)} />}
          {pv.fundingLines.some(l => l.source === 'DEBT') && <Line t="Acquisition loan" v={fmt(pv.fundingLines.find(l => l.source === 'DEBT')!.amount)} />}
          <Line t="Binding clauses" v={pv.commitments.length ? pv.commitments.map(c => COMMIT_LABEL[c]).join(', ') : 'None'} />
          {outcome === 'REGULATORY' && <Line t="Review time" v="3 weeks" />}
          {outcome === 'TENDER' && <Line t="Tender window" v="1 week" />}
        </div>

        {closed && pv.controlled && !pv.verified && (
          <div className="mt-4 text-xs font-bold text-red-300 bg-red-950/50 border border-red-500/30 rounded-xl p-3">
            Expect hidden liabilities to surface in about 4 weeks.
          </div>
        )}
        {!closed && (
          <div className="mt-4 text-xs text-zinc-400 bg-zinc-900/60 border border-white/10 rounded-xl p-3">
            Your funds stay in escrow. If regulators block the deal, they are returned.
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <button onClick={onClose} className={`w-full py-4 rounded-2xl text-sm ${goldBtn}`}>Done</button>
      </div>
    </>
  );
};