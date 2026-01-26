"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useGameStore } from '../../stores/gameStore';
import styles from './HomeDeckMenu.module.css';

interface HomeDeckMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HomeDeckMenu = ({ isOpen, onClose }: HomeDeckMenuProps) => {
    const { address } = useAccount();
    const { inventory, inventoryLoading, selectCard, profile, refreshProfile } = useGameStore();
    const [selectingCard, setSelectingCard] = useState<string | null>(null);

    const handleUseCard = async (cardTemplateId: string) => {
        if (!address || selectingCard) return;

        setSelectingCard(cardTemplateId);
        try {
            // If card is already selected, deselect it (set to null) - logic from CardsMenu
            const isCurrentlySelected = profile?.selectedCardId === cardTemplateId;
            const cardIdToSelect = isCurrentlySelected ? null : cardTemplateId;

            await selectCard(address, cardIdToSelect);
            // Refresh profile to get updated selected card
            await refreshProfile(address);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to select card';
            console.error('Failed to select card:', errorMessage);
            alert(errorMessage);
        } finally {
            setSelectingCard(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.container}>
            <div className={`${styles.menuBox} bit16-container`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.title}>My Deck</div>
                    <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Card Grid Content */}
                <div className={styles.content}>
                    <div className={styles.cardsGrid}>
                        {inventoryLoading ? (
                            <>
                                {[...Array(4)].map((_, index) => (
                                    <div key={`loading-${index}`} className={styles.cardSlotWrapper}>
                                        <div className={styles.cardSlot}>
                                            <div className={styles.cardEmpty}>
                                                <span className={styles.cardEmptyLabel}>Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : inventory.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#3e1f08' }}>
                                <p>No cards found.</p>
                                <p>Visit the Shop to get some packs!</p>
                            </div>
                        ) : (
                            <>
                                {inventory.map((item) => {
                                    const isSelected = profile?.selectedCardId === item.cardTemplate.id;
                                    const isUsed = item.used === true;
                                    const isLocked = isUsed; // NFT is locked if it has been used in battle
                                    
                                    return (
                                        <div key={item.id} className={styles.cardSlotWrapper}>
                                            <div className={`${styles.cardSlot} ${isSelected ? styles.cardSlotSelected : ''} ${isLocked ? styles.cardSlotLocked : ''}`}>
                                                <div className={styles.cardInner}>
                                                    {item.cardTemplate.imageUrl && (
                                                        <Image
                                                            src={item.cardTemplate.imageUrl}
                                                            alt={item.cardTemplate.name}
                                                            className={styles.cardImage}
                                                            width={150}
                                                            height={150}
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    {isLocked && (
                                                        <div className={styles.lockOverlay}>
                                                            <span className={styles.lockIcon}>🔒</span>
                                                            <span className={styles.lockText}>Used</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Stats Display */}
                                                    <div className={styles.cardStats}>
                                                        <div className={styles.statItem}>
                                                            <span className={styles.statIcon}>⚔️</span>
                                                            <span className={styles.statValue}>{item.cardTemplate.atk || 0}</span>
                                                        </div>
                                                        <div className={styles.statItem}>
                                                            <span className={styles.statIcon}>❤️</span>
                                                            <span className={styles.statValue}>{item.cardTemplate.health || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className={`${styles.useButton} bit16-button ${isSelected ? styles.useButtonSelected : ''} ${isLocked ? styles.useButtonLocked : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUseCard(item.cardTemplate.id);
                                                }}
                                                disabled={selectingCard === item.cardTemplate.id || isLocked}
                                                title={isLocked ? 'This NFT has been used in battle and is permanently locked' : ''}
                                            >
                                                {selectingCard === item.cardTemplate.id ? '...' : isSelected ? 'SELECTED' : isLocked ? 'LOCKED' : 'USE'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* Fill empty slots visually if needed, but not strictly required by request. Inventory list is dynamic. */}
                    </div>
                </div>
            </div>
        </div>
    );
};
