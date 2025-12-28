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
   * Sync NFT from blockchain to database, then fetch inventory
   * This ensures NFT cards are always up-to-date in the database
   */
  const syncAndFetchInventory = useCallback(async (forceSync: boolean = false) => {
    if (!isConnected || !address) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, sync NFT from blockchain to database
      // This ensures the database has the latest NFT balance
      if (forceSync) {
        setIsSyncing(true);
        try {
          const syncResponse = await fetch('/api/cards/sync-nft', {
            method: 'POST',
            headers: {
              'x-wallet-address': address,
            },
          });

          if (!syncResponse.ok) {
            console.warn('NFT sync failed, continuing with existing inventory');
          }
        } catch (syncError) {
          console.warn('NFT sync error:', syncError);
          // Continue even if sync fails - we'll still fetch existing inventory
        } finally {
          setIsSyncing(false);
        }
      }

      // Then fetch inventory from database (which includes synced NFT cards)
      const response = await fetch('/api/cards/inventory', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();
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
      
      setInventory(formatted);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Initial fetch with sync on mount
  useEffect(() => {
    syncAndFetchInventory(true);
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

