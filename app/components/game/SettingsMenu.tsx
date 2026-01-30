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

      // Close settings menu IMMEDIATELY to give user feedback
      onClose();

      // Clear game store
      reset();

      // Disconnect wallet
      disconnect();

      // Clear ALL wallet storage to prevent "dapp wants to continue" on next login
      if (typeof window !== 'undefined') {
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

        // Clear any other wagmi-specific keys, but NOT general "coinbase" or "wallet" keys
        // as that might break the embedded wallet's internal session
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('wagmi.')) {
            localStorage.removeItem(key);
            console.log(`[Logout] Cleared: ${key}`);
          }
        });

        // Clear session data
        sessionStorage.clear();
      }

      // Redirect to login page (not landing) for clean login experience
      console.log('[Settings] Logout complete - redirecting to login');
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
      // Even on error, force clean redirect
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('wagmi.')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      }
      window.location.href = "/login";
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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('userSoundVolume', String(newVolume));
    }

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
