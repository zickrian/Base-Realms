// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IWinToken {
    function mint(address to, uint256 amount) external;
}

contract Battle is Ownable {

    IERC721 public nft = IERC721(0xabab2d0A3EAF9722E3EE0840D0360c68899cB305);
    IERC20 public idrx = IERC20(0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22);

    IWinToken public winToken = IWinToken(0xB5d282f7abC8901a0B70d02442be81366831eB2d);
    address public bank = 0x9885B2DE7b8f0169f4Ed2C17BF71bC3D5a42d684;

    bytes32 public merkleRoot = 0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8;

    // IDRX uses 2 decimals, so 5 IDRX = 5 * 10^2 = 500
    uint256 public constant battleFee = 5 * 10**2;

    mapping(uint256 => bool) public used;

    struct Enemy {
        uint256 hp;
        uint256 attack;
    }

    Enemy public stage1 = Enemy(25, 5);

    constructor() Ownable(msg.sender) {}

    function battle(
        uint256 tokenId,
        uint256 hp,
        uint256 attack,
        bytes32[] calldata proof
    ) external {

        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(!used[tokenId], "Already used");

        bytes32 leaf = keccak256(abi.encodePacked(tokenId, hp, attack));
        require(verify(proof, leaf), "Invalid stats");

        idrx.transferFrom(msg.sender, bank, battleFee);

        used[tokenId] = true;

        if (simulate(hp, attack)) {
            winToken.mint(msg.sender, 1e18);
        }
    }

    function simulate(uint256 hp, uint256 attack) internal view returns (bool) {
        uint256 eHp = stage1.hp;
        uint256 eAtk = stage1.attack;

        while (true) {
            if (attack >= eHp) return true;
            eHp -= attack;

            if (eAtk >= hp) return false;
            hp -= eAtk;
        }
    }

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