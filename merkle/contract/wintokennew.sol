// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WinToken is ERC20, Ownable {

    mapping(address => bool) public minters;

    constructor() ERC20("Base Realms Win", "BRWIN") Ownable(msg.sender) {}

    function setMinter(address m, bool b) external onlyOwner {
        minters[m] = b;
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Not minter");
        _mint(to, amount);
    }

    // Soulbound
    function _update(address from, address to, uint256 value) internal override {
        require(from == address(0) || to == address(0), "Soulbound");
        super._update(from, to, value);
    }
}