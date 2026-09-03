import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

# Match the hit flash section
# // Flash Red or Gold Hit Feedback ... to ... });
hit_flash_pattern = r'// Flash Red or Gold Hit Feedback.*?\}\);\s*\}\s*\);\s*'

code = re.sub(hit_flash_pattern, '', code, flags=re.DOTALL)

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
