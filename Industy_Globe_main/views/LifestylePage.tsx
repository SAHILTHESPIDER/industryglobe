
import React, { useEffect, useState } from 'react';
import { Player, Property, Vehicle, ClothingItem, SettableClothingStyle } from '../types';
import { Store, Briefcase, ChevronRight, Clapperboard, Tv, Star } from 'lucide-react';
import { OwnPlatformApp } from './ownPlatform/OwnPlatformApp';
import { armPlatformIdent } from '../services/ownPlatform/identAudio';
import { LifestyleAssets } from './lifestyle/LifestyleAssets';
import { LifestyleBusiness } from './lifestyle/LifestyleBusiness';
import { ProductionWizard } from './lifestyle/business/ProductionWizard';
import { ProductionHouseGame } from './lifestyle/business/ProductionHouseGame';
import { PROPERTY_CUSTOMIZATIONS, VEHICLE_CUSTOMIZATIONS } from '../services/lifestyleLogic';
import { PremiumProductId } from '../services/premiumLogic';
import { getPlayerLanguage, t } from '../services/i18n';
import { useGameNav } from '../components/GameNav';
import './lifestyleDesk.css';

interface LifestylePageProps {
  player: Player;
  onBuyItem: (item: Property | Vehicle | ClothingItem) => void;
  onSellItem: (itemId: string) => void;
  onSetResidence: (propertyId: string) => void;
  onSetActiveStyle: (style: SettableClothingStyle) => void;
  onStartBusiness: (type: any) => void; 
  onShutdownBusiness: () => void; 
  onUpdatePlayer?: (player: Player) => void; 
  onPremiumPurchase: (productId: PremiumProductId) => void;
  onNavVisibilityChange?: (visible: boolean) => void;
  initialView?: 'MAIN' | 'ASSETS' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING';
  onInitialViewConsumed?: () => void;
}

