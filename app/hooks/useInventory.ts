import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getStorageUrl, getGameIconUrl } from '../utils/supabaseStorage';
import { useNFTBalance } from './useNFTBalance';

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

export function useInventory() {
  const { address, isConnected } = useAccount();
  const { hasNFT, balance: nftBalance, isLoading: nftLoading } = useNFTBalance();
  const [dbInventory, setDbInventory] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setDbInventory([]);
      setLoading(false);
      return;
    }

    const fetchInventory = async () => {
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
        
        setDbInventory(formatted);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setDbInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [address, isConnected]);

  // Combine database inventory with NFT card using useMemo
  const inventory = useMemo(() => {
    // Add NFT card if user has NFT from the contract
    const nftCard: InventoryCard | null = hasNFT ? {
      id: 'nft-blockchain-card',
      cardTemplate: {
        id: 'nft-blockchain-template',
        name: 'Common Card',
        rarity: 'common',
        imageUrl: getGameIconUrl('commoncards.png'),
        description: 'NFT card from blockchain',
      },
      quantity: nftBalance,
    } : null;
    
    // Combine database inventory with NFT card
    return nftCard 
      ? [...dbInventory, nftCard]
      : dbInventory;
  }, [dbInventory, hasNFT, nftBalance]);

  // Combine loading states
  const combinedLoading = loading || nftLoading;

  return { inventory, loading: combinedLoading, error, refetch: () => {
    if (address && isConnected) {
      const fetchInventory = async () => {
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
          
          setDbInventory(formatted);
          setError(null);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchInventory();
    }
  } };
}

