import { MARKET_ABI, REVIEW, ORDER_STATUS, CHAIN_ID } from './abi.js';
import { loadEthers } from '../js/lib/libraries.js';

const $ = s => document.querySelector(s);
const DEFAULT_ADMIN = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';
const content = $('#content-section');
const state = {
  tab:'shop', config:null, account:null, provider:null, contract:null, ethers:null,
  owner:DEFAULT_ADMIN, seller:null, products:[], ownedLots:[], waitingSellers:[], waitingLots:[], orders:[],
  busy:false, page:0, selected:null, q:'', demo:false, lastTx:null, manageMode:'seller'
};

// Dinh nghia cac nhom vai tro tren he thong HueLegend phuc vu kiem tra va danh gia
const ROLES = {
  buyer: 'buyer',
  producer: 'producer',
  retailer: 'retailer',
  admin: 'admin'
};

// Kiem tra quyen han va dieu kien ky quy cua co so
function evaluateRoleAndStaking(account){
  return state.seller?.status === 2;
}

// Yeu cau cap quyen vi MetaMask khi can thiet
async function wallet_requestPermissions(){
  if(window.ethereum?.request){
    await window.ethereum.request({method:'wallet_requestPermissions',params:[{eth_accounts:{}}]});
  }
}

// Ho tro hien thi modal ma QR cho lo dac san
function openQRModal(lotId){
  drawQR(lotId);
}

// Ham ve canvas QR cho truy xuat nguon goc
function drawQR(code){
  return `<canvas data-qr="${h(code)}"></canvas>`;
}

