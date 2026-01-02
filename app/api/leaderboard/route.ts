import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  level: number;
  wins: number;
  totalBattles: number;
  winRate: number;
}

interface LeaderboardEntryWithoutRank {
  walletAddress: string;
  level: number;
  wins: number;
  totalBattles: number;
  winRate: number;
}

interface ProfileRow {
  user_id: string;
  level: number;
  wins: number;
  total_battles: number;
}

interface UserRow {
  id: string;
  wallet_address: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'level';

    // Get all player profiles with user wallet addresses
    // First get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('player_profiles')
      .select('user_id, level, wins, total_battles');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        leaderboard: [],
      });
    }

    // Get user wallet addresses for each profile
    const typedProfiles = profiles as ProfileRow[];
    const userIds = typedProfiles.map((p) => p.user_id);
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Create a map of user_id to wallet_address
    const userMap = new Map<string, string>();
    if (users) {
      const typedUsers = users as UserRow[];
      typedUsers.forEach((user) => {
        userMap.set(user.id, user.wallet_address);
      });
    }

    // Transform data and calculate win rate
    const leaderboard: LeaderboardEntryWithoutRank[] = typedProfiles
      .map((profile) => {
        const totalBattles = profile.total_battles || 0;
        const wins = profile.wins || 0;
        const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
        const walletAddress = userMap.get(profile.user_id);

        if (!walletAddress) {
          return null; // Skip profiles without wallet address
        }

        return {
          walletAddress: walletAddress,
          level: profile.level || 1,
          wins: wins,
          totalBattles: totalBattles,
          winRate: winRate,
        };
      })
      .filter((entry): entry is LeaderboardEntryWithoutRank => {
        if (!entry) return false;
        // Filter out entries with no activity
        if (sortBy === 'level') return entry.level > 0;
        if (sortBy === 'wins') return entry.wins > 0;
        if (sortBy === 'winRate') return entry.totalBattles > 0;
        return true;
      });

    // Sort based on sortBy parameter
    leaderboard.sort((a, b) => {
      if (sortBy === 'level') {
        // Sort by level (descending), then by wins, then by total battles
        if (b.level !== a.level) return b.level - a.level;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalBattles - a.totalBattles;
      } else if (sortBy === 'wins') {
        // Sort by wins (descending), then by level, then by win rate
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.level !== a.level) return b.level - a.level;
        return b.winRate - a.winRate;
      } else if (sortBy === 'winRate') {
        // Sort by win rate (descending), then by wins, then by level
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.level - a.level;
      }
      return 0;
    });

    // Limit to top 100 and add rank
    const leaderboardWithRank: LeaderboardEntry[] = leaderboard
      .slice(0, 100)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return NextResponse.json({
      leaderboard: leaderboardWithRank,
    });
  } catch (error: unknown) {
    console.error('Leaderboard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
