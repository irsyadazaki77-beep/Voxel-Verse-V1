
import { WorldGeneratorCore } from './WorldGeneratorCore';
import { VoxelMesher, TransferableMeshData } from './VoxelMesher';
import { WorldPreset } from './WorldConfig';

export type WorkerTaskType = 'generate' | 'mesh';

export interface GenerateTaskInput {
  type: 'generate';
  taskId: string;
  cx: number;
  cz: number;
  seed: number;
  preset?: WorldPreset;
  modifiedBlocks?: Record<string, number>;
}

export interface MeshTaskInput {
  type: 'mesh';
  taskId: string;
  cx: number;
  cz: number;
  sourceRevision?: number;
  centerBuffer: ArrayBuffer;
  neighborBuffers: Record<string, ArrayBuffer>;
}

export type WorkerTaskInput = GenerateTaskInput | MeshTaskInput;

export interface GenerateTaskResult {
  type: 'generate';
  taskId: string;
  cx: number;
  cz: number;
  buffer: ArrayBuffer;
}

export interface MeshTaskResult {
  type: 'mesh';
  taskId: string;
  cx: number;
  cz: number;
  sourceRevision: number;
  meshData: TransferableMeshData;
}

export type WorkerTaskResult = GenerateTaskResult | MeshTaskResult;

if (typeof self !== 'undefined') {
  let generatorCore: WorldGeneratorCore | null = null;
  let currentSeed = -1;
  let currentPreset: WorldPreset | null = null;

  self.onmessage = (e: MessageEvent<WorkerTaskInput>) => {
    const input = e.data;

    if (input.type === 'generate') {
      const preset = input.preset || 'standard';
      if (!generatorCore || currentSeed !== input.seed || currentPreset !== preset) {
        generatorCore = new WorldGeneratorCore(input.seed, preset);
        currentSeed = input.seed;
        currentPreset = preset;
      }
      const blocks = generatorCore.generateChunkData(input.cx, input.cz, input.modifiedBlocks);
      const response: GenerateTaskResult = { type: 'generate', taskId: input.taskId, cx: input.cx, cz: input.cz, buffer: blocks.buffer };
      (self as unknown as { postMessage: (msg: any, transfer: any[]) => void }).postMessage(response, [blocks.buffer]);
    } 
    else if (input.type === 'mesh') {
      const { cx, cz, centerBuffer, neighborBuffers, sourceRevision = 0 } = input;
      
      const centerBlocks = new Uint8Array(centerBuffer);
      const neighbors: Record<string, Uint8Array> = {};
      for (const key in neighborBuffers) {
        neighbors[key] = new Uint8Array(neighborBuffers[key]);
      }

      const getBlock = (lx: number, ly: number, lz: number): number => {
        if (ly < 0 || ly >= 128) return 0;
        
        let targetCx = cx;
        let targetCz = cz;
        let targetLx = lx;
        let targetLz = lz;

        if (lx < 0) { targetCx -= 1; targetLx += 16; }
        else if (lx >= 16) { targetCx += 1; targetLx -= 16; }
        
        if (lz < 0) { targetCz -= 1; targetLz += 16; }
        else if (lz >= 16) { targetCz += 1; targetLz -= 16; }

        if (targetCx === cx && targetCz === cz) {
          return centerBlocks[targetLx + targetLz * 16 + ly * 256];
        } else {
          const nKey = `${targetCx}_${targetCz}`;
          const nBuffer = neighbors[nKey];
          if (nBuffer) {
            return nBuffer[targetLx + targetLz * 16 + ly * 256];
          }
          return 0; // AIR if neighbor not provided
        }
      };

      const meshData = VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);
      
      const response: MeshTaskResult = { type: 'mesh', taskId: input.taskId, cx, cz, sourceRevision, meshData };
      const transfers: ArrayBuffer[] = [
        meshData.solidPositions.buffer,
        meshData.solidNormals.buffer,
        meshData.solidColors.buffer,
        meshData.solidUvs.buffer,
        meshData.solidIndices.buffer,
        meshData.transPositions.buffer,
        meshData.transNormals.buffer,
        meshData.transColors.buffer,
        meshData.transUvs.buffer,
        meshData.transIndices.buffer,
        meshData.waterPositions.buffer,
        meshData.waterNormals.buffer,
        meshData.waterColors.buffer,
        meshData.waterUvs.buffer,
        meshData.waterIndices.buffer
      ];
      
      (self as unknown as { postMessage: (msg: any, transfer: any[]) => void }).postMessage(response, transfers);
    }
  };
}
