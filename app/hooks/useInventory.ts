import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getStorageUrl } from '../utils/supabaseStorage';

interface InventoryCard {
  id: string;
  cardTemplate: {
    id: string;
    name: string;
    rarity: string;
    imageUrl: string;
    description: string | null;
  };
  quantity: number;
}

/**
 * Professional inventory hook with automatic NFT sync
 * - Automatically syncs NFT balance from blockchain to database
 * - Fetches inventory from database (which includes synced NFT cards)
 * - No client-side merging needed - everything is in database
 */
export function useInventory() {
  const { address, isConnected } = useAccount();
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Optimized: Fetch inventory first (fast), then sync NFT in background (non-blocking)
   * This ensures UI shows data quickly while sync happens in parallel
   */
  const syncAndFetchInventory = useCallback(async (forceSync: boolean = false) => {
    if (!isConnected || !address) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const totalStartTime = Date.now();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useInventory.ts:42',message:'syncAndFetchInventory start',data:{forceSync,address},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // OPTIMIZATION: Fetch inventory FIRST (fast, non-blocking)
      // This shows data immediately to user
      const inventoryStartTime = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useInventory.ts:50',message:'fetch inventory start (optimized)',data:{address},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch('/api/cards/inventory', {
        headers: {
          'x-wallet-address': address,
        },
      });

      const inventoryEndTime = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useInventory.ts:62',message:'fetch inventory end (optimized)',data:{duration:inventoryEndTime-inventoryStartTime,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();
      const formatStartTime = Date.now();
      const formatted = (data.inventory || []).map((item: any) => ({
        id: item.id,
        cardTemplate: {
          id: item.card_templates?.id || '',
          name: item.card_templates?.name || '',
          rarity: item.card_templates?.rarity || 'common',
          // Convert relative path to full Supabase Storage URL
          imageUrl: item.card_templates?.image_url ? getStorageUrl(item.card_templates.image_url) : '',
          description: item.card_templates?.description || null,
        },
        quantity: item.quantity || 1,
      }));
      const formatEndTime = Date.now();
      
      // Show inventory immediately (fast path)
      setInventory(formatted);
      setError(null);
      setLoading(false);
      
      const totalEndTime = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useInventory.ts:85',message:'inventory displayed (optimized)',data:{totalDuration:totalEndTime-totalStartTime,formatDuration:formatEndTime-formatStartTime,inventoryCount:formatted.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // OPTIMIZATION: Sync NFT in background (non-blocking, parallel)
      // This doesn't block UI - user sees data immediately
      if (forceSync) {
        setIsSyncing(true);
        // Run sync in background without await
        fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: {
            'x-wallet-address': address,
          },
        })
          .then((syncResponse) => {
            if (syncResponse.ok) {
              // Refetch inventory after sync completes to get updated data
              return fetch('/api/cards/inventory', {
                headers: {
                  'x-wallet-address': address,
                },
              });
            }
            return null;
          })
          .then((refreshResponse) => {
            if (refreshResponse?.ok) {
              return refreshResponse.json();
            }
            return null;
          })
          .then((refreshData) => {
            if (refreshData?.inventory) {
              const refreshed = (refreshData.inventory || []).map((item: any) => ({
                id: item.id,
                cardTemplate: {
                  id: item.card_templates?.id || '',
                  name: item.card_templates?.name || '',
                  rarity: item.card_templates?.rarity || 'common',
                  imageUrl: item.card_templates?.image_url ? getStorageUrl(item.card_templates.image_url) : '',
                  description: item.card_templates?.description || null,
                },
                quantity: item.quantity || 1,
              }));
              setInventory(refreshed);
            }
          })
          .catch((syncError) => {
            console.warn('NFT sync error:', syncError);
            // Don't show error to user - inventory already displayed
          })
          .finally(() => {
            setIsSyncing(false);
          });
      }
    } catch (err: any) {
      setError(err.message);
      setInventory([]);
      setLoading(false);
    }
  }, [address, isConnected]);

  // OPTIMIZATION: Initial fetch WITHOUT force sync for faster load
  // Sync will happen in background after data is displayed
  useEffect(() => {
    syncAndFetchInventory(true); // Still sync, but non-blocking now
  }, [syncAndFetchInventory]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (address && isConnected) {
        // Force sync when refresh event is triggered (e.g., after minting)
        syncAndFetchInventory(true);
      }
    };

    window.addEventListener('refresh-quests-inventory', handleRefresh);
    return () => {
      window.removeEventListener('refresh-quests-inventory', handleRefresh);
    };
  }, [address, isConnected, syncAndFetchInventory]);

  return { 
    inventory, 
    loading, 
    error, 
    isSyncing,
    refetch: () => syncAndFetchInventory(true)
  };
}

