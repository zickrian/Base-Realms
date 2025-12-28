import { useState, useEffect } from 'react';
import { getStorageUrl } from '../utils/supabaseStorage';

interface CardPack {
  id: string;
  name: string;
  rarity: string;
  priceIdrx: number;
  priceEth: number;
  imageUrl: string;
  description: string;
  isActive: boolean;
}

export function useCardPacks() {
  const [packs, setPacks] = useState<CardPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cards/packs');

        if (!response.ok) {
          throw new Error('Failed to fetch card packs');
        }

        const data = await response.json();
        const formatted = data.packs.map((pack: any) => ({
          id: pack.id,
          name: pack.name,
          rarity: pack.rarity,
          priceIdrx: parseFloat(pack.price_idrx),
          priceEth: parseFloat(pack.price_eth),
          // Convert relative path to full Supabase Storage URL
          imageUrl: getStorageUrl(pack.image_url),
          description: pack.description,
          isActive: pack.is_active,
        }));
        setPacks(formatted);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setPacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  return { packs, loading, error };
}

