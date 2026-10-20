import React, { createContext, useContext } from 'react';
import { Page } from '../types';
import { PhoneLaunch } from '../views/mobile/MobilePage';

export type LifestyleDestination = 'MAIN' | 'ASSETS' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING';

interface GameNavValue {
    openPage: (page: Page) => void;
    openPhone: (launch: PhoneLaunch) => void;
    openLifestyle: (view: LifestyleDestination) => void;
}

const GameNavContext = createContext<GameNavValue | null>(null);

export const GameNavProvider: React.FC<{ value: GameNavValue; children: React.ReactNode }> = ({ value, children }) => (
    <GameNavContext.Provider value={value}>{children}</GameNavContext.Provider>
);

export const useGameNav = () => useContext(GameNavContext);
