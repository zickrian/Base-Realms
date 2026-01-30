"use client";

import { useMemo, useState, useEffect } from "react";
import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

/** Location type from Farcaster MiniApp context */
type LocationType =
  | "cast_embed"
  | "cast_share"
  | "notification"
  | "launcher"
  | "channel"
  | "open_miniapp";

type LocationContext = {
  type: LocationType;
  referrerDomain?: string;
};

/**
 * Detects app context: Mini App (Farcaster or Base App) using OnchainKit + Farcaster SDK.
 * Use this instead of raw window.self !== window.top for balance/auth logic.
 */
export function useAppContext() {
  const { isInMiniApp } = useIsInMiniApp();
  const { context } = useMiniKit();

  // Fallback: if SDK context not ready yet, use iframe check (e.g. SSR or slow load)
  const [iframeFallback, setIframeFallback] = useState(false);
  useEffect(() => {
    setIframeFallback(typeof window !== "undefined" && window.self !== window.top);
  }, []);

  const isInMiniAppResolved = isInMiniApp === true || (isInMiniApp !== false && iframeFallback);

  const location = context?.location as LocationContext | undefined;
  const referrerDomain = location?.referrerDomain?.toLowerCase() ?? "";

  const isBaseApp = useMemo(() => {
    if (!isInMiniAppResolved) return false;
    // open_miniapp with Base-related referrer
    if (location?.type === "open_miniapp") {
      return (
        referrerDomain.includes("base.org") ||
        referrerDomain.includes("baseapp") ||
        referrerDomain.includes("coinbase")
      );
    }
    // launcher can be Base or Farcaster; no referrerDomain
    return false;
  }, [isInMiniAppResolved, location?.type, referrerDomain]);

  const isFarcaster = useMemo(() => {
    if (!isInMiniAppResolved) return false;
    if (isBaseApp) return false;
    // cast_embed, cast_share, channel, or open_miniapp from warpcast etc.
    if (location?.type === "cast_embed" || location?.type === "cast_share" || location?.type === "channel") {
      return true;
    }
    if (location?.type === "open_miniapp") {
      return (
        referrerDomain.includes("warpcast") ||
        referrerDomain.includes("farcaster") ||
        referrerDomain.includes("supercast")
      );
    }
    return true; // launcher or unknown → treat as Farcaster for safety
  }, [isInMiniAppResolved, isBaseApp, location?.type, referrerDomain]);

  return {
    /** True when running inside a Mini App (Base or Farcaster) */
    isInMiniApp: !!isInMiniAppResolved,
    /** True when context indicates Base App (e.g. open_miniapp from base.org) */
    isBaseApp,
    /** True when context indicates Farcaster (Warpcast, etc.) */
    isFarcaster,
    /** Raw location type from Farcaster SDK */
    locationType: location?.type,
    /** Referrer domain when opened via open_miniapp */
    referrerDomain: referrerDomain || undefined,
  };
}
