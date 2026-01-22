import { useEffect, useRef } from 'react';
import { useUserSettings } from './useUserSettings';

/**
 * Hook untuk play walk sound effect saat karakter jalan
 * - Play walk.mp3 dari public/sound/walk.mp3
 * - Loop selama karakter jalan
 * - Stop saat karakter tidak jalan
 * - Volume dikontrol oleh sound volume setting
 */
export function useWalkSound(isMoving: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useUserSettings();

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      const audio = new Audio();
      // File di public/sound/walk.mp3
      audio.src = '/sound/walk.mp3';
      audio.loop = true;
      audio.preload = 'auto';
      
      // Set initial volume from settings
      const initialVolume = settings ? settings.soundVolume / 100 : 0;
      audio.volume = initialVolume;
      
      // Handle errors
      audio.addEventListener('error', (e) => {
        console.error('Failed to load walk sound:', e);
      });
      
      audioRef.current = audio;
    }

    // Play or stop based on isMoving
    if (isMoving) {
      // Play walk sound when moving
      if (audioRef.current.paused) {
        audioRef.current.play().catch((error) => {
          console.warn('Failed to play walk sound:', error);
        });
      }
    } else {
      // Stop walk sound when not moving
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // Reset to start
      }
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isMoving, settings]);

  // Update volume when settings change (real-time)
  useEffect(() => {
    if (audioRef.current && settings) {
      const newVolume = settings.soundVolume / 100;
      audioRef.current.volume = newVolume;
    }
  }, [settings]);

  // Listen for real-time volume changes from settings menu (before database save)
  useEffect(() => {
    const handleVolumeChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      if (audioRef.current) {
        const newVolume = customEvent.detail / 100;
        audioRef.current.volume = newVolume;
      }
    };

    window.addEventListener('volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('volume-change', handleVolumeChange);
    };
  }, []);
}