export const LifestylePage: React.FC<LifestylePageProps> = ({ player, onBuyItem, onSellItem, onSetResidence, onSetActiveStyle, onUpdatePlayer, onPremiumPurchase, onNavVisibilityChange, initialView, onInitialViewConsumed }) => {
  const [view, setView] = useState<'MAIN' | 'ASSETS' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING'>('MAIN');
  const [customizationItem, setCustomizationItem] = useState<Property | Vehicle | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<any[]>([]);
  const nav = useGameNav();
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const trFallback = (key: string, fallback: string) => {
      const translated = tr(key);
      return translated === key ? fallback : translated;
  };

  useEffect(() => {
      onNavVisibilityChange?.(view === 'MAIN' && !customizationItem);
      return () => onNavVisibilityChange?.(true);
  }, [view, customizationItem, onNavVisibilityChange]);

  useEffect(() => {
      if (initialView && initialView !== view) {
          setView(initialView);
          onInitialViewConsumed?.();
      }
  }, [initialView, view, onInitialViewConsumed]);

  // Check if player owns a Production House
  const productionStudio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');

  const handleProductionClick = () => {
      if (productionStudio) {
          setView('PRODUCTION_GAME');
      } else {
          setView('PRODUCTION_WIZARD');
      }
  };

  // --- CUSTOMIZATION LOGIC (Kept here as it spans multiple assets) ---
  const handleInitiateCustomization = (item: Property | Vehicle) => {
      setCustomizationItem(item);
      setSelectedCustomizations([]);
  };

  const calculateCustomTotal = () => {
      if (!customizationItem) return 0;
      let total = customizationItem.price;
      selectedCustomizations.forEach(opt => {
          if (opt.flatCost) total += opt.flatCost;
          if (opt.costMultiplier) total += Math.floor(customizationItem.price * opt.costMultiplier);
      });
      return total;
  };

  const finalizeCustomPurchase = () => {
      if (!customizationItem) return;
      let finalPrice = customizationItem.price;
      const customLabels: string[] = [];
      let moodBonus = customizationItem.type === 'Property' ? (customizationItem as Property).moodBonus : 0;
      let repBonus = customizationItem.type === 'Vehicle' ? (customizationItem as Vehicle).reputationBonus : 0;

      selectedCustomizations.forEach(opt => {
          if (opt.flatCost) finalPrice += opt.flatCost;
          if (opt.costMultiplier) finalPrice += Math.floor(customizationItem.price * opt.costMultiplier);
          customLabels.push(opt.label);
          if (opt.statBonus) {
              if (opt.statBonus.moodBonus) moodBonus += opt.statBonus.moodBonus;
              if (opt.statBonus.reputationBonus) repBonus += opt.statBonus.reputationBonus;
          }
      });

      const newItem = {
          ...customizationItem,
          id: `${customizationItem.id}_cust_${Date.now()}`,
          name: `${customizationItem.name} ${customLabels.length > 0 ? '(Custom)' : ''}`,
          price: finalPrice,
          customizations: customLabels,
          ...(customizationItem.type === 'Property' ? { moodBonus } : {}),
          ...(customizationItem.type === 'Vehicle' ? { reputationBonus: repBonus } : {})
      };

      onBuyItem(newItem as any);
      setCustomizationItem(null);
      setSelectedCustomizations([]);
  };

  const toggleCustomization = (opt: any) => {
      setSelectedCustomizations(prev => {
          if (['COLOR', 'INTERIOR'].includes(opt.type)) {
              const others = prev.filter(p => p.type !== opt.type);
              if (prev.some(p => p.id === opt.id)) return others;
              return [...others, opt];
          } else {
              if (prev.some(p => p.id === opt.id)) return prev.filter(p => p.id !== opt.id);
              return [...prev, opt];
          }
      });
  };

  // --- RENDER ---
  
  if (customizationItem) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="p-4 pt-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
                  <div className="flex items-center gap-3"><button onClick={() => setCustomizationItem(null)} className="text-white">{tr('common.back')}</button><div className="font-bold text-lg">{tr('lifestyle.customize')}</div></div>
                  <div className="text-emerald-400 font-mono font-bold">${calculateCustomTotal().toLocaleString()}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-black custom-scrollbar pb-32">
                  <div className="mb-6 text-center"><h2 className="text-2xl font-bold text-white mb-1">{customizationItem.name}</h2></div>
                  <div className="space-y-6">
                      {(customizationItem.type === 'Property' ? PROPERTY_CUSTOMIZATIONS : VEHICLE_CUSTOMIZATIONS).map(opt => {
                          const isSelected = selectedCustomizations.some(s => s.id === opt.id);
                          return (
                              <button key={opt.id} onClick={() => toggleCustomization(opt)} className={`w-full p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-900/30 border-indigo-500' : 'bg-zinc-900 border-zinc-800'}`}>
                                  <div className="font-bold text-sm text-white">{trFallback(`lifestyle.custom.${opt.id}.name`, opt.label)}</div>
                                  <div className="text-xs text-zinc-500">{trFallback(`lifestyle.custom.${opt.id}.desc`, opt.description)}</div>
                              </button>
                          );
                      })}
                  </div>
              </div>
              <div className="p-6 pb-20 border-t border-zinc-800 bg-zinc-900 shrink-0 z-50">
                  <button onClick={finalizeCustomPurchase} disabled={player.money < calculateCustomTotal()} className="w-full py-4 bg-white text-black font-bold rounded-xl disabled:opacity-50">{tr('lifestyle.purchase')}</button>
              </div>
          </div>
      );
  }

  if (view === 'ASSETS') return <LifestyleAssets player={player} onBack={() => setView('MAIN')} onBuy={onBuyItem} onSell={onSellItem} onSetResidence={onSetResidence} onInitiateCustomization={handleInitiateCustomization} onPremiumPurchase={onPremiumPurchase} />;
  
  if (view === 'BUSINESS') return <LifestyleBusiness player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} />;
  
  if (view === 'PRODUCTION_WIZARD') return <ProductionWizard player={player} onCancel={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} onComplete={() => setView('PRODUCTION_GAME')} />;
  
  if (view === 'PRODUCTION_GAME') return <ProductionHouseGame player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} />;

  if (view === 'STREAMING') {
      return (
          <OwnPlatformApp
              player={player}
              initialPane="launch"
              onBack={() => setView('MAIN')}
              onUpdatePlayer={onUpdatePlayer || (() => {})}
          />
      );
  }

  const companyEquity = player.businesses.reduce((sum, b) => sum + b.stats.valuation, 0);
  return (
    <div className="ls-page pb-8 pt-2">
        <h2 className="ls-title">{tr('lifestyle.title')}</h2>
        <section className="ls-wallet">
            <div className="ls-card-art" aria-hidden="true" />
            <div className="ls-kicker">Personal wallet</div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.liquidCash')}</div>
            <button type="button" onClick={() => nav?.openPhone({ app: 'BANK' })} className="ls-cash">${player.money.toLocaleString()}</button>
            <div className="ls-chips">
                <span className="ls-chip">{tr('lifestyle.assets')} <b>~${(player.assets.length * 50000).toLocaleString()}</b></span>
                <span className="ls-chip is-company">{tr('lifestyle.equity')} <b>${companyEquity.toLocaleString()}</b></span>
                <span className="ls-chip is-personal">Personal money</span>
            </div>
        </section>
        <div className="ls-grid">
            <button type="button" onClick={handleProductionClick} className={`ls-entry is-studio ${productionStudio ? '' : 'opacity-80'}`}>
                <span className={`ls-ico ${productionStudio ? 'bg-amber-400 text-black' : 'bg-amber-400/15 text-amber-300'}`}><Clapperboard size={22}/></span>
                <span className="ls-copy">
                    <strong>{productionStudio ? productionStudio.name : tr('lifestyle.productionHouse')} {productionStudio && <Star size={12} className="inline text-amber-300" />}</strong>
                    <em>{productionStudio ? tr('lifestyle.manageStudioSlate') : tr('lifestyle.createBlockbusters')}</em>
                    <i className="ls-tag is-company">Company</i>
                </span>
                <ChevronRight className="ls-chev" size={18} />
            </button>
            <button type="button" onClick={() => setView('ASSETS')} className="ls-entry">
                <span className="ls-ico bg-blue-500/15 text-blue-300"><Store size={22}/></span>
                <span className="ls-copy">
                    <strong>{tr('lifestyle.assetsTitle')}</strong>
                    <em>{tr('lifestyle.assetsSub')}</em>
                    <i className="ls-tag is-personal">Personal</i>
                </span>
                <ChevronRight className="ls-chev" size={18} />
            </button>
            <button type="button" onClick={() => setView('BUSINESS')} className="ls-entry">
                <span className="ls-ico bg-emerald-500/15 text-emerald-300"><Briefcase size={22}/></span>
                <span className="ls-copy">
                    <strong>{tr('lifestyle.businessEmpire')}</strong>
                    <em>{tr('lifestyle.businessSub')}</em>
                    <i className="ls-tag is-company">Company</i>
                </span>
                <ChevronRight className="ls-chev" size={18} />
            </button>
            <button type="button" onClick={() => { armPlatformIdent(player); setView('STREAMING'); }} className="ls-entry is-empire">
                <span className="ls-ico bg-[#ff3b30] text-white"><Tv size={22}/></span>
                <span className="ls-copy">
                    <strong>{tr('lifestyle.streamingPlatform')}</strong>
                    <em>{player.ownPlatform ? `${player.ownPlatform.name} · ${player.ownPlatform.stage}. Same company as the phone.` : tr('lifestyle.streamingSub')}</em>
                    <i className="ls-tag is-company">Company</i>
                </span>
                <ChevronRight className="ls-chev" size={18} />
            </button>
        </div>
    </div>
  );
};
