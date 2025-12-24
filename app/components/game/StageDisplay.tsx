"use client";

import Image from "next/image";
import styles from "./StageDisplay.module.css";

interface StageInfo {
  name: string;
  stageNumber: number;
}

interface StageDisplayProps {
  stage: StageInfo;
}

export function StageDisplay({ stage }: StageDisplayProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.stageTitle}>
        {stage.name} - STAGE {stage.stageNumber}
      </h2>

      <div className={styles.islandContainer}>
        <video
          src="/game/icons/Untitled.mp4"
          className={styles.islandImage}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  );
}
