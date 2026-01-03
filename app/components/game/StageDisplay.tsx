"use client";

import { useEffect, useState, useRef, memo } from "react";
import { useGameCanvas } from "@/app/hooks/useGameCanvas";
import { GameAssets } from "@/app/utils/gameAssets";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { useStages } from "../../hooks/useStages";
import styles from "./StageDisplay.module.css";

export const StageDisplay = memo(function StageDisplay() {
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

  // Canvas setup - increased height to accommodate full cloud
  const canvasRef = useGameCanvas({
    width: 430,
    height: 350, // Increased from 259 to ensure cloud is fully visible
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
        
        // Calculate proper scaling to ensure cloud is fully visible
        // Scale based on width to maintain aspect ratio
        const scale = canvasWidth / cloudImage.width;
        const scaledWidth = canvasWidth;
        const scaledHeight = cloudImage.height * scale;
        
        // Position cloud at top of canvas (yOffset = 0) to ensure full visibility
        // Cloud will be drawn from top, and if it's taller than canvas, it will extend below
        const yOffset = 0;
        
        // Draw first cloud - ensure it's fully visible
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current, 
          yOffset, 
          scaledWidth,
          scaledHeight
        );
        
        // Draw second cloud for seamless loop
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current + canvasWidth, 
          yOffset, 
          scaledWidth,
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
});
