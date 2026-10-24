import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../',import.meta.url);
const file = name => readFile(new URL(name,root),'utf8');
const slogan='Cố đô Huyền thoại - Song hành theo thời gian';
test('Branding: hai giao dien co slogan chinh thuc',async()=>{
 const [a,b]=await Promise.all([file('web/index.html'),file('web/market.html')]);
 for(const html of [a,b]){
  assert.ok(html.includes(slogan));
  assert.ok(html.includes('assets/brand.css'));
  assert.ok(html.includes('huelegend-official.webp'));
  assert.ok(!html.includes('TINH HOA CÓ NGUỒN CỘI'));
 }
});
test('Branding: bo nhan dien co serif + khong giãn chu slogan',async()=>{
 const css=await file('web/assets/brand.css');
 assert.match(css,/Cormorant Garamond/);
 assert.match(css,/\.hl-tagline/);
 assert.match(css,/letter-spacing:0/);
 assert.match(css,/white-space:normal/);
});
test('Branding: logo trong suot duoc tao tu anh do nguoi dung cap',async()=>{
 const data=await readFile(new URL('web/assets/huelegend-icon.png',root));
 assert.deepEqual(Array.from(data.subarray(0,8)),[137,80,78,71,13,10,26,10]);
 assert.ok(data.length>1000);
});
test('Market: kiem tra trung lap confirm va dong bo sau giao dich',async()=>{
 const js=await file('web/market/app.js');
 assert.match(js,/askConfirm=true/);
 assert.match(js,/Promise\.allSettled/);
 assert.match(js,/data-audit-lot/);
 assert.match(js,/aria-pressed/);
});

test('Local server: MIME cua logo WebP dung image/webp',async()=>{
 const js=await file('scripts/serve.mjs');
 assert.match(js, /"\.webp":"image\/webp"/);
});
