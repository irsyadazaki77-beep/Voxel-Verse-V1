const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// Inside `GameCanvas.tsx`, we have `settingsRef.current`. We want to apply changes to `renderer`, `sky`, `particles`.
// Since we don't have a direct React state for settings inside `GameCanvas.tsx`'s render loop (it subscribes to SettingsManager),
// let's look for `SettingsManager.subscribe`.

const subRegex = /const unsubSettings = SettingsManager\.subscribe\(setSettings\);/;
if (content.match(subRegex)) {
  const newSub = `const unsubSettings = SettingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
      settingsRef.current = newSettings;
      
      // Apply Graphics Settings to Engine
      if (rendererRef.current) {
         rendererRef.current.shadowMap.enabled = newSettings.shadows && newSettings.shadowQuality !== 'off';
         if (newSettings.shadowQuality === 'low') {
            rendererRef.current.shadowMap.type = THREE.BasicShadowMap;
         } else if (newSettings.shadowQuality === 'medium') {
            rendererRef.current.shadowMap.type = THREE.PCFShadowMap;
         } else {
            rendererRef.current.shadowMap.type = THREE.PCFShadowMap;
         }
         
         const maxPixel = newSettings.graphicsPreset === 'ultra' ? 2 : (newSettings.graphicsPreset === 'low' ? 1 : 1.5);
         rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, maxPixel));
      }
      
      if (cameraRef.current) {
         cameraRef.current.fov = newSettings.fov;
         cameraRef.current.updateProjectionMatrix();
      }
      
      if (audioRef.current) {
         audioRef.current.setMasterVolume(newSettings.masterVolume);
      }
    });`;
    
    content = content.replace(subRegex, newSub);
}

fs.writeFileSync('src/components/GameCanvas.tsx', content);
