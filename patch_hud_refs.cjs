const fs = require('fs');
let content = fs.readFileSync('src/components/HUD.tsx', 'utf-8');

const newRefs = `
  const frameTimeRef = useRef<HTMLSpanElement>(null);
  const simTimeRef = useRef<HTMLSpanElement>(null);
  const renderTimeRef = useRef<HTMLSpanElement>(null);
  const chunksRef = useRef<HTMLSpanElement>(null);
  const drawCallsRef = useRef<HTMLSpanElement>(null);
  const trisRef = useRef<HTMLSpanElement>(null);
  const memRef = useRef<HTMLSpanElement>(null);
`;

content = content.replace("  const armorRef = useRef<HTMLDivElement>(null);", "  const armorRef = useRef<HTMLDivElement>(null);\n" + newRefs);

fs.writeFileSync('src/components/HUD.tsx', content);
