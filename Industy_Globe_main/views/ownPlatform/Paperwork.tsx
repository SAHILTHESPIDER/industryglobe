import React, { useState } from 'react';
import { Player } from '../../types';
import { faceFor } from '../../services/ownPlatform/executives';
import { formatCompact } from '../../services/ownPlatform/logic';
import { CartoonAvatar } from './CartoonFace';

interface Paper {
    id: string;
    kind: 'Seed' | 'Share' | 'Term sheet' | 'Listing';
    title: string;
    holder: string;
    line: string;
    points: number;
    faceSeed: string;
}

const papersOf = (player: Player): Paper[] => {
    const state = player.ownPlatform;
    const books = state?.books;
    const ipo = state?.ipo;
    const rows: Paper[] = [];
    if ((books?.seedStakePct || 0) > 0) {
        const name = books?.seedPartner || 'Seed investors';
        rows.push({
            id: 'seed',
            kind: 'Seed',
            title: state?.name || 'The company',
            holder: name,
            line: `${Math.round((books?.seedStakePct || 0) * 100)} points · seeded the treasury`,
            points: Math.round((books?.seedStakePct || 0) * 100),
            faceSeed: `seed:${name}`,
        });
    }
    (books?.shareholders || []).forEach(holder => {
        rows.push({
            id: holder.id,
            kind: 'Share',
            title: state?.name || 'The company',
            holder: holder.name,
            line: `${Math.round(holder.pct * 100)} points · paid ${formatCompact(holder.paid)} · week ${holder.week}`,
            points: Math.round(holder.pct * 100),
            faceSeed: `holder:${holder.id}:${holder.name}`,
        });
    });
    if (ipo && ipo.stage !== 'IDLE') {
        const listed = ipo.stage === 'LISTED' || ipo.stage === 'TRADING';
        rows.push({
            id: 'ipo',
            kind: listed ? 'Listing' : 'Term sheet',
            title: ipo.ticker || state?.name || 'The company',
            holder: listed ? 'The public' : 'The board',
            line: listed
                ? `${ipo.ticker} · $${(ipo.lastPrice || ipo.price || 0).toFixed(2)} · float filed`
                : `${ipo.stage.toLowerCase()} · $${(ipo.price || 0).toFixed(2)} · ${ipo.sharesForSale.toLocaleString('en-US')} shares`,
            points: listed ? Math.round((1 - (ipo.founderKeepPct || 0.75)) * 100) : Math.round((1 - (ipo.founderKeepPct || 0.75)) * 100),
            faceSeed: `ipo:${ipo.ticker}`,
        });
    }
    return rows;
};

/** Share papers, a term sheet, and a drawer of what has already been signed. */
export const Paperwork: React.FC<{ player: Player }> = ({ player }) => {
    const papers = papersOf(player);
    const [open, setOpen] = useState<string | null>(papers[0]?.id || null);
    const active = papers.find(row => row.id === open) || papers[0];
    if (!papers.length) return null;
    return (
        <section className="papers" data-screen="paperwork">
            <div className="lab">The papers</div>
            <div className="paper-stack">
                {papers.map((paper, index) => (
                    <button
                        key={paper.id}
                        type="button"
                        className={`share-cert${open === paper.id ? ' open' : ''}`}
                        style={{ ['--i' as string]: String(index) }}
                        onClick={() => setOpen(paper.id)}
                    >
                        <span className="cert-kind">{paper.kind}</span>
                        <strong>{paper.holder}</strong>
                        <em>{paper.line}</em>
                    </button>
                ))}
            </div>
            {active && (
                <div className="vault" data-screen="contract-vault">
                    <div className="vault-drawer">
                        <div className="between">
                            <div>
                                <div className="cert-kind">{active.kind}</div>
                                <div className="h3" style={{ color: '#2A2418' }}>{active.holder}</div>
                            </div>
                            <CartoonAvatar face={faceFor(active.faceSeed)} size={56} label={active.holder} />
                        </div>
                        <p>{active.title}. {active.line}.</p>
                        <svg viewBox="0 0 280 64" className="sign-svg" aria-hidden="true">
                            <text x="4" y="46" className="sign-draw">{active.holder}</text>
                        </svg>
                        <div className="sign-line" />
                        <div className="mini-seal" aria-hidden="true">Filed</div>
                    </div>
                </div>
            )}
        </section>
    );
};
