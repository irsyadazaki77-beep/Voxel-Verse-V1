// Async, Staged, & Budgeted World Startup Pipeline
import { GameMode, WorldSaveData, GameSettings } from '../../types';
import { WorldPreset, SEA_LEVEL } from './WorldConfig';
import { SaveManager } from '../storage/SaveManager';
import { VoxelWorld } from './VoxelWorld';
import { GameRuntime } from '../core/GameRuntime';
import { SettingsManager } from '../ui/SettingsManager';
import { Logger } from '../ui/Logger';
import { SafeSpawnResolver } from './SafeSpawnResolver';

export type StartupStage =
  | 'validate'
  | 'resolve_spawn'
  | 'hydrate_state'
  | 'generate_spawn_area'
  | 'init_systems'
  | 'ready';

export interface StartupProgress {
  stage: StartupStage;
  stageName: string;
  progressPercent: number;
  elapsedMs: number;
  detail?: string;
}

export interface WorldStartupOptions {
  container: HTMLElement;
  worldId: string;
  worldName: string;
  seed: number;
  gameMode: GameMode;
  preset?: WorldPreset;
  settings?: GameSettings;
  existingSave?: WorldSaveData | null;
  stageTimeoutMs?: number;
  onProgress?: (progress: StartupProgress) => void;
  isCancelled?: () => boolean;
}

export interface StartupDiagnostics {
  totalDurationMs: number;
  stageDurations: Record<StartupStage, number>;
  spawnPosition: [number, number, number];
  generatedChunksCount: number;
  isWarmLoad: boolean;
  seed: number;
  worldId: string;
}

export interface StartupResult {
  runtime: GameRuntime;
  diagnostics: StartupDiagnostics;
}

export class WorldStartupPipeline {
  private static readonly DEFAULT_STAGE_TIMEOUT_MS = 6000;

