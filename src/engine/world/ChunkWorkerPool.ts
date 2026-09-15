import { WorkerTaskInput, WorkerTaskResult, GenerateTaskInput, MeshTaskInput, GenerateTaskResult, MeshTaskResult } from './WorldWorker';
import { WorldGeneratorCore } from './WorldGeneratorCore';
import { Logger } from '../ui/Logger';
import { TransferableMeshData, VoxelMesher } from './VoxelMesher';
import { WorldPreset, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './WorldConfig';

export enum WorkerState {
  HEALTHY = 'healthy',
  BUSY = 'busy',
  RECOVERING = 'recovering',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

export interface WorkerSlot {
  index: number;
  worker: Worker | null;
  state: WorkerState;
  failureCount: number;
  timeoutCount: number;
  lastFailureAt: number;
  restartAttempts: number;
  currentTask?: WorkerTask;
  taskStartTime?: number;
}

export interface BaseTask {
  taskId: string;
  cx: number;
  cz: number;
  priority: number;
  sessionToken: number;
  retries?: number;
  maxRetries?: number;
  lastError?: string;
  lastAttemptAt?: number;
}

export interface GenerationTask extends BaseTask {
  type: 'generate';
  seed: number;
  preset?: WorldPreset;
  dimensionId?: string;
  modifiedBlocks?: Record<string, number>;
  onComplete: (buffer: ArrayBuffer) => void;
  onError?: (err: any) => void;
}

export interface FreshMeshBuffers {
  haloBuffer?: ArrayBuffer;
  centerBuffer?: ArrayBuffer;
  neighborBuffers?: Record<string, ArrayBuffer>;
}

export interface MeshingTask extends BaseTask {
  type: 'mesh';
  sourceRevision: number;
  bufferProvider?: () => FreshMeshBuffers;
  onComplete: (meshData: TransferableMeshData, sourceRevision: number) => void;
  onError?: (err: any) => void;
}

export type WorkerTask = GenerationTask | MeshingTask;

export class ChunkWorkerPool {
  private workerSlots: WorkerSlot[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskKeySet: Set<string> = new Set();
  private isQueueDirty: boolean = false;
  public currentSessionToken: number = 1;
  private cpuFallbackGenerator: WorldGeneratorCore | null = null;
  private taskTimeouts: Map<string, any> = new Map();

  // Rolling metrics for adaptive timeout
  private recentGenDurations: number[] = [];
  private recentMeshDurations: number[] = [];
  private lastErrorLogTimes: Map<string, number> = new Map();

  constructor() {
    const threadCount = typeof navigator !== 'undefined'
      ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1))
      : 1;
    this.initWorkers(threadCount);
  }

  private logWarnThrottled(key: string, msg: string, detail?: any): void {
    const now = Date.now();
    const last = this.lastErrorLogTimes.get(key) || 0;
    if (now - last > 3000) {
      this.lastErrorLogTimes.set(key, now);
      Logger.warn('ChunkWorkerPool', msg, detail);
    }
  }

  private initWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      this.workerSlots[i] = {
        index: i,
        worker: null,
        state: WorkerState.DISABLED,
        failureCount: 0,
        timeoutCount: 0,
        lastFailureAt: 0,
        restartAttempts: 0,
      };
      this.createWorker(i);
    }
  }

  private createWorker(index: number): void {
    const slot = this.workerSlots[index];
    if (!slot) return;

    if (slot.restartAttempts >= 3) {
      slot.state = WorkerState.FAILED;
      slot.worker = null;
      this.logWarnThrottled(`worker_failed_${index}`, `Worker ${index} failed multiple restarts, marked FAILED`);
      return;
    }

    try {
      if (typeof Worker === 'undefined') {
        slot.state = WorkerState.DISABLED;
        slot.worker = null;
        return;
      }

      slot.state = WorkerState.RECOVERING;
      const worker = new Worker(new URL('./WorldWorker.ts', import.meta.url) as unknown as string, { type: 'module' });
      slot.worker = worker;
      slot.state = WorkerState.HEALTHY;
      slot.restartAttempts = 0;

      worker.onmessage = (e: MessageEvent<WorkerTaskResult>) => {
        this.handleWorkerResult(index, e.data);
      };

      worker.onerror = (err) => {
        slot.failureCount++;
        slot.lastFailureAt = Date.now();
        this.logWarnThrottled(`worker_err_${index}`, `Worker ${index} runtime error (failure #${slot.failureCount})`, { error: err });
        this.handleWorkerFailure(index, 'Worker runtime error');
      };
    } catch (e) {
      slot.failureCount++;
      slot.lastFailureAt = Date.now();
      slot.restartAttempts++;
      slot.state = slot.restartAttempts >= 3 ? WorkerState.FAILED : WorkerState.RECOVERING;
      slot.worker = null;
      this.logWarnThrottled(`worker_create_err_${index}`, `Failed to instantiate Worker ${index}`, { error: e });
    }
  }

  private handleWorkerFailure(workerIdx: number, reason: string): void {
    const slot = this.workerSlots[workerIdx];
    if (!slot) return;

    const task = slot.currentTask;
    slot.currentTask = undefined;
    slot.state = WorkerState.RECOVERING;

    if (slot.worker) {
      try {
        slot.worker.terminate();
      } catch {
        // ignore termination errors
      }
      slot.worker = null;
    }

    if (task) {
      this.clearTaskTimeout(task.taskId);
      task.retries = (task.retries || 0) + 1;
      task.lastError = reason;
      task.lastAttemptAt = Date.now();

      const maxRetries = task.maxRetries ?? (task.type === 'generate' ? 2 : 2);
      if (task.retries <= maxRetries && task.sessionToken === this.currentSessionToken) {
        // Re-enqueue task with fresh buffer provider or generator params
        const key = `${task.type === 'generate' ? 'gen' : 'mesh'}:${task.cx}:${task.cz}:${task.sessionToken}`;
        if (!this.taskKeySet.has(key)) {
          this.taskKeySet.add(key);
          this.taskQueue.push(task);
          this.isQueueDirty = true;
        }
      } else {
        // Retry limit exceeded -> notify caller for graceful recovery
        this.logWarnThrottled(`task_max_retries_${task.taskId}`, `Task ${task.taskId} exceeded max retries (${task.retries}), aborting task gracefully.`);
        if (task.onError) {
          task.onError(new Error(reason));
        }
      }
    }

    slot.restartAttempts++;
    if (slot.restartAttempts < 3) {
      const backoffMs = Math.min(2000, 300 * slot.restartAttempts);
      setTimeout(() => {
        this.createWorker(workerIdx);
        this.processQueue();
      }, backoffMs);
    } else {
      slot.state = WorkerState.FAILED;
    }

    this.processQueue();
  }

  public getAdaptiveTimeout(taskType: 'generate' | 'mesh'): number {
    const samples = taskType === 'generate' ? this.recentGenDurations : this.recentMeshDurations;
    const baseTimeout = taskType === 'generate' ? 3000 : 2500;
    if (samples.length < 5) return baseTimeout;

    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || baseTimeout;
    const hwFactor = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 2 ? 1.5 : 1.0;

    return Math.max(baseTimeout, Math.min(10000, Math.ceil(p95 * 2.0 * hwFactor)));
  }

  private recordDuration(taskType: 'generate' | 'mesh', durationMs: number): void {
    const list = taskType === 'generate' ? this.recentGenDurations : this.recentMeshDurations;
    list.push(durationMs);
    if (list.length > 50) list.shift();
  }

  public checkAndRecoverFailedWorkers(): void {
    const now = Date.now();
    for (const slot of this.workerSlots) {
      if (slot.state === WorkerState.FAILED && now - slot.lastFailureAt >= 5000) {
        slot.restartAttempts = 0;
        slot.state = WorkerState.RECOVERING;
        this.createWorker(slot.index);
      }
    }
  }

  public isAllWorkersUnavailable(): boolean {
    return this.workerSlots.every(
      s => s.state === WorkerState.FAILED || s.state === WorkerState.DISABLED || s.worker === null
    );
  }

  private executeSyncSingle(task: WorkerTask): void {
    if (task.sessionToken !== this.currentSessionToken) return;

    if (task.type === 'generate') {
      if (
        !this.cpuFallbackGenerator ||
        this.cpuFallbackGenerator.seed !== task.seed ||
        this.cpuFallbackGenerator.preset !== (task.preset || 'standard') ||
        (this.cpuFallbackGenerator.params && this.cpuFallbackGenerator.params.dimensionId !== task.dimensionId)
      ) {
        this.cpuFallbackGenerator = new WorldGeneratorCore(task.seed, task.preset || 'standard', { dimensionId: task.dimensionId });
      }
      try {
        const blocks = this.cpuFallbackGenerator.generateChunkData(task.cx, task.cz, task.modifiedBlocks);
        if (task.sessionToken === this.currentSessionToken) {
          task.onComplete(blocks.buffer);
        }
      } catch (e) {
        Logger.error('ChunkWorkerPool', `Sync generation failed for (${task.cx}, ${task.cz})`, { error: e });
        if (task.onError) task.onError(e);
      }
    } else if (task.type === 'mesh') {
      try {
        const fresh = task.bufferProvider ? task.bufferProvider() : {};
        let getBlock: (lx: number, ly: number, lz: number) => number;

        if (fresh.haloBuffer) {
          const paddedVoxels = new Uint8Array(fresh.haloBuffer);
          const haloDimX = CHUNK_SIZE_X + 2;
          const haloDimZ = CHUNK_SIZE_Z + 2;
          const haloLayer = haloDimX * haloDimZ;
          getBlock = (lx: number, ly: number, lz: number): number => {
            if (ly < 0 || ly >= CHUNK_SIZE_Y) return 0;
            const px = lx + 1;
            const pz = lz + 1;
            if (px < 0 || px >= haloDimX || pz < 0 || pz >= haloDimZ) return 0;
            return paddedVoxels[px + pz * haloDimX + ly * haloLayer];
          };
        } else {
          const centerBlocks = new Uint8Array(fresh.centerBuffer || new ArrayBuffer(0));
          const neighbors: Record<string, Uint8Array> = {};
          if (fresh.neighborBuffers) {
            for (const k in fresh.neighborBuffers) {
              neighbors[k] = new Uint8Array(fresh.neighborBuffers[k]);
            }
          }

          const layerSize = CHUNK_SIZE_X * CHUNK_SIZE_Z;
          getBlock = (lx: number, ly: number, lz: number): number => {
            if (ly < 0 || ly >= CHUNK_SIZE_Y) return 0;
            let targetCx = task.cx;
            let targetCz = task.cz;
            let targetLx = lx;
            let targetLz = lz;

            if (lx < 0) { targetCx -= 1; targetLx += CHUNK_SIZE_X; }
            else if (lx >= CHUNK_SIZE_X) { targetCx += 1; targetLx -= CHUNK_SIZE_X; }

            if (lz < 0) { targetCz -= 1; targetLz += CHUNK_SIZE_Z; }
            else if (lz >= CHUNK_SIZE_Z) { targetCz += 1; targetLz -= CHUNK_SIZE_Z; }

            if (targetCx === task.cx && targetCz === task.cz) {
              return centerBlocks[targetLx + targetLz * CHUNK_SIZE_X + ly * layerSize];
            } else {
              const nKey = `${targetCx}_${targetCz}`;
              const nBuffer = neighbors[nKey];
              return nBuffer ? nBuffer[targetLx + targetLz * CHUNK_SIZE_X + ly * layerSize] : 0;
            }
          };
        }

        const meshData = VoxelMesher.buildChunkMeshData(getBlock, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z);
        if (task.sessionToken === this.currentSessionToken) {
          task.onComplete(meshData, task.sourceRevision ?? 0);
        }
      } catch (e) {
        Logger.error('ChunkWorkerPool', `Sync meshing failed for (${task.cx}, ${task.cz})`, { error: e });
        if (task.onError) task.onError(e);
      }
    }
  }

  public setSessionToken(token: number): void {
    this.currentSessionToken = token;
    this.taskQueue = [];
    this.taskKeySet.clear();
    this.isQueueDirty = false;
    this.taskTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.taskTimeouts.clear();

    for (const slot of this.workerSlots) {
      slot.currentTask = undefined;
      if (slot.state === WorkerState.BUSY) {
        slot.state = WorkerState.HEALTHY;
      }
    }
  }

  public enqueueTask(task: WorkerTask): void {
    const key = `${task.type === 'generate' ? 'gen' : 'mesh'}:${task.cx}:${task.cz}:${task.sessionToken}`;
    if (this.taskKeySet.has(key)) return;

    this.taskKeySet.add(key);
    this.taskQueue.push(task);
    this.isQueueDirty = true;

    // Prune distant tasks if queue exceeds capacity, keeping near tasks (priority >= 2000) safe
    const maxQueueSize = 250;
    if (this.taskQueue.length > maxQueueSize) {
      this.sortQueue();
      let i = this.taskQueue.length - 1;
      while (this.taskQueue.length > maxQueueSize && i >= 0) {
        const candidate = this.taskQueue[i];
        if (candidate.priority < 2000) { // Never drop near-player tasks
          const dropped = this.taskQueue.splice(i, 1)[0];
          if (dropped) {
            this.taskKeySet.delete(`${dropped.type === 'generate' ? 'gen' : 'mesh'}:${dropped.cx}:${dropped.cz}:${dropped.sessionToken}`);
            if (dropped.onError) {
              dropped.onError(new Error('Task pruned due to queue overflow'));
            }
          }
        }
        i--;
      }
    }

    this.processQueue();
  }

  public cancelTasksOutofRange(playerCX: number, playerCZ: number, maxRadius: number): void {
    const maxRadSq = maxRadius * maxRadius;
    this.taskQueue = this.taskQueue.filter(t => {
      const dx = t.cx - playerCX;
      const dz = t.cz - playerCZ;
      const distSq = dx * dx + dz * dz;
      // Protect core radius <= 3 (distSq <= 9) unconditionally
      const keep = distSq <= 9 || distSq <= maxRadSq;
      if (!keep) {
        const key = `${t.type === 'generate' ? 'gen' : 'mesh'}:${t.cx}:${t.cz}:${t.sessionToken}`;
        this.taskKeySet.delete(key);
        if (t.onError) {
          t.onError(new Error('Task cancelled out of range'));
        }
      }
      return keep;
    });
  }

  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.type === 'mesh' ? -1 : (b.type === 'mesh' ? 1 : 0);
    });
    this.isQueueDirty = false;
  }

  public processQueue(syncBudgetMs: number = 1.5): void {
    if (this.taskQueue.length === 0) return;

    // Check if any failed workers can be auto-recovered after cooldown
    this.checkAndRecoverFailedWorkers();

    // If ALL workers are unavailable, execute under strict frame budget (Controlled Sync Fallback)
    if (this.isAllWorkersUnavailable()) {
      const start = performance.now();
      while (this.taskQueue.length > 0 && performance.now() - start < syncBudgetMs) {
        const task = this.taskQueue.shift()!;
        const key = `${task.type === 'generate' ? 'gen' : 'mesh'}:${task.cx}:${task.cz}:${task.sessionToken}`;
        this.taskKeySet.delete(key);
        this.executeSyncSingle(task);
      }
      return;
    }

    if (this.isQueueDirty) {
      this.sortQueue();
    }

    const availableSlots = this.workerSlots.filter(s => s.state === WorkerState.HEALTHY);
    if (availableSlots.length === 0) return;

    const hasMeshingTasks = this.taskQueue.some(t => t.type === 'mesh');

    for (const slot of availableSlots) {
      if (this.taskQueue.length === 0) break;

      let taskIndex = -1;
      // Generation vs Meshing Fairness: If meshing tasks exist and multiple workers available, reserve slot for meshing
      if (hasMeshingTasks && availableSlots.length > 1) {
        taskIndex = this.taskQueue.findIndex(t => t.type === 'mesh');
      }

      if (taskIndex === -1) {
        taskIndex = 0;
      }

      const task = this.taskQueue.splice(taskIndex, 1)[0];
      if (!task) continue;

      const key = `${task.type === 'generate' ? 'gen' : 'mesh'}:${task.cx}:${task.cz}:${task.sessionToken}`;
      this.taskKeySet.delete(key);

      if (task.sessionToken !== this.currentSessionToken) {
        continue;
      }

      const worker = slot.worker;
      if (!worker) {
        this.executeSyncSingle(task);
        continue;
      }

      slot.state = WorkerState.BUSY;
      slot.currentTask = task;
      slot.taskStartTime = performance.now();

      const timeoutMs = this.getAdaptiveTimeout(task.type);
      const timeout = setTimeout(() => {
        slot.timeoutCount++;
        this.logWarnThrottled(`task_timeout_${task.taskId}`, `Task ${task.taskId} timed out in worker ${slot.index} after ${timeoutMs}ms`);
        this.handleWorkerFailure(slot.index, `Task timeout after ${timeoutMs}ms`);
      }, timeoutMs);
      this.taskTimeouts.set(task.taskId, timeout);

      try {
        if (task.type === 'generate') {
          const input: GenerateTaskInput = {
            type: 'generate',
            taskId: task.taskId,
            cx: task.cx,
            cz: task.cz,
            seed: task.seed,
            preset: task.preset,
            dimensionId: task.dimensionId,
            modifiedBlocks: task.modifiedBlocks,
          };
          worker.postMessage(input);
        } else if (task.type === 'mesh') {
          // Requirement 3 & 4: Rebuild FRESH buffers from current state at dispatch time
          const fresh = task.bufferProvider ? task.bufferProvider() : {};

          if (fresh.haloBuffer) {
            // Development assertion: ensure buffer is NOT detached
            if (fresh.haloBuffer.byteLength === 0) {
              throw new Error('Detached ArrayBuffer detected in haloBuffer provider!');
            }

            const input: MeshTaskInput = {
              type: 'mesh',
              taskId: task.taskId,
              cx: task.cx,
              cz: task.cz,
              sourceRevision: task.sourceRevision ?? 0,
              haloBuffer: fresh.haloBuffer,
            };
            worker.postMessage(input, [fresh.haloBuffer]);
          } else {
            const centerBuf = fresh.centerBuffer;
            const neighborBufs = fresh.neighborBuffers || {};

            const transfers: ArrayBuffer[] = [];
            if (centerBuf) {
              if (centerBuf.byteLength === 0) throw new Error('Detached centerBuffer detected!');
              transfers.push(centerBuf);
            }

            for (const k in neighborBufs) {
              const buf = neighborBufs[k];
              if (buf && buf.byteLength > 0) {
                transfers.push(buf);
              }
            }

            const input: MeshTaskInput = {
              type: 'mesh',
              taskId: task.taskId,
              cx: task.cx,
              cz: task.cz,
              sourceRevision: task.sourceRevision ?? 0,
              centerBuffer: centerBuf,
              neighborBuffers: neighborBufs,
            };

            worker.postMessage(input, transfers);
          }
        }
      } catch (postErr) {
        this.logWarnThrottled(`post_msg_err_${task.taskId}`, `Worker postMessage failed for task ${task.taskId}`, { error: postErr });
        this.clearTaskTimeout(task.taskId);
        this.handleWorkerFailure(slot.index, 'postMessage failure');
      }
    }
  }

  private clearTaskTimeout(taskId: string): void {
    if (this.taskTimeouts.has(taskId)) {
      clearTimeout(this.taskTimeouts.get(taskId));
      this.taskTimeouts.delete(taskId);
    }
  }

  private handleWorkerResult(workerIdx: number, result: WorkerTaskResult): void {
    const slot = this.workerSlots[workerIdx];
    if (!slot) return;

    const task = slot.currentTask;
    const startTime = slot.taskStartTime || performance.now();
    const duration = performance.now() - startTime;

    slot.state = WorkerState.HEALTHY;
    slot.currentTask = undefined;

    this.clearTaskTimeout(result.taskId);

    if (task && task.sessionToken === this.currentSessionToken && task.taskId === result.taskId) {
      this.recordDuration(task.type, duration);

      if (task.type === 'generate' && result.type === 'generate') {
        task.onComplete(result.buffer);
      } else if (task.type === 'mesh' && result.type === 'mesh') {
        task.onComplete(result.meshData, result.sourceRevision ?? 0);
      }
    }

    this.processQueue();
  }

  public getStats(): {
    healthyWorkers: number;
    busyWorkers: number;
    recoveringWorkers: number;
    failedWorkers: number;
    queuedTasks: number;
    totalWorkers: number;
    avgGenMs: number;
    p95GenMs: number;
    avgMeshMs: number;
    p95MeshMs: number;
  } {
    const healthy = this.workerSlots.filter(s => s.state === WorkerState.HEALTHY).length;
    const busy = this.workerSlots.filter(s => s.state === WorkerState.BUSY).length;
    const recovering = this.workerSlots.filter(s => s.state === WorkerState.RECOVERING).length;
    const failed = this.workerSlots.filter(s => s.state === WorkerState.FAILED || s.state === WorkerState.DISABLED).length;

    const avgGenMs = this.recentGenDurations.length ? Math.round(this.recentGenDurations.reduce((a, b) => a + b, 0) / this.recentGenDurations.length) : 0;
    const avgMeshMs = this.recentMeshDurations.length ? Math.round(this.recentMeshDurations.reduce((a, b) => a + b, 0) / this.recentMeshDurations.length) : 0;

    const sortedGen = [...this.recentGenDurations].sort((a, b) => a - b);
    const sortedMesh = [...this.recentMeshDurations].sort((a, b) => a - b);

    const p95GenMs = sortedGen.length ? Math.round(sortedGen[Math.floor(sortedGen.length * 0.95)] || 0) : 0;
    const p95MeshMs = sortedMesh.length ? Math.round(sortedMesh[Math.floor(sortedMesh.length * 0.95)] || 0) : 0;

    return {
      healthyWorkers: healthy,
      busyWorkers: busy,
      recoveringWorkers: recovering,
      failedWorkers: failed,
      queuedTasks: this.taskQueue.length,
      totalWorkers: this.workerSlots.length,
      avgGenMs,
      p95GenMs,
      avgMeshMs,
      p95MeshMs,
    };
  }

  public dispose(): void {
    this.taskTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.taskTimeouts.clear();

    this.workerSlots.forEach(s => {
      if (s.worker) {
        try {
          s.worker.terminate();
        } catch {
          // ignore
        }
      }
      s.worker = null;
      s.state = WorkerState.DISABLED;
    });
    this.workerSlots = [];
    this.taskQueue = [];
    this.taskKeySet.clear();
    this.isQueueDirty = false;
  }
}
