// Chi kiem tra read-only; khong can private key.
const site=process.argv[2];
if(!site){console.error('Dung: npm run check:market -- https://ten-app.vercel.app');process.exit(2);}
const base=new URL(site);
if(base.protocol!=='https:'){console.error('Chi kiem tra domain HTTPS.');process.exit(2);}
let failures=0;
for(const [path,validate] of [
 ['/market.html',async r=>(await r.text()).includes('HueLegend Market')],
 ['/api/market-config',async r=>{const d=await r.json();console.log('Config:',d);return d.ok&&d.configured&&/^0x[0-9a-fA-F]{40}$/.test(d.contractAddress)}],
 ['/api/market-health',async r=>{const d=await r.json();console.log('Chain:',d);return d.ok&&d.chainId===11155111}],
 ['/api/market-products',async r=>{const d=await r.json();console.log('Lots:',d.items?.length);return d.ok&&Array.isArray(d.items)}]
]){
 try{const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(18000)});if(!response.ok||!(await validate(response)))throw Error('HTTP '+response.status+' hoac sai du lieu');console.log('[PASS]',path);}
 catch(e){failures++;console.error('[FAIL]',path,e.message);}
}
process.exitCode=failures?1:0;
