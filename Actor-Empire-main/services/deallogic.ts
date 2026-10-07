// services/dealLogic.ts
// Studio acquisition engine. Pure functions: every function takes a Player and returns a new Player.
// Add these optional fields to your types.ts (see bottom of this file).

import { Player, Stock } from '../types';
import { createBusiness } from './businessLogic';
import { spendPlayerEnergy } from './premiumLogic';

const B = 1_000_000_000;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const absWeek = (p: Player) => (p.age || 18) * 52 + (p.currentWeek || 1);

// ------------------------------------------------------------------ TYPES
export type DealStructure = 'FULL' | 'MINORITY';
export type DealStatus =
  | 'OFFER_PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REGULATORY' | 'TENDER'
  | 'CLOSED' | 'REJECTED' | 'BLOCKED' | 'WITHDRAWN';
export type CommitmentKind = 'NAME' | 'STAFF' | 'SLATE';
export type FundingSource = 'PERSONAL' | 'COMPANY' | 'DEBT';
export type FundingMix = Partial<Record<FundingSource, number>>;
export type OfferZone = 'INSULTING' | 'TESTING' | 'COMPETITIVE' | 'STRONG';

export interface Deal {
  id: string;
  studioId: string;
  studioName: string;
  structure: DealStructure;
  pct: number;                // % of company being bought in this deal
  offerPrice: number;         // dollars
  counterPrice?: number;
  fairPrice: number;
  funding: FundingMix;
  businessId?: string;        // company paying the COMPANY part
  commitments: CommitmentKind[];
  status: DealStatus;
  weeksLeft: number;
  filedAbs: number;
  diligenceDone: boolean;
  heat: number;
  acceptedAbs?: number;       // week the board said yes
  decisionSeen?: boolean;     // false until the player has seen the "board said YES" screen
}

export const LIVE_STATUSES: DealStatus[] = ['OFFER_PENDING', 'COUNTERED', 'ACCEPTED', 'REGULATORY', 'TENDER'];

export interface EquityStake { pct: number; costBasis: number; sinceAbs: number; controlled: boolean }
export interface AcquisitionDebt { id: string; label: string; principal: number; weeklyRate: number }

export interface StudioFinancials {
  enterpriseValue: number;
  debt: number;
  hiddenLiabilities: number;
  equityValue: number;        // EV - debt - hidden  (what shareholders really own)
  annualIncome: number;
  sharesOutstanding: number;
  pricePerShare: number;
}

// ------------------------------------------------------------------ STATE SAFETY (call from hydration)
export const ensureDealState = (player: Player): Player => {
  const p: any = player;
  if (!p.world) p.world = {};
  if (!Array.isArray(p.world.deals)) p.world.deals = [];
  if (!p.world.dealCooldowns) p.world.dealCooldowns = {};
  if (!Array.isArray(p.world.commitmentsOwed)) p.world.commitmentsOwed = [];
  if (!p.world.diligence) p.world.diligence = {};
  if (!p.equityStakes) p.equityStakes = {};
  if (!p.flags) p.flags = {};
  if (!Array.isArray(p.flags.acquisitionDebts)) p.flags.acquisitionDebts = [];
  if (!Array.isArray(p.flags.pendingLiabilities)) p.flags.pendingLiabilities = [];
  if (typeof p.flags.complianceHeat !== 'number') p.flags.complianceHeat = 0;
  // Calibrate shares ONCE so stock price and studio equity agree.
  const studios = p.world.studios || {};
  (p.stocks || []).forEach((stock: Stock) => {
    const studio = findStudio(studios, stock.relatedStudioId);
    if (!studio || studio.sharesOutstanding) return;
    const fin = computeFinancials(studio);
    studio.sharesOutstanding = Math.max(1_000_000, Math.round(fin.equityValue / Math.max(0.01, stock.price)));
  });
  return p as Player;
};

const findStudio = (studios: any, id?: string) => {
  if (!id || !studios) return undefined;
  return studios[id] || Object.values(studios).find((s: any) => s?.id === id);
};
export const getStockForStudio = (player: Player, studioId: string) =>
  (player.stocks || []).find(s => s.relatedStudioId === studioId);

