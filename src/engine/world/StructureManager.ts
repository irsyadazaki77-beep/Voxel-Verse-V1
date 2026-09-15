import { BlockType } from '../../types';
import { VoxelBlockPlacement, StructureGenerator } from './StructureGenerator';
import { NusantaraSettlementGenerator } from './NusantaraSettlementGenerator';
import { NusantaraBuildingKit } from './NusantaraBuildingKit';
import { Rotation90 } from './BlockState';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface StructureInstance {
  id: string;
  type: string;
  culturalRegionId: string;
  originX: number;
  originY: number;
  originZ: number;
  rotation: Rotation90;
  seed: number;
  boundingBox: BoundingBox;
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number };
  metadata: any;
  placements: VoxelBlockPlacement[];
}

export class StructureManager {
  private static cell_size = 96;
  private static maxCacheSize = 256;
  private static cache = new Map<string, StructureInstance>();

  private static calculateBoundingBox(placements: VoxelBlockPlacement[], originX: number, originY: number, originZ: number): BoundingBox {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    if (placements.length === 0) {
       return { minX: originX, maxX: originX, minY: originY, maxY: originY, minZ: originZ, maxZ: originZ };
    }

    for (const p of placements) {
      const wx = originX + p.dx;
      const wy = originY + p.dy;
      const wz = originZ + p.dz;
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  public static getStructureForCell(
    cellX: number, 
    cellZ: number, 
    worldSeed: number, 
    getTerrainHeight: (wx: number, wz: number) => number,
    getDominantRegion: (wx: number, wz: number) => any
  ): StructureInstance | null {
    const id = `struct_${cellX}_${cellZ}`;
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const cellHash = Math.abs(Math.imul(cellX, 73856093) ^ Math.imul(cellZ, 19349663) ^ Math.imul(worldSeed, 83492791));
    
    // Density control: Only 1 in 6 cells has a structure
    if (cellHash % 6 !== 0) return null;

    const originX = cellX * this.cell_size + (cellHash % this.cell_size);
    const originZ = cellZ * this.cell_size + ((cellHash >> 4) % this.cell_size);

    const region = getDominantRegion(originX, originZ);
    if (!region) return null;

    let type = 'unknown';
    let placements: VoxelBlockPlacement[] = [];
    
    // Default rotation
    let rotation = ((cellHash >> 8) % 4) * 90 as Rotation90;
    
    // Cultural Rotation Overrides
    if (region.id === 'toraja_highlands') {
      // Tongkonan and Torajan structures orient North-South
      rotation = (cellHash % 2 === 0) ? 0 : 180 as Rotation90;
    } else if (region.id === 'borneo_riverlands') {
      // Betang align with the river (simplified to an axis depending on coordinate)
      rotation = (cellHash % 2 === 0) ? 90 : 270 as Rotation90;
    }

    const originY = getTerrainHeight(originX, originZ);
    if (originY < 60) return null; // Avoid putting structures deep underwater
    
    // Water proximity check for Borneo Riverlands
    if (region.id === 'borneo_riverlands' && originY > 66) {
      return null; // Reject river structures if they are too far from water/too high up
    }

    // 1 in 8 structures is a full settlement
    if (cellHash % 8 === 0) {
      type = 'settlement';
      placements = NusantaraSettlementGenerator.generateSettlement(region.id, 0, 0, 0, cellHash);
    } else {
      if (!region.structurePool || region.structurePool.length === 0) return null;
      type = region.structurePool[cellHash % region.structurePool.length];
      placements = StructureGenerator.generateNusantaraStructure(type);
    }

    // Rotate
    placements = StructureGenerator.rotatePlacements(placements, rotation);

    // Find footprint
    let fpMinX = Infinity, fpMaxX = -Infinity, fpMinZ = Infinity, fpMaxZ = -Infinity;
    for (const p of placements) {
      if (p.dx < fpMinX) fpMinX = p.dx;
      if (p.dx > fpMaxX) fpMaxX = p.dx;
      if (p.dz < fpMinZ) fpMinZ = p.dz;
      if (p.dz > fpMaxZ) fpMaxZ = p.dz;
    }

    // Terrain sampling to avoid extreme slopes
    let minH = Infinity;
    let maxH = -Infinity;
    const samples = 9;
    for(let i=0; i<samples; i++) {
        const sx = originX + fpMinX + (fpMaxX - fpMinX) * (i % 3) / 2;
        const sz = originZ + fpMinZ + (fpMaxZ - fpMinZ) * Math.floor(i / 3) / 2;
        const h = getTerrainHeight(sx, sz);
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
    }

    // If slope is extreme, reject placement
    if (maxH - minH > 12) return null; 

    // Post-process placements for Foundation System
    const foundationBlocks = new Set([
      BlockType.STONE_ALANG_PILLAR, 
      BlockType.TEAK_WOOD_LOG, 
      BlockType.COBBLESTONE, 
      BlockType.CARVED_ANDESITE_STONE,
      BlockType.OAK_LOG
    ]);
    
    const finalPlacements: VoxelBlockPlacement[] = [];
    let validFoundation = true;
    
    for (const p of placements) {
      finalPlacements.push(p);
      
      // If it's a foundation block near the bottom of the structure
      if (p.dy <= 0 && foundationBlocks.has(p.block)) {
        const wx = originX + p.dx;
        const wz = originZ + p.dz;
        const groundHeight = getTerrainHeight(wx, wz);
        
        const blockY = originY + p.dy;
        // If the block is above the ground here, extend foundation downwards
        if (blockY > groundHeight) {
          const depth = blockY - groundHeight;
          if (depth > 15) {
            validFoundation = false;
            break; // Max foundation depth exceeded, reject entire structure
          }
          
          for (let drop = 1; drop <= depth; drop++) {
             finalPlacements.push({
               dx: p.dx,
               dy: p.dy - drop,
               dz: p.dz,
               block: p.block,
               state: p.state
             });
          }
        }
      }
    }
    
    if (!validFoundation) return null; // Reject floating structures

    const bbox = this.calculateBoundingBox(finalPlacements, originX, originY, originZ);

    const instance: StructureInstance = {
      id,
      type,
      culturalRegionId: region.id,
      originX,
      originY,
      originZ,
      rotation,
      seed: cellHash,
      boundingBox: bbox,
      footprint: { minX: fpMinX, maxX: fpMaxX, minZ: fpMinZ, maxZ: fpMaxZ },
      metadata: {},
      placements: finalPlacements
    };

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey!);
    }

    this.cache.set(id, instance);
    return instance;
  }

