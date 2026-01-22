import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { FREE_PACK_CONTRACT_ADDRESS, NFT_CONTRACT_ABI_VIEM } from '@/app/lib/blockchain/nftService';

const CONTRACT_ADDRESS = FREE_PACK_CONTRACT_ADDRESS.toLowerCase();
const IMAGE_BASE_URL = 'https://gateway.lighthouse.storage/ipfs/bafybeibcc7tmoaomjuk5sdi6bq4rm2o52vdszxjn6x4q2ywzqcrgh5sdfq/';
const INVENTORY_SYNC_QUANTITY = 1;
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');

function toLowerAddress(address: string): string {
  return address.toLowerCase();
}

function buildImageUrl(tokenId: number): string {
  return `${IMAGE_BASE_URL}${tokenId}.png`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type TokenResolutionResult = {
  tokenIds: number[];
  resolved: boolean;
  source: 'onchain' | 'onchain-log' | 'unresolved';
};

type ReadContractClient = {
  readContract: (args: {
    address: `0x${string}`;
    abi: typeof NFT_CONTRACT_ABI_VIEM;
    functionName: 'tokenOfOwnerByIndex';
    args: [`0x${string}`, bigint];
  }) => Promise<bigint>;
  getLogs: (args: {
    address: `0x${string}`;
    event: typeof TRANSFER_EVENT;
    fromBlock: bigint;
    toBlock: 'latest';
  }) => Promise<Array<{ args: { from?: `0x${string}`; to?: `0x${string}`; tokenId?: bigint } }>>;
};

async function fetchOwnedTokenIdsFromLogs(
  publicClient: ReadContractClient,
  walletAddress: string
): Promise<number[]> {
  const fromBlockEnv = process.env.NFT_CONTRACT_DEPLOY_BLOCK;
  const fromBlock = fromBlockEnv ? BigInt(fromBlockEnv) : BigInt(0);
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS as `0x${string}`,
    event: TRANSFER_EVENT,
    fromBlock,
    toBlock: 'latest',
  });

  const owned = new Set<number>();
  const normalizedWallet = walletAddress.toLowerCase();

  logs.forEach((log) => {
    const from = log.args.from?.toLowerCase();
    const to = log.args.to?.toLowerCase();
    const tokenId = log.args.tokenId !== undefined ? Number(log.args.tokenId) : Number.NaN;

    if (!Number.isFinite(tokenId)) {
      return;
    }

    if (to === normalizedWallet) {
      owned.add(tokenId);
    }

    if (from === normalizedWallet) {
      owned.delete(tokenId);
    }
  });

  return Array.from(owned);
}

async function fetchOwnedTokenIds(
  publicClient: ReadContractClient,
  walletAddress: string,
  balance: number
): Promise<TokenResolutionResult> {
  const tokenIds: number[] = [];
  try {
    for (let index = 0; index < balance; index += 1) {
      const tokenId = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_CONTRACT_ABI_VIEM,
        functionName: 'tokenOfOwnerByIndex',
        args: [walletAddress as `0x${string}`, BigInt(index)],
      });
      tokenIds.push(Number(tokenId));
    }

    return {
      tokenIds,
      resolved: true,
      source: 'onchain',
    };
  } catch (error) {
    console.warn('[Sync NFT] tokenOfOwnerByIndex failed, falling back to Transfer logs', error);
    try {
      const logTokenIds = await fetchOwnedTokenIdsFromLogs(publicClient, walletAddress);
      return {
        tokenIds: logTokenIds,
        resolved: true,
        source: 'onchain-log',
      };
    } catch (logError) {
      console.error('[Sync NFT] Transfer log fallback failed', logError);
      return {
        tokenIds: [],
        resolved: false,
        source: 'unresolved',
      };
    }
  }
}

function buildCardTemplateInsert(tokenId: number) {
  return {
    name: `Base Realms #${tokenId}`,
    rarity: 'common',
    image_url: buildImageUrl(tokenId),
    description: 'Base Realms NFT',
    source_type: 'nft',
    contract_address: CONTRACT_ADDRESS,
    token_id: tokenId,
    is_blockchain_synced: true,
  };
}

