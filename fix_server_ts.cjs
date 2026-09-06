const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The issue might be that startServer() is not called properly when built because it's bundled as server.cjs.
code = code.replace("if (process.argv[1] && process.argv[1].endsWith('server.ts')) {\n  startServer();\n}", "startServer();");

fs.writeFileSync('server.ts', code);
