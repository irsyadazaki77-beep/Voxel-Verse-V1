// VoxelVerse v6.0.0: Era Keemasan Nusantara Comprehensive Unit Test Suite
import * as THREE from 'three';
import { BlockType } from '../types';
import { NusantaraAIService } from '../engine/ai/NusantaraAIService';
import { SubakAndBatikSystem } from '../engine/systems/SubakAndBatikSystem';
import { MultiplayerArenaSystem } from '../engine/systems/MultiplayerArenaSystem';
import { VoxelPhysicsSystem } from '../engine/world/VoxelPhysicsSystem';
import { VernacularHologramSystem } from '../engine/systems/VernacularHologramSystem';
import { InputManager } from '../engine/player/InputManager';

export async function runEraKeemasanV6Tests(
  assert: (cond: boolean, message: string) => void
): Promise<void> {
  console.log('\n[Phase 12] VoxelVerse v6.0.0: Era Keemasan Nusantara Suite');

  // 1. Pillar 1: Suara Sang Pujangga (Gemini AI client + offline fallback)
  const npcRes = NusantaraAIService.buildOfflineDialogueFallback({
    npcName: 'Datuk Maruhum',
    npcRole: 'Tetua Adat',
    settlementName: 'Nagari Lembah Harau',
    reputation: 45,
    playerMessage: 'Bagaimana cara menguasai jurus silat keris?',
  });
  assert(
    npcRes.source === 'fallback' && npcRes.reply.includes('Kuda-Kuda'),
    'NusantaraAIService provides rich contextual Silat dialogue fallback'
  );

  const kidung = await NusantaraAIService.composeKidung({
    playerName: 'Pendekar Test',
    level: 12,
    defeatedBosses: 3,
    structuresBuilt: 5,
    activeKhodam: 'Macan Putih',
  });
  assert(
    kidung.stanzas.length >= 4 && kidung.title.includes('Pendekar Test'),
    'NusantaraAIService composes multi-stanza Kidung Pujangga chronicles'
  );

  // 2. Pillar 2: Subak 2.0, Batik 16x16 Studio & Gua Karst
  const mockBlocks = new Map<string, BlockType>();
  const mockWorld = {
    getBlock: (x: number, y: number, z: number) =>
      mockBlocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BlockType.AIR,
    setBlock: (x: number, y: number, z: number, type: BlockType) => {
      mockBlocks.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, type);
    },
  } as any;

  SubakAndBatikSystem.reset();
  const gate = SubakAndBatikSystem.buildSubakAqueductAndSluice(mockWorld, [10, 64, 10]);
  assert(gate.isOpen === true && SubakAndBatikSystem.sluiceGates.length === 1, 'Subak 2.0 builds bamboo aqueduct & teak sluice gate');

  const toggled = SubakAndBatikSystem.toggleAllSluiceGates(mockWorld);
  assert(toggled === false, 'Subak 2.0 toggles sluice gates cleanly');
  SubakAndBatikSystem.toggleAllSluiceGates(mockWorld); // reopen

  const lesung = SubakAndBatikSystem.spawnLesungPadiOtomatis([10, 64, 10]);
  assert(!!lesung.id && SubakAndBatikSystem.lesungUnits.length === 1, 'Subak 2.0 spawns animated Lesung Padi Otomatis');

  const megamendung = SubakAndBatikSystem.applyBatikPreset('MEGAMENDUNG');
  assert(megamendung.length === 256 && SubakAndBatikSystem.activePreset === 'MEGAMENDUNG', 'Batik Studio generates 16x16 Megamendung pattern');
  SubakAndBatikSystem.paintBatikPixel(4, 4, '#d97706');
  assert(SubakAndBatikSystem.batikGrid[4 * 16 + 4] === '#d97706', 'Batik Studio paints individual canting pixels accurately');

  const karstPos = SubakAndBatikSystem.summonKarstCaveExpedition(mockWorld, [10, 64, 10]);
  assert(SubakAndBatikSystem.karstCavePos !== null && karstPos[1] >= 24, 'Gua Karst Maros-Pangkep expedition generates underground cavern');

  // 3. Pillar 3: Multi-Crew Vehicles, Gelanggang Duel 1v1 & Proximity Voice
  MultiplayerArenaSystem.reset();
  const seat = MultiplayerArenaSystem.setCrewSeat('CETBANG_GUNNER');
  assert(seat === 'CETBANG_GUNNER', 'Multi-Crew switches to Meriam Cetbang Gunner seat');

  const fired = MultiplayerArenaSystem.fireCetbangCannon(
    new THREE.Vector3(0, 66, 0),
    new THREE.Vector3(0, 0, -1)
  );
  assert(fired === true && MultiplayerArenaSystem.cetbangShotsFired >= 1, 'Multi-Crew fires 3D Meriam Cetbang cannonball');

  const duel = MultiplayerArenaSystem.startSilatDuel([0, 64, 0], 'Pendekar Uji', 30);
  assert(duel.active === true && duel.round === 1, 'Gelanggang Pendekar initiates 1v1 Silat Duel');
  MultiplayerArenaSystem.registerDuelStrike('PLAYER', 100);
  assert(MultiplayerArenaSystem.duel.playerWins === 1 && MultiplayerArenaSystem.getTimeScale() < 1.0, 'Gelanggang Duel triggers slow-mo finishing & round advance');
  MultiplayerArenaSystem.registerDuelStrike('PLAYER', 100);
  assert(MultiplayerArenaSystem.duel.active === false && MultiplayerArenaSystem.duel.playerWins === 2, 'Gelanggang Duel completes best-of-3 match');

  const voice = MultiplayerArenaSystem.toggleProximityVoice(true);
  assert(voice.enabled === true, 'Proximity Spatial Voice toggles cleanly');

  // 4. Pillar 4: Voxel Physics Gravity Falling Blocks
  mockWorld.setBlock(2, 60, 2, BlockType.STONE);
  mockWorld.setBlock(2, 61, 2, BlockType.AIR);
  mockWorld.setBlock(2, 62, 2, BlockType.AIR);
  mockWorld.setBlock(2, 63, 2, BlockType.SAND);
  const fell = VoxelPhysicsSystem.settleGravityColumn(mockWorld, 2, 63, 2);
  assert(fell === 2 && mockWorld.getBlock(2, 61, 2) === BlockType.SAND, 'VoxelPhysicsSystem settles falling SAND block smoothly onto solid ground');

  // 5. Pillar 5: Blueprint Exporter / Importer (UGC) & Gamepad API
  const activeTmpl = VernacularHologramSystem.getActiveTemplate();
  const exportedCode = VernacularHologramSystem.exportBlueprintCode(activeTmpl);
  assert(exportedCode.startsWith('VVBP1:'), 'VernacularHologramSystem exports compact VVBP1 blueprint code');

  const importedTmpl = VernacularHologramSystem.importBlueprintCode(exportedCode);
  assert(
    importedTmpl !== null && importedTmpl.blocks.length === activeTmpl.blocks.length,
    'VernacularHologramSystem imports VVBP1 blueprint code with exact block fidelity'
  );

  const inputMgr = new InputManager();
  const gpInfo = inputMgr.getConnectedGamepadInfo();
  assert(typeof gpInfo.connected === 'boolean' && typeof gpInfo.name === 'string', 'InputManager exposes Gamepad controller status safely');
  inputMgr.dispose();
}
