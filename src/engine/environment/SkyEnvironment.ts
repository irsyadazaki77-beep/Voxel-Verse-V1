// Dynamic Day/Night Celestial Dome, Sun/Moon Orbit, Aurora & Atmospheric Cave Lighting
import * as THREE from 'three';
import { BiomeDef } from '../../types';
import { EnvironmentAtmosphereEngine, VisualProfile } from './EnvironmentVisualProfile';
import { AetherAnomalyManager } from '../anomaly/AetherAnomalyManager';

import { WeatherState } from '../../types';

export class SkyEnvironment {
  public scene: THREE.Scene;
  public timeOfDay: number = 6.0; // 0 to 24 hours
  public timeScale: number = 0.05; // 1 real sec = 0.05 game hours

  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public starsParticles: THREE.Points;
  public auroraParticles: THREE.Points;
  public skyDomeMesh: THREE.Mesh;

  public isNight: boolean = false;
  private currentShadowQuality: string = 'medium';
  private currentProfile: VisualProfile = EnvironmentAtmosphereEngine.getProfile('plains');

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Directional Sun / Moon Light with Soft Shadows
    this.sunLight = new THREE.DirectionalLight(0xfff8e7, 1.25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 160;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 2. Ambient & Hemisphere Light Fill
    this.ambientLight = new THREE.AmbientLight(0xddeeff, 0.40);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x554433, 0.48);
    this.scene.add(this.hemiLight);

