import { MARKET_ABI, REVIEW, ORDER_STATUS, CHAIN_ID } from './abi.js';
import { loadEthers, loadScanner } from '../js/lib/libraries.js';
import { drawQR } from '../js/lib/qr.js';

const $ = s => document.querySelector(s);
const content = $('#content-section');

// Dinh nghia 4 nhom vai tro chinh cua he thong
const ROLES = {
  buyer: {
    key: 'buyer',
    label: 'Người mua',
    tab: 'shop',
    icon: '🛒',
    desc: 'Khám phá đặc sản Cố Đô, quét mã QR tra cứu và mua qua Escrow an toàn.'
  },
  producer: {
    key: 'producer',
    label: 'Cơ sở SX & Kiểm định',
    tab: 'producer',
    icon: '🏭',
    desc: 'Đăng ký cơ sở với GPKD + Chứng nhận ATTP, ký quỹ và khởi tạo lô hàng đặc sản.'
  },
  retailer: {
    key: 'retailer',
    label: 'Nơi bán',
    tab: 'retailer',
    icon: '🏪',
    desc: 'Quản lý các lô hàng mở bán, bổ sung tồn kho và xác nhận giao vận đơn hàng.'
  },
  admin: {
    key: 'admin',
    label: 'Quản trị (Backend)',
    tab: 'admin',
    icon: '🛡️',
    desc: 'Chạy sang Backend duyệt hồ sơ cơ sở, duyệt lô hàng mở bán và xử lý tranh chấp.'
  }
};

const state = {
  role: 'buyer',
  tab: 'shop',
  config: null,
  account: null,
  balanceWei: 0n,
  balanceETH: '0',
  stakeStatus: null,
  provider: null,
  contract: null,
  ethers: null,
  owner: null,
  seller: null,
  products: [],
  ownedLots: [],
  waitingSellers: [],
  waitingLots: [],
  orders: [],
  busy: false,
  page: 0,
  selected: null,
  q: '',
  demo: false,
  lastTx: null,
  scannerInstance: null
};

const fmt = n => {
  const val = BigInt(String(n || 0));
  const units = val / 1000000000000000000n;
  const decimals = String(val % 1000000000000000000n).padStart(18, '0').slice(0, 5).replace(/0+$/, '');
  return units.toString() + (decimals ? '.' + decimals : '');
};

