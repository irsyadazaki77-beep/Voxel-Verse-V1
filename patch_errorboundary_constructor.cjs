const fs = require('fs');
let content = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');

content = content.replace("  public state: State = {", "  constructor(props: Props) {\n    super(props);\n  }\n\n  public state: State = {");

fs.writeFileSync('src/components/ErrorBoundary.tsx', content);