// ------------------------------------------------------------------ 1. SINGLE SOURCE OF TRUTH VALUATION
// studio.valuation is in BILLIONS (matches your Forbes formatValuation).
export const computeFinancials = (studio: any): StudioFinancials => {
  const ev = (Number(studio?.valuation) || 0) * B;
  const debt = Number(studio?.debt) || ev * 0.19;
  const hidden = Number(studio?.hiddenLiabilities) || debt * 0.78;
  const equity = Math.max(ev * 0.05, ev - debt - hidden);
  const shares = Number(studio?.sharesOutstanding) || Math.max(1, equity / 50);
  return {
    enterpriseValue: ev,
    debt,
    hiddenLiabilities: hidden,
    equityValue: equity,
    annualIncome: Number(studio?.annualIncome) || ev * 0.04,
    sharesOutstanding: shares,
    pricePerShare: equity / shares,
  };
};

// What the UI shows before due diligence (hidden liabilities are unknown and understated).
export const getVisibleFinancials = (player: Player, studioId: string) => {
  const studio = findStudio((player.world as any)?.studios, studioId);
  const fin = computeFinancials(studio);
  const verified = !!(player.world as any)?.diligence?.[studioId];
  return {
    ...fin,
    verified,
    shownHidden: verified ? fin.hiddenLiabilities : 0,
    shownEquity: verified ? fin.equityValue : fin.enterpriseValue - fin.debt,
  };
};

// Studio value follows the stock market. Debt stays fixed, so equity moves with the price.
export const syncStudiosWithStocks = (player: Player, prevStocks: Stock[]): Player => {
  const p: any = player;
  (p.stocks || []).forEach((stock: Stock) => {
    const prev = prevStocks.find(s => s.id === stock.id);
    const studio = findStudio(p.world?.studios, stock.relatedStudioId);
    if (!prev || !studio || !prev.price) return;
    const ratio = stock.price / prev.price;
    const fin = computeFinancials(studio);
    studio.valuation = (fin.equityValue * ratio + fin.debt + fin.hiddenLiabilities) / B;
  });
  return p as Player;
};

// ------------------------------------------------------------------ 2. OWNERSHIP
export const getOwnedPct = (player: Player, studioId: string): number => {
  const p: any = player;
  const studio = findStudio(p.world?.studios, studioId);
  const stock = getStockForStudio(player, studioId);
  const shares = Number(studio?.sharesOutstanding) || 0;
  const held = stock ? (p.portfolio || []).find((i: any) => i.stockId === stock.id)?.shares || 0 : 0;
  const fromMarket = shares > 0 ? (held / shares) * 100 : 0;
  const fromStake = p.equityStakes?.[studioId]?.pct || 0;
  return clamp(fromMarket + fromStake, 0, 100);
};

export const OWNERSHIP_TIERS = [
  { at: 5,  label: 'Disclosure filed', effect: 'Board becomes wary; price demands rise.' },
  { at: 10, label: 'Influence',        effect: 'You can suggest slate changes.' },
  { at: 25, label: 'Blocking stake',   effect: 'You can veto major board decisions.' },
  { at: 50, label: 'Control',          effect: 'Studio consolidates into your group.' },
];

// ------------------------------------------------------------------ 3. PRICING + OFFER SCORING
export const controlPremium = (totalPctAfter: number) => (totalPctAfter >= 50 ? 1.25 : totalPctAfter >= 25 ? 1.1 : 1);

export const fairPriceFor = (player: Player, studioId: string, pct: number) => {
  const fin = computeFinancials(findStudio((player.world as any)?.studios, studioId));
  const after = getOwnedPct(player, studioId) + pct;
  return fin.equityValue * (pct / 100) * controlPremium(after);
};

export const getOfferZone = (ratio: number): OfferZone =>
  ratio < 0.9 ? 'INSULTING' : ratio < 1 ? 'TESTING' : ratio < 1.1 ? 'COMPETITIVE' : 'STRONG';

export const COMMITMENT_DISCOUNT = 0.03; // each commitment lowers the premium the board demands by 3%

