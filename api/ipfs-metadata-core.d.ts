export interface BatchMetadataV1 {
  schemaVersion: 1;
  batchCode: string;
  productName: string;
  origin: string;
  productionDate: string;
  expiryDate: string | null;
  quantity: string;
}
export function isValidCid(value: unknown): value is string;
export function isISODate(value: unknown): value is string;
export function normalizeBatchMetadata(value: unknown, expectedBatchCode?: string): BatchMetadataV1;
export function matchesOnChainBatch(metadata: BatchMetadataV1, batch: Pick<BatchMetadataV1, 'batchCode' | 'productName' | 'origin'>): boolean;
