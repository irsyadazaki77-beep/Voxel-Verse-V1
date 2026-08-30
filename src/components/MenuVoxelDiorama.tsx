// Realtime Stylized Three.js Voxel Diorama for VoxelVerse Main Menu
// Features:
// - Asymmetrical Hero Framing (65-72% viewport X) via MenuSceneFraming engine
// - Rich miniature voxel island: multi-tier terrain, mountain peak, waterfalls, river, pine & oak trees, campsite campfire
// - Dynamic lighting: warm amber sunlight, cool sky hemisphere fill, campfire pointlight
// - Floating drifting voxel clouds & campfire ember particle system
// - Cinematic 3/4 elevated camera framing with gentle orbit sway & subtle mouse parallax
// - Full resource disposal on unmount to ensure 0 memory leaks when launching gameplay

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MenuSceneFraming } from '../engine/ui/MenuSceneFraming';

export const MenuVoxelDiorama: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // 1. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Fog (Atmospheric Dark Navy matching UI background)
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04060c, 0.018);

    // 3. Perspective Camera
    let currentWidth = window.innerWidth;
    let currentHeight = window.innerHeight;
    let framing = MenuSceneFraming.compute(currentWidth, currentHeight);

    const camera = new THREE.PerspectiveCamera(
      45,
      currentWidth / currentHeight,
      0.5,
      150
    );

    // 4. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.4);
    sunLight.position.set(22, 28, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 70;
    const shadowBound = 18;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xa5f3fc, 0.6);
    rimLight.position.set(-15, 12, -20);
    scene.add(rimLight);

    // 5. Build Hero Voxel Island Diorama
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    // Shared Geometries Array to prevent memory leaks
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Shared Reusable Geometries
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const halfBoxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    geometriesToDispose.push(boxGeo, halfBoxGeo);

    // Shared Materials
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x48bb78 });
    const grassTopMat = new THREE.MeshLambertMaterial({ color: 0x38a169 });
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x22c55e, transparent: true, opacity: 0.95 });
    const pineLeavesMat = new THREE.MeshLambertMaterial({ color: 0x15803d, transparent: true, opacity: 0.95 });
    const ancientLeavesMat = new THREE.MeshLambertMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.92 }); // Crimson hero tree
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85, depthWrite: false });
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
    const snowMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const crystalMat = new THREE.MeshLambertMaterial({ color: 0xa855f7, emissive: 0x6b21a8, emissiveIntensity: 0.5 });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const tuftMat = new THREE.MeshLambertMaterial({ color: 0x86efac });

    // Separate group for animated water
    const waterGroup = new THREE.Group();
    dioramaGroup.add(waterGroup);

    // Procedural Floating Island Generation
    const islandRadius = 8.5;
    for (let x = -islandRadius; x <= islandRadius; x++) {
      for (let z = -islandRadius; z <= islandRadius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist > islandRadius + Math.sin(x * 1.5 + z * 0.8) * 0.9) continue;

        // Mountain ridge on one side, gentle valley with river/pond on other
        const mountainRidge = Math.exp(-Math.pow((x + 2.5) / 3.0, 2) - Math.pow((z + 2.5) / 3.0, 2)) * 5.5;
        const valley = Math.sin(x * 0.35 + 1.0) * 1.2 + Math.cos(z * 0.35) * 1.2;
        const baseElevation = (1 - dist / islandRadius) * 2.8;
        
        let elevation = Math.round(mountainRidge + valley + baseElevation);

        // River carve
        const isRiver = Math.abs(x - z * 0.6 - 1.5) < 1.1 && dist < 7;
        if (isRiver && elevation > 0) {
          elevation = Math.max(elevation - 2, 0);
        }

        for (let y = -4; y <= elevation; y++) {
          let mat = stoneMat;
          if (y === elevation) {
            if (y >= 6) mat = snowMat;
            else if (y <= 0 && dist > 4.5) mat = sandMat;
            else mat = y % 2 === 0 ? grassMat : grassTopMat;
          } else if (y >= elevation - 2) {
            mat = y >= 5 ? darkStoneMat : dirtMat;
          }

          const voxel = new THREE.Mesh(boxGeo, mat);
          voxel.position.set(x, y, z);
          voxel.castShadow = true;
          voxel.receiveShadow = true;
          dioramaGroup.add(voxel);
        }

        // River / Water Pool Basin
        if (elevation <= 0 || (isRiver && elevation <= 1)) {
          const water = new THREE.Mesh(boxGeo, waterMat);
          water.position.set(x, isRiver ? 0.75 : 0.15, z);
          waterGroup.add(water);
        } else if (elevation > 0 && elevation < 5 && Math.random() > 0.85 && !isRiver) {
          // Micro vegetation (Grass tufts)
          const tuft = new THREE.Mesh(halfBoxGeo, tuftMat);
          tuft.position.set(x + (Math.random() - 0.5) * 0.5, elevation + 0.75, z + (Math.random() - 0.5) * 0.5);
          tuft.scale.set(0.4, 0.5, 0.4);
          tuft.castShadow = true;
          dioramaGroup.add(tuft);
        }
      }
    }

    // Helper to spawn stylized trees
    const spawnTree = (tx: number, ty: number, tz: number, height: number = 4, type: 'oak' | 'pine' | 'ancient' = 'oak') => {
      // Wood trunk
      for (let h = 0; h < height; h++) {
        const trunk = new THREE.Mesh(boxGeo, woodMat);
        trunk.position.set(tx, ty + h, tz);
        if (type === 'ancient') trunk.scale.set(1.5, 1, 1.5);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        dioramaGroup.add(trunk);
      }

      const crownBase = ty + height - 1;
      let leafMaterial = leavesMat;
      if (type === 'pine') leafMaterial = pineLeavesMat;
      else if (type === 'ancient') leafMaterial = ancientLeavesMat;

      if (type === 'pine') {
        // Tiered Pine Tree
        for (let layer = 0; layer < 3; layer++) {
          const r = 2 - layer;
          const ly = crownBase + layer * 1.5;
          for (let lx = -r; lx <= r; lx++) {
            for (let lz = -r; lz <= r; lz++) {
              if (Math.abs(lx) === r && Math.abs(lz) === r) continue;
              const leaf = new THREE.Mesh(boxGeo, leafMaterial);
              leaf.position.set(tx + lx, ly, tz + lz);
              leaf.castShadow = true;
              leaf.receiveShadow = true;
              dioramaGroup.add(leaf);
            }
          }
        }
        const top = new THREE.Mesh(boxGeo, leafMaterial);
        top.position.set(tx, crownBase + 4.5, tz);
        top.castShadow = true;
        dioramaGroup.add(top);
      } else if (type === 'ancient') {
        // Giant Stylized Ancient Tree (Hero Landmark)
        for (let lx = -3; lx <= 3; lx++) {
          for (let lz = -3; lz <= 3; lz++) {
            for (let ly = 0; ly <= 3; ly++) {
              if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly - 1) > 5) continue;
              const leaf = new THREE.Mesh(boxGeo, leafMaterial);
              leaf.position.set(tx + lx, crownBase + ly, tz + lz);
              leaf.castShadow = true;
              leaf.receiveShadow = true;
              dioramaGroup.add(leaf);
            }
          }
        }
      } else {
        // Lush Oak Canopy
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = 0; ly <= 2; ly++) {
              if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 2) continue;
              const leaf = new THREE.Mesh(boxGeo, leafMaterial);
              leaf.position.set(tx + lx, crownBase + ly, tz + lz);
              leaf.castShadow = true;
              leaf.receiveShadow = true;
              dioramaGroup.add(leaf);
            }
          }
        }
        const top = new THREE.Mesh(boxGeo, leafMaterial);
        top.position.set(tx, crownBase + 3, tz);
        top.castShadow = true;
        dioramaGroup.add(top);
      }
    };

    // Place trees across the island
    spawnTree(-4, 3, 2, 4, 'oak');
    spawnTree(4, 2, -2, 4, 'pine');
    spawnTree(2, 3, 3, 3, 'oak');
    
    // Hero Landmark: Giant Ancient Tree on the mountain peak
    spawnTree(-2.5, 7, -2.5, 5, 'ancient');

    // Glowing Crystals on mountain cliff
    const crystalA = new THREE.Mesh(halfBoxGeo, crystalMat);
    crystalA.position.set(-1.5, 4.5, -2);
    crystalA.rotation.set(0.3, 0.4, 0.2);
    dioramaGroup.add(crystalA);

    const crystalB = new THREE.Mesh(halfBoxGeo, crystalMat);
    crystalB.position.set(-1.8, 4.8, -1.8);
    crystalB.rotation.set(-0.2, 0.8, 0.4);
    dioramaGroup.add(crystalB);

    // Cozy Campfire Setup at Island clearing
    const fireMesh = new THREE.Mesh(halfBoxGeo, fireMat);
    fireMesh.position.set(0.5, 2.5, 0.8);
    dioramaGroup.add(fireMesh);

    const campLight = new THREE.PointLight(0xf97316, 1.8, 9);
    campLight.position.set(0.5, 3.2, 0.8);
    dioramaGroup.add(campLight);

    // Camp logs around fire
    const logMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const logGeo = new THREE.BoxGeometry(1.2, 0.35, 0.35);
    geometriesToDispose.push(logGeo);
    const logA = new THREE.Mesh(logGeo, logMat);
    logA.position.set(0.5, 2.3, 1.8);
    dioramaGroup.add(logA);

    // Floating Clouds in background (3 layers)
    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const cloudMatFar = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    const cloudMatMid = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });

    const createCloud = (ox: number, oy: number, oz: number, mat: THREE.Material) => {
      const cg = new THREE.Group();
      cg.position.set(ox, oy, oz);
      for (let i = 0; i < 6; i++) {
        const cloudBoxGeo = new THREE.BoxGeometry(2.5 + Math.random() * 2, 1.2, 2.5 + Math.random() * 2);
        geometriesToDispose.push(cloudBoxGeo);
        const c = new THREE.Mesh(
          cloudBoxGeo,
          mat
        );
        c.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 3);
        cg.add(c);
      }
      cloudsGroup.add(cg);
    };

    createCloud(-18, 15, -12, cloudMat);
    createCloud(14, 17, 6, cloudMat);
    createCloud(2, 14, 18, cloudMat);
    // Extra layers for depth
    createCloud(-25, 12, -22, cloudMatFar);
    createCloud(22, 19, -15, cloudMatMid);
    createCloud(-8, 18, 25, cloudMatMid);

    // Campfire Ember Particles
    const emberCount = 40;
    const emberGeo = new THREE.BufferGeometry();
    geometriesToDispose.push(emberGeo);
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount * 3; i += 3) {
      emberPos[i] = 0.5 + (Math.random() - 0.5) * 0.5;
      emberPos[i + 1] = 2.5 + Math.random() * 3.5;
      emberPos[i + 2] = 0.8 + (Math.random() - 0.5) * 0.5;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.32,
      transparent: true,
      opacity: 0.9,
    });
    const emberParticles = new THREE.Points(emberGeo, emberMat);
    dioramaGroup.add(emberParticles);

    // Ambient Pollen/Dust Particles
    const pollenCount = 100;
    const pollenGeo = new THREE.BufferGeometry();
    geometriesToDispose.push(pollenGeo);
    const pollenPos = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount * 3; i += 3) {
      pollenPos[i] = (Math.random() - 0.5) * 20;
      pollenPos[i + 1] = Math.random() * 12;
      pollenPos[i + 2] = (Math.random() - 0.5) * 20;
    }
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
    const pollenMat = new THREE.PointsMaterial({
      color: 0x86efac,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    const pollenParticles = new THREE.Points(pollenGeo, pollenMat);
    dioramaGroup.add(pollenParticles);

    // Apply Initial Dynamic Framing
    const applyFraming = (cfg: typeof framing) => {
      dioramaGroup.scale.set(cfg.dioramaScale, cfg.dioramaScale, cfg.dioramaScale);
      dioramaGroup.position.set(cfg.sceneOffset.x, cfg.sceneOffset.y, cfg.sceneOffset.z);
    };
    applyFraming(framing);

    // 6. Mouse Parallax & Window Resize Handling
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      currentWidth = window.innerWidth;
      currentHeight = window.innerHeight;
      framing = MenuSceneFraming.compute(currentWidth, currentHeight);
      
      camera.aspect = currentWidth / currentHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentWidth, currentHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      applyFraming(framing);
    };
    window.addEventListener('resize', handleResize);

    // 7. Render Loop with Smooth Cinematic Orbit & Parallax
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slow cinematic orbit sway (±4-7 degrees)
      const orbitAngle = framing.baseOrbitAngle + Math.sin(elapsed * framing.orbitSpeed) * framing.orbitAmplitude;
      const breathing = Math.sin(elapsed * 0.5) * framing.breathingAmplitude;

      // Parallax offsets constrained to safe zone limits
      const targetParallaxX = mouseX * framing.maxParallaxX;
      const targetParallaxY = mouseY * framing.maxParallaxY;

      const camX = Math.cos(orbitAngle) * framing.cameraDistance + targetParallaxX;
      const camZ = Math.sin(orbitAngle) * framing.cameraDistance + targetParallaxX * 0.5;
      const camY = framing.cameraElevation + breathing - targetParallaxY;

      // Smooth camera interpolation
      camera.position.x += (camX - camera.position.x) * 0.05;
      camera.position.y += (camY - camera.position.y) * 0.05;
      camera.position.z += (camZ - camera.position.z) * 0.05;

      // Look at the diorama hero center
      camera.lookAt(framing.sceneOffset.x, framing.sceneOffset.y + 2.4, framing.sceneOffset.z);

      // Cloud Drift Animation
      cloudsGroup.children.forEach((c, index) => {
        const speed = 0.5 + (index % 3) * 0.2;
        c.position.x += delta * speed;
        if (c.position.x > 32) c.position.x = -32;
      });

      // Pollen Particles Animation (subtle drift)
      const pollenPosArr = pollenParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pollenCount * 3; i += 3) {
        pollenPosArr[i + 1] += Math.sin(elapsed * 0.5 + i) * delta * 0.2; // slow vertical drift
        pollenPosArr[i] += Math.cos(elapsed * 0.3 + i) * delta * 0.15; // slow horizontal drift
      }
      pollenParticles.geometry.attributes.position.needsUpdate = true;

      // Water Bobbing Animation
      waterGroup.children.forEach((w, index) => {
        w.position.y += Math.sin(elapsed * 1.5 + index * 0.5) * delta * 0.05;
      });

      // Ember Particles Rising Animation
      const posArr = emberParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount * 3; i += 3) {
        posArr[i + 1] += delta * 1.5;
        posArr[i] += Math.sin(elapsed * 3.5 + i) * delta * 0.2;
        if (posArr[i + 1] > 6.8) {
          posArr[i + 1] = 2.5;
          posArr[i] = 0.5 + (Math.random() - 0.5) * 0.5;
          posArr[i + 2] = 0.8 + (Math.random() - 0.5) * 0.5;
        }
      }
      emberParticles.geometry.attributes.position.needsUpdate = true;

      // Campfire flame pulse
      fireMesh.scale.y = 0.9 + Math.sin(elapsed * 14) * 0.25;
      campLight.intensity = 1.6 + Math.sin(elapsed * 10) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Proper Resource Cleanup on Unmount (Transition to Gameplay)
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries
      geometriesToDispose.forEach((g) => g.dispose());

      // Dispose Materials
      const materials = [
        grassMat, grassTopMat, dirtMat, stoneMat, darkStoneMat,
        woodMat, leavesMat, pineLeavesMat, ancientLeavesMat, waterMat, sandMat,
        snowMat, crystalMat, fireMat, cloudMat, cloudMatFar, cloudMatMid, emberMat, logMat, tuftMat, pollenMat
      ];
      materials.forEach((m) => m.dispose());

      // Dispose Renderer
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};
