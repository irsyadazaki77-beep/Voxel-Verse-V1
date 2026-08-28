const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// Use a ref for activeBossState
if (!content.includes("const activeBossStateRef = useRef")) {
  content = content.replace(
    "const [activeBossState, setActiveBossState] = useState<BossCombatState | null>(null);",
    "const [activeBossState, setActiveBossState] = useState<BossCombatState | null>(null);\n  const activeBossStateRef = useRef<BossCombatState | null>(null);"
  );
}

content = content.replace(
  "if (nearbyBoss?.id !== activeBossState?.id) setActiveBossState(nearbyBoss);",
  "if (nearbyBoss?.id !== activeBossStateRef.current?.id) {\n          activeBossStateRef.current = nearbyBoss;\n          setActiveBossState(nearbyBoss);\n        }"
);

fs.writeFileSync('src/components/GameCanvas.tsx', content);
