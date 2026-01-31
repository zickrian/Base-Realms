battle contract
0x4267Da4AC96635c92bbE4232A9792283A1B354F2

wintoken
0xB5d282f7abC8901a0B70d02442be81366831eB2d

battlebank
0x9885B2DE7b8f0169f4Ed2C17BF71bC3D5a42d684

nft
0xabab2d0A3EAF9722E3EE0840D0360c68899cB305

carrot NFT (ERC-1155)
0x1a3902fF5CfDeD81D307CA89d8b2b045Abbbe0a7
- Token ID: 1
- Farming system: 6 hour growth cycle
- Future: Will affect battle stats (ATK/HP boost)

merkleROOT (generateMerkle.js)
0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8

merkleROOT (qrisMerkle.js)


qris
0x65823E53153D4257dF7616f0F767155412b27FD0

---
QRIS Claim by Hash (no Merkle) — qrisHash.sol
0x544596e3EFE6F407B21aA6b3430Aa8F1024fcb2a
- Deploy: constructor(bytes32 _claimSecretHash) dengan _claimSecretHash = keccak256(QRIS_CLAIM_SECRET).
- Env: QRIS_CLAIM_SECRET (password), NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS (alamat kontrak setelah deploy).
- Panduan deploy lengkap: merkle/DEPLOY_QRIS_HASH.md