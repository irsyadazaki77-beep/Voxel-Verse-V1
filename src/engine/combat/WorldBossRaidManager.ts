// Multi-Phase Nusantara Mythic World Boss Raid Manager with Destructive Voxel Arena Attacks (v7.2.0)
import { BlockType } from '../../types';
import { GameEventBus } from '../events/GameEventBus';

export type MythicBossArchetype = 'garuda_sura' | 'naga_besukih' | 'raksasa_karst';

export interface BossPhaseAttack {
  id: string;
  name: string;
  phase: 1 | 2 | 3;
  telegraphSec: number;
  damage: number;
  blastRadius: number; // 0 = non-destructive, >0 = carves voxel arena crater
  placesLava?: boolean;
}

export interface WorldBossInstance {
  id: string;
  archetype: MythicBossArchetype;
  displayName: string;
  position: [number, number, number];
  health: number;
  maxHealth: number;
  phase: 1 | 2 | 3;
  active: boolean;
  defeated: boolean;
  contributors: Record<string, number>; // playerId -> damage dealt
  destroyedBlocksCount: number;
  activeTelegraph: { attack: BossPhaseAttack; timeRemaining: number; targetPos: [number, number, number] } | null;
}

export interface VoxelBlastWriter {
  getBlockAt(x: number, y: number, z: number): BlockType;
  setBlockAt(x: number, y: number, z: number, blockType: BlockType): void;
}

const INDESTRUCTIBLE_BLOCKS = new Set<BlockType>([
  BlockType.AIR,
  BlockType.ANCIENT_RUNE_STONE,
  BlockType.OBSIDIAN,
  BlockType.AETHER_PORTAL,
  BlockType.RESONANCE_NEXUS,
]);

export const MYTHIC_BOSS_CATALOG: Record<
  MythicBossArchetype,
  { displayName: string; maxHealth: number; attacks: BossPhaseAttack[]; mythicLoot: string[] }
> = {
  garuda_sura: {
    displayName: 'Garuda Sura — Penguasa Langit Vulkanik',
    maxHealth: 2400,
    mythicLoot: ['bulu_garuda_emas', 'cakra_surya_core', 'kris_pusaka'],
    attacks: [
      { id: 'gale_dive', name: 'Tebasan Angin Garuda', phase: 1, telegraphSec: 1.6, damage: 24, blastRadius: 0 },
      { id: 'solar_tempest', name: 'Badai Sayap Surya', phase: 2, telegraphSec: 2.0, damage: 34, blastRadius: 2.5 },
      { id: 'supernova_cakra', name: 'Cakra Supernova Nusantara', phase: 3, telegraphSec: 2.6, damage: 50, blastRadius: 4.0, placesLava: true },
    ],
  },
  naga_besukih: {
    displayName: 'Naga Besukih — Penjaga Kawah Agung',
    maxHealth: 3200,
    mythicLoot: ['sisik_naga_besukih', 'intan_kawah', 'obsidian_heart'],
    attacks: [
      { id: 'magma_coil', name: 'Lilitan Magma', phase: 1, telegraphSec: 1.8, damage: 28, blastRadius: 1.5 },
      { id: 'tectonic_slam', name: 'Hantaman Tektonik', phase: 2, telegraphSec: 2.2, damage: 40, blastRadius: 3.5 },
      { id: 'volcanic_cataclysm', name: 'Erupsi Kawah Agung', phase: 3, telegraphSec: 2.8, damage: 56, blastRadius: 4.5, placesLava: true },
    ],
  },
  raksasa_karst: {
    displayName: 'Raksasa Karst Maros — Titan Gua Purba',
    maxHealth: 2800,
    mythicLoot: ['batu_karst_purba', 'jantung_stalaktit', 'batik_emblem'],
    attacks: [
      { id: 'boulder_throw', name: 'Lemparan Batu Gamping', phase: 1, telegraphSec: 1.7, damage: 26, blastRadius: 2.0 },
      { id: 'stalactite_collapse', name: 'Runtuhan Stalaktit', phase: 2, telegraphSec: 2.1, damage: 38, blastRadius: 3.0 },
      { id: 'earthshaker_stomp', name: 'Injakan Penggetar Bumi', phase: 3, telegraphSec: 2.5, damage: 48, blastRadius: 4.0 },
    ],
  },
};

export class WorldBossRaidManager {
  private activeBoss: WorldBossInstance | null = null;

  public spawnBoss(archetype: MythicBossArchetype, position: [number, number, number]): WorldBossInstance {
    const def = MYTHIC_BOSS_CATALOG[archetype];
    const boss: WorldBossInstance = {
      id: `boss_${archetype}_${Date.now()}`,
      archetype,
      displayName: def.displayName,
      position: [...position],
      health: def.maxHealth,
      maxHealth: def.maxHealth,
      phase: 1,
      active: true,
      defeated: false,
      contributors: {},
      destroyedBlocksCount: 0,
      activeTelegraph: null,
    };
    this.activeBoss = boss;
    GameEventBus.emit('WORLD_BOSS_SPAWNED', { boss });
    return boss;
  }

  public getActiveBoss(): WorldBossInstance | null {
    return this.activeBoss;
  }

