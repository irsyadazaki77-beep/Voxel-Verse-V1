import { WorkerTaskInput, WorkerTaskResult, GenerateTaskInput, MeshTaskInput, GenerateTaskResult, MeshTaskResult } from './WorldWorker';
import { WorldGeneratorCore } from './WorldGeneratorCore';
import { Logger } from '../ui/Logger';
import { TransferableMeshData, VoxelMesher } from './VoxelMesher';
import { WorldPreset } from './WorldConfig';

export interface BaseTask {
  taskId: string;
  cx: number;
  cz: number;
  priority: number;
  sessionToken: number;
  retries?: number;
}

export interface GenerationTask extends BaseTask {
  type: 'generate';
  seed: number;
  preset?: WorldPreset;
  dimensionId?: string;
  modifiedBlocks?: Record<string, number>;
  onComplete: (buffer: ArrayBuffer) => void;
}

export interface MeshingTask extends BaseTask {
  type: 'mesh';
  sourceRevision?: number;
  haloBuffer?: ArrayBuffer;
  centerBuffer?: ArrayBuffer;
  neighborBuffers?: Record<string, ArrayBuffer>;
  onComplete: (meshData: TransferableMeshData, sourceRevision: number) => void;
}

export type WorkerTask = GenerationTask | MeshingTask;

