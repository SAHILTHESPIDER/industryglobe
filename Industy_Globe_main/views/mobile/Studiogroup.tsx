import React, { useState } from 'react';
import { Player, Business } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import {
  getGroupBusinesses, getMergedStudioIds, getDebtsForStudio, getGroupTotals,
  canMerge, mergeStudios, mergeBreachesPromise, payAcquisitionDebt, getSaleQuote, sellStudio,
} from '../../services/studiogrouplogic';
import { ProductionHouseGame } from '../lifestyle/business/ProductionHouseGame';
import { ArrowLeft, Building2, Landmark, GitMerge, Briefcase, X, AlertTriangle, ChevronRight } from 'lucide-react';

interface Props {
  player: Player;
  onBack: () => void;
  onUpdatePlayer: (p: Player) => void;
}

type Modal =
  | { kind: 'MODEL'; bizId: string }
  | { kind: 'SELL'; studioId: string }
  | null;

export const StudioGroup: React.FC<Props> = ({ player, onBack, onUpdatePlayer }) => {
  const [openBizId, setOpenBizId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [error, setError] = useState('');

  if (openBizId && player.businesses.some(b => b.id === openBizId)) {
    return <ProductionHouseGame player={player} businessId={openBizId} onBack={() => setOpenBizId(null)} onUpdatePlayer={onUpdatePlayer} />;
  }

  const studios = getGroupBusinesses(player);
  const totals = getGroupTotals(player);
  const debts = ((player.flags?.acquisitionDebts || []) as any[]);
  const studioName = (id: string) => (player.world as any)?.studios?.[id]?.name || id;

  const apply = (res: { player: Player; error?: string }) => {
    if (res.error) { setError(res.error); return false; }
    setError('');
    onUpdatePlayer(res.player);
    return true;
  };

  const modelBiz = modal?.kind === 'MODEL' ? player.businesses.find(b => b.id === modal.bizId) : undefined;
  const sellQuote = modal?.kind === 'SELL' ? getSaleQuote(player, modal.studioId) : null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-[#050505] text-white font-sans animate-in slide-in-from-right duration-300">
      <div className="shrink-0 border-b border-white/5 bg-zinc-900/60 px-5 pb-5 pt-12">
        <button onClick={onBack} className="mb-4 rounded-full border border-white/5 bg-black/40 p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-black tracking-tight">Studio Group</h1>
        <p className="mt-1 text-xs text-zinc-400">{totals.count} {totals.count === 1 ? 'studio' : 'studios'} under your control</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Group value" value={formatMoney(totals.valuation)} tone="text-amber-300" />
          <Stat label="Studio cash" value={formatMoney(totals.cash)} tone="text-emerald-400" />
          <Stat label="Acquisition debt" value={formatMoney(totals.debt)} tone="text-rose-300" />
          <Stat label="Interest per week" value={formatMoney(totals.weeklyInterest)} tone="text-rose-300" />
        </div>
        {totals.pendingLiabilities > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Hidden liabilities of {formatMoney(totals.pendingLiabilities)} are due soon. Keep personal cash ready.
          </div>
        )}
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

        {studios.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            You do not own a studio yet. Open Forbes, pick a studio and file an offer.
          </div>
        )}

        {studios.map((b: Business) => {
          const sid = (b as any).sourceStudioId as string | undefined;
          const merged = getMergedStudioIds(b);
          return (
            <div key={b.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <button onClick={() => setOpenBizId(b.id)} className="flex w-full items-center justify-between text-left">
                <div className="min-w-0">
                  <div className="truncate text-lg font-black">{b.name}</div>
                  <div className="text-[11px] text-zinc-500">{sid ? 'Acquired studio' : 'Home studio'}{merged.length > 0 ? `, includes ${merged.length} merged` : ''}</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-600" />
              </button>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Value" value={formatMoney(b.stats?.valuation || 0)} />
                <Mini label="Cash" value={formatMoney(b.balance || 0)} />
                <Mini label="Weekly" value={formatMoney(b.stats?.weeklyProfit || 0)} />
              </div>

              {merged.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {merged.map(id => (
                    <span key={id} className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-300">{studioName(id)}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => setOpenBizId(b.id)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black">
                  <Building2 size={14} /> Command center
                </button>
                {sid && (
                  <button onClick={() => { setMergeTarget(''); setError(''); setModal({ kind: 'MODEL', bizId: b.id }); }} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-xs font-bold text-zinc-200">
                    <GitMerge size={14} /> Operating model
                  </button>
                )}
              </div>
              {sid && (
                <button onClick={() => { setError(''); setModal({ kind: 'SELL', studioId: sid }); }} className="mt-2 w-full rounded-xl border border-rose-500/30 py-2.5 text-xs font-bold text-rose-300">
                  Sell this studio
                </button>
              )}
            </div>
          );
        })}

        {debts.length > 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Landmark size={16} className="text-rose-300" /> Acquisition debt</div>
            <div className="space-y-3">
              {debts.map(d => (
                <div key={d.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm font-bold">{d.label}</div>
                    <div className="shrink-0 font-mono text-sm font-bold text-rose-300">{formatMoney(d.principal)}</div>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">{(d.weeklyRate * 52 * 100).toFixed(1)}% a year, {formatMoney(Math.floor(d.principal * d.weeklyRate))} each week</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => apply(payAcquisitionDebt(player, d.id, d.principal * 0.1))} className="rounded-xl border border-sky-500/30 bg-sky-500/10 py-2 text-[11px] font-bold text-sky-200">Pay 10%</button>
                    <button onClick={() => apply(payAcquisitionDebt(player, d.id, d.principal))} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-200">Pay in full</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-zinc-500">Payments come from your personal cash of {formatMoney(player.money)}.</div>
          </div>
        )}
      </div>

      {/* OPERATING MODEL */}
      {modelBiz && (
        <Sheet title="Operating model" onClose={() => setModal(null)}>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="text-sm font-bold text-emerald-200">Independent (current)</div>
            <p className="mt-1 text-xs text-emerald-100/70">{modelBiz.name} keeps its own books, brand and slate. Seller promises stay safe.</p>
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-800 p-4">
            <div className="text-sm font-bold">Merge into another studio</div>
            <p className="mt-1 text-xs text-zinc-400">Cash, scripts, talent, projects and value move to the studio you choose. This cannot be undone.</p>
            {canMerge(player, modelBiz.id) ? (
              <>
                <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm">
                  <option value="">Choose a studio</option>
                  {getGroupBusinesses(player).filter(b => b.id !== modelBiz.id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {mergeBreachesPromise(player, modelBiz.id) && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    You promised the seller to keep the studio name. Merging breaks that promise: reputation drops and you pay a penalty.
                  </div>
                )}
                <button
                  disabled={!mergeTarget}
                  onClick={() => { if (apply(mergeStudios(player, modelBiz.id, mergeTarget))) setModal(null); }}
                  className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-40"
                >
                  Merge studios
                </button>
              </>
            ) : (
              <div className="mt-3 text-xs text-zinc-500">You need a second studio to merge into.</div>
            )}
          </div>
          {error && <div className="mt-3 text-xs text-rose-300">{error}</div>}
        </Sheet>
      )}

      {/* SELL */}
      {sellQuote && modal?.kind === 'SELL' && (
        <Sheet title={`Sell ${sellQuote.name}`} onClose={() => setModal(null)}>
          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm">
            <Row label={`Your ${sellQuote.stakePct.toFixed(1)}% stake`} value={formatMoney(sellQuote.stakeValue)} />
            <Row label="Studio cash" value={formatMoney(sellQuote.cash)} />
            <Row label="Banker fee" value={`-${formatMoney(sellQuote.fee)}`} tone="text-rose-300" />
            <Row label="Acquisition loan repaid" value={`-${formatMoney(sellQuote.loans)}`} tone="text-rose-300" />
            <div className="border-t border-zinc-800 pt-2"><Row label="You receive" value={formatMoney(sellQuote.net)} tone={sellQuote.net >= 0 ? 'text-emerald-400' : 'text-rose-400'} bold /></div>
          </div>
          {sellQuote.assumed > 0 && <p className="mt-3 text-xs text-zinc-400">The buyer takes over {formatMoney(sellQuote.assumed)} of the studio's own debt.</p>}
          <p className="mt-2 text-xs text-zinc-500">You cannot bid for this studio again for 26 weeks.</p>
          {error && <div className="mt-3 text-xs text-rose-300">{error}</div>}
          <button onClick={() => { if (apply(sellStudio(player, modal.studioId))) setModal(null); }} className="mt-4 w-full rounded-xl bg-rose-600 py-3 text-sm font-black">Confirm sale</button>
        </Sheet>
      )}
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-3">
    <div className="text-[10px] text-zinc-500">{label}</div>
    <div className={`mt-1 truncate font-mono text-base font-bold ${tone}`}>{value}</div>
  </div>
);
const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-xl border border-zinc-800 bg-black/30 p-2">
    <div className="text-[9px] text-zinc-500">{label}</div>
    <div className="truncate font-mono text-xs font-bold">{value}</div>
  </div>
);
const Row = ({ label, value, tone = 'text-white', bold }: { label: string; value: string; tone?: string; bold?: boolean }) => (
  <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">{label}</span><span className={`font-mono ${bold ? 'font-black' : 'font-bold'} ${tone}`}>{value}</span></div>
);
const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="absolute inset-0 z-[70] flex items-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div className="max-h-[85%] w-full overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-950 p-5 pb-8" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">{title}</h2>
        <button onClick={onClose} className="rounded-full bg-zinc-900 p-2"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);