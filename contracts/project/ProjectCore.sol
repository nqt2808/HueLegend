// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProjectCore (HueLegend Traceability & Economic Engine)
 * @dev Hop dong thong minh truy xuat dac san Hue da tich hop quy tac kinh te (Lab 11)
 * va tang cuong phong thu chong tai nhap ReentrancyGuard (Lab 13 Hardening).
 * Cai dat tu dong phi tao lo hang batchCreationFee nop vao quy he thong, kem rang buoc tran Circuit Breaker.
 */
contract ProjectCore is Ownable, ReentrancyGuard {
    // ================= 1. DINH NGHIA VAI TRO (RBAC) =================
    bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN");
    bytes32 public constant ROLE_PRODUCER = keccak256("ROLE_PRODUCER");       // Co so san xuat dac san Hue (Me xung, Tom chua, Tra sen...)
    bytes32 public constant ROLE_LOGISTICS = keccak256("ROLE_LOGISTICS");     // Don vi van chuyen / luu kho
    bytes32 public constant ROLE_RETAILER = keccak256("ROLE_RETAILER");       // Dai ly phan phoi / Cua hang ban le
    bytes32 public constant ROLE_INSPECTOR = keccak256("ROLE_INSPECTOR");     // Co quan kiem dinh chat luong OCOP

    // ================= 2. QUY TAC KINH TE (ECONOMIC RULES - LAB 11 & LAB 14) =================
    address public ecosystemFund;                                             // Vi quy phat trien dac san Hue OCOP
    uint256 public batchCreationFee = 0.001 ether;                            // Phi tao lo mac dinh 0.001 ETH
    uint256 public constant MAX_BATCH_FEE_LIMIT = 0.01 ether;                 // Tran gioi han an toan (Circuit Breaker)
    uint256 public constant MIN_STAKE_AMOUNT = 0.05 ether;                    // Tien coc toi thieu cua co so san xuat
    uint256 public constant MAX_CHECKPOINTS_PER_BATCH = 50;                   // Tran chong DoS mang checkpoint
    uint256 public constant MAX_BATCH_CODE_LENGTH = 64;                       // Tran do dai ma lo (Lab 14 Audit)
    uint256 public constant MAX_PRODUCT_NAME_LENGTH = 128;                    // Tran do dai ten dac san (Lab 14 Audit)
    uint256 public constant MAX_LOCATION_LENGTH = 128;                        // Tran do dai dia diem (Lab 14 Audit)
    uint256 public stakeLockDuration = 30 days;                               // Thoi gian khoa coc mac dinh

    // ================= 3. CAU TRUC DU LIEU =================
    struct Checkpoint {
        uint256 timestamp;     // Thoi gian ghi nhan tren blockchain
        address recorder;      // Dia chi vi nguoi ghi nhan chang nay
        bytes32 role;          // Vai tro cua nguoi ghi nhan
        string location;       // Dia diem thuc hien (vd: Phu Hau, Ga Hue, Dong Ba...)
        string action;         // Hanh dong (vd: Thu hoach, Dong goi, Xuat kho, Kiem dinh...)
        string metadataURI;    // Duong dan IPFS hoac ma hash chung tu kiem dinh
    }

    struct Batch {
        string batchCode;      // Ma lo hang duy nhat (vd: HL-MEXUNG-2026-001)
        string productName;    // Ten loai dac san Hue
        string origin;         // Nguon goc xuat xu nguyen lieu
        uint256 createdAt;     // Thoi diem tao lo hang
        address producer;      // Co so san xuat khoi tao
        bool isVerified;       // Trang thai da duoc kiem dinh OCOP hay chua
        bool exists;           // Co ton tai hay khong
    }

    // ================= 4. BANG LUU TRU TRANG THAI =================
    mapping(string => Batch) private _batches;
    mapping(string => Checkpoint[]) private _batchCheckpoints;
    string[] private _allBatchCodes;

    mapping(address => mapping(bytes32 => bool)) private _roles;

    mapping(address => uint256) public producerStake;
    mapping(address => uint256) public producerUnlockTime;

    // ================= 5. CAC LOI TUY BIEN (CUSTOM ERRORS) =================
    error BatchAlreadyExists(string batchCode);
    error BatchNotFound(string batchCode);
    error UnauthorizedCaller(address caller, bytes32 requiredRole);
    error EmptyString(string paramName);
    error StringTooLong(string paramName, uint256 maxAllowed);                 // Loi vuot do dai chuoi (Lab 14 Audit)
    error InvalidAddress();
    error ZeroAmount();
    error StillLocked(uint256 unlockAt, uint256 currentTime);
    error NothingToWithdraw();
    error TransferFailed();
    error StakeTooLow(uint256 provided, uint256 minimum);
    error MaxCheckpointsExceeded(string batchCode, uint256 maxAllowed);
    error BatchAlreadyVerified(string batchCode);
    error BatchNotVerified(string batchCode);
    error InsufficientBatchFee(uint256 provided, uint256 requiredFee);         // Loi kinh te Lab 11
    error FeeExceedsLimit(uint256 attempted, uint256 maxLimit);                // Loi vuot tran Circuit Breaker

    // ================= 6. CAC SU KIEN (EVENTS) =================
    event BatchCreated(
        string indexed batchCode,
        string productName,
        address indexed producer,
        uint256 timestamp
    );

    event CheckpointAdded(
        string indexed batchCode,
        address indexed recorder,
        bytes32 indexed role,
        string action,
        string location,
        uint256 timestamp
    );

    event BatchVerified(
        string indexed batchCode,
        address indexed inspector,
        uint256 timestamp
    );

    event BatchVerificationRevoked(
        string indexed batchCode,
        address indexed inspector,
        string reason,
        uint256 timestamp
    );

    event RoleAssigned(address indexed account, bytes32 indexed role);
    event RoleRevoked(address indexed account, bytes32 indexed role);

    event StakeDeposited(address indexed producer, uint256 amount, uint256 unlockTime);
    event StakeWithdrawn(address indexed producer, uint256 amount);
    event StakeLockDurationUpdated(uint256 oldDuration, uint256 newDuration);

    // Su kien kinh te Lab 11 & Lab 14
    event BatchFeeCollected(address indexed producer, string indexed batchCode, uint256 feeAmount);
    event ExcessFeeRefunded(address indexed producer, uint256 refundAmount);   // Su kien hoan phi thua (Lab 14 Audit)
    event BatchCreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event EcosystemFundUpdated(address indexed oldFund, address indexed newFund);

    // ================= HAM KHOI TAO =================
    constructor() Ownable(msg.sender) {
        _roles[msg.sender][ROLE_ADMIN] = true;
        _roles[msg.sender][ROLE_PRODUCER] = true;
        ecosystemFund = msg.sender; // Mac dinh quy he thong khoi tao tai vi deployer

        emit RoleAssigned(msg.sender, ROLE_ADMIN);
        emit RoleAssigned(msg.sender, ROLE_PRODUCER);
        emit EcosystemFundUpdated(address(0), msg.sender);
    }

    // ================= MODIFIERS KIEM TRA QUYEN =================
    modifier onlyRole(bytes32 role) {
        if (!_roles[msg.sender][role] && msg.sender != owner()) {
            revert UnauthorizedCaller(msg.sender, role);
        }
        _;
    }

    // ================= QUAN LY PHAN QUYEN & THAM SO KINH TE =================
    function grantRole(address account, bytes32 role) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        _roles[account][role] = true;
        emit RoleAssigned(account, role);
    }

    function revokeRole(address account, bytes32 role) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        _roles[account][role] = false;
        emit RoleRevoked(account, role);
    }

    function hasRole(address account, bytes32 role) external view returns (bool) {
        if (account == owner()) return true;
        return _roles[account][role];
    }

    function setStakeLockDuration(uint256 newDuration) external onlyOwner {
        uint256 old = stakeLockDuration;
        stakeLockDuration = newDuration;
        emit StakeLockDurationUpdated(old, newDuration);
    }

    function setEcosystemFund(address newFund) external onlyOwner {
        if (newFund == address(0)) revert InvalidAddress();
        address oldFund = ecosystemFund;
        ecosystemFund = newFund;
        emit EcosystemFundUpdated(oldFund, newFund);
    }

    function setBatchCreationFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_BATCH_FEE_LIMIT) {
            revert FeeExceedsLimit(newFee, MAX_BATCH_FEE_LIMIT);
        }
        uint256 oldFee = batchCreationFee;
        batchCreationFee = newFee;
        emit BatchCreationFeeUpdated(oldFee, newFee);
    }

    // ================= KY GUI CO KHOA THOI GIAN (TIMELOCK STAKING) =================
    function depositStake() external payable {
        if (msg.value == 0) revert ZeroAmount();

        producerStake[msg.sender] += msg.value;

        if (block.timestamp >= producerUnlockTime[msg.sender]) {
            uint256 unlockAt = block.timestamp + stakeLockDuration;
            producerUnlockTime[msg.sender] = unlockAt;
            emit StakeDeposited(msg.sender, msg.value, unlockAt);
        } else {
            emit StakeDeposited(msg.sender, msg.value, producerUnlockTime[msg.sender]);
        }
    }

    function withdrawStake() external nonReentrant {
        uint256 amount = producerStake[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        uint256 unlockAt = producerUnlockTime[msg.sender];
        if (block.timestamp < unlockAt) {
            revert StillLocked(unlockAt, block.timestamp);
        }

        producerStake[msg.sender] = 0;
        producerUnlockTime[msg.sender] = 0; // Reset moc khoa khi da rut het coc (Lab 14 Audit Fix)
        emit StakeWithdrawn(msg.sender, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function getStakeInfo(address producer) external view returns (
        uint256 balance,
        uint256 unlockAt,
        uint256 remainingSeconds
    ) {
        balance = producerStake[producer];
        unlockAt = producerUnlockTime[producer];
        if (block.timestamp >= unlockAt) {
            remainingSeconds = 0;
        } else {
            remainingSeconds = unlockAt - block.timestamp;
        }
    }

    // ================= LUONG TRUY XUAT NGUON GOC & THU PHI KINH TE (LAB 11) =================
    /**
     * @dev 1. Tao lo hang dac san moi (Co thu phi batchCreationFee nop ve ecosystemFund, hoan phi thua)
     */
    function createBatch(
        string calldata batchCode,
        string calldata productName,
        string calldata origin,
        string calldata initialMetadataURI
    ) external payable onlyRole(ROLE_PRODUCER) nonReentrant {
        // 1. Checks (Kiem tra dieu kien)
        if (bytes(batchCode).length == 0) revert EmptyString("batchCode");
        if (bytes(batchCode).length > MAX_BATCH_CODE_LENGTH) revert StringTooLong("batchCode", MAX_BATCH_CODE_LENGTH);
        if (bytes(productName).length == 0) revert EmptyString("productName");
        if (bytes(productName).length > MAX_PRODUCT_NAME_LENGTH) revert StringTooLong("productName", MAX_PRODUCT_NAME_LENGTH);
        if (bytes(origin).length == 0) revert EmptyString("origin");
        if (bytes(origin).length > MAX_LOCATION_LENGTH) revert StringTooLong("origin", MAX_LOCATION_LENGTH);
        if (_batches[batchCode].exists) revert BatchAlreadyExists(batchCode);

        // Kiem tra tien coc uy tin lang nghe
        if (producerStake[msg.sender] < MIN_STAKE_AMOUNT && msg.sender != owner()) {
            revert StakeTooLow(producerStake[msg.sender], MIN_STAKE_AMOUNT);
        }

        // Quy tac kinh te: Kiem tra nop du phi tao lo hang
        if (msg.value < batchCreationFee && msg.sender != owner()) {
            revert InsufficientBatchFee(msg.value, batchCreationFee);
        }

        // 2. Effects (Thay doi trang thai on-chain)
        _batches[batchCode] = Batch({
            batchCode: batchCode,
            productName: productName,
            origin: origin,
            createdAt: block.timestamp,
            producer: msg.sender,
            isVerified: false,
            exists: true
        });

        _allBatchCodes.push(batchCode);

        _batchCheckpoints[batchCode].push(Checkpoint({
            timestamp: block.timestamp,
            recorder: msg.sender,
            role: ROLE_PRODUCER,
            location: origin,
            action: "Khoi tao lo hang dac san tai co so san xuat",
            metadataURI: initialMetadataURI
        }));

        // 3. Interactions (Phat su kien, chuyen phi ve quy va hoan phi thua)
        emit BatchCreated(batchCode, productName, msg.sender, block.timestamp);
        emit CheckpointAdded(
            batchCode,
            msg.sender,
            ROLE_PRODUCER,
            "Khoi tao lo hang dac san tai co so san xuat",
            origin,
            block.timestamp
        );

        uint256 feeToCollect = msg.sender == owner() ? 0 : batchCreationFee;
        uint256 excess = msg.value > feeToCollect ? msg.value - feeToCollect : 0;

        if (feeToCollect > 0) {
            (bool okFund, ) = payable(ecosystemFund).call{value: feeToCollect}("");
            if (!okFund) revert TransferFailed();
            emit BatchFeeCollected(msg.sender, batchCode, feeToCollect);
        }

        // Hoan tra phi thua cho co so san xuat (Lab 14 Audit Fix)
        if (excess > 0) {
            (bool okRefund, ) = payable(msg.sender).call{value: excess}("");
            if (!okRefund) revert TransferFailed();
            emit ExcessFeeRefunded(msg.sender, excess);
        }
    }

    /**
     * @dev 2. Them chang hanh trinh boi dung vai tro
     */
    function addCheckpoint(
        string calldata batchCode,
        bytes32 role,
        string calldata location,
        string calldata action,
        string calldata metadataURI
    ) external {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        if (!_roles[msg.sender][role] && msg.sender != owner()) {
            revert UnauthorizedCaller(msg.sender, role);
        }
        if (bytes(location).length == 0) revert EmptyString("location");
        if (bytes(location).length > MAX_LOCATION_LENGTH) revert StringTooLong("location", MAX_LOCATION_LENGTH);
        if (bytes(action).length == 0) revert EmptyString("action");

        if (_batchCheckpoints[batchCode].length >= MAX_CHECKPOINTS_PER_BATCH) {
            revert MaxCheckpointsExceeded(batchCode, MAX_CHECKPOINTS_PER_BATCH);
        }

        _batchCheckpoints[batchCode].push(Checkpoint({
            timestamp: block.timestamp,
            recorder: msg.sender,
            role: role,
            location: location,
            action: action,
            metadataURI: metadataURI
        }));

        emit CheckpointAdded(
            batchCode,
            msg.sender,
            role,
            action,
            location,
            block.timestamp
        );
    }

    /**
     * @dev 3. Kiem dinh va chung nhan OCOP
     */
    function verifyBatch(
        string calldata batchCode,
        string calldata inspectorNote,
        string calldata certificateURI
    ) external onlyRole(ROLE_INSPECTOR) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        if (_batches[batchCode].isVerified) revert BatchAlreadyVerified(batchCode);

        _batches[batchCode].isVerified = true;

        string memory act = bytes(inspectorNote).length > 0 ? inspectorNote : "Kiem dinh va chung nhan dac san Hue dat chuan OCOP";

        _batchCheckpoints[batchCode].push(Checkpoint({
            timestamp: block.timestamp,
            recorder: msg.sender,
            role: ROLE_INSPECTOR,
            location: "Trung tam Kiem dinh OCOP Thua Thien Hue",
            action: act,
            metadataURI: certificateURI
        }));

        emit BatchVerified(batchCode, msg.sender, block.timestamp);
        emit CheckpointAdded(
            batchCode,
            msg.sender,
            ROLE_INSPECTOR,
            act,
            "Trung tam Kiem dinh OCOP Thua Thien Hue",
            block.timestamp
        );
    }

    /**
     * @dev 4. Thu hoi tem OCOP khi phat hien vi pham
     */
    function revokeBatchVerification(
        string calldata batchCode,
        string calldata reason
    ) external onlyRole(ROLE_INSPECTOR) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        if (!_batches[batchCode].isVerified) revert BatchNotVerified(batchCode);
        if (bytes(reason).length == 0) revert EmptyString("reason");

        _batches[batchCode].isVerified = false;

        string memory actionMsg = string.concat("Thu hoi chung nhan OCOP do vi pham: ", reason);

        _batchCheckpoints[batchCode].push(Checkpoint({
            timestamp: block.timestamp,
            recorder: msg.sender,
            role: ROLE_INSPECTOR,
            location: "Trung tam Kiem dinh OCOP Thua Thien Hue",
            action: actionMsg,
            metadataURI: ""
        }));

        emit BatchVerificationRevoked(batchCode, msg.sender, reason, block.timestamp);
        emit CheckpointAdded(
            batchCode,
            msg.sender,
            ROLE_INSPECTOR,
            actionMsg,
            "Trung tam Kiem dinh OCOP Thua Thien Hue",
            block.timestamp
        );
    }

    // ================= 7. TRUY VAN XEM LICH SU (QUET QR) =================
    function getBatch(string calldata batchCode) external view returns (Batch memory) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        return _batches[batchCode];
    }

    function getCheckpoints(string calldata batchCode) external view returns (Checkpoint[] memory) {
        if (!_batches[batchCode].exists) revert BatchNotFound(batchCode);
        return _batchCheckpoints[batchCode];
    }

    function getTotalBatches() external view returns (uint256) {
        return _allBatchCodes.length;
    }

    function getBatchCodeByIndex(uint256 index) external view returns (string memory) {
        return _allBatchCodes[index];
    }
}