  public static getOverlappingStructuresForChunk(
    cx: number, 
    cz: number, 
    worldSeed: number,
    getTerrainHeight: (wx: number, wz: number) => number,
    getDominantRegion: (wx: number, wz: number) => any
  ): StructureInstance[] {
    const overlapping: StructureInstance[] = [];
    const chunkMinX = cx * 16;
    const chunkMaxX = chunkMinX + 15;
    const chunkMinZ = cz * 16;
    const chunkMaxZ = chunkMinZ + 15;

    const centerCellX = Math.floor(chunkMinX / this.cell_size);
    const centerCellZ = Math.floor(chunkMinZ / this.cell_size);

    for (let dX = -2; dX <= 2; dX++) {
      for (let dZ = -2; dZ <= 2; dZ++) {
        const instance = this.getStructureForCell(centerCellX + dX, centerCellZ + dZ, worldSeed, getTerrainHeight, getDominantRegion);
        if (instance) {
          if (
            chunkMaxX >= instance.boundingBox.minX && chunkMinX <= instance.boundingBox.maxX &&
            chunkMaxZ >= instance.boundingBox.minZ && chunkMinZ <= instance.boundingBox.maxZ
          ) {
            overlapping.push(instance);
          }
        }
      }
    }
    return overlapping;
  }
}