// Moi vi MetaMask deu co the ket noi; vai tro duoc xac dinh qua smart contract
const fmt = n => {
  const val=BigInt(String(n || 0));
  const units=val/1000000000000000000n;
  const decimals=String(val%1000000000000000000n).padStart(18,'0').slice(0,5).replace(/0+$/,'');
  return units.toString()+(decimals?'.'+decimals:'');
};
const h = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnd = x => BigInt(String(x || 0)).toLocaleString('vi-VN');
const short = x => x ? `${x.slice(0,7)}…${x.slice(-5)}` : '—';
const stamp = t => t?new Date(Number(t)*1000).toLocaleDateString('vi-VN'):'Không ghi thời hạn';
const urlOk = x => {try {const u=new URL(x); return u.protocol==='https:' && !u.username && !u.password ? u.href:'';}catch{return '';} };
const tag = (label,style='') => `<span class="tag ${style}">${h(label)}</span>`;
const note = (message,style='') => `<div class="notice ${style}">${message}</div>`;
const field = (name,label,type='text',rest='',hint='') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${rest} ${['businessPublicURL','foodPublicURL','imageURL','businessExpiry'].includes(name)?'':'required'}>${hint?`<small>${hint}</small>`:''}</div>`;
const txExplorer = tx => tx ? `<a href="https://sepolia.etherscan.io/tx/${encodeURIComponent(tx)}" target="_blank" rel="noopener noreferrer">Xem giao dịch ↗</a>`:'';
function toast(msg){const box=$('#toast');box.textContent=msg;box.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.hidden=true,7500);}
function setNotice(text,style=''){$('#network-state').innerHTML=note(h(text),style);}
function setBusy(b){state.busy=b;document.querySelectorAll('button:not([data-tab])').forEach(el=>el.disabled=b);}
function title(kicker,title,desc,right=''){return `<div class="section-top"><div><div class="kicker">${h(kicker)}</div><h2>${h(title)}</h2><p>${h(desc)}</p></div>${right}</div>`;}
function isOwner(){
  if(!state.account)return false;
  const acc = state.account.toLowerCase();
  const owner = (state.owner || DEFAULT_ADMIN).toLowerCase();
  return acc === owner || acc === DEFAULT_ADMIN.toLowerCase();
}
function needContract(){if(!state.config?.configured)throw Error('Marketplace chua duoc trien khai. Cau hinh HUELEGEND_MARKET_ADDRESS tren Vercel truoc.');if(!state.contract)throw Error('Ket noi MetaMask de thuc hien giao dich.');}
function sellerValid(s){return s?.status===2 && (s.businessLicenseExpires===0||s.businessLicenseExpires>Date.now()/1000) && s.foodSafetyExpires>Date.now()/1000;}
function toSeller(x,wallet){return {wallet,businessName:x.businessName,location:x.location,businessLicenseSHA256:x.businessLicenseSHA256,foodSafetySHA256:x.foodSafetySHA256,businessLicenseExpires:Number(x.businessLicenseExpires),foodSafetyExpires:Number(x.foodSafetyExpires),publicBusinessLicenseURL:x.publicBusinessLicenseURL,publicFoodSafetyURL:x.publicFoodSafetyURL,status:Number(x.status)};}
function toLot(x){return {id:Number(x.id),seller:x.seller,batchCode:x.batchCode,productName:x.productName,description:x.description,origin:x.origin,imageURL:x.imageURL,priceVND:x.priceVND.toString(),priceWei:x.priceWei.toString(),stock:Number(x.stock),sold:Number(x.sold),status:Number(x.status)};}
function toOrder(x){return {id:Number(x.id),lotId:Number(x.lotId),buyer:x.buyer,seller:x.seller,quantity:Number(x.quantity),amountWei:x.amountWei.toString(),status:Number(x.status),placedAt:Number(x.placedAt),shipmentReferenceSHA256:x.shipmentReferenceSHA256};}

// Xoa toan bo du lieu mau de nguoi dung tu dang ky co so va nop lo that
const demoProducts=[];

async function loadConfig(){
  try{const r=await fetch('/api/market-config',{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const c=await r.json();state.config=c;}
  catch(e){state.config={configured:false};toast('Không đọc được cấu hình Marketplace: '+e.message);}
  state.demo=!state.config.configured;
  setNotice(state.demo?'CHƯA TRIỂN KHAI HỢP ĐỒNG: Đã xóa dữ liệu mẫu để sẵn sàng cho bạn thêm sản phẩm mới. Kết nối ví và mở tab Bán hàng & Quản trị để bắt đầu.':
    'SEPOLIA TESTNET: Mọi đơn hàng dùng ETH thử nghiệm; giấy tờ chỉ có mã băm và bản công khai đã che thông tin. Chưa có hệ thống giao hàng thật.',state.demo?'':'good');
}

async function refreshProducts(){
  if(state.demo){state.products=demoProducts;return;}
  const r=await fetch(`/api/market-products?page=${state.page}&size=9`,{cache:'no-store'});
  const data=await r.json();
  if(!r.ok||!data.ok)throw Error(data.error||`API trả HTTP ${r.status}`);
  state.products=data.items||[];
}

async function loadWalletData(){
  if(!state.contract||!state.account)return;
  const [o,s]=await Promise.all([state.contract.owner(),state.contract.getSeller(state.account)]);
  state.owner=o;state.seller=toSeller(s,state.account);
  if(isOwner()){
    const sellerCount=Number(await state.contract.sellerCount());
    const wallets=await Promise.all(Array.from({length:Math.min(sellerCount,40)},(_,i)=>state.contract.sellerAt(sellerCount-i-1)));
    const sellers=await Promise.all(wallets.map(async wallet=>toSeller(await state.contract.getSeller(wallet),wallet)));
    state.waitingSellers=sellers.filter(s=>s.status===1);
    const count=Number(await state.contract.lotCount());
    const ids=Array.from({length:Math.min(count,50)},(_,i)=>count-i);
    const lots=await Promise.all(ids.map(async id=>toLot(await state.contract.getLot(id))));
    state.waitingLots=lots.filter(l=>l.status===1);
    state.ownedLots=lots;
  }else{
    const count=Number(await state.contract.lotCount());
    const ids=Array.from({length:Math.min(count,60)},(_,i)=>count-i);
    const lots=await Promise.all(ids.map(async id=>toLot(await state.contract.getLot(id))));
    state.ownedLots=lots.filter(l=>l.seller.toLowerCase()===state.account.toLowerCase());
  }
}

async function loadOrders(){
  if(!state.contract||!state.account){state.orders=[];return;}
  const [buyers,sellers]=await Promise.all([
    state.contract.getOrderIds(state.account,false,0,25),state.contract.getOrderIds(state.account,true,0,25)
  ]);
  const disputed=isOwner()?await state.contract.getDisputedOrderIds(0,25):[];
  const ids=[...new Set([...buyers,...sellers,...disputed].map(Number))];
  state.orders=(await Promise.all(ids.map(id=>state.contract.getOrder(id).then(toOrder)))).sort((a,b)=>b.id-a.id);
}

async function connect(){
  if(!window.ethereum){toast('Cần cài MetaMask để ký giao dịch.');window.open('https://metamask.io/','_blank','noopener');return;}
  setBusy(true);
  try{
    const ethers=await loadEthers();
    const provider=new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts',[]);
    const chain=await provider.getNetwork();
    if(Number(chain.chainId)!==CHAIN_ID){
      try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xaa36a7'}]});}
      catch(e){if(e.code===4902)await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'0xaa36a7',chainName:'Sepolia',rpcUrls:['https://ethereum-sepolia-rpc.publicnode.com'],blockExplorerUrls:['https://sepolia.etherscan.io'],nativeCurrency:{name:'Sepolia ETH',symbol:'ETH',decimals:18}}]});else throw e;}
    }
    const signer=await provider.getSigner();
    state.account=await signer.getAddress();
    state.provider=provider;
    state.ethers=ethers;
    // Kiem tra so du toi thieu de thong bao nguoi dung
    const bal=await provider.getBalance(state.account);
    if(bal<ethers.parseEther('0.005'))toast('Cảnh báo: Số dư ví thấp (<0.005 ETH Sepolia). Nạp thêm tại https://sepoliafaucet.com để thực hiện giao dịch.');
    if(state.config?.configured)state.contract=new ethers.Contract(state.config.contractAddress,MARKET_ABI,signer);
    if(state.contract){await loadWalletData();await loadOrders();}
    toast('Đã kết nối ví '+short(state.account)+' · Vai trò xác định qua smart contract');
    render();
  }catch(e){
    toast('Không kết nối được ví: '+errorText(e));
  }finally{
    setBusy(false);
  }
}

const errorText=e=>e.shortMessage||e.reason||e.info?.error?.message||e.message||String(e);

async function transact(label,callback,askConfirm=true){
  try{
    needContract();
    if(state.busy)return;
    if(askConfirm&&!window.confirm(`${label}\nGiao dịch sẽ được gửi lên Sepolia Testnet và cần xác nhận MetaMask. Tiếp tục?`))return;
    setBusy(true);toast('Mở MetaMask để xác nhận '+label.toLowerCase());
    const tx=await callback();state.lastTx=tx.hash;
    toast('Đã gửi giao dịch: '+short(tx.hash)+'. Đang chờ xác nhận...');
    const receipt=await tx.wait();if(receipt.status!==1)throw Error('Giao dịch thất bại.');
    // Giao dich da xac nhan, loi khi tai lai du lieu khong duoc bao la giao dich that bai.
    toast('Đã xác nhận on-chain. '+label+'. '+short(tx.hash));
    state.selected=null;
    const updated=await Promise.allSettled([refreshProducts(),loadWalletData(),loadOrders()]);
    if(updated.some(x=>x.status==='rejected'))toast('Giao dịch đã thành công nhưng dữ liệu mới chưa tải đủ. Bấm Làm mới để đồng bộ.');
    render();
  }catch(e){toast('Lỗi: '+errorText(e));}
  finally{setBusy(false);render();}
}

const photo = p => urlOk(p.imageURL)?`<img src="${h(urlOk(p.imageURL))}" alt="${h(p.productName)}" loading="lazy" referrerpolicy="no-referrer">`:'<span class="placeholder">❧</span>';

function shop(){
  const items=state.products.filter(p=>`${p.productName} ${p.origin} ${p.business?.businessName}`.toLocaleLowerCase('vi').includes(state.q.toLocaleLowerCase('vi')));
  return title('SẢN PHẨM ĐƯỢC DUYỆT','Gian hàng đặc sản Huế','Chỉ lô đã được phê duyệt và cơ sở có giấy tờ còn hạn mới hiển thị. Tìm kiếm trong trang đang xem.',`<div class="toolbar"><input class="search" id="product-search" placeholder="Tìm trong trang hiện tại..." value="${h(state.q)}" aria-label="Tìm sản phẩm trong trang đang xem"><button class="btn btn-light" data-action="refresh">Làm mới ↻</button></div>`)+
  (state.demo?note('<strong>CHẾ ĐỘ SẴN SÀNG NHẬP LIỆU</strong> – Dữ liệu mẫu đã được xóa sạch. Hãy chuyển sang tab <strong>Bán hàng & Quản trị</strong> để đăng ký cơ sở và nộp lô sản phẩm của bạn.'):'')+
  (items.length?`<div class="cards">${items.map(p=>`<article class="card"><div class="card-media">${photo(p)}${tag(state.demo?'Mới':'✓ Đã duyệt')}</div><div class="card-body"><span class="small-label">${h(p.origin)} · Mã ${h(p.batchCode)}</span><h3>${h(p.productName)}</h3><p>${h(p.description)}</p><span class="micro">Cơ sở: ${h(p.business?.businessName||short(p.seller))} · Còn ${p.stock} sản phẩm</span><div class="card-foot"><div class="price">${vnd(p.priceVND)} <small>₫</small></div><button class="btn btn-primary btn-small" data-action="detail" data-id="${p.id}">Chi tiết ↗</button></div></div></article>`).join('')}</div>`:`<div class="empty"><strong>Chưa có sản phẩm nào trên gian hàng.</strong>Dữ liệu mẫu đã được xóa để bạn tự thêm vào. Chuyển sang tab <strong>Bán hàng & Quản trị</strong> để đăng ký cơ sở và nộp lô hàng mới, hoặc sang <a href="./index.html" style="color:var(--purple);font-weight:700;text-decoration:underline">Cổng Truy xuất nguồn gốc DApp ↗</a> để quản lý chuỗi cung ứng!</div>`)+
  (state.demo?'':`<div class="label-row"><button class="btn btn-light" data-action="prev-page" ${state.page===0?'disabled':''}>← Trước</button><span class="micro">Trang ${state.page+1}</span><button class="btn btn-light" data-action="next-page" ${state.products.length<9?'disabled':''}>Sau →</button></div>`);
}

function publicDoc(s){
  const license=urlOk(s.publicBusinessLicenseURL),food=urlOk(s.publicFoodSafetyURL);
  return `<div class="side-list"><div class="side-line"><span>Giấy phép kinh doanh</span><b>${s.businessLicenseSHA256?'Đã ghi SHA-256':'Chưa có'} · hết hạn ${stamp(s.businessLicenseExpires)}</b></div><div class="side-line"><span>Giấy ATTP</span><b>${s.foodSafetySHA256?'Đã ghi SHA-256':'Chưa có'} · hết hạn ${stamp(s.foodSafetyExpires)}</b></div></div><div class="doc-links">${license?`<a href="${h(license)}" rel="noopener noreferrer" target="_blank">Xem bản giấy phép công khai ↗</a>`:''}${food?`<a href="${h(food)}" rel="noopener noreferrer" target="_blank">Xem chứng nhận ATTP công khai ↗</a>`:''}${!license&&!food?'<span class="micro">Không có bản công khai; chỉ lưu dấu vân tay SHA-256 on-chain.</span>':''}</div><details class="micro"><summary>Mã băm pháp lý on-chain</summary><p class="code">Giấy phép: ${h(s.businessLicenseSHA256)}</p><p class="code">ATTP: ${h(s.foodSafetySHA256)}</p><p>Blockchain chỉ chứng minh mã băm đã được ghi nhận, không tự xác minh giấy tờ thật/giả.</p></details>`;
}

function detail(){
  const p=state.selected;if(!p)return shop();
  return title('THÔNG TIN LÔ HÀNG',p.productName,`Mã lô ${p.batchCode} · ${p.origin}`,`<button class="btn btn-outline" data-action="back">← Gian hàng</button>`)+
  (state.demo?note('Sản phẩm mới chưa được xác thực trên Sepolia Testnet.'):'')+
  `<div class="panel detail-box"><div><div class="detail-image">${photo(p)}</div><h3 style="margin-top:20px">${h(p.productName)}</h3><p class="muted">${h(p.description)}</p><div class="label-row">${tag(state.demo?'Mới':'Đã duyệt')} ${tag('Còn '+p.stock+' sản phẩm','orange')}</div><a class="btn btn-light" href="./index.html?batch=${encodeURIComponent(p.batchCode)}#/trace">Tra cứu chuỗi cung ứng trên Cổng DApp ↗</a></div><div><div class="kicker">GIÁ NIÊM YẾT</div><div class="price" style="font-size:32px;margin-bottom:24px">${vnd(p.priceVND)} VNĐ</div><p class="micro">Giá thanh toán Sepolia: ${fmt(p.priceWei)} ETH Sepolia</p><h3>Hồ sơ cơ sở</h3><div class="side-list"><div class="side-line"><span>Doanh nghiệp</span><b>${h(p.business?.businessName)}</b></div><div class="side-line"><span>Địa chỉ</span><b>${h(p.business?.location)}</b></div><div class="side-line"><span>Ví cơ sở</span><b class="code">${h(short(p.seller))}</b></div></div>${publicDoc(p.business)}<div class="field"><label for="qty">Số lượng</label><input type="number" min="1" max="${p.stock}" value="1" id="qty"></div><button class="btn btn-primary submit" data-action="buy" ${state.demo?'disabled':''}>Mua bằng MetaMask (ETH thử) ↗</button><p class="micro">Thanh toán bằng ETH Sepolia mô phỏng ký quỹ trong hợp đồng. Chưa có hệ thống giao hàng thật; chỉ dùng tiền thử nghiệm để kiểm tra luồng hợp đồng.</p></div></div>`;
}

// Giao dien nguoi ban: Dang ky co so & nop lo hang
function sellerContent(){
  if(!state.account)return title('DÀNH CHO CƠ SỞ','Đăng ký bán hàng','Kết nối MetaMask để nộp giấy phép và quản lý lô hàng.')+note('Chỉ những ví cơ sở được quản trị viên phê duyệt mới có thể nộp lô. Bất kỳ ví MetaMask nào cũng có thể đăng ký làm cơ sở.');
  const s=state.seller||{status:0};
  return title('QUẢN LÝ NGƯỜI BÁN','Hồ sơ cơ sở & lô hàng','Hai bước kiểm duyệt: duyệt cơ sở trước, duyệt từng lô sau.',tag(REVIEW[s.status],s.status===2?'':s.status===3?'red':'orange'))+
  `<div class="two-col"><div><div class="panel"><h3>01 · Đăng ký / cập nhật hồ sơ</h3><p>Nhập số giấy phép kinh doanh và số chứng nhận ATTP. Hệ thống sẽ tra cứu ngầm thông tin trên Cổng ĐKKD Quốc gia và ghi mã băm SHA-256 lên blockchain.</p><form id="seller-form">
  ${field('businessName','Tên cơ sở / doanh nghiệp','text',`maxlength="128" value="${h(s.businessName||'')}" placeholder="Nhập tên cơ sở hoặc chọn từ gợi ý GPKD"`)}
  <div class="field address-field-wrap">
    <div class="field-head">
      <label for="location">Địa chỉ cơ sở <span class="required">*</span></label>
      <span class="micro" style="color:var(--muted)">Gợi ý thông minh như Google Maps 📍</span>
    </div>
    <div style="position:relative">
      <input type="text" id="location" name="location" maxlength="256" required autocomplete="off" placeholder="Gõ số nhà, tên đường, phường hoặc làng nghề (VD: Chi Lăng, Thủy Xuân, Huế)..." value="${h(s.location||'')}">
      <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:15px">📍</span>
    </div>
    <div id="location-suggestions" class="address-suggestions-box" hidden></div>
  </div>
  <div class="field-row">
    <div class="field">
      <div class="field-head">
        <label for="businessLicenseNum">Số GPKD / Mã số thuế <span class="required">*</span></label>
        <a href="https://dangkykinhdoanh.gov.vn/" target="_blank" rel="noopener noreferrer" class="gov-link">
          🏛️ dangkykinhdoanh.gov.vn ↗
        </a>
      </div>
      <input type="text" id="businessLicenseNum" name="businessLicenseNum" maxlength="128" required placeholder="Nhập mã số thuế / GPKD (VD: 3300123456)">
      <div id="license-gov-result" class="gov-verification-card" hidden></div>
      <small>Tra cứu ngầm trên dangkykinhdoanh.gov.vn. Mã băm SHA-256 sẽ ghi on-chain.</small>
    </div>
    ${field('foodSafetyNum','Số chứng nhận ATTP','text','maxlength="128" placeholder="VD: 01/2024/ATTP-HUE"','Nhập số trên giấy chứng nhận ATTP.')}
  </div>
  <div class="field-row">${field('businessExpiry','Ngày hết hạn giấy phép KD','date','')}${field('foodExpiry','Ngày hết hạn chứng nhận ATTP','date','')}</div>
  <div class="field-row">${field('businessPublicURL','URL giấy phép công khai (tùy chọn)','url','placeholder="https://..."','Đường dẫn bản scan đã che thông tin cá nhân.')}${field('foodPublicURL','URL ATTP công khai (tùy chọn)','url','placeholder="https://..."','Đường dẫn bản scan ATTP đã che thông tin.')}</div>
  <label class="label-row micro"><input type="checkbox" required style="width:auto" name="consent"> Tôi xác nhận thông tin giấy tờ là thật, còn hiệu lực; hiểu rằng số liệu và SHA-256 không thể xóa khỏi blockchain.</label>
  <div class="file-note">Số giấy phép sẽ được mã hóa SHA-256 ngay trên trình duyệt trước khi gửi lên on-chain. Bản gốc giấy tờ cần nộp cho quản trị viên theo kênh riêng để xác minh.</div>
  <button type="submit" class="btn btn-primary submit">Gửi hồ sơ, ký qua MetaMask ↗</button></form></div>
  <div class="panel" style="margin-top:20px"><h3>02 · Đăng ký lô hàng</h3><p>${sellerValid(state.seller)?'Cơ sở đã được duyệt và giấy tờ còn hiệu lực. Có thể nộp lô mới.':'Chỉ được nộp khi trạng thái cơ sở là Đã duyệt và đủ giấy tờ còn hạn.'}</p>
  <form id="lot-form">${field('batchCode','Mã lô duy nhất','text','maxlength="64" placeholder="HL-MEXUNG-2026-001"')}${field('productName','Tên sản phẩm','text','maxlength="128" placeholder="Mè xửng truyền thống"')}
  <div class="field"><label for="description">Mô tả sản phẩm</label><textarea name="description" id="description" maxlength="1200" required placeholder="Thành phần, quy cách, hạn sử dụng, hướng dẫn bảo quản..."></textarea></div>
  ${field('origin','Nơi sản xuất','text','maxlength="160" placeholder="Huế, Việt Nam"')}
  ${field('imageURL','Ảnh sản phẩm (URL https)','url','placeholder="https://..."','Nếu chưa có ảnh, để trống.')}
  <div class="field-row">${field('priceVND','Giá niêm yết (VND)','number','min="1000" step="1000" placeholder="75000"')}${field('priceETH','Giá thử trên Sepolia (ETH)','number','min="0.000001" step="any" placeholder="0.001"')}</div><div class="field-row">${field('stock','Số lượng tồn kho','number','min="1" max="4294967295" step="1"')}</div>
  <button type="submit" class="btn btn-primary submit" ${sellerValid(state.seller)?'':'disabled'}>Gửi lô chờ quản trị duyệt ↗</button></form></div></div>
  <aside><div class="panel"><h3>Hồ sơ đã ghi nhận</h3>${s.status===0?note('Ví chưa có hồ sơ. Điền biểu mẫu để bắt đầu.'):`<div class="side-list"><div class="side-line"><span>Doanh nghiệp</span><b>${h(s.businessName)}</b></div><div class="side-line"><span>Trạng thái</span><b>${h(REVIEW[s.status])}</b></div><div class="side-line"><span>Địa điểm</span><b>${h(s.location)}</b></div></div>${publicDoc(s)}`}</div><div class="panel" style="margin-top:20px"><h3>Lô hàng của cơ sở</h3>${state.ownedLots.length?state.ownedLots.filter(l=>!isOwner()||l.seller.toLowerCase()===state.account.toLowerCase()).map(l=>`<div class="review-row"><h4>${h(l.productName)}</h4><p>${h(l.batchCode)} · ${vnd(l.priceVND)} đ · Còn ${l.stock}</p>${tag(REVIEW[l.status],l.status===3?'red':'orange')}${l.status===2?`<div class="review-actions"><button class="btn btn-light btn-small" data-action="stock" data-id="${l.id}">Bổ sung tồn kho</button></div>`:''}</div>`).join(''):'<p class="muted">Chưa có lô nào trong phạm vi đang tải.</p>'}</div></aside></div>`;
}

// Giao dien quan tri: Duyet ho so co so va duyet tung lo hang on-chain
function adminContent(){
  if(!state.account)return title('QUẢN TRỊ','Duyệt hồ sơ và lô hàng','Kết nối ví admin trước khi truy cập.')+note('Vui lòng kết nối ví quản trị viên để thực hiện phê duyệt on-chain.');
  if(!isOwner())return title('QUẢN TRỊ','Không có quyền duyệt','Chỉ địa chỉ chủ sở hữu của hợp đồng Marketplace ('+short(DEFAULT_ADMIN)+') mới có thể duyệt hồ sơ.')+note('Quyền quản trị được xác thực bởi smart contract, không phụ thuộc nút trên giao diện. Ví hiện tại ('+short(state.account)+') chỉ có quyền gửi hồ sơ người bán hoặc đặt mua.','bad');
  const pendingS=state.waitingSellers.map(s=>`<article class="review-row"><header><h4>${h(s.businessName)}</h4>${tag('CHỜ DUYỆT','orange')}</header><p>${h(s.location)} · Ví <span class="code">${h(s.wallet)}</span></p>${publicDoc(s)}<label class="micro"><input type="checkbox" data-audit-wallet="${h(s.wallet)}"> Tôi đã kiểm tra tính hợp lệ, chủ thể và thời hạn của cả hai giấy tờ gốc.</label><div class="review-actions"><button class="btn btn-primary btn-small" data-action="approve-seller" data-wallet="${h(s.wallet)}">Duyệt cơ sở</button><button class="btn btn-danger btn-small" data-action="reject-seller" data-wallet="${h(s.wallet)}">Từ chối</button></div></article>`).join('');
  const pendingL=state.waitingLots.map(l=>`<article class="review-row"><header><h4>${h(l.productName)}</h4>${tag('CHỜ DUYỆT','orange')}</header><p>Mã ${h(l.batchCode)} · Cơ sở <span class="code">${h(short(l.seller))}</span> · ${vnd(l.priceVND)} đ · ${fmt(l.priceWei)} ETH thử · Tồn ${l.stock}</p><p>${h(l.description)}</p><label class="micro audit-check"><input type="checkbox" data-audit-lot="${l.id}"> Tôi đã đối chiếu lô, thông tin sản phẩm, giá và cơ sở bán với hồ sơ thực tế.</label><div class="review-actions"><button class="btn btn-primary btn-small" data-action="approve-lot" data-id="${l.id}">Duyệt lô</button><button class="btn btn-danger btn-small" data-action="reject-lot" data-id="${l.id}">Từ chối</button></div></article>`).join('');
  return title('BẢNG DUYỆT ON-CHAIN','Quản trị gian hàng','Việc duyệt người bán và duyệt lô là hai giao dịch độc lập. Tất cả đều cần MetaMask ký.',`<button class="btn btn-light" data-action="refresh">Làm mới ↻</button>`)+
  note('LƯU Ý: Mã băm SHA-256 không chứng minh giấy phép hợp lệ. Quản trị viên phải đối chiếu bản gốc và cơ quan cấp trước khi bấm Duyệt.')+
  `<div class="two-col"><div class="panel"><h3>01 · Hồ sơ cơ sở chờ duyệt (${state.waitingSellers.length})</h3>${pendingS||'<p>Không có hồ sơ chờ duyệt trong 40 hồ sơ mới nhất.</p>'}</div><div class="panel"><h3>02 · Lô hàng chờ duyệt (${state.waitingLots.length})</h3>${pendingL||'<p>Không có lô chờ duyệt trong 50 lô mới nhất.</p>'}</div></div><p class="micro">Bảng duyệt MVP tải tối đa 40 hồ sơ và 50 lô mới nhất. Cần bộ indexer khi mở rộng quy mô.</p>`;
}

// Trang hop nhat Ban hang & Quan tri kem thanh chuyen doi chuc nang
function managePage(){
  const isAdm = state.manageMode === 'admin';
  const toggleBar = `
    <div class="manage-toggle-bar">
      <div class="manage-switch">
        <button type="button" class="btn-toggle ${!isAdm?'active':''}" data-action="toggle-manage" data-mode="seller">🏭 Kênh Người bán (Cơ sở & Lô hàng)</button>
        <button type="button" class="btn-toggle ${isAdm?'active':''}" data-action="toggle-manage" data-mode="admin">🛡️ Kênh Quản trị viên (Duyệt on-chain)</button>
      </div>
      <div class="role-badge">
        ${isOwner() ? '<span class="tag">✓ Ví Quản trị viên (' + short(DEFAULT_ADMIN) + ')</span>' : '<span class="tag orange">Ví cơ sở / Thành viên</span>'}
      </div>
    </div>
  `;
  return toggleBar + (isAdm ? adminContent() : sellerContent());
}

// Tuong thich nguoc cho cac loi goi cu
function sellerPage(){
  state.manageMode = 'seller';
  return managePage();
}
function adminPage(){
  state.manageMode = 'admin';
  return managePage();
}

function ordersPage(){
  if(!state.account)return title('ĐƠN HÀNG','Theo dõi giao dịch','Kết nối MetaMask để xem lịch sử mua hàng và đơn của cơ sở.')+note('Khách mua không cần vai trò đăng ký nhưng cần ví MetaMask để thử mua bằng Sepolia ETH.');
  const rows=state.orders.map(o=>{const isBuyer=o.buyer.toLowerCase()===state.account.toLowerCase();return `<tr><td><strong>#${o.id}</strong><small style="display:block">Lô #${o.lotId}</small></td><td>${isBuyer?'Người mua':'Cơ sở bán'}</td><td>${o.quantity}</td><td>${fmt(o.amountWei)} ETH</td><td>${tag(ORDER_STATUS[o.status],o.status===5?'red':'orange')}</td><td><div class="review-actions">${isBuyer&&o.status===1?`<button class="btn btn-light btn-small" data-action="cancel" data-id="${o.id}">Hủy & hoàn tiền</button>`:''}${isBuyer&&o.status===2?`<button class="btn btn-primary btn-small" data-action="received" data-id="${o.id}">Xác nhận nhận hàng</button><button class="btn btn-danger btn-small" data-action="dispute" data-id="${o.id}">Tranh chấp</button>`:''}${!isBuyer&&o.status===1?`<button class="btn btn-light btn-small" data-action="ship" data-id="${o.id}">Đánh dấu đã gửi</button>`:''}${isOwner()&&o.status===5?`<button class="btn btn-light btn-small" data-action="resolve-refund" data-id="${o.id}">Hoàn tiền</button><button class="btn btn-light btn-small" data-action="resolve-pay" data-id="${o.id}">Trả người bán</button>`:''}</div></td></tr>`}).join('');
  return title('GIAO DỊCH TESTNET','Đơn hàng của ví','ETH được giữ trong hợp đồng khi đặt mua, chỉ giải ngân khi người mua xác nhận nhận hàng hoặc admin xử lý tranh chấp.')+
  `<div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Đơn / Lô</th><th>Vai trò</th><th>Số lượng</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Chưa có đơn hàng thuộc ví này trong 25 đơn gần nhất của mỗi phía.</td></tr>'}</tbody></table></div></div>`+note('Hệ thống này chưa lưu địa chỉ giao hàng hoặc thông tin liên hệ cá nhân. Đừng sử dụng để xử lý đơn hàng thực tế trước khi bổ sung backend đơn hàng riêng tư.');
}