    // 3. Sun Orb (Voxel Stylized Diamond Box)
    const sunGeo = new THREE.BoxGeometry(8, 8, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3aa });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // 4. Moon Orb
    const moonGeo = new THREE.BoxGeometry(6.5, 6.5, 6.5);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // 5. Starfield Dome
    const starCount = 850;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(r * Math.cos(phi));
      starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, transparent: true, opacity: 0 });
    this.starsParticles = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsParticles);

    // 6. Aurora Borealis Particles (Cold region night feature)
    const auroraCount = 240;
    const auroraPositions = new Float32Array(auroraCount * 3);
    for (let i = 0; i < auroraCount * 3; i += 3) {
      auroraPositions[i] = (Math.random() - 0.5) * 320;
      auroraPositions[i + 1] = 160 + Math.random() * 45;
      auroraPositions[i + 2] = (Math.random() - 0.5) * 320;
    }
    const auroraGeo = new THREE.BufferGeometry();
    auroraGeo.setAttribute('position', new THREE.BufferAttribute(auroraPositions, 3));
    const auroraMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 16.0,
      transparent: true,
      opacity: 0,
    });
    this.auroraParticles = new THREE.Points(auroraGeo, auroraMat);
    this.scene.add(this.auroraParticles);

    // 7. Sky Dome Mesh for gradient background
    const skyGeo = new THREE.SphereGeometry(320, 32, 16); // slightly higher res for smooth gradient
    const skyShader = {
      uniforms: {
        topColor: { value: new THREE.Color(0x66aaff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        horizonColor: { value: new THREE.Color(0x142238) },
        moonDirection: { value: new THREE.Vector3(0, 1, 0) },
        nightFactor: { value: 0.0 },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform vec3 moonDirection;
        uniform float nightFactor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          vec3 normPos = normalize(vWorldPosition);
          float h = normalize(vWorldPosition + offset).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);

          vec3 daySky = mix(bottomColor, topColor, t);

          // Night atmosphere: Zenith (topColor), Mid-Sky, and slightly brighter luminous Horizon Band
          // Horizon band peaks right at horizon (h near 0.0 to 0.25) to provide silhouette separation
          float horizonBand = exp(-pow(max(h, 0.0) * 4.2, 2.0));
          vec3 nightSky = mix(bottomColor, topColor, t);
          nightSky = mix(nightSky, horizonColor, horizonBand * 0.58);

          // Subtle Moon directional glow in sky dome
          float moonDot = max(0.0, dot(normPos, normalize(moonDirection)));
          float moonGlow = pow(moonDot, 20.0) * 0.30 * nightFactor;
          nightSky += vec3(0.55, 0.72, 1.0) * moonGlow;

          vec3 finalSky = mix(daySky, nightSky, nightFactor);
          gl_FragColor = vec4(finalSky, 1.0);
        }
      `
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(skyShader.uniforms),
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide,
      fog: false
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDomeMesh);
  }

  public setShadowQuality(quality: 'off' | 'low' | 'medium' | 'high' | 'ultra'): void {
    if (this.currentShadowQuality === quality) return;
    this.currentShadowQuality = quality;

    if (quality === 'off') {
      this.sunLight.castShadow = false;
      return;
    }

    this.sunLight.castShadow = true;
    let mapSize = 1024;
    let bounds = 32;

    if (quality === 'low') {
      mapSize = 512;
      bounds = 20;
    } else if (quality === 'medium') {
      mapSize = 1024;
      bounds = 30;
    } else if (quality === 'high') {
      mapSize = 2048;
      bounds = 35;
    } else if (quality === 'ultra') {
      mapSize = 2048;
      bounds = 42;
    }

    this.sunLight.shadow.mapSize.width = mapSize;
    this.sunLight.shadow.mapSize.height = mapSize;
    this.sunLight.shadow.camera.left = -bounds;
    this.sunLight.shadow.camera.right = bounds;
    this.sunLight.shadow.camera.top = bounds;
    this.sunLight.shadow.camera.bottom = -bounds;
    this.sunLight.shadow.camera.updateProjectionMatrix();
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, currentBiome?: BiomeDef, isEyesInWater: boolean = false, currentWeather: WeatherState | null = null): void {
    // Advance time
    this.timeOfDay = (this.timeOfDay + deltaTime * this.timeScale) % 24;
    const profile = EnvironmentAtmosphereEngine.getProfile(currentBiome?.id);
    this.currentProfile = profile;

    // Calculate solar angle (-PI to +PI)
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    this.isNight = this.timeOfDay < 5.2 || this.timeOfDay > 18.8;

    // Celestial Orbit Positions
    const dist = 240;
    const sunX = playerPos.x + Math.cos(sunAngle) * dist;
    const sunY = playerPos.y + Math.sin(sunAngle) * dist;
    const sunZ = playerPos.z + Math.sin(sunAngle * 0.5) * 40;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.moonMesh.position.set(
      playerPos.x - Math.cos(sunAngle) * dist,
      playerPos.y - Math.sin(sunAngle) * dist,
      playerPos.z - Math.sin(sunAngle * 0.5) * 40
    );

    // Texel Snapping for Zero Shadow Shimmering
    const mapSize = this.sunLight.shadow.mapSize.width || 2048;
    const bounds = this.sunLight.shadow.camera.right || 40;
    const texelSize = (bounds * 2.0) / mapSize;

    // Project player position onto light orientation and snap
    const lightDir = new THREE.Vector3().subVectors(this.sunLight.position, playerPos).normalize();
    const shadowTarget = playerPos.clone();
    
    // Snap target coordinates in world space along orthogonal axes
    shadowTarget.x = Math.floor(shadowTarget.x / texelSize) * texelSize;
    shadowTarget.y = Math.floor(shadowTarget.y / texelSize) * texelSize;
    shadowTarget.z = Math.floor(shadowTarget.z / texelSize) * texelSize;

    this.sunLight.target.position.copy(shadowTarget);
    this.sunLight.target.updateMatrixWorld();

    // Celestial Directional Light Orientation:
    // When Sun is above horizon (daytime), light shines from Sun.
    // When Sun is below horizon (night), light shines from Moon high in the sky!
    const sunElevation = Math.sin(sunAngle);
    let lightX: number;
    let lightY: number;
    let lightZ: number;

    if (sunElevation >= -0.05) {
      // Day / Golden Hour / Twilight: Light shines from Sun
      lightX = shadowTarget.x + Math.cos(sunAngle) * dist;
      lightY = Math.max(shadowTarget.y + 16, shadowTarget.y + sunElevation * dist);
      lightZ = shadowTarget.z + Math.sin(sunAngle * 0.5) * 40;
    } else {
      // Night: Directional light tracks the MOON high in the night sky!
      const moonElev = -sunElevation;
      lightX = shadowTarget.x - Math.cos(sunAngle) * dist;
      lightY = Math.max(shadowTarget.y + 35, shadowTarget.y + moonElev * dist);
      lightZ = shadowTarget.z - Math.sin(sunAngle * 0.5) * 40;
    }

    this.sunLight.position.set(lightX, lightY, lightZ);

    this.starsParticles.position.copy(playerPos);
    this.auroraParticles.position.copy(playerPos);
    this.skyDomeMesh.position.copy(playerPos);

    // Dynamic Atmosphere interpolation
    let skyColor = new THREE.Color();
    let fogColor = new THREE.Color();
    let sunIntensity = profile.sunIntensity;
    let ambientIntensity = profile.ambientIntensity;
    let hemiIntensity = 0.48;
    let starOpacity = 0.0;
    let auroraOpacity = 0.0;

    if (this.timeOfDay >= 5.0 && this.timeOfDay < 7.5) {
      // Dawn / Sunrise
      const t = (this.timeOfDay - 5.0) / 2.5;
      const c1 = new THREE.Color(...profile.skyColorSunset);
      const c2 = new THREE.Color(...profile.skyColorDay);
      skyColor.copy(c1).lerp(c2, t);

      const f1 = new THREE.Color(...profile.fogColorSunset);
      const f2 = new THREE.Color(...profile.fogColorDay);
      fogColor.copy(f1).lerp(f2, t);

      sunIntensity = 0.46 * (1.0 - t) + profile.sunIntensity * t;
      ambientIntensity = 0.32 * (1.0 - t) + profile.ambientIntensity * t;
      hemiIntensity = 0.32 + t * 0.16;
      starOpacity = (1.0 - t) * 0.7;
      this.sunLight.color.setHex(0xffaa77);
      this.hemiLight.color.setHex(0xffbb99);
      this.hemiLight.groundColor.setHex(0x553322);
    } else if (this.timeOfDay >= 7.5 && this.timeOfDay < 16.5) {
      // Daytime
      skyColor.setRGB(...profile.skyColorDay);
      fogColor.setRGB(...profile.fogColorDay);
      sunIntensity = profile.sunIntensity;
      ambientIntensity = profile.ambientIntensity;
      hemiIntensity = 0.50;
      starOpacity = 0.0;
      this.sunLight.color.setHex(profile.sunColor);
      this.hemiLight.color.setHex(profile.hemiColor);
      this.hemiLight.groundColor.setHex(profile.hemiGroundColor);
    } else if (this.timeOfDay >= 16.5 && this.timeOfDay < 19.0) {
      // Golden Hour & Sunset
      const t = (this.timeOfDay - 16.5) / 2.5;
      const c1 = new THREE.Color(...profile.skyColorDay);
      const c2 = new THREE.Color(...profile.skyColorSunset);
      skyColor.copy(c1).lerp(c2, t);

      const f1 = new THREE.Color(...profile.fogColorDay);
      const f2 = new THREE.Color(...profile.fogColorSunset);
      fogColor.copy(f1).lerp(f2, t);

      sunIntensity = profile.sunIntensity * (1.0 - t * 0.65);
      ambientIntensity = profile.ambientIntensity * (1.0 - t * 0.25);
      hemiIntensity = 0.48 - t * 0.16;
      starOpacity = t * 0.9;
      this.sunLight.color.setHex(0xff7744);
      this.hemiLight.color.setHex(0xdd6699);
      this.hemiLight.groundColor.setHex(0x281c34);
    } else {
      // Starry Night
      skyColor.setRGB(...profile.skyColorNight);
      fogColor.setRGB(...profile.fogColorNight);
      
      // Target: Balanced, moody, atmospheric & readable moonlight
      sunIntensity = 0.46; // Clear Moonlight (Directional shaping & silhouette)
      ambientIntensity = Math.max(0.32, profile.ambientIntensity * 0.82); // Elevated fill to eliminate crushed black
      hemiIntensity = 0.32; // Sky-to-ground fill
      starOpacity = 1.0;

      // Cool desaturated blue moonlight (#9BB7FF / 0x9bb7ff)
      this.sunLight.color.setHex(0x9bb7ff);
      // Sky bounce: Cool atmospheric indigo-blue
      this.hemiLight.color.setHex(0x405a88);
      // Ground bounce: Dark slate-navy (Never pure black 0x050510!)
      this.hemiLight.groundColor.setHex(0x182234);

      if (currentBiome && currentBiome.temperature < -0.2) {
        auroraOpacity = 0.75;
        // Snow reflectance boost: snow albedo bounces moonlight into shadows
        ambientIntensity *= 1.20;
        hemiIntensity *= 1.18;
      }
    }
    
    // Weather effects on lighting
    if (currentWeather && currentWeather.intensity > 0.05) {
      const weatherIntensity = currentWeather.intensity;
      if (currentWeather.type === 'rain' || currentWeather.type === 'snow') {
        sunIntensity *= (1.0 - weatherIntensity * 0.35);
        ambientIntensity *= (1.0 + weatherIntensity * 0.15); // diffuse scattered bounce
        skyColor.lerp(new THREE.Color(0x283850), weatherIntensity * 0.5);
        fogColor.lerp(new THREE.Color(0x30425c), weatherIntensity * 0.6);
      } else if (currentWeather.type === 'storm') {
        sunIntensity *= (1.0 - weatherIntensity * 0.6);
        ambientIntensity = Math.max(0.24, ambientIntensity * (1.0 - weatherIntensity * 0.25));
        hemiIntensity = Math.max(0.22, hemiIntensity * (1.0 - weatherIntensity * 0.25));
        skyColor.lerp(new THREE.Color(0x161d2c), weatherIntensity * 0.75);
        fogColor.lerp(new THREE.Color(0x1e2738), weatherIntensity * 0.80);
      }
    }

    // Underground Deep Cave Atmosphere (Y < 32)
    if (playerPos.y < 32) {
      const caveFactor = Math.min(1.0, (32 - playerPos.y) / 18.0);
      ambientIntensity = THREE.MathUtils.lerp(ambientIntensity, 0.10, caveFactor);
      hemiIntensity = THREE.MathUtils.lerp(hemiIntensity, 0.06, caveFactor);
      sunIntensity = THREE.MathUtils.lerp(sunIntensity, 0.02, caveFactor);
      fogColor.lerp(new THREE.Color(0x05070d), caveFactor);
    }

    // Blend with Aether Anomaly violet profile if active
    const anomalyIntensity = (AetherAnomalyManager && AetherAnomalyManager.activeIntensity) ? AetherAnomalyManager.activeIntensity : 0;
    if (anomalyIntensity > 0) {
      const anomalyViolet = new THREE.Color(0x3e185e); // Beautiful violet/indigo tone
      skyColor.lerp(anomalyViolet, anomalyIntensity);
      fogColor.lerp(new THREE.Color(0x180829), anomalyIntensity);
      
      // Drains daylight intensity and increases dark atmospheric light
      sunIntensity *= (1 - anomalyIntensity * 0.65);
      ambientIntensity = THREE.MathUtils.lerp(ambientIntensity, 0.12, anomalyIntensity);
      hemiIntensity = THREE.MathUtils.lerp(hemiIntensity, 0.08, anomalyIntensity);
    }

    // Water 3.0: Underwater Atmosphere Override when player eyes are submerged
    if (isEyesInWater) {
      const underwaterAqua = new THREE.Color(0x0b4f6c);
      const underwaterSky = new THREE.Color(0x073347);
      skyColor.copy(underwaterSky);
      fogColor.copy(underwaterAqua);
      sunIntensity *= 0.35;
      ambientIntensity = 0.55;
      hemiIntensity = 0.35;
      starOpacity = 0.0;
      auroraOpacity = 0.0;
    }

    // Apply colors to scene & materials
    const skyMat = this.skyDomeMesh.material as THREE.ShaderMaterial;
    if (skyMat.uniforms) {
      skyMat.uniforms.topColor.value.copy(skyColor);
      skyMat.uniforms.bottomColor.value.copy(fogColor); // use fogColor for horizon to blend seamlessly

      // Horizon band color: slightly brighter desaturated cyan-blue for silhouette readability
      const horizonCol = fogColor.clone().multiplyScalar(1.25);
      horizonCol.r = Math.min(1.0, horizonCol.r * 0.95 + 0.02);
      horizonCol.g = Math.min(1.0, horizonCol.g * 1.05 + 0.04);
      horizonCol.b = Math.min(1.0, horizonCol.b * 1.15 + 0.08);
      skyMat.uniforms.horizonColor.value.copy(horizonCol);

      const moonDir = new THREE.Vector3().subVectors(this.moonMesh.position, playerPos).normalize();
      skyMat.uniforms.moonDirection.value.copy(moonDir);

      const nightFactor = this.isNight ? 1.0 : (this.timeOfDay > 17.0 && this.timeOfDay <= 18.8 ? (this.timeOfDay - 17.0) / 1.8 : (this.timeOfDay >= 4.5 && this.timeOfDay < 6.0 ? (6.0 - this.timeOfDay) / 1.5 : 0.0));
      skyMat.uniforms.nightFactor.value = THREE.MathUtils.clamp(nightFactor, 0.0, 1.0);
    }
    
    (this.starsParticles.material as THREE.PointsMaterial).opacity = starOpacity;
    (this.auroraParticles.material as THREE.PointsMaterial).opacity = auroraOpacity;

    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;
    this.hemiLight.intensity = hemiIntensity;

    if (this.scene.fog) {
      this.scene.fog.color.copy(fogColor);
      if (this.scene.fog instanceof THREE.FogExp2) {
        if (isEyesInWater) {
          this.scene.fog.density = 0.045;
        } else {
          const baseDensity = profile.fogDensity || 0.010;
          const caveMultiplier = playerPos.y < 32 ? (1.0 + (32 - playerPos.y) * 0.07) : 1.0;
          this.scene.fog.density = baseDensity * caveMultiplier;
        }
      }
    }
  }

  public updateShadowSettings(enabled: boolean, mapSize: number = 1024): void {
    this.sunLight.castShadow = enabled;
    if (enabled) {
      if (this.sunLight.shadow.mapSize.width !== mapSize) {
        this.sunLight.shadow.mapSize.width = mapSize;
        this.sunLight.shadow.mapSize.height = mapSize;
        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
          this.sunLight.shadow.map = null;
        }
      }
    } else {
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = ((time % 24) + 24) % 24;
  }

  public cycleTime(): number {
    const current = this.timeOfDay;
    let next = 12.0;
    if (current >= 9.0 && current < 17.5) next = 18.5; // Sunset
    else if (current >= 17.5 && current < 20.5) next = 21.5; // Early Night
    else if (current >= 20.5 || current < 1.0) next = 0.0; // Midnight
    else if (current >= 1.0 && current < 4.5) next = 3.5; // Late Night
    else if (current >= 4.5 && current < 6.5) next = 5.75; // Dawn
    else next = 12.0; // Noon
    this.setTimeOfDay(next);
    return next;
  }

  public dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemiLight);
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.starsParticles);
    this.scene.remove(this.auroraParticles);
    this.scene.remove(this.skyDomeMesh);

    this.sunMesh.geometry.dispose();
    (this.sunMesh.material as THREE.Material).dispose();
    this.moonMesh.geometry.dispose();
    (this.moonMesh.material as THREE.Material).dispose();
    this.starsParticles.geometry.dispose();
    (this.starsParticles.material as THREE.Material).dispose();
    this.auroraParticles.geometry.dispose();
    (this.auroraParticles.material as THREE.Material).dispose();
    this.skyDomeMesh.geometry.dispose();
    (this.skyDomeMesh.material as THREE.Material).dispose();
  }
}