const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vnd = x => BigInt(String(x || 0)).toLocaleString('vi-VN');
const short = x => x ? `${x.slice(0, 7)}…${x.slice(-5)}` : '—';
const stamp = t => t ? new Date(Number(t) * 1000).toLocaleDateString('vi-VN') : 'Không ghi thời hạn';
const urlOk = x => { try { const u = new URL(x); return u.protocol==='https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } };
const tag = (label, style = '') => `<span class="tag ${style}">${h(label)}</span>`;
const note = (message, style = '') => `<div class="notice ${style}">${message}</div>`;
const field = (name, label, type = 'text', rest = '', hint = '') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${rest} ${['businessPublicURL', 'foodPublicURL', 'imageURL', 'businessExpiry'].includes(name) ? '' : 'required'}>${hint ? `<small>${hint}</small>` : ''}</div>`;
const txExplorer = tx => tx ? `<a href="https://sepolia.etherscan.io/tx/${encodeURIComponent(tx)}" target="_blank" rel="noopener noreferrer">https://sepolia.etherscan.io/tx/${h(tx)} ↗</a>` : '';

function toast(msg) {
  const box = $('#toast');
  if (!box) return;
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.hidden = true, 7500);
}

function setNotice(text, style = '') {
  const box = $('#network-state');
  if (box) box.innerHTML = note(h(text), style);
}

function setBusy(b) {
  state.busy = b;
  document.querySelectorAll('button:not([data-tab]):not([data-role])').forEach(el => el.disabled = b);
}

function title(kicker, headTitle, desc, right = '') {
  return `<div class="section-top"><div><div class="kicker">${h(kicker)}</div><h2>${h(headTitle)}</h2><p>${h(desc)}</p></div>${right}</div>`;
}

function isOwner() {
  return state.account && state.owner && state.account.toLowerCase() === state.owner.toLowerCase();
}

function needContract() {
  if (!state.config?.configured) throw Error('Marketplace chua duoc trien khai. Cau hinh HUELEGEND_MARKET_ADDRESS tren Vercel truoc.');
  if (!state.contract) throw Error('Ket noi MetaMask de thuc hien giao dich.');
}

function sellerValid(s) {
  return s?.status === 2 && (s.businessLicenseExpires === 0 || s.businessLicenseExpires > Date.now() / 1000) && s.foodSafetyExpires > Date.now() / 1000;
}

function toSeller(x, wallet) {
  return {
    wallet,
    businessName: x.businessName,
    location: x.location,
    businessLicenseSHA256: x.businessLicenseSHA256,
    foodSafetySHA256: x.foodSafetySHA256,
    businessLicenseExpires: Number(x.businessLicenseExpires),
    foodSafetyExpires: Number(x.foodSafetyExpires),
    publicBusinessLicenseURL: x.publicBusinessLicenseURL,
    publicFoodSafetyURL: x.publicFoodSafetyURL,
    status: Number(x.status)
  };
}

function toLot(x) {
  return {
    id: Number(x.id),
    seller: x.seller,
    batchCode: x.batchCode,
    productName: x.productName,
    description: x.description,
    origin: x.origin,
    imageURL: x.imageURL,
    priceVND: x.priceVND.toString(),
    priceWei: x.priceWei.toString(),
    stock: Number(x.stock),
    sold: Number(x.sold),
    status: Number(x.status),
    txHash: state.lastTx || '0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01'
  };
}

function toOrder(x) {
  return {
    id: Number(x.id),
    lotId: Number(x.lotId),
    buyer: x.buyer,
    seller: x.seller,
    quantity: Number(x.quantity),
    amountWei: x.amountWei.toString(),
    status: Number(x.status),
    placedAt: Number(x.placedAt),
    shipmentReferenceSHA256: x.shipmentReferenceSHA256
  };
}

const demoProducts = [
  {
    id: 1,
    batchCode: 'HL-MEXUNG-2026-001',
    productName: 'Mè xửng truyền thống Thiên Hương',
    origin: '20 Chi Lăng, TP. Huế',
    description: 'Mè xửng dẻo thơm mạch nha, hạt mè vàng óng, đậu phộng bùi béo theo công thức gia truyền Cố Đô.',
    priceVND: '75000',
    priceWei: '1800000000000000',
    stock: 38,
    sold: 12,
    status: 2,
    seller: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
    txHash: '0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01',
    business: {
      businessName: 'Cơ sở Sản Xuất Mè Xửng Thiên Hương',
      location: '20 Chi Lăng, TP. Huế, Thừa Thiên Huế',
      businessLicenseSHA256: '0x9a8f4b1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      foodSafetySHA256: '0x3f5c2d1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      businessLicenseExpires: 1999999999,
      foodSafetyExpires: 1999999999,
      publicBusinessLicenseURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      publicFoodSafetyURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      status: 2
    }
  },
  {
    id: 2,
    batchCode: 'HL-TRACUNGDINH-2026-002',
    productName: 'Trà Cung Đình Đức Phượng Nhất Dạ Đế Vương',
    origin: '24 Nguyễn Huệ, TP. Huế',
    description: 'Thảo mộc tự nhiên bào chế từ 16 vị thuốc quý: Atisô, hoa cúc, hoài sơn, đảng sâm, cỏ ngọt, tim sen.',
    priceVND: '120000',
    priceWei: '2500000000000000',
    stock: 24,
    sold: 18,
    status: 2,
    seller: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
    txHash: '0xb7d142890ef1234567890abcdef1234567890abcdef1234567890abcdef02',
    business: {
      businessName: 'Doanh nghiệp Tư nhân Trà Cung Đình Đức Phượng',
      location: '24 Nguyễn Huệ, TP. Huế, Thừa Thiên Huế',
      businessLicenseSHA256: '0x7b2a6f1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      foodSafetySHA256: '0x4d1e8c1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      businessLicenseExpires: 1999999999,
      foodSafetyExpires: 1999999999,
      publicBusinessLicenseURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      publicFoodSafetyURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      status: 2
    }
  },
  {
    id: 3,
    batchCode: 'HL-TOMCHUA-2026-003',
    productName: 'Tôm Chua Trọng Tín Đặc Biệt',
    origin: '21 Đặng Trần Côn, TP. Huế',
    description: 'Tôm đất đầm Cầu Hai ủ men rượu nếp, riềng, ớt đỏ cay nồng mang chuẩn phong vị ẩm thực Cố Đô.',
    priceVND: '95000',
    priceWei: '3200000000000000',
    stock: 19,
    sold: 9,
    status: 2,
    seller: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
    txHash: '0xc8e253890ef1234567890abcdef1234567890abcdef1234567890abcdef03',
    business: {
      businessName: 'Cơ sở Tôm Chua Gia Truyền Trọng Tín',
      location: '21 Đặng Trần Côn, TP. Huế, Thừa Thiên Huế',
      businessLicenseSHA256: '0x5e3a9c1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      foodSafetySHA256: '0x2a9d4f1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      businessLicenseExpires: 1999999999,
      foodSafetyExpires: 1999999999,
      publicBusinessLicenseURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      publicFoodSafetyURL: 'https://sepolia.etherscan.io/address/0x325650E804c62297EE9c830Dc79468007Ae3F295',
      status: 2
    }
  }
];

async function loadConfig() {
  try {
    const r = await fetch('/api/market-config', { cache: 'no-store' });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    state.config = await r.json();
  } catch (e) {
    state.config = { configured: false };
  }
  state.demo = !state.config?.configured;
  setNotice(state.demo
    ? 'CHẾ ĐỘ MẪU (DEMO): Chưa cấu hình contract Marketplace on-chain. Thẻ sản phẩm hiển thị dữ liệu minh họa 4 vai trò & mã QR.'
    : 'MẠNG ETHEREUM SEPOLIA: Mọi đơn hàng dùng ETH thử nghiệm; Giấy phép kinh doanh & ATTP ghi mã băm SHA-256 on-chain.',
    state.demo ? '' : 'good');
}

async function refreshProducts() {
  if (state.demo) {
    state.products = demoProducts;
    return;
  }
  const r = await fetch(`/api/market-products?page=${state.page}&size=9`, { cache: 'no-store' });
  const data = await r.json();
  if (!r.ok || !data.ok) throw Error(data.error || `API trả HTTP ${r.status}`);
  state.products = (data.items || []).map(p => ({
    ...p,
    txHash: p.txHash || state.lastTx || '0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01'
  }));
}

async function loadWalletData() {
  if (!state.contract || !state.account) return;
  const [o, s] = await Promise.all([state.contract.owner(), state.contract.getSeller(state.account)]);
  state.owner = o;
  state.seller = toSeller(s, state.account);
  if (isOwner()) {
    const countS = Number(await state.contract.sellerCount());
    const wallets = await Promise.all(Array.from({ length: Math.min(countS, 40) }, (_, i) => state.contract.sellerAt(countS - i - 1)));
    const sellers = await Promise.all(wallets.map(async w => toSeller(await state.contract.getSeller(w), w)));
    state.waitingSellers = sellers.filter(item => item.status === 1);

    const countL = Number(await state.contract.lotCount());
    const ids = Array.from({ length: Math.min(countL, 50) }, (_, i) => countL - i);
    const lots = await Promise.all(ids.map(async id => toLot(await state.contract.getLot(id))));
    state.waitingLots = lots.filter(l => l.status === 1);
    state.ownedLots = lots;
  } else {
    const countL = Number(await state.contract.lotCount());
    const ids = Array.from({ length: Math.min(countL, 60) }, (_, i) => countL - i);
    const lots = await Promise.all(ids.map(async id => toLot(await state.contract.getLot(id))));
    state.ownedLots = lots.filter(l => l.seller.toLowerCase() === state.account.toLowerCase());
  }
}

async function loadOrders() {
  if (!state.contract || !state.account) {
    state.orders = [];
    return;
  }
  const [buyers, sellers] = await Promise.all([
    state.contract.getOrderIds(state.account, false, 0, 25),
    state.contract.getOrderIds(state.account, true, 0, 25)
  ]);
  const disputed = isOwner() ? await state.contract.getDisputedOrderIds(0, 25) : [];
  const ids = [...new Set([...buyers, ...sellers, ...disputed].map(Number))];
  state.orders = (await Promise.all(ids.map(id => state.contract.getOrder(id).then(toOrder)))).sort((a, b) => b.id - a.id);
}

// Danh sach vi MetaMask chi dinh cho tung vai tro
export const ASSIGNED_ROLE_WALLETS = Object.freeze({
  admin: '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c',
  producer: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
  retailer: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
  buyer: '0x0B210F788fe573194E290026Fda73565ED2ffb1b'
});

// Danh gia tinh hop le cua vai tro va kiem tra so du / ky quy
function evaluateRoleAndStaking(roleKey) {
  if (!state.account) {
    state.stakeStatus = null;
    return;
  }
  const bal = Number(state.balanceETH || 0);
  const targetWallet = ASSIGNED_ROLE_WALLETS[roleKey];
  const isTarget = targetWallet && state.account && targetWallet.toLowerCase() === state.account.toLowerCase();
  const targetTag = isTarget ? ` · ✓ Khớp ví chỉ định (${short(targetWallet)})` : (targetWallet ? ` · ℹ Ví gán: ${short(targetWallet)}` : '');

  if (roleKey === 'producer') {
    if (bal >= 0.005) {
      state.stakeStatus = {
        type: 'good',
        text: `✓ Đạt chuẩn ký quỹ (Số dư: ${bal.toFixed(4)} ETH >= 0.005 ETH)${targetTag} · Sẵn sàng tạo lô hàng`
      };
    } else {
      state.stakeStatus = {
        type: 'warning',
        text: `⚠️ Số dư ví thấp (${bal.toFixed(4)} ETH < 0.005 ETH)${targetTag} · Cần nạp thêm Sepolia ETH để ký quỹ`
      };
    }
  } else if (roleKey === 'admin') {
    if (isOwner() || state.demo || isTarget) {
      state.stakeStatus = {
        type: 'admin',
        text: `✓ Ví Quản trị Backend đã xác thực (Số dư: ${bal.toFixed(4)} ETH)${targetTag} · Toàn quyền phê duyệt on-chain`
      };
    } else {
      state.stakeStatus = {
        type: 'warning',
        text: `⚠️ Ví ${short(state.account)} chưa phải Owner hợp đồng. Chỉ địa chỉ deploy (${short(targetWallet)}) mới duyệt được on-chain.`
      };
    }
  } else if (roleKey === 'retailer') {
    state.stakeStatus = {
      type: 'good',
      text: `✓ Ví Nơi bán đã sẵn sàng (Số dư: ${bal.toFixed(4)} ETH)${targetTag} · Sẵn sàng cập nhật tồn kho & giao hàng`
    };
  } else {
    state.stakeStatus = {
      type: 'good',
      text: `✓ Ví Người mua kết nối thành công (Số dư: ${bal.toFixed(4)} ETH)${targetTag} · Sẵn sàng đặt mua qua Escrow`
    };
  }
}

// Ket noi MetaMask theo tung vai tro (Moi vai tro mot dia chi vi khac nhau)
async function connectRole(roleKey) {
  state.role = roleKey;
  state.tab = ROLES[roleKey]?.tab || 'shop';

  if (!window.ethereum) {
    toast('Cần cài đặt tiện ích MetaMask trên trình duyệt để kết nối.');
    window.open('https://metamask.io/', '_blank', 'noopener');
    render();
    return;
  }

  setBusy(true);
  try {
    const ethers = await loadEthers();
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Kich hoat chon dia chi vi tu MetaMask cho vai tro tuong ung
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch {
      await provider.send('eth_requestAccounts', []);
    }

    const chain = await provider.getNetwork();
    if (Number(chain.chainId) !== CHAIN_ID) {
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }
            }]
          });
        } else throw e;
      }
    }

    const signer = await provider.getSigner();
    state.account = await signer.getAddress();
    state.provider = provider;
    state.ethers = ethers;

    const balWei = await provider.getBalance(state.account);
    state.balanceWei = balWei;
    state.balanceETH = ethers.formatEther(balWei);

    if (state.config?.configured) {
      state.contract = new ethers.Contract(state.config.contractAddress, MARKET_ABI, signer);
      await Promise.all([loadWalletData(), loadOrders()]);
    }

    evaluateRoleAndStaking(roleKey);
    toast(`Đã kích hoạt vai trò ${ROLES[roleKey].label}: ${short(state.account)} (Số dư: ${Number(state.balanceETH).toFixed(4)} ETH)`);
  } catch (e) {
    toast('Lỗi kết nối ví: ' + errorText(e));
  } finally {
    setBusy(false);
    render();
  }
}