/**
 * Sync NFT inventory from blockchain to database
 * This endpoint:
 * 1. Checks user's NFT balance from blockchain for all contract addresses
 * 2. Syncs NFT quantities to user_inventory based on contract addresses
 * 3. Returns synced inventory
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL;
    const publicClient = createPublicClient({
      chain: base,
      transport: rpcUrl ? http(rpcUrl) : http(),
    });

    try {
      // Get balance from blockchain
      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_CONTRACT_ABI_VIEM,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      const nftBalance = Number(balance);
      console.log(`[Sync NFT] Found ${nftBalance} NFTs for contract ${CONTRACT_ADDRESS}`);

      let ownedTokenIds: number[] = [];
      let tokenResolution: TokenResolutionResult = {
        tokenIds: [],
        resolved: true,
        source: 'onchain',
      };

      if (nftBalance > 0) {
        tokenResolution = await fetchOwnedTokenIds(publicClient, walletAddress, nftBalance);
        ownedTokenIds = tokenResolution.tokenIds;
      }

      if (!tokenResolution.resolved && nftBalance > 0) {
        console.warn('[Sync NFT] Unable to resolve token IDs; skipping inventory update to avoid data loss.');
        const { data: fallbackInventory, error: fallbackError } = await supabaseAdmin
          .from('user_inventory')
          .select(`
            id,
            quantity,
            acquired_at,
            card_templates!inner(
              id,
              name,
              image_url,
              token_id,
              contract_address
            )
          `)
          .eq('user_id', user.id)
          .eq('card_templates.contract_address', CONTRACT_ADDRESS)
          .order('acquired_at', { ascending: false});

        if (fallbackError) {
          throw fallbackError;
        }

        return NextResponse.json({
          success: true,
          inventory: fallbackInventory || [],
          source: tokenResolution.source,
        });
      }

      const ownedTokenIdSet = new Set(ownedTokenIds);

      // Fetch all templates for the contract (used for cleanup and mapping)
      const { data: contractTemplates, error: templateError } = await supabaseAdmin
        .from('card_templates')
        .select('id, token_id')
        .eq('contract_address', toLowerAddress(CONTRACT_ADDRESS));

      if (templateError) {
        throw templateError;
      }

      const templateByTokenId = new Map<number, string>();
      (contractTemplates || []).forEach((template) => {
        if (typeof template.token_id === 'number') {
          templateByTokenId.set(template.token_id, template.id);
        }
      });

      // Ensure templates exist for owned tokens
      const missingTokenIds = ownedTokenIds.filter((tokenId) => !templateByTokenId.has(tokenId));
      if (missingTokenIds.length > 0) {
        const inserts = missingTokenIds.map(buildCardTemplateInsert);
        for (const chunk of chunkArray(inserts, 200)) {
          const { data: inserted } = await supabaseAdmin
            .from('card_templates')
            .insert(chunk)
            .select('id, token_id');

          (inserted || []).forEach((row) => {
            if (typeof row.token_id === 'number') {
              templateByTokenId.set(row.token_id, row.id);
            }
          });
        }
      }

      const ownedTemplateIds = ownedTokenIds
        .map((tokenId) => templateByTokenId.get(tokenId))
        .filter((id): id is string => Boolean(id));

      // Remove inventory entries for this contract that are no longer owned
      const removableTemplateIds = (contractTemplates || [])
        .filter((template) => typeof template.token_id === 'number' && !ownedTokenIdSet.has(template.token_id))
        .map((template) => template.id);

      for (const chunk of chunkArray(removableTemplateIds, 200)) {
        if (chunk.length === 0) continue;
        await supabaseAdmin
          .from('user_inventory')
          .delete()
          .eq('user_id', user.id)
          .in('card_template_id', chunk);
      }

      if (ownedTemplateIds.length > 0) {
        const { data: existingInventory } = await supabaseAdmin
          .from('user_inventory')
          .select('id, card_template_id')
          .eq('user_id', user.id)
          .in('card_template_id', ownedTemplateIds);

        const existingTemplateIdSet = new Set(
          (existingInventory || []).map((row) => row.card_template_id)
        );

        const newInventoryRows = ownedTemplateIds
          .filter((templateId) => !existingTemplateIdSet.has(templateId))
          .map((templateId) => ({
            user_id: user.id,
            card_template_id: templateId,
            quantity: INVENTORY_SYNC_QUANTITY,
            blockchain_synced_at: new Date().toISOString(),
            last_sync_balance: INVENTORY_SYNC_QUANTITY,
          }));

        for (const chunk of chunkArray(ownedTemplateIds, 200)) {
          await supabaseAdmin
            .from('user_inventory')
            .update({
              quantity: INVENTORY_SYNC_QUANTITY,
              blockchain_synced_at: new Date().toISOString(),
              last_sync_balance: INVENTORY_SYNC_QUANTITY,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .in('card_template_id', chunk);
        }

        for (const chunk of chunkArray(newInventoryRows, 200)) {
          if (chunk.length === 0) continue;
          await supabaseAdmin
            .from('user_inventory')
            .insert(chunk);
        }
      }
    } catch (blockchainError: unknown) {
      console.error('Blockchain sync error:', blockchainError);
    }

    // Return updated inventory
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        id,
        quantity,
        acquired_at,
        card_templates!inner(
          id,
          name,
          image_url,
          token_id,
          contract_address
        )
      `)
      .eq('user_id', user.id)
      .eq('card_templates.contract_address', CONTRACT_ADDRESS)
      .order('acquired_at', { ascending: false});

    if (inventoryError) {
      throw inventoryError;
    }

    return NextResponse.json({
      success: true,
      inventory: inventory || [],
    });
  } catch (error: unknown) {
    console.error('Sync NFT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync NFT inventory';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - just sync and return inventory
 */
export async function GET(request: NextRequest) {
  // Reuse POST logic
  return POST(request);
}
