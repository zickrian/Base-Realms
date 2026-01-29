// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * QRIS Claim by Hash (no Merkle).
 * Satu hash seperti password di env; backend kasih proofHash = keccak256(sender, claimId, claimSecretHash).
 */
contract QRISClaimHash is Ownable, ReentrancyGuard, Pausable {

    IERC20 public constant IDRX =
        IERC20(0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22);

    uint256 public constant REWARD_AMOUNT = 1000;
    bytes32 public claimSecretHash;
    mapping(bytes32 => bool) public claimed;

    event Claimed(address indexed user, bytes32 indexed claimId, uint256 amount);
    event SecretHashSet(bytes32 newHash);

    constructor(bytes32 _claimSecretHash) Ownable(msg.sender) {
        require(_claimSecretHash != bytes32(0), "Zero hash");
        claimSecretHash = _claimSecretHash;
    }

    function setClaimSecretHash(bytes32 _newHash) external onlyOwner {
        require(_newHash != bytes32(0), "Zero hash");
        claimSecretHash = _newHash;
        emit SecretHashSet(_newHash);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function depositIDRX(uint256 amount) external onlyOwner {
        require(
            IDRX.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );
    }

    function withdrawRemaining(uint256 amount) external onlyOwner {
        require(IDRX.transfer(msg.sender, amount), "Withdraw failed");
    }

    function claim(bytes32 claimId, bytes32 proofHash)
        external
        nonReentrant
        whenNotPaused
    {
        require(claimId != bytes32(0), "Invalid claimId");
        require(!claimed[claimId], "Already claimed");
        require(
            keccak256(abi.encodePacked(msg.sender, claimId, claimSecretHash)) == proofHash,
            "Invalid proof"
        );
        require(IDRX.balanceOf(address(this)) >= REWARD_AMOUNT, "Insufficient reward pool");

        claimed[claimId] = true;
        require(IDRX.transfer(msg.sender, REWARD_AMOUNT), "Transfer failed");

        emit Claimed(msg.sender, claimId, REWARD_AMOUNT);
    }
}
