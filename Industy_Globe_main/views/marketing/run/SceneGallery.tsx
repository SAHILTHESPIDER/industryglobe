import React, { useMemo, useState } from 'react';
import type { PlatformBrand } from '../../../types';
import { CAMPAIGN_CITIES } from '../../../services/marketing/launchCatalog';
import { RUN_FORMATS, sceneFor } from '../../../services/marketing/sceneRegistry';
import { brandAccent } from '../../../services/ownPlatform/brand';
import { BrandMark } from '../../ownPlatform/BrandMark';
import { LiveScene } from './LiveScene';
import { SceneStage } from './SceneStage';
import './run.css';

/** Preview of every registered scene. A poster dropped here stays in this screen. */
export const SceneGallery: React.FC<{ brand?: PlatformBrand; service?: string; onClose?: () => void }> = ({ brand, service = 'Empire+', onClose }) => {
    const [formatId, setFormatId] = useState(RUN_FORMATS[0].id);
    const [cityId, setCityId] = useState('dxb');
    const [poster, setPoster] = useState('');
    const [playing, setPlaying] = useState(false);
    const scene = useMemo(() => sceneFor(formatId, cityId) || sceneFor(formatId, CAMPAIGN_CITIES[0].id), [formatId, cityId]);
    const onFile = (file?: File) => {
        if (!file) return;
        if (file.size > 1_500_000) return;
        const reader = new FileReader();
        reader.onload = () => setPoster(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
    };
    return (
        <div className="scene-gallery" data-screen="campaign-scenes">
            <header className="run-top">
                <div>
                    {onClose && <button type="button" className="live-x" aria-label="Close" onClick={onClose}>×</button>}
                    <h1>CAMPAIGN SCENES</h1>
                    <p className="run-status">{scene ? `${scene.formatName} · ${scene.cityName}` : 'Pick a scene'}</p>
                </div>
                <div className="run-logo">{brand ? <BrandMark id={brand.markId} color="#E4B15A" size={28} letter={service} /> : <b>E</b>}</div>
            </header>
            <div className="tabs">
                {RUN_FORMATS.map(row => (
                    <button key={row.id} type="button" className={row.id === formatId ? 'on' : ''} onClick={() => setFormatId(row.id)}>{row.name}</button>
                ))}
            </div>
            <div className="gallery-tools">
                <select aria-label="City" value={cityId} onChange={event => setCityId(event.target.value)}>
                    {CAMPAIGN_CITIES.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                <label className="gallery-tools">
                    <input type="file" accept="image/*" hidden onChange={event => onFile(event.target.files?.[0])} />
                    <span style={{ display: 'inline-block', border: '1px solid rgba(255,255,255,.16)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}>UPLOAD IMAGE</span>
                </label>
                <button type="button" onClick={() => setPlaying(true)} disabled={!scene}>PLAY LAUNCH</button>
            </div>
            <div className="run-scroll" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 16 }}>
                {scene && <SceneStage scene={scene} title={service} poster={poster} accent={brand ? brandAccent(brand) : undefined} markId={brand?.markId} letter={service.slice(0, 1)} customMark={brand?.customMark} lockupId={brand?.lockupId} line={brand?.manifesto} />}
            </div>
            {playing && scene && (
                <LiveScene scene={scene} title={service} logo={service.slice(0, 1)} brand={brand} poster={poster} cities={CAMPAIGN_CITIES.map(city => city.id)} onClose={() => setPlaying(false)} />
            )}
        </div>
    );
};
