// Voxel World Engine: Procedural 3D Terrain, Texture Atlas, Streaming Chunks, Raycasting & World State
import * as THREE from 'three';
import { BlockType } from '../../types';
import { SimplexNoise } from '../math/Noise';
import { BiomeManager } from './BiomeManager';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './Chunk';
import { StructureGenerator } from './StructureGenerator';
import { TextureAtlas } from './TextureAtlas';
import { ChunkScheduler } from './ChunkScheduler';
import { SEA_LEVEL, WORLD_PRESETS, WorldPreset } from './WorldConfig';

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
  public chunks: Map<string, Chunk> = new Map();
  public modifiedBlocks: Map<string, Map<string, BlockType>> = new Map(); // chunkKey -> localKey -> BlockType
  public worldGroup: THREE.Group;
  public biomeManager: BiomeManager;

  // Noise Generators
  private terrainNoise: SimplexNoise;
  private mountainNoise: SimplexNoise;
  private caveNoise3D: SimplexNoise;
  private oreNoise: SimplexNoise;

  // Texture-mapped 3D Voxel Materials
  public solidMaterial: THREE.MeshStandardMaterial;
  public transMaterial: THREE.MeshStandardMaterial;
  public waterMaterial: THREE.MeshStandardMaterial;

  // Target Highlight Wireframe Box
  public highlightMesh: THREE.LineSegments;
  public previewMesh: THREE.Mesh;
  public scheduler: ChunkScheduler;

  constructor(seed: number = 42819, preset: WorldPreset = 'standard') {
    this.seed = seed;
    this.preset = preset;
    this.worldGroup = new THREE.Group();
    this.biomeManager = new BiomeManager(seed);
    this.scheduler = new ChunkScheduler(this);

    this.terrainNoise = new SimplexNoise(seed);
    this.mountainNoise = new SimplexNoise(seed + 555);
    this.caveNoise3D = new SimplexNoise(seed + 999);
    this.oreNoise = new SimplexNoise(seed + 777);

    // Load procedural 16x16 pixel texture atlas
    const atlasTex = TextureAtlas.getAtlasTexture();

    // Stylized Voxel Standard Materials with Texture Mapping + Vertex AO
    this.solidMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.transMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: atlasTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.waterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      this.waterMaterial.userData.shader = shader;
      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed.y += sin(transformed.x * 1.8 + uTime * 2.2) * 0.035 + cos(transformed.z * 1.8 + uTime * 1.8) * 0.035;
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
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockType.AIR;

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

  // Generate raw chunk voxels based on multi-frequency 3D noise, biomes, caves & vegetation
  public generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const cKey = this.getChunkKey(cx, cz);

    // 1. Terrain & Bedrock Heightfield
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = cx * CHUNK_SIZE_X + lx;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = cz * CHUNK_SIZE_Z + lz;

        const biome = this.biomeManager.getBiome(wx, wz);

        // Multi-frequency Continental + Mountain Ridge noise
        const nTerrain = this.terrainNoise.fbm2D(wx * 0.012, wz * 0.012, 4, 0.45);
        const nMountain = Math.abs(this.mountainNoise.fbm2D(wx * 0.006, wz * 0.006, 4, 0.5));
        const mountainRidge = Math.pow(nMountain, 1.8) * 22;

        let height = Math.floor(biome.heightOffset + nTerrain * biome.heightScale + mountainRidge);
        height = Math.max(3, Math.min(CHUNK_SIZE_Y - 4, height));

        // Fill vertical voxel column
        for (let y = 0; y <= height; y++) {
          let block: BlockType = biome.deepStoneBlock;

          if (y === height) {
            // Surface Block (Grass, Sand, Snow, Basalt)
            block = (height < SEA_LEVEL + 2 && biome.surfaceBlock === BlockType.GRASS) ? BlockType.SAND : biome.surfaceBlock;
          } else if (y >= height - 3) {
            // Subsurface Block (Dirt, Clay, Sand)
            block = biome.subSurfaceBlock;
          } else {
            // Deep stone with Ore Vein Distributions
            const oreVal = this.oreNoise.noise3D(wx * 0.12, y * 0.15, wz * 0.12);
            if (oreVal > 0.65) {
              if (y < 12) block = BlockType.MYTHRIL_ORE;
              else if (y < 22) block = BlockType.GOLD_ORE;
              else if (y < 32) block = BlockType.IRON_ORE;
              else block = BlockType.COPPER_ORE;
            } else if (oreVal < -0.68 && y < 45) {
              block = BlockType.COAL_ORE;
            } else if (y < 10 && oreVal > 0.58) {
              block = BlockType.AETHER_CRYSTAL_ORE;
            }
          }

          // 3D Swiss Cheese Cave Network
          if (y > 2 && y < height - 1) {
            const caveVal = this.caveNoise3D.fbm3D(wx * 0.04, y * 0.05, wz * 0.04, 3);
            if (caveVal > 0.52) {
              block = (y < 6) ? BlockType.LAVA : BlockType.AIR;
            }
          }

          chunk.setBlock(lx, y, lz, block);
        }

        // Fill Water Bodies up to SEA_LEVEL
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          chunk.setBlock(lx, y, lz, BlockType.WATER);
        }

        // Surface Foliage (Flowers, Grass, Sun Orchids)
        if (height >= SEA_LEVEL && chunk.getBlock(lx, height, lz) === BlockType.GRASS) {
          const floraVal = this.terrainNoise.noise2D(wx * 0.2, wz * 0.2);
          if (floraVal > 0.55) {
            if (floraVal > 0.78) chunk.setBlock(lx, height + 1, lz, BlockType.BLUE_FLOWER);
            else if (floraVal > 0.68) chunk.setBlock(lx, height + 1, lz, BlockType.RED_FLOWER);
            else if (floraVal > 0.60) chunk.setBlock(lx, height + 1, lz, BlockType.SUN_ORCHID);
            else chunk.setBlock(lx, height + 1, lz, BlockType.TALL_GRASS);
          }
        }
      }
    }

    // 2. Procedural 3D Trees
    for (let lx = 3; lx < CHUNK_SIZE_X - 3; lx += 4) {
      for (let lz = 3; lz < CHUNK_SIZE_Z - 3; lz += 4) {
        const wx = cx * CHUNK_SIZE_X + lx;
        const wz = cz * CHUNK_SIZE_Z + lz;
        const biome = this.biomeManager.getBiome(wx, wz);

        const treeRand = Math.abs(this.terrainNoise.noise2D(wx * 0.45 + 13, wz * 0.45 + 71));
        if (treeRand < biome.treeChance) {
          // Find surface height
          let surfaceY = -1;
          for (let y = CHUNK_SIZE_Y - 3; y >= SEA_LEVEL; y--) {
            const b = chunk.getBlock(lx, y, lz);
            if (b === BlockType.GRASS || b === BlockType.SNOW || b === BlockType.DIRT) {
              surfaceY = y;
              break;
            }
          }

          if (surfaceY > 0 && surfaceY + 8 < CHUNK_SIZE_Y) {
            let treeBlocks: { dx: number; dy: number; dz: number; block: BlockType }[] = [];
            if (biome.treeType === 'crystal') {
              treeBlocks = StructureGenerator.generateCrystalTree(wx + wz);
            } else if (biome.treeType === 'pine') {
              treeBlocks = StructureGenerator.generatePineTree(wx + wz);
            } else if (biome.treeType === 'oak') {
              treeBlocks = StructureGenerator.generateOakTree(wx + wz);
            }

            for (const tb of treeBlocks) {
              const tx = lx + tb.dx;
              const ty = surfaceY + 1 + tb.dy;
              const tz = lz + tb.dz;
              if (tx >= 0 && tx < CHUNK_SIZE_X && ty < CHUNK_SIZE_Y && tz >= 0 && tz < CHUNK_SIZE_Z) {
                chunk.setBlock(tx, ty, tz, tb.block);
              }
            }
          }
        }
      }
    }

    // 3. Multi-Chunk Seamless Procedural Structures (Shrines, Cabins, Watchtowers)
    const structPlacements = StructureGenerator.getStructureBlocksForChunk(cx, cz, this.seed);
    for (const sp of structPlacements) {
      if (sp.dx >= 0 && sp.dx < CHUNK_SIZE_X && sp.dz >= 0 && sp.dz < CHUNK_SIZE_Z) {
        let surfY = 0;
        for (let y = CHUNK_SIZE_Y - 4; y >= 5; y--) {
          if (chunk.getBlock(sp.dx, y, sp.dz) !== BlockType.AIR && chunk.getBlock(sp.dx, y, sp.dz) !== BlockType.WATER) {
            surfY = y;
            break;
          }
        }
        if (surfY >= SEA_LEVEL - 2) {
          const sy = surfY + (sp.dy - 38);
          if (sy >= 0 && sy < CHUNK_SIZE_Y) {
            chunk.setBlock(sp.dx, sy, sp.dz, sp.block);
          }
        }
      }
    }

    // 4. Apply Player Modifications (if any from previous saves)
    if (this.modifiedBlocks.has(cKey)) {
      const deltas = this.modifiedBlocks.get(cKey)!;
      deltas.forEach((blockType, localKey) => {
        const [lx, ly, lz] = localKey.split(',').map(Number);
        chunk.setBlock(lx, ly, lz, blockType);
      });
    }

    return chunk;
  }

  // Get procedural world data map for Debug Overlay Map
  public getDebugMapInfo(centerX: number, centerZ: number, radiusBlocks: number = 200, step: number = 8) {
    const dataPoints: { x: number; z: number; height: number; biomeName: string; isWater: boolean }[] = [];
    for (let x = centerX - radiusBlocks; x <= centerX + radiusBlocks; x += step) {
      for (let z = centerZ - radiusBlocks; z <= centerZ + radiusBlocks; z += step) {
        const biome = this.biomeManager.getBiome(x, z);
        const h = this.getSpawnHeight(x, z);
        dataPoints.push({
          x,
          z,
          height: h,
          biomeName: biome.name,
          isWater: h <= SEA_LEVEL,
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

  public update(deltaTime: number): void {
    this.waterTime += deltaTime;
    if (this.waterMaterial.userData.shader) {
      this.waterMaterial.userData.shader.uniforms.uTime.value = this.waterTime;
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
