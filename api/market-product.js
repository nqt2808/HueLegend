import { response, safeGet, withMarket, publicLot, parsedNumber } from '../server/market.js';
export const GET=safeGet(async url=>{
  const id=parsedNumber(url.searchParams.get('id'),0,100000000);
  if(id<1)return response({ok:false,error:'Can ma san pham.'},400);
  const item=await withMarket(c=>publicLot(c,id));
  return item?response({ok:true,item}):response({ok:false,error:'Lo chua duoc duyet, het hang hoac khong ton tai.'},404);
});
export default {fetch(request){return request.method==='GET'?GET(request):new Response('',{status:405});}};
