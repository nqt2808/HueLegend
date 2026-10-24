import { response, marketAddress, safeGet, withMarket } from '../server/market.js';
export const GET=safeGet(async()=>response(await withMarket(async c=>({ok:true,chainId:11155111,
  contractAddress:marketAddress(),sellerCount:Number(await c.sellerCount()),lotCount:Number(await c.lotCount())}))));
export default {fetch(request){return request.method==='GET'?GET(request):new Response('',{status:405});}};
