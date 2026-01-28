import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";
import { devLog, sanitizeErrorMessage } from '@/app/lib/validation';

const client = createClient();

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }

  try {
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });

    const userFid = payload.sub;

    return NextResponse.json({ userFid });
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    devLog.error('Auth verification error:', e);
    return NextResponse.json(
      { message: sanitizeErrorMessage(e, 'Authentication failed') },
      { status: 500 }
    );
  }
}

function getUrlHost(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch {
      devLog.warn("Invalid origin header:", origin);
    }
  }

  const host = request.headers.get("host");
  if (host) {
    return host;
  }

  let urlValue: string;
  if (process.env.VERCEL_ENV === "production") {
    urlValue = process.env.NEXT_PUBLIC_URL!;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "http://localhost:3000";
  }

  const url = new URL(urlValue);
  return url.host;
}
