// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HueLegendMarket
 * @notice Cho ban dac san co kiem duyet tren Ethereum Sepolia.
 * @dev Hai vai tro quan tri: chu co so va quan tri vien; khach mua khong can duoc cap quyen.
 * Tai lieu goc KHONG duoc ghi tren chain: chi ghi hash SHA-256 va URL ban da che thong tin.
 * Gia ETH o day chi dung de thu nghiem Sepolia, khong phai thanh toan VND that.
 */
contract HueLegendMarket {
    enum Review { None, Pending, Approved, Rejected, Suspended }
    enum OrderStatus { None, Placed, Shipped, Completed, Cancelled, Disputed, Refunded }

    struct Seller {
        string businessName;
        string location;
        bytes32 businessLicenseSHA256;
        bytes32 foodSafetySHA256;
        uint64 businessLicenseExpires;
        uint64 foodSafetyExpires;
        string publicBusinessLicenseURL;
        string publicFoodSafetyURL;
        Review status;
        uint64 submittedAt;
    }
    struct Lot {
        uint256 id;
        address seller;
        string batchCode;
        string productName;
        string description;
        string origin;
        string imageURL;
        uint256 priceVND;
        uint256 priceWei;
        uint32 stock;
        uint32 sold;
        Review status;
        uint64 submittedAt;
    }
    struct Order {
        uint256 id;
        uint256 lotId;
        address buyer;
        address seller;
        uint32 quantity;
        uint256 amountWei;
        OrderStatus status;
        uint64 placedAt;
        bytes32 shipmentReferenceSHA256;
    }

    address public owner;
    address public pendingOwner;
    bool private locked;
    uint256 public lotCount;
    uint256 public orderCount;
    mapping(address => Seller) private sellers;
    address[] private sellerWallets;
    mapping(address => bool) private knownSeller;
    mapping(uint256 => Lot) private lots;
    mapping(uint256 => Order) private orders;
    mapping(bytes32 => bool) private usedCodes;
    mapping(address => uint256[]) private buyerOrders;
    mapping(address => uint256[]) private sellerOrders;
    uint256[] private disputedOrderIds;

    error OnlyAdmin();
    error NotSeller();
    error InvalidInput();
    error InvalidStatus();
    error NotApproved();
    error InvalidPrice();
    error WrongPayment(uint256 expected, uint256 provided);
    error TransferFailed();
    error Unauthorized();
    error AlreadyExists();
    error Reentrancy();

    event SellerSubmitted(address indexed wallet, bytes32 businessLicenseSHA256, bytes32 foodSafetySHA256);
    event SellerReviewed(address indexed wallet, Review status, string reason);
    event LotSubmitted(uint256 indexed lotId, address indexed seller, string batchCode);
    event LotReviewed(uint256 indexed lotId, Review status, string reason);
    event LotStockUpdated(uint256 indexed lotId, uint32 stock);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed lotId, address indexed buyer, uint32 quantity, uint256 totalWei);
    event OrderShipped(uint256 indexed orderId, bytes32 shipmentReferenceSHA256);
    event OrderCompleted(uint256 indexed orderId, address indexed seller, uint256 amountWei);
    event OrderCancelled(uint256 indexed orderId, address indexed buyer);
    event OrderDisputed(uint256 indexed orderId, address indexed buyer);
    event OrderResolved(uint256 indexed orderId, bool refundedBuyer, uint256 amountWei);
    event OwnershipTransferStarted(address indexed oldOwner, address indexed nextOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    modifier onlyAdmin() { if (msg.sender != owner) revert OnlyAdmin(); _; }
    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }
    function _text(string memory value, uint256 maxBytes) internal pure {
        if (bytes(value).length == 0 || bytes(value).length > maxBytes) revert InvalidInput();
    }
    function _optional(string memory value, uint256 maxBytes) internal pure {
        if (bytes(value).length > maxBytes) revert InvalidInput();
    }
    function _validSeller(address wallet) internal view returns (bool) {
        Seller storage s = sellers[wallet];
        return s.status == Review.Approved && s.businessLicenseSHA256 != bytes32(0)
            && s.foodSafetySHA256 != bytes32(0)
            && (s.businessLicenseExpires == 0 || s.businessLicenseExpires >= block.timestamp)
            && s.foodSafetyExpires >= block.timestamp;
    }
    function isSellerApproved(address wallet) external view returns (bool) { return _validSeller(wallet); }
    function getSeller(address wallet) external view returns (Seller memory) { return sellers[wallet]; }
    function sellerCount() external view returns (uint256) { return sellerWallets.length; }
    function sellerAt(uint256 index) external view returns (address) { return sellerWallets[index]; }
    function getLot(uint256 lotId) external view returns (Lot memory) {
        if (lotId == 0 || lotId > lotCount) revert InvalidInput();
        return lots[lotId];
    }
    function getOrder(uint256 orderId) external view returns (Order memory) {
        if (orderId == 0 || orderId > orderCount) revert InvalidInput();
        Order memory ord = orders[orderId];
        if (msg.sender != ord.buyer && msg.sender != ord.seller && msg.sender != owner) revert Unauthorized();
        return ord;
    }
    function getOrderIds(address account, bool sellerSide, uint256 offset, uint256 limit) external view returns (uint256[] memory out) {
        if (limit > 25) revert InvalidInput();
        uint256[] storage ids = sellerSide ? sellerOrders[account] : buyerOrders[account];
        if (offset >= ids.length) return new uint256[](0);
        uint256 n = ids.length - offset < limit ? ids.length - offset : limit;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = ids[offset + i];
    }

    function getDisputedOrderIds(uint256 offset, uint256 limit) external view returns (uint256[] memory out) {
        if (msg.sender != owner) revert OnlyAdmin();
        if (limit > 25) revert InvalidInput();
        if (offset >= disputedOrderIds.length) return new uint256[](0);
        uint256 n = disputedOrderIds.length - offset < limit ? disputedOrderIds.length - offset : limit;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = disputedOrderIds[offset + i];
    }

    function submitSeller(
        string calldata businessName,
        string calldata location,
        bytes32 businessLicenseSHA256,
        bytes32 foodSafetySHA256,
        uint64 businessLicenseExpires,
        uint64 foodSafetyExpires,
        string calldata publicBusinessLicenseURL,
        string calldata publicFoodSafetyURL
    ) external {
        _text(businessName, 128); _text(location, 256);
        if (businessLicenseSHA256 == bytes32(0) || foodSafetySHA256 == bytes32(0)) revert InvalidInput();
        if ((businessLicenseExpires != 0 && businessLicenseExpires <= block.timestamp) || foodSafetyExpires <= block.timestamp) revert InvalidInput();
        _optional(publicBusinessLicenseURL, 384); _optional(publicFoodSafetyURL, 384);
        if (!knownSeller[msg.sender]) { knownSeller[msg.sender] = true; sellerWallets.push(msg.sender); }
        Seller storage s = sellers[msg.sender];
        s.businessName = businessName;
        s.location = location;
        s.businessLicenseSHA256 = businessLicenseSHA256;
        s.foodSafetySHA256 = foodSafetySHA256;
        s.businessLicenseExpires = businessLicenseExpires;
        s.foodSafetyExpires = foodSafetyExpires;
        s.publicBusinessLicenseURL = publicBusinessLicenseURL;
        s.publicFoodSafetyURL = publicFoodSafetyURL;
        s.status = Review.Pending;
        s.submittedAt = uint64(block.timestamp);
        emit SellerSubmitted(msg.sender, businessLicenseSHA256, foodSafetySHA256);
    }
    function reviewSeller(address wallet, bool approved, string calldata reason) external onlyAdmin {
        Seller storage s = sellers[wallet];
        if (s.status != Review.Pending && s.status != Review.Approved && s.status != Review.Suspended) revert InvalidStatus();
        if (approved && ((s.businessLicenseExpires != 0 && s.businessLicenseExpires <= block.timestamp) || s.foodSafetyExpires <= block.timestamp)) revert InvalidInput();
        _optional(reason, 256);
        s.status = approved ? Review.Approved : Review.Rejected;
        emit SellerReviewed(wallet, s.status, reason);
    }
    function suspendSeller(address wallet, string calldata reason) external onlyAdmin {
        Seller storage s = sellers[wallet];
        if (s.status != Review.Approved) revert InvalidStatus();
        _text(reason, 256); s.status = Review.Suspended;
        emit SellerReviewed(wallet, s.status, reason);
    }
    function submitLot(
        string calldata batchCode, string calldata productName, string calldata description,
        string calldata origin, string calldata imageURL, uint256 priceVND, uint256 priceWei, uint32 stock
    ) external returns (uint256 id) {
        if (!_validSeller(msg.sender)) revert NotApproved();
        _text(batchCode, 64); _text(productName, 128); _text(description, 1200);
        _text(origin, 160); _optional(imageURL, 384);
        if (priceVND == 0 || priceWei == 0 || stock == 0) revert InvalidInput();
        bytes32 codeKey = keccak256(bytes(batchCode));
        if (usedCodes[codeKey]) revert AlreadyExists();
        usedCodes[codeKey] = true;
        id = ++lotCount;
        lots[id] = Lot(id, msg.sender, batchCode, productName, description, origin, imageURL,
            priceVND, priceWei, stock, 0, Review.Pending, uint64(block.timestamp));
        emit LotSubmitted(id, msg.sender, batchCode);
    }
    function reviewLot(uint256 lotId, bool approved, string calldata reason) external onlyAdmin {
        Lot storage lot = lots[lotId];
        if (lot.id == 0 || lot.status != Review.Pending) revert InvalidStatus();
        if (approved && !_validSeller(lot.seller)) revert NotApproved();
        _optional(reason, 256);
        lot.status = approved ? Review.Approved : Review.Rejected;
        emit LotReviewed(lotId, lot.status, reason);
    }
    function suspendLot(uint256 lotId, string calldata reason) external onlyAdmin {
        Lot storage lot = lots[lotId];
        if (lot.status != Review.Approved) revert InvalidStatus();
        _text(reason, 256); lot.status = Review.Suspended;
        emit LotReviewed(lotId, lot.status, reason);
    }
    function updateStock(uint256 lotId, uint32 newStock) external {
        Lot storage lot = lots[lotId];
        if (lot.seller != msg.sender) revert NotSeller();
        if (lot.status != Review.Approved) revert InvalidStatus();
        if (newStock < lot.stock) revert InvalidInput();
        lot.stock = newStock;
        emit LotStockUpdated(lotId, newStock);
    }
    function isLotForSale(uint256 lotId) external view returns (bool) {
        Lot storage lot = lots[lotId];
        return lot.status == Review.Approved && lot.stock > 0 && _validSeller(lot.seller);
    }
    function placeOrder(uint256 lotId, uint32 quantity) external payable nonReentrant returns (uint256 id) {
        Lot storage lot = lots[lotId];
        if (lot.status != Review.Approved || !_validSeller(lot.seller)) revert NotApproved();
        if (quantity == 0 || quantity > lot.stock || msg.sender == lot.seller) revert InvalidInput();
        uint256 due = lot.priceWei * uint256(quantity);
        if (msg.value != due) revert WrongPayment(due, msg.value);
        lot.stock -= quantity; lot.sold += quantity;
        id = ++orderCount;
        orders[id] = Order(id, lotId, msg.sender, lot.seller, quantity, due, OrderStatus.Placed, uint64(block.timestamp), bytes32(0));
        buyerOrders[msg.sender].push(id); sellerOrders[lot.seller].push(id);
        emit OrderPlaced(id, lotId, msg.sender, quantity, due);
    }
    function markShipped(uint256 orderId, bytes32 shipmentReferenceSHA256) external {
        Order storage ord = orders[orderId];
        if (ord.seller != msg.sender) revert NotSeller();
        if (ord.status != OrderStatus.Placed || shipmentReferenceSHA256 == bytes32(0)) revert InvalidStatus();
        ord.shipmentReferenceSHA256 = shipmentReferenceSHA256;
        ord.status = OrderStatus.Shipped;
        emit OrderShipped(orderId, shipmentReferenceSHA256);
    }
    function confirmReceived(uint256 orderId) external nonReentrant {
        Order storage ord = orders[orderId];
        if (ord.buyer != msg.sender) revert Unauthorized();
        if (ord.status != OrderStatus.Shipped) revert InvalidStatus();
        ord.status = OrderStatus.Completed;
        emit OrderCompleted(orderId, ord.seller, ord.amountWei);
        (bool ok,) = payable(ord.seller).call{value: ord.amountWei}("");
        if (!ok) revert TransferFailed();
    }
    function cancelBeforeShipping(uint256 orderId) external nonReentrant {
        Order storage ord = orders[orderId];
        if (ord.buyer != msg.sender) revert Unauthorized();
        if (ord.status != OrderStatus.Placed) revert InvalidStatus();
        ord.status = OrderStatus.Cancelled;
        lots[ord.lotId].stock += ord.quantity;
        lots[ord.lotId].sold -= ord.quantity;
        emit OrderCancelled(orderId, msg.sender);
        (bool ok,) = payable(msg.sender).call{value: ord.amountWei}("");
        if (!ok) revert TransferFailed();
    }
    function disputeOrder(uint256 orderId) external {
        Order storage ord = orders[orderId];
        if (ord.buyer != msg.sender) revert Unauthorized();
        if (ord.status != OrderStatus.Shipped) revert InvalidStatus();
        ord.status = OrderStatus.Disputed;
        disputedOrderIds.push(orderId);
        emit OrderDisputed(orderId, msg.sender);
    }
    function resolveDispute(uint256 orderId, bool refundBuyer) external onlyAdmin nonReentrant {
        Order storage ord = orders[orderId];
        if (ord.status != OrderStatus.Disputed) revert InvalidStatus();
        ord.status = refundBuyer ? OrderStatus.Refunded : OrderStatus.Completed;
        address recipient = refundBuyer ? ord.buyer : ord.seller;
        emit OrderResolved(orderId, refundBuyer, ord.amountWei);
        (bool ok,) = payable(recipient).call{value: ord.amountWei}("");
        if (!ok) revert TransferFailed();
    }
    function startOwnershipTransfer(address nextOwner) external onlyAdmin {
        if (nextOwner == address(0) || nextOwner == owner) revert InvalidInput();
        pendingOwner = nextOwner;
        emit OwnershipTransferStarted(owner, nextOwner);
    }
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address oldOwner = owner; owner = msg.sender; pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }
    receive() external payable { revert InvalidInput(); }
}
