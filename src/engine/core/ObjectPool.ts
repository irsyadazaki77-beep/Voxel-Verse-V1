/**
 * Generic High-Performance Object Pool
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (item: T) => void;
  private disposeFn?: (item: T) => void;
  public readonly maxSize: number;

  constructor(
    createFn: () => T,
    resetFn?: (item: T) => void,
    disposeFn?: (item: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.disposeFn = disposeFn;
    this.maxSize = maxSize;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  public acquire(): T {
    if (this.pool.length > 0) {
      const item = this.pool.pop()!;
      if (this.resetFn) this.resetFn(item);
      return item;
    }
    return this.createFn();
  }

  public release(item: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) this.resetFn(item);
      this.pool.push(item);
    } else {
      if (this.disposeFn) {
        this.disposeFn(item);
      }
    }
  }

  public size(): number {
    return this.pool.length;
  }

  public clear(): void {
    if (this.disposeFn) {
      for (const item of this.pool) {
        this.disposeFn(item);
      }
    }
    this.pool.length = 0;
  }
}
