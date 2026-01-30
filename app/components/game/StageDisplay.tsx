"use client";

import { useEffect, useRef, memo } from "react";
import { useStages } from "../../hooks/useStages";
import styles from "./StageDisplay.module.css";

export const StageDisplay = memo(function StageDisplay() {
  const { currentStage: _currentStage } = useStages();
  const cloudContainerRef = useRef<HTMLDivElement>(null);
  const cloudXRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const speed = 15; // pixels per second
  const cloudWidth = 1050; // Cloud size (700 * 1.5)

  // Animate cloud movement
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      cloudXRef.current -= speed * deltaTime;

      // Smooth looping: reset when first cloud is completely off-screen
      // This ensures seamless transition without gaps
      if (cloudXRef.current <= -cloudWidth) {
        cloudXRef.current += cloudWidth;
      }

      if (cloudContainerRef.current) {
        cloudContainerRef.current.style.transform = `translateX(${cloudXRef.current}px)`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.islandContainer}>
        <div className={styles.cloudWrapper}>
          <div ref={cloudContainerRef} className={styles.cloudContainer}>
            <img
              src="/Assets/cloud.svg"
              alt="Cloud"
              className={styles.cloudImage}
            />
            <img
              src="/Assets/cloud.svg"
              alt="Cloud"
              className={styles.cloudImage}
            />
            <img
              src="/Assets/cloud.svg"
              alt="Cloud"
              className={styles.cloudImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
