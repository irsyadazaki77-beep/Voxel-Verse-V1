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
  modifiedBlocks?: Record<string, number>;
  onComplete: (buffer: ArrayBuffer) => void;
}

export interface MeshingTask extends BaseTask {
  type: 'mesh';
  sourceRevision?: number;
  centerBuffer: ArrayBuffer;
  neighborBuffers: Record<string, ArrayBuffer>;
  onComplete: (meshData: TransferableMeshData, sourceRevision: number) => void;
}

export type WorkerTask = GenerationTask | MeshingTask;

export class ChunkWorkerPool {
  private workers: (Worker | null)[] = [];
  private workerBusy: boolean[] = [];
  private taskQueue: WorkerTask[] = [];
  public currentSessionToken: number = 1;
  private cpuFallbackGenerator: WorldGeneratorCore | null = null;
  private taskTimeouts: Map<string, any> = new Map();

  constructor() {
    const threadCount = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    this.initWorkers(threadCount);
  }

  private initWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createWorker(i);
    }
  }

  private createWorker(index: number) {
    try {
      const worker = new Worker(new URL('./WorldWorker.ts', import.meta.url), { type: 'module' });
      this.workers[index] = worker;
      this.workerBusy[index] = false;

      worker.onmessage = (e: MessageEvent<WorkerTaskResult>) => {
        this.handleWorkerResult(index, e.data);
      };

      worker.onerror = (err) => {
        Logger.warn('ChunkWorkerPool', `Worker ${index} error`, { error: err });
        this.handleWorkerError(index);
      };
    } catch (e) {
      Logger.warn('ChunkWorkerPool', `Failed to create Worker ${index}`, { error: e });
      this.workers[index] = null;
      this.workerBusy[index] = false;
    }
  }

  private handleWorkerError(workerIdx: number) {
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
      worker.terminate();
    }
    
    this.createWorker(workerIdx);
    this.processQueue();
  }

  private executeSync(task: WorkerTask) {
    if (task.type === 'generate') {
      Logger.info('ChunkWorkerPool', `Generating chunk ${task.cx}, ${task.cz} synchronously`);
      if (!this.cpuFallbackGenerator || this.cpuFallbackGenerator.seed !== task.seed || this.cpuFallbackGenerator.preset !== (task.preset || 'standard')) {
        this.cpuFallbackGenerator = new WorldGeneratorCore(task.seed, task.preset || 'standard');
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
      Logger.info('ChunkWorkerPool', `Meshing chunk ${task.cx}, ${task.cz} synchronously`);
      try {
        const centerBlocks = new Uint8Array(task.centerBuffer);
        const neighbors: Record<string, Uint8Array> = {};
        for (const key in task.neighborBuffers) {
          neighbors[key] = new Uint8Array(task.neighborBuffers[key]);
        }

        const getBlock = (lx: number, ly: number, lz: number): number => {
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
    this.taskTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.taskTimeouts.clear();
  }

  public enqueueTask(task: WorkerTask): void {
    const exists = this.taskQueue.some(t => t.cx === task.cx && t.cz === task.cz && t.sessionToken === task.sessionToken && t.type === task.type);
    if (exists) return;

    this.taskQueue.push(task);
    this.sortQueue();

    // Priority convention: higher numeric priority = more important.
    // Array is sorted descending (index 0 is highest priority).
    // Pop lowest priority elements from the end if queue exceeds limit.
    const maxQueueSize = 250;
    while (this.taskQueue.length > maxQueueSize) {
      this.taskQueue.pop(); 
    }

    this.processQueue();
  }

  public cancelTasksOutofRange(playerCX: number, playerCZ: number, maxRadius: number): void {
    this.taskQueue = this.taskQueue.filter(t => {
      const dx = t.cx - playerCX;
      const dz = t.cz - playerCZ;
      return dx * dx + dz * dz <= maxRadius * maxRadius;
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
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;

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
          Logger.warn('ChunkWorkerPool', `Task ${task.taskId} timed out in worker ${i}`);
          this.handleWorkerError(i);
        }, 15000);
        this.taskTimeouts.set(task.taskId, timeout);

        if (task.type === 'generate') {
          const input: GenerateTaskInput = {
            type: 'generate',
            taskId: task.taskId,
            cx: task.cx,
            cz: task.cz,
            seed: task.seed,
            preset: task.preset,
            modifiedBlocks: task.modifiedBlocks,
          };
          worker.postMessage(input);
        } else if (task.type === 'mesh') {
          const input: MeshTaskInput = {
            type: 'mesh',
            taskId: task.taskId,
            cx: task.cx,
            cz: task.cz,
            sourceRevision: task.sourceRevision ?? 0,
            centerBuffer: task.centerBuffer,
            neighborBuffers: task.neighborBuffers
          };
          
          const transfers = [
            input.centerBuffer.slice(0)
          ];
          for (const key in input.neighborBuffers) {
            transfers.push(input.neighborBuffers[key].slice(0));
          }
          
          const clonedInput: MeshTaskInput = {
            ...input,
            centerBuffer: transfers[0],
            neighborBuffers: {}
          };
          
          let idx = 1;
          for (const key in input.neighborBuffers) {
            clonedInput.neighborBuffers[key] = transfers[idx++];
          }

          worker.postMessage(clonedInput, transfers);
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
  }
}
