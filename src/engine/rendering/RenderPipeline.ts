// Unified Centralized 4K Render Pipeline with SSAO, Selective Bloom, Color Grading & Anti-Aliasing
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { GraphicsSettings } from '../ui/SettingsManager';

// Custom Cinematic Color Grading + Luma-Guided Contrast-Adaptive Sharpening (CAS) Shader
const CinematicPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uExposure: { value: 1.0 },
    uContrast: { value: 1.08 },
    uSaturation: { value: 1.12 },
    uWarmth: { value: 0.0 },
    uSharpenStrength: { value: 0.36 },
    uUnderwater: { value: 0.0 },
    uColorGradingMode: { value: 1 }, // 0: None, 1: Cinematic, 2: Vibrant, 3: Warm Golden, 4: Cool Twilight
    uTexelSize: { value: new THREE.Vector2(1.0 / 1920.0, 1.0 / 1080.0) },
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
    uniform vec2 uTexelSize;
    varying vec2 vUv;

    float getLuma(vec3 rgb) {
      return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    }

    void main() {
      vec2 texel = uTexelSize;
      
      // Center & 4-tap neighbor sampling for Luma-Guided Contrast-Adaptive Sharpening (CAS)
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      
      if (uSharpenStrength > 0.01) {
        vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb;
        vec3 e = texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb;
        vec3 w = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb;
        
        // Luma-guided adaptive weight prevents bright/dark haloing on high-contrast sky edges
        float lc = getLuma(c);
        float ln = getLuma(n);
        float ls = getLuma(s);
        float le = getLuma(e);
        float lw = getLuma(w);
        float minL = min(lc, min(min(ln, ls), min(le, lw)));
        float maxL = max(lc, max(max(ln, ls), max(le, lw)));
        float localContrast = maxL - minL;
        float casWeight = clamp(1.0 - smoothstep(0.35, 0.85, localContrast), 0.35, 1.0);

        vec3 neighbors = (n + s + e + w) * 0.25;
        vec3 diff = c - neighbors;
        c = max(vec3(0.0), c + diff * (uSharpenStrength * 1.15 * casWeight));
      }

      // Underwater distortion & aquatic tint override
      if (uUnderwater > 0.01) {
        vec2 distortedUv = vUv + vec2(sin(vUv.y * 20.0 + uTime * 3.0) * 0.002, cos(vUv.x * 20.0 + uTime * 2.5) * 0.002);
        c = texture2D(tDiffuse, distortedUv).rgb;
        vec3 aquaTint = vec3(0.15, 0.70, 0.85);
        c = mix(c, c * aquaTint * 1.5, uUnderwater * 0.45);
      }

      // Crisp S-curve Contrast (Toe-protected to preserve shadow visibility without milky lift)
      vec3 contrasted = (c - 0.5) * uContrast + 0.5;
      c = max(contrasted, c * 0.38);

      // Clean Natural Saturation
      float luma = getLuma(c);
      c = mix(vec3(luma), c, uSaturation);

      // Color Grading profiles (Zero milky black-floor haze)
      if (uColorGradingMode == 1) {
        // Cinematic: crisp natural dynamic range with clean shadow separation
        c.r = pow(max(c.r, 0.0), 0.97);
        c.g = pow(max(c.g, 0.0), 0.98);
        c.b = pow(max(c.b, 0.0), 0.97);
      } else if (uColorGradingMode == 2) {
        // Vibrant
        c = mix(vec3(luma), c, 1.22);
      } else if (uColorGradingMode == 3) {
        // Warm Golden
        c.r *= 1.05;
        c.g *= 1.02;
      } else if (uColorGradingMode == 4) {
        // Cool Twilight
        c.r *= 0.97;
        c.b *= 1.06;
      }

      // Warmth shift
      if (abs(uWarmth) > 0.01) {
        c.r += uWarmth * 0.05;
        c.b -= uWarmth * 0.05;
      }

      // Preserve linear/graded signal for OutputPass to perform unified ACESFilmicToneMapping
      c = max(c, vec3(0.0));

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
  private ssaoPass: SSAOPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private postPass: ShaderPass | null = null;
  private aaPass: SMAAPass | FXAAPass | null = null;
  private outputPass: OutputPass | null = null;

  public isPostProcessingActive = false;
  private currentWidth = 0;
  private currentHeight = 0;

  // Optimized Bloom Resolution Capping (Preserves 60 FPS on 1080p, 1440p, and 4K)
  private static readonly MAX_BLOOM_WIDTH = 960;
  private static readonly MAX_BLOOM_HEIGHT = 540;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.currentWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    this.currentHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    this.initPipeline();
    this.initGpuTimer();
  }

  private calculateBloomResolution(width: number, height: number): [number, number] {
    const halfW = Math.max(256, Math.round(width * 0.5));
    const halfH = Math.max(144, Math.round(height * 0.5));
    const bloomW = Math.min(RenderPipeline.MAX_BLOOM_WIDTH, halfW);
    const bloomH = Math.min(RenderPipeline.MAX_BLOOM_HEIGHT, halfH);
    return [bloomW, bloomH];
  }

  public initPipeline(): void {
    if (
      !this.renderer ||
      typeof this.renderer.getPixelRatio !== 'function' ||
      typeof this.renderer.getSize !== 'function'
    ) {
      this.isPostProcessingActive = false;
      if (this.renderer) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      }
      this.composer = null;
      return;
    }

    try {
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      // SSAO Pass
      this.ssaoPass = new SSAOPass(this.scene, this.camera, this.currentWidth, this.currentHeight);
      this.ssaoPass.kernelRadius = 1.2;
      this.ssaoPass.minDistance = 0.005;
      this.ssaoPass.maxDistance = 0.15;
      this.ssaoPass.enabled = false; // Configured and enabled via settings
      this.composer.addPass(this.ssaoPass);

      // 1. Capped half-resolution selective bloom pass (high threshold so sky/fog never haze)
      const [bloomW, bloomH] = this.calculateBloomResolution(this.currentWidth, this.currentHeight);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(bloomW, bloomH),
        0.22,  // Subtle strength for emissives only
        0.35,  // Tight radius for zero haze bleed
        1.28   // High threshold so sunlit terrain & horizon stay razor-sharp
      );
      this.composer.addPass(this.bloomPass);

      // 2. Custom Color Grading + Inverse Resolution Sharpening Pass
      this.postPass = new ShaderPass(CinematicPostShader);
      this.postPass.uniforms.uTexelSize.value.set(1.0 / Math.max(1, this.currentWidth), 1.0 / Math.max(1, this.currentHeight));
      this.composer.addPass(this.postPass);

      // 3. Anti-Aliasing (SMAA)
      this.aaPass = new SMAAPass();
      this.composer.addPass(this.aaPass);

      // 4. Output Color Space & Tone Mapping Pass
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      // Unified single ACESFilmicToneMapping handled by OutputPass using renderer settings
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.isPostProcessingActive = true;
    } catch (e) {
      console.warn('[RenderPipeline] Post-processing initialization failed, falling back to direct render:', e);
      this.isPostProcessingActive = false;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.composer = null;
    }
  }

  public updateSettings(settings: GraphicsSettings, width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    if (!settings.postProcessing) {
      this.isPostProcessingActive = false;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      return;
    }

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.isPostProcessingActive = true;

    if (!this.composer) {
      this.initPipeline();
    }

    if (!this.composer) {
      this.isPostProcessingActive = false;
      return;
    }

    this.composer.setSize(width, height);

    // Update SSAO Pass
    if (this.ssaoPass) {
      this.ssaoPass.enabled = settings.ambientOcclusion;
      if (settings.ambientOcclusion) {
        const quality = settings.ambientOcclusionQuality || 'medium';
        if (quality === 'low') {
          this.ssaoPass.kernelRadius = 0.8;
          (this.ssaoPass as any).minDistance = 0.008;
          (this.ssaoPass as any).maxDistance = 0.10;
        } else if (quality === 'medium') {
          this.ssaoPass.kernelRadius = 1.2;
          (this.ssaoPass as any).minDistance = 0.005;
          (this.ssaoPass as any).maxDistance = 0.15;
        } else if (quality === 'high') {
          this.ssaoPass.kernelRadius = 1.8;
          (this.ssaoPass as any).minDistance = 0.002;
          (this.ssaoPass as any).maxDistance = 0.20;
        }
      }
    }

    // Update Bloom Pass
    if (this.bloomPass) {
      this.bloomPass.enabled = settings.bloom;
      const bloomStrength = (settings as any).bloomStrength ?? 0.22;
      this.bloomPass.strength = Math.min(0.28, bloomStrength);
      const [bloomW, bloomH] = this.calculateBloomResolution(width, height);
      (this.bloomPass as any).resolution.set(bloomW, bloomH);
    }

    // Update Post Pass (Color Grading & Dynamic Texel Sharpening)
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
      const sharpenStr = Math.max(0.34, (settings as any).sharpenStrength ?? 0.36);
      this.postPass.uniforms.uSharpenStrength.value = sharpen ? sharpenStr : 0.0;
      this.postPass.uniforms.uTexelSize.value.set(1.0 / Math.max(1, width), 1.0 / Math.max(1, height));
    }

    // Anti-Aliasing Pass
    const aaMode = (settings as any).antiAliasingMode || (settings.antiAliasing ? 'smaa' : 'off');
    if (this.aaPass) {
      this.aaPass.enabled = aaMode !== 'off';
    }
  }

  public lastGpuTimeMs: number = 0;
  private timerExtension: any = null;
  private gpuQuery: any = null;
  private isQueryActive: boolean = false;

  private initGpuTimer(): void {
    try {
      const gl = this.renderer.getContext();
      if (gl && typeof (gl as any).getExtension === 'function') {
        this.timerExtension = (gl as any).getExtension('EXT_disjoint_timer_query_webgl2');
        if (this.timerExtension && typeof (gl as any).createQuery === 'function') {
          this.gpuQuery = (gl as any).createQuery();
        }
      }
    } catch {
      // Fallback to CPU timer if extension unsupported
    }
  }

  public getGpuTimeMs(): number {
    return this.lastGpuTimeMs;
  }

  public render(deltaTime: number, isEyesInWater: boolean = false, exposure: number = 1.0): void {
    const gl = this.renderer.getContext() as any;
    let queryBegan = false;

    if (this.timerExtension && this.gpuQuery && gl) {
      if (this.isQueryActive) {
        const available = gl.getQueryParameter(this.gpuQuery, gl.QUERY_RESULT_AVAILABLE);
        const disjoint = gl.getParameter(this.timerExtension.GPU_DISJOINT_EXT);
        if (available && !disjoint) {
          const timeNs = gl.getQueryParameter(this.gpuQuery, gl.QUERY_RESULT);
          this.lastGpuTimeMs = timeNs / 1e6;
          gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT, this.gpuQuery);
          queryBegan = true;
        }
      } else {
        gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT, this.gpuQuery);
        this.isQueryActive = true;
        queryBegan = true;
      }
    }

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

    if (queryBegan && gl) {
      gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT);
    }
  }

  public setSize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    if (this.composer) {
      this.composer.setSize(width, height);

      // Capped Bloom Resolution to avoid GPU fillrate bottleneck on 1440p and 4K
      if (this.bloomPass) {
        const [bloomW, bloomH] = this.calculateBloomResolution(width, height);
        (this.bloomPass as any).resolution.set(bloomW, bloomH);
      }

      if (this.ssaoPass) {
        this.ssaoPass.setSize(width, height);
      }

      if (this.postPass) {
        this.postPass.uniforms.uTexelSize.value.set(1.0 / Math.max(1, width), 1.0 / Math.max(1, height));
      }
    }
  }

  public dispose(): void {
    if (this.composer) {
      this.composer.passes.forEach((pass) => pass.dispose && pass.dispose());
      if (this.composer.renderTarget1) {
        this.composer.renderTarget1.dispose();
      }
      if (this.composer.renderTarget2) {
        this.composer.renderTarget2.dispose();
      }
      this.composer = null;
    }
  }
}