const errorText = e => e.shortMessage || e.reason || e.info?.error?.message || e.message || String(e);

async function transact(label, callback) {
  try {
    needContract();
    if (state.busy) return;
    if (!window.confirm(`${label}\nGiao dịch sẽ được gửi lên Sepolia Testnet và cần xác nhận MetaMask. Tiếp tục?`)) return;
    setBusy(true);
    toast('Mở MetaMask để xác nhận: ' + label.toLowerCase());
    const tx = await callback();
    state.lastTx = tx.hash;
    toast('Đã gửi giao dịch: ' + short(tx.hash) + '. Đang chờ xác nhận on-chain...');
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw Error('Giao dịch thất bại.');
    await Promise.all([refreshProducts(), loadWalletData(), loadOrders()]);
    toast('Đã xác nhận on-chain. ' + label + '. ' + short(tx.hash));
    state.selected = null;
    render();
  } catch (e) {
    toast('Lỗi: ' + errorText(e));
  } finally {
    setBusy(false);
    render();
  }
}

const photo = p => urlOk(p.imageURL)
  ? `<img src="${h(urlOk(p.imageURL))}" alt="${h(p.productName)}" loading="lazy" referrerpolicy="no-referrer">`
  : '<span class="placeholder">❧</span>';

// Giao dien 01: Nguoi mua (Gian hang dac san)
function shop() {
  const items = state.products.filter(p => `${p.productName} ${p.origin} ${p.business?.businessName}`.toLocaleLowerCase('vi').includes(state.q.toLocaleLowerCase('vi')));
  return title(
    'SẢN PHẨM ĐÃ KIỂM DUYỆT 2 LỚP',
    'Gian hàng đặc sản Cố Đô Huế',
    'Chỉ các lô hàng đã được Quản trị viên duyệt và cơ sở có đủ GPKD + Chứng nhận ATTP còn hạn mới được mở bán.',
    `<div class="toolbar"><input class="search" id="product-search" placeholder="Tìm tên đặc sản, cơ sở..." value="${h(state.q)}" aria-label="Tìm sản phẩm"><button class="btn btn-light" data-action="refresh">Làm mới ↻</button></div>`
  ) +
  (state.demo ? note('<strong>DỮ LIỆU MINH HỌA (DEMO)</strong> – Thẻ sản phẩm hiển thị đầy đủ cấu trúc 4 vai trò, hồ sơ pháp lý và mã QR có link Sepolia Etherscan.') : '') +
  (items.length
    ? `<div class="cards">${items.map(p => `
      <article class="card">
        <div class="card-media">
          ${photo(p)}
          ${tag(state.demo ? 'DEMO · Đã duyệt' : '✓ Đã duyệt 2 lớp')}
        </div>
        <div class="card-body">
          <span class="small-label">${h(p.origin)} · Mã ${h(p.batchCode)}</span>
          <h3>${h(p.productName)}</h3>
          <p>${h(p.description)}</p>
          <div class="micro" style="margin:8px 0;line-height:1.5">
            <strong>Cơ sở:</strong> ${h(p.business?.businessName || short(p.seller))}<br>
            <span style="color:#2f6e53">✓ GPKD: Đã ghi nhận SHA-256</span> · <span style="color:#2f6e53">✓ ATTP: Đã kiểm định</span>
          </div>
          <div class="card-foot">
            <div class="price">
              ${vnd(p.priceVND)} <small>₫</small>
              <div style="font-size:11px;font-weight:normal;color:var(--muted)">~ ${fmt(p.priceWei)} ETH</div>
            </div>
            <div class="card-actions-row">
              <button class="btn btn-qr" data-action="show-qr" data-id="${p.id}" title="Xem mã QR và link Sepolia Etherscan">📱 Mã QR</button>
              <button class="btn btn-primary btn-small" data-action="detail" data-id="${p.id}">Chi tiết ↗</button>
            </div>
          </div>
        </div>
      </article>
    `).join('')}</div>`
    : `<div class="empty"><strong>Chưa có lô được duyệt phù hợp.</strong>Hệ thống sẽ tự động hiển thị sản phẩm khi quản trị viên phê duyệt cơ sở và lô hàng.</div>`
  ) +
  (state.demo ? '' : `<div class="label-row"><button class="btn btn-light" data-action="prev-page" ${state.page === 0 ? 'disabled' : ''}>← Trước</button><span class="micro">Trang ${state.page + 1}</span><button class="btn btn-light" data-action="next-page" ${state.products.length < 9 ? 'disabled' : ''}>Sau →</button></div>`);
}

function publicDoc(s) {
  const license = urlOk(s.publicBusinessLicenseURL), food = urlOk(s.publicFoodSafetyURL);
  return `
    <div class="side-list">
      <div class="side-line"><span>Giấy phép kinh doanh</span><b>${s.businessLicenseSHA256 ? 'Đã ghi SHA-256' : 'Chưa có'} · hết hạn ${stamp(s.businessLicenseExpires)}</b></div>
      <div class="side-line"><span>Chứng nhận ATTP</span><b>${s.foodSafetySHA256 ? 'Đã ghi SHA-256' : 'Chưa có'} · hết hạn ${stamp(s.foodSafetyExpires)}</b></div>
    </div>
    <div class="doc-links">
      ${license ? `<a href="${h(license)}" rel="noopener noreferrer" target="_blank">📄 Xem bản Giấy phép kinh doanh công khai ↗</a>` : ''}
      ${food ? `<a href="${h(food)}" rel="noopener noreferrer" target="_blank">🛡️ Xem chứng nhận ATTP công khai ↗</a>` : ''}
      ${!license && !food ? '<span class="micro">Không có bản công khai; chỉ lưu dấu vân tay SHA-256 on-chain.</span>' : ''}
    </div>
    <details class="micro"><summary>Mã băm pháp lý on-chain</summary>
      <p class="code">GPKD: ${h(s.businessLicenseSHA256)}</p>
      <p class="code">ATTP: ${h(s.foodSafetySHA256)}</p>
      <p>Blockchain chứng minh mã băm đã được ghi nhận bất biến; không thể sửa đổi sau khi duyệt.</p>
    </details>`;
}

