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
        <Image 
          src="/game/illustrations/island.png"
          alt="Floating Island Arena"
          width={393}
          height={259}
          className={styles.islandImage}
          priority
        />
      </div>
    </div>
  );
}
