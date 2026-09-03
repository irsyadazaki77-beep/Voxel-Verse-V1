import re

with open('/src/engine/world/ChunkWorkerPool.ts', 'r') as f:
    code = f.read()

bad_enqueue = '''  public enqueueTask(task: WorkerTask): void {
    const key = `${task.type}_${task.cx}_${task.cz}_${task.sessionToken}`;
    if (this.taskKeySet.has(key)) return;

    this.taskKeySet.add(key);
    this.taskQueue.push(task);
    this.isQueueDirty = true;

    // We can support batched enqueue here instead of single item if needed.
    // Prune if exceeded max capacity
    const maxQueueSize = 250;
    while (this.taskQueue.size > maxQueueSize) {
      const dropped = this.taskQueue.pop();
      if (dropped) {
        this.taskKeySet.delete(`${dropped.type}_${dropped.cx}_${dropped.cz}_${dropped.sessionToken}`);
      }
    }
    this.processQueue();
  }'''

bad_enqueue_actual = re.search(r'public enqueueTask\(task: WorkerTask\): void \{.*?\n  \}', code, re.DOTALL)
if bad_enqueue_actual:
    new_enqueue = '''  public enqueueTask(task: WorkerTask): void {
    const key = `${task.type}_${task.cx}_${task.cz}_${task.sessionToken}`;
    if (this.taskKeySet.has(key)) return;

    this.taskKeySet.add(key);
    this.taskQueue.push(task);
    this.isQueueDirty = true; // no-op

    const maxQueueSize = 250;
    while (this.taskQueue.size > maxQueueSize) {
      const dropped = this.taskQueue.pop();
      if (dropped) {
        this.taskKeySet.delete(`${dropped.type}_${dropped.cx}_${dropped.cz}_${dropped.sessionToken}`);
      }
    }
    this.processQueue();
  }'''
    code = code.replace(bad_enqueue_actual.group(0), new_enqueue)


# also check this.taskQueue.length
code = code.replace('this.taskQueue.length', 'this.taskQueue.size')

with open('/src/engine/world/ChunkWorkerPool.ts', 'w') as f:
    f.write(code)
