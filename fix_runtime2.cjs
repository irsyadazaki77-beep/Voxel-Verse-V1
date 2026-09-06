const fs = require('fs');
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');

// Find the method that was prepended
const methodStart = code.indexOf('public async changeDimension(');
const methodEnd = code.indexOf('Logger.info(\'GameRuntime\', \`Dimension change complete.\`);\n  }') + 62;

const methodBody = code.substring(methodStart, methodEnd);
code = code.substring(0, methodStart) + code.substring(methodEnd);

// Now put it inside the class, right after `public initialize()`
const initIdx = code.indexOf('public initialize(');
const endOfInit = code.indexOf('}', initIdx) + 1; // wait, initialize() is a big function.
// Let's just put it before `public update(` inside the class

const classMatch = code.indexOf('export class GameRuntime {');
const updateMatch = code.indexOf('public update(', classMatch);

code = code.substring(0, updateMatch) + methodBody + "\n\n  " + code.substring(updateMatch);

fs.writeFileSync('src/engine/core/GameRuntime.ts', code);
