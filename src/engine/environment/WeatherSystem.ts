// Dynamic GPU Weather Engine 4.0
// Features: GPU Directional Streak Rain Shader with Wind Deflection, GPU Turbulent Snowflake Flurries, Controlled Storm Lightning (No Whiteout)
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

  public rainMesh: THREE.LineSegments;
  public snowMesh: THREE.Points;
  public weatherGroup: THREE.Group;
  public scene: THREE.Scene;

  public isLightningFlash: boolean = false;
  private lightningTimer: number = 0;
  private weatherTime: number = 0;

  private rainMaterial: THREE.ShaderMaterial;
  private snowMaterial: THREE.ShaderMaterial;

  private static readonly RAIN_STREAK_COUNT = 2400;
  private static readonly SNOW_FLAKE_COUNT = 1800;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.weatherGroup = new THREE.Group();

    // 1. GPU Directional Streak Rain System
    // Each streak is composed of 2 vertices (top: 0, bottom: 1)
    const rainStreakCount = WeatherSystem.RAIN_STREAK_COUNT;
    const rainPositions = new Float32Array(rainStreakCount * 2 * 3);
    const rainSeeds = new Float32Array(rainStreakCount * 2 * 3);
    const rainFactors = new Float32Array(rainStreakCount * 2);
    const rainLengths = new Float32Array(rainStreakCount * 2);

    for (let i = 0; i < rainStreakCount; i++) {
      const idx = i * 2;
      const sx = (Math.random() - 0.5) * 48.0;
      const sy = Math.random() * 32.0;
      const sz = (Math.random() - 0.5) * 48.0;
      const len = 1.2 + Math.random() * 1.4; // 1.2m - 2.6m varying streaks

      for (let v = 0; v < 2; v++) {
        const vIdx = (idx + v) * 3;
        rainPositions[vIdx] = 0;
        rainPositions[vIdx + 1] = 0;
        rainPositions[vIdx + 2] = 0;

        rainSeeds[vIdx] = sx;
        rainSeeds[vIdx + 1] = sy;
        rainSeeds[vIdx + 2] = sz;

        rainFactors[idx + v] = v === 0 ? 0.0 : 1.0;
        rainLengths[idx + v] = len;
      }
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(rainSeeds, 3));
    rainGeo.setAttribute('aStreakFactor', new THREE.BufferAttribute(rainFactors, 1));
    rainGeo.setAttribute('aStreakLength', new THREE.BufferAttribute(rainLengths, 1));

    this.rainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFallSpeed: { value: 26.0 },
        uWindVector: { value: new THREE.Vector3(0, 0, 0) },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uIntensity: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 aSeed;
        attribute float aStreakFactor;
        attribute float aStreakLength;
        uniform float uTime;
        uniform float uFallSpeed;
        uniform vec3 uWindVector;
        uniform vec3 uPlayerPos;
        uniform vec3 uCameraPos;
        uniform float uIntensity;
        varying float vAlpha;

        void main() {
          vec3 boxSize = vec3(48.0, 32.0, 48.0);
          vec3 basePos = aSeed;
          basePos.y -= uTime * uFallSpeed;
          basePos.xz += uWindVector.xz * (uTime * 0.7);

          // Continuous wrapping box centered around player
          vec3 localOffset = mod(basePos + boxSize * 0.5, boxSize) - boxSize * 0.5;
          vec3 streakCenter = uPlayerPos + localOffset;

          // Wind tilt deflection
          vec3 fallDir = normalize(vec3(uWindVector.x * 0.28, -1.0, uWindVector.z * 0.28));
          vec3 worldPos = streakCenter + fallDir * (aStreakFactor - 0.5) * aStreakLength;

          // Near and far camera fade
          float camDist = length(worldPos - uCameraPos);
          vAlpha = smoothstep(1.5, 3.5, camDist) * (1.0 - smoothstep(20.0, 24.0, camDist)) * uIntensity;

          gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.01) discard;
          vec3 rainColor = vec3(0.75, 0.88, 1.0);
          gl_FragColor = vec4(rainColor, vAlpha * 0.65);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.rainMesh = new THREE.LineSegments(rainGeo, this.rainMaterial);
    this.rainMesh.frustumCulled = false;
    this.weatherGroup.add(this.rainMesh);

    // 2. GPU Turbulent Snowflake Flurry System
    const snowCount = WeatherSystem.SNOW_FLAKE_COUNT;
    const snowSeeds = new Float32Array(snowCount * 3);
    const snowFlakeIds = new Float32Array(snowCount);
    const snowSizes = new Float32Array(snowCount);

    for (let i = 0; i < snowCount; i++) {
      const idx = i * 3;
      snowSeeds[idx] = (Math.random() - 0.5) * 48.0;
      snowSeeds[idx + 1] = Math.random() * 30.0;
      snowSeeds[idx + 2] = (Math.random() - 0.5) * 48.0;

      snowFlakeIds[i] = Math.random();
      snowSizes[i] = 0.22 + Math.random() * 0.28; // 0.22m - 0.50m varied snowflakes
    }

    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowSeeds, 3)); // initial dummy
    snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(snowSeeds, 3));
    snowGeo.setAttribute('aFlakeId', new THREE.BufferAttribute(snowFlakeIds, 1));
    snowGeo.setAttribute('aFlakeSize', new THREE.BufferAttribute(snowSizes, 1));

    this.snowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindVector: { value: new THREE.Vector3(0, 0, 0) },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uIntensity: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 aSeed;
        attribute float aFlakeId;
        attribute float aFlakeSize;
        uniform float uTime;
        uniform vec3 uWindVector;
        uniform vec3 uPlayerPos;
        uniform vec3 uCameraPos;
        uniform float uIntensity;
        varying float vAlpha;

        void main() {
          vec3 boxSize = vec3(48.0, 30.0, 48.0);
          vec3 basePos = aSeed;
          basePos.y -= uTime * 4.4;
          
          // Harmonic horizontal turbulence on GPU:
          basePos.x += uWindVector.x * (uTime * 0.5) + sin(basePos.y * 0.35 + uTime * 2.2 + aFlakeId * 12.0) * 0.65;
          basePos.z += uWindVector.z * (uTime * 0.5) + cos(basePos.y * 0.30 + uTime * 1.8 + aFlakeId * 10.0) * 0.65;

          vec3 localOffset = mod(basePos + boxSize * 0.5, boxSize) - boxSize * 0.5;
          vec3 worldPos = uPlayerPos + localOffset;

          float camDist = length(worldPos - uCameraPos);
          vAlpha = smoothstep(1.2, 3.0, camDist) * (1.0 - smoothstep(18.0, 24.0, camDist)) * uIntensity;

          vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aFlakeSize * (260.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.01) discard;
          // Soft circular stylized snowflake
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          float softEdge = 1.0 - smoothstep(0.20, 0.5, r);
          gl_FragColor = vec4(vec3(0.96, 0.98, 1.0), vAlpha * softEdge * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.snowMesh = new THREE.Points(snowGeo, this.snowMaterial);
    this.snowMesh.frustumCulled = false;
    this.weatherGroup.add(this.snowMesh);

    this.scene.add(this.weatherGroup);
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, isColdBiome: boolean): void {
    const dt = Math.min(deltaTime, 0.1);
    this.weatherTime += dt;
    this.weather.durationLeft -= dt;

    // Wind dynamics
    this.weather.windAngle += dt * 0.02;

    if (this.weather.durationLeft <= 0) {
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

    // Controlled Storm Lightning (never washed out, bounded transient duration)
    if (this.weather.type === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        if (Math.random() < 0.16) {
          this.isLightningFlash = true;
          this.lightningTimer = 0.14; // 140ms bounded flash
        } else {
          this.isLightningFlash = false;
          this.lightningTimer = 3.5 + Math.random() * 7.5;
        }
      } else if (this.isLightningFlash && this.lightningTimer < 0.04) {
        this.isLightningFlash = false;
      }
    } else {
      this.isLightningFlash = false;
    }

    // Wind vector calculation
    const windSpeed = this.weather.windSpeed || 2.0;
    const windX = Math.cos(this.weather.windAngle) * windSpeed;
    const windZ = Math.sin(this.weather.windAngle) * windSpeed;

    const isRaining = this.weather.type === 'rain' || this.weather.type === 'storm';
    const targetRainIntensity = isRaining ? this.weather.intensity : 0.0;
    const isSnowing = this.weather.type === 'snow';
    const targetSnowIntensity = isSnowing ? this.weather.intensity : 0.0;

    // Smoothly interpolate uniform intensities (GPU handles positions with zero CPU array loops!)
    const curRainInt = this.rainMaterial.uniforms.uIntensity.value;
    const newRainInt = THREE.MathUtils.lerp(curRainInt, targetRainIntensity, dt * 2.5);
    this.rainMaterial.uniforms.uIntensity.value = newRainInt;
    this.rainMaterial.uniforms.uTime.value = this.weatherTime;
    this.rainMaterial.uniforms.uFallSpeed.value = this.weather.type === 'storm' ? 36.0 : 26.0;
    this.rainMaterial.uniforms.uWindVector.value.set(windX, 0, windZ);
    this.rainMaterial.uniforms.uPlayerPos.value.copy(playerPos);
    this.rainMaterial.uniforms.uCameraPos.value.copy(playerPos);
    this.rainMesh.visible = newRainInt > 0.01;

    const curSnowInt = this.snowMaterial.uniforms.uIntensity.value;
    const newSnowInt = THREE.MathUtils.lerp(curSnowInt, targetSnowIntensity, dt * 2.5);
    this.snowMaterial.uniforms.uIntensity.value = newSnowInt;
    this.snowMaterial.uniforms.uTime.value = this.weatherTime;
    this.snowMaterial.uniforms.uWindVector.value.set(windX, 0, windZ);
    this.snowMaterial.uniforms.uPlayerPos.value.copy(playerPos);
    this.snowMaterial.uniforms.uCameraPos.value.copy(playerPos);
    this.snowMesh.visible = newSnowInt > 0.01;
  }

  public dispose(): void {
    this.scene.remove(this.weatherGroup);
    this.rainMesh.geometry.dispose();
    this.rainMaterial.dispose();
    this.snowMesh.geometry.dispose();
    this.snowMaterial.dispose();
  }
}
