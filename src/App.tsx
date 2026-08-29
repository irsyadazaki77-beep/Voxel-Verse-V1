/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode } from './types';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { WorldPreset } from './engine/world/WorldConfig';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [activeWorld, setActiveWorld] = useState<{
    id: string;
    seed: number;
    gameMode: GameMode;
    name: string;
    preset?: WorldPreset;
    isMultiplayer?: boolean;
  } | null>(null);

  const handleStartGame = (
    worldId: string,
    seed: number,
    gameMode: GameMode,
    worldName: string,
    preset?: WorldPreset,
    isMultiplayer?: boolean
  ) => {
    setActiveWorld({
      id: worldId,
      seed,
      gameMode,
      name: worldName,
      preset: preset || 'standard',
      isMultiplayer: isMultiplayer || false,
    });
    setGameState('playing');
  };

  const handleExitToMenu = () => {
    setGameState('menu');
    setActiveWorld(null);
  };

  return (
    <ErrorBoundary>
      <main id="app-root" className="w-full h-full min-h-screen bg-[#0a0a0f] text-white overflow-hidden select-none font-sans">
        {gameState === 'menu' || !activeWorld ? (
          <MainMenu onStartGame={handleStartGame} />
        ) : (
          <GameCanvas
            worldId={activeWorld.id}
            seed={activeWorld.seed}
            gameMode={activeWorld.gameMode}
            worldName={activeWorld.name}
            preset={activeWorld.preset}
            isMultiplayer={activeWorld.isMultiplayer}
            onExitToMenu={handleExitToMenu}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
