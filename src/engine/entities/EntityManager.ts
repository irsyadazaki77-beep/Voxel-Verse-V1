// Entity Manager: AI State Machine, Spawning, Combat Physics, Loot Drops & Floating Numbers
import * as THREE from 'three';
import { EntityState, ItemStack, BossCombatState } from '../../types';
import { CraftingSystem } from '../items/CraftingSystem';
import { VoxelWorld } from '../world/VoxelWorld';
import { EntityModelBuilder } from './EntityModelBuilder';
import { Pathfinder } from '../ai/Pathfinder';
import { GameEventBus } from '../events/GameEventBus';

import { SETTLEMENT_REGISTRY, SettlementManager } from '../settlement/SettlementManager';
import { PoiseSystem } from '../combat/PoiseSystem';

export interface FloatingText {
  id: string;
  text: string;
  position: THREE.Vector3;
  color: string;
  life: number; // 0 to 1
}

export interface GroundItem {
  id: string;
  item: ItemStack;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  life: number;
}

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  damage: number;
  fromPlayer: boolean;
  life: number;
}

export class EntityManager {
  public entities: Map<string, { state: EntityState; mesh: THREE.Group }> = new Map();
  public groundItems: GroundItem[] = [];
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingText[] = [];
  public entityGroup: THREE.Group;

  private spawnTimer: number = 0;
  private spatialGrid: Map<string, Set<string>> = new Map();

  // Shared Geometries & Materials to avoid GC churn
  private static projectileGeometry: THREE.BufferGeometry | null = null;
  private static projectileMaterial: THREE.Material | null = null;
  private static groundItemGeometry: THREE.BufferGeometry | null = null;
  private projectilePool: THREE.Mesh[] = [];

  constructor() {
    this.entityGroup = new THREE.Group();

    if (!EntityManager.projectileGeometry) {
      const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4);
      geo.rotateX(Math.PI / 2);
      EntityManager.projectileGeometry = geo;
      EntityManager.projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    }

