// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Diem thuong lop K58 - co thu phi va tran nam giu
contract ClassPoint is ERC20, Ownable {
    address public classFund;     // vi quy lop, nhan phi
    uint256 public feeBps = 100;  // 100 diem co ban = 1%
    uint256 public maxHolding;    // tran nam giu moi vi

    event FeeCollected(address indexed from, uint256 amount);

    error ExceedsMaxHolding(uint256 attempted, uint256 limit);

    constructor(address _classFund)
        ERC20("K58 Class Point", "K58P")
        Ownable(msg.sender)
    {
        require(_classFund != address(0), "Vi quy khong hop le");
        classFund = _classFund;
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
        maxHolding = totalSupply() * 2 / 100;  // tran 2% tong cung
    }

    /// @dev OpenZeppelin phien ban 5 dung _update. Phien ban 4 dung
    ///      _beforeTokenTransfer - da bi bo. Day la loi cong cu AI hay sinh ra.
    function _update(address from, address to, uint256 value) internal override {
        bool isNormalTransfer = from != address(0)   // khong phai luc phat hanh
            && to != address(0)                      // khong phai luc huy
            && from != owner();                      // chu so huu khong bi thu phi

        if (isNormalTransfer && feeBps > 0) {
            uint256 fee = value * feeBps / 10_000;
            if (fee > 0) {
                super._update(from, classFund, fee);
                emit FeeCollected(from, fee);
                value -= fee;
            }
        }

        super._update(from, to, value);

        // Kiem tra tran nam giu sau khi da cong so du
        if (to != address(0) && to != classFund && to != owner()) {
            if (balanceOf(to) > maxHolding) {
                revert ExceedsMaxHolding(balanceOf(to), maxHolding);
            }
        }
    }
}

