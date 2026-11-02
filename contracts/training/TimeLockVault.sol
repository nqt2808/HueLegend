// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Ket tiet kiem co khoa thoi gian (TimeLockVault)
/// @dev Bai mau ky thuat Lab 9: Mo hinh ky gui co dieu kien va khoa thoi gian
contract TimeLockVault {
    address public owner;
    uint256 public unlockTime;

    // Su kien ghi nhan nap va rut tien (su dung indexed de ho tro loc theo dia chi)
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // Cac loi tuy bien giup tiet kiem gas va tra ve tham so chi tiet
    error NotOwner();
    error StillLocked(uint256 unlockAt, uint256 currentTime);
    error NothingToWithdraw();
    error ZeroAmount();
    error TransferFailed();

    constructor(uint256 lockDurationSeconds) {
        owner = msg.sender;
        unlockTime = block.timestamp + lockDurationSeconds;
    }

    /// @dev Nap tien vao ket tiet kiem, ai cung co the nap duoc
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposited(msg.sender, msg.value);
    }

    /// @dev Rut tien khoi ket, chi chu so huu moi duoc rut khi da qua moc mo khoa
    function withdraw() external {
        // 1. Checks - Kiem tra dieu kien truoc
        if (msg.sender != owner) revert NotOwner();
        if (block.timestamp < unlockTime) revert StillLocked(unlockTime, block.timestamp);

        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        // 2. Effects - Cap nhat su kien / trang thai truoc khi chuyen tien
        emit Withdrawn(owner, amount);

        // 3. Interactions - Chuyen tien ra ngoai sau cung bang call de phong chong Reentrancy
        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @dev Xem thoi gian con lai truoc khi ket duoc mo khoa (tinh bang giay)
    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }
}
