import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const sourceName = 'contracts/project/ProjectCore.sol';
const sourcePath = path.join(root, sourceName);
const artifactPath = path.join(root, 'public', 'generated', 'project-core.json');
const compatibilityAbiPath = path.join(root, 'public', 'ProjectCore_abi.json');
const expectedAdmin = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';
const expectedSecondAdmin = '0x82d022a704706B2f144863D619D7418F8a0f19A7';

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Khong tim thay ${sourceName}`);
}

const source = fs.readFileSync(sourcePath, 'utf8');

if (!source.includes(expectedAdmin) || !source.includes(expectedSecondAdmin) || !source.includes('Ownable(ADMIN_WALLET)')) {
  throw new Error('ProjectCore.sol chua khai bao du hai vi Admin HueLegend.');
}

function findImports(importPath) {
  const candidates = [
    path.resolve(root, 'node_modules', importPath),
    path.resolve(path.dirname(sourcePath), importPath),
    path.resolve(root, importPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }

  return { error: `Khong tim thay import: ${importPath}` };
}

const input = {
  language: 'Solidity',
  sources: {
    [sourceName]: { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const diagnostics = output.errors || [];

for (const item of diagnostics) {
  const line = item.formattedMessage || item.message;
  if (item.severity === 'error') console.error(line);
  else console.warn(line);
}

const errors = diagnostics.filter((item) => item.severity === 'error');
if (errors.length) {
  throw new Error(`Solidity compile that bai: ${errors.length} loi.`);
}

const compiled = output.contracts?.[sourceName]?.ProjectCore;
if (!compiled?.evm?.bytecode?.object) {
  throw new Error('Khong lay duoc bytecode ProjectCore sau khi compile.');
}

const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
let generatedAt = new Date().toISOString();
if (fs.existsSync(artifactPath)) {
  try {
    const previous = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    // Giu thoi gian tao artifact neu source va compiler khong doi de build lap lai on dinh.
    if (previous.sourceHash === sourceHash && previous.compiler === solc.version() && previous.generatedAt) {
      generatedAt = previous.generatedAt;
    }
  } catch {}
}

const artifact = {
  contractName: 'ProjectCore',
  networkTarget: 'Sepolia',
  chainId: 11155111,
  compiler: solc.version(),
  adminWallet: expectedAdmin,
  secondAdminWallet: expectedSecondAdmin,
  sourceHash,
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  generatedAt,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
// ABI doc lap cho cac cong cu cu doc /web/ProjectCore_abi.json.
fs.writeFileSync(compatibilityAbiPath, JSON.stringify(compiled.abi, null, 2) + '\n', 'utf8');

console.log('ProjectCore compile OK');
console.log('Compiler:', artifact.compiler);
console.log('Admin:', artifact.adminWallet);
console.log('Artifact:', path.relative(root, artifactPath));