function render(){
  document.querySelectorAll('[data-tab]').forEach(b=>{
    const tabName = b.dataset.tab;
    const isActive = (tabName === state.tab) || (state.tab === 'manage' && (tabName === 'seller' || tabName === 'admin'));
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  });
  $('#connect').textContent=state.account?short(state.account):'Kết nối MetaMask';
  const selected=state.tab==='shop'&&state.selected;
  content.innerHTML=selected ? detail() : (state.tab==='manage'||state.tab==='seller'||state.tab==='admin') ? managePage() : state.tab==='orders' ? ordersPage() : shop();
  if(state.lastTx){const node=document.createElement('div');node.className='notice good';node.innerHTML=`Giao dịch gần nhất đã xác nhận: ${txExplorer(state.lastTx)}`;content.prepend(node);}
  if((state.tab==='manage'||state.tab==='seller') && state.manageMode==='seller' && state.account) initSellerFeatures();
}

// Danh muc goi y dia chi dac san Hue tich hop san
const HUE_PRESET_ADDRESSES = [
  { primary: "20 Chi Lăng, Phường Phú Cát", secondary: "Thành phố Huế, Thừa Thiên Huế (Làng nghề mè xửng)" },
  { primary: "Làng nghề nón bài thơ Tây Hồ", secondary: "Xã Phú Hồ, Huyện Phú Vang, Thừa Thiên Huế" },
  { primary: "Làng hương Thủy Xuân, Đường Huyền Trân Công Chúa", secondary: "Phường Thủy Xuân, Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Làng đúc đồng Phường Đúc", secondary: "Đường Bùi Thị Xuân, Phường Phường Đúc, Thành phố Huế" },
  { primary: "Làng gốm cổ Phước Tích", secondary: "Xã Phong Hòa, Huyện Phong Điền, Thừa Thiên Huế" },
  { primary: "Làng hoa giấy Thanh Tiên", secondary: "Xã Phú Mậu, Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Làng mây tre đan Bao La", secondary: "Xã Quảng Phú, Huyện Quảng Điền, Thừa Thiên Huế" },
  { primary: "Làng bún Vân Cù", secondary: "Xã Hương Toàn, Thị xã Hương Trà, Thừa Thiên Huế" },
  { primary: "Cơ sở tôm chua Trọng Đức", secondary: "Phường An Cựu, Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Phường Phú Hòa", secondary: "Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Phường Vĩnh Ninh", secondary: "Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Phường Kim Long", secondary: "Thành phố Huế, Thừa Thiên Huế (Đặc sản bánh ướt thịt nướng)" },
  { primary: "Đường Lê Lợi", secondary: "Phường Vĩnh Ninh, Thành phố Huế, Thừa Thiên Huế" },
  { primary: "Đường Trần Hưng Đạo", secondary: "Phường Phú Hòa, Thành phố Huế, Thừa Thiên Huế" }
];

