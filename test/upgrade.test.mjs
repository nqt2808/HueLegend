import test from "node:test";
import assert from "node:assert/strict";
import { discoverContract } from "../web/js/services/deployment.js";
import { csvCell, exportBatchesCSV } from "../web/js/lib/utils.js";
const addr = "0x35655079aebb215e58e379d5a8c2f1f3a5323c6b";

test("Public config: chi dung khi sepolia va chua co cau hinh tuy chinh", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return { ok:true, json:async() => ({ok:true,source:"deployment-config",chainId:11155111,contractAddress:addr}) }; };
  const settings = { mode:"sepolia", customConfig:false, origin:"https://example.vercel.app", fetcher };
  assert.equal(await discoverContract(settings), addr);
  assert.equal(await discoverContract({...settings, mode:"demo"}), null);
  assert.equal(await discoverContract({...settings, customConfig:true}), null);
  assert.equal(calls,1);
});
test("Public config: tu choi sai mang, sai dia chi va API loi", async () => {
  const base = {mode:"sepolia",customConfig:false,origin:"https://example.vercel.app"};
  const stub = data => async () => ({ok:true,json:async()=>data});
  assert.equal(await discoverContract({...base,fetcher:stub({ok:true,source:"deployment-config",chainId:1,contractAddress:addr})}),null);
  assert.equal(await discoverContract({...base,fetcher:stub({ok:true,source:"deployment-config",chainId:11155111,contractAddress:"invalid"})}),null);
  assert.equal(await discoverContract({...base,fetcher:async()=>{throw new Error("offline")}}),null);
});
test("CSV: ngua formula injection va phan biet du lieu mau", () => {
  assert.equal(csvCell(`=IMPORTXML("https://bad")`), `"'=IMPORTXML(""https://bad"")"`);
  assert.equal(csvCell(`+123`), `"'+123"`);
  const csv=exportBatchesCSV([{batchCode:"HL-1",productName:"=danger",origin:"Huế",createdAt:1700000000,producer:addr,isVerified:false}],"demo");
  assert(csv.startsWith("\uFEFF"));
  assert(csv.includes("DU LIEU MAU"));
  assert(csv.includes("\"'=danger\""));
});
