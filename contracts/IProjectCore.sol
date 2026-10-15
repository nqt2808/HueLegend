// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Chi la giao dien tham chieu. Khong phai hop dong de deploy.
// Chu ky doi chieu tu ProjectCore.sol trong repo duoc README dan toi.
interface IProjectCore {
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
    function getBatch(string calldata batchCode) external view returns (Batch memory);
    function getCheckpoints(string calldata batchCode) external view returns (Checkpoint[] memory);
    function getTotalBatches() external view returns (uint256);
    function getBatchCodeByIndex(uint256 index) external view returns (string memory);
    function hasRole(address account, bytes32 role) external view returns (bool);
    function owner() external view returns (address);
    function createBatch(string calldata batchCode, string calldata productName, string calldata origin, string calldata initialMetadataURI) external payable;
    function addCheckpoint(string calldata batchCode, bytes32 role, string calldata location, string calldata action, string calldata metadataURI) external;
    function verifyBatch(string calldata batchCode, string calldata inspectorNote, string calldata certificateURI) external;
    function revokeBatchVerification(string calldata batchCode, string calldata reason) external;
    function depositStake() external payable;
    function withdrawStake() external;
    function producerStake(address account) external view returns (uint256);
    function producerUnlockTime(address account) external view returns (uint256);
    function getStakeInfo(address producer) external view returns (uint256 balance, uint256 unlockAt, uint256 remainingSeconds);
    function batchCreationFee() external view returns (uint256);
    function grantRole(address account, bytes32 role) external;
    function revokeRole(address account, bytes32 role) external;
}
