import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      packCount: currentDailyPacks?.pack_count || 0,
      nextResetAt: currentDailyPacks?.next_reset_at,
    });
  } catch (error: unknown) {
    console.error('Get daily packs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get daily packs';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

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

    // Decrement pack count
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('daily_packs')
      .update({
        pack_count: dailyPacks.pack_count - 1,
        last_claimed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update quest progress for "open_packs" quest (NO auto-claim)
    // User must manually claim the quest to get XP - XP will only enter progress bar after claim
    const { updateQuestProgress } = await import('@/app/lib/db/quest-progress');
    await updateQuestProgress(user.id, 'open_packs', 1, false);

    return NextResponse.json({
      success: true,
      packCount: updated.pack_count,
    });
  } catch (error: unknown) {
    console.error('Claim daily pack error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to claim daily pack';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

