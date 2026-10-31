const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-access-tests-'));
after(() => fs.rmSync(temp, { recursive: true, force: true }));
for (const name of ['access', 'walletSession']) {
  const source = fs.readFileSync(path.join(root, 'src/lib', name + '.ts'), 'utf8');
  fs.writeFileSync(path.join(temp, name + '.js'), ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText);
}
const access = require(path.join(temp, 'access.js'));
const { WalletSessionController, withDeadline } = require(path.join(temp, 'walletSession.js'));
const { visibleTabs, canVisitTab, canPerform, emptyPermissions, guestSession, normalizeWorkspace, SEPOLIA_CHAIN } = access;
const A = '0x' + 'a'.repeat(40);
const B = '0x' + 'b'.repeat(40);
const C = '0x' + 'c'.repeat(40);
const pause = () => new Promise(resolve => setImmediate(resolve));
class MockWallet extends EventEmitter {
  account = A;
  chain = SEPOLIA_CHAIN;
  calls = [];
  rejectConnect = false;
  rejectSwitch = false;
  unknownChain = false;
  async request({ method, params }) {
    this.calls.push(method);
    if (method === 'eth_accounts') return this.account ? [this.account] : [];
    if (method === 'eth_chainId') return this.chain;
    if (method === 'eth_requestAccounts') {
      if (this.rejectConnect) throw { code: 4001 };
      return this.account ? [this.account] : [];
    }
    if (method === 'wallet_switchEthereumChain') {
      if (this.rejectSwitch) throw { code: 4001 };
      if (this.unknownChain) throw { code: 4902 };
      this.chain = params[0].chainId;
      this.emit('chainChanged', this.chain);
      return null;
    }
    if (method === 'wallet_addEthereumChain') { this.unknownChain = false; return null; }
    throw Error('Unexpected RPC method: ' + method);
  }
  changeAccount(account) { this.account = account; this.emit('accountsChanged', account ? [account] : []); }
  changeChain(chain) { this.chain = chain; this.emit('chainChanged', chain); }
}
function fixture(roles = {}, owner = C) {
  const provider = new MockWallet();
  const permissions = {};
  for (const [address, values] of Object.entries(roles)) permissions[address] = { ...emptyPermissions(), ...values };
  const reader = { async permissions(account) { return { ...emptyPermissions(), ...(permissions[account] || {}), owner: access.sameAddress(owner, account) }; } };
  const controller = new WalletSessionController(provider, reader);
  controller.attach();
  return { provider, reader, controller, permissions };
}
function session(workspace, permissions = {}) {
  return { ...guestSession(), status: 'ready', account: A, chainId: SEPOLIA_CHAIN, workspace,
    permissions: { ...emptyPermissions(), ...permissions } };
}

