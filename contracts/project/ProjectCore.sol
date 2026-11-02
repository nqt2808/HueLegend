// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Hop dong thong minh HueLegend duoi 150 dong (Lab 11 - Lab 15)
contract ProjectCore is Ownable, ReentrancyGuard {
    bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN"); bytes32 public constant ROLE_PRODUCER = keccak256("ROLE_PRODUCER");
    bytes32 public constant ROLE_LOGISTICS = keccak256("ROLE_LOGISTICS"); bytes32 public constant ROLE_RETAILER = keccak256("ROLE_RETAILER");
    bytes32 public constant ROLE_INSPECTOR = keccak256("ROLE_INSPECTOR");
    address public ecosystemFund; uint256 public batchCreationFee = 0.001 ether;
    uint256 public constant MAX_BATCH_FEE_LIMIT = 0.01 ether; uint256 public constant MIN_STAKE_AMOUNT = 0.05 ether;
    uint256 public constant MAX_CHECKPOINTS_PER_BATCH = 50; uint256 public stakeLockDuration = 30 days;
    uint256 public constant MAX_BATCH_CODE_LENGTH = 64; uint256 public constant MAX_PRODUCT_NAME_LENGTH = 128; uint256 public constant MAX_LOCATION_LENGTH = 128;
    struct Checkpoint { uint256 timestamp; address recorder; bytes32 role; string location; string action; string metadataURI; }
    struct Batch { string batchCode; string productName; string origin; uint256 createdAt; address producer; bool isVerified; bool exists; }
    mapping(string => Batch) private _batches; mapping(string => Checkpoint[]) private _batchCheckpoints;
    string[] private _allBatchCodes; mapping(address => mapping(bytes32 => bool)) private _roles;
    mapping(address => uint256) public producerStake; mapping(address => uint256) public producerUnlockTime;

    error BatchAlreadyExists(string batchCode); error BatchNotFound(string batchCode); error UnauthorizedCaller(address caller, bytes32 requiredRole);
    error EmptyString(string paramName); error StringTooLong(string paramName, uint256 maxAllowed); error InvalidAddress(); error ZeroAmount();
    error StillLocked(uint256 unlockAt, uint256 currentTime); error NothingToWithdraw(); error TransferFailed(); error StakeTooLow(uint256 provided, uint256 minimum);
    error MaxCheckpointsExceeded(string batchCode, uint256 maxAllowed); error BatchAlreadyVerified(string batchCode); error BatchNotVerified(string batchCode);
    error InsufficientBatchFee(uint256 provided, uint256 requiredFee); error FeeExceedsLimit(uint256 attempted, uint256 maxLimit);

    event BatchCreated(string indexed batchCode, string productName, address indexed producer, uint256 timestamp);
    event CheckpointAdded(string indexed batchCode, address indexed recorder, bytes32 indexed role, string action, string location, uint256 timestamp);
    event BatchVerified(string indexed batchCode, address indexed inspector, uint256 timestamp); event BatchVerificationRevoked(string indexed batchCode, address indexed inspector, string reason, uint256 timestamp);
    event RoleAssigned(address indexed account, bytes32 indexed role); event RoleRevoked(address indexed account, bytes32 indexed role);
    event StakeDeposited(address indexed producer, uint256 amount, uint256 unlockTime); event StakeWithdrawn(address indexed producer, uint256 amount);
    event StakeLockDurationUpdated(uint256 oldDuration, uint256 newDuration); event BatchFeeCollected(address indexed producer, string indexed batchCode, uint256 feeAmount);
    event ExcessFeeRefunded(address indexed producer, uint256 refundAmount); event BatchCreationFeeUpdated(uint256 oldFee, uint256 newFee); event EcosystemFundUpdated(address indexed oldFund, address indexed newFund);

    constructor() Ownable(msg.sender) {
        _roles[msg.sender][ROLE_ADMIN] = true; _roles[msg.sender][ROLE_PRODUCER] = true; ecosystemFund = msg.sender;
        emit RoleAssigned(msg.sender, ROLE_ADMIN); emit RoleAssigned(msg.sender, ROLE_PRODUCER); emit EcosystemFundUpdated(address(0), msg.sender);
    }
    modifier onlyRole(bytes32 role) { if (!_roles[msg.sender][role] && msg.sender != owner()) revert UnauthorizedCaller(msg.sender, role); _; }
    function grantRole(address account, bytes32 role) external onlyOwner { if (account == address(0)) revert InvalidAddress(); _roles[account][role] = true; emit RoleAssigned(account, role); }
    function revokeRole(address account, bytes32 role) external onlyOwner { if (account == address(0)) revert InvalidAddress(); _roles[account][role] = false; emit RoleRevoked(account, role); }
    function hasRole(address account, bytes32 role) external view returns (bool) { return (account == owner()) || _roles[account][role]; }
    function setStakeLockDuration(uint256 newDuration) external onlyOwner { emit StakeLockDurationUpdated(stakeLockDuration, newDuration); stakeLockDuration = newDuration; }
    function setEcosystemFund(address newFund) external onlyOwner { if (newFund == address(0)) revert InvalidAddress(); emit EcosystemFundUpdated(ecosystemFund, newFund); ecosystemFund = newFund; }
    function setBatchCreationFee(uint256 newFee) external onlyOwner { if (newFee > MAX_BATCH_FEE_LIMIT) revert FeeExceedsLimit(newFee, MAX_BATCH_FEE_LIMIT); emit BatchCreationFeeUpdated(batchCreationFee, newFee); batchCreationFee = newFee; }

    // Nap va rut tien ky quy co thoi gian khoa (Hop dong khong tu dong goi ma phai co nguoi goi)
    function depositStake() external payable {
        if (msg.value == 0) revert ZeroAmount();
        producerStake[msg.sender] += msg.value;
        if (block.timestamp >= producerUnlockTime[msg.sender]) producerUnlockTime[msg.sender] = block.timestamp + stakeLockDuration;
        emit StakeDeposited(msg.sender, msg.value, producerUnlockTime[msg.sender]);
    }
    function withdrawStake() external nonReentrant {
        uint256 amount = producerStake[msg.sender]; if (amount == 0) revert NothingToWithdraw();
        uint256 unlockAt = producerUnlockTime[msg.sender]; if (block.timestamp < unlockAt) revert StillLocked(unlockAt, block.timestamp);
        producerStake[msg.sender] = 0; producerUnlockTime[msg.sender] = 0;
        emit StakeWithdrawn(msg.sender, amount);
        (bool ok, ) = payable(msg.sender).call{value: amount}(""); if (!ok) revert TransferFailed();
    }
    function getStakeInfo(address producer) external view returns (uint256 balance, uint256 unlockAt, uint256 remainingSeconds) {
        balance = producerStake[producer]; unlockAt = producerUnlockTime[producer];
        remainingSeconds = block.timestamp >= unlockAt ? 0 : (unlockAt - block.timestamp);
    }

    // Tao lo hang: kiem tra coc, thu phi 0.001 ETH, hoan phi thua
    function createBatch(string calldata batchCode, string calldata productName, string calldata origin, string calldata initialMetadataURI) external payable onlyRole(ROLE_PRODUCER) nonReentrant {
        if (bytes(batchCode).length == 0) revert EmptyString("batchCode"); if (bytes(batchCode).length > MAX_BATCH_CODE_LENGTH) revert StringTooLong("batchCode", MAX_BATCH_CODE_LENGTH);
        if (bytes(productName).length == 0) revert EmptyString("productName"); if (bytes(productName).length > MAX_PRODUCT_NAME_LENGTH) revert StringTooLong("productName", MAX_PRODUCT_NAME_LENGTH);
        if (bytes(origin).length == 0) revert EmptyString("origin"); if (bytes(origin).length > MAX_LOCATION_LENGTH) revert StringTooLong("origin", MAX_LOCATION_LENGTH);
        if (_batches[batchCode].exists) revert BatchAlreadyExists(batchCode);
        if (producerStake[msg.sender] < MIN_STAKE_AMOUNT && msg.sender != owner()) revert StakeTooLow(producerStake[msg.sender], MIN_STAKE_AMOUNT);
        if (msg.value < batchCreationFee && msg.sender != owner()) revert InsufficientBatchFee(msg.value, batchCreationFee);

        _batches[batchCode] = Batch(batchCode, productName, origin, block.timestamp, msg.sender, false, true); _allBatchCodes.push(batchCode);
        _batchCheckpoints[batchCode].push(Checkpoint(block.timestamp, msg.sender, ROLE_PRODUCER, origin, "Khoi tao lo hang dac san tai co so san xuat", initialMetadataURI));
        emit BatchCreated(batchCode, productName, msg.sender, block.timestamp);
        emit CheckpointAdded(batchCode, msg.sender, ROLE_PRODUCER, "Khoi tao lo hang dac san tai co so san xuat", origin, block.timestamp);

        uint256 feeToCollect = msg.sender == owner() ? 0 : batchCreationFee;
        uint256 excess = msg.value > feeToCollect ? msg.value - feeToCollect : 0;
        if (feeToCollect > 0) {
            (bool okFund, ) = payable(ecosystemFund).call{value: feeToCollect}(""); if (!okFund) revert TransferFailed();
            emit BatchFeeCollected(msg.sender, batchCode, feeToCollect);
        }
        if (excess > 0) {
            (bool okRefund, ) = payable(msg.sender).call{value: excess}(""); if (!okRefund) revert TransferFailed();
            emit ExcessFeeRefunded(msg.sender, excess);
        }
    }

    // Ghi nhan chang boi dung vai tro on-chain
    function addCheckpoint(string calldata batchCode, bytes32 role, string calldata location, string calldata action, string calldata metadataURI) external {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        if (!_roles[msg.sender][role] && msg.sender != owner()) revert UnauthorizedCaller(msg.sender, role);
        if (bytes(location).length == 0) revert EmptyString("location"); if (bytes(location).length > MAX_LOCATION_LENGTH) revert StringTooLong("location", MAX_LOCATION_LENGTH);
        if (bytes(action).length == 0) revert EmptyString("action");
        if (_batchCheckpoints[batchCode].length >= MAX_CHECKPOINTS_PER_BATCH) revert MaxCheckpointsExceeded(batchCode, MAX_CHECKPOINTS_PER_BATCH);
        _batchCheckpoints[batchCode].push(Checkpoint(block.timestamp, msg.sender, role, location, action, metadataURI));
        emit CheckpointAdded(batchCode, msg.sender, role, action, location, block.timestamp);
    }

    // Kiem dinh OCOP va thu hoi khi vi pham
    function verifyBatch(string calldata batchCode, string calldata inspectorNote, string calldata certificateURI) external onlyRole(ROLE_INSPECTOR) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode); if (_batches[batchCode].isVerified) revert BatchAlreadyVerified(batchCode);
        _batches[batchCode].isVerified = true;
        string memory act = bytes(inspectorNote).length > 0 ? inspectorNote : "Kiem dinh va chung nhan dac san Hue dat chuan OCOP";
        _batchCheckpoints[batchCode].push(Checkpoint(block.timestamp, msg.sender, ROLE_INSPECTOR, "Trung tam Kiem dinh OCOP Thua Thien Hue", act, certificateURI));
        emit BatchVerified(batchCode, msg.sender, block.timestamp);
        emit CheckpointAdded(batchCode, msg.sender, ROLE_INSPECTOR, act, "Trung tam Kiem dinh OCOP Thua Thien Hue", block.timestamp);
    }
    function revokeBatchVerification(string calldata batchCode, string calldata reason) external onlyRole(ROLE_INSPECTOR) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode); if (!_batches[batchCode].isVerified) revert BatchNotVerified(batchCode);
        if (bytes(reason).length == 0) revert EmptyString("reason"); _batches[batchCode].isVerified = false;
        string memory act = string.concat("Thu hoi chung nhan OCOP do vi pham: ", reason);
        _batchCheckpoints[batchCode].push(Checkpoint(block.timestamp, msg.sender, ROLE_INSPECTOR, "Trung tam Kiem dinh OCOP Thua Thien Hue", act, ""));
        emit BatchVerificationRevoked(batchCode, msg.sender, reason, block.timestamp);
        emit CheckpointAdded(batchCode, msg.sender, ROLE_INSPECTOR, act, "Trung tam Kiem dinh OCOP Thua Thien Hue", block.timestamp);
    }

    // Truy van du lieu doc (Khach mua quet QR)
    function getBatch(string calldata batchCode) external view returns (Batch memory) { if (!_batches[batchCode].exists) revert BatchNotFound(batchCode); return _batches[batchCode]; }
    function getCheckpoints(string calldata batchCode) external view returns (Checkpoint[] memory) { if (!_batches[batchCode].exists) revert BatchNotFound(batchCode); return _batchCheckpoints[batchCode]; }
    function getTotalBatches() external view returns (uint256) { return _allBatchCodes.length; }
    function getBatchCodeByIndex(uint256 index) external view returns (string memory) { return _allBatchCodes[index]; }
}
