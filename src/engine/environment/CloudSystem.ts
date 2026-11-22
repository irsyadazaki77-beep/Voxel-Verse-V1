// Photorealistic 3D Volumetric Raymarched Cloud System (v9.1.0)
// Features:
// - Precomputed Tileable 128x128 RGBA Perlin-Worley + Inverted Worley Erosion Noise Texture
// - Spherical Earth-Shell Analytic Ray-Intersection on Atmospheric Sky Dome (Zero Horizon Edge Artifacts)
// - Adaptive 3D Volumetric Raymarching with Interleaved Gradient Noise Dithering
// - Physically Inspired Multi-Scattering (Dual-Octave Beer-Lambert + Powder Sugar Effect)
// - Dual-Lobe Henyey-Greenstein Phase Function (Forward Silver-Lining + Soft Backscatter)
// - Height-Driven Cumulus Vertical Profile (Flat Condensation Base + Billowy Cauliflower Tops)
// - High-Altitude Wind-Sheared Cirrus Ice-Crystal Layer
// - Dynamic Day/Sunset/Moonlit Night Lighting, Internal Storm Sheet Lightning & Aerial Perspective Haze
import * as THREE from 'three';
import { WeatherState } from '../../types';

export interface CloudEnvironmentContext {
  sunColor?: THREE.Color;
  moonDirection?: THREE.Vector3;
  moonColor?: THREE.Color;
  skyZenithColor?: THREE.Color;
  skyHorizonColor?: THREE.Color;
  lightningFlash?: boolean;
  isEyesInWater?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

// Deterministic integer hash for seamless periodic procedural noise generation
function hash2i(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // Quintic smoothstep for C2-continuous organic gradients
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

  const x0 = ((ix % period) + period) % period;
  const y0 = ((iy % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;

  const a = hash2i(x0, y0, seed);
  const b = hash2i(x1, y0, seed);
  const c = hash2i(x0, y1, seed);
  const d = hash2i(x1, y1, seed);

  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

function periodicFbm(u: number, v: number, basePeriod: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let period = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicValueNoise(u, v, period, seed + o * 97);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / norm;
}

// Tileable inverted Worley F1 cellular noise (creates billowy cauliflower cumulus puffs)
function periodicInvertedWorley(u: number, v: number, cells: number, seed: number): number {
  const gx = u * cells;
  const gy = v * cells;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;

  let minDistSq = 4.0;
  for (let dy = -1; dy <= 1; dy++) {
    const cy = (((iy + dy) % cells) + cells) % cells;
    for (let dx = -1; dx <= 1; dx++) {
      const cx = (((ix + dx) % cells) + cells) % cells;
      const ox = hash2i(cx, cy, seed);
      const oy = hash2i(cx, cy, seed + 53);
      const px = dx + ox - fx;
      const py = dy + oy - fy;
      const dSq = px * px + py * py;
      if (dSq < minDistSq) minDistSq = dSq;
    }
  }
  const dist = Math.min(1.0, Math.sqrt(minDistSq));
  return 1.0 - dist;
}

function remap01(val: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (val - lo) / (hi - lo)));
}

export class CloudSystem {
  public cloudGroup: THREE.Group;
  public cloudMaterial: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private canopyMesh: THREE.Mesh;

  public cloudDrift: number = 0;
  private currentBaseColor = new THREE.Color(0xf8fbff);
  private currentUndersideColor = new THREE.Color(0x6e85a6);
  private currentHighlightColor = new THREE.Color(0xfffaf0);
  private currentSunColor = new THREE.Color(1.0, 0.96, 0.88);
  private currentMoonColor = new THREE.Color(0x88a8e6);
  private currentSkyZenith = new THREE.Color(0.35, 0.62, 0.95);
  private currentSkyHorizon = new THREE.Color(0.68, 0.84, 0.95);
  private currentCoverage: number = 0.46;
  private currentCloudType: number = 0.55;
  private currentDensityScale: number = 1.0;
  private currentCirrusOpacity: number = 0.36;
  private currentLightningFlash: number = 0.0;
  private windOffset = new THREE.Vector2(0, 0);

  private static _sharedNoiseTexture: THREE.DataTexture | null = null;
  private static readonly _scratchTargetBase = new THREE.Color();
  private static readonly _scratchTargetUnderside = new THREE.Color();
  private static readonly _scratchTargetHighlight = new THREE.Color();
  private static readonly _scratchSunDir = new THREE.Vector3(0.4, 0.8, 0.3);
  private static readonly _scratchMoonDir = new THREE.Vector3(-0.4, 0.6, -0.3);

  private static getNoiseTexture(): THREE.DataTexture {
    if (CloudSystem._sharedNoiseTexture) {
      return CloudSystem._sharedNoiseTexture;
    }

    const size = 128;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;

        // R: Perlin-Worley billowy cumulus base shape (Schneider/Nubis formula)
        const perlinBase = periodicFbm(u, v, 4, 4, 11);
        const worleyBase =
          periodicInvertedWorley(u, v, 4, 101) * 0.625 +
          periodicInvertedWorley(u, v, 8, 211) * 0.25 +
          periodicInvertedWorley(u, v, 16, 307) * 0.125;
        const perlinWorley = remap01(perlinBase * 0.55 + worleyBase * 0.45, 0.18, 0.92);

        // G: High-frequency inverted Worley cellular erosion (fluffy cauliflower edges)
        const worleyDetail =
          periodicInvertedWorley(u, v, 8, 409) * 0.55 +
          periodicInvertedWorley(u, v, 16, 521) * 0.30 +
          periodicInvertedWorley(u, v, 32, 613) * 0.15;

        // B: Fine turbulent curl/wisp detail
        const fineDetail =
          periodicFbm(u, v, 8, 3, 733) * 0.5 +
          periodicInvertedWorley(u, v, 24, 827) * 0.5;

        // A: Macro weather & cloud-bank distribution (natural sky windows + dense banks)
        const macro = periodicFbm(u, v, 2, 3, 941);
        const macroShaped = remap01(macro, 0.22, 0.82);

        const idx = (y * size + x) * 4;
        data[idx] = Math.round(Math.max(0, Math.min(1, perlinWorley)) * 255);
        data[idx + 1] = Math.round(Math.max(0, Math.min(1, worleyDetail)) * 255);
        data[idx + 2] = Math.round(Math.max(0, Math.min(1, fineDetail)) * 255);
        data[idx + 3] = Math.round(Math.max(0, Math.min(1, macroShaped)) * 255);
      }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;

    CloudSystem._sharedNoiseTexture = tex;
    return tex;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();

    const noiseTex = CloudSystem.getNoiseTexture();

    this.cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uNoiseTex: { value: noiseTex },
        uWindOffset: { value: new THREE.Vector2(0, 0) },
        uSunDirection: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
        uMoonDirection: { value: new THREE.Vector3(-0.4, 0.6, -0.3) },
        uSunColor: { value: this.currentSunColor },
        uMoonColor: { value: this.currentMoonColor },
        uSkyZenithColor: { value: this.currentSkyZenith },
        uSkyHorizonColor: { value: this.currentSkyHorizon },
        uBaseColor: { value: this.currentBaseColor },
        uUndersideColor: { value: this.currentUndersideColor },
        uHighlightColor: { value: this.currentHighlightColor },
        uCameraPos: { value: new THREE.Vector3(0, 64, 0) },
        uCoverage: { value: 0.46 },
        uCloudType: { value: 0.55 },
        uDensityScale: { value: 1.0 },
        uOpacity: { value: 0.94 },
        uCirrusOpacity: { value: 0.36 },
        uNightFactor: { value: 0.0 },
        uSunsetFactor: { value: 0.0 },
        uLightningFlash: { value: 0.0 },
        uQualitySteps: { value: 20.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uNoiseTex;
        uniform vec2 uWindOffset;
        uniform vec3 uSunDirection;
        uniform vec3 uMoonDirection;
        uniform vec3 uSunColor;
        uniform vec3 uMoonColor;
        uniform vec3 uSkyZenithColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uBaseColor;
        uniform vec3 uUndersideColor;
        uniform vec3 uHighlightColor;
        uniform vec3 uCameraPos;
        uniform float uCoverage;
        uniform float uCloudType;
        uniform float uDensityScale;
        uniform float uOpacity;
        uniform float uCirrusOpacity;
        uniform float uNightFactor;
        uniform float uSunsetFactor;
        uniform float uLightningFlash;
        uniform float uQualitySteps;

        varying vec3 vWorldPos;

        const float EARTH_RADIUS = 52000.0;
        const float CLOUD_MIN_Y = 148.0;
        const float CLOUD_MAX_Y = 236.0;
        const float CIRRUS_Y = 340.0;
        const float PI = 3.14159265;

        // Interleaved Gradient Noise (Jimenez 2014) for artifact-free raymarch jitter
        float ign(vec2 p) {
          return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
        }

        // Analytic ray-sphere intersection (sphere centered at origin)
        vec2 raySphere(vec3 ro, vec3 rd, float rad) {
          float b = dot(ro, rd);
          float c = dot(ro, ro) - rad * rad;
          float h = b * b - c;
          if (h < 0.0) return vec2(-1.0);
          h = sqrt(h);
          return vec2(-b - h, -b + h);
        }

        // Dual-lobe Henyey-Greenstein phase function for realistic silver linings + soft backscatter
        float hgPhase(float cosTheta, float g) {
          float g2 = g * g;
          float denom = max(0.001, 1.0 + g2 - 2.0 * g * cosTheta);
          return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
        }

        float dualPhase(float cosTheta) {
          float forwardLobe = hgPhase(cosTheta, 0.76);
          float backLobe = hgPhase(cosTheta, -0.22);
          float peak = hgPhase(cosTheta, 0.92) * 0.35;
          return mix(backLobe, forwardLobe, 0.72) + peak;
        }

        // Pseudo-3D tileable texture sampling using smoothly interpolated vertical slices
        vec4 sampleNoise3D(vec2 uv, float heightNorm) {
          float zSlice = heightNorm * 3.5;
          float z0 = floor(zSlice);
          float z1 = z0 + 1.0;
          float zFrac = fract(zSlice);
          zFrac = zFrac * zFrac * (3.0 - 2.0 * zFrac);
          vec2 sliceStep = vec2(0.371, 0.713);
          vec4 s0 = texture2D(uNoiseTex, uv + z0 * sliceStep);
          vec4 s1 = texture2D(uNoiseTex, uv + z1 * sliceStep);
          return mix(s0, s1, zFrac);
        }

        // Realistic cumulus vertical height profile: flat condensation base + rounded towering domes
        float cloudHeightProfile(float h, float cloudType) {
          float bottomRound = smoothstep(0.0, 0.14, h);
          float topStart = mix(0.42, 0.76, cloudType);
          float topRound = 1.0 - smoothstep(topStart, 1.0, h);
          return bottomRound * topRound;
        }

        // Fast volumetric cloud density evaluation (fullDetail=false for cheaper light march steps)
        float sampleCloudDensity(vec3 worldP, float heightNorm, bool fullDetail) {
          float hProfile = cloudHeightProfile(heightNorm, uCloudType);
          if (hProfile < 0.005) return 0.0;

          // Subtle wind shear tilts tall cumulus tops gently with altitude
          vec2 shear = vec2(0.18, 0.08) * heightNorm * 0.08;
          vec2 baseUv = worldP.xz * 0.00054 + uWindOffset + shear;

          // Macro weather map creates realistic cloud banks & open sky windows
          float macro = texture2D(uNoiseTex, baseUv * 0.32 + vec2(0.17, 0.43)).a;
          vec4 n3d = sampleNoise3D(baseUv, heightNorm);

          // Combine Perlin-Worley cauliflower base with macro weather coverage
          float localCoverage = clamp(uCoverage * (0.72 + macro * 0.56), 0.0, 0.98);
          float baseShape = n3d.r * hProfile;

          // Threshold against coverage
          float threshold = 1.0 - localCoverage;
          float density = clamp((baseShape - threshold * 0.82) / max(0.14, 1.0 - threshold * 0.82), 0.0, 1.0);
          if (density <= 0.002) return 0.0;

          // High-frequency Worley billow erosion carves crisp, puffy, photographic edges
          if (fullDetail) {
            vec2 detailUv = baseUv * 3.15 + vec2(heightNorm * 0.42, -heightNorm * 0.28) + vec2(uTime * 0.0022, -uTime * 0.0014);
            vec4 detailSample = texture2D(uNoiseTex, detailUv);
            float worleyErosion = 1.0 - (detailSample.g * 0.68 + detailSample.b * 0.32);
            // Stronger wispy erosion near cloud tops and soft curl at bases
            float erosionWeight = mix(0.28, 0.52, heightNorm) * (1.0 - density * 0.42);
            density = clamp((density - worleyErosion * erosionWeight) / max(0.22, 1.0 - worleyErosion * erosionWeight), 0.0, 1.0);
          }

          return density * uDensityScale;
        }

        // 4-step directional light march with multi-scattering Beer-Powder energy
        float marchLightEnergy(vec3 startP, vec3 roEarth, vec3 lightDir, float localDensity, float cosTheta) {
          float opticalDepth = 0.0;
          float stepDists[4];
          stepDists[0] = 10.0;
          stepDists[1] = 24.0;
          stepDists[2] = 48.0;
          stepDists[3] = 84.0;

          vec3 camOffset = startP - uCameraPos;
          for (int i = 0; i < 4; i++) {
            float d = stepDists[i];
            vec3 sampleP = startP + lightDir * d;
            float sampleAlt = length(roEarth + camOffset + lightDir * d) - EARTH_RADIUS;
            float hNorm = clamp((sampleAlt - CLOUD_MIN_Y) / (CLOUD_MAX_Y - CLOUD_MIN_Y), 0.0, 1.0);
            if (sampleAlt > CLOUD_MIN_Y && sampleAlt < CLOUD_MAX_Y) {
              float sd = sampleCloudDensity(sampleP, hNorm, false);
              opticalDepth += sd * (d * 0.032);
            }
          }

          // Dual-octave multiple scattering approximation (Oz / Wrenninge)
          float beerDirect = exp(-opticalDepth * 1.35);
          float beerMulti = exp(-opticalDepth * 0.32) * 0.52;
          float beer = max(beerDirect, beerMulti);

          // Beer-Powder sugar effect brightens billowing edges away from the sun
          float powder = 1.0 - exp(-localDensity * 2.4);
          float powderBlend = mix(1.0, 0.55 + powder * 0.75, smoothstep(0.65, -0.35, cosTheta));

          return beer * powderBlend;
        }

        // High-altitude wispy ice-crystal Cirrus layer
        vec4 renderCirrus(vec3 roEarth, vec3 rd, vec3 lightDir, vec3 lightColor, float cosTheta) {
          if (uCirrusOpacity < 0.01 || rd.y < 0.015) return vec4(0.0);
          vec2 hit = raySphere(roEarth, rd, EARTH_RADIUS + CIRRUS_Y);
          float tCirrus = hit.y;
          if (tCirrus <= 0.0 || tCirrus > 9500.0) return vec4(0.0);

          vec3 p = uCameraPos + rd * tCirrus;
          // Anisotropic wind-stretched UV for realistic feathery cirrus filaments
          vec2 windDir = vec2(0.86, 0.51);
          vec2 windPerp = vec2(-0.51, 0.86);
          vec2 uvRaw = p.xz * 0.00024 + uWindOffset * 0.55;
          vec2 uvStretch = vec2(dot(uvRaw, windDir) * 0.42, dot(uvRaw, windPerp) * 1.65);

          // Domain warp for silky curved ice streaks
          vec2 warp = texture2D(uNoiseTex, uvRaw * 0.65 + vec2(uTime * 0.0008, 0.0)).gb - 0.5;
          float c1 = texture2D(uNoiseTex, uvStretch + warp * 0.14).r;
          float c2 = texture2D(uNoiseTex, uvStretch * 2.4 - warp * 0.10 + vec2(0.31, 0.67)).b;
          float streak = c1 * 0.65 + c2 * 0.35;

          float alpha = smoothstep(0.56, 0.88, streak) * uCirrusOpacity;
          // Horizon fade so cirrus melts naturally into distance
          float horizonFade = smoothstep(0.015, 0.18, rd.y) * (1.0 - smoothstep(2800.0, 8800.0, tCirrus));
          alpha *= horizonFade;
          if (alpha < 0.005) return vec4(0.0);

          // Cirrus catches high-altitude golden/rose light vividly during sunrise & sunset
          vec3 cirrusBase = mix(uHighlightColor, vec3(1.0, 0.72, 0.54), uSunsetFactor * 0.75);
          cirrusBase = mix(cirrusBase, uMoonColor * 0.85, uNightFactor * 0.82);
          float forwardGlow = pow(max(0.0, cosTheta), 6.0) * 0.45 * (1.0 - uNightFactor * 0.6);
          vec3 col = cirrusBase + lightColor * forwardGlow;

          // Aerial perspective blend toward horizon
          float haze = 1.0 - exp(-tCirrus * 0.00018);
          col = mix(col, uSkyHorizonColor, haze * 0.55);

          return vec4(col, alpha);
        }

        void main() {
          vec3 rd = normalize(vWorldPos - uCameraPos);

          // Fast early-out for pixels below horizon when camera is beneath the cloud deck
          if (uCameraPos.y < CLOUD_MIN_Y && rd.y < -0.015) discard;

          vec3 roEarth = vec3(0.0, EARTH_RADIUS + uCameraPos.y, 0.0);

          // Active celestial light switches smoothly between Sun (day/twilight) and Moon (night)
          vec3 sunDir = normalize(uSunDirection);
          vec3 moonDir = normalize(uMoonDirection);
          vec3 activeLightDir = normalize(mix(sunDir, moonDir, smoothstep(0.35, 0.75, uNightFactor)));
          vec3 activeLightCol = mix(uSunColor, uMoonColor * 0.72, smoothstep(0.25, 0.80, uNightFactor));
          float cosTheta = dot(rd, activeLightDir);

          // Intersect spherical volumetric cloud shell [CLOUD_MIN_Y, CLOUD_MAX_Y]
          vec2 innerHit = raySphere(roEarth, rd, EARTH_RADIUS + CLOUD_MIN_Y);
          vec2 outerHit = raySphere(roEarth, rd, EARTH_RADIUS + CLOUD_MAX_Y);

          float tStart = 0.0;
          float tEnd = 0.0;

          if (uCameraPos.y < CLOUD_MIN_Y) {
            if (innerHit.y < 0.0 || outerHit.y < 0.0) discard;
            tStart = innerHit.y;
            tEnd = outerHit.y;
          } else if (uCameraPos.y <= CLOUD_MAX_Y) {
            tStart = 0.0;
            tEnd = (innerHit.x > 0.0) ? innerHit.x : outerHit.y;
          } else {
            if (outerHit.x < 0.0 && outerHit.y < 0.0) discard;
            tStart = max(0.0, outerHit.x);
            tEnd = (innerHit.x > 0.0) ? innerHit.x : outerHit.y;
          }

          // Render high-altitude cirrus behind cumulus
          vec4 cirrus = renderCirrus(roEarth, rd, activeLightDir, activeLightCol, cosTheta);

          // Cap ray distance near horizon for smooth performance & natural aerial haze
          float maxMarchRange = 2200.0;
          tEnd = min(tEnd, tStart + maxMarchRange);

          vec3 accumLight = vec3(0.0);
          float transmittance = 1.0;
          float weightedDist = 0.0;
          float weightSum = 0.0;

          if (tEnd > tStart + 1.0 && tStart < 4200.0 && uOpacity > 0.01) {
            int maxSteps = int(clamp(uQualitySteps, 12.0, 28.0));
            float marchLen = tEnd - tStart;
            float baseStep = marchLen / float(maxSteps);

            // Pixel-wise blue-noise-like IGN jitter removes step banding completely
            float jitter = ign(gl_FragCoord.xy + fract(uTime * 0.013) * 17.0);
            float t = tStart + baseStep * jitter;

            float phase = dualPhase(cosTheta);
            float silverBoost = pow(max(0.0, cosTheta), 10.0) * 0.45 + pow(max(0.0, cosTheta), 36.0) * 0.55;

            for (int i = 0; i < 28; i++) {
              if (i >= maxSteps || t > tEnd || transmittance < 0.025) break;

              vec3 samplePos = uCameraPos + rd * t;
              float sampleAlt = length(roEarth + rd * t) - EARTH_RADIUS;
              float heightNorm = clamp((sampleAlt - CLOUD_MIN_Y) / (CLOUD_MAX_Y - CLOUD_MIN_Y), 0.0, 1.0);

              float dens = sampleCloudDensity(samplePos, heightNorm, true);

              if (dens > 0.004) {
                float lightEnergy = marchLightEnergy(samplePos, roEarth, activeLightDir, dens, cosTheta);

                // Vertical ambient gradient: bright sky zenith bounce on tops, soft atmospheric cool/warm bounce on bases
                vec3 skyTopAmbient = mix(uBaseColor, uSkyZenithColor * 1.18 + vec3(0.18), 0.24);
                vec3 skyBottomAmbient = mix(uUndersideColor, uSkyHorizonColor * 0.78, 0.28);
                vec3 ambientCol = mix(skyBottomAmbient, skyTopAmbient, smoothstep(0.06, 0.85, heightNorm));

                // Direct sunlight / moonlight scattering with silver-lining rim
                float scatterStrength = mix(0.95, 1.45, uSunsetFactor) * (1.0 - uNightFactor * 0.45);
                vec3 directCol = activeLightCol * uHighlightColor * (0.42 + phase * 1.65) * scatterStrength;
                vec3 silverRim = activeLightCol * silverBoost * (1.0 - dens * 0.52) * (0.65 - uNightFactor * 0.35);

                vec3 sampleColor = ambientCol * (0.58 + 0.42 * lightEnergy) + directCol * lightEnergy + silverRim * lightEnergy;

                // Sunset/Dawn warm glowing underside & rosy backlit tops
                if (uSunsetFactor > 0.01) {
                  vec3 twilightWarm = vec3(1.0, 0.52, 0.28);
                  float underGlow = (1.0 - heightNorm) * smoothstep(0.15, 0.85, lightEnergy);
                  sampleColor = mix(sampleColor, sampleColor * vec3(1.06, 0.82, 0.72) + twilightWarm * 0.22, uSunsetFactor * (0.35 + underGlow * 0.45));
                }

                // Internal thunderstorm sheet lightning flash inside dense cloud cores
                if (uLightningFlash > 0.01) {
                  float coreGlow = smoothstep(0.18, 0.65, dens) * (0.4 + 0.6 * (1.0 - heightNorm));
                  sampleColor += vec3(0.75, 0.88, 1.0) * coreGlow * uLightningFlash * 1.65;
                }

                // Physically-based energy-conserving step integration
                float sigmaT = dens * 0.042;
                float stepTrans = exp(-sigmaT * baseStep);
                float alphaStep = 1.0 - stepTrans;

                accumLight += transmittance * sampleColor * alphaStep;
                weightedDist += transmittance * alphaStep * t;
                weightSum += transmittance * alphaStep;
                transmittance *= stepTrans;
              }

              t += baseStep;
            }
          }

          float cloudAlpha = (1.0 - transmittance) * uOpacity;

          // Atmospheric aerial perspective: distant cumulus clouds blend naturally into sky horizon haze
          if (cloudAlpha > 0.005) {
            float avgDist = weightSum > 0.0001 ? (weightedDist / weightSum) : tStart;
            float aerialFactor = 1.0 - exp(-max(0.0, avgDist - 320.0) * 0.00042);
            vec3 horizonTint = uSkyHorizonColor + activeLightCol * pow(max(0.0, cosTheta), 8.0) * 0.18 * (1.0 - uNightFactor * 0.7);
            vec3 cloudCol = accumLight / max(0.001, 1.0 - transmittance);
            cloudCol = mix(cloudCol, horizonTint, clamp(aerialFactor * 0.78, 0.0, 0.82));

            // Smooth horizon fade right at the curvature edge
            float distFade = 1.0 - smoothstep(2400.0, 4100.0, avgDist);
            cloudAlpha *= distFade;
            accumLight = cloudCol * cloudAlpha;
          } else {
            accumLight = vec3(0.0);
            cloudAlpha = 0.0;
          }

          // Composite high-altitude cirrus behind volumetric cumulus
          float cirrusVis = cirrus.a * (1.0 - cloudAlpha);
          vec3 finalPremult = accumLight + cirrus.rgb * cirrusVis;
          float finalAlpha = clamp(cloudAlpha + cirrusVis, 0.0, 0.98);

          if (finalAlpha < 0.006) discard;
          gl_FragColor = vec4(finalPremult / finalAlpha, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
    });

    // Atmospheric volumetric sky dome (860m radius, inside SkyDome 950m so mountains occlude horizon clouds cleanly)
    const domeGeo = new THREE.SphereGeometry(860, 48, 24);
    this.canopyMesh = new THREE.Mesh(domeGeo, this.cloudMaterial);
    this.canopyMesh.frustumCulled = false;
    this.canopyMesh.renderOrder = -500;
    this.cloudGroup.add(this.canopyMesh);

    this.scene.add(this.cloudGroup);
  }

  public update(
    deltaTime: number,
    playerPos: THREE.Vector3,
    weather: WeatherState,
    timeOfDay: number = 12.0,
    sunDir?: THREE.Vector3,
    envContext?: CloudEnvironmentContext
  ): void {
    if (!this.cloudGroup.visible) return;

    // Hide clouds cleanly when eyes are submerged underwater
    if (envContext?.isEyesInWater) {
      this.canopyMesh.visible = false;
      return;
    }
    this.canopyMesh.visible = true;

    // Keep volumetric sky dome centered on camera/player in 3D
    this.cloudGroup.position.copy(playerPos);
    this.cloudMaterial.uniforms.uCameraPos.value.copy(playerPos);
    this.cloudMaterial.uniforms.uTime.value += deltaTime;

    // Smooth wind drift across the sky
    const windSpeed = (weather.windSpeed || 2.0) * deltaTime * 0.0022;
    const dx = Math.cos(weather.windAngle || 0.5) * windSpeed;
    const dz = Math.sin(weather.windAngle || 0.5) * windSpeed;
    this.windOffset.x += dx;
    this.windOffset.y += dz;
    this.cloudMaterial.uniforms.uWindOffset.value.copy(this.windOffset);
    this.cloudDrift += deltaTime * 0.08 * (weather.windSpeed || 2.0);

    // Smooth sunset / dawn / night transition factors
    const sunsetFactor =
      timeOfDay >= 16.5 && timeOfDay < 19.2
        ? Math.sin(((timeOfDay - 16.5) / 2.7) * Math.PI)
        : timeOfDay >= 4.8 && timeOfDay < 7.2
        ? Math.sin(((timeOfDay - 4.8) / 2.4) * Math.PI)
        : 0.0;

    const nightFactor =
      timeOfDay < 4.8 || timeOfDay >= 19.2
        ? 1.0
        : timeOfDay >= 17.4 && timeOfDay < 19.2
        ? (timeOfDay - 17.4) / 1.8
        : timeOfDay >= 4.8 && timeOfDay < 6.4
        ? (6.4 - timeOfDay) / 1.6
        : 0.0;

    const isSunset = timeOfDay >= 16.5 && timeOfDay < 19.0;
    const isDawn = timeOfDay >= 5.0 && timeOfDay < 7.5;
    const isNight = timeOfDay < 5.0 || timeOfDay >= 19.0;

    const targetBase = CloudSystem._scratchTargetBase.setHex(0xf8fbff);
    const targetUnderside = CloudSystem._scratchTargetUnderside.setHex(0x6e84a6);
    const targetHighlight = CloudSystem._scratchTargetHighlight.setHex(0xfffcf2);
    let targetOpacity = 0.94;
    let targetCoverage = 0.46;
    let targetCloudType = 0.55;
    let targetDensityScale = 1.05;
    let targetCirrusOpacity = 0.36;

    if (weather.type === 'storm') {
      targetBase.setRGB(0.28, 0.32, 0.40);
      targetUnderside.setRGB(0.11, 0.13, 0.20);
      targetHighlight.setRGB(0.52, 0.56, 0.66);
      targetOpacity = 0.98;
      targetCoverage = 0.82;
      targetCloudType = 0.92;
      targetDensityScale = 1.45;
      targetCirrusOpacity = 0.10;
    } else if (weather.type === 'rain' || weather.type === 'monsoon_rain') {
      targetBase.setRGB(0.54, 0.60, 0.69);
      targetUnderside.setRGB(0.26, 0.32, 0.42);
      targetHighlight.setRGB(0.76, 0.81, 0.88);
      targetOpacity = 0.96;
      targetCoverage = 0.72;
      targetCloudType = 0.68;
      targetDensityScale = 1.25;
      targetCirrusOpacity = 0.14;
    } else if (weather.type === 'rimba_mist') {
      targetBase.setRGB(0.86, 0.92, 0.95);
      targetUnderside.setRGB(0.54, 0.64, 0.74);
      targetHighlight.setRGB(0.97, 0.99, 1.0);
      targetOpacity = 0.88;
      targetCoverage = 0.58;
      targetCloudType = 0.38;
      targetDensityScale = 0.92;
      targetCirrusOpacity = 0.42;
    } else if (weather.type === 'snow') {
      targetBase.setRGB(0.88, 0.92, 0.97);
      targetUnderside.setRGB(0.54, 0.61, 0.72);
      targetHighlight.setRGB(0.98, 0.99, 1.0);
      targetOpacity = 0.92;
      targetCoverage = 0.66;
      targetCloudType = 0.46;
      targetDensityScale = 1.1;
      targetCirrusOpacity = 0.28;
    } else if (isSunset) {
      targetBase.setRGB(0.98, 0.68, 0.52);
      targetUnderside.setRGB(0.36, 0.25, 0.44);
      targetHighlight.setRGB(1.0, 0.82, 0.50);
      targetCirrusOpacity = 0.48;
    } else if (isDawn) {
      targetBase.setRGB(0.97, 0.76, 0.64);
      targetUnderside.setRGB(0.38, 0.30, 0.48);
      targetHighlight.setRGB(1.0, 0.88, 0.68);
      targetCirrusOpacity = 0.44;
    } else if (isNight) {
      targetBase.setRGB(0.14, 0.18, 0.28);
      targetUnderside.setRGB(0.06, 0.08, 0.14);
      targetHighlight.setRGB(0.48, 0.62, 0.84);
      targetOpacity = 0.82;
      targetCirrusOpacity = 0.20;
    }

    const lerpAmt = Math.min(1, deltaTime * 2.5);
    this.currentBaseColor.lerp(targetBase, lerpAmt);
    this.currentUndersideColor.lerp(targetUnderside, lerpAmt);
    this.currentHighlightColor.lerp(targetHighlight, lerpAmt);
    this.currentCoverage = THREE.MathUtils.lerp(this.currentCoverage, targetCoverage, Math.min(1, deltaTime * 1.2));
    this.currentCloudType = THREE.MathUtils.lerp(this.currentCloudType, targetCloudType, Math.min(1, deltaTime * 1.2));
    this.currentDensityScale = THREE.MathUtils.lerp(this.currentDensityScale, targetDensityScale, Math.min(1, deltaTime * 1.5));
    this.currentCirrusOpacity = THREE.MathUtils.lerp(this.currentCirrusOpacity, targetCirrusOpacity, Math.min(1, deltaTime * 1.5));

    // Smooth lightning flash decay for internal cloud-core sheet illumination
    const targetFlash = envContext?.lightningFlash ? 1.0 : 0.0;
    this.currentLightningFlash = envContext?.lightningFlash
      ? 1.0
      : THREE.MathUtils.lerp(this.currentLightningFlash, targetFlash, Math.min(1, deltaTime * 8.0));

    const u = this.cloudMaterial.uniforms;
    u.uBaseColor.value.copy(this.currentBaseColor);
    u.uUndersideColor.value.copy(this.currentUndersideColor);
    u.uHighlightColor.value.copy(this.currentHighlightColor);
    u.uCoverage.value = this.currentCoverage;
    u.uCloudType.value = this.currentCloudType;
    u.uDensityScale.value = this.currentDensityScale;
    u.uCirrusOpacity.value = this.currentCirrusOpacity;
    u.uNightFactor.value = THREE.MathUtils.clamp(nightFactor, 0.0, 1.0);
    u.uSunsetFactor.value = THREE.MathUtils.clamp(sunsetFactor, 0.0, 1.0);
    u.uLightningFlash.value = this.currentLightningFlash;
    u.uOpacity.value = THREE.MathUtils.lerp(u.uOpacity.value, targetOpacity, Math.min(1, deltaTime * 2.0));

    if (sunDir) {
      CloudSystem._scratchSunDir.copy(sunDir).normalize();
      u.uSunDirection.value.copy(CloudSystem._scratchSunDir);
    }

    if (envContext) {
      if (envContext.sunColor) {
        this.currentSunColor.lerp(envContext.sunColor, lerpAmt);
        u.uSunColor.value.copy(this.currentSunColor);
      }
      if (envContext.moonDirection) {
        CloudSystem._scratchMoonDir.copy(envContext.moonDirection).normalize();
        u.uMoonDirection.value.copy(CloudSystem._scratchMoonDir);
      }
      if (envContext.moonColor) {
        this.currentMoonColor.lerp(envContext.moonColor, lerpAmt);
        u.uMoonColor.value.copy(this.currentMoonColor);
      }
      if (envContext.skyZenithColor) {
        this.currentSkyZenith.lerp(envContext.skyZenithColor, lerpAmt);
        u.uSkyZenithColor.value.copy(this.currentSkyZenith);
      }
      if (envContext.skyHorizonColor) {
        this.currentSkyHorizon.lerp(envContext.skyHorizonColor, lerpAmt);
        u.uSkyHorizonColor.value.copy(this.currentSkyHorizon);
      }
      if (envContext.quality) {
        const steps =
          envContext.quality === 'ultra' ? 24.0
          : envContext.quality === 'high' ? 20.0
          : envContext.quality === 'medium' ? 16.0
          : 12.0;
        u.uQualitySteps.value = steps;
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.cloudGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.cloudGroup);
    this.canopyMesh.geometry.dispose();
    this.cloudMaterial.dispose();
  }
}
