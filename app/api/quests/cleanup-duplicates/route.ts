import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

/**
 * Cleanup duplicate daily quests for a user
 * This endpoint removes duplicate quests and keeps only the most recent one per quest_type per day
 * Should be called if user has duplicate quests showing up
 */
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

    // Get today's start in UTC
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Get all daily quests for today
    const { data: todayQuests } = await supabaseAdmin
      .from('user_quests')
      .select(`
        id,
        quest_template_id,
        status,
        started_at,
        quest_templates!inner(quest_type, is_daily)
      `)
      .eq('user_id', user.id)
      .eq('quest_templates.is_daily', true)
      .gte('expires_at', todayStart.toISOString())
      .order('started_at', { ascending: false });

    if (!todayQuests || todayQuests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No quests found for today',
        duplicatesRemoved: 0,
      });
    }

    // Group by quest_template_id to find duplicates
    const questsByTemplate = new Map<string, typeof todayQuests>();
    
    for (const quest of todayQuests) {
      const templateId = quest.quest_template_id;
      if (!questsByTemplate.has(templateId)) {
        questsByTemplate.set(templateId, []);
      }
      questsByTemplate.get(templateId)!.push(quest);
    }

    // Find and remove duplicates
    let duplicatesRemoved = 0;
    const questsToDelete: string[] = [];

    for (const [, quests] of questsByTemplate) {
      if (quests.length > 1) {
        // Keep the most recent one (first in array due to order by started_at desc)
        // Delete the rest
        const [keep, ...remove] = quests;
        
        // Prefer to keep claimed > completed > active
        const sortedByStatus = [...quests].sort((a, b) => {
          const statusOrder = { claimed: 0, completed: 1, active: 2 };
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        });
        
        const toKeep = sortedByStatus[0];
        const toRemove = quests.filter(q => q.id !== toKeep.id);
        
        questsToDelete.push(...toRemove.map(q => q.id));
        duplicatesRemoved += toRemove.length;
      }
    }

    // Delete duplicates
    if (questsToDelete.length > 0) {
      await supabaseAdmin
        .from('user_quests')
        .delete()
        .in('id', questsToDelete);
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Removed ${duplicatesRemoved} duplicate quests.`,
      duplicatesRemoved,
    });
  } catch (error: unknown) {
    console.error('Cleanup duplicates error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cleanup duplicates';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
