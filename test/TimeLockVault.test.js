const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 09 - TimeLockVault Test Suite & Gas Profiling", function () {
  let timeLockVault;
  let owner, user2;
  const LOCK_DURATION = 120; // 120 giay (2 phut theo huong dan Lab 9)

  beforeEach(async function () {
    [owner, user2] = await ethers.getSigners();
    const TimeLockVaultFactory = await ethers.getContractFactory("TimeLockVault");
    timeLockVault = await TimeLockVaultFactory.deploy(LOCK_DURATION);
    await timeLockVault.waitForDeployment();
  });

  // R1 & R4: Ai cung nap duoc tien vao ket va tien phai > 0
  it("Thao tac 1: deposit() thanh cong voi 1 ETH va do luong Gas", async function () {
    const depositAmount = ethers.parseEther("1.0");
    const tx = await timeLockVault.connect(owner).deposit({ value: depositAmount });
    const receipt = await tx.wait();

    console.log("--> Gas used for deposit(1 ETH):", receipt.gasUsed.toString());
    expect(await ethers.provider.getBalance(await timeLockVault.getAddress())).to.equal(depositAmount);

    await expect(tx)
      .to.emit(timeLockVault, "Deposited")
      .withArgs(owner.address, depositAmount);
  });

  it("R4: Nap 0 ETH bi revert voi loi ZeroAmount", async function () {
    await expect(
      timeLockVault.connect(owner).deposit({ value: 0 })
    ).to.be.revertedWithCustomError(timeLockVault, "ZeroAmount");
  });

  // R3: Thu withdraw() ngay khi con bi khoa -> phai bi tu choi voi loi StillLocked
  it("Thao tac 2: withdraw() khi con khoa bi revert StillLocked va do luong Gas", async function () {
    // 1. Nap tien truoc
    await timeLockVault.connect(owner).deposit({ value: ethers.parseEther("1.0") });

    // 2. Thu rut ngay khi chua het 120 giay
    await expect(
      timeLockVault.connect(owner).withdraw()
    ).to.be.revertedWithCustomError(timeLockVault, "StillLocked");
  });

  // R2: Chi nguoi tao ket moi rut duoc (NotOwner)
  it("R2: Nguoi khac rut tien bi revert NotOwner", async function () {
    await timeLockVault.connect(owner).deposit({ value: ethers.parseEther("1.0") });
    await expect(
      timeLockVault.connect(user2).withdraw()
    ).to.be.revertedWithCustomError(timeLockVault, "NotOwner");
  });

  // R3: Cho het thoi gian khoa -> withdraw() thanh cong
  it("Thao tac 3: withdraw() thanh cong sau khi het 120 giay va do luong Gas", async function () {
    const depositAmount = ethers.parseEther("1.0");
    await timeLockVault.connect(owner).deposit({ value: depositAmount });

    // Tang thoi gian block them 125 giay de vuot qua unlockTime
    await ethers.provider.send("evm_increaseTime", [125]);
    await ethers.provider.send("evm_mine");

    const tx = await timeLockVault.connect(owner).withdraw();
    const receipt = await tx.wait();

    console.log("--> Gas used for withdraw() [Success]:", receipt.gasUsed.toString());

    await expect(tx)
      .to.emit(timeLockVault, "Withdrawn")
      .withArgs(owner.address, depositAmount);

    expect(await ethers.provider.getBalance(await timeLockVault.getAddress())).to.equal(0);
  });
});
