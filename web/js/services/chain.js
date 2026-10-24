import { CONTRACT_ABI } from "../abi.js";
import { BackendReadClient } from "./backend.js";
import { ROLE } from "../roles.js";
import { loadEthers } from "../lib/libraries.js";
import { fault, isAddress, mapLimit } from "../lib/utils.js";

const WRITES = new Set(["createBatch","addCheckpoint","verifyBatch","revokeBatchVerification",
  "depositStake","withdrawStake","grantRole","revokeRole","setBatchCreationFee","setEcosystemFund","setStakeLockDuration"]);
const PAYABLE = new Set(["createBatch","depositStake"]);
function batchObject(b) {
  return { batchCode: b.batchCode, productName: b.productName, origin: b.origin,
    createdAt: Number(b.createdAt), producer: b.producer, isVerified: b.isVerified, exists: b.exists };
}
function checkpointObject(c) {
  return { timestamp: Number(c.timestamp), recorder: c.recorder, role: c.role,
    location: c.location, action: c.action, metadataURI: c.metadataURI };
}
export class ChainService {
  constructor(config, onWalletChanged = () => {}) {
    this.config = config; this.onWalletChanged = onWalletChanged;
    this.address = null; this.contextVersion = 0; this.listeners = []; this.ready = false;
    this.backend = new BackendReadClient(config); this.backendEnabled = false;
  }
  async init() {
    if (!isAddress(this.config.contractAddress)) throw new Error("Chưa triển khai hợp đồng trên Sepolia. Đang trong giai đoạn hoàn thiện luồng nghiệp vụ.");
    this.ethers = await loadEthers();
    const { JsonRpcProvider, FetchRequest, Contract, getAddress } = this.ethers;
    this.contractAddress = getAddress(this.config.contractAddress);
    const request = new FetchRequest(this.config.rpcUrl); request.timeout = 12000;
    this.provider = new JsonRpcProvider(request, undefined, { batchMaxCount: 1 });
    let network;
    try { network = await this.provider.getNetwork(); } catch (cause) { throw Object.assign(fault("NO_CONNECTION"), { cause }); }
    if (Number(network.chainId) !== this.config.chainId) throw fault("WRONG_NETWORK");
    if (await this.provider.getCode(this.contractAddress) === "0x") throw fault("NO_CONTRACT");
    this.contract = new Contract(this.contractAddress, CONTRACT_ABI, this.provider);
    this.interface = this.contract.interface;
    try {
      const rules = await this.getRules();
      await this.contract.getTotalBatches();
      const hashes = await Promise.all(Object.keys(ROLE).map(k => this.contract[`ROLE_${k}`]()));
      if (!hashes.every((h, i) => h.toLowerCase() === Object.values(ROLE)[i])) throw fault("ABI_MISMATCH");
      this.ready = true;
      this.backendEnabled = await this.backend.probe();
      return rules;
    } catch (cause) { throw Object.assign(fault("ABI_MISMATCH"), { cause }); }
  }
  async getRules() {
    const block = await this.provider.getBlock("latest");
    const options = { blockTag: block.number };
    const [fee, minStake, feeLimit, lock, owner, fund, maxCheckpoints] = await Promise.all([
      this.contract.batchCreationFee(options), this.contract.MIN_STAKE_AMOUNT(options),
      this.contract.MAX_BATCH_FEE_LIMIT(options), this.contract.stakeLockDuration(options),
      this.contract.owner(options), this.contract.ecosystemFund(options), this.contract.MAX_CHECKPOINTS_PER_BATCH(options)
    ]);
    return { fee, minStake, feeLimit, lockDuration: Number(lock), owner, ecosystemFund: fund,
      now: block.timestamp, blockNumber: block.number, maxCheckpoints: Number(maxCheckpoints) };
  }
  async getPage(page = 0, pageSize = 8) {
    if (this.backendEnabled) {
      try { return await this.backend.getPage(page, pageSize); }
      catch (error) { console.warn("HueLegend API khong san sang, chuyen doc RPC truc tiep:", error.message); }
    }
    const blockNumber = await this.provider.getBlockNumber(), overrides = { blockTag: blockNumber };
    const totalBig = await this.contract.getTotalBatches(overrides);
    if (totalBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Số lô vượt giới hạn hiển thị của trình duyệt.");
    const total = Number(totalBig);
    const indices = Array.from({ length: Math.min(pageSize, Math.max(0, total - page * pageSize)) }, (_, i) => total - 1 - page * pageSize - i);
    const items = await mapLimit(indices, 3, async index => {
      const code = await this.contract.getBatchCodeByIndex(index, overrides);
      return batchObject(await this.contract.getBatch(code, overrides));
    });
    return { total, items, blockNumber };
  }
  async getBatch(code) { return batchObject(await this.contract.getBatch(code)); }
  async getCheckpoints(code) { return (await this.contract.getCheckpoints(code)).map(checkpointObject); }
  async getDetails(code) {
    if (this.backendEnabled) {
      try { return await this.backend.getDetails(code); }
      catch (error) { console.warn("HueLegend API chi doc loi, dung RPC truc tiep:", error.message); }
    }
    const blockNumber = await this.provider.getBlockNumber(), overrides = { blockTag: blockNumber };
    const [batch, points] = await Promise.all([
      this.contract.getBatch(code, overrides), this.contract.getCheckpoints(code, overrides)
    ]);
    return { ...batchObject(batch), checkpoints: points.map(checkpointObject), blockNumber };
  }
  detectWallet() {
    const injected = globalThis.ethereum;
    return injected?.providers?.find(p => p.isMetaMask) || injected?.providers?.[0] || injected;
  }
  async connect() {
    const raw = this.detectWallet(); if (!raw) throw fault("NO_WALLET");
    let addresses;
    try {
      await raw.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      addresses = await raw.request({ method: "eth_accounts" });
    } catch {
      addresses = await raw.request({ method: "eth_requestAccounts" });
    }
    if (!addresses?.length) throw fault("NO_WALLET");
    this.detachWallet();
    this.raw = raw;
    this.address = this.ethers ? this.ethers.getAddress(addresses[0]) : addresses[0];
    this.contextVersion++;
    const changed = async accounts => {
      this.contextVersion++;
      this.address = accounts?.[0] ? (this.ethers ? this.ethers.getAddress(accounts[0]) : accounts[0]) : null;
      this.onWalletChanged();
    };
    const chainChanged = () => { this.contextVersion++; this.onWalletChanged(); };
    const disconnected = () => { this.address = null; this.contextVersion++; this.onWalletChanged(); };
    for (const [event, fn] of [["accountsChanged", changed], ["chainChanged", chainChanged], ["disconnect", disconnected]]) {
      raw.on?.(event, fn); this.listeners.push([event, fn]);
    }
    if (this.ready) {
      return this.getAccount();
    }
    const chain = await raw.request({ method: "eth_chainId" });
    const isCorrect = Number(BigInt(chain)) === this.config.chainId;
    return {
      address: this.address,
      isOwner: this.address.toLowerCase() === "0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c".toLowerCase(),
      roles: [],
      balance: 0n,
      stake: 0n,
      unlockAt: 0,
      remaining: 0,
      correctNetwork: isCorrect
    };
  }
  async switchNetwork() {
    const raw = this.raw || this.detectWallet(); if (!raw) throw fault("NO_WALLET");
    try {
      await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: this.config.chainHex }] });
    } catch (error) {
      const code = error.code ?? error.data?.originalError?.code;
      if (Number(code) !== 4902) throw error;
      await raw.request({ method: "wallet_addEthereumChain", params: [{
        chainId: this.config.chainHex, chainName: this.config.chainName,
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [this.config.rpcUrl], blockExplorerUrls: [this.config.explorerUrl]
      }] });
      await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: this.config.chainHex }] });
    }
    this.contextVersion++;
    return this.address ? this.getAccount() : null;
  }
  async getAccount() {
    if (!this.address) return null;
    const address = this.address, version = this.contextVersion;
    const [owner, checks, balance, info, chain] = await Promise.all([
      this.contract.owner(),
      Promise.all(Object.keys(ROLE).map(k => this.contract.hasRole(address, ROLE[k]))),
      this.provider.getBalance(address), this.contract.getStakeInfo(address),
      this.raw.request({ method: "eth_chainId" })
    ]);
    if (version !== this.contextVersion) throw fault("CONTEXT_CHANGED");
    return { address, isOwner: owner.toLowerCase() === address.toLowerCase(),
      roles: Object.keys(ROLE).filter((_, i) => checks[i]), balance,
      stake: info.balance, unlockAt: Number(info.unlockAt), remaining: Number(info.remainingSeconds),
      correctNetwork: Number(BigInt(chain)) === this.config.chainId };
  }
  async signingContract(expectedAddress = this.address) {
    if (!this.ready) throw fault("NO_CONNECTION");
    if (!this.raw || !expectedAddress) throw fault("NO_WALLET");
    const [chain, accounts] = await Promise.all([
      this.raw.request({ method: "eth_chainId" }), this.raw.request({ method: "eth_accounts" })
    ]);
    if (Number(BigInt(chain)) !== this.config.chainId) throw fault("WRONG_NETWORK");
    if (accounts?.[0]?.toLowerCase() !== expectedAddress.toLowerCase()) throw fault("CONTEXT_CHANGED");
    const provider = new this.ethers.BrowserProvider(this.raw);
    const signer = await provider.getSigner(expectedAddress);
    return { provider, signer, contract: this.contract.connect(signer) };
  }
  async prepare(method, args = [], value = 0n) {
    if (!WRITES.has(method)) throw new Error("Thao tác chưa được hỗ trợ.");
    const account = this.address, contextVersion = this.contextVersion;
    const { provider, contract } = await this.signingContract(account);
    const options = PAYABLE.has(method) ? { value } : {};
    await contract[method].staticCall(...args, options);
    const [gas, fee] = await Promise.all([contract[method].estimateGas(...args, options), provider.getFeeData()]);
    if (contextVersion !== this.contextVersion) throw fault("CONTEXT_CHANGED");
    const gasLimit = gas * 120n / 100n;
    return { method, args, value, account, contextVersion, gasLimit,
      networkFee: gasLimit * (fee.maxFeePerGas ?? fee.gasPrice ?? 0n), demo: false };
  }
  async send(prepared, onProgress = () => {}) {
    if (prepared.contextVersion !== this.contextVersion || prepared.account !== this.address) throw fault("CONTEXT_CHANGED");
    const { contract } = await this.signingContract(prepared.account);
    const options = { gasLimit: prepared.gasLimit, ...(PAYABLE.has(prepared.method) ? { value: prepared.value } : {}) };
    // Mo phong lai de bat thay doi phi/quyen truoc luc gui.
    await contract[prepared.method].staticCall(...prepared.args, options);
    if (prepared.contextVersion !== this.contextVersion) throw fault("CONTEXT_CHANGED");
    onProgress({ state: "signing", demo: false });
    const tx = await contract[prepared.method](...prepared.args, options);
    onProgress({ state: "pending", hash: tx.hash, demo: false, account: prepared.account });
    let receipt;
    try { receipt = await tx.wait(1, 120000); }
    catch (error) {
      if (error.code === "TRANSACTION_REPLACED" && !error.cancelled && error.receipt) {
        receipt = error.receipt;
      } else if (error.code === "TRANSACTION_REPLACED" && error.cancelled) {
        onProgress({ state: "cancelled", hash: error.replacement?.hash || tx.hash, demo: false });
        return { cancelled: true, hash: error.replacement?.hash || tx.hash };
      } else if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR" || !error.receipt) {
        onProgress({ state: "pending", hash: tx.hash, demo: false, account: prepared.account });
        return { pending: true, hash: tx.hash };
      } else {
        onProgress({ state: "failed", hash: tx.hash, demo: false });
        throw error;
      }
    }
    if (!receipt || receipt.status !== 1) {
      onProgress({ state: "failed", hash: receipt?.hash || tx.hash, demo: false });
      throw new Error("Giao dịch đã được ghi nhận nhưng bị hoàn tác. Kiểm tra trên Etherscan.");
    }
    onProgress({ state: "confirmed", hash: receipt.hash, demo: false, blockNumber: receipt.blockNumber });
    return { hash: receipt.hash, status: receipt.status, blockNumber: receipt.blockNumber, demo: false };
  }
  async checkReceipt(hash) { return this.provider.getTransactionReceipt(hash); }
  async getEvidence(code) {
    const latest = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - this.config.eventLookback + 1), logs = [];
    for (let end = latest; end >= fromBlock; end -= this.config.eventChunk) {
      const start = Math.max(fromBlock, end - this.config.eventChunk + 1);
      const result = await this.contract.queryFilter(this.contract.filters.CheckpointAdded(code), start, end);
      for (const event of result) logs.push({
        hash: event.transactionHash, blockNumber: event.blockNumber, logIndex: event.index,
        timestamp: Number(event.args.timestamp), recorder: event.args.recorder, role: event.args.role,
        action: event.args.action, location: event.args.location
      });
    }
    return { logs, fromBlock, toBlock: latest, partialHistory: true };
  }
  detachWallet() { for (const [event, fn] of this.listeners) this.raw?.removeListener?.(event, fn); this.listeners = []; }
  async disconnect() { this.detachWallet(); this.address = null; this.contextVersion++; this.raw = null; }
  destroy() { this.detachWallet(); this.provider?.destroy(); }
}