  /**
   * Applies damage from a player, handles multi-phase transitions (Phase 2 <= 65%, Phase 3 <= 30%),
   * and distributes mythic raid rewards on defeat.
   */
  public damageBoss(
    playerId: string,
    damage: number
  ): { phaseChanged: boolean; newPhase: 1 | 2 | 3; defeated: boolean; rewards?: string[] } {
    const boss = this.activeBoss;
    if (!boss || !boss.active || boss.defeated) {
      return { phaseChanged: false, newPhase: 1, defeated: false };
    }

    const dmg = Math.max(0, damage);
    boss.health = Math.max(0, boss.health - dmg);
    boss.contributors[playerId] = (boss.contributors[playerId] || 0) + dmg;

    const hpRatio = boss.health / boss.maxHealth;
    const prevPhase = boss.phase;
    let nextPhase: 1 | 2 | 3 = prevPhase;
    if (hpRatio <= 0.30) nextPhase = 3;
    else if (hpRatio <= 0.65) nextPhase = 2;

    const phaseChanged = nextPhase !== prevPhase;
    if (phaseChanged) {
      boss.phase = nextPhase;
      GameEventBus.emit('WORLD_BOSS_PHASE_CHANGE', { bossId: boss.id, phase: nextPhase, displayName: boss.displayName });
    }

    if (boss.health <= 0) {
      boss.defeated = true;
      boss.active = false;
      boss.activeTelegraph = null;
      const rewards = [...MYTHIC_BOSS_CATALOG[boss.archetype].mythicLoot];
      GameEventBus.emit('WORLD_BOSS_DEFEATED', {
        bossId: boss.id,
        archetype: boss.archetype,
        contributors: { ...boss.contributors },
        rewards,
      });
      return { phaseChanged, newPhase: boss.phase, defeated: true, rewards };
    }

    return { phaseChanged, newPhase: boss.phase, defeated: false };
  }

  /**
   * Starts a telegraphed phase attack targeting a player coordinate.
   */
  public triggerPhaseAttack(targetPos: [number, number, number]): BossPhaseAttack | null {
    const boss = this.activeBoss;
    if (!boss || !boss.active || boss.defeated) return null;

    const def = MYTHIC_BOSS_CATALOG[boss.archetype];
    const phaseAttack = def.attacks.find((a) => a.phase === boss.phase) || def.attacks[0];
    boss.activeTelegraph = {
      attack: phaseAttack,
      timeRemaining: phaseAttack.telegraphSec,
      targetPos: [...targetPos],
    };
    GameEventBus.emit('WORLD_BOSS_TELEGRAPH', { bossId: boss.id, attack: phaseAttack, targetPos });
    return phaseAttack;
  }

  /**
   * Executes a destructive voxel blast sphere on the arena, sparing indestructible blocks (Bedrock, Obsidian, Portals).
   */
  public applyDestructiveVoxelBlast(
    world: VoxelBlastWriter,
    center: [number, number, number],
    radius: number,
    placesLava: boolean = false
  ): Array<[number, number, number]> {
    const shattered: Array<[number, number, number]> = [];
    if (radius <= 0) return shattered;

    const cx = Math.floor(center[0]);
    const cy = Math.floor(center[1]);
    const cz = Math.floor(center[2]);
    const rCeil = Math.ceil(radius);
    const rSq = radius * radius;

    for (let dx = -rCeil; dx <= rCeil; dx++) {
      for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dz = -rCeil; dz <= rCeil; dz++) {
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > rSq) continue;

          const wx = cx + dx;
          const wy = cy + dy;
          const wz = cz + dz;
          if (wy <= 1) continue; // Protect bedrock floor

          const existing = world.getBlockAt(wx, wy, wz);
          if (INDESTRUCTIBLE_BLOCKS.has(existing)) continue;

          const nextBlock =
            placesLava && dy === -rCeil + 1 && distSq <= 2.25 ? BlockType.LAVA : BlockType.AIR;
          world.setBlockAt(wx, wy, wz, nextBlock);
          shattered.push([wx, wy, wz]);
        }
      }
    }

    if (this.activeBoss) {
      this.activeBoss.destroyedBlocksCount += shattered.length;
    }
    GameEventBus.emit('WORLD_BOSS_VOXEL_BLAST', { center, radius, shatteredCount: shattered.length });
    return shattered;
  }

  /**
   * Advances active telegraph timer and fires destructive voxel impact when telegraph completes.
   */
  public update(deltaTime: number, world?: VoxelBlastWriter): { impactFired: boolean; shatteredCount: number } {
    const boss = this.activeBoss;
    if (!boss || !boss.active || !boss.activeTelegraph) {
      return { impactFired: false, shatteredCount: 0 };
    }

    boss.activeTelegraph.timeRemaining -= deltaTime;
    if (boss.activeTelegraph.timeRemaining <= 0) {
      const { attack, targetPos } = boss.activeTelegraph;
      boss.activeTelegraph = null;
      let shatteredCount = 0;
      if (world && attack.blastRadius > 0) {
        const shattered = this.applyDestructiveVoxelBlast(world, targetPos, attack.blastRadius, !!attack.placesLava);
        shatteredCount = shattered.length;
      }
      return { impactFired: true, shatteredCount };
    }
    return { impactFired: false, shatteredCount: 0 };
  }
}
