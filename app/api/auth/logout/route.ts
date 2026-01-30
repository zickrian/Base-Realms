import { NextResponse } from 'next/server';

export async function POST() {
  // Logout is handled client-side by disconnecting wallet
  // This endpoint can be used for server-side cleanup if needed
  return NextResponse.json({ success: true });
}

