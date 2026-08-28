const fs = require('fs');
let content = fs.readFileSync('src/engine/ui/TelemetryStore.ts', 'utf-8');

const regex = /profilerMetrics: \{ activeChunks: number; cachedChunks: number; queuedTasks: number; generatingTasks: number; dirtyChunks: number; meshUploadsPerFrame: number; \};/;
const newType = `profilerMetrics: { 
    activeChunks: number; 
    cachedChunks: number; 
    queuedTasks: number; 
    generatingTasks: number; 
    dirtyChunks: number; 
    meshUploadsPerFrame: number;
    frameTimeMs: number;
    simTimeMs: number;
    renderTimeMs: number;
    drawCalls: number;
    triangles: number;
    memoryEst: number;
  };`;

content = content.replace(regex, newType);

const initRegex = /profilerMetrics: \{ activeChunks: 0, cachedChunks: 0, queuedTasks: 0, generatingTasks: 0, dirtyChunks: 0, meshUploadsPerFrame: 0 \}/;
const newInit = `profilerMetrics: { activeChunks: 0, cachedChunks: 0, queuedTasks: 0, generatingTasks: 0, dirtyChunks: 0, meshUploadsPerFrame: 0, frameTimeMs: 0, simTimeMs: 0, renderTimeMs: 0, drawCalls: 0, triangles: 0, memoryEst: 0 }`;

content = content.replace(initRegex, newInit);

fs.writeFileSync('src/engine/ui/TelemetryStore.ts', content);
