import { useEffect, useRef, useState, useMemo } from 'react';
import { useUserSettings } from './useUserSettings';

/**
 * Hook untuk play background music di home page
 * - Play music.mp3 dari public/sound/music.mp3
 * - Volume dikontrol oleh sound volume setting
 * - Loop sound secara otomatis
 * - Stop saat unmount atau settings berubah
 * - Handle autoplay restrictions dengan user interaction
 */
export function useAmbientSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useUserSettings();
  const [userInteracted, setUserInteracted] = useState(false);

  // Helper function to safely update volume
  const updateAudioVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
    }
  };

  // Track user interaction untuk handle autoplay restrictions
  useEffect(() => {
    if (!enabled) return;

    const handleUserInteraction = () => {
      setUserInteracted(true);
      // Try to play audio if it exists and user just interacted
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch((error) => {
          console.warn('Failed to play audio after user interaction:', error);
        });
      }
    };

    // Listen for any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [enabled]);

  // Create audio element ONCE - with stable dependencies
  useEffect(() => {
    if (!enabled) {
      // Cleanup existing audio if disabled
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      return;
    }

    // Don't create if already exists
    if (audioRef.current) {
      return;
    }

    const audio = new Audio();
    audio.src = '/sound/music.mp3';
    audio.loop = true;
    audio.preload = 'auto';

    // Set initial volume from settings (with default 50 if not loaded yet)
    const initialVolume = (settings?.soundVolume ?? 0) / 100;
    audio.volume = initialVolume;

    // Handle audio load
    const handleCanPlay = async () => {
      if (userInteracted) {
        try {
          await audio.play();
        } catch (error) {
          console.warn('Autoplay prevented, will play on user interaction:', error);
        }
      }
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    
    const handleError = (error: Event) => {
      console.error('Failed to load ambient sound:', error);
    };
    audio.addEventListener('error', handleError);

    try {
      audio.load();
    } catch (error) {
      console.error('Error loading audio:', error);
    }

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [enabled, userInteracted]);

  // Memoize sound volume to provide stable dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const soundVolume = useMemo(() => settings?.soundVolume ?? 0, [settings?.soundVolume]);

  // Update volume when settings.soundVolume specifically changes
  // This is a separate effect so volume updates don't trigger audio recreation
  useEffect(() => {
    updateAudioVolume(soundVolume);
  }, [soundVolume]);

  // Listen for real-time volume changes from settings menu (before database save)
  // Uses custom event dispatched by SettingsMenu component
  useEffect(() => {
    const handleVolumeChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      updateAudioVolume(customEvent.detail);
    };

    window.addEventListener('volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('volume-change', handleVolumeChange);
    };
  }, []);

  // Try to play when user interacts
  useEffect(() => {
    if (userInteracted && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch((error) => {
        console.warn('Failed to play audio:', error);
      });
    }
  }, [userInteracted]);

  return audioRef.current;
}
