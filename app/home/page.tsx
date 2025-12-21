"use client";

import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome Home!</h1>
      <p className={styles.subtitle}>You are now connected.</p>
    </div>
  );
}
