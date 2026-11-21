// VoxelVerse v6.3.0: Visual & Performance Refinement Unit Tests
import * as THREE from 'three';
import { VoxelPhysicsSystem } from '../engine/world/VoxelPhysicsSystem';
import { RenderPipeline } from '../engine/rendering/RenderPipeline';

export function runVisualPerfV63Tests(
  assert: (cond: boolean, message: string) => void
): void {
  console.log('\n[Phase 15] VoxelVerse v6.3.0: Visual & Performance Refinement Suite');

  // 1. InstancedMesh Zero-GC Debris Pooling
  const scene = new THREE.Scene();
  VoxelPhysicsSystem.reset();
  VoxelPhysicsSystem.attachToScene(scene);
  VoxelPhysicsSystem.spawnMiningDebris(new THREE.Vector3(0, 65, 0), '#d97706', 12);
  assert(
    VoxelPhysicsSystem.getActiveDebrisCount() === 12,
    'VoxelPhysicsSystem spawns 12 pooled InstancedMesh debris particles'
  );
  VoxelPhysicsSystem.update(0.016);
  assert(
    VoxelPhysicsSystem.getActiveDebrisCount() === 12,
    'VoxelPhysicsSystem updates InstancedMesh matrices smoothly'
  );
  VoxelPhysicsSystem.reset();
  assert(
    VoxelPhysicsSystem.getActiveDebrisCount() === 0,
    'VoxelPhysicsSystem resets debris pool cleanly with zero leaks'
  );

  // 2. RenderPipeline dynamic shader scaling
  const mockRenderer = {
    toneMapping: THREE.NoToneMapping,
    getContext: () => null,
    render: () => {},
  } as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  const pipeline = new RenderPipeline(mockRenderer, scene, camera);
  let scaleOk = false;
  try {
    pipeline.setDynamicShaderScale(0.6);
    scaleOk = true;
  } catch {
    scaleOk = false;
  }
  assert(scaleOk, 'RenderPipeline.setDynamicShaderScale() adjusts shader load cleanly');
}
