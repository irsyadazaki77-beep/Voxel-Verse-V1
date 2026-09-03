import re

with open('/src/engine/rendering/RenderPipeline.ts', 'r') as f:
    code = f.read()

# Add currentDpr tracking
code = code.replace(
    'private currentHeight = 0;',
    'private currentHeight = 0;\n  private currentDpr = 1.0;'
)

set_pixel_ratio_method = '''  public setPixelRatio(dpr: number): void {
    if (this.currentDpr === dpr) return;
    this.currentDpr = dpr;
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
    }
    
    // SMAA might benefit from knowing the precise resolution or pixel ratio
    // but EffectComposer setPixelRatio propagates it to render targets
  }'''

code = code.replace('public initPipeline(): void {', set_pixel_ratio_method + '\n\n  public initPipeline(): void {')

code = code.replace('this.composer = new EffectComposer(this.renderer);', 'this.composer = new EffectComposer(this.renderer);\n      this.composer.setPixelRatio(this.currentDpr);')

# Disable SMAA if rendering at 4K (DPR * width >= 3840) to save GPU time
smaa_update = '''    // Anti-Aliasing Pass
    const aaMode = (settings as any).antiAliasingMode || (settings.antiAliasing ? 'smaa' : 'off');
    if (this.aaPass) {
      const is4K = (width * this.currentDpr >= 3800) || (height * this.currentDpr >= 2100);
      this.aaPass.enabled = (aaMode !== 'off' && !is4K); // Turn off SMAA at 4K+ since native density handles AA
    }'''

old_aa_update = '''    // Anti-Aliasing Pass
    const aaMode = (settings as any).antiAliasingMode || (settings.antiAliasing ? 'smaa' : 'off');
    if (this.aaPass) {
      this.aaPass.enabled = aaMode !== 'off';
    }'''
code = code.replace(old_aa_update, smaa_update)

with open('/src/engine/rendering/RenderPipeline.ts', 'w') as f:
    f.write(code)
