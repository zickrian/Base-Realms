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

interface InventoryApiItem {
  id: string;
  quantity: number;
  card_templates?: {
    id: string;
    name: string;
    rarity: string;
    image_url: string;
    description: string | null;
  };
}

/**
 * Professional inventory hook with automatic NFT sync
 */
export function useInventory() {
  const { address, isConnected } = useAccount();
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAndFetchInventory = useCallback(async (forceSync: boolean = false) => {
    if (!isConnected || !address) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/cards/inventory', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();
      const formatted = (data.inventory || []).map((item: InventoryApiItem) => ({
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
      
      setInventory(formatted);
      setError(null);
      setLoading(false);
      
      if (forceSync) {
        setIsSyncing(true);
        fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: {
            'x-wallet-address': address,
          },
        })
          .then((syncResponse) => {
            if (syncResponse.ok) {
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
              const refreshed = (refreshData.inventory || []).map((item: InventoryApiItem) => ({
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
          })
          .finally(() => {
            setIsSyncing(false);
          });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
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

