import React from 'react';
import { CartoonFace as Face } from '../../types';
import { cartoonSvg } from '../../services/cartoonPortrait';

interface Props {
    face: Face;
    size?: number;
    label?: string;
}

/** Drawn face. Hair, skin, and features come from the seed, never a photo. */
export const CartoonAvatar: React.FC<Props> = ({ face, size = 64, label }) => (
    <span
        className="inline-flex shrink-0"
        role="img"
        aria-label={label || 'Illustrated portrait'}
        dangerouslySetInnerHTML={{ __html: cartoonSvg(face, size) }}
    />
);
