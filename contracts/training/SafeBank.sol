// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SafeBankCEI
 * @dev Cach 1 va loi Reentrancy: Doi thu tu Checks - Effects - Interactions (CEI).
 * Cap nhat so sach (balances[msg.sender] = 0) TRUOC KHI chuyen tien ra ngoai.
 * Khong can them thu vien, khong ton them phi gas cho bien khoa.
 */
contract SafeBankCEI {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    error NoBalance();
    error TransferFailed();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external {
        // 1. Checks: Kiem tra so du cua nguoi goi
        uint256 balance = balances[msg.sender];
        if (balance == 0) revert NoBalance();

        // 2. Effects: Cap nhat so sach TRUOC KHI gui tien
        balances[msg.sender] = 0;
        emit Withdraw(msg.sender, balance);

        // 3. Interactions: Chuyen tien ra ngoai sau cung
        (bool ok, ) = msg.sender.call{value: balance}("");
        if (!ok) revert TransferFailed();
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title SafeBankGuard
 * @dev Cach 2 va loi Reentrancy: Ke thua ReentrancyGuard cua OpenZeppelin 5.x.
 * Dung modifier nonReentrant de khoa khong cho goi lai trong cung mot transaction.
 */
contract SafeBankGuard is ReentrancyGuard {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    error NoBalance();
    error TransferFailed();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external nonReentrant {
        // Checks
        uint256 balance = balances[msg.sender];
        if (balance == 0) revert NoBalance();

        // Effects
        balances[msg.sender] = 0;
        emit Withdraw(msg.sender, balance);

        // Interactions
        (bool ok, ) = msg.sender.call{value: balance}("");
        if (!ok) revert TransferFailed();
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title AttackerSafe
 * @dev Hop dong thu nghiem tan cong lai vao cac ngan hang da duoc va loi.
 * Chung minh cuoc tan cong that bai hoan toan.
 */
contract AttackerSafe {
    address public targetBank;
    address public owner;

    event AttackAttempted(address indexed target, uint256 amount);
    event AttackFailed(string reason);

    constructor(address _targetBank) {
        targetBank = _targetBank;
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Can it nhat 1 ETH lam von");
        emit AttackAttempted(targetBank, msg.value);

        // Nap tien va thu rut
        (bool depOk, ) = targetBank.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(depOk, "Deposit that bai");

        (bool withOk, ) = targetBank.call(abi.encodeWithSignature("withdraw()"));
        require(withOk, "Withdraw that bai");
    }

    receive() external payable {
        if (targetBank.balance >= 1 ether) {
            // Co tinh goi lai de tai nhap
            (bool ok, ) = targetBank.call(abi.encodeWithSignature("withdraw()"));
            if (!ok) {
                emit AttackFailed("Bi chan tai buoc goi lai withdraw()");
            }
        }
    }
}
