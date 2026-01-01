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
  const syncApiStart = Date.now();
  
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
          // Find card template with this contract address
          const { data: cardTemplate } = await supabaseAdmin
            .from('card_templates')
            .select('id, name, rarity, image_url')
            .eq('contract_address', contractAddress.toLowerCase())
            .eq('rarity', rarity)
            .single();

          if (cardTemplate) {
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
            }
          }
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
