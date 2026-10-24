// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProjectCore} from "../contracts/ProjectCore.sol";

contract UntrustedWallet {
    function create(ProjectCore core, string calldata code) external {
        core.createBatch(code, "Me xung", "Hue", "");
    }
    function verify(ProjectCore core, string calldata code) external {
        core.verifyBatch(code, "kiem dinh", "");
    }
    function add(ProjectCore core, string calldata code) external {
        core.addCheckpoint(code, core.ROLE_RETAILER(), "Hue", "Ban le", "");
    }
}

contract ProjectCoreTest {
    function testOwnerCanCreate() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "sha256:abcdef");
        ProjectCore.Batch memory batch = core.getBatch("HL-1");
        require(batch.exists && batch.producer == address(this), "khong tao duoc lo");
        ProjectCore.Checkpoint[] memory cp = core.getCheckpoints("HL-1");
        require(cp.length == 1, "thieu chang goc");
    }
    function testUnauthorizedCannotCreate() public {
        ProjectCore core = new ProjectCore(address(this));
        UntrustedWallet stranger = new UntrustedWallet();
        (bool ok,) = address(stranger).call(abi.encodeCall(stranger.create, (core, "HL-FAKE")));
        require(!ok, "gia mao vai tro phai bi chan");
        require(core.getTotalBatches() == 0, "da ghi lo gia mao");
    }
    function testCannotDuplicateBatch() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "");
        (bool ok,) = address(core).call(abi.encodeCall(core.createBatch, ("HL-1", "Lan hai", "Hue", "")));
        require(!ok, "ma lo trung phai bi chan");
    }
    function testUnauthorizedCannotVerify() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "");
        UntrustedWallet stranger = new UntrustedWallet();
        (bool ok,) = address(stranger).call(abi.encodeCall(stranger.verify, (core, "HL-1")));
        require(!ok, "gia mao kiem dinh phai bi chan");
        ProjectCore.Batch memory b = core.getBatch("HL-1");
        require(!b.isVerified, "trang thai bi thay doi");
    }
    function testInsufficientCheckpointRole() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "");
        UntrustedWallet stranger = new UntrustedWallet();
        (bool ok,) = address(stranger).call(abi.encodeCall(stranger.add, (core, "HL-1")));
        require(!ok, "gia mao chang phai bi chan");
        ProjectCore.Checkpoint[] memory cp = core.getCheckpoints("HL-1");
        require(cp.length == 1, "khong duoc ghi them chang");
    }
    function testRejectOversizeCode() public {
        ProjectCore core = new ProjectCore(address(this));
        (bool ok,) = address(core).call(abi.encodeCall(core.createBatch, (
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "Me xung", "Hue", ""
        )));
        require(!ok, "ma qua 64 byte phai bi chan");
    }
    function testRoleGrantAndRevoke() public {
        ProjectCore core = new ProjectCore(address(this));
        UntrustedWallet carrier = new UntrustedWallet();
        require(!core.hasRole(address(carrier), core.ROLE_LOGISTICS()), "role da ton tai");
        core.grantRole(address(carrier), core.ROLE_LOGISTICS());
        require(core.hasRole(address(carrier), core.ROLE_LOGISTICS()), "khong cap duoc role");
        core.revokeRole(address(carrier), core.ROLE_LOGISTICS());
        require(!core.hasRole(address(carrier), core.ROLE_LOGISTICS()), "khong thu hoi duoc role");
    }
    function testRoleCannotClaimDifferentRole() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "");
        UntrustedWallet actor = new UntrustedWallet();
        core.grantRole(address(actor), core.ROLE_LOGISTICS());
        // Actor co vai logistics, nhung thu ma danh retailer.
        (bool ok,) = address(actor).call(abi.encodeCall(actor.add, (core, "HL-1")));
        require(!ok, "co the mao danh vai khac");
        require(core.getCheckpoints("HL-1").length == 1, "lich su da bi chen gia");
    }
    function testOwnerCanVerifyAndRevoke() public {
        ProjectCore core = new ProjectCore(address(this));
        core.createBatch("HL-1", "Me xung Hue", "Hue", "");
        core.verifyBatch("HL-1", "Du ho so", "sha256:abcd");
        require(core.getBatch("HL-1").isVerified, "chua xac nhan");
        core.revokeBatchVerification("HL-1", "Sai chung tu");
        require(!core.getBatch("HL-1").isVerified, "thu hoi that bai");
        require(core.getCheckpoints("HL-1").length == 3, "khong giu lai lich su");
    }
    function testFeeLimitAndInvalidFund() public {
        ProjectCore core = new ProjectCore(address(this));
        (bool feeOk,) = address(core).call(abi.encodeCall(core.setBatchCreationFee, (0.02 ether)));
        (bool fundOk,) = address(core).call(abi.encodeCall(core.setEcosystemFund, (address(0))));
        require(!feeOk && !fundOk, "bo qua kiem tra kinh te");
    }
    function testCannotVerifyMissingBatch() public {
        ProjectCore core = new ProjectCore(address(this));
        (bool ok,) = address(core).call(abi.encodeCall(core.verifyBatch, ("KHONG-CO", "", "")));
        require(!ok, "co the kiem dinh lo khong ton tai");
    }
    function testCannotWithdrawWithoutStake() public {
        ProjectCore core = new ProjectCore(address(this));
        (bool ok,) = address(core).call(abi.encodeCall(core.withdrawStake, ()));
        require(!ok, "rut khi chua coc phai bi chan");
    }
}
