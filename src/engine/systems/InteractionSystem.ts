import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { BlockType, RaycastHit, EntityState } from '../../types';
import { MiningEngine } from '../world/MiningEngine';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FarmingManager } from '../world/FarmingManager';
import { InventoryManager } from '../items/InventoryManager';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { BlockShapeResolver } from '../world/BlockShapeResolver';
import { GameEventBus } from '../events/GameEventBus';
import { NetworkSession } from '../network/NetworkSession';
import { AetherNetworkManager } from '../engineering/AetherNetworkManager';
import { NotificationManager } from '../ui/NotificationManager';
import { FishingSystem } from './FishingSystem';
import { LivestockSystem } from './LivestockSystem';
import { MaritimeVesselSystem } from './MaritimeVesselSystem';
import { VernacularHologramSystem } from './VernacularHologramSystem';
import { CataclysmVisualEngine } from '../environment/CataclysmVisualEngine';
import { TreasureMapSystem } from '../exploration/TreasureMapSystem';
import { AerialFlightAndSiegeSystem } from './AerialFlightAndSiegeSystem';
import { NusantaraSanctumSilatSubakSystem } from './NusantaraSanctumSilatSubakSystem';
import { MahakaryaNusantaraSystem } from './MahakaryaNusantaraSystem';
import { CharacterProgressionManager } from '../progression/CharacterProgressionManager';

export interface MiningState {
  active: boolean;
  progress: number;
  breakTime: number;
  targetPosKey: string;
}

const ENGINEERING_BLOCKS = new Set<BlockType>([
  BlockType.RESONANCE_FABRICATOR,
  BlockType.LEY_HARVESTER,
  BlockType.IRRIGATION_NODE,
  BlockType.AETHER_SENTINEL_TURRET,
  BlockType.ITEM_FUNNEL,
  BlockType.AETHER_STORAGE_RELAY,
  BlockType.LEY_GENERATOR,
]);

export class InteractionSystem implements GameSystem {
  public readonly name = 'InteractionSystem';
  private runtime: GameRuntime;

  public miningState: MiningState = {
    active: false,
    progress: 0,
    breakTime: 1.0,
    targetPosKey: '',
  };

  public currentHit: RaycastHit | null = null;
  public currentTargetedEntity: EntityState | null = null;
  private lastTargetPosKey: string = '';
  private lastBiteNotified: boolean = false;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  private findWaterCastTarget(eyePos: THREE.Vector3, forwardDir: THREE.Vector3): [number, number, number] | null {
    const { world } = this.runtime;
    if (!world) return null;

    // Step along look ray up to 12 blocks to detect water surface
    for (let dist = 1.5; dist <= 12.0; dist += 0.4) {
      const rx = eyePos.x + forwardDir.x * dist;
      const ry = eyePos.y + forwardDir.y * dist;
      const rz = eyePos.z + forwardDir.z * dist;
      const bx = Math.floor(rx);
      const by = Math.floor(ry);
      const bz = Math.floor(rz);

      const block = world.getBlock(bx, by, bz);
      if (block === BlockType.WATER || block === BlockType.TERRACE_WATERWAY) {
        // Find top surface of water column
        let surfY = by;
        while (surfY < by + 4 && world.getBlock(bx, surfY + 1, bz) === BlockType.WATER) {
          surfY++;
        }
        return [bx + 0.5, surfY + 0.88, bz + 0.5];
      }
      if (block !== BlockType.AIR && BLOCK_DEFS[block]?.solid) {
        // Check if water is right next to or below the shoreline block
        for (let dy = 0; dy >= -2; dy--) {
          if (world.getBlock(bx, by + dy, bz) === BlockType.WATER) {
            return [bx + 0.5, by + dy + 0.88, bz + 0.5];
          }
        }
        break;
      }
    }

    // Fallback: check downward from a point 5 blocks ahead of the player
    const castX = Math.floor(eyePos.x + forwardDir.x * 5.0);
    const castZ = Math.floor(eyePos.z + forwardDir.z * 5.0);
    const startY = Math.floor(eyePos.y);
    for (let y = startY + 1; y >= startY - 6; y--) {
      const b = world.getBlock(castX, y, castZ);
      if (b === BlockType.WATER || b === BlockType.TERRACE_WATERWAY) {
        return [castX + 0.5, y + 0.88, castZ + 0.5];
      }
      if (b !== BlockType.AIR && BLOCK_DEFS[b]?.solid) break;
    }

    return null;
  }

  private updateFishingTick(deltaTime: number): void {
    if (FishingSystem.state === 'IDLE') {
      this.lastBiteNotified = false;
      return;
    }

    const { player, world, weather, sky, audio, particles, stats } = this.runtime;
    const activeItem = this.runtime.getActiveHotbarItem();
    const isHoldingRod =
      activeItem && (activeItem.itemId === 'fishing_rod' || activeItem.itemId === 'aether_rod');

    // Cancel fishing if player switches away from rod or walks too far (> 16m)
    if (!isHoldingRod) {
      FishingSystem.reset();
      return;
    }

    if (FishingSystem.bobberPos) {
      const dx = player.position.x - FishingSystem.bobberPos[0];
      const dz = player.position.z - FishingSystem.bobberPos[2];
      if (dx * dx + dz * dz > 16 * 16) {
        FishingSystem.reset();
        NotificationManager.push({
          title: 'Pancing Ditarik',
          message: 'Anda berjalan terlalu jauh dari pelampung pancing.',
          priority: 'NORMAL',
          colorTheme: 'sky',
          durationMs: 2000,
        });
        return;
      }
    }

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    const biomeCat = biome.name.toLowerCase().includes('ocean') || biome.name.toLowerCase().includes('beach')
      ? 'ocean'
      : biome.name.toLowerCase().includes('crystal') || biome.name.toLowerCase().includes('aether')
      ? 'exotic'
      : 'forest';
    const isRaining = weather?.weather?.type?.includes('rain') || weather?.weather?.type?.includes('storm') || false;
    const normTime = sky ? (sky.timeOfDay % 24) / 24 : 0.5;

    const tickRes = FishingSystem.update(deltaTime, biomeCat, isRaining, normTime);

    if (tickRes.event === 'bite') {
      if (!this.lastBiteNotified) {
        this.lastBiteNotified = true;
        audio.playItemCollect();
        if (FishingSystem.bobberPos) {
          particles.spawnWaterSplash(
            new THREE.Vector3(FishingSystem.bobberPos[0], FishingSystem.bobberPos[1], FishingSystem.bobberPos[2])
          );
        }
      } else if (Math.random() < 0.15 && FishingSystem.bobberPos) {
        particles.spawnWaterSplash(
          new THREE.Vector3(FishingSystem.bobberPos[0], FishingSystem.bobberPos[1], FishingSystem.bobberPos[2])
        );
      }
    } else {
      this.lastBiteNotified = false;
    }

    if (tickRes.event === 'escape') {
      audio.playDamage();
      NotificationManager.push({
        title: 'Ikan Lepas!',
        message: 'Terlalu lambat menyentak joran saat pelampung disambar.',
        priority: 'HIGH',
        colorTheme: 'amber',
        durationMs: 2500,
      });
    } else if (tickRes.event === 'success' && tickRes.catch) {
      this.handleFishingCatchReward(tickRes.catch);
    }
  }

