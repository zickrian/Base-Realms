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

    // Get active quests - select only needed fields for better performance
    const { data: quests, error: questsError } = await supabaseAdmin
      .from('user_quests')
      .select(`
        id,
        current_progress,
        max_progress,
        status,
        quest_templates!inner(
          title,
          description,
          quest_type,
          reward_xp
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'completed'])
      .order('started_at', { ascending: false });

    if (questsError) {
      throw questsError;
    }

    // Format quests for frontend
    const formattedQuests = (quests || []).map((quest: any) => ({
      id: quest.id,
      title: quest.quest_templates.title,
      description: quest.quest_templates.description,
      currentProgress: quest.current_progress,
      maxProgress: quest.max_progress,
      reward: quest.quest_templates.reward_xp 
        ? `${quest.quest_templates.reward_xp} XP`
        : '',
      status: quest.status,
      questType: quest.quest_templates.quest_type,
    }));

    return NextResponse.json({ quests: formattedQuests });
  } catch (error: any) {
    console.error('Get quests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quests' },
      { status: 500 }
    );
  }
}

