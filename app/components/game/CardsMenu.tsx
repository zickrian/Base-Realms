"use client";

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { getGameIconUrl } from '../../utils/supabaseStorage';
import { useCardPacks } from '../../hooks/useCardPacks';
import { useInventory } from '../../hooks/useInventory';
import styles from "./CardsMenu.module.css";

export function CardsMenu() {
  const { address } = useAccount();
  const { packs, loading: packsLoading } = useCardPacks();
  const { inventory, loading: inventoryLoading, refetch: refetchInventory } = useInventory();
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);

  const handleInfoClick = (pack: any) => {
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
          paymentMethod: 'eth', // Default to ETH for now
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      const data = await response.json();
      
      // Refetch inventory
      await refetchInventory();
      
      // Close popup and show success
      closePopup();
      alert(`Successfully purchased ${selectedPack.name}!`);
    } catch (error: any) {
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Title Removed */}

      {/* Cards Shop */}
      <section className={styles.shopContainer}>
        <h2 className={styles.sectionTitle}>CARDS SHOP</h2>

        <div className={styles.packsRow}>
          {packsLoading ? (
            <div>Loading packs...</div>
          ) : packs.length === 0 ? (
            <div>No packs available</div>
          ) : (
            packs.map((pack) => (
              <div
                key={pack.id}
                className={`${styles.packCard} ${styles[pack.rarity || 'common']}`}
              >
                {/* Card Header Removed */}

                {/* Main Illustration Area */}
                <div className={styles.cardIllustration}>
                  <div className={styles.glowEffect} />
                  <img
                    src={pack.imageUrl}
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
            ))
          )}
        </div>
      </section>

      {/* Inventory */}
      <section className={styles.inventoryContainer}>
        <h2 className={styles.sectionTitle}>MY CARDS INVENTORY</h2>

        <div className={styles.cardsGrid}>
          {inventoryLoading ? (
            <div>Loading inventory...</div>
          ) : inventory.length === 0 ? (
            <div className={styles.cardEmpty}>
              <span className={styles.cardEmptyLabel}>No cards yet</span>
            </div>
          ) : (
            inventory.map((item) => (
              <div key={item.id} className={styles.cardSlot}>
                <div className={styles.cardInner}>
                  <img
                    src={item.cardTemplate.imageUrl}
                    alt={item.cardTemplate.name}
                    className={styles.cardImage}
                  />
                  {item.quantity > 1 && (
                    <div className={styles.cardQuantity}>{item.quantity}</div>
                  )}
                </div>
              </div>
            ))
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


