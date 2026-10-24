import { icon, logo } from "./lib/icons.js";
import { escapeHTML as h, shortAddress, formatETH, dateTime, remainingTime, productKind, safeURI, isTxHash, makeBatchURL } from "./lib/utils.js";
import { ROLE, ROLE_LABEL, WORKFLOW_ROLES, roleKey, roleLabel } from "./roles.js";

export const NAV = [
  ["dashboard","home","Tổng quan"], ["trace","qr","Tra cứu nguồn gốc"],
  ["create","plus","Tạo lô hàng"], ["checkpoint","route","Ghi nhận chặng"],
  ["inspect","shield","Kiểm định"], ["stake","wallet","Ký quỹ"],
  ["admin","key","Quản trị"]
];
export const ROUTE_LABEL = Object.fromEntries([...NAV.map(([key,,label])=>[key,label]),["guide","Hướng dẫn"]]);
export const ROLE_ICONS = { PRODUCER:"box", INSPECTOR:"shield", ADMIN:"key" };
export const badge = verified => `<span class="badge ${verified ? "badge-success" : "badge-pending"}"><span class="dot"></span>${verified ? "Đã kiểm định" : "Chưa kiểm định"}</span>`;
export function button(label, action, iconName = "", cls = "button-secondary", extra = "") {
  return `<button class="button ${cls}" data-action="${action}" ${extra}>${iconName ? icon(iconName) : ""}${label}</button>`;
}
const note = (text, type = "") => `<div class="note ${type}">${icon(type === "amber" ? "alert" : "info")}<p>${text}</p></div>`;
function heading(title, subtitle, right = "") {
  return `<div class="page-heading"><div><div class="page-kicker">HUELEGEND / ${h(title.toUpperCase())}</div><h1>${h(title)}</h1><p>${h(subtitle)}</p></div>${right}</div>`;
}
export function field(id, label, { placeholder = "", limit, hint = "", required = false, value = "", type = "text", textarea = false, extra = "", side = "" } = {}) {
  const attrs = `id="${id}" name="${id}" ${required ? "required" : ""} ${limit ? `data-byte-limit="${limit}"` : ""} ${extra}`;
  return `<div class="field"><div class="field-head"><label for="${id}">${label}${required ? ' <span class="required">*</span>' : ""}</label>${side}</div>
    ${textarea ? `<textarea ${attrs} placeholder="${h(placeholder)}">${h(value)}</textarea>` : `<input ${attrs} type="${type}" placeholder="${h(placeholder)}" value="${h(value)}" ${type === "text" ? 'autocomplete="off"' : ""}>`}
    <div class="field-meta"><small>${hint}</small>${limit ? `<span class="byte-counter" data-counter="${id}">0 / ${limit} byte</span>` : ""}</div></div>`;
}
function selectField(id, label, options) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}" name="${id}">${options.map(([value,text])=>`<option value="${h(value)}">${h(text)}</option>`).join("")}</select></div>`;
}
function metadataField(id, label = "Chứng từ / tài liệu đính kèm") {
  return field(id, label, { placeholder: "https://…  hoặc  ipfs://…", limit: 2048,
    hint: "Không bắt buộc. Chỉ lưu liên kết hoặc mã SHA-256, không tải tài liệu lên máy chủ.",
    side: `<label class="text-button file-input-button" tabindex="0">Băm tài liệu<input type="file" data-hash-target="${id}" aria-label="Chọn tài liệu để tạo mã SHA-256"></label>` });
}
function submit(label, iconName = "arrow", extra = "") {
  return `<button class="button button-primary submit-button" type="submit" ${extra}>${label}${icon(iconName)}</button>`;
}
function gate(s, role) {
  if (!s.account) return `<div class="form-gate">${note(`Kết nối ví để thực hiện. Bạn vẫn có thể nhập trước thông tin và tra cứu mà không cần ví.`)}</div>`;
  if (!s.account.correctNetwork) return `<div class="form-gate">${note("Ví đang ở mạng khác. Hãy chuyển sang Sepolia trước khi ký.", "amber")}</div>`;
  if (role && !(role === "OWNER" ? s.account.isOwner : s.account.roles.includes(role))) return `<div class="form-gate">${note(`Ví hiện tại chưa có quyền <strong>${role === "OWNER" ? "chủ sở hữu hợp đồng" : h(ROLE_LABEL[role])}</strong>. Chọn vai trên giao diện không tự cấp quyền on-chain.`, "amber")}</div>`;
  return `<div class="form-gate">${note(`Ví <strong>${h(shortAddress(s.account.address))}</strong> đã kết nối${s.mode === "demo" ? " trong chế độ mẫu" : " Sepolia"}. ${role ? "Quyền thực hiện đã được kiểm tra." : ""}`,"green")}</div>`;
}
const formError = '<div class="form-error" role="alert"></div>';
const panelTitle = (number,title,description) => `<div class="panel-heading"><div class="section-number">${number}</div><h2>${title}</h2><p>${description}</p></div>`;
const infoRow = (name,value) => `<div class="info-row"><span>${name}</span><strong>${value}</strong></div>`;
function economics(s) {
  return `<div class="panel side-panel"><h3>Thông tin trước khi tạo lô</h3>
    ${infoRow("Phí tạo lô",`${h(formatETH(s.rules?.fee))} ETH`)}
    ${infoRow("Cọc tối thiểu",`${h(formatETH(s.rules?.minStake))} ETH`)}
    ${infoRow("Thời gian khóa",s.rules ? `${s.rules.lockDuration / 86400} ngày` : "—")}
    ${infoRow("Trần phí",`${h(formatETH(s.rules?.feeLimit))} ETH`)}
    ${s.account?.isOwner ? note("Theo hợp đồng đã đối chiếu, chủ sở hữu được miễn phí tạo lô và yêu cầu cọc.") : ""}
    <p class="evidence-hint">${s.mode === "demo" ? "Tham số mẫu, không có tiền thật." : "Giá trị được đọc từ hợp đồng; không cố định cứng theo README."}</p>
  </div>`;
}
function steps() {
  return `<div class="steps-strip">
    <div class="step-card"><span class="step-index">01</span><div><h3>Khởi tạo nguồn gốc</h3><p>Cơ sở sản xuất khai báo thông tin lô hàng.</p></div></div>
    <div class="step-card"><span class="step-index">02</span><div><h3>Ghi nhận từng chặng</h3><p>Mỗi vai trò ký xác nhận phần việc của mình.</p></div></div>
    <div class="step-card"><span class="step-index">03</span><div><h3>Tra cứu bằng mã QR</h3><p>Người mua xem hành trình, không cần kết nối ví.</p></div></div>
  </div>`;
}
export function dashboard(s) {
  const rows = s.pageData?.items || [], total = s.pageData?.total || 0;
  const verified = rows.filter(b=>b.isVerified).length;
  return `${heading("Tổng quan", "Theo dõi hành trình đặc sản Huế, từ nguồn cội đến điểm bán.",
    button("Tạo lô hàng","navigate-create","plus","button-primary"))}
    <section class="hero" aria-label="Giới thiệu HueLegend">
      <div class="hero-content"><span class="eyebrow">ĐẶC SẢN HUẾ · NGUỒN GỐC MINH BẠCH</span>
      <h2>Mỗi đặc sản,<br>một hành trình rõ ràng.</h2>
      <p>Kết nối làng nghề đặc sản, cơ quan kiểm định và người mua<br>qua những thông tin có thể đối chiếu.</p>
      <div class="hero-actions">${button("Tra cứu nguồn gốc","navigate-trace","search","button-primary")}${button("Quét mã QR","scan","qr")}</div></div>
      <div class="hero-art" aria-hidden="true">
        <svg viewBox="0 0 350 250" fill="none">
          <circle cx="190" cy="128" r="105" stroke="currentColor" stroke-width=".5"/><circle cx="190" cy="128" r="84" stroke="currentColor" stroke-width=".5" stroke-dasharray="2 6"/>
          <path d="M17 202h306M33 186h279M55 153h237M70 145h207M92 120h164M99 113h150M119 88h112M128 81h94M159 65h36M146 77h63M78 153v30m190-30v30M114 122v24m124-24v24M139 92v20m72-20v20" stroke="currentColor" stroke-width="1.1"/>
          <path d="M127 185v-20a13 13 0 0 1 26 0v20m8 0v-24a15 15 0 0 1 30 0v24m8 0v-20a13 13 0 0 1 26 0v20M55 153c9-3 13-4 15-8m-1 0-10-2m218 2c2 4 6 5 15 8m-15-8 10-2M92 120c4-2 5-4 7-7m150 0c2 3 3 5 7 7M40 216q40-7 80 0t80 0t80 0t45 0" stroke="currentColor" stroke-width="1.1"/>
        </svg><span class="hero-stamp">${icon("shield")}</span><small>H U Ế · V I Ệ T N A M</small>
      </div>
    </section>
    <section class="stats" aria-label="Thống kê nguồn dữ liệu đang chọn">
      ${[
        ["Lô hàng trên hệ thống",String(total),"box",s.mode==="demo"?"Dữ liệu mô phỏng":"Tổng số đọc từ hợp đồng"],
        ["Đã kiểm định",`${verified}<span>/ ${rows.length}</span>`,"shield","Trong trang đang hiển thị"],
        ["Phí tạo lô",`${h(formatETH(s.rules?.fee))}<span>ETH</span>`,"wallet","Không bao gồm phí mạng"],
        ["Mức cọc tối thiểu",`${h(formatETH(s.rules?.minStake))}<span>ETH</span>`,"lock","Đối với cơ sở sản xuất"]
      ].map(([title,num,ico,sub])=>`<article class="stat-card"><div class="stat-top">${title}<span class="stat-icon">${icon(ico)}</span></div><div class="stat-number">${num}</div><small class="stat-caption">${sub}</small></article>`).join("")}
    </section>
    <div class="section-title"><div><h2>Lô hàng gần đây</h2><p>${s.mode === "demo" ? "Các lô mẫu để bạn khám phá giao diện." : "Dữ liệu đọc trực tiếp từ Sepolia; lô mới nhất hiển thị trước."}</p></div>${button("Xuất trang CSV","export-csv","download","button-ghost")}${button("Làm mới","refresh","refresh","button-ghost")}</div>
    <section class="panel">
      <div class="table-toolbar"><div class="table-tabs" aria-label="Lọc trạng thái">
        <button class="tab ${s.statusFilter==="all"?"active":""}" data-action="filter" data-filter="all">Tất cả <span>${rows.length}</span></button>
        <button class="tab ${s.statusFilter==="verified"?"active":""}" data-action="filter" data-filter="verified">Đã kiểm định</button>
        <button class="tab ${s.statusFilter==="pending"?"active":""}" data-action="filter" data-filter="pending">Chưa kiểm định</button>
      </div><label class="search-small" for="table-search">${icon("search")}<input id="table-search" type="search" value="${h(s.search)}" placeholder="Lọc mã lô, tên trên trang này…" aria-label="Lọc trên trang hiện tại"></label></div>
      <div class="table-scroll"><table><thead><tr><th>SẢN PHẨM</th><th>MÃ LÔ HÀNG</th><th>NGUỒN GỐC</th><th>TRẠNG THÁI</th><th><span class="sr-only">Chi tiết</span></th></tr></thead><tbody id="batch-rows">${batchRows(s)}</tbody></table></div>
      <div class="table-footer"><span>Trang ${s.page+1} / ${Math.max(1,Math.ceil(total/s.config.pageSize))} · ${total} lô trên ${s.mode==="demo"?"nguồn mẫu":"hợp đồng"}<br>Bộ lọc chỉ áp dụng cho trang hiện tại.</span>
      <div class="pagination"><button class="icon-button" data-action="previous-page" aria-label="Trang trước" ${s.page===0?"disabled":""}>${icon("chevron","rotate")}</button><span>${s.page+1}</span><button class="icon-button" data-action="next-page" aria-label="Trang sau" ${(s.page+1)*s.config.pageSize>=total?"disabled":""}>${icon("chevron")}</button></div></div>
    </section>${steps()}`;
}
export function batchRows(s) {
  const keyword = s.search.toLocaleLowerCase("vi");
  const rows = (s.pageData?.items||[]).filter(b => (s.statusFilter==="all" || (s.statusFilter==="verified" ? b.isVerified : !b.isVerified)) &&
    `${b.batchCode} ${b.productName} ${b.origin}`.toLocaleLowerCase("vi").includes(keyword));
  return rows.map(b => {
    const kind = productKind(b.productName);
    return `<tr><td><div class="product-cell"><span class="product-thumb ${kind.tone}">${icon(kind.icon)}</span><div><div class="product-name"><button class="product-link" data-action="view" data-code="${h(b.batchCode)}">${h(b.productName)}</button></div><div class="product-category">${kind.category}</div></div></td><td><span class="code">${h(b.batchCode)}</span></td><td class="origin-cell">${h(b.origin)}</td><td>${badge(b.isVerified)}</td><td><button class="icon-button" data-action="view" data-code="${h(b.batchCode)}" aria-label="Tra cứu ${h(b.batchCode)}">${icon("chevron")}</button></td></tr>`;
  }).join("") || '<tr><td class="empty-row" colspan="5">Không có lô phù hợp trên trang hiện tại.</td></tr>';
}
export function createPage(s) {
  return `${heading("Tạo lô hàng","Khởi tạo hồ sơ nguồn gốc cho một lô đặc sản mới.")}
    ${gate(s,"PRODUCER")}
    <div class="form-layout"><form id="create-form" class="panel form-panel" data-form="create">
      ${panelTitle("01 / THÔNG TIN LÔ HÀNG","Nguồn gốc bắt đầu từ đây","Thông tin sau khi ghi lên blockchain không thể sửa bằng giao diện này.")}${formError}
      ${field("batch-code","Mã lô hàng",{required:true,limit:64,placeholder:"HL-MEXUNG-2026-007",hint:"Mã duy nhất cho từng lô. Giữ nguyên chữ hoa/thường khi tra cứu.",side:'<button type="button" class="text-button" data-action="generate-code">Gợi ý mã</button>'})}
      ${field("product-name","Tên đặc sản",{required:true,limit:128,placeholder:"Ví dụ: Mè xửng truyền thống"})}
      ${field("origin","Nguồn gốc / cơ sở sản xuất",{required:true,limit:128,placeholder:"Ví dụ: Phú Hòa, Huế",hint:"Chỉ công khai thông tin cần thiết. Không nhập dữ liệu cá nhân nhạy cảm."})}
      ${metadataField("initial-uri")}
      <div class="form-bottom"><p>${s.mode==="demo"?"Chế độ mẫu không sử dụng ví thật hoặc ETH thật.":"Bạn sẽ kiểm tra phí và xác nhận trong ví trước khi gửi."}</p>${submit("Kiểm tra & tạo lô")}</div>
    </form><aside class="aside-notes">${economics(s)}
      <div class="panel side-panel"><h3>Ba điều cần nhớ</h3><div class="check-list">
      <div class="check-line">${icon("check")}<p>Chỉ ví được cấp quyền sản xuất mới tạo được lô.</p></div>
      <div class="check-line">${icon("check")}<p>Mã QR được tạo sau khi thao tác thành công.</p></div>
      <div class="check-line">${icon("check")}<p>Tên và nguồn gốc giới hạn theo byte UTF-8, không phải số chữ cái.</p></div></div></div>
    </aside></div>`;
}
export function checkpointPage(s) {
  const permitted = s.account ? WORKFLOW_ROLES.filter(k=>s.account.roles.includes(k)) : WORKFLOW_ROLES;
  return `${heading("Ghi nhận chặng","Thêm dấu mốc bàn giao, vận chuyển hoặc tiếp nhận hàng.")}${gate(s)}
    <div class="form-layout"><form class="panel form-panel" data-form="checkpoint">
      ${panelTitle("02 / HÀNH TRÌNH","Thêm một chặng mới","Mỗi dấu mốc gắn với ví, vai trò và thời điểm của người ghi nhận.")}${formError}
      ${field("checkpoint-code","Mã lô hàng",{required:true,limit:64,placeholder:"HL-MEXUNG-2026-001"})}
      ${selectField("checkpoint-role","Vai trò ký chặng",permitted.length ? permitted.map(k=>[k,ROLE_LABEL[k]]) : [["","Ví chưa có vai trò"]])}
      ${field("checkpoint-location","Địa điểm ghi nhận",{required:true,limit:128,placeholder:"Ví dụ: Kho trung chuyển, Huế"})}
      ${field("checkpoint-action","Hoạt động / nội dung bàn giao",{required:true,limit:2048,textarea:true,placeholder:"Ví dụ: Nhận lô hàng, kiểm tra bao bì và bàn giao vận chuyển."})}
      ${metadataField("checkpoint-uri")}
      <div class="form-bottom"><p>Thêm chặng không đồng nghĩa với cấp chứng nhận kiểm định.</p>${submit("Kiểm tra & ghi nhận")}</div>
    </form><aside class="aside-notes"><div class="panel side-panel"><h3>Đúng người, đúng vai trò</h3>
      <div class="check-list">${WORKFLOW_ROLES.map(k=>`<div class="check-line">${icon(ROLE_ICONS[k])}<p><strong>${ROLE_LABEL[k]}</strong><br>Ký bằng ví đã được cấp quyền tương ứng.</p></div>`).join("")}</div>
    </div><div class="panel side-panel"><h3>Lưu ý giới hạn hợp đồng</h3><p class="evidence-hint">Hàm thêm chặng có giới hạn ${s.rules?.maxCheckpoints??"—"} chặng/lô. Giao diện không xoá hoặc thay thế lịch sử đã ghi.</p></div></aside></div>`;
}
export function inspectorPage(s) {
  return `${heading("Kiểm định lô hàng","Ghi nhận hoặc thu hồi trạng thái kiểm định bằng ví được phân quyền.")}${gate(s,"INSPECTOR")}
    <div class="admin-grid"><form class="panel form-panel" data-form="verify">
      ${panelTitle("03 / XÁC NHẬN","Ghi nhận kiểm định","Dùng cho vai trò kiểm định hoặc chủ hợp đồng.")}${formError}
      ${field("verify-code","Mã lô hàng",{required:true,limit:64,placeholder:"HL-MEXUNG-2026-001"})}
      ${field("verify-note","Nội dung kiểm định",{textarea:true,limit:2048,placeholder:"Ghi rõ nội dung, phạm vi kiểm tra và kết quả."})}
      ${metadataField("certificate-uri","Hồ sơ / chứng từ kiểm định")}
      <div class="form-bottom"><p>Chỉ xác nhận khi đã kiểm tra chứng từ bên ngoài.</p>${submit("Xác nhận kiểm định","shield")}</div>
    </form><form class="panel form-panel" data-form="revoke-verification">
      ${panelTitle("THU HỒI TRẠNG THÁI","Thu hồi kiểm định","Lý do được ghi thêm vào lịch sử, không xoá chặng cũ.")}${formError}
      ${field("revoke-code","Mã lô hàng",{required:true,limit:64,placeholder:"Mã lô đang có trạng thái kiểm định"})}
      ${field("revoke-reason","Lý do thu hồi",{required:true,textarea:true,limit:2048,placeholder:"Nêu cụ thể lý do và căn cứ kiểm tra."})}
      ${note("Nhãn “đã kiểm định” chỉ phản ánh trạng thái do ví có quyền ghi nhận. DApp không tự xác minh giá trị pháp lý hay số sao OCOP.","amber")}
      <div class="form-bottom"><p>Thao tác làm thay đổi trạng thái công khai của lô.</p><button class="button button-danger submit-button" type="submit">${icon("alert")}Thu hồi kiểm định</button></div>
    </form></div>`;
}
export function stakePage(s) {
  const a = s.account, rules = s.rules;
  return `${heading("Ký quỹ uy tín","Theo dõi tiền cọc của ví và thời điểm được phép rút.")}${gate(s)}
    <div class="stake-hero"><h2>SỐ TIỀN ĐANG KÝ QUỸ ${s.mode==="demo"?"· MẪU":""}</h2><div class="stake-value">${h(formatETH(a?.stake))}<span>ETH</span></div>
      <div class="stake-lock">${icon("lock")}<span>${a ? BigInt(a.stake) ? `Mở khóa: ${dateTime(a.unlockAt)} · ${remainingTime(a.remaining)}` : "Ví chưa có tiền cọc." : "Kết nối ví để xem số dư ký quỹ."}</span></div>
    </div>
    <div class="stake-grid"><form class="panel form-panel" data-form="deposit">
      ${panelTitle("NẠP TIỀN CỌC","Ký quỹ thêm","Hợp đồng hiện cho phép mọi địa chỉ nạp cọc; quyền tạo lô được kiểm tra riêng.")}${formError}
      ${field("stake-amount","Số ETH muốn nạp",{required:true,placeholder:"0.05",value:"0.05",hint:`Mức cọc yêu cầu để tạo lô: ${h(formatETH(rules?.minStake))} ETH.`,extra:'inputmode="decimal"'})}
      ${note("Nếu cọc hiện tại còn khóa, nạp thêm giữ nguyên mốc mở khóa. Khi mốc cũ đã qua, lần nạp mới bắt đầu kỳ khóa mới.")}
      <div class="form-bottom"><p>ETH thử nghiệm trên Sepolia, không phải khoản đầu tư.</p>${submit("Kiểm tra & nạp cọc","wallet")}</div>
    </form><section class="panel form-panel withdraw-panel">
      ${panelTitle("RÚT TIỀN CỌC","Rút khi hết thời hạn","Hợp đồng rút toàn bộ tiền cọc của chính ví đang kết nối.")}
      ${infoRow("Ví đang kết nối",h(shortAddress(a?.address)))}
      ${infoRow("Tiền cọc",`${h(formatETH(a?.stake))} ETH`)}
      ${infoRow("Thời điểm mở khóa",a?.unlockAt ? h(dateTime(a.unlockAt)) : "Chưa có")}
      ${infoRow("Trạng thái",!a?"Chưa kết nối":a.remaining>0?"Đang khóa":"Có thể kiểm tra rút")}
      ${button("Kiểm tra & rút toàn bộ","withdraw","download","button-secondary",`${!a || !BigInt(a.stake) || a.remaining>0 ? "disabled" : ""}`)}
      <p class="evidence-hint">Thời gian được kiểm tra từ nguồn dữ liệu hiện tại. Bấm Làm mới khi đến hạn; hợp đồng quyết định cuối cùng. Rút cọc có thể khiến ví không còn đủ điều kiện tạo lô mới.</p>
      ${button("Làm mới trạng thái","refresh","refresh","button-ghost")}
    </section></div>`;
}
export function adminPage(s) {
  const owner = s.account?.isOwner;
  return `${heading("Quản trị hệ thống","Cấp quyền và điều chỉnh tham số của ProjectCore.")}${gate(s,"OWNER")}
    ${!owner ? `<section class="panel empty-state"><div class="empty-icon">${icon("key")}</div><h2>Khu vực dành cho chủ hợp đồng</h2><p>Quyền quản trị các hàm này được xác định bằng owner(), không chỉ bằng nhãn ROLE_ADMIN. ${s.mode==="demo"?"Chọn vai “Chủ hợp đồng” trong cửa sổ kết nối ví để thử.":""}</p>${button("Kiểm tra ví","connect","wallet","button-primary")}</section>` : `
    <div class="admin-grid"><form class="panel form-panel" data-form="role">
      ${panelTitle("PHÂN QUYỀN","Quản lý vai trò ví","Cấp hoặc thu hồi quyền tham gia chuỗi truy xuất.")}${formError}
      ${field("role-address","Địa chỉ ví",{required:true,placeholder:"0x…",extra:'spellcheck="false"'})}
      ${selectField("role-name","Vai trò",Object.keys(ROLE).map(k=>[k,ROLE_LABEL[k]]))}
      ${selectField("role-operation","Thao tác",[["grantRole","Cấp quyền"],["revokeRole","Thu hồi quyền"]])}
      ${note("Cấp ROLE_ADMIN không chuyển quyền sở hữu. Thu hồi vai trò cũng không thu hồi các quyền đặc biệt của owner().")}
      <div class="form-bottom"><p>Kiểm tra chính xác địa chỉ người nhận quyền.</p>${submit("Xác nhận thay đổi","key")}</div>
    </form><div>
      <form class="panel form-panel" data-form="fee">
        ${panelTitle("QUY TẮC KINH TẾ","Phí tạo lô","Trần do hợp đồng quy định, không thể vượt qua từ giao diện.")}${formError}
        ${field("new-fee","Phí tạo lô mới (ETH)",{required:true,value:formatETH(s.rules?.fee,18),hint:`Trần hiện tại: ${formatETH(s.rules?.feeLimit)} ETH.`,extra:'inputmode="decimal"'})}
        ${submit("Cập nhật phí","wallet")}
      </form><form class="panel form-panel" data-form="fund" style="margin-top:23px">
        ${panelTitle("VÍ NHẬN PHÍ","Cập nhật ví quỹ","Giao dịch này đổi nơi nhận phí tạo lô về sau.")}${formError}
        ${field("fund-address","Địa chỉ ví quỹ mới",{required:true,placeholder:"0x…",hint:`Ví hiện tại: ${h(s.rules?.ecosystemFund||"—")}`,extra:'spellcheck="false"'})}
        ${submit("Kiểm tra ví quỹ","arrow")}
      </form>
    </div><form class="panel form-panel" data-form="lock">
      ${panelTitle("THỜI GIAN KHÓA","Thay đổi kỳ khóa cọc mới","Không sửa hồi tố các mốc mở khóa đã được ghi.")}${formError}
      ${field("lock-days","Số ngày khóa",{required:true,value:String((s.rules?.lockDuration||0)/86400),hint:"Cho phép số nguyên từ 0. Đặt 0 ngày sẽ bỏ kỳ khóa cho các lần bắt đầu khóa mới.",extra:'inputmode="numeric"'})}
      ${submit("Cập nhật kỳ khóa","lock")}
    </form><div class="panel side-panel"><h3>Chức năng chưa có trong hợp đồng</h3>${note("README đề cập tịch thu cọc và thưởng người tố giác 50%. Mã ProjectCore công khai đã đối chiếu chưa có các hàm này; giao diện không tạo nút giả để thực hiện.","amber")}</div></div>`}`;
}
export function tracePage(s) {
  return `${heading("Tra cứu nguồn gốc","Một mã lô, toàn bộ hành trình. Không cần kết nối ví.")}
    <form class="panel trace-search" data-form="lookup"><label class="trace-input" for="lookup-code">${icon("search")}<input id="lookup-code" name="lookup-code" value="${h(s.detail?.batchCode||s.lookupInput||"")}" placeholder="Nhập mã lô hoặc dán liên kết QR…" required autocomplete="off"></label>
      ${submit("Tra cứu","arrow")}${button("Quét QR","scan","camera","button-secondary",'type="button"')}
      <p class="trace-hint">${s.mode==="demo" ? 'Thử nhanh: <button type="button" class="link-button" data-action="view" data-code="HL-MEXUNG-2026-001">HL-MEXUNG-2026-001</button> · Dữ liệu mẫu, không phải hồ sơ thật.' : "Dữ liệu hiển thị thuộc hợp đồng và mạng đang chọn, không tự đổi theo một QR lạ."}</p>${formError}
    </form>
    ${s.detail ? detail(s) : `<section class="panel empty-state"><div class="empty-icon">${icon("qr")}</div><h2>Khám phá câu chuyện của sản phẩm</h2><p>Nhập mã trên bao bì hoặc quét mã QR để xem nguồn gốc, các điểm bàn giao và trạng thái kiểm định.</p>${s.mode==="demo"?button("Xem một hành trình mẫu","sample","arrow","button-primary"):""}</section>`}`;
}
function detail(s) {
  const b = s.detail, kind = productKind(b.productName);
  const share = makeBatchURL(document.baseURI,b.batchCode,s.mode,s.config.contractAddress);
  const ev = s.evidence;
  return `<div class="detail-grid"><div>
    <article class="panel detail-card">
      <div class="detail-product"><span class="product-thumb ${kind.tone}">${icon(kind.icon)}</span><div><span class="eyebrow">${kind.category.toUpperCase()}</span><h2>${h(b.productName)}</h2><span class="code">${h(b.batchCode)}</span></div></div>
      ${badge(b.isVerified)} ${s.mode==="demo"?'<span class="badge badge-neutral">Hồ sơ minh hoạ</span>':`<span class="badge badge-neutral">Sepolia${b.blockNumber?` · Block ${b.blockNumber}`:""}</span>`}
      <dl class="detail-meta"><div><dt>Nguồn gốc khai báo</dt><dd>${h(b.origin)}</dd></div><div><dt>Thời điểm khởi tạo (giờ Việt Nam)</dt><dd>${dateTime(b.createdAt)}</dd></div><div><dt>Ví cơ sở sản xuất</dt><dd class="mono">${h(b.producer)}</dd></div><div><dt>Dấu mốc trong hành trình</dt><dd>${b.checkpoints.length} chặng đã ghi nhận</dd></div></dl>
    </article>
    <article class="panel timeline-card">
      <div class="section-title"><div><h2>Hành trình sản phẩm</h2><p>Từ khởi tạo đến dấu mốc gần nhất.</p></div><span class="badge badge-neutral">${b.checkpoints.length} CHẶNG</span></div>
      <ol class="timeline">${b.checkpoints.map((c,i)=>{
        const key = roleKey(c.role), link = safeURI(c.metadataURI);
        const log = ev?.logs?.find(e=>e.timestamp===c.timestamp && e.recorder.toLowerCase()===c.recorder.toLowerCase() && e.action===c.action && e.location===c.location && e.role.toLowerCase()===c.role.toLowerCase());
        return `<li class="timeline-item"><span class="timeline-node">${icon(ROLE_ICONS[key]||"route")}</span><div class="timeline-content"><div class="timeline-top"><h3>${h(c.action)}</h3><time>${dateTime(c.timestamp)}</time></div>
          <div class="timeline-location">${h(c.location)}</div><div class="timeline-actor"><span>${String(i+1).padStart(2,"0")} · ${h(roleLabel(c.role))}</span><span class="mono" title="${h(c.recorder)}">${h(shortAddress(c.recorder,10))}</span></div>
          <div class="timeline-evidence">${link?`<a href="${h(link)}" target="_blank" rel="noopener noreferrer">${icon("file")} Chứng từ bên ngoài</a>`:""}${/^sha256:/i.test(c.metadataURI)?`<span class="mono" title="${h(c.metadataURI)}">SHA-256: ${h(c.metadataURI.slice(7,19))}…</span>`:""}
          ${log && isTxHash(log.hash)?`<a href="${s.config.explorerUrl}/tx/${h(log.hash)}" target="_blank" rel="noopener noreferrer">${icon("external")} Xem giao dịch</a>`:""}</div></div></li>`;
      }).join("")}</ol>
      ${s.mode==="sepolia"?`<div class="form-bottom"><p>Đối soát sự kiện trong ${s.config.eventLookback.toLocaleString("vi-VN")} block gần nhất; không phải toàn bộ lịch sử giao dịch.</p>${button("Tìm giao dịch","evidence","link","button-secondary")}</div>`:""}
      ${ev&&!ev.demo?`<p class="evidence-hint">Đã tìm từ block ${ev.fromBlock} đến ${ev.toBlock}: ${ev.logs.length} sự kiện. Chặng cũ hơn hoặc không khớp dữ liệu sẽ không có liên kết Tx ở đây.</p>`:""}
    </article>
  </div><aside class="qr-side">
    <section class="panel qr-card"><h3>Mã QR truy xuất</h3><p>Quét để mở đúng hồ sơ lô hàng này.</p>
      <div class="qr-canvas-wrap"><canvas id="batch-qr" aria-label="Mã QR của lô ${h(b.batchCode)}"></canvas></div>
      <span class="code">${h(b.batchCode)}</span><div class="qr-actions">
        ${button("Tải mã QR","download-qr","download","button-primary")}
        ${button("Sao chép liên kết","copy-link","copy")}
        ${button("Xuất hồ sơ JSON","export","file","button-ghost")}
      </div><span class="qr-url">${h(share)}</span>
      ${note(s.mode==="demo"?"QR này mở dữ liệu mẫu, không phải dữ liệu blockchain.": "QR chỉ trỏ đến hồ sơ. Mã QR có thể bị sao chép; hãy đối chiếu thêm bao bì và chứng từ.")}
    </section><section class="panel side-panel"><h3>Đối chiếu tài liệu</h3><p class="evidence-hint" style="margin:0 0 15px">Tính SHA-256 của tài liệu trên máy và so với các mã băm đã ghi trong hành trình.</p>
      <label class="button button-secondary file-input-button">${icon("file")}Chọn tài liệu<input type="file" data-proof-file aria-label="Chọn tài liệu để đối chiếu SHA-256"></label><div id="proof-result" class="evidence-hint" aria-live="polite"></div>
    </section>
  </aside></div><div style="margin-top:20px">${note("Blockchain lưu lại thông tin do các ví khai báo; không tự đảm bảo chất lượng hoặc nguồn gốc thực tế của hàng hóa.")}</div>`;
}
export function guidePage() {
  return `${heading("Bắt đầu cùng HueLegend","Từ trải nghiệm mẫu đến thao tác với ví trên Sepolia.")}
    <div class="guide-grid">
      <article class="panel guide-card"><h2>01. Khám phá không cần ví</h2><p>Giữ chế độ “Trải nghiệm mẫu”, mở một lô hàng, xem timeline và tải QR. Đây là dữ liệu mô phỏng lưu riêng trong trình duyệt.</p><ol><li>Vào <strong>Tra cứu nguồn gốc</strong>.</li><li>Nhập mã lô hoặc chọn hành trình mẫu.</li><li>Mở hồ sơ, tải QR hoặc xuất JSON.</li></ol></article>
      <article class="panel guide-card"><h2>02. Thử luồng theo vai trò</h2><p>Trong chế độ mẫu, bấm <strong>Kết nối ví</strong> để chọn vai minh hoạ: cơ sở sản xuất, kiểm định hoặc chủ hợp đồng.</p><p>Chọn khách tra cứu để thử một thao tác không đủ quyền. Đây chỉ là kiểm thử giao diện/mô phỏng, không chứng minh độ an toàn của hợp đồng.</p></article>
      <article class="panel guide-card"><h2>03. Kết nối Sepolia</h2><ol><li>Đổi nguồn dữ liệu sang <strong>Sepolia Testnet</strong> ở góc trên.</li><li>Bấm <strong>Kết nối ví MetaMask</strong> (hệ thống tự động liên kết hợp đồng on-chain).</li><li>Chuyển mạng sang Sepolia khi MetaMask yêu cầu.</li><li>Chủ hợp đồng cấp vai; ví sản xuất nạp cọc trước khi tạo lô.</li></ol><p>Không nhập private key hoặc cụm từ khôi phục vào trang này. Khóa luôn nằm trong ví.</p></article>
      <article class="panel guide-card"><h2>04. Đọc phí và trạng thái</h2><p>Tra cứu là lời gọi đọc, không cần ký giao dịch. Tạo lô, thêm chặng, kiểm định và ký quỹ là lời gọi ghi; cần xác nhận trong ví và trả phí mạng.</p><p>DApp mô phỏng lời gọi trước khi gửi và chờ biên nhận. Khi giao dịch còn chờ, kiểm tra TxHash thay vì bấm gửi lại.</p></article>
      <article class="panel guide-card"><h2>05. Camera và tài liệu</h2><p>Camera cần HTTPS hoặc localhost và quyền truy cập. Khi không dùng được camera, chọn ảnh QR hoặc nhập mã thủ công. Trên điện thoại, thao tác ký thuận tiện hơn trong trình duyệt của ví.</p><p>Tính SHA-256 diễn ra trên máy, tối đa 10 MB/tài liệu. Trang không tự tải tài liệu lên IPFS; liên kết phải được bạn chuẩn bị trước.</p></article>
      <article class="panel guide-card"><h2>06. Phạm vi của phiên bản</h2><p>Giao diện kết nối với ProjectCore đã đối chiếu từ repo dẫn trong README. Chưa xác minh toàn bộ bytecode triển khai; cần chạy kiểm tra đọc và test giao dịch trên Sepolia của nhóm.</p><p>Chưa có luồng tịch thu cọc/thưởng tố giác trong mã hợp đồng đã đối chiếu. Không có token riêng, oracle tự động hoặc nút giả cho các chức năng này.</p></article>
    </div>`;
}
export function errorPage(s) {
  return `${heading("Chưa thể đọc dữ liệu","Không tự thay thế dữ liệu Sepolia bằng dữ liệu mẫu khi kết nối lỗi.")}
    <section class="panel empty-state"><div class="empty-icon">${icon("alert")}</div><h2>Kiểm tra nguồn dữ liệu</h2><p>${h(s.error)}</p><div class="hero-actions" style="justify-content:center;margin-top:20px">${button("Thử lại","refresh","refresh","button-primary")}</div><p class="evidence-hint" style="margin-top:20px">Để xem bố cục mà không cần mạng, chủ động chọn “Trải nghiệm mẫu” ở thanh trên.</p></section>`;
}
