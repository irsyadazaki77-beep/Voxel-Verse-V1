// VoxelVerse v6.2.0: Photorealistic World Shader Overhaul Unit Tests
import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../engine/ui/SettingsManager';
import { RenderPipeline } from '../engine/rendering/RenderPipeline';

export function runShaderRealismV62Tests(
  assert: (cond: boolean, message: string) => void
): void {
  console.log('\n[Phase 14] VoxelVerse v6.2.0: Photorealistic Shader Overhaul Suite');

  // 1. SettingsManager shaderRealism default & presets
  assert(
    DEFAULT_SETTINGS.graphics.shaderRealism === 'realistic',
    'DEFAULT_SETTINGS.graphics.shaderRealism defaults to realistic'
  );

  // 2. RenderPipeline graceful initialization & sun-tracked render call
  const mockRenderer = {
    toneMapping: THREE.NoToneMapping,
    getContext: () => null,
    render: () => {},
  } as unknown as THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  camera.position.set(0, 66, 0);
  camera.lookAt(0, 66, -10);
  camera.updateMatrixWorld();

  const pipeline = new RenderPipeline(mockRenderer, scene, camera);
  let renderOk = false;
  try {
    pipeline.render(0.016, false, 1.0, new THREE.Vector3(0, 0.4, -0.9).normalize(), false);
    renderOk = true;
  } catch {
    renderOk = false;
  }
  assert(renderOk, 'RenderPipeline.render() executes cleanly with sunDirection & isNight telemetry');
}
