// Dynamic Weather Engine: Rain, Snow, Thunderstorms, Lightning & Wind Dynamics
import * as THREE from 'three';
import { WeatherState } from '../../types';

export class WeatherSystem {
  public weather: WeatherState = {
    type: 'clear',
    intensity: 0,
    windAngle: 0.5,
    windSpeed: 2.0,
    durationLeft: 180,
  };

  public rainParticles: THREE.Points;
  public snowParticles: THREE.Points;
  public weatherGroup: THREE.Group;
  public scene: THREE.Scene;

  public isLightningFlash: boolean = false;
  private lightningTimer: number = 0;

  private rainPositions: Float32Array;
  private snowPositions: Float32Array;
  private particleCount = 1400;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.weatherGroup = new THREE.Group();

    // 1. Rain Particles
    this.rainPositions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount * 3; i += 3) {
      this.rainPositions[i] = (Math.random() - 0.5) * 45;
      this.rainPositions[i + 1] = Math.random() * 32;
      this.rainPositions[i + 2] = (Math.random() - 0.5) * 45;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.weatherGroup.add(this.rainParticles);

    // 2. Snow Particles
    this.snowPositions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount * 3; i += 3) {
      this.snowPositions[i] = (Math.random() - 0.5) * 45;
      this.snowPositions[i + 1] = Math.random() * 32;
      this.snowPositions[i + 2] = (Math.random() - 0.5) * 45;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.38,
      transparent: true,
      opacity: 0,
    });
    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.weatherGroup.add(this.snowParticles);

    scene.add(this.weatherGroup);
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, isColdBiome: boolean): void {
    const dt = Math.min(deltaTime, 0.1);
    this.weather.durationLeft -= dt;

    // Wind dynamics
    this.weather.windAngle += dt * 0.02;

    if (this.weather.durationLeft <= 0) {
      // Pick next weather
      const rand = Math.random();
      if (rand < 0.50) {
        this.weather.type = 'clear';
        this.weather.intensity = 0;
        this.weather.windSpeed = 1.5;
      } else if (rand < 0.80) {
        this.weather.type = isColdBiome ? 'snow' : 'rain';
        this.weather.intensity = 0.8;
        this.weather.windSpeed = 3.5;
      } else {
        this.weather.type = 'storm';
        this.weather.intensity = 1.0;
        this.weather.windSpeed = 6.0;
      }
      this.weather.durationLeft = 120 + Math.random() * 120;
    }

    // Lightning strike logic during storms
    if (this.weather.type === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        if (Math.random() < 0.15) {
          this.isLightningFlash = true;
          this.lightningTimer = 0.15; // 150ms flash
        } else {
          this.isLightningFlash = false;
          this.lightningTimer = 3.0 + Math.random() * 8.0;
        }
      } else if (this.isLightningFlash && this.lightningTimer < 0.05) {
        this.isLightningFlash = false;
      }
    } else {
      this.isLightningFlash = false;
    }

    this.weatherGroup.position.copy(playerPos);

    // Wind offset vectors
    const windDx = Math.cos(this.weather.windAngle) * this.weather.windSpeed * dt * 0.8;
    const windDz = Math.sin(this.weather.windAngle) * this.weather.windSpeed * dt * 0.8;

    // Update Rain
    const rainMat = this.rainParticles.material as THREE.PointsMaterial;
    const isRaining = this.weather.type === 'rain' || this.weather.type === 'storm';
    rainMat.opacity = THREE.MathUtils.lerp(rainMat.opacity, isRaining ? 0.78 : 0, dt * 2.0);

    if (rainMat.opacity > 0.05) {
      const pos = this.rainParticles.geometry.attributes.position.array as Float32Array;
      const speed = this.weather.type === 'storm' ? 34 : 22;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += windDx * 2.0;
        pos[i + 1] -= dt * speed;
        pos[i + 2] += windDz * 2.0;

        if (pos[i + 1] < -5) {
          pos[i] = (Math.random() - 0.5) * 45;
          pos[i + 1] = 28;
          pos[i + 2] = (Math.random() - 0.5) * 45;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Update Snow
    const snowMat = this.snowParticles.material as THREE.PointsMaterial;
    const isSnowing = this.weather.type === 'snow';
    snowMat.opacity = THREE.MathUtils.lerp(snowMat.opacity, isSnowing ? 0.88 : 0, dt * 2.0);

    if (snowMat.opacity > 0.05) {
      const pos = this.snowParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += windDx + Math.sin(Date.now() * 0.002 + i) * 0.03;
        pos[i + 1] -= dt * 4.8;
        pos[i + 2] += windDz + Math.cos(Date.now() * 0.002 + i) * 0.03;

        if (pos[i + 1] < -5) {
          pos[i] = (Math.random() - 0.5) * 45;
          pos[i + 1] = 28;
          pos[i + 2] = (Math.random() - 0.5) * 45;
        }
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.scene.remove(this.weatherGroup);
    this.rainParticles.geometry.dispose();
    (this.rainParticles.material as THREE.Material).dispose();
    this.snowParticles.geometry.dispose();
    (this.snowParticles.material as THREE.Material).dispose();
  }
}
