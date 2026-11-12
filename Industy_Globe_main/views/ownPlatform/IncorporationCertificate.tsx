import React from 'react';
import { brandAccent } from '../../services/ownPlatform/brand';
import { PlatformBrand } from '../../types';

interface Props {
    company: string;
    founder: string;
    brand?: PlatformBrand;
    week: number;
    year: number;
    onClose?: () => void;
}

/** Paper certificate shown when the build is signed. The signature is the founder's saved name. */
export const IncorporationCertificate: React.FC<Props> = ({ company, founder, brand, week, year, onClose }) => {
    const ink = brandAccent(brand);
    const title = (company.trim() || 'Empire').replace(/\+$/, '');
    const who = founder.trim() || 'Founder';
    return (
        <div className="cert-scrim" role="dialog" aria-label="Certificate of incorporation" data-screen="incorporation">
            <article className="cert-sheet" style={{ ['--seal' as string]: ink }}>
                <div className="cert-rule" />
                <div className="cert-kicker">Certificate of incorporation</div>
                <h2>{title}</h2>
                <p className="cert-body">
                    This records that <b>{title}</b> is a company on the books, in the colour and type chosen for it.
                    The founder signs below. Personal cash was not the treasury.
                </p>
                <div className="cert-meta">
                    <div><span>Date</span><b>Week {week} · age {year}</b></div>
                    <div><span>Colour</span><b style={{ color: ink }}>{ink}</b></div>
                </div>
                <div className="cert-sign">
                    <svg viewBox="0 0 360 84" className="sign-svg" aria-label={`Signed by ${who}`}>
                        <text x="8" y="58" className="sign-draw">{who}</text>
                    </svg>
                    <div className="sign-line" />
                    <div className="sign-caption">Founder · {who}</div>
                </div>
                <div className="cert-seal" aria-hidden="true">
                    <span>Seal</span>
                    <b>{title.slice(0, 1)}</b>
                </div>
                {onClose && <button type="button" className="btn pri cert-done" onClick={onClose}>File it</button>}
            </article>
        </div>
    );
};