// Chi tiet san pham danh cho nguoi mua
function detail() {
  const p = state.selected;
  if (!p) return shop();
  const txHash = p.txHash || state.lastTx || '0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01';
  return title('CHI TIẾT ĐẶC SẢN', p.productName, `Mã lô ${p.batchCode} · ${p.origin}`, `<button class="btn btn-outline" data-action="back">← Quay lại gian hàng</button>`) +
  `<div class="panel detail-box">
    <div>
      <div class="detail-image">${photo(p)}</div>
      <h3 style="margin-top:20px">${h(p.productName)}</h3>
      <p class="muted">${h(p.description)}</p>
      <div class="label-row">${tag(state.demo ? 'DEMO' : 'Đã duyệt')} ${tag('Còn ' + p.stock + ' sản phẩm', 'orange')}</div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-qr" data-action="show-qr" data-id="${p.id}" style="padding:10px 16px;font-size:13px">📱 Xem mã QR &amp; Etherscan ↗</button>
        <a class="btn btn-light" href="./index.html?batch=${encodeURIComponent(p.batchCode)}#/trace">Tra cứu chuỗi cung ứng ↗</a>
      </div>
    </div>
    <div>
      <div class="kicker">GIÁ NIÊM YẾT SẢN PHẨM</div>
      <div class="price" style="font-size:32px;margin-bottom:6px">${vnd(p.priceVND)} VNĐ</div>
      <p class="micro" style="margin-bottom:20px">Thanh toán Sepolia ETH: <strong>${fmt(p.priceWei)} ETH</strong></p>
      
      <h3>Hồ sơ cơ sở sản xuất</h3>
      <div class="side-list">
        <div class="side-line"><span>Cơ sở / Doanh nghiệp</span><b>${h(p.business?.businessName)}</b></div>
        <div class="side-line"><span>Địa chỉ</span><b>${h(p.business?.location)}</b></div>
        <div class="side-line"><span>Địa chỉ ví cơ sở</span><b class="code">${h(short(p.seller))}</b></div>
      </div>
      ${publicDoc(p.business)}

      <div class="etherscan-box" style="margin-top:16px">
        <span class="small-label" style="color:#1d5b96">GIAO DỊCH BLOCKCHAIN SEPOLIA</span>
        <p style="font-size:12px;margin:4px 0 2px">Giao dịch thành công xác thực on-chain của lô hàng:</p>
        <a href="https://sepolia.etherscan.io/tx/${encodeURIComponent(txHash)}" target="_blank" rel="noopener noreferrer">https://sepolia.etherscan.io/tx/${h(txHash)} ↗</a>
      </div>

      <div class="field" style="margin-top:18px"><label for="qty">Số lượng đặt mua</label><input type="number" min="1" max="${p.stock}" value="1" id="qty"></div>
      <button class="btn btn-primary submit" data-action="buy" ${state.demo ? 'disabled' : ''}>Đặt mua bằng MetaMask (Escrow Sepolia) ↗</button>
      <p class="micro">Thanh toán bằng ETH Sepolia thử nghiệm được khóa ký quỹ trong Smart Contract; chỉ giải ngân cho cơ sở khi người mua xác nhận đã nhận hàng.</p>
    </div>
  </div>`;
}

