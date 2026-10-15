import { JsonRpcProvider, Contract, getAddress, formatEther } from "ethers";
import { DEFAULT_CONFIG } from "../web/js/config.js";
import { CONTRACT_ABI } from "../web/js/abi.js";
import { ROLE } from "../web/js/roles.js";
// Chi doc on-chain, khong can private key va khong gui giao dich.
const address=getAddress(process.env.CONTRACT_ADDRESS||DEFAULT_CONFIG.contractAddress);
const rpc=process.env.RPC_URL||DEFAULT_CONFIG.rpcUrl;
const provider=new JsonRpcProvider(rpc,undefined,{batchMaxCount:1});
try {
  const network=await provider.getNetwork();
  if(network.chainId!==11155111n)throw new Error("RPC khong phai Sepolia.");
  if(await provider.getCode(address)==="0x")throw new Error("Dia chi khong co ma hop dong.");
  const contract=new Contract(address,CONTRACT_ABI,provider);
  const [owner,total,fee,stake]=await Promise.all([
    contract.owner(),contract.getTotalBatches(),contract.batchCreationFee(),contract.MIN_STAKE_AMOUNT()
  ]);
  for(const [name,hash] of Object.entries(ROLE)) {
    if((await contract[`ROLE_${name}`]()).toLowerCase()!==hash)throw new Error(`ROLE_${name} khong khop.`);
    await contract.hasRole(owner,hash);
  }
  if(total>0n) {
    const code=await contract.getBatchCodeByIndex(total-1n);
    const batch=await contract.getBatch(code);
    const points=await contract.getCheckpoints(code);
    console.log("Lo gan nhat:",batch.batchCode,"So chang:",points.length);
  }
  console.log("Doc thanh cong:",JSON.stringify({address,owner,total:total.toString(),feeETH:formatEther(fee),minStakeETH:formatEther(stake)},null,2));
  console.log("Luu y: Kiem tra doc nay khong phai audit va khong chung minh bytecode giong nguon.");
} catch(error) { console.error(error.shortMessage||error.message);process.exitCode=1; }
finally { provider.destroy(); }
