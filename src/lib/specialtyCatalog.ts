import { SPECIALTY_CATEGORIES, type SpecialtyCategory } from '../types';

export interface ReferenceSpecialty {
  id: number;
  name: string;
  producer: string;
  origin: string;
  demoQuantity: string;
  category: SpecialtyCategory;
  productionDate: string | null;
  expiryDate: string | null;
}

const HEADERS = ['STT', 'TenDacSan', 'DonViSanXuat', 'NguonGoc', 'SanLuong', 'DanhMuc', 'NSX', 'HSD'];

// CSV tham khao chi la du lieu danh muc, khong chung minh chung nhan OCOP hay giao dich on-chain.
export function parseReferenceSpecialties(csv: string): ReferenceSpecialty[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2 || lines[0].split(';').some((value, index) => value.trim() !== HEADERS[index]) || lines[0].split(';').length !== HEADERS.length) {
    throw new Error('Danh sach dac san co cau truc CSV khong hop le.');
  }

  const ids = new Set<number>();
  const names = new Set<string>();
  return lines.slice(1).map(line => {
    const cells = line.split(';').map(value => value.trim());
    if (cells.length !== HEADERS.length) throw new Error('Mot dong danh muc co so cot khong hop le.');
    const [idText, name, producer, origin, demoQuantity, category, productionDate, expiryDate] = cells;
    const id = Number(idText);
    const normalizedName = name.toLocaleLowerCase('vi');
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id) || !name || !producer || !origin || !demoQuantity || names.has(normalizedName)) {
      throw new Error('Ma hoac thong tin dac san bi trung / khong hop le.');
    }
    if ([name, producer, origin, demoQuantity].some(value => value.length > 180 || /[<>]/.test(value))) {
      throw new Error('Danh muc chua du lieu khong an toan.');
    }
    if (!SPECIALTY_CATEGORIES.includes(category as SpecialtyCategory)) {
      throw new Error('Danh muc san pham khong duoc ho tro.');
    }
    ids.add(id);
    names.add(normalizedName);
    return {
      id, name, producer, origin, demoQuantity,
      category: category as SpecialtyCategory,
      productionDate: productionDate || null,
      expiryDate: expiryDate || null,
    };
  });
}
