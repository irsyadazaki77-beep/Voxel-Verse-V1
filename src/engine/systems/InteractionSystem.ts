import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { BlockType, RaycastHit, ItemStack } from '../../types';
import { MiningEngine } from '../world/MiningEngine';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FarmingManager } from '../world/FarmingManager';
import { InventoryManager } from '../items/InventoryManager';
import { CraftingSystem } from '../items/CraftingSystem';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { GameEventBus } from '../events/GameEventBus';
import { NetworkSession } from '../network/NetworkSession';
import { AetherNetworkManager } from '../engineering/AetherNetworkManager';

export interface MiningState {
  active: boolean;
  progress: number;
  breakTime: number;
  targetPosKey: string;
}

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
  private lastTargetPosKey: string = '';

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { player, world, entities, inputManager, audio, particles, stats, gameMode } = this.runtime;
    if (!player || !world) return;

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

    const targetedEntityId = entities.getEntityRaycastHit(eyePos, forwardDir, 4.5);
    const activeItem = this.runtime.getActiveHotbarItem();

    // 2. Primary Action: Attack Entity OR Mine Block (Hold to Mine)
    if (inputManager.isActionActive('Attack')) {
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
        if (hasAttackedEntity) {
          this.runtime.viewmodel?.triggerSwing('slash');
          this.runtime.cameraMotion?.triggerAttackRecoil(0.04);
        }
      }

      // If didn't attack an entity, and we are targeting a block, perform progressive mining
      if (!hasAttackedEntity && hit) {
        const hitKey = `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]}`;
        if (this.miningState.targetPosKey !== hitKey) {
          this.miningState.targetPosKey = hitKey;
          this.miningState.progress = 0;
          const breakCalc = MiningEngine.calculateBreakTime(hit.blockType, activeItem, gameMode);
          this.miningState.breakTime = breakCalc.breakTime;
        }

        this.miningState.active = true;
        this.miningState.progress += deltaTime / this.miningState.breakTime;
        player.triggerSwing();
        this.runtime.viewmodel?.triggerSwing('mine');

        if (Math.random() < 0.12) {
          audio.playBlockHit(BLOCK_DEFS[hit.blockType]?.soundType || 'stone');
        }

        // Break Completion
        if (this.miningState.progress >= 1.0) {
          const drops = MiningEngine.getBlockDrops(hit.blockType, activeItem, gameMode);
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
            drops.forEach(drop => {
              this.runtime.addItemToInventory(drop.itemId, drop.count);
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
    } else {
      this.miningState.active = false;
      this.miningState.progress = 0;
    }

    // 3. Secondary Action (Right Click / Use): Use / Place / Farm / Smelt / Workstation Interaction
    if (inputManager.consumeAction('Use') && hit && (!activeItem || activeItem.itemId !== 'hunting_bow')) {
      const hitBlock = hit.blockType;
      const [hx, hy, hz] = hit.blockPos;

      // Priority 1: Harvest Ripe Crops
      if (
        hitBlock === BlockType.CROP_WHEAT_3 ||
        hitBlock === BlockType.CROP_CARROT ||
        hitBlock === BlockType.CROP_HERB
      ) {
        const farmlandPos: [number, number, number] = [hx, hy - 1, hz];
        const harvestRes = FarmingManager.harvestCrop(farmlandPos, world);
        if (harvestRes.success && harvestRes.drops.length > 0) {
          harvestRes.drops.forEach(drop => {
            this.runtime.addItemToInventory(drop.itemId, drop.count);
          });
          audio.playItemCollect();
          player.triggerSwing();
          return;
        }
      }

      // Priority 2: Workstation Modals
      if (hitBlock === BlockType.CHEST) {
        this.runtime.openModal('chest', hit.blockPos);
        return;
      }

      if (hitBlock === BlockType.CRAFTING_BENCH) {
        this.runtime.openModal('crafting');
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

      // Priority 3: Agriculture with Held Item (Hoe, Seeds, Fertilizer)
      if (activeItem) {
        const itemDef = ITEM_DEFS[activeItem.itemId];

        // A. Hoe Tilling
        if (itemDef?.toolType === 'hoe') {
          if (hitBlock === BlockType.GRASS || hitBlock === BlockType.DIRT) {
            const tilled = FarmingManager.tillSoil(hit.blockPos, world);
            if (tilled) {
              audio.playBlockPlace();
              player.triggerSwing();

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

        // B. Crop Planting
        if (
          itemDef?.category === 'seed' ||
          activeItem.itemId === 'seeds_wheat' ||
          activeItem.itemId === 'wild_carrot' ||
          activeItem.itemId === 'crop_herb'
        ) {
          if (hitBlock === BlockType.FARMLAND) {
            const planted = FarmingManager.plantSeed(hit.blockPos, activeItem.itemId, world);
            if (planted) {
              audio.playBlockPlace();
              player.triggerSwing();
              if (gameMode !== 'creative') {
                this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
              }
              return;
            }
          }
        }

        // C. Fertilizer (Bone Meal / Monster Bone)
        if (activeItem.itemId === 'monster_bone') {
          const farmlandPos: [number, number, number] = [hx, hy - 1, hz];
          const fertilized = FarmingManager.applyFertilizer(farmlandPos, world);
          if (fertilized) {
            audio.playItemCollect();
            player.triggerSwing();
            if (gameMode !== 'creative') {
              this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
            }
            return;
          }
        }

        // Priority 4: Consumables (Food, Drink, Medicine)
        if (itemDef?.category === 'food' || itemDef?.category === 'potion' || itemDef?.foodValue) {
          if (stats) {
            const consumed = InventoryManager.consumeFoodOrDrink(
              this.runtime.inventory,
              this.runtime.activeHotbarIndex,
              stats
            );
            if (consumed) {
              audio.playUIClick();
              player.triggerSwing();
              this.runtime.viewmodel?.triggerSwing('eat');
              this.runtime.emitInventoryUpdated();
              return;
            }
          }
        }

        // Priority 5: Block Placement via BlockPlacementEngine
        if (itemDef?.blockType) {
          const placeEval = BlockPlacementEngine.evaluatePlacement(
            hit,
            itemDef.blockType,
            player.getAABB(),
            player.yaw,
            world
          );

          if (placeEval.allowed) {
            world.setBlock(
              placeEval.placePos[0],
              placeEval.placePos[1],
              placeEval.placePos[2],
              placeEval.blockTypeToPlace
            );
            AetherNetworkManager.getInstance().onBlockPlaced(placeEval.placePos, placeEval.blockTypeToPlace);

            this.runtime.viewmodel?.triggerSwing('place');

            NetworkSession.getInstance().sendBlockChange(
              placeEval.placePos[0],
              placeEval.placePos[1],
              placeEval.placePos[2],
              BlockType.AIR,
              placeEval.blockTypeToPlace
            );

            GameEventBus.emit('BLOCK_PLACED', {
              blockType: placeEval.blockTypeToPlace,
              pos: placeEval.placePos,
            });

            if (placeEval.extraBlocks) {
              placeEval.extraBlocks.forEach(extra => {
                world.setBlock(extra.pos[0], extra.pos[1], extra.pos[2], extra.blockType);
                NetworkSession.getInstance().sendBlockChange(extra.pos[0], extra.pos[1], extra.pos[2], BlockType.AIR, extra.blockType);
                GameEventBus.emit('BLOCK_PLACED', {
                  blockType: extra.blockType,
                  pos: extra.pos,
                });
              });
            }

            audio.playBlockPlace();
            player.triggerSwing();

            if (gameMode !== 'creative') {
              this.runtime.consumeItemFromInventory(activeItem.itemId, 1);
            }
          }
        }
      }
    }
  }

  public dispose(): void {
    this.miningState.active = false;
    this.currentHit = null;
  }
}
