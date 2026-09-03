import re

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'this.interactionSystem.update(deltaTime);',
    'const _ti = performance.now();\n    this.interactionSystem.update(deltaTime);\n    this.subsystemMetrics.interactionMs = performance.now() - _ti;'
)

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)