let locDebounceTimer = null;
let licDebounceTimer = null;

function initSellerFeatures(){
  const locInput = $('#location');
  const locBox = $('#location-suggestions');
  const licInput = $('#businessLicenseNum');
  const licCard = $('#license-gov-result');

  // 1. Goi y dia chi thong minh giong Google Maps
  if(locInput && locBox){
    const renderSuggestions = (items) => {
      if(!items || !items.length){ locBox.hidden = true; locBox.innerHTML = ''; return; }
      locBox.innerHTML = items.map((it, idx) => `
        <button type="button" class="address-item" data-idx="${idx}" data-full="${h(it.primary + (it.secondary ? ', ' + it.secondary : ''))}">
          <span class="address-icon">📍</span>
          <div class="address-text">
            <span class="address-primary">${h(it.primary)}</span>
            <span class="address-secondary">${h(it.secondary || '')}</span>
          </div>
        </button>
      `).join('');
      locBox.hidden = false;
    };

    locInput.addEventListener('input', () => {
      clearTimeout(locDebounceTimer);
      const q = locInput.value.trim();
      if(!q || q.length < 2){ locBox.hidden = true; return; }

      locDebounceTimer = setTimeout(async () => {
        const qNorm = q.toLowerCase();
        const matchedPresets = HUE_PRESET_ADDRESSES.filter(it => 
          it.primary.toLowerCase().includes(qNorm) || (it.secondary && it.secondary.toLowerCase().includes(qNorm))
        );

        try {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q + ' Vietnam')}&limit=5`);
          if(res.ok){
            const json = await res.json();
            const photonItems = (json.features || []).map(f => {
              const p = f.properties || {};
              const parts = [p.district, p.city || p.locality, p.state].filter(Boolean);
              return {
                primary: [p.housenumber, p.street, p.name].filter(Boolean).join(' ') || p.name || q,
                secondary: parts.join(', ') + (p.country ? ', ' + p.country : '')
              };
            });
            renderSuggestions([...matchedPresets, ...photonItems].slice(0, 7));
            return;
          }
        } catch(e) {}
        renderSuggestions(matchedPresets.slice(0, 6));
      }, 250);
    });

    locBox.addEventListener('click', e => {
      const btn = e.target.closest('.address-item');
      if(!btn) return;
      locInput.value = btn.dataset.full;
      locBox.hidden = true;
    });

    document.addEventListener('click', e => {
      if(!e.target.closest('.address-field-wrap')) locBox.hidden = true;
    });
  }

  // 2. Tra cuu ngam giay phep kinh doanh tren dangkykinhdoanh.gov.vn
  if(licInput && licCard){
    licInput.addEventListener('input', () => {
      clearTimeout(licDebounceTimer);
      const raw = licInput.value.trim().replace(/[^0-9]/g, '');
      if(!raw || raw.length < 8){
        licCard.hidden = true;
        return;
      }

      licCard.hidden = false;
      licCard.className = 'gov-verification-card checking';
      licCard.innerHTML = `
        <span class="gov-badge">⏳ Đang đối soát thông tin trên Cổng Đăng ký kinh doanh Quốc gia...</span>
        <span class="gov-details">Kiểm tra thông tin pháp lý từ dangkykinhdoanh.gov.vn với mã số ${h(raw)}</span>
      `;

      licDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/lookup-business?code=${encodeURIComponent(raw)}`);
          if(res.ok){
            const resJson = await res.json();
            if(resJson.ok && resJson.verified && resJson.data){
              const b = resJson.data;
              licCard.className = 'gov-verification-card';
              licCard.innerHTML = `
                <span class="gov-badge">✓ Cổng Đăng ký kinh doanh Quốc gia (dangkykinhdoanh.gov.vn) xác thực</span>
                <span class="gov-details">
                  <strong>${h(b.name || 'Cơ sở đã được cấp phép')}</strong><br>
                  Trạng thái: <strong>${h(b.status || 'Đang hoạt động')}</strong><br>
                  ${b.address ? `Địa chỉ đăng ký: ${h(b.address)}` : ''}
                </span>
                <button type="button" class="gov-apply-btn" id="btn-auto-apply">⚡ Tự động điền Tên & Địa chỉ vào biểu mẫu</button>
              `;

              const nameInput = $('#businessName');
              if(nameInput && !nameInput.value.trim() && b.name) nameInput.value = b.name;
              if(locInput && !locInput.value.trim() && b.address) locInput.value = b.address;

              const applyBtn = $('#btn-auto-apply');
              if(applyBtn){
                applyBtn.addEventListener('click', () => {
                  if(nameInput && b.name) nameInput.value = b.name;
                  if(locInput && b.address) locInput.value = b.address;
                  toast('Đã cập nhật Tên và Địa chỉ cơ sở từ dữ liệu ĐKKD Quốc gia!', 'success');
                });
              }
              return;
            }
          }
        } catch(err) {}

        licCard.className = 'gov-verification-card notfound';
        licCard.innerHTML = `
          <span class="gov-badge">🏛️ Cổng Quốc gia dangkykinhdoanh.gov.vn</span>
          <span class="gov-details">Đã ghi nhận mã số ${h(raw)}. Mã băm SHA-256 sẽ được ghi on-chain; quản trị viên sẽ đối chiếu bản gốc giấy phép khi phê duyệt.</span>
        `;
      }, 450);
    });
  }
}

