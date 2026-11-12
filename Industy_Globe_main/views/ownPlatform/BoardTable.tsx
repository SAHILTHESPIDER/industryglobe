import React, { useMemo, useState } from 'react';
import { CartoonFace, CompanyShareholder, ExecRole, Player } from '../../types';
import { faceFor, flagForCountry } from '../../services/ownPlatform/executives';
import {
    EXEC_ROLES,
    candidateSlate,
    executiveModifiers,
    hireExecutive,
    openRoles,
    releaseExecutive,
    roleEffect,
    roleLabel,
} from '../../services/ownPlatform/executives';
import { formatCompact } from '../../services/ownPlatform/logic';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { CartoonAvatar } from './CartoonFace';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    /** Opens the hire sheet on the CFO list. Used by the phone preview. */
    initialHire?: boolean;
}

interface Seat {
    id: string;
    name: string;
    role: string;
    detail: string;
    kind: 'founder' | 'director' | 'investor' | 'executive' | 'empty';
    faceSeed: string;
    /** Stored portrait. Hired officers keep the face from the slate. */
    face?: CartoonFace;
    country?: string;
    chips?: string[];
    execId?: string;
}

const seatOf = (player: Player): Seat[] => {
    const state = player.ownPlatform;
    const books = state?.books;
    const seats: Seat[] = [{
        id: 'founder',
        name: player.name || 'Founder',
        role: 'Founder',
        detail: 'Your chair. The company is still yours to run.',
        kind: 'founder',
        faceSeed: `founder:${player.id}:${player.name}`,
    }];
    if ((books?.seedStakePct || 0) > 0) {
        const name = books?.seedPartner || 'Seed investors';
        seats.push({
            id: 'seed',
            name,
            role: 'Director',
            detail: `Seed stake ${Math.round((books?.seedStakePct || 0) * 100)}%. They sat down when the company was funded.`,
            kind: 'director',
            faceSeed: `seed:${name}`,
        });
    }
    if ((books?.equitySoldPct || 0) > 0) {
        const name = books?.pePartner || 'Private equity';
        seats.push({
            id: 'equity',
            name,
            role: 'Director',
            detail: `Private equity holds ${Math.round((books?.equitySoldPct || 0) * 100)}%.`,
            kind: 'director',
            faceSeed: `equity:${name}`,
        });
    }
    (books?.shareholders || []).forEach((holder: CompanyShareholder) => {
        const director = holder.conditions?.some(row => row.kind === 'BOARD_SEAT');
        seats.push({
            id: `holder-${holder.id}`,
            name: holder.name,
            role: director ? 'Director' : 'Investor',
            detail: director
                ? `Bought ${Math.round(holder.pct * 100)}% and took a board seat.`
                : `Holds ${Math.round(holder.pct * 100)}% from a stake sale.`,
            kind: director ? 'director' : 'investor',
            faceSeed: `holder:${holder.id}:${holder.name}`,
            country: holder.kind,
        });
    });
    (state?.boardTeam?.executives || []).forEach(exec => {
        seats.push({
            id: `exec-${exec.id}`,
            name: exec.name,
            role: roleLabel(exec.role),
            detail: roleEffect(exec.role),
            kind: 'executive',
            faceSeed: exec.id,
            face: exec.face,
            country: exec.country,
            chips: [`Skill ${exec.skill}`, `${formatCompact(exec.weeklyFee)}/wk`, exec.trait],
            execId: exec.id,
        });
    });
    const emptyCount = Math.max(0, Math.max(8, seats.length + 2) - seats.length);
    const room = openRoles(state?.boardTeam).length === 0 ? 0 : Math.min(emptyCount, 6);
    for (let index = 0; index < room; index += 1) {
        seats.push({
            id: `empty-${index}`,
            name: 'Empty chair',
            role: 'Open seat',
            detail: 'Hire a global officer. The salary leaves company cash.',
            kind: 'empty',
            faceSeed: `empty-${index}`,
        });
    }
    return seats;
};