  private handleFishingCatchReward(catchRes: {
    itemId: string;
    itemName: string;
    quantity: number;
    xpEarned: number;
    isTreasure: boolean;
  }): void {
    const { audio, particles, stats, player } = this.runtime;
    this.runtime.addItemToInventory(catchRes.itemId, catchRes.quantity);
    if (stats) {
      stats.addXP(catchRes.xpEarned);
    }
    audio.playItemCollect();
    player.triggerSwing();
    this.runtime.viewmodel?.triggerSwing('slash');

    if (FishingSystem.bobberPos) {
      const bPos = new THREE.Vector3(
        FishingSystem.bobberPos[0],
        FishingSystem.bobberPos[1],
        FishingSystem.bobberPos[2]
      );
      particles.spawnWaterSplash(bPos);
      particles.spawnHarvestParticles(bPos, catchRes.isTreasure);
    }

    NotificationManager.push({
      title: catchRes.isTreasure ? 'Harta Karun Pancing!' : 'Tangkapan Berhasil!',
      message: `Memperoleh ${catchRes.quantity}x ${catchRes.itemName} (+${catchRes.xpEarned} XP)`,
      priority: catchRes.isTreasure ? 'HIGH' : 'NORMAL',
      colorTheme: catchRes.isTreasure ? 'amber' : 'emerald',
      durationMs: 3200,
    });
  }

