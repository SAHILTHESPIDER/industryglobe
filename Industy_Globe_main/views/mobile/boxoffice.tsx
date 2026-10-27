import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, Flame, Globe2, Swords, TrendingUp, Trophy } from 'lucide-react';
import { Player } from '../../types';
import {
  useBoxOfficeData,
  TheatricalReleaseCard,
  StreamingReleaseCard,
  formatMoney as money,
} from './BoxOfficeApp';
import { activeClashes, gameCalendarYear, hubFilms } from '../../services/boxOfficeSim';
import type { BoxOfficeWeekend } from '../../types';
import { getPlayerLanguage, t } from '../../services/i18n';

interface BoxOfficeHubProps {
  player: Player;
  onBack: () => void;
}

type ViewMode = 'YEAR' | 'ALL_TIME';
type SubTab = 'OVERVIEW' | 'THEATERS' | 'STREAMING';
type Scope = 'INDUSTRY' | 'YOURS';

const shortMoney = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const rankDelta = (current: number, previous?: number) => {
  if (!previous) return 'NEW';
  const delta = previous - current;
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '–';
};

export const BoxOfficeHub: React.FC<BoxOfficeHubProps> = ({ player, onBack }) => {
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const calendarYear = gameCalendarYear(player.age);
  const [viewMode, setViewMode] = useState<ViewMode>('YEAR');
  const [subTab, setSubTab] = useState<SubTab>('OVERVIEW');
  const [scope, setScope] = useState<Scope>('INDUSTRY');
  const [selectedYear, setSelectedYear] = useState(calendarYear);

  const { theatrical, streaming } = useBoxOfficeData(player);
  const films = useMemo(() => hubFilms(player), [player]);
  const charts = player.world?.boxOfficeCharts || [];
  const [chartAbs, setChartAbs] = useState<number>(charts[0]?.absoluteWeek || 0);

  const years = useMemo(() => {
    const values = new Set<number>([calendarYear, ...films.map(film => film.calendarYear)]);
    charts.forEach(chart => values.add(chart.calendarYear));
    return Array.from(values).sort((a, b) => b - a);
  }, [films, charts, calendarYear]);

  const scoped = scope === 'YOURS' ? films.filter(film => film.isPlayer) : films;
  const filteredFilms = viewMode === 'ALL_TIME' ? scoped : scoped.filter(film => film.calendarYear === selectedYear);
  const allTimeGross = scoped.reduce((total, film) => total + film.gross, 0);
  const yearGross = filteredFilms.reduce((total, film) => total + film.gross, 0);

  const selectedChart: BoxOfficeWeekend | undefined = charts.find(chart => chart.absoluteWeek === chartAbs) || charts[0];
  const chartRows = (selectedChart?.entries || []).filter(entry => scope === 'INDUSTRY' || entry.isPlayer);
  const weekendTopTen = chartRows.length
    ? chartRows
    : [...filteredFilms].sort((a, b) => b.opening - a.opening).slice(0, 10).map((film, index) => ({
        id: film.id,
        title: film.name,
        weekGross: film.opening,
        totalGross: film.gross,
        weeksInRelease: 1,
        rank: index + 1,
        previousRank: undefined as number | undefined,
        isPlayer: film.isPlayer,
        grossIsEstimate: film.grossIsEstimate,
        studioId: film.studio,
        genre: film.genre,
      }));
  const maxOpening = Math.max(...weekendTopTen.map(film => film.weekGross), 1);
  const openingLeader = [...filteredFilms].sort((a, b) => b.opening - a.opening)[0];
  const clashes = activeClashes(player);
  const releases = (player.activeReleases || []).filter(release => release.distributionPhase === 'THEATRICAL');
  const currentWeekGross = releases.reduce((sum, release) => {
    const weeks = release.weeklyGross || [];
    const latest = weeks.length ? weeks[weeks.length - 1] : 0;
    return sum + latest;
  }, 0);

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#071313] text-white animate-in slide-in-from-right duration-300">
      <header className="shrink-0 border-b border-emerald-400/15 bg-[#0a1c1c]/95 px-4 pb-4 pt-12 shadow-2xl backdrop-blur-md lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-400/15 p-2 text-emerald-300"><BarChart3 size={18} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Industry tracker</p>
                <h1 className="text-lg font-black tracking-tight">Box Office Hub</h1>
              </div>
            </div>
            <div className="w-9" />
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-1">
            <button onClick={() => setViewMode('YEAR')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${viewMode === 'YEAR' ? 'bg-emerald-400 text-[#051111]' : 'text-zinc-500'}`}>Yearly</button>
            <button onClick={() => setViewMode('ALL_TIME')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${viewMode === 'ALL_TIME' ? 'bg-emerald-400 text-[#051111]' : 'text-zinc-500'}`}>All-time</button>
          </div>

          <div className="mt-3 flex gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
            {([
              ['OVERVIEW', 'OVERVIEW'],
              ['THEATERS', tr('box.inTheaters')],
              ['STREAMING', tr('box.streaming')],
            ] as [SubTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={`flex-1 rounded-xl px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${subTab === key ? 'bg-white/10 text-emerald-300' : 'text-zinc-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="ae-scroll flex-1 overflow-y-auto px-4 pb-10 pt-4 lg:px-8">
        <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-start lg:gap-6">
        {subTab === 'OVERVIEW' && (
          <>
            <div>
            {viewMode === 'YEAR' && (
              <label className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <CalendarDays size={15} className="text-emerald-400" /> Reporting year
                </span>
                <span className="relative flex items-center gap-1 font-mono text-sm font-bold text-white">
                  <select
                    value={selectedYear}
                    onChange={event => setSelectedYear(Number(event.target.value))}
                    className="appearance-none bg-transparent pr-5 text-right outline-none"
                  >
                    {years.map(year => <option key={year} value={year} className="bg-zinc-900">{year}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 text-emerald-400" />
                </span>
              </label>
            )}

            <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
              <button onClick={() => setScope('INDUSTRY')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${scope === 'INDUSTRY' ? 'bg-white/10 text-emerald-300' : 'text-zinc-500'}`}>Industry</button>
              <button onClick={() => setScope('YOURS')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${scope === 'YOURS' ? 'bg-white/10 text-emerald-300' : 'text-zinc-500'}`}>Your films</button>
            </div>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 to-transparent p-4">
                <div className="mb-3 flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{viewMode === 'YEAR' ? 'Year gross' : 'Career gross'}</span>
                  <Globe2 size={16} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-black tracking-tight">{money(viewMode === 'YEAR' ? yearGross : allTimeGross)}</p>
                <p className="mt-1 text-[10px] text-emerald-300">{scope === 'YOURS' ? 'Your theatrical films' : 'Industry theatrical films'}</p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-transparent p-4">
                <div className="mb-3 flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Opening leader</span>
                  <Trophy size={16} className="text-amber-400" />
                </div>
                <p className="truncate text-lg font-black">{openingLeader?.name || 'No releases yet'}</p>
                <p className="mt-1 text-xs font-mono text-amber-300">{openingLeader ? money(openingLeader.opening) : '$0'}{openingLeader?.grossIsEstimate ? ' est.' : ''}</p>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Weekend pulse</p>
                  <h2 className="text-xl font-black">Weekend top 10</h2>
                </div>
                {charts.length > 1 ? (
                  <label className="relative text-[10px] font-bold text-emerald-300">
                    <select
                      value={selectedChart?.absoluteWeek || ''}
                      onChange={event => setChartAbs(Number(event.target.value))}
                      className="appearance-none rounded-full border border-white/10 bg-black/30 py-1 pl-3 pr-6 outline-none"
                    >
                      {charts.map(chart => (
                        <option key={chart.absoluteWeek} value={chart.absoluteWeek} className="bg-zinc-900">
                          {chart.calendarYear} · W{chart.week}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1.5" />
                  </label>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><TrendingUp size={13} /> LIVE TRACKING</span>
                )}
              </div>
              <div className="space-y-2 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
                {weekendTopTen.length === 0 && <p className="px-2 py-8 text-center text-sm text-zinc-500">Your first release will appear here.</p>}
                {weekendTopTen.map((film, index) => (
                  <div key={film.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
                    <span className={`w-5 text-center font-mono text-xs font-bold ${index === 0 ? 'text-amber-300' : 'text-zinc-600'}`}>{String(film.rank || index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold">
                          {film.title}
                          {film.isPlayer ? <span className="ml-1 text-[9px] uppercase tracking-wider text-emerald-300">You</span> : null}
                          {film.grossIsEstimate ? <span className="ml-1 text-[9px] uppercase tracking-wider text-zinc-500">Est.</span> : null}
                        </p>
                        <span className="shrink-0 font-mono text-xs text-emerald-300">{shortMoney(film.weekGross)}</span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        <span>Wk {film.weeksInRelease}</span>
                        <span className={film.previousRank && film.previousRank > (film.rank || index + 1) ? 'text-emerald-300' : 'text-zinc-500'}>{rankDelta(film.rank || index + 1, film.previousRank)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${index === 0 ? 'bg-emerald-300' : 'bg-emerald-500/50'}`}
                          style={{ width: `${Math.max(7, (film.weekGross / maxOpening) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            </div>

            <div className="mt-5 grid gap-3 lg:mt-0">
              <div className="rounded-3xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
                <div className="mb-3 flex items-center gap-2"><Swords size={17} className="text-rose-300" /><h2 className="font-black">Release clash radar</h2></div>
                {clashes.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto lg:flex-col lg:items-stretch">
                    {clashes.map(clash => (
                      <div key={`${clash.id}-${clash.title}`} className="min-w-[180px] rounded-2xl border border-rose-300/15 bg-black/20 p-3 lg:min-w-0">
                        <p className="truncate text-xs font-bold">{clash.title}</p>
                        <p className="mt-1 text-[10px] text-rose-200/70">{titleCase(clash.genre)} · {clash.sameWeek ? 'Same week' : `W${clash.week}`} · -{Math.round((1 - clash.factor) * 100)}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No active release collision detected. Your calendar has room to breathe.</p>
                )}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2"><Flame size={17} className="text-orange-300" /><h2 className="font-black">Opening watch</h2></div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-400">Current releases tracked</p>
                    <p className="mt-1 text-2xl font-black">{releases.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{tr('box.weeklyRevenue')}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-orange-300">
                      {money(currentWeekGross)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {subTab === 'THEATERS' && (
          <div className="space-y-3 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {theatrical.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-500 lg:col-span-2">{tr('box.noTheatrical')}<br />{tr('box.noTheatricalSub')}</p>
            ) : (
              theatrical.map(release => (
                <TheatricalReleaseCard key={release.id} rel={release} tr={tr} />
              ))
            )}
          </div>
        )}

        {subTab === 'STREAMING' && (
          <div className="space-y-3 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {streaming.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-500 lg:col-span-2">{tr('box.noStreaming')}</p>
            ) : (
              streaming.map(release => (
                <StreamingReleaseCard key={release.id} rel={release} tr={tr} />
              ))
            )}
          </div>
        )}
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center lg:hidden">
        <div className="h-1 w-32 rounded-full bg-white/20" />
      </div>
    </div>
  );
};
