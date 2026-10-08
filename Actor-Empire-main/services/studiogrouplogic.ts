// services/studioGroupLogic.ts
// Post-purchase studio management. Pure functions: every mutator takes a Player and returns a new Player.
import { Player, Business } from '../types';
import { computeFinancials, reportCommitmentBreach } from './deallogic';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const absWeek = (p: any) => (p.age || 18) * 52 + (p.currentWeek || 1);
const SALE_FEE = 0.03;

export type OperatingModel = 'INDEPENDENT' | 'MERGED';

const findStudio = (p: any, id?: string) => (id ? p.world?.studios?.[id] : undefined);

// ---------------------------------------------------------------- READ HELPERS
export const getGroupBusinesses = (player: Player): Business[] =>
  (player.businesses || []).filter(b => b.type === 'PRODUCTION_HOUSE');

export const getMergedStudioIds = (b: Business): string[] => ((b as any).mergedStudioIds || []) as string[];

export const getDebtsForStudio = (player: Player, studioId: string) => {
  const name = findStudio(player, studioId)?.name || '';
  return ((player.flags?.acquisitionDebts || []) as any[]).filter(
    d => d.studioId === studioId || (!d.studioId && name && String(d.label).startsWith(name))
  );
};

export const getGroupTotals = (player: Player) => {
  const debts = (player.flags?.acquisitionDebts || []) as any[];
  const debt = debts.reduce((s, d) => s + d.principal, 0);
  const weeklyInterest = debts.reduce((s, d) => s + Math.floor(d.principal * d.weeklyRate), 0);
  const studios = getGroupBusinesses(player);
  return {
    count: studios.length,
    valuation: studios.reduce((s, b) => s + (b.stats?.valuation || 0), 0),
    cash: studios.reduce((s, b) => s + Math.max(0, b.balance || 0), 0),
    debt,
    weeklyInterest,
    pendingLiabilities: ((player.flags?.pendingLiabilities || []) as any[]).reduce((s, l) => s + l.amount, 0),
  };
};

// ---------------------------------------------------------------- MERGE
export const canMerge = (player: Player, sourceBizId: string) => {
  const src = player.businesses.find(b => b.id === sourceBizId);
  const targets = getGroupBusinesses(player).filter(b => b.id !== sourceBizId);
  return !!src && !!(src as any).sourceStudioId && targets.length > 0;
};

const byId = <T extends { id: string }>(a: T[] = [], b: T[] = []) => {
  const seen = new Set(a.map(x => x.id));
  return [...a, ...b.filter(x => !seen.has(x.id))];
};

export const mergeStudios = (player: Player, sourceBizId: string, targetBizId: string): { player: Player; error?: string } => {
  let p: any = clone(player);
  const src: any = p.businesses.find((b: any) => b.id === sourceBizId);
  const dst: any = p.businesses.find((b: any) => b.id === targetBizId);
  if (!src || !dst || src.id === dst.id) return { player, error: 'Choose two different studios.' };
  if (!src.sourceStudioId) return { player, error: 'Only acquired studios can be merged.' };

  // Money, value, history
  dst.balance = (dst.balance || 0) + (src.balance || 0);
  dst.stats.valuation = (dst.stats.valuation || 0) + (src.stats?.valuation || 0);
  dst.stats.lifetimeRevenue = (dst.stats.lifetimeRevenue || 0) + (src.stats?.lifetimeRevenue || 0);

  // Studio state
  const a = dst.studioState || (dst.studioState = { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 });
  const s = src.studioState || {};
  a.scripts = byId(a.scripts, s.scripts);
  a.concepts = byId(a.concepts, s.concepts);
  a.writers = byId(a.writers, s.writers);
  a.talentRoster = byId(a.talentRoster, s.talentRoster);
  a.lockedStreamingFunds = byId(a.lockedStreamingFunds, s.lockedStreamingFunds);
  a.purchasedIPTitles = Array.from(new Set([...(a.purchasedIPTitles || []), ...(s.purchasedIPTitles || [])]));
  a.productionFund = (a.productionFund || 0) + (s.productionFund || 0);
  a.financeLedger = [
    { id: `merge_${Date.now()}`, week: p.currentWeek, year: p.age, amount: src.balance || 0, type: 'CAPITAL_INJECTION', label: `Merged ${src.name} treasury` },
    ...(a.financeLedger || []),
    ...(s.financeLedger || []),
  ].slice(0, 200);

  // Re-point every project that belonged to the absorbed studio
  p.commitments.forEach((c: any) => { if (c.projectDetails?.studioId === src.id) c.projectDetails.studioId = dst.id; });
  p.activeReleases.forEach((r: any) => { if (r.projectDetails?.studioId === src.id) r.projectDetails.studioId = dst.id; });
  p.pastProjects.forEach((x: any) => { if (x.studioId === src.id) x.studioId = dst.id; });

  // Keep income routing alive: the host now owns the absorbed studio's cash flow
  dst.mergedStudioIds = Array.from(new Set([...(dst.mergedStudioIds || []), src.sourceStudioId, ...(src.mergedStudioIds || [])]));
  const w = findStudio(p, src.sourceStudioId);
  if (w) w.mergedIntoBusinessId = dst.id;
  p.businesses = p.businesses.filter((b: any) => b.id !== src.id);

  const studioId = src.sourceStudioId as string;
  p.logs = [{ week: p.currentWeek, year: p.age, message: `🏛️ ${src.name} merged into ${dst.name}.`, type: 'neutral' }, ...(p.logs || [])].slice(0, 50);

  // Absorbing the brand breaks a "keep the name" promise to the seller
  p = reportCommitmentBreach(p as Player, studioId, 'NAME');
  return { player: p as Player };
};

