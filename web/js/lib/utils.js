export const utf8Length = value => new TextEncoder().encode(String(value)).length;
export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
export const shortAddress = (address, n = 6) => address ? `${address.slice(0, n)}…${address.slice(-4)}` : "Chưa kết nối";
export const isAddress = value => /^0x[0-9a-fA-F]{40}$/.test(String(value)) && !/^0x0{40}$/.test(String(value));
export const isTxHash = value => /^0x[0-9a-fA-F]{64}$/.test(String(value));
export function assertText(value, label, limit, required = true) {
  const text = String(value ?? "").trim();
  if (required && !text) throw new Error(`Vui lòng nhập ${label.toLowerCase()}.`);
  if (utf8Length(text) > limit) throw new Error(`${label} vượt quá ${limit} byte UTF-8. Chữ tiếng Việt có thể chiếm nhiều byte.`);
  return text;
}
export function parseETH(value) {
  const text = String(value).trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(text)) throw new Error("Số ETH không hợp lệ. Dùng dấu chấm và tối đa 18 chữ số thập phân.");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}
export function formatETH(wei, digits = 8) {
  if (wei === null || wei === undefined) return "—";
  const n = BigInt(wei), abs = n < 0n ? -n : n;
  const whole = abs / 10n ** 18n;
  const decimals = (abs % 10n ** 18n).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  if (abs > 0n && whole === 0n && !decimals) return `<0.${"0".repeat(Math.max(digits - 1, 0))}1`;
  return `${n < 0n ? "-" : ""}${whole}${decimals ? "." + decimals : ""}`;
}
export function dateTime(seconds, short = false) {
  const date = new Date(Number(seconds) * 1000);
  if (!Number.isFinite(date.getTime()) || Number(seconds) <= 0) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(short ? {} : { hour: "2-digit", minute: "2-digit" }),
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}
export function remainingTime(seconds) {
  const n = Math.max(0, Math.ceil(Number(seconds)));
  if (!n) return "Đã đến hạn";
  const days = Math.floor(n / 86400), hours = Math.floor((n % 86400) / 3600);
  return days ? `${days} ngày ${hours} giờ` : hours ? `${hours} giờ ${Math.ceil((n % 3600) / 60)} phút` : `${Math.ceil(n / 60)} phút`;
}
export function safeURI(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (/^ipfs:\/\/[a-zA-Z0-9]+(?:\/[^\s]*)?$/.test(text)) {
    const [cid, ...parts] = text.slice(7).split("/");
    return `https://ipfs.io/ipfs/${cid}${parts.length ? "/" + parts.map(encodeURIComponent).join("/") : ""}`;
  }
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export function validateMetadata(value) {
  const text = assertText(value, "Chứng từ", 2048, false);
  if (text && !safeURI(text) && !/^sha256:[0-9a-f]{64}$/i.test(text)) {
    throw new Error("Chứng từ phải là HTTPS, ipfs:// hoặc sha256: kèm 64 ký tự hex.");
  }
  return text;
}
export function validateRPC(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error("RPC phải là URL HTTPS hợp lệ, không chứa tài khoản/mật khẩu."); }
}
export function makeBatchURL(base, code, mode, contractAddress) {
  const url = new URL(base); url.hash = ""; url.search = "";
  url.searchParams.set("batch", code); url.searchParams.set("mode", mode);
  if (mode === "sepolia") {
    url.searchParams.set("chainId", "11155111");
    url.searchParams.set("contract", contractAddress.toLowerCase());
  }
  url.hash = "/trace";
  return url.href;
}
export function parseBatchInput(raw, expected = {}) {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("Nhập mã lô hoặc quét mã QR trước khi tra cứu.");
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(text)) {
    let url;
    try { url = new URL(text); } catch { throw new Error("Liên kết QR không hợp lệ."); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Không mở liên kết không an toàn từ mã QR.");
    const mode = url.searchParams.get("mode"), chain = url.searchParams.get("chainId");
    const contract = url.searchParams.get("contract");
    if (mode && expected.mode && mode !== expected.mode) throw new Error(`QR thuộc chế độ ${mode === "demo" ? "mẫu" : "Sepolia"}. Hãy tự chuyển đúng chế độ trước.`);
    if (chain && chain !== "11155111") throw new Error("QR không thuộc Ethereum Sepolia.");
    if (contract && expected.contractAddress && contract.toLowerCase() !== expected.contractAddress.toLowerCase()) throw new Error("QR thuộc hợp đồng khác. Kiểm tra nguồn trước khi thay đổi cấu hình.");
    const code = url.searchParams.get("batch");
    if (!code) throw new Error("QR không chứa tham số mã lô batch.");
    return assertText(code, "Mã lô", 64);
  }
  return assertText(text, "Mã lô", 64);
}
export function serializeJSON(value) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
}
export function downloadText(text, filename, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function productKind(name) {
  const lower = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (lower.includes("tom")) return { icon: "bowl", tone: "peach", category: "Ẩm thực Huế" };
  if (lower.includes("non")) return { icon: "hat", tone: "sand", category: "Làng nghề" };
  if (lower.includes("tinh dau")) return { icon: "bottle", tone: "sage", category: "Thảo mộc" };
  if (lower.includes("tra")) return { icon: "leaf", tone: "sage", category: "Trà & thảo mộc" };
  return { icon: "box", tone: "mauve", category: "Đặc sản truyền thống" };
}
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; results[index] = await fn(items[index], index); }
  }));
  return results;
}
export function errorText(error, iface) {
  const map = {
    UnauthorizedCaller: "Ví này chưa được cấp đúng vai trò. Nhờ chủ hợp đồng cấp quyền trước khi thực hiện.",
    OwnableUnauthorizedAccount: "Chỉ chủ sở hữu hợp đồng mới được thay đổi quyền hoặc tham số.",
    BatchAlreadyExists: "Mã lô đã tồn tại. Hãy dùng một mã khác.",
    BatchNotFound: "Không tìm thấy mã lô trên nguồn dữ liệu đang chọn.",
    StakeTooLow: "Tiền cọc chưa đủ mức tối thiểu. Mở mục Ký quỹ để nạp thêm.",
    InsufficientBatchFee: "Phí gửi kèm chưa đủ. Làm mới tham số rồi thử lại.",
    StillLocked: "Tiền cọc còn trong thời gian khóa. Chưa thể rút.",
    NothingToWithdraw: "Ví chưa có tiền cọc để rút.",
    BatchAlreadyVerified: "Lô hàng đã được kiểm định.",
    BatchNotVerified: "Lô hàng hiện chưa có trạng thái kiểm định để thu hồi.",
    MaxCheckpointsExceeded: "Lô đã đạt giới hạn số chặng của hợp đồng.",
    StringTooLong: "Một trường vượt giới hạn byte UTF-8. Rút ngắn nội dung rồi thử lại.",
    EmptyString: "Một trường bắt buộc đang để trống.",
    FeeExceedsLimit: "Phí tạo lô vượt trần an toàn của hợp đồng.",
    TransferFailed: "Chuyển ETH không thành công. Toàn bộ giao dịch đã bị hoàn tác.",
    ZeroAmount: "Số tiền phải lớn hơn 0.",
    InvalidAddress: "Địa chỉ ví không hợp lệ.",
    OwnableInvalidOwner: "Địa chỉ chủ sở hữu không hợp lệ.",
    ReentrancyGuardReentrantCall: "Hợp đồng đã chặn một lời gọi tái nhập.",
    WRONG_NETWORK: "Ví đang ở mạng khác. Chuyển sang Ethereum Sepolia trước khi ký.",
    NO_WALLET: "Chưa tìm thấy ví trình duyệt. Mở trang trong trình duyệt của MetaMask hoặc cài tiện ích MetaMask.",
    CONTEXT_CHANGED: "Ví hoặc mạng vừa thay đổi. Kiểm tra lại rồi thực hiện từ đầu.",
    ACTION_REJECTED: "Bạn đã từ chối yêu cầu trong ví. Chưa có giao dịch nào được gửi.",
    INSUFFICIENT_FUNDS: "Ví không đủ ETH thử nghiệm để trả số tiền và phí mạng.",
    NO_CONTRACT: "Địa chỉ này chưa có mã hợp đồng trên Sepolia. Kiểm tra địa chỉ và RPC trong Cấu hình.",
    NO_CONNECTION: "Chưa kết nối được RPC Sepolia. Kiểm tra Internet hoặc đổi RPC trong Cấu hình.",
    ABI_MISMATCH: "Hợp đồng không trả về dữ liệu đúng ABI ProjectCore đã đối chiếu. Không gửi giao dịch; kiểm tra phiên bản hợp đồng."
  };
  const seen = new Set();
  function decode(node, depth = 0) {
    if (!node || depth > 6 || seen.has(node)) return null;
    if (typeof node === "object") {
      seen.add(node);
      if (node.revert?.name && map[node.revert.name]) return map[node.revert.name];
      if (map[node.code]) return map[node.code];
      if (node.code === 4001 || node.code === "4001") return map.ACTION_REJECTED;
      for (const key of ["data", "error", "info", "cause", "originalError"]) {
        const found = decode(node[key], depth + 1); if (found) return found;
      }
    } else if (typeof node === "string" && iface && /^0x[0-9a-f]+$/i.test(node)) {
      try { const parsed = iface.parseError(node); if (map[parsed?.name]) return map[parsed.name]; } catch {}
    }
    return null;
  }
  const decoded = decode(error); if (decoded) return decoded;
  const message = error?.shortMessage || error?.message || String(error);
  for (const [key, translated] of Object.entries(map)) if (message.includes(key)) return translated;
  if (/fetch|network|timeout|429|503|SERVER_ERROR/i.test(message)) return "RPC hoặc kết nối mạng đang chậm/giới hạn. Thử làm mới hoặc đổi RPC. Không gửi lại giao dịch đang chờ.";
  return message.length > 260 ? "Thao tác không thành công. Kiểm tra thông báo trong ví và cấu hình kết nối." : message;
}
export function fault(code, detail = "") { return Object.assign(new Error(detail || code), { code }); }
