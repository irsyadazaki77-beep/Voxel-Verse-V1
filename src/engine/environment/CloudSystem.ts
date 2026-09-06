// Stylized Volumetric Voxel Cloud System 4.0
// Features: Instanced tiered voxel cloud geometry, custom shader lighting (top highlight, dark underside, sun-facing rim), horizon fade & cloud shadow drift
import * as THREE from 'three';
import { WeatherState } from '../../types';

export class CloudSystem {
  public cloudGroup: THREE.Group;
  public cloudMaterial: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private cloudFormationCenters: { x: number; z: number; y: number }[] = [];
  private formationOffsets: { fIndex: number; localX: number; localY: number; localZ: number; scaleX: number; scaleY: number; scaleZ: number }[] = [];
  
  public cloudDrift: number = 0;
  private currentBaseColor = new THREE.Color(0xfcfdff);
  private currentUndersideColor = new THREE.Color(0x7687a2);
  private currentHighlightColor = new THREE.Color(0xfff7ea);
  private dummy = new THREE.Object3D();

  private static readonly _scratchTargetBase = new THREE.Color();
  private static readonly _scratchTargetUnderside = new THREE.Color();
  private static readonly _scratchTargetHighlight = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();

    // Shader-based voxel cloud lighting
    this.cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uBaseColor: { value: this.currentBaseColor },
        uUndersideColor: { value: this.currentUndersideColor },
        uHighlightColor: { value: this.currentHighlightColor },
        uHorizonRadius: { value: 275.0 },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uOpacity: { value: 0.88 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDist;
        uniform vec3 uCameraPos;

        void main() {
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
          vDist = length(worldPos.xz - uCameraPos.xz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uBaseColor;
        uniform vec3 uUndersideColor;
        uniform vec3 uHighlightColor;
        uniform float uHorizonRadius;
        uniform float uOpacity;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDist;

        void main() {
          // Voxel Top / Bottom / Side Lighting
          float topFactor = clamp(vNormal.y, 0.0, 1.0);
          float bottomFactor = clamp(-vNormal.y, 0.0, 1.0);
          
          // Side lighting based on sun angle
          float sunSide = max(0.0, dot(vNormal, normalize(uSunDirection)));
          
          // Compose cloud diffuse tone
          vec3 cloudCol = uBaseColor;
          // Dark underside shadow
          cloudCol = mix(cloudCol, uUndersideColor, bottomFactor * 0.78);
          // Bright illuminated top
          cloudCol = mix(cloudCol, uHighlightColor, topFactor * 0.45);
          // Sun-facing rim highlight
          cloudCol += uHighlightColor * sunSide * 0.28;

          // Horizon radial falloff (prevents abrupt edge pop-in)
          float horizonFade = 1.0 - smoothstep(180.0, uHorizonRadius, vDist);
          float alpha = uOpacity * horizonFade;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(cloudCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    this.generateTieredVoxelDeck();
    this.scene.add(this.cloudGroup);
  }

  private generateTieredVoxelDeck(): void {
    const formationCount = 16;
    const radius = 260;

    // Structure for stepped stylized voxel formations
    this.cloudFormationCenters = [];
    this.formationOffsets = [];

    let totalBoxes = 0;
    for (let f = 0; f < formationCount; f++) {
      const angle = (f / formationCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 60 + Math.random() * (radius - 80);
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = 94 + (Math.random() - 0.5) * 6;

      this.cloudFormationCenters.push({ x: cx, y: cy, z: cz });

      // Each formation has a main slab, 2-3 mid tiers, and 1-2 top caps (classic stylized voxel cloud)
      // 1. Central base slab
      this.formationOffsets.push({
        fIndex: f,
        localX: 0,
        localY: 0,
        localZ: 0,
        scaleX: 24 + Math.random() * 12,
        scaleY: 5 + Math.random() * 2,
        scaleZ: 18 + Math.random() * 10,
      });
      totalBoxes++;

      // 2. Secondary stepped blocks
      const stepCount = 4 + Math.floor(Math.random() * 4);
      for (let s = 0; s < stepCount; s++) {
        const ox = (Math.random() - 0.5) * 20;
        const oz = (Math.random() - 0.5) * 16;
        const oy = (Math.random() > 0.4 ? 3 : -1);
        this.formationOffsets.push({
          fIndex: f,
          localX: ox,
          localY: oy,
          localZ: oz,
          scaleX: 12 + Math.random() * 10,
          scaleY: 4 + Math.random() * 2,
          scaleZ: 10 + Math.random() * 8,
        });
        totalBoxes++;
      }
    }

    // Single unit cube geometry instanced across all cloud blocks
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.instancedMesh = new THREE.InstancedMesh(unitBox, this.cloudMaterial, totalBoxes);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = false;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.updateInstanceTransforms();
    this.cloudGroup.add(this.instancedMesh);
  }

  private updateInstanceTransforms(): void {
    if (!this.instancedMesh) return;

    for (let i = 0; i < this.formationOffsets.length; i++) {
      const off = this.formationOffsets[i];
      const fc = this.cloudFormationCenters[off.fIndex];
      this.dummy.position.set(
        fc.x + off.localX,
        fc.y + off.localY,
        fc.z + off.localZ
      );
      this.dummy.scale.set(off.scaleX, off.scaleY, off.scaleZ);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, weather: WeatherState, timeOfDay: number = 12.0, sunDir?: THREE.Vector3): void {
    if (!this.cloudGroup.visible || !this.instancedMesh) return;

    // Center cloud deck with player
    this.cloudGroup.position.x = playerPos.x;
    this.cloudGroup.position.z = playerPos.z;
    this.cloudMaterial.uniforms.uCameraPos.value.copy(playerPos);

    // Wind drift across sky
    const windSpeed = (weather.windSpeed || 2.0) * deltaTime * 2.2;
    const dx = Math.cos(weather.windAngle || 0.5) * windSpeed;
    const dz = Math.sin(weather.windAngle || 0.5) * windSpeed;

    this.cloudDrift += deltaTime * 0.08 * (weather.windSpeed || 2.0);

    const boundary = 280;
    for (const fc of this.cloudFormationCenters) {
      fc.x += dx;
      fc.z += dz;
      if (fc.x > boundary) fc.x -= boundary * 2;
      if (fc.x < -boundary) fc.x += boundary * 2;
      if (fc.z > boundary) fc.z -= boundary * 2;
      if (fc.z < -boundary) fc.z += boundary * 2;
    }
    this.updateInstanceTransforms();

    // Atmosphere and Weather Color Adaptation
    const isSunset = timeOfDay >= 16.5 && timeOfDay < 19.0;
    const isDawn = timeOfDay >= 5.0 && timeOfDay < 7.5;
    const isNight = timeOfDay < 5.0 || timeOfDay >= 19.0;

    const targetBase = CloudSystem._scratchTargetBase.setHex(0xf6f9ff);
    const targetUnderside = CloudSystem._scratchTargetUnderside.setHex(0x71829e);
    const targetHighlight = CloudSystem._scratchTargetHighlight.setHex(0xfffaf0);
    let targetOpacity = 0.88;

    if (weather.type === 'storm') {
      targetBase.setRGB(0.26, 0.28, 0.36);
      targetUnderside.setRGB(0.14, 0.15, 0.22);
      targetHighlight.setRGB(0.38, 0.40, 0.48);
      targetOpacity = 0.96;
    } else if (weather.type === 'rain') {
      targetBase.setRGB(0.58, 0.62, 0.70);
      targetUnderside.setRGB(0.32, 0.36, 0.45);
      targetHighlight.setRGB(0.72, 0.76, 0.82);
      targetOpacity = 0.92;
    } else if (weather.type === 'snow') {
      targetBase.setRGB(0.88, 0.90, 0.95);
      targetUnderside.setRGB(0.55, 0.60, 0.70);
      targetHighlight.setRGB(0.96, 0.98, 1.0);
      targetOpacity = 0.90;
    } else if (isSunset) {
      targetBase.setRGB(0.96, 0.68, 0.52);
      targetUnderside.setRGB(0.42, 0.28, 0.48);
      targetHighlight.setRGB(1.0, 0.78, 0.50); // Warm apricot sunset rim
    } else if (isDawn) {
      targetBase.setRGB(0.96, 0.75, 0.62);
      targetUnderside.setRGB(0.40, 0.32, 0.50);
      targetHighlight.setRGB(1.0, 0.85, 0.65);
    } else if (isNight) {
      targetBase.setRGB(0.15, 0.18, 0.28);
      targetUnderside.setRGB(0.08, 0.10, 0.16);
      targetHighlight.setRGB(0.45, 0.55, 0.75); // Lunar silver edge
      targetOpacity = 0.80;
    }

    this.currentBaseColor.lerp(targetBase, deltaTime * 2.5);
    this.currentUndersideColor.lerp(targetUnderside, deltaTime * 2.5);
    this.currentHighlightColor.lerp(targetHighlight, deltaTime * 2.5);

    this.cloudMaterial.uniforms.uBaseColor.value.copy(this.currentBaseColor);
    this.cloudMaterial.uniforms.uUndersideColor.value.copy(this.currentUndersideColor);
    this.cloudMaterial.uniforms.uHighlightColor.value.copy(this.currentHighlightColor);
    this.cloudMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(this.cloudMaterial.uniforms.uOpacity.value, targetOpacity, deltaTime * 2.0);

    if (sunDir) {
      this.cloudMaterial.uniforms.uSunDirection.value.copy(sunDir);
    }
  }

  public setVisible(visible: boolean): void {
    this.cloudGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.cloudGroup);
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      this.instancedMesh = null;
    }
    this.cloudMaterial.dispose();
  }
}