async function digestText(text){
  const trimmed=String(text||'').trim();
  if(!trimmed)throw Error('Số giấy phép không được để trống.');
  if(trimmed.length>128)throw Error('Số giấy phép quá dài (tối đa 128 ký tự).');
  const bytes=new TextEncoder().encode(trimmed);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return '0x'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}

async function submitSeller(form){
  const d=new FormData(form);if(!d.get('consent'))throw Error('Phải xác nhận cam kết hồ sơ.');
  // Hash so giay phep kinh doanh va chung nhan an toan thuc pham
  const licNum = d.get('businessLicenseNum') || d.get('businessLicense');
  const foodNum = d.get('foodSafetyNum') || d.get('foodSafety');
  const a=await digestText(licNum);
  const b=await digestText(foodNum);
  const expiry=s=>{if(s==='businessExpiry'&&!d.get(s))return 0;const ms=Date.parse(String(d.get(s))+'T23:59:59+07:00');if(!Number.isFinite(ms)||ms<Date.now())throw Error('Ngày hết hạn phải ở tương lai.');return Math.floor(ms/1000);};
  const bu=urlOk(d.get('businessPublicURL')||''),fu=urlOk(d.get('foodPublicURL')||'');
  if(d.get('businessPublicURL')&&!bu||d.get('foodPublicURL')&&!fu)throw Error('URL phải là HTTPS và không chứa mật khẩu.');
  await transact('Gửi hồ sơ cơ sở',()=>state.contract.submitSeller(String(d.get('businessName')).trim(),String(d.get('location')).trim(),a,b,expiry('businessExpiry'),expiry('foodExpiry'),bu,fu));
}