    if (!EntityManager.groundItemGeometry) {
      EntityManager.groundItemGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    }
  }

  private acquireProjectileMesh(): THREE.Mesh {
    if (this.projectilePool.length > 0) {
      const mesh = this.projectilePool.pop()!;
      mesh.visible = true;
      return mesh;
    }
    return new THREE.Mesh(EntityManager.projectileGeometry!, EntityManager.projectileMaterial!);
  }

  private releaseProjectileMesh(mesh: THREE.Mesh): void {
    mesh.visible = false;
    this.entityGroup.remove(mesh);
    if (this.projectilePool.length < 30) {
      this.projectilePool.push(mesh);
    } else {
      mesh.geometry?.dispose();
    }
  }

  public spawnProjectile(pos: THREE.Vector3, vel: THREE.Vector3, damage: number, fromPlayer: boolean): void {
    const mesh = this.acquireProjectileMesh();
    mesh.position.copy(pos);
    this.entityGroup.add(mesh);
    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      position: pos.clone(),
      velocity: vel.clone(),
      mesh,
      damage,
      fromPlayer,
      life: 5.0
    });
  }

  public spawnEntity(state: EntityState): void {
    let mesh: THREE.Group;
    if (state.modelType === 'stag') {
      mesh = EntityModelBuilder.buildStag();
    } else if (state.modelType === 'stalker') {
      mesh = EntityModelBuilder.buildShadowStalker();
    } else if (state.modelType === 'void_spitter') {
      mesh = EntityModelBuilder.buildVoidSpitter();
    } else if (state.modelType === 'merchant') {
      mesh = EntityModelBuilder.buildNPC('merchant');
    } else if (state.modelType === 'ruin_sentinel') {
      mesh = EntityModelBuilder.buildRuinSentinel();
    } else if (state.modelType === 'boss_void_sovereign' || state.modelType === 'void_sovereign') {
      mesh = EntityModelBuilder.buildVoidSovereign();
    } else {
      mesh = EntityModelBuilder.buildNPC('elder');
    }

    mesh.position.set(...state.position);
    this.entityGroup.add(mesh);
    this.entities.set(state.id, { state, mesh });
    const cx = Math.floor(state.position[0] / 16);
    const cz = Math.floor(state.position[2] / 16);
    const key = `${cx},${cz}`;
    if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
    this.spatialGrid.get(key)!.add(state.id);
  }

  public spawnInitialPopulation(world: VoxelWorld, playerPos: THREE.Vector3): void {
    // Spawn Friendly Nomadic Merchant near player
    const spawnY = world.getSpawnHeight(playerPos.x + 8, playerPos.z + 8);
    this.spawnEntity({
      id: 'merchant_1',
      type: 'npc',
      name: 'Torvald the Nomadic Merchant',
      position: [playerPos.x + 8, spawnY, playerPos.z + 8],
      velocity: [0, 0, 0],
      rotation: 0,
      health: 100,
      maxHealth: 100,
      damage: 0,
      speed: 1.5,
      aiState: 'idle',
      modelType: 'merchant',
      drops: [],
      dialogue: [
        'Greetings traveler! The Aetherial ley lines are strong in this realm.',
        'Beware the deep caverns when night falls — the Shadow Stalkers wake.',
        'I am willing to barter bronze and ancient relics for raw ores!',
      ],
      tradeOffers: [
        { give: { itemId: 'raw_copper', count: 5 }, receive: { itemId: 'bread', count: 3 } },
        { give: { itemId: 'raw_iron', count: 4 }, receive: { itemId: 'lantern', count: 1 } },
        { give: { itemId: 'ancient_glyph', count: 1 }, receive: { itemId: 'golden_fruit', count: 1 } },
      ],
    });

    // Spawn Wild Stags in the meadows
    for (let i = 0; i < 4; i++) {
      const sx = playerPos.x + (Math.random() - 0.5) * 40;
      const sz = playerPos.z + (Math.random() - 0.5) * 40;
      const sy = world.getSpawnHeight(sx, sz);
      this.spawnEntity({
        id: `stag_${i}`,
        type: 'passive',
        name: 'Aurelion Crystal Stag',
        position: [sx, sy, sz],
        velocity: [0, 0, 0],
        rotation: Math.random() * Math.PI * 2,
        health: 30,
        maxHealth: 30,
        damage: 0,
        speed: 2.4,
        aiState: 'wander',
        modelType: 'stag',
        drops: [
          { itemId: 'cooked_meat', chance: 1.0, count: [1, 2] },
          { itemId: 'aether_crystal', chance: 0.35, count: [1, 1] },
        ],
      });
    }
  }

  private updateEntityAI(state: EntityState, ePos: THREE.Vector3, playerPos: THREE.Vector3, distToPlayer: number, world: VoxelWorld, isNight: boolean) {
    const now = Date.now();
    state.lastAttackTime = state.lastAttackTime || 0;
    state.attackCooldown = state.attackCooldown || 1400;
    state.attackRange = state.attackRange || 2.4;
    state.targetPos = state.targetPos || [ePos.x, ePos.y, ePos.z];

    // Check if entity is currently staggered by poise break
    if (PoiseSystem.isEntityStaggered(state.id)) {
      state.aiState = 'alert';
      state.velocity[0] *= 0.1;
      state.velocity[2] *= 0.1;
      state.path = [];
      return;
    }

    // Origin home position tracking
    if (!(state as any).homePos) {
      (state as any).homePos = [ePos.x, ePos.y, ePos.z];
    }
    const homePos = new THREE.Vector3(...(state as any).homePos);
    const distToHome = ePos.distanceTo(homePos);

    // Hostile Entity AI State Machine
    if (state.type === 'hostile' || state.type === 'boss') {
      const isBoss = state.type === 'boss' || state.modelType.includes('boss');
      const detectRange = isBoss ? 32 : (isNight ? 24 : 16);

      // Low health flee for non-bosses
      if (!isBoss && state.health < state.maxHealth * 0.22 && distToPlayer < 14) {
        state.aiState = 'flee';
        state.path = [];
        const fleeDir = new THREE.Vector3().subVectors(ePos, playerPos).normalize();
        state.velocity[0] = fleeDir.x * (state.speed * 1.5);
        state.velocity[2] = fleeDir.z * (state.speed * 1.5);
        state.rotation = Math.atan2(fleeDir.x, fleeDir.z);
        return;
      }

      // Daytime sleep / return to dark caves for nocturnal stalkers
      if (!isBoss && !isNight && state.modelType === 'stalker' && distToPlayer > 18) {
        state.aiState = 'sleep';
        state.velocity[0] = 0;
        state.velocity[2] = 0;
        return;
      }

      // Proximity Combat Logic
      if (distToPlayer <= state.attackRange) {
        state.aiState = 'attack';
        state.path = [];
        const dir = new THREE.Vector3().subVectors(playerPos, ePos).normalize();
        state.rotation = Math.atan2(dir.x, dir.z);
      } else if (distToPlayer <= detectRange) {
        // Transition from Alert -> Chase
        if (state.aiState === 'idle' || state.aiState === 'wander' || state.aiState === 'roam') {
          state.aiState = 'alert';
          state.path = [];
          const dir = new THREE.Vector3().subVectors(playerPos, ePos).normalize();
          state.rotation = Math.atan2(dir.x, dir.z);
        } else {
          state.aiState = 'chase';
          if (distToPlayer > 2.5) {
            const path = Pathfinder.findPath(world, ePos, playerPos, 24);
            if (path && path.length > 0) {
              state.path = path;
            } else {
              state.path = [];
              const dir = new THREE.Vector3().subVectors(playerPos, ePos).normalize();
              state.velocity[0] = dir.x * state.speed;
              state.velocity[2] = dir.z * state.speed;
              state.rotation = Math.atan2(dir.x, dir.z);
            }
          }
        }
      } else if (distToHome > 35) {
        // Too far from spawn origin, return home
        state.aiState = 'return';
        const path = Pathfinder.findPath(world, ePos, homePos, 20);
        if (path && path.length > 0) {
          state.path = path;
        } else {
          const dir = new THREE.Vector3().subVectors(homePos, ePos).normalize();
          state.velocity[0] = dir.x * (state.speed * 0.8);
          state.velocity[2] = dir.z * (state.speed * 0.8);
          state.rotation = Math.atan2(dir.x, dir.z);
        }
      } else {
        // Idle / Roam leisurely in territory
        if (Math.random() < 0.15 && (!state.path || state.path.length === 0)) {
          state.aiState = Math.random() < 0.4 ? 'idle' : 'roam';
          if (state.aiState === 'roam') {
            const dx = (Math.random() - 0.5) * 12;
            const dz = (Math.random() - 0.5) * 12;
            const roamTarget = new THREE.Vector3(homePos.x + dx, homePos.y, homePos.z + dz);
            const path = Pathfinder.findPath(world, ePos, roamTarget, 12);
            if (path) state.path = path;
          }
        }
      }
    } 
    // Passive Wildlife (Deer, Stag, Boar)
    else if (state.type === 'passive') {
      if ((state.health < state.maxHealth && distToPlayer < 20) || distToPlayer < 5) {
        state.aiState = 'flee';
        state.path = [];
        const fleeDir = new THREE.Vector3().subVectors(ePos, playerPos).normalize();
        state.velocity[0] = fleeDir.x * (state.speed * 1.7);
        state.velocity[2] = fleeDir.z * (state.speed * 1.7);
        state.rotation = Math.atan2(fleeDir.x, fleeDir.z);
      } else if (distToPlayer < 10) {
        state.aiState = 'alert';
        state.path = [];
        const dir = new THREE.Vector3().subVectors(playerPos, ePos).normalize();
        state.rotation = Math.atan2(dir.x, dir.z);
      } else {
        if (Math.random() < 0.12 && (!state.path || state.path.length === 0)) {
          state.aiState = Math.random() < 0.5 ? 'idle' : 'roam';
          if (state.aiState === 'roam') {
            const dx = (Math.random() - 0.5) * 14;
            const dz = (Math.random() - 0.5) * 14;
            const target = new THREE.Vector3(ePos.x + dx, ePos.y, ePos.z + dz);
            const path = Pathfinder.findPath(world, ePos, target, 12);
            if (path) state.path = path;
          }
        }
      }
    }
    // Friendly NPCs & Merchants
    else if (state.type === 'npc') {
      if (distToPlayer < 6) {
        state.aiState = 'idle';
        state.path = [];
        const dir = new THREE.Vector3().subVectors(playerPos, ePos).normalize();
        state.rotation = Math.atan2(dir.x, dir.z);
      } else if (distToHome > 8) {
        state.aiState = 'return';
        const path = Pathfinder.findPath(world, ePos, homePos, 10);
        if (path) state.path = path;
      }
    }
  }

  // Update AI state machine, physics, and behaviors
  public update(deltaTime: number, world: VoxelWorld, playerPos: THREE.Vector3, isNight: boolean, damagePlayer?: (dmg: number, src: string) => void): void {
    const dt = Math.min(deltaTime, 0.1);
    this.spawnTimer += dt;
    
    if (Math.random() < 0.05) { // Roughly every second
        Pathfinder.cleanCache();
    }
    const now = Date.now();

    // Periodic Nocturnal / Hostile Monster Spawning
    if (this.spawnTimer > 10 && this.entities.size < 16) {
      this.spawnTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 20;
      const mx = playerPos.x + Math.cos(angle) * dist;
      const mz = playerPos.z + Math.sin(angle) * dist;
      const my = world.getSpawnHeight(mx, mz);
      
      if (my >= 58) { // Only spawn on land
        if (isNight) {
          this.spawnEntity({
            id: `stalker_${Date.now()}_${Math.floor(Math.random() * 100)}`,
            type: 'hostile',
            name: 'Shadow Stalker',
            position: [mx, my, mz],
            velocity: [0, 0, 0],
            rotation: 0,
            health: 45,
            maxHealth: 45,
            damage: 14,
            speed: 4.2,
            aiState: 'wander',
            modelType: 'stalker',
            drops: [
              { itemId: 'coal', chance: 0.9, count: [1, 3] },
              { itemId: 'raw_iron', chance: 0.4, count: [1, 2] },
            ],
          });
        } else {
          this.spawnEntity({
            id: `stag_${Date.now()}`,
            type: 'passive',
            name: 'Aurelion Crystal Stag',
            position: [mx, my, mz],
            velocity: [0, 0, 0],
            rotation: 0,
            health: 30,
            maxHealth: 30,
            damage: 0,
            speed: 2.2,
            aiState: 'wander',
            modelType: 'stag',
            drops: [{ itemId: 'cooked_meat', chance: 1.0, count: [1, 2] }],
          });
        }
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.velocity.y -= 15.0 * dt; // Projectile gravity
      p.position.addScaledVector(p.velocity, dt);
      p.mesh.position.copy(p.position);
      
      if (p.velocity.lengthSq() > 0.1) {
        const dir = p.velocity.clone().normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }

      // Check collision with blocks
      const block = world.getBlock(Math.floor(p.position.x), Math.floor(p.position.y), Math.floor(p.position.z));
      if (block !== 0) {
        this.releaseProjectileMesh(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Entity Collision
      if (p.fromPlayer) {
        let hit = false;
        for (const [id, { state }] of this.entities.entries()) {
          const ePos = new THREE.Vector3(...state.position);
          if (p.position.distanceTo(ePos.add(new THREE.Vector3(0, 1, 0))) < 1.4) {
            this.attackEntity(id, p.damage, new THREE.Vector3().subVectors(ePos, p.velocity));
            hit = true;
            break;
          }
        }
        if (hit) {
          this.releaseProjectileMesh(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.life <= 0) {
        this.releaseProjectileMesh(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Update Entities
    for (const [id, { state, mesh }] of this.entities.entries()) {
      const distToPlayerRaw = Math.abs(state.position[0] - playerPos.x) + Math.abs(state.position[2] - playerPos.z);
      
      // Entity Sleeping & Culling (Frustum & Distance based)
      if (distToPlayerRaw > 64) {
        mesh.visible = false;
        continue; // Skip AI and physics for sleeping entities
      }
      mesh.visible = true;

      if (state.aiState === 'dead') continue;

      const ePos = new THREE.Vector3(...state.position);
      const distToPlayer = ePos.distanceTo(playerPos);

      // Distance-based update throttling (staggered updates)
      const updateInterval = distToPlayer < 20 ? 100 : (distToPlayer < 40 ? 500 : 2000);
      const lastUpdate = state.pathUpdateCooldown || 0;

      if (now - lastUpdate > updateInterval) {
        state.pathUpdateCooldown = now;
        this.updateEntityAI(state, ePos, playerPos, distToPlayer, world, isNight);
      }

      if (state.aiState === 'attack' && state.type === 'hostile') {
         if (now - (state.lastAttackTime || 0) > (state.attackCooldown || 1500)) {
             state.lastAttackTime = now;
             if (damagePlayer) {
                 damagePlayer(state.damage, state.name);
             }
         }
      }

      if (state.path && state.path.length > 0) {
        const target = new THREE.Vector3(...state.path[0]);
        const distToTarget2D = Math.hypot(ePos.x - target.x, ePos.z - target.z);
        if (distToTarget2D < 0.4) {
          state.path.shift();
        } else {
          const dir = new THREE.Vector3(target.x - ePos.x, 0, target.z - ePos.z).normalize();
          if (target.y > ePos.y + 0.5 && state.velocity[1] === 0) {
              state.velocity[1] = 6.5; // Jump
          }
          state.velocity[0] = dir.x * state.speed;
          state.velocity[2] = dir.z * state.speed;
          state.rotation = Math.atan2(dir.x, dir.z);
        }
      } else if (state.aiState !== 'flee' && state.aiState !== 'chase') {
        state.velocity[0] *= 0.8;
        state.velocity[2] *= 0.8;
      }

      // Apply Gravity & Movement
      state.velocity[1] -= 18.0 * dt; // Gravity
      state.position[0] += state.velocity[0] * dt;
      state.position[1] += state.velocity[1] * dt;
      state.position[2] += state.velocity[2] * dt;

      // Ground Snap Collision (Voxel Aware)
      const cx = Math.floor(state.position[0]);
      const cz = Math.floor(state.position[2]);
      const groundY = world.getSpawnHeight(cx, cz);
      
      if (state.position[1] <= groundY) {
        state.position[1] = groundY;
        if (state.velocity[1] < 0) state.velocity[1] = 0;
      }

      // Wall Collision X
      if (state.velocity[0] !== 0) {
          const blockX = world.getBlock(Math.floor(state.position[0] + Math.sign(state.velocity[0]) * 0.4), Math.floor(state.position[1] + 0.5), cz);
          if (blockX !== 0) {
              state.velocity[0] = 0;
          }
      }
      
      // Wall Collision Z
      if (state.velocity[2] !== 0) {
          const blockZ = world.getBlock(cx, Math.floor(state.position[1] + 0.5), Math.floor(state.position[2] + Math.sign(state.velocity[2]) * 0.4));
          if (blockZ !== 0) {
              state.velocity[2] = 0;
          }
      }

      // Update 3D Mesh
      const oldCx = Math.floor(ePos.x / 16);
      const oldCz = Math.floor(ePos.z / 16);
      
      mesh.position.set(state.position[0], state.position[1], state.position[2]);
      
      const newCx = Math.floor(state.position[0] / 16);
      const newCz = Math.floor(state.position[2] / 16);
      if (oldCx !== newCx || oldCz !== newCz) {
        this.spatialGrid.get(`${oldCx},${oldCz}`)?.delete(id);
        const key = `${newCx},${newCz}`;
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
        this.spatialGrid.get(key)!.add(id);
      }
      mesh.rotation.y = state.rotation;

      // Idle / walking bobbing
      const isMoving = Math.abs(state.velocity[0]) > 0.1 || Math.abs(state.velocity[2]) > 0.1;
      if (isMoving) {
        mesh.position.y += Math.abs(Math.sin(Date.now() * 0.01)) * 0.08;
      }

      // Despawn distant entities
      if (distToPlayer > 80 && state.type !== 'npc') {
        this.entityGroup.remove(mesh);
        this.entities.delete(id);
        PoiseSystem.removeEntity(id);
        const cx = Math.floor(state.position[0] / 16);
        const cz = Math.floor(state.position[2] / 16);
        this.spatialGrid.get(`${cx},${cz}`)?.delete(id);
      }
    }

    // Update Ground Items (Spin, Float, Player Attraction Magnet)
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gItem = this.groundItems[i];
      gItem.life += dt;
      gItem.mesh.rotation.y += dt * 2.0;
      gItem.mesh.position.y = gItem.position.y + Math.sin(gItem.life * 3) * 0.1;

      // Magnet toward player if within 2.5m
      const dist = gItem.position.distanceTo(playerPos);
      if (dist < 2.5) {
        const pull = new THREE.Vector3().subVectors(playerPos, gItem.position).normalize().multiplyScalar(dt * 8.0);
        gItem.position.add(pull);
        gItem.mesh.position.copy(gItem.position);
      }
    }

    // Update Floating Damage Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt * 1.5;
      ft.position.y += dt * 0.8;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Attack entity with weapon/tool and return damage dealt
  public attackEntity(
    entityId: string,
    damage: number,
    knockbackOrigin: THREE.Vector3,
    isCritical: boolean = false,
    comboIndex: number = 0,
    knockbackScale: number = 1.0,
    poiseDamage: number = 20
  ): { damageDealt: number; killed: boolean; entityName: string; isCritical: boolean } | null {
    const entry = this.entities.get(entityId);
    if (!entry) return null;

    const { state, mesh } = entry;
    state.health = Math.max(0, state.health - damage);

    // Apply Poise Damage and Check Stagger
    const isBoss = state.type === 'boss' || state.modelType.includes('boss') || state.modelType === 'void_sovereign' || state.modelType === 'ruin_sentinel';
    const staggered = PoiseSystem.applyPoiseDamage(entityId, poiseDamage, isBoss ? 160 : 55);
    if (staggered) {
      this.addFloatingText('STAGGERED!', new THREE.Vector3(...state.position).add(new THREE.Vector3(0, 2.2, 0)), '#f59e0b');
    }

    // Apply Knockback with stagger scaling
    const knockDir = new THREE.Vector3(state.position[0], 0, state.position[2])
      .sub(new THREE.Vector3(knockbackOrigin.x, 0, knockbackOrigin.z))
      .normalize();
    const force = (isCritical ? 9.0 : 6.0) * knockbackScale;
    state.velocity[0] += knockDir.x * force;
    state.velocity[1] += isCritical ? 5.5 : 3.8;
    state.velocity[2] += knockDir.z * force;

    // Flash Red or Gold Hit Feedback
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const oldCols = materials.map(m => (m && (m as THREE.MeshLambertMaterial).color) ? (m as THREE.MeshLambertMaterial).color.clone() : null);
        materials.forEach(m => {
          if (m && (m as THREE.MeshLambertMaterial).color) {
            (m as THREE.MeshLambertMaterial).color.setHex(isCritical ? 0xfacc15 : 0xff3333);
          }
        });
        setTimeout(() => {
          materials.forEach((m, idx) => {
            if (m && (m as THREE.MeshLambertMaterial).color && oldCols[idx]) {
              (m as THREE.MeshLambertMaterial).color.copy(oldCols[idx]!);
            }
          });
        }, isCritical ? 220 : 150);
      }
    });

    // Spawn Floating Damage Text (Golden for Crits, Crimson for Normal)
    const floatText = isCritical ? `CRIT! -${Math.round(damage)}` : `-${Math.round(damage)}`;
    const floatColor = isCritical ? '#fbbf24' : '#ff4444';
    this.addFloatingText(floatText, new THREE.Vector3(...state.position).add(new THREE.Vector3(0, 1.8, 0)), floatColor);

    const killed = state.health <= 0;
    if (killed) {
      const isBoss = state.type === 'boss' || state.modelType.includes('boss') || state.modelType === 'void_sovereign' || state.modelType === 'ruin_sentinel';
      
      // Emit to GameEventBus
      GameEventBus.emit('ENTITY_KILLED', {
        entityId: entityId,
        modelType: state.modelType,
        isBoss,
        pos: state.position,
      });

      if (isBoss) {
        GameEventBus.emit('BOSS_DEFEATED', {
          bossId: state.id,
          bossName: state.name,
          pos: state.position,
        });
      }

      // Spawn Drops
      state.drops.forEach(drop => {
        if (Math.random() <= drop.chance) {
          const count = drop.count[0] + Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1));
          this.spawnGroundItem(drop.itemId, count, new THREE.Vector3(...state.position));
        }
      });

      this.entityGroup.remove(mesh);
      this.entities.delete(entityId);
      PoiseSystem.removeEntity(entityId);
    }

    return { damageDealt: damage, killed, entityName: state.name, isCritical };
  }

  // Get active boss in combat engagement range of the player
  public getActiveBossState(playerPos: THREE.Vector3, maxDistance: number = 45): BossCombatState | null {
    for (const [id, entry] of this.entities.entries()) {
      const { state } = entry;
      const isBoss = state.type === 'boss' || state.modelType.includes('boss') || state.modelType === 'void_sovereign' || state.modelType === 'ruin_sentinel';
      if (isBoss) {
        const dist = Math.sqrt(
          (state.position[0] - playerPos.x) ** 2 +
          (state.position[1] - playerPos.y) ** 2 +
          (state.position[2] - playerPos.z) ** 2
        );
        if (dist <= maxDistance) {
          return {
            id,
            name: state.name,
            modelType: state.modelType,
            health: state.health,
            maxHealth: state.maxHealth,
            phase: state.health < state.maxHealth * 0.4 ? 2 : 1,
            maxPhases: 2,
            enraged: state.health < state.maxHealth * 0.3,
            position: state.position,
          };
        }
      }
    }
    return null;
  }

  public spawnBoss(type: 'ruin_sentinel' | 'boss_void_sovereign' | 'void_sovereign', position: [number, number, number], world: VoxelWorld): string {
    const id = `boss_${type}_${Date.now()}`;
    const spawnY = world.getSpawnHeight(position[0], position[2]);
    const actualPos: [number, number, number] = [position[0], spawnY, position[2]];

    if (type === 'ruin_sentinel') {
      this.spawnEntity({
        id,
        type: 'boss',
        name: 'Ancient Ruin Sentinel',
        position: actualPos,
        velocity: [0, 0, 0],
        rotation: 0,
        health: 280,
        maxHealth: 280,
        damage: 28,
        speed: 2.8,
        aiState: 'wander',
        modelType: 'ruin_sentinel',
        drops: [
          { itemId: 'heart_of_colossus', chance: 1.0, count: [1, 1] },
          { itemId: 'raw_iron', chance: 1.0, count: [6, 12] },
          { itemId: 'ancient_glyph', chance: 0.8, count: [2, 4] },
          { itemId: 'diamond', chance: 0.5, count: [1, 2] }
        ]
      });
    } else {
      this.spawnEntity({
        id,
        type: 'boss',
        name: 'The Void Sovereign',
        position: actualPos,
        velocity: [0, 0, 0],
        rotation: 0,
        health: 550,
        maxHealth: 550,
        damage: 38,
        speed: 3.5,
        aiState: 'wander',
        modelType: 'boss_void_sovereign',
        drops: [
          { itemId: 'void_eye', chance: 1.0, count: [1, 1] },
          { itemId: 'aether_crystal', chance: 1.0, count: [8, 16] },
          { itemId: 'diamond', chance: 1.0, count: [3, 6] },
          { itemId: 'obsidian_core', chance: 1.0, count: [1, 2] }
        ]
      });
    }

    GameEventBus.emit('BOSS_SPAWNED', { bossId: id, type, pos: actualPos });
    return id;
  }

  public spawnGroundItem(itemId: string, count: number, pos: THREE.Vector3): void {
    const geo = EntityManager.groundItemGeometry || new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const mat = new THREE.MeshLambertMaterial({ color: 0x59b3f2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.entityGroup.add(mesh);

    this.groundItems.push({
      id: `item_${Date.now()}_${Math.random()}`,
      item: { itemId, count },
      position: pos.clone(),
      mesh,
      life: 0,
    });
  }

  public collectNearbyItems(playerPos: THREE.Vector3, inventory: (ItemStack | null)[]): string[] {
    const collectedNames: string[] = [];

    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gItem = this.groundItems[i];
      if (gItem.position.distanceTo(playerPos) < 1.4) {
        const remaining = CraftingSystem.addItem(inventory, gItem.item.itemId, gItem.item.count);
        if (remaining < gItem.item.count) {
          collectedNames.push(gItem.item.itemId);
          this.entityGroup.remove(gItem.mesh);
          if (gItem.mesh.material instanceof THREE.Material) {
            gItem.mesh.material.dispose();
          }
          this.groundItems.splice(i, 1);
        }
      }
    }

    return collectedNames;
  }

  public checkItemPickup(playerPos: THREE.Vector3, radius: number = 1.8): { itemId: string; count: number }[] {
    const picked: { itemId: string; count: number }[] = [];
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gItem = this.groundItems[i];
      if (gItem.position.distanceTo(playerPos) <= radius) {
        picked.push({ itemId: gItem.item.itemId, count: gItem.item.count });
        GameEventBus.emit('ITEM_COLLECTED', { itemId: gItem.item.itemId, count: gItem.item.count });
        this.entityGroup.remove(gItem.mesh);
        if (gItem.mesh.material instanceof THREE.Material) {
          gItem.mesh.material.dispose();
        }
        this.groundItems.splice(i, 1);
      }
    }
    return picked;
  }

  public spawnSettlementNPCs(world: VoxelWorld): void {
    const settlements = SETTLEMENT_REGISTRY;
    let offsetIdx = 0;
    for (const sId of Object.keys(settlements)) {
      const s = settlements[sId];
      for (const npcId of s.npcIds) {
        const entityId = `npc_${s.id}_${npcId}`;
        const dialogueData = SettlementManager.getNPCDialogue(npcId, false, s.id);

        if (this.entities.has(entityId)) {
          const existing = this.entities.get(entityId)!;
          existing.state.dialogue = dialogueData.lines;
          existing.state.tradeOffers = dialogueData.trades;
          continue;
        }

        const sx = s.originPos[0] + (offsetIdx % 3) * 2 - 2;
        const sz = s.originPos[2] + Math.floor(offsetIdx / 3) * 2 - 2;
        const sy = world.getSpawnHeight(sx, sz);
        offsetIdx++;

        this.spawnEntity({
          id: entityId,
          type: 'npc',
          name: dialogueData.name,
          position: [sx, sy, sz],
          velocity: [0, 0, 0],
          rotation: 0,
          health: 100,
          maxHealth: 100,
          damage: 0,
          speed: 1.5,
          aiState: 'idle',
          modelType: dialogueData.role === 'merchant' ? 'merchant' : 'elder',
          drops: [],
          dialogue: dialogueData.lines,
          tradeOffers: dialogueData.trades,
        });
      }
    }
  }

  public addFloatingText(text: string, position: THREE.Vector3, color: string = '#ffffff'): void {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      position: position.clone(),
      color,
      life: 1.0,
    });
  }

  public getEntityRaycastHit(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number = 4.5): string | null {
    let closestId: string | null = null;
    let closestDist = maxDist;

    for (const [id, { state }] of this.entities.entries()) {
      const ePos = new THREE.Vector3(...state.position).add(new THREE.Vector3(0, 0.9, 0));
      const toEntity = new THREE.Vector3().subVectors(ePos, origin);
      const proj = toEntity.dot(direction);

      if (proj > 0 && proj < maxDist) {
        const perp = new THREE.Vector3().subVectors(toEntity, direction.clone().multiplyScalar(proj));
        if (perp.length() < 0.85 && proj < closestDist) {
          closestDist = proj;
          closestId = id;
        }
      }
    }

    return closestId;
  }

  public dispose(): void {
    for (const { mesh } of this.entities.values()) {
      this.entityGroup.remove(mesh);
      mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
    this.entities.clear();
    PoiseSystem.clear();

    for (const gItem of this.groundItems) {
      this.entityGroup.remove(gItem.mesh);
      if (gItem.mesh.material instanceof THREE.Material) {
        gItem.mesh.material.dispose();
      }
    }
    this.groundItems = [];

    for (const p of this.projectiles) {
      this.entityGroup.remove(p.mesh);
    }
    this.projectiles = [];

    for (const poolMesh of this.projectilePool) {
      poolMesh.geometry?.dispose();
      if (poolMesh.material instanceof THREE.Material) {
        poolMesh.material.dispose();
      }
    }
    this.projectilePool = [];

    if (EntityManager.projectileGeometry) {
      EntityManager.projectileGeometry.dispose();
      EntityManager.projectileGeometry = null;
    }
    if (EntityManager.groundItemGeometry) {
      EntityManager.groundItemGeometry.dispose();
      EntityManager.groundItemGeometry = null;
    }
  }
}
