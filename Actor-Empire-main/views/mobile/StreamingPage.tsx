import React from 'react';
import { ArrowLeft, BarChart3, Clock3, Film, TrendingDown, TrendingUp, Tv } from 'lucide-react';
import { Player, StreamingLifecycle, StreamingTrend } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { buildStreamingDashboardData, buildStreamingEventFeed, PLATFORMS } from '../../services/streamingLogic';
import { getPlayerLanguage, t } from '../../services/i18n';

interface StreamingPageProps {
  player: Player;
  onBack: () => void;
  onOpenRights?: () => void;
}

const TREND_ICON: Record<StreamingTrend, React.ReactNode> = {
  SURGING: <TrendingUp size={12} className="text-emerald-400" />,
  RISING: <TrendingUp size={12} className="text-sky-400" />,
  STEADY: <BarChart3 size={12} className="text-zinc-300" />,
  COOLING: <TrendingDown size={12} className="text-amber-400" />,
  DROPPING: <TrendingDown size={12} className="text-rose-400" />,
};

export const StreamingPage: React.FC<StreamingPageProps> = ({ player, onBack, onOpenRights }) => {
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const dashboard = buildStreamingDashboardData(player.activeReleases || [], currentAbsoluteWeek, player.currentWeek);
  const feed = buildStreamingEventFeed(player.logs || [], player.news || [], 8);

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
    return `$${Math.max(0, Math.floor(amount))}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(2)}B`;
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(0)}k`;
    return `${Math.max(0, Math.floor(views))}`;
  };

  const lifecycleKey = (lifecycle: StreamingLifecycle) => `streaming.lifecycle.${lifecycle.toLowerCase()}` as const;
  const trendKey = (trend: StreamingTrend) => `streaming.trend.${trend.toLowerCase()}` as const;

  return (
    <div className="absolute inset-0 bg-zinc-900 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
      <div className="bg-indigo-900/40 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-indigo-500/30 backdrop-blur-md">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2 font-bold text-indigo-300 text-lg">
          <Tv size={20} /> {tr('streaming.title')}
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl p-3">
            <div className="text-[10px] uppercase text-zinc-500">{tr('streaming.activeTitles')}</div>
            <div className="text-lg font-bold">{dashboard.summary.activeTitles}</div>
          </div>
          <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl p-3">
            <div className="text-[10px] uppercase text-zinc-500">{tr('streaming.biddingQueue')}</div>
            <div className="text-lg font-bold">{dashboard.summary.biddingTitles}</div>
          </div>
          <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl p-3">
            <div className="text-[10px] uppercase text-zinc-500">{tr('streaming.totalViews')}</div>
            <div className="text-sm font-bold">{formatViews(dashboard.summary.totalViews)}</div>
          </div>
          <div className="bg-zinc-800/90 border border-zinc-700 rounded-xl p-3">
            <div className="text-[10px] uppercase text-zinc-500">{tr('streaming.totalRevenue')}</div>
            <div className="text-sm font-bold">{formatMoney(dashboard.summary.totalStreamingRevenue)}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{tr('streaming.liveTitles')}</div>
          {dashboard.liveTitles.length === 0 && (
            <div className="text-sm text-zinc-500 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4">{tr('streaming.noLiveTitles')}</div>
          )}
          {dashboard.liveTitles.map(title => (
            <div key={title.releaseId} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold break-words">{title.name}</div>
                  <div className="text-[11px] text-zinc-400">{title.platformName}</div>
                </div>
                <div className={`text-[10px] uppercase px-2 py-1 rounded bg-white/10 ${title.platformColor}`}>{tr(lifecycleKey(title.lifecycle))}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-zinc-500 uppercase text-[10px]">{tr('streaming.latestWeek')}</div>
                  <div className="font-mono">{formatViews(title.latestWeekViews)}</div>
                </div>
                <div>
                  <div className="text-zinc-500 uppercase text-[10px]">{tr('streaming.nextProjection')}</div>
                  <div className="font-mono">{formatViews(title.projectedNextViews)}</div>
                </div>
                <div>
                  <div className="text-zinc-500 uppercase text-[10px]">{tr('streaming.weeksLive')}</div>
                  <div className="font-mono">{title.weekOnPlatform}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-zinc-300">{TREND_ICON[title.trend]} {tr(trendKey(title.trend))}</div>
                {title.upcomingInWeeks > 0 ? (
                  <div className="text-amber-300 flex items-center gap-1"><Clock3 size={12} /> {tr('streaming.startsIn', { weeks: title.upcomingInWeeks })}</div>
                ) : title.isLeaving ? (
                  <div className="text-rose-300">{tr('streaming.leavingSoon')}</div>
                ) : (
                  <div className="text-zinc-400">{formatMoney(title.streamingRevenue)}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{tr('streaming.platformBreakdown')}</div>
          {dashboard.platformBreakdown.length === 0 ? (
            <div className="text-sm text-zinc-500 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4">{tr('streaming.noPlatformData')}</div>
          ) : dashboard.platformBreakdown.map(row => (
            <div key={row.platformId} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <div className={`font-semibold ${row.platformColor}`}>{row.platformName}</div>
                <div className="text-[11px] text-zinc-400">{tr('streaming.titleCount', { count: row.titleCount })}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div><div className="text-zinc-500">{tr('streaming.totalViews')}</div><div className="font-mono">{formatViews(row.totalViews)}</div></div>
                <div><div className="text-zinc-500">{tr('streaming.latestWeekAvg')}</div><div className="font-mono">{formatViews(row.avgLatestWeekViews)}</div></div>
                <div><div className="text-zinc-500">{tr('streaming.totalRevenue')}</div><div className="font-mono">{formatMoney(row.totalRevenue)}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{tr('streaming.biddingQueue')}</div>
          {dashboard.biddingQueue.length === 0 ? (
            <div className="text-sm text-zinc-500 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4">{tr('streaming.noBidsPending')}</div>
          ) : dashboard.biddingQueue.map(item => (
            <div key={item.releaseId} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold break-words">{item.name}</div>
                <div className="text-[11px] text-zinc-400">{tr('streaming.bidCount', { count: item.bidsCount })}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">{item.bestPlatform ? PLATFORMS[item.bestPlatform].name : tr('streaming.noOffer')}</div>
                <div className="font-mono text-sm">{item.bestBid > 0 ? formatMoney(item.bestBid) : '--'}</div>
                {onOpenRights && (
                  <button onClick={onOpenRights} className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#ffb4b4]">Open the room</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pb-8">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{tr('streaming.recentFeed')}</div>
          {feed.length === 0 ? (
            <div className="text-sm text-zinc-500 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4">{tr('streaming.noFeed')}</div>
          ) : feed.map(item => (
            <div key={item.id} className="bg-zinc-800/90 border border-zinc-700 rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                <span className="flex items-center gap-1"><Film size={10} /> W{item.week} • Y{item.year}</span>
                <span className={item.tone === 'positive' ? 'text-emerald-300' : item.tone === 'negative' ? 'text-rose-300' : 'text-zinc-400'}>{item.tone.toUpperCase()}</span>
              </div>
              <div className="text-xs text-zinc-200 break-words">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
