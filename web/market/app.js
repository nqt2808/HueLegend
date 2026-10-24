import { MARKET_ABI, REVIEW, ORDER_STATUS, CHAIN_ID } from './abi.js';
import { loadEthers } from '../js/lib/libraries.js';

const $ = s => document.querySelector(s);
const content = $('#content-section');
const state = {
  tab:'shop', config:null, account:null, provider:null, contract:null, ethers:null,
  owner:null, seller:null, products:[], ownedLots:[], waitingSellers:[], waitingLots:[], orders:[],
  busy:false, page:0, selected:null, q:'', demo:false, lastTx:null
};
// Dia chi vi cho cac vai tro
const ROLE_WALLETS = {
  admin: '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c',
  seller: '0x325650E804c62297EE9c830Dc79468007Ae3F295',
  buyer: '0x0B210F788fe573194E290026Fda73565ED2ffb1b'
};
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
function isOwner(){return state.account && state.owner && state.account.toLowerCase()===state.owner.toLowerCase();}
function needContract(){if(!state.config?.configured)throw Error('Marketplace chua duoc trien khai. Cau hinh HUELEGEND_MARKET_ADDRESS tren Vercel truoc.');if(!state.contract)throw Error('Ket noi MetaMask de thuc hien giao dich.');}
function sellerValid(s){return s?.status===2 && (s.businessLicenseExpires===0||s.businessLicenseExpires>Date.now()/1000) && s.foodSafetyExpires>Date.now()/1000;}
function toSeller(x,wallet){return {wallet,businessName:x.businessName,location:x.location,businessLicenseSHA256:x.businessLicenseSHA256,foodSafetySHA256:x.foodSafetySHA256,businessLicenseExpires:Number(x.businessLicenseExpires),foodSafetyExpires:Number(x.foodSafetyExpires),publicBusinessLicenseURL:x.publicBusinessLicenseURL,publicFoodSafetyURL:x.publicFoodSafetyURL,status:Number(x.status)};}
function toLot(x){return {id:Number(x.id),seller:x.seller,batchCode:x.batchCode,productName:x.productName,description:x.description,origin:x.origin,imageURL:x.imageURL,priceVND:x.priceVND.toString(),priceWei:x.priceWei.toString(),stock:Number(x.stock),sold:Number(x.sold),status:Number(x.status)};}
function toOrder(x){return {id:Number(x.id),lotId:Number(x.lotId),buyer:x.buyer,seller:x.seller,quantity:Number(x.quantity),amountWei:x.amountWei.toString(),status:Number(x.status),placedAt:Number(x.placedAt),shipmentReferenceSHA256:x.shipmentReferenceSHA256};}
const demoProducts=[
  {id:1,batchCode:'HL-MEXUNG-DEMO',productName:'Mè xửng truyền thống',origin:'TP. Huế',description:'Mè xửng thơm bùi, chế biến theo công thức gia truyền. Sản phẩm minh họa.',priceVND:'75000',priceWei:'1800000000000000',stock:38,sold:8,status:2,seller:'0x0000000000000000000000000000000000000001',business:{businessName:'Cơ sở Đặc sản Cố Đô',location:'TP. Huế',businessLicenseSHA256:'0x'+'a'.repeat(64),foodSafetySHA256:'0x'+'b'.repeat(64),businessLicenseExpires:1999999999,foodSafetyExpires:1999999999,status:2}},
  {id:2,batchCode:'HL-TRACUNGDINH-DEMO',productName:'Trà cung đình Huế',origin:'TP. Huế',description:'Trà thảo mộc từ tinh hoa hương vị vùng đất cố đô. Sản phẩm minh họa.',priceVND:'120000',priceWei:'2500000000000000',stock:14,sold:12,status:2,seller:'0x0000000000000000000000000000000000000002',business:{businessName:'Trà Cung Đình',location:'TP. Huế',businessLicenseSHA256:'0x'+'c'.repeat(64),foodSafetySHA256:'0x'+'d'.repeat(64),businessLicenseExpires:1999999999,foodSafetyExpires:1999999999,status:2}},
  {id:3,batchCode:'HL-TOMCHUA-DEMO',productName:'Tôm chua xứ Huế',origin:'TP. Huế',description:'Món ngon mang hương vị truyền thống miền Trung. Sản phẩm minh họa.',priceVND:'95000',priceWei:'3200000000000000',stock:9,sold:4,status:2,seller:'0x0000000000000000000000000000000000000003',business:{businessName:'Hương Quê',location:'TP. Huế',businessLicenseSHA256:'0x'+'e'.repeat(64),foodSafetySHA256:'0x'+'f'.repeat(64),businessLicenseExpires:1999999999,foodSafetyExpires:1999999999,status:2}}
];
async function loadConfig(){
  try{const r=await fetch('/api/market-config',{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const c=await r.json();state.config=c;}
  catch(e){state.config={configured:false};toast('Không đọc được cấu hình Marketplace: '+e.message);}
  state.demo=!state.config.configured;
  setNotice(state.demo?'CHẾ ĐỘ XEM THỬ: Chưa triển khai hợp đồng Marketplace. Thẻ sản phẩm phía dưới là DỮ LIỆU MẪU, không thể mua.':
    'SEPOLIA TESTNET: Mọi đơn hàng dùng ETH thử nghiệm; giấy tờ chỉ có mã băm và bản công khai đã che thông tin.',state.demo?'':'good');
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
    // Kiểm tra ví khớp vai trò
    let expected=null;
    switch(state.tab){
      case 'admin': expected = ROLE_WALLETS.admin; break;
      case 'seller': expected = ROLE_WALLETS.seller; break;
      case 'orders': expected = ROLE_WALLETS.buyer; break;
      default: expected = null;
    }
    if(expected && state.account.toLowerCase()!==expected.toLowerCase()){
      toast('Ví không khớp với vai trò đã chọn. Vui lòng chuyển sang ví đúng và kết nối lại.');
      state.account=null;
      setBusy(false);
      render();
      return;
    }
    // Kiểm tra số dư tối thiểu (0.005 ETH)
    const bal = await provider.getBalance(state.account);
    if(bal < ethers.parseEther('0.005')){
      toast('Số dư ví quá thấp (<0.005 ETH). Vui lòng nạp thêm để thực hiện giao dịch.');
    }
    if(state.config?.configured)state.contract=new ethers.Contract(state.config.contractAddress,MARKET_ABI,signer);
    if(state.contract){await loadWalletData();await loadOrders();}
    toast('Đã kết nối ví '+short(state.account));
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
  (state.demo?note('<strong>DỮ LIỆU MẪU</strong> – Các thẻ minh họa giao diện; chưa có giao dịch hoặc giấy phép được xác minh thật.'):'')+
  (items.length?`<div class="cards">${items.map(p=>`<article class="card"><div class="card-media">${photo(p)}${tag(state.demo?'DEMO · Chưa xác thực':'✓ Đã duyệt')}</div><div class="card-body"><span class="small-label">${h(p.origin)} · Mã ${h(p.batchCode)}</span><h3>${h(p.productName)}</h3><p>${h(p.description)}</p><span class="micro">Cơ sở: ${h(p.business?.businessName||short(p.seller))} · Còn ${p.stock} sản phẩm</span><div class="card-foot"><div class="price">${vnd(p.priceVND)} <small>₫</small></div><button class="btn btn-primary btn-small" data-action="detail" data-id="${p.id}">Chi tiết ↗</button></div></div></article>`).join('')}</div>`:`<div class="empty"><strong>Chưa có lô được duyệt phù hợp.</strong>Hệ thống sẽ tự hiển thị sản phẩm khi hai lớp duyệt đã hoàn tất.</div>`)+
  (state.demo?'':`<div class="label-row"><button class="btn btn-light" data-action="prev-page" ${state.page===0?'disabled':''}>← Trước</button><span class="micro">Trang ${state.page+1}</span><button class="btn btn-light" data-action="next-page" ${state.products.length<9?'disabled':''}>Sau →</button></div>`);
}
function publicDoc(s){
  const license=urlOk(s.publicBusinessLicenseURL),food=urlOk(s.publicFoodSafetyURL);
  return `<div class="side-list"><div class="side-line"><span>Giấy phép kinh doanh</span><b>${s.businessLicenseSHA256?'Đã ghi SHA-256':'Chưa có'} · hết hạn ${stamp(s.businessLicenseExpires)}</b></div><div class="side-line"><span>Giấy ATTP</span><b>${s.foodSafetySHA256?'Đã ghi SHA-256':'Chưa có'} · hết hạn ${stamp(s.foodSafetyExpires)}</b></div></div><div class="doc-links">${license?`<a href="${h(license)}" rel="noopener noreferrer" target="_blank">Xem bản giấy phép công khai ↗</a>`:''}${food?`<a href="${h(food)}" rel="noopener noreferrer" target="_blank">Xem chứng nhận ATTP công khai ↗</a>`:''}${!license&&!food?'<span class="micro">Không có bản công khai; chỉ lưu dấu vân tay SHA-256 on-chain.</span>':''}</div><details class="micro"><summary>Mã băm pháp lý on-chain</summary><p class="code">Giấy phép: ${h(s.businessLicenseSHA256)}</p><p class="code">ATTP: ${h(s.foodSafetySHA256)}</p><p>Blockchain chỉ chứng minh mã băm đã được ghi nhận, không tự xác minh giấy tờ thật/giả.</p></details>`;
}
function detail(){
  const p=state.selected;if(!p)return shop();
  return title('THÔNG TIN LÔ HÀNG',p.productName,`Mã lô ${p.batchCode} · ${p.origin}`,`<button class="btn btn-outline" data-action="back">← Gian hàng</button>`)+
  (state.demo?note('Đây là sản phẩm minh họa. Không thể mua khi chưa deploy smart contract.'):'')+
  `<div class="panel detail-box"><div><div class="detail-image">${photo(p)}</div><h3 style="margin-top:20px">${h(p.productName)}</h3><p class="muted">${h(p.description)}</p><div class="label-row">${tag(state.demo?'DEMO':'Đã duyệt')} ${tag('Còn '+p.stock+' sản phẩm','orange')}</div><a class="btn btn-light" href="./index.html?batch=${encodeURIComponent(p.batchCode)}#/trace">Tra cứu ProjectCore (nếu có) ↗</a></div><div><div class="kicker">GIÁ NIÊM YẾT</div><div class="price" style="font-size:32px;margin-bottom:24px">${vnd(p.priceVND)} VNĐ</div><p class="micro">Giá thanh toán demo: ${fmt(p.priceWei)} ETH Sepolia</p><h3>Hồ sơ cơ sở</h3><div class="side-list"><div class="side-line"><span>Doanh nghiệp</span><b>${h(p.business?.businessName)}</b></div><div class="side-line"><span>Địa chỉ</span><b>${h(p.business?.location)}</b></div><div class="side-line"><span>Ví cơ sở</span><b class="code">${h(short(p.seller))}</b></div></div>${publicDoc(p.business)}<div class="field"><label for="qty">Số lượng</label><input type="number" min="1" max="${p.stock}" value="1" id="qty"></div><button class="btn btn-primary submit" data-action="buy" ${state.demo?'disabled':''}>Mua bằng MetaMask (ETH thử) ↗</button><p class="micro">Thanh toán bằng ETH Sepolia mô phỏng ký quỹ trong hợp đồng. Chưa thu địa chỉ giao hàng hoặc xử lý thanh toán VNĐ; không đặt hàng thật trên bản thử nghiệm.</p></div></div>`;
}
function sellerPage(){
  if(!state.account)return title('DÀNH CHO CƠ SỞ','Đăng ký bán hàng','Kết nối MetaMask để nộp giấy phép và quản lý lô hàng.')+note('Chỉ những ví cơ sở được quản trị viên phê duyệt mới có thể nộp lô. Khách mua không cần đăng ký vai trò.');
  const s=state.seller||{status:0};
  return title('QUẢN LÝ NGƯỜI BÁN','Hồ sơ cơ sở & lô hàng','Hai bước kiểm duyệt: duyệt cơ sở trước, duyệt từng lô sau.',tag(REVIEW[s.status],s.status===2?'':s.status===3?'red':'orange'))+
  `<div class="two-col"><div><div class="panel"><h3>01 · Đăng ký / cập nhật hồ sơ</h3><p>Hai giấy tờ là bắt buộc. Chọn file để tạo SHA-256 ngay trên trình duyệt; file <strong>không tự tải lên máy chủ</strong>. Bản PDF phục vụ kiểm duyệt phải được cung cấp cho quản trị viên theo kênh riêng. Chỉ cung cấp đường dẫn bản công khai đã che thông tin nếu được phép.</p><form id="seller-form">
  ${field('businessName','Tên cơ sở / doanh nghiệp','text',`maxlength="128" value="${h(s.businessName||'')}"`)}
  ${field('location','Địa chỉ cơ sở','text',`maxlength="256" value="${h(s.location||'')}"`)}
  <div class="field-row">${field('businessLicense','Giấy phép kinh doanh (PDF/ảnh)','file','accept=".pdf,image/png,image/jpeg"')}${field('foodSafety','Chứng nhận an toàn thực phẩm (PDF/ảnh)','file','accept=".pdf,image/png,image/jpeg"')}</div>
  <div class="field-row">${field('businessExpiry','Ngày hết hạn giấy phép','date')}${field('foodExpiry','Ngày hết hạn chứng nhận ATTP','date')}</div>
  <div class="field-row">${field('businessPublicURL','URL bản công khai đã che thông tin','url','placeholder="https://..."','Không bắt buộc; nếu nhập sẽ công khai on-chain.')}${field('foodPublicURL','URL bản ATTP công khai đã che thông tin','url','placeholder="https://..."','Không bắt buộc; nếu nhập sẽ công khai on-chain.')}</div>
  <label class="label-row micro"><input type="checkbox" required style="width:auto" name="consent"> Tôi xác nhận hai giấy tờ là thật, còn hiệu lực; hiểu rằng URL công khai và SHA-256 không thể xóa khỏi blockchain.</label>
  <div class="file-note">Mỗi file tối đa 5 MB. Giấy phép kinh doanh không ghi ngày hết hạn có thể để trống ô ngày. Chỉ tính SHA-256 ở thiết bị; quản trị viên phải kiểm tra bản gốc qua kênh an toàn trước khi duyệt.</div>
  <button type="submit" class="btn btn-primary submit">Gửi hồ sơ, ký qua MetaMask ↗</button></form></div>
  <div class="panel" style="margin-top:20px"><h3>02 · Đăng ký lô hàng</h3><p>${sellerValid(s)?'Cơ sở đã được duyệt và giấy tờ còn hiệu lực. Có thể nộp lô mới.':'Chỉ được nộp khi trạng thái cơ sở là Đã duyệt và đủ giấy tờ còn hạn.'}</p>
  <form id="lot-form">${field('batchCode','Mã lô duy nhất','text','maxlength="64" placeholder="HL-MEXUNG-2026-001"')}${field('productName','Tên sản phẩm','text','maxlength="128" placeholder="Mè xửng truyền thống"')}
  <div class="field"><label for="description">Mô tả sản phẩm</label><textarea name="description" id="description" maxlength="1200" required placeholder="Thành phần, quy cách, hạn sử dụng, hướng dẫn bảo quản..."></textarea></div>
  ${field('origin','Nơi sản xuất','text','maxlength="160" placeholder="Huế, Việt Nam"')}
  ${field('imageURL','Ảnh sản phẩm (URL https)','url','placeholder="https://..."','Nếu chưa có ảnh, để trống.')}
  <div class="field-row">${field('priceVND','Giá niêm yết (VND)','number','min="1000" step="1000" placeholder="75000"')}${field('priceETH','Giá thử trên Sepolia (ETH)','number','min="0.000001" step="any" placeholder="0.001"')}</div><div class="field-row">${field('stock','Số lượng tồn kho','number','min="1" max="4294967295" step="1"')}</div>
  <button type="submit" class="btn btn-primary submit" ${sellerValid(s)?'':'disabled'}>Gửi lô chờ quản trị duyệt ↗</button></form></div></div>
  <aside><div class="panel"><h3>Hồ sơ đã ghi nhận</h3>${s.status===0?note('Ví chưa có hồ sơ. Điền biểu mẫu để bắt đầu.'):`<div class="side-list"><div class="side-line"><span>Doanh nghiệp</span><b>${h(s.businessName)}</b></div><div class="side-line"><span>Trạng thái</span><b>${h(REVIEW[s.status])}</b></div><div class="side-line"><span>Địa điểm</span><b>${h(s.location)}</b></div></div>${publicDoc(s)}`}</div><div class="panel" style="margin-top:20px"><h3>Lô hàng của cơ sở</h3>${state.ownedLots.length?state.ownedLots.filter(l=>!isOwner()||l.seller.toLowerCase()===state.account.toLowerCase()).map(l=>`<div class="review-row"><h4>${h(l.productName)}</h4><p>${h(l.batchCode)} · ${vnd(l.priceVND)} đ · Còn ${l.stock}</p>${tag(REVIEW[l.status],l.status===3?'red':'orange')}${l.status===2?`<div class="review-actions"><button class="btn btn-light btn-small" data-action="stock" data-id="${l.id}">Bổ sung tồn kho</button></div>`:''}</div>`).join(''):'<p class="muted">Chưa có lô nào trong phạm vi đang tải.</p>'}</div></aside></div>`;
}
function adminPage(){
  if(!state.account)return title('QUẢN TRỊ','Duyệt hồ sơ và lô hàng','Kết nối ví admin trước khi truy cập.');
  if(!isOwner())return title('QUẢN TRỊ','Không có quyền','Chỉ địa chỉ chủ sở hữu của hợp đồng Marketplace được duyệt hồ sơ.')+note('Quyền quản trị được xác thực bởi smart contract, không phụ thuộc nút trên giao diện.','bad');
  const pendingS=state.waitingSellers.map(s=>`<article class="review-row"><header><h4>${h(s.businessName)}</h4>${tag('CHỜ DUYỆT','orange')}</header><p>${h(s.location)} · Ví <span class="code">${h(s.wallet)}</span></p>${publicDoc(s)}<label class="micro"><input type="checkbox" data-audit-wallet="${h(s.wallet)}"> Tôi đã kiểm tra tính hợp lệ, chủ thể và thời hạn của cả hai giấy tờ gốc.</label><div class="review-actions"><button class="btn btn-primary btn-small" data-action="approve-seller" data-wallet="${h(s.wallet)}">Duyệt cơ sở</button><button class="btn btn-danger btn-small" data-action="reject-seller" data-wallet="${h(s.wallet)}">Từ chối</button></div></article>`).join('');
  const pendingL=state.waitingLots.map(l=>`<article class="review-row"><header><h4>${h(l.productName)}</h4>${tag('CHỜ DUYỆT','orange')}</header><p>Mã ${h(l.batchCode)} · Cơ sở <span class="code">${h(short(l.seller))}</span> · ${vnd(l.priceVND)} đ · ${fmt(l.priceWei)} ETH thử · Tồn ${l.stock}</p><p>${h(l.description)}</p><label class="micro audit-check"><input type="checkbox" data-audit-lot="${l.id}"> Tôi đã đối chiếu lô, thông tin sản phẩm, giá và cơ sở bán với hồ sơ thực tế.</label><div class="review-actions"><button class="btn btn-primary btn-small" data-action="approve-lot" data-id="${l.id}">Duyệt lô</button><button class="btn btn-danger btn-small" data-action="reject-lot" data-id="${l.id}">Từ chối</button></div></article>`).join('');
  return title('BẢNG DUYỆT ON-CHAIN','Quản trị gian hàng','Việc duyệt người bán và duyệt lô là hai giao dịch độc lập. Tất cả đều cần MetaMask ký.',`<button class="btn btn-light" data-action="refresh">Làm mới ↻</button>`)+
  note('LƯU Ý: Mã băm SHA-256 không chứng minh giấy phép hợp lệ. Quản trị viên phải đối chiếu bản gốc và cơ quan cấp trước khi bấm Duyệt.')+
  `<div class="two-col"><div class="panel"><h3>01 · Hồ sơ cơ sở chờ duyệt (${state.waitingSellers.length})</h3>${pendingS||'<p>Không có hồ sơ chờ duyệt trong 40 hồ sơ mới nhất.</p>'}</div><div class="panel"><h3>02 · Lô hàng chờ duyệt (${state.waitingLots.length})</h3>${pendingL||'<p>Không có lô chờ duyệt trong 50 lô mới nhất.</p>'}</div></div><p class="micro">Bảng duyệt MVP tải tối đa 40 hồ sơ và 50 lô mới nhất. Cần bộ indexer khi mở rộng quy mô.</p>`;
}
function ordersPage(){
  if(!state.account)return title('ĐƠN HÀNG','Theo dõi giao dịch','Kết nối MetaMask để xem lịch sử mua hàng và đơn của cơ sở.')+note('Khách mua không cần vai trò đăng ký nhưng cần ví MetaMask để thử mua bằng Sepolia ETH.');
  const rows=state.orders.map(o=>{const isBuyer=o.buyer.toLowerCase()===state.account.toLowerCase();return `<tr><td><strong>#${o.id}</strong><small style="display:block">Lô #${o.lotId}</small></td><td>${isBuyer?'Người mua':'Cơ sở bán'}</td><td>${o.quantity}</td><td>${fmt(o.amountWei)} ETH</td><td>${tag(ORDER_STATUS[o.status],o.status===5?'red':'orange')}</td><td><div class="review-actions">${isBuyer&&o.status===1?`<button class="btn btn-light btn-small" data-action="cancel" data-id="${o.id}">Hủy & hoàn tiền</button>`:''}${isBuyer&&o.status===2?`<button class="btn btn-primary btn-small" data-action="received" data-id="${o.id}">Xác nhận nhận hàng</button><button class="btn btn-danger btn-small" data-action="dispute" data-id="${o.id}">Tranh chấp</button>`:''}${!isBuyer&&o.status===1?`<button class="btn btn-light btn-small" data-action="ship" data-id="${o.id}">Đánh dấu đã gửi</button>`:''}${isOwner()&&o.status===5?`<button class="btn btn-light btn-small" data-action="resolve-refund" data-id="${o.id}">Hoàn tiền</button><button class="btn btn-light btn-small" data-action="resolve-pay" data-id="${o.id}">Trả người bán</button>`:''}</div></td></tr>`}).join('');
  return title('GIAO DỊCH TESTNET','Đơn hàng của ví','ETH được giữ trong hợp đồng khi đặt mua, chỉ giải ngân khi người mua xác nhận nhận hàng hoặc admin xử lý tranh chấp.')+
  `<div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Đơn / Lô</th><th>Vai trò</th><th>Số lượng</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Chưa có đơn hàng thuộc ví này trong 25 đơn gần nhất của mỗi phía.</td></tr>'}</tbody></table></div></div>`+note('Hệ thống này chưa lưu địa chỉ giao hàng hoặc thông tin liên hệ cá nhân. Đừng sử dụng để xử lý đơn hàng thực tế trước khi bổ sung backend đơn hàng riêng tư.');
}
function render(){
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-pressed',String(b.dataset.tab===state.tab));});
  $('#connect').textContent=state.account?short(state.account):'Kết nối MetaMask';
  const selected=state.tab==='shop'&&state.selected;
  content.innerHTML=selected?detail():state.tab==='seller'?sellerPage():state.tab==='admin'?adminPage():state.tab==='orders'?ordersPage():shop();
  if(state.lastTx){const node=document.createElement('div');node.className='notice good';node.innerHTML=`Giao dịch gần nhất đã xác nhận: ${txExplorer(state.lastTx)}`;content.prepend(node);}
}
async function digestFile(file){
  if(!file||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw Error('Chọn PDF, PNG hoặc JPG hợp lệ.');
  if(file.size===0||file.size>5*1024*1024)throw Error('Mỗi tài liệu phải lớn hơn 0 và không quá 5 MB.');
  const bytes=await file.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',bytes);
  return '0x'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function submitSeller(form){
  const d=new FormData(form);if(!d.get('consent'))throw Error('Phải xác nhận cam kết hồ sơ.');
  const a=await digestFile(d.get('businessLicense')),b=await digestFile(d.get('foodSafety'));
  const expiry=s=>{if(s==='businessExpiry' && !d.get(s))return 0;const ms=Date.parse(String(d.get(s))+'T23:59:59+07:00');if(!Number.isFinite(ms)||ms<Date.now())throw Error('Ngày hết hạn phải ở tương lai.');return Math.floor(ms/1000);};
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
  if(action==='refresh'){await refreshProducts();if(state.contract){await loadWalletData();await loadOrders();}render();return;}
  if(action==='back'){state.selected=null;render();return;}
  if(action==='detail'){state.selected=state.products.find(p=>p.id===id);render();return;}
  if(action==='prev-page'||action==='next-page'){state.page+=action==='next-page'?1:-1;state.page=Math.max(0,state.page);await refreshProducts();render();return;}
  if(action==='buy'){
    const p=state.selected,qty=Number($('#qty')?.value);
    if(!p||state.demo)throw Error('Sản phẩm mẫu không thể mua.');
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
  const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;state.selected=null;render();return;}
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