// The ratio (offer / fair) the board needs before it is a coin flip.
export const requiredRatio = (
  player: Player, studioId: string, structure: DealStructure,
  commitments: CommitmentKind[], heat: number
): number => {
  const p: any = player;
  const studio = findStudio(p.world?.studios, studioId) || {};
  const reputation = Number(studio.reputation ?? studio.stats?.brandHealth ?? 50);
  const rawHit = Number(studio.hitRate ?? 0.5);
  const hitRate = rawHit > 1 ? rawHit / 100 : rawHit;
  const relationship = Number(p.flags?.studioRelations?.[studioId] ?? 30);
  const rivals = Number(studio.rivalBidders ?? (computeFinancials(studio).enterpriseValue > 100 * B ? 1 : 0));
  const stake = getOwnedPct(player, studioId);

  let need = 1.0
    + (reputation / 100) * 0.08
    + hitRate * 0.05
    + (structure === 'FULL' ? 0.08 : 0.02)
    + rivals * 0.04
    + (heat > 70 ? 0.05 : 0);
  need -= commitments.length * COMMITMENT_DISCOUNT;
  need -= relationship * 0.0004;
  need -= stake * 0.002;
  return clamp(need, 0.75, 1.5);
};

export const acceptanceChance = (ratio: number, need: number) =>
  clamp(1 / (1 + Math.exp(-(ratio - need) * 18)), 0.02, 0.97);

// ------------------------------------------------------------------ 4. FUNDING
export const fundingTotal = (mix: FundingMix) =>
  (mix.PERSONAL || 0) + (mix.COMPANY || 0) + (mix.DEBT || 0);

export const getFundingCapacity = (player: Player, businessId?: string) => {
  const p: any = player;
  const biz = (p.businesses || []).find((b: any) => b.id === businessId)
    || [...(p.businesses || [])].sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0))[0];
  const netWorth = Math.max(0, p.money + getExtraNetWorth(player));
  return {
    PERSONAL: Math.max(0, p.money),
    COMPANY: Math.max(0, biz?.balance || 0),
    DEBT: Math.floor(netWorth * 0.5),
    businessId: biz?.id as string | undefined,
  };
};

export const computeHeat = (player: Player, mix: FundingMix) => {
  const total = Math.max(1, fundingTotal(mix));
  const base = (player as any).flags?.complianceHeat || 0;
  return clamp(Math.round(base + ((mix.COMPANY || 0) / total) * 50 + ((mix.DEBT || 0) / total) * 30), 0, 100);
};

export const validateFunding = (player: Player, price: number, mix: FundingMix, businessId?: string) => {
  const cap = getFundingCapacity(player, businessId);
  const errors: string[] = [];
  if ((mix.PERSONAL || 0) > cap.PERSONAL) errors.push('Not enough personal cash.');
  if ((mix.COMPANY || 0) > cap.COMPANY) errors.push('Company capital is too low.');
  if ((mix.DEBT || 0) > cap.DEBT) errors.push('Debt exceeds your borrowing capacity.');
  const gap = Math.max(0, price - fundingTotal(mix));
  if (gap > 1) errors.push('Funding does not cover the offer.');
  const heat = computeHeat(player, mix);
  if (heat >= 100) errors.push('Compliance heat is too high; regulators would block this.');
  return { ok: errors.length === 0, errors, gap, heat, capacity: cap };
};

// Auto-fill: personal first, then company, then debt. Used by UI to prefill the vault.
export const suggestFunding = (player: Player, price: number, businessId?: string): FundingMix => {
  const cap = getFundingCapacity(player, businessId);
  let left = price;
  const mix: FundingMix = {};
  for (const k of ['PERSONAL', 'COMPANY', 'DEBT'] as FundingSource[]) {
    const take = Math.min(left, cap[k]);
    if (take > 0) { mix[k] = Math.floor(take); left -= take; }
  }
  return mix;
};

// ------------------------------------------------------------------ QUOTE / PREVIEW (for the War Room UI)
export const getDealQuote = (
  player: Player, studioId: string, structure: DealStructure, pctInput: number,
  commitments: CommitmentKind[] = []
) => {
  const owned = getOwnedPct(player, studioId);
  const pct = structure === 'FULL' ? Math.max(0, 100 - owned) : clamp(pctInput, 1, Math.max(1, 100 - owned));
  const fair = fairPriceFor(player, studioId, pct);
  return {
    owned, pct, fair,
    conservative: Math.round(fair * 0.88),
    fairOffer: Math.round(fair),
    aggressive: Math.round(fair * 1.15),
    controlAfter: owned + pct >= 50,
    commitments,
  };
};

export const previewOffer = (
  player: Player, studioId: string, structure: DealStructure, pct: number,
  offerPrice: number, commitments: CommitmentKind[], mix: FundingMix
) => {
  const fair = fairPriceFor(player, studioId, pct);
  const ratio = fair > 0 ? offerPrice / fair : 0;
  const heat = computeHeat(player, mix);
  const need = requiredRatio(player, studioId, structure, commitments, heat);
  return { ratio, zone: getOfferZone(ratio), chance: acceptanceChance(ratio, need), need, heat, fair };
};

