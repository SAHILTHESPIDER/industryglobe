import React from 'react';
import { CharacterStudio } from './CharacterStudio';
import { CharacterDraft } from '../services/playerTalent';

interface CreationMenuProps {
  onStartGame: (draft: CharacterDraft) => void;
  onCancel?: () => void;
}

export const CreationMenu: React.FC<CreationMenuProps> = ({ onStartGame, onCancel }) => (
  <CharacterStudio mode="new" onComplete={onStartGame} onCancel={onCancel} />
);
