"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Volume2, Bell, LogOut } from 'lucide-react';
import { useDisconnect, useAccount } from 'wagmi';
import { useGameStore } from '../../stores/gameStore';
import styles from './SettingsMenu.module.css';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsMenu = ({ isOpen, onClose }: SettingsMenuProps) => {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { settings, settingsLoading, updateSettings, reset } = useGameStore();
  const [volume, setVolume] = useState(50);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync with store settings
  useEffect(() => {
    if (settings) {
      setVolume(settings.soundVolume);
      setNotifications(settings.notificationsEnabled);
    }
  }, [settings]);

  const handleLogout = async () => {
    try {
      console.log('[Settings] Logout initiated');

      // Detect if in Mini App (Base or Farcaster) via window check; useAppContext not used here to avoid provider dependency in modal
      const isEmbedded = typeof window !== "undefined" && window.self !== window.top;
      console.log('[Settings] Embedded context:', isEmbedded);

      // Close settings menu IMMEDIATELY to give user feedback
      onClose();

      // Clear game store
      reset();

      // Disconnect wallet
      disconnect();

      // Clear ALL wallet and session storage
      if (typeof window !== 'undefined') {
        // In embedded contexts, be more aggressive with clearing
        if (isEmbedded) {
          console.log('[Logout] Embedded context - aggressive cache clearing');
          
          // Clear ALL localStorage except wallet SDK internal keys
          Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('coinbase') && !key.startsWith('cbw')) {
              localStorage.removeItem(key);
              console.log(`[Logout] Cleared embedded: ${key}`);
            }
          });
        } else {
          // Standard browser: targeted clearing
          const keysToRemove = [
            'wagmi.recentConnectorId',
            'wagmi.connected',
            'wagmi.wallet',
            'wagmi.store',
            'wagmi.cache',
          ];

          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
          });

          // Clear any wagmi-specific keys
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('wagmi.')) {
              localStorage.removeItem(key);
              console.log(`[Logout] Cleared: ${key}`);
            }
          });
        }

        // Clear session data (always)
        sessionStorage.clear();
        
        // Clear game-related storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('game-')) {
            localStorage.removeItem(key);
          }
        });
      }

      // Redirect to login page with cache-busting query param for embedded contexts
      console.log('[Settings] Logout complete - redirecting to login');
      const redirectUrl = isEmbedded 
        ? `/login?t=${Date.now()}` // Cache-busting timestamp for embedded
        : "/login";
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error during logout:", error);
      // Even on error, force clean redirect
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('wagmi.') || key.startsWith('game-')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      }
      const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
      window.location.href = isEmbedded ? `/login?t=${Date.now()}` : "/login";
    }
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      onClose();
      router.push("/");
    }
  }, [isConnected, isOpen, onClose, router]);

  if (!isOpen) return null;

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    
    // Dispatch event IMMEDIATELY for real-time audio update
    window.dispatchEvent(new CustomEvent('volume-change', { detail: newVolume }));
    
    // Update session storage immediately
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('userSoundVolume', String(newVolume));
    }

    // Debounce database save to avoid too many requests
    const windowWithTimeout = window as Window & { volumeSaveTimeout?: ReturnType<typeof setTimeout> };
    clearTimeout(windowWithTimeout.volumeSaveTimeout);
    windowWithTimeout.volumeSaveTimeout = setTimeout(() => {
      if (address) {
        console.log(`[Settings] Saving volume to database: ${newVolume}%`);
        setSaving(true);
        updateSettings(address, { soundVolume: newVolume })
          .then(() => {
            console.log(`[Settings] Volume saved successfully: ${newVolume}%`);
          })
          .catch((error) => {
            console.error('[Settings] Failed to save volume:', error);
          })
          .finally(() => {
            setSaving(false);
          });
      }
    }, 500); // Increased debounce to 500ms for better UX
  };

  const handleNotificationsToggle = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('userNotificationsEnabled', String(newNotifications));
    }
    if (address) {
      setSaving(true);
      updateSettings(address, { notificationsEnabled: newNotifications }).finally(() => {
        setSaving(false);
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.menuBox} bit16-container`}>
        <div className={styles.header}>
          <div className={styles.title}>Settings</div>
          <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.settingsContent}>
          <div className={styles.settingSection}>
            <div className={styles.settingHeader}>
              <div className={styles.settingIcon}>
                <Volume2 size={20} />
              </div>
              <div className={styles.settingLabel}>Sound Volume</div>
            </div>
            <div className={styles.volumeControl}>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className={styles.volumeSlider}
                disabled={settingsLoading || saving}
              />
              <div className={styles.volumeValue}>{volume}%</div>
            </div>
          </div>

          <div className={styles.settingSection}>
            <div className={styles.settingHeader}>
              <div className={styles.settingIcon}>
                <Bell size={20} />
              </div>
              <div className={styles.settingLabel}>Enable Notifications</div>
            </div>
            <button
              className={`${styles.toggleSwitch} ${notifications ? styles.toggleActive : ''}`}
              onClick={handleNotificationsToggle}
              disabled={settingsLoading || saving}
            >
              <div className={styles.toggleThumb}></div>
            </button>
          </div>

          <div className={styles.divider}></div>

          <button className={`${styles.logoutButton} bit16-button has-red-background`} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
