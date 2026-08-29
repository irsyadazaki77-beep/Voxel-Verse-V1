// Remote Player Representation & Snapshot Interpolation System (Phase 3 Hardening)
import * as THREE from 'three';

interface TransformBufferEntry {
  position: [number, number, number];
  rotation: [number, number, number];
  timestamp: number;
}

export class RemotePlayer {
  public id: string;
  public name: string;
  public group: THREE.Group;
  private headMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private nameplateMesh: THREE.Sprite;

  private buffer: TransformBufferEntry[] = [];
  private currentPos: THREE.Vector3 = new THREE.Vector3();
  private currentYaw = 0;

  // Configuration for interpolation delay
  private readonly interpolationDelayMs = 100; // Standard 100ms render buffer

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;

    this.group = new THREE.Group();

    // Voxel Stylized Character Model
    const matHead = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const matBody = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.2, 0.5);

    this.headMesh = new THREE.Mesh(headGeo, matHead);
    this.headMesh.position.y = 1.4;

    this.bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    this.bodyMesh.position.y = 0.6;

    this.group.add(this.headMesh);
    this.group.add(this.bodyMesh);

    // Nameplate Canvas Sprite
    this.nameplateMesh = this.createNameplateSprite(name);
    this.nameplateMesh.position.y = 2.2;
    this.group.add(this.nameplateMesh);
  }

  private createNameplateSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.75)';
      ctx.roundRect(10, 10, 236, 44, 12);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  public pushTransformSnapshot(pos: [number, number, number], rot: [number, number, number], timestamp: number): void {
    this.buffer.push({ position: pos, rotation: rot, timestamp });
    
    // Sort buffer by timestamp to ensure monotonic timeline
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);

    // Cap buffer history
    if (this.buffer.length > 30) {
      this.buffer.shift();
    }
  }

  public update(deltaTime: number): void {
    if (this.buffer.length === 0) return;

    const renderTime = Date.now() - this.interpolationDelayMs;

    // Snapshot Interpolation Loop
    if (this.buffer.length >= 2 && this.buffer[0].timestamp <= renderTime) {
      let leftIndex = -1;

      // Find the snapshots enclosing our target renderTime
      for (let i = 0; i < this.buffer.length - 1; i++) {
        if (this.buffer[i].timestamp <= renderTime && this.buffer[i + 1].timestamp >= renderTime) {
          leftIndex = i;
          break;
        }
      }

      if (leftIndex !== -1) {
        const snapA = this.buffer[leftIndex];
        const snapB = this.buffer[leftIndex + 1];

        // Linear interpolation factor between snapA and snapB
        const duration = snapB.timestamp - snapA.timestamp;
        const t = duration > 0 ? (renderTime - snapA.timestamp) / duration : 1;

        // Vector3 lerp for position
        this.currentPos.set(
          snapA.position[0] + (snapB.position[0] - snapA.position[0]) * t,
          snapA.position[1] + (snapB.position[1] - snapA.position[1]) * t,
          snapA.position[2] + (snapB.position[2] - snapA.position[2]) * t
        );

        // Angle lerp for yaw rotation
        const diffYaw = snapB.rotation[1] - snapA.rotation[1];
        // Handle wrapping yaw angle (mod 2pi)
        const shortestYaw = Math.atan2(Math.sin(diffYaw), Math.cos(diffYaw));
        this.currentYaw = snapA.rotation[1] + shortestYaw * t;

        this.group.position.copy(this.currentPos);
        this.group.rotation.y = this.currentYaw;
        return;
      }
    }

    // Fallback: lerp smoothly to the latest received snapshot if buffer is starved
    const latest = this.buffer[this.buffer.length - 1];
    const lerpFactor = Math.min(1.0, deltaTime * 12.0);
    this.currentPos.lerp(new THREE.Vector3(latest.position[0], latest.position[1], latest.position[2]), lerpFactor);
    this.currentYaw += (latest.rotation[1] - this.currentYaw) * lerpFactor;

    this.group.position.copy(this.currentPos);
    this.group.rotation.y = this.currentYaw;
  }

  public dispose(): void {
    this.group.clear();
  }
}
