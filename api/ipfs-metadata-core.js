// Xac thuc cau truc metadata chung cho trinh duyet va API.
const CID_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/;

export function isValidCid(value) {
  return typeof value === 'string' && CID_PATTERN.test(value);
}

export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeBatchMetadata(value, expectedBatchCode) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) {
    throw new Error('Phien ban metadata khong hop le.');
  }
  const fields = ['batchCode', 'productName', 'origin', 'quantity'];
  for (const name of fields) {
    if (typeof value[name] !== 'string' || !value[name].trim()) throw new Error(`Metadata thieu ${name}.`);
  }
  if (value.batchCode.length > 64 || value.productName.length > 128 ||
      value.origin.length > 128 || value.quantity.length > 64) throw new Error('Metadata qua dai.');
  if (!isISODate(value.productionDate) || (value.expiryDate !== null && !isISODate(value.expiryDate))) {
    throw new Error('Ngay san xuat hoac han su dung khong hop le.');
  }
  if (value.expiryDate !== null && value.expiryDate < value.productionDate) {
    throw new Error('Han su dung phai bang hoac sau ngay san xuat.');
  }
  if (expectedBatchCode && value.batchCode !== expectedBatchCode) {
    throw new Error('CID khong thuoc lo hang nay.');
  }
  return {
    schemaVersion: 1,
    batchCode: value.batchCode,
    productName: value.productName,
    origin: value.origin,
    productionDate: value.productionDate,
    expiryDate: value.expiryDate,
    quantity: value.quantity,
  };
}

export function matchesOnChainBatch(metadata, batch) {
  return metadata.batchCode === batch.batchCode &&
    metadata.productName === batch.productName && metadata.origin === batch.origin;
}
