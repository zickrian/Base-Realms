import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { validateWalletHeader, sanitizeErrorMessage, devLog } from '@/app/lib/validation';
import { createCacheHeaders } from '@/app/lib/cache-policy';

/**
 * Generate dynamic Open Graph metadata for user-specific previews
 * Supports both wallet address and FID-based lookups
 * 
 * Usage: /api/og-metadata?wallet=0x123... or ?fid=123456
 * 
 * @example
 * fetch('/api/og-metadata?wallet=0xABC...')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletParam = searchParams.get('wallet');
    const fidParam = searchParams.get('fid');

    if (!walletParam && !fidParam) {
      return NextResponse.json(
        { error: 'Either wallet or fid parameter is required' },
        { status: 400 }
      );
    }

    let userId: string | null = null;

    // Find user by wallet or FID
    if (walletParam) {
      const walletValidation = validateWalletHeader(walletParam);
      if (!walletValidation.isValid) {
        return NextResponse.json(
          { error: walletValidation.error },
          { status: 400 }
        );
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('wallet_address', walletValidation.address)
        .single();

      userId = user?.id || null;
    } else if (fidParam) {
      // Future: Add FID lookup if you store FIDs in users table
      // For now, return default metadata
      devLog.info(`FID lookup not yet implemented: ${fidParam}`);
    }

    // Get user stats if user exists
    let metadata = {
      title: 'Base Realms - Card Battle Game',
      description: 'Play Base Realms on Base App',
      imageUrl: `${getBaseUrl(request)}/hero.png`,
    };

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('player_profiles')
        .select('level, wins, total_battles')
        .eq('user_id', userId)
        .single();

      if (profile) {
        metadata = {
          title: `Base Realms - Level ${profile.level} Player`,
          description: `${profile.wins} wins out of ${profile.total_battles} battles. Join the game!`,
          imageUrl: `${getBaseUrl(request)}/hero.png`, // Can be dynamic OG image
        };
      }
    }

    return NextResponse.json(metadata, {
      headers: createCacheHeaders('public-short'), // Cache for 60s
    });
  } catch (error: unknown) {
    devLog.error('OG metadata error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get metadata') },
      { status: 500 }
    );
  }
}

/**
 * Get base URL from request or environment
 */
function getBaseUrl(request: NextRequest): string {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const host = request.headers.get('host');
  if (host) {
    return host.includes('localhost') ? `http://${host}` : `https://${host}`;
  }

  // Fallback to environment
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
