// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HueLegend ProjectCore
 * @notice Ban implementation moi tuong thich voi frontend. KHONG phai bytecode da deploy truoc day.
 * @dev Giu quy tac README: phi 0.001 ETH, coc 0.05 ETH khoa 30 ngay, 5 vai, QR doc mien phi.
 */
contract ProjectCore is Ownable, ReentrancyGuard {
    bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN");
    bytes32 public constant ROLE_PRODUCER = keccak256("ROLE_PRODUCER");
    bytes32 public constant ROLE_LOGISTICS = keccak256("ROLE_LOGISTICS");
    bytes32 public constant ROLE_RETAILER = keccak256("ROLE_RETAILER");
    bytes32 public constant ROLE_INSPECTOR = keccak256("ROLE_INSPECTOR");

    uint256 public constant MIN_STAKE_AMOUNT = 0.05 ether;
    uint256 public constant MAX_BATCH_FEE_LIMIT = 0.01 ether;
    uint256 public constant MAX_CHECKPOINTS_PER_BATCH = 50;
    uint256 public constant MAX_BATCH_CODE_LENGTH = 64;
    uint256 public constant MAX_PRODUCT_NAME_LENGTH = 128;
    uint256 public constant MAX_LOCATION_LENGTH = 128;
    uint256 public constant MAX_METADATA_LENGTH = 2048;

    struct Batch {
        string batchCode;
        string productName;
        string origin;
        uint256 createdAt;
        address producer;
        bool isVerified;
        bool exists;
    }
    struct Checkpoint {
        uint256 timestamp;
        address recorder;
        bytes32 role;
        string location;
        string action;
        string metadataURI;
    }

    mapping(string => Batch) private _batches;
    mapping(string => Checkpoint[]) private _checkpoints;
    string[] private _codes;
    mapping(address => mapping(bytes32 => bool)) private _roles;
    mapping(address => uint256) public producerStake;
    mapping(address => uint256) public producerUnlockTime;

    uint256 public batchCreationFee = 0.001 ether;
    uint256 public stakeLockDuration = 30 days;
    address public ecosystemFund;

    error BatchAlreadyExists(string batchCode);
    error BatchNotFound(string batchCode);
    error UnauthorizedCaller(address caller, bytes32 requiredRole);
    error EmptyString(string paramName);
    error StringTooLong(string paramName, uint256 maxAllowed);
    error InvalidAddress();
    error InvalidRole(bytes32 role);
    error ZeroAmount();
    error StillLocked(uint256 unlockAt, uint256 currentTime);
    error NothingToWithdraw();
    error TransferFailed();
    error StakeTooLow(uint256 provided, uint256 minimum);
    error MaxCheckpointsExceeded(string batchCode, uint256 maxAllowed);
    error BatchAlreadyVerified(string batchCode);
    error BatchNotVerified(string batchCode);
    error InsufficientBatchFee(uint256 provided, uint256 requiredFee);
    error FeeExceedsLimit(uint256 attempted, uint256 maxLimit);

    event BatchCreated(string indexed batchCode, string productName, address indexed producer, uint256 timestamp);
    event CheckpointAdded(string indexed batchCode, address indexed recorder, bytes32 indexed role, string action, string location, uint256 timestamp);
    event BatchVerified(string indexed batchCode, address indexed inspector, uint256 timestamp);
    event BatchVerificationRevoked(string indexed batchCode, address indexed inspector, string reason, uint256 timestamp);
    event RoleAssigned(address indexed account, bytes32 indexed role);
    event RoleRevoked(address indexed account, bytes32 indexed role);
    event StakeDeposited(address indexed producer, uint256 amount, uint256 unlockTime);
    event StakeWithdrawn(address indexed producer, uint256 amount);
    event BatchFeeCollected(address indexed producer, string indexed batchCode, uint256 feeAmount);
    event ExcessFeeRefunded(address indexed producer, uint256 refundAmount);
    event BatchCreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event EcosystemFundUpdated(address indexed oldFund, address indexed newFund);
    event StakeLockDurationUpdated(uint256 oldDuration, uint256 newDuration);

    constructor(address initialFund) Ownable(msg.sender) {
        if (initialFund == address(0)) revert InvalidAddress();
        ecosystemFund = initialFund;
        _roles[msg.sender][ROLE_ADMIN] = true;
        emit RoleAssigned(msg.sender, ROLE_ADMIN);
    }

    modifier onlyRole(bytes32 role) {
        if (msg.sender != owner() && !_roles[msg.sender][role]) revert UnauthorizedCaller(msg.sender, role);
        _;
    }

    function hasRole(address account, bytes32 role) external view returns (bool) {
        return account == owner() || _roles[account][role];
    }

    function _knownRole(bytes32 role) private pure returns (bool) {
        return role == ROLE_ADMIN || role == ROLE_PRODUCER || role == ROLE_LOGISTICS || role == ROLE_RETAILER || role == ROLE_INSPECTOR;
    }

    function grantRole(address account, bytes32 role) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (!_knownRole(role)) revert InvalidRole(role);
        if (!_roles[account][role]) {
            _roles[account][role] = true;
            emit RoleAssigned(account, role);
        }
    }

    function revokeRole(address account, bytes32 role) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (!_knownRole(role)) revert InvalidRole(role);
        if (_roles[account][role]) {
            _roles[account][role] = false;
            emit RoleRevoked(account, role);
        }
    }

    function _text(string memory value, string memory name, uint256 maxBytes) private pure {
        uint256 size = bytes(value).length;
        if (size == 0) revert EmptyString(name);
        if (size > maxBytes) revert StringTooLong(name, maxBytes);
    }

    function _optional(string memory value, string memory name, uint256 maxBytes) private pure {
        if (bytes(value).length > maxBytes) revert StringTooLong(name, maxBytes);
    }

    function _getBatch(string memory code) private view returns (Batch storage batch) {
        batch = _batches[code];
        if (!batch.exists) revert BatchNotFound(code);
    }

    function _checkpoint(string memory code, bytes32 role, string memory location, string memory action, string memory uri) private {
        if (_checkpoints[code].length >= MAX_CHECKPOINTS_PER_BATCH) {
            revert MaxCheckpointsExceeded(code, MAX_CHECKPOINTS_PER_BATCH);
        }
        _text(location, "location", MAX_LOCATION_LENGTH);
        _text(action, "action", MAX_METADATA_LENGTH);
        _optional(uri, "metadataURI", MAX_METADATA_LENGTH);
        _checkpoints[code].push(Checkpoint(block.timestamp, msg.sender, role, location, action, uri));
        emit CheckpointAdded(code, msg.sender, role, action, location, block.timestamp);
    }

    function depositStake() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        producerStake[msg.sender] += msg.value;
        // Neu da het han khoa thi khoi dong mot ky khoa moi.
        if (block.timestamp >= producerUnlockTime[msg.sender]) {
            producerUnlockTime[msg.sender] = block.timestamp + stakeLockDuration;
        }
        emit StakeDeposited(msg.sender, msg.value, producerUnlockTime[msg.sender]);
    }

    function withdrawStake() external nonReentrant {
        uint256 amount = producerStake[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        uint256 unlock = producerUnlockTime[msg.sender];
        if (block.timestamp < unlock) revert StillLocked(unlock, block.timestamp);
        producerStake[msg.sender] = 0;
        producerUnlockTime[msg.sender] = 0;
        emit StakeWithdrawn(msg.sender, amount);
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function getStakeInfo(address producer) external view returns (uint256 balance, uint256 unlockAt, uint256 remainingSeconds) {
        balance = producerStake[producer];
        unlockAt = producerUnlockTime[producer];
        remainingSeconds = block.timestamp >= unlockAt ? 0 : unlockAt - block.timestamp;
    }

    function createBatch(
        string calldata batchCode,
        string calldata productName,
        string calldata origin,
        string calldata initialMetadataURI
    ) external payable nonReentrant onlyRole(ROLE_PRODUCER) {
        _text(batchCode, "batchCode", MAX_BATCH_CODE_LENGTH);
        _text(productName, "productName", MAX_PRODUCT_NAME_LENGTH);
        _text(origin, "origin", MAX_LOCATION_LENGTH);
        _optional(initialMetadataURI, "initialMetadataURI", MAX_METADATA_LENGTH);
        if (_batches[batchCode].exists) revert BatchAlreadyExists(batchCode);
        if (msg.sender != owner() && producerStake[msg.sender] < MIN_STAKE_AMOUNT) {
            revert StakeTooLow(producerStake[msg.sender], MIN_STAKE_AMOUNT);
        }
        uint256 fee = msg.sender == owner() ? 0 : batchCreationFee;
        if (msg.value < fee) revert InsufficientBatchFee(msg.value, fee);

        _batches[batchCode] = Batch(batchCode, productName, origin, block.timestamp, msg.sender, false, true);
        _codes.push(batchCode);
        emit BatchCreated(batchCode, productName, msg.sender, block.timestamp);
        _checkpoint(batchCode, ROLE_PRODUCER, origin, "Khoi tao lo hang tai co so san xuat", initialMetadataURI);

        if (fee > 0) {
            emit BatchFeeCollected(msg.sender, batchCode, fee);
            (bool feeOk,) = payable(ecosystemFund).call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }
        uint256 refund = msg.value - fee;
        if (refund > 0) {
            emit ExcessFeeRefunded(msg.sender, refund);
            (bool refundOk,) = payable(msg.sender).call{value: refund}("");
            if (!refundOk) revert TransferFailed();
        }
    }

    function addCheckpoint(
        string calldata batchCode,
        bytes32 role,
        string calldata location,
        string calldata action,
        string calldata metadataURI
    ) external nonReentrant {
        _getBatch(batchCode);
        if (role != ROLE_PRODUCER && role != ROLE_LOGISTICS && role != ROLE_RETAILER && role != ROLE_INSPECTOR) revert InvalidRole(role);
        if (msg.sender != owner() && !_roles[msg.sender][role]) revert UnauthorizedCaller(msg.sender, role);
        _checkpoint(batchCode, role, location, action, metadataURI);
    }

    function verifyBatch(string calldata batchCode, string calldata inspectorNote, string calldata certificateURI)
        external nonReentrant onlyRole(ROLE_INSPECTOR) {
        Batch storage batch = _getBatch(batchCode);
        if (batch.isVerified) revert BatchAlreadyVerified(batchCode);
        _optional(inspectorNote, "inspectorNote", MAX_METADATA_LENGTH);
        _optional(certificateURI, "certificateURI", MAX_METADATA_LENGTH);
        batch.isVerified = true;
        _checkpoint(batchCode, ROLE_INSPECTOR, "Kiem dinh, Hue", bytes(inspectorNote).length == 0 ? "Da kiem dinh" : inspectorNote, certificateURI);
        emit BatchVerified(batchCode, msg.sender, block.timestamp);
    }

    function revokeBatchVerification(string calldata batchCode, string calldata reason)
        external nonReentrant onlyRole(ROLE_INSPECTOR) {
        Batch storage batch = _getBatch(batchCode);
        if (!batch.isVerified) revert BatchNotVerified(batchCode);
        _text(reason, "reason", MAX_METADATA_LENGTH - 32);
        batch.isVerified = false;
        _checkpoint(batchCode, ROLE_INSPECTOR, "Kiem dinh, Hue", string.concat("Thu hoi kiem dinh: ", reason), "");
        emit BatchVerificationRevoked(batchCode, msg.sender, reason, block.timestamp);
    }

    function getBatch(string calldata batchCode) external view returns (Batch memory) { return _getBatch(batchCode); }
    function getCheckpoints(string calldata batchCode) external view returns (Checkpoint[] memory) {
        _getBatch(batchCode);
        return _checkpoints[batchCode];
    }
    function getTotalBatches() external view returns (uint256) { return _codes.length; }
    function getBatchCodeByIndex(uint256 index) external view returns (string memory) { return _codes[index]; }

    function setBatchCreationFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_BATCH_FEE_LIMIT) revert FeeExceedsLimit(newFee, MAX_BATCH_FEE_LIMIT);
        uint256 old = batchCreationFee;
        batchCreationFee = newFee;
        emit BatchCreationFeeUpdated(old, newFee);
    }
    function setEcosystemFund(address newFund) external onlyOwner {
        if (newFund == address(0)) revert InvalidAddress();
        address old = ecosystemFund;
        ecosystemFund = newFund;
        emit EcosystemFundUpdated(old, newFund);
    }
    function setStakeLockDuration(uint256 newDuration) external onlyOwner {
        uint256 old = stakeLockDuration;
        stakeLockDuration = newDuration;
        emit StakeLockDurationUpdated(old, newDuration);
    }
}
