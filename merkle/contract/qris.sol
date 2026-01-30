// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract QRISMerkleClaim is Ownable, ReentrancyGuard, Pausable {

    IERC20 public constant IDRX =
        IERC20(0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22);

    uint256 public constant REWARD_AMOUNT = 1000;
    bytes32 public merkleRoot;
    mapping(bytes32 => bool) public claimedLeaf;

    event Deposited(address indexed from, uint256 amount);
    event Claimed(address indexed user, bytes32 indexed claimId, uint256 amount);
    event RootUpdated(bytes32 newRoot);

    constructor() Ownable(msg.sender) {
        merkleRoot = 0x473d56889dda6e4bbc31ce164007a5f009b401aca7d5f75887a285cc6f297b8b;
    }

    // ================= ADMIN CONTROLS =================

    function setMerkleRoot(bytes32 _newRoot) external onlyOwner {
        require(_newRoot != bytes32(0), "Zero root");
        merkleRoot = _newRoot;
        emit RootUpdated(_newRoot);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function depositIDRX(uint256 amount) external onlyOwner {
        require(
            IDRX.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );
        emit Deposited(msg.sender, amount);
    }

    function withdrawRemaining(uint256 amount) external onlyOwner {
        require(IDRX.transfer(msg.sender, amount), "Withdraw failed");
    }

    function rescueToken(address token, uint256 amount) external onlyOwner {
        require(token != address(IDRX), "Cannot rescue reward token");
        require(IERC20(token).transfer(msg.sender, amount), "Rescue failed");
    }

    function claim(bytes32 claimId, bytes32[] calldata proof)
        external
        nonReentrant
        whenNotPaused
    {
        require(claimId != bytes32(0), "Invalid claimId");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, REWARD_AMOUNT, claimId));
        require(!claimedLeaf[leaf], "Already claimed");
        require(verify(proof, leaf), "Invalid proof");
        require(IDRX.balanceOf(address(this)) >= REWARD_AMOUNT, "Insufficient reward pool");

        claimedLeaf[leaf] = true;
        require(IDRX.transfer(msg.sender, REWARD_AMOUNT), "Transfer failed");

        emit Claimed(msg.sender, claimId, REWARD_AMOUNT);
    }

    function verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            if (hash < sibling) {
                hash = keccak256(abi.encodePacked(hash, sibling));
            } else {
                hash = keccak256(abi.encodePacked(sibling, hash));
            }
        }
        return hash == merkleRoot;
    }
}