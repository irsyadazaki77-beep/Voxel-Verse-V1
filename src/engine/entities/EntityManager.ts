// Entity Manager: AI State Machine, Spawning, Combat Physics, Loot Drops & Floating Numbers
import * as THREE from 'three';
import { EntityState, ItemStack, BossCombatState } from '../../types';
import { CraftingSystem } from '../items/CraftingSystem';
import { VoxelWorld } from '../world/VoxelWorld';
import { EntityModelBuilder } from './EntityModelBuilder';
import { EntityModelCache } from './EntityModelCache';
import { Pathfinder } from '../ai/Pathfinder';
import { GameEventBus } from '../events/GameEventBus';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../world/WorldConfig';

import { SETTLEMENT_REGISTRY, SettlementManager } from '../settlement/SettlementManager';
import { NPCScheduleManager, NPCRoleType } from '../settlement/NPCScheduleManager';
import { PoiseSystem } from '../combat/PoiseSystem';
import { CREATURE_REGISTRY } from './CreatureRegistry';
import { EcosystemManager } from './EcosystemManager';
import { CreatureAnimationEngine } from './CreatureAnimationEngine';
import { CreatureRig } from './CreatureRigTypes';

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
  private frameCount: number = 0;
  private spatialGrid: Map<string, Set<string>> = new Map();

  // Shared Geometries & Materials to avoid GC churn
  private static projectileGeometry: THREE.BufferGeometry | null = null;
  private static projectileMaterial: THREE.Material | null = null;
  private static groundItemGeometry: THREE.BufferGeometry | null = null;
  private projectilePool: THREE.Mesh[] = [];

  // Reusable Temporary Vectors to eliminate hot-loop GC churn
  private static readonly _tempVecA = new THREE.Vector3();
  private static readonly _tempVecB = new THREE.Vector3();
  private static readonly _tempDir = new THREE.Vector3();
  private static readonly _tempUp = new THREE.Vector3(0, 1, 0);

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
    const modelKey = state.modelType || state.type;
    const variant = state.variant ?? Math.floor(Math.random() * 3);
    state.variant = variant;
    const mesh = EntityModelBuilder.buildByModelType(modelKey, variant);

    if (state.isBaby || state.scale) {
      if (Array.isArray(state.scale)) {
        mesh.scale.set(state.scale[0], state.scale[1], state.scale[2]);
      } else {
        const s = typeof state.scale === 'number' ? state.scale : (state.isBaby ? 0.5 : 1.0);
        mesh.scale.set(s, s, s);
      }
    }

    mesh.position.set(...state.position);
    this.entityGroup.add(mesh);
    this.entities.set(state.id, { state, mesh });
    const cx = Math.floor(state.position[0] / CHUNK_SIZE_X);
    const cz = Math.floor(state.position[2] / CHUNK_SIZE_Z);
    const key = `${cx},${cz}`;
    if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
    this.spatialGrid.get(key)!.add(state.id);
  }

  public spawnSettlementPopulation(world: VoxelWorld, settlementId: string, centerPos: [number, number, number]): void {
    const roles: { role: NPCRoleType; name: string; offset: [number, number] }[] = [
      { role: 'elder', name: 'Tetua Adat & Sesepuh', offset: [0, 2] },
      { role: 'merchant', name: 'Saudagar Pasar Adat', offset: [6, -4] },
      { role: 'farmer', name: 'Petani Sawah & Subak', offset: [-10, 8] },
      { role: 'fisher', name: 'Nelayan Pesisir & Sungai', offset: [12, 10] },
      { role: 'craftsperson', name: 'Pengrajin & Empu Pande', offset: [-8, -8] },
      { role: 'guard', name: 'Prajurit Penjaga Gerbang', offset: [14, 0] },
      { role: 'engineer', name: 'Empu Saluran Irigasi', offset: [-12, 2] },
      { role: 'hunter', name: 'Pemburu Penjejak Rimba', offset: [4, 14] },
      { role: 'boat_trader', name: 'Saudagar Perahu Pinisi', offset: [16, 14] },
    ];

    roles.forEach((r, idx) => {
      const npcId = `${settlementId}_${r.role}_${idx}`;
      if (this.entities.has(npcId)) return;

      const sx = centerPos[0] + r.offset[0];
      const sz = centerPos[2] + r.offset[1];
      const sy = world.getSpawnHeight(sx, sz);

      const dialogueData = SettlementManager.getNPCDialogue(r.role, false, settlementId, 12);
      this.spawnEntity({
        id: npcId,
        type: 'npc',
        name: dialogueData.name || r.name,
        position: [sx, sy, sz],
        velocity: [0, 0, 0],
        rotation: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        damage: 0,
        speed: 1.4,
        aiState: 'idle',
        modelType: r.role,
        drops: [],
        dialogue: dialogueData.lines,
        tradeOffers: dialogueData.trades,
      });
    });
  }

  public spawnInitialPopulation(world: VoxelWorld, playerPos: THREE.Vector3): void {
    // Check if player spawned near any registered settlements
    const settlements = SETTLEMENT_REGISTRY;
    let spawnedSettlement = false;
    for (const [sId, sDef] of Object.entries(settlements)) {
      const dist = Math.hypot(playerPos.x - sDef.originPos[0], playerPos.z - sDef.originPos[2]);
      if (dist < 120) {
        this.spawnSettlementPopulation(world, sId, sDef.originPos);
        spawnedSettlement = true;
      }
    }

    // If no settlement nearby, spawn default Nomadic Merchant near player
    if (!spawnedSettlement) {
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
          'Salam sejahtera, pengembara! Selamat datang di kepulauan Nusantara.',
          'Waspadalah saat menjelajahi hutan lebat dan gua karst di waktu malam.',
          'Saya siap menukar rempah wangi dan komoditas langka dengan hasil tambangmu!',
        ],
        tradeOffers: [
          { give: { itemId: 'raw_copper', count: 5 }, receive: { itemId: 'beras_wangi', count: 4 } },
          { give: { itemId: 'raw_iron', count: 4 }, receive: { itemId: 'lantern', count: 1 } },
          { give: { itemId: 'cengkeh_spices', count: 2 }, receive: { itemId: 'kopi_arabika', count: 2 } },
        ],
      });
    }

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

    // Spawn Endemic Nusantara Fauna (Tameable with Cooked Meat / Wheat)
    const endemicSpawns: { id: string; defId: string; offset: [number, number] }[] = [
      { id: 'endemic_harimau_1', defId: 'harimau_sumatera', offset: [16, -14] },
      { id: 'endemic_komodo_1', defId: 'komodo_purba', offset: [-18, 15] },
      { id: 'endemic_cenderawasih_1', defId: 'cenderawasih_emas', offset: [12, 18] },
    ];
    for (const sp of endemicSpawns) {
      const def = CREATURE_REGISTRY[sp.defId];
      if (!def) continue;
      const ex = playerPos.x + sp.offset[0];
      const ez = playerPos.z + sp.offset[1];
      const ey = world.getSpawnHeight(ex, ez);
      this.spawnEntity({
        id: sp.id,
        type: 'passive',
        name: def.name,
        position: [ex, ey, ez],
        velocity: [0, 0, 0],
        rotation: Math.random() * Math.PI * 2,
        health: def.baseHealth,
        maxHealth: def.baseHealth,
        damage: def.baseDamage,
        speed: def.baseSpeed,
        aiState: 'wander',
        modelType: def.modelType,
        drops: def.drops,
      });
    }
  }

  private updateEntityAI(state: EntityState, ePos: THREE.Vector3, playerPos: THREE.Vector3, distToPlayer: number, world: VoxelWorld, isNight: boolean, timeOfDay: number = 12) {
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
    const homeX = (state as any).homePos[0];
    const homeY = (state as any).homePos[1];
    const homeZ = (state as any).homePos[2];
    const dxHome = ePos.x - homeX;
    const dzHome = ePos.z - homeZ;
    const distToHomeSq = dxHome * dxHome + dzHome * dzHome;

    // Hostile Entity AI State Machine
    if (state.type === 'hostile' || state.type === 'boss') {
      const isBoss = state.type === 'boss' || (state.modelType ? state.modelType.includes('boss') : false);
      const detectRange = isBoss ? 32 : (isNight ? 24 : 16);

      // Low health flee for non-bosses
      if (!isBoss && state.health < state.maxHealth * 0.22 && distToPlayer < 14) {
        state.aiState = 'flee';
        state.path = [];
        const fleeX = ePos.x - playerPos.x;
        const fleeZ = ePos.z - playerPos.z;
        const fleeLen = Math.hypot(fleeX, fleeZ) || 1;
        const normFleeX = fleeX / fleeLen;
        const normFleeZ = fleeZ / fleeLen;
        state.velocity[0] = normFleeX * (state.speed * 1.5);
        state.velocity[2] = normFleeZ * (state.speed * 1.5);
        state.rotation = Math.atan2(normFleeX, normFleeZ);
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
      const toPlayerX = playerPos.x - ePos.x;
      const toPlayerZ = playerPos.z - ePos.z;
      const toPlayerDist2D = Math.hypot(toPlayerX, toPlayerZ) || 1;
      const normPlayerX = toPlayerX / toPlayerDist2D;
      const normPlayerZ = toPlayerZ / toPlayerDist2D;

      if (distToPlayer <= state.attackRange) {
        state.aiState = 'attack';
        state.path = [];
        state.rotation = Math.atan2(normPlayerX, normPlayerZ);
      } else if (distToPlayer <= detectRange && distToHomeSq <= 900) { // Max 30m leash from home
        // Transition from Alert -> Chase
        if (state.aiState === 'idle' || state.aiState === 'wander' || state.aiState === 'roam') {
          state.aiState = 'alert';
          state.path = [];
          state.rotation = Math.atan2(normPlayerX, normPlayerZ);
        } else {
          state.aiState = 'chase';
          if (distToPlayer > 2.5) {
            const lastPf = (state as any).lastPathfindTime || 0;
            if (now - lastPf > 1000) { // Pathfind at most once per 1000ms
              (state as any).lastPathfindTime = now;
              const path = Pathfinder.findPath(world, ePos, playerPos, 24);
              if (path && path.length > 0) {
                state.path = path;
              } else {
                state.path = [];
                state.velocity[0] = normPlayerX * state.speed;
                state.velocity[2] = normPlayerZ * state.speed;
                state.rotation = Math.atan2(normPlayerX, normPlayerZ);
              }
            }
          }
        }
      } else if (distToHomeSq > 100) {
        // Target lost or exceeded leash radius. Transition to 'return' / 'retreat'
        state.aiState = 'return';
        // Regenerate health gradually while returning
        if (state.health < state.maxHealth) {
          state.health = Math.min(state.maxHealth, state.health + 0.1);
        }

        EntityManager._tempVecB.set(homeX, homeY, homeZ);
        const lastPf = (state as any).lastPathfindTime || 0;
        if (now - lastPf > 1500) { // Return home pathfind at most once per 1500ms
          (state as any).lastPathfindTime = now;
          const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 20);
          if (path && path.length > 0) {
            state.path = path;
          } else {
            const toHomeLen = Math.hypot(dxHome, dzHome) || 1;
            const normHomeX = -dxHome / toHomeLen;
            const normHomeZ = -dzHome / toHomeLen;
            state.velocity[0] = normHomeX * (state.speed * 0.8);
            state.velocity[2] = normHomeZ * (state.speed * 0.8);
            state.rotation = Math.atan2(normHomeX, normHomeZ);
          }
        }
      } else {
        // Idle / Roam leisurely in territory
        if (Math.random() < 0.15 && (!state.path || state.path.length === 0)) {
          state.aiState = Math.random() < 0.4 ? 'idle' : 'roam';
          if (state.aiState === 'roam') {
            const dx = (Math.random() - 0.5) * 12;
            const dz = (Math.random() - 0.5) * 12;
            EntityManager._tempVecB.set(homeX + dx, homeY, homeZ + dz);
            const lastPf = (state as any).lastPathfindTime || 0;
            if (now - lastPf > 3000) { // Roaming pathfind at most once per 3000ms
              (state as any).lastPathfindTime = now;
              const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 12);
              if (path) state.path = path;
            }
          }
        }
      }
    } 
    // Passive Wildlife & Tamed Companions (Deer, Stag, Boar, Livestock)
    else if (state.type === 'passive') {
      if (state.isTamed) {
        const cmd = state.command || 'FOLLOW';
        if (cmd === 'STAY') {
          state.aiState = 'idle';
          state.path = [];
          state.velocity[0] = 0;
          state.velocity[2] = 0;
          const toPlayerX = playerPos.x - ePos.x;
          const toPlayerZ = playerPos.z - ePos.z;
          state.rotation = Math.atan2(toPlayerX, toPlayerZ);
        } else if (cmd === 'FOLLOW') {
          if (distToPlayer > 3.2) {
            state.aiState = 'chase';
            const toPlayerX = playerPos.x - ePos.x;
            const toPlayerZ = playerPos.z - ePos.z;
            const len = Math.hypot(toPlayerX, toPlayerZ) || 1;
            const followSpeed = Math.max(state.speed * 1.35, 3.8);
            state.velocity[0] = (toPlayerX / len) * followSpeed;
            state.velocity[2] = (toPlayerZ / len) * followSpeed;
            state.rotation = Math.atan2(toPlayerX, toPlayerZ);
          } else {
            state.aiState = 'idle';
            state.velocity[0] *= 0.5;
            state.velocity[2] *= 0.5;
          }
        } else {
          // GUARD / ROAM around player or home
          if (Math.random() < 0.15 && (!state.path || state.path.length === 0)) {
            state.aiState = Math.random() < 0.5 ? 'idle' : 'roam';
            if (state.aiState === 'roam') {
              const dx = (Math.random() - 0.5) * 10;
              const dz = (Math.random() - 0.5) * 10;
              EntityManager._tempVecB.set(playerPos.x + dx, ePos.y, playerPos.z + dz);
              const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 10);
              if (path) state.path = path;
            }
          }
        }
      } else if ((state.health < state.maxHealth && distToPlayer < 20) || (distToPlayer < 4.2 && !(state.trustMeter && state.trustMeter > 0))) {
        state.aiState = 'flee';
        state.path = [];
        const fleeX = ePos.x - playerPos.x;
        const fleeZ = ePos.z - playerPos.z;
        const fleeLen = Math.hypot(fleeX, fleeZ) || 1;
        const normFleeX = fleeX / fleeLen;
        const normFleeZ = fleeZ / fleeLen;
        state.velocity[0] = normFleeX * (state.speed * 1.7);
        state.velocity[2] = normFleeZ * (state.speed * 1.7);
        state.rotation = Math.atan2(normFleeX, normFleeZ);
      } else if (distToPlayer < 10) {
        state.aiState = 'alert';
        state.path = [];
        const toPlayerX = playerPos.x - ePos.x;
        const toPlayerZ = playerPos.z - ePos.z;
        state.rotation = Math.atan2(toPlayerX, toPlayerZ);
      } else {
        if (Math.random() < 0.12 && (!state.path || state.path.length === 0)) {
          state.aiState = Math.random() < 0.5 ? 'idle' : 'roam';
          if (state.aiState === 'roam') {
            const dx = (Math.random() - 0.5) * 14;
            const dz = (Math.random() - 0.5) * 14;
            EntityManager._tempVecB.set(ePos.x + dx, ePos.y, ePos.z + dz);
            const lastPf = (state as any).lastPathfindTime || 0;
            if (now - lastPf > 3000) { // Passive roaming pathfind once per 3000ms
              (state as any).lastPathfindTime = now;
              const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 12);
              if (path) state.path = path;
            }
          }
        }
      }
    }
    // Friendly NPCs, Recruited Village Guards & Nusantara Living Settlement Schedules
    else if (state.type === 'npc') {
      if ((state as any).isRecruitedGuard) {
        const cmd = state.command || 'FOLLOW';
        // Scan for nearest hostile or boss within 15m using spatialGrid (3x3 chunk cells, zero-allocation)
        let nearestEnemyId: string | null = null;
        let nearestEnemyDistSq = 15 * 15;
        let enemyPos: [number, number, number] | null = null;

        const gcx = Math.floor(ePos.x / CHUNK_SIZE_X);
        const gcz = Math.floor(ePos.z / CHUNK_SIZE_Z);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oz = -1; oz <= 1; oz++) {
            const cell = this.spatialGrid.get(`${gcx + ox},${gcz + oz}`);
            if (!cell) continue;
            for (const otherId of cell) {
              if (otherId === state.id) continue;
              const entry = this.entities.get(otherId);
              if (!entry) continue;
              const oState = entry.state;
              if (
                oState.health > 0 &&
                (oState.type === 'hostile' || oState.type === 'boss' || oState.isBoss)
              ) {
                const edx = oState.position[0] - ePos.x;
                const edz = oState.position[2] - ePos.z;
                const dSq = edx * edx + edz * edz;
                if (dSq < nearestEnemyDistSq) {
                  nearestEnemyDistSq = dSq;
                  nearestEnemyId = otherId;
                  enemyPos = oState.position;
                }
              }
            }
          }
        }

        if (nearestEnemyId && enemyPos) {
          const edx = enemyPos[0] - ePos.x;
          const edz = enemyPos[2] - ePos.z;
          const eDist = Math.hypot(edx, edz) || 1;
          state.rotation = Math.atan2(edx, edz);

          if (eDist <= 2.8) {
            state.aiState = 'attack';
            state.velocity[0] = 0;
            state.velocity[2] = 0;
            if (now - (state.lastAttackTime || 0) > 1250) {
              state.lastAttackTime = now;
              this.attackEntity(nearestEnemyId, state.damage || 24, ePos, false, 0, 0.8, 18);
            }
          } else {
            state.aiState = 'chase';
            const spd = Math.max(state.speed || 3.8, 3.8);
            state.velocity[0] = (edx / eDist) * spd;
            state.velocity[2] = (edz / eDist) * spd;
          }
          return;
        }

        if (cmd === 'STAY') {
          state.aiState = 'idle';
          state.velocity[0] = 0;
          state.velocity[2] = 0;
          return;
        }

        if (distToPlayer > 3.4) {
          state.aiState = 'chase';
          const toPlayerX = playerPos.x - ePos.x;
          const toPlayerZ = playerPos.z - ePos.z;
          const len = Math.hypot(toPlayerX, toPlayerZ) || 1;
          const followSpd = Math.max(state.speed || 3.8, 3.8);
          state.velocity[0] = (toPlayerX / len) * followSpd;
          state.velocity[2] = (toPlayerZ / len) * followSpd;
          state.rotation = Math.atan2(toPlayerX, toPlayerZ);
        } else {
          state.aiState = 'idle';
          state.velocity[0] *= 0.4;
          state.velocity[2] *= 0.4;
        }
        return;
      }

      if (distToPlayer < 4.5) {
        state.aiState = 'idle';
        state.path = [];
        const toPlayerX = playerPos.x - ePos.x;
        const toPlayerZ = playerPos.z - ePos.z;
        state.rotation = Math.atan2(toPlayerX, toPlayerZ);
      } else {
        const role = (state.modelType || 'farmer') as NPCRoleType;
        const phase = NPCScheduleManager.getSchedulePhase(timeOfDay);
        const sched = NPCScheduleManager.getActiveSchedule(role, timeOfDay);
        (state as any).schedulePhase = phase;
        (state as any).scheduleActivity = sched.activityName;

        let targetX = homeX;
        let targetZ = homeZ;

        if (role === 'guard' && phase === 'night') {
          // 1. Night Watch Patrol Cycle for Guards
          const waypoints = NPCScheduleManager.getGuardPatrolWaypoints([homeX, homeY, homeZ]);
          const wpIdx = ((state as any).patrolWpIndex || 0) % waypoints.length;
          const currentWp = waypoints[wpIdx];
          targetX = currentWp[0];
          targetZ = currentWp[2];

          const dWpSq = (ePos.x - targetX) * (ePos.x - targetX) + (ePos.z - targetZ) * (ePos.z - targetZ);
          if (dWpSq < 2.5) {
            // Reached sentry post: linger briefly on watch then cycle to next gate
            const linger = ((state as any).wpLingerTimer || 0) + 0.05;
            (state as any).wpLingerTimer = linger;
            if (linger > 3.0) {
              (state as any).wpLingerTimer = 0;
              (state as any).patrolWpIndex = (wpIdx + 1) % waypoints.length;
            }
          }
        } else if (phase === 'evening' && role !== 'guard') {
          // 2. Evening Cultural Gathering at Pendopo / Gamelan
          const orderIdx = parseInt(state.id.replace(/\D/g, ''), 10) || 0;
          const gatherPos = NPCScheduleManager.getPendopoGatheringTarget(role, [homeX, homeY, homeZ], orderIdx);
          targetX = gatherPos[0];
          targetZ = gatherPos[2];
        } else if (phase === 'night' && role !== 'guard') {
          // 3. Resting safely in residential quarters
          targetX = homeX - 3.5;
          targetZ = homeZ - 3.5;
        } else {
          // 4. Standard Daytime & Morning Workplace Landmarks
          let ox = 0;
          let oz = 0;
          if (sched.targetLandmark === 'farm') { ox = -10; oz = 8; }
          else if (sched.targetLandmark === 'docks') { ox = 14; oz = 12; }
          else if (sched.targetLandmark === 'workshop') { ox = -8; oz = -8; }
          else if (sched.targetLandmark === 'market') { ox = 6; oz = -4; }
          else if (sched.targetLandmark === 'pendopo') { ox = 0; oz = 0; }
          else if (sched.targetLandmark === 'shrine') { ox = 0; oz = 10; }
          else if (sched.targetLandmark === 'gate') { ox = 14; oz = 0; }
          else if (sched.targetLandmark === 'engineering') { ox = -12; oz = 2; }
          targetX = homeX + ox;
          targetZ = homeZ + oz;
        }

        const dx = ePos.x - targetX;
        const dz = ePos.z - targetZ;
        const distSq = dx * dx + dz * dz;

        if (distSq > 9) {
          state.aiState = role === 'guard' && phase === 'night' ? 'patrol' : 'return';
          EntityManager._tempVecB.set(targetX, homeY, targetZ);
          const lastPf = (state as any).lastPathfindTime || 0;
          if (now - lastPf > 2200) {
            (state as any).lastPathfindTime = now;
            const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 18);
            if (path && path.length > 0) {
              state.path = path;
            } else {
              const len = Math.hypot(dx, dz) || 1;
              const spd = role === 'guard' ? state.speed * 0.9 : state.speed * 0.8;
              state.velocity[0] = (-dx / len) * spd;
              state.velocity[2] = (-dz / len) * spd;
              state.rotation = Math.atan2(-dx, -dz);
            }
          }
        } else {
          // Arrived at destination landmark
          if (phase === 'evening' && role !== 'guard') {
            state.aiState = 'idle';
            // Face inward toward the Pendopo center
            const toCenterX = homeX - ePos.x;
            const toCenterZ = homeZ - ePos.z;
            state.rotation = Math.atan2(toCenterX, toCenterZ);
            state.velocity[0] *= 0.2;
            state.velocity[2] *= 0.2;
          } else if (phase === 'night' && role !== 'guard') {
            state.aiState = 'sleep';
            state.velocity[0] = 0;
            state.velocity[2] = 0;
          } else {
            state.aiState = sched.animationState === 'work' ? 'wander' : 'idle';
            if (Math.random() < 0.1 && (!state.path || state.path.length === 0)) {
              const rx = (Math.random() - 0.5) * 4;
              const rz = (Math.random() - 0.5) * 4;
              EntityManager._tempVecB.set(targetX + rx, homeY, targetZ + rz);
              const path = Pathfinder.findPath(world, ePos, EntityManager._tempVecB, 6);
              if (path) state.path = path;
            }
          }
        }
      }
    }
  }

  // Update AI state machine, physics, and behaviors
  public update(deltaTime: number, world: VoxelWorld, playerPos: THREE.Vector3, isNight: boolean, damagePlayer?: (dmg: number, src: string) => void, timeOfDay: number = 12): void {
    const dt = Math.min(deltaTime, 0.1);
    this.spawnTimer += dt;
    this.frameCount = (this.frameCount + 1) & 0x7fffffff;
    
    if ((this.frameCount & 63) === 0) { // Every ~1 second without Math.random()
      Pathfinder.cleanCache();
    }
    const now = Date.now();

    // Ecosystem Manager 2.0 Tick Integration (Runs low-frequency 2s tick for world fauna & ecosystem equilibrium)
    EcosystemManager.update(
      dt,
      this.entities as any,
      [playerPos.x, playerPos.y, playerPos.z],
      isNight ? 0.9 : 0.5,
      false,
      false,
      (creatureId, pos) => {
        const def = CREATURE_REGISTRY[creatureId];
        if (!def) return;
        const spawnY = world.getSpawnHeight(pos[0], pos[2]);
        this.spawnEntity({
          id: `${creatureId}_${Date.now()}_${Math.floor(Math.random() * 100)}`,
          type: def.role === 'PREDATOR' ? 'hostile' : 'passive',
          name: def.name,
          position: [pos[0], spawnY, pos[2]],
          velocity: [0, 0, 0],
          rotation: Math.random() * Math.PI * 2,
          health: def.baseHealth,
          maxHealth: def.baseHealth,
          damage: def.baseDamage,
          speed: def.baseSpeed,
          aiState: 'wander',
          modelType: def.modelType,
          drops: def.drops,
          attackRange: def.baseDamage > 0 ? 2.5 : 0,
        });
      },
      (despawnId) => {
        const entry = this.entities.get(despawnId);
        if (entry) {
          this.entityGroup.remove(entry.mesh);
          this.entities.delete(despawnId);
        }
      }
    );

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
      
      const velSq = p.velocity.lengthSq();
      if (velSq > 0.1) {
        EntityManager._tempDir.copy(p.velocity).normalize();
        p.mesh.quaternion.setFromUnitVectors(EntityManager._tempUp, EntityManager._tempDir);
      }

      // Check collision with blocks
      const block = world.getBlock(Math.floor(p.position.x), Math.floor(p.position.y), Math.floor(p.position.z));
      if (block !== 0) {
        this.releaseProjectileMesh(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Entity Collision using Spatial Grid (3x3 chunk cells lookup, 0-allocation)
      if (p.fromPlayer) {
        let hit = false;
        const pcx = Math.floor(p.position.x / CHUNK_SIZE_X);
        const pcz = Math.floor(p.position.z / CHUNK_SIZE_Z);

        for (let ox = -1; ox <= 1 && !hit; ox++) {
          for (let oz = -1; oz <= 1 && !hit; oz++) {
            const cellKey = `${pcx + ox},${pcz + oz}`;
            const cell = this.spatialGrid.get(cellKey);
            if (!cell || cell.size === 0) continue;

            for (const id of cell) {
              const entry = this.entities.get(id);
              if (!entry || entry.state.aiState === 'dead') continue;
              const state = entry.state;
              const ex = state.position[0];
              const ey = state.position[1] + 1.0;
              const ez = state.position[2];

              const dx = p.position.x - ex;
              const dy = p.position.y - ey;
              const dz = p.position.z - ez;
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq < 1.96) { // 1.4m hit radius squared
                EntityManager._tempVecA.set(ex - p.velocity.x, ey - p.velocity.y, ez - p.velocity.z);
                this.attackEntity(id, p.damage, EntityManager._tempVecA);
                hit = true;
                break;
              }
            }
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
      const dxPlayer = state.position[0] - playerPos.x;
      const dzPlayer = state.position[2] - playerPos.z;
      const distToPlayerSq2D = dxPlayer * dxPlayer + dzPlayer * dzPlayer;
      
      // Entity Sleeping & Culling (> 64m => distSq > 4096)
      if (distToPlayerSq2D > 4096) {
        mesh.visible = false;
        continue; // Skip AI and physics for sleeping entities
      }
      mesh.visible = true;

      if (state.aiState === 'dead') continue;

      const distToPlayer = Math.sqrt(distToPlayerSq2D);

      // Distance-based update throttling (staggered AI updates)
      // Close (<16m): 100ms, Mid (16-36m): 400ms, Far (36-64m): 1400ms
      const updateInterval = distToPlayerSq2D < 256 ? 100 : (distToPlayerSq2D < 1296 ? 400 : 1400);
      const lastUpdate = state.pathUpdateCooldown || 0;

      if (now - lastUpdate > updateInterval) {
        state.pathUpdateCooldown = now;
        EntityManager._tempVecA.set(state.position[0], state.position[1], state.position[2]);
        this.updateEntityAI(state, EntityManager._tempVecA, playerPos, distToPlayer, world, isNight, timeOfDay);
      }

      const isNagaBoss = state.modelType === 'naga_antaboga' || state.modelType === 'naga_baruklinting';
      const isButoIjoBoss = state.modelType === 'buto_ijo_colossus';
      if (isNagaBoss) {
        const hpRatio = state.health / Math.max(1, state.maxHealth);
        // Phase 2 (65% - 30% HP): Aerial Hover & Magma Volley; Phase 3 (<30% HP): Crater Barrage
        state.attackRange = hpRatio <= 0.65 ? 15.0 : 5.5;
      } else if (isButoIjoBoss) {
        state.attackRange = 6.2;
      }

      if (state.aiState === 'attack' && (state.type === 'hostile' || state.type === 'boss' || state.isBoss)) {
         if (now - (state.lastAttackTime || 0) > (state.attackCooldown || 1500)) {
             state.lastAttackTime = now;
             if (mesh.userData.rig) {
               CreatureAnimationEngine.triggerAttack(mesh.userData.rig);
             }
             if (state.isBoss || state.type === 'boss' || state.modelType === 'batara_kala_colossus' || isNagaBoss || isButoIjoBoss) {
               const hpRatio = state.health / Math.max(1, state.maxHealth);
               GameEventBus.emit('BOSS_ATTACK_TELEGRAPH', {
                 bossId: id,
                 bossName: state.name,
                 position: [playerPos.x, Math.floor(playerPos.y), playerPos.z],
                 damage: state.damage,
                 radius: isNagaBoss ? (hpRatio <= 0.3 ? 6.5 : 4.8) : isButoIjoBoss ? (hpRatio <= 0.35 ? 6.4 : 5.2) : state.modelType === 'batara_kala_colossus' ? 5.8 : 4.2,
                 duration: hpRatio <= 0.3 ? 0.95 : 1.25,
               });
               // Phase 3 Naga Baruklinting or Buto Ijo calls down secondary shockwave rings around the player
               if ((isNagaBoss || isButoIjoBoss) && hpRatio <= 0.38) {
                 const angle = Math.random() * Math.PI * 2;
                 const ox = Math.cos(angle) * 5.0;
                 const oz = Math.sin(angle) * 5.0;
                 GameEventBus.emit('BOSS_ATTACK_TELEGRAPH', {
                   bossId: `${id}_crater`,
                   bossName: isButoIjoBoss ? 'Lindu Gada Buto Ijo' : 'Lontaran Kawah Baruklinting',
                   position: [playerPos.x + ox, Math.floor(playerPos.y), playerPos.z + oz],
                   damage: Math.round(state.damage * 0.85),
                   radius: 4.2,
                   duration: 1.15,
                 });
               }
             } else if (damagePlayer) {
                 damagePlayer(state.damage, state.name);
             }
         }
      }

      if (state.path && state.path.length > 0) {
        const targetX = state.path[0][0];
        const targetY = state.path[0][1];
        const targetZ = state.path[0][2];
        const toTargetX = targetX - state.position[0];
        const toTargetZ = targetZ - state.position[2];
        const distToTarget2D = Math.hypot(toTargetX, toTargetZ);

        if (distToTarget2D < 0.4) {
          state.path.shift();
        } else {
          const invDist = distToTarget2D > 0 ? 1 / distToTarget2D : 0;
          const dirX = toTargetX * invDist;
          const dirZ = toTargetZ * invDist;

          if (targetY > state.position[1] + 0.5 && state.velocity[1] === 0) {
              state.velocity[1] = 6.5; // Jump
          }
          state.velocity[0] = dirX * state.speed;
          state.velocity[2] = dirZ * state.speed;
          state.rotation = Math.atan2(dirX, dirZ);
        }
      } else if (state.aiState !== 'flee' && state.aiState !== 'chase') {
        state.velocity[0] *= 0.8;
        state.velocity[2] *= 0.8;
      }

      // Check if stationary at distance to skip expensive voxel raycasts
      const isStationaryAtDistance = distToPlayerSq2D > 1024 &&
        Math.abs(state.velocity[0]) < 0.05 &&
        Math.abs(state.velocity[2]) < 0.05 &&
        state.velocity[1] === 0;

      // Check if entity is in an unloaded chunk -> defer update (sleep entity)
      const entityCX = Math.floor(state.position[0] / CHUNK_SIZE_X);
      const entityCZ = Math.floor(state.position[2] / CHUNK_SIZE_Z);
      if (!world.getChunkLoaded(entityCX, entityCZ)) {
        continue;
      }

      if (!isStationaryAtDistance) {
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
      }

      // Update 3D Mesh (with Phase 2 Aerial Levitation for Naga Baruklinting / Antaboga)
      const oldCx = Math.floor(mesh.position.x / CHUNK_SIZE_X);
      const oldCz = Math.floor(mesh.position.z / CHUNK_SIZE_Z);
      
      let hoverOffset = 0;
      if (state.modelType === 'naga_antaboga' || state.modelType === 'naga_baruklinting') {
        const hpRatio = state.health / Math.max(1, state.maxHealth);
        if (hpRatio <= 0.65 && hpRatio > 0.28) {
          hoverOffset = 2.8 + Math.sin(now * 0.004) * 0.55;
        } else if (hpRatio <= 0.28) {
          hoverOffset = 1.4 + Math.sin(now * 0.008) * 0.45;
        }
      }
      mesh.position.set(state.position[0], state.position[1] + hoverOffset, state.position[2]);
      
      const newCx = Math.floor(state.position[0] / CHUNK_SIZE_X);
      const newCz = Math.floor(state.position[2] / CHUNK_SIZE_Z);
      if (oldCx !== newCx || oldCz !== newCz) {
        this.spatialGrid.get(`${oldCx},${oldCz}`)?.delete(id);
        const key = `${newCx},${newCz}`;
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
        this.spatialGrid.get(key)!.add(id);
      }
      mesh.rotation.y = state.rotation;

      // 3-Tier Distance & Shadow Culling
      // Tier 0 (< 22m => distSq < 484): Full 60Hz rig animation & shadow
      // Tier 1 (22m - 42m => distSq < 1764): 30Hz rig animation, no dynamic shadow casting on small entities
      // Tier 2 (> 42m => distSq >= 1764): 15Hz rig animation, simplified bobbing
      const rig = mesh.userData.rig as CreatureRig | undefined;
      if (rig) {
        if (distToPlayerSq2D < 484 || state.isBoss || state.type === 'boss') {
          CreatureAnimationEngine.update(dt, rig, state, distToPlayerSq2D, this.frameCount);
        } else if (distToPlayerSq2D < 1764) {
          if ((this.frameCount & 1) === 0) {
            CreatureAnimationEngine.update(dt * 2, rig, state, distToPlayerSq2D, this.frameCount);
          }
        } else if ((this.frameCount & 3) === 0) {
          CreatureAnimationEngine.update(dt * 4, rig, state, distToPlayerSq2D, this.frameCount);
        }
      } else {
        // Fallback bobbing if model has no rig
        const isMoving = Math.abs(state.velocity[0]) > 0.1 || Math.abs(state.velocity[2]) > 0.1;
        if (isMoving) {
          mesh.position.y += Math.abs(Math.sin(now * 0.01)) * 0.08;
        }
      }

      // Despawn distant entities (never despawn NPCs, bosses, or tamed companions)
      if (distToPlayerSq2D > 6400 && state.type !== 'npc' && !state.isTamed && !state.isBoss && state.type !== 'boss') { // 80m squared = 6400
        if (rig) {
          CreatureAnimationEngine.cleanup(rig);
        }
        this.entityGroup.remove(mesh);
        this.entities.delete(id);
        PoiseSystem.removeEntity(id);
        const cx = Math.floor(state.position[0] / CHUNK_SIZE_X);
        const cz = Math.floor(state.position[2] / CHUNK_SIZE_Z);
        this.spatialGrid.get(`${cx},${cz}`)?.delete(id);
      }
    }

    // Update Ground Items (Spin, Float, Player Attraction Magnet)
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gItem = this.groundItems[i];
      gItem.life += dt;
      gItem.mesh.rotation.y += dt * 2.0;
      gItem.mesh.position.y = gItem.position.y + Math.sin(gItem.life * 3) * 0.1;

      // Magnet toward player if within 2.5m (distSq < 6.25, zero-allocation)
      const gdx = playerPos.x - gItem.position.x;
      const gdy = playerPos.y - gItem.position.y;
      const gdz = playerPos.z - gItem.position.z;
      const gDistSq = gdx * gdx + gdy * gdy + gdz * gdz;

      if (gDistSq < 6.25 && gDistSq > 0.01) {
        const invDist = 1 / Math.sqrt(gDistSq);
        const pullFactor = dt * 8.0 * invDist;
        gItem.position.x += gdx * pullFactor;
        gItem.position.y += gdy * pullFactor;
        gItem.position.z += gdz * pullFactor;
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
    const isBoss =
      state.type === 'boss' ||
      state.isBoss ||
      state.modelType.includes('boss') ||
      state.modelType === 'void_sovereign' ||
      state.modelType === 'ruin_sentinel' ||
      state.modelType === 'batara_kala_colossus' ||
      state.modelType === 'naga_antaboga' ||
      state.modelType === 'hyang_batara_bhumi' ||
      state.modelType === 'candi_sentinel' ||
      state.modelType === 'raksasa_ulin';
    const poiseResult = PoiseSystem.applyPoiseDamage(entityId, poiseDamage, isBoss ? 160 : 55, isBoss);
    const isStaggered = !!poiseResult.staggered;
    if (isStaggered) {
      this.addFloatingText('STAGGERED!', new THREE.Vector3(...state.position).add(new THREE.Vector3(0, 2.2, 0)), '#f59e0b');
    }

    // Apply Knockback with stagger scaling
    const knockDir = EntityManager._tempDir.set(
      state.position[0] - knockbackOrigin.x,
      0,
      state.position[2] - knockbackOrigin.z
    ).normalize();
    const force = (isCritical ? 9.0 : 6.0) * knockbackScale;
    state.velocity[0] += knockDir.x * force;
    state.velocity[1] += isCritical ? 5.5 : 3.8;
    state.velocity[2] += knockDir.z * force;

    // Zero-allocation Visual 3.0 Hit Flash, Flinch & Stagger
    const hitRig = mesh.userData.rig as CreatureRig | undefined;
    if (hitRig) {
      CreatureAnimationEngine.triggerHit(hitRig, isCritical, isStaggered);
    }

    // Spawn Floating Damage Text (Golden for Crits, Crimson for Normal)
    const floatText = isCritical ? `CRIT! -${Math.round(damage)}` : `-${Math.round(damage)}`;
    const floatColor = isCritical ? '#fbbf24' : '#ff4444';
    this.addFloatingText(floatText, new THREE.Vector3(...state.position).add(new THREE.Vector3(0, 1.8, 0)), floatColor);

    const killed = state.health <= 0;
    if (killed) {
      const isBoss =
        state.type === 'boss' ||
        state.isBoss ||
        state.modelType.includes('boss') ||
        state.modelType === 'void_sovereign' ||
        state.modelType === 'ruin_sentinel' ||
        state.modelType === 'batara_kala_colossus' ||
        state.modelType === 'naga_antaboga' ||
        state.modelType === 'hyang_batara_bhumi' ||
        state.modelType === 'candi_sentinel' ||
        state.modelType === 'raksasa_ulin';
      
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
      const isBoss =
        state.type === 'boss' ||
        state.isBoss ||
        state.modelType.includes('boss') ||
        state.modelType === 'void_sovereign' ||
        state.modelType === 'ruin_sentinel' ||
        state.modelType === 'batara_kala_colossus' ||
        state.modelType === 'naga_antaboga' ||
        state.modelType === 'hyang_batara_bhumi' ||
        state.modelType === 'candi_sentinel' ||
        state.modelType === 'raksasa_ulin';
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
            phase: state.health < state.maxHealth * 0.25 ? 3 : state.health < state.maxHealth * 0.6 ? 2 : 1,
            maxPhases: 3,
            enraged: state.health < state.maxHealth * 0.25,
            position: state.position,
          };
        }
      }
    }
    return null;
  }

  public spawnBoss(
    type: 'ruin_sentinel' | 'boss_void_sovereign' | 'void_sovereign' | 'batara_kala_colossus' | 'naga_antaboga' | 'buto_ijo_colossus',
    position: [number, number, number],
    world: VoxelWorld
  ): string {
    const id = `boss_${type}_${Date.now()}`;
    const spawnY = position[1] < 55 ? position[1] : world.getSpawnHeight(position[0], position[2]);
    const actualPos: [number, number, number] = [position[0], spawnY, position[2]];

    if (type === 'buto_ijo_colossus') {
      this.spawnEntity({
        id,
        type: 'boss',
        isBoss: true,
        name: 'Raksasa Buto Ijo Penjaga Candi',
        position: actualPos,
        velocity: [0, 0, 0],
        rotation: 0,
        health: 1500,
        maxHealth: 1500,
        damage: 48,
        speed: 2.4,
        aiState: 'wander',
        modelType: 'buto_ijo_colossus',
        drops: [
          { itemId: 'gada_pusaka_buto_ijo', chance: 1.0, count: [1, 1] },
          { itemId: 'mustika_zamrud_khatulistiwa', chance: 1.0, count: [2, 3] },
          { itemId: 'kitab_silat_nusantara', chance: 0.9, count: [1, 1] },
          { itemId: 'aether_crystal', chance: 1.0, count: [14, 24] },
          { itemId: 'gold_ingot', chance: 1.0, count: [8, 14] },
        ],
      });
    } else if (type === 'naga_antaboga' || type === ('naga_baruklinting' as any)) {
      this.spawnEntity({
        id,
        type: 'boss',
        isBoss: true,
        name: 'Naga Lahar Baruklinting (Sang Hyang Antaboga)',
        position: actualPos,
        velocity: [0, 0, 0],
        rotation: 0,
        health: 1650,
        maxHealth: 1650,
        damage: 52,
        speed: 2.5,
        aiState: 'wander',
        modelType: 'naga_antaboga',
        drops: [
          { itemId: 'keris_naga_baruklinting', chance: 1.0, count: [1, 1] },
          { itemId: 'mustika_naga_pusaka', chance: 1.0, count: [1, 1] },
          { itemId: 'tombak_trisula_naga', chance: 0.85, count: [1, 1] },
          { itemId: 'sisik_emas_naga', chance: 1.0, count: [3, 6] },
          { itemId: 'aether_crystal', chance: 1.0, count: [14, 28] },
          { itemId: 'mythril_ingot', chance: 1.0, count: [8, 14] },
        ],
      });
    } else if (type === 'batara_kala_colossus') {
      this.spawnEntity({
        id,
        type: 'boss',
        isBoss: true,
        name: 'Batara Kala Underchamber Colossus',
        position: actualPos,
        velocity: [0, 0, 0],
        rotation: 0,
        health: 1200,
        maxHealth: 1200,
        damage: 42,
        speed: 2.2,
        aiState: 'wander',
        modelType: 'batara_kala_colossus',
        drops: [
          { itemId: 'mustika_naga_pusaka', chance: 1.0, count: [1, 1] },
          { itemId: 'cakra_surya_precursor', chance: 0.8, count: [1, 1] },
          { itemId: 'keris_kyai_sengkelat', chance: 0.5, count: [1, 1] },
          { itemId: 'aether_crystal', chance: 1.0, count: [12, 24] },
          { itemId: 'mythril_ingot', chance: 1.0, count: [6, 12] }
        ]
      });
    } else if (type === 'ruin_sentinel') {
      this.spawnEntity({
        id,
        type: 'boss',
        isBoss: true,
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
        isBoss: true,
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
      const ePos = EntityManager._tempVecA.set(state.position[0], state.position[1] + 0.9, state.position[2]);
      const toEntity = EntityManager._tempVecB.subVectors(ePos, origin);
      const proj = toEntity.dot(direction);

      if (proj > 0 && proj < maxDist) {
        const perp = EntityManager._tempDir.copy(direction).multiplyScalar(proj);
        perp.subVectors(toEntity, perp);
        if (perp.lengthSq() < 0.85 * 0.85 && proj < closestDist) {
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
          if (child.geometry && !EntityModelCache.isShared(child.geometry)) {
            child.geometry.dispose();
          }
          if (Array.isArray(child.material)) {
            child.material.forEach(m => {
              if (m && !EntityModelCache.isShared(m)) m.dispose();
            });
          } else if (child.material && !EntityModelCache.isShared(child.material)) {
            child.material.dispose();
          }
        }
      });
    }
    this.entities.clear();
    PoiseSystem.clear();

    for (const gItem of this.groundItems) {
      this.entityGroup.remove(gItem.mesh);
      if (gItem.mesh.material instanceof THREE.Material && !EntityModelCache.isShared(gItem.mesh.material)) {
        gItem.mesh.material.dispose();
      }
    }
    this.groundItems = [];

    for (const p of this.projectiles) {
      this.entityGroup.remove(p.mesh);
    }
    this.projectiles = [];

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

  public getActiveEntityCount(): number {
    return this.entities.size;
  }
}
