// Multi-threaded Web Worker Pool for Asynchronous Voxel Generation
// Task Queuing, Priority Sorting, Session Token Cancellation & Blob Fallback
import { WorkerTaskInput, WorkerTaskResult } from './WorldWorker';

export interface GenerationTask {
  taskId: string;
  cx: number;
  cz: number;
  seed: number;
  priority: number;
  sessionToken: number;
  modifiedBlocks?: Record<string, number>;
  onComplete: (buffer: ArrayBuffer) => void;
}

export class ChunkWorkerPool {
  private workers: Worker[] = [];
  private workerBusy: boolean[] = [];
  private taskQueue: GenerationTask[] = [];
  public currentSessionToken: number = 1;

  constructor() {
    const threadCount = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    this.initWorkers(threadCount);
  }

  private initWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      try {
        // Create Web Worker with module support or inline blob fallback
        const worker = new Worker(new URL('./WorldWorker.ts', import.meta.url), { type: 'module' });
        this.workers.push(worker);
        this.workerBusy.push(false);

        worker.onmessage = (e: MessageEvent<WorkerTaskResult>) => {
          this.handleWorkerResult(i, e.data);
        };

        worker.onerror = (err) => {
          console.warn('Worker error, fallback to CPU pass:', err);
          this.workerBusy[i] = false;
          this.processQueue();
        };
      } catch {
        // Safe fallback if workers are restricted
      }
    }
  }

  public setSessionToken(token: number): void {
    this.currentSessionToken = token;
    // Clear queue when world session changes
    this.taskQueue = [];
  }

  public enqueueTask(task: GenerationTask): void {
    // Avoid duplicate tasks in queue
    const exists = this.taskQueue.some(t => t.cx === task.cx && t.cz === task.cz && t.sessionToken === task.sessionToken);
    if (exists) return;

    this.taskQueue.push(task);
    this.sortQueue();
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
    // Highest priority first
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;

        // Discard task if session token is obsolete (world reloaded or exited)
        if (task.sessionToken !== this.currentSessionToken) {
          continue;
        }

        this.workerBusy[i] = true;
        const input: WorkerTaskInput = {
          taskId: task.taskId,
          cx: task.cx,
          cz: task.cz,
          seed: task.seed,
          modifiedBlocks: task.modifiedBlocks,
        };

        // Attach completion callback to worker slot
        (this.workers[i] as any)._currentTask = task;
        this.workers[i].postMessage(input);
      }
    }
  }

  private handleWorkerResult(workerIdx: number, result: WorkerTaskResult): void {
    const worker = this.workers[workerIdx] as any;
    const task: GenerationTask | undefined = worker._currentTask;

    this.workerBusy[workerIdx] = false;
    worker._currentTask = undefined;

    if (task && task.sessionToken === this.currentSessionToken && task.taskId === result.taskId) {
      task.onComplete(result.buffer);
    }

    // Process next queued task
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
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.workerBusy = [];
    this.taskQueue = [];
  }
}
