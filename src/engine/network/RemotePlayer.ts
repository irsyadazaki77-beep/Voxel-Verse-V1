// Remote Player Representation & Movement Interpolation System
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
  private targetPos: THREE.Vector3 = new THREE.Vector3();
  private currentYaw = 0;
  private targetYaw = 0;

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
    if (this.buffer.length > 10) {
      this.buffer.shift();
    }

    this.targetPos.set(pos[0], pos[1], pos[2]);
    this.targetYaw = rot[1];
  }

  public update(deltaTime: number): void {
    // Smooth Interpolation towards target
    const lerpFactor = Math.min(1.0, deltaTime * 12.0); // Smooth 12Hz lerp rate
    this.currentPos.lerp(this.targetPos, lerpFactor);

    // Lerp yaw rotation
    this.currentYaw += (this.targetYaw - this.currentYaw) * lerpFactor;

    this.group.position.copy(this.currentPos);
    this.group.rotation.y = this.currentYaw;
  }

  public dispose(): void {
    this.group.clear();
  }
}
