import React, { useState } from 'react';
import type { PlatformBrand } from '../../../types';
import { campaignCity } from '../../../services/marketing/launchCatalog';
import { sceneFor, type CampaignScene } from '../../../services/marketing/sceneRegistry';
import { BrandMark } from '../../ownPlatform/BrandMark';
import { tap } from '../../../components/motion';
import { SceneStage } from './SceneStage';

const madeFor = (scene: CampaignScene) => {
    const place = scene.placeLabel.toLowerCase() === scene.cityName.toLowerCase()
        ? scene.cityName
        : `${scene.placeLabel}, ${scene.cityName}`;
    return `Made for you · ${scene.formatName} · ${place}`;
};

export const LiveScene: React.FC<{
    scene: CampaignScene;
    title: string;
    logo: string;
    brand?: PlatformBrand;
    poster?: string;
    cities?: string[];
    accent?: string;
    markId?: string;
    letter?: string;
    customMark?: string;
    onClose: () => void;
}> = ({ scene, title, logo, brand, poster, cities = [], accent = '#E4B15A', markId, letter, customMark, onClose }) => {
    const [cityId, setCityId] = useState(scene.cityId);
    const [replay, setReplay] = useState(0);
    const current = sceneFor(scene.formatId, cityId) || scene;
    const line = `${current.marquee} · ${current.marquee}`;
    return (
        <div className="live-scene" role="dialog" aria-label={`${current.formatName} live`} data-screen="campaign-live" data-scene={current.id}>
            <header className="live-top">
                <div className="live-dot"><i /> LIVE</div>
                <div className="live-logo" aria-hidden="true">
                    {brand ? <BrandMark id={brand.markId} color="#E4B15A" size={28} letter={logo} /> : <b>{logo}</b>}
                </div>
                <button type="button" className="live-x" aria-label="Close" onClick={onClose}>×</button>
            </header>
            <div className="marquee" aria-hidden="true"><span>{line}</span></div>
            {cities.length > 1 && (
                <div className="live-cities">
                    {cities.map(id => {
                        const city = campaignCity(id);
                        if (!city) return null;
                        return (
                            <button key={id} type="button" className={id === cityId ? 'on' : ''} onClick={() => { setCityId(id); setReplay(value => value + 1); }}>
                                {city.name}
                            </button>
                        );
                    })}
                </div>
            )}
            <SceneStage scene={current} title={title} poster={poster} replayKey={replay} accent={accent} markId={markId || brand?.markId} letter={letter || logo} customMark={customMark || brand?.customMark} />
            <footer className="live-foot">
                <span>{madeFor(current)}</span>
                <button type="button" onClick={() => { tap('LIGHT'); setReplay(value => value + 1); }}>REPLAY</button>
            </footer>
        </div>
    );
};
