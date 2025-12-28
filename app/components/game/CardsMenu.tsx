"use client";

import React from 'react';
import styles from "./CardsMenu.module.css";

interface CardPack {
  id: string;
  name: string;
  priceIdrx: number;
  priceEth: number;
  image: string;
  description: string;
  rarity?: string;
}

interface InventoryCard {
  id: string;
  image: string;
  count: number;
  empty?: boolean;
}

const packs: CardPack[] = [
  {
    id: "fire",
    name: "FIRE & FURY",
    priceIdrx: 150,
    priceEth: 0.001,
    image: "/game/icons/rare.png",
    description: "Unleash the power of Rare cards! This pack contains essential units to bolster your army's core strength.",
    rarity: "rare",
  },
  {
    id: "nature",
    name: "NATURE'S WRATH",
    priceIdrx: 150,
    priceEth: 0.001,
    image: "/game/icons/epic.png",
    description: "Harness the forces of nature with Epic cards. Includes powerful beasts and spells to dominate the battlefield.",
    rarity: "epic",
  },
  {
    id: "arcane",
    name: "ARCANE MYSTERIES",
    priceIdrx: 150,
    priceEth: 0.001,
    image: "/game/icons/legend.png",
    description: "Unlock ancient secrets with Legendary cards. The ultimate pack for those seeking the most powerful heroes and artifacts.",
    rarity: "legendary",
  },
];

// Mock inventory data for layout
const inventory: InventoryCard[] = [
  { id: "knight", image: "/game/icons/cards.png", count: 3 },
  { id: "archer", image: "/game/icons/cards.png", count: 3 },
  { id: "golem", image: "/game/icons/cards.png", count: 1 },
  { id: "dragon1", image: "/game/icons/cards.png", count: 1 },
  { id: "mage1", image: "/game/icons/cards.png", count: 2 },
  { id: "wyvern", image: "/game/icons/cards.png", count: 1 },
  { id: "dwarf", image: "/game/icons/cards.png", count: 2 },
  { id: "orc", image: "/game/icons/cards.png", count: 3 },
  { id: "dragon2", image: "/game/icons/cards.png", count: 1 },
  { id: "mage2", image: "/game/icons/cards.png", count: 2 },
  { id: "empty1", image: "", count: 0, empty: true },
  { id: "empty2", image: "", count: 0, empty: true },
];

export function CardsMenu() {
  const [selectedPack, setSelectedPack] = React.useState<CardPack | null>(null);

  const handleInfoClick = (pack: CardPack) => {
    setSelectedPack(pack);
  };

  const closePopup = () => {
    setSelectedPack(null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>CARDS MENU</h1>

      {/* Cards Shop */}
      <section className={styles.shopContainer}>
        <h2 className={styles.sectionTitle}>CARDS SHOP</h2>

        <div className={styles.packsRow}>
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`${styles.packCard} ${styles[pack.rarity || 'common']}`}
            >
              {/* Card Header Removed */}

              {/* Main Illustration Area */}
              <div className={styles.cardIllustration}>
                <div className={styles.glowEffect} />
                <img
                  src={pack.image}
                  alt={pack.name}
                  className={styles.packImage}
                />
              </div>

              {/* Card Footer */}
              <div className={styles.cardFooter}>
                <button
                  className={styles.priceButton}
                  onClick={() => handleInfoClick(pack)}
                >
                  {pack.priceEth.toFixed(3)} ETH
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inventory */}
      <section className={styles.inventoryContainer}>
        <h2 className={styles.sectionTitle}>MY CARDS INVENTORY</h2>

        <div className={styles.cardsGrid}>
          {inventory.map((card) => (
            <div key={card.id} className={styles.cardSlot}>
              {card.empty ? (
                <div className={styles.cardEmpty}>
                  <span className={styles.cardEmptyLabel}>Coming Soon</span>
                </div>
              ) : (
                <>
                  <div className={styles.cardInner}>
                    <img
                      src={card.image}
                      alt={card.id}
                      className={styles.cardImage}
                    />
                  </div>
                  <span className={styles.cardCount}>x{card.count}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className={styles.bottomSpacer} />

      {/* Purchase Confirmation Popup */}
      {selectedPack && (
        <div className={styles.popupOverlay} onClick={closePopup}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>CONFIRM PURCHASE</h3>
            <p className={styles.popupDescription}>
              Are you sure you want to buy <strong>{selectedPack.name}</strong> for <strong>{selectedPack.priceEth} ETH</strong>?
            </p>
            <div className={styles.popupActions}>
              <button className={styles.cancelButton} onClick={closePopup}>
                CANCEL
              </button>
              <button className={styles.confirmButton} onClick={() => {
                // TODO: Implement actual purchase logic here (mint NFT)
                alert(`Minting ${selectedPack.name}...`);
                closePopup();
              }}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


