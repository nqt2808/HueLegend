import { ROLE, WORKFLOW_ROLES } from "../roles.js";
import { STORAGE_KEYS } from "../config.js";
import { assertText, parseETH, isAddress, fault } from "../lib/utils.js";

// Du lieu mo phong chi phuc vu giao dien, khong phai bang chung on-chain.
export const DEMO_ACCOUNTS = Object.freeze({
  OWNER: "0x1000000000000000000000000000000000000001",
  PRODUCER: "0x2000000000000000000000000000000000000002",
  LOGISTICS: "0x3000000000000000000000000000000000000003",
  RETAILER: "0x4000000000000000000000000000000000000004",
  INSPECTOR: "0x5000000000000000000000000000000000000005",
  VISITOR: "0x6000000000000000000000000000000000000006"
});
function makeSeed(now) {
  const owner = DEMO_ACCOUNTS.OWNER;
  const accounts = {};
  for (const [key, address] of Object.entries(DEMO_ACCOUNTS)) {
    accounts[address] = {
      roles: key === "OWNER" ? ["ADMIN", "PRODUCER"] : WORKFLOW_ROLES.includes(key) ? [key] : [],
      balance: parseETH("10").toString(),
      stake: key === "PRODUCER" ? parseETH("0.05").toString() : "0",
      unlockAt: key === "PRODUCER" ? now + 25 * 86400 : 0
    };
  }
  const products = [
    ["HL-TRAM-2026-006", "Tinh dầu tràm", "Phú Lộc, Huế", false],
    ["HL-NON-2026-005", "Nón bài thơ", "Làng Tây Hồ, Huế", true],
    ["HL-TRA-2026-004", "Trà cung đình", "Kim Long, Huế", false],
    ["HL-TOMCHUA-2026-003", "Tôm chua Huế", "Phú Hội, Huế", true],
    ["HL-MEXUNG-2026-002", "Mè xửng mè đen", "Phú Hòa, Huế", false],
    ["HL-MEXUNG-2026-001", "Mè xửng truyền thống", "Phú Hòa, Huế", true]
  ];
  const batches = products.map(([batchCode, productName, origin, isVerified], i) => {
    const createdAt = now - (8 - i) * 86400;
    const checkpoints = [{
      timestamp: createdAt, recorder: DEMO_ACCOUNTS.PRODUCER, role: ROLE.PRODUCER,
      location: origin, action: "Khởi tạo lô tại cơ sở sản xuất mẫu", metadataURI: ""
    }];
    if (isVerified) checkpoints.push({
      timestamp: createdAt + 3600, recorder: DEMO_ACCOUNTS.INSPECTOR, role: ROLE.INSPECTOR,
      location: "Điểm kiểm định mẫu, Huế", action: "Kiểm định hồ sơ lô hàng (minh hoạ)", metadataURI: ""
    });
    checkpoints.push({
      timestamp: createdAt + 7200, recorder: DEMO_ACCOUNTS.LOGISTICS, role: ROLE.LOGISTICS,
      location: "Kho trung chuyển mẫu, Huế", action: "Tiếp nhận và bàn giao vận chuyển", metadataURI: ""
    });
    if (isVerified) checkpoints.push({
      timestamp: createdAt + 14400, recorder: DEMO_ACCOUNTS.RETAILER, role: ROLE.RETAILER,
      location: "Điểm bán mẫu, Đông Ba", action: "Nhận hàng tại điểm bán", metadataURI: ""
    });
    return { batchCode, productName, origin, createdAt, producer: DEMO_ACCOUNTS.PRODUCER, isVerified, exists: true, checkpoints };
  });
  return { version: 1, owner, accounts, batches, fee: parseETH("0.001").toString(), lockDuration: 30 * 86400, fund: owner, events: [] };
}
export class DemoService {
  constructor({ storage, now = () => Math.floor(Date.now()/1000) } = {}) {
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; } this.clock = now; this.address = null; this.contextVersion = 0;
    try {
      const data = JSON.parse(this.storage?.getItem(STORAGE_KEYS.demo) || "null");
      this.data = data?.version === 1 && Array.isArray(data.batches) && data.accounts ? data : makeSeed(this.clock());
    } catch { this.data = makeSeed(this.clock()); }
  }
  async init() { return this.getRules(); }
  async getRules() {
    return { fee: BigInt(this.data.fee), minStake: parseETH("0.05"), feeLimit: parseETH("0.01"),
      lockDuration: this.data.lockDuration, owner: this.data.owner, ecosystemFund: this.data.fund,
      now: this.clock(), maxCheckpoints: 50 };
  }
  async getPage(page = 0, pageSize = 8) {
    const reversed = [...this.data.batches].reverse();
    return { total: reversed.length, items: structuredClone(reversed.slice(page * pageSize, (page + 1) * pageSize)) };
  }
  async getBatch(code) {
    const batch = this.data.batches.find(item => item.batchCode === code);
    if (!batch) throw fault("BatchNotFound");
    return structuredClone(batch);
  }
  async getCheckpoints(code) { return (await this.getBatch(code)).checkpoints; }
  async connect(persona = "PRODUCER") {
    if (!DEMO_ACCOUNTS[persona]) throw fault("InvalidAddress");
    this.address = DEMO_ACCOUNTS[persona]; this.contextVersion++;
    return this.getAccount();
  }
  async disconnect() { this.address = null; this.contextVersion++; }
  async getAccount() {
    if (!this.address) return null;
    const data = this.data.accounts[this.address];
    return { address: this.address, roles: this.address === this.data.owner ? [...Object.keys(ROLE)] : [...data.roles],
      isOwner: this.address === this.data.owner, balance: BigInt(data.balance), stake: BigInt(data.stake),
      unlockAt: data.unlockAt, remaining: Math.max(0, data.unlockAt - this.clock()), correctNetwork: true };
  }
  evaluate(method, args, value) {
    if (!this.address) throw fault("NO_WALLET");
    const data = structuredClone(this.data), account = data.accounts[this.address];
    const isOwner = this.address === data.owner, now = this.clock();
    const needRole = key => { if (!isOwner && !account.roles.includes(key)) throw fault("UnauthorizedCaller"); };
    const needOwner = () => { if (!isOwner) throw fault("OwnableUnauthorizedAccount"); };
    const find = code => { const batch = data.batches.find(x => x.batchCode === code); if (!batch) throw fault("BatchNotFound"); return batch; };
    const add = (batch, role, location, action, metadataURI = "") => batch.checkpoints.push({
      timestamp: now, recorder: this.address, role, location, action, metadataURI
    });
    let spent = 0n;
    if (value < 0n || BigInt(account.balance) < value) throw fault("INSUFFICIENT_FUNDS");
    switch (method) {
      case "createBatch": {
        needRole("PRODUCER");
        const [code, name, origin, uri] = args;
        assertText(code, "Mã lô", 64); assertText(name, "Tên đặc sản", 128); assertText(origin, "Nguồn gốc", 128);
        if (data.batches.some(b => b.batchCode === code)) throw fault("BatchAlreadyExists");
        if (!isOwner && BigInt(account.stake) < parseETH("0.05")) throw fault("StakeTooLow");
        const fee = isOwner ? 0n : BigInt(data.fee);
        if (value < fee) throw fault("InsufficientBatchFee");
        const batch = { batchCode: code, productName: name, origin, producer: this.address, createdAt: now, isVerified: false, exists: true, checkpoints: [] };
        add(batch, ROLE.PRODUCER, origin, "Khởi tạo lô hàng đặc sản tại cơ sở sản xuất", uri);
        data.batches.push(batch); spent = fee; break;
      }
      case "addCheckpoint": {
        const [code, role, location, action, uri] = args;
        const batch = find(code), key = Object.keys(ROLE).find(k => ROLE[k] === role);
        needRole(key); assertText(location, "Địa điểm", 128); assertText(action, "Hoạt động", 2048);
        if (batch.checkpoints.length >= 50) throw fault("MaxCheckpointsExceeded");
        add(batch, role, location, action, uri); break;
      }
      case "verifyBatch": {
        needRole("INSPECTOR"); const [code, note, uri] = args; const batch = find(code);
        if (batch.isVerified) throw fault("BatchAlreadyVerified");
        batch.isVerified = true;
        add(batch, ROLE.INSPECTOR, "Trung tâm kiểm định mẫu, Huế", note || "Xác nhận kiểm định (minh hoạ)", uri); break;
      }
      case "revokeBatchVerification": {
        needRole("INSPECTOR"); const [code, reason] = args; const batch = find(code);
        if (!batch.isVerified) throw fault("BatchNotVerified"); assertText(reason, "Lý do", 2048);
        batch.isVerified = false; add(batch, ROLE.INSPECTOR, "Trung tâm kiểm định mẫu, Huế", `Thu hồi kiểm định: ${reason}`); break;
      }
      case "depositStake": {
        if (value === 0n) throw fault("ZeroAmount");
        account.stake = (BigInt(account.stake) + value).toString();
        if (now >= account.unlockAt) account.unlockAt = now + data.lockDuration;
        spent = value; break;
      }
      case "withdrawStake": {
        if (!BigInt(account.stake)) throw fault("NothingToWithdraw");
        if (now < account.unlockAt) throw fault("StillLocked");
        spent = -BigInt(account.stake); account.stake = "0"; account.unlockAt = 0; break;
      }
      case "grantRole":
      case "revokeRole": {
        needOwner(); const [address, role] = args;
        if (!isAddress(address)) throw fault("InvalidAddress");
        const key = Object.keys(ROLE).find(k => ROLE[k] === role);
        if (!key) throw fault("UnauthorizedCaller");
        const target = data.accounts[address.toLowerCase()] ||= { roles: [], balance: parseETH("10").toString(), stake: "0", unlockAt: 0 };
        target.roles = method === "grantRole" ? [...new Set([...target.roles, key])] : target.roles.filter(k => k !== key); break;
      }
      case "setBatchCreationFee": {
        needOwner(); const fee = BigInt(args[0]); if (fee < 0n || fee > parseETH("0.01")) throw fault("FeeExceedsLimit");
        data.fee = fee.toString(); break;
      }
      case "setStakeLockDuration": {
        needOwner(); const duration = Number(args[0]); if (!Number.isSafeInteger(duration) || duration < 0) throw new Error("Thời gian không hợp lệ.");
        data.lockDuration = duration; break;
      }
      case "setEcosystemFund": {
        needOwner(); if (!isAddress(args[0])) throw fault("InvalidAddress"); data.fund = args[0].toLowerCase(); break;
      }
      default: throw new Error("Thao tác chưa được hỗ trợ.");
    }
    account.balance = (BigInt(account.balance) - spent).toString();
    return data;
  }
  async prepare(method, args = [], value = 0n) {
    this.evaluate(method, args, value);
    return { method, args, value, networkFee: 0n, account: this.address, contextVersion: this.contextVersion, demo: true };
  }
  async send(prepared, onProgress = () => {}) {
    if (prepared.contextVersion !== this.contextVersion || prepared.account !== this.address) throw fault("CONTEXT_CHANGED");
    onProgress({ state: "signing", demo: true });
    const next = this.evaluate(prepared.method, prepared.args, prepared.value);
    const id = `DEMO-${this.clock()}-${next.events.length + 1}`;
    next.events.push({ id, method: prepared.method, account: this.address, timestamp: this.clock(), demo: true });
    this.data = next;
    try { this.storage?.setItem(STORAGE_KEYS.demo, JSON.stringify(this.data)); } catch {}
    onProgress({ state: "confirmed", demo: true, id });
    return { demo: true, id, hash: null, status: 1 };
  }
  async getEvidence() { return { logs: [], demo: true }; }
  async reset() { this.data = makeSeed(this.clock()); try { this.storage?.removeItem(STORAGE_KEYS.demo); } catch {} }
  destroy() {}
}
