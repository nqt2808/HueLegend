const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loadCore = () => import('../api/ipfs-metadata-core.js');
const original = {
  schemaVersion: 1,
  batchCode: 'HL-MEXUNG-2026-001',
  productName: 'Me xung Hue',
  origin: 'Hue',
  productionDate: '2026-11-04',
  expiryDate: '2027-05-04',
  quantity: '500 hop',
};

test('Metadata hop le co han su dung duoc chuan hoa', async () => {
  const { normalizeBatchMetadata } = await loadCore();
  assert.deepEqual(normalizeBatchMetadata(original, original.batchCode), original);
});

test('San pham khong co han su dung dung null, khong tu cong 180 ngay', async () => {
  const { normalizeBatchMetadata } = await loadCore();
  assert.equal(normalizeBatchMetadata({ ...original, expiryDate: null }).expiryDate, null);
});

test('Tu choi ngay HSD truoc NSX va ngay khong co that', async () => {
  const { normalizeBatchMetadata } = await loadCore();
  assert.throws(() => normalizeBatchMetadata({ ...original, expiryDate: '2026-10-31' }));
  assert.throws(() => normalizeBatchMetadata({ ...original, productionDate: '2026-02-30' }));
});

test('Gian lan: CID cua lo khac khong duoc gan vao lo hien tai', async () => {
  const { normalizeBatchMetadata } = await loadCore();
  assert.throws(() => normalizeBatchMetadata(original, 'HL-TOMCHUA-2026-001'), /CID/);
});

test('Gian lan: metadata khac ten hoac nguon goc tren Blockchain bi tu choi', async () => {
  const { matchesOnChainBatch } = await loadCore();
  assert.equal(matchesOnChainBatch(original, original), true);
  assert.equal(matchesOnChainBatch(original, { ...original, productName: 'Hang gia' }), false);
  assert.equal(matchesOnChainBatch(original, { ...original, origin: 'Khac' }), false);
});

test('Tu choi CID gia va duong dan co ky tu bat thuong', async () => {
  const { isValidCid } = await loadCore();
  assert.equal(isValidCid('huelegend/batch/HUYEN'), false);
  assert.equal(isValidCid('../metadata.json'), false);
  assert.equal(isValidCid('b' + 'a'.repeat(58)), true);
});

test('Tu choi metadata khong ro HSD hoac phien ban', async () => {
  const { normalizeBatchMetadata } = await loadCore();
  assert.throws(() => normalizeBatchMetadata({ ...original, expiryDate: undefined }));
  assert.throws(() => normalizeBatchMetadata({ ...original, schemaVersion: 2 }));
});

test('Giao dien tra cuu khong duoc tu sinh han su dung 180 ngay', () => {
  const srcDir = path.resolve(__dirname, '../src/components');
  for (const filename of ['LookupTab.tsx', 'BatchJourneyModal.tsx']) {
    const source = fs.readFileSync(path.join(srcDir, filename), 'utf8');
    assert.doesNotMatch(source, /180\s*\*\s*86400/);
    assert.match(source, /displayMetadataDate\(/);
  }
});