export const BoardTable: React.FC<Props> = ({ player, onPlayer, initialHire }) => {
    const state = player.ownPlatform;
    const seats = useMemo(() => seatOf(player), [player]);
    const [hire, setHire] = useState(Boolean(initialHire));
    const [role, setRole] = useState<ExecRole | 'ALL'>(initialHire ? 'CFO' : 'ALL');
    const [picked, setPicked] = useState<string | null>('founder');
    const [error, setError] = useState('');
    if (!state) return null;
    const mods = executiveModifiers(state.boardTeam);
    const cash = readCompanyCash(player);
    const roles = openRoles(state.boardTeam);
    const slate = candidateSlate(player).filter(row => roles.includes(row.role) && (role === 'ALL' || row.role === role));
    const selected = seats.find(seat => seat.id === picked);
    const openHire = (nextRole?: ExecRole) => {
        setError('');
        setRole(nextRole || (roles.length === 1 ? roles[0] : 'ALL'));
        setHire(true);
    };
    const apply = (result: { player: Player; error?: string }) => {
        setError(result.error || '');
        if (!result.error) {
            onPlayer(result.player);
            setHire(false);
            setPicked(null);
        }
    };

    return (
        <section className="room" data-screen="board-team">
            <div className="room-head">
                <div>
                    <div className="lab">The board</div>
                    <h3 className="h2">Around the table</h3>
                    <p className="p">Directors from stake sales sit here. An empty chair hires a CFO, COO, CTO, CMO, or Head of Content. Salaries leave company cash, never your pocket.</p>
                </div>
                <div className="room-meters">
                    <Meter label="Company cash" value={formatCompact(cash)} />
                    <Meter label="Cost cut" value={mods.costCut ? `${Math.round(mods.costCut * 100)}%` : '—'} />
                    <Meter label="Reach" value={mods.reach ? `+${Math.round(mods.reach * 100)}%` : '—'} />
                    <Meter label="Quality" value={mods.quality ? `+${Math.round(mods.quality * 100)}%` : '—'} />
                </div>
            </div>
            <div className="board-stage">
                <div className="board-wood" aria-hidden="true">
                    <div className="wood-name">{(state.name || 'Empire').toUpperCase()}</div>
                    <i className="prop card-prop" />
                    <i className="prop gavel" />
                    <i className="prop glass" />
                </div>
                <div className="board-seats">
                    {seats.map((seat, index) => {
                        const angle = (-Math.PI / 2) + (index / seats.length) * Math.PI * 2;
                        const x = 50 + Math.cos(angle) * 40;
                        const y = 50 + Math.sin(angle) * 36;
                        return (
                            <button
                                key={seat.id}
                                type="button"
                                className={`board-seat chair ${seat.kind}${picked === seat.id ? ' on' : ''}`}
                                style={{ ['--x' as string]: `${x}%`, ['--y' as string]: `${y}%` }}
                                onClick={() => {
                                    setError('');
                                    if (seat.kind === 'empty') openHire();
                                    else setPicked(seat.id === picked ? null : seat.id);
                                }}
                            >
                                <span className="chair-back" />
                                {seat.kind === 'empty' ? <span className="plus" aria-hidden="true">+</span> : (
                                    <CartoonAvatar face={seat.face || faceFor(seat.faceSeed)} size={84} label={seat.name} />
                                )}
                                <span className="who">{seat.name}</span>
                                <span className="role-tag">{seat.role}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="table-floor">
                {selected && selected.kind !== 'empty' ? (
                    <div className="dossier" data-testid="seat-dossier">
                        <CartoonAvatar face={selected.face || faceFor(selected.faceSeed)} size={84} label={selected.name} />
                        <div>
                            <div className="lab">{selected.role}</div>
                            <div className="h3">{selected.name}</div>
                            <p className="p">{selected.detail}</p>
                            {selected.chips && (
                                <div className="chips" style={{ marginTop: 8 }}>
                                    {selected.chips.map(chip => <span key={chip} className="chip">{chip}</span>)}
                                </div>
                            )}
                        </div>
                        {selected.execId && (
                            <button type="button" className="btn gho sm" onClick={() => apply(releaseExecutive(player, selected.execId!))}>Release</button>
                        )}
                    </div>
                ) : <div className="dossier"><p className="p">Tap a chair. An empty one hires.</p></div>}
                <div className="effect-board">
                    <div className="lab">What the officers change</div>
                    <Effect label="Costs" pct={mods.costCut} />
                    <Effect label="Interest" pct={mods.financeRateCut} />
                    <Effect label="Servers" pct={mods.techCut} />
                    <Effect label="Reach" pct={mods.reach} />
                    <Effect label="Quality" pct={mods.quality} />
                </div>
                <div className="decisions">
                    <div className="lab">Recent board decisions</div>
                    <p className="small">Listing stage · {(state.ipo?.stage || 'IDLE').toLowerCase()} · {state.ipo?.ticker || 'no ticker yet'}</p>
                    {(state.books?.lines || []).slice(0, 4).map(line => (
                        <p key={line.id} className="small decision">{line.label}</p>
                    ))}
                    {(state.books?.lines || []).length === 0 && <p className="small">The minute book is empty.</p>}
                </div>
            </div>
            {error && <p className="p" style={{ color: 'var(--bad)' }}>{error}</p>}
            {hire && (
                <div className="hire-sheet" role="dialog" aria-label="Hire an officer">
                    <div className="hire-panel">
                        <div className="between">
                            <div>
                                <div className="lab">Hire</div>
                                <div className="h3">Global officers</div>
                            </div>
                            <button type="button" className="btn gho sm" onClick={() => setHire(false)}>Close</button>
                        </div>
                        <p className="p" style={{ marginTop: 8 }}>Company cash {formatCompact(cash)}. The first week is paid now. Later weeks come out of the same books.</p>
                        <div className="chips" style={{ marginTop: 12 }}>
                            <button type="button" className={`chip${role === 'ALL' ? ' on' : ''}`} onClick={() => setRole('ALL')}>All open</button>
                            {EXEC_ROLES.map(item => (
                                <button key={item} type="button" className={`chip${!roles.includes(item) ? ' off' : ''}${role === item ? ' on' : ''}`} disabled={!roles.includes(item)} onClick={() => setRole(item)}>
                                    {roleLabel(item)}
                                </button>
                            ))}
                        </div>
                        <div className="hire-list">
                            {slate.map(candidate => (
                                <article key={candidate.id} className="hire-card">
                                    <CartoonAvatar face={candidate.face} size={84} label={candidate.name} />
                                    <div className="hire-copy">
                                        <div className="between">
                                            <strong>{candidate.name}</strong>
                                            <span className="tiny">{roleLabel(candidate.role)}</span>
                                        </div>
                                        <div className="small">{flagForCountry(candidate.country)} {candidate.city}, {candidate.country}</div>
                                        <div className="skill-meter" aria-label={`Skill ${candidate.skill}`}><i style={{ width: `${candidate.skill}%` }} /></div>
                                        <div className="chips" style={{ marginTop: 8 }}>
                                            <span className="chip">Skill {candidate.skill}</span>
                                            <span className="chip gold">{formatCompact(candidate.weeklyFee)}/wk</span>
                                            <span className="chip">{candidate.trait}</span>
                                        </div>
                                        <p className="tiny" style={{ marginTop: 6 }}>{roleEffect(candidate.role)}</p>
                                    </div>
                                    <button type="button" className="btn pri sm" onClick={() => apply(hireExecutive(player, candidate.id))}>Hire</button>
                                </article>
                            ))}
                            {slate.length === 0 && <p className="p">Every chair for that role is filled.</p>}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

const Effect: React.FC<{ label: string; pct: number }> = ({ label, pct }) => (
    <div className="effect-row">
        <span>{label}</span>
        <span className="bar"><i style={{ width: `${Math.round(pct * 100)}%` }} /></span>
        <b>{pct ? `${Math.round(pct * 100)}%` : '—'}</b>
    </div>
);

const Meter: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="room-meter">
        <div className="tiny">{label}</div>
        <div className="meter-val">{value}</div>
    </div>
);
