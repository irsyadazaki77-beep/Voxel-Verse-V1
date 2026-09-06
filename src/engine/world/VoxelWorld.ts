import { CulturalRegionManager } from './CulturalRegionManager';
// Voxel World Engine: Procedural 3D Terrain, Texture Atlas, Streaming Chunks, Raycasting & World State
import * as THREE from 'three';
import { BlockType } from '../../types';
import { BiomeManager } from './BiomeManager';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './Chunk';
import { StructureGenerator } from './StructureGenerator';
import { TextureAtlas } from './TextureAtlas';
import { ChunkScheduler } from './ChunkScheduler';
import { WorldGeneratorCore } from './WorldGeneratorCore';
import { SEA_LEVEL, WORLD_PRESETS, WorldPreset, makeDimensionChunkKey } from './WorldConfig';
import { MiningVisualEngine } from './MiningVisualEngine';

export { SEA_LEVEL };

export interface RaycastHit {
  blockPos: [number, number, number];
  placePos: [number, number, number];
  blockType: BlockType;
  faceNormal: [number, number, number];
  distance: number;
}

export class VoxelWorld {
  public seed: number;
  public preset: WorldPreset;
  public dimensionId: string;
  public chunks: Map<string, Chunk> = new Map();
  public modifiedBlocks: Map<string, Map<string, BlockType>> = new Map(); // chunkKey -> localKey -> BlockType
  public worldGroup: THREE.Group;
  public biomeManager: BiomeManager;
  public regionManager: CulturalRegionManager;
  private generatorCore: WorldGeneratorCore;
  private aetherGenerator?: any; // To be implemented

  // Texture-mapped 3D Voxel Materials
  public solidMaterial: THREE.MeshStandardMaterial;
  public transMaterial: THREE.MeshStandardMaterial;
  public waterMaterial: THREE.MeshStandardMaterial;

  // Target Highlight Wireframe Box
  public highlightMesh: THREE.LineSegments;
  public previewMesh: THREE.Mesh;
  public scheduler: ChunkScheduler;

