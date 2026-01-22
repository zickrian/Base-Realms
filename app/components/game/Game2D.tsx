"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./Game2D.module.css";

export function Game2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMovingLeftRef = useRef(false);
  const isMovingRightRef = useRef(false);
  
  // Constants - disesuaikan untuk berbagai ukuran screen
  const WORLD_WIDTH = 600;
  const VIEWPORT_WIDTH = 100;
  const CANVAS_WIDTH = 430;
  const PLAYER_SPEED = 150; // pixels per second
  const ANIMATION_SPEED = 150; // milliseconds per frame
  
  const playerRef = useRef({
    x: 0,
    y: 0,
    width: 30,
    height: 39,
    velocityX: 0,
    facingRight: true,
  });

  const animationFrameRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const animationTimeRef = useRef<number>(0);
  const cameraRef = useRef({ x: 0 });
  const canvasHeightRef = useRef(600);

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const grassImageRef = useRef<HTMLImageElement | null>(null);
  const avatarIdleRef = useRef<HTMLImageElement | null>(null);
  const avatarRun1Ref = useRef<HTMLImageElement | null>(null);
  const avatarRun2Ref = useRef<HTMLImageElement | null>(null);
  const avatarRun3Ref = useRef<HTMLImageElement | null>(null);
  
  // Touch/pointer state tracking untuk multi-device
  const isActiveTouchRef = useRef(false);

  // Preload images dengan error handling
  useEffect(() => {
    const images = [
      { ref: bgImageRef, src: "/ingame/bg.svg" },
      { ref: grassImageRef, src: "/ingame/grass.svg" },
      { ref: avatarIdleRef, src: "/char/avatar1.svg" },
      { ref: avatarRun1Ref, src: "/char/avatar2.svg" },
      { ref: avatarRun2Ref, src: "/char/avatar3.svg" },
      { ref: avatarRun3Ref, src: "/char/avatar4.svg" },
    ];

    images.forEach(({ ref, src }) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { ref.current = img; };
      img.onerror = () => console.warn(`Failed to load image: ${src}`);
    });
  }, []);

  // Input handler yang dioptimalkan untuk semua device
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    isActiveTouchRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clickX = clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      isMovingLeftRef.current = true;
      isMovingRightRef.current = false;
    } else {
      isMovingRightRef.current = true;
      isMovingLeftRef.current = false;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isActiveTouchRef.current = false;
    isMovingLeftRef.current = false;
    isMovingRightRef.current = false;
  }, []);

  // Pointer move handler untuk continuous input (untuk stylus/mouse)
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isActiveTouchRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clickX = clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      isMovingLeftRef.current = true;
      isMovingRightRef.current = false;
    } else {
      isMovingRightRef.current = true;
      isMovingLeftRef.current = false;
    }
  }, []);

  // Setup input event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use pointer events untuk unified handling across all device types
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  // Removed separate animation loop - akan dihandle di game loop

