export interface QualityReport { schemaVersion: 1; batchCode: string; reporter: string; type: 'QUALITY'|'PACKAGING'|'EXPIRED'|'COUNTERFEIT'|'OTHER'; details: string; }
export function normalizeQualityReport(input: unknown): QualityReport;
export function qualitySignMessage(report: QualityReport, issuedAt: number, nonce: string, contractAddress: string): string;
