const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'src/lib/specialtyCatalog.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const sourceModule = new Module(sourceFile, module);
sourceModule.filename = sourceFile;
sourceModule.require = id => {
  if (id === '../types') return { SPECIALTY_CATEGORIES: [
    'Bánh kẹo & Món ăn vặt (Đồ khô)', 'Trà & Thức uống', 'Mắm & Gia vị đặc trưng',
    'Nông sản & Thảo dược', 'Đặc sản tươi & Món ăn tại chỗ (Món mặn)',
  ] };
  return require(id);
};
sourceModule._compile(compiled, sourceFile);
const { parseReferenceSpecialties } = sourceModule.exports;
const csv = fs.readFileSync(path.join(root, 'public/huelegend-15.csv'), 'utf8');

test('Du 15 dac san Hue va nam nhom danh muc tu CSV duoc hien thi tren web', () => {
  const products = parseReferenceSpecialties(csv);
  assert.equal(products.length, 15);
  assert.equal(new Set(products.map(product => product.id)).size, 15);
  assert.equal(new Set(products.map(product => product.category)).size, 5);
  assert.equal(products[0].name, 'Mè xửng dẻo Thiên Hương');
  assert.equal(products[14].name, 'Bánh chưng Phú Dương');
  assert.ok(products.every(product => product.productionDate === null && product.expiryDate === null));
  assert.equal(fs.readFileSync(path.join(root, 'web/huelegend-15.csv'), 'utf8'), csv);
});

test('CSV thieu cot, trung ma hoac danh muc la bi tu choi', () => {
  const duplicate = csv.replace('2;Mứt gừng', '1;Mứt gừng');
  assert.throws(() => parseReferenceSpecialties(duplicate), /trung/);
  assert.throws(() => parseReferenceSpecialties(csv.replace('Trà & Thức uống', 'ROLE_ADMIN')), /Danh muc/);
  assert.throws(() => parseReferenceSpecialties(csv.replace('500 Hộp;', '500 Hộp;extra;')), /so cot/);
});

test('Gian lan: danh muc tham khao khong duoc tao tem blockchain hoac don hang', () => {
  const store = fs.readFileSync(path.join(root, 'src/components/StoreTab.tsx'), 'utf8');
  const overview = fs.readFileSync(path.join(root, 'src/components/OverviewTab.tsx'), 'utf8');
  assert.match(store, /parseReferenceSpecialties\(csv\)/);
  assert.match(store, /Chưa có giá bán hoặc lô hàng được xác thực/);
  assert.match(store, /Lô Hàng Đã Niêm Yết On-Chain/);
  assert.match(overview, /Khám phá danh mục 15 đặc sản Huế/);
  assert.match(overview, /onNavigateTab\('store'\)/);
  assert.doesNotMatch(fs.readFileSync(sourceFile, 'utf8'), /createBatch|grantRole|sendTransaction/);
});