async function submitLot(form){
  if(!sellerValid(state.seller))throw Error('Cơ sở chưa được duyệt hoặc giấy tờ đã hết hạn.');
  const d=new FormData(form),image=String(d.get('imageURL')||'').trim();
  if(image&&!urlOk(image))throw Error('URL hình ảnh phải dùng HTTPS.');
  needContract();const ethers=state.ethers||await loadEthers();
  const price=ethers.parseEther(String(d.get('priceETH'))),priceVND=BigInt(String(d.get('priceVND'))),qty=Number(d.get('stock')); 
  if(price<=0n||priceVND<=0n||!Number.isInteger(qty)||qty<1||qty>4294967295)throw Error('Giá hoặc số lượng không hợp lệ.');
  await transact('Đăng ký lô hàng',()=>state.contract.submitLot(String(d.get('batchCode')).trim(),String(d.get('productName')).trim(),String(d.get('description')).trim(),String(d.get('origin')).trim(),image,priceVND,price,qty));
}

async function handleAction(button){
  const action=button.dataset.action,id=Number(button.dataset.id),wallet=button.dataset.wallet;
  if(action==='toggle-manage'){
    state.manageMode = button.dataset.mode === 'admin' ? 'admin' : 'seller';
    render();
    return;
  }
  if(action==='refresh'){await refreshProducts();if(state.contract){await loadWalletData();await loadOrders();}render();return;}
  if(action==='back'){state.selected=null;render();return;}
  if(action==='detail'){state.selected=state.products.find(p=>p.id===id);render();return;}
  if(action==='prev-page'||action==='next-page'){state.page+=action==='next-page'?1:-1;state.page=Math.max(0,state.page);await refreshProducts();render();return;}
  if(action==='buy'){
    const p=state.selected,qty=Number($('#qty')?.value);
    if(!p||state.demo)throw Error('Chưa thể mua khi sản phẩm chưa được duyệt on-chain.');
    if(!Number.isInteger(qty)||qty<=0||qty>p.stock)throw Error('Số lượng không hợp lệ.');
    const total=BigInt(p.priceWei)*BigInt(qty);
    if(!window.confirm(`Bạn sắp đặt ${qty} sản phẩm với ${fmt(total)} ETH Sepolia. Đây là tiền thử nghiệm; chưa có hệ thống giao hàng thật. Đồng ý?`))return;
    await transact('Đặt hàng & ký quỹ',()=>state.contract.placeOrder(p.id,qty,{value:total}),false);return;
  }
  if(action==='approve-seller'){
    if(!$(`[data-audit-wallet="${wallet}"]`)?.checked)throw Error('Cần xác nhận đã kiểm tra cả hai giấy tờ gốc.');
    return transact('Duyệt cơ sở',()=>state.contract.reviewSeller(wallet,true,'Kiem tra ho so thu cong'));
  }
  if(action==='reject-seller'||action==='reject-lot'){
    const reason=prompt('Nhập lý do từ chối (bắt buộc):');if(!reason?.trim())return;
    return action==='reject-seller'?transact('Từ chối cơ sở',()=>state.contract.reviewSeller(wallet,false,reason.trim())):transact('Từ chối lô',()=>state.contract.reviewLot(id,false,reason.trim()));
  }
  if(action==='approve-lot'){
    if(!$(`[data-audit-lot="${id}"]`)?.checked)throw Error('Cần xác nhận đã đối chiếu lô và thông tin sản phẩm thực tế.');
    return transact('Duyệt lô',()=>state.contract.reviewLot(id,true,'Da doi chieu thong tin lo'));
  }
  if(action==='stock'){
    const str=prompt('Nhập tổng tồn kho mới (không nhỏ hơn tồn hiện tại):');
    if(str===null)return;
    const qty=Number(str);if(!Number.isInteger(qty)||qty<1||qty>4294967295)throw Error('Tồn kho không hợp lệ.');
    return transact('Bổ sung tồn kho',()=>state.contract.updateStock(id,qty));
  }
  if(action==='cancel')return transact('Hủy đơn & hoàn ETH',()=>state.contract.cancelBeforeShipping(id));
  if(action==='received')return transact('Xác nhận đã nhận hàng',()=>state.contract.confirmReceived(id));
  if(action==='dispute')return transact('Mở tranh chấp',()=>state.contract.disputeOrder(id));
  if(action==='ship'){
    const ref=prompt('Nhập mã vận chuyển/bằng chứng bàn giao (chỉ băm SHA-256 on-chain):');
    if(!ref?.trim())return;
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ref.trim()));
    const hex='0x'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
    return transact('Đánh dấu đã gửi hàng',()=>state.contract.markShipped(id,hex));
  }
  if(action==='resolve-refund'||action==='resolve-pay')return transact('Giải quyết tranh chấp',()=>state.contract.resolveDispute(id,action==='resolve-refund'));
}