  /**
   * Non-blocking frame yield to prevent main-thread freeze and allow React UI rendering.
   * Does not introduce arbitrary artificial sleep delays.
   */
  public static async yieldFrame(timeBudgetMs: number = 0): Promise<void> {
    if (typeof requestAnimationFrame !== 'undefined') {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (timeBudgetMs > 0) {
            setTimeout(resolve, timeBudgetMs);
          } else {
            resolve();
          }
        });
      });
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, timeBudgetMs || 0));
    }
  }

  /**
   * Executes the full staged startup pipeline with strict resource ownership and cancellation safety:
   * Validate Save -> Resolve Spawn -> Hydrate World State -> Generate Minimum Spawn Area -> Initialize Systems -> Ready
   */
  public static async run(options: WorldStartupOptions): Promise<StartupResult> {
    const pipelineStartTime = performance.now();
    const stageTimeout = options.stageTimeoutMs || this.DEFAULT_STAGE_TIMEOUT_MS;
    const stageDurations: Record<StartupStage, number> = {
      validate: 0,
      resolve_spawn: 0,
      hydrate_state: 0,
      generate_spawn_area: 0,
      init_systems: 0,
      ready: 0,
    };

    let existingSave = options.existingSave || null;
    let spawnPosition: [number, number, number] = [0.5, 80, 0.5];
    let generatedChunksCount = 0;
    const isWarmLoad = !!existingSave;

    let createdWorld: VoxelWorld | null = null;
    let createdRuntime: GameRuntime | null = null;

    const report = (stage: StartupStage, stageName: string, progressPercent: number, detail?: string) => {
      if (options.onProgress) {
        options.onProgress({
          stage,
          stageName,
          progressPercent,
          elapsedMs: performance.now() - pipelineStartTime,
          detail,
        });
      }
    };

    const isCancelled = () => !!(options.isCancelled && options.isCancelled());

    const checkCancelled = () => {
      if (isCancelled()) {
        throw new Error('World startup cancelled by user.');
      }
    };

    try {
      // ==========================================
      // STAGE 1: VALIDATE (0% - 15%)
      // ==========================================
      const stage1Start = performance.now();
      report('validate', 'Validating World & Save Data...', 5, `World: ${options.worldName}`);
      Logger.info('WorldStartupPipeline', `[Stage 1/6: Validate] Validating worldId "${options.worldId}", seed ${options.seed}...`);

      checkCancelled();
      if (!existingSave) {
        try {
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Save data load timeout')), stageTimeout)
          );
          existingSave = await Promise.race([
            SaveManager.loadWorldAsync(options.worldId),
            timeoutPromise,
          ]);
        } catch (saveErr) {
          if (isCancelled()) throw saveErr;
          Logger.warn('WorldStartupPipeline', `[Validate] Non-fatal save loading error, starting fresh:`, { error: saveErr });
          existingSave = null;
        }
      }

      checkCancelled();

      // Check save data integrity
      if (existingSave) {
        if (!existingSave.player || !Array.isArray(existingSave.player.position)) {
          Logger.warn('WorldStartupPipeline', `[Validate] Corrupt player position in save data, regenerating default player.`);
          existingSave.player = {
            position: [0.5, 80, 0.5],
            rotation: [0, 0],
            health: 100,
            hunger: 100,
            stamina: 100,
            level: 1,
            xp: 0,
            hotbarIndex: 0,
            inventory: [],
            equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
          };
        }
      }

      stageDurations.validate = performance.now() - stage1Start;
      report('validate', 'World Validated', 15);
      await this.yieldFrame();
      checkCancelled();

      // ==========================================
      // STAGE 2: RESOLVE SAFE SPAWN (15% - 30%)
      // ==========================================
      const stage2Start = performance.now();
      report('resolve_spawn', 'Resolving Safe Spawn Point...', 20);
      Logger.info('WorldStartupPipeline', `[Stage 2/6: Resolve Spawn] Calculating safe spawn position...`);

      const savedHealth = typeof existingSave?.player?.health === 'number' ? existingSave.player.health : 100;
      if (existingSave?.player?.position && existingSave.player.position[1] >= 5 && savedHealth > 0) {
        spawnPosition = existingSave.player.position;
        Logger.info('WorldStartupPipeline', `[Resolve Spawn] Restored player position from save: [${spawnPosition.map(n => n.toFixed(1)).join(', ')}]`);
      } else {
        // Pure lightweight terrain height calculation (zero VoxelWorld instantiation, no worker pool overhead)
        spawnPosition = SafeSpawnResolver.resolve(options.seed, options.preset || 'standard', 'overworld');
        Logger.info('WorldStartupPipeline', `[Resolve Spawn] Deterministically resolved safe spawn: [${spawnPosition.map(n => n.toFixed(1)).join(', ')}]`);
      }

      stageDurations.resolve_spawn = performance.now() - stage2Start;
      report('resolve_spawn', 'Safe Spawn Resolved', 30, `Spawn: [${spawnPosition[0].toFixed(0)}, ${spawnPosition[1].toFixed(0)}, ${spawnPosition[2].toFixed(0)}]`);
      await this.yieldFrame();
      checkCancelled();

      // ==========================================
      // STAGE 3: HYDRATE WORLD STATE (30% - 45%)
      // ==========================================
      const stage3Start = performance.now();
      report('hydrate_state', 'Hydrating World State...', 35);
      Logger.info('WorldStartupPipeline', `[Stage 3/6: Hydrate State] Instantiating primary VoxelWorld and hydrating modifications...`);

      createdWorld = new VoxelWorld(options.seed, options.preset || 'standard');

      if (existingSave) {
        // Hydrate modified blocks & states purely in memory WITHOUT generating chunks
        SaveManager.applySaveToWorld(createdWorld, existingSave);
      }

      stageDurations.hydrate_state = performance.now() - stage3Start;
      report('hydrate_state', 'World State Hydrated', 45);
      await this.yieldFrame();
      checkCancelled();

      // ==========================================
      // STAGE 4: GENERATE MINIMUM SPAWN AREA (45% - 80%)
      // ==========================================
      const stage4Start = performance.now();
      report('generate_spawn_area', 'Generating Minimum Spawn Area...', 50);
      Logger.info('WorldStartupPipeline', `[Stage 4/6: Generate Spawn Area] Pre-generating minimum playable area around [${spawnPosition[0].toFixed(1)}, ${spawnPosition[2].toFixed(1)}]...`);

      const spawnCX = Math.floor(spawnPosition[0] / 16);
      const spawnCZ = Math.floor(spawnPosition[2] / 16);

      // Step 4a: Generate & Mesh immediate center chunk synchronously using loaded-only query
      const centerChunk = createdWorld.generateChunk(spawnCX, spawnCZ);
      const centerKey = createdWorld.getChunkKey(spawnCX, spawnCZ);
      createdWorld.chunks.set(centerKey, centerChunk);
      createdWorld.worldGroup.add(centerChunk.group);

      // Safe meshing: query getBlockStateLoaded to ensure neighbor queries do not secretly generate distant chunks
      centerChunk.rebuildMesh(
        (wx, wy, wz) => createdWorld!.getBlockStateLoaded(wx, wy, wz),
        createdWorld.solidMaterial,
        createdWorld.transMaterial,
        createdWorld.waterMaterial
      );
      generatedChunksCount++;
      report('generate_spawn_area', 'Spawn Chunk Grounded (1/5)', 55, `Center chunk (${spawnCX}, ${spawnCZ}) meshed`);
      await this.yieldFrame();
      checkCancelled();

      // Step 4b: Pre-warm immediate 4 orthogonal neighbor chunks
      const neighborOffsets: [number, number, string][] = [
        [0, 1, 'North'],
        [0, -1, 'South'],
        [1, 0, 'East'],
        [-1, 0, 'West'],
      ];

      for (let i = 0; i < neighborOffsets.length; i++) {
        checkCancelled();
        const [dx, dz, label] = neighborOffsets[i];
        const ncx = spawnCX + dx;
        const ncz = spawnCZ + dz;
        const nKey = createdWorld.getChunkKey(ncx, ncz);

        if (!createdWorld.chunks.has(nKey)) {
          const chunkSliceStart = performance.now();
          const nChunk = createdWorld.generateChunk(ncx, ncz);
          createdWorld.chunks.set(nKey, nChunk);
          createdWorld.worldGroup.add(nChunk.group);
          generatedChunksCount++;

          const percent = 55 + Math.round(((i + 1) / neighborOffsets.length) * 25);
          report('generate_spawn_area', `Generating Surroundings (${i + 2}/5: ${label})`, percent);

          if (performance.now() - chunkSliceStart > 8) {
            await this.yieldFrame();
          }
        }
      }

      stageDurations.generate_spawn_area = performance.now() - stage4Start;
      report('generate_spawn_area', 'Minimum Spawn Area Ready', 80, `${generatedChunksCount} chunks pre-warmed`);
      await this.yieldFrame();
      checkCancelled();

      // ==========================================
      // STAGE 5: INITIALIZE CRITICAL SYSTEMS (80% - 95%)
      // ==========================================
      const stage5Start = performance.now();
      report('init_systems', 'Initializing Critical Systems...', 85);
      Logger.info('WorldStartupPipeline', `[Stage 5/6: Init Systems] Instantiating GameRuntime & Gameplay Systems...`);

      checkCancelled();
      createdRuntime = new GameRuntime(
        options.container,
        options.worldId,
        options.worldName,
        options.seed,
        options.gameMode,
        options.settings || SettingsManager.get(),
        options.preset || 'standard',
        existingSave,
        createdWorld, // Pass pre-warmed world to avoid redundant sync generation
        spawnPosition
      );

      stageDurations.init_systems = performance.now() - stage5Start;
      report('init_systems', 'Gameplay Systems Initialized', 95);
      await this.yieldFrame();
      checkCancelled();

      // ==========================================
      // STAGE 6: READY & BACKGROUND STREAMING (95% - 100%)
      // ==========================================
      const stage6Start = performance.now();
      report('ready', 'Entering World...', 100);
      stageDurations.ready = performance.now() - stage6Start;

      const totalDurationMs = performance.now() - pipelineStartTime;
      const diagnostics: StartupDiagnostics = {
        totalDurationMs,
        stageDurations,
        spawnPosition,
        generatedChunksCount,
        isWarmLoad,
        seed: options.seed,
        worldId: options.worldId,
      };

      Logger.info('WorldStartupPipeline', `[Startup Complete] Total startup time: ${totalDurationMs.toFixed(1)}ms.`, { diagnostics });

      return {
        runtime: createdRuntime,
        diagnostics,
      };
    } catch (err) {
      // Resource Ownership Guarantee: Clean up any allocated resources if startup was cancelled or failed
      Logger.warn('WorldStartupPipeline', `[Startup Aborted / Error] Cleaning up allocated resources...`, { error: err });
      if (createdRuntime) {
        try {
          createdRuntime.stop();
        } catch (stopErr) {
          Logger.warn('WorldStartupPipeline', 'Error stopping runtime during cleanup', { error: stopErr });
        }
        createdRuntime = null;
      } else if (createdWorld) {
        try {
          createdWorld.dispose();
        } catch (disposeErr) {
          Logger.warn('WorldStartupPipeline', 'Error disposing world during cleanup', { error: disposeErr });
        }
        createdWorld = null;
      }
      throw err;
    }
  }
}
