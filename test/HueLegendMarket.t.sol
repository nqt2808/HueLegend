// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HueLegendMarket} from "../contracts/HueLegendMarket.sol";

contract SellerActor {
    function submit(HueLegendMarket m) external {
        m.submitSeller("Co so Me Xung", "Hue", keccak256("GPKD"), keccak256("ATTP"),
            0, uint64(block.timestamp+365 days), "", "");
    }
    function lot(HueLegendMarket m, string calldata code) external {
        m.submitLot(code, "Me xung", "Dac san Hue", "Hue", "", 75000, 10000, 10);
    }
    function review(HueLegendMarket m, address seller) external {
        m.reviewSeller(seller,true,"");
    }
    function reviewLot(HueLegendMarket m, uint256 id) external {
        m.reviewLot(id,true,"");
    }
    function buy(HueLegendMarket m, uint256 id, uint32 qty) external payable {
        m.placeOrder{value:msg.value}(id,qty);
    }
}

contract HueLegendMarketTest {
    function setup() internal returns (HueLegendMarket market, SellerActor seller, SellerActor attacker) {
        market=new HueLegendMarket(); seller=new SellerActor(); attacker=new SellerActor();
    }
    function testSellerCannotListBeforeApproval() public {
        (HueLegendMarket m,SellerActor seller,)=setup();
        seller.submit(m);
        (bool ok,)=address(seller).call(abi.encodeCall(seller.lot,(m,"HL-01")));
        require(!ok,"seller pending khong duoc dang lo");
        require(m.lotCount()==0,"khong duoc ghi lo cho duyet");
    }
    function testOnlyOwnerMayApproveSeller() public {
        (HueLegendMarket m,SellerActor seller,SellerActor attacker)=setup();
        seller.submit(m);
        (bool ok,)=address(attacker).call(abi.encodeCall(attacker.review,(m,address(seller))));
        require(!ok,"gia mao quan tri duoc duyet");
        require(!m.isSellerApproved(address(seller)),"seller van pending");
    }
    function testTwoApprovalsAreRequired() public {
        (HueLegendMarket m,SellerActor seller,)=setup();
        seller.submit(m);
        m.reviewSeller(address(seller),true,"Da doi chieu");
        seller.lot(m,"HL-01");
        require(m.lotCount()==1,"khong tao duoc lo");
        require(!m.isLotForSale(1),"lo chua duyet bi mo ban");
        m.reviewLot(1,true,"Da xem hang");
        require(m.isLotForSale(1),"lo da duyet khong duoc mo ban");
    }
    function testUnauthorizedCannotApproveLot() public {
        (HueLegendMarket m,SellerActor seller,SellerActor attacker)=setup();
        seller.submit(m);m.reviewSeller(address(seller),true,"");seller.lot(m,"HL-02");
        (bool ok,)=address(attacker).call(abi.encodeCall(attacker.reviewLot,(m,1)));
        require(!ok,"gia mao duyet lo thanh cong");
        require(!m.isLotForSale(1),"trang thai lo bi thay doi");
    }
    function testDuplicateLotCannotBeSubmitted() public {
        (HueLegendMarket m,SellerActor seller,)=setup();
        seller.submit(m);m.reviewSeller(address(seller),true,"");seller.lot(m,"HL-03");
        (bool ok,)=address(seller).call(abi.encodeCall(seller.lot,(m,"HL-03")));
        require(!ok,"ma lo trung bi chap nhan");
    }
    function testPaymentIsExact() public {
        (HueLegendMarket m,SellerActor seller,SellerActor attacker)=setup();
        seller.submit(m);m.reviewSeller(address(seller),true,"");seller.lot(m,"HL-04");m.reviewLot(1,true,"");
        (bool ok,)=address(attacker).call(abi.encodeCall(attacker.buy,(m,1,1)));
        require(!ok,"thieu ETH van cho dat hang");
        require(m.orderCount()==0,"don hang khong hop le da tao");
    }
    function testSuspendSellerHidesApprovedLot() public {
        (HueLegendMarket m,SellerActor seller,)=setup();
        seller.submit(m);m.reviewSeller(address(seller),true,"");seller.lot(m,"HL-05");m.reviewLot(1,true,"");
        m.suspendSeller(address(seller),"Khong hop le");
        require(!m.isLotForSale(1),"suspend seller phai an lo");
    }
}