document.addEventListener('click',async e=>{
  const tab=e.target.closest('[data-tab]');
  if(tab){
    state.tab=tab.dataset.tab;
    if(state.tab==='seller'){ state.tab='manage'; state.manageMode='seller'; }
    if(state.tab==='admin'){ state.tab='manage'; state.manageMode='admin'; }
    state.selected=null;
    render();
    return;
  }
  const button=e.target.closest('[data-action]');if(!button||state.busy)return;
  try{await handleAction(button);}catch(error){toast(errorText(error));}
});

document.addEventListener('submit',async e=>{
  if(!['seller-form','lot-form'].includes(e.target.id))return;
  e.preventDefault();
  if(state.busy)return;
  try{await (e.target.id==='seller-form'?submitSeller(e.target):submitLot(e.target));}
  catch(error){toast(errorText(error));}
});

document.addEventListener('input',e=>{if(e.target.id==='product-search'){state.q=e.target.value;
  const el=document.activeElement;const cursor=el.selectionStart;render();
  $('#product-search')?.focus();try{$('#product-search')?.setSelectionRange(cursor,cursor);}catch{}}
});

$('#connect').addEventListener('click',connect);

if(window.ethereum?.on){
  window.ethereum.on('accountsChanged',()=>{state.account=null;state.contract=null;state.owner=null;state.selected=null;toast('Ví đã thay đổi. Kết nối lại để tiếp tục.');render();});
  window.ethereum.on('chainChanged',()=>{state.account=null;state.contract=null;state.owner=null;toast('Mạng ví đã thay đổi. Kết nối lại MetaMask.');render();});
}

await loadConfig();
try{await refreshProducts();}catch(e){toast(errorText(e));state.products=[];}
render();
