import { DEFAULT_CONFIG, STORAGE_KEYS, loadConfig } from "./config.js";
import { ROLE, ROLE_LABEL } from "./roles.js";
import { ChainService } from "./services/chain.js";
import { discoverContract } from "./services/deployment.js";
import { icon, logo } from "./lib/icons.js";
import { drawQR } from "./lib/qr.js";
import { loadScanner } from "./lib/libraries.js";
import {
  escapeHTML as h, shortAddress, formatETH, parseETH, dateTime, assertText, utf8Length,
  errorText, validateMetadata, isAddress, validateRPC, makeBatchURL, parseBatchInput,
  serializeJSON, downloadText, exportBatchesCSV, isTxHash
} from "./lib/utils.js";
import {
  NAV, ROUTE_LABEL, ROLE_ICONS, button, field, dashboard, batchRows, createPage, checkpointPage,
  inspectorPage, stakePage, adminPage, tracePage, guidePage, errorPage
} from "./views.js";

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
const saveStorage = (key,value) => { try { localStorage.setItem(key,value); } catch {} };
const removeStorage = key => { try { localStorage.removeItem(key); } catch {} };
const initialMode = "sepolia";
const routeFromHash = () => {
  const route = location.hash.replace(/^#\/?/, "").split("?")[0] || (params.get("batch") ? "trace" : "dashboard");
  return ROUTE_LABEL[route] ? route : "dashboard";
};
const state = {
  config: loadConfig(), mode: "sepolia", route: routeFromHash(),
  service: null, rules: null, account: null, pageData: null, page: 0, loading: true, error: "",
  detail: null, lookupInput: "", evidence: null, statusFilter: "all", search: "", busy: false,
  transaction: null, pending: null, drafts: {}, sourceVersion: 0
};
try { const p = JSON.parse(readStorage(STORAGE_KEYS.pending)||"null"); if (p && isTxHash(p.hash)) state.pending = p; } catch {}

const dialog = $("#app-dialog");
let confirmResolver = null, scanner = null, scanVersion = 0, scanBusy = false;

document.querySelectorAll("[data-icon]").forEach(node => { node.innerHTML = icon(node.dataset.icon); });

function toast(message, type = "info") {
  const node = document.createElement("div");
  node.className = `toast ${type}`; node.setAttribute("role", type==="error"?"alert":"status");
  node.innerHTML = `${icon(type==="success"?"check":type==="error"?"alert":"info")}<p>${h(message)}</p><button aria-label="Đóng thông báo">${icon("close")}</button>`;
  node.querySelector("button").addEventListener("click",()=>node.remove());
  $("#toasts").append(node);
  setTimeout(()=>node.remove(),type==="error"?11000:6500);
}
function rememberDrafts() {
  document.querySelectorAll("main form[data-form]").forEach(form => {
    const key = form.dataset.form;
    const values = {};
    for (const input of form.querySelectorAll("input[name],textarea[name],select[name]")) {
      if (input.type!=="file") values[input.name] = input.value;
    }
    state.drafts[key] = values;
  });
}
function restoreDrafts() {
  document.querySelectorAll("main form[data-form]").forEach(form => {
    const values = state.drafts[form.dataset.form] || {};
    for (const input of form.querySelectorAll("input[name],textarea[name],select[name]")) {
      if (Object.hasOwn(values,input.name) && input.type!=="file") {
        if (input.tagName==="SELECT" && ![...input.options].some(o=>o.value===values[input.name])) continue;
        input.value = values[input.name];
      }
    }
  });
  updateCounters();
}
function updateCounters(input = null) {
  (input ? [input] : document.querySelectorAll("[data-byte-limit]")).forEach(node=>{
    if (!node.dataset.byteLimit) return;
    const counter = document.querySelector(`[data-counter="${node.id}"]`);
    if (!counter) return;
    const size = utf8Length(node.value), limit = Number(node.dataset.byteLimit);
    counter.textContent = `${size} / ${limit} byte`; counter.classList.toggle("over",size>limit);
  });
}
function renderHeader() {
  const modeSelect = $("#mode-select");
  if (modeSelect) { modeSelect.value = state.mode; modeSelect.disabled = state.busy; }
  $("#breadcrumb-title").textContent = ROUTE_LABEL[state.route]||"Tổng quan";
  $("#navigation").innerHTML = NAV.map(([key,ico,label])=>`<a class="nav-item ${key===state.route?"active":""} ${key==="admin"?"nav-section-gap":""}" href="#/${key}" ${key===state.route?'aria-current="page"':""}>${icon(ico)}${label}</a>`).join("");
  const connect = $("#connect-button");
  connect.innerHTML = `${icon("wallet")}<span>${state.account?h(shortAddress(state.account.address)):"Kết nối ví"}</span>`;
  connect.disabled = state.busy; connect.title = state.account ? "Thông tin ví và vai trò" : "Kết nối ví";
  const banner = $("#mode-banner");
  banner.className = "mode-banner live";
  banner.innerHTML = `<span class="dot"></span><strong>SEPOLIA TESTNET</strong><span>· ${state.loading?"Đang kiểm tra kết nối":state.error?"Chưa triển khai hợp đồng on-chain":state.service?.backendEnabled ? "API on-chain + MetaMask" : "Đọc trực tiếp blockchain"} · ETH thử nghiệm</span>${state.config.contractAddress&&isAddress(state.config.contractAddress)?`<a class="inline-action" href="https://sepolia.etherscan.io/address/${encodeURIComponent(state.config.contractAddress)}" target="_blank" rel="noopener noreferrer" title="Hợp đồng Sepolia">${h(shortAddress(state.config.contractAddress))} ↗</a>`:""}`;
  $("#network-banner").innerHTML = state.account&&!state.account.correctNetwork ?
    `<div class="banner">${icon("alert")}Ví đang ở mạng khác. Dữ liệu đọc vẫn từ Sepolia.${button("Chuyển sang Sepolia","switch-network","route","button-secondary button-small")}</div>`:"";
  renderTransaction();
}
function renderTransaction() {
  const tx = state.transaction || state.pending;
  const holder = $("#transaction-banner");
  if (!tx) { holder.innerHTML=""; return; }
  const labels = {
    checking:"Đang kiểm tra điều kiện và ước tính phí…",signing:"Xác nhận giao dịch trong ví của bạn.",
    pending:"Giao dịch đang chờ xác nhận. Không gửi lại cùng thao tác.",
    confirmed:"Giao dịch đã xác nhận thành công.",
    failed:"Giao dịch đã thất bại hoặc bị hoàn tác.", cancelled:"Giao dịch đã bị thay thế/hủy trong ví."
  };
  const pending = tx.state==="pending";
  holder.innerHTML = `<div class="banner ${tx.state==="confirmed"?"banner-success":["failed","cancelled"].includes(tx.state)?"banner-error":""}">
    ${["checking","signing","pending"].includes(tx.state)?'<span class="spinner"></span>':icon(tx.state==="confirmed"?"check":"alert")}
    <span>${labels[tx.state]||labels.pending}${tx.hash&&isTxHash(tx.hash)?` <a href="${state.config.explorerUrl}/tx/${h(tx.hash)}" target="_blank" rel="noopener noreferrer">${h(shortAddress(tx.hash,12))} ${icon("external")}</a>`:""}</span>
    ${pending?button("Kiểm tra biên nhận","check-receipt","refresh","button-secondary button-small"):button("Đóng","dismiss-transaction","close","button-ghost button-small")}</div>`;
}
function renderPage() {
  const main=$("#main-content");
  if (state.route==="guide") main.innerHTML=guidePage();
  else if (state.loading) main.innerHTML='<div class="loading-page"><span class="spinner"></span> Đang đọc dữ liệu từ nguồn đã chọn…</div>';
  else if (state.error) main.innerHTML=errorPage(state);
  else {
    const renderers={dashboard,create:createPage,checkpoint:checkpointPage,inspect:inspectorPage,stake:stakePage,admin:adminPage,trace:tracePage};
    main.innerHTML=(renderers[state.route]||dashboard)(state);
    restoreDrafts();
    if (state.route==="trace" && state.detail) {
      try { drawQR($("#batch-qr"),batchURL()); } catch(error) { toast(errorText(error),"error"); }
    }
  }
  document.querySelectorAll("main .submit-button").forEach(node=>{node.disabled=state.busy;});
  renderHeader();
}
const batchURL = () => makeBatchURL(document.baseURI,state.detail.batchCode,state.mode,state.config.contractAddress);
function setMenu(open) {
  $("#sidebar").classList.toggle("open",open); $("#mobile-scrim").hidden=!open;
  $(".mobile-toggle").setAttribute("aria-expanded",String(open));
}
function navigate(route) {
  rememberDrafts(); setMenu(false);
  if (state.route===route && location.hash===`#/${route}`) renderPage();
  else location.hash=`/${route}`;
}
function stopScanner() {
  scanVersion++; scanBusy=false;
  if (scanner) { scanner.destroy(); scanner=null; }
}
function closeDialog() { if(dialog.open) dialog.close(); }
dialog.addEventListener("close",()=>{
  stopScanner(); if(confirmResolver) { const resolve=confirmResolver; confirmResolver=null; resolve(false); }
});
function openDialog(title,body) {
  stopScanner();
  if (confirmResolver) { const resolve=confirmResolver; confirmResolver=null; resolve(false); }
  dialog.innerHTML=`<div class="dialog-header"><h2 id="dialog-title">${h(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Đóng">${icon("close")}</button></div><div class="dialog-body">${body}</div>`;
  if(!dialog.open) dialog.showModal();
}
async function refreshData({ preserve = true } = {}) {
  const version=state.sourceVersion, service=state.service;
  const [rules,pageData,account]=await Promise.all([
    service.getRules(),service.getPage(state.page,state.config.pageSize),service.getAccount()
  ]);
  if(version!==state.sourceVersion) return;
  if(preserve) rememberDrafts();
  state.rules=rules; state.pageData=pageData; state.account=account; state.error="";
  if(state.page>0 && pageData.items.length===0) { state.page=Math.max(0,Math.ceil(pageData.total/state.config.pageSize)-1); state.pageData=await service.getPage(state.page,state.config.pageSize); }
  renderPage();
}
async function initSource() {
  const version=++state.sourceVersion;
  state.service?.destroy(); state.account=null; state.rules=null; state.pageData=null;
  state.error=""; state.detail=null; state.evidence=null; state.page=0; state.loading=true;
  state.transaction=null; state.drafts={}; state.lookupInput=""; renderPage();
  await syncDeploymentConfig();
  if(version!==state.sourceVersion)return;
  // Luon su dung ChainService ket noi mang Sepolia on-chain
  const service=new ChainService(state.config,async()=>{
    if(version!==state.sourceVersion)return;
    try { await refreshData(); toast("Ví hoặc mạng vừa thay đổi. Quyền đã được kiểm tra lại."); }
    catch(error) { state.account=null; renderHeader(); toast(errorText(error,service.interface),"error"); }
  });
  state.service=service;
  try {
    const rules=await service.init();
    const data=await service.getPage(0,state.config.pageSize);
    if(version!==state.sourceVersion) return;
    state.rules=rules;state.pageData=data;state.loading=false;renderPage();
  } catch(error) {
    if(version!==state.sourceVersion)return;
    state.loading=false;state.error=errorText(error,service.interface);renderPage();
  }
}
async function refresh() {
  if(state.busy)return;
  if(state.error || !state.rules) return initSource();
  const trigger=document.querySelector('[data-action="refresh"]');
  if(trigger)trigger.disabled=true;
  try{
    await refreshData();
    if(state.detail&&state.route==="trace")await lookup(state.detail.batchCode,false);
    toast("Dữ liệu đã được làm mới.","success");
  }catch(error){toast(errorText(error,state.service?.interface),"error");}
  finally{if(trigger)trigger.disabled=false;}
}
async function lookup(raw,go=true) {
  const version=state.sourceVersion, service=state.service;
  const code=parseBatchInput(raw,{mode:state.mode,contractAddress:state.config.contractAddress});
  if(!state.rules)throw new Error("Nguồn dữ liệu chưa sẵn sàng. Kiểm tra kết nối trước.");
  const detail=service.getDetails ? await service.getDetails(code) : {...await service.getBatch(code),checkpoints:await service.getCheckpoints(code)};
  if(version!==state.sourceVersion)return;
  rememberDrafts(); state.detail=detail;state.evidence=null;state.lookupInput=code;
  state.drafts.lookup={"lookup-code":code};
  if(go&&state.route!=="trace")navigate("trace"); else renderPage();
}
function accountDialog() {
  const a=state.account;
  if(!a)return connectWallet();
  openDialog("Ví đang kết nối",`
    <div class="account-heading"><span class="account-avatar">${icon("wallet")}</span><div><strong>${h(shortAddress(a.address,10))}</strong><small>${a.isOwner?"Chủ sở hữu hợp đồng":a.roles.length?a.roles.map(k=>ROLE_LABEL[k]).join(" · "):"Khách tra cứu"}</small></div></div>
    <p class="mono" style="font-size:11px">${h(a.address)}</p>
    <div class="info-row"><span>Số dư ví</span><strong>${h(formatETH(a.balance))} ETH</strong></div>
    <div class="info-row"><span>Tiền cọc</span><strong>${h(formatETH(a.stake))} ETH</strong></div>
    <div class="info-row"><span>Nguồn dữ liệu</span><strong>Ethereum Sepolia</strong></div>
    <p class="evidence-hint">Ngắt kết nối ở đây chỉ xoá phiên kết nối của trang. Có thể thu hồi quyền trang trong cài đặt ví.</p>
    <div class="dialog-actions">${button("Sao chép địa chỉ","copy-address","copy")}${button("Ngắt kết nối","disconnect","logout","button-secondary")}</div>`);
}
async function connectWallet() {
  if(state.busy)return;
  if(state.account)return accountDialog();
  try {
    $("#connect-button").disabled=true;
    state.account=await state.service.connect();renderHeader();
    rememberDrafts();renderPage();
    toast(state.account.correctNetwork?"Ví đã kết nối. Vai trò được đọc từ hợp đồng.":"Ví đã kết nối nhưng đang sai mạng.",state.account.correctNetwork?"success":"info");
  }catch(error){toast(errorText(error,state.service?.interface),"error");}
  finally{$("#connect-button").disabled=state.busy;}
}
function showSettings() {
  openDialog("Cấu hình Smart Contract Sepolia", `
    <p class="dialog-description">Cấu hình địa chỉ hợp đồng ProjectCore mà nhóm bạn đã triển khai trên Ethereum Sepolia.</p>
    <form class="panel form-panel" data-form="settings">
      <div class="field">
        <label for="config-address">Địa chỉ Smart Contract <span class="required">*</span></label>
        <input type="text" id="config-address" name="config-address" placeholder="0x..." value="${h(state.config.contractAddress)}" maxlength="42" required autocomplete="off">
        <small>Địa chỉ hợp đồng ProjectCore trên Sepolia Testnet.</small>
      </div>
      <div class="field">
        <label for="config-rpc">Sepolia RPC URL</label>
        <input type="url" id="config-rpc" name="config-rpc" placeholder="https://..." value="${h(state.config.rpcUrl)}" required>
        <small>Điểm cuối RPC HTTPS công khai.</small>
      </div>
      <div class="form-bottom">
        <button type="button" class="button button-ghost" data-action="default-config">Xóa trắng</button>
        <button type="submit" class="button button-primary submit-button">Lưu cấu hình</button>
      </div>
    </form>
  `);
}
function confirmTransaction(prepared,title,summary) {
  openDialog("Kiểm tra trước khi ký",`
    <p class="dialog-description">${h(title)}</p>
    <div class="confirm-args">${h(summary)}</div>
    <div class="info-row"><span>Ví thực hiện</span><strong class="mono">${h(shortAddress(prepared.account,10))}</strong></div>
    <div class="info-row"><span>Hợp đồng nhận lời gọi</span><strong class="mono">${h(state.config.contractAddress)}</strong></div>
    <div class="info-row"><span>ETH gửi kèm</span><strong>${h(formatETH(prepared.value,18))} ETH</strong></div>
    <div class="info-row"><span>Phí mạng tham khảo</span><strong>${h(formatETH(prepared.networkFee,18))} ETH</strong></div>
    <p class="evidence-hint">Phí mạng thực tế có thể thay đổi; kiểm tra lần cuối trong ví. Đã mô phỏng lời gọi để phát hiện lỗi trước khi gửi.</p>
    <div class="dialog-actions">${button("Quay lại","cancel-confirm","","button-secondary")}<button class="button button-primary" data-action="confirm-transaction">Tiếp tục trong ví${icon("arrow")}</button></div>`);
  return new Promise(resolve=>{confirmResolver=resolve;});
}
function progress(update) {
  state.transaction={...state.transaction,...update};
  if(update.state==="pending"&&isTxHash(update.hash)) {
    state.pending={...state.transaction,state:"pending",contractAddress:state.config.contractAddress,chainId:state.config.chainId};
    saveStorage(STORAGE_KEYS.pending,JSON.stringify(state.pending));
  }else if(["confirmed","failed","cancelled"].includes(update.state)) {
    state.pending=null;removeStorage(STORAGE_KEYS.pending);
  }
  renderTransaction();
}
async function transact(method,args,value,title,summary,form=null) {
  if(state.busy)return;
  if(state.pending && state.mode==="sepolia")throw new Error("Còn một giao dịch đang chờ. Kiểm tra biên nhận trước khi gửi thao tác mới.");
  if(!state.account){await connectWallet();throw new Error("Kết nối ví, kiểm tra vai trò rồi gửi lại biểu mẫu.");}
  if(!state.account.correctNetwork)throw new Error("WRONG_NETWORK");
  const service=state.service,version=state.sourceVersion;
  state.busy=true;state.transaction={state:"checking",demo:state.mode==="demo"};renderHeader();
  const submits=[...document.querySelectorAll("main .submit-button")];
  submits.forEach(node=>node.disabled=true);
  let sent=false;
  try {
    const prepared=await service.prepare(method,args,value);
    state.transaction=null;renderTransaction();
    const confirmed=await confirmTransaction(prepared,title,summary);
    if(!confirmed)return;
    if(version!==state.sourceVersion)throw new Error("CONTEXT_CHANGED");
    const result=await service.send(prepared,update=>progress(update));
    if(result.pending){toast("Đã gửi giao dịch. Tiếp tục theo dõi biên nhận; không gửi lại.","info");return;}
    if(result.cancelled){toast("Giao dịch đã được hủy hoặc thay thế trong ví.","info");return;}
    sent=true;
    if(form){delete state.drafts[form.dataset.form];form.reset();}
    toast(state.mode==="demo"?"Thao tác mẫu thành công.":"Giao dịch đã xác nhận thành công.","success");
    try {
      await refreshData({preserve:false});
      if(["createBatch","addCheckpoint","verifyBatch","revokeBatchVerification"].includes(method))await lookup(args[0]);
    }catch(error){toast(`Giao dịch đã xong, nhưng tải lại dữ liệu chưa thành công: ${errorText(error,service.interface)}`,"info");}
  }catch(error){
    if(!sent&&!state.pending&&state.transaction?.state!=="failed")state.transaction=null;
    renderTransaction();throw error;
  }finally{
    state.busy=false;renderHeader();
    document.querySelectorAll("main .submit-button").forEach(node=>node.disabled=false);
  }
}
function formPayload(form) {
  const value=name=>String(form.elements.namedItem(name)?.value||"").trim();
  const text=(name,label,limit,required=true)=>assertText(value(name),label,limit,required);
  const uri=name=>validateMetadata(value(name));
  const code=(name)=>text(name,"Mã lô",64);
  switch(form.dataset.form){
    case "create":{
      const args=[code("batch-code"),text("product-name","Tên đặc sản",128),text("origin","Nguồn gốc",128),uri("initial-uri")];
      const fee=state.account?.isOwner?0n:state.rules.fee;
      return ["createBatch",args,fee,"Khởi tạo lô hàng",`Mã lô: ${args[0]}\nĐặc sản: ${args[1]}\nNguồn gốc: ${args[2]}\nChứng từ: ${args[3]||"Không có"}`];
    }
    case "checkpoint":{
      const key=value("checkpoint-role");if(!ROLE[key])throw new Error("Ví chưa có vai trò hợp lệ để ký chặng.");
      const args=[code("checkpoint-code"),ROLE[key],text("checkpoint-location","Địa điểm",128),text("checkpoint-action","Hoạt động",2048),uri("checkpoint-uri")];
      return ["addCheckpoint",args,0n,"Ghi nhận một chặng mới",`Lô: ${args[0]}\nVai trò: ${ROLE_LABEL[key]}\nĐịa điểm: ${args[2]}\nNội dung: ${args[3]}`];
    }
    case "verify":{
      const args=[code("verify-code"),text("verify-note","Nội dung kiểm định",2048,false),uri("certificate-uri")];
      return ["verifyBatch",args,0n,"Xác nhận kiểm định",`Lô: ${args[0]}\nNội dung: ${args[1]||"Theo mô tả mặc định của hợp đồng"}\nChứng từ: ${args[2]||"Không có"}`];
    }
    case "revoke-verification":{
      const args=[code("revoke-code"),text("revoke-reason","Lý do thu hồi",2048)];
      return ["revokeBatchVerification",args,0n,"Thu hồi trạng thái kiểm định",`Lô: ${args[0]}\nLý do công khai: ${args[1]}`];
    }
    case "deposit":{
      const amount=parseETH(value("stake-amount"));if(amount<=0n)throw new Error("Số tiền nạp phải lớn hơn 0.");
      return ["depositStake",[],amount,"Nạp tiền cọc uy tín",`Nạp ${formatETH(amount,18)} ETH thử nghiệm.\nMốc mở khóa được tính theo quy tắc của hợp đồng.`];
    }
    case "role":{
      const address=value("role-address");if(!isAddress(address))throw new Error("Địa chỉ ví phải có 0x và 40 ký tự hex, khác địa chỉ 0.");
      const key=value("role-name");if(!ROLE[key])throw new Error("Vai trò không hợp lệ.");
      const method=value("role-operation");if(!["grantRole","revokeRole"].includes(method))throw new Error("Thao tác không hợp lệ.");
      return [method,[address,ROLE[key]],0n,method==="grantRole"?"Cấp quyền cho ví":"Thu hồi quyền của ví",`Ví: ${address}\nVai trò: ${ROLE_LABEL[key]}`];
    }
    case "fee":{
      const fee=parseETH(value("new-fee"));if(fee>state.rules.feeLimit)throw new Error("FeeExceedsLimit");
      return ["setBatchCreationFee",[fee],0n,"Thay đổi phí tạo lô",`Phí mới: ${formatETH(fee,18)} ETH.\nÁp dụng cho các lô được tạo sau khi giao dịch xác nhận.`];
    }
    case "fund":{
      const address=value("fund-address");if(!isAddress(address))throw new Error("Địa chỉ ví quỹ không hợp lệ.");
      return ["setEcosystemFund",[address],0n,"Đổi ví nhận phí",`Ví nhận phí mới:\n${address}\nKiểm tra thật kỹ. Phí của các lô mới sẽ chuyển tới ví này.`];
    }
    case "lock":{
      const days=value("lock-days");if(!/^\d+$/.test(days)||!Number.isSafeInteger(Number(days)*86400))throw new Error("Số ngày phải là số nguyên không âm hợp lệ.");
      return ["setStakeLockDuration",[BigInt(days)*86400n],0n,"Thay đổi kỳ khóa cọc",`Kỳ khóa mới: ${days} ngày.\n${Number(days)===0?"CẢNH BÁO: Kỳ khóa mới bằng 0. ":""}Không sửa mốc đã lưu của các khoản cọc hiện có.`];
    }
    default:throw new Error("Biểu mẫu chưa được hỗ trợ.");
  }
}
async function submitForm(form) {
  const output=form.querySelector(".form-error");if(output)output.textContent="";
  if(form.dataset.form==="settings"){
    if(state.pending)throw new Error("Kiểm tra xong giao dịch đang chờ trước khi đổi hợp đồng hoặc RPC.");
    const address=form.elements["config-address"].value.trim();
    if(!isAddress(address))throw new Error("Địa chỉ hợp đồng không hợp lệ.");
    const rpc=validateRPC(form.elements["config-rpc"].value.trim());
    state.config={...state.config,contractAddress:address,rpcUrl:rpc};
    saveStorage(STORAGE_KEYS.config,JSON.stringify({contractAddress:address,rpcUrl:rpc}));
    closeDialog();await initSource();toast("Đã lưu cấu hình.","success");return;
  }
  if(form.dataset.form==="lookup"){
    const submitButton=form.querySelector(".submit-button");submitButton.disabled=true;
    try{await lookup(form.elements["lookup-code"].value);}finally{submitButton.disabled=false;}
    return;
  }
  if(!state.rules)throw new Error("Nguồn dữ liệu chưa sẵn sàng.");
  rememberDrafts();
  // Doc lai tham so de tranh dung phi cu khi nguoi quan tri vua thay doi.
  state.rules=await state.service.getRules();
  if(state.account)state.account=await state.service.getAccount();
  const payload=formPayload(form);await transact(...payload,form);
}
async function startCamera() {
  const token=++scanVersion;
  openDialog("Quét mã QR",`
    <p class="dialog-description">Đưa QR vào khung hình. Trang chỉ đọc mã lô, không tự mở liên kết hoặc thay hợp đồng từ QR.</p>
    <div class="video-wrap"><video id="qr-video" muted playsinline></video></div>
    <p id="camera-status" class="camera-status" role="status">Đang chuẩn bị camera…</p>
    <div class="dialog-actions"><label class="button button-secondary file-input-button">${icon("file")}Chọn ảnh QR<input type="file" accept="image/*" id="qr-upload" aria-label="Tải ảnh mã QR"></label>${button("Nhập mã thủ công","manual-lookup","search")}</div>`);
  const active=scanVersion;
  try {
    if(!window.isSecureContext)throw new Error("Camera cần HTTPS hoặc localhost. Hãy chọn ảnh QR hoặc nhập mã thủ công.");
    const Scanner=await loadScanner();if(active!==scanVersion||!dialog.open)return;
    const video=$("#qr-video");
    scanner=new Scanner(video,result=>handleScanResult(result.data),{preferredCamera:"environment",highlightScanRegion:true,highlightCodeOutline:true,returnDetailedScanResult:true});
    await scanner.start();
    if(active!==scanVersion)return;
    $("#camera-status").textContent="Camera sẵn sàng. Đặt mã QR vào giữa khung.";
  }catch(error){
    if(active!==scanVersion||!dialog.open)return;
    $("#camera-status").textContent=/denied|permission|notallowed/i.test(String(error))?"Chưa được cấp quyền camera. Cho phép trong trình duyệt hoặc chọn ảnh QR.":`Không mở được camera. ${errorText(error)}`;
  }
}
async function handleScanResult(raw) {
  if(scanBusy)return;scanBusy=true;
  try{
    const code=parseBatchInput(raw,{mode:state.mode,contractAddress:state.config.contractAddress});
    stopScanner();closeDialog();await lookup(code);
    toast("Đã đọc mã QR.","success");
  }catch(error){toast(errorText(error,state.service?.interface),"error");scanBusy=false;}
}
async function hashFile(file) {
  if(!file)throw new Error("Chưa chọn tài liệu.");
  if(file.size>10*1024*1024)throw new Error("Tài liệu tối đa 10 MB.");
  if(!crypto.subtle)throw new Error("Tính SHA-256 cần HTTPS hoặc localhost.");
  const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function checkPending() {
  if(!state.pending)return;
  if(state.mode!=="sepolia"||!state.service.ready)throw new Error("Chuyển sang Sepolia và kết nối RPC để kiểm tra biên nhận.");
  const receipt=await state.service.checkReceipt(state.pending.hash);
  if(!receipt){toast("RPC chưa có biên nhận. Giao dịch có thể còn chờ hoặc đã bị thay thế; kiểm tra lịch sử trong ví.");return;}
  progress({state:receipt.status===1?"confirmed":"failed",hash:receipt.hash,demo:false,blockNumber:receipt.blockNumber});
  await refreshData();
}
async function clickAction(node) {
  const action=node.dataset.action;
  if(action.startsWith("navigate-"))return navigate(action.slice(9));
  switch(action){
    case "menu":return setMenu(!$("#sidebar").classList.contains("open"));
    case "settings":return showSettings();
    case "close-dialog":return closeDialog();
    case "connect":return connectWallet();
    case "disconnect":await state.service.disconnect();state.account=null;rememberDrafts();closeDialog();renderPage();return;
    case "switch-network":state.account=await state.service.switchNetwork();rememberDrafts();renderPage();return;
    case "refresh":return refresh();
    case "filter":state.statusFilter=node.dataset.filter;rememberDrafts();renderPage();return;
    case "view":return lookup(node.dataset.code);
    case "sample":return lookup("HL-MEXUNG-2026-001");
    case "scan":return startCamera();
    case "manual-lookup":closeDialog();navigate("trace");return;
    case "previous-page":
    case "next-page":{
      const old=state.page;state.page+=action==="next-page"?1:-1;
      if(state.page<0){state.page=0;return;}
      node.disabled=true;
      try{await refreshData();}catch(error){state.page=old;throw error;}finally{node.disabled=false;}return;
    }
    case "generate-code":{
      const suffix=crypto.getRandomValues(new Uint16Array(1))[0].toString(36).toUpperCase().padStart(3,"0");
      const date=new Date().toISOString().slice(0,10).replace(/-/g,"");
      $("#batch-code").value=`HL-${date}-${suffix}`;updateCounters($("#batch-code"));rememberDrafts();return;
    }
    case "withdraw":{
      state.account=await state.service.getAccount();
      return transact("withdrawStake",[],0n,"Rút toàn bộ tiền cọc",`Rút ${formatETH(state.account?.stake,18)} ETH về chính ví đã nạp.\nSau khi rút, số dư cọc bằng 0.`);
    }
    case "confirm-transaction":{
      const resolve=confirmResolver;confirmResolver=null;closeDialog();resolve?.(true);return;
    }
    case "cancel-confirm":closeDialog();return;
    case "check-receipt":return checkPending();
    case "dismiss-transaction":if(state.transaction?.state!=="pending"){state.transaction=null;renderTransaction();}return;
    case "default-config":$("#config-address").value=DEFAULT_CONFIG.contractAddress;$("#config-rpc").value=DEFAULT_CONFIG.rpcUrl;return;
    case "copy-address":await navigator.clipboard.writeText(state.account.address);toast("Đã sao chép địa chỉ ví.","success");return;
    case "copy-link":await navigator.clipboard.writeText(batchURL());toast("Đã sao chép liên kết truy xuất.","success");return;
    case "download-qr":{
      const canvas=$("#batch-qr");if(!canvas)return;
      const a=document.createElement("a");a.download=`HueLegend-${state.detail.batchCode.replace(/[^a-zA-Z0-9_-]/g,"_")}.png`;
      a.href=canvas.toDataURL("image/png");a.click();return;
    }
    case "export-csv": {
      const rows = state.pageData?.items || [];
      downloadText(exportBatchesCSV(rows, state.mode),
        `HueLegend-${state.mode}-trang-${state.page+1}.csv`, "text/csv;charset=utf-8");
      toast(`Đã xuất ${rows.length} lô trên trang hiện tại; không phải toàn bộ hệ thống.`, "success");
      return;
    }
    case "export":{
      const b=state.detail;if(!b)return;
      downloadText(serializeJSON({app:"HueLegend",mode:state.mode,source:state.mode==="demo"?"DU_LIEU_MO_PHONG":{chainId:state.config.chainId,contract:state.config.contractAddress},
        exportedAt:new Date().toISOString(),batch:b,evidence:state.evidence||null}),
        `HueLegend-${b.batchCode.replace(/[^a-zA-Z0-9_-]/g,"_")}.json`);return;
    }
    case "evidence":{
      const version=state.sourceVersion,code=state.detail?.batchCode;if(!code)return;
      node.disabled=true;node.innerHTML='<span class="spinner"></span> Đang tìm…';
      try{
        const result=await state.service.getEvidence(code);
        if(version!==state.sourceVersion||state.detail?.batchCode!==code)return;
        state.evidence=result;rememberDrafts();renderPage();
        toast(`Đã tìm thấy ${result.logs.length} sự kiện trong phạm vi đã chọn.`);
      }finally{if(node.isConnected){node.disabled=false;node.innerHTML=`${icon("link")}Tìm giao dịch`;}}return;
    }
  }
}
document.addEventListener("click",event=>{
  const node=event.target.closest("[data-action]");if(!node)return;
  event.preventDefault();
  Promise.resolve(clickAction(node)).catch(error=>toast(errorText(error,state.service?.interface),"error"));
});
document.addEventListener("submit",event=>{
  const form=event.target.closest("form[data-form]");if(!form)return;
  event.preventDefault();
  submitForm(form).catch(error=>{
    const text=errorText(error,state.service?.interface),output=form.querySelector(".form-error");
    if(output&&form.isConnected){output.textContent=text;output.scrollIntoView({block:"nearest",behavior:"smooth"});}
    else toast(text,"error");
  });
});
document.addEventListener("input",event=>{
  if(event.target.id==="table-search"){state.search=event.target.value;$("#batch-rows").innerHTML=batchRows(state);return;}
  updateCounters(event.target);
  if(event.target.closest("main"))rememberDrafts();
});
document.addEventListener("change",async event=>{
  const input=event.target;
  try{
    if(input.id==="qr-upload"&&input.files?.[0]){
      const file=input.files[0];if(file.size>10*1024*1024)throw new Error("Ảnh QR tối đa 10 MB.");
      const Scanner=await loadScanner();
      const result=await Scanner.scanImage(file,{returnDetailedScanResult:true});
      await handleScanResult(result.data);return;
    }
    if(input.matches("[data-hash-target]")&&input.files?.[0]){
      const hash=await hashFile(input.files[0]),target=document.getElementById(input.dataset.hashTarget);
      if(target){target.value=`sha256:${hash}`;updateCounters(target);rememberDrafts();toast("Đã tạo SHA-256 trên máy. Tài liệu không được tải lên.","success");}
    }
    if(input.matches("[data-proof-file]")&&input.files?.[0]){
      const detail=state.detail,hash=await hashFile(input.files[0]);
      if(state.detail!==detail)return;
      const matches=detail.checkpoints.filter(c=>c.metadataURI.toLowerCase()===`sha256:${hash}`);
      const out=$("#proof-result");if(out)out.innerHTML=`<strong>${matches.length?`Khớp ${matches.length} chặng đã ghi mã băm.`:"Không tìm thấy mã băm này trong các chặng."}</strong><p class="mono" style="margin-top:8px">sha256:${hash}</p><p>Chỉ kiểm tra nội dung file trùng mã băm; không xác nhận người phát hành hay tính pháp lý.</p>`;
    }
    rememberDrafts();
  }catch(error){toast(errorText(error,state.service?.interface),"error");}
});
$("#mobile-scrim").addEventListener("click",()=>setMenu(false));
window.addEventListener("hashchange",()=>{
  rememberDrafts();state.route=routeFromHash();setMenu(false);renderPage();window.scrollTo({top:0,behavior:"instant"});
});
window.addEventListener("beforeunload",()=>{stopScanner();state.service?.destroy();});
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopScanner();});
async function syncDeploymentConfig() {
  const contractAddress = await discoverContract({
    mode: state.mode, customConfig: Boolean(readStorage(STORAGE_KEYS.config)), origin: location.origin
  });
  if (contractAddress) state.config = { ...state.config, contractAddress };
}
async function bootstrap(){
  await initSource();
  const initial=params.get("batch");
  if(initial&&!state.error){
    try{await lookup(location.href);}catch(error){state.lookupInput=initial;renderPage();toast(errorText(error,state.service?.interface),"error");}
  }
}
bootstrap().catch(error=>{state.loading=false;state.error=errorText(error,state.service?.interface);renderPage();});
