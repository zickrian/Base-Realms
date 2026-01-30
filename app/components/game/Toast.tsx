/**
 * Toast Notification Component
 * 
 * Shows success/error messages with nice animation
 */

'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import Image from 'next/image';
import { getGameIconUrl } from '../../utils/supabaseStorage';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  amount?: number;
  tokenIcon?: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  amount,
  tokenIcon,
  duration = 3000,
  onClose,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.iconWrapper}>
        {type === 'success' ? (
          <Check size={24} strokeWidth={3} />
        ) : (
          <X size={24} strokeWidth={3} />
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.message}>{message}</div>
        {amount && tokenIcon && (
          <div className={styles.reward}>
            <Image 
              src={getGameIconUrl(tokenIcon)} 
              alt="token" 
              width={20} 
              height={20}
              className={styles.tokenIcon}
            />
            <span className={styles.amount}>+{amount}</span>
          </div>
        )}
      </div>

      <button className={styles.closeButton} onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};
