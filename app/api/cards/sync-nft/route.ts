import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createPublicClient, fallback, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { FREE_PACK_CONTRACT_ADDRESS, NFT_CONTRACT_ABI_VIEM } from '@/app/lib/blockchain/nftService';

const CONTRACT_ADDRESS = FREE_PACK_CONTRACT_ADDRESS.toLowerCase();
const IMAGE_BASE_URL = process.env.NFT_IMAGE_BASE_URL
  || 'https://gateway.lighthouse.storage/ipfs/bafybeibcc7tmoaomjuk5sdi6bq4rm2o52vdszxjn6x4q2ywzqcrgh5sdfq/';
const INVENTORY_SYNC_QUANTITY = 1;
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');

/**
 * IMPORTANT: Set NFT_CONTRACT_DEPLOY_BLOCK environment variable to optimize sync performance
 * 
 * This should be the block number when your NFT contract was deployed.
 * Without this, the sync will query from block 20000000 (safe default for Base Mainnet).
 * 
 * Example for Base Mainnet:
 * - If deployed at block 21500000: NFT_CONTRACT_DEPLOY_BLOCK=21500000
 * - If deployed recently: Check your contract deployment transaction for the block number
 * 
 * To find your contract's deploy block:
 * 1. Go to https://basescan.org/address/YOUR_CONTRACT_ADDRESS
 * 2. Look for the "Contract Creation" transaction
 * 3. Note the block number
 * 4. Add to .env.local: NFT_CONTRACT_DEPLOY_BLOCK=<block_number>
 */

function toLowerAddress(address: string): string {
  return address.toLowerCase();
}

function buildImageUrl(tokenId: number): string {
  const baseUrl = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL : `${IMAGE_BASE_URL}/`;
  return `${baseUrl}${tokenId}.png`;
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

type ReadContractClient = Pick<ReturnType<typeof createPublicClient>, 'readContract' | 'getLogs'>;

async function supportsEnumerable(publicClient: ReadContractClient): Promise<boolean> {
  try {
    const response = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: NFT_CONTRACT_ABI_VIEM,
      functionName: 'supportsInterface',
      args: ['0x780e9d63'], // ERC721Enumerable
    });
    return Boolean(response);
  } catch (error) {
    console.warn('[Sync NFT] supportsInterface check failed, falling back to logs', error);
    return false;
  }
}

async function fetchOwnedTokenIdsFromLogs(
  publicClient: ReadContractClient,
  walletAddress: string
): Promise<number[]> {
  // CRITICAL FIX: Default to recent block (Base Mainnet block ~20M) to prevent timeout
  // Contract likely deployed recently, so we don't need to query from genesis
  const fromBlockEnv = process.env.NFT_CONTRACT_DEPLOY_BLOCK;
  const fromBlock = fromBlockEnv ? BigInt(fromBlockEnv) : BigInt(20000000);
  
  console.log(`[Sync NFT] Fetching Transfer logs from block ${fromBlock} to latest`);
  
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS as `0x${string}`,
    event: TRANSFER_EVENT,
    fromBlock,
    toBlock: 'latest',
  });

  console.log(`[Sync NFT] Found ${logs.length} Transfer events`);
  
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
      console.log(`[Sync NFT] Token ${tokenId} minted/transferred to wallet`);
    }

    if (from === normalizedWallet) {
      owned.delete(tokenId);
      console.log(`[Sync NFT] Token ${tokenId} transferred away from wallet`);
    }
  });

  console.log(`[Sync NFT] Final owned tokens:`, Array.from(owned));
  return Array.from(owned);
}

