// Progressive 3D Mining Crack Stage Overlay & Visual Damage Indicator
import * as THREE from 'three';

export class MiningVisualEngine {
  public static crackMesh: THREE.Mesh | null = null;
  private static crackCanvas: HTMLCanvasElement | null = null;
  private static crackTexture: THREE.CanvasTexture | null = null;

  public static getCrackMesh(): THREE.Mesh {
    if (this.crackMesh) return this.crackMesh;

    // Generate procedural crack stage texture canvas (10 progressive stages)
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 160, 16);

    // Draw 10 crack stages (each 16x16)
    for (let stage = 0; stage < 10; stage++) {
      const ox = stage * 16;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + stage * 0.06})`;
      const lineCount = stage + 1;
      for (let l = 0; l < lineCount; l++) {
        const x1 = ox + Math.floor((l * 7 + 3) % 15);
        const y1 = Math.floor((l * 5 + 2) % 15);
        const x2 = ox + Math.floor((l * 11 + 7) % 15);
        const y2 = Math.floor((l * 9 + 8) % 15);
        ctx.fillRect(x1, y1, 2, 2);
        ctx.fillRect(x2, y2, 2, 2);
        ctx.fillRect((x1 + x2) / 2, (y1 + y2) / 2, 1, 1);
      }
    }

    this.crackCanvas = canvas;
    this.crackTexture = new THREE.CanvasTexture(canvas);
    this.crackTexture.magFilter = THREE.NearestFilter;
    this.crackTexture.minFilter = THREE.NearestFilter;

    const geo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const mat = new THREE.MeshBasicMaterial({
      map: this.crackTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.crackMesh = new THREE.Mesh(geo, mat);
    this.crackMesh.visible = false;
    return this.crackMesh;
  }

  public static updateCrack(
    blockPos: [number, number, number] | null,
    progress: number
  ): void {
    const mesh = this.getCrackMesh();
    if (!blockPos || progress <= 0 || progress >= 1.0) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    mesh.position.set(blockPos[0] + 0.5, blockPos[1] + 0.5, blockPos[2] + 0.5);

    // Pick 1 of 10 stages in the 160x16 atlas
    const stage = Math.min(9, Math.floor(progress * 10));
    if (this.crackTexture) {
      this.crackTexture.offset.x = stage * 0.1;
      this.crackTexture.repeat.x = 0.1;
    }
  }
}
