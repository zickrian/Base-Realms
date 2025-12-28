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
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "";
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
        Lihat di Basescan →
      </a>
    );
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.toast} ${styles[type]}`}>
        <div className={styles.content}>
          <div className={styles.icon}>{getIcon()}</div>
          <div className={styles.messageContainer}>
            <p className={styles.message}>{message}</p>
            {transactionHash && getTransactionLink()}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
