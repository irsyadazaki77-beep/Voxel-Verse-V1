import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

new_raycast = '''
  public getEntityRaycastHit(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number = 4.5): string | null {
    let closestId: string | null = null;
    let closestDist = maxDist;
    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;
    
    // Determine which chunks to check based on maxDist
    const cx = Math.floor(ox / 16); // Assuming CHUNK_SIZE_X is 16
    const cz = Math.floor(oz / 16);
    
    // Check 3x3 chunks around the player to be safe, since maxDist is ~4.5
    for (let cdx = -1; cdx <= 1; cdx++) {
      for (let cdz = -1; cdz <= 1; cdz++) {
        const cell = this.spatialGrid.get(`${cx + cdx},${cz + cdz}`);
        if (!cell) continue;
        
        for (const id of cell) {
          const entry = this.entities.get(id);
          if (!entry) continue;
          const pos = entry.state.position;
          
          // Scalar math
          const eX = pos[0];
          const eY = pos[1] + 0.9;
          const eZ = pos[2];
          
          const toX = eX - ox;
          const toY = eY - oy;
          const toZ = eZ - oz;
          
          const proj = toX * dx + toY * dy + toZ * dz;
          if (proj > 0 && proj < maxDist) {
            const perpX = toX - dx * proj;
            const perpY = toY - dy * proj;
            const perpZ = toZ - dz * proj;
            const distSq = perpX * perpX + perpY * perpY + perpZ * perpZ;
            
            // 0.85^2 = 0.7225
            if (distSq < 0.7225 && proj < closestDist) {
              closestDist = proj;
              closestId = id;
            }
          }
        }
      }
    }
    return closestId;
  }
'''

code = re.sub(r'public getEntityRaycastHit.*?return closestId;\s*\}', new_raycast, code, flags=re.DOTALL)

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
