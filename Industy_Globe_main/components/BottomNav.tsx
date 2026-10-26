import React from 'react';
import { Home, Briefcase, Dumbbell, Users, ShoppingBag, Smartphone, ShoppingCart, Settings } from 'lucide-react';
import { Page } from '../types';

interface BottomNavProps {
  activePage: Page;
  setPage: (page: Page) => void;
}

const NAV_ITEMS = [
  { page: Page.HOME, icon: Home, label: 'Home' },
  { page: Page.CAREER, icon: Briefcase, label: 'Career' },
  { page: Page.IMPROVE, icon: Dumbbell, label: 'Train' },
  { page: Page.SOCIAL, icon: Users, label: 'Social' },
  { page: Page.LIFESTYLE, icon: ShoppingBag, label: 'Life' },
  { page: Page.MOBILE, icon: Smartphone, label: 'Phone' },
];

const EXTRA_ITEMS = [
  { page: Page.STORE, icon: ShoppingCart, label: 'Store' },
  { page: Page.SETTINGS, icon: Settings, label: 'Settings' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setPage }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none lg:hidden">
      <div className="px-3 pb-3">
        <div className="glass-card rounded-2xl flex justify-around items-center h-16 shadow-2xl shadow-black/50 pointer-events-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.page;
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  aria-label={item.label}
                  className={`relative flex flex-col items-center justify-center w-full h-full min-h-11 transition-all duration-300 ${
                    isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-amber-400/50 blur-md rounded-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''}`} />
                  <span className={`mt-0.5 text-[9px] font-bold leading-none ${isActive ? 'text-amber-400' : 'text-zinc-500'}`}>{item.label}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export const SideNav: React.FC<BottomNavProps> = ({ activePage, setPage }) => {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[248px] flex-col border-r border-white/10 bg-zinc-950/95 px-3 py-5">
      <div className="px-3 pb-5">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">Industry Globe</div>
        <div className="mt-1 text-lg font-black text-white leading-tight">Career desk</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition-colors ${
                isActive ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
              {item.label === 'Train' ? 'Improve' : item.label === 'Life' ? 'Lifestyle' : item.label === 'Phone' ? 'Phone' : item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-3 flex flex-col gap-1">
        {EXTRA_ITEMS.map((item) => {
          const isActive = activePage === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
