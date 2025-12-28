import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface UserSettings {
  soundVolume: number;
  notificationsEnabled: boolean;
}

export function useUserSettings() {
  const { address, isConnected } = useAccount();
  const [settings, setSettings] = useState<UserSettings | null>(null);
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
        setSettings({
          soundVolume: data.settings.sound_volume,
          notificationsEnabled: data.settings.notifications_enabled,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
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
      const updateData: any = {};
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
      setSettings({
        soundVolume: data.settings.sound_volume,
        notificationsEnabled: data.settings.notifications_enabled,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings };
}

