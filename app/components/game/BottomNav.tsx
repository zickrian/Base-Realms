import styles from "./BottomNav.module.css";

type NavItem = 'cards' | 'arena' | 'market';

interface BottomNavProps {
  activeItem: NavItem;
  onNavigate?: (item: NavItem) => void;
}

import { getGameIconUrl } from '../../utils/supabaseStorage';

const navItems: { id: NavItem; icon: string; label: string }[] = [
  { id: 'cards', icon: getGameIconUrl('cards-icon.png'), label: 'CARDS' },
  { id: 'arena', icon: getGameIconUrl('swords.png'), label: 'ARENA' },
  { id: 'market', icon: getGameIconUrl('market.png'), label: 'MARKET' },
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
          {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
          <img
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
