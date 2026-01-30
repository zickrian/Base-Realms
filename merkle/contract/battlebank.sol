// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BattleBank is Ownable {

    IERC20 public idrx = IERC20(0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22);

    constructor() Ownable(msg.sender) {}

    function withdraw(address to, uint256 amount) external onlyOwner {
        idrx.transfer(to, amount);
    }
}