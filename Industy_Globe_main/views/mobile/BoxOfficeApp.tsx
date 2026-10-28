import React, { useMemo } from 'react';
import { Player, ActiveRelease } from '../../types';
import { PLATFORMS } from '../../services/streamingLogic';
import { getProjectIdentityLabel } from '../../services/genreCatalog';
import { getPlayerLanguage, t } from '../../services/i18n';
import { TrendingUp } from 'lucide-react';

/* ---------- formatters ---------- */
export const formatMoney = (amount: number) => {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
};

export const formatMoneyShort = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return `${amount}`;
};

export const formatViews = (num: number) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  return (num / 1_000).toFixed(0) + 'k';
};

export const formatViewsShort = formatViews;

/* ---------- data hook ---------- */
export interface BoxOfficeData {
  theatrical: ActiveRelease[];
  streaming: ActiveRelease[];
  language: ReturnType<typeof getPlayerLanguage>;
  tr: (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => string;
}

export const useBoxOfficeData = (player: Player): BoxOfficeData => {
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

  return useMemo(() => {
    const activeReleases = player.activeReleases || [];
    return {
      theatrical: activeReleases.filter(r => r.distributionPhase === 'THEATRICAL'),
      streaming: activeReleases.filter(r => r.distributionPhase === 'STREAMING' && r.streaming),
      language,
      tr,
    };
  }, [player.activeReleases, language]);
};

/* ---------- Theatrical Card ---------- */
interface TheatricalCardProps {
  rel: ActiveRelease;
  tr: BoxOfficeData['tr'];
}

export const TheatricalReleaseCard: React.FC<TheatricalCardProps> = ({ rel, tr }) => {
  const weekly = rel.weeklyGross || [];
  const maxWeekly = Math.max(...weekly, 1);

  return (
    <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight break-words">{rel.name}</div>
          <div className="text-[10px] text-zinc-400 break-words">
            {getProjectIdentityLabel(rel.projectDetails)} • {rel.projectDetails.studioId.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="text-xs bg-emerald-900 text-emerald-400 px-2 py-1 rounded font-mono font-bold shrink-0">
          {tr('common.week')} {rel.weekNum}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded-xl">
        <div className="min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.totalGross')}</div>
          <div className="text-white font-bold font-mono text-sm break-all">{formatMoney(rel.totalGross)}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.budget')}</div>
          <div className="text-zinc-400 font-bold font-mono text-sm break-all">{formatMoney(rel.budget)}</div>
        </div>
      </div>

      <div>
        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
          <TrendingUp size={12}/> {tr('box.weeklyRevenue')}
        </div>
        <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
          {weekly.map((gross, idx) => {
            const heightPercent = Math.max(15, (gross / maxWeekly) * 100);
            const isLatest = idx === weekly.length - 1;
            return (
              <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-emerald-300 font-bold' : 'text-zinc-500'}`}>
                  {formatMoneyShort(gross)}
                </span>
                <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 mt-1">W{idx + 1}</span>
              </div>
            );
          })}
          {[...Array(Math.max(0, 5 - weekly.length))].map((_, i) => (
            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
              <div className="w-full bg-zinc-800 rounded-t-md h-full" />
              <span className="text-[9px] text-zinc-700 mt-1">-</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- Streaming Card ---------- */
interface StreamingCardProps {
  rel: ActiveRelease;
  tr: BoxOfficeData['tr'];
}

export const StreamingReleaseCard: React.FC<StreamingCardProps> = ({ rel, tr }) => {
  const platform = PLATFORMS[rel.streaming!.platformId];
  const weeklyViews = rel.streaming!.weeklyViews || [];
  const maxViews = Math.max(...weeklyViews, 1);

  return (
    <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <div className="font-bold text-lg break-words">{rel.name}</div>
          <div className="text-[10px] text-zinc-400 break-words">{getProjectIdentityLabel(rel.projectDetails)}</div>
        </div>
        <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${platform.color} bg-white/10 shrink-0`}>
          {platform.name}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 p-3 rounded-xl min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.totalViews')}</div>
          <div className="text-white font-bold font-mono text-lg break-all">{formatViews(rel.streaming!.totalViews)}</div>
        </div>
        <div className="bg-black/20 p-3 rounded-xl flex flex-col justify-center min-w-0">
          <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.latestWeek')}</div>
          <div className="text-zinc-300 text-sm font-mono font-bold break-all">
            {weeklyViews.length > 0 ? formatViews(weeklyViews[weeklyViews.length - 1]) : '0'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
          <TrendingUp size={12}/> {tr('box.weeklyViewership')}
        </div>
        <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
          {weeklyViews.map((views, idx) => {
            const heightPercent = Math.max(15, (views / maxViews) * 100);
            const isLatest = idx === weeklyViews.length - 1;
            return (
              <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {formatViewsShort(views)}
                </span>
                <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-indigo-500' : 'bg-indigo-500/40'}`}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 mt-1">W{idx + 1}</span>
              </div>
            );
          })}
          {[...Array(Math.max(0, 5 - weeklyViews.length))].map((_, i) => (
            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
              <div className="w-full bg-zinc-800 rounded-t-md h-full" />
              <span className="text-[9px] text-zinc-700 mt-1">-</span>
            </div>
          ))}
        </div>
      </div>

      {rel.streaming!.isLeaving && (
        <div className="text-xs text-rose-500 font-bold mt-3 bg-rose-500/10 px-3 py-2 rounded-lg flex items-center justify-center border border-rose-500/20">
          ⚠️ {tr('box.leavingSoon')}
        </div>
      )}
    </div>
  );
};