// ------------------------------------------------------------------ DUE DILIGENCE
export const DILIGENCE_ENERGY = 15;
export const runDueDiligence = (player: Player, studioId: string): { player: Player; error?: string } => {
  const p: any = clone(player);
  ensureDealState(p);
  if (p.world.diligence[studioId]) return { player: p, error: 'Diligence already completed.' };
  const fin = computeFinancials(findStudio(p.world.studios, studioId));
  const cost = Math.round(Math.max(5_000_000, fin.equityValue * 0.0005));
  if (p.money < cost) return { player, error: 'Not enough cash for due diligence.' };
  if (p.energy.current < DILIGENCE_ENERGY) return { player, error: 'Not enough energy.' };
  p.money -= cost;
  spendPlayerEnergy(p, DILIGENCE_ENERGY);
  p.world.diligence[studioId] = { completedAbs: absWeek(p) };
  p.logs = [{ week: p.currentWeek, year: p.age, message: `🔍 Due diligence on ${findStudio(p.world.studios, studioId)?.name || studioId} verified debt and hidden liabilities.`, type: 'neutral' }, ...(p.logs || [])].slice(0, 50);
  return { player: p };
};

// ------------------------------------------------------------------ 5. FILE AN OFFER (escrow funds)
export const OFFER_ENERGY = 10;
export interface OfferInput {
  studioId: string;
  structure: DealStructure;
  pct: number;
  offerPrice: number;
  funding: FundingMix;
  businessId?: string;
  commitments: CommitmentKind[];
}

export const fileOffer = (player: Player, input: OfferInput): { player: Player; error?: string } => {
  const p: any = clone(player);
  ensureDealState(p);
  const studio = findStudio(p.world.studios, input.studioId);
  if (!studio) return { player, error: 'Studio not found.' };
  if ((p.world.dealCooldowns[input.studioId] || 0) > absWeek(p)) return { player, error: 'The board refuses to talk for now.' };
  if (p.world.deals.some((d: Deal) => d.studioId === input.studioId && LIVE_STATUSES.includes(d.status)))
    return { player, error: 'You already have a live deal with this studio.' };
  if (p.energy.current < OFFER_ENERGY) return { player, error: 'Not enough energy.' };

  const quote = getDealQuote(p, input.studioId, input.structure, input.pct, input.commitments);
  const v = validateFunding(p, input.offerPrice, input.funding, input.businessId);
  if (!v.ok) return { player, error: v.errors[0] };

  // Escrow: personal + company cash leave now (refunded on reject/block). Debt is drawn at closing.
  p.money -= input.funding.PERSONAL || 0;
  if (input.funding.COMPANY) {
    const biz = p.businesses.find((b: any) => b.id === v.capacity.businessId);
    if (biz) biz.balance -= input.funding.COMPANY;
  }
  p.flags.complianceHeat = v.heat;
  spendPlayerEnergy(p, OFFER_ENERGY);

  const deal: Deal = {
    id: `deal_${Date.now()}`,
    studioId: input.studioId,
    studioName: studio.name,
    structure: input.structure,
    pct: quote.pct,
    offerPrice: input.offerPrice,
    fairPrice: quote.fair,
    funding: input.funding,
    businessId: v.capacity.businessId,
    commitments: input.commitments,
    status: 'OFFER_PENDING',
    weeksLeft: input.structure === 'FULL' || quote.controlAfter ? 3 : 1,
    filedAbs: absWeek(p),
    diligenceDone: !!p.world.diligence[input.studioId],
    heat: v.heat,
  };
  p.world.deals.push(deal);
  p.logs = [{ week: p.currentWeek, year: p.age, message: `📨 Offer filed for ${quote.pct.toFixed(1)}% of ${studio.name}.`, type: 'neutral' }, ...(p.logs || [])].slice(0, 50);
  return { player: p };
};

