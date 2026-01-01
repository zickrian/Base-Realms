"use client";

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useGameStore, CardPack } from '../../stores/gameStore';
import { CardRevealModal } from './CardRevealModal';
import type { Rarity } from '../../lib/blockchain/nftService';
import styles from "./CardsMenu.module.css";

export function CardsMenu() {
  const { address } = useAccount();
  const { cardPacks, inventory, packsLoading, inventoryLoading, refreshInventory, refreshQuests } = useGameStore();
  const [selectedPack, setSelectedPack] = useState<CardPack | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [revealCardData, setRevealCardData] = useState<{
    id: string;
    name: string;
    rarity: Rarity;
    imageUrl: string;
    contractAddress: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleInfoClick = (pack: CardPack) => {
    setSelectedPack(pack);
  };

  const closePopup = () => {
    setSelectedPack(null);
  };

  const handlePurchase = async () => {
    if (!selectedPack || !address || purchasing) return;

    setPurchasing(true);
    closePopup();

    try {
      // Get contract address based on rarity
      const contractAddresses: Record<string, string> = {
        rare: '0x38826ec522f130354652bc16284645b0c832c341',
        epic: '0xcA36Cf2e444C209209F0c62127fAA37ae1bE62C9',
        legendary: '0xe199DeC5DdE8007a17BED43f1723bea41Ba5dADd',
      };

      const contractAddress = contractAddresses[selectedPack.rarity || 'rare'];
      const imageUrls: Record<string, string> = {
        rare: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/rarecards.png',
        epic: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/epiccards.png',
        legendary: 'https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/legendcards.png',
      };

      // Prepare card data for reveal
      setRevealCardData({
        id: selectedPack.id,
        name: selectedPack.name,
        rarity: (selectedPack.rarity || 'rare') as Rarity,
        imageUrl: imageUrls[selectedPack.rarity || 'rare'],
        contractAddress,
      });

      // Open reveal modal (minting will happen automatically)
      setIsRevealModalOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setToastMessage({ message: `Failed to prepare purchase: ${errorMessage}`, type: 'error' });
      setPurchasing(false);
    }
  };

  const handleMintSuccess = async (transactionHash: string) => {
    try {
      // After successful mint, record purchase in backend
      const response = await fetch('/api/cards/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address!,
        },
        body: JSON.stringify({
          packId: selectedPack?.id || revealCardData?.id,
          paymentMethod: 'eth',
          transactionHash,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record purchase');
      }

      // Refresh inventory and quests
      await refreshInventory(address!);
      await refreshQuests(address!);

      setToastMessage({ 
        message: `Successfully purchased and minted ${revealCardData?.name}!`, 
        type: 'success' 
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to record purchase:', errorMessage);
      setToastMessage({ 
        message: 'Card minted but failed to record purchase. Check your inventory.', 
        type: 'info' 
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleMintError = (error: string) => {
    setToastMessage({ message: error, type: 'error' });
    setPurchasing(false);
  };

  const handleModalClose = () => {
    setIsRevealModalOpen(false);
    setRevealCardData(null);
    setPurchasing(false);
  };

  return (
    <div className={styles.container} data-allow-scroll="true">
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

      {/* Toast Message */}
      {toastMessage && (
        <div 
          className={`${styles.toast} ${styles[toastMessage.type]}`}
          onClick={() => setToastMessage(null)}
        >
          {toastMessage.message}
        </div>
      )}

      {/* Card Reveal Modal */}
      <CardRevealModal
        isOpen={isRevealModalOpen}
        onClose={handleModalClose}
        cardData={revealCardData || undefined}
        walletAddress={address}
        onMintSuccess={handleMintSuccess}
        onMintError={handleMintError}
      />

      {/* Purchase Confirmation Popup */}
      {selectedPack && (
        <div className={styles.popupOverlay} onClick={closePopup}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>CONFIRM PURCHASE</h3>
            <p className={styles.popupDescription}>
              Are you sure you want to buy <strong>{selectedPack.name}</strong> for <strong>{selectedPack.priceEth} ETH</strong>?
            </p>
            <p className={styles.popupDescription}>
              This will mint an NFT to your wallet.
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
                {purchasing ? 'MINTING...' : 'CONFIRM & MINT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
