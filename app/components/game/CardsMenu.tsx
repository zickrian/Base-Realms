"use client";

import Image from "next/image";
import styles from "./CardsMenu.module.css";

interface CardPack {
  id: string;
  name: string;
  priceIdrx: number;
  priceEth: number;
  image: string;
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
    image: "/game/icons/cards.png",
  },
  {
    id: "nature",
    name: "NATURE'S WRATH",
    priceIdrx: 150,
    priceEth: 0.001,
    image: "/game/icons/cards.png",
  },
  {
    id: "arcane",
    name: "ARCANE MYSTERIES",
    priceIdrx: 150,
    priceEth: 0.001,
    image: "/game/icons/cards.png",
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
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>CARDS MENU</h1>

      {/* Cards Shop */}
      <section className={styles.shopContainer}>
        <h2 className={styles.sectionTitle}>CARDS SHOP</h2>

        <div className={styles.packsRow}>
          {packs.map((pack) => (
            <div key={pack.id} className={styles.packCard}>
              <div className={styles.packImageWrapper}>
                <Image
                  src={pack.image}
                  alt={pack.name}
                  width={80}
                  height={100}
                  className={styles.packImage}
                />
              </div>
              <div className={styles.packName}>{pack.name}</div>
              <div className={styles.packPrice}>
                {pack.priceIdrx} IDRX / {pack.priceEth.toFixed(3)} ETH
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
                    <Image
                      src={card.image}
                      alt={card.id}
                      width={80}
                      height={100}
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
    </div>
  );
}