// Main game loop dengan optimasi performa cross-device
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", {
      alpha: false, // Disable transparency untuk performa lebih baik
      desynchronized: true, // Async rendering untuk performa lebih smooth
      willReadFrequently: false, // Optimize untuk frequent drawing, not reading
    });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // Setup canvas dengan optimization untuk berbagai DPI
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const containerHeight = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Cap at 1.5x untuk performa
      
      // Set canvas size with DPR consideration
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = containerHeight * dpr;
      
      // Scale canvas untuk tampil normal di screen
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${containerHeight}px`;
      
      // Reset transform lalu scale untuk match canvas resolution
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      canvasHeightRef.current = containerHeight;
    };

    updateCanvasSize();
    
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener('resize', updateCanvasSize);

    let lastFrameTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      // Frame rate limiting untuk performa konsisten
      const rawDeltaTime = (currentTime - lastFrameTime) / 1000;
      const deltaTime = Math.min(rawDeltaTime, 0.05);
      
      // Skip frame jika terlalu cepat (untuk consistency)
      if (deltaTime < 0.001) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      lastFrameTime = currentTime;

      const player = playerRef.current;
      const canvasHeight = canvasHeightRef.current;

      // Update movement dengan deltaTime yang konsisten
      const isMoving = isMovingLeftRef.current || isMovingRightRef.current;
      player.velocityX = 0;
      
      if (isMovingLeftRef.current) {
        player.velocityX = -PLAYER_SPEED;
        player.facingRight = false;
      } else if (isMovingRightRef.current) {
        player.velocityX = PLAYER_SPEED;
        player.facingRight = true;
      }

      // Apply movement
      player.x += player.velocityX * deltaTime;

      // Boundary checks
      if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
      }
      if (player.x > WORLD_WIDTH) {
        player.x = WORLD_WIDTH;
        player.velocityX = 0;
      }

      // Update animation frame dengan deltaTime
      if (isMoving) {
        animationTimeRef.current += deltaTime * 1000;
        if (animationTimeRef.current >= ANIMATION_SPEED) {
          const next = animationFrameRef.current + 1;
          animationFrameRef.current = next > 3 ? 1 : next;
          animationTimeRef.current = 0;
        }
      } else {
        animationFrameRef.current = 0;
        animationTimeRef.current = 0;
      }

      // Smooth camera follow
      const targetCameraX = Math.max(0, Math.min(player.x, VIEWPORT_WIDTH));
      cameraRef.current.x += (targetCameraX - cameraRef.current.x) * 0.1;

      // Clear canvas once
      ctx.clearRect(0, 0, CANVAS_WIDTH, canvasHeight);

      const cameraX = cameraRef.current.x;
      const scale = CANVAS_WIDTH / VIEWPORT_WIDTH;
      const grassDisplayHeight = (100 / WORLD_WIDTH) * CANVAS_WIDTH;
      const grassY = canvasHeight - grassDisplayHeight;

      // Draw background
      if (bgImageRef.current?.complete) {
        ctx.drawImage(
          bgImageRef.current,
          cameraX,
          0,
          VIEWPORT_WIDTH,
          600,
          0,
          0,
          CANVAS_WIDTH,
          CANVAS_WIDTH
        );
      } else {
        ctx.fillStyle = "#49b0f2";
        ctx.fillRect(0, 0, CANVAS_WIDTH, grassY);
      }

      // Draw grass
      if (grassImageRef.current?.complete) {
        ctx.drawImage(
          grassImageRef.current,
          cameraX,
          0,
          VIEWPORT_WIDTH,
          100,
          0,
          grassY,
          CANVAS_WIDTH,
          grassDisplayHeight
        );
      } else {
        ctx.fillStyle = "#2eb534";
        ctx.fillRect(0, grassY, CANVAS_WIDTH, grassDisplayHeight);
      }

      // Draw player with optimized rendering
      const playerScreenX = (player.x - cameraX) * scale;
      const playerDisplayWidth = player.width * scale;
      const playerDisplayHeight = player.height * scale;
      const playerY = grassY - playerDisplayHeight;

      let currentAvatar: HTMLImageElement | null = null;
      if (animationFrameRef.current === 0) {
        currentAvatar = avatarIdleRef.current;
      } else if (animationFrameRef.current === 1) {
        currentAvatar = avatarRun1Ref.current;
      } else if (animationFrameRef.current === 2) {
        currentAvatar = avatarRun2Ref.current;
      } else if (animationFrameRef.current === 3) {
        currentAvatar = avatarRun3Ref.current;
      }

      if (currentAvatar?.complete) {
        ctx.save();
        if (!player.facingRight) {
          ctx.translate(playerScreenX + playerDisplayWidth, playerY);
          ctx.scale(-1, 1);
          ctx.drawImage(
            currentAvatar,
            0,
            0,
            currentAvatar.width || 30,
            currentAvatar.height || 39,
            0,
            0,
            playerDisplayWidth,
            playerDisplayHeight
          );
        } else {
          ctx.drawImage(
            currentAvatar,
            0,
            0,
            currentAvatar.width || 30,
            currentAvatar.height || 39,
            playerScreenX,
            playerY,
            playerDisplayWidth,
            playerDisplayHeight
          );
        }
        ctx.restore();
      } else {
        // Fallback rectangle jika image belum load
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(playerScreenX, playerY, playerDisplayWidth, playerDisplayHeight);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={styles.gameContainer}>
      <canvas
        ref={canvasRef}
        className={styles.gameCanvas}
        width={CANVAS_WIDTH}
        height={600}
      />
    </div>
  );
}
