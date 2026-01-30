"use client";

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // milliseconds, default 5000
}

/**
 * Toast Notification Component
 * 
 * Non-intrusive notifications for user feedback
 * Auto-dismisses after duration (default 5 seconds)
 * 
 * Usage:
 * ```tsx
 * const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
 * 
 * <Toast 
 *   message={toast.message}
 *   type={toast.type}
 *   isVisible={toast.isVisible}
 *   onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
 * />
 * ```
 */
export function Toast({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 5000 
}: ToastProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  
  if (!isVisible) return null;
  
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;
  
  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <div className={styles.content}>
        <Icon className={styles.icon} size={20} />
        <span className={styles.message}>{message}</span>
      </div>
      <button 
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}