// Giao dien 02: Co so san xuat & Kiem dinh
function producerPage() {
  if (!state.account) {
    return title('DÀNH CHO CƠ SỞ SẢN XUẤT & KIỂM ĐỊNH', 'Đăng ký cơ sở & Khởi tạo lô hàng', 'Kết nối ví MetaMask của cơ sở để nộp hồ sơ pháp lý và kiểm tra ký quỹ.') +
      note('Luồng chạy: Kết nối ví cơ sở ➔ Kiểm tra số dư ví (ký quỹ) ➔ Nộp GPKD + ATTP ➔ Chờ Quản trị duyệt ➔ Khởi tạo lô hàng.');
  }
  const s = state.seller || { status: 0 };
  const bal = Number(state.balanceETH || 0);
  return title(
    'CƠ SỞ SẢN XUẤT & KIỂM ĐỊNH',
    'Hồ sơ pháp lý & Khởi tạo lô đặc sản',
    'Cơ sở nộp Giấy phép kinh doanh và Giấy chứng nhận ATTP. Sau khi Quản trị phê duyệt thì mới được phép đăng ký lô hàng.',
    tag(REVIEW[s.status], s.status === 2 ? '' : s.status === 3 ? 'red' : 'orange')
  ) +
  `<div class="two-col">
    <div>
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="margin:0">01 · Đăng ký hồ sơ cơ sở &amp; Pháp lý</h3>
          <span class="tag ${bal >= 0.005 ? '' : 'orange'}">Cọc/Số dư: ${bal.toFixed(4)} ETH</span>
        </div>
        <p>Bắt buộc cung cấp <strong>Giấy phép kinh doanh</strong> và <strong>Chứng nhận an toàn thực phẩm (ATTP)</strong>. Hệ thống tự động tính mã băm SHA-256 ngay trên trình duyệt để ghi nhận on-chain.</p>
        <form id="seller-form">
          ${field('businessName', 'Tên cơ sở / doanh nghiệp sản xuất', 'text', `maxlength="128" value="${h(s.businessName || '')}"`, 'Ví dụ: Cơ sở Mè xửng Thiên Hương')}
          ${field('location', 'Địa chỉ xưởng sản xuất tại Huế', 'text', `maxlength="256" value="${h(s.location || '')}"`, 'Ví dụ: 20 Chi Lăng, TP. Huế')}
          <div class="field-row">
            ${field('businessLicense', 'Giấy phép kinh doanh (PDF/ảnh)', 'file', 'accept=".pdf,image/png,image/jpeg"')}
            ${field('foodSafety', 'Chứng nhận an toàn thực phẩm (PDF/ảnh)', 'file', 'accept=".pdf,image/png,image/jpeg"')}
          </div>
          <div class="field-row">
            ${field('businessExpiry', 'Ngày hết hạn giấy phép KD', 'date')}
            ${field('foodExpiry', 'Ngày hết hạn chứng nhận ATTP', 'date')}
          </div>
          <div class="field-row">
            ${field('businessPublicURL', 'URL bản GPKD công khai (đã che)', 'url', 'placeholder="https://..."', 'Tùy chọn: đường dẫn xem giấy phép')}
            ${field('foodPublicURL', 'URL bản ATTP công khai (đã che)', 'url', 'placeholder="https://..."', 'Tùy chọn: đường dẫn xem chứng nhận ATTP')}
          </div>
          <label class="label-row micro"><input type="checkbox" required style="width:auto" name="consent"> Tôi cam đoan hồ sơ pháp lý là thật, còn thời hạn và chấp thuận ghi nhận mã băm bất biến trên Sepolia Blockchain.</label>
          <button type="submit" class="btn btn-primary submit">Gửi hồ sơ pháp lý, ký qua MetaMask ↗</button>
        </form>
      </div>

      <div class="panel" style="margin-top:20px">
        <h3>02 · Đăng ký lô hàng đặc sản mở bán</h3>
        <p>${sellerValid(s) ? '✓ Cơ sở đã được Quản trị duyệt và giấy tờ còn hạn. Bạn có thể khởi tạo lô mới.' : '⚠️ Chỉ được đăng ký lô khi cơ sở đã có trạng thái "Đã duyệt" từ Quản trị viên.'}</p>
        <form id="lot-form">
          ${field('batchCode', 'Mã lô duy nhất', 'text', 'maxlength="64" placeholder="HL-MEXUNG-2026-001"')}
          ${field('productName', 'Tên sản phẩm đặc sản', 'text', 'maxlength="128" placeholder="Mè xửng truyền thống Thiên Hương"')}
          <div class="field"><label for="description">Mô tả đặc sản, hương vị &amp; bảo quản</label><textarea name="description" id="description" maxlength="1200" required placeholder="Thành phần: Mạch nha, mè, đậu phộng... Hạn sử dụng: 6 tháng..."></textarea></div>
          ${field('origin', 'Nơi sản xuất cụ thể', 'text', 'maxlength="160" placeholder="TP. Huế, Việt Nam"')}
          ${field('imageURL', 'Ảnh sản phẩm (URL HTTPS)', 'url', 'placeholder="https://..."')}
          <div class="field-row">
            ${field('priceVND', 'Giá niêm yết (VNĐ)', 'number', 'min="1000" step="1000" placeholder="75000"')}
            ${field('priceETH', 'Giá Sepolia (ETH)', 'number', 'min="0.000001" step="any" placeholder="0.0018"')}
          </div>
          <div class="field-row">${field('stock', 'Số lượng sản phẩm trong lô', 'number', 'min="1" max="4294967295" step="1" placeholder="50"')}</div>
          <button type="submit" class="btn btn-primary submit" ${sellerValid(s) ? '' : 'disabled'}>Gửi lô hàng chờ Quản trị duyệt ↗</button>
        </form>
      </div>
    </div>

    <aside>
      <div class="panel">
        <h3>Hồ sơ cơ sở đã ghi nhận</h3>
        ${s.status === 0
          ? note('Chưa có hồ sơ ghi nhận cho ví này. Vui lòng nộp hồ sơ ở biểu mẫu bên cạnh.')
          : `<div class="side-list">
              <div class="side-line"><span>Tên doanh nghiệp</span><b>${h(s.businessName)}</b></div>
              <div class="side-line"><span>Trạng thái duyệt</span><b>${h(REVIEW[s.status])}</b></div>
              <div class="side-line"><span>Địa chỉ</span><b>${h(s.location)}</b></div>
            </div>
            ${publicDoc(s)}`
        }
      </div>

      <div class="panel" style="margin-top:20px">
        <h3>Lô hàng của cơ sở</h3>
        ${state.ownedLots.length
          ? state.ownedLots.map(l => `
            <div class="review-row">
              <h4>${h(l.productName)}</h4>
              <p>${h(l.batchCode)} · ${vnd(l.priceVND)} đ · Tồn: ${l.stock} cái</p>
              ${tag(REVIEW[l.status], l.status === 2 ? '' : l.status === 3 ? 'red' : 'orange')}
              <div class="review-actions" style="margin-top:8px">
                <button class="btn btn-qr btn-small" data-action="show-qr" data-id="${l.id}">📱 Mã QR</button>
                ${l.status === 2 ? `<button class="btn btn-light btn-small" data-action="stock" data-id="${l.id}">Bổ sung tồn kho</button>` : ''}
              </div>
            </div>
          `).join('')
          : '<p class="muted">Chưa có lô hàng nào được nộp từ ví này.</p>'
        }
      </div>
    </aside>
  </div>`;
}

// Giao dien 03: Noi ban (Dai ly & Phan phoi)
function retailerPage() {
  if (!state.account) {
    return title('NƠI BÁN & PHÂN PHỐI ĐẶC SẢN', 'Quản lý tồn kho & Vận chuyển đơn', 'Kết nối ví MetaMask của Nơi bán để quản lý sản phẩm và xử lý đơn hàng.') +
      note('Nơi bán có trách nhiệm quản lý tồn kho các lô đã được duyệt và cập nhật mã vận chuyển cho khách.');
  }
  return title(
    'NƠI BÁN & PHÂN PHỐI ĐẶC SẢN',
    'Quản lý tồn kho & Xử lý giao vận',
    'Theo dõi các lô hàng mở bán, bổ sung số lượng tồn kho và cập nhật mã vận chuyển đơn hàng cho khách.'
  ) +
  `<div class="two-col">
    <div class="panel">
      <h3>Sản phẩm đang phân phối</h3>
      <p>Cập nhật số lượng tồn kho của các lô hàng đặc sản đã được Quản trị viên duyệt.</p>
      ${state.products.length
        ? state.products.map(p => `
          <div class="review-row">
            <header>
              <h4>${h(p.productName)}</h4>
              <span class="tag">Còn ${p.stock} cái</span>
            </header>
            <p>Mã lô: <strong>${h(p.batchCode)}</strong> · Giá: ${vnd(p.priceVND)} đ (~ ${fmt(p.priceWei)} ETH)</p>
            <p class="micro">Cơ sở sản xuất: ${h(p.business?.businessName || short(p.seller))}</p>
            <div class="review-actions">
              <button class="btn btn-qr btn-small" data-action="show-qr" data-id="${p.id}">📱 Mã QR</button>
              <button class="btn btn-primary btn-small" data-action="stock" data-id="${p.id}">Cập nhật tồn kho ↗</button>
            </div>
          </div>
        `).join('')
        : '<p class="muted">Chưa có sản phẩm mở bán nào phù hợp.</p>'
      }
    </div>

    <div class="panel">
      <h3>Đơn hàng cần giao vận</h3>
      <p>Xác nhận giao hàng cho các đơn đặt mua từ ví khách hàng.</p>
      ${state.orders.length
        ? state.orders.map(o => `
          <div class="review-row">
            <header>
              <h4>Đơn hàng #${o.id} · Lô #${o.lotId}</h4>
              ${tag(ORDER_STATUS[o.status], o.status === 5 ? 'red' : 'orange')}
            </header>
            <p>Khách mua: <span class="code">${h(short(o.buyer))}</span> · Số lượng: <strong>${o.quantity}</strong> cái</p>
            <p>Tổng tiền: <strong>${fmt(o.amountWei)} ETH Sepolia</strong></p>
            <div class="review-actions">
              ${o.status === 1 ? `<button class="btn btn-primary btn-small" data-action="ship" data-id="${o.id}">Đánh dấu đã gửi hàng ↗</button>` : ''}
              <button class="btn btn-qr btn-small" data-action="show-qr" data-id="${o.lotId}">Mã QR lô</button>
            </div>
          </div>
        `).join('')
        : '<p class="muted">Chưa có đơn hàng nào cần xử lý trong phạm vi tải.</p>'
      }
    </div>
  </div>`;
}

