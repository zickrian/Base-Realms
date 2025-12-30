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

interface PackApiResponse {
  id: string;
  name: string;
  rarity: string;
  price_idrx: string | number;
  price_eth: string | number;
  image_url: string;
  description: string;
  is_active: boolean;
}

// Cache for packs (static data, can be cached)
let packsCache: CardPack[] | null = null;
let packsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCardPacks() {
  const [packs, setPacks] = useState<CardPack[]>(packsCache || []);
  const [loading, setLoading] = useState(!packsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use cache if available and not expired
    const now = Date.now();
    if (packsCache && (now - packsCacheTime) < CACHE_DURATION) {
      setPacks(packsCache);
      setLoading(false);
      return;
    }

    const fetchPacks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cards/packs', {
          cache: 'force-cache',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch card packs');
        }

        const data = await response.json();
        const formatted = (data.packs || []).map((pack: PackApiResponse) => ({
          id: pack.id,
          name: pack.name || '',
          rarity: pack.rarity || 'common',
          priceIdrx: parseFloat(String(pack.price_idrx || 0)),
          priceEth: parseFloat(String(pack.price_eth || 0)),
          imageUrl: pack.image_url ? getStorageUrl(pack.image_url) : '',
          description: pack.description || '',
          isActive: pack.is_active !== false,
        }));
        
        packsCache = formatted;
        packsCacheTime = now;
        
        setPacks(formatted);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setPacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  return { packs, loading, error };
}

