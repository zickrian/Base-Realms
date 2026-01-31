import { useEffect, useRef, useState, useCallback } from 'react';
import { useUserSettings } from './useUserSettings';

/**
 * Hook untuk play background music di home page
 * - Play music.mp3 dari public/sound/music.mp3
 * - Volume dikontrol oleh sound volume setting
 * - Loop sound secara otomatis
 * - Stop saat unmount atau settings berubah
 * - Handle autoplay restrictions dengan user interaction
 * 
 * FIXED: Prevent multiple audio instances and ensure consistent volume control
 */
export function useAmbientSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useUserSettings();
  const [userInteracted, setUserInteracted] = useState(false);
  const isInitializedRef = useRef(false);

  // Helper function to safely update volume - useCallback to make it stable
  const updateAudioVolume = useCallback((volume: number) => {
    if (!audioRef.current) {
      console.log('[AmbientSound] Cannot update volume - audio not initialized');
      return;
    }
    
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100));
    audioRef.current.volume = normalizedVolume;
    console.log(`[AmbientSound] Volume updated to ${volume}% (${normalizedVolume.toFixed(2)})`);

    if (normalizedVolume === 0) {
      if (!audioRef.current.paused) {
        console.log('[AmbientSound] Volume is 0, pausing audio');
        audioRef.current.pause();
      }
    } else if (audioRef.current.paused) {
      console.log('[AmbientSound] Volume > 0, attempting to play');
      audioRef.current.play().catch((error) => {
        console.warn('[AmbientSound] Failed to play audio:', error);
      });
    }
  }, []);

  // Track user interaction untuk handle autoplay restrictions
  useEffect(() => {
    if (!enabled) return;

    const handleUserInteraction = () => {
      console.log('[AmbientSound] User interaction detected');
      setUserInteracted(true);
      // Try to play audio if it exists and user just interacted
      if (audioRef.current && audioRef.current.paused && audioRef.current.volume > 0) {
        console.log('[AmbientSound] Attempting to play after user interaction');
        audioRef.current.play().catch((error) => {
          console.warn('[AmbientSound] Failed to play audio after user interaction:', error);
        });
      }
    };

    // Listen for any user interaction (once)
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

  // Create audio element ONCE - prevent multiple instances
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      console.log('[AmbientSound] Already initialized, skipping');
      return;
    }
    
    if (!enabled) {
      console.log('[AmbientSound] Disabled, skipping initialization');
      return;
    }

    console.log('[AmbientSound] Initializing audio element...');
    isInitializedRef.current = true;

    const audio = new Audio();
    audio.src = '/sound/music.mp3';
    audio.loop = true;
    audio.preload = 'auto';

    // Set initial volume from settings (default 50% if not loaded yet)
    const initialVolume = (settings?.soundVolume ?? 50) / 100;
    audio.volume = initialVolume;
    console.log(`[AmbientSound] Audio element created:`, {
      src: audio.src,
      loop: audio.loop,
      volume: audio.volume,
      volumePercent: `${(audio.volume * 100).toFixed(0)}%`,
      paused: audio.paused,
      settingsVolume: settings?.soundVolume,
    });

    // Handle audio load
    const handleCanPlay = async () => {
      console.log('[AmbientSound] Audio can play:', {
        userInteracted,
        volume: audio.volume,
        paused: audio.paused,
      });
      
      if (userInteracted && audio.volume > 0) {
        try {
          await audio.play();
          console.log('[AmbientSound] Audio playing successfully');
        } catch (error) {
          console.warn('[AmbientSound] Autoplay prevented:', error);
        }
      } else {
        console.log('[AmbientSound] Not playing yet:', {
          reason: !userInteracted ? 'waiting for user interaction' : 'volume is 0',
        });
      }
    };

    const handleError = (error: Event) => {
      console.error('[AmbientSound] Failed to load ambient sound:', error);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    try {
      audio.load();
    } catch (error) {
      console.error('[AmbientSound] Error loading audio:', error);
    }

    audioRef.current = audio;

    return () => {
      console.log('[AmbientSound] Cleaning up audio element');
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      isInitializedRef.current = false;
    };
  }, [enabled, settings?.soundVolume, userInteracted]); // Add dependencies for initial setup

  // Update volume when settings change (from database)
  useEffect(() => {
    if (settings?.soundVolume !== undefined && audioRef.current) {
      console.log(`[AmbientSound] Settings loaded, volume: ${settings.soundVolume}%`);
      updateAudioVolume(settings.soundVolume);
    }
  }, [settings?.soundVolume, updateAudioVolume]);

  // Listen for real-time volume changes from settings menu (before database save)
  // Uses custom event dispatched by SettingsMenu component
  useEffect(() => {
    const handleVolumeChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      console.log(`[AmbientSound] Received volume-change event: ${customEvent.detail}%`);
      updateAudioVolume(customEvent.detail);
    };

    window.addEventListener('volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('volume-change', handleVolumeChange);
    };
  }, [updateAudioVolume]);

  // Try to play when user interacts (separate effect)
  useEffect(() => {
    if (!userInteracted || !audioRef.current) return;
    
    const currentVolume = audioRef.current.volume;
    console.log(`[AmbientSound] User interacted, current volume: ${(currentVolume * 100).toFixed(0)}%`);
    
    if (audioRef.current.paused && currentVolume > 0) {
      console.log('[AmbientSound] User interacted, attempting to play');
      audioRef.current.play().catch((error) => {
        console.warn('[AmbientSound] Failed to play audio:', error);
      });
    }
  }, [userInteracted]);

  return audioRef.current;
}
