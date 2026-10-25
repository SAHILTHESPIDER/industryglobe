
import React, { useState } from 'react';
import { Player, Stock } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { calculatePortfolioValue, fiftyTwoWeek, marketCap, weekChangePct } from '../../services/stockLogic';
import { platformDealForStock } from '../../services/ownPlatform/studio';
import { formatCompact } from '../../services/ownPlatform/logic';
import { BuyFinancing } from '../../services/ownPlatform/valuation';
import { ValuationSheet } from '../ownPlatform/ValuationSheet';
import { getPlayerLanguage, t } from '../../services/i18n';
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, Activity, DollarSign, Lock, AlertTriangle } from 'lucide-react';

interface StocksAppProps {
  player: Player;
  onBack: () => void;
  onTrade: (stockId: string, amount: number) => void;
  onFoundCompany?: () => void;
  onOpenCompany?: () => void;
  onAcquirePlatform?: (stockId: string, financing: BuyFinancing) => void;
}

export const StocksApp: React.FC<StocksAppProps> = ({ player, onBack, onTrade, onFoundCompany, onOpenCompany, onAcquirePlatform }) => {
  const [tab, setTab] = useState<'MARKET' | 'PORTFOLIO'>('MARKET');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [valuing, setValuing] = useState(false);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  
  // Buy/Sell State
  const [sharesInput, setSharesInput] = useState<string>('');
  
  // Helpers
  
  const stocks = player.stocks || [];
  const portfolio = player.portfolio || [];
  const getHolding = (stockId: string) => portfolio.find(p => p.stockId === stockId);
  
  const portfolioValue = calculatePortfolioValue(portfolio, stocks);
  const cash = player.money;

  const renderStockRow = (stock: Stock) => {
      const changePercent = weekChangePct(stock) * 100;
      const isPositive = changePercent >= 0;
      
      const holding = getHolding(stock.id);

      return (
          <div key={stock.id} onClick={() => { setSelectedId(stock.id); setSharesInput(''); setValuing(false); }} className="bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-800 flex items-center justify-between gap-2 active:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {stock.symbol}
                  </div>
                  <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate">{stock.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{stock.sector} {holding && `• ${holding.shares} ${tr('stocks.owned')}`}</div>
                  </div>
              </div>
              <Sparkline values={stock.priceHistory} up={isPositive} />
              
              <div className="text-right">
                  <div className="font-mono font-bold text-white text-sm">{formatMoney(stock.price)}</div>
                  <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {Math.abs(changePercent).toFixed(1)}%
                  </div>
              </div>
          </div>
      );
  };

  // --- DETAIL VIEW ---
  const selectedStock = selectedId ? stocks.find(stock => stock.id === selectedId) || null : null;

  if (selectedStock) {
      const holding = getHolding(selectedStock.id);
      const range = fiftyTwoWeek(selectedStock);
      const changePercent = weekChangePct(selectedStock) * 100;
      const inputAmount = parseInt(sharesInput) || 0;
      const cost = inputAmount * selectedStock.price;
      const canAfford = inputAmount > 0 && cost <= player.money;
      const canSell = holding && inputAmount > 0 && inputAmount <= holding.shares;

      // Synergy Check
      const hasSynergy = player.activeSponsorships.some(s => s.brandName === selectedStock.relatedBrandName);

      return (
          <div className="absolute inset-0 bg-black flex flex-col z-50 text-white animate-in slide-in-from-right duration-300">
              <div className="p-4 pt-12 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900">
                  <button onClick={() => { setSelectedId(null); setValuing(false); }}><ArrowLeft size={20}/></button>
                  <div className="flex-1">
                      <div className="font-bold text-lg">{selectedStock.symbol}</div>
                      <div className="text-xs text-zinc-400">{selectedStock.name}</div>
                  </div>
                  <div className="text-right">
                      <div className="font-bold text-lg">{formatMoney(selectedStock.price)}</div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {/* Chart Placeholder */}
                  <div className="h-40 bg-zinc-900 rounded-2xl mb-4 flex items-end px-2 pb-2 relative overflow-hidden border border-zinc-800">
                      <div className="absolute top-2 left-2 text-[10px] text-zinc-500">{tr('stocks.weekTrend')}</div>
                      <div className={`absolute top-2 right-2 text-[10px] font-bold ${changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}% this week
                      </div>
                      <div className="flex items-end w-full gap-px h-full">
                          {selectedStock.priceHistory.filter(point => Number.isFinite(point) && point > 0).map((p, i, series) => {
                              const min = Math.min(...series);
                              const max = Math.max(...series);
                              const span = max - min || 1;
                              const height = ((p - min) / span) * 100;
                              return (
                                  <div key={i} className={`flex-1 rounded-t-sm ${i === series.length - 1 ? 'bg-blue-500' : 'bg-zinc-700'}`} style={{ height: `${Math.max(4, height)}%` }}></div>
                              )
                          })}
                      </div>
                  </div>
                  {selectedStock.fundamentals?.lastNote && (
                      <p className="text-xs text-zinc-400 mb-4">This week: {selectedStock.fundamentals.lastNote}.</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">52-week high</div>
                          <div className="font-mono font-bold text-white">{formatMoney(range.high)}</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">52-week low</div>
                          <div className="font-mono font-bold text-white">{formatMoney(range.low)}</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">Market cap</div>
                          <div className="font-mono font-bold text-white">{formatCompact(marketCap(selectedStock))}</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">Debt / equity</div>
                          <div className="font-mono font-bold text-amber-300">{(selectedStock.fundamentals?.debtToEquity ?? 0).toFixed(2)}×</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">{tr('stocks.divYield')}</div>
                          <div className="font-mono font-bold text-emerald-400">{(selectedStock.dividendYield * 100).toFixed(1)}%</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">{tr('stocks.volatility')}</div>
                          <div className="font-mono font-bold text-yellow-400">{selectedStock.volatility > 0.04 ? tr('stocks.high') : tr('stocks.low')}</div>
                      </div>
                  </div>

                  {/* Synergy Badge */}
                  {hasSynergy && (
                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-xl mb-6 flex items-center gap-3">
                          <div className="p-2 bg-indigo-500 rounded-full"><Lock size={12} className="text-white"/></div>
                          <div>
                              <div className="text-xs font-bold text-indigo-300">{tr('stocks.partnerStock')}</div>
                              <div className="text-[10px] text-indigo-400">{tr('stocks.partnerStockSub')}</div>
                          </div>
                      </div>
                  )}

                  {/* Position */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-2">{tr('stocks.yourPosition')}</div>
                      {holding ? (
                          <div className="flex justify-between items-end">
                              <div>
                                  <div className="text-2xl font-mono font-bold text-white">{holding.shares}</div>
                                  <div className="text-[10px] text-zinc-400">{tr('stocks.shares')}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-emerald-400 font-mono font-bold">{formatMoney(holding.shares * selectedStock.price)}</div>
                                  <div className="text-[10px] text-zinc-400">{tr('stocks.value')}</div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-sm text-zinc-600 italic">{tr('stocks.noShares')}</div>
                      )}
                  </div>

                  {/* Trade Controls */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-3">{tr('stocks.trade')}</div>
                      <div className="flex gap-2 mb-3">
                          <input 
                            type="number" 
                            min={1}
                            placeholder={tr('stocks.shares')} 
                            value={sharesInput}
                            onChange={(e) => setSharesInput(e.target.value)}
                            className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                      </div>
                      <div className="flex gap-2 mb-3">
                          {[1, 10, 100].map(amount => (
                              <button key={amount} onClick={() => setSharesInput(String(amount))} className="px-3 py-1 rounded-full bg-zinc-800 text-xs font-bold">{amount}</button>
                          ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-4">
                          <span>{tr('stocks.estValue')}: <span className="text-white font-mono">{formatMoney(isNaN(cost) ? 0 : cost)}</span></span>
                          <span>{tr('stocks.cash')}: <span className="text-white font-mono">{formatMoney(player.money)}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            className={`py-3 rounded-xl font-bold text-sm ${!canSell ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                            disabled={!canSell}
                            onClick={() => {
                                if (canSell) {
                                    onTrade(selectedStock.id, -inputAmount);
                                    setSharesInput('');
                                }
                            }}
                          >
                              {tr('stocks.sell')}
                          </button>
                          <button 
                            className={`py-3 rounded-xl font-bold text-sm ${!canAfford ? 'bg-blue-900/50 text-blue-300/50' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                            disabled={!canAfford}
                            onClick={() => {
                                if (canAfford) {
                                    onTrade(selectedStock.id, inputAmount);
                                    setSharesInput('');
                                }
                            }}
                          >
                              {tr('stocks.buy')}
                          </button>
                      </div>
                      {(() => {
                          const deal = platformDealForStock(player, selectedStock);
                          if (!deal) return selectedStock.playerCompany ? <p className="text-xs text-emerald-300 mt-3">This listing is your company. Its price moves with your receipts, debt, and releases.</p> : null;
                          return (
                              <button
                                  onClick={() => setValuing(true)}
                                  className="mt-3 w-full py-3 rounded-xl bg-white text-black font-bold text-sm"
                              >
                                  Review valuation · {formatCompact(deal.price)}
                              </button>
                          );
                      })()}
                      {valuing && (
                          <ValuationSheet
                              player={player}
                              dealId={selectedStock.id}
                              onClose={() => setValuing(false)}
                              onConfirm={(id, financing) => {
                                  setValuing(false);
                                  onAcquirePlatform?.(id, financing);
                              }}
                          />
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN LIST ---
  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
        <div className="bg-zinc-900 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-zinc-800">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-widest uppercase">
                <Activity size={20}/> {tr('stocks.title')}
            </div>
            <div className="w-8"></div>
        </div>

        {/* Portfolio Summary */}
        <div className="p-6 bg-zinc-900 border-b border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{tr('stocks.totalPortfolio')}</div>
            <div className="text-4xl font-mono font-bold text-white mb-4">{formatMoney(portfolioValue)}</div>
            <div className="flex gap-4">
                <div className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">{tr('stocks.cashAvailable')}</div>
                    <div className="font-mono text-zinc-300 text-sm font-bold">{formatMoney(cash)}</div>
                </div>
                <div className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">{tr('stocks.yieldEst')}</div>
                    <div className="font-mono text-emerald-400 text-sm font-bold">+${(portfolioValue * 0.02).toFixed(0)}/yr</div>
                </div>
            </div>
        </div>

        <div className="flex bg-zinc-950 border-b border-zinc-800">
            <button onClick={() => setTab('MARKET')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'MARKET' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}>{tr('stocks.market')}</button>
            <button onClick={() => setTab('PORTFOLIO')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'PORTFOLIO' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}>{tr('stocks.portfolio')}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            <button onClick={() => { if (!player.ownPlatform) onFoundCompany?.(); onOpenCompany?.(); }} className="w-full text-left bg-zinc-900 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Your company</div>
                <div className="font-bold text-white">{player.ownPlatform?.name || 'Found Empire+'}</div>
                <div className="text-xs text-zinc-400">
                    {player.ownPlatform?.ipo?.stage === 'LISTED'
                        ? `${player.ownPlatform.ipo.ticker} is listed. Open the company, or trade the shares below.`
                        : player.ownPlatform
                            ? 'Open Empire+. Operations runs the money, the commissions, and the listing.'
                            : 'Found Empire+ and open it. From there you can fund it, list it, or buy another streaming service.'}
                </div>
            </button>
            {tab === 'MARKET' && stocks.map(stock => renderStockRow(stock))}
            {stocks.length === 0 && <div className="text-center text-zinc-600 mt-6 text-sm">The market has no listings yet.</div>}
            
            {tab === 'PORTFOLIO' && (
                portfolio.length === 0 ? (
                    <div className="text-center text-zinc-600 mt-10 text-sm">{tr('stocks.noInvestments')}</div>
                ) : (
                    portfolio.map(item => {
                        const stock = stocks.find(s => s.id === item.stockId);
                        if (!stock) return null;
                        return renderStockRow(stock);
                    })
                )
            )}
        </div>
    </div>
  );
};

const Sparkline: React.FC<{ values: number[]; up: boolean }> = ({ values, up }) => {
    const series = (values || []).filter(point => Number.isFinite(point) && point > 0);
    if (series.length < 2) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const d = series.map((point, index) => {
        const x = (index / (series.length - 1)) * 56;
        const y = 20 - ((point - min) / span) * 16;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg width="56" height="22" className="shrink-0 hidden min-[420px]:block" aria-hidden>
            <path d={d} fill="none" stroke={up ? '#34d399' : '#fb7185'} strokeWidth="1.5" />
        </svg>
    );
};
