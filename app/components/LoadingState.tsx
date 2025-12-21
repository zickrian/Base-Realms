"use client";

import styles from "./LoadingState.module.css";

export function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>Connecting wallet...</p>
    </div>
  );
}
