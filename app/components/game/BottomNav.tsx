"use client";

import Image from "next/image";
import styles from "./BottomNav.module.css";

type NavItem = 'cards' | 'arena' | 'market';

interface BottomNavProps {
  activeItem: NavItem;
  onNavigate?: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: string; label: string }[] = [
  { id: 'cards', icon: '/game/icons/cards.svg', label: 'Cards' },
  { id: 'arena', icon: '/game/icons/arena.svg', label: 'Arena' },
  { id: 'market', icon: '/game/icons/market.svg', label: 'Market' },
];

export function BottomNav({ activeItem, onNavigate }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
          onClick={() => onNavigate?.(item.id)}
        >
          <Image 
            src={item.icon} 
            alt={item.label} 
            width={32} 
            height={32}
            className={styles.navIcon}
          />
          <span className={styles.navLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
