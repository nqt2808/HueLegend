const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 11 - ClassPoint Economic Rules Test Suite", function () {
  let classPoint;
  let owner, classFund, studentA, studentB;

  beforeEach(async function () {
    [owner, classFund, studentA, studentB] = await ethers.getSigners();

    const ClassPointFactory = await ethers.getContractFactory("ClassPoint");
    classPoint = await ClassPointFactory.deploy(classFund.address);
    await classPoint.waitForDeployment();
  });

  // Ba diem can hieu:
  // 1. Diem co ban: feeBps = 100 (1%)
  // 2. Vi sao co from != owner(): chu so huu phat token khong bi tru phi
  it("Quy tac 1: Phat token tu owner khong bi thu phi (from != owner)", async function () {
    const transferAmount = ethers.parseUnits("1000", 18);
    // Owner chuyen 1000 CLP cho Student A -> A nhan tron ven 1000
    await classPoint.connect(owner).transfer(studentA.address, transferAmount);

    expect(await classPoint.balanceOf(studentA.address)).to.equal(transferAmount);
    expect(await classPoint.balanceOf(classFund.address)).to.equal(0);
  });

  it("Quy tac 1 (Thu phi 1%): Chuyen giua hai sinh vien bi tru 1% vao quy classFund", async function () {
    // 1. Phat token cho Student A
    const initialAmount = ethers.parseUnits("1000", 18);
    await classPoint.connect(owner).transfer(studentA.address, initialAmount);

    // 2. Student A chuyen 100 CLP cho Student B
    const sendAmount = ethers.parseUnits("100", 18);
    const expectedFee = ethers.parseUnits("1", 18);     // 1% cua 100 = 1 CLP
    const expectedReceived = ethers.parseUnits("99", 18); // 99 CLP

    await expect(classPoint.connect(studentA).transfer(studentB.address, sendAmount))
      .to.emit(classPoint, "FeeCollected")
      .withArgs(studentA.address, expectedFee);

    expect(await classPoint.balanceOf(studentB.address)).to.equal(expectedReceived);
    expect(await classPoint.balanceOf(classFund.address)).to.equal(expectedFee);
  });

  // 3. Quy tac tran nam giu 2% tong cung (maxHolding)
  it("Quy tac 2: Chuyen vuot tran 2% tong cung bi revert ExceedsMaxHolding", async function () {
    const maxHolding = await classPoint.maxHolding();
    const exceedsAmount = maxHolding + ethers.parseUnits("10", 18);

    // Thu chuyen qua tran cho Student A -> Bi revert
    await expect(
      classPoint.connect(owner).transfer(studentA.address, exceedsAmount)
    ).to.be.revertedWithCustomError(classPoint, "ExceedsMaxHolding");
  });
});
