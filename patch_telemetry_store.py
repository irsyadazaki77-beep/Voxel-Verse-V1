import re

with open('/src/engine/ui/TelemetryStore.ts', 'r') as f:
    code = f.read()

fields = '''    entityAiMs?: number;
    entityPhysicsMs?: number;
    farmingMs?: number;
    engineeringMs?: number;
    furnaceMs?: number;
    interactionMs?: number;
'''
code = code.replace('activeParticles?: number;', 'activeParticles?: number;\n' + fields)
# Need to replace twice, one for interface and one for initial state.
code = code.replace('activeParticles: 0', 'activeParticles: 0,\n      entityAiMs: 0,\n      entityPhysicsMs: 0,\n      farmingMs: 0,\n      engineeringMs: 0,\n      furnaceMs: 0,\n      interactionMs: 0')

with open('/src/engine/ui/TelemetryStore.ts', 'w') as f:
    f.write(code)
