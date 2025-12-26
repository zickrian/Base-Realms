"use client";

import { useEffect, useState } from "react";
import { useGameCanvas } from "@/app/hooks/useGameCanvas";
import { GameAssets } from "@/app/utils/gameAssets";
import { drawSprite } from "@/app/utils/sprite";
import { Animation } from "@/app/utils/animation";
import styles from "./StageDisplay.module.css";

interface StageInfo {
  name: string;
  stageNumber: number;
}

interface StageDisplayProps {
  stage: StageInfo;
}

export function StageDisplay({ stage }: StageDisplayProps) {
  const [islandImage, setIslandImage] = useState<HTMLImageElement | null>(null);
  const animation = useState(() => new Animation())[0];

  // Load island image
  useEffect(() => {
    GameAssets.loadImage('/game/illustrations/island.png')
      .then(setIslandImage)
      .catch((error) => {
        console.error("Error loading island image:", error);
      });
  }, []);

  // Canvas setup
  const canvasRef = useGameCanvas({
    width: 393,
    height: 259,
    pixelArt: true,
    onUpdate: (ctx, deltaTime) => {
      if (!islandImage) return;

      animation.update(deltaTime);

      // Draw island with subtle breathing animation
      const scale = 1 + Animation.sinWave(animation.getTime(), 0.5, 0.02);
      
      drawSprite(ctx, {
        image: islandImage,
        x: 393 / 2,
        y: 259 / 2,
        scale: scale,
      });
    },
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.stageTitle}>
        {stage.name} - STAGE {stage.stageNumber}
      </h2>

      <div className={styles.islandContainer}>
        <canvas ref={canvasRef} className={styles.gameCanvas} />
      </div>
    </div>
  );
}
