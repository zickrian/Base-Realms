"use client";

import React, { useEffect } from "react";
import styles from "./Toast.module.css";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  transactionHash?: string;
}

export function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  transactionHash,
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "error":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "warning":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "info":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getTransactionLink = () => {
    if (!transactionHash) return null;
    return (
      <a
        href={`https://basescan.org/tx/${transactionHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.transactionLink}
        onClick={(e) => e.stopPropagation()}
      >
        View on Basescan →
      </a>
    );
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.toast} ${styles[type]}`}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <div className={styles.icon}>
              {getIcon()}
            </div>
          </div>
          <div className={styles.messageContainer}>
            <h3 className={styles.title}>
              {type === "success" && "Success!"}
              {type === "error" && "Error"}
              {type === "warning" && "Warning"}
              {type === "info" && "Information"}
            </h3>
            <p className={styles.message}>{message}</p>
            {transactionHash && (
              <div className={styles.transactionContainer}>
                {getTransactionLink()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