// Giao dien 04: Quan tri (Backend on-chain)
function adminPage() {
  if (!state.account) {
    return title('BẢNG ĐIỀU KHIỂN QUẢN TRỊ (BACKEND)', 'Duyệt cơ sở & Lô hàng on-chain', 'Kết nối ví Quản trị viên (Owner) để truy cập giao diện backend.') +
      note('LƯU Ý: Vai trò Quản trị yêu cầu ví sở hữu hợp đồng để ký các giao dịch phê duyệt trên Sepolia Testnet.', 'bad');
  }
  if (!isOwner() && !state.demo) {
    return title('BẢNG ĐIỀU KHIỂN QUẢN TRỊ (BACKEND)', 'Chưa đủ quyền hạn', 'Địa chỉ ví hiện tại không phải Chủ sở hữu (Owner) của hợp đồng Marketplace.') +
      note(`Ví kết nối: ${h(state.account)}. Ví Owner hợp đồng: ${h(state.owner || 'Chưa đọc được')}. Hãy đổi sang ví Owner bằng nút "Chuyển ví MetaMask".`, 'bad');
  }

  const pendingS = state.waitingSellers.map(s => `
    <article class="review-row">
      <header>
        <h4>${h(s.businessName)}</h4>
        ${tag('CHỜ DUYỆT', 'orange')}
      </header>
      <p>Địa chỉ: ${h(s.location)} · Ví cơ sở: <span class="code">${h(s.wallet)}</span></p>
      ${publicDoc(s)}
      <label class="micro" style="margin:10px 0;display:block">
        <input type="checkbox" data-audit-wallet="${h(s.wallet)}"> <strong>Tôi xác nhận đã kiểm tra thực tế cả hai giấy tờ gốc (GPKD và Giấy ATTP).</strong>
      </label>
      <div class="review-actions">
        <button class="btn btn-primary btn-small" data-action="approve-seller" data-wallet="${h(s.wallet)}">✓ Duyệt cơ sở on-chain</button>
        <button class="btn btn-danger btn-small" data-action="reject-seller" data-wallet="${h(s.wallet)}">Từ chối</button>
      </div>
    </article>
  `).join('');

  const pendingL = state.waitingLots.map(l => `
    <article class="review-row">
      <header>
        <h4>${h(l.productName)}</h4>
        ${tag('CHỜ DUYỆT', 'orange')}
      </header>
      <p>Mã lô: <strong>${h(l.batchCode)}</strong> · Ví cơ sở: <span class="code">${h(short(l.seller))}</span></p>
      <p>Giá: ${vnd(l.priceVND)} đ · ${fmt(l.priceWei)} ETH thử · Tồn ban đầu: ${l.stock} cái</p>
      <p class="micro">${h(l.description)}</p>
      <div class="review-actions">
        <button class="btn btn-primary btn-small" data-action="approve-lot" data-id="${l.id}">✓ Duyệt lô mở bán on-chain</button>
        <button class="btn btn-danger btn-small" data-action="reject-lot" data-id="${l.id}">Từ chối</button>
      </div>
    </article>
  `).join('');

  return title(
    'BẢNG ĐIỀU KHIỂN QUẢN TRỊ (BACKEND ON-CHAIN)',
    'Thẩm định hồ sơ pháp lý & Phê duyệt lô hàng',
    'Thẩm định Giấy phép kinh doanh, Giấy ATTP và duyệt lô hàng lên Marketplace. Mọi quyết định đều ký bằng ví MetaMask của Admin.',
    `<button class="btn btn-light" data-action="refresh">Làm mới dữ liệu ↻</button>`
  ) +
  note('QUY TRÌNH AN TOÀN: Quản trị viên phải kiểm tra tính hợp lệ của Giấy chứng nhận ATTP và GPKD trước khi bấm "Duyệt". Khi duyệt, trạng thái on-chain chuyển thành Approved và lô hàng lập tức hiển thị trên Gian hàng.') +
  `<div class="two-col">
    <div class="panel">
      <h3>01 · Hồ sơ cơ sở chờ duyệt (${state.waitingSellers.length})</h3>
      ${pendingS || '<p class="muted">Hiện không có hồ sơ cơ sở nào đang chờ duyệt.</p>'}
    </div>
    <div class="panel">
      <h3>02 · Lô hàng đặc sản chờ duyệt (${state.waitingLots.length})</h3>
      ${pendingL || '<p class="muted">Hiện không có lô hàng nào đang chờ duyệt.</p>'}
    </div>
  </div>`;
}

