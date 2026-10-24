// Interface dung chung cho trinh duyet va API doc blockchain.
export const MARKET_ABI = [
  "function owner() view returns (address)",
  "function sellerCount() view returns (uint256)",
  "function sellerAt(uint256) view returns (address)",
  "function lotCount() view returns (uint256)",
  "function orderCount() view returns (uint256)",
  "function isSellerApproved(address) view returns (bool)",
  "function isLotForSale(uint256) view returns (bool)",
  "function getSeller(address) view returns (tuple(string businessName,string location,bytes32 businessLicenseSHA256,bytes32 foodSafetySHA256,uint64 businessLicenseExpires,uint64 foodSafetyExpires,string publicBusinessLicenseURL,string publicFoodSafetyURL,uint8 status,uint64 submittedAt))",
  "function getLot(uint256) view returns (tuple(uint256 id,address seller,string batchCode,string productName,string description,string origin,string imageURL,uint256 priceVND,uint256 priceWei,uint32 stock,uint32 sold,uint8 status,uint64 submittedAt))",
  "function getOrder(uint256) view returns (tuple(uint256 id,uint256 lotId,address buyer,address seller,uint32 quantity,uint256 amountWei,uint8 status,uint64 placedAt,bytes32 shipmentReferenceSHA256))",
  "function getOrderIds(address,bool,uint256,uint256) view returns (uint256[])",
  "function getDisputedOrderIds(uint256,uint256) view returns (uint256[])",
  "function submitSeller(string,string,bytes32,bytes32,uint64,uint64,string,string)",
  "function reviewSeller(address,bool,string)",
  "function suspendSeller(address,string)",
  "function submitLot(string,string,string,string,string,uint256,uint256,uint32) returns (uint256)",
  "function reviewLot(uint256,bool,string)",
  "function suspendLot(uint256,string)",
  "function updateStock(uint256,uint32)",
  "function placeOrder(uint256,uint32) payable returns (uint256)",
  "function markShipped(uint256,bytes32)",
  "function confirmReceived(uint256)",
  "function cancelBeforeShipping(uint256)",
  "function disputeOrder(uint256)",
  "function resolveDispute(uint256,bool)",
  "event SellerSubmitted(address indexed wallet,bytes32 businessLicenseSHA256,bytes32 foodSafetySHA256)",
  "event SellerReviewed(address indexed wallet,uint8 status,string reason)",
  "event LotSubmitted(uint256 indexed lotId,address indexed seller,string batchCode)",
  "event LotReviewed(uint256 indexed lotId,uint8 status,string reason)",
  "event OrderPlaced(uint256 indexed orderId,uint256 indexed lotId,address indexed buyer,uint32 quantity,uint256 totalWei)"
];
export const REVIEW = ["Chưa nộp","Đang chờ duyệt","Đã duyệt","Từ chối","Tạm khóa"];
export const ORDER_STATUS = ["Không có","Đã đặt","Đã giao vận chuyển","Hoàn tất","Đã hủy","Đang tranh chấp","Đã hoàn tiền"];
export const CHAIN_ID = 11155111;
