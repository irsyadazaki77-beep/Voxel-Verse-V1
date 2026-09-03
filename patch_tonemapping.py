import re

with open('/src/engine/rendering/RenderPipeline.ts', 'r') as f:
    code = f.read()

# Remove output pass and rely solely on renderer for tone mapping and srgb?
# Wait, three.js docs for post processing say: "If you want to use Tone Mapping and Color Space conversion, use OutputPass as the last pass. You MUST NOT set renderer.toneMapping."
# Let's fix it by setting renderer.toneMapping = THREE.NoToneMapping when post processing is active.

code = code.replace(
'''      // Unified single ACESFilmicToneMapping handled cleanly by OutputPass/Renderer
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;''',
'''      // OutputPass handles Tone Mapping and Color Space natively
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.outputPass.toneMapping = THREE.ACESFilmicToneMapping;'''
)

code = code.replace(
'''    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.isPostProcessingActive = true;''',
'''    this.renderer.toneMapping = THREE.NoToneMapping;
    this.isPostProcessingActive = true;
    if (this.outputPass) {
       this.outputPass.toneMapping = THREE.ACESFilmicToneMapping;
    }'''
)

with open('/src/engine/rendering/RenderPipeline.ts', 'w') as f:
    f.write(code)
