import { response, marketAddress } from '../server/market.js';
export function GET(){return response({ok:true,network:'Ethereum Sepolia',chainId:11155111,
  contractAddress:marketAddress(),configured:!!marketAddress(),payment:'TEST_ETH_ONLY',version:'marketplace-v1'});}
export default {fetch(request){return request.method==='GET'?GET():new Response('',{status:405});}};
