const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let count = 0;
let errors = 0;
function inspect(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) { inspect(file); continue; }
    if (!/\.tsx?$/.test(file) || /\.d\.ts$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/^(<<<<<<< |=======\s*$|>>>>>>> )/m.test(source)) { console.error('Conflict:', file); errors++; }
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    });
    for (const d of result.diagnostics || []) {
      if (d.category === ts.DiagnosticCategory.Error) {
        console.error(path.relative(root, file), ts.flattenDiagnosticMessageText(d.messageText, '\n')); errors++;
      }
    }
    count++;
  }
}
inspect(path.join(root, 'src'));
console.log(`${count} TS/TSX files inspected; ${errors} syntax/conflict errors. This is not a full type-check or Vite build.`);
process.exitCode = errors ? 1 : 0;
