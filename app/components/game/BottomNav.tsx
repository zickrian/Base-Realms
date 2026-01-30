"use client";

import Image from 'next/image';
import { getGameIconUrl } from '../../utils/supabaseStorage';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import styles from "./BottomNav.module.css";

type NavItem = 'cards' | 'arena' | 'market';

interface BottomNavProps {
  activeItem: NavItem;
  onNavigate?: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: string; label: string; sound: string }[] = [
  { id: 'cards', icon: getGameIconUrl('cards-icon.png'), label: 'CARDS', sound: 'card.mp3' },
  { id: 'arena', icon: getGameIconUrl('swords.png'), label: 'ARENA', sound: 'sword.mp3' },
  { id: 'market', icon: getGameIconUrl('market.png'), label: 'MARKET', sound: 'coin.mp3' },
];

export function BottomNav({ activeItem, onNavigate }: BottomNavProps) {
  const { playSound } = useSoundEffect();

  const handleClick = (item: NavItem, sound: string) => {
    // Play sound effect
    playSound(sound);
    // Trigger navigation
    onNavigate?.(item);
  };

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
          onClick={() => handleClick(item.id, item.sound)}
        >
          <Image
            src={item.icon}
            alt={item.label}
            className={styles.navIcon}
            width={32}
            height={32}
          />
          <span className={styles.navLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
