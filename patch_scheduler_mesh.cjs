const fs = require('fs');
let content = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf-8');

// Replace the loop processing the dirtyQueue
const remeshRegex = /\/\/ 3\. Process Remesh \/ Dirty Queue within Frame Time Budget[\s\S]*?\/\/ 4\. Update Profiler Metrics/;

const newRemeshLogic = `// 3. Process Remesh / Dirty Queue to Worker
    let uploads = 0;
    for (const key of Array.from(this.dirtyQueue)) {
      const chunk = this.world.chunks.get(key);
      if (chunk && chunk.isDirty && chunk.state !== ChunkState.QUEUED && chunk.state !== ChunkState.GENERATING && chunk.state !== ChunkState.MESHING) {
        
        // Prepare neighbor buffers
        const [cx, cz] = key.split(',').map(Number);
        const neighborKeys = [
          \`\${cx - 1}_\${cz}\`, \`\${cx + 1}_\${cz}\`, \`\${cx}_\${cz - 1}\`, \`\${cx}_\${cz + 1}\`,
          \`\${cx - 1}_\${cz - 1}\`, \`\${cx + 1}_\${cz - 1}\`, \`\${cx - 1}_\${cz + 1}\`, \`\${cx + 1}_\${cz + 1}\`
        ];
        
        const neighborBuffers: Record<string, ArrayBuffer> = {};
        for (const nKey of neighborKeys) {
          const [nx, nz] = nKey.split('_').map(Number);
          const nChunk = this.world.chunks.get(\`\${nx},\${nz}\`);
          if (nChunk && nChunk.blocks) {
            neighborBuffers[nKey] = nChunk.blocks.buffer;
          }
        }

        chunk.state = ChunkState.MESHING;
        chunk.isDirty = false;
        this.dirtyQueue.delete(key);

        this.workerPool.enqueueTask({
          type: 'mesh',
          taskId: \`mesh_\${key}_\${Date.now()}\`,
          cx,
          cz,
          priority: 100, // Meshing gets high priority
          sessionToken: this.workerPool.currentSessionToken,
          centerBuffer: chunk.blocks!.buffer,
          neighborBuffers,
          onComplete: (meshData) => {
            const targetChunk = this.world.chunks.get(key);
            if (targetChunk) {
              targetChunk.applyTransferableMesh(
                meshData, 
                this.world.solidMaterial, 
                this.world.transMaterial, 
                this.world.waterMaterial
              );
              targetChunk.state = ChunkState.READY;
              uploads++;
            }
          }
        });
      } else if (!chunk) {
        this.dirtyQueue.delete(key);
      }
    }

    // 4. Update Profiler Metrics`;

content = content.replace(remeshRegex, newRemeshLogic);

fs.writeFileSync('src/engine/world/ChunkScheduler.ts', content);
