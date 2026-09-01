// Stylized Volumetric Procedural Cloud System
// Dynamic density, wind movement, and weather state color transitions
import * as THREE from 'three';
import { WeatherState } from '../../types';

export class CloudSystem {
  public cloudGroup: THREE.Group;
  public cloudMaterial: THREE.MeshLambertMaterial;
  private scene: THREE.Scene;
  private cloudClusters: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();

    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
      depthWrite: true,
    });

    this.generateCloudLayer();
    this.scene.add(this.cloudGroup);
  }

  private generateCloudLayer(): void {
    const clusterCount = 18;
    const radius = 280;

    for (let i = 0; i < clusterCount; i++) {
      const clusterGroup = new THREE.Group();
      const px = (Math.random() - 0.5) * radius * 2;
      const pz = (Math.random() - 0.5) * radius * 2;
      const py = 92 + Math.random() * 8;

      // Compound cloud shape (merge 4-8 overlapping box blocks)
      const subBlockCount = 5 + Math.floor(Math.random() * 5);
      for (let b = 0; b < subBlockCount; b++) {
        const sx = 12 + Math.random() * 16;
        const sy = 4 + Math.random() * 6;
        const sz = 12 + Math.random() * 16;

        const geo = new THREE.BoxGeometry(sx, sy, sz);
        const mesh = new THREE.Mesh(geo, this.cloudMaterial);
        mesh.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 20
        );
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        clusterGroup.add(mesh);
      }

      clusterGroup.position.set(px, py, pz);
      this.cloudGroup.add(clusterGroup);
      this.cloudClusters.push(clusterGroup as any);
    }
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, weather: WeatherState, timeOfDay: number = 12.0): void {
    // Keep cloud layer centered around player
    this.cloudGroup.position.x = playerPos.x;
    this.cloudGroup.position.z = playerPos.z;

    // Drift clouds with wind vector
    const speed = weather.windSpeed * deltaTime * 2.5;
    const dx = Math.cos(weather.windAngle) * speed;
    const dz = Math.sin(weather.windAngle) * speed;

    for (const cluster of this.cloudClusters) {
      cluster.position.x += dx;
      cluster.position.z += dz;
      // Wrap around radius boundaries
      if (cluster.position.x > 300) cluster.position.x -= 600;
      if (cluster.position.x < -300) cluster.position.x += 600;
      if (cluster.position.z > 300) cluster.position.z -= 600;
      if (cluster.position.z < -300) cluster.position.z += 600;
    }

    // Weather state transitions (Cloud color & opacity)
    let targetColor = new THREE.Color(0xffffff);
    let targetOpacity = 0.85;

    if (weather.type === 'storm') {
      targetColor.setRGB(0.25, 0.28, 0.35);
      targetOpacity = 0.95;
    } else if (weather.type === 'rain') {
      targetColor.setRGB(0.55, 0.60, 0.68);
      targetOpacity = 0.90;
    } else if (weather.type === 'snow') {
      targetColor.setRGB(0.85, 0.88, 0.92);
      targetOpacity = 0.88;
    }

    // Sunset tint during golden hour
    if (timeOfDay >= 16.5 && timeOfDay < 19.0 && weather.type !== 'storm') {
      const sunsetTint = new THREE.Color(0xff9977);
      targetColor.lerp(sunsetTint, 0.6);
    } else if (timeOfDay >= 5.0 && timeOfDay < 7.5 && weather.type !== 'storm') {
      const dawnTint = new THREE.Color(0xffbb99);
      targetColor.lerp(dawnTint, 0.5);
    } else if (timeOfDay < 5.0 || timeOfDay > 19.0) {
      targetColor.setHex(0x334466); // Dark blue clouds at night
    }

    this.cloudMaterial.color.lerp(targetColor, deltaTime * 2.0);
    this.cloudMaterial.opacity = THREE.MathUtils.lerp(this.cloudMaterial.opacity, targetOpacity, deltaTime * 2.0);
  }

  public setVisible(visible: boolean): void {
    this.cloudGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.cloudGroup);
    this.cloudMaterial.dispose();
  }
}