// Respond to a counter-offer.
export const respondToCounter = (player: Player, dealId: string, accept: boolean): { player: Player; error?: string } => {
  const p: any = clone(player);
  const deal: Deal | undefined = p.world.deals.find((d: Deal) => d.id === dealId);
  if (!deal || deal.status !== 'COUNTERED' || !deal.counterPrice) return { player, error: 'No counter to answer.' };
  if (!accept) { refund(p, deal); deal.status = 'WITHDRAWN'; return { player: p }; }
  const extra = deal.counterPrice - deal.offerPrice;
  if (p.money < extra) return { player, error: 'You cannot cover the higher price from personal cash.' };
  p.money -= extra;
  deal.funding.PERSONAL = (deal.funding.PERSONAL || 0) + extra;
  deal.offerPrice = deal.counterPrice;
  advanceAfterAccept(p, deal);
  deal.decisionSeen = true;
  return { player: p };
};

// ------------------------------------------------------------------ 6. DEAL STATE MACHINE
const refund = (p: any, deal: Deal) => {
  p.money += deal.funding.PERSONAL || 0;
  if (deal.funding.COMPANY) {
    const biz = p.businesses.find((b: any) => b.id === deal.businessId);
    if (biz) biz.balance += deal.funding.COMPANY;
  }
};

const needsRegulatoryReview = (p: any, deal: Deal) => {
  const fin = computeFinancials(findStudio(p.world.studios, deal.studioId));
  return fin.enterpriseValue > 50 * B && getOwnedPct(p, deal.studioId) + deal.pct >= 50;
};

const advanceAfterAccept = (p: any, deal: Deal) => {
  // The board said yes. The player must now sign the closing papers (see completeClosing).
  deal.status = 'ACCEPTED';
  deal.weeksLeft = 2;
  deal.acceptedAbs = absWeek(p);
  deal.decisionSeen = false;
};

const proceedAfterSignature = (p: any, deal: Deal): 'CLOSED' | 'REGULATORY' | 'TENDER' => {
  if (needsRegulatoryReview(p, deal)) { deal.status = 'REGULATORY'; deal.weeksLeft = 3; return 'REGULATORY'; }
  const isPublic = !!getStockForStudio(p, deal.studioId);
  if (isPublic && deal.pct >= 10) { deal.status = 'TENDER'; deal.weeksLeft = 1; return 'TENDER'; }
  closeDeal(p, deal);
  return 'CLOSED';
};

