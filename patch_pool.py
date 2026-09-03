import re

with open('/src/engine/world/ChunkWorkerPool.ts', 'r') as f:
    code = f.read()

heap_class = '''
class TaskHeap {
  private heap: WorkerTask[] = [];

  public push(task: WorkerTask): void {
    this.heap.push(task);
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): WorkerTask | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public peek(): WorkerTask | undefined {
    return this.heap[0];
  }

  public get size(): number {
    return this.heap.length;
  }

  public filter(predicate: (t: WorkerTask) => boolean): WorkerTask[] {
    const removed: WorkerTask[] = [];
    this.heap = this.heap.filter(t => {
      if (predicate(t)) return true;
      removed.push(t);
      return false;
    });
    // Rebuild heap
    for (let i = Math.floor(this.heap.length / 2); i >= 0; i--) {
      this.sinkDown(i);
    }
    return removed;
  }

  public clear(): void {
    this.heap = [];
  }

  public toArray(): WorkerTask[] {
    return [...this.heap];
  }

  private compare(a: WorkerTask, b: WorkerTask): number {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.type === 'mesh' ? -1 : (b.type === 'mesh' ? 1 : 0);
  }

  private bubbleUp(n: number): void {
    const element = this.heap[n];
    while (n > 0) {
      const parentN = Math.floor((n - 1) / 2);
      const parent = this.heap[parentN];
      if (this.compare(element, parent) >= 0) break;
      this.heap[parentN] = element;
      this.heap[n] = parent;
      n = parentN;
    }
  }

  private sinkDown(n: number): void {
    const length = this.heap.length;
    const element = this.heap[n];
    while (true) {
      const leftChildN = 2 * n + 1;
      const rightChildN = 2 * n + 2;
      let leftChild: WorkerTask | undefined;
      let rightChild: WorkerTask | undefined;
      let swap: number | null = null;

      if (leftChildN < length) {
        leftChild = this.heap[leftChildN];
        if (this.compare(leftChild, element) < 0) swap = leftChildN;
      }
      if (rightChildN < length) {
        rightChild = this.heap[rightChildN];
        if (
          (swap === null && this.compare(rightChild, element) < 0) ||
          (swap !== null && leftChild && this.compare(rightChild, leftChild) < 0)
        ) {
          swap = rightChildN;
        }
      }
      if (swap === null) break;
      this.heap[n] = this.heap[swap];
      this.heap[swap] = element;
      n = swap;
    }
  }
}
'''

code = code.replace('export class ChunkWorkerPool', heap_class + '\nexport class ChunkWorkerPool')
code = code.replace('private taskQueue: WorkerTask[] = [];', 'private taskQueue = new TaskHeap();')

sync_mesh = '''    } else if (task.type === 'mesh') {
      try {
        const paddedBlocks = new Uint8Array(task.paddedBuffer as ArrayBuffer);
        const getBlock = (lx: number, ly: number, lz: number): number => {
          if (ly < 0 || ly >= 128) return 0;
          const px = lx + 1;
          const pz = lz + 1;
          if (px < 0 || px >= 18 || pz < 0 || pz >= 18) return 0;
          return paddedBlocks[px + pz * 18 + ly * 324];
        };
        const meshData = VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);
        if (task.sessionToken === this.currentSessionToken) {
          task.onComplete(meshData, task.sourceRevision ?? 0);
        }
      } catch (e) {
        Logger.error('ChunkWorkerPool', `Sync meshing failed for ${task.cx}, ${task.cz}`, { error: e });
      }
    }'''

old_sync_mesh = r"\} else if \(task\.type === 'mesh'\) \{.*?(?:Logger\.error\('ChunkWorkerPool', `Sync meshing failed for \$\{task\.cx\}, \$\{task\.cz\}`(?:, \{ error: e \})?\);\s*\}\s*\})"
code = re.sub(old_sync_mesh, sync_mesh.strip(), code, flags=re.DOTALL)


code = code.replace('this.taskQueue = [];', 'this.taskQueue.clear();')

code = code.replace('''    // Prune if exceeded max capacity
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
    this.processQueue();''', '''    // We can support batched enqueue here instead of single item if needed.
    // Prune if exceeded max capacity
    const maxQueueSize = 250;
    while (this.taskQueue.size > maxQueueSize) {
      const dropped = this.taskQueue.pop();
      if (dropped) {
        this.taskKeySet.delete(`${dropped.type}_${dropped.cx}_${dropped.cz}_${dropped.sessionToken}`);
      }
    }
    this.processQueue();''')

# Fix cancel tasks
code = code.replace('''  public cancelTasksOutofRange(playerCX: number, playerCZ: number, maxRadius: number): void {
    const maxRadSq = maxRadius * maxRadius;
    this.taskQueue = this.taskQueue.filter(t => {
      const dx = t.cx - playerCX;
      const dz = t.cz - playerCZ;
      const keep = dx * dx + dz * dz <= maxRadSq;
      if (!keep) {
        this.taskKeySet.delete(`${t.type}_${t.cx}_${t.cz}_${t.sessionToken}`);
      }
      return keep;
    });
  }''', '''  public cancelTasksOutofRange(playerCX: number, playerCZ: number, maxRadius: number): void {
    const maxRadSq = maxRadius * maxRadius;
    const removed = this.taskQueue.filter(t => {
      const dx = t.cx - playerCX;
      const dz = t.cz - playerCZ;
      return dx * dx + dz * dz <= maxRadSq;
    });
    for (const r of removed) {
      this.taskKeySet.delete(`${r.type}_${r.cx}_${r.cz}_${r.sessionToken}`);
    }
  }''')

code = code.replace('''  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      // Convention: Higher numeric priority = more important -> Descending order
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // If priorities equal, prioritize meshing over generation
      return a.type === 'mesh' ? -1 : (b.type === 'mesh' ? 1 : 0);
    });
    this.isQueueDirty = false;
  }''', '')

code = code.replace('this.taskQueue.push(task);', 'this.taskQueue.push(task);')

code = code.replace('''  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    if (this.isQueueDirty) {
      this.sortQueue();
    }
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;''', '''  private processQueue(): void {
    if (this.taskQueue.size === 0) return;
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.taskQueue.size > 0) {
        const task = this.taskQueue.pop()!;''')

# Get queue depth metric
code = code.replace('public get queueDepth(): number {\n    return this.taskQueue.length;\n  }', 'public get queueDepth(): number {\n    return this.taskQueue.size;\n  }')


with open('/src/engine/world/ChunkWorkerPool.ts', 'w') as f:
    f.write(code)