test('Guest sees exactly overview and store', () => assert.deepEqual(visibleTabs(guestSession()), ['overview', 'store']));
test('Forged selected role without connected account cannot open menus', () => {
  assert.deepEqual(visibleTabs({ ...guestSession(), workspace: 'ADMIN', permissions: { ...emptyPermissions(), owner: true } }), ['overview', 'store']);
});
for (const status of ['guest', 'connecting', 'checking', 'wrong-network', 'error']) {
  test('No privileged menus during status ' + status, () => {
    assert.deepEqual(visibleTabs({ ...session('ADMIN', { owner: true }), status }), ['overview', 'store']);
  });
}
const matrices = {
  CUSTOMER: ['overview', 'lookup', 'store'],
  PRODUCER: ['overview', 'lookup', 'store', 'create-batch'],
  INSPECTOR: ['overview', 'lookup', 'store', 'inspector'],
  LOGISTICS: ['overview', 'lookup', 'store', 'checkpoint'],
  RETAILER: ['overview', 'lookup', 'store', 'retailer'],
  ADMIN: ['overview', 'lookup', 'store', 'create-batch', 'inspector', 'checkpoint', 'retailer', 'admin'],
};
for (const [role, expected] of Object.entries(matrices)) {
  test('Menu matrix: ' + role, () => {
    const p = role === 'ADMIN' ? { owner: true } : role === 'CUSTOMER' ? {} : { ['ROLE_' + role]: true };
    assert.deepEqual(visibleTabs(session(role, p)), expected);
  });
}
test('ROLE_ADMIN alone is not owner for onlyOwner management methods', () => {
  assert.equal(canPerform(session('ADMIN', { ROLE_ADMIN: true }), 'ADMIN'), false);
  assert.deepEqual(visibleTabs(session('ADMIN', { ROLE_ADMIN: true })), ['overview', 'store']);
});
test('Owner may work in producer mode without exposing inspector/admin menus', () => {
  assert.deepEqual(visibleTabs(session('PRODUCER', { owner: true })), matrices.PRODUCER);
  assert.equal(canPerform(session('PRODUCER', { owner: true }), 'INSPECTOR'), false);
});
test('Multiple roles do not leak into a different chosen workspace', () => {
  const current = session('PRODUCER', { ROLE_PRODUCER: true, ROLE_INSPECTOR: true });
  assert.equal(canVisitTab('inspector', current), false);
  assert.equal(canPerform(current, 'INSPECTOR'), false);
});
test('Public QR lookup remains readable; private paths are denied', () => {
  assert.equal(canVisitTab('lookup', guestSession()), true);
  for (const tab of ['admin', 'create-batch', 'inspector', 'checkpoint', 'retailer', 'unknown']) {
    assert.equal(canVisitTab(tab, guestSession()), false, tab);
  }
});
test('Unknown legacy ALL does not become administrator', () => assert.equal(normalizeWorkspace('ALL'), 'CUSTOMER'));
test('Role aliases map to producer and retailer', () => {
  assert.equal(normalizeWorkspace('SUPPLY_CHAIN'), 'PRODUCER');
  assert.equal(normalizeWorkspace('COMMERCE'), 'RETAILER');
});
for (const role of ['PRODUCER', 'INSPECTOR', 'LOGISTICS', 'RETAILER']) {
  test('Connect accepts verified ' + role, async () => {
    const f = fixture({ [A]: { ['ROLE_' + role]: true } });
    await f.controller.connect(role);
    assert.deepEqual(visibleTabs(f.controller.getSnapshot()), matrices[role]);
    assert.equal(await f.controller.authorize(role), A);
    f.controller.destroy();
  });
}
test('Choosing Admin with ordinary wallet is downgraded to customer', async () => {
  const f = fixture(); await f.controller.connect('ADMIN');
  assert.equal(f.controller.getSnapshot().workspace, 'CUSTOMER');
  assert.ok(f.controller.getSnapshot().notice);
  await assert.rejects(f.controller.authorize('ADMIN'));
  f.controller.destroy();
});
test('Owner is read dynamically rather than tied to a fixed address', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN');
  assert.equal(await f.controller.authorize('ADMIN'), A);
  f.controller.destroy();
});
test('A previously authorized extension does not auto-login on page load', () => {
  const f = fixture({}, A);
  f.provider.emit('accountsChanged', [A]);
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  assert.equal(f.provider.calls.length, 0);
  f.controller.destroy();
});
test('Switching away from Admin removes private menus immediately', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN');
  f.provider.changeAccount(B);
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  await pause(); await pause();
  assert.equal(f.controller.getSnapshot().account, B);
  assert.equal(f.controller.getSnapshot().workspace, 'CUSTOMER');
  f.controller.destroy();
});
test('Wallet lock clears account and privileges', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN');
  f.provider.changeAccount(null); await pause();
  assert.equal(f.controller.getSnapshot().account, null);
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('Wrong network clears private menus and recovery rechecks roles', async () => {
  const f = fixture({ [A]: { ROLE_PRODUCER: true } }); await f.controller.connect('PRODUCER');
  f.provider.changeChain('0x1');
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  await pause(); assert.equal(f.controller.getSnapshot().status, 'wrong-network');
  f.provider.changeChain(SEPOLIA_CHAIN); await pause(); await pause();
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), matrices.PRODUCER);
  f.controller.destroy();
});
test('User refusal to connect does not unlock anything', async () => {
  const f = fixture({}, A); f.provider.rejectConnect = true; await f.controller.connect('ADMIN');
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('User refusal to switch network does not unlock anything', async () => {
  const f = fixture({}, A); f.provider.chain = '0x1'; f.provider.rejectSwitch = true;
  await f.controller.connect('ADMIN'); assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('Missing chain is added and switched before verification', async () => {
  const f = fixture({}, A); f.provider.chain = '0x1'; f.provider.unknownChain = true;
  await f.controller.connect('ADMIN');
  assert.ok(f.provider.calls.includes('wallet_addEthereumChain'));
  assert.equal(f.controller.getSnapshot().workspace, 'ADMIN');
  f.controller.destroy();
});
test('RPC role failure is fail-closed, not fallback permission', async () => {
  const f = fixture({}, A); f.reader.permissions = async () => { throw Error('RPC down'); };
  await f.controller.connect('ADMIN');
  assert.equal(f.controller.getSnapshot().status, 'error');
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('Revoked permission blocks signing without waiting for page reload', async () => {
  const f = fixture({ [A]: { ROLE_PRODUCER: true } }); await f.controller.connect('PRODUCER');
  f.permissions[A].ROLE_PRODUCER = false;
  await assert.rejects(f.controller.authorize('PRODUCER'));
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('Disconnect is local logout and extension events do not log user in again', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN'); f.controller.disconnect();
  f.provider.changeAccount(A); await pause();
  assert.deepEqual(visibleTabs(f.controller.getSnapshot()), ['overview', 'store']);
  f.controller.destroy();
});
test('Stale RPC reply cannot restore old Admin after logout', async () => {
  const f = fixture({}, A); let resolve;
  f.reader.permissions = () => new Promise(r => { resolve = r; });
  const pending = f.controller.connect('ADMIN'); await pause();
  f.controller.disconnect(); resolve({ ...emptyPermissions(), owner: true }); await pending;
  assert.deepEqual(f.controller.getSnapshot(), guestSession());
  f.controller.destroy();
});
test('Stale verification cannot overwrite another wallet refresh', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN');
  const original = f.reader.permissions; let resolve;
  f.reader.permissions = account => account === A ? new Promise(r => { resolve = r; }) : original(account);
  const old = f.controller.refresh(); await pause();
  f.provider.changeAccount(B); await pause(); await pause();
  resolve({ ...emptyPermissions(), owner: true }); await old;
  assert.equal(f.controller.getSnapshot().account, B);
  assert.equal(f.controller.getSnapshot().workspace, 'CUSTOMER');
  f.controller.destroy();
});
test('Silent revalidation preserves current workspace while healthy', async () => {
  const f = fixture({}, A); await f.controller.connect('ADMIN');
  const seen = []; const stop = f.controller.subscribe(s => seen.push(s.status));
  await f.controller.refresh(true);
  assert.deepEqual(seen, ['ready']); stop(); f.controller.destroy();
});
test('Listeners are removed on destroy', () => {
  const f = fixture(); assert.equal(f.provider.listenerCount('accountsChanged'), 1);
  f.controller.destroy(); assert.equal(f.provider.listenerCount('accountsChanged'), 0);
  assert.equal(f.provider.listenerCount('chainChanged'), 0);
  assert.equal(f.provider.listenerCount('disconnect'), 0);
});
test('Role read timeout rejects instead of hanging indefinitely', async () => {
  await assert.rejects(withDeadline(new Promise(() => {}), 5));
});

// Kiem tra cay component tu source that; React/icon duoc gia lap, khong phai E2E MetaMask.
const react = {
  createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity) }; },
  useState(value) { return [typeof value === 'function' ? value() : value, () => {}]; },
  useMemo(fn) { return fn(); },
};
function loadComponent(name) {
  const filename = path.join(root, 'src/components', name + '.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const m = new Module(filename, module);
  m.filename = filename;
  m.require = name => {
    if (name === 'react') return { __esModule: true, default: react, ...react };
    if (name === 'lucide-react') return new Proxy({}, { get(_, key) { return String(key); } });
    if (name.includes('constants')) return { CONTRACT_ADDRESS: C, ETHERSCAN_BASE_URL: 'https://sepolia.etherscan.io' };
    if (name.includes('lib/access')) return access;
    if (name.includes('useDraggable')) return { useDraggable: () => ({ modalStyle: {}, dragHeaderProps: {} }) };
    if (name.includes('types')) return { SPECIALTY_CATEGORIES: [] };
    throw Error('Unexpected component import: ' + name);
  };
  m._compile(compiled, filename);
  return m.exports[name];
}
function allNodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.children || []).flatMap(allNodes)];
}
const Sidebar = loadComponent('Sidebar');
const MobileNav = loadComponent('MobileNav');
const Overview = loadComponent('OverviewTab');
for (const role of ['GUEST', ...Object.keys(matrices)]) {
  test('Actual desktop and mobile component menus agree for ' + role, () => {
    const tabs = role === 'GUEST' ? ['overview', 'store'] : matrices[role];
    const props = { allowedTabs: tabs, activeTab: 'overview', onTabChange() {}, isOpenMobileMenu: true, onToggleMobileMenu() {} };
    const desktop = allNodes(Sidebar(props)).filter(n => n.props['data-nav-id']).map(n => n.props['data-nav-id']);
    const mobile = [...new Set(allNodes(MobileNav(props)).filter(n => n.props['data-nav-id']).map(n => n.props['data-nav-id']))];
    assert.deepEqual(desktop, tabs);
    assert.deepEqual(mobile.sort(), [...tabs].sort());
  });
}
test('Guest overview CTAs open store/connection, never create batch', () => {
  const navigations = []; let connections = 0;
  const tree = Overview({ batches: {}, canCreateBatch: false, canUseLookupMenu: false, isConnected: false,
    onNavigateTab: t => navigations.push(t), onConnectWallet: () => connections++, onSelectBatchForQR() {} });
  for (const n of allNodes(tree)) if (n.type === 'button') n.props.onClick?.();
  assert.ok(navigations.length > 0);
  assert.ok(navigations.every(t => t === 'store'));
  assert.equal(connections, 1);
});
test('Producer overview exposes creation CTA', () => {
  const navigations = [];
  const tree = Overview({ batches: {}, canCreateBatch: true, canUseLookupMenu: true, isConnected: true,
    onNavigateTab: t => navigations.push(t), onConnectWallet() {}, onSelectBatchForQR() {} });
  for (const n of allNodes(tree)) if (n.type === 'button') n.props.onClick?.();
  assert.ok(navigations.includes('create-batch'));
});
test('No fixed role-wallet constant and no cached authorization in App', () => {
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const constants = fs.readFileSync(path.join(root, 'src/constants.ts'), 'utf8');
  assert.ok(!app.includes('DEFAULT_ADMIN_ADDRESS'));
  assert.ok(!constants.includes('DEFAULT_ADMIN_ADDRESS'));
  assert.ok(!/localStorage\.getItem\(['"]hl_(user_role|connected_account|granted_wallets)/.test(app));
  assert.ok(app.includes('canVisitTab(activeTab, access)'));
  assert.ok(app.includes("wallet.authorizedSigner('ADMIN')"));
  assert.ok(app.includes('grantRole(normalizedAccount, roleHash)'));
  assert.ok(app.includes('revokeRole(normalizedAccount, roleHash)'));
});
test('Role hashes and grantRole argument order follow supplied Solidity', () => {
  const solidity = fs.readFileSync(path.join(root, 'contracts/project/ProjectCore.sol'), 'utf8');
  const constants = fs.readFileSync(path.join(root, 'src/constants.ts'), 'utf8');
  for (const role of access.CHAIN_ROLES) {
    assert.ok(solidity.includes(`keccak256("${role}")`));
    assert.ok(constants.includes(`ethers.id('${role}')`));
  }
  assert.match(solidity, /function grantRole\(address account, bytes32 role\)/);
  assert.ok(constants.includes('function grantRole(address account, bytes32 role)'));
});
test('Customer checkout does not mint a fake transaction or borrow retailer privileges', () => {
  const store = fs.readFileSync(path.join(root, 'src/components/StoreTab.tsx'), 'utf8');
  assert.ok(!store.includes('Math.random()'));
  assert.ok(!store.includes('await onAddCheckpoint('));
});
const Checkpoint = loadComponent('CheckpointTab');
test('Transporter cannot select producer or retailer in checkpoint form', () => {
  const tree = Checkpoint({ batches: {}, currentAccount: A, isLogisticsRole: true,
    allowedRoles: ['ROLE_LOGISTICS'], onAddCheckpoint: async () => {} });
  const roles = allNodes(tree).filter(n => n.type === 'option' && String(n.props.value).startsWith('ROLE_')).map(n => n.props.value);
  assert.deepEqual(roles, ['ROLE_LOGISTICS']);
});
test('Owner can choose the supported checkpoint roles', () => {
  const tree = Checkpoint({ batches: {}, currentAccount: A, isLogisticsRole: true,
    allowedRoles: ['ROLE_LOGISTICS', 'ROLE_PRODUCER', 'ROLE_RETAILER'], onAddCheckpoint: async () => {} });
  const roles = allNodes(tree).filter(n => n.type === 'option' && String(n.props.value).startsWith('ROLE_')).map(n => n.props.value);
  assert.deepEqual(roles, ['ROLE_LOGISTICS', 'ROLE_PRODUCER', 'ROLE_RETAILER']);
});
