import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, Flame, Globe2, Swords, TrendingUp, Trophy } from 'lucide-react';
import { Player } from '../../types';
import {
  useBoxOfficeData,
  TheatricalReleaseCard,
  StreamingReleaseCard,
  formatMoney as money,
} from './BoxOfficeApp';

interface BoxOfficeHubProps {
  player: Player;
  onBack: () => void;
}

type ViewMode = 'YEAR' | 'ALL_TIME';
type SubTab = 'OVERVIEW' | 'THEATERS' | 'STREAMING';

const shortMoney = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export const BoxOfficeHub: React.FC<BoxOfficeHubProps> = ({ player, onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('YEAR');
  const [subTab, setSubTab] = useState<SubTab>('OVERVIEW');
  const [selectedYear, setSelectedYear] = useState(player.age);

  const { theatrical, streaming, tr } = useBoxOfficeData(player);

  const releases = player.activeReleases || [];
  const pastProjects = player.pastProjects || [];

  const years = useMemo(
    () => Array.from(new Set([player.age, ...pastProjects.map(p => p.year)])).sort((a, b) => b - a),
    [pastProjects, player.age]
  );

  const films = useMemo(() => [
    ...pastProjects.map(project => ({
      id: project.id,
      name: project.name,
      year: project.year,
      gross: project.gross || 0,
      opening: Math.max(project.gross || 0, 0) * 0.22,
      studio: titleCase(project.studioId || 'Independent'),
      genre: titleCase(project.genre || 'Drama'),
      isLive: false,
    })),
    ...releases.map(release => ({
      id: release.id,
      name: release.name,
      year: player.age,
      gross: release.totalGross || 0,
      opening: release.weeklyGross?.[0] || 0,
      studio: titleCase(release.projectDetails?.studioId || 'Independent'),
      genre: titleCase(release.projectDetails?.genre || 'Drama'),
      isLive: true,
    })),
  ], [pastProjects, releases, player.age]);

  const filteredFilms = viewMode === 'ALL_TIME' ? films : films.filter(f => f.year === selectedYear);
  const allTimeGross = films.reduce((t, f) => t + f.gross, 0);
  const yearGross = filteredFilms.reduce((t, f) => t + f.gross, 0);
  const weekendTopTen = [...filteredFilms].sort((a, b) => b.opening - a.opening).slice(0, 10);
  const maxOpening = Math.max(...weekendTopTen.map(f => f.opening), 1);
  const openingLeader = weekendTopTen[0];
  const clash = releases.length > 1 ? releases.slice(0, 3) : [];

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#071313] text-white animate-in slide-in-from-right duration-300">
      <header className="shrink-0 border-b border-emerald-400/15 bg-[#0a1c1c]/95 px-4 pb-4 pt-12 shadow-2xl backdrop-blur-md">
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
          {(['OVERVIEW', 'THEATERS', 'STREAMING'] as SubTab[]).map(key => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`flex-1 rounded-xl px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${subTab === key ? 'bg-white/10 text-emerald-300' : 'text-zinc-500'}`}
            >
              {key}
            </button>
          ))}
        </div>
      </header>

      <main className="ae-scroll flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {subTab === 'OVERVIEW' && (
          <>
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

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 to-transparent p-4">
                <div className="mb-3 flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{viewMode === 'YEAR' ? 'Year gross' : 'Career gross'}</span>
                  <Globe2 size={16} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-black tracking-tight">{money(viewMode === 'YEAR' ? yearGross : allTimeGross)}</p>
                <p className="mt-1 text-[10px] text-emerald-300">Across tracked releases</p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-transparent p-4">
                <div className="mb-3 flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Opening leader</span>
                  <Trophy size={16} className="text-amber-400" />
                </div>
                <p className="truncate text-lg font-black">{openingLeader?.name || 'No releases yet'}</p>
                <p className="mt-1 text-xs font-mono text-amber-300">{openingLeader ? money(openingLeader.opening) : '$0'}</p>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Weekend pulse</p>
                  <h2 className="text-xl font-black">Top 10 openings</h2>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><TrendingUp size={13} /> LIVE TRACKING</span>
              </div>
              <div className="space-y-2 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
                {weekendTopTen.length === 0 && <p className="px-2 py-8 text-center text-sm text-zinc-500">Your first release will appear here.</p>}
                {weekendTopTen.map((film, index) => (
                  <div key={film.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
                    <span className={`w-5 text-center font-mono text-xs font-bold ${index === 0 ? 'text-amber-300' : 'text-zinc-600'}`}>{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold">{film.name}</p>
                        <span className="shrink-0 font-mono text-xs text-emerald-300">{shortMoney(film.opening)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${index === 0 ? 'bg-emerald-300' : 'bg-emerald-500/50'}`}
                          style={{ width: `${Math.max(7, (film.opening / maxOpening) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 grid gap-3">
              <div className="rounded-3xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
                <div className="mb-3 flex items-center gap-2"><Swords size={17} className="text-rose-300" /><h2 className="font-black">Release clash radar</h2></div>
                {clash.length > 1 ? (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {clash.map(release => (
                      <div key={release.id} className="min-w-[145px] rounded-2xl border border-rose-300/15 bg-black/20 p-3">
                        <p className="truncate text-xs font-bold">{release.name}</p>
                        <p className="mt-1 text-[10px] text-rose-200/70">{titleCase(release.projectDetails?.genre || 'Drama')} · W{release.weekNum}</p>
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
                    <p className="text-xs text-zinc-400">Current week gross</p>
                    <p className="mt-1 font-mono text-lg font-bold text-orange-300">
                      {money(releases.reduce((sum, release) => sum + (release.weeklyGross?.at(-1) || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {subTab === 'THEATERS' && (
          <div className="space-y-3">
            {theatrical.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-500">No theatrical releases tracked.</p>
            ) : (
              theatrical.map(release => (
                <TheatricalReleaseCard key={release.id} release={release} tr={tr} />
              ))
            )}
          </div>
        )}

        {subTab === 'STREAMING' && (
          <div className="space-y-3">
            {streaming.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-500">No streaming releases tracked.</p>
            ) : (
              streaming.map(release => (
                <StreamingReleaseCard key={release.id} release={release} tr={tr} />
              ))
            )}
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center">
        <div className="h-1 w-32 rounded-full bg-white/20" />
      </div>
    </div>
  );
};