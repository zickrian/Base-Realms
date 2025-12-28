import { useState, useEffect } from 'react';
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

export function useInventory() {
  const { address, isConnected } = useAccount();
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setInventory([]);
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
        const formatted = data.inventory.map((item: any) => ({
          id: item.id,
          cardTemplate: {
            id: item.card_templates.id,
            name: item.card_templates.name,
            rarity: item.card_templates.rarity,
            imageUrl: item.card_templates.image_url,
            description: item.card_templates.description,
          },
          quantity: item.quantity,
        }));
        setInventory(formatted);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [address, isConnected]);

  return { inventory, loading, error, refetch: () => {
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
          const formatted = data.inventory.map((item: any) => ({
            id: item.id,
            cardTemplate: {
              id: item.card_templates.id,
              name: item.card_templates.name,
              rarity: item.card_templates.rarity,
              imageUrl: item.card_templates.image_url,
              description: item.card_templates.description,
            },
            quantity: item.quantity,
          }));
          setInventory(formatted);
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

