import { createRequire } from "node:module";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let ts;
try { ts=require("typescript"); } catch {
  ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
}
const root = path.resolve(fileURLToPath(new URL("../web",import.meta.url)));
async function list(dir) {
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const name=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...await list(name));
    else if(name.endsWith(".js"))out.push(name);
  }
  return out;
}
// Chi tao bundle phuc vu render offline. Ban giao dung ES modules goc.
const modules={};
for(const file of [...await list(path.join(root,"js")),path.join(root,"vendor/qr-code.js")]){
  const id=path.relative(root,file).replaceAll(path.sep,"/");
  const source=(await readFile(file,"utf8")).replaceAll("import.meta.url",JSON.stringify("https://huelegend.example/"+id));
  modules[id]=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
}
let output="(function(){\nconst factories=Object.create(null), cache=Object.create(null);\n";
for(const [id,source] of Object.entries(modules))output+=`factories[${JSON.stringify(id)}]=function(require,module,exports){\n${source}\n};\n`;
output+=`
function normalize(value) {
  const result=[];
  for(const part of value.split("/")){
    if(part==="..")result.pop(); else if(part!=="."&&part)result.push(part);
  }
  return result.join("/");
}
function load(id) {
  if(cache[id])return cache[id].exports;
  const module={exports:{}};cache[id]=module;
  if(!factories[id])throw new Error("QA module missing: "+id);
  const base=id.split("/").slice(0,-1).join("/");
  factories[id](request=>load(normalize(base+"/"+request)),module,module.exports);
  return module.exports;
}
load("js/app.js");
})();
`;
await writeFile(new URL("../evidence/qa-bundle.js",import.meta.url),output);
console.log("QA bundle ready");
