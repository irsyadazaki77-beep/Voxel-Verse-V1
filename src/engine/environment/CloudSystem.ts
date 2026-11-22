// Volumetric Procedural FBM Cloud Canopy System (v8.2.0)
// Features: Multi-Octave Domain-Warped FBM Cumulus Clouds, Beer-Lambert Sun Self-Shadowing,
// Henyey-Greenstein Silver-Lining Scattering, Weather Coverage Adaptation & Horizon Curvature Fade.
import * as THREE from 'three';
import { WeatherState } from '../../types';

export class CloudSystem {
  public cloudGroup: THREE.Group;
  public cloudMaterial: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private canopyMesh: THREE.Mesh;

  public cloudDrift: number = 0;
  private currentBaseColor = new THREE.Color(0xf8fbff);
  private currentUndersideColor = new THREE.Color(0x7c8ea8);
  private currentHighlightColor = new THREE.Color(0xfff9ee);
  private currentCoverage: number = 0.44;
  private windOffset = new THREE.Vector2(0, 0);

  private static readonly _scratchTargetBase = new THREE.Color();
  private static readonly _scratchTargetUnderside = new THREE.Color();
  private static readonly _scratchTargetHighlight = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cloudGroup = new THREE.Group();

    this.cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindOffset: { value: new THREE.Vector2(0, 0) },
        uSunDirection: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
        uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uBaseColor: { value: this.currentBaseColor },
        uUndersideColor: { value: this.currentUndersideColor },
        uHighlightColor: { value: this.currentHighlightColor },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uHorizonRadius: { value: 680.0 },
        uCoverage: { value: 0.44 },
        uOpacity: { value: 0.88 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying float vDist;
        uniform vec3 uCameraPos;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          float dist = length(worldPos.xz - uCameraPos.xz);
          // Subtle spherical earth curvature drop at far horizon for natural sky blending
          worldPos.y -= (dist * dist) * 0.00011;
          vWorldPos = worldPos.xyz;
          vDist = dist;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uWindOffset;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uBaseColor;
        uniform vec3 uUndersideColor;
        uniform vec3 uHighlightColor;
        uniform vec3 uCameraPos;
        uniform float uHorizonRadius;
        uniform float uCoverage;
        uniform float uOpacity;

        varying vec3 vWorldPos;
        varying float vDist;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float amp = 0.52;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 5; i++) {
            v += amp * valueNoise(p);
            p = rot * p * 2.04 + vec2(17.1, 31.7);
            amp *= 0.5;
          }
          return v;
        }

        float cloudDensity(vec2 uv) {
          // Domain-warped organic cumulus billowing
          vec2 warp = vec2(
            fbm(uv * 0.85 + vec2(uTime * 0.004, 0.0)),
            fbm(uv * 0.85 + vec2(5.2, -uTime * 0.003))
          );
          float base = fbm(uv + warp * 0.42);
          float detail = valueNoise(uv * 4.8 - warp * 0.6);
          float shape = base * 0.82 + detail * 0.18;
          return smoothstep(1.0 - uCoverage, 1.0 - uCoverage + 0.32, shape);
        }

        void main() {
          // Horizon radial fade (prevents hard canopy edge)
          float horizonFade = 1.0 - smoothstep(280.0, uHorizonRadius, vDist);
          if (horizonFade < 0.01) discard;

          vec2 cloudUv = vWorldPos.xz * 0.0052 + uWindOffset;
          float d = cloudDensity(cloudUv);
          if (d < 0.02) discard;

          // Directional Beer-Lambert self-shadowing toward sun
          vec3 sunDir = normalize(uSunDirection);
          vec2 sunStep = sunDir.xz * 0.065;
          float dSun = cloudDensity(cloudUv + sunStep);
          float selfShadow = clamp(exp(-(dSun - d * 0.35) * 2.6), 0.22, 1.0);

          // Henyey-Greenstein forward scattering silver-lining around sun
          vec3 viewDir = normalize(vWorldPos - uCameraPos);
          float cosTheta = max(0.0, dot(viewDir, sunDir));
          float silverLining = pow(cosTheta, 8.0) * 0.65 + pow(cosTheta, 32.0) * 0.55;

          // Vertical cloud thickness shading: bright sunlit tops, soft cool undersides
          float thickness = clamp(d * 1.15, 0.0, 1.0);
          vec3 litCol = mix(uUndersideColor, uBaseColor, smoothstep(0.08, 0.68, selfShadow));
          litCol = mix(litCol, uHighlightColor, smoothstep(0.52, 0.96, selfShadow) * 0.72);
          litCol += uSunColor * silverLining * (1.0 - thickness * 0.45) * 0.55;

          // Subtle upper-layer wispy cirrus veil
          float wisp = smoothstep(0.55, 0.92, fbm(cloudUv * 2.3 + vec2(12.4, -uTime * 0.006)));
          float finalAlpha = clamp((d * 0.92 + wisp * 0.12) * uOpacity * horizonFade, 0.0, 0.95);

          if (finalAlpha < 0.015) discard;
          gl_FragColor = vec4(litCol, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // High-altitude domed sky canopy at y=156m (soars cleanly above tallest peaks)
    const canopyGeo = new THREE.PlaneGeometry(1400, 1400, 24, 24);
    canopyGeo.rotateX(-Math.PI / 2);
    this.canopyMesh = new THREE.Mesh(canopyGeo, this.cloudMaterial);
    this.canopyMesh.position.y = 156;
    this.canopyMesh.frustumCulled = false;
    this.canopyMesh.renderOrder = -500;
    this.cloudGroup.add(this.canopyMesh);

    this.scene.add(this.cloudGroup);
  }

  public update(deltaTime: number, playerPos: THREE.Vector3, weather: WeatherState, timeOfDay: number = 12.0, sunDir?: THREE.Vector3): void {
    if (!this.cloudGroup.visible) return;

    // Keep cloud canopy centered over player
    this.cloudGroup.position.x = playerPos.x;
    this.cloudGroup.position.z = playerPos.z;
    this.cloudMaterial.uniforms.uCameraPos.value.copy(playerPos);
    this.cloudMaterial.uniforms.uTime.value += deltaTime;

    // Smooth wind drift across the sky
    const windSpeed = (weather.windSpeed || 2.0) * deltaTime * 0.011;
    const dx = Math.cos(weather.windAngle || 0.5) * windSpeed;
    const dz = Math.sin(weather.windAngle || 0.5) * windSpeed;
    this.windOffset.x += dx;
    this.windOffset.y += dz;
    this.cloudMaterial.uniforms.uWindOffset.value.copy(this.windOffset);
    this.cloudDrift += deltaTime * 0.08 * (weather.windSpeed || 2.0);

    // Atmosphere & Weather Color + Coverage Adaptation
    const isSunset = timeOfDay >= 16.5 && timeOfDay < 19.0;
    const isDawn = timeOfDay >= 5.0 && timeOfDay < 7.5;
    const isNight = timeOfDay < 5.0 || timeOfDay >= 19.0;

    const targetBase = CloudSystem._scratchTargetBase.setHex(0xf6f9ff);
    const targetUnderside = CloudSystem._scratchTargetUnderside.setHex(0x7c8ea8);
    const targetHighlight = CloudSystem._scratchTargetHighlight.setHex(0xfffaf0);
    let targetOpacity = 0.86;
    let targetCoverage = 0.44;

    if (weather.type === 'storm') {
      targetBase.setRGB(0.28, 0.31, 0.39);
      targetUnderside.setRGB(0.14, 0.16, 0.23);
      targetHighlight.setRGB(0.45, 0.49, 0.58);
      targetOpacity = 0.94;
      targetCoverage = 0.78;
    } else if (weather.type === 'rain' || weather.type === 'monsoon_rain') {
      targetBase.setRGB(0.56, 0.61, 0.69);
      targetUnderside.setRGB(0.30, 0.35, 0.44);
      targetHighlight.setRGB(0.74, 0.78, 0.85);
      targetOpacity = 0.90;
      targetCoverage = 0.70;
    } else if (weather.type === 'rimba_mist') {
      targetBase.setRGB(0.84, 0.90, 0.94);
      targetUnderside.setRGB(0.56, 0.64, 0.74);
      targetHighlight.setRGB(0.95, 0.98, 1.0);
      targetOpacity = 0.82;
      targetCoverage = 0.56;
    } else if (weather.type === 'snow') {
      targetBase.setRGB(0.88, 0.91, 0.96);
      targetUnderside.setRGB(0.56, 0.62, 0.72);
      targetHighlight.setRGB(0.97, 0.99, 1.0);
      targetOpacity = 0.88;
      targetCoverage = 0.64;
    } else if (isSunset) {
      targetBase.setRGB(0.98, 0.70, 0.54);
      targetUnderside.setRGB(0.42, 0.30, 0.48);
      targetHighlight.setRGB(1.0, 0.82, 0.54);
    } else if (isDawn) {
      targetBase.setRGB(0.97, 0.76, 0.64);
      targetUnderside.setRGB(0.42, 0.34, 0.52);
      targetHighlight.setRGB(1.0, 0.86, 0.68);
    } else if (isNight) {
      targetBase.setRGB(0.16, 0.20, 0.30);
      targetUnderside.setRGB(0.08, 0.10, 0.17);
      targetHighlight.setRGB(0.46, 0.58, 0.78);
      targetOpacity = 0.76;
    }

    const lerpAmt = Math.min(1, deltaTime * 2.5);
    this.currentBaseColor.lerp(targetBase, lerpAmt);
    this.currentUndersideColor.lerp(targetUnderside, lerpAmt);
    this.currentHighlightColor.lerp(targetHighlight, lerpAmt);
    this.currentCoverage = THREE.MathUtils.lerp(this.currentCoverage, targetCoverage, deltaTime * 1.2);

    this.cloudMaterial.uniforms.uBaseColor.value.copy(this.currentBaseColor);
    this.cloudMaterial.uniforms.uUndersideColor.value.copy(this.currentUndersideColor);
    this.cloudMaterial.uniforms.uHighlightColor.value.copy(this.currentHighlightColor);
    this.cloudMaterial.uniforms.uCoverage.value = this.currentCoverage;
    this.cloudMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      this.cloudMaterial.uniforms.uOpacity.value,
      targetOpacity,
      deltaTime * 2.0
    );

    if (sunDir) {
      this.cloudMaterial.uniforms.uSunDirection.value.copy(sunDir);
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
