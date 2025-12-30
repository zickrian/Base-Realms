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

    // Get settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      // Create default settings if not exists
      const { data: newSettings, error: createError } = await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: user.id,
          sound_volume: 50,
          notifications_enabled: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({ settings: newSettings });
    }

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error('Get settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get settings';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { soundVolume, notificationsEnabled } = await request.json();
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

    // Build update object
    const updateData: Record<string, number | boolean> = {};
    if (soundVolume !== undefined) {
      if (soundVolume < 0 || soundVolume > 100) {
        return NextResponse.json(
          { error: 'Sound volume must be between 0 and 100' },
          { status: 400 }
        );
      }
      updateData.sound_volume = soundVolume;
    }
    if (notificationsEnabled !== undefined) {
      updateData.notifications_enabled = notificationsEnabled;
    }

    // Update settings
    const { data: settings, error: updateError } = await supabaseAdmin
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error('Update settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

