const fs = require('fs');
let code = fs.readFileSync('src/engine/world/StructureGenerator.ts', 'utf8');

const newStructures = `
  public static generateRumahGadang(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Floor on stilts
    for (let x = -3; x <= 3; x++) {
      for (let z = -2; z <= 2; z++) {
        if ((x===-3 || x===3) && (z===-2 || z===2)) blocks.push({ dx: x, dy: 1, dz: z, block: 20 }); // STONE_PILLAR
        blocks.push({ dx: x, dy: 2, dz: z, block: 14 }); // WOOD_PLANKS
      }
    }
    // Walls
    for (let y = 3; y <= 5; y++) {
      for (let x = -3; x <= 3; x++) {
        blocks.push({ dx: x, dy: y, dz: -2, block: 14 });
        blocks.push({ dx: x, dy: y, dz: 2, block: 14 });
      }
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: -3, dy: y, dz: z, block: 14 });
        blocks.push({ dx: 3, dy: y, dz: z, block: 14 });
      }
    }
    // Sweeping Roof (Minangkabau style)
    for (let x = -4; x <= 4; x++) {
      const upward = (Math.abs(x) >= 2) ? Math.abs(x) - 1 : 0;
      blocks.push({ dx: x, dy: 6 + upward, dz: -1, block: 15 }); // WOOD_STAIRS equivalent (or just planks)
      blocks.push({ dx: x, dy: 6 + upward, dz: 0, block: 14 });
      blocks.push({ dx: x, dy: 6 + upward, dz: 1, block: 15 });
    }
    return blocks;
  }

  public static generateCandi(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Base 5x5
    for(let y=0; y<3; y++) {
      const s = 2 - y;
      if (s < 0) continue;
      for (let x = -s; x <= s; x++) {
        for (let z = -s; z <= s; z++) {
          blocks.push({ dx: x, dy: y, dz: z, block: 17 }); // STONE_BRICKS
        }
      }
    }
    // Stupa top
    blocks.push({ dx: 0, dy: 3, dz: 0, block: 19 }); // STONE_SLAB
    return blocks;
  }

  public static generatePuraGate(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Candi Bentar (split gate)
    for(let y=0; y<5; y++) {
      const w = Math.max(1, 3 - Math.floor(y/2));
      for (let x = 0; x < w; x++) {
        blocks.push({ dx: -2 - x, dy: y, dz: 0, block: 17 });
        blocks.push({ dx: 2 + x, dy: y, dz: 0, block: 17 });
      }
    }
    return blocks;
  }

  public static generateBetang(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Longhouse (Dayak style)
    for (let x = -6; x <= 6; x++) {
      for (let z = -2; z <= 2; z++) {
        if (x % 3 === 0 && (z === -2 || z === 2)) blocks.push({ dx: x, dy: 1, dz: z, block: 8 }); // OAK_LOG
        blocks.push({ dx: x, dy: 2, dz: z, block: 14 });
      }
    }
    for (let x = -6; x <= 6; x++) {
      blocks.push({ dx: x, dy: 5, dz: 0, block: 14 });
      for(let z=-1; z<=1; z++) {
        blocks.push({ dx: x, dy: 4, dz: z, block: 14 });
      }
    }
    return blocks;
  }

  public static generateTongkonan(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Toraja style with oversized boat-shaped roof
    for (let x = -2; x <= 2; x++) {
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 1, dz: z, block: 8 });
        blocks.push({ dx: x, dy: 2, dz: z, block: 14 });
        blocks.push({ dx: x, dy: 3, dz: z, block: 14 });
      }
    }
    // Boat roof extending forward and back
    for (let x = -4; x <= 4; x++) {
      const up = Math.abs(x) > 1 ? Math.abs(x) - 1 : 0;
      blocks.push({ dx: x, dy: 4 + up, dz: 0, block: 14 });
    }
    return blocks;
  }

  public static generateHonai(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Circular hut
    const radius = 2;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (x*x + z*z <= radius*radius + 1) {
          blocks.push({ dx: x, dy: 1, dz: z, block: 14 });
          blocks.push({ dx: x, dy: 2, dz: z, block: 14 });
          // Thatch roof (using leaves or grass block for now, hay if it existed)
          blocks.push({ dx: x, dy: 3, dz: z, block: 33 }); // TALL_GRASS / placeholder
        }
      }
    }
    blocks.push({ dx: 0, dy: 4, dz: 0, block: 33 });
    return blocks;
  }

  public static generateNusantaraStructure(type: string): VoxelBlockPlacement[] {
    switch (type) {
      case 'rumah_gadang': return this.generateRumahGadang();
      case 'candi': return this.generateCandi();
      case 'pura': return this.generatePuraGate();
      case 'betang': return this.generateBetang();
      case 'tongkonan': return this.generateTongkonan();
      case 'honai': return this.generateHonai();
      default: return [];
    }
  }
`;

const insertIndex = code.lastIndexOf('}');
code = code.substring(0, insertIndex) + newStructures + '\n}';
fs.writeFileSync('src/engine/world/StructureGenerator.ts', code);