  public update(deltaTime: number): void {
    const { player, world, entities, inputManager, audio, particles, stats, gameMode, weather, sky } = this.runtime;
    if (!player || !world) return;

    // 0. Update Active 3D Fishing Session
    this.updateFishingTick(deltaTime);

    // 1. Raycast for target block and target entity
    const eyePos = player.getCameraPosition();
    const forwardDir = player.getForwardVector();
    const hit = world.raycast(eyePos, forwardDir, 5.5);
    this.currentHit = hit;

    // Notify UI if targeted block changed
    const currentTargetKey = hit ? `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]},${hit.blockType}` : '';
    if (currentTargetKey !== this.lastTargetPosKey) {
      this.lastTargetPosKey = currentTargetKey;
      this.runtime.emitTargetHitChanged(hit);
    }

    const targetedEntityId = entities.getEntityRaycastHit(eyePos, forwardDir, 5.0);
    this.currentTargetedEntity = targetedEntityId ? (entities.entities.get(targetedEntityId)?.state || null) : null;
    const activeItem = this.runtime.getActiveHotbarItem();

    // 2. Primary Action: Attack Entity OR Mine Block (Hold to Mine)
    if (inputManager.isActionActive('Attack')) {
      // Special Tool: Left-Click with Lontar Arsitek Nusantara cycles the 3D Hologram Blueprint & rotation
      if (activeItem && activeItem.itemId === 'lontar_arsitek_nusantara') {
        if (inputManager.consumeAction('Attack')) {
          if (player.keys.crouch) {
            VernacularHologramSystem.rotateHologram(audio);
          } else {
            VernacularHologramSystem.cycleTemplate(audio);
          }
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('slash');
        }
        return;
      }

      let hasAttackedEntity = false;

      // Check if attacking an entity
      if (targetedEntityId && inputManager.consumeAction('Attack')) {
        const targetEntity = entities.entities.get(targetedEntityId);
        // If NPC, talk instead of attack
        if (targetEntity && targetEntity.state.type === 'npc' && targetEntity.state.dialogue && targetEntity.state.dialogue.length > 0) {
          this.runtime.openModal('dialogue', targetEntity.state);
          return;
        }

        hasAttackedEntity = this.runtime.combatSystem.handleMeleeAttack(targetedEntityId);
      }

      // If holding a weapon and clicking Attack on air or non-entity target, perform air swing combo
      const isWeapon =
        activeItem &&
        (activeItem.itemId.includes('sword') ||
          activeItem.itemId.includes('keris') ||
          activeItem.itemId.includes('spear') ||
          activeItem.itemId.includes('dagger') ||
          activeItem.itemId.includes('axe') ||
          ITEM_DEFS[activeItem.itemId]?.category === 'weapon');

      if (!hasAttackedEntity && !hit && inputManager.consumeAction('Attack')) {
        this.runtime.combatSystem.handleAirSwing();
        return;
      }

      if (!hasAttackedEntity && isWeapon && inputManager.consumeAction('Attack')) {
        this.runtime.combatSystem.handleAirSwing();
        return;
      }

      // If didn't attack an entity or swing weapon, and we are targeting a block, perform progressive mining
      if (!hasAttackedEntity && hit) {
        const breakCalc = MiningEngine.calculateBreakTime(hit.blockType, activeItem, gameMode);
        if (!breakCalc.canBreak) {
          this.miningState.active = false;
          this.miningState.progress = 0;
          this.miningState.targetPosKey = '';
        } else {
          const hitKey = `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]}`;
          if (this.miningState.targetPosKey !== hitKey) {
            this.miningState.targetPosKey = hitKey;
            this.miningState.progress = 0;
            this.miningState.breakTime = breakCalc.breakTime;
          }

          this.miningState.active = true;
          const progBonuses = CharacterProgressionManager.getComputedBonuses();
          const speedMult = progBonuses.miningSpeedMultiplier;
          this.miningState.progress += (deltaTime * speedMult) / Math.max(0.05, this.miningState.breakTime);
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('mine');

          if (Math.random() < 0.12) {
            audio.playBlockHit(BLOCK_DEFS[hit.blockType]?.soundType || 'stone');
          }

          // Break Completion
          if (this.miningState.progress >= 1.0) {
            const drops = MiningEngine.getBlockDrops(hit.blockType, activeItem, gameMode, hit.blockPos);
            if (gameMode !== 'creative' && drops.length > 0 && !InventoryManager.canFitItems(this.runtime.inventory, drops)) {
              NotificationManager.push({
                title: 'Inventori Penuh',
                message: 'Kosongkan ruang inventori sebelum menambang blok ini.',
                priority: 'HIGH',
                colorTheme: 'amber',
                durationMs: 2500,
              });
              this.miningState.active = false;
              this.miningState.progress = 0;
              this.miningState.targetPosKey = '';
              return;
            }

            particles.spawnBlockBreakParticles(
              new THREE.Vector3(hit.blockPos[0] + 0.5, hit.blockPos[1] + 0.5, hit.blockPos[2] + 0.5),
              hit.blockType
            );
            world.setBlock(hit.blockPos[0], hit.blockPos[1], hit.blockPos[2], BlockType.AIR);
            AetherNetworkManager.getInstance().onBlockRemoved(hit.blockPos);
            NetworkSession.getInstance().sendBlockChange(hit.blockPos[0], hit.blockPos[1], hit.blockPos[2], hit.blockType, BlockType.AIR);
            GameEventBus.emit('BLOCK_MINED', { blockType: hit.blockType, pos: hit.blockPos });
            BlockPlacementEngine.handleBlockDestruction(hit.blockPos, hit.blockType, world);
            audio.playBlockBreak();
            if (stats) stats.addXP(2);

            // Add drops to inventory
            if (gameMode !== 'creative') {
              const extraChance = Math.max(0, progBonuses.harvestYieldMultiplier - 1.0);
              drops.forEach(drop => {
                const bonusCount = extraChance > 0 && Math.random() < extraChance ? 1 : 0;
                this.runtime.addItemToInventory(drop.itemId, drop.count + bonusCount);
              });

              // Consume tool durability
              if (activeItem) {
                const durResult = MiningEngine.consumeDurability(activeItem, 'mine');
                if (durResult.broken) {
                  audio.playDamage();
                  this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, null);
                } else {
                  this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, durResult.item);
                }
              }
            }

            this.miningState.active = false;
            this.miningState.progress = 0;
            this.miningState.targetPosKey = '';
          }
        }
      }
    } else {
      this.miningState.active = false;
      this.miningState.progress = 0;
    }

    // 3. Secondary Action (Right Click / Use): Layered Contextual Interaction
    // Works both when targeting entities/blocks AND when looking at open sky/water!
    const isUsingBowOrShield =
      activeItem &&
      (activeItem.itemId.includes('bow') ||
        activeItem.itemId.includes('shield') ||
        activeItem.itemId.includes('aegis'));

    if (!isUsingBowOrShield && inputManager.consumeAction('Use')) {
      const itemDef = activeItem ? ITEM_DEFS[activeItem.itemId] : null;

      // =====================================================================
      // LAYER 0: ASTROLABE, 3D HOLOGRAM BUILDER, PRASASTI TREASURE & VESSELS
      // =====================================================================
      if (activeItem && activeItem.itemId === 'lontar_arsitek_nusantara') {
        const built = VernacularHologramSystem.constructActiveHologram(world, audio, particles);
        if (built) {
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('place');
          if (stats) stats.addXP(45);
        }
        return;
      }

      if (activeItem && activeItem.itemId === 'prasasti_harta_nusantara') {
        const maps = TreasureMapSystem.getMaps();
        // Auto-decipher first undeciphered map if any
        for (const m of maps) {
          if (!m.isDeciphered) {
            TreasureMapSystem.decipherMap(m.id);
            break;
          }
        }
        const hint = TreasureMapSystem.getProximityHint(player.position);
        const digX = Math.floor(player.position.x + forwardDir.x * 3.0);
        const digZ = Math.floor(player.position.z + forwardDir.z * 3.0);
        const digY = world.getSpawnHeight(digX, digZ);

        if (hint && hint.distance > 28) {
          audio.playGamelanSaron(3);
          NotificationManager.push({
            title: `🧭 Kompas Prasasti: ${hint.mapName}`,
            message: `Arah: ${hint.bearing} · Jarak: ${Math.round(hint.distance)}m (${hint.heat}) · Klik Kanan lagi saat dekat untuk menggali!`,
            priority: 'HIGH',
            colorTheme: hint.heat === 'HOT' ? 'amber' : 'sky',
            durationMs: 3800,
          });
        } else {
          // Excavate buried Nusantara Treasure Cache right at dig site!
          world.setBlock(digX, digY, digZ, BlockType.CHEST);
          BlockPlacementEngine.initializeEmptyContainer([digX, digY, digZ]);
          this.runtime.addItemToInventory('coastal_pearl', 2);
          this.runtime.addItemToInventory('starfall_ore', 3);
          this.runtime.addItemToInventory('jamu_beras_kencur', 2);
          if (stats) stats.addXP(150);
          audio.playAncientGong();
          particles.emitBlockBreak(new THREE.Vector3(digX + 0.5, digY + 0.8, digZ + 0.5), '#fbbf24', 'crystal');
          NotificationManager.push({
            title: '🏆 Peti Harta Prasasti Kuno Ditemukan!',
            message: 'Anda berhasil menggali Peti Pusaka berisi 2x Mutiara Laut Selatan, 3x Bijih Starfall & Jamu Kebugaran (+150 XP)!',
            priority: 'CRITICAL',
            colorTheme: 'amber',
            durationMs: 4500,
          });
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'astrolabe_nusantara') {
        CataclysmVisualEngine.triggerNextCataclysmViaAstrolabe(
          world,
          player.position,
          forwardDir,
          audio,
          sky
        );
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      // =====================================================================
      // VOXELVERSE v4.5: GARUDA KENCANA 3D MOUNT, DRAGON KITE GLIDER,
      // VILLAGE SIEGE KENTONGAN & SKY LANTERN FESTIVAL
      // =====================================================================
      if (activeItem && activeItem.itemId === 'peluit_garuda_kencana') {
        if (AerialFlightAndSiegeSystem.mode === 'garuda') {
          AerialFlightAndSiegeSystem.dismount(audio);
        } else {
          AerialFlightAndSiegeSystem.summonAndMountGaruda(player.position, player.yaw, audio, particles);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'layang_naga_batik') {
        if (AerialFlightAndSiegeSystem.mode === 'glider') {
          AerialFlightAndSiegeSystem.dismount(audio);
        } else {
          AerialFlightAndSiegeSystem.deployDragonKiteGlider(player.position, player.yaw, audio, particles);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'kentongan_siaga_desa') {
        AerialFlightAndSiegeSystem.triggerVillageSiege(
          world,
          entities,
          player.position,
          audio,
          particles,
          (itemId, count) => this.runtime.addItemToInventory(itemId, count),
          (xp) => stats?.addXP(xp)
        );
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'lampion_terbang_nusantara') {
        AerialFlightAndSiegeSystem.releaseSkyLanterns(player.position, 6, audio, particles, stats);
        if (gameMode !== 'creative') {
          this.runtime.consumeItemFromInventory('lampion_terbang_nusantara', 1);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('place');
        return;
      }

      // =====================================================================
      // VOXELVERSE v4.6.0: CANDI BAWAH TANAH & BUTO IJO 3D, SILAT & AJIAN,
      // KINCIR AIR SUBAK 3D & PANGGUNG WAYANG KULIT BERKAH
      // =====================================================================
      if (activeItem && activeItem.itemId === 'kompas_candi_bawah_tanah') {
        NusantaraSanctumSilatSubakSystem.excavateUndergroundCandiSanctum(
          world,
          entities,
          player,
          audio,
          particles,
          stats,
          (itemId, count) => this.runtime.addItemToInventory(itemId, count)
        );
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'kitab_silat_nusantara') {
        if (NusantaraSanctumSilatSubakSystem.tenagaDalam >= 100) {
          NusantaraSanctumSilatSubakSystem.unleashAjianUltimate(
            entities,
            player,
            stats,
            audio,
            particles
          );
        } else {
          NusantaraSanctumSilatSubakSystem.cycleSilatStance(audio);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'kincir_air_subak') {
        NusantaraSanctumSilatSubakSystem.deploySubakWaterwheel(
          world,
          player,
          audio,
          particles
        );
        if (gameMode !== 'creative') {
          this.runtime.consumeItemFromInventory('kincir_air_subak', 1);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('place');
        return;
      }

      if (activeItem && activeItem.itemId === 'panggung_wayang_kulit') {
        NusantaraSanctumSilatSubakSystem.deployWayangStageAndNightMarket(
          world,
          player,
          audio,
          particles,
          stats
        );
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('place');
        return;
      }

      // =====================================================================
      // VOXELVERSE v4.8.0: MAHAKARYA NUSANTARA (SUBMARINE, LOCOMOTIVE & QUARRY,
      // 3D GAMELAN & ANGKLUNG, KHODAM & PENDEKAR ARENA, VOLCANIC WEATHER & PHOTO MODE)
      // =====================================================================
      if (activeItem && activeItem.itemId === 'kapal_selam_nanggala') {
        if (player.keys.crouch) {
          MahakaryaNusantaraSystem.buildUnderwaterOceanCandi(
            world,
            entities,
            player,
            audio,
            particles,
            stats,
            (itemId, count) => this.runtime.addItemToInventory(itemId, count)
          );
        } else {
          MahakaryaNusantaraSystem.toggleSubmarine(player, audio, particles);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('place');
        return;
      }

      if (activeItem && activeItem.itemId === 'lokomotif_uap_aether') {
        if (MahakaryaNusantaraSystem.locomotiveActive && !player.keys.crouch) {
          MahakaryaNusantaraSystem.toggleRideLocomotive(audio);
        } else {
          MahakaryaNusantaraSystem.deployLocomotiveAndQuarry(world, player, audio, particles);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('place');
        return;
      }

      if (activeItem && activeItem.itemId === 'gamelan_angklung_pusaka') {
        if (!MahakaryaNusantaraSystem.gamelanStageBuilt) {
          MahakaryaNusantaraSystem.deployGamelanStage(world, player, audio, particles);
        } else {
          const randNote = Math.floor(Math.random() * 7);
          MahakaryaNusantaraSystem.strikeGamelanNote(randNote, 'SARON', audio, stats);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'mustika_khodam_pendamping') {
        if (player.keys.crouch) {
          MahakaryaNusantaraSystem.startPendekarTournamentArena(
            world,
            entities,
            player,
            audio,
            particles
          );
        } else {
          MahakaryaNusantaraSystem.cycleKhodamCompanion(player, audio, particles);
        }
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'lontar_erupsi_vulkanik') {
        const nextWeather =
          MahakaryaNusantaraSystem.weatherEventId === 'VOLCANIC_ERUPTION'
            ? 'EQUATORIAL_THUNDERSTORM'
            : MahakaryaNusantaraSystem.weatherEventId === 'EQUATORIAL_THUNDERSTORM'
            ? 'MYSTIC_CALDERA_MIST'
            : 'VOLCANIC_ERUPTION';
        MahakaryaNusantaraSystem.triggerExtremeWeatherEvent(
          nextWeather,
          player,
          sky,
          weather,
          audio
        );
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('slash');
        return;
      }

      if (activeItem && activeItem.itemId === 'kamera_sinematik_nusantara') {
        MahakaryaNusantaraSystem.togglePhotoMode(player, this.runtime.camera, audio);
        player.triggerSwing();
        return;
      }

      // Check if player is currently piloting a vessel -> right-click triggers Trench Sonar
      if (MaritimeVesselSystem.activeVesselId) {
        const isHoldingConsumable =
          itemDef &&
          (itemDef.category === 'food' ||
            itemDef.category === 'potion' ||
            itemDef.category === 'consumable');
        if (!isHoldingConsumable) {
          MaritimeVesselSystem.triggerTrenchSonar(world, audio, particles);
          player.triggerSwing();
          return;
        }
      }

      // Check if player is aiming at an existing floating 3D vessel to board it
      const targetedVessel = MaritimeVesselSystem.getRaycastVesselHit(eyePos, forwardDir, 6.5);
      if (targetedVessel && !MaritimeVesselSystem.activeVesselId) {
        MaritimeVesselSystem.boardVessel(targetedVessel.id);
        player.yaw = targetedVessel.yaw;
        audio.playBlockPlace();
        player.triggerSwing();
        NotificationManager.push({
          title: `Berlayar: ${targetedVessel.name}`,
          message: 'Gunakan [W/A/S/D] untuk mengemudi · [Klik Kanan] Lentera Sonar · [Shift] Turun & Selam',
          priority: 'HIGH',
          colorTheme: 'sky',
          durationMs: 3800,
        });
        return;
      }

      // Launch Perahu Cadik or Kapal Phinisi onto water surface
      if (
        activeItem &&
        (activeItem.itemId === 'perahu_cadik' || activeItem.itemId === 'kapal_phinisi')
      ) {
        const waterTarget = this.findWaterCastTarget(eyePos, forwardDir);
        if (waterTarget) {
          const vesselType = activeItem.itemId === 'kapal_phinisi' ? 'kapal_phinisi' : 'perahu_cadik';
          const spawned = MaritimeVesselSystem.spawnVessel(vesselType, waterTarget, player.yaw);
          MaritimeVesselSystem.boardVessel(spawned.id);
          if (gameMode !== 'creative') {
            this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
          }
          audio.playBlockPlace();
          particles.spawnWaterSplash(new THREE.Vector3(waterTarget[0], waterTarget[1], waterTarget[2]));
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('place');
          NotificationManager.push({
            title: `${spawned.name} Diluncurkan!`,
            message: 'Layar terkembang! Gunakan [W/A/S/D] untuk berlayar, [Klik Kanan] untuk Sonar Palung, [Shift] untuk menyelam.',
            priority: 'HIGH',
            colorTheme: 'amber',
            durationMs: 4200,
          });
          return;
        } else {
          NotificationManager.push({
            title: 'Arahkan ke Perairan',
            message: 'Arahkan pandangan ke sungai atau laut untuk meluncurkan kapal ke atas air.',
            priority: 'NORMAL',
            colorTheme: 'sky',
            durationMs: 2400,
          });
          return;
        }
      }

      // =====================================================================
      // LAYER 1: ACTIVE FISHING ROD CAST / HOOK / REEL INTERACTION
      // =====================================================================
      if (activeItem && (activeItem.itemId === 'fishing_rod' || activeItem.itemId === 'aether_rod')) {
        const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
        const biomeCat =
          biome.name.toLowerCase().includes('ocean') || biome.name.toLowerCase().includes('beach')
            ? 'ocean'
            : biome.name.toLowerCase().includes('crystal')
            ? 'exotic'
            : 'forest';
        const isRaining =
          weather?.weather?.type?.includes('rain') || weather?.weather?.type?.includes('storm') || false;
        const normTime = sky ? (sky.timeOfDay % 24) / 24 : 0.5;

        if (FishingSystem.state === 'BITE' || FishingSystem.state === 'REELING') {
          const pullRes = FishingSystem.pullLine(biomeCat, isRaining, normTime);
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('slash');
          audio.playUIClick();

          if (FishingSystem.bobberPos) {
            particles.spawnWaterSplash(
              new THREE.Vector3(
                FishingSystem.bobberPos[0],
                FishingSystem.bobberPos[1],
                FishingSystem.bobberPos[2]
              )
            );
          }

          if (pullRes.status === 'LINE_SNAPPED') {
            audio.playDamage();
            NotificationManager.push({
              title: 'Senar Pancing Putus!',
              message: 'Ketegangan senar melampaui batas! Tarik secara berirama saat bar menurun.',
              priority: 'HIGH',
              colorTheme: 'amber',
              durationMs: 2800,
            });
          } else if (pullRes.status === 'SUCCESS' && pullRes.catch) {
            this.handleFishingCatchReward(pullRes.catch);
          }
          return;
        }

        if (FishingSystem.state === 'WAITING' || FishingSystem.state === 'CASTING') {
          FishingSystem.reset();
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('slash');
          audio.playUIClick();
          return;
        }

        if (FishingSystem.state === 'IDLE') {
          const waterTarget = this.findWaterCastTarget(eyePos, forwardDir);
          if (waterTarget) {
            // Check if player has bait in inventory
            let baitId: string | null = null;
            const hasAetherBait = this.runtime.inventory.some((s) => s?.itemId === 'aether_bait' && s.count > 0);
            const hasWormBait = this.runtime.inventory.some((s) => s?.itemId === 'earth_worm' && s.count > 0);
            if (hasAetherBait) {
              baitId = 'aether_bait';
              if (gameMode !== 'creative') this.runtime.consumeItemFromInventory('aether_bait', 1);
            } else if (hasWormBait) {
              baitId = 'earth_worm';
              if (gameMode !== 'creative') this.runtime.consumeItemFromInventory('earth_worm', 1);
            }

            const casted = FishingSystem.castLine(
              [player.position.x, player.position.y + 1.2, player.position.z],
              [forwardDir.x, forwardDir.y, forwardDir.z],
              activeItem.itemId === 'aether_rod',
              baitId,
              waterTarget
            );
            if (casted) {
              audio.playBlockPlace();
              player.triggerSwing();
              this.runtime.viewmodel?.triggerSwing('slash');
              particles.spawnWaterSplash(new THREE.Vector3(waterTarget[0], waterTarget[1], waterTarget[2]));
              return;
            }
          } else {
            NotificationManager.push({
              title: 'Arahkan ke Perairan',
              message: 'Arahkan pandangan ke sungai, danau, atau laut untuk melempar kail pancing.',
              priority: 'NORMAL',
              colorTheme: 'sky',
              durationMs: 2200,
            });
            return;
          }
        }
      }

      // =====================================================================
      // LAYER 2: ENTITY INTERACTION (NPC DIALOGUE, FEED/TAME CREATURE, MOUNT)
      // =====================================================================
      if (targetedEntityId) {
        const targetEntry = entities.entities.get(targetedEntityId);
        if (targetEntry) {
          const entState = targetEntry.state;

          // 2A. NPC Dialogue
          if (entState.type === 'npc' && entState.dialogue && entState.dialogue.length > 0) {
            this.runtime.openModal('dialogue', entState);
            return;
          }

          // 2B. Creature Feeding, Taming, Commands & Mounting
          const creatureDef = LivestockSystem.resolveCreatureDef(entState);
          if (creatureDef && entState.type !== 'boss' && !entState.isBoss) {
            // Check if player is holding acceptable food to feed/tame the creature
            if (activeItem && LivestockSystem.isAcceptableFood(creatureDef, activeItem.itemId)) {
              const feedRes = LivestockSystem.feedCreature(entState, activeItem.itemId);
              if (feedRes.success) {
                if (gameMode !== 'creative') {
                  this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
                }
                audio.playItemCollect();
                player.triggerSwing();
                this.runtime.viewmodel?.triggerSwing('place');
                particles.spawnTameParticles(
                  new THREE.Vector3(entState.position[0], entState.position[1] + 0.5, entState.position[2]),
                  feedRes.tamed
                );
                if (stats && feedRes.tamed) {
                  stats.addXP(25);
                }
                NotificationManager.push({
                  title: feedRes.tamed ? 'Satwa Berhasil Dijinakkan!' : 'Kepercayaan Satwa Meningkat',
                  message: feedRes.message,
                  priority: feedRes.tamed ? 'HIGH' : 'NORMAL',
                  colorTheme: 'emerald',
                  durationMs: 2800,
                });
                return;
              }
            }

            // If already tamed: Mount/Dismount OR Cycle Command (Follow / Stay / Guard)
            if (entState.isTamed) {
              const canMount = LivestockSystem.canMount(entState);
              if (canMount && !player.keys.crouch) {
                if (player.mountedEntityId === entState.id) {
                  player.dismountEntity();
                  NotificationManager.push({
                    title: 'Turun dari Tunggangan',
                    message: `Anda turun dari ${entState.name}.`,
                    priority: 'NORMAL',
                    colorTheme: 'sky',
                    durationMs: 2000,
                  });
                } else {
                  const bonuses = LivestockSystem.getMountBonuses(entState);
                  player.mountEntity(entState.id, entState.name, bonuses.speedBonus, bonuses.jumpBonus);
                  player.position.set(entState.position[0], entState.position[1] + 0.6, entState.position[2]);
                  audio.playItemCollect();
                  NotificationManager.push({
                    title: `Menunggangi ${entState.name}`,
                    message: `Kecepatan +${Math.round((bonuses.speedBonus - 1) * 100)}% · Tekan Jongkok [Shift] untuk turun.`,
                    priority: 'NORMAL',
                    colorTheme: 'emerald',
                    durationMs: 3000,
                  });
                }
                return;
              } else {
                const nextCmd = LivestockSystem.cycleCommand(entState);
                audio.playUIClick();
                player.triggerSwing();
                const cmdLabel =
                  nextCmd === 'FOLLOW'
                    ? 'Mengikuti (Follow)'
                    : nextCmd === 'STAY'
                    ? 'Berjaga di Tempat (Stay)'
                    : 'Patroli Area (Guard)';
                NotificationManager.push({
                  title: `Perintah ${entState.name}`,
                  message: `Status diubah ke: ${cmdLabel}`,
                  priority: 'NORMAL',
                  colorTheme: 'sky',
                  durationMs: 2200,
                });
                return;
              }
            }
          }
        }
      }

      // =====================================================================
      // LAYER 3: TARGETED BLOCK INTERACTION (HARVEST, WORKSTATIONS, FARMING, PLACE)
      // =====================================================================
      if (hit) {
        const hitBlock = hit.blockType;
        const [hx, hy, hz] = hit.blockPos;

        // Priority 1: Harvest Ripe Crops (with Harvest & Subak Particles)
        if (
          hitBlock === BlockType.CROP_WHEAT_3 ||
          hitBlock === BlockType.CROP_CARROT ||
          hitBlock === BlockType.CROP_HERB
        ) {
          const farmlandPos: [number, number, number] = [hx, hy - 1, hz];
          const harvestRes = FarmingManager.harvestCrop(
            farmlandPos,
            world,
            gameMode !== 'creative' ? this.runtime.inventory : undefined
          );
          if (harvestRes.inventoryFull) {
            NotificationManager.push({
              title: 'Inventori Penuh',
              message: 'Ruang inventori tidak cukup untuk memanen tanaman.',
              priority: 'HIGH',
              colorTheme: 'amber',
              durationMs: 2500,
            });
            return;
          }
          if (harvestRes.success && harvestRes.drops.length > 0) {
            harvestRes.drops.forEach((drop) => {
              this.runtime.addItemToInventory(drop.itemId, drop.count);
            });
            particles.spawnHarvestParticles(
              new THREE.Vector3(hx + 0.5, hy + 0.4, hz + 0.5),
              !!harvestRes.isSubakBonus
            );
            audio.playItemCollect();
            player.triggerSwing();
            this.runtime.viewmodel?.triggerSwing('place');
            if (stats) stats.addXP(harvestRes.isSubakBonus ? 8 : 4);
            if (harvestRes.isSubakBonus) {
              NotificationManager.push({
                title: 'Berkah Irigasi Subak!',
                message: 'Pengairan terasering menghasilkan panen pusaka tambahan!',
                priority: 'NORMAL',
                colorTheme: 'amber',
                durationMs: 2500,
              });
            }
            return;
          }
        }

        // Priority 1.5: Harvest Giant Pearl Clam on the Ocean Floor
        if (hitBlock === BlockType.PEARL_CLAM_BLOCK) {
          world.setBlock(hx, hy, hz, BlockType.WATER);
          this.runtime.addItemToInventory('coastal_pearl', 2);
          particles.spawnHarvestParticles(
            new THREE.Vector3(hx + 0.5, hy + 0.4, hz + 0.5),
            true
          );
          audio.playItemCollect();
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('place');
          if (stats) stats.addXP(18);
          NotificationManager.push({
            title: 'Mutiara Sakti Laut Selatan!',
            message: 'Memperoleh 2x Mutiara Sakti dari Kerang Mutiara Samudra (+18 XP)',
            priority: 'HIGH',
            colorTheme: 'amber',
            durationMs: 3200,
          });
          return;
        }

        // Priority 2: Workstation & Engineering Modals
        if (hitBlock === BlockType.CHEST || hitBlock === BlockType.RICE_STORAGE_CHEST) {
          this.runtime.openModal('chest', hit.blockPos);
          return;
        }

        if (hitBlock === BlockType.CRAFTING_BENCH) {
          this.runtime.openModal('crafting', hit.blockPos);
          return;
        }

        if (hitBlock === BlockType.FURNACE) {
          this.runtime.openModal('furnace', hit.blockPos);
          return;
        }

        if (hitBlock === BlockType.ANVIL_SMITHING) {
          this.runtime.openModal('anvil', hit.blockPos);
          return;
        }

        if (ENGINEERING_BLOCKS.has(hitBlock) || AetherNetworkManager.getInstance().getNode(hit.blockPos)) {
          this.runtime.openModal('engineering', hit.blockPos);
          return;
        }

        // Priority 2.5: Interactive Architectural Blocks (Doors & Trapdoors)
        if (BlockShapeResolver.isDoor(hitBlock)) {
          const curState = world.getBlockState(hx, hy, hz);
          const newOpen = !curState.open;
          world.setBlockState(hx, hy, hz, { open: newOpen });
          NetworkSession.getInstance().sendBlockChange(hx, hy, hz, hitBlock, hitBlock, { open: newOpen });

          const otherY = hitBlock === BlockType.DOOR_BOTTOM ? hy + 1 : hy - 1;
          const otherBlock = world.getBlock(hx, otherY, hz);
          if (BlockShapeResolver.isDoor(otherBlock)) {
            world.setBlockState(hx, otherY, hz, { open: newOpen });
            NetworkSession.getInstance().sendBlockChange(hx, otherY, hz, otherBlock, otherBlock, { open: newOpen });
          }

          audio.playUIClick();
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('place');
          return;
        }

        if (BlockShapeResolver.isTrapdoor(hitBlock)) {
          const curState = world.getBlockState(hx, hy, hz);
          const newOpen = !curState.open;
          world.setBlockState(hx, hy, hz, { open: newOpen });
          NetworkSession.getInstance().sendBlockChange(hx, hy, hz, hitBlock, hitBlock, { open: newOpen });

          audio.playUIClick();
          player.triggerSwing();
          this.runtime.viewmodel?.triggerSwing('place');
          return;
        }

        if (hitBlock === BlockType.AETHER_ALTAR_CORE) {
          audio.playAncientGong();
          particles.spawnBlockBreakParticles(
            new THREE.Vector3(hit.blockPos[0] + 0.5, hit.blockPos[1] + 0.8, hit.blockPos[2] + 0.5),
            BlockType.GLOWSTONE_CRYSTAL
          );

          const activeBoss = this.runtime.combatSystem?.activeBoss;
          if (!activeBoss) {
            const bossToSummon = (hx + hz) % 2 === 0 ? 'naga_antaboga' : 'batara_kala_colossus';
            const spawnPos: [number, number, number] = [hx, hy + 1, hz - 3];
            entities.spawnBoss(bossToSummon, spawnPos, world);
            player.applyScreenShake(0.65);

            NotificationManager.push({
              title: bossToSummon === 'naga_antaboga' ? 'SANG HYANG NAGA ANTABOGA BANGKIT' : 'BATARA KALA COLOSSUS BANGKIT',
              message: 'Altar Lingga Purba bergetar hebat! Penjaga abadi sanctum bawah tanah telah terbangun!',
              priority: 'CRITICAL',
              colorTheme: 'amber',
              durationMs: 4500,
            });
          } else {
            NotificationManager.push({
              title: 'Altar Lingga Beresonansi',
              message: 'Pertarungan suci melawan penjaga sanctum sedang berlangsung!',
              priority: 'HIGH',
              colorTheme: 'emerald',
              durationMs: 3000,
            });
          }

          player.triggerSwing();
          return;
        }

        if (
          hitBlock === BlockType.LEY_CONDUIT ||
          hitBlock === BlockType.AETHER_CORE ||
          hitBlock === BlockType.AETHER_CORE_ADVANCED ||
          hitBlock === BlockType.ANCIENT_RUNE_STONE ||
          hitBlock === BlockType.AETHER_GATE_FRAME
        ) {
          audio.playUIClick();
          particles.spawnBlockBreakParticles(
            new THREE.Vector3(hit.blockPos[0] + 0.5, hit.blockPos[1] + 0.5, hit.blockPos[2] + 0.5),
            BlockType.GLOWSTONE_CRYSTAL
          );
          GameEventBus.emit('MONOLITH_ACTIVATED', {
            monolithId: 'leyline_conduit',
            name: 'Aether Leyline Conduit',
            pos: hit.blockPos,
          });
          NotificationManager.push({
            title: 'Aether Leyline Aligned',
            message: 'Gema daya Aether Nusantara beresonansi sempurna!',
            priority: 'HIGH',
            colorTheme: 'emerald',
            durationMs: 3500,
          });
          player.triggerSwing();
          return;
        }

        // Priority 3: Agriculture with Held Item (Hoe, Seeds, Fertilizer)
        if (activeItem && itemDef) {
          // A. Hoe Tilling
          if (itemDef.toolType === 'hoe') {
            if (hitBlock === BlockType.GRASS || hitBlock === BlockType.DIRT) {
              const tilled = FarmingManager.tillSoil(hit.blockPos, world);
              if (tilled) {
                audio.playBlockPlace();
                player.triggerSwing();
                this.runtime.viewmodel?.triggerSwing('place');

                if (gameMode !== 'creative') {
                  const durResult = MiningEngine.consumeDurability(activeItem, 'mine');
                  if (durResult.broken) {
                    this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, null);
                  } else {
                    this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, durResult.item);
                  }
                }
                return;
              }
            }
          }

          // B. Crop Planting (including Nusantara Rice, Tuber & Spice Seeds)
          if (
            itemDef.category === 'seed' ||
            activeItem.itemId === 'seeds_wheat' ||
            activeItem.itemId === 'wild_carrot' ||
            activeItem.itemId === 'crop_herb' ||
            activeItem.itemId === 'beras_wangi' ||
            activeItem.itemId === 'subak_terrace_rice' ||
            activeItem.itemId === 'black_mountain_rice' ||
            activeItem.itemId === 'dryland_maize' ||
            activeItem.itemId === 'potato' ||
            activeItem.itemId === 'valley_sweet_potato'
          ) {
            if (hitBlock === BlockType.FARMLAND) {
              const planted = FarmingManager.plantSeed(hit.blockPos, activeItem.itemId, world);
              if (planted) {
                audio.playBlockPlace();
                player.triggerSwing();
                this.runtime.viewmodel?.triggerSwing('place');
                if (gameMode !== 'creative') {
                  this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
                }
                return;
              }
            }
          }

          // C. Fertilizer (Bone Meal / Monster Bone / Bio-Fertilizer)
          if (activeItem.itemId === 'monster_bone' || activeItem.itemId === 'fertilizer') {
            const targetFarmlandPos: [number, number, number] =
              hitBlock === BlockType.FARMLAND ? [hx, hy, hz] : [hx, hy - 1, hz];
            const fertilized = FarmingManager.applyFertilizer(targetFarmlandPos, world);
            if (fertilized) {
              particles.spawnHarvestParticles(
                new THREE.Vector3(targetFarmlandPos[0] + 0.5, targetFarmlandPos[1] + 1.2, targetFarmlandPos[2] + 0.5),
                false
              );
              audio.playItemCollect();
              player.triggerSwing();
              this.runtime.viewmodel?.triggerSwing('place');
              if (gameMode !== 'creative') {
                this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
              }
              return;
            }
          }

          // D. Block Placement via BlockPlacementEngine
          if (itemDef.blockType) {
            const placeEval = BlockPlacementEngine.evaluatePlacement(
              hit,
              itemDef.blockType,
              player.getAABB(),
              player.yaw,
              world,
              player.pitch
            );

            if (placeEval.allowed) {
              if (
                placeEval.blockTypeToPlace === BlockType.CHEST ||
                placeEval.blockTypeToPlace === BlockType.RICE_STORAGE_CHEST
              ) {
                BlockPlacementEngine.initializeEmptyContainer(placeEval.placePos);
              }
              world.setBlockWithState(
                placeEval.placePos[0],
                placeEval.placePos[1],
                placeEval.placePos[2],
                placeEval.blockTypeToPlace,
                placeEval.state
              );
              AetherNetworkManager.getInstance().onBlockPlaced(placeEval.placePos, placeEval.blockTypeToPlace);

              this.runtime.viewmodel?.triggerSwing('place');

              NetworkSession.getInstance().sendBlockChange(
                placeEval.placePos[0],
                placeEval.placePos[1],
                placeEval.placePos[2],
                BlockType.AIR,
                placeEval.blockTypeToPlace,
                placeEval.state,
                activeItem.itemId
              );

              GameEventBus.emit('BLOCK_PLACED', {
                blockType: placeEval.blockTypeToPlace,
                pos: placeEval.placePos,
                state: placeEval.state,
              });

              if (placeEval.extraBlocks) {
                placeEval.extraBlocks.forEach((extra) => {
                  world.setBlockWithState(extra.pos[0], extra.pos[1], extra.pos[2], extra.blockType, extra.state);
                  NetworkSession.getInstance().sendBlockChange(
                    extra.pos[0],
                    extra.pos[1],
                    extra.pos[2],
                    BlockType.AIR,
                    extra.blockType,
                    extra.state
                  );
                  GameEventBus.emit('BLOCK_PLACED', {
                    blockType: extra.blockType,
                    pos: extra.pos,
                    state: extra.state,
                  });
                });
              }

              audio.playBlockPlace();
              player.triggerSwing();

              if (gameMode !== 'creative') {
                this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
              }
              return;
            }
          }
        }
      }

      // =====================================================================
      // LAYER 4: CONSUMABLES (FOOD, DRINK, MEDICINE) - WORKS ANYWHERE IN AIR OR ON GROUND
      // =====================================================================
      if (
        activeItem &&
        itemDef &&
        (itemDef.category === 'food' ||
          itemDef.category === 'consumable' ||
          itemDef.category === 'potion' ||
          itemDef.foodValue ||
          itemDef.healValue)
      ) {
        if (stats) {
          const consumed = InventoryManager.consumeFoodOrDrink(
            this.runtime.inventory,
            this.runtime.activeHotbarIndex,
            stats
          );
          if (consumed.success) {
            audio.playItemCollect();
            player.triggerSwing();
            this.runtime.viewmodel?.triggerSwing('eat');
            this.runtime.emitInventoryUpdated();
            return;
          }
        }
      }
    }
  }

  public dispose(): void {
    this.miningState.active = false;
    this.currentHit = null;
    this.currentTargetedEntity = null;
    FishingSystem.reset();
  }
}

