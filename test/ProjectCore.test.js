const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HueLegend - ProjectCore (Traceability & Economic Rules Test Suite)", function () {
  let projectCore;
  let owner, producer, logistics, retailer, inspector, attacker, fundWallet;

  const BATCH_CODE = "HL-MEXUNG-2026-001";
  const PRODUCT_NAME = "Me Xung Thien Huong Thuong Hang";
  const ORIGIN = "Phu Hau, TP Hue";
  const INITIAL_URI = "ipfs://QmHueMeXungOCOP4StarBatch001";
  const STAKE_AMOUNT = ethers.parseEther("0.05");
  const BATCH_FEE = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, producer, logistics, retailer, inspector, attacker, fundWallet] = await ethers.getSigners();

    const ProjectCoreFactory = await ethers.getContractFactory("ProjectCore");
    projectCore = await ProjectCoreFactory.deploy();
    await projectCore.waitForDeployment();

    // Thiet lap vi quy phat trien he thong
    await projectCore.setEcosystemFund(fundWallet.address);

    // Cap quyen vai tro cho cac ben tham gia chuoi cung ung HueLegend
    const ROLE_PRODUCER = await projectCore.ROLE_PRODUCER();
    const ROLE_LOGISTICS = await projectCore.ROLE_LOGISTICS();
    const ROLE_RETAILER = await projectCore.ROLE_RETAILER();
    const ROLE_INSPECTOR = await projectCore.ROLE_INSPECTOR();

    await projectCore.grantRole(producer.address, ROLE_PRODUCER);
    await projectCore.grantRole(logistics.address, ROLE_LOGISTICS);
    await projectCore.grantRole(retailer.address, ROLE_RETAILER);
    await projectCore.grantRole(inspector.address, ROLE_INSPECTOR);

    // Co so san xuat nap tien ky quy cam ket chat luong (0.05 ETH)
    await projectCore.connect(producer).depositStake({ value: STAKE_AMOUNT });
  });

  // ================= CA KIEM THU 1: HOP LE (CREATION & FEE COLLECTION) =================
  it("TC-01: Co so da nap coc va nop du phi 0.001 ETH tao lo hang thanh cong va phat event", async function () {
    const fundBefore = await ethers.provider.getBalance(fundWallet.address);

    await expect(
      projectCore.connect(producer).createBatch(
        BATCH_CODE,
        PRODUCT_NAME,
        ORIGIN,
        INITIAL_URI,
        { value: BATCH_FEE }
      )
    )
      .to.emit(projectCore, "BatchCreated")
      .withArgs(BATCH_CODE, PRODUCT_NAME, producer.address, (val) => val > 0)
      .and.to.emit(projectCore, "BatchFeeCollected")
      .withArgs(producer.address, BATCH_CODE, BATCH_FEE);

    const batch = await projectCore.getBatch(BATCH_CODE);
    expect(batch.batchCode).to.equal(BATCH_CODE);
    expect(batch.productName).to.equal(PRODUCT_NAME);
    expect(batch.origin).to.equal(ORIGIN);
    expect(batch.producer).to.equal(producer.address);
    expect(batch.isVerified).to.be.false;

    // Kiem tra quy ecosystemFund da nhan dung 0.001 ETH
    const fundAfter = await ethers.provider.getBalance(fundWallet.address);
    expect(fundAfter - fundBefore).to.equal(BATCH_FEE);
  });

  // ================= CA KIEM THU VI PHAM QUY TAC KINH TE (LAB 11) =================
  it("TC-01b (Lab 11 - Vi pham kinh te): Nop thieu phi tao lo bi tu choi bang loi InsufficientBatchFee", async function () {
    const insufficientFee = ethers.parseEther("0.0005"); // Thieu 0.0005 ETH

    await expect(
      projectCore.connect(producer).createBatch(
        "HL-UNDERPAID-001",
        "Me Xung Thieu Phi",
        "Hue",
        "",
        { value: insufficientFee }
      )
    ).to.be.revertedWithCustomError(projectCore, "InsufficientBatchFee")
     .withArgs(insufficientFee, BATCH_FEE);
  });

  it("TC-01c (Lab 11 - Vi pham tran phi): Admin co tinh set phi vuot qua Circuit Breaker (0.01 ETH) bi revert FeeExceedsLimit", async function () {
    const tooHighFee = ethers.parseEther("0.02"); // Vuot qua tran 0.01 ETH
    await expect(
      projectCore.connect(owner).setBatchCreationFee(tooHighFee)
    ).to.be.revertedWithCustomError(projectCore, "FeeExceedsLimit")
     .withArgs(tooHighFee, ethers.parseEther("0.01"));
  });

  // ================= CA KIEM THU 2: HOP LE (CHECKPOINT BY ROLE) =================
  it("TC-02: Don vi van chuyen (dung vai tro) them chang hanh trinh thanh cong", async function () {
    await projectCore.connect(producer).createBatch(
      BATCH_CODE,
      PRODUCT_NAME,
      ORIGIN,
      INITIAL_URI,
      { value: BATCH_FEE }
    );

    const ROLE_LOGISTICS = await projectCore.ROLE_LOGISTICS();
    const LOCATION = "Ga Hue, Phuong Duc, TP Hue";
    const ACTION = "Xuat kho van chuyen di Ha Noi qua duong sat";
    const META_URI = "ipfs://QmLogisticsShipmentReceipt001";

    await expect(
      projectCore.connect(logistics).addCheckpoint(
        BATCH_CODE,
        ROLE_LOGISTICS,
        LOCATION,
        ACTION,
        META_URI
      )
    )
      .to.emit(projectCore, "CheckpointAdded")
      .withArgs(BATCH_CODE, logistics.address, ROLE_LOGISTICS, ACTION, LOCATION, (val) => val > 0);

    const checkpoints = await projectCore.getCheckpoints(BATCH_CODE);
    expect(checkpoints.length).to.equal(2);
  });

  // ================= CA KIEM THU 3: GIAN LAN / KHONG PHAN QUYEN (FRAUD CASE) =================
  it("TC-03 (Gian lan): Dia chi la khong co quyen co tinh them chang bi revert UnauthorizedCaller", async function () {
    await projectCore.connect(producer).createBatch(
      BATCH_CODE,
      PRODUCT_NAME,
      ORIGIN,
      INITIAL_URI,
      { value: BATCH_FEE }
    );

    const ROLE_INSPECTOR = await projectCore.ROLE_INSPECTOR();

    await expect(
      projectCore.connect(attacker).addCheckpoint(
        BATCH_CODE,
        ROLE_INSPECTOR,
        "Co so gia mao khong phep",
        "Gia mao chung nhan kiem dinh OCOP Hue",
        "ipfs://QmFakeCertificateHash"
      )
    ).to.be.revertedWithCustomError(projectCore, "UnauthorizedCaller")
     .withArgs(attacker.address, ROLE_INSPECTOR);
  });

  // ================= CA KIEM THU 4: KIỂM ĐỊNH OCOP & THU HỒI TEM =================
  it("TC-04: Kiem dinh OCOP 2 lan bi revert va co the thu hoi tem khi vi pham", async function () {
    await projectCore.connect(producer).createBatch(
      BATCH_CODE,
      PRODUCT_NAME,
      ORIGIN,
      INITIAL_URI,
      { value: BATCH_FEE }
    );

    // Inspector verify
    await projectCore.connect(inspector).verifyBatch(
      BATCH_CODE,
      "Chung nhan OCOP 4 sao",
      "ipfs://QmCertificateHash"
    );

    // Verify lan 2 -> Revert
    await expect(
      projectCore.connect(inspector).verifyBatch(
        BATCH_CODE,
        "Chung nhan lan 2 trung lap",
        ""
      )
    ).to.be.revertedWithCustomError(projectCore, "BatchAlreadyVerified")
     .withArgs(BATCH_CODE);

    // Thu hoi tem
    await expect(
      projectCore.connect(inspector).revokeBatchVerification(
        BATCH_CODE,
        "Phat hien bao bi rach va nhiem khuan"
      )
    ).to.emit(projectCore, "BatchVerificationRevoked");

    const batchAfterRevoke = await projectCore.getBatch(BATCH_CODE);
    expect(batchAfterRevoke.isVerified).to.be.false;
  });
});
