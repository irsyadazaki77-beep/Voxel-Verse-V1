import re

with open('/src/engine/environment/SkyEnvironment.ts', 'r') as f:
    code = f.read()

import_three = "import * as THREE from 'three';\n"
code = code.replace("import * as THREE from 'three';", import_three)

add_fields = '''  private lastLightPos = new THREE.Vector3();
  private lastTargetPos = new THREE.Vector3();
  public isShadowDirty = true;'''
code = code.replace(
    'private lastTimeOfDay = 8;',
    'private lastTimeOfDay = 8;\n' + add_fields
)

update_pos = '''    this.sunLight.position.set(lightX, lightY, lightZ);

    if (this.lastLightPos.distanceToSquared(this.sunLight.position) > 0.01 || this.lastTargetPos.distanceToSquared(this.sunLight.target.position) > 0.01) {
      this.isShadowDirty = true;
      this.lastLightPos.copy(this.sunLight.position);
      this.lastTargetPos.copy(this.sunLight.target.position);
    }'''

code = code.replace('    this.sunLight.position.set(lightX, lightY, lightZ);', update_pos)

with open('/src/engine/environment/SkyEnvironment.ts', 'w') as f:
    f.write(code)
