import React, { useState } from 'react';
import { INITIAL_PLAYER, Player } from '../../../../types';
import { createBusiness } from '../../../../services/businessLogic';
import { buildCoverage, buildScriptRecord, generateIndustryWriters, planWritersRoom } from '../../../../services/scriptDesk/logic';
import { ScriptDesk } from './ScriptDesk';

const seed = (): Player => {
    const house = createBusiness('Lotus Frame', 'PRODUCTION_HOUSE', 'INDIE_STUDIO', { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'HIGH' }, '🎬', 12);
    house.balance = 25_000_000;
    const writers = generateIndustryWriters(8, 'BOLLYWOOD', 'preview-room');
    house.studioState = {
        ...(house.studioState as NonNullable<typeof house.studioState>),
        filmIndustry: 'BOLLYWOOD',
        writers,
    };
    const writer = writers[0];
    const room = planWritersRoom([writer], 'ROMANCE', 40, false);
    const built = buildScriptRecord({
        title: 'Monsoon Deed',
        genre: 'ROMANCE',
        industry: 'BOLLYWOOD',
        draft: {
            source: 'BOOK',
            genre: 'ROMANCE',
            toneId: 'masala',
            hookId: 'arranged',
            climaxId: 'wedding',
            songs: 5,
            songStyle: 'filmi',
            characters: [
                { id: 'h', name: 'Kabir Malhotra', role: 'Hero', size: 'LEAD', gender: 'MALE' },
                { id: 'n', name: 'Meera Kapoor', role: 'Heroine', size: 'LEAD', gender: 'FEMALE' },
                { id: 'f', name: 'Ananya Sharma', role: 'Best Friend', size: 'SUPPORTING', gender: 'FEMALE' },
            ],
            bookPopularity: 82,
            split: 'TWO_PART',
            twist: {
                id: 'friend-villain',
                label: 'The best friend is the villain',
                detail: 'The person the hero trusts has been steering the harm.',
                risk: 'A cheap turn feels like a cheat.',
                reward: 'Critics quote a fair betrayal.',
                audience: 6,
                critics: 9,
                leak: 0.04,
                linkedRole: 'Best Friend',
            },
        },
        room,
        week: 12,
        split: 'TWO_PART',
    });
    built.script.craft = {
        ...built.script.craft!,
        stage: 'REWRITES',
        coverage: buildCoverage(built.script, 12),
    };
    house.studioState.scripts = [built.script];
    return {
        ...INITIAL_PLAYER,
        money: 4_000_000,
        currentWeek: 12,
        businesses: [house],
        writerStats: { creativity: 46, dialogue: 52, structure: 41, pacing: 44 },
    };
};

const STEPS = {
    source: undefined,
    parts: 'PARTS',
    twist: 'TWIST',
    cast: 'CAST',
    writers: 'WRITERS',
    page: 'LOOK',
} as const;

export const ScriptDeskPreview: React.FC<{ mode: string }> = ({ mode }) => {
    const [player, setPlayer] = useState<Player>(() => seed());
    const studio = player.businesses[0];
    const room = mode === 'room' || mode === 'coverage' || mode === 'page-locked';
    const step = STEPS[mode as keyof typeof STEPS];
    return (
        <div className="h-[100dvh] bg-black">
            <ScriptDesk
                player={player}
                studio={studio}
                script={room ? studio.studioState?.scripts[0] : null}
                startStep={step}
                onBack={() => undefined}
                onUpdatePlayer={setPlayer}
            />
        </div>
    );
};
