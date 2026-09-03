import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

# Remove the broken return
code = code.replace('return {aiMs, physicsMs};\n  }\n\n  public dispose(): void {', 'public dispose(): void {')

# Put it at the end of `update`
# End of update is just before `// Internal method to handle entity AI logic` or similar. Let's find what comes after `update`
update_end_pattern = r'(this\.updateGroundItems\(dt, playerPos\);\s*\n\s*)'
update_end_replace = r'\1return {aiMs, physicsMs};\n  }\n\n  '

code = re.sub(update_end_pattern, update_end_replace, code)

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
