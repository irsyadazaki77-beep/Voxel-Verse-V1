export interface GameSystem {
  readonly name: string;
  initialize?(): void;
  update?(deltaTime: number): void;
  postUpdate?(deltaTime: number): void;
  dispose(): void;
}
