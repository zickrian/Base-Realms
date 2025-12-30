import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

interface QuestData {
  id: string;
  current_progress: number;
  max_progress: number;
  status: string;
  quest_templates: {
    title: string;
    description: string;
    quest_type: string;
    reward_xp: number;
  };
}

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
    // Query is optimized with indexes on user_id, status, and expires_at
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
      .order('started_at', { ascending: false })
      .limit(20); // Limit to prevent excessive data (daily quests are typically 4-5)

    if (questsError) {
      throw questsError;
    }

    // Format quests for frontend
    // Note: Supabase returns quest_templates as an object (not array) when using !inner
    const formattedQuests = (quests || []).map((quest: unknown) => {
      const q = quest as QuestData;
      const template = Array.isArray(q.quest_templates) ? q.quest_templates[0] : q.quest_templates;
      return {
        id: q.id,
        title: template?.title || '',
        description: template?.description || '',
        currentProgress: q.current_progress,
        maxProgress: q.max_progress,
        reward: template?.reward_xp 
          ? `${template.reward_xp} XP`
          : '',
        status: q.status,
        questType: template?.quest_type || '',
      };
    });

    return NextResponse.json({ quests: formattedQuests });
  } catch (error: unknown) {
    console.error('Get quests error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get quests';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

