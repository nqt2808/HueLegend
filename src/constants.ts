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

// Cau hinh hop dong, cong RPC ngam va mang Sepolia
export const CONTRACT_ADDRESS = safeGetAddress("0xfe7BFa3ec478b621ecCA20DD73014Eb79B0bf5C5");
export const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
export const SEPOLIA_DECIMAL_ID = 11155111;
export const ETHERSCAN_BASE_URL = "https://sepolia.etherscan.io";

// Vi quan tri vien mac dinh
export const DEFAULT_ADMIN_ADDRESS = safeGetAddress("0xfe7BFa3ec478b621ecCA20DD73014Eb79B0bf5C5");

export const ROLE_HASHES = {
  ROLE_ADMIN: "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42",
  ROLE_PRODUCER: "0x2c0f20977a41ca739e03496033e64f7b605151ee67b93b827e8a946ad4ee2678",
  ROLE_LOGISTICS: "0x789b78809f69f29ee87bc6c1e57c6b54a2a16d56df3d132cb0a54cf53d9e47cb",
  ROLE_RETAILER: "0xa3858c42a5a54db645ce1e2e1329c29c8e1f592aa1527efd75c924bcbe1fb4e1",
  ROLE_INSPECTOR: "0x4296dbb7b322384a621147a468d6ef71f28b40d6c44917a22ab65a12154c34cb"
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
  "function addCheckpoint(string batchCode, bytes32 role, string location, string action, string metadataURI) payable",
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
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  "function withdrawFees()"
];

// Zero hardcoded mock products. Live data is read directly from Sepolia Smart Contract.
export const DEFAULT_SAMPLE_BATCHES: Record<string, Batch> = {};
