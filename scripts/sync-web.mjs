import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const web = path.join(root, 'web');
const manifestPath = path.join(web, '.huelegend-generated.json');

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function allFiles(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(item => {
      const next = path.join(relative, item.name);
      if (item.isDirectory()) return allFiles(directory, next);
      if (!item.isFile()) throw new Error(`Khong ho tro symlink trong dist: ${next}`);
      return [next];
    }).sort();
}

function safePath(base, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Duong dan khong an toan.');
  const result = path.resolve(base, relative);
  if (!result.startsWith(base + path.sep)) throw new Error('Duong dan nam ngoai thu muc dich.');
  let current = base;
  for (const segment of path.relative(base, path.dirname(result)).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Phat hien lien ket: ${current}`);
  }
  if (fs.existsSync(result) && fs.lstatSync(result).isSymbolicLink()) throw new Error(`Phat hien lien ket: ${result}`);
  return result;
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Chua co dist/index.html. Hay chay npm run build:web.');
}
if (fs.existsSync(web) && !fs.lstatSync(web).isDirectory()) {
  throw new Error('web khong phai thu muc thong thuong; dung de bao ve du lieu.');
}
fs.mkdirSync(web, { recursive: true });

const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { files: {} };
const generated = {};
const files = allFiles(dist);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
let backups = 0;

for (const relative of files) {
  const target = safePath(web, relative);
  const contents = fs.readFileSync(path.join(dist, relative));
  const nextHash = checksum(contents);
  generated[relative.replaceAll(path.sep, '/')] = nextHash;
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target);
    const currentHash = checksum(existing);
    const oldHash = previous.files?.[relative.replaceAll(path.sep, '/')];
    if (currentHash !== nextHash && currentHash !== oldHash) {
      const backup = safePath(path.join(root, 'web-backups', timestamp), relative);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(target, backup);
      backups++;
    }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

for (const [relative, oldHash] of Object.entries(previous.files || {})) {
  if (Object.hasOwn(generated, relative)) continue;
  const obsolete = safePath(web, relative);
  if (fs.existsSync(obsolete) && checksum(fs.readFileSync(obsolete)) === oldHash) {
    fs.unlinkSync(obsolete);
  }
}

fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), files: generated }, null, 2) + '\n', 'utf8');
console.log(`Da dong bo ${files.length} file website vao: ${web}`);
if (backups) console.log(`Da sao luu ${backups} file co thay doi rieng vao web-backups/${timestamp}`);
