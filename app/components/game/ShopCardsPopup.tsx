'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useGameStore, CardPack } from '../../stores/gameStore';
import { CardRevealModal } from './CardRevealModal';
import type { Rarity } from '../../lib/blockchain/nftService';
import styles from './ShopCardsPopup.module.css';

interface ShopCardsPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShopCardsPopup = ({ isOpen, onClose }: ShopCardsPopupProps) => {
    const { address } = useAccount();
    const { cardPacks, packsLoading, refreshInventory, refreshQuests } = useGameStore();

    const isComingSoon = true;

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

    const processedTxHashes = useRef<Set<string>>(new Set());
    const isProcessingPurchase = useRef(false);

    // If closed, don't render content (or return null)
    // However, we might want to keep it mounted for state preservation, but CSS usually handles display:none
    if (!isOpen) return null;

    const handleInfoClick = (pack: CardPack) => {
        if (isComingSoon) return;
        setSelectedPack(pack);
    };

    const closeConfirmPopup = () => {
        setSelectedPack(null);
    };

    const handlePurchase = async () => {
        if (!selectedPack || !address || purchasing) return;

        setPurchasing(true);
        closeConfirmPopup();

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
            console.error('Failed to prepare purchase:', errorMessage);
            setPurchasing(false);
        }
    };

    const handleMintSuccess = async (transactionHash: string) => {
        // Prevent duplicate processing of the same transaction
        if (processedTxHashes.current.has(transactionHash)) {
            console.log(`[ShopCardsPopup] Transaction ${transactionHash} already processed, skipping`);
            return;
        }

        // Prevent multiple simultaneous purchase calls
        if (isProcessingPurchase.current) {
            console.log('[ShopCardsPopup] Purchase already in progress, skipping');
            return;
        }

        isProcessingPurchase.current = true;
        processedTxHashes.current.add(transactionHash);

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

            // Update quest progress for minting NFT (non-blocking)
            fetch('/api/quests/update-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wallet-address': address!,
                },
                body: JSON.stringify({ 
                    questType: 'mint_nft',
                    autoClaim: false // User must manually claim quest rewards
                }),
            }).catch((questError) => {
                console.warn('Failed to update mint_nft quest progress:', questError);
            });

            // CRITICAL FIX: Await sync completion before refreshing inventory
            try {
                console.log('[ShopCardsPopup] Starting NFT sync after mint...');
                await fetch('/api/cards/sync-nft', {
                    method: 'POST',
                    headers: {
                        'x-wallet-address': address!,
                    },
                });
                
                // Add delay to ensure blockchain state is settled and database is updated
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('[ShopCardsPopup] NFT sync completed, refreshing inventory...');
                // Refresh inventory and quests after sync
                await Promise.all([
                    refreshInventory(address!),
                    refreshQuests(address!),
                ]);
                console.log('[ShopCardsPopup] Inventory and quests refreshed successfully');
            } catch (syncError) {
                console.error('[ShopCardsPopup] Failed to sync NFT from blockchain:', syncError);
                // Even on error, try to refresh inventory
                await Promise.all([
                    refreshInventory(address!),
                    refreshQuests(address!),
                ]).catch((refreshError) => {
                    console.warn('[ShopCardsPopup] Failed to refresh data:', refreshError);
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to record purchase:', errorMessage);
            // Remove from processed set on error so it can be retried
            processedTxHashes.current.delete(transactionHash);
        } finally {
            setPurchasing(false);
            isProcessingPurchase.current = false;
        }
    };

    const handleMintError = (error: string) => {
        console.error('Minting error:', error);
        setPurchasing(false);
    };

    const handleRevealModalClose = () => {
        setIsRevealModalOpen(false);
        setRevealCardData(null);
        setPurchasing(false);
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.menuBox} bit16-container`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.title}>CARDS SHOP</div>
                    <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.shopContent}>
                    <div className={styles.shopContainer}>
                        {isComingSoon && (
                            <div className={`${styles.comingSoonBanner} bit16-container`}>
                                <div className={styles.comingSoonTitle}>COMING SOON</div>
                                <div className={styles.comingSoonText}>
                                    The Cards Shop will open soon. Stay tuned for updates!
                                </div>
                            </div>
                        )}
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
                                            className={`${styles.packCard} ${styles[pack.rarity || 'common']} ${isComingSoon ? styles.packCardDisabled : ''}`}
                                        >
                                            <div className={styles.cardIllustration}>
                                                <div className={styles.glowEffect} />
                                                {isComingSoon && (
                                                    <div className={styles.disabledOverlay}>
                                                        <span>COMING SOON</span>
                                                    </div>
                                                )}
                                                {pack.imageUrl ? (
                                                    <Image
                                                        src={pack.imageUrl}
                                                        alt={pack.name}
                                                        className={styles.packImage}
                                                        width={200}
                                                        height={200}
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
                                                    className={`${styles.priceButton} ${isComingSoon ? styles.priceButtonDisabled : ''}`}
                                                    onClick={() => handleInfoClick(pack)}
                                                    disabled={isComingSoon}
                                                >
                                                    {isComingSoon ? 'COMING SOON' : `${pack.priceEth.toFixed(3)} ETH`}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Reveal Modal */}
            <CardRevealModal
                isOpen={isRevealModalOpen}
                onClose={handleRevealModalClose}
                cardData={revealCardData || undefined}
                walletAddress={address}
                onMintSuccess={handleMintSuccess}
                onMintError={handleMintError}
            />

            {/* Purchase Confirmation Popup */}
            {selectedPack && (
                <div className={styles.popupOverlay} onClick={closeConfirmPopup}>
                    <div className={`${styles.popupContent} bit16-container`} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={`${styles.popupCloseButton} bit16-button has-red-background`}
                            onClick={closeConfirmPopup}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <h3 className={styles.popupTitle}>CONFIRM PURCHASE</h3>
                        <p className={styles.popupDescription}>
                            Are you sure you want to buy <strong>{selectedPack.name}</strong> for <strong>{selectedPack.priceEth} ETH</strong>?
                        </p>
                        <p className={styles.popupDescription}>
                            This will mint an NFT to your wallet.
                        </p>
                        <div className={styles.popupActions}>
                            <button className={`${styles.cancelButton} bit16-button has-red-background`} onClick={closeConfirmPopup}>
                                CANCEL
                            </button>
                            <button
                                className={`${styles.confirmButton} bit16-button has-green-background`}
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
};
