const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require("fs");

// load stats
const stats = JSON.parse(fs.readFileSync("stats.json"));

// bikin leaf hash sesuai solidity: keccak256(abi.encodePacked(tokenId, hp, attack))
const leaves = stats.map(s =>
  keccak256(
    Buffer.from(
      require("ethers").solidityPacked(
        ["uint256", "uint256", "uint256"],
        [s.tokenId, s.hp, s.attack]
      ).slice(2),
      "hex"
    )
  )
);

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

console.log("MERKLE ROOT:", tree.getHexRoot());