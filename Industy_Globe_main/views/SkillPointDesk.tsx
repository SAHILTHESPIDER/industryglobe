import React, { useState } from 'react';
import { Player } from '../types';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import { ACTING_FLAVOUR, ACTING_SKILL_KEYS, ActingSkillKey, costForNextLevel, levelOf } from '../services/skillPointLedger';
import { ensureSkillState } from '../services/playerTalent';
import { SkillTarget } from '../services/skillPointLedger';

interface Props {
    player: Player;
    busy?: boolean;
    notice?: string;
    onSpendEarned: (target: SkillTarget) => void;
    onSpendPremium: (target: SkillTarget) => void;
}

export const SkillPointDesk: React.FC<Props> = ({ player, busy, notice, onSpendEarned, onSpendPremium }) => {
    const wallet = ensureSkillState(player);
    const [group, setGroup] = useState<'acting' | 'genre'>('acting');
    const rows = group === 'acting'
        ? ACTING_SKILL_KEYS.map(key => ({
            target: { kind: 'acting', key } as SkillTarget,
            name: ACTING_FLAVOUR[key].name,
            flavour: ACTING_FLAVOUR[key].flavour,
            value: player.stats.skills?.[key] || 0,
        }))
        : ALL_GENRES.map(genre => ({
            target: { kind: 'genre', key: genre } as SkillTarget,
            name: formatGenreLabel(genre),
            flavour: 'Casting, performance, and the offer fee read this.',
            value: player.stats.genreXP?.[genre] || 0,
        }));

    return (
        <section className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Skill points</div>
                    <h3 className="text-xl font-black text-white">Craft desk</h3>
                </div>
                <div className="flex gap-2 text-xs font-black">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">Earned {wallet.earned}</span>
                    <span className="rounded-full bg-amber-400 px-3 py-1 text-black">Premium {wallet.premium}</span>
                </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">Levels cost more as they rise. Earned points come from the weeks you play. Premium points can be spent only after a verified purchase.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setGroup('acting')} className={`rounded-xl py-2 text-xs font-black uppercase ${group === 'acting' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>Acting</button>
                <button type="button" onClick={() => setGroup('genre')} className={`rounded-xl py-2 text-xs font-black uppercase ${group === 'genre' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>Genres</button>
            </div>
            <div className="mt-3 space-y-2">
                {rows.map(row => {
                    const level = levelOf(row.value);
                    const cost = costForNextLevel(level);
                    return (
                        <div key={`${row.target.kind}-${row.target.key}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white">{row.name}</div>
                                <div className="text-[11px] text-zinc-500">{row.flavour}</div>
                            </div>
                            <div className="text-right text-[10px] font-bold uppercase text-zinc-500">
                                <div>Lv {level} · {Math.round(row.value)}</div>
                                <div>{cost ? `${cost} pts` : 'Max'}</div>
                            </div>
                            <button type="button" disabled={!cost || wallet.earned < cost || busy} onClick={() => onSpendEarned(row.target)} className="rounded-xl bg-zinc-800 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40">Earned</button>
                            <button type="button" disabled={!cost || wallet.premium < cost || busy} onClick={() => onSpendPremium(row.target)} className="rounded-xl bg-amber-400 px-3 py-2 text-[10px] font-black uppercase text-black disabled:opacity-40">Premium</button>
                        </div>
                    );
                })}
            </div>
            {notice && <div className="mt-3 text-xs text-amber-200">{notice}</div>}
        </section>
    );
};

export type { ActingSkillKey };