export const mergeBreachesPromise = (player: Player, sourceBizId: string) => {
  const studioId = (player.businesses.find(b => b.id === sourceBizId) as any)?.sourceStudioId;
  return !!((player.world as any)?.commitmentsOwed || []).find((c: any) => c.studioId === studioId && c.kind === 'NAME' && !c.breached);
};

// ---------------------------------------------------------------- ACQUISITION DEBT
export const payAcquisitionDebt = (player: Player, debtId: string, amount: number): { player: Player; error?: string } => {
  const p: any = clone(player);
  const debts: any[] = p.flags?.acquisitionDebts || [];
  const d = debts.find(x => x.id === debtId);
  if (!d) return { player, error: 'Debt not found.' };
  const pay = Math.min(Math.floor(amount), Math.floor(d.principal));
  if (pay <= 0) return { player, error: 'Enter an amount to pay.' };
  if (p.money < pay) return { player, error: 'Not enough personal cash.' };
  p.money -= pay;
  d.principal -= pay;
  if (d.principal <= 0) p.flags.acquisitionDebts = debts.filter(x => x.id !== debtId);
  p.logs = [{ week: p.currentWeek, year: p.age, message: `🏦 Paid down ${d.label}.`, type: 'positive' }, ...(p.logs || [])].slice(0, 50);
  return { player: p as Player };
};

// ---------------------------------------------------------------- SALE
export const getSaleQuote = (player: Player, studioId: string) => {
  const p: any = player;
  const studio = findStudio(p, studioId);
  const stake = p.equityStakes?.[studioId];
  if (!studio || !stake) return null;
  const fin = computeFinancials(studio);
  const biz = (p.businesses || []).find((b: any) => b.sourceStudioId === studioId);
  const stakeValue = fin.equityValue * (stake.pct / 100);
  const cash = Math.max(0, biz?.balance || 0);
  const fee = Math.round(stakeValue * SALE_FEE);
  const debts = getDebtsForStudio(player, studioId) as any[];
  const loans = debts.filter(d => String(d.id).startsWith('debt_')).reduce((s, d) => s + d.principal, 0); // you repay these
  const assumed = debts.filter(d => String(d.id).startsWith('assumed_')).reduce((s, d) => s + d.principal, 0); // buyer takes these
  const net = stakeValue + cash - fee - loans;
  return { stakePct: stake.pct, stakeValue, cash, fee, loans, assumed, net, name: studio.name as string };
};

export const sellStudio = (player: Player, studioId: string): { player: Player; error?: string } => {
  const quote = getSaleQuote(player, studioId);
  if (!quote) return { player, error: 'You do not own this studio.' };
  const p: any = clone(player);
  p.money += quote.net;

  p.businesses = p.businesses.filter((b: any) => b.sourceStudioId !== studioId);
  p.businesses.forEach((b: any) => {
    if (b.mergedStudioIds) b.mergedStudioIds = b.mergedStudioIds.filter((id: string) => id !== studioId);
  });
  delete p.equityStakes[studioId];
  p.flags.acquisitionDebts = (p.flags.acquisitionDebts || []).filter((d: any) => !getDebtsForStudio(player, studioId).some((x: any) => x.id === d.id));
  p.flags.pendingLiabilities = (p.flags.pendingLiabilities || []).filter((l: any) => l.studioName !== quote.name);
  p.world.commitmentsOwed = (p.world.commitmentsOwed || []).filter((c: any) => c.studioId !== studioId);
  p.world.dealCooldowns[studioId] = absWeek(p) + 26;

  const w = findStudio(p, studioId);
  if (w) { w.isPlayerOwned = false; delete w.ownerId; delete w.mergedIntoBusinessId; }

  p.logs = [{ week: p.currentWeek, year: p.age, message: `💼 Sold ${quote.name} for a net $${(quote.net / 1e9).toFixed(2)}B.`, type: 'neutral' }, ...(p.logs || [])].slice(0, 50);
  return { player: p as Player };
};