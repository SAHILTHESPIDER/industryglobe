import type { CSSProperties } from 'react';

/** Background stills for the streaming desks. Later phases can add scenes without moving these paths. */
export type StreamingSceneId =
    | 'soundstage'
    | 'orbit'
    | 'archive'
    | 'booth'
    | 'living'
    | 'vault'
    | 'blueprint'
    | 'hills';

export const STREAMING_SCENES: Record<StreamingSceneId, string> = {
    soundstage: '/assets/streaming/scenes/soundstage.webp',
    orbit: '/assets/streaming/scenes/orbit.webp',
    archive: '/assets/streaming/scenes/archive.webp',
    booth: '/assets/streaming/scenes/booth.webp',
    living: '/assets/streaming/scenes/living.webp',
    vault: '/assets/streaming/scenes/vault.webp',
    blueprint: '/assets/streaming/scenes/blueprint.webp',
    hills: '/assets/streaming/scenes/hills.webp',
};

export const sceneForDefineStep = (step: number): StreamingSceneId => {
    if (step <= 0) return 'soundstage';
    if (step === 1) return 'orbit';
    if (step === 2) return 'archive';
    if (step === 3) return 'booth';
    if (step === 4) return 'living';
    if (step === 5) return 'vault';
    return 'blueprint';
};

export const sceneStyle = (id: StreamingSceneId): CSSProperties => ({
    backgroundImage: `linear-gradient(180deg, rgba(5,6,10,0.48), rgba(5,6,10,0.72)), url(${STREAMING_SCENES[id]})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
});
