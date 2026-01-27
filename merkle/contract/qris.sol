// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract QRISMerkleClaim is Ownable, ReentrancyGuard, Pausable {

    IERC20 public constant IDRX =
        IERC20(0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22);

    bytes32 public merkleRoot;

    mapping(address => bool) public claimed;

    event Deposited(address indexed from, uint256 amount);
    event Claimed(address indexed user, uint256 amount);
    event RootUpdated(bytes32 newRoot);

    constructor(bytes32 _root) {
        require(_root != bytes32(0), "Invalid root");
        merkleRoot = _root;
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

    // Owner deposit reward tokens
    function depositIDRX(uint256 amount) external onlyOwner {
        require(
            IDRX.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );
        emit Deposited(msg.sender, amount);
    }

    // Withdraw sisa dana (misal campaign selesai)
    function withdrawRemaining(uint256 amount) external onlyOwner {
        require(IDRX.transfer(msg.sender, amount), "Withdraw failed");
    }

    // Rescue token lain yg nyasar
    function rescueToken(address token, uint256 amount) external onlyOwner {
        require(token != address(IDRX), "Cannot rescue reward token");
        IERC20(token).transfer(msg.sender, amount);
    }

    // ================= CLAIM =================

    function claim(uint256 amount, bytes32[] calldata proof)
        external
        nonReentrant
        whenNotPaused
    {
        require(!claimed[msg.sender], "Already claimed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));

        require(
            verify(proof, leaf),
            "Invalid proof"
        );

        require(
            IDRX.balanceOf(address(this)) >= amount,
            "Insufficient reward pool"
        );

        claimed[msg.sender] = true;

        require(IDRX.transfer(msg.sender, amount), "Transfer failed");

        emit Claimed(msg.sender, amount);
    }

    // Custom verify function untuk match dengan MerkleTreeJS sortPairs: true
    function verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];

            // Match MerkleTreeJS with sortPairs: true (sorted pairs)
            if (hash < sibling) {
                hash = keccak256(abi.encodePacked(hash, sibling));
            } else {
                hash = keccak256(abi.encodePacked(sibling, hash));
            }
        }
        return hash == merkleRoot;
    }
}