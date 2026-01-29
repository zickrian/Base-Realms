import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

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
  
  // Guard untuk mencegah multiple sync bersamaan
  const syncInProgressRef = useRef(false);
  const lastSyncedAddressRef = useRef<string | null>(null);
  const syncFnRef = useRef<((forceSync?: boolean, skipBlockchainSync?: boolean) => Promise<void>) | null>(null);
  const initializedAddressRef = useRef<string | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncAndFetchInventory = useCallback(async (forceSync: boolean = false, skipBlockchainSync: boolean = false) => {
    if (!isConnected || !address) {
      setInventory([]);
      setLoading(false);
      return;
    }

    // Prevent multiple syncs at the same time
    if (forceSync && syncInProgressRef.current) {
      console.log('[useInventory] Sync already in progress, skipping...');
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
          imageUrl: item.card_templates?.image_url || '',
          description: item.card_templates?.description || null,
        },
        quantity: item.quantity || 1,
      }));
      
      setInventory(formatted);
      setError(null);
      setLoading(false);
      
      // OPTIMIZATION: Skip blockchain sync if skipBlockchainSync is true
      // This is useful for database-minted cards (freebox) that don't need blockchain verification
      if (forceSync && !skipBlockchainSync) {
        // Skip sync if already synced for this address recently
        if (lastSyncedAddressRef.current === address && syncInProgressRef.current) {
          console.log('[useInventory] Already syncing for this address, skipping...');
          return;
        }

        // OPTIMIZATION: Reduce cooldown from 3s to 1s for better UX
        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTimeRef.current;
        if (lastSyncedAddressRef.current === address && timeSinceLastSync < 1000) {
          console.log('[useInventory] Sync cooldown active (1s), skipping...');
          return;
        }

        syncInProgressRef.current = true;
        lastSyncedAddressRef.current = address;
        setIsSyncing(true);
        
        console.log('[useInventory] Starting NFT blockchain sync...');
        fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: {
            'x-wallet-address': address,
          },
        })
          .then(async (syncResponse) => {
            if (syncResponse.ok) {
              // Add delay to ensure blockchain state is settled
              await new Promise(resolve => setTimeout(resolve, 1500));
              
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
                  imageUrl: item.card_templates?.image_url || '',
                  description: item.card_templates?.description || null,
                },
                quantity: item.quantity || 1,
              }));
              setInventory(refreshed);
              console.log('[useInventory] Inventory synced and refreshed successfully:', refreshed.length, 'cards');
            }
          })
          .catch((syncError) => {
            console.warn('[useInventory] NFT sync error:', syncError);
          })
          .finally(() => {
            setIsSyncing(false);
            syncInProgressRef.current = false;
            lastSyncTimeRef.current = Date.now(); // Update waktu sync terakhir
          });
      } else if (forceSync && skipBlockchainSync) {
        console.log('[useInventory] ⚡ Fast refresh: Skipping blockchain sync (database mint detected)');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setInventory([]);
      setLoading(false);
      syncInProgressRef.current = false;
    }
  }, [address, isConnected]);

  // Simpan function terbaru ke ref untuk digunakan di useEffect
  syncFnRef.current = syncAndFetchInventory;

  // FIX: Hanya sync sekali saat address pertama kali connect atau berubah
  useEffect(() => {
    // Clear timeout yang lama jika ada
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (address && isConnected) {
      // Hanya sync jika address berbeda dari yang sudah di-initialize
      const addressChanged = initializedAddressRef.current !== address && initializedAddressRef.current !== null;
      const neverInitialized = initializedAddressRef.current === null;
      
      // Hanya sync jika address berubah atau belum pernah di-initialize
      const shouldSync = addressChanged || neverInitialized;

      // Fetch inventory tanpa sync dulu untuk load cepat (hanya sekali saat address baru)
      if (neverInitialized) {
        syncFnRef.current?.(false);
      }
      
      // Hanya sync jika address berubah atau belum pernah di-initialize
      // JANGAN sync lagi setelah sudah di-initialize untuk address yang sama
      if (shouldSync && !syncInProgressRef.current) {
        // Set flag dulu untuk mencegah multiple sync
        initializedAddressRef.current = address;
        
        syncTimeoutRef.current = setTimeout(() => {
          // Double check bahwa masih connected dan address masih sama sebelum sync
          if (address && isConnected && address === initializedAddressRef.current && !syncInProgressRef.current && syncFnRef.current) {
            lastSyncTimeRef.current = Date.now();
            syncFnRef.current(true);
          }
          syncTimeoutRef.current = null;
        }, 2000); // Delay 2 detik untuk mencegah sync terlalu cepat
      }
      
      return () => {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
      };
    } else {
      setInventory([]);
      setLoading(false);
      // Reset sync state ketika disconnect
      syncInProgressRef.current = false;
      lastSyncedAddressRef.current = null;
      initializedAddressRef.current = null;
      lastSyncTimeRef.current = 0;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }
  }, [address, isConnected]); // Hanya depend pada address dan isConnected

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = (event?: CustomEvent) => {
      if (address && isConnected && !syncInProgressRef.current && syncFnRef.current) {
        // OPTIMIZATION: Check if event has skipBlockchainSync flag
        const skipBlockchainSync = event?.detail?.skipBlockchainSync || false;
        console.log('[useInventory] Refresh event received, skipBlockchainSync:', skipBlockchainSync);
        // Force sync when refresh event is triggered (e.g., after minting)
        syncFnRef.current(true, skipBlockchainSync);
      }
    };

    window.addEventListener('refresh-quests-inventory', handleRefresh as EventListener);
    return () => {
      window.removeEventListener('refresh-quests-inventory', handleRefresh as EventListener);
    };
  }, [address, isConnected]); // Hanya depend pada address dan isConnected

  return { 
    inventory, 
    loading, 
    error, 
    isSyncing,
    refetch: (skipBlockchainSync?: boolean) => syncAndFetchInventory(true, skipBlockchainSync)
  };
}

