"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Minimal component that only calls sdk.actions.ready().
 * Mounted first in layout so it runs as soon as any client code runs.
 */
export function CallReady() {
  useEffect(() => {
    void sdk.actions.ready();
  }, []);
  return null;
}
