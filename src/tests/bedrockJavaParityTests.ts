// VoxelVerse v6.1.0: Bedrock & Java Parity Engine Unit Tests
import { BlockType } from '../types';
import { FluidSimulationSystem } from '../engine/world/FluidSimulationSystem';
import { EnchantmentAndStatusSystem } from '../engine/progression/EnchantmentAndStatusSystem';
import { CommandConsoleSystem } from '../engine/core/CommandConsoleSystem';
import { BehaviorPackManager } from '../engine/modding/BehaviorPackManager';
import { InventoryManager } from '../engine/items/InventoryManager';

export function runBedrockJavaParityTests(
  assert: (cond: boolean, message: string) => void
): void {
  console.log('\n[Phase 13] VoxelVerse v6.1.0: Bedrock & Java Parity Suite');

  // 1. Fluid Simulation & Water + Lava -> Obsidian Reaction
  const blocks = new Map<string, BlockType>();
  const mockWorld = {
    seed: 123456,
    getBlock: (x: number, y: number, z: number) =>
      blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BlockType.AIR,
    setBlock: (x: number, y: number, z: number, t: BlockType) => {
      blocks.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, t);
    },
  } as any;

  FluidSimulationSystem.reset();
  mockWorld.setBlock(0, 60, 0, BlockType.STONE);
  mockWorld.setBlock(1, 60, 0, BlockType.STONE);
  mockWorld.setBlock(0, 61, 0, BlockType.WATER);
  mockWorld.setBlock(1, 61, 0, BlockType.LAVA);
  FluidSimulationSystem.scheduleFluidAt(0, 61, 0, BlockType.WATER, 0);
  FluidSimulationSystem.step(mockWorld, 10);
  assert(
    mockWorld.getBlock(1, 61, 0) === BlockType.OBSIDIAN && FluidSimulationSystem.totalReactions === 1,
    'FluidSimulationSystem converts Water Source + Lava into Obsidian'
  );

  // 2. Enchantment & Status Effect System
  EnchantmentAndStatusSystem.reset();
  const sword = InventoryManager.createStack('iron_sword', 1)!;
  const enchRes = EnchantmentAndStatusSystem.enchantItem(sword, 'SHARPNESS', 3);
  assert(
    enchRes.success && EnchantmentAndStatusSystem.getEnchantLevel(enchRes.item, 'SHARPNESS') === 3,
    'EnchantmentAndStatusSystem applies Sharpness III cleanly'
  );
  EnchantmentAndStatusSystem.applyEffect('STRENGTH', 30, 2);
  assert(
    EnchantmentAndStatusSystem.getDamageMultiplier(enchRes.item) > 2.0,
    'Sharpness III + Strength II stack damage multiplier accurately'
  );

  // 3. Slash Command Console (/tp, /time, /gamemode, /fill, /locate, /effect)
  const mockRt = {
    gameMode: 'survival',
    player: { position: { x: 0, y: 64, z: 0, set(nx: number, ny: number, nz: number) { this.x = nx; this.y = ny; this.z = nz; } } },
    sky: { timeOfDay: 12 },
    world: mockWorld,
  };
  const tpRes = CommandConsoleSystem.execute('/tp 100 72 -50', mockRt);
  assert(tpRes.ok && mockRt.player.position.x === 100 && mockRt.player.position.z === -50, 'Slash command /tp teleports player');
  const gmRes = CommandConsoleSystem.execute('/gamemode creative', mockRt);
  assert(gmRes.ok && mockRt.gameMode === 'creative', 'Slash command /gamemode switches to creative');
  const fillRes = CommandConsoleSystem.execute('/fill 10 60 10 11 60 11 3', mockRt);
  assert(fillRes.ok && mockWorld.getBlock(11, 60, 11) === BlockType.STONE, 'Slash command /fill populates voxel region');
  const locRes = CommandConsoleSystem.execute('/locate minang', mockRt);
  assert(locRes.ok && locRes.output.includes('Minang'), 'Slash command /locate finds Nusantara settlement');

  // 4. Behavior Pack / Datapack Modding API
  BehaviorPackManager.reset();
  const packRes = BehaviorPackManager.registerPackFromJSON(
    JSON.stringify({
      id: 'nusantara_turbo_pack',
      name: 'Nusantara Turbo Mod',
      version: '1.0.0',
      author: 'Community',
      description: 'Double diamond drops + keepInventory',
      lootMultipliers: { diamond: 2.0 },
      worldRules: { keepInventory: true },
    })
  );
  assert(
    packRes.ok &&
      BehaviorPackManager.getLootMultiplier('diamond') === 2.0 &&
      BehaviorPackManager.worldRules.keepInventory === true,
    'BehaviorPackManager loads JSON datapack loot multipliers & world rules'
  );
}
