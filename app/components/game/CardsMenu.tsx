"use client";

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useGameStore, CardPack } from '../../stores/gameStore';
import styles from "./CardsMenu.module.css";

export function CardsMenu() {
  const { address } = useAccount();
  const { cardPacks, inventory, packsLoading, inventoryLoading, refreshInventory } = useGameStore();
  const [selectedPack, setSelectedPack] = useState<CardPack | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const handleInfoClick = (pack: CardPack) => {
    setSelectedPack(pack);
  };

  const closePopup = () => {
    setSelectedPack(null);
  };

  const handlePurchase = async () => {
    if (!selectedPack || !address || purchasing) return;

    try {
      setPurchasing(true);
      const response = await fetch('/api/cards/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          packId: selectedPack.id,
          paymentMethod: 'eth',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      // Refresh inventory from store
      await refreshInventory(address);
      
      closePopup();
      alert(`Successfully purchased ${selectedPack.name}!`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Purchase failed: ${errorMessage}`);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Cards Shop */}
      <section className={styles.shopContainer}>
        <h2 className={styles.sectionTitle}>CARDS SHOP</h2>

        <div className={styles.packsRow}>
          {packsLoading ? (
            <div>Loading packs...</div>
          ) : cardPacks.length === 0 ? (
            <div>No packs available</div>
          ) : (
            cardPacks
              .filter((pack) => pack.priceEth > 0 && pack.name !== 'Free Mint')
              .map((pack) => (
              <div
                key={pack.id}
                className={`${styles.packCard} ${styles[pack.rarity || 'common']}`}
              >
                <div className={styles.cardIllustration}>
                  <div className={styles.glowEffect} />
                  {pack.imageUrl ? (
                    <img
                      src={pack.imageUrl}
                      alt={pack.name}
                      className={styles.packImage}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error('Failed to load pack image:', pack.name, pack.imageUrl);
                        if (target) target.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target) target.style.display = 'block';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.packImagePlaceholder}>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardFooter}>
                  <button
                    className={styles.priceButton}
                    onClick={() => handleInfoClick(pack)}
                  >
                    {pack.priceEth.toFixed(3)} ETH
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Inventory */}
      <section className={styles.inventoryContainer}>
        <h2 className={styles.sectionTitle}>MY CARDS INVENTORY</h2>

        <div className={styles.cardsGrid}>
          {inventoryLoading ? (
            <>
              {[...Array(4)].map((_, index) => (
                <div key={`loading-${index}`} className={styles.cardSlot}>
                  <div className={styles.cardEmpty}>
                    <span className={styles.cardEmptyLabel}>Loading...</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {inventory.map((item) => (
                <div key={item.id} className={styles.cardSlot}>
                  <div className={styles.cardInner}>
                    {item.cardTemplate.imageUrl && (
                      <img
                        src={item.cardTemplate.imageUrl}
                        alt={item.cardTemplate.name}
                        className={styles.cardImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target) target.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target) target.style.display = 'block';
                        }}
                        loading="lazy"
                      />
                    )}
                    {item.quantity > 1 && (
                      <div className={styles.cardQuantity}>{item.quantity}</div>
                    )}
                  </div>
                </div>
              ))}
              {[...Array(Math.max(0, 4 - inventory.length))].map((_, index) => (
                <div key={`empty-${index}`} className={styles.cardSlot}>
                  <div className={styles.cardEmpty}>
                    <span className={styles.cardEmptyLabel}>EMPTY</span>
                  </div>
                </div>
              ))}
            </>
          )}
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
              <button 
                className={styles.confirmButton} 
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? 'PURCHASING...' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
