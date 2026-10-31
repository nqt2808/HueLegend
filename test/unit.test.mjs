import test from "node:test";
import assert from "node:assert/strict";
import { DemoService, DEMO_ACCOUNTS } from "../web/js/services/demo.js";
import { ROLE } from "../web/js/roles.js";
import { DEFAULT_CONFIG } from "../web/js/config.js";
import { CONTRACT_ABI } from "../web/js/abi.js";
import { QRCode, ErrorCorrectLevel } from "../web/vendor/qr-code.js";
import { utf8Length, assertText, escapeHTML, safeURI, parseETH, formatETH,
  makeBatchURL, parseBatchInput, validateMetadata, validateRPC, isAddress, errorText } from "../web/js/lib/utils.js";

const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
async function demo(persona="PRODUCER"){
  let now=1802300000;
  const service=new DemoService({storage:memory(),now:()=>now});
  await service.init();await service.connect(persona);
  return {service,advance:seconds=>{now+=seconds;}};
}
test("UTF-8: tieng Viet tinh theo byte, khong theo so ky tu",()=>{
  assert.equal(utf8Length("Huế"),5);assert.throws(()=>assertText("ế".repeat(43),"Ten",128),/128 byte/);
});
test("ETH dung BigInt, giu chinh xac den 1 wei",()=>{
  assert.equal(parseETH("0.000000000000000001"),1n);
  assert.equal(formatETH(parseETH("0.05"),18),"0.05");
  for(const value of ["1e3","-1","0,1","0.1234567890123456789","NaN"])assert.throws(()=>parseETH(value));
});
test("HTML escape ngan chen ma XSS tu du lieu lo",()=>{
  assert.equal(escapeHTML('<img src=x onerror="bad()">'),"&lt;img src=x onerror=&quot;bad()&quot;&gt;");
});
test("URI chan javascript, data va URL co mat khau",()=>{
  assert.equal(safeURI("javascript:alert(1)"),null);
  assert.equal(safeURI("data:text/html,<script>"),null);
  assert.equal(safeURI("https://user:pass@example.com"),null);
  assert.equal(safeURI("https://example.com/proof"),"https://example.com/proof");
  assert.equal(safeURI("ipfs://bafyExample/document.pdf"),"https://ipfs.io/ipfs/bafyExample/document.pdf");
});
test("Metadata va RPC duoc kiem tra dau vao",()=>{
  assert.equal(validateMetadata("sha256:"+"a".repeat(64)),"sha256:"+"a".repeat(64));
  assert.throws(()=>validateMetadata("ftp://example.com/file"));
  assert.throws(()=>validateRPC("http://example.com"));
});
test("QR round-trip giu ma Unicode, mode va hop dong",()=>{
  const code="HL-HUẾ-001";
  const url=makeBatchURL("https://example.org/repo/web/?other=1#/create",code,"sepolia",DEFAULT_CONFIG.contractAddress);
  assert.equal(parseBatchInput(url,{mode:"sepolia",contractAddress:DEFAULT_CONFIG.contractAddress}),code);
  assert(!/[^\x00-\x7F]/.test(url));
  assert.throws(()=>parseBatchInput(url,{mode:"demo"}),/chế độ/);
  assert.throws(()=>parseBatchInput(url,{mode:"sepolia",contractAddress:DEMO_ACCOUNTS.OWNER}),/hợp đồng khác/);
});
test("QR la ma duoc tao that, co finder pattern va quiet zone do renderer tao",()=>{
  const qr=new QRCode(-1,ErrorCorrectLevel.M);qr.addData("https://example.org/?batch=HL-001&mode=demo");qr.make();
  const n=qr.getModuleCount();assert(n>=21);assert.equal(n%4,1);
  assert.equal(qr.isDark(0,0),true);assert.equal(qr.isDark(1,1),false);assert.equal(qr.isDark(3,3),true);
});
test("ABI dung ten ham va thu tu tham so cua nguon contract",()=>{
  assert(CONTRACT_ABI.includes("function hasRole(address account, bytes32 role) view returns (bool)"));
  assert(CONTRACT_ABI.some(x=>x.startsWith("function depositStake()")));
  assert(CONTRACT_ABI.some(x=>x.startsWith("function getCheckpoints(")));
  assert(CONTRACT_ABI.some(x=>x.startsWith("function verifyBatch(string batchCode, string inspectorNote, string certificateURI)")));
  assert(!CONTRACT_ABI.some(x=>x.startsWith("function stake(")));
  assert(isAddress(DEFAULT_CONFIG.contractAddress));
});
test("TC-01: producer du coc tao lo va co chang khoi tao",async()=>{
  const {service}=await demo();const before=await service.getPage();
  const tx=await service.prepare("createBatch",["HL-TEST-001","Me xung","Hue",""],parseETH("0.001"));
  const result=await service.send(tx);const batch=await service.getBatch("HL-TEST-001");
  assert.equal(result.demo,true);assert.equal(result.hash,null);
  assert.equal(batch.checkpoints.length,1);
  assert.equal((await service.getPage()).total,before.total+1);
});
test("TC-02: nop thieu phi bi chan, du lieu khong doi",async()=>{
  const {service}=await demo();const before=(await service.getPage()).total;
  await assert.rejects(service.prepare("createBatch",["HL-LOW","Me","Hue",""],parseETH("0.0005")),/InsufficientBatchFee/);
  assert.equal((await service.getPage()).total,before);
});
test("TC-03 GIAN LAN: khach mao danh producer bi chan",async()=>{
  const {service}=await demo("VISITOR");
  await assert.rejects(service.prepare("createBatch",["HL-FAKE","Me","Hue",""],parseETH("0.001")),/UnauthorizedCaller/);
  await assert.rejects(service.prepare("addCheckpoint",["HL-MEXUNG-2026-001",ROLE.LOGISTICS,"Kho gia","Ban giao gia",""]),/UnauthorizedCaller/);
  await assert.rejects(service.prepare("verifyBatch",["HL-MEXUNG-2026-002","Kiem dinh gia",""]),/UnauthorizedCaller/);
});
test("TC-04: ma lo trung bi chan",async()=>{
  const {service}=await demo();
  await assert.rejects(service.prepare("createBatch",["HL-MEXUNG-2026-001","Me","Hue",""],parseETH("0.001")),/BatchAlreadyExists/);
});
test("TC-05: rut coc som bi chan; het han thi reset so du va moc khoa",async()=>{
  const {service,advance}=await demo();
  await assert.rejects(service.prepare("withdrawStake"),/StillLocked/);
  advance(31*86400);await service.send(await service.prepare("withdrawStake"));
  const account=await service.getAccount();assert.equal(account.stake,0n);assert.equal(account.unlockAt,0);
});
test("TC-06: owner mien phi, ROLE_ADMIN khong tu dong la owner",async()=>{
  const {service}=await demo("OWNER");
  await service.send(await service.prepare("createBatch",["HL-OWNER","Me","Hue",""],0n));
  await service.send(await service.prepare("grantRole",[DEMO_ACCOUNTS.VISITOR,ROLE.ADMIN]));
  await service.connect("VISITOR");
  assert.equal((await service.getAccount()).isOwner,false);
  await assert.rejects(service.prepare("setBatchCreationFee",[parseETH("0.001")]),/OwnableUnauthorizedAccount/);
});
test("TC-07: phi vuot tran bi chan",async()=>{
  const {service}=await demo("OWNER");
  await assert.rejects(service.prepare("setBatchCreationFee",[parseETH("0.011")]),/FeeExceedsLimit/);
});
test("TC-08: doi vi giua luc chuan bi va xac nhan bi chan",async()=>{
  const {service}=await demo();const prepared=await service.prepare("createBatch",["HL-SWITCH","Me","Hue",""],parseETH("0.001"));
  await service.connect("VISITOR");await assert.rejects(service.send(prepared),/CONTEXT_CHANGED/);
});
test("TC-09: kiem dinh va thu hoi them lich su thay vi xoa",async()=>{
  const {service}=await demo("INSPECTOR");const code="HL-MEXUNG-2026-002";
  const before=(await service.getCheckpoints(code)).length;
  await service.send(await service.prepare("verifyBatch",[code,"Ho so mau",""]));
  assert.equal((await service.getBatch(code)).isVerified,true);
  await service.send(await service.prepare("revokeBatchVerification",[code,"Thu hoi mau"]));
  assert.equal((await service.getBatch(code)).isVerified,false);
  assert.equal((await service.getCheckpoints(code)).length,before+2);
});
test("Loi nested va tu choi vi duoc dich de hieu",()=>{
  assert.match(errorText({info:{error:{code:4001}}}),/từ chối/);
  assert.match(errorText({revert:{name:"UnauthorizedCaller"}}),/vai trò/);
});
