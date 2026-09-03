import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

upload_queue_field = '''  private meshUploadQueue: Array<{
    key: string;
    meshData: any;
    sourceRevision: number;
  }> = [];'''

code = code.replace('private dirtyQueue: Set<string> = new Set();', 'private dirtyQueue: Set<string> = new Set();\n' + upload_queue_field)

# Replace onComplete callback
old_complete = '''          onComplete: (meshData, sourceRevision) => {
            const targetChunk = this.world.chunks.get(key);
            if (targetChunk) {
              const applied = targetChunk.applyTransferableMesh(
                meshData, 
                this.world.solidMaterial, 
                this.world.transMaterial, 
                this.world.waterMaterial,
                sourceRevision
              );
              if (applied) {
                targetChunk.state = ChunkState.READY;
                uploads++;
              } else {
                // Chunk voxels changed while worker was meshing; mark dirty so it re-meshes with new revision
                targetChunk.setDirty();
                this.dirtyQueue.add(key);
              }
            }
          }'''

new_complete = '''          onComplete: (meshData, sourceRevision) => {
            this.meshUploadQueue.push({ key, meshData, sourceRevision });
          }'''
code = code.replace(old_complete, new_complete)


# Process mesh upload queue inside update loop
process_queue_str = '''    // 3. Process Remesh / Dirty Queue to Worker (Stepwise & Budget-capped)
    let uploads = 0;'''

new_process_queue = '''    // Process Mesh Uploads first
    let uploads = 0;
    while (this.meshUploadQueue.length > 0) {
      if (performance.now() - startTime >= frameBudgetMs) {
        break;
      }
      const upload = this.meshUploadQueue.shift()!;
      const targetChunk = this.world.chunks.get(upload.key);
      if (targetChunk) {
        const applied = targetChunk.applyTransferableMesh(
          upload.meshData, 
          this.world.solidMaterial, 
          this.world.transMaterial, 
          this.world.waterMaterial,
          upload.sourceRevision
        );
        if (applied) {
          targetChunk.state = ChunkState.READY;
          uploads++;
        } else {
          targetChunk.setDirty();
          this.dirtyQueue.add(upload.key);
        }
      }
    }

    // 3. Process Remesh / Dirty Queue to Worker (Stepwise & Budget-capped)'''
code = code.replace(process_queue_str, new_process_queue)


with open('/src/engine/world/ChunkScheduler.ts', 'w') as f:
    f.write(code)
