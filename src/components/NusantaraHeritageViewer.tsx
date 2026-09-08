// Nusantara Heritage Viewer Component (Procedural Nusantara Architecture Visualizer & Regression Testing Suite)
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlockType } from '../types';
import { StructureGenerator } from '../engine/world/StructureGenerator';
import { 
  Compass, 
  Sun, 
  CloudRain, 
  Monitor, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Info, 
  ChevronRight,
  Sparkles,
  Layers,
  Cpu,
  Store,
  Compass as TempleIcon
} from 'lucide-react';

interface NusantaraHeritageViewerProps {
  onBackToMenu: () => void;
}

interface StructureMetadata {
  id: string;
  name: string;
  desc: string;
  location: string;
  materials: string[];
  keyBlocks: string[];
  icon: React.ReactNode;
}

export const NusantaraHeritageViewer: React.FC<NusantaraHeritageViewerProps> = ({ onBackToMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Configuration States
  const [selectedStructure, setSelectedStructure] = useState<string>('rumah_gadang_grand_hall');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [weather, setWeather] = useState<'clear' | 'rain'>('clear');
  const [qualityPreset, setQualityPreset] = useState<'low' | 'medium' | 'high'>('high');
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showMetadata, setShowMetadata] = useState<boolean>(true);

  // Metadata for the 5 Signature Structures
  const structuresMeta: StructureMetadata[] = [
    {
      id: 'rumah_gadang_grand_hall',
      name: 'Rumah Gadang Grand Hall',
      desc: 'Landmark of mountain settlements with sweeping "gonjong" buffalo-horn roof structures. Serving as community council, marketplace, and trading hall.',
      location: 'Mountain Settlements & Highlands',
      materials: ['Teak Wood Logs', 'Ironwood Planks', 'Woven Bamboo', 'Black Sugar-palm Thatch'],
      keyBlocks: ['Carved Wood Beams', 'Batik Carpets', 'Aether Lanterns'],
      icon: <Layers className="w-5 h-5 text-amber-400" />
    },
    {
      id: 'tongkonan_leyline_hall',
      name: 'Tongkonan Leyline Hall',
      desc: 'Highland technology hub integrating ancient Torajan saddleback boat roofs with direct Leyline energy. Houses an energy core and glowing aether conduits.',
      location: 'Mystic Karst Highlands',
      materials: ['Ironwood Frame', 'Umpak Stone Foundations', 'Bamboo Rafters'],
      keyBlocks: ['Aether Crystal Core', 'Conduit Floor Runes', 'High-finial Lightning Rods'],
      icon: <Cpu className="w-5 h-5 text-cyan-400" />
    },
    {
      id: 'betang_living_longhouse',
      name: 'Betang Living Longhouse',
      desc: 'Expansive riverine longhouse elevated on robust stilts. Houses up to 30 NPC suites, communal kitchens, storage units, and elevated walkways.',
      location: 'Borneo Riverine Frontiers',
      materials: ['Ulin Ironwood', 'Split Bamboo Slats', 'Alang-Alang Grass Roof'],
      keyBlocks: ['Bilik Suites', 'Ladders', 'Communal Hearths', 'Storage Chests'],
      icon: <Layers className="w-5 h-5 text-emerald-400" />
    },
    {
      id: 'joglo_marketplace',
      name: 'Joglo / Pendopo Marketplace',
      desc: 'Bustling central plaza defined by high "Soko Guru" support pillars. Features custom merchant stalls, crafting workbenches, and heavy iron smithy forges.',
      location: 'Tanah Jawa Central Plazas',
      materials: ['Javanese Teak Wood', 'Terracotta Clay Tiles', 'Carved Volcanic Brick'],
      keyBlocks: ['Merchant Counters', 'Crafting Benches', 'Anvil Smithy', 'Soko Guru Beams'],
      icon: <Store className="w-5 h-5 text-rose-400" />
    },
    {
      id: 'nusantara_aether_temple',
      name: 'Nusantara Aether Temple',
      desc: 'Spectacular concentric terraced shrine combining stacked Javanese/Balinese stone steps, towering split-gates, and a central 3-tiered Meru pagoda thatch spire housing a legendary floating Aether Altar Core.',
      location: 'Sanga Mandala Leyline Junctures',
      materials: ['Carved Andesite Stone', 'Volcanic Bricks', 'Ijuk Sugar-palm Thatch'],
      keyBlocks: ['Split Candi Bentar Gates', 'Perwara Shrines', 'Floating Altar Core', 'Meru Pagoda'],
      icon: <TempleIcon className="w-5 h-5 text-sky-400 animate-pulse" />
    }
  ];

  const currentMeta = structuresMeta.find(s => s.id === selectedStructure) || structuresMeta[0];

  // Map BlockType to appropriate Hex Colors / Material Settings
  const getBlockColor = (block: BlockType): number => {
    switch (block) {
      case BlockType.TEAK_WOOD_LOG: return 0x78350f; // rich golden brown wood
      case BlockType.TEAK_WOOD_PLANKS: return 0x92400e; // lighter warm brown wood
      case BlockType.ULIN_IRONWOOD_LOG: return 0x451a03; // dark ironwood log
      case BlockType.ULIN_IRONWOOD_PLANKS: return 0x5c2d11; // dark ironwood planks
      case BlockType.WOVEN_BAMBOO_GEDEK: return 0xfef08a; // woven bamboo gedek yellow
      case BlockType.BAMBOO_STALK_BLOCK: return 0x854d0e; // bamboo stalk
      case BlockType.TERRACOTTA_ROOF_TILE: return 0xea580c; // terracotta tiles orange-red
      case BlockType.IJUK_THATCH_ROOF: return 0x262626; // black ijuk thatch
      case BlockType.ALANG_ALANG_THATCH: return 0xa16207; // dry thatch grass
      case BlockType.CARVED_ANDESITE_STONE: return 0x737373; // grey andesite
      case BlockType.VOLCANIC_BRICK: return 0x3f3f46; // dark volcanic stone
      case BlockType.CARVED_WOOD_BEAM: return 0xb45309; // orange-brown trim
      case BlockType.WOODEN_SHUTTER: return 0x78350f;
      case BlockType.BAMBOO_FENCE: return 0xca8a04;
      case BlockType.SPLIT_GATE_STONE: return 0x888888;
      case BlockType.AETHER_LANTERN: return 0x06b6d4; // bright cyan
      case BlockType.AETHER_CONDUIT_FLOOR: return 0x0891b2; // glowing cyan floor
      case BlockType.TERRACE_WATERWAY: return 0x0ea5e9; // blue water
      case BlockType.RICE_STORAGE_CHEST: return 0xd97706; // bright golden teak
      case BlockType.BATIK_CARPET_BLOCK: return 0x991b1b; // batik deep red
      case BlockType.STONE_ALANG_PILLAR: return 0xa1a1aa;
      case BlockType.AETHER_ALTAR_CORE: return 0x0e7490; // deep cyan
      case BlockType.AETHER_CORE_ADVANCED: return 0x22d3ee; // luminous cyan
      case BlockType.CRAFTING_BENCH: return 0xb45309;
      case BlockType.ANVIL_SMITHING: return 0x1f2937;
      case BlockType.CHEST: return 0xd97706;
      case BlockType.STONE_SLAB: return 0x71717a;
      case BlockType.DIRT: return 0x543d2b;
      case BlockType.GRASS: return 0x4ade80;
      case BlockType.STONE: return 0x78716c;
      case BlockType.SAND: return 0xfef08a;
      case BlockType.COBBLESTONE: return 0x57534e;
      case BlockType.TORCH: return 0xf59e0b;
      default: return 0xa1a1aa; // generic stone grey
    }
  };

  const isLuminousBlock = (block: BlockType): boolean => {
    return [
      BlockType.AETHER_LANTERN,
      BlockType.AETHER_CONDUIT_FLOOR,
      BlockType.AETHER_ALTAR_CORE,
      BlockType.AETHER_CORE_ADVANCED,
      BlockType.TORCH
    ].includes(block);
  };

  // Ambient Sound Synthesizer using Web Audio API
  useEffect(() => {
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.4, ctx.currentTime);
    mainGain.connect(ctx.destination);

    // 1. Gentle continuous drone (Spiritual Nusantara Ambient)
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = 'triangle';
    droneOsc.frequency.setValueAtTime(110, ctx.currentTime); // A2 base
    
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(350, ctx.currentTime);

    droneGain.gain.setValueAtTime(0.12, ctx.currentTime);

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(mainGain);
    droneOsc.start();

    // 2. Rain Synth: Soft white noise (filtered) when weather is set to 'rain'
    let rainSource: AudioBufferSourceNode | null = null;
    let rainGain: GainNode | null = null;
    
    if (weather === 'rain') {
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      rainSource = ctx.createBufferSource();
      rainSource.buffer = buffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(900, ctx.currentTime);
      rainFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.08, ctx.currentTime);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(mainGain);
      rainSource.start();
    }

    // 3. Periodic Gamelan / Slendro Metallic Chime Generator
    const playChime = () => {
      const t = ctx.currentTime;
      const slendroNotes = [220, 247.5, 293.3, 330, 391.1, 440, 495, 586.6];
      const randomNote = slendroNotes[Math.floor(Math.random() * slendroNotes.length)];

      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(randomNote, t);

      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(randomNote * 2.76, t);

      bellGain.gain.setValueAtTime(0.0, t);
      bellGain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      overtoneGain.gain.setValueAtTime(0.0, t);
      overtoneGain.gain.linearRampToValueAtTime(0.06, t + 0.03);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, t);

      bell.connect(filter);
      overtone.connect(filter);
      
      filter.connect(bellGain);
      bellGain.connect(mainGain);

      filter.connect(overtoneGain);
      overtoneGain.connect(mainGain);

      bell.start(t);
      overtone.start(t);

      bell.stop(t + 3.0);
      overtone.stop(t + 3.0);
    };

    // Trigger initial chime
    playChime();

    let isTerminated = false;
    const scheduleNextChime = () => {
      if (isTerminated) return;
      const delay = 2500 + Math.random() * 2500;
      setTimeout(() => {
        if (!isTerminated) {
          playChime();
          scheduleNextChime();
        }
      }, delay);
    };
    scheduleNextChime();

    return () => {
      isTerminated = true;
      droneOsc.stop();
      if (rainSource) {
        rainSource.stop();
      }
      ctx.close();
    };
  }, [isMuted, weather]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // 1. Initial Scene Setup
    const scene = new THREE.Scene();
    
    // Set up Sky Background Colors based on Time of Day
    let skyColor: THREE.Color;
    let groundColor: THREE.Color;
    let lightIntensity: number;
    let sunColor: number;

    switch (timeOfDay) {
      case 'sunset':
        skyColor = new THREE.Color(0xfdba74); // Warm peach orange
        groundColor = new THREE.Color(0x451a03); // Deep amber brown
        lightIntensity = 0.9;
        sunColor = 0xf97316; // Vibrant orange
        break;
      case 'night':
        skyColor = new THREE.Color(0x0a0f1d); // Deep space blue/indigo
        groundColor = new THREE.Color(0x040712); // Near-black ground
        lightIntensity = 0.25;
        sunColor = 0x38bdf8; // Blue moonlight
        break;
      case 'day':
      default:
        skyColor = new THREE.Color(0xbae6fd); // Pristine daylight blue
        groundColor = new THREE.Color(0x1e3a1e); // Forest base green
        lightIntensity = 1.4;
        sunColor = 0xfef08a; // Pale sun yellow
        break;
    }

    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(skyColor, weather === 'rain' ? 0.045 : 0.015);

    // 2. Camera Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(24, 18, 32);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = qualityPreset !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underground
    controls.minDistance = 10;
    controls.maxDistance = 80;
    controls.target.set(0, 4, 0);

    // 5. Environmental Lights Setup
    const ambientLight = new THREE.AmbientLight(
      timeOfDay === 'night' ? 0x1e293b : 0xfef3c7, 
      timeOfDay === 'night' ? 0.35 : 0.65
    );
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(sunColor, lightIntensity);
    mainSun.position.set(30, 45, 20);
    mainSun.castShadow = qualityPreset !== 'low';
    mainSun.shadow.mapSize.width = qualityPreset === 'high' ? 2048 : 1024;
    mainSun.shadow.mapSize.height = qualityPreset === 'high' ? 2048 : 1024;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 120;
    const shadowRange = 25;
    mainSun.shadow.camera.left = -shadowRange;
    mainSun.shadow.camera.right = shadowRange;
    mainSun.shadow.camera.top = shadowRange;
    mainSun.shadow.camera.bottom = -shadowRange;
    scene.add(mainSun);

    // Secondary soft backlight
    const fillLight = new THREE.DirectionalLight(timeOfDay === 'sunset' ? 0x7c2d12 : 0x0284c7, 0.4);
    fillLight.position.set(-30, 20, -20);
    scene.add(fillLight);

    // 6. Build Grid & Base Island
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    // Base Floating Island Chunk
    const baseSize = 34;
    const islandGeo = new THREE.BoxGeometry(baseSize, 2, baseSize);
    const islandMat = new THREE.MeshLambertMaterial({ color: groundColor });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.y = -1;
    islandMesh.receiveShadow = true;
    islandGroup.add(islandMesh);

    // Add green grass turf blocks on top of the base island
    const turfGeo = new THREE.BoxGeometry(baseSize + 0.5, 0.25, baseSize + 0.5);
    const turfMat = new THREE.MeshLambertMaterial({ color: timeOfDay === 'sunset' ? 0x3f6212 : 0x166534 });
    const turfMesh = new THREE.Mesh(turfGeo, turfMat);
    turfMesh.position.y = 0.05;
    turfMesh.receiveShadow = true;
    islandGroup.add(turfMesh);

    // 7. Render Voxel Structure Blocks
    const voxelGroup = new THREE.Group();
    islandGroup.add(voxelGroup);

    // Retrieve blocks procedurally from Nusantara Building Kit
    const blocksData = StructureGenerator.generateNusantaraStructure(selectedStructure);

    // Instanced Mesh for solid, opaque voxels (Ultra Performance)
    // Group blocks by color to use instanced meshes
    const colorGroups: { [color: number]: THREE.Vector3[] } = {};
    const lightSources: { pos: THREE.Vector3; block: BlockType }[] = [];

    blocksData.forEach((b) => {
      // Offset blocks slightly so the center of the structure sits on the origin
      const pos = new THREE.Vector3(b.dx, b.dy, b.dz);
      const isLuminous = isLuminousBlock(b.block);
      
      if (isLuminous) {
        lightSources.push({ pos, block: b.block });
      }

      const color = getBlockColor(b.block);
      if (!colorGroups[color]) {
        colorGroups[color] = [];
      }
      colorGroups[color].push(pos);
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterials: THREE.Material[] = [];

    // Create instanced meshes for each unique material color
    Object.keys(colorGroups).forEach((colorStr) => {
      const color = parseInt(colorStr, 10);
      const positions = colorGroups[color];
      
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.78,
        metalness: 0.05,
      });
      blockMaterials.push(mat);

      const instMesh = new THREE.InstancedMesh(boxGeo, mat, positions.length);
      instMesh.castShadow = qualityPreset !== 'low';
      instMesh.receiveShadow = qualityPreset !== 'low';

      const dummy = new THREE.Object3D();
      positions.forEach((pos, idx) => {
        dummy.position.copy(pos);
        dummy.position.y += 0.5; // Offset to sit perfectly on grass
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);
      });

      voxelGroup.add(instMesh);
    });

    // Add PointLights to Luminous Blocks (Conduits, Lanterns, Crystals)
    const activeLights: THREE.PointLight[] = [];
    if (qualityPreset !== 'low') {
      const maxLights = qualityPreset === 'high' ? 14 : 6;
      const step = Math.max(1, Math.floor(lightSources.length / maxLights));
      
      lightSources.forEach((src, idx) => {
        if (idx % step !== 0) return; // Cap maximum point lights for smooth rendering

        let lColor = 0x22d3ee; // Luminous energy blue
        let intensity = 1.5;
        let distance = 5;

        if (src.block === BlockType.TORCH) {
          lColor = 0xf59e0b; // Warm golden light
          intensity = 1.2;
          distance = 4;
        }

        const pointLight = new THREE.PointLight(lColor, intensity, distance);
        pointLight.position.copy(src.pos);
        pointLight.position.y += 0.8; // Floating slightly above the block
        voxelGroup.add(pointLight);
        activeLights.push(pointLight);
      });
    }

    // 8. Dynamic Weather Particles System (Rain)
    let rainParticles: THREE.Points | null = null;
    const rainCount = qualityPreset === 'high' ? 800 : 300;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVelocity: number[] = [];

    if (weather === 'rain') {
      for (let i = 0; i < rainCount * 3; i += 3) {
        rainPos[i] = (Math.random() - 0.5) * baseSize;
        rainPos[i + 1] = Math.random() * 30 + 5;
        rainPos[i + 2] = (Math.random() - 0.5) * baseSize;
        rainVelocity.push(8 + Math.random() * 6);
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
      const rainMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.14,
        transparent: true,
        opacity: 0.6,
      });
      rainParticles = new THREE.Points(rainGeo, rainMat);
      scene.add(rainParticles);
    }

    // 9. Aether Sparkle Particles for Mystic Vibe
    const sparkleCount = qualityPreset === 'high' ? 60 : 25;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparklePos[i] = (Math.random() - 0.5) * 16;
      sparklePos[i + 1] = Math.random() * 8 + 2;
      sparklePos[i + 2] = (Math.random() - 0.5) * 16;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.28,
      transparent: true,
      opacity: 0.8,
    });
    const sparkleParticles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkleParticles);

    // 10. Frame Sizing & Responsive Handling
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 11. Core Animation Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Ambient island floating animation
      if (isRotating) {
        islandGroup.rotation.y += delta * 0.085;
      }
      // Gentle breathing bobbing
      islandGroup.position.y = Math.sin(elapsed * 0.45) * 0.15;

      // Animate PointLights to pulse and flicker (Luminescence/Aether Ley Energy)
      activeLights.forEach((light, i) => {
        light.intensity = (1.2 + Math.sin(elapsed * 4 + i) * 0.3) * (timeOfDay === 'night' ? 1.6 : 1.0);
      });

      // Animate Rain
      if (rainParticles) {
        const positions = rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          const idx = i * 3;
          positions[idx + 1] -= rainVelocity[i] * delta; // Fall down
          positions[idx] += Math.sin(elapsed * 0.8 + i) * delta * 0.5; // Wind sway

          if (positions[idx + 1] < 0) {
            // Reset to sky
            positions[idx + 1] = Math.random() * 30 + 5;
            positions[idx] = (Math.random() - 0.5) * baseSize;
            positions[idx + 2] = (Math.random() - 0.5) * baseSize;
          }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Animate Sparkles
      const sparkPos = sparkleParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < sparkleCount * 3; i += 3) {
        sparkPos[i + 1] += Math.sin(elapsed * 1.5 + i) * delta * 0.15; // float up and down
        sparkPos[i] += Math.cos(elapsed * 0.8 + i) * delta * 0.08;
      }
      sparkleParticles.geometry.attributes.position.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 12. Cleanup Resources on Unmount
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      
      // Dispose materials & geometries safely
      boxGeo.dispose();
      islandGeo.dispose();
      turfGeo.dispose();
      rainGeo.dispose();
      sparkleGeo.dispose();
      
      islandMat.dispose();
      turfMat.dispose();
      sparkleMat.dispose();
      blockMaterials.forEach(m => m.dispose());

      renderer.dispose();
    };
  }, [selectedStructure, timeOfDay, weather, qualityPreset, isRotating]);

  return (
    <div id="heritage-visualizer-container" className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#080b11] text-white overflow-hidden font-sans select-none">
      
      {/* Sidebar: Control Panel */}
      <div id="heritage-control-panel" className="w-full md:w-96 bg-[#0c0f17] border-b md:border-b-0 md:border-r border-white/10 flex flex-col z-10 shadow-2xl overflow-y-auto max-h-screen">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Compass className="w-5 h-5 text-sky-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-sky-400">VoxelVerse</h2>
              <h1 className="text-lg font-bold leading-none text-white">Nusantara Heritage</h1>
            </div>
          </div>
          <button 
            onClick={onBackToMenu}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-mono rounded-xl border border-white/15 transition-all duration-300 cursor-pointer"
          >
            ← Menu
          </button>
        </div>

        {/* Structure Selector */}
        <div className="p-6 border-b border-white/10 space-y-3.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block">Select Signature Landmark</label>
          <div className="space-y-2">
            {structuresMeta.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStructure(s.id)}
                className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition-all duration-300 cursor-pointer ${
                  selectedStructure === s.id
                    ? 'bg-sky-500/10 border-sky-500 text-white shadow-lg'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedStructure === s.id ? 'bg-sky-500/20' : 'bg-white/5'}`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight">{s.name}</div>
                  <div className="text-[10px] text-white/40 truncate">{s.location}</div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${selectedStructure === s.id ? 'rotate-90 text-sky-400' : 'text-white/20'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Weather & Environmental Shading Controls */}
        <div className="p-6 border-b border-white/10 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-2.5">Time of Day (Sun & Lighting)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'day', label: 'Daylight', icon: <Sun className="w-3.5 h-3.5" /> },
                { id: 'sunset', label: 'Sunset', icon: <Sun className="w-3.5 h-3.5 rotate-45" /> },
                { id: 'night', label: 'Midnight', icon: <Sparkles className="w-3.5 h-3.5" /> }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeOfDay(t.id as any)}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    timeOfDay === t.id
                      ? 'bg-sky-500/15 border-sky-400 text-white font-bold'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {t.icon}
                  <span className="text-[10px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-2.5">Weather Particle Overlay</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'clear', label: 'Clear Sky', icon: <Sun className="w-3.5 h-3.5" /> },
                { id: 'rain', label: 'Rainy Day', icon: <CloudRain className="w-3.5 h-3.5" /> }
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id as any)}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    weather === w.id
                      ? 'bg-sky-500/15 border-sky-400 text-white font-bold'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {w.icon}
                  <span className="text-[10px]">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-2.5">Graphics Quality (Shadows/Fog)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['low', 'medium', 'high'].map(q => (
                <button
                  key={q}
                  onClick={() => setQualityPreset(q as any)}
                  className={`py-1.5 rounded-xl border capitalize cursor-pointer text-[10px] transition-all ${
                    qualityPreset === q
                      ? 'bg-sky-500/15 border-sky-400 text-white font-bold'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  {q} Preset
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playback Controls & Metadata Toggle */}
        <div className="p-6 mt-auto border-t border-white/10 flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                isRotating 
                  ? 'bg-sky-500/20 border-sky-500 text-white' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/50'
              }`}
              title={isRotating ? 'Pause Orbit Rotation' : 'Enable Orbit Rotation'}
            >
              <RotateCcw className={`w-4 h-4 ${isRotating ? 'animate-spin-slow' : ''}`} />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                !isMuted 
                  ? 'bg-sky-500/20 border-sky-500 text-white' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/50'
              }`}
              title={isMuted ? 'Unmute Ambient Chimes' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
          </div>

          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer text-xs transition-all ${
              showMetadata
                ? 'bg-sky-500/10 border-sky-400 text-sky-300 font-bold'
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info Card</span>
          </button>
        </div>

      </div>

      {/* Main Canvas Area */}
      <div id="heritage-canvas-viewport" ref={containerRef} className="flex-1 relative h-full w-full bg-[#080a10]">
        
        {/* Real-time WebGL Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* 3D Scene Controls HUD */}
        <div className="absolute top-6 left-6 pointer-events-none space-y-1.5">
          <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-sky-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Interactive Diorama</span>
          </div>
          <div className="text-[10px] text-white/40 block">Drag to Orbit • Scroll to Zoom • Right-Click to Pan</div>
        </div>

        {/* Metadata Overlay Panel (Info Card) */}
        {showMetadata && (
          <div className="absolute bottom-6 left-6 right-6 md:right-auto md:max-w-md p-6 bg-[#0a0d15]/85 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl animate-fade-in space-y-4 pointer-events-auto">
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-wider text-sky-400 font-mono flex items-center gap-1.5">
                <Compass className="w-3 h-3" />
                <span>Nusantara Architecture Registry</span>
              </div>
              <h2 className="text-lg font-black text-white">{currentMeta.name}</h2>
              <p className="text-xs text-white/70 leading-relaxed font-normal">{currentMeta.desc}</p>
            </div>

            <div className="space-y-2.5 border-t border-white/10 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase text-white/40 font-bold">Region & Setting</div>
                  <div className="text-xs text-sky-200 mt-0.5">{currentMeta.location}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-white/40 font-bold">Foundation Grammar</div>
                  <div className="text-xs text-amber-200 mt-0.5 capitalize">
                    {selectedStructure.includes('betang') ? 'High Wood Stilts' : selectedStructure.includes('temple') ? 'Stepped Terraces' : 'Stone Plinth'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-white/40 font-bold mb-1.5">Traditional Materials</div>
                <div className="flex flex-wrap gap-1">
                  {currentMeta.materials.map((m, idx) => (
                    <span key={idx} className="text-[10px] bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-lg">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-white/40 font-bold mb-1.5">Critical Key Blocks</div>
                <div className="flex flex-wrap gap-1">
                  {currentMeta.keyBlocks.map((kb, idx) => (
                    <span key={idx} className="text-[10px] bg-sky-950/40 border border-sky-400/20 text-sky-300 px-2 py-0.5 rounded-lg">
                      {kb}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
