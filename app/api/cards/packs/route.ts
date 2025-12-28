import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET() {
  try {
    const { data: packs, error } = await supabaseAdmin
      .from('card_packs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ packs: packs || [] });
  } catch (error: any) {
    console.error('Get card packs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get card packs' },
      { status: 500 }
    );
  }
}

