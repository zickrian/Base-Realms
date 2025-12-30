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
      // Close settings menu first
      onClose();
      
      // Clear game store (removes all cached data)
      reset();
      
      // Disconnect wallet (wagmi will update isConnected to false)
      disconnect();
      
      // Clear any localStorage/sessionStorage that might cache connection state
      // This ensures no stale data persists
      if (typeof window !== 'undefined') {
        // Clear wagmi connection cache
        localStorage.removeItem('wagmi.wallet');
        localStorage.removeItem('wagmi.connected');
        sessionStorage.clear();
      }
      
      // Wait longer to ensure disconnect state is fully propagated
      // This prevents race condition where isConnected might still be true
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Force full page reload to root page
      // This ensures:
      // 1. Complete state reset (React components re-initialize)
      // 2. Wagmi state is re-checked from scratch
      // 3. No cached navigation state
      // 4. User sees login form (LandingContent) since isConnected will be false
      window.location.href = "/";
    } catch (error) {
      console.error("Error during logout:", error);
      // Ensure cleanup and redirect even on error
      reset();
      disconnect();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wagmi.wallet');
        localStorage.removeItem('wagmi.connected');
        sessionStorage.clear();
      }
      // Force redirect regardless of errors
      window.location.href = "/";
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
    window.dispatchEvent(new CustomEvent('volume-change', { detail: newVolume }));
    
    // Debounce save
    const windowWithTimeout = window as Window & { volumeSaveTimeout?: ReturnType<typeof setTimeout> };
    clearTimeout(windowWithTimeout.volumeSaveTimeout);
    windowWithTimeout.volumeSaveTimeout = setTimeout(() => {
      if (address) {
        setSaving(true);
        updateSettings(address, { soundVolume: newVolume }).finally(() => {
          setSaving(false);
        });
      }
    }, 300);
  };

  const handleNotificationsToggle = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    if (address) {
      setSaving(true);
      updateSettings(address, { notificationsEnabled: newNotifications }).finally(() => {
        setSaving(false);
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.menuBox}>
        <div className={styles.header}>
          <div className={styles.title}>Settings</div>
          <button className={styles.closeButton} onClick={onClose}>
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

          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
