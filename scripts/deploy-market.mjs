// scripts/deploy-market.mjs
// Chay lenh: node scripts/deploy-market.mjs
// Yeu cau: DEPLOYER_PRIVATE_KEY trong file .env

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Doc .env thu cong (khong can dotenv)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k && !k.startsWith('#') && v.length) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  } catch { /* .env khong bat buoc */ }
}
loadEnv();

async function getContractArtifact() {
  try {
    const art = JSON.parse(readFileSync(
      resolve(ROOT, 'artifacts/contracts/HueLegendMarket.sol/HueLegendMarket.json'),
      'utf8'
    ));
    return { abi: art.abi, bytecode: art.bytecode };
  } catch {
    console.error('[!] Chua compile contract. Chay: npx hardhat compile');
    process.exit(1);
  }
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk || !pk.startsWith('0x') || pk.length !== 66) {
    console.error('[!] Thieu DEPLOYER_PRIVATE_KEY trong .env');
    console.error('    Them vao file .env: DEPLOYER_PRIVATE_KEY=0x<private_key>');
    process.exit(1);
  }

  const { ethers } = await import('ethers');
  const RPC = process.env.HUELEGEND_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const addr = wallet.address;

  console.log('='.repeat(55));
  console.log('  HueLegend Market - Deploy len Sepolia Testnet');
  console.log('='.repeat(55));
  console.log('  Deployer :', addr);

  const bal = await provider.getBalance(addr);
  const balEth = ethers.formatEther(bal);
  console.log('  So du    :', balEth, 'ETH Sepolia');

  if (bal < ethers.parseEther('0.01')) {
    console.error('[!] So du qua thap. Can it nhat 0.01 ETH Sepolia.');
    console.error('    Nap tai: https://sepoliafaucet.com');
    process.exit(1);
  }

  const net = await provider.getNetwork();
  if (Number(net.chainId) !== 11155111) {
    console.error('[!] Sai mang! Can Sepolia (chainId 11155111). Hien tai:', Number(net.chainId));
    process.exit(1);
  }
  console.log('  Mang     : Sepolia Testnet (chainId 11155111)');
  console.log('');

  const { abi, bytecode } = await getContractArtifact();
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log('  [1/3] Gui giao dich deploy...');
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log('  TX Hash  :', deployTx.hash);
  console.log('  Etherscan:', `https://sepolia.etherscan.io/tx/${deployTx.hash}`);
  console.log('');
  console.log('  [2/3] Dang cho xac nhan (1-3 phut)...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('  [3/3] DA DEPLOY THANH CONG!');
  console.log('');
  console.log('='.repeat(55));
  console.log('  DIA CHI HOP DONG  :', contractAddress);
  console.log('  Etherscan contract :', `https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log('  Etherscan TX       :', `https://sepolia.etherscan.io/tx/${deployTx.hash}`);
  console.log('='.repeat(55));

  // Ghi HUELEGEND_MARKET_ADDRESS vao .env tu dong
  let envContent = '';
  try { envContent = readFileSync(resolve(ROOT, '.env'), 'utf8'); }
  catch { envContent = readFileSync(resolve(ROOT, '.env.example'), 'utf8'); }

  if (envContent.includes('HUELEGEND_MARKET_ADDRESS=')) {
    envContent = envContent.replace(/HUELEGEND_MARKET_ADDRESS=.*/, `HUELEGEND_MARKET_ADDRESS=${contractAddress}`);
  } else {
    envContent += `\nHUELEGEND_MARKET_ADDRESS=${contractAddress}\n`;
  }
  writeFileSync(resolve(ROOT, '.env'), envContent);

  console.log('');
  console.log('  [OK] Da ghi vao .env: HUELEGEND_MARKET_ADDRESS=' + contractAddress);
  console.log('');
  console.log('  BUOC TIEP THEO:');
  console.log('  1. Vao Vercel Dashboard -> Settings -> Environment Variables');
  console.log('     HUELEGEND_MARKET_ADDRESS =', contractAddress);
  console.log('  2. Redeploy tren Vercel (Deployments -> Redeploy)');
  console.log('  3. Ket noi vi admin va bat dau duyet ho so!');
}

main().catch(e => {
  console.error('[!] Loi deploy:', e.message || e);
  process.exit(1);
});