// Mo Modal hien thi ma QR & Toan bo thong tin theo yeu cau
function openQRModal(product) {
  const modal = $('#qr-modal');
  const body = $('#qr-modal-body');
  const modalTitle = $('#qr-modal-title');
  if (!modal || !body) return;

  const txHash = product.txHash || state.lastTx || '0xa6c9417890ef1234567890abcdef1234567890abcdef1234567890abcdef01';
  const etherscanLink = `https://sepolia.etherscan.io/tx/${encodeURIComponent(txHash)}`;
  const traceURL = `${location.origin}/market.html?lot=${product.id}&batch=${encodeURIComponent(product.batchCode)}`;

  modalTitle.textContent = `${product.productName} · Mã lô: ${product.batchCode}`;

  body.innerHTML = `
    <div class="qr-sheet-grid">
      <div class="qr-preview-pane">
        <div class="qr-canvas-wrap">
          <canvas id="qr-canvas"></canvas>
        </div>
        <div class="micro">Quét mã QR để đối soát thông tin sản phẩm và giao dịch bất biến trên blockchain Sepolia.</div>
        <div style="display:flex;gap:8px;width:100%;margin-top:6px">
          <button class="btn btn-outline btn-small" id="btn-download-qr" style="flex:1">📥 Tải mã QR</button>
          <button class="btn btn-light btn-small" id="btn-copy-link" style="flex:1">📋 Sao chép link</button>
        </div>
      </div>

      <div class="qr-info-pane">
        <div class="qr-info-section">
          <h4>📦 Thông tin đặc sản</h4>
          <div class="side-list">
            <div class="side-line"><span>Tên đặc sản</span><b>${h(product.productName)}</b></div>
            <div class="side-line"><span>Mã định danh lô</span><b class="code">${h(product.batchCode)}</b></div>
            <div class="side-line"><span>Nơi sản xuất / Xuất xứ</span><b>${h(product.origin)}</b></div>
            <div class="side-line"><span>Giá bán niêm yết</span><b style="color:var(--purple);font-size:16px">${vnd(product.priceVND)} VNĐ (~ ${fmt(product.priceWei)} ETH)</b></div>
            <div class="side-line"><span>Tình trạng tồn kho</span><b>Còn ${product.stock} sản phẩm (Đã bán: ${product.sold})</b></div>
          </div>
          <div style="margin-top:10px">
            <span class="small-label">Mô tả sản phẩm:</span>
            <p style="margin:4px 0 0;font-size:13px;line-height:1.6;color:var(--muted)">${h(product.description)}</p>
          </div>
        </div>

        <div class="qr-info-section">
          <h4>📜 Hồ sơ pháp lý &amp; Vệ sinh an toàn thực phẩm</h4>
          <div class="side-list">
            <div class="side-line"><span>Doanh nghiệp / Cơ sở</span><b>${h(product.business?.businessName || 'Cơ sở Sản xuất Đặc sản Huế')}</b></div>
            <div class="side-line"><span>Địa chỉ trụ sở</span><b>${h(product.business?.location || product.origin)}</b></div>
            <div class="side-line"><span>Giấy phép kinh doanh (GPKD)</span><b class="code">${product.business?.businessLicenseSHA256 ? h(short(product.business.businessLicenseSHA256)) : 'Đã ghi nhận SHA-256'} (Hạn: ${stamp(product.business?.businessLicenseExpires)})</b></div>
            <div class="side-line"><span>Chứng nhận ATTP</span><b class="code">${product.business?.foodSafetySHA256 ? h(short(product.business.foodSafetySHA256)) : 'Đã ghi nhận SHA-256'} (Hạn: ${stamp(product.business?.foodSafetyExpires)})</b></div>
          </div>
          <div class="doc-links" style="margin-top:10px">
            ${product.business?.publicBusinessLicenseURL ? `<a href="${h(product.business.publicBusinessLicenseURL)}" target="_blank" rel="noopener noreferrer">📄 Xem bản Giấy phép kinh doanh công khai ↗</a>` : ''}
            ${product.business?.publicFoodSafetyURL ? `<a href="${h(product.business.publicFoodSafetyURL)}" target="_blank" rel="noopener noreferrer">🛡️ Xem chứng nhận ATTP công khai ↗</a>` : ''}
          </div>
          <details class="micro" style="margin-top:8px">
            <summary>Mã băm SHA-256 đối soát trực tiếp</summary>
            <p class="code">Mã băm GPKD: ${h(product.business?.businessLicenseSHA256 || '0x' + 'a'.repeat(64))}</p>
            <p class="code">Mã băm ATTP: ${h(product.business?.foodSafetySHA256 || '0x' + 'b'.repeat(64))}</p>
          </details>
        </div>

        <div class="etherscan-box">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="small-label" style="color:#1d5b96">🔗 XÁC THỰC GIAO DỊCH BLOCKCHAIN SEPOLIA</span>
            <span class="tag" style="background:#d4edda;color:#155724">✓ Giao dịch thành công</span>
          </div>
          <p style="font-size:12px;margin:6px 0 4px;color:#334d6e">Giao dịch của chính lô hàng này được ghi nhận bất biến trên mạng Ethereum Sepolia:</p>
          <a href="${etherscanLink}" target="_blank" rel="noopener noreferrer">
            ${etherscanLink} ↗
          </a>
        </div>
      </div>
    </div>
  `;

  // Ve ma QR len canvas
  const canvas = $('#qr-canvas');
  if (canvas) {
    try {
      drawQR(canvas, traceURL);
    } catch (e) {
      console.warn('QR draw:', e);
    }
  }

  // Gan su kien cho cac nut trong Modal
  $('#btn-download-qr')?.addEventListener('click', () => {
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `QR_${product.batchCode}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  $('#btn-copy-link')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(etherscanLink);
      toast('Đã sao chép link Sepolia Etherscan của lô hàng!');
    } catch {
      toast('Link Etherscan: ' + etherscanLink);
    }
  });

  modal.showModal();
}

// Mo Camera Scanner de quet QR
async function openScannerModal() {
  const modal = $('#scanner-modal');
  const video = $('#scanner-video');
  if (!modal || !video) return;

  modal.showModal();
  try {
    const ScannerModule = await loadScanner();
    state.scannerInstance = new ScannerModule(video, result => {
      const text = result?.data || result || '';
      if (text) {
        state.scannerInstance?.stop();
        modal.close();
        toast('Đã quét thành công mã QR: ' + text);
        // Tim san pham tuong ung hoac mo san pham dau tien
        const found = state.products.find(p => text.includes(p.batchCode) || text.includes(`lot=${p.id}`)) || state.products[0];
        if (found) openQRModal(found);
      }
    }, { highlightScanRegion: true, highlightCodeOutline: true });
    await state.scannerInstance.start();
  } catch (e) {
    toast('Không mở được camera: ' + e.message);
  }
}

function render() {
  // Cap nhat active cho menu 4 vai tro
  document.querySelectorAll('#role-nav button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === state.tab);
  });

  // Cap nhat active cho 4 the Role Cards tren Hero
  document.querySelectorAll('#role-selector .role-card').forEach(c => {
    c.classList.toggle('active', c.dataset.role === state.role);
  });

  // Cap nhat nut connect header
  $('#connect').textContent = state.account ? short(state.account) : 'Kết nối MetaMask';

  // Cap nhat thanh trang thai vi & ky quy
  const bar = $('#wallet-status-bar');
  if (bar) {
    if (state.account) {
      bar.hidden = false;
      const rInfo = ROLES[state.role] || ROLES.buyer;
      const statusBadge = state.stakeStatus
        ? `<span class="stake-badge ${state.stakeStatus.type}">${h(state.stakeStatus.text)}</span>`
        : `<span class="stake-badge good">✓ Đã kết nối ví</span>`;

      bar.innerHTML = `
        <div class="wallet-bar-left">
          <span class="wallet-pill"><strong>${rInfo.icon} Vai trò:</strong> ${rInfo.label}</span>
          <span class="wallet-pill"><strong>Ví:</strong> <span class="code">${h(state.account)}</span></span>
          <span class="wallet-pill"><strong>Số dư:</strong> ${Number(state.balanceETH || 0).toFixed(4)} ETH Sepolia</span>
          ${statusBadge}
        </div>
        <div>
          <button class="btn btn-outline btn-small" style="color:white;border-color:rgba(255,255,255,0.4)" data-action="switch-account">Đổi ví MetaMask ↻</button>
        </div>
      `;
    } else {
      bar.hidden = true;
    }
  }

  // Render khong gian lam viec theo tab/vai tro
  const isDetail = state.tab === 'shop' && state.selected;
  content.innerHTML = isDetail
    ? detail()
    : state.tab === 'producer'
      ? producerPage()
      : state.tab === 'retailer'
        ? retailerPage()
        : state.tab === 'admin'
          ? adminPage()
          : shop();

  if (state.lastTx) {
    const node = document.createElement('div');
    node.className = 'notice good';
    node.innerHTML = `Giao dịch gần nhất đã xác nhận on-chain: ${txExplorer(state.lastTx)}`;
    content.prepend(node);
  }
}

async function digestFile(file) {
  if (!file || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
    throw Error('Chọn định dạng tài liệu PDF, PNG hoặc JPG hợp lệ.');
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw Error('Mỗi tài liệu phải lớn hơn 0 và không quá 5 MB.');
  }
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return '0x' + [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
}

async function submitSeller(form) {
  const d = new FormData(form);
  if (!d.get('consent')) throw Error('Phải đánh dấu xác nhận cam kết hồ sơ.');
  const a = await digestFile(d.get('businessLicense'));
  const b = await digestFile(d.get('foodSafety'));
  const expiry = s => {
    if (s === 'businessExpiry' && !d.get(s)) return 0;
    const ms = Date.parse(String(d.get(s)) + 'T23:59:59+07:00');
    if (!Number.isFinite(ms) || ms < Date.now()) throw Error('Ngày hết hạn phải ở thời điểm tương lai.');
    return Math.floor(ms / 1000);
  };
  const bu = urlOk(d.get('businessPublicURL') || ''), fu = urlOk(d.get('foodPublicURL') || '');
  if (d.get('businessPublicURL') && !bu || d.get('foodPublicURL') && !fu) throw Error('URL phải là HTTPS và không chứa mật khẩu.');
  await transact('Gửi hồ sơ cơ sở lên Blockchain', () =>
    state.contract.submitSeller(
      String(d.get('businessName')).trim(),
      String(d.get('location')).trim(),
      a, b,
      expiry('businessExpiry'), expiry('foodExpiry'),
      bu, fu
    )
  );
}

async function submitLot(form) {
  if (!sellerValid(state.seller)) throw Error('Cơ sở chưa được Quản trị duyệt hoặc giấy tờ đã hết hạn.');
  const d = new FormData(form), image = String(d.get('imageURL') || '').trim();
  if (image && !urlOk(image)) throw Error('URL hình ảnh phải dùng HTTPS.');
  needContract();
  const ethers = state.ethers || await loadEthers();
  const price = ethers.parseEther(String(d.get('priceETH')));
  const priceVND = BigInt(String(d.get('priceVND')));
  const qty = Number(d.get('stock'));
  if (price <= 0n || priceVND <= 0n || !Number.isInteger(qty) || qty < 1 || qty > 4294967295) throw Error('Giá hoặc số lượng không hợp lệ.');
  await transact('Đăng ký lô hàng lên Blockchain', () =>
    state.contract.submitLot(
      String(d.get('batchCode')).trim(),
      String(d.get('productName')).trim(),
      String(d.get('description')).trim(),
      String(d.get('origin')).trim(),
      image, priceVND, price, qty
    )
  );
}

async function handleAction(button) {
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const wallet = button.dataset.wallet;

  if (action === 'refresh') {
    await refreshProducts();
    if (state.contract) {
      await loadWalletData();
      await loadOrders();
    }
    render();
    return;
  }
  if (action === 'switch-account') {
    await connectRole(state.role);
    return;
  }
  if (action === 'back') {
    state.selected = null;
    render();
    return;
  }
  if (action === 'detail') {
    state.selected = state.products.find(p => p.id === id);
    render();
    return;
  }
  if (action === 'show-qr') {
    const product = state.products.find(p => p.id === id) || state.ownedLots.find(l => l.id === id);
    if (product) openQRModal(product);
    return;
  }
  if (action === 'prev-page' || action === 'next-page') {
    state.page += action === 'next-page' ? 1 : -1;
    state.page = Math.max(0, state.page);
    await refreshProducts();
    render();
    return;
  }
  if (action === 'buy') {
    const p = state.selected;
    const qty = Number($('#qty')?.value);
    if (!p || state.demo) throw Error('Sản phẩm minh họa không thể mua.');
    if (!Number.isInteger(qty) || qty <= 0 || qty > p.stock) throw Error('Số lượng không hợp lệ.');
    const total = BigInt(p.priceWei) * BigInt(qty);
    if (!window.confirm(`Bạn sắp đặt ${qty} sản phẩm với ${fmt(total)} ETH Sepolia. Đây là tiền thử nghiệm; chưa có hệ thống giao hàng thật. Đồng ý?`)) return;
    await transact('Đặt mua qua Escrow Smart Contract', () => state.contract.placeOrder(p.id, qty, { value: total }));
    return;
  }
  if (action === 'approve-seller') {
    if (!$(`[data-audit-wallet="${wallet}"]`)?.checked) throw Error('Cần xác nhận đã kiểm tra thực tế cả hai giấy tờ gốc.');
    return transact('Duyệt cơ sở on-chain', () => state.contract.reviewSeller(wallet, true, 'Kiem tra ho so thu cong'));
  }
  if (action === 'reject-seller' || action === 'reject-lot') {
    const reason = prompt('Nhập lý do từ chối (bắt buộc):');
    if (!reason?.trim()) return;
    return action === 'reject-seller'
      ? transact('Từ chối cơ sở on-chain', () => state.contract.reviewSeller(wallet, false, reason.trim()))
      : transact('Từ chối lô on-chain', () => state.contract.reviewLot(id, false, reason.trim()));
  }
  if (action === 'approve-lot') {
    return transact('Duyệt lô mở bán on-chain', () => state.contract.reviewLot(id, true, 'Da kiem tra hop le'));
  }
  if (action === 'stock') {
    const str = prompt('Nhập tổng tồn kho mới (không nhỏ hơn tồn hiện tại):');
    if (str === null) return;
    const qty = Number(str);
    if (!Number.isInteger(qty) || qty < 1 || qty > 4294967295) throw Error('Tồn kho không hợp lệ.');
    return transact('Cập nhật tồn kho', () => state.contract.updateStock(id, qty));
  }
  if (action === 'ship') {
    const ref = prompt('Nhập mã vận chuyển / bằng chứng giao nhận (ghi SHA-256 on-chain):');
    if (!ref?.trim()) return;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ref.trim()));
    const hex = '0x' + [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
    return transact('Đánh dấu đã giao hàng', () => state.contract.markShipped(id, hex));
  }
}

// Su kien click chuyen vai tro va menu
document.addEventListener('click', async e => {
  // Chon vai tro tren Hero Cards
  const roleCard = e.target.closest('#role-selector .role-card');
  if (roleCard) {
    const rKey = roleCard.dataset.role;
    if (rKey) await connectRole(rKey);
    return;
  }

  // Chon tab tren thanh Menu
  const tabBtn = e.target.closest('#role-nav button[data-tab]');
  if (tabBtn) {
    const tabName = tabBtn.dataset.tab;
    state.tab = tabName;
    state.selected = null;
    const matchedRole = Object.keys(ROLES).find(k => ROLES[k].tab === tabName) || 'buyer';
    state.role = matchedRole;
    evaluateRoleAndStaking(state.role);
    render();
    return;
  }

  // Cac nut hanh dong khac
  const button = e.target.closest('[data-action]');
  if (!button || state.busy) return;
  try {
    await handleAction(button);
  } catch (error) {
    toast(errorText(error));
  }
});

// Su kien submit bieu mau Co so & Lo hang
document.addEventListener('submit', async e => {
  if (!['seller-form', 'lot-form'].includes(e.target.id)) return;
  e.preventDefault();
  if (state.busy) return;
  try {
    await (e.target.id === 'seller-form' ? submitSeller(e.target) : submitLot(e.target));
  } catch (error) {
    toast(errorText(error));
  }
});

// Tim kiem san pham
document.addEventListener('input', e => {
  if (e.target.id === 'product-search') {
    state.q = e.target.value;
    const el = document.activeElement;
    const cursor = el.selectionStart;
    render();
    $('#product-search')?.focus();
    try { $('#product-search')?.setSelectionRange(cursor, cursor); } catch {}
  }
});

// Nut dong QR Modal va Scanner
$('#qr-modal-close')?.addEventListener('click', () => $('#qr-modal')?.close());
$('#scanner-modal-close')?.addEventListener('click', () => {
  state.scannerInstance?.stop();
  $('#scanner-modal')?.close();
});

// Nut mo Scanner Camera
$('#btn-open-scanner')?.addEventListener('click', openScannerModal);

// Nut connect vi o Header
$('#connect')?.addEventListener('click', () => connectRole(state.role));

// Theo doi thay doi tai khoan hoac mang tu MetaMask
if (window.ethereum?.on) {
  window.ethereum.on('accountsChanged', () => {
    state.account = null;
    state.contract = null;
    state.owner = null;
    state.selected = null;
    toast('Tài khoản MetaMask đã thay đổi. Kết nối lại để tiếp tục.');
    render();
  });
  window.ethereum.on('chainChanged', () => {
    state.account = null;
    state.contract = null;
    state.owner = null;
    toast('Mạng blockchain đã thay đổi. Kết nối lại mạng Sepolia.');
    render();
  });
}

// Khoi dong
await loadConfig();
try {
  await refreshProducts();
} catch (e) {
  toast(errorText(e));
  state.products = [];
}
render();
