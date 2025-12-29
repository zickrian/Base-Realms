import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI_VIEM } from '@/app/lib/blockchain/nftService';

/**
 * Sync NFT inventory from blockchain to database
 * This endpoint:
 * 1. Checks user's NFT balance from blockchain
 * 2. Finds or creates "Common Card" template in database
 * 3. Syncs NFT quantity to user_inventory
 * 4. Returns synced inventory
 */
export async function POST(request: NextRequest) {
  const syncApiStart = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:16',message:'sync-nft API start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user
    const userQueryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:30',message:'sync user query start',data:{walletAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    const userQueryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:37',message:'sync user query end',data:{duration:userQueryEnd-userQueryStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check NFT balance from blockchain
    let nftBalance = 0;
    const blockchainStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:43',message:'blockchain call start',data:{walletAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const balance = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_CONTRACT_ABI_VIEM,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      nftBalance = Number(balance);
    } catch (blockchainError: any) {
      console.error('Blockchain error:', blockchainError);
      // Continue with balance 0 if blockchain call fails
      // This allows the endpoint to still work if RPC is down
    } finally {
      const blockchainEnd = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:59',message:'blockchain call end',data:{duration:blockchainEnd-blockchainStart,balance:nftBalance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }

    // Find or create "Common Card" template with NFT source type
    // IMPORTANT: Use .maybeSingle() instead of .single() to handle case where multiple exist
    // If multiple exist, we'll take the first one and clean up duplicates
    const templateQueryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:66',message:'template query start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    let { data: commonCardTemplate, error: templateError } = await supabaseAdmin
      .from('card_templates')
      .select('id')
      .eq('rarity', 'common')
      .eq('name', 'Common Card')
      .eq('source_type', 'nft')
      .eq('contract_address', NFT_CONTRACT_ADDRESS)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const templateQueryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:78',message:'template query end',data:{duration:templateQueryEnd-templateQueryStart,found:!!commonCardTemplate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // If no template found or error, create one
    if (templateError || !commonCardTemplate) {
      // Check if there are any duplicates first (shouldn't happen, but safety check)
      const { data: existingTemplates } = await supabaseAdmin
        .from('card_templates')
        .select('id')
        .eq('rarity', 'common')
        .eq('name', 'Common Card')
        .eq('source_type', 'nft')
        .eq('contract_address', NFT_CONTRACT_ADDRESS)
        .order('created_at', { ascending: false });

      // If duplicates exist, delete all except the newest
      if (existingTemplates && existingTemplates.length > 1) {
        const keepId = existingTemplates[0].id;
        const deleteIds = existingTemplates.slice(1).map(t => t.id);
        
        // Delete duplicate templates
        await supabaseAdmin
          .from('card_templates')
          .delete()
          .in('id', deleteIds);
        
        // Delete associated inventory entries
        await supabaseAdmin
          .from('user_inventory')
          .delete()
          .in('card_template_id', deleteIds);
        
        commonCardTemplate = { id: keepId };
      } else if (existingTemplates && existingTemplates.length === 1) {
        commonCardTemplate = existingTemplates[0];
      } else {
        // Create new template if none exists
        const { data: newTemplate, error: createError } = await supabaseAdmin
          .from('card_templates')
          .insert({
            name: 'Common Card',
            rarity: 'common',
            image_url: 'game/icons/commoncards.png',
            description: 'NFT card from blockchain contract',
            source_type: 'nft',
            contract_address: NFT_CONTRACT_ADDRESS,
            is_blockchain_synced: true,
          })
          .select('id')
          .single();

        if (createError || !newTemplate) {
          throw new Error('Failed to create common card template');
        }

        commonCardTemplate = newTemplate;
      }
    }

    // Sync NFT balance to inventory
    // IMPORTANT: Use upsert to prevent duplicates and ensure only one entry per user+template
    if (nftBalance > 0) {
      // Check for existing inventory entries (might be multiple due to previous bug)
      const { data: existingInventories } = await supabaseAdmin
        .from('user_inventory')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_template_id', commonCardTemplate.id);

      // If multiple entries exist, delete all and create fresh one
      if (existingInventories && existingInventories.length > 1) {
        await supabaseAdmin
          .from('user_inventory')
          .delete()
          .eq('user_id', user.id)
          .eq('card_template_id', commonCardTemplate.id);
        
        // Create single entry
        await supabaseAdmin
          .from('user_inventory')
          .insert({
            user_id: user.id,
            card_template_id: commonCardTemplate.id,
            quantity: nftBalance,
            blockchain_synced_at: new Date().toISOString(),
            last_sync_balance: nftBalance,
          });
      } else if (existingInventories && existingInventories.length === 1) {
        // Single entry exists, update it
        const existingInventory = existingInventories[0];
        const needsUpdate = existingInventory.quantity !== nftBalance;
        if (needsUpdate) {
          await supabaseAdmin
            .from('user_inventory')
            .update({ 
              quantity: nftBalance,
              blockchain_synced_at: new Date().toISOString(),
              last_sync_balance: existingInventory.quantity || 0,
            })
            .eq('id', existingInventory.id);
        } else {
          // Update sync timestamp even if quantity unchanged
          await supabaseAdmin
            .from('user_inventory')
            .update({ 
              blockchain_synced_at: new Date().toISOString(),
            })
            .eq('id', existingInventory.id);
        }
      } else {
        // No entry exists, create new
        await supabaseAdmin
          .from('user_inventory')
          .insert({
            user_id: user.id,
            card_template_id: commonCardTemplate.id,
            quantity: nftBalance,
            blockchain_synced_at: new Date().toISOString(),
            last_sync_balance: nftBalance,
          });
      }
    } else {
      // If balance is 0, remove ALL NFT card entries from inventory (cleanup duplicates)
      await supabaseAdmin
        .from('user_inventory')
        .delete()
        .eq('user_id', user.id)
        .eq('card_template_id', commonCardTemplate.id);
    }

    // Return updated inventory
    const finalInventoryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:205',message:'final inventory query start',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        *,
        card_templates(*)
      `)
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: false });

    const finalInventoryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:217',message:'final inventory query end',data:{duration:finalInventoryEnd-finalInventoryStart,count:inventory?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (inventoryError) {
      throw inventoryError;
    }

    const syncApiEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-nft/route.ts:225',message:'sync-nft API end',data:{totalDuration:syncApiEnd-syncApiStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      nftBalance,
      inventory: inventory || [],
    });
  } catch (error: any) {
    console.error('Sync NFT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync NFT inventory' },
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
