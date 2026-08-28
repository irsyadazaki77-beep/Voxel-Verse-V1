const fs = require('fs');
let content = fs.readFileSync('src/engine/entities/EntityManager.ts', 'utf-8');

// Add spatial grid
if (!content.includes('private spatialGrid')) {
  content = content.replace(
    "  private spawnTimer: number = 0;",
    "  private spawnTimer: number = 0;\n  private spatialGrid: Map<string, Set<string>> = new Map();"
  );
}

// Update spatial grid logic when spawning
const oldSpawn = /    this\.entities\.set\(state\.id, \{ state, mesh \}\);/;
const newSpawn = `    this.entities.set(state.id, { state, mesh });
    const cx = Math.floor(state.position[0] / 16);
    const cz = Math.floor(state.position[2] / 16);
    const key = \`\${cx},\${cz}\`;
    if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
    this.spatialGrid.get(key)!.add(state.id);`;
content = content.replace(oldSpawn, newSpawn);

// Remove from spatial grid
const oldDespawn = /        this\.entities\.delete\(id\);/;
const newDespawn = `        this.entities.delete(id);
        const cx = Math.floor(state.position[0] / 16);
        const cz = Math.floor(state.position[2] / 16);
        this.spatialGrid.get(\`\${cx},\${cz}\`)?.delete(id);`;
content = content.replace(oldDespawn, newDespawn);

// Spatial Partitioning and Entity Sleeping inside `update`
// Instead of looping all entities, we loop all entities but skip ones that are far away (sleep mode).
// Wait, actually, looping all is fast enough for 100 entities. But we can hide their meshes to save GPU draw calls!

const oldUpdateLoop = /    for \(const \[id, \{ state, mesh \}\] of this\.entities\.entries\(\)\) \{/g;
const newUpdateLoop = `    for (const [id, { state, mesh }] of this.entities.entries()) {
      const distToPlayerRaw = Math.abs(state.position[0] - playerPos.x) + Math.abs(state.position[2] - playerPos.z);
      
      // Entity Sleeping & Culling (Frustum & Distance based)
      if (distToPlayerRaw > 64) {
        mesh.visible = false;
        continue; // Skip AI and physics for sleeping entities
      }
      mesh.visible = true;
`;

content = content.replace(oldUpdateLoop, newUpdateLoop);

// Also need to move entity between chunks when they move?
// Inside the update loop, after position update, we should update spatial grid.
const oldPosUpdate = /      mesh\.position\.set\(state\.position\[0\], state\.position\[1\], state\.position\[2\]\);/;
const newPosUpdate = `      const oldCx = Math.floor(ePos.x / 16);
      const oldCz = Math.floor(ePos.z / 16);
      
      mesh.position.set(state.position[0], state.position[1], state.position[2]);
      
      const newCx = Math.floor(state.position[0] / 16);
      const newCz = Math.floor(state.position[2] / 16);
      if (oldCx !== newCx || oldCz !== newCz) {
        this.spatialGrid.get(\`\${oldCx},\${oldCz}\`)?.delete(id);
        const key = \`\${newCx},\${newCz}\`;
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, new Set());
        this.spatialGrid.get(key)!.add(id);
      }`;
content = content.replace(oldPosUpdate, newPosUpdate);

fs.writeFileSync('src/engine/entities/EntityManager.ts', content);
