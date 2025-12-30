"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Volume2, Bell, LogOut } from 'lucide-react';
import { useDisconnect, useAccount } from 'wagmi';
import { useUserSettings } from '../../hooks/useUserSettings';
import styles from './SettingsMenu.module.css';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsMenu = ({ isOpen, onClose }: SettingsMenuProps) => {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const { settings, loading, updateSettings } = useUserSettings();
  const [volume, setVolume] = useState(50);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync with database settings
  useEffect(() => {
    if (settings) {
      setVolume(settings.soundVolume);
      setNotifications(settings.notificationsEnabled);
    }
  }, [settings]);

  const handleLogout = async () => {
    try {
      // Disconnect wallet
      disconnect();
      
      // Close settings menu
      onClose();
      
      // Clear any localStorage items related to session if needed
      // (wagmi handles wallet connection state automatically)
      
      // Redirect to landing page after a brief delay to ensure disconnect completes
      setTimeout(() => {
        router.push("/");
      }, 100);
    } catch (error) {
      console.error("Error during logout:", error);
      // Still redirect even if there's an error
      router.push("/");
    }
  };

  // Auto-close and redirect if wallet gets disconnected while menu is open
  useEffect(() => {
    if (isOpen && !isConnected) {
      onClose();
      router.push("/");
    }
  }, [isConnected, isOpen, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className={styles.container}>
      <div className={styles.menuBox}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Settings</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Settings Content */}
        <div className={styles.settingsContent}>
          {/* Sound Volume Section */}
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
                onChange={(e) => {
                  const newVolume = Number(e.target.value);
                  setVolume(newVolume);
                  
                  // Update volume real-time (immediate feedback)
                  window.dispatchEvent(new CustomEvent('volume-change', { detail: newVolume }));
                  
                  // Debounce save to database
                  clearTimeout((window as any).volumeSaveTimeout);
                  (window as any).volumeSaveTimeout = setTimeout(() => {
                    setSaving(true);
                    updateSettings({ soundVolume: newVolume }).finally(() => {
                      setSaving(false);
                    });
                  }, 300);
                }}
                className={styles.volumeSlider}
                disabled={loading || saving}
              />
              <div className={styles.volumeValue}>{volume}%</div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className={styles.settingSection}>
            <div className={styles.settingHeader}>
              <div className={styles.settingIcon}>
                <Bell size={20} />
              </div>
              <div className={styles.settingLabel}>Enable Notifications</div>
            </div>
            <button
              className={`${styles.toggleSwitch} ${notifications ? styles.toggleActive : ''}`}
              onClick={() => {
                const newNotifications = !notifications;
                setNotifications(newNotifications);
                setSaving(true);
                updateSettings({ notificationsEnabled: newNotifications }).finally(() => {
                  setSaving(false);
                });
              }}
              disabled={loading || saving}
            >
              <div className={styles.toggleThumb}></div>
            </button>
          </div>

          {/* Divider */}
          <div className={styles.divider}></div>

          {/* Logout Button */}
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

