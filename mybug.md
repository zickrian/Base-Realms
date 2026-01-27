Console ContractFunctionExecutionError


The contract function "hasUsed" returned no data ("0x").

This could be due to any of the following:
  - The contract does not have the function "hasUsed",
  - The parameters passed to the contract function may be invalid, or
  - The address is not a contract.
 
Contract Call:
  address:   0x4267Da4AC96635c92bbE4232A9792283A1B354F2
  function:  hasUsed(uint256 tokenId)
  args:             (7)

Docs: https://viem.sh/docs/contract/readContract
Version: viem@2.43.2

Show More
app\lib\blockchain\battleService.ts (720:18) @ async hasNFTBeenUsed


  718 |     const publicClient = createBattlePublicClient();
  719 |
> 720 |     const used = await publicClient.readContract({
      |                  ^
  721 |       address: BATTLE_CONTRACT_ADDRESS as Address,
  722 |       abi: BATTLE_CONTRACT_ABI,
  723 |       functionName: 'hasUsed',
Call Stack
6

Show 2 ignore-listed frame(s)
async hasNFTBeenUsed
app\lib\blockchain\battleService.ts (720:18)
async prepareBattle
app\lib\blockchain\battleService.ts (547:25)
async useBattle.useCallback[prepare]
app\hooks\useBattle.ts (165:27)
async BattlePreparation.useEffect.initializeBattle
app\components\game\BattlePreparation.tsx (146:9)