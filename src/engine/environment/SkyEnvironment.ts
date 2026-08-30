// Dynamic Day/Night Celestial Dome, Sun/Moon Orbit, Aurora & Atmospheric Cave Lighting
import * as THREE from 'three';
import { BiomeDef } from '../../types';
import { EnvironmentAtmosphereEngine, VisualProfile } from './EnvironmentVisualProfile';

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
    this.sunLight.shadow.camera.far = 180;
    const d = 38;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.035;
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
    const skyGeo = new THREE.SphereGeometry(320, 20, 20);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x66aaff, side: THREE.BackSide });
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
    let bounds = 38;

    if (quality === 'low') {
      mapSize = 512;
      bounds = 25;
    } else if (quality === 'medium') {
      mapSize = 1024;
      bounds = 38;
    } else if (quality === 'high') {
      mapSize = 2048;
      bounds = 52;
    } else if (quality === 'ultra') {
      mapSize = 4096;
      bounds = 75;
    }

    this.sunLight.shadow.mapSize.width = mapSize;
    this.sunLight.shadow.mapSize.height = mapSize;
    this.sunLight.shadow.camera.left = -bounds;
    this.sunLight.shadow.camera.right = bounds;
    this.sunLight.shadow.camera.top = bounds;
    this.sunLight.shadow.camera.bottom = -bounds;
    this.sunLight.shadow.camera.updateProjectionMatrix();
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, currentBiome?: BiomeDef): void {
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

    this.sunLight.position.set(sunX, Math.max(12, sunY), sunZ);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

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

      sunIntensity = 0.4 + t * 0.85;
      ambientIntensity = profile.ambientIntensity * (0.6 + t * 0.4);
      hemiIntensity = 0.35 + t * 0.15;
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

      sunIntensity = profile.sunIntensity * (1.0 - t * 0.8);
      ambientIntensity = profile.ambientIntensity * (1.0 - t * 0.5);
      hemiIntensity = 0.48 - t * 0.28;
      starOpacity = t * 0.9;
      this.sunLight.color.setHex(0xff7744);
      this.hemiLight.color.setHex(0xdd6699);
      this.hemiLight.groundColor.setHex(0x332244);
    } else {
      // Starry Night
      skyColor.setRGB(...profile.skyColorNight);
      fogColor.setRGB(...profile.fogColorNight);
      sunIntensity = 0.20; // Soft Moonlight
      ambientIntensity = profile.ambientIntensity * 0.45;
      hemiIntensity = 0.18;
      starOpacity = 1.0;
      this.sunLight.color.setHex(0x99bbff);
      this.hemiLight.color.setHex(0x223366);
      this.hemiLight.groundColor.setHex(0x050510);

      if (currentBiome && currentBiome.temperature < -0.2) {
        auroraOpacity = 0.75;
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

    // Apply colors to scene & materials
    (this.skyDomeMesh.material as THREE.MeshBasicMaterial).color.copy(skyColor);
    (this.starsParticles.material as THREE.PointsMaterial).opacity = starOpacity;
    (this.auroraParticles.material as THREE.PointsMaterial).opacity = auroraOpacity;

    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;
    this.hemiLight.intensity = hemiIntensity;

    if (this.scene.fog) {
      this.scene.fog.color.copy(fogColor);
      if (this.scene.fog instanceof THREE.FogExp2) {
        const baseDensity = profile.fogDensity || 0.010;
        const caveMultiplier = playerPos.y < 32 ? (1.0 + (32 - playerPos.y) * 0.07) : 1.0;
        this.scene.fog.density = baseDensity * caveMultiplier;
      }
    }
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
