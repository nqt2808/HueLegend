const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ethers } = require('ethers');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'contracts/project/ProjectCore.sol'), 'utf8');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'public/generated/project-core.json'), 'utf8'));
const owner = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';
const admin2 = '0x82d022a704706B2f144863D619D7418F8a0f19A7';

test('contract source initializes original Owner and second Admin', () => {
  assert.equal(ethers.getAddress(artifact.adminWallet), owner);
  assert.equal(ethers.getAddress(artifact.secondAdminWallet), admin2);
  assert.match(source, /constructor\(\) Ownable\(ADMIN_WALLET\)/);
  assert.match(source, /_roles\[SECOND_ADMIN_WALLET\]\[ROLE_ADMIN\] = true/);
  assert.match(source, /emit RoleAssigned\(SECOND_ADMIN_WALLET, ROLE_ADMIN\)/);
});

test('compiled ABI exposes independent Admin verification and governance methods', () => {
  const iface = new ethers.Interface(artifact.abi);
  for (const name of ['isAdmin', 'hasRole', 'hasDirectRole', 'grantRole', 'revokeRole', 'setBatchCreationFee', 'setStakeLockDuration', 'setEcosystemFund']) {
    assert.ok(iface.getFunction(name), name);
  }
  assert.match(source, /function grantRole\(address account, bytes32 role\) external onlyAdmin/);
  assert.match(source, /function setBatchCreationFee\(uint256 newFee\) external onlyAdmin/);
});

test('unauthorized wallet does not inherit Admin and cannot bypass contract modifier', () => {
  assert.match(source, /function _isAdmin\(address account\) internal view returns \(bool\) \{ return account == owner\(\) \|\| _roles\[account\]\[ROLE_ADMIN\]; \}/);
  assert.match(source, /modifier onlyAdmin\(\) \{ if \(!_isAdmin\(msg.sender\)\) revert UnauthorizedCaller\(msg.sender, ROLE_ADMIN\)/);
  assert.match(source, /if \(!_isAdmin\(msg.sender\) && !_roles\[msg.sender\]\[role\]\) revert UnauthorizedCaller/);
});

test('any verified Admin wallet inherits every supported role on-chain', () => {
  assert.match(source, /_isAdmin\(address account\) internal view returns \(bool\) \{ return account == owner\(\) \|\| _roles\[account\]\[ROLE_ADMIN\]; \}/);
  assert.match(source, /function hasRole\(address account, bytes32 role\) external view returns \(bool\) \{ return _knownRole\(role\) && \(_isAdmin\(account\) \|\| _roles\[account\]\[role\]\); \}/);
  for (const action of ['grantRole', 'revokeRole', 'setBatchCreationFee', 'setEcosystemFund', 'setStakeLockDuration']) {
    assert.match(source, new RegExp(`function ${action}\\([^)]*\\) external onlyAdmin`));
  }
});

test('assignments apply to any address and each role has a corresponding protected action', () => {
  assert.match(source, /_roles\[account\]\[role\] = true; emit RoleAssigned\(account, role\)/);
  assert.match(source, /_roles\[account\]\[role\] = false; emit RoleRevoked\(account, role\)/);
  assert.match(source, /function createBatch\([\s\S]*?onlyRole\(ROLE_PRODUCER\)/);
  assert.match(source, /function verifyBatch\([\s\S]*?onlyRole\(ROLE_INSPECTOR\)/);
  assert.match(source, /function revokeBatchVerification\([\s\S]*?onlyRole\(ROLE_INSPECTOR\)/);
  assert.match(source, /if \(!_isAdmin\(msg.sender\) && !_roles\[msg.sender\]\[role\]\) revert UnauthorizedCaller/);
});

test('forged role identifiers cannot be assigned or used in checkpoints', () => {
  assert.match(source, /if \(!_knownRole\(role\)\) revert InvalidRole\(role\)/);
  assert.match(source, /if \(role != ROLE_PRODUCER && role != ROLE_LOGISTICS && role != ROLE_RETAILER && role != ROLE_INSPECTOR\) revert InvalidRole\(role\)/);
  assert.match(source, /function hasDirectRole\(address account, bytes32 role\) external view returns \(bool\)/);
});
