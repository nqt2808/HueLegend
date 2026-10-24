import test from "node:test";
import assert from "node:assert/strict";
import { BackendReadClient } from "../web/js/services/backend.js";

const address = "0x35655079aebb215e58e379d5a8c2f1f3a5323c6b";
const config = { chainId: 11155111, contractAddress: address };
function response(data, status = 200) { return { ok: status === 200, status, json: async () => data }; }

test("API check: chi nhan du lieu Sepolia dung contract", async () => {
  const before = globalThis.fetch;
  let requested = "";
  globalThis.fetch = async url => {
    requested = String(url);
    return response({ ok: true, source: "sepolia-onchain", chainId: 11155111,
      contractAddress: address, totalBatches: 0 });
  };
  try {
    const client = new BackendReadClient(config);
    assert.equal(await client.probe(), true);
    assert.match(requested, /\/api\/health$/);
  } finally { globalThis.fetch = before; }
});

test("API check: khong nhan du lieu khac mang", async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async () => response({ ok: true, source: "sepolia-onchain", chainId: 1, contractAddress: address });
  try { assert.equal(await new BackendReadClient(config).probe(), false); }
  finally { globalThis.fetch = before; }
});

test("API check: khong nhan du lieu contract khac", async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async () => response({ ok: true, source: "sepolia-onchain", chainId: 11155111,
    contractAddress: "0x1234567890123456789012345678901234567890" });
  try { assert.equal(await new BackendReadClient(config).probe(), false); }
  finally { globalThis.fetch = before; }
});

test("API check: mat backend thi khong dung du lieu mau", async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async () => response({ ok: false }, 503);
  try { assert.equal(await new BackendReadClient(config).probe(), false); }
  finally { globalThis.fetch = before; }
});

test("API list: truong phan trang duoc truyen dung", async () => {
  const before = globalThis.fetch;
  let requested;
  globalThis.fetch = async url => {
    requested = new URL(url);
    return response({ ok: true, source: "sepolia-onchain", chainId: 11155111,
      contractAddress: address, total: 12, items: [{ batchCode: "HL-01" }], blockNumber: 77 });
  };
  try {
    const c = new BackendReadClient(config);
    const d = await c.getPage(1, 8);
    assert.equal(d.total, 12);
    assert.equal(d.items[0].batchCode, "HL-01");
    assert.equal(requested.pathname, "/api/batches");
    assert.equal(requested.searchParams.get("page"), "1");
    assert.equal(requested.searchParams.get("size"), "8");
  } finally { globalThis.fetch = before; }
});
