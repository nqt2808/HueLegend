const { test } = require('node:test');
const assert = require('node:assert/strict');

test('So kho tinh theo tung vi, tung role va checkpoint Sepolia', async () => {
  const { encodeStockMovement, inventoryForBatch } = await import('../api/supply-ledger-core.js');
  const A = '0x' + 'a'.repeat(40);
  const B = '0x' + 'b'.repeat(40);
  const role = 'ROLE_PRODUCER_HASH';
  const ledger = {
    quantity: '500 Hộp', metadataVerified: true,
    checkpoints: [
      { role, recorder: A, action: encodeStockMovement({ direction: 'OUT', amount: 30, unit: 'Hộp', note: 'Chuyen hang' }), timestamp: 1 },
      { role, recorder: B, action: encodeStockMovement({ direction: 'OUT', amount: 100, unit: 'Hộp', note: '' }), timestamp: 2 },
      { role, recorder: A, action: encodeStockMovement({ direction: 'IN', amount: 10, unit: 'Hộp', note: 'Tra hang' }), timestamp: 3 },
    ],
  };
  assert.equal(inventoryForBatch(ledger, A, role, true).balance, 480);
  assert.equal(inventoryForBatch(ledger, A, role, true).movements.length, 2);
  assert.equal(inventoryForBatch(ledger, A, 'RETAILER_HASH', false).balance, 0);
});

test('Khong tin san luong chua xac minh IPFS', async () => {
  const { inventoryForBatch } = await import('../api/supply-ledger-core.js');
  assert.equal(inventoryForBatch({ quantity: '9000 Hộp', metadataVerified: false, checkpoints: [] }, '0xabc', 'X', true).balance, 0);
});

test('Tu choi gian lan so luong kho am / khong nguyen / parser bi sua', async () => {
  const { encodeStockMovement, parseStockMovement, parseQuantity } = await import('../api/supply-ledger-core.js');
  assert.throws(() => encodeStockMovement({ direction: 'IN', amount: -2, unit: 'Hộp', note: '' }));
  assert.throws(() => encodeStockMovement({ direction: 'IN', amount: 0.5, unit: 'Hộp', note: '' }));
  assert.equal(parseStockMovement('HL_STOCK_V1:{"direction":"OUT","amount":-2,"unit":"Hop"}'), null);
  assert.equal(parseQuantity('1,5 kg'), null);
  assert.deepEqual(parseQuantity('1.000 Gói'), { amount: 1000, unit: 'Gói' });
});

test('GPS dung tuyen duong va tu choi toa do gia', async () => {
  const { appendGps, readGps } = await import('../api/supply-ledger-core.js');
  const location = appendGps('Kho Hue', 16.4637, 107.5909);
  assert.deepEqual(readGps(location), { latitude: 16.4637, longitude: 107.5909, label: 'Kho Hue' });
  assert.throws(() => appendGps('Kho Hue', 116, 100));
  assert.equal(readGps('Kho Hue [GPS:999,100]'), null);
});

test('Chuan hoa phan anh va chan noi dung bi gia mao', async () => {
  const { normalizeQualityReport, qualitySignMessage } = await import('../api/quality-core.js');
  const report = normalizeQualityReport({ schemaVersion: 1, batchCode: 'HL-HUE-001', reporter: '0x' + 'A'.repeat(40), type: 'QUALITY', details: 'Bao bi da bi rach khi nhan san pham.' });
  assert.equal(report.reporter, '0x' + 'a'.repeat(40));
  assert.match(qualitySignMessage(report, 100, 'nonce', '0x' + 'b'.repeat(40)), /HL-HUE-001/);
  assert.throws(() => normalizeQualityReport({ ...report, type: 'ADMIN_APPROVED' }));
  assert.throws(() => normalizeQualityReport({ ...report, details: 'A' }));
  assert.throws(() => normalizeQualityReport({ ...report, reporter: 'forged' }));
});

test('Danh muc duoc luu vao metadata IPFS neu duoc cung cap', async () => {
  const { normalizeBatchMetadata } = await import('../api/ipfs-metadata-core.js');
  const metadata = normalizeBatchMetadata({ schemaVersion: 1, batchCode: 'HL-HUE-001', productName: 'Me Xung', origin: 'Hue', quantity: '50 Hộp', productionDate: '2026-11-04', expiryDate: null, category: 'Bánh kẹo & Món ăn vặt (Đồ khô)' });
  assert.equal(metadata.category, 'Bánh kẹo & Món ăn vặt (Đồ khô)');
  assert.throws(() => normalizeBatchMetadata({ ...metadata, category: 123 }));
});
