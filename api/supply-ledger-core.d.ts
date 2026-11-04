export interface StockMovement { direction: 'IN' | 'OUT'; amount: number; unit: string; note: string; }
export function parseQuantity(value: unknown): { amount: number; unit: string } | null;
export function encodeStockMovement(movement: StockMovement): string;
export function parseStockMovement(action: unknown): StockMovement | null;
export function inventoryForBatch(batch: { quantity?: string; metadataVerified?: boolean; checkpoints?: Array<{ action: string; role: string; recorder: string; timestamp: number }> }, account: string | null, roleHash: string, includeInitial?: boolean): { unit: string | null; balance: number; movements: Array<StockMovement & { timestamp: number; recorder: string }>; initial: number; };
export function appendGps(location: string, latitude: number, longitude: number): string;
export function readGps(location: unknown): { latitude: number; longitude: number; label: string } | null;