  constructor(seed: number = 42819, preset: WorldPreset = 'standard', dimensionId: string = 'overworld') {
    this.seed = seed;
    this.preset = preset;
    this.dimensionId = dimensionId;
    this.worldGroup = new THREE.Group();
    this.biomeManager = new BiomeManager(seed, dimensionId);
    this.regionManager = new CulturalRegionManager(seed);
    this.generatorCore = new WorldGeneratorCore(seed, preset, { dimensionId: this.dimensionId });
    this.scheduler = new ChunkScheduler(this);

    // Load procedural 16x16 pixel texture atlas
    const atlasTex = TextureAtlas.getAtlasTexture();

    // Stylized Voxel Standard Materials with Texture Mapping + Vertex AO
    this.solidMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
    });
    
    this.solidMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uCloudShadowDrift = { value: 0 };
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWetness = { value: 0 };
      shader.uniforms.uSnowAccumulation = { value: 0 };
      this.solidMaterial.userData.shader = shader;
      shader.vertexShader = `
        attribute vec2 localUv;
        attribute vec4 tileRect;
        attribute float materialClass;
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        varying vec3 vWorldPos;
        varying float vMaterialClass;
        varying vec3 vWorldNormal;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        vLocalUv = localUv;
        vTileRect = tileRect;
        vMaterialClass = materialClass;
        #include <begin_vertex>
        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = wPos.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        `
      );
      
      shader.fragmentShader = `
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        varying vec3 vWorldPos;
        varying float vMaterialClass;
        varying vec3 vWorldNormal;
        uniform float uCloudShadowDrift;
        uniform float uTime;
        uniform float uWetness;
        uniform float uSnowAccumulation;
        
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 localWrapped = fract(vLocalUv);
          vec2 atlasUv = mix(vTileRect.xy, vTileRect.zw, localWrapped);
          vec4 sampledDiffuseColor = texture2D( map, atlasUv );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec3 blockCoord = floor(vWorldPos + 0.5);
        float h = hash(blockCoord);
        
        float variation = (h - 0.5) * 0.06;
        diffuseColor.rgb *= (1.0 + variation);

        // MaterialClass Properties Resolver
        float roughnessVal = 0.85;
        float metalnessVal = 0.05;
        vec3 emissiveVal = vec3(0.0);
        
        int mClass = int(vMaterialClass + 0.5);
        if (mClass == 0) { // SOIL
          roughnessVal = mix(0.90, 0.70, uWetness);
          metalnessVal = 0.0;
          diffuseColor.rgb *= mix(1.0, 0.70, uWetness);
        } else if (mClass == 1) { // GRASS
          roughnessVal = mix(0.95, 0.75, uWetness);
          metalnessVal = 0.0;
          diffuseColor.rgb *= mix(1.0, 0.72, uWetness);
        } else if (mClass == 2) { // STONE
          roughnessVal = mix(0.80, 0.45, uWetness);
          metalnessVal = 0.1;
          diffuseColor.rgb *= mix(1.0, 0.80, uWetness);
        } else if (mClass == 3) { // WOOD
          roughnessVal = mix(0.85, 0.60, uWetness);
          metalnessVal = 0.0;
          diffuseColor.rgb *= mix(1.0, 0.82, uWetness);
        } else if (mClass == 4) { // METAL
          roughnessVal = mix(0.30, 0.10, uWetness);
          metalnessVal = 0.90;
        } else if (mClass == 5) { // GLASS
          roughnessVal = 0.08;
          metalnessVal = 0.1;
        } else if (mClass == 6) { // CRYSTAL
          roughnessVal = 0.22;
          metalnessVal = 0.2;
          emissiveVal = diffuseColor.rgb * 0.60;
        } else if (mClass == 7) { // AETHER
          roughnessVal = 0.15;
          metalnessVal = 0.4;
          float pulse = 0.5 + 0.5 * sin(uTime * 4.0 + vWorldPos.x * 2.0 + vWorldPos.z * 2.0);
          emissiveVal = vec3(0.12, 0.45, 0.92) * (0.35 + pulse * 0.65);
        } else if (mClass == 8) { // LAVA
          roughnessVal = 0.60;
          metalnessVal = 0.1;
          emissiveVal = vec3(1.0, 0.32, 0.0) * 1.5;
        } else if (mClass == 10) { // FOLIAGE
          roughnessVal = 0.95;
          metalnessVal = 0.0;
        }

        // Snow accumulation response on top surfaces (vWorldNormal.y > 0.7)
        if (vWorldNormal.y > 0.70 && uSnowAccumulation > 0.01) {
          float snowAmount = smoothstep(0.1, 0.9, uSnowAccumulation * (0.6 + 0.4 * sin(vWorldPos.x * 0.5 + vWorldPos.z * 0.5)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), snowAmount * 0.90);
          roughnessVal = mix(roughnessVal, 0.90, snowAmount);
          metalnessVal = mix(metalnessVal, 0.0, snowAmount);
        }

        // Stylized dynamic cloud shadow approximation
        float cShadow = smoothstep(0.35, 0.75, sin(vWorldPos.x * 0.016 + uCloudShadowDrift) * cos(vWorldPos.z * 0.016 + uCloudShadowDrift * 0.8));
        diffuseColor.rgb *= (1.0 - cShadow * 0.13);
        `
      ).replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        roughnessFactor = roughnessVal;
        `
      ).replace(
        '#include <metalnessmap_fragment>',
        `
        #include <metalnessmap_fragment>
        metalnessFactor = metalnessVal;
        `
      ).replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        totalEmissiveRadiance = emissiveVal;
        `
      );
    };

    this.transMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    this.transMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWetness = { value: 0 };
      shader.uniforms.uSnowAccumulation = { value: 0 };
      this.transMaterial.userData.shader = shader;
      shader.vertexShader = `
        attribute vec2 localUv;
        attribute vec4 tileRect;
        attribute float materialClass;
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vMaterialClass;
        varying vec3 vWorldNormal;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        vLocalUv = localUv;
        vTileRect = tileRect;
        vMaterialClass = materialClass;
        #include <begin_vertex>
        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = wPos.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        
        if (position.y > 0.3) {
          float phase = wPos.x * 2.5 + wPos.z * 2.5;
          float wind = sin(phase + uTime * 2.8) * 0.045 + sin(phase * 0.5 + uTime * 1.5) * 0.02;
          transformed.x += wind;
          transformed.z += wind * 0.5;
        }
        `
      );
      
      shader.fragmentShader = `
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        varying vec3 vWorldPos;
        varying float vMaterialClass;
        varying vec3 vWorldNormal;
        uniform float uTime;
        uniform float uWetness;
        uniform float uSnowAccumulation;
        
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 localWrapped = fract(vLocalUv);
          vec2 atlasUv = mix(vTileRect.xy, vTileRect.zw, localWrapped);
          vec4 sampledDiffuseColor = texture2D( map, atlasUv );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 blockCoord = floor(vWorldPos + 0.5);
        float h = hash(blockCoord);
        float variation = (h - 0.5) * 0.08;
        diffuseColor.rgb *= (1.0 + variation);
        
        if (vWorldPos.y > 0.3) {
          diffuseColor.rgb *= 1.1;
        }

        // MaterialClass Properties Resolver
        float roughnessVal = 0.50;
        float metalnessVal = 0.05;
        vec3 emissiveVal = vec3(0.0);
        
        int mClass = int(vMaterialClass + 0.5);
        if (mClass == 5) { // GLASS
          roughnessVal = 0.08;
          metalnessVal = 0.1;
        } else if (mClass == 6) { // CRYSTAL
          roughnessVal = 0.22;
          metalnessVal = 0.2;
          emissiveVal = diffuseColor.rgb * 0.60;
        } else if (mClass == 7) { // AETHER
          roughnessVal = 0.15;
          metalnessVal = 0.4;
          float pulse = 0.5 + 0.5 * sin(uTime * 4.0 + vWorldPos.x * 2.0 + vWorldPos.z * 2.0);
          emissiveVal = vec3(0.12, 0.45, 0.92) * (0.35 + pulse * 0.65);
        } else if (mClass == 10) { // FOLIAGE
          roughnessVal = 0.95;
          metalnessVal = 0.0;
        }

        // Snow accumulation response on top surfaces (vWorldNormal.y > 0.7)
        if (vWorldNormal.y > 0.70 && uSnowAccumulation > 0.01) {
          float snowAmount = smoothstep(0.1, 0.9, uSnowAccumulation * (0.6 + 0.4 * sin(vWorldPos.x * 0.5 + vWorldPos.z * 0.5)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), snowAmount * 0.90);
          roughnessVal = mix(roughnessVal, 0.90, snowAmount);
          metalnessVal = mix(metalnessVal, 0.0, snowAmount);
        }
        `
      ).replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        roughnessFactor = roughnessVal;
        `
      ).replace(
        '#include <metalnessmap_fragment>',
        `
        #include <metalnessmap_fragment>
        metalnessFactor = metalnessVal;
        `
      ).replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        totalEmissiveRadiance = emissiveVal;
        `
      );
    };

    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      roughness: 0.10, // Controlled specular roughness for water
      metalness: 0.02, // Water is dielectric, not metal (metalness ~ 0)
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.waterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWaterBaseColor = { value: new THREE.Color(0.16, 0.62, 0.85) };
      shader.uniforms.uWaterDeepColor = { value: new THREE.Color(0.02, 0.14, 0.38) };
      shader.uniforms.uSkyZenithColor = { value: new THREE.Color(0.35, 0.62, 0.95) };
      shader.uniforms.uSkyHorizonColor = { value: new THREE.Color(0.65, 0.82, 0.92) };
      shader.uniforms.uSunDirection = { value: new THREE.Vector3(0, 1, 0) };
      shader.uniforms.uSunColor = { value: new THREE.Color(1.0, 0.95, 0.85) };
      shader.uniforms.uMoonDirection = { value: new THREE.Vector3(0, -1, 0) };
      shader.uniforms.uMoonColor = { value: new THREE.Color(0.55, 0.72, 1.0) };
      shader.uniforms.uRainIntensity = { value: 0.0 };
      shader.uniforms.uWaterQuality = { value: 2.0 };
      shader.uniforms.uCloudShadowDrift = { value: 0.0 };
      this.waterMaterial.userData.shader = shader;

      shader.vertexShader = `
        attribute vec2 localUv;
        attribute vec4 tileRect;
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        vLocalUv = localUv;
        vTileRect = tileRect;
        #include <begin_vertex>

        // Absolute continuous world position before displacement
        // Prevents chunk seams, diagonal seams, and phase resets
        vec4 wPosInit = modelMatrix * vec4(position, 1.0);

        float wTime = uTime * 1.5;
        vec2 wCoord = wPosInit.xz;

        float wave1 = sin(wCoord.x * 1.6 + wTime * 1.4) * 0.022;
        float wave2 = cos(wCoord.y * 1.4 + wTime * 1.2) * 0.018;
        float wave3 = sin((wCoord.x * 0.9 + wCoord.y * 1.1) + wTime * 2.0) * 0.014;
        float wave4 = cos((wCoord.x * 1.3 - wCoord.y * 1.0) + wTime * 1.6) * 0.010;

        // Shoreline wave damping using smooth distance field in vColor.g
        #ifdef USE_COLOR
        float shoreDamp = clamp(1.0 - vColor.g * 0.72, 0.25, 1.0);
        #else
        float shoreDamp = 1.0;
        #endif
        float totalWaveDisp = (wave1 + wave2 + wave3 + wave4) * shoreDamp;

        transformed.y += totalWaveDisp;

        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = wPos.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        `
      );
      
      shader.fragmentShader = `
        varying vec2 vLocalUv;
        varying vec4 vTileRect;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        uniform float uTime;
        uniform vec3 uWaterBaseColor;
        uniform vec3 uWaterDeepColor;
        uniform vec3 uSkyZenithColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uMoonDirection;
        uniform vec3 uMoonColor;
        uniform float uRainIntensity;
        uniform float uWaterQuality;
        uniform float uCloudShadowDrift;
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 localWrapped = fract(vLocalUv);
          vec2 atlasUv = mix(vTileRect.xy, vTileRect.zw, localWrapped);
          vec4 sampledDiffuseColor = texture2D( map, atlasUv );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      ).replace(
        '#include <normal_fragment_begin>',
        `
        #include <normal_fragment_begin>
        
        {
          // Micro ripple normal perturbation in world space, then transformed to view space
          float ripTime = uTime * 1.8;
          vec2 rCoord = vWorldPosition.xz * 2.6;
          
          float r1x = cos(rCoord.x * 1.3 + rCoord.y * 0.7 + ripTime * 1.5) * 0.055;
          float r1z = sin(rCoord.y * 1.2 - rCoord.x * 0.8 + ripTime * 1.3) * 0.055;
          float r2x = sin(rCoord.x * 2.8 - ripTime * 2.0) * 0.030;
          float r2z = cos(rCoord.y * 2.6 + ripTime * 1.8) * 0.030;
          
          // Rain-on-water concentric ripples
          float rainRipplesX = 0.0;
          float rainRipplesZ = 0.0;
          if (uRainIntensity > 0.04) {
            vec2 rainGrid = fract(vWorldPosition.xz * 2.2) - 0.5;
            float rDist = length(rainGrid);
            float splashWave = sin(rDist * 28.0 - uTime * 14.0) * exp(-rDist * 4.5);
            rainRipplesX = splashWave * 0.07 * uRainIntensity;
            rainRipplesZ = splashWave * 0.07 * uRainIntensity;
          }
          
          vec3 worldPerturb = vec3(r1x + r2x + rainRipplesX, 0.0, r1z + r2z + rainRipplesZ);
          vec3 viewPerturb = (viewMatrix * vec4(worldPerturb, 0.0)).xyz;
          normal = normalize(normal + viewPerturb);
        }
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        {
          // Micro ripple normal perturbation in world space
          float ripTime = uTime * 1.8;
          vec2 rCoord = vWorldPosition.xz * 2.6;
          float r1x = cos(rCoord.x * 1.3 + rCoord.y * 0.7 + ripTime * 1.5) * 0.055;
          float r1z = sin(rCoord.y * 1.2 - rCoord.x * 0.8 + ripTime * 1.3) * 0.055;
          float r2x = sin(rCoord.x * 2.8 - ripTime * 2.0) * 0.030;
          float r2z = cos(rCoord.y * 2.6 + ripTime * 1.8) * 0.030;
          
          float rainRipplesX = 0.0;
          float rainRipplesZ = 0.0;
          if (uRainIntensity > 0.04) {
            vec2 rainGrid = fract(vWorldPosition.xz * 2.2) - 0.5;
            float rDist = length(rainGrid);
            float splashWave = sin(rDist * 28.0 - uTime * 14.0) * exp(-rDist * 4.5);
            rainRipplesX = splashWave * 0.07 * uRainIntensity;
            rainRipplesZ = splashWave * 0.07 * uRainIntensity;
          }
          vec3 worldPerturb = vec3(r1x + r2x + rainRipplesX, 0.0, r1z + r2z + rainRipplesZ);
          vec3 worldN = normalize(vWorldNormal + worldPerturb);

          // 4. Smooth nonlinear absorption (Beer-Lambert law)
          #ifdef USE_COLOR
          float depthMetric = vColor.r; // 0..1 (up to 12 blocks deep)
          #else
          float depthMetric = 0.5;
          #endif
          float depthAbsorption = 1.0 - exp(-depthMetric * 3.4);
          
          // 5. Environmental & Biome Water Color
          vec3 waterBodyColor = mix(uWaterBaseColor, uWaterDeepColor, depthAbsorption);
          
          // Fresnel reflection (Schlick dielectric F0 ~ 0.025 for water)
          vec3 worldVDir = normalize(cameraPosition - vWorldPosition);
          float nDotV = max(0.0, dot(worldVDir, worldN));
          float f0 = 0.025;
          float fresnel = f0 + (1.0 - f0) * pow(clamp(1.0 - nDotV, 0.0, 1.0), 4.5);
          
          // Sky Reflection Approximation
          vec3 worldReflect = reflect(-worldVDir, worldN);
          float reflectElev = clamp(worldReflect.y * 1.4 + 0.1, 0.0, 1.0);
          vec3 skyReflection = mix(uSkyHorizonColor, uSkyZenithColor, reflectElev);
          
          // Controlled Sun / Moon Specular Streak (follows normal, bounded, no whiteout)
          vec3 lightDir = normalize(uSunDirection.y > -0.05 ? uSunDirection : uMoonDirection);
          vec3 lightCol = uSunDirection.y > -0.05 ? uSunColor : uMoonColor * 0.7;
          vec3 halfDir = normalize(lightDir + worldVDir);
          float nDotH = max(0.0, dot(worldN, halfDir));
          float specHighlight = pow(nDotH, 85.0);
          float boundedStreak = (specHighlight * 1.8) / (specHighlight + 0.45);
          vec3 specularStreak = lightCol * boundedStreak * 0.65;
          
          // Shoreline Foam & Dynamic Wave Surge (Smooth distance field in G channel)
          #ifdef USE_COLOR
          float shoreProximity = vColor.g;
          #else
          float shoreProximity = 0.0;
          #endif
          float shoreWave = sin(vWorldPosition.x * 2.2 + vWorldPosition.z * 1.8 - uTime * 2.8) * 0.5 + 0.5;
          float foamBand = smoothstep(0.58 + shoreWave * 0.22, 1.0, shoreProximity);
          float bubbleNoise = sin(vWorldPosition.x * 14.0 + uTime * 2.5) * cos(vWorldPosition.z * 14.0 - uTime * 2.2);
          foamBand *= smoothstep(-0.25, 0.75, bubbleNoise);
          
          // Ultra-shallow wet edge tint
          float shallowWetEdge = smoothstep(0.40, 0.95, shoreProximity);
          waterBodyColor = mix(waterBodyColor, mix(uWaterBaseColor, vec3(0.35, 0.85, 0.95), 0.45), shallowWetEdge * 0.5);
          
          // Composite Water Color with Fresnel Reflection and Foam
          vec3 compositeWater = mix(waterBodyColor, skyReflection, fresnel * 0.82);
          vec3 seafoamColor = vec3(0.92, 0.97, 1.0);
          compositeWater = mix(compositeWater, seafoamColor, foamBand * 0.88);
          compositeWater += specularStreak;
          
          // Cloud shadow approximation on water surface
          float wCloudShadow = smoothstep(0.35, 0.75, sin(vWorldPosition.x * 0.016 + uCloudShadowDrift) * cos(vWorldPosition.z * 0.016 + uCloudShadowDrift * 0.8));
          compositeWater *= (1.0 - wCloudShadow * 0.14);
          
          diffuseColor.rgb = mix(diffuseColor.rgb, compositeWater, 0.88);
          
          // Depth- and Fresnel-based transparency
          float baseAlpha = mix(0.48, 0.94, depthAbsorption);
          diffuseColor.a = clamp(baseAlpha + fresnel * (1.0 - baseAlpha) + foamBand * 0.35, 0.0, 0.98);
        }
        `
      );
    };

    // Wireframe block outline for targeted block
    const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlightMesh = new THREE.LineSegments(
      wireGeo,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2.5, transparent: true, opacity: 0.75 })
    );
    this.highlightMesh.visible = false;
    this.worldGroup.add(this.highlightMesh);

    // Ghost placement preview
    const previewGeo = new THREE.BoxGeometry(0.99, 0.99, 0.99);
    this.previewMesh = new THREE.Mesh(
      previewGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, wireframe: false })
    );
    this.previewMesh.visible = false;
    this.worldGroup.add(this.previewMesh);

    // 3D Progressive Mining Crack Overlay Mesh
    const crackMesh = MiningVisualEngine.getCrackMesh();
    this.worldGroup.add(crackMesh);
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return BlockType.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    let chunk = this.getChunk(cx, cz);
    if (!chunk) {
      chunk = this.generateChunk(cx, cz);
      this.chunks.set(this.getChunkKey(cx, cz), chunk);
      this.worldGroup.add(chunk.group);
    }

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getBlock(lx, wy, lz);
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType, recordModification: boolean = true): boolean {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return false;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    let chunk = this.getChunk(cx, cz);
    if (!chunk) {
      chunk = this.generateChunk(cx, cz);
      this.chunks.set(this.getChunkKey(cx, cz), chunk);
      this.worldGroup.add(chunk.group);
    }

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    const changed = chunk.setBlock(lx, wy, lz, type);
    if (changed) {
      chunk.isDirty = true;
      this.scheduler.markDirty(cx, cz);

      // Track player modification for persistent saving
      if (recordModification) {
        const cKey = this.getChunkKey(cx, cz);
        if (!this.modifiedBlocks.has(cKey)) {
          this.modifiedBlocks.set(cKey, new Map());
        }
        const localKey = `${lx},${wy},${lz}`;
        this.modifiedBlocks.get(cKey)!.set(localKey, type);
      }

      // Mark neighbor chunks dirty if on edge
      if (lx === 0) this.scheduler.markDirty(cx - 1, cz);
      if (lx === CHUNK_SIZE_X - 1) this.scheduler.markDirty(cx + 1, cz);
      if (lz === 0) this.scheduler.markDirty(cx, cz - 1);
      if (lz === CHUNK_SIZE_Z - 1) this.scheduler.markDirty(cx, cz + 1);
    }
    return changed;
  }

  public generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const cKey = this.getChunkKey(cx, cz);
    const dimKey = makeDimensionChunkKey(this.dimensionId, cx, cz);

    const modifiedBlocks: Record<string, number> = {};
    if (this.modifiedBlocks.has(dimKey)) {
      this.modifiedBlocks.get(dimKey)!.forEach((blockType, localKey) => {
        modifiedBlocks[localKey] = blockType;
      });
    }
    if (this.modifiedBlocks.has(cKey)) {
      this.modifiedBlocks.get(cKey)!.forEach((blockType, localKey) => {
        modifiedBlocks[localKey] = blockType;
      });
    }

    const blocksData = this.generatorCore.generateChunkData(cx, cz, modifiedBlocks);
    chunk.setBlocks(new Uint8Array(blocksData));

    return chunk;
  }

  // Get procedural world data map for Debug Overlay Map
  public getDebugMapInfo(centerX: number, centerZ: number, radiusBlocks: number = 200, step: number = 8) {
    const dataPoints: {
      x: number;
      z: number;
      height: number;
      biomeName: string;
      isWater: boolean;
      regionId: string;
      regionName: string;
      regionColor: string;
    }[] = [];
    const regionColorMap: Record<string, string> = {
      minang: '#10b981', // Emerald Valley
      jawa: '#eab308',   // Golden Fertile Plains
      bali: '#f97316',   // Volcanic Terraces
      borneo: '#059669', // Deep River Rainforest
      toraja: '#8b5cf6', // Mystical Karst Cliffs
      papua: '#06b6d4',  // Glacial Alpine Highland
      nusa: '#14b8a6',   // Coral Archipelago
    };

    for (let x = centerX - radiusBlocks; x <= centerX + radiusBlocks; x += step) {
      for (let z = centerZ - radiusBlocks; z <= centerZ + radiusBlocks; z += step) {
        const biome = this.biomeManager.getBiome(x, z);
        const h = Math.round(this.generatorCore.getTerrainHeight(x, z));
        const domRegion = this.regionManager.getDominantRegion(x, z);
        dataPoints.push({
          x,
          z,
          height: h,
          biomeName: biome.name,
          isWater: h <= SEA_LEVEL,
          regionId: domRegion.id,
          regionName: domRegion.displayName,
          regionColor: regionColorMap[domRegion.id] || '#64748b',
        });
      }
    }
    return dataPoints;
  }

  // Preload essential chunks in radius around origin or specified center
  public preloadSpawnChunks(centerX: number = 0, centerZ: number = 0, radius: number = 2): void {
    const centerCX = Math.floor(centerX / CHUNK_SIZE_X);
    const centerCZ = Math.floor(centerZ / CHUNK_SIZE_Z);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        const key = this.getChunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = this.generateChunk(cx, cz);
          this.chunks.set(key, chunk);
          this.worldGroup.add(chunk.group);
        }
      }
    }

    // Rebuild initial meshes
    for (const chunk of this.chunks.values()) {
      if (chunk.isDirty) {
        chunk.rebuildMesh(
          (wx, wy, wz) => this.getBlock(wx, wy, wz),
          this.solidMaterial,
          this.transMaterial,
          this.waterMaterial
        );
      }
    }
  }

  // Deterministic Safe Spawn Finder
  // Ensures player spawns on solid, safe ground, exposed to sky, not in water/lava, with clear standing space
  public findSafeSpawn(seed: number = this.seed): [number, number, number] {
    // 1. Ensure chunks around (0,0) exist
    this.preloadSpawnChunks(0, 0, 2);

    // 2. Deterministic spiral search candidates
    const spiralOffsets: [number, number][] = [
      [0, 0], [4, 0], [-4, 0], [0, 4], [0, -4],
      [8, 8], [-8, 8], [8, -8], [-8, -8],
      [12, 0], [-12, 0], [0, 12], [0, -12],
      [16, 8], [-16, 8], [8, 16], [-8, 16],
      [20, 20], [-20, 20], [20, -20], [-20, -20],
      [24, 0], [-24, 0], [0, 24], [0, -24],
      [32, 16], [-32, 16], [16, 32], [-16, 32],
    ];

    const isSolidGround = (block: BlockType): boolean => {
      return (
        block === BlockType.GRASS ||
        block === BlockType.DIRT ||
        block === BlockType.STONE ||
        block === BlockType.COBBLESTONE ||
        block === BlockType.SAND ||
        block === BlockType.SNOW ||
        block === BlockType.MOSS_STONE ||
        block === BlockType.BASALT
      );
    };

    for (const [ox, oz] of spiralOffsets) {
      const wx = ox;
      const wz = oz;

      // Scan downwards from top of world
      for (let y = CHUNK_SIZE_Y - 4; y >= SEA_LEVEL + 1; y--) {
        const groundBlock = this.getBlock(wx, y, wz);

        if (isSolidGround(groundBlock)) {
          // Check player standing space (Y+1 is feet, Y+2 is head)
          const feetBlock = this.getBlock(wx, y + 1, wz);
          const headBlock = this.getBlock(wx, y + 2, wz);
          const aboveBlock = this.getBlock(wx, y + 3, wz);

          const isPassable = (b: BlockType) => b === BlockType.AIR || b === BlockType.TALL_GRASS || b === BlockType.BLUE_FLOWER || b === BlockType.RED_FLOWER || b === BlockType.SUN_ORCHID;

          if (isPassable(feetBlock) && isPassable(headBlock) && isPassable(aboveBlock)) {
            // Check sky exposure (not in a subterranean cave)
            let hasSky = true;
            for (let sy = y + 4; sy < CHUNK_SIZE_Y; sy++) {
              const b = this.getBlock(wx, sy, wz);
              if (b !== BlockType.AIR && b !== BlockType.OAK_LEAVES && b !== BlockType.PINE_LEAVES && b !== BlockType.CYAN_CRYSTAL_LEAVES) {
                hasSky = false;
                break;
              }
            }

            if (hasSky) {
              return [wx + 0.5, y + 1.0, wz + 0.5];
            }
          }
        }
      }
    }

    // Safe fallback
    const fallbackY = this.getSpawnHeight(0, 0);
    return [0.5, Math.max(SEA_LEVEL + 2, fallbackY + 1.0), 0.5];
  }

  // Update streamed chunks around player position using ChunkScheduler
  public updateChunks(
    playerPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    renderDistance: number = 4,
    frameBudgetMs: number = 3.0
  ): void {
    this.scheduler.update(playerPos, cameraDir, renderDistance, frameBudgetMs);
  }

  // Accurate Voxel DDA (Digital Differential Analyzer) Raycaster
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 6): RaycastHit | null {
    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    let ix = Math.floor(px);
    let iy = Math.floor(py);
    let iz = Math.floor(pz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    let tMaxX = dx > 0 ? (ix + 1 - px) * tDeltaX : (px - ix) * tDeltaX;
    let tMaxY = dy > 0 ? (iy + 1 - py) * tDeltaY : (py - iy) * tDeltaY;
    let tMaxZ = dz > 0 ? (iz + 1 - pz) * tDeltaZ : (pz - iz) * tDeltaZ;

    let faceNormal: [number, number, number] = [0, 1, 0];
    let distance = 0;

    while (distance < maxDistance) {
      const block = this.getBlock(ix, iy, iz);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        const placePos: [number, number, number] = [
          ix + faceNormal[0],
          iy + faceNormal[1],
          iz + faceNormal[2],
        ];
        return {
          blockPos: [ix, iy, iz],
          placePos,
          blockType: block,
          faceNormal,
          distance,
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          ix += stepX;
          distance = tMaxX;
          tMaxX += tDeltaX;
          faceNormal = [-stepX, 0, 0];
        } else {
          iz += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          faceNormal = [0, 0, -stepZ];
        }
      } else {
        if (tMaxY < tMaxZ) {
          iy += stepY;
          distance = tMaxY;
          tMaxY += tDeltaY;
          faceNormal = [0, -stepY, 0];
        } else {
          iz += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          faceNormal = [0, 0, -stepZ];
        }
      }
    }

    return null;
  }

  // Update target highlight box and ghost preview
  public updateTargetHighlight(hit: RaycastHit | null, selectedBlockToPlace?: BlockType): void {
    if (hit) {
      this.highlightMesh.position.set(hit.blockPos[0] + 0.5, hit.blockPos[1] + 0.5, hit.blockPos[2] + 0.5);
      this.highlightMesh.visible = true;

      if (selectedBlockToPlace !== undefined && (selectedBlockToPlace as number) !== 0) {
        this.previewMesh.position.set(hit.placePos[0] + 0.5, hit.placePos[1] + 0.5, hit.placePos[2] + 0.5);
        this.previewMesh.visible = true;
      } else {
        this.previewMesh.visible = false;
      }
    } else {
      this.highlightMesh.visible = false;
      this.previewMesh.visible = false;
    }
  }

  public waterTime: number = 0;

  public update(
    deltaTime: number,
    camera?: THREE.PerspectiveCamera,
    envData?: {
      waterBaseColor?: THREE.Color;
      waterDeepColor?: THREE.Color;
      skyZenithColor?: THREE.Color;
      skyHorizonColor?: THREE.Color;
      sunDirection?: THREE.Vector3;
      sunColor?: THREE.Color;
      moonDirection?: THREE.Vector3;
      moonColor?: THREE.Color;
      rainIntensity?: number;
      waterQuality?: number;
      cloudDrift?: number;
    }
  ): void {
    this.waterTime += deltaTime;
    const wShader = this.waterMaterial.userData.shader;
    if (wShader) {
      wShader.uniforms.uTime.value = this.waterTime;
      if (envData) {
        if (envData.waterBaseColor) wShader.uniforms.uWaterBaseColor.value.copy(envData.waterBaseColor);
        if (envData.waterDeepColor) wShader.uniforms.uWaterDeepColor.value.copy(envData.waterDeepColor);
        if (envData.skyZenithColor) wShader.uniforms.uSkyZenithColor.value.copy(envData.skyZenithColor);
        if (envData.skyHorizonColor) wShader.uniforms.uSkyHorizonColor.value.copy(envData.skyHorizonColor);
        if (envData.sunDirection) wShader.uniforms.uSunDirection.value.copy(envData.sunDirection);
        if (envData.sunColor) wShader.uniforms.uSunColor.value.copy(envData.sunColor);
        if (envData.moonDirection) wShader.uniforms.uMoonDirection.value.copy(envData.moonDirection);
        if (envData.moonColor) wShader.uniforms.uMoonColor.value.copy(envData.moonColor);
        if (envData.rainIntensity !== undefined) wShader.uniforms.uRainIntensity.value = envData.rainIntensity;
        if (envData.waterQuality !== undefined) wShader.uniforms.uWaterQuality.value = envData.waterQuality;
        if (envData.cloudDrift !== undefined) wShader.uniforms.uCloudShadowDrift.value = envData.cloudDrift;
      }
    }

    const wetness = envData && envData.rainIntensity !== undefined ? envData.rainIntensity : 0.0;
    const snowAccum = this.preset === 'mountainous' ? Math.max(0.2, wetness) : (this.preset === 'standard' ? wetness * 0.5 : 0.0);

    const sShader = this.solidMaterial.userData.shader;
    if (sShader) {
      sShader.uniforms.uTime.value = this.waterTime;
      sShader.uniforms.uWetness.value = wetness;
      sShader.uniforms.uSnowAccumulation.value = snowAccum;
      if (envData && envData.cloudDrift !== undefined) {
        sShader.uniforms.uCloudShadowDrift.value = envData.cloudDrift;
      }
    }
    const tShader = this.transMaterial.userData.shader;
    if (tShader) {
      tShader.uniforms.uTime.value = this.waterTime;
      tShader.uniforms.uWetness.value = wetness;
      tShader.uniforms.uSnowAccumulation.value = snowAccum;
    }
    if (camera) {
      this.scheduler.updateFrustumCulling(camera);
    }
  }

  public getSpawnHeight(wx: number, wz: number): number {
    for (let y = CHUNK_SIZE_Y - 2; y >= 1; y--) {
      const b = this.getBlock(wx, y, wz);
      if (b !== BlockType.AIR && b !== BlockType.WATER) {
        return y + 1;
      }
    }
    return 28;
  }

  public dispose(): void {
    this.scheduler.dispose();
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();

    if (this.highlightMesh) {
      this.worldGroup.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
    }
    if (this.previewMesh) {
      this.worldGroup.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      (this.previewMesh.material as THREE.Material).dispose();
    }

    this.solidMaterial.dispose();
    this.transMaterial.dispose();
    this.waterMaterial.dispose();
  }
}
