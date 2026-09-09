// Async, Staged, & Budgeted World Startup Pipeline
import { GameMode, WorldSaveData, GameSettings, BlockType } from '../../types';
import { WorldPreset, SEA_LEVEL } from './WorldConfig';
import { SaveManager } from '../storage/SaveManager';
import { VoxelWorld } from './VoxelWorld';
import { GameRuntime } from '../core/GameRuntime';
import { SettingsManager } from '../ui/SettingsManager';
import { Logger } from '../ui/Logger';

export type StartupStage =
  | 'validate'
  | 'resolve_spawn'
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
   * Non-blocking frame yield to prevent main-thread freeze and allow React UI rendering
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
   * Executes the full staged startup pipeline:
   * Validate -> Resolve Spawn -> Generate Minimum Spawn Area -> Initialize Systems -> Ready
   */
  public static async run(options: WorldStartupOptions): Promise<StartupResult> {
    const pipelineStartTime = performance.now();
    const stageTimeout = options.stageTimeoutMs || this.DEFAULT_STAGE_TIMEOUT_MS;
    const stageDurations: Record<StartupStage, number> = {
      validate: 0,
      resolve_spawn: 0,
      generate_spawn_area: 0,
      init_systems: 0,
      ready: 0,
    };

    let existingSave = options.existingSave || null;
    let spawnPosition: [number, number, number] = [0.5, 80, 0.5];
    let generatedChunksCount = 0;
    const isWarmLoad = !!existingSave;

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

    // ==========================================
    // STAGE 1: VALIDATE (0% - 20%)
    // ==========================================
    const stage1Start = performance.now();
    report('validate', 'Validating World & Save Data...', 10, `World: ${options.worldName} (Seed: ${options.seed})`);
    Logger.info('WorldStartupPipeline', `[Stage 1/5: Validate] Validating worldId "${options.worldId}", seed ${options.seed}...`);

    try {
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
      report('validate', 'World Validated', 20);
      Logger.info('WorldStartupPipeline', `[Stage 1/5: Validate] Complete in ${stageDurations.validate.toFixed(1)}ms (Warm: ${!!existingSave})`);
      await this.yieldFrame();
    } catch (err) {
      stageDurations.validate = performance.now() - stage1Start;
      if (isCancelled() || (err as any)?.message?.includes('cancelled')) {
        throw err;
      }
      Logger.error('WorldStartupPipeline', `[Stage 1/5: Validate] Error during validation stage:`, { error: err });
    }

    // ==========================================
    // STAGE 2: RESOLVE SAFE SPAWN (20% - 40%)
    // ==========================================
    const stage2Start = performance.now();
    report('resolve_spawn', 'Resolving Safe Spawn Point...', 25);
    Logger.info('WorldStartupPipeline', `[Stage 2/5: Resolve Spawn] Finding deterministic safe spawn...`);

    try {
      checkCancelled();
      if (existingSave?.player?.position && existingSave.player.position[1] >= 5 && (existingSave.player.health || 100) > 0) {
        spawnPosition = existingSave.player.position;
        Logger.info('WorldStartupPipeline', `[Resolve Spawn] Restored player position from save: [${spawnPosition.map(n => n.toFixed(1)).join(', ')}]`);
      } else {
        // Fast procedural terrain height calculation (pure noise math, < 0.1ms)
        const tempWorld = new VoxelWorld(options.seed, options.preset || 'standard');
        spawnPosition = tempWorld.findSafeSpawn(options.seed);
        Logger.info('WorldStartupPipeline', `[Resolve Spawn] Deterministically resolved safe spawn: [${spawnPosition.map(n => n.toFixed(1)).join(', ')}]`);
      }

      stageDurations.resolve_spawn = performance.now() - stage2Start;
      report('resolve_spawn', 'Safe Spawn Resolved', 40, `Spawn: [${spawnPosition[0].toFixed(0)}, ${spawnPosition[1].toFixed(0)}, ${spawnPosition[2].toFixed(0)}]`);
      await this.yieldFrame();
    } catch (err) {
      stageDurations.resolve_spawn = performance.now() - stage2Start;
      if (isCancelled() || (err as any)?.message?.includes('cancelled')) {
        throw err;
      }
      spawnPosition = [0.5, SEA_LEVEL + 4, 0.5];
      Logger.warn('WorldStartupPipeline', `[Stage 2/5: Resolve Spawn] Fallback spawn used [0.5, ${SEA_LEVEL + 4}, 0.5] due to:`, { error: err });
    }

    // ==========================================
    // STAGE 3: GENERATE MINIMUM SPAWN AREA (40% - 80%)
    // ==========================================
    const stage3Start = performance.now();
    report('generate_spawn_area', 'Generating Minimum Spawn Area...', 45);
    Logger.info('WorldStartupPipeline', `[Stage 3/5: Generate Spawn Area] Pre-generating minimum playable area around [${spawnPosition[0].toFixed(1)}, ${spawnPosition[2].toFixed(1)}]...`);

    // We instantiate the master VoxelWorld
    const world = new VoxelWorld(options.seed, options.preset || 'standard');
    if (existingSave) {
      SaveManager.applySaveToWorld(world, existingSave);
    }

    const spawnCX = Math.floor(spawnPosition[0] / 16);
    const spawnCZ = Math.floor(spawnPosition[2] / 16);

    try {
      checkCancelled();
      // Step 3a: Generate & Mesh immediate center chunk synchronously for instant collision
      const centerChunk = world.generateChunk(spawnCX, spawnCZ);
      const centerKey = world.getChunkKey(spawnCX, spawnCZ);
      world.chunks.set(centerKey, centerChunk);
      world.worldGroup.add(centerChunk.group);
      
      centerChunk.rebuildMesh(
        (wx, wy, wz) => world.getBlock(wx, wy, wz),
        world.solidMaterial,
        world.transMaterial,
        world.waterMaterial
      );
      generatedChunksCount++;
      report('generate_spawn_area', 'Spawn Chunk Grounded (1/5)', 52, `Center chunk (${spawnCX}, ${spawnCZ}) meshed`);
      await this.yieldFrame();

      // Step 3b: Budgeted async pre-warming for immediate 4 orthogonal neighbor chunks
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
        const nKey = world.getChunkKey(ncx, ncz);

        if (!world.chunks.has(nKey)) {
          const chunkSliceStart = performance.now();
          const nChunk = world.generateChunk(ncx, ncz);
          world.chunks.set(nKey, nChunk);
          world.worldGroup.add(nChunk.group);
          generatedChunksCount++;

          const percent = 52 + Math.round(((i + 1) / neighborOffsets.length) * 26);
          report('generate_spawn_area', `Generating Surroundings (${i + 2}/5: ${label})`, percent);

          // If chunk generation exceeded slice budget (e.g. 8ms), yield frame
          if (performance.now() - chunkSliceStart > 8) {
            await this.yieldFrame();
          }
        }
      }

      stageDurations.generate_spawn_area = performance.now() - stage3Start;
      report('generate_spawn_area', 'Minimum Spawn Area Ready', 80, `${generatedChunksCount} chunks pre-warmed`);
      Logger.info('WorldStartupPipeline', `[Stage 3/5: Generate Spawn Area] Complete in ${stageDurations.generate_spawn_area.toFixed(1)}ms (${generatedChunksCount} chunks pre-warmed)`);
      await this.yieldFrame();
    } catch (err) {
      stageDurations.generate_spawn_area = performance.now() - stage3Start;
      if (isCancelled() || (err as any)?.message?.includes('cancelled')) {
        throw err;
      }
      Logger.error('WorldStartupPipeline', `[Stage 3/5: Generate Spawn Area] Error during spawn area generation:`, { error: err });
      throw err;
    }

    // ==========================================
    // STAGE 4: INITIALIZE CRITICAL SYSTEMS (80% - 95%)
    // ==========================================
    const stage4Start = performance.now();
    report('init_systems', 'Initializing Critical Systems...', 85);
    Logger.info('WorldStartupPipeline', `[Stage 4/5: Init Systems] Instantiating GameRuntime & Gameplay Systems...`);

    let runtime: GameRuntime;
    try {
      checkCancelled();
      runtime = new GameRuntime(
        options.container,
        options.worldId,
        options.worldName,
        options.seed,
        options.gameMode,
        options.settings || SettingsManager.get(),
        options.preset || 'standard',
        existingSave,
        world, // Pass pre-warmed world to avoid redundant sync generation
        spawnPosition
      );

      stageDurations.init_systems = performance.now() - stage4Start;
      report('init_systems', 'Gameplay Systems Initialized', 95);
      Logger.info('WorldStartupPipeline', `[Stage 4/5: Init Systems] Complete in ${stageDurations.init_systems.toFixed(1)}ms`);
      await this.yieldFrame();
    } catch (err) {
      stageDurations.init_systems = performance.now() - stage4Start;
      if (isCancelled() || (err as any)?.message?.includes('cancelled')) {
        throw err;
      }
      Logger.error('WorldStartupPipeline', `[Stage 4/5: Init Systems] Critical system instantiation error:`, { error: err });
      throw err;
    }

    // ==========================================
    // STAGE 5: READY & BACKGROUND STREAMING (95% - 100%)
    // ==========================================
    const stage5Start = performance.now();
    report('ready', 'Entering World...', 100);
    stageDurations.ready = performance.now() - stage5Start;

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

    Logger.info('WorldStartupPipeline', `[Startup Complete] Total startup time: ${totalDurationMs.toFixed(1)}ms. Transitioning to active gameplay.`, { diagnostics });

    return {
      runtime,
      diagnostics,
    };
  }
}
