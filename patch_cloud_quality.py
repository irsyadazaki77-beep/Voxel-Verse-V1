import re

with open('/src/engine/environment/CloudSystem.ts', 'r') as f:
    code = f.read()

add_quality = '''  public setVisible(visible: boolean): void {
    this.cloudGroup.visible = visible;
  }

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
     const count = this.cloudClusters.length;
     for (let i = 0; i < count; i++) {
        const cluster = this.cloudClusters[i];
        if (quality === 'low') {
           cluster.visible = (i % 3 === 0); // show 1/3
        } else if (quality === 'medium') {
           cluster.visible = (i % 2 === 0); // show 1/2
        } else {
           cluster.visible = true;
        }
     }
  }'''

code = code.replace(
    '  public setVisible(visible: boolean): void {\n    this.cloudGroup.visible = visible;\n  }',
    add_quality
)

with open('/src/engine/environment/CloudSystem.ts', 'w') as f:
    f.write(code)
