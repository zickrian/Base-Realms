"use client";

import { useEffect, useState, useRef } from "react";
import { useGameCanvas } from "@/app/hooks/useGameCanvas";
import { GameAssets } from "@/app/utils/gameAssets";
import styles from "./StageDisplay.module.css";

interface StageInfo {
  name: string;
  stageNumber: number;
}

interface StageDisplayProps {
  stage: StageInfo;
}

export function StageDisplay({ stage }: StageDisplayProps) {
  const [cloudImage, setCloudImage] = useState<HTMLImageElement | null>(null);
  const cloudXRef = useRef<number>(0);

  // Load cloud image
  useEffect(() => {
    GameAssets.loadImage('/game/icons/awan.png')
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
        const speed = 15; // Kecepatan gerak (pixel per second) - diperlambat
        const canvasWidth = 430;
        const canvasHeight = 259;
        
        // Update posisi X (gerak kanan ke kiri)
        cloudXRef.current -= speed * deltaTime;
        
        // Reset posisi untuk seamless loop
        if (cloudXRef.current <= -canvasWidth) {
          cloudXRef.current += canvasWidth;
        }
        
        // Y position sedikit ke atas
        const yOffset = -30;
        
        // Scale height proporsional dengan width
        // Width PERSIS canvasWidth untuk mengisi penuh tanpa gap
        const scaleY = canvasWidth / cloudImage.width;
        const scaledHeight = cloudImage.height * scaleY;
        
        // Draw pertama - width PERSIS canvasWidth (tidak ada gap)
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current, 
          yOffset, 
          canvasWidth,  // Width PERSIS canvas width
          scaledHeight
        );
        
        // Draw kedua untuk seamless loop - width PERSIS canvasWidth
        ctx.drawImage(
          cloudImage, 
          cloudXRef.current + canvasWidth, 
          yOffset, 
          canvasWidth,  // Width PERSIS canvas width
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
