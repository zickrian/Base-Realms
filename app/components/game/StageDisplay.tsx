"use client";

import { useEffect, useState, useRef } from "react";
import { useGameCanvas } from "@/app/hooks/useGameCanvas";
import { GameAssets } from "@/app/utils/gameAssets";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { useStages } from "../../hooks/useStages";
import styles from "./StageDisplay.module.css";

export function StageDisplay() {
  const { currentStage: _currentStage } = useStages();
  const [cloudImage, setCloudImage] = useState<HTMLImageElement | null>(null);
  const cloudXRef = useRef<number>(0);

  // Load cloud image
  useEffect(() => {
    GameAssets.loadImage(getGameIconUrl('awan.png'))
      .then((cloud) => {
        console.log('Cloud image loaded:', { width: cloud.width, height: cloud.height });
        setCloudImage(cloud);
      })
      .catch((error) => {
        console.error("Error loading cloud image:", error);
      });
  }, []);

  // Canvas setup
  const canvasRef = useGameCanvas({
    width: 430,
    height: 259,
    pixelArt: true,
    onUpdate: (ctx, deltaTime) => {
      // Draw cloud layer yang bergerak horizontal
      if (cloudImage) {
        const speed = 15;
        const canvasWidth = 430;
        
        cloudXRef.current -= speed * deltaTime;
        
        if (cloudXRef.current <= -canvasWidth) {
          cloudXRef.current += canvasWidth;
        }
        
        const yOffset = -30;
        const scaleY = canvasWidth / cloudImage.width;
        const scaledHeight = cloudImage.height * scaleY;
        
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current, 
          yOffset, 
          canvasWidth,
          scaledHeight
        );
        
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current + canvasWidth, 
          yOffset, 
          canvasWidth,
          scaledHeight
        );
      }
    },
  });

  return (
    <div className={styles.container}>
      <div className={styles.islandContainer}>
        <canvas ref={canvasRef} className={styles.gameCanvas} />
      </div>
    </div>
  );
}
