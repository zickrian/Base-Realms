import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    const currentOnly = request.nextUrl.searchParams.get('current') === 'true';

    if (currentOnly && walletAddress) {
      // Get current stage for user
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (!userError && user) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('player_profiles')
          .select(`
            current_stage_id,
            stages(*)
          `)
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile?.stages) {
          return NextResponse.json({ stage: profile.stages });
        }
      }
    }

    // Get all stages
    const { data: stages, error } = await supabaseAdmin
      .from('stages')
      .select('*')
      .order('stage_number', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ stages: stages || [] });
  } catch (error: unknown) {
    console.error('Get stages error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get stages';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

