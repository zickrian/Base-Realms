import { useEffect, useRef, useState } from 'react';
import { useUserSettings } from './useUserSettings';
import { getStorageUrl } from '../utils/supabaseStorage';

/**
 * Hook untuk play ambient sound di home page
 * - Play sound dari Supabase Storage: public/sound/ambient.ogg
 * - Volume dikontrol oleh sound volume setting
 * - Loop sound secara otomatis
 * - Stop saat unmount atau settings berubah
 * - Handle autoplay restrictions dengan user interaction
 */
export function useAmbientSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useUserSettings();
  const [userInteracted, setUserInteracted] = useState(false);

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

  // Create and manage audio element
  useEffect(() => {
    // Only create audio if enabled
    if (!enabled) {
      // Cleanup existing audio if disabled
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      return;
    }

    // Create audio element
    const audio = new Audio();
    // Sound file path: sound/Ambient.ogg in Supabase Storage
    // File is in bucket "assets" at path "sound/Ambient.ogg" (case-sensitive!)
    const soundUrl = getStorageUrl('sound/Ambient.ogg');
    console.log('Ambient sound URL:', soundUrl); // Debug: verify URL
    audio.src = soundUrl;
    audio.loop = true;
    audio.preload = 'auto';

    // Set initial volume from settings
    const initialVolume = settings ? settings.soundVolume / 100 : 0.5;
    audio.volume = initialVolume;

    // Handle audio load
    const handleCanPlay = async () => {
      // Only try to play if user has interacted (to avoid autoplay restrictions)
      if (userInteracted) {
        try {
          await audio.play();
        } catch (error) {
          // Autoplay might still be blocked, but that's okay
          // It will play on next user interaction
          console.warn('Autoplay prevented, will play on user interaction:', error);
        }
      }
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // Handle audio errors
    const handleError = (error: Event) => {
      console.error('Failed to load ambient sound:', error);
    };
    audio.addEventListener('error', handleError);

    // Try to load audio (load() is synchronous, doesn't return a Promise)
    try {
      audio.load();
    } catch (error) {
      console.error('Error loading audio:', error);
    }

    audioRef.current = audio;

    // Cleanup function
    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [enabled, userInteracted, settings?.soundVolume]);

  // Update volume when settings change (real-time)
  useEffect(() => {
    if (audioRef.current && settings) {
      const newVolume = settings.soundVolume / 100;
      audioRef.current.volume = newVolume;
      console.log('Ambient sound volume updated:', settings.soundVolume, '%'); // Debug
    }
  }, [settings?.soundVolume]);

  // Listen for real-time volume changes from settings menu (before database save)
  useEffect(() => {
    const handleVolumeChange = (event: CustomEvent<number>) => {
      if (audioRef.current) {
        const newVolume = event.detail / 100;
        audioRef.current.volume = newVolume;
        console.log('Ambient sound volume updated (real-time):', event.detail, '%'); // Debug
      }
    };

    window.addEventListener('volume-change' as any, handleVolumeChange as EventListener);
    return () => {
      window.removeEventListener('volume-change' as any, handleVolumeChange as EventListener);
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
