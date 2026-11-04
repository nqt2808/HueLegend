// Dinh dang nhat ky kho va GPS duoc ghi truc tiep trong checkpoint Sepolia.
const STOCK_PREFIX = 'HL_STOCK_V1:';
const GPS_PATTERN = /\s\[GPS:([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)\]$/;

export function parseQuantity(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^((?:\d{1,3}(?:[.,]\d{3})+|\d+))\s+(.{1,30})$/u);
  if (!match) return null;
  const number = match[1].replace(/[.,]/g, '');
  if (!/^\d+$/.test(number)) return null;
  const amount = Number(number);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const unit = match[2].trim();
  return { amount, unit };
}

export function encodeStockMovement(movement) {
  const { direction, amount, unit, note = '' } = movement;
  if (!['IN', 'OUT'].includes(direction) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000 ||
      typeof unit !== 'string' || !unit.trim() || unit.length > 30 ||
      typeof note !== 'string' || note.length > 160) throw new Error('Bien dong kho khong hop le.');
  return STOCK_PREFIX + JSON.stringify({ direction, amount, unit: unit.trim(), note: note.trim() });
}

export function parseStockMovement(action) {
  if (typeof action !== 'string' || !action.startsWith(STOCK_PREFIX)) return null;
  try {
    const record = JSON.parse(action.slice(STOCK_PREFIX.length));
    return encodeStockMovement(record) ? {
      direction: record.direction, amount: record.amount, unit: record.unit.trim(), note: record.note?.trim() || '',
    } : null;
  } catch { return null; }
}

export function inventoryForBatch(batch, account, roleHash, includeInitial = false) {
  const base = includeInitial && batch.metadataVerified ? parseQuantity(batch.quantity) : null;
  const unit = base?.unit || (batch.checkpoints || [])
    .map(cp => parseStockMovement(cp.action))
    .find(cp => cp && cp.unit)?.unit || null;
  let balance = base?.amount || 0;
  const movements = [];
  for (const cp of batch.checkpoints || []) {
    if (cp.role !== roleHash || cp.recorder?.toLowerCase() !== account?.toLowerCase()) continue;
    const movement = parseStockMovement(cp.action);
    if (!movement || movement.unit !== unit) continue;
    balance += movement.direction === 'IN' ? movement.amount : -movement.amount;
    movements.push({ ...movement, timestamp: cp.timestamp, recorder: cp.recorder });
  }
  return { unit, balance, movements, initial: base?.amount || 0 };
}

export function appendGps(location, latitude, longitude) {
  if (typeof location !== 'string' || !location.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Vi tri GPS khong hop le.');
  const result = `${location.trim()} [GPS:${latitude.toFixed(6)},${longitude.toFixed(6)}]`;
  if (new TextEncoder().encode(result).length > 128) throw new Error('Dia diem qua dai (toi da 128 bytes tren Blockchain).');
  return result;
}

export function readGps(location) {
  if (typeof location !== 'string') return null;
  const match = location.match(GPS_PATTERN);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude, label: location.slice(0, match.index).trim() };
}
