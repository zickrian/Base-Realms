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
    devLog.error('Get settings error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get settings') },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { soundVolume, notificationsEnabled } = body;
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
    devLog.error('Update settings error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to update settings') },
      { status: 500 }
    );
  }
}

