// Progressive 3D Mining Crack Stage Overlay & Visual Damage Indicator
import * as THREE from 'three';

export class MiningVisualEngine {
  public static crackMesh: THREE.Mesh | null = null;
  private static stageTextures: THREE.CanvasTexture[] = [];
  private static lastStage: number = -1;

  private static buildStageTextures(): void {
    if (this.stageTextures.length > 0 || typeof document === 'undefined') return;

    for (let stage = 0; stage < 10; stage++) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, 32, 32);

      // Progressive branching fracture lines from center (16, 16)
      const branchCount = 3 + stage;
      const maxLen = 4 + stage * 1.4;

      for (let b = 0; b < branchCount; b++) {
        const angle = (b * 2.39996) + (stage * 0.15); // Golden angle distribution
        let cx = 16;
        let cy = 16;
        const steps = Math.floor(maxLen);

        for (let s = 0; s < steps; s++) {
          const jitter = ((b * 7 + s * 13) % 5 - 2) * 0.35;
          cx += Math.cos(angle + jitter) * 1.15;
          cy += Math.sin(angle + jitter) * 1.15;

          const px = Math.max(1, Math.min(30, Math.round(cx)));
          const py = Math.max(1, Math.min(30, Math.round(cy)));

          // Subtle light bevel for visibility on dark basalt/obsidian blocks
          ctx.fillStyle = `rgba(255, 255, 255, ${0.22 + stage * 0.03})`;
          ctx.fillRect(px + 1, py + 1, 2, 2);

          // Deep fracture core
          ctx.fillStyle = `rgba(10, 12, 16, ${0.65 + stage * 0.035})`;
          ctx.fillRect(px, py, 2, 2);
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      this.stageTextures.push(tex);
    }
  }

  public static getCrackMesh(): THREE.Mesh {
    if (this.crackMesh) return this.crackMesh;

    if (typeof document === 'undefined') {
      const geo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      this.crackMesh = new THREE.Mesh(geo, mat);
      return this.crackMesh;
    }

    this.buildStageTextures();

    const geo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    const mat = new THREE.MeshBasicMaterial({
      map: this.stageTextures[0] || null,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.crackMesh = new THREE.Mesh(geo, mat);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 15;
    return this.crackMesh;
  }

  public static updateCrack(
    blockPos: [number, number, number] | null,
    progress: number
  ): void {
    const mesh = this.getCrackMesh();
    if (!blockPos || progress <= 0 || progress >= 1.0) {
      mesh.visible = false;
      this.lastStage = -1;
      return;
    }

    mesh.visible = true;
    mesh.position.set(blockPos[0] + 0.5, blockPos[1] + 0.5, blockPos[2] + 0.5);

    const stage = Math.min(9, Math.max(0, Math.floor(progress * 10)));
    if (stage !== this.lastStage && this.stageTextures[stage]) {
      this.lastStage = stage;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.map = this.stageTextures[stage];
      mat.needsUpdate = true;
    }
  }
}