export class ChunkWorkerPool {
  private workers: (Worker | null)[] = [];
  private workerBusy: boolean[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskKeySet: Set<string> = new Set();
  private isQueueDirty: boolean = false;
  public currentSessionToken: number = 1;
  private cpuFallbackGenerator: WorldGeneratorCore | null = null;
  private taskTimeouts: Map<string, any> = new Map();
  private workerFailures: number[] = [];
  private useSyncFallback: boolean = false;

  constructor() {
    const threadCount = typeof navigator !== 'undefined' ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)) : 1;
    this.initWorkers(threadCount);
  }

  private initWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createWorker(i);
    }
  }

  private createWorker(index: number) {
    const attempts = this.workerFailures[index] || 0;
    if (attempts >= 2) {
      this.workers[index] = null;
      this.workerBusy[index] = false;
      return;
    }

    try {
      if (typeof Worker === 'undefined') {
        this.workers[index] = null;
        this.workerBusy[index] = false;
        return;
      }

      const worker = // @ts-ignore
      new Worker(new URL('./WorldWorker.ts', import.meta.url), { type: 'module' });
      this.workers[index] = worker;
      this.workerBusy[index] = false;

      worker.onmessage = (e: MessageEvent<WorkerTaskResult>) => {
        this.workerFailures[index] = 0;
        this.handleWorkerResult(index, e.data);
      };

      worker.onerror = (err) => {
        this.workerFailures[index] = (this.workerFailures[index] || 0) + 1;
        Logger.warn('ChunkWorkerPool', `Worker ${index} error (attempt ${this.workerFailures[index]})`, { error: err });
        this.handleWorkerError(index);
      };
    } catch (e) {
      this.workerFailures[index] = (this.workerFailures[index] || 0) + 1;
      this.useSyncFallback = true;
      Logger.warn('ChunkWorkerPool', `Failed to create Worker ${index}, fallback to sync mode enabled`, { error: e });
      this.workers[index] = null;
      this.workerBusy[index] = false;
    }
  }

  private handleWorkerError(workerIdx: number) {
    this.useSyncFallback = true; // Any worker error/failure/timeout triggers instant sync fallback
    const worker = this.workers[workerIdx] as any;
    if (worker) {
      const task: WorkerTask | undefined = worker._currentTask;
      if (task) {
        this.clearTaskTimeout(task.taskId);
        task.retries = (task.retries || 0) + 1;
        if (task.retries < 2) {
          this.taskQueue.push(task);
        } else {
          this.executeSync(task);
        }
      }
      try {
        worker.terminate();
      } catch {
        // ignore
      }
    }
    
    this.workers[workerIdx] = null;
    this.workerBusy[workerIdx] = false;

    if ((this.workerFailures[workerIdx] || 0) < 2) {
      this.createWorker(workerIdx);
    }
    this.processQueue();
  }

  private executeSync(task: WorkerTask) {
    if (task.type === 'generate') {
      if (!this.cpuFallbackGenerator || this.cpuFallbackGenerator.seed !== task.seed || this.cpuFallbackGenerator.preset !== (task.preset || 'standard') || (this.cpuFallbackGenerator.params && this.cpuFallbackGenerator.params.dimensionId !== task.dimensionId)) {
        this.cpuFallbackGenerator = new WorldGeneratorCore(task.seed, task.preset || 'standard', { dimensionId: task.dimensionId });
      }
      try {
        const blocks = this.cpuFallbackGenerator.generateChunkData(task.cx, task.cz, task.modifiedBlocks);
        if (task.sessionToken === this.currentSessionToken) {
          task.onComplete(blocks.buffer);
        }
      } catch (e) {
        Logger.error('ChunkWorkerPool', `Sync generation failed for ${task.cx}, ${task.cz}`, { error: e });
      }
    } else if (task.type === 'mesh') {
      try {
        let getBlock: (lx: number, ly: number, lz: number) => number;

        if (task.haloBuffer) {
          const paddedVoxels = new Uint8Array(task.haloBuffer);
          getBlock = (lx: number, ly: number, lz: number): number => {
            if (ly < 0 || ly >= 128) return 0;
            const px = lx + 1;
            const pz = lz + 1;
            if (px < 0 || px >= 18 || pz < 0 || pz >= 18) return 0;
            return paddedVoxels[px + pz * 18 + ly * 324];
          };
        } else {
          const centerBlocks = new Uint8Array(task.centerBuffer || new ArrayBuffer(0));
          const neighbors: Record<string, Uint8Array> = {};
          if (task.neighborBuffers) {
            for (const key in task.neighborBuffers) {
              neighbors[key] = new Uint8Array(task.neighborBuffers[key]);
            }
          }

          getBlock = (lx: number, ly: number, lz: number): number => {
            if (ly < 0 || ly >= 128) return 0;
            let targetCx = task.cx;
            let targetCz = task.cz;
            let targetLx = lx;
            let targetLz = lz;

            if (lx < 0) { targetCx -= 1; targetLx += 16; }
            else if (lx >= 16) { targetCx += 1; targetLx -= 16; }
            
            if (lz < 0) { targetCz -= 1; targetLz += 16; }
            else if (lz >= 16) { targetCz += 1; targetLz -= 16; }

            if (targetCx === task.cx && targetCz === task.cz) {
              return centerBlocks[targetLx + targetLz * 16 + ly * 256];
            } else {
              const nKey = `${targetCx}_${targetCz}`;
              const nBuffer = neighbors[nKey];
              return nBuffer ? nBuffer[targetLx + targetLz * 16 + ly * 256] : 0;
            }
          };
        }

        const meshData = VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);
        if (task.sessionToken === this.currentSessionToken) {
          task.onComplete(meshData, task.sourceRevision ?? 0);
        }
      } catch (e) {
        Logger.error('ChunkWorkerPool', `Sync meshing failed for ${task.cx}, ${task.cz}`, { error: e });
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
  }

  public enqueueTask(task: WorkerTask): void {
    if (this.useSyncFallback) {
      this.executeSync(task);
      return;
    }

    const key = `${task.type}_${task.cx}_${task.cz}_${task.sessionToken}`;
    if (this.taskKeySet.has(key)) return;

    this.taskKeySet.add(key);
    this.taskQueue.push(task);
    this.isQueueDirty = true;

    // Prune if exceeded max capacity
    const maxQueueSize = 250;
    if (this.taskQueue.length > maxQueueSize) {
      this.sortQueue();
      while (this.taskQueue.length > maxQueueSize) {
        const dropped = this.taskQueue.pop();
        if (dropped) {
          this.taskKeySet.delete(`${dropped.type}_${dropped.cx}_${dropped.cz}_${dropped.sessionToken}`);
        }
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
      // Protect core radius (never cancel radius <= 3 / distSq <= 9)
      const keep = distSq <= 9 || distSq <= maxRadSq;
      if (!keep) {
        this.taskKeySet.delete(`${t.type}_${t.cx}_${t.cz}_${t.sessionToken}`);
      }
      return keep;
    });
  }

  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      // Convention: Higher numeric priority = more important -> Descending order
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // If priorities equal, prioritize meshing over generation
      return a.type === 'mesh' ? -1 : (b.type === 'mesh' ? 1 : 0);
    });
    this.isQueueDirty = false;
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    if (this.useSyncFallback) {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.executeSync(task);
      }
      this.taskKeySet.clear();
      return;
    }

    if (this.isQueueDirty) {
      this.sortQueue();
    }

    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.taskKeySet.delete(`${task.type}_${task.cx}_${task.cz}_${task.sessionToken}`);

        if (task.sessionToken !== this.currentSessionToken) {
          continue;
        }

        const worker = this.workers[i];
        if (!worker) {
          this.executeSync(task);
          continue;
        }

        this.workerBusy[i] = true;
        (worker as any)._currentTask = task;
        
        const timeout = setTimeout(() => {
          Logger.warn('ChunkWorkerPool', `Task ${task.taskId} timed out in worker ${i}, switching to sync fallback`);
          this.handleWorkerError(i);
        }, 1500);
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
            if (task.haloBuffer) {
              const input: MeshTaskInput = {
                type: 'mesh',
                taskId: task.taskId,
                cx: task.cx,
                cz: task.cz,
                sourceRevision: task.sourceRevision ?? 0,
                haloBuffer: task.haloBuffer
              };
              // Transfer haloBuffer directly with zero copy!
              worker.postMessage(input, [task.haloBuffer]);
            } else {
              const input: MeshTaskInput = {
                type: 'mesh',
                taskId: task.taskId,
                cx: task.cx,
                cz: task.cz,
                sourceRevision: task.sourceRevision ?? 0,
                centerBuffer: task.centerBuffer,
                neighborBuffers: task.neighborBuffers
              };
              
              const transfers: ArrayBuffer[] = [];
              if (input.centerBuffer) transfers.push(input.centerBuffer.slice(0));
              
              const clonedNeighbors: Record<string, ArrayBuffer> = {};
              if (input.neighborBuffers) {
                for (const key in input.neighborBuffers) {
                  const sliced = input.neighborBuffers[key].slice(0);
                  transfers.push(sliced);
                  clonedNeighbors[key] = sliced;
                }
              }
              
              const clonedInput: MeshTaskInput = {
                ...input,
                centerBuffer: transfers[0],
                neighborBuffers: clonedNeighbors
              };

              worker.postMessage(clonedInput, transfers);
            }
          }
        } catch (postErr) {
          Logger.warn('ChunkWorkerPool', `Worker postMessage failed for task ${task.taskId}, switching to sync execution`, { error: postErr });
          this.clearTaskTimeout(task.taskId);
          this.handleWorkerError(i);
          this.executeSync(task);
        }
      }
    }
  }

  private clearTaskTimeout(taskId: string) {
    if (this.taskTimeouts.has(taskId)) {
      clearTimeout(this.taskTimeouts.get(taskId));
      this.taskTimeouts.delete(taskId);
    }
  }

  private handleWorkerResult(workerIdx: number, result: WorkerTaskResult): void {
    const worker = this.workers[workerIdx] as any;
    if (!worker) return;

    const task: WorkerTask | undefined = worker._currentTask;

    this.workerBusy[workerIdx] = false;
    worker._currentTask = undefined;

    this.clearTaskTimeout(result.taskId);

    if (task && task.sessionToken === this.currentSessionToken && task.taskId === result.taskId) {
      if (task.type === 'generate' && result.type === 'generate') {
        task.onComplete(result.buffer);
      } else if (task.type === 'mesh' && result.type === 'mesh') {
        task.onComplete(result.meshData, result.sourceRevision ?? 0);
      }
    }

    this.processQueue();
  }

  public getStats(): { activeWorkers: number; queuedTasks: number; totalWorkers: number } {
    return {
      activeWorkers: this.workerBusy.filter(Boolean).length,
      queuedTasks: this.taskQueue.length,
      totalWorkers: this.workers.length,
    };
  }

  public dispose(): void {
    this.taskTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.taskTimeouts.clear();
    
    this.workers.forEach(w => {
      if (w) w.terminate();
    });
    this.workers = [];
    this.workerBusy = [];
    this.taskQueue = [];
    this.taskKeySet.clear();
    this.isQueueDirty = false;
  }
}
