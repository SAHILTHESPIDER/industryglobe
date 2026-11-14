import React, { useEffect, useState } from 'react';
import type { PlatformBrand } from '../../../types';
import type { LaunchAnim } from '../../../services/marketing/launchCatalog';
import { Surface } from './Surfaces';

const useReduce = () => {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const apply = () => setReduce(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);
    return reduce;
};

/** The channel's place, with the brand art covering the real surface. */
export const ChannelMock: React.FC<{ anim: LaunchAnim; brand: PlatformBrand; name: string }> = ({ anim, brand, name }) => {
    const reduce = useReduce();
    return (
        <div className={`scene ${reduce ? 'reduce' : ''}`} data-anim={anim}>
            <Surface anim={anim} brand={brand} name={name} />
        </div>
    );
};
