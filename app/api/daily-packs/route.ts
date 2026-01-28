import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { validateWalletHeader, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletValidation.address)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get daily packs
    const { data: dailyPacks, error: packsError } = await supabaseAdmin
      .from('daily_packs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let currentDailyPacks = dailyPacks;

    // Check if reset is needed
    if (currentDailyPacks && currentDailyPacks.next_reset_at) {
      const resetTime = new Date(currentDailyPacks.next_reset_at);
      const now = new Date();

      if (now >= resetTime) {
        // Reset packs
        const nextReset = new Date(now);
        nextReset.setDate(nextReset.getDate() + 1);
        nextReset.setHours(0, 0, 0, 0);

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('daily_packs')
          .update({
            pack_count: 4,
            next_reset_at: nextReset.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (!updateError && updated) {
          currentDailyPacks = updated;
        }
      }
    }

    if (packsError && packsError.code === 'PGRST116') {
      // Create default daily packs
      const nextReset = new Date();
      nextReset.setDate(nextReset.getDate() + 1);
      nextReset.setHours(0, 0, 0, 0);

      const { data: newPacks, error: createError } = await supabaseAdmin
        .from('daily_packs')
        .insert({
          user_id: user.id,
          pack_count: 4,
          next_reset_at: nextReset.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      currentDailyPacks = newPacks;
    } else if (packsError) {
      throw packsError;
    }

    // Check if user already claimed today
    let finalPackCount = currentDailyPacks?.pack_count || 0;
    if (currentDailyPacks?.last_claimed_at) {
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const lastClaimed = new Date(currentDailyPacks.last_claimed_at);
      
      if (lastClaimed >= todayStart) {
        finalPackCount = 0;
      }
    }

    return NextResponse.json({
      packCount: finalPackCount,
      nextResetAt: currentDailyPacks?.next_reset_at,
    });
  } catch (error: unknown) {
    devLog.error('Get daily packs error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get daily packs') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletValidation.address)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get daily packs
    const { data: dailyPacks, error: packsError } = await supabaseAdmin
      .from('daily_packs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (packsError || !dailyPacks) {
      return NextResponse.json(
        { error: 'Daily packs not found' },
        { status: 404 }
      );
    }

    if (dailyPacks.pack_count <= 0) {
      return NextResponse.json(
        { error: 'No packs available' },
        { status: 400 }
      );
    }

    // Check if user already claimed today
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    if (dailyPacks.last_claimed_at) {
      const lastClaimed = new Date(dailyPacks.last_claimed_at);
      if (lastClaimed >= todayStart) {
        const { updateQuestProgress } = await import('@/app/lib/db/quest-progress');
        try {
          await updateQuestProgress(user.id, 'open_packs', 1, false);
        } catch (questError) {
          devLog.error('[Daily Pack] Error updating quest:', questError);
        }
        
        return NextResponse.json(
          { error: 'You have already claimed your free daily pack today. Please come back tomorrow!' },
          { status: 400 }
        );
      }
    }

    // Decrement pack count
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('daily_packs')
      .update({
        pack_count: dailyPacks.pack_count - 1,
        last_claimed_at: now.toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update quest progress
    devLog.log('[Daily Pack] Updating open_packs quest');
    const { updateQuestProgress } = await import('@/app/lib/db/quest-progress');
    await updateQuestProgress(user.id, 'open_packs', 1, false);

    return NextResponse.json({
      success: true,
      packCount: updated.pack_count,
    });
  } catch (error: unknown) {
    devLog.error('Claim daily pack error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to claim daily pack') },
      { status: 500 }
    );
  }
}

