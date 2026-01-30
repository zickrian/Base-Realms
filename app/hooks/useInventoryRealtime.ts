"use client";

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseInventoryRealtimeOptions {
  userId: string | null;
  onInventoryChange: () => void;
  enabled?: boolean;
}

/**
 * Hook untuk subscribe ke perubahan user_inventory secara realtime
 * Menggunakan Supabase Realtime untuk auto-update inventory
 */
export function useInventoryRealtime({
  userId,
  onInventoryChange,
  enabled = true,
}: UseInventoryRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onInventoryChange);

  // Update callback ref setiap render untuk mendapat latest callback
  useEffect(() => {
    callbackRef.current = onInventoryChange;
  }, [onInventoryChange]);

  const subscribe = useCallback(() => {
    if (!userId || !enabled) {
      return;
    }

    // Cleanup existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `inventory-${userId}`;
    console.log(`[Realtime] Subscribing to ${channelName}...`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_inventory',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Inventory change detected:', payload.eventType);
          // Call the callback to refresh inventory
          callbackRef.current();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] ⚠️ Failed to subscribe to ${channelName} - Realtime disabled, falling back to manual refresh`);
          // Don't throw error, just log warning - app will work without realtime
        }
      });

    channelRef.current = channel;
  }, [userId, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('[Realtime] Unsubscribing from inventory channel...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Subscribe when userId changes or enabled changes
  useEffect(() => {
    if (userId && enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [userId, enabled, subscribe, unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed: channelRef.current !== null,
  };
}