async function fetchOwnedTokenIds(
  publicClient: ReadContractClient,
  walletAddress: string,
  balance: number
): Promise<TokenResolutionResult> {
  const tokenIds: number[] = [];
  
  // CRITICAL FIX: Try enumerable first, but don't throw error immediately
  try {
    const enumerableSupported = await supportsEnumerable(publicClient);
    console.log(`[Sync NFT] ERC721Enumerable supported: ${enumerableSupported}`);
    
    if (enumerableSupported) {
      // Try to get token IDs via enumerable
      for (let index = 0; index < balance; index += 1) {
        try {
          const tokenId = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: NFT_CONTRACT_ABI_VIEM,
            functionName: 'tokenOfOwnerByIndex',
            args: [walletAddress as `0x${string}`, BigInt(index)],
          });
          tokenIds.push(Number(tokenId));
        } catch (indexError) {
          console.warn(`[Sync NFT] Failed to get token at index ${index}:`, indexError);
        }
      }
      
      if (tokenIds.length > 0) {
        console.log(`[Sync NFT] Successfully fetched ${tokenIds.length} tokens via enumerable`);
        return {
          tokenIds,
          resolved: true,
          source: 'onchain',
        };
      }
    }
  } catch (error) {
    console.warn('[Sync NFT] ERC721Enumerable check/fetch failed, will try Transfer logs', error);
  }

  // Fallback to Transfer logs (more reliable for most contracts)
  console.log('[Sync NFT] Attempting Transfer log fallback...');
  try {
    const logTokenIds = await fetchOwnedTokenIdsFromLogs(publicClient, walletAddress);
    if (logTokenIds.length > 0) {
      console.log(`[Sync NFT] Successfully fetched ${logTokenIds.length} tokens via Transfer logs`);
      return {
        tokenIds: logTokenIds,
        resolved: true,
        source: 'onchain-log',
      };
    }
  } catch (logError) {
    console.error('[Sync NFT] Transfer log fallback failed', logError);
  }

  // If we reach here, we couldn't resolve any tokens
  console.warn('[Sync NFT] Could not resolve token IDs via any method');
  return {
    tokenIds: [],
    resolved: false,
    source: 'unresolved',
  };
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
 * 
 * BLOCKCHAIN-FIRST APPROACH:
 * - Blockchain wallet is the SINGLE SOURCE OF TRUTH
 * - Database inventory is just a cache for faster queries
 * - This endpoint ensures database perfectly matches blockchain state
 * 
 * Flow:
 * 1. Query blockchain: What NFTs does this wallet own? (token IDs)
 * 2. Query database: What card templates exist for these token IDs?
 * 3. Create templates: If token ID doesn't have template, create one
 * 4. Sync inventory:
 *    - ADD: NFTs owned on blockchain but not in database inventory
 *    - UPDATE: NFTs already in inventory (update sync timestamp)
 *    - REMOVE: NFTs in database but NOT owned on blockchain (transferred/sold)
 * 5. Return: Updated inventory that matches blockchain exactly
 * 
 * This is called:
 * - On login (initial sync)
 * - After minting (add new NFT)
 * - Periodically (to catch transfers/sales)
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

    // IMPROVED: Multiple RPC URLs with fallback for reliability
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL;
    const rpcUrlList = (process.env.BASE_RPC_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    
    // Add default public RPCs if no custom RPCs configured
    const defaultRpcs = [
      'https://base.llamarpc.com',
      'https://base.meowrpc.com', 
      'https://base-mainnet.public.blastapi.io',
      'https://mainnet.base.org'
    ];
    
    const transportCandidates = [
      ...rpcUrlList, 
      rpcUrl,
      ...(rpcUrlList.length === 0 && !rpcUrl ? defaultRpcs : [])
    ].filter(Boolean);
    
    console.log(`[Sync NFT] Using ${transportCandidates.length} RPC URLs for fallback:`, transportCandidates);
    
    const transport = transportCandidates.length > 0
      ? fallback(transportCandidates.map((url) => http(url, {
          timeout: 30000, // 30 second timeout per request
          retryCount: 2,   // Retry 2 times per RPC
        })))
      : http();
      
    const publicClient = createPublicClient({
      chain: base,
      transport,
    });

    let nftBalance = 0;
    
    try {
      // ATTEMPT 1: Try balanceOf (fastest if works)
      console.log(`[Sync NFT] Attempting balanceOf for wallet ${walletAddress}...`);
      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: NFT_CONTRACT_ABI_VIEM,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      nftBalance = Number(balance);
      console.log(`[Sync NFT] ✓ balanceOf successful: ${nftBalance} NFTs for contract ${CONTRACT_ADDRESS}`);

      let ownedTokenIds: number[] = [];
      let tokenResolution: TokenResolutionResult = {
        tokenIds: [],
        resolved: true,
        source: 'onchain',
      };

      if (nftBalance > 0) {
        console.log(`[Sync NFT] Fetching token IDs for ${nftBalance} NFTs...`);
        tokenResolution = await fetchOwnedTokenIds(publicClient, walletAddress, nftBalance);
        ownedTokenIds = tokenResolution.tokenIds;
        console.log(`[Sync NFT] ✓ Resolved ${ownedTokenIds.length} tokenIds:`, ownedTokenIds, `(Source: ${tokenResolution.source})`);
        
        // IMPROVED: Even if resolution failed, check if we have partial data
        if (ownedTokenIds.length === 0 && nftBalance > 0) {
          console.warn(`[Sync NFT] ⚠️ Balance is ${nftBalance} but resolved 0 tokens - possible sync issue`);
        }
      } else {
        // CRITICAL: User has 0 NFTs on blockchain
        // We need to clear all inventory for this contract
        console.log(`[Sync NFT] ⚠️ Balance is 0 - User has no NFTs for this contract`);
        console.log(`[Sync NFT] Will clear all inventory entries for this contract`);
      }

      // IMPROVED: Only skip if both conditions are true: unresolved AND no tokens found
      if (!tokenResolution.resolved && ownedTokenIds.length === 0 && nftBalance > 0) {
        console.warn('[Sync NFT] ⚠️ Unable to resolve any token IDs; returning existing inventory to avoid data loss.');
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
          warning: 'Token resolution failed, returning existing inventory'
        });
      }
      
      // IMPROVED: If we got some tokens even with partial failure, continue with sync
      if (ownedTokenIds.length > 0) {
        console.log(`[Sync NFT] ✓ Proceeding with sync for ${ownedTokenIds.length} resolved tokens`);
      }

      const ownedTokenIdSet = new Set(ownedTokenIds);
      console.log(`[Sync NFT] 🎯 User owns ${ownedTokenIds.length} NFTs (token IDs):`, ownedTokenIds);
      console.log(`[Sync NFT] 🔍 Now checking database for cleanup and sync...`);

      // Fetch all templates for the contract (used for cleanup and mapping)
      const { data: contractTemplates, error: templateError } = await supabaseAdmin
        .from('card_templates')
        .select('id, token_id')
        .eq('contract_address', toLowerAddress(CONTRACT_ADDRESS));

      if (templateError) {
        console.error('[Sync NFT] ❌ Failed to fetch card templates:', templateError);
        throw templateError;
      }
      
      console.log(`[Sync NFT] 📋 Found ${contractTemplates?.length || 0} total card templates for contract ${CONTRACT_ADDRESS}`);
      
      // Get current user inventory to compare
      const { data: currentInventory } = await supabaseAdmin
        .from('user_inventory')
        .select('id, card_template_id, card_templates!inner(token_id, name)')
        .eq('user_id', user.id)
        .eq('card_templates.contract_address', CONTRACT_ADDRESS);
      
      console.log(`[Sync NFT] 📦 User currently has ${currentInventory?.length || 0} inventory entries`);
      if (currentInventory && currentInventory.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentTokenIds = currentInventory.map((inv: any) => inv.card_templates?.token_id).filter(Boolean);
        console.log(`[Sync NFT] 📦 Current inventory token IDs:`, currentTokenIds);
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
        console.log(`[Sync NFT] Creating ${missingTokenIds.length} missing templates for tokenIds:`, missingTokenIds);
        const inserts = missingTokenIds.map(buildCardTemplateInsert);
        for (const chunk of chunkArray(inserts, 200)) {
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from('card_templates')
            .insert(chunk)
            .select('id, token_id');

          if (insertError) {
            console.error('[Sync NFT] Failed to insert card templates:', insertError);
          } else {
            console.log(`[Sync NFT] Created ${inserted?.length || 0} card templates`);
          }

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
      
      console.log(`[Sync NFT] ✓ Mapped ${ownedTemplateIds.length} template IDs for ${ownedTokenIds.length} tokenIds`);
      
      // IMPROVED: Warn if mapping is incomplete
      if (ownedTemplateIds.length < ownedTokenIds.length) {
        const unmappedTokens = ownedTokenIds.filter(tid => !templateByTokenId.has(tid));
        console.warn(`[Sync NFT] ⚠️ ${unmappedTokens.length} tokens could not be mapped to templates:`, unmappedTokens);
      }

      // CRITICAL: Remove inventory entries that should NOT exist
      // BLOCKCHAIN-FIRST: Only keep what user actually owns on blockchain
      // Remove: 
      // 1. NFTs transferred/sold (no longer in wallet)
      // 2. Invalid entries (token_id is null)
      // 3. Everything if user has 0 NFTs
      
      if (nftBalance === 0) {
        // User has NO NFTs on blockchain → Clear ALL inventory for this contract
        console.log(`[Sync NFT] 🧹 User has 0 NFTs on blockchain, clearing all inventory...`);
        
        // Get all template IDs for this contract
        const allContractTemplateIds = (contractTemplates || []).map(t => t.id);
        
        if (allContractTemplateIds.length > 0) {
          const { error: clearError, count } = await supabaseAdmin
            .from('user_inventory')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)
            .in('card_template_id', allContractTemplateIds);
          
          if (clearError) {
            console.error('[Sync NFT] ❌ Failed to clear inventory:', clearError);
          } else {
            console.log(`[Sync NFT] ✅ Cleared ${count || 0} inventory entries (user has 0 NFTs)`);
          }
        } else {
          console.log(`[Sync NFT] ✓ No templates found for contract, nothing to clear`);
        }
      } else {
        // User has NFTs → Remove only what's NOT owned on blockchain
        const removableTemplateIds = (contractTemplates || [])
          .filter((template) => {
            // Remove if token_id is null (invalid entry)
            if (template.token_id === null || template.token_id === undefined) {
              console.log(`[Sync NFT] ⚠️ Found invalid template with null token_id:`, template.id);
              return true;
            }
            // Remove if token is not owned on blockchain
            if (typeof template.token_id === 'number' && !ownedTokenIdSet.has(template.token_id)) {
              console.log(`[Sync NFT] 🔄 Token #${template.token_id} no longer owned, will remove from inventory`);
              return true;
            }
            return false;
          })
          .map((template) => template.id);

        console.log(`[Sync NFT] Found ${removableTemplateIds.length} templates to remove from inventory`);
        
        let removedCount = 0;
        for (const chunk of chunkArray(removableTemplateIds, 200)) {
          if (chunk.length === 0) continue;
          const { error: deleteError, count } = await supabaseAdmin
            .from('user_inventory')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)
            .in('card_template_id', chunk);
          
          if (deleteError) {
            console.error('[Sync NFT] ❌ Failed to delete inventory entries:', deleteError);
          } else {
            removedCount += count || 0;
            console.log(`[Sync NFT] ✓ Removed ${count || 0} inventory entries`);
          }
        }
        
        if (removedCount > 0) {
          console.log(`[Sync NFT] ✅ Cleanup complete: Removed ${removedCount} NFTs (transferred/sold/invalid)`);
        } else {
          console.log(`[Sync NFT] ✓ No cleanup needed - inventory already matches blockchain`);
        }
      }

      if (ownedTemplateIds.length > 0) {
        console.log(`[Sync NFT] Syncing ${ownedTemplateIds.length} template IDs to inventory...`);
        
        const { data: existingInventory } = await supabaseAdmin
          .from('user_inventory')
          .select('id, card_template_id')
          .eq('user_id', user.id)
          .in('card_template_id', ownedTemplateIds);

        console.log(`[Sync NFT] Found ${existingInventory?.length || 0} existing inventory entries`);
        
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

        console.log(`[Sync NFT] Need to insert ${newInventoryRows.length} new inventory entries`);
        console.log(`[Sync NFT] Need to update ${existingInventory?.length || 0} existing entries`);

        // Update existing entries
        let updatedCount = 0;
        for (const chunk of chunkArray(ownedTemplateIds, 200)) {
          const { error: updateError } = await supabaseAdmin
            .from('user_inventory')
            .update({
              quantity: INVENTORY_SYNC_QUANTITY,
              blockchain_synced_at: new Date().toISOString(),
              last_sync_balance: INVENTORY_SYNC_QUANTITY,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .in('card_template_id', chunk);
          
          if (updateError) {
            console.error('[Sync NFT] Failed to update inventory chunk:', updateError);
          } else {
            updatedCount += chunk.length;
          }
        }
        console.log(`[Sync NFT] ✓ Updated ${updatedCount} inventory entries`);

        // Insert new entries
        let insertedCount = 0;
        for (const chunk of chunkArray(newInventoryRows, 200)) {
          if (chunk.length === 0) continue;
          const { error: insertError, data: insertedData } = await supabaseAdmin
            .from('user_inventory')
            .insert(chunk)
            .select('id');
          
          if (insertError) {
            console.error('[Sync NFT] ❌ Failed to insert inventory rows:', insertError);
          } else {
            insertedCount += insertedData?.length || chunk.length;
            console.log(`[Sync NFT] ✓ Inserted ${insertedData?.length || chunk.length} new inventory entries`);
          }
        }
        console.log(`[Sync NFT] ✓ Total inserted: ${insertedCount} new entries`);
        console.log(`[Sync NFT] ✓ Sync complete! User now has ${ownedTemplateIds.length} NFTs in inventory`);
      } else {
        console.log('[Sync NFT] No owned template IDs to sync (user has 0 NFTs)');
      }
    } catch (blockchainError: unknown) {
      console.error('[Sync NFT] ❌ balanceOf failed, attempting Transfer logs-only approach...');
      console.error('[Sync NFT] Error details:', blockchainError);
      
      // FALLBACK: Skip balanceOf, go directly to Transfer logs
      try {
        console.log('[Sync NFT] 🔄 FALLBACK METHOD: Querying Transfer logs directly...');
        const logTokenIds = await fetchOwnedTokenIdsFromLogs(publicClient, walletAddress);
        
        if (logTokenIds.length > 0) {
          console.log(`[Sync NFT] ✅ FALLBACK SUCCESS: Found ${logTokenIds.length} tokens via Transfer logs:`, logTokenIds);
          
          // Get or create card templates
          const { data: contractTemplates } = await supabaseAdmin
            .from('card_templates')
            .select('id, token_id')
            .eq('contract_address', CONTRACT_ADDRESS);
          
          // Create missing templates
          const existingTokenIds = new Set(
            (contractTemplates || [])
              .map(t => t.token_id)
              .filter((id): id is number => typeof id === 'number')
          );
          
          const templatesToCreate = logTokenIds
            .filter(tokenId => !existingTokenIds.has(tokenId))
            .map(tokenId => buildCardTemplateInsert(tokenId));
          
          if (templatesToCreate.length > 0) {
            console.log(`[Sync NFT] Creating ${templatesToCreate.length} new card templates`);
            await supabaseAdmin
              .from('card_templates')
              .insert(templatesToCreate);
          }
          
          // Refresh template list
          const { data: allTemplates } = await supabaseAdmin
            .from('card_templates')
            .select('id, token_id')
            .eq('contract_address', CONTRACT_ADDRESS)
            .in('token_id', logTokenIds);
          
          const ownedTemplateIds = (allTemplates || []).map(t => t.id);
          
          // Insert to user_inventory
          if (ownedTemplateIds.length > 0) {
            const inventoryInserts = ownedTemplateIds.map(templateId => ({
              user_id: user.id,
              card_template_id: templateId,
              quantity: INVENTORY_SYNC_QUANTITY,
            }));
            
            await supabaseAdmin
              .from('user_inventory')
              .upsert(inventoryInserts, {
                onConflict: 'user_id,card_template_id',
                ignoreDuplicates: false,
              });
            
            console.log(`[Sync NFT] ✅ FALLBACK: Synced ${ownedTemplateIds.length} NFTs to inventory`);
          }
        } else {
          console.log('[Sync NFT] ⚠️ FALLBACK: No tokens found in Transfer logs');
        }
      } catch (fallbackError) {
        console.error('[Sync NFT] ❌ FALLBACK FAILED:', fallbackError);
      }
    }

    // Return updated inventory
    console.log('[Sync NFT] Fetching final inventory from database...');
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
      console.error('[Sync NFT] ❌ Failed to fetch final inventory:', inventoryError);
      throw inventoryError;
    }

    console.log(`[Sync NFT] ✅ Sync complete! Returning ${inventory?.length || 0} inventory items`);
    if (inventory && inventory.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenIds = inventory.map((item: any) => item.card_templates?.token_id).filter(Boolean);
      console.log('[Sync NFT] Final token IDs in inventory:', tokenIds);
    }

    return NextResponse.json({
      success: true,
      inventory: inventory || [],
      syncedAt: new Date().toISOString(),
      totalItems: inventory?.length || 0,
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
