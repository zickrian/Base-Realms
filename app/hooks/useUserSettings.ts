import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface UserSettings {
  soundVolume: number;
  notificationsEnabled: boolean;
}

export function useUserSettings() {
  const { address, isConnected } = useAccount();
  const [settings, setSettings] = useState<UserSettings | null>(() => {
    if (typeof window === 'undefined') return null;
    const cachedVolume = sessionStorage.getItem('userSoundVolume');
    const cachedNotifications = sessionStorage.getItem('userNotificationsEnabled');
    if (cachedVolume === null && cachedNotifications === null) return null;
    return {
      soundVolume: cachedVolume ? Number(cachedVolume) : 0,
      notificationsEnabled: cachedNotifications ? cachedNotifications === 'true' : true,
    };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/settings', {
          headers: {
            'x-wallet-address': address,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        const nextSettings = {
          soundVolume: data.settings.sound_volume,
          notificationsEnabled: data.settings.notifications_enabled,
        };
        setSettings(nextSettings);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('userSoundVolume', String(nextSettings.soundVolume));
          sessionStorage.setItem('userNotificationsEnabled', String(nextSettings.notificationsEnabled));
        }
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [address, isConnected]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!address || !isConnected) return;

    try {
      const updateData: Record<string, number | boolean> = {};
      if (updates.soundVolume !== undefined) {
        updateData.soundVolume = updates.soundVolume;
      }
      if (updates.notificationsEnabled !== undefined) {
        updateData.notificationsEnabled = updates.notificationsEnabled;
      }

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      const nextSettings = {
        soundVolume: data.settings.sound_volume,
        notificationsEnabled: data.settings.notifications_enabled,
      };
      setSettings(nextSettings);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userSoundVolume', String(nextSettings.soundVolume));
        sessionStorage.setItem('userNotificationsEnabled', String(nextSettings.notificationsEnabled));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings };
}

