import { BrowserProvider, ContractFactory, Contract, getAddress } from 'ethers';

const EXPECTED_CHAIN_ID = 11155111n;
const EXPECTED_CHAIN_HEX = '0xaa36a7';
let artifact = null;
let provider = null;
let signer = null;
let account = null;

const $ = (id) => document.getElementById(id);
const status = (message, type='') => {
  $('status').textContent = message;
  $('status').className = type;
};

async function loadArtifact() {
  const res = await fetch('/generated/project-core.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được artifact. Hãy dừng server, chạy npm install rồi npm run dev lại.');
  artifact = await res.json();
  $('admin').textContent = artifact.adminWallet;
  $('artifact').textContent = artifact.compiler + ' · ' + artifact.sourceHash.slice(0, 12) + '...';
}

async function ensureSepolia(ethereum) {
  const current = await ethereum.request({ method: 'eth_chainId' });
  if (current?.toLowerCase() === EXPECTED_CHAIN_HEX) return;
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: EXPECTED_CHAIN_HEX }] });
  } catch (err) {
    if (Number(err?.code) !== 4902) throw err;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: EXPECTED_CHAIN_HEX,
        chainName: 'Sepolia Test Network',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
        blockExplorerUrls: ['https://sepolia.etherscan.io'],
      }],
    });
  }
}

async function connectWallet() {
  if (!window.ethereum) throw new Error('Không tìm thấy MetaMask.');
  const ethereum = window.ethereum.providers?.find((p) => p.isMetaMask) || window.ethereum;
  await ensureSepolia(ethereum);
  provider = new BrowserProvider(ethereum);
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  account = getAddress(accounts[0]);
  signer = await provider.getSigner();
  const network = await provider.getNetwork();
  $('account').textContent = account;
  $('network').textContent = network.chainId === EXPECTED_CHAIN_ID ? 'Sepolia (11155111)' : String(network.chainId);

  if (network.chainId !== EXPECTED_CHAIN_ID) throw new Error('MetaMask chưa ở Sepolia.');
  if (account.toLowerCase() !== artifact.adminWallet.toLowerCase()) {
    throw new Error('Sai ví. Hãy chuyển MetaMask sang đúng ví Admin: ' + artifact.adminWallet);
  }
  $('deploy').disabled = false;
  status('Ví và mạng đã đúng. Có thể deploy.', 'ok');
}

async function persistAddress(address, txHash) {
  const res = await fetch('/api/deploy/contract-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, txHash }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Không cập nhật được src/constants.ts');
  return body;
}

async function deploy() {
  if (!artifact || !signer || !account) throw new Error('Hãy kết nối MetaMask trước.');
  $('deploy').disabled = true;
  $('connect').disabled = true;
  try {
    status('Đang tạo giao dịch deploy. MetaMask sẽ yêu cầu Confirm...');
    const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();
    const tx = contract.deploymentTransaction();
    status('Đã gửi giao dịch:\n' + tx.hash + '\n\nĐang chờ Sepolia xác nhận...');
    await contract.waitForDeployment();
    const address = getAddress(await contract.getAddress());

    const code = await provider.getCode(address);
    if (code === '0x') throw new Error('Deploy receipt có địa chỉ nhưng không có bytecode.');

    const verify = new Contract(address, [
      'function owner() view returns (address)',
      'function batchCreationFee() view returns (uint256)',
      'function getTotalBatches() view returns (uint256)'
    ], provider);

    const [owner, fee, total] = await Promise.all([
      verify.owner(),
      verify.batchCreationFee(),
      verify.getTotalBatches(),
    ]);

    if (owner.toLowerCase() !== artifact.adminWallet.toLowerCase()) {
      throw new Error('Owner sau deploy không đúng ADMIN_WALLET. Không tự cập nhật frontend.');
    }

    await persistAddress(address, tx.hash);

    status(
      'DEPLOY THÀNH CÔNG\n\n' +
      'Contract: ' + address + '\n' +
      'Owner: ' + owner + '\n' +
      'Fee: ' + fee.toString() + ' wei\n' +
      'Total batches: ' + total.toString() + '\n' +
      'Tx: ' + tx.hash + '\n\n' +
      'Đã tự cập nhật src/constants.ts.\n' +
      'Bây giờ quay lại terminal, nhấn Ctrl+C rồi chạy npm run dev lại.',
      'ok'
    );
  } catch (err) {
    console.error(err);
    status('LỖI: ' + (err?.shortMessage || err?.message || String(err)), 'warn');
    $('deploy').disabled = false;
    $('connect').disabled = false;
  }
}

$('connect').addEventListener('click', () => connectWallet().catch((err) => {
  console.error(err);
  status('LỖI: ' + (err?.shortMessage || err?.message || String(err)), 'warn');
}));
$('deploy').addEventListener('click', deploy);

loadArtifact().catch((err) => {
  console.error(err);
  status('LỖI ARTIFACT: ' + err.message, 'warn');
});
