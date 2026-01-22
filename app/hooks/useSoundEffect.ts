import { useRef, useEffect } from 'react';
import { useUserSettings } from './useUserSettings';
import { getStorageUrl } from '../utils/supabaseStorage';

/**
 * Hook untuk play sound effects
 * - Menggunakan volume setting dari database
 * - Play sound effect sekali (tidak loop)
 * - Auto cleanup setelah play
 */
export function useSoundEffect() {
  const { settings } = useUserSettings();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Update volume for all audio elements when settings change
  useEffect(() => {
    const volume = settings ? settings.soundVolume / 100 : 0;
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
  }, [settings]);

  // Listen for real-time volume changes from settings menu (before database save)
  useEffect(() => {
    const handleVolumeChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const volume = customEvent.detail / 100;
      audioRefs.current.forEach((audio) => {
        audio.volume = volume;
      });
    };

    window.addEventListener('volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('volume-change', handleVolumeChange);
    };
  }, []);

  const playSound = (soundName: string) => {
    try {
      // Get or create audio element for this sound
      let audio = audioRefs.current.get(soundName);
      
      if (!audio) {
        // Create new audio element
        audio = new Audio();
        const soundUrl = getStorageUrl(`sound/${soundName}`);
        console.log(`Loading sound effect: ${soundName} from ${soundUrl}`); // Debug
        audio.src = soundUrl;
        const volume = settings ? settings.soundVolume / 100 : 0;
        audio.volume = volume;
        audioRefs.current.set(soundName, audio);
        
        // Handle errors
        audio.addEventListener('error', (e) => {
          console.error(`Failed to load sound ${soundName}:`, e);
        });
        
        // Cleanup after play
        audio.addEventListener('ended', () => {
          // Keep audio element for reuse, just reset
          if (audio) {
            audio.currentTime = 0;
          }
        });
      } else {
        // Update volume if settings changed
        const volume = settings ? settings.soundVolume / 100 : 0;
        audio.volume = volume;
        // Reset to start if already playing
        audio.currentTime = 0;
      }

      // Play sound
      console.log(`Playing sound effect: ${soundName} at volume ${(audio.volume * 100).toFixed(0)}%`); // Debug
      audio.play().catch((error) => {
        console.warn(`Failed to play sound ${soundName}:`, error);
      });
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
    }
  };

  return { playSound };
}
