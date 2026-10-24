import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MARKET_ABI } from '../web/market/abi.js';
const contract=await readFile(new URL('../contracts/HueLegendMarket.sol',import.meta.url),'utf8');
const market=await readFile(new URL('../web/market/app.js',import.meta.url),'utf8');
const server=await readFile(new URL('../scripts/serve.mjs',import.meta.url),'utf8');
const homepage=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
test('Solidity: seller va lot deu can admin review',()=>{
  assert.match(contract,/function reviewSeller\(/);
  assert.match(contract,/function reviewLot\(/);
  assert.match(contract,/if \(!_validSeller\(msg\.sender\)\) revert NotApproved\(\)/);
  assert.match(contract,/lot\.status == Review\.Approved && lot\.stock > 0 && _validSeller\(lot\.seller\)/);
});
test('Solidity: seller bat buoc hash 2 giay to',()=>{
  assert.match(contract,/businessLicenseSHA256 == bytes32\(0\) \|\| foodSafetySHA256 == bytes32\(0\)/);
  assert.match(contract,/s\.foodSafetyExpires >= block\.timestamp/);
});
test('Solidity: buyer escrow khong chuyen ETH truc tiep cho seller luc dat',()=>{
  const segment=contract.split('function placeOrder(')[1].split('function markShipped(')[0];
  assert.match(segment,/msg\.value != due/);
  assert.doesNotMatch(segment,/\.call\{value:/);
  assert.match(contract,/function cancelBeforeShipping\(/);
  assert.match(contract,/function confirmReceived\(/);
});
test('Frontend: hash file truoc khi gui',()=>{
  assert.match(market,/crypto\.subtle\.digest\('SHA-256'/);
  assert.match(market,/get\('businessLicense'\)/);
  assert.match(market,/get\('foodSafety'\)/);
});
test('Frontend: duong dan cong khai can HTTPS',()=>{
  assert.match(market,/u\.protocol==='https:'/);
  assert.match(market,/const h = value/);
});
test('Frontend: khong tu dong chuyen tien that',()=>{
  assert.match(market,/ETH Sepolia/);
  assert.match(market,/chua co he thong giao hang that|chưa có hệ thống giao hàng thật/i);
});
test('Local server: has marketplace API routes',()=>{
  assert.match(server,/market-config/);
  assert.match(server,/market-products/);
  assert.match(server,/market-product/);
});
test('Trang HueLegend co lien ket Marketplace',()=>assert.match(homepage,/market\.html/));
test('ABI: phan quyen va giao dich',()=>{
  assert(MARKET_ABI.some(x=>x.includes('reviewSeller')));
  assert(MARKET_ABI.some(x=>x.includes('reviewLot')));
  assert(MARKET_ABI.some(x=>x.includes('placeOrder')));
  assert(MARKET_ABI.some(x=>x.includes('confirmReceived')));
});
