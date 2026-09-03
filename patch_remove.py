import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

remove_func = '''
  public removeEntity(id: string): void {
    const entry = this.entities.get(id);
    if (!entry) return;
    
    // 1. Remove from scene mesh
    this.entityGroup.remove(entry.mesh);
    // Notice: We don't dispose mesh geometry here, that's EntityModelCache's job (Task 7)
    
    // 2. Remove from spatialGrid
    const cx = Math.floor(entry.state.position[0] / 16);
    const cz = Math.floor(entry.state.position[2] / 16);
    this.spatialGrid.get(`${cx},${cz}`)?.delete(id);
    
    // 3. Remove from PoiseSystem
    PoiseSystem.removeEntity(id);
    
    // 4. Remove from target references / transient state
    for (const [otherId, otherEntry] of this.entities.entries()) {
      if (otherEntry.state.targetId === id) {
        otherEntry.state.targetId = null;
      }
    }
    
    // 5. Remove from entities map
    this.entities.delete(id);
  }
'''

code = code.replace('public getEntityRaycastHit', remove_func + '\n  public getEntityRaycastHit')

# Replace ecosystem despawn (line 394+)
code = re.sub(r'const entry = this\.entities\.get\(despawnId\);\s*if\s*\(entry\)\s*\{\s*this\.entityGroup\.remove\(entry\.mesh\);\s*this\.entities\.delete\(despawnId\);\s*\}', r'this.removeEntity(despawnId);', code)

# Replace distant despawn (line 647+)
dist_despawn = r'this\.entityGroup\.remove\(mesh\);\s*this\.entities\.delete\(id\);\s*PoiseSystem\.removeEntity\(id\);\s*const cx = Math\.floor\(state\.position\[0\] / 16\);\s*const cz = Math\.floor\(state\.position\[2\] / 16\);\s*this\.spatialGrid\.get\(`\$\{cx\},\$\{cz\}`\)\?\.delete\(id\);'
code = re.sub(dist_despawn, 'this.removeEntity(id);', code)

# Replace kill despawn (line 777+)
kill_despawn = r'this\.entityGroup\.remove\(mesh\);\s*this\.entities\.delete\(entityId\);\s*PoiseSystem\.removeEntity\(entityId\);'
code = re.sub(kill_despawn, 'this.removeEntity(entityId);', code)

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
