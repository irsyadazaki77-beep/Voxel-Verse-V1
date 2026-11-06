/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { GameMode } from './types';
import { MainMenu } from './components/MainMenu';
import { WorldPreset } from './engine/world/WorldConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameCanvas } from './components/GameCanvas';
import { NusantaraHeritageViewer } from './components/NusantaraHeritageViewer';

const VoxelVerseLoadingFallback: React.FC<{ message?: string }> = ({
  message = 'Memuat Dunia VoxelVerse...',
}) => (
  <div
    id="suspense-loading-screen"
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08090d] text-white font-sans select-none animate-fade-in"
  >
    <div className="flex flex-col items-center space-y-6 max-w-sm text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-2xl shadow-sky-500/20 animate-pulse">
        <div className="w-full h-full bg-[#08090d] rounded-[14px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black tracking-wider uppercase text-sky-300">VoxelVerse</h3>
        <p className="text-xs text-zinc-400 font-mono">{message}</p>
      </div>
    </div>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'heritage'>('menu');
  const [activeWorld, setActiveWorld] = useState<{
    id: string;
    seed: number;
    gameMode: GameMode;
    name: string;
    preset?: WorldPreset;
    isMultiplayer?: boolean;
    sessionToken?: string;
    playerName?: string;
  } | null>(null);

  const handleStartGame = (
    worldId: string,
    seed: number,
    gameMode: GameMode,
    worldName: string,
    preset?: WorldPreset,
    isMultiplayer?: boolean,
    sessionToken?: string,
    playerName?: string
  ) => {
    setActiveWorld({
      id: worldId,
      seed,
      gameMode,
      name: worldName,
      preset: preset || 'standard',
      isMultiplayer: isMultiplayer || false,
      sessionToken,
      playerName,
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
        {gameState === 'heritage' ? (
          <Suspense fallback={<VoxelVerseLoadingFallback message="Memuat Galeri Warisan Nusantara..." />}>
            <NusantaraHeritageViewer onBackToMenu={() => setGameState('menu')} />
          </Suspense>
        ) : gameState === 'menu' || !activeWorld ? (
          <MainMenu 
            onStartGame={handleStartGame} 
            onEnterHeritageMode={() => setGameState('heritage')}
          />
        ) : (
          <Suspense fallback={<VoxelVerseLoadingFallback message="Menyiapkan Sesi Dunia Voxel..." />}>
            <GameCanvas
              worldId={activeWorld.id}
              seed={activeWorld.seed}
              gameMode={activeWorld.gameMode}
              worldName={activeWorld.name}
              preset={activeWorld.preset}
              isMultiplayer={activeWorld.isMultiplayer}
              sessionToken={activeWorld.sessionToken}
              playerName={activeWorld.playerName}
              onExitToMenu={handleExitToMenu}
            />
          </Suspense>
        )}
      </main>
    </ErrorBoundary>
  );
}
