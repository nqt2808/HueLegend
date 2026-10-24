import { Contract, FetchRequest, JsonRpcProvider, isAddress } from 'ethers';
import { MARKET_ABI } from '../web/market/abi.js';

const SEPOLIA = 11155111;
const DEFAULT_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
export const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
  'X-Content-Type-Options': 'nosniff'
};
export function response(data,status=200){return new Response(JSON.stringify(data),{status,headers:API_HEADERS});}
export function marketAddress(){
  const a=process.env.HUELEGEND_MARKET_ADDRESS || '';
  return isAddress(a) ? a : null;
}
export function parsedNumber(raw, fallback=0, max=10000){
  if(raw==null)return fallback;
  if(!/^\d+$/.test(String(raw)) || Number(raw)>max)throw Object.assign(new Error('Tham so khong hop le'),{status:400});
  return Number(raw);
}
export function normalizeSeller(s,wallet){
  return {wallet,businessName:s.businessName,location:s.location,
    businessLicenseSHA256:s.businessLicenseSHA256,foodSafetySHA256:s.foodSafetySHA256,
    businessLicenseExpires:Number(s.businessLicenseExpires),foodSafetyExpires:Number(s.foodSafetyExpires),
    publicBusinessLicenseURL:s.publicBusinessLicenseURL,publicFoodSafetyURL:s.publicFoodSafetyURL,
    status:Number(s.status)};
}
export function normalizeLot(l){
  return {id:Number(l.id),seller:l.seller,batchCode:l.batchCode,productName:l.productName,
    description:l.description,origin:l.origin,imageURL:l.imageURL,priceVND:l.priceVND.toString(),priceWei:l.priceWei.toString(),
    stock:Number(l.stock),sold:Number(l.sold),status:Number(l.status),submittedAt:Number(l.submittedAt)};
}
export async function withMarket(callback){
  const address=marketAddress();
  if(!address)throw Object.assign(new Error('Chua cau hinh HUELEGEND_MARKET_ADDRESS.'),{status:503});
  const rpc=process.env.HUELEGEND_RPC_URL || DEFAULT_RPC;
  if(!rpc.startsWith('https://'))throw new Error('RPC phai su dung HTTPS.');
  const req=new FetchRequest(rpc);req.timeout=12000;
  const provider=new JsonRpcProvider(req,undefined,{batchMaxCount:1});
  try{
    const net=await provider.getNetwork();
    if(Number(net.chainId)!==SEPOLIA)throw new Error('RPC khong phai Sepolia.');
    if(await provider.getCode(address)==='0x')throw new Error('Smart contract Marketplace chua deploy.');
    const contract=new Contract(address,MARKET_ABI,provider);
    return await callback(contract,provider);
  }finally{provider.destroy();}
}
export function safeGet(fn){
  return async function GET(request){
    try{return await fn(new URL(request.url));}
    catch(e){console.error('market API:',e.message);
      return response({ok:false,error:e.status===400?e.message:'Khong doc duoc du lieu Marketplace Sepolia. Kiem tra contract va RPC.'},e.status||503);}
  };
}
export async function publicLot(contract,id){
  const lot=normalizeLot(await contract.getLot(id));
  if(lot.status!==2 || lot.stock<=0 || !(await contract.isSellerApproved(lot.seller)))return null;
  const seller=normalizeSeller(await contract.getSeller(lot.seller),lot.seller);
  return {...lot,business:seller};
}
