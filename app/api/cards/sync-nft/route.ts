import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { NFT_CONTRACTS, NFT_CONTRACT_ABI_VIEM } from '@/app/lib/blockchain/nftService';

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

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Check NFT balance for each contract address
    const contractAddresses = [
      { rarity: 'common', address: NFT_CONTRACTS.common },
      { rarity: 'rare', address: NFT_CONTRACTS.rare },
      { rarity: 'epic', address: NFT_CONTRACTS.epic },
      { rarity: 'legendary', address: NFT_CONTRACTS.legendary },
    ];

    for (const { rarity, address: contractAddress } of contractAddresses) {
      try {
        // Get balance from blockchain
        const balance = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: NFT_CONTRACT_ABI_VIEM,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        });

        const nftBalance = Number(balance);

        if (nftBalance > 0) {
          console.log(`[Sync NFT] Found ${nftBalance} NFTs for ${rarity} contract ${contractAddress}`);
          
          // Find card template with this contract address
          // Try exact match first
          let { data: cardTemplate } = await supabaseAdmin
            .from('card_templates')
            .select('id, name, rarity, image_url, contract_address')
            .eq('contract_address', contractAddress.toLowerCase())
            .eq('rarity', rarity)
            .single();

          // If not found, try without contract_address filter (in case contract_address is null)
          if (!cardTemplate) {
            console.log(`[Sync NFT] Card template not found for contract ${contractAddress}, trying by rarity only`);
            const { data: templates } = await supabaseAdmin
              .from('card_templates')
              .select('id, name, rarity, image_url, contract_address')
              .eq('rarity', rarity)
              .limit(1);
            
            if (templates && templates.length > 0) {
              cardTemplate = templates[0];
              console.log(`[Sync NFT] Found card template by rarity: ${cardTemplate.id}`);
            }
          }

          if (cardTemplate) {
            // Ensure card template has correct image_url based on rarity
            // Path format: game/icons/commoncards.png (without leading slash)
            const imageMap: Record<string, string> = {
              common: 'game/icons/commoncards.png',
              rare: 'game/icons/rarecards.png',
              epic: 'game/icons/epiccards.png',
              legendary: 'game/icons/legendcards.png',
            };
            
            const expectedImageUrl = imageMap[rarity] || `game/icons/${rarity}cards.png`;
            
            // Update card template if image_url is missing or incorrect
            if (!cardTemplate.image_url || 
                (!cardTemplate.image_url.includes('commoncards') && 
                 !cardTemplate.image_url.includes('rarecards') && 
                 !cardTemplate.image_url.includes('epiccards') && 
                 !cardTemplate.image_url.includes('legendcards'))) {
              await supabaseAdmin
                .from('card_templates')
                .update({
                  image_url: expectedImageUrl,
                  contract_address: contractAddress.toLowerCase(),
                })
                .eq('id', cardTemplate.id);
              console.log(`[Sync NFT] Updated card template ${cardTemplate.id} image_url to ${expectedImageUrl}`);
              cardTemplate.image_url = expectedImageUrl;
            }
            
            // Check if inventory exists
            const { data: existingInventory } = await supabaseAdmin
              .from('user_inventory')
              .select('id, quantity')
              .eq('user_id', user.id)
              .eq('card_template_id', cardTemplate.id)
              .single();

            if (existingInventory) {
              // Update quantity
              await supabaseAdmin
                .from('user_inventory')
                .update({
                  quantity: nftBalance,
                  blockchain_synced_at: new Date().toISOString(),
                  last_sync_balance: nftBalance,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInventory.id);
              console.log(`[Sync NFT] Updated inventory for card ${cardTemplate.id}: ${nftBalance}`);
            } else {
              // Insert new inventory entry
              await supabaseAdmin
                .from('user_inventory')
                .insert({
                  user_id: user.id,
                  card_template_id: cardTemplate.id,
                  quantity: nftBalance,
                  blockchain_synced_at: new Date().toISOString(),
                  last_sync_balance: nftBalance,
                });
              console.log(`[Sync NFT] Created new inventory entry for card ${cardTemplate.id}: ${nftBalance}`);
            }
          } else {
            console.warn(`[Sync NFT] No card template found for ${rarity} contract ${contractAddress}. NFT balance: ${nftBalance}`);
            
            // Create card template if it doesn't exist
            const imageMap: Record<string, string> = {
              common: 'game/icons/commoncards.png',
              rare: 'game/icons/rarecards.png',
              epic: 'game/icons/epiccards.png',
              legendary: 'game/icons/legendcards.png',
            };
            
            const imageUrl = imageMap[rarity] || `game/icons/${rarity}cards.png`;
            
            try {
              const { data: newTemplate, error: createError } = await supabaseAdmin
                .from('card_templates')
                .insert({
                  name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Card`,
                  rarity: rarity,
                  image_url: imageUrl,
                  contract_address: contractAddress.toLowerCase(),
                  description: `NFT card from ${rarity} contract`,
                })
                .select()
                .single();
              
              if (!createError && newTemplate) {
                console.log(`[Sync NFT] Created new card template for ${rarity}: ${newTemplate.id}`);
                
                // Create inventory entry
                await supabaseAdmin
                  .from('user_inventory')
                  .insert({
                    user_id: user.id,
                    card_template_id: newTemplate.id,
                    quantity: nftBalance,
                    blockchain_synced_at: new Date().toISOString(),
                    last_sync_balance: nftBalance,
                  });
                console.log(`[Sync NFT] Created inventory entry for new template ${newTemplate.id}: ${nftBalance}`);
              }
            } catch (createErr) {
              console.error(`[Sync NFT] Failed to create card template for ${rarity}:`, createErr);
            }
          }
        } else {
          console.log(`[Sync NFT] No NFTs found for ${rarity} contract ${contractAddress}`);
        }
      } catch (blockchainError: unknown) {
        console.error(`Blockchain error for ${rarity}:`, blockchainError);
        // Continue with next contract if one fails
      }
    }

    // Return updated inventory
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        *,
        card_templates(*)
      `)
      .eq('user_id', user.id)
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
