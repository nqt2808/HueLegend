export type AppRole = 'ROLE_ADMIN' | 'ROLE_PRODUCER' | 'ROLE_LOGISTICS' | 'ROLE_RETAILER' | 'ROLE_INSPECTOR';

export interface Checkpoint {
  stepName: string;
  role: string;
  roleTitle: string;
  location: string;
  action: string;
  timestamp: number;
  recorder: string;
  metadataURI: string;
  txHash: string;
  conditionNote: string;
}

export const SPECIALTY_CATEGORIES = [
  'BÃ¡nh káº¹o & MÃ³n Äƒn váº·t (Äá»“ khÃ´)',
  'TrÃ  & Thá»©c uá»‘ng',
  'Máº¯m & Gia vá»‹ Ä‘áº·c trÆ°ng',
  'NÃ´ng sáº£n & Tháº£o dÆ°á»£c',
  'Äáº·c sáº£n tÆ°Æ¡i & MÃ³n Äƒn táº¡i chá»— (MÃ³n máº·n)'
] as const;

export type SpecialtyCategory = typeof SPECIALTY_CATEGORIES[number];

export interface Batch {
  batchCode: string;
  productName: string;
  origin: string;
  createdAt: number;
  producer: string;
  isVerified: boolean;
  exists: boolean;
  isListed?: boolean; // Trang thai da xac nhan niem yet len cua hang dac san
  category?: string; // Danh muc dac san Hue
  listingPriceEth?: string;
  storeName?: string;
  starRating?: string;
  ocopStandard?: string;
  certificationNo?: string;
  quantity?: string;
  currentStage?: string;
  inspectorNote?: string;
  certificateURI?: string;
  imageUrl?: string; // Hinh anh dac san duoc tai len khi tao lo
  productionDate?: string; // Ngay san xuat (NSX)
  expiryDate?: string; // Han su dung (HSD)
  txHash?: string;
  verifyTxHash?: string;
  inspectionFeePaid?: string;
  checkpoints: Checkpoint[];
}

export interface UserRoles {
  isAdmin: boolean;
  isProducer: boolean;
  isLogistics: boolean;
  isRetailer: boolean;
  isInspector: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'loading';
}

export interface GrantedWallet {
  address: string;
  role: string;
  roleTitle: string;
  grantedAt: string;
  status: string;
}

