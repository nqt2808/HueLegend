import { response, safeGet, withMarket, publicLot, parsedNumber } from '../server/market.js';
export const GET=safeGet(async url=>{
  const page=parsedNumber(url.searchParams.get('page'),0,100000);
  const size=parsedNumber(url.searchParams.get('size'),9,18);
  if(size<1)throw Object.assign(new Error('Size phai lon hon 0'),{status:400});
  const data=await withMarket(async contract=>{
    const total=Number(await contract.lotCount());
    const start=Math.max(0,total-page*size);
    const ids=Array.from({length:Math.min(size,start)},(_,i)=>start-i);
    const lots=await Promise.all(ids.map(id=>publicLot(contract,id)));
    return {ok:true,source:'sepolia-onchain',page,size,total,items:lots.filter(Boolean),note:'Loc approved + valid seller tren trang dang doc'};
  });
  return response(data);
});
export default {fetch(request){return request.method==='GET'?GET(request):new Response('',{status:405});}};
