// Unified Centralized 4K Render Pipeline with SSAO, Selective Bloom, Color Grading & Anti-Aliasing
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GraphicsSettings } from '../ui/SettingsManager';

// Custom Cinematic Color Grading + Sharpening Shader
const CinematicPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uExposure: { value: 1.0 },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.08 },
    uWarmth: { value: 0.0 },
    uSharpenStrength: { value: 0.25 },
    uUnderwater: { value: 0.0 },
    uColorGradingMode: { value: 1 }, // 0: None, 1: Cinematic, 2: Vibrant, 3: Warm Golden, 4: Cool Twilight
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uWarmth;
    uniform float uSharpenStrength;
    uniform float uUnderwater;
    uniform int uColorGradingMode;
    varying vec2 vUv;

    // ACES Filmic Tone Mapping Curve
    vec3 ACESFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      vec2 texel = vec2(1.0 / 1920.0, 1.0 / 1080.0);
      
      // Center & 4-tap neighbor sampling for contrast-adaptive sharpening (CAS)
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      
      if (uSharpenStrength > 0.01) {
        vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb;
        vec3 e = texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb;
        vec3 w = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb;
        
        vec3 neighbors = (n + s + e + w) * 0.25;
        vec3 diff = c - neighbors;
        c = clamp(c + diff * uSharpenStrength, 0.0, 1.0);
      }

      // Exposure adjustment
      c *= uExposure;

      // Underwater distortion & aquatic tint override
      if (uUnderwater > 0.01) {
        vec2 distortedUv = vUv + vec2(sin(vUv.y * 20.0 + uTime * 3.0) * 0.002, cos(vUv.x * 20.0 + uTime * 2.5) * 0.002);
        c = texture2D(tDiffuse, distortedUv).rgb * uExposure;
        vec3 aquaTint = vec3(0.15, 0.70, 0.85);
        c = mix(c, c * aquaTint * 1.5, uUnderwater * 0.45);
      }

      // S-curve Contrast
      c = (c - 0.5) * uContrast + 0.5;

      // Saturation
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, uSaturation);

      // Color Grading profiles
      if (uColorGradingMode == 1) {
        // Cinematic: subtle teal/orange split-toning
        c.r = pow(c.r, 0.95) + 0.02;
        c.b = pow(c.b, 1.05) - 0.01;
      } else if (uColorGradingMode == 2) {
        // Vibrant
        c = mix(vec3(luma), c, 1.25);
      } else if (uColorGradingMode == 3) {
        // Warm Golden
        c.r += 0.04;
        c.g += 0.02;
      } else if (uColorGradingMode == 4) {
        // Cool Twilight
        c.r -= 0.02;
        c.b += 0.05;
      }

      // Warmth shift
      if (abs(uWarmth) > 0.01) {
        c.r += uWarmth * 0.05;
        c.b -= uWarmth * 0.05;
      }

      // ACES Tone Mapping
      c = ACESFilm(c);

      gl_FragColor = vec4(c, 1.0);
    }
  `
};

export class RenderPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private postPass: ShaderPass | null = null;
  private aaPass: SMAAPass | FXAAPass | null = null;
  private outputPass: OutputPass | null = null;

  public isPostProcessingActive = false;
  private currentWidth = 0;
  private currentHeight = 0;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.currentWidth = window.innerWidth;
    this.currentHeight = window.innerHeight;

    this.initPipeline();
  }

  public initPipeline(): void {
    try {
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      // 1. Selective Bloom Pass (emissive blocks, torches, sun, crystals)
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.currentWidth, this.currentHeight),
        0.35,  // Strength
        0.30,  // Radius
        0.85   // Threshold
      );
      this.composer.addPass(this.bloomPass);

      // 2. Custom Color Grading + Sharpening Pass
      this.postPass = new ShaderPass(CinematicPostShader);
      this.composer.addPass(this.postPass);

      // 3. Anti-Aliasing (SMAA)
      this.aaPass = new SMAAPass();
      this.composer.addPass(this.aaPass);

      // 4. Output Color Space Pass
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      this.isPostProcessingActive = true;
    } catch (e) {
      console.warn('[RenderPipeline] Post-processing initialization failed, falling back to direct render:', e);
      this.isPostProcessingActive = false;
      this.composer = null;
    }
  }

  public updateSettings(settings: GraphicsSettings, width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    if (!settings.postProcessing) {
      this.isPostProcessingActive = false;
      return;
    }

    this.isPostProcessingActive = true;

    if (!this.composer) {
      this.initPipeline();
    }

    if (!this.composer) return;

    this.composer.setSize(width, height);

    // Update Bloom Pass
    if (this.bloomPass) {
      this.bloomPass.enabled = settings.bloom;
      const bloomStrength = (settings as any).bloomStrength ?? 0.35;
      this.bloomPass.strength = bloomStrength;
    }

    // Update Post Pass (Color Grading & Sharpening)
    if (this.postPass) {
      const modeMap: Record<string, number> = {
        none: 0,
        cinematic: 1,
        vibrant: 2,
        warm_golden: 3,
        cool_twilight: 4,
      };
      const cgMode = (settings as any).colorGrading || 'cinematic';
      this.postPass.uniforms.uColorGradingMode.value = modeMap[cgMode] ?? 1;

      const sharpen = (settings as any).sharpening !== false;
      const sharpenStr = (settings as any).sharpenStrength ?? 0.25;
      this.postPass.uniforms.uSharpenStrength.value = sharpen ? sharpenStr : 0.0;
    }

    // Anti-Aliasing Pass
    const aaMode = (settings as any).antiAliasingMode || (settings.antiAliasing ? 'smaa' : 'off');
    if (this.aaPass) {
      this.aaPass.enabled = aaMode !== 'off';
    }
  }

  public render(deltaTime: number, isEyesInWater: boolean = false, exposure: number = 1.0): void {
    if (this.isPostProcessingActive && this.composer) {
      if (this.postPass) {
        this.postPass.uniforms.uTime.value += deltaTime;
        this.postPass.uniforms.uExposure.value = exposure;
        this.postPass.uniforms.uUnderwater.value = isEyesInWater ? 1.0 : 0.0;
      }
      this.composer.render(deltaTime);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public setSize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  public dispose(): void {
    if (this.composer) {
      this.composer.passes.forEach((pass) => pass.dispose && pass.dispose());
      this.composer = null;
    }
  }
}
