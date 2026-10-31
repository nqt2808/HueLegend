import { ethers } from 'ethers';
import { Batch } from './types';

// Ham chuan hoa dia chi vi EIP-55 bang ethers.getAddress tu chuoi lowercased
export const safeGetAddress = (address: string): string => {
  if (!address || typeof address !== 'string') return address;
  const cleaned = address.trim();
  if (!cleaned) return cleaned;
  try {
    // Chuyen ve toLowerCase() de ethers.getAddress luon tinh lai checksum EIP-55 chinh xac va khong bi throw bad address checksum
    return ethers.getAddress(cleaned.toLowerCase());
  } catch (err) {
    return cleaned;
  }
};

// Cau hinh hop dong va mang Sepolia
<<<<<<< HEAD
export const CONTRACT_ADDRESS = safeGetAddress("0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c");
export const OWNER_WALLET = safeGetAddress(
  "0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c"
);
=======
export const CONTRACT_ADDRESS = safeGetAddress("0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C");
export const OWNER_WALLET = safeGetAddress("0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c");
>>>>>>> a697c56ebb70d61b5be6a91dc6418662d7dcaed5
export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
export const SEPOLIA_DECIMAL_ID = 11155111;
export const ETHERSCAN_BASE_URL = "https://sepolia.etherscan.io";

export const ROLE_HASHES = {
  ROLE_ADMIN: ethers.id('ROLE_ADMIN'),
  ROLE_PRODUCER: ethers.id('ROLE_PRODUCER'),
  ROLE_LOGISTICS: ethers.id('ROLE_LOGISTICS'),
  ROLE_RETAILER: ethers.id('ROLE_RETAILER'),
  ROLE_INSPECTOR: ethers.id('ROLE_INSPECTOR'),
};

export const PROJECT_CORE_ABI = [
  "constructor()",
  "error BatchAlreadyExists(string batchCode)",
  "error BatchAlreadyVerified(string batchCode)",
  "error BatchNotFound(string batchCode)",
  "error BatchNotVerified(string batchCode)",
  "error EmptyString(string paramName)",
  "error FeeExceedsLimit(uint256 attempted, uint256 maxLimit)",
  "error InsufficientBatchFee(uint256 provided, uint256 requiredFee)",
  "error InvalidAddress()",
  "error MaxCheckpointsExceeded(string batchCode, uint256 maxAllowed)",
  "error NothingToWithdraw()",
  "error StakeTooLow(uint256 provided, uint256 minimum)",
  "error StillLocked(uint256 unlockAt, uint256 currentTime)",
  "error StringTooLong(string paramName, uint256 maxAllowed)",
  "error TransferFailed()",
  "error UnauthorizedCaller(address caller, bytes32 requiredRole)",
  "error ZeroAmount()",
  "event BatchCreated(string indexed batchCode, string productName, address indexed producer, uint256 timestamp)",
  "event BatchCreationFeeUpdated(uint256 oldFee, uint256 newFee)",
  "event BatchFeeCollected(address indexed producer, string indexed batchCode, uint256 feeAmount)",
  "event BatchVerificationRevoked(string indexed batchCode, address indexed inspector, string reason, uint256 timestamp)",
  "event BatchVerified(string indexed batchCode, address indexed inspector, uint256 timestamp)",
  "event CheckpointAdded(string indexed batchCode, address indexed recorder, bytes32 indexed role, string action, string location, uint256 timestamp)",
  "event RoleAssigned(address indexed account, bytes32 indexed role)",
  "event RoleRevoked(address indexed account, bytes32 indexed role)",
  "event StakeDeposited(address indexed producer, uint256 amount, uint256 unlockTime)",
  "event StakeWithdrawn(address indexed producer, uint256 amount)",
  "function ROLE_ADMIN() view returns (bytes32)",
  "function ROLE_INSPECTOR() view returns (bytes32)",
  "function ROLE_LOGISTICS() view returns (bytes32)",
  "function ROLE_PRODUCER() view returns (bytes32)",
  "function ROLE_RETAILER() view returns (bytes32)",
  "function addCheckpoint(string batchCode, bytes32 role, string location, string action, string metadataURI)",
  "function batchCreationFee() view returns (uint256)",
  "function createBatch(string batchCode, string productName, string origin, string initialMetadataURI) payable",
  "function depositStake() payable",
  "function ecosystemFund() view returns (address)",
  "function getBatch(string batchCode) view returns (tuple(string batchCode, string productName, string origin, uint256 createdAt, address producer, bool isVerified, bool exists))",
  "function getCheckpoints(string batchCode) view returns (tuple(uint256 timestamp, address recorder, bytes32 role, string location, string action, string metadataURI)[])",
  "function getTotalBatches() view returns (uint256)",
  "function getBatchCodeByIndex(uint256 index) view returns (string)",
  "function getStakeInfo(address producer) view returns (uint256 balance, uint256 unlockAt, uint256 remainingSeconds)",
  "function hasRole(address account, bytes32 role) view returns (bool)",
  "function owner() view returns (address)",
  "function producerStake(address) view returns (uint256)",
  "function setBatchCreationFee(uint256 newFee)",
  "function verifyBatch(string batchCode, string inspectorNote, string certificateURI)",
  "function revokeBatchVerification(string batchCode, string reason)",
  "function withdrawStake()",
  "function grantRole(address account, bytes32 role)",
  "function revokeRole(address account, bytes32 role)"
];

// Zero hardcoded mock products. Live data is read directly from Sepolia Smart Contract.
export const DEFAULT_SAMPLE_BATCHES: Record<string, Batch> = {};

