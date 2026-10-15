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
    function testCannotWithdrawWithoutStake() public {
        ProjectCore core = new ProjectCore(address(this));
        (bool ok,) = address(core).call(abi.encodeCall(core.withdrawStake, ()));
        require(!ok, "rut khi chua coc phai bi chan");
    }
}