const notify = (p: any, headline: string, subtext: string, type: 'positive' | 'negative' | 'neutral') => {
  p.news = [{
    id: `news_deal_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    headline, subtext, category: 'TOP_STORY', week: p.currentWeek, year: p.age, impactLevel: 'HIGH',
  }, ...(p.news || [])].slice(0, 80);
  p.logs = [{ week: p.currentWeek, year: p.age, message: headline, type }, ...(p.logs || [])].slice(0, 50);
};

const resolveBoard = (p: any, deal: Deal, rng: () => number) => {
  const need = requiredRatio(p, deal.studioId, deal.structure, deal.commitments, deal.heat);
  const fair = fairPriceFor(p, deal.studioId, deal.pct);
  const ratio = deal.offerPrice / Math.max(1, fair);
  const chance = acceptanceChance(ratio, need);
  const roll = rng();
  if (roll < chance) {
    notify(p, `${deal.studioName} board accepts your offer`, 'Sign the closing papers within 2 weeks.', 'positive');
    advanceAfterAccept(p, deal);
  } else if (ratio >= 0.9 && roll < chance + 0.35) {
    deal.status = 'COUNTERED';
    deal.counterPrice = Math.round(fair * need * 1.02);
    deal.weeksLeft = 2; // you have 2 weeks to answer
    notify(p, `${deal.studioName} counters`, 'The board wants a higher price. Answer in the Deal Room.', 'neutral');
  } else {
    deal.status = 'REJECTED';
    refund(p, deal);
    p.world.dealCooldowns[deal.studioId] = absWeek(p) + 12;
    notify(p, `${deal.studioName} rejects your offer`, 'Talks are frozen for 12 weeks.', 'negative');
  }
};

// ------------------------------------------------------------------ 7. CLOSING
const closeDeal = (p: any, deal: Deal) => {
  const studio = findStudio(p.world.studios, deal.studioId);
  const stock = getStockForStudio(p, deal.studioId);
  const fin = computeFinancials(studio);
  const now = absWeek(p);

  // Convert market shares into the stake so ownership is counted once.
  const heldItem = stock ? p.portfolio.find((i: any) => i.stockId === stock.id) : null;
  const heldPct = heldItem && studio?.sharesOutstanding ? (heldItem.shares / studio.sharesOutstanding) * 100 : 0;
  if (stock) p.portfolio = p.portfolio.filter((i: any) => i.stockId !== stock.id);
  const heldCost = heldItem && stock ? heldItem.shares * stock.price : 0;

  const prev: EquityStake = p.equityStakes[deal.studioId] || { pct: 0, costBasis: 0, sinceAbs: now, controlled: false };
  const totalPct = clamp(prev.pct + heldPct + deal.pct, 0, 100);
  const controlled = totalPct >= 50;
  p.equityStakes[deal.studioId] = {
    pct: totalPct, costBasis: prev.costBasis + deal.offerPrice + heldCost, sinceAbs: prev.sinceAbs || now, controlled,
  } as EquityStake;

  // Debt drawn for funding
  if (deal.funding.DEBT) {
    p.flags.acquisitionDebts.push({ id: `debt_${deal.id}`, label: `${deal.studioName} acquisition loan`, principal: deal.funding.DEBT, weeklyRate: 0.07 / 52 } as AcquisitionDebt);
  }

  // Seller commitments become binding obligations (2 years)
  deal.commitments.forEach(kind =>
    p.world.commitmentsOwed.push({ studioId: deal.studioId, studioName: deal.studioName, kind, expiresAbs: now + 104, breached: false }));

  if (controlled && studio) {
    studio.ownerId = 'PLAYER';
    studio.isPlayerOwned = true;
    const hasBiz = p.businesses.some((b: any) => b.sourceStudioId === deal.studioId);
    if (!hasBiz) {
      const biz: any = createBusiness(studio.name, 'PRODUCTION_HOUSE', 'MAJOR_STUDIO',
        { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', p.currentWeek);
      biz.sourceStudioId = deal.studioId;
      biz.stats.valuation = fin.enterpriseValue;
      biz.balance = Math.max(biz.balance || 0, Number(studio.capital) || fin.annualIncome * 0.4);
      if (biz.studioState) biz.studioState.productionFund = Math.max(biz.studioState.productionFund || 0, biz.balance * 0.5);
      p.businesses.push(biz);
    }
    // Target's own debt becomes yours
    p.flags.acquisitionDebts.push({ id: `assumed_${deal.id}`, label: `${deal.studioName} assumed debt`, principal: fin.debt, weeklyRate: 0.05 / 52 } as AcquisitionDebt);
    // Hidden liabilities hit later unless diligence revealed them (then they are priced in, smaller hit)
    p.flags.pendingLiabilities.push({
      id: `liab_${deal.id}`, studioName: deal.studioName,
      amount: Math.round(fin.hiddenLiabilities * (deal.diligenceDone ? 0.15 : 0.6)), dueAbs: now + 4,
    });
    p.stats.fame = Math.min(100, (p.stats.fame || 0) + 3);
    p.stats.reputation = Math.min(100, (p.stats.reputation || 0) + 2);
  }

  deal.status = 'CLOSED';
  deal.weeksLeft = 0;
  notify(p,
    controlled ? `${p.name} takes control of ${deal.studioName}` : `${p.name} buys a ${totalPct.toFixed(1)}% stake in ${deal.studioName}`,
    controlled ? 'A new media power is born.' : 'Industry watchers see this as the first move.', 'positive');
  p.x.feed = [{
    id: `x_deal_${Date.now()}`, authorId: 'x_deal', authorName: 'Deadline Wire', authorHandle: '@deadlinewire',
    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=DeadlineWire',
    content: controlled ? `BREAKING: ${p.name} now controls ${deal.studioName}.` : `${p.name} buys into ${deal.studioName}.`,
    timestamp: Date.now(), likes: 22000, retweets: 4000, replies: 900,
    isPlayer: false, isLiked: false, isRetweeted: false, isVerified: true,
  }, ...(p.x?.feed || [])].slice(0, 50);
};

// ------------------------------------------------------------------ WEEKLY PROCESSING (call once per week from App.handleNextWeek)
export const processDealsWeekly = (player: Player, prevStocks: Stock[], rng: () => number = Math.random): Player => {
  const p: any = clone(player);
  ensureDealState(p);
  syncStudiosWithStocks(p, prevStocks);
  const now = absWeek(p);

  // Deals
  p.world.deals.forEach((deal: Deal) => {
    if (!LIVE_STATUSES.includes(deal.status)) return;
    deal.weeksLeft -= 1;
    if (deal.weeksLeft > 0) return;
    if (deal.status === 'OFFER_PENDING') resolveBoard(p, deal, rng);
    else if (deal.status === 'ACCEPTED') { refund(p, deal); deal.status = 'WITHDRAWN'; notify(p, `The ${deal.studioName} deal expired`, 'You never signed the closing papers. Funds returned.', 'negative'); }
    else if (deal.status === 'COUNTERED') { refund(p, deal); deal.status = 'WITHDRAWN'; notify(p, `Your offer for ${deal.studioName} lapsed`, 'You did not answer the counter in time.', 'negative'); }
    else if (deal.status === 'REGULATORY') {
      const blockChance = clamp((deal.heat - 40) / 100, 0, 0.8);
      if (rng() < blockChance) { refund(p, deal); deal.status = 'BLOCKED'; p.world.dealCooldowns[deal.studioId] = now + 26; notify(p, `Regulators block the ${deal.studioName} deal`, 'Funds were returned.', 'negative'); }
      else if (getStockForStudio(p, deal.studioId) && deal.pct >= 10) { deal.status = 'TENDER'; deal.weeksLeft = 1; }
      else closeDeal(p, deal);
    } else if (deal.status === 'TENDER') closeDeal(p, deal);
  });
  p.world.deals = p.world.deals.filter((d: Deal) => LIVE_STATUSES.includes(d.status) || now - d.filedAbs < 26);

  // Compliance heat cools 3/week
  p.flags.complianceHeat = Math.max(0, (p.flags.complianceHeat || 0) - 3);

  // Dividends from minority stakes + income of controlled studios
  Object.entries(p.equityStakes as Record<string, EquityStake>).forEach(([studioId, stake]) => {
    const studio = findStudio(p.world.studios, studioId);
    if (!studio) return;
    const fin = computeFinancials(studio);
    if (stake.controlled) {
      const biz = p.businesses.find((b: any) => b.sourceStudioId === studioId);
      if (biz) biz.balance += (fin.annualIncome / 52) * (stake.pct / 100);
    } else {
      const dividend = Math.floor((fin.annualIncome / 52) * (stake.pct / 100) * 0.4);
      p.money += dividend;
    }
  });

  // Acquisition debt interest (paid from cash; if broke, it capitalises into the loan)
  p.flags.acquisitionDebts.forEach((d: AcquisitionDebt) => {
    const interest = Math.floor(d.principal * d.weeklyRate);
    if (p.money >= interest) p.money -= interest; else d.principal += interest;
  });

  // Hidden liabilities
  p.flags.pendingLiabilities = p.flags.pendingLiabilities.filter((l: any) => {
    if (now < l.dueAbs) return true;
    p.money -= l.amount;
    notify(p, `Hidden liabilities surface at ${l.studioName}`, `You pay $${(l.amount / B).toFixed(1)}B.`, 'negative');
    return false;
  });

  // Commitments expiry
  p.world.commitmentsOwed = p.world.commitmentsOwed.filter((c: any) => c.breached || now < c.expiresAbs);
  return p as Player;
};

// Call from other systems when you violate a promise (rename the studio, mass layoffs, cut the slate).
export const reportCommitmentBreach = (player: Player, studioId: string, kind: CommitmentKind): Player => {
  const p: any = clone(player);
  const c = (p.world.commitmentsOwed || []).find((x: any) => x.studioId === studioId && x.kind === kind && !x.breached);
  if (!c) return player;
  c.breached = true;
  p.stats.reputation = Math.max(0, p.stats.reputation - 8);
  p.money -= Math.round(computeFinancials(findStudio(p.world.studios, studioId)).annualIncome * 0.01);
  notify(p, `${p.name} breaks a promise to ${c.studioName}`, `Commitment "${kind}" was violated. Lawsuits and talent exits follow.`, 'negative');
  return p;
};

// ------------------------------------------------------------------ CLOSING CEREMONY API
export const CLOSING_ENERGY = 20;

// First accepted deal whose "board said YES" screen has not been shown yet.
export const getUndecidedDeal = (player: Player): Deal | undefined =>
  ((player as any).world?.deals || []).find((d: Deal) => d.status === 'ACCEPTED' && d.decisionSeen === false);

export const markDecisionSeen = (player: Player, dealId: string): Player => {
  const p: any = clone(player);
  const d = (p.world?.deals || []).find((x: Deal) => x.id === dealId);
  if (d) d.decisionSeen = true;
  return p as Player;
};

// Everything the ceremony screens display. Call once and keep the result (it reads current ownership).
export const getClosingPreview = (player: Player, dealId: string) => {
  const p: any = player;
  const deal: Deal | undefined = (p.world?.deals || []).find((d: Deal) => d.id === dealId);
  if (!deal) return null;
  const studio = findStudio(p.world?.studios, deal.studioId);
  const fin = computeFinancials(studio);
  const owned = getOwnedPct(player, deal.studioId);
  const afterPct = clamp(owned + deal.pct, 0, 100);
  const verified = !!p.world?.diligence?.[deal.studioId] || deal.diligenceDone;
  const biz = (p.businesses || []).find((b: any) => b.id === deal.businessId);
  const fundingLines = (Object.entries(deal.funding) as [FundingSource, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      source: k,
      label: k === 'PERSONAL' ? 'Personal Wealth' : k === 'COMPANY' ? `${biz?.name || 'Company'} Capital` : 'Bank Debt',
      amount: v,
    }));
  const stock = getStockForStudio(player, deal.studioId);
  const route: 'REGULATORY' | 'TENDER' | 'CLOSE' = needsRegulatoryReview(p, deal)
    ? 'REGULATORY' : (stock && deal.pct >= 10 ? 'TENDER' : 'CLOSE');
  return {
    deal,
    studioName: deal.studioName,
    price: deal.offerPrice,
    ratio: deal.offerPrice / Math.max(1, deal.fairPrice),
    fundingLines,
    catalog: (studio?.catalogCount ?? studio?.catalog?.length) as number | undefined,
    debt: fin.debt,
    hiddenLiabilities: fin.hiddenLiabilities,
    debtAndLiabilities: verified ? fin.debt + fin.hiddenLiabilities : fin.debt,
    verified,
    income: fin.annualIncome,
    commitments: deal.commitments,
    owned,
    afterPct,
    controlled: afterPct >= 50,
    route,
    weeksToSign: deal.weeksLeft,
  };
};

// The player signs. Costs energy, then the deal goes to review/tender or closes immediately.
export const completeClosing = (
  player: Player, dealId: string
): { player: Player; error?: string; outcome?: 'CLOSED' | 'REGULATORY' | 'TENDER' } => {
  const p: any = clone(player);
  const deal: Deal | undefined = (p.world?.deals || []).find((d: Deal) => d.id === dealId);
  if (!deal || deal.status !== 'ACCEPTED') return { player, error: 'No deal is waiting for your signature.' };
  if ((p.energy?.current ?? 0) < CLOSING_ENERGY) return { player, error: `You need ${CLOSING_ENERGY} energy to sign.` };
  spendPlayerEnergy(p, CLOSING_ENERGY);
  deal.decisionSeen = true;
  const outcome = proceedAfterSignature(p, deal);
  return { player: p as Player, outcome };
};

// ------------------------------------------------------------------ NET WORTH (use in ForbesApp)
export const getExtraNetWorth = (player: Player): number => {
  const p: any = player;
  const stocks: Stock[] = p.stocks || [];
  const portfolio = (p.portfolio || []).reduce((sum: number, item: any) => {
    const s = stocks.find(x => x.id === item.stockId);
    return sum + item.shares * (s?.price || 0);
  }, 0);
  const stakes = Object.entries(p.equityStakes || {}).reduce((sum, [id, st]: [string, any]) =>
    sum + computeFinancials(findStudio(p.world?.studios, id)).equityValue * (st.pct / 100), 0);
  const cash = (p.businesses || []).reduce((sum: number, b: any) => sum + Math.max(0, b.balance || 0), 0);
  const debts = (p.flags?.acquisitionDebts || []).reduce((sum: number, d: AcquisitionDebt) => sum + d.principal, 0);
  return portfolio + stakes + cash - debts;
};

/* ---- ADD TO types.ts ----
Player additions (all optional):
  equityStakes?: Record<string, { pct: number; costBasis: number; sinceAbs: number; controlled: boolean }>;
World additions (all optional):
  deals?: any[]; dealCooldowns?: Record<string, number>; commitmentsOwed?: any[]; diligence?: Record<string, any>;
Studio additions (all optional):
  debt?, hiddenLiabilities?, annualIncome?, sharesOutstanding?, capital?, rivalBidders?, ownerId?, isPlayerOwned?
Business additions (optional): sourceStudioId?: string
*/