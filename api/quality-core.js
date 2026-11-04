// Du lieu phan anh cong khai; khong chua thong tin lien lac ca nhan.
const TYPE_SET = new Set(['QUALITY', 'PACKAGING', 'EXPIRED', 'COUNTERFEIT', 'OTHER']);

export function normalizeQualityReport(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.schemaVersion !== 1) throw new Error('Phien ban phan anh khong hop le.');
  if (typeof input.batchCode !== 'string' || !/^[\w-]{3,64}$/.test(input.batchCode)) throw new Error('Ma lo khong hop le.');
  if (typeof input.reporter !== 'string' || !/^0x[\da-f]{40}$/i.test(input.reporter)) throw new Error('Vi gui khong hop le.');
  if (!TYPE_SET.has(input.type)) throw new Error('Loai phan anh khong hop le.');
  if (typeof input.details !== 'string' || input.details.trim().length < 10 || input.details.length > 1200) throw new Error('Noi dung phan anh phai tu 10 den 1200 ky tu.');
  return { schemaVersion: 1, batchCode: input.batchCode, reporter: input.reporter.toLowerCase(), type: input.type, details: input.details.trim() };
}

export function qualitySignMessage(report, issuedAt, nonce, contractAddress) {
  return ['HueLegend quality report v1', 'ChainId: 11155111', `Contract: ${contractAddress.toLowerCase()}`,
    `Batch: ${report.batchCode}`, `Reporter: ${report.reporter}`, `Type: ${report.type}`,
    `Details: ${report.details}`, `IssuedAt: ${issuedAt}`, `Nonce: ${nonce}`].join('\n');
}
