const fs = require('fs');

const addition = `
    // 33. Gold Block
    drawTile(8, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#fcd34d');
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ox, oy, 16, 16);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(ox + 2, oy + 2, 12, 12);
    });

    // 34. Torch & Lantern
    drawTile(13, 2, (c, ox, oy) => {
      fillBg(ox, oy, 'transparent');
      ctx.fillStyle = '#78350f';
      ctx.fillRect(ox + 6, oy + 4, 4, 12);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(ox + 6, oy + 0, 4, 4);
    });
    drawTile(14, 2, (c, ox, oy) => {
      fillBg(ox, oy, 'transparent');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ox + 4, oy + 2, 8, 12);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(ox + 5, oy + 3, 6, 10);
    });

    // 35. Chest & Crafting
    drawTile(4, 4, (c, ox, oy) => { fillBg(ox, oy, '#92400e'); ctx.fillStyle = '#78350f'; ctx.strokeRect(ox+1, oy+1, 14, 14); });
    drawTile(5, 4, (c, ox, oy) => { fillBg(ox, oy, '#b45309'); ctx.fillStyle = '#d97706'; ctx.fillRect(ox+7, oy+6, 2, 4); });
    drawTile(0, 4, (c, ox, oy) => { fillBg(ox, oy, '#d97706'); ctx.fillStyle = '#78350f'; ctx.fillRect(ox, oy, 16, 4); });
    drawTile(1, 4, (c, ox, oy) => { fillBg(ox, oy, '#92400e'); ctx.fillStyle = '#78350f'; ctx.fillRect(ox+2, oy+2, 12, 12); });

    // 36. Anvil & Bed
    drawTile(14, 3, (c, ox, oy) => { fillBg(ox, oy, '#475569'); ctx.fillStyle = '#334155'; ctx.fillRect(ox+2, oy+2, 12, 12); });
    drawTile(13, 3, (c, ox, oy) => { fillBg(ox, oy, '#ef4444'); ctx.fillStyle = '#ffffff'; ctx.fillRect(ox, oy, 16, 6); });

    // 37. Aether Core Adv & Ley Conduit
    drawTile(7, 4, (c, ox, oy) => { fillBg(ox, oy, '#1e1b4b'); ctx.fillStyle = '#8b5cf6'; ctx.fillRect(ox+4, oy+4, 8, 8); });
    drawTile(8, 4, (c, ox, oy) => { fillBg(ox, oy, '#0f172a'); ctx.fillStyle = '#38bdf8'; ctx.fillRect(ox+6, oy, 4, 16); });

`;

let content = fs.readFileSync('src/engine/world/TextureAtlas.ts', 'utf-8');
content = content.replace(/\/\/ 32\. Missing Texture Checkerboard/, addition + '    // 32. Missing Texture Checkerboard');
fs.writeFileSync('src/engine/world/TextureAtlas.ts', content);
