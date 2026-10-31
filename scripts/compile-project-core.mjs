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
const expectedAdmin = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Khong tim thay ${sourceName}`);
}

const source = fs.readFileSync(sourcePath, 'utf8');

if (!source.includes(expectedAdmin) || !source.includes('Ownable(ADMIN_WALLET)')) {
  throw new Error('ProjectCore.sol chua dat ADMIN_WALLET/Ownable dung vi quan tri HueLegend.');
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

const artifact = {
  contractName: 'ProjectCore',
  networkTarget: 'Sepolia',
  chainId: 11155111,
  compiler: solc.version(),
  adminWallet: expectedAdmin,
  sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n', 'utf8');

console.log('ProjectCore compile OK');
console.log('Compiler:', artifact.compiler);
console.log('Admin:', artifact.adminWallet);
console.log('Artifact:', path.relative(root, artifactPath